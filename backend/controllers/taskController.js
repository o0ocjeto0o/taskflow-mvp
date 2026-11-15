const { dbRun, dbGet, dbAll } = require('../database/db');

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

// 1. GET /api/tasks
const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status, priority, projectId } = req.query;

    let sql = `
      SELECT tasks.*, projects.name AS project_name
      FROM tasks
      INNER JOIN projects ON tasks.project_id = projects.id
      WHERE projects.user_id = ?
    `;
    const params = [userId];

    if (projectId && projectId !== 'ALL') {
      sql += ' AND tasks.project_id = ?';
      params.push(Number(projectId));
    }

    if (status && status !== 'ALL') {
      sql += ' AND tasks.status = ?';
      params.push(status);
    }

    if (priority && priority !== 'ALL') {
      sql += ' AND tasks.priority = ?';
      params.push(priority);
    }

    if (search && search.trim()) {
      sql += ' AND (LOWER(tasks.title) LIKE ? OR LOWER(tasks.description) LIKE ?)';
      const keyword = `%${search.trim().toLowerCase()}%`;
      params.push(keyword, keyword);
    }

    sql += ' ORDER BY tasks.id DESC';

    const tasks = await dbAll(sql, params);
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    console.error('Lỗi getAllTasks:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách công việc.' });
  }
};

// 2. POST /api/tasks
const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { project_id, title, description, priority, status, due_date } = req.body;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'Thiếu mã dự án (project_id).' });
    }

    // Chỉ cho phép thêm task vào dự án thuộc quyền sở hữu của user đang đăng nhập
    const project = await dbGet(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [Number(project_id), userId]
    );
    if (!project) {
      return res.status(403).json({
        success: false,
        message: 'Dự án không tồn tại hoặc bạn không có quyền thêm công việc vào dự án này.'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề công việc (title) không được để trống.'
      });
    }

    const taskPriority = priority || 'MEDIUM';
    if (!VALID_PRIORITIES.includes(taskPriority)) {
      return res.status(400).json({
        success: false,
        message: `Mức độ ưu tiên không hợp lệ: ${taskPriority}`
      });
    }

    const taskStatus = status || 'TODO';
    if (!VALID_STATUSES.includes(taskStatus)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ: ${taskStatus}`
      });
    }

    const result = await dbRun(
      `INSERT INTO tasks (project_id, title, description, priority, status, due_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(project_id),
        title.trim(),
        description ? description.trim() : '',
        taskPriority,
        taskStatus,
        due_date || ''
      ]
    );

    const newTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Tạo công việc mới thành công',
      data: newTask
    });
  } catch (err) {
    console.error('Lỗi createTask:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo công việc.' });
  }
};

// 3. PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = Number(req.params.id);

    const existing = await dbGet(
      `SELECT tasks.* FROM tasks
       INNER JOIN projects ON tasks.project_id = projects.id
       WHERE tasks.id = ? AND projects.user_id = ?`,
      [taskId, userId]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc hoặc bạn không có quyền chỉnh sửa.'
      });
    }

    const { project_id, title, description, priority, status, due_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề công việc (title) không được để trống.'
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, message: `Mức ưu tiên không hợp lệ: ${priority}` });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Trạng thái không hợp lệ: ${status}` });
    }

    // Nếu đổi sang dự án khác, kiểm tra dự án mới cũng phải thuộc về user hiện tại
    const targetProjectId = project_id ? Number(project_id) : existing.project_id;
    if (targetProjectId !== existing.project_id) {
      const targetProject = await dbGet(
        'SELECT id FROM projects WHERE id = ? AND user_id = ?',
        [targetProjectId, userId]
      );
      if (!targetProject) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền chuyển công việc sang dự án này.'
        });
      }
    }

    await dbRun(
      `UPDATE tasks
       SET project_id = ?, title = ?, description = ?, priority = ?, status = ?, due_date = ?
       WHERE id = ?`,
      [
        targetProjectId,
        title.trim(),
        description !== undefined ? description.trim() : existing.description,
        priority || existing.priority,
        status || existing.status,
        due_date !== undefined ? due_date : existing.due_date,
        taskId
      ]
    );

    const updatedTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);

    res.status(200).json({
      success: true,
      message: 'Cập nhật công việc thành công',
      data: updatedTask
    });
  } catch (err) {
    console.error('Lỗi updateTask:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật công việc.' });
  }
};

// 4. PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = Number(req.params.id);
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Vui lòng cung cấp trạng thái hợp lệ: ${VALID_STATUSES.join(', ')}`
      });
    }

    const existing = await dbGet(
      `SELECT tasks.id FROM tasks
       INNER JOIN projects ON tasks.project_id = projects.id
       WHERE tasks.id = ? AND projects.user_id = ?`,
      [taskId, userId]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc hoặc bạn không có quyền cập nhật.'
      });
    }

    await dbRun('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
    const updatedTask = await dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);

    res.status(200).json({
      success: true,
      message: `Đã chuyển trạng thái công việc sang ${status}`,
      data: updatedTask
    });
  } catch (err) {
    console.error('Lỗi updateTaskStatus:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật trạng thái.' });
  }
};

// 5. DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = Number(req.params.id);

    const existing = await dbGet(
      `SELECT tasks.id FROM tasks
       INNER JOIN projects ON tasks.project_id = projects.id
       WHERE tasks.id = ? AND projects.user_id = ?`,
      [taskId, userId]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy công việc hoặc bạn không có quyền xóa.'
      });
    }

    await dbRun('DELETE FROM tasks WHERE id = ?', [taskId]);

    res.status(200).json({
      success: true,
      message: 'Đã xóa công việc thành công'
    });
  } catch (err) {
    console.error('Lỗi deleteTask:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa công việc.' });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
};
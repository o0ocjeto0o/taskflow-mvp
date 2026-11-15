const { dbRun, dbGet, dbAll } = require('../database/db');

const VALID_PROJECT_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];

// 1. GET /api/projects
const getAllProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status } = req.query;
    let sql = 'SELECT * FROM projects WHERE user_id = ?';
    const params = [userId];

    if (status && status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)';
      const keyword = `%${search.trim().toLowerCase()}%`;
      params.push(keyword, keyword);
    }

    sql += ' ORDER BY id DESC';

    const projects = await dbAll(sql, params);
    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (err) {
    console.error('Lỗi getAllProjects:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy danh sách dự án.' });
  }
};

// 2. GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = Number(req.params.id);
    const project = await dbGet(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án hoặc bạn không có quyền truy cập.'
      });
    }

    const tasks = await dbAll(
      'SELECT * FROM tasks WHERE project_id = ? ORDER BY id DESC',
      [projectId]
    );

    res.status(200).json({
      success: true,
      data: {
        ...project,
        tasks
      }
    });
  } catch (err) {
    console.error('Lỗi getProjectById:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy chi tiết dự án.' });
  }
};

// 3. POST /api/projects
const createProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, start_date, end_date, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên dự án (name) không được để trống.'
      });
    }

    const projectStatus = status || 'ACTIVE';
    if (!VALID_PROJECT_STATUSES.includes(projectStatus)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_PROJECT_STATUSES.join(', ')}`
      });
    }

    const result = await dbRun(
      `INSERT INTO projects (user_id, name, description, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        description ? description.trim() : '',
        start_date || '',
        end_date || '',
        projectStatus
      ]
    );

    const newProject = await dbGet('SELECT * FROM projects WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Tạo dự án mới thành công',
      data: newProject
    });
  } catch (err) {
    console.error('Lỗi createProject:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tạo dự án.' });
  }
};

// 4. PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = Number(req.params.id);
    const existing = await dbGet(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án hoặc bạn không có quyền chỉnh sửa.'
      });
    }

    const { name, description, start_date, end_date, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tên dự án (name) không được để trống.'
      });
    }

    if (status && !VALID_PROJECT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_PROJECT_STATUSES.join(', ')}`
      });
    }

    await dbRun(
      `UPDATE projects
       SET name = ?, description = ?, start_date = ?, end_date = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [
        name.trim(),
        description !== undefined ? description.trim() : existing.description,
        start_date !== undefined ? start_date : existing.start_date,
        end_date !== undefined ? end_date : existing.end_date,
        status || existing.status,
        projectId,
        userId
      ]
    );

    const updatedProject = await dbGet('SELECT * FROM projects WHERE id = ?', [projectId]);

    res.status(200).json({
      success: true,
      message: 'Cập nhật dự án thành công',
      data: updatedProject
    });
  } catch (err) {
    console.error('Lỗi updateProject:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật dự án.' });
  }
};

// 5. DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const projectId = Number(req.params.id);
    const result = await dbRun(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án hoặc bạn không có quyền xóa.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa dự án và toàn bộ công việc liên quan.'
    });
  } catch (err) {
    console.error('Lỗi deleteProject:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa dự án.' });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
const { dbRun, dbGet, dbAll } = require('../database/db');

const VALID_PROJECT_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];
const DEFAULT_USER_ID = 1; // Sẽ thay bằng req.user.id ở Phase 7

// 1. GET /api/projects - Lấy danh sách dự án từ SQLite
const getAllProjects = async (req, res) => {
  try {
    const { search, status } = req.query;
    let sql = 'SELECT * FROM projects WHERE user_id = ?';
    const params = [DEFAULT_USER_ID];

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

// 2. GET /api/projects/:id - Lấy chi tiết 1 dự án kèm các task thuộc dự án đó
const getProjectById = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const project = await dbGet(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, DEFAULT_USER_ID]
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy dự án có ID = ${projectId}`
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

// 3. POST /api/projects - Thêm dự án mới vào SQLite
const createProject = async (req, res) => {
  try {
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
        DEFAULT_USER_ID,
        name.trim(),
        description ? description.trim() : '',
        start_date || '',
        end_date || '',
        projectStatus
      ]
    );

    // Truy vấn lại bản ghi vừa tạo để trả đầy đủ dữ liệu (bao gồm created_at) về Client
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

// 4. PUT /api/projects/:id - Cập nhật dự án trong SQLite
const updateProject = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const existing = await dbGet(
      'SELECT * FROM projects WHERE id = ? AND user_id = ?',
      [projectId, DEFAULT_USER_ID]
    );

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy dự án có ID = ${projectId}`
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
        DEFAULT_USER_ID
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

// 5. DELETE /api/projects/:id - Xóa dự án (SQLite tự động xóa các task con nhờ ON DELETE CASCADE)
const deleteProject = async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const result = await dbRun(
      'DELETE FROM projects WHERE id = ? AND user_id = ?',
      [projectId, DEFAULT_USER_ID]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy dự án có ID = ${projectId}`
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
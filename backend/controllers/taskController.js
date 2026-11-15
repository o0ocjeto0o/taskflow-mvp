const store = require('../data/store');

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

// 1. GET /api/tasks - Lấy danh sách công việc (hỗ trợ tìm kiếm & lọc đa điều kiện)
const getAllTasks = (req, res) => {
  const { search, status, priority, projectId } = req.query;
  let result = [...store.tasks];

  if (projectId && projectId !== 'ALL') {
    result = result.filter(t => t.project_id === Number(projectId));
  }

  if (status && status !== 'ALL') {
    result = result.filter(t => t.status === status);
  }

  if (priority && priority !== 'ALL') {
    result = result.filter(t => t.priority === priority);
  }

  if (search) {
    const keyword = search.trim().toLowerCase();
    result = result.filter(
      t => t.title.toLowerCase().includes(keyword) || t.description.toLowerCase().includes(keyword)
    );
  }

  res.status(200).json({
    success: true,
    count: result.length,
    data: result
  });
};

// 2. POST /api/tasks - Tạo công việc mới
const createTask = (req, res) => {
  const { project_id, title, description, priority, status, due_date } = req.body;

  // Kiểm tra dữ liệu bắt buộc
  if (!project_id) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu mã dự án (project_id).'
    });
  }

  const projectExists = store.projects.some(p => p.id === Number(project_id));
  if (!projectExists) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy dự án có ID = ${project_id} để gắn công việc.`
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
      message: `Mức độ ưu tiên không hợp lệ. Chỉ chấp nhận: ${VALID_PRIORITIES.join(', ')}`
    });
  }

  const taskStatus = status || 'TODO';
  if (!VALID_STATUSES.includes(taskStatus)) {
    return res.status(400).json({
      success: false,
      message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${VALID_STATUSES.join(', ')}`
    });
  }

  const newTask = {
    id: store.nextId(store.tasks),
    project_id: Number(project_id),
    title: title.trim(),
    description: description ? description.trim() : '',
    priority: taskPriority,
    status: taskStatus,
    due_date: due_date || '',
    created_at: store.nowISO()
  };

  store.tasks.push(newTask);

  res.status(201).json({
    success: true,
    message: 'Tạo công việc mới thành công',
    data: newTask
  });
};

// 3. PUT /api/tasks/:id - Cập nhật toàn bộ thông tin công việc
const updateTask = (req, res) => {
  const taskId = Number(req.params.id);
  const index = store.tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy công việc có ID = ${taskId}`
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
    return res.status(400).json({
      success: false,
      message: `Mức ưu tiên không hợp lệ: ${priority}`
    });
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Trạng thái không hợp lệ: ${status}`
    });
  }

  const existing = store.tasks[index];
  store.tasks[index] = {
    ...existing,
    project_id: project_id ? Number(project_id) : existing.project_id,
    title: title.trim(),
    description: description !== undefined ? description.trim() : existing.description,
    priority: priority || existing.priority,
    status: status || existing.status,
    due_date: due_date !== undefined ? due_date : existing.due_date
  };

  res.status(200).json({
    success: true,
    message: 'Cập nhật công việc thành công',
    data: store.tasks[index]
  });
};

// 4. PATCH /api/tasks/:id/status - Cập nhật nhanh trạng thái (dùng cho Kanban Board)
const updateTaskStatus = (req, res) => {
  const taskId = Number(req.params.id);
  const index = store.tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy công việc có ID = ${taskId}`
    });
  }

  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Vui lòng cung cấp trạng thái hợp lệ: ${VALID_STATUSES.join(', ')}`
    });
  }

  store.tasks[index].status = status;

  res.status(200).json({
    success: true,
    message: `Đã chuyển trạng thái công việc sang ${status}`,
    data: store.tasks[index]
  });
};

// 5. DELETE /api/tasks/:id - Xóa công việc
const deleteTask = (req, res) => {
  const taskId = Number(req.params.id);
  const index = store.tasks.findIndex(t => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy công việc có ID = ${taskId}`
    });
  }

  store.tasks.splice(index, 1);

  res.status(200).json({
    success: true,
    message: 'Đã xóa công việc thành công'
  });
};

module.exports = {
  getAllTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask
};
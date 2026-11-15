const store = require('../data/store');

const VALID_PROJECT_STATUSES = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];

// 1. GET /api/projects - Lấy danh sách tất cả dự án
const getAllProjects = (req, res) => {
  const { search, status } = req.query;
  let result = [...store.projects];

  // Hỗ trợ tìm kiếm theo tên/mô tả nếu Client gửi query ?search=...
  if (search) {
    const keyword = search.trim().toLowerCase();
    result = result.filter(
      p => p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword)
    );
  }

  // Hỗ trợ lọc theo trạng thái nếu Client gửi query ?status=...
  if (status && status !== 'ALL') {
    result = result.filter(p => p.status === status);
  }

  res.status(200).json({
    success: true,
    count: result.length,
    data: result
  });
};

// 2. GET /api/projects/:id - Lấy chi tiết 1 dự án kèm danh sách task của dự án đó
const getProjectById = (req, res) => {
  const projectId = Number(req.params.id);
  const project = store.projects.find(p => p.id === projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy dự án có ID = ${projectId}`
    });
  }

  // Lấy kèm các công việc thuộc dự án này
  const projectTasks = store.tasks.filter(t => t.project_id === projectId);

  res.status(200).json({
    success: true,
    data: {
      ...project,
      tasks: projectTasks
    }
  });
};

// 3. POST /api/projects - Tạo dự án mới
const createProject = (req, res) => {
  const { name, description, start_date, end_date, status } = req.body;

  // Validation: Tên dự án là bắt buộc
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

  const newProject = {
    id: store.nextId(store.projects),
    user_id: 1, // Mặc định user_id = 1 trong Phase 5
    name: name.trim(),
    description: description ? description.trim() : '',
    start_date: start_date || '',
    end_date: end_date || '',
    status: projectStatus,
    created_at: store.nowISO()
  };

  store.projects.push(newProject);

  res.status(201).json({
    success: true,
    message: 'Tạo dự án mới thành công',
    data: newProject
  });
};

// 4. PUT /api/projects/:id - Cập nhật thông tin dự án
const updateProject = (req, res) => {
  const projectId = Number(req.params.id);
  const index = store.projects.findIndex(p => p.id === projectId);

  if (index === -1) {
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

  const existing = store.projects[index];
  store.projects[index] = {
    ...existing,
    name: name.trim(),
    description: description !== undefined ? description.trim() : existing.description,
    start_date: start_date !== undefined ? start_date : existing.start_date,
    end_date: end_date !== undefined ? end_date : existing.end_date,
    status: status || existing.status
  };

  res.status(200).json({
    success: true,
    message: 'Cập nhật dự án thành công',
    data: store.projects[index]
  });
};

// 5. DELETE /api/projects/:id - Xóa dự án (kèm Cascade Delete các Task liên quan)
const deleteProject = (req, res) => {
  const projectId = Number(req.params.id);
  const index = store.projects.findIndex(p => p.id === projectId);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy dự án có ID = ${projectId}`
    });
  }

  // Xóa dự án khỏi danh sách
  store.projects.splice(index, 1);

  // Xóa dây chuyền (Cascade Delete) tất cả task thuộc dự án đó
  const initialTaskCount = store.tasks.length;
  store.tasks = store.tasks.filter(t => t.project_id !== projectId);
  const deletedTasksCount = initialTaskCount - store.tasks.length;

  res.status(200).json({
    success: true,
    message: `Đã xóa dự án và ${deletedTasksCount} công việc liên quan.`
  });
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject
};
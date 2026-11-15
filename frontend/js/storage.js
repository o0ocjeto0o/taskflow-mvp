/**
 * StorageService: Quản lý toàn bộ dữ liệu tạm trên LocalStorage (Phase 4)
 * Cấu trúc dữ liệu bám sát 100% thiết kế bảng SQLite ở Phase 2 (users, projects, tasks)
 */
const StorageService = {
  KEYS: {
    USERS: 'taskflow_users',
    CURRENT_USER: 'taskflow_current_user',
    PROJECTS: 'taskflow_projects',
    TASKS: 'taskflow_tasks'
  },

  // --- Hàm đọc/ghi nội bộ ---
  _getList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  },

  _saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  },

  _generateId(list) {
    if (list.length === 0) return 1;
    return Math.max(...list.map(item => item.id)) + 1;
  },

  _nowISO() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  },

  // ================= 1. AUTH & USER =================
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CURRENT_USER));
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user) {
    if (!user) {
      localStorage.removeItem(this.KEYS.CURRENT_USER);
      return;
    }
    // Không lưu password vào phiên đăng nhập hiện tại
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    };
    localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(safeUser));
  },

  registerUser({ name, email, password }) {
    const users = this._getList(this.KEYS.USERS);
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some(u => u.email === normalizedEmail)) {
      throw new Error('Email này đã được đăng ký. Vui lòng sử dụng email khác.');
    }

    const newUser = {
      id: this._generateId(users),
      name: name.trim(),
      email: normalizedEmail,
      password: password, // Phase 7 sẽ thay bằng password_hash trên Server
      created_at: this._nowISO()
    };

    users.push(newUser);
    this._saveList(this.KEYS.USERS, users);
    this.setCurrentUser(newUser);
    return this.getCurrentUser();
  },

  loginUser({ email, password }) {
    const users = this._getList(this.KEYS.USERS);
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email === normalizedEmail && u.password === password);

    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    this.setCurrentUser(user);
    return this.getCurrentUser();
  },

  logoutUser() {
    localStorage.removeItem(this.KEYS.CURRENT_USER);
  },

  updateUserProfile(userId, newName) {
    const users = this._getList(this.KEYS.USERS);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('Không tìm thấy tài khoản.');

    users[index].name = newName.trim();
    this._saveList(this.KEYS.USERS, users);
    this.setCurrentUser(users[index]);
    return this.getCurrentUser();
  },

  changeUserPassword(userId, oldPassword, newPassword) {
    const users = this._getList(this.KEYS.USERS);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('Không tìm thấy tài khoản.');

    if (users[index].password !== oldPassword) {
      throw new Error('Mật khẩu hiện tại không đúng.');
    }

    users[index].password = newPassword;
    this._saveList(this.KEYS.USERS, users);
  },

  // ================= 2. PROJECTS CRUD =================
  getProjectsByUser(userId) {
    const projects = this._getList(this.KEYS.PROJECTS);
    return projects.filter(p => p.user_id === userId);
  },

  getProjectById(projectId, userId) {
    const projects = this._getList(this.KEYS.PROJECTS);
    return projects.find(p => p.id === Number(projectId) && p.user_id === userId) || null;
  },

  createProject(userId, { name, description, start_date, end_date, status }) {
    const projects = this._getList(this.KEYS.PROJECTS);
    const newProject = {
      id: this._generateId(projects),
      user_id: userId,
      name: name.trim(),
      description: (description || '').trim(),
      start_date: start_date || '',
      end_date: end_date || '',
      status: status || 'ACTIVE',
      created_at: this._nowISO()
    };
    projects.push(newProject);
    this._saveList(this.KEYS.PROJECTS, projects);
    return newProject;
  },

  updateProject(projectId, userId, data) {
    const projects = this._getList(this.KEYS.PROJECTS);
    const index = projects.findIndex(p => p.id === Number(projectId) && p.user_id === userId);
    if (index === -1) throw new Error('Không tìm thấy dự án hoặc bạn không có quyền sửa.');

    projects[index] = {
      ...projects[index],
      name: data.name.trim(),
      description: (data.description || '').trim(),
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      status: data.status || projects[index].status
    };
    this._saveList(this.KEYS.PROJECTS, projects);
    return projects[index];
  },

  deleteProject(projectId, userId) {
    const id = Number(projectId);
    const projects = this._getList(this.KEYS.PROJECTS);
    const target = projects.find(p => p.id === id && p.user_id === userId);
    if (!target) throw new Error('Không tìm thấy dự án.');

    // Xóa dự án
    const remainingProjects = projects.filter(p => p.id !== id);
    this._saveList(this.KEYS.PROJECTS, remainingProjects);

    // Cascade Delete: Xóa toàn bộ task thuộc dự án đó
    const tasks = this._getList(this.KEYS.TASKS);
    const remainingTasks = tasks.filter(t => t.project_id !== id);
    this._saveList(this.KEYS.TASKS, remainingTasks);
  },

  // ================= 3. TASKS CRUD =================
  getTasksByUser(userId) {
    const userProjectIds = this.getProjectsByUser(userId).map(p => p.id);
    const tasks = this._getList(this.KEYS.TASKS);
    return tasks.filter(t => userProjectIds.includes(t.project_id));
  },

  getTasksByProject(projectId, userId) {
    const project = this.getProjectById(projectId, userId);
    if (!project) return [];
    const tasks = this._getList(this.KEYS.TASKS);
    return tasks.filter(t => t.project_id === Number(projectId));
  },

  createTask(userId, { project_id, title, description, priority, status, due_date }) {
    const project = this.getProjectById(project_id, userId);
    if (!project) throw new Error('Dự án không hợp lệ.');

    const tasks = this._getList(this.KEYS.TASKS);
    const newTask = {
      id: this._generateId(tasks),
      project_id: Number(project_id),
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'MEDIUM',
      status: status || 'TODO',
      due_date: due_date || '',
      created_at: this._nowISO()
    };
    tasks.push(newTask);
    this._saveList(this.KEYS.TASKS, tasks);
    return newTask;
  },

  updateTask(taskId, userId, data) {
    const userProjectIds = this.getProjectsByUser(userId).map(p => p.id);
    const tasks = this._getList(this.KEYS.TASKS);
    const index = tasks.findIndex(t => t.id === Number(taskId) && userProjectIds.includes(t.project_id));
    if (index === -1) throw new Error('Không tìm thấy công việc.');

    tasks[index] = {
      ...tasks[index],
      project_id: data.project_id ? Number(data.project_id) : tasks[index].project_id,
      title: data.title.trim(),
      description: (data.description || '').trim(),
      priority: data.priority || tasks[index].priority,
      status: data.status || tasks[index].status,
      due_date: data.due_date !== undefined ? data.due_date : tasks[index].due_date
    };
    this._saveList(this.KEYS.TASKS, tasks);
    return tasks[index];
  },

  updateTaskStatus(taskId, userId, newStatus) {
    const userProjectIds = this.getProjectsByUser(userId).map(p => p.id);
    const tasks = this._getList(this.KEYS.TASKS);
    const index = tasks.findIndex(t => t.id === Number(taskId) && userProjectIds.includes(t.project_id));
    if (index === -1) throw new Error('Không tìm thấy công việc.');

    tasks[index].status = newStatus;
    this._saveList(this.KEYS.TASKS, tasks);
    return tasks[index];
  },

  deleteTask(taskId, userId) {
    const userProjectIds = this.getProjectsByUser(userId).map(p => p.id);
    const tasks = this._getList(this.KEYS.TASKS);
    const remaining = tasks.filter(t => !(t.id === Number(taskId) && userProjectIds.includes(t.project_id)));
    this._saveList(this.KEYS.TASKS, remaining);
  },

  // ================= 4. DASHBOARD STATS =================
  getDashboardStats(userId) {
    const projects = this.getProjectsByUser(userId);
    const tasks = this.getTasksByUser(userId);

    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const overdueTasks = tasks.filter(t => UIHelper.isOverdue(t.due_date, t.status)).length;
    const overallProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      overallProgress,
      projects,
      tasks
    };
  },

  // Tạo dữ liệu mẫu để người học test nhanh giao diện
  seedDemoData(userId) {
    const p1 = this.createProject(userId, {
      name: 'Xây dựng Website TaskFlow',
      description: 'Hoàn thiện dự án Full-stack quản lý công việc đưa vào CV xin thực tập.',
      start_date: '2026-11-01',
      end_date: '2026-12-05',
      status: 'ACTIVE'
    });
    const p2 = this.createProject(userId, {
      name: 'Ôn tập Cấu trúc dữ liệu & Giải thuật',
      description: 'Luyện giải 30 bài tập thuật toán chuẩn bị phỏng vấn.',
      start_date: '2026-11-10',
      end_date: '2026-11-30',
      status: 'ACTIVE'
    });

    this.createTask(userId, {
      project_id: p1.id,
      title: 'Thiết kế sơ đồ ERD & REST API',
      description: 'Xác định 3 bảng users, projects, tasks.',
      priority: 'HIGH',
      status: 'DONE',
      due_date: '2026-11-12'
    });
    this.createTask(userId, {
      project_id: p1.id,
      title: 'Xây dựng bảng Kanban kéo thả',
      description: 'Hỗ trợ 4 cột trạng thái và lưu LocalStorage.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      due_date: '2026-11-20'
    });
    this.createTask(userId, {
      project_id: p1.id,
      title: 'Viết Backend Node.js & Express',
      description: 'Cài đặt server và kết nối SQLite.',
      priority: 'MEDIUM',
      status: 'TODO',
      due_date: '2026-11-25'
    });
    this.createTask(userId, {
      project_id: p2.id,
      title: 'Hoàn thành bài tập Array & Hash Map',
      description: 'Làm 10 bài mức Easy & Medium.',
      priority: 'LOW',
      status: 'IN_REVIEW',
      due_date: '2026-11-10' // Cố tình đặt ngày quá khứ để test hiển thị Overdue
    });
  }
};

/**
 * UIHelper: Các hàm tiện ích giao diện dùng chung
 */
const UIHelper = {
  // Bảo vệ trang nội bộ: Chưa đăng nhập thì chuyển về login.html
  requireAuth() {
    const user = StorageService.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  },

  // Nếu đã đăng nhập mà vào login/register thì chuyển sang dashboard.html
  redirectIfAuthenticated() {
    const user = StorageService.getCurrentUser();
    if (user) {
      window.location.href = 'dashboard.html';
    }
  },

  // Khởi tạo thông tin User trên Header, nút Đăng xuất và Menu Mobile
  initAppShell() {
    const user = this.requireAuth();
    if (!user) return null;

    const nameEl = document.getElementById('headerUserName');
    const avatarEl = document.getElementById('headerUserAvatar');
    if (nameEl) nameEl.textContent = user.name;
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        StorageService.logoutUser();
        window.location.href = 'login.html';
      });
    }

    // Xử lý mở/đóng Sidebar trên màn hình nhỏ
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (mobileMenuBtn && sidebar && overlay) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
      });
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    return user;
  },

  // Chống lỗi bảo mật XSS khi chèn chuỗi người dùng nhập vào HTML
  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Kiểm tra công việc quá hạn
  isOverdue(dueDateStr, status) {
    if (!dueDateStr || status === 'DONE') return false;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return dueDateStr < today;
  },

  // Định dạng ngày YYYY-MM-DD sang DD/MM/YYYY dễ đọc
  formatDate(dateStr) {
    if (!dateStr) return 'Không có hạn';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  // Hiển thị thông báo Toast góc phải màn hình
  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
};
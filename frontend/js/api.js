/**
 * ApiService: Tầng giao tiếp RESTful API giữa Frontend và Backend (Phase 8)
 */
const ApiService = {
  // Tự động chọn URL phù hợp: Live Server (5500) -> localhost:3000 | Production/Express -> '/api'
  BASE_URL: (window.location.port === '5500' || window.location.protocol === 'file:')
    ? 'http://localhost:3000/api'
    : '/api',

  KEYS: {
    TOKEN: 'taskflow_token',
    USER: 'taskflow_user'
  },

  // --- Quản lý Token & User lưu tại trình duyệt ---
  getToken() {
    return localStorage.getItem(this.KEYS.TOKEN);
  },

  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.USER));
    } catch (e) {
      return null;
    }
  },

  setSession(user, token) {
    if (token) localStorage.setItem(this.KEYS.TOKEN, token);
    if (user) localStorage.setItem(this.KEYS.USER, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.KEYS.TOKEN);
    localStorage.removeItem(this.KEYS.USER);
  },

  /**
   * Hàm gọi HTTP Request lõi dùng chung cho toàn hệ thống
   * @param {string} endpoint - Đường dẫn API (ví dụ: '/projects')
   * @param {object} options - Cấu hình method, body, skipAuthRedirect
   */
  async request(endpoint, options = {}) {
    const url = `${this.BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
    } catch (networkError) {
      // Lỗi xảy ra khi không thể kết nối tới Server (ví dụ quên bật Backend)
      throw new Error('Không thể kết nối tới máy chủ. Vui lòng kiểm tra Backend Server (port 3000) đã chạy chưa.');
    }

    // Xử lý tự động đăng xuất nếu Token hết hạn hoặc không hợp lệ
    if (response.status === 401 && !options.skipAuthRedirect) {
      this.clearSession();
      window.location.href = 'login.html';
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw new Error(result.message || `Lỗi hệ thống (Mã ${response.status})`);
    }

    return result;
  },

  // ================= 1. AUTH & PROFILE APIs =================
  async register({ name, email, password }) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: { name, email, password },
      skipAuthRedirect: true
    });
    this.setSession(res.data.user, res.data.token);
    return res.data.user;
  },

  async login({ email, password }) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
      skipAuthRedirect: true
    });
    this.setSession(res.data.user, res.data.token);
    return res.data.user;
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST', skipAuthRedirect: true });
    } catch (e) {
      // Bỏ qua lỗi mạng khi đăng xuất, vẫn xóa phiên ở Client
    } finally {
      this.clearSession();
    }
  },

  async getMe() {
    const res = await this.request('/users/me');
    this.setSession(res.data, null);
    return res.data;
  },

  async updateProfile(name) {
    const res = await this.request('/users/me', {
      method: 'PUT',
      body: { name }
    });
    this.setSession(res.data, null);
    return res.data;
  },

  async changePassword(oldPassword, newPassword) {
    return await this.request('/users/me/password', {
      method: 'PUT',
      body: { oldPassword, newPassword },
      skipAuthRedirect: true
    });
  },

  // ================= 2. PROJECTS APIs =================
  async getProjects(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request(`/projects${queryString}`);
    return res.data;
  },

  async getProjectById(projectId) {
    const res = await this.request(`/projects/${projectId}`);
    return res.data;
  },

  async createProject(data) {
    const res = await this.request('/projects', {
      method: 'POST',
      body: data
    });
    return res.data;
  },

  async updateProject(projectId, data) {
    const res = await this.request(`/projects/${projectId}`, {
      method: 'PUT',
      body: data
    });
    return res.data;
  },

  async deleteProject(projectId) {
    return await this.request(`/projects/${projectId}`, {
      method: 'DELETE'
    });
  },

  // ================= 3. TASKS APIs =================
  async getTasks(filters = {}) {
    const params = new URLSearchParams();
    if (filters.projectId && filters.projectId !== 'ALL') params.append('projectId', filters.projectId);
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status);
    if (filters.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request(`/tasks${queryString}`);
    return res.data;
  },

  async createTask(data) {
    const res = await this.request('/tasks', {
      method: 'POST',
      body: data
    });
    return res.data;
  },

  async updateTask(taskId, data) {
    const res = await this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: data
    });
    return res.data;
  },

  async updateTaskStatus(taskId, status) {
    const res = await this.request(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { status }
    });
    return res.data;
  },

  async deleteTask(taskId) {
    return await this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  },

  // ================= 4. DASHBOARD & SEED DEMO DATA =================
  async getDashboardStats() {
    const res = await this.request('/dashboard/stats');
    return res.data;
  },

  async seedDemoData() {
    const p1 = await this.createProject({
      name: 'Xây dựng Website TaskFlow',
      description: 'Hoàn thiện dự án Full-stack quản lý công việc đưa vào CV xin thực tập.',
      start_date: '2026-11-01',
      end_date: '2026-12-05',
      status: 'ACTIVE'
    });
    const p2 = await this.createProject({
      name: 'Ôn tập Cấu trúc dữ liệu & Giải thuật',
      description: 'Luyện giải 30 bài tập thuật toán chuẩn bị phỏng vấn.',
      start_date: '2026-11-10',
      end_date: '2026-11-30',
      status: 'ACTIVE'
    });

    await Promise.all([
      this.createTask({
        project_id: p1.id,
        title: 'Thiết kế sơ đồ ERD & REST API',
        description: 'Xác định 3 bảng users, projects, tasks.',
        priority: 'HIGH',
        status: 'DONE',
        due_date: '2026-11-12'
      }),
      this.createTask({
        project_id: p1.id,
        title: 'Xây dựng bảng Kanban kéo thả',
        description: 'Hỗ trợ 4 cột trạng thái và lưu xuống SQLite.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        due_date: '2026-11-20'
      }),
      this.createTask({
        project_id: p1.id,
        title: 'Tích hợp Frontend và Backend REST API',
        description: 'Thay thế LocalStorage bằng Fetch API.',
        priority: 'MEDIUM',
        status: 'TODO',
        due_date: '2026-11-25'
      }),
      this.createTask({
        project_id: p2.id,
        title: 'Hoàn thành bài tập Array & Hash Map',
        description: 'Làm 10 bài mức Easy & Medium.',
        priority: 'LOW',
        status: 'IN_REVIEW',
        due_date: '2026-11-10'
      })
    ]);
  }
};

/**
 * UIHelper: Các hàm tiện ích giao diện dùng chung
 */
const UIHelper = {
  requireAuth() {
    const token = ApiService.getToken();
    const user = ApiService.getCurrentUser();
    if (!token || !user) {
      ApiService.clearSession();
      window.location.href = 'login.html';
      return null;
    }
    return user;
  },

  redirectIfAuthenticated() {
    const token = ApiService.getToken();
    const user = ApiService.getCurrentUser();
    if (token && user) {
      window.location.href = 'dashboard.html';
    }
  },

  initAppShell() {
    const user = this.requireAuth();
    if (!user) return null;

    const nameEl = document.getElementById('headerUserName');
    const avatarEl = document.getElementById('headerUserAvatar');
    if (nameEl) nameEl.textContent = user.name;
    if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await ApiService.logout();
        window.location.href = 'login.html';
      });
    }

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

  escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  isOverdue(dueDateStr, status) {
    if (!dueDateStr || status === 'DONE') return false;
    const today = new Date().toISOString().slice(0, 10);
    return dueDateStr < today;
  },

  formatDate(dateStr) {
    if (!dateStr) return 'Không có hạn';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3200);
  },

  // Hiển thị trạng thái đang tải (Loading State)
  renderLoading(container, message = 'Đang tải dữ liệu từ máy chủ...') {
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="empty-state" style="border-style: solid;">
        <div class="empty-state-icon">⏳</div>
        <p style="color: var(--text-secondary); font-weight: 500;">${message}</p>
      </div>
    `;
  },

  // Hiển thị trạng thái lỗi kết nối hoặc lỗi Server (Error State)
  renderError(container, message) {
    if (!container) return;
    container.style.display = 'block';
    container.innerHTML = `
      <div class="error-state">
        <h3 style="margin-bottom: 6px;">Đã xảy ra lỗi</h3>
        <p style="margin-bottom: 14px;">${this.escapeHTML(message)}</p>
        <button onclick="window.location.reload()" class="btn btn-secondary btn-sm">Tải lại trang</button>
      </div>
    `;
  }
};
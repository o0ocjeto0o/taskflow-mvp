document.addEventListener('DOMContentLoaded', () => {
  const currentUser = UIHelper.initAppShell();
  if (!currentUser) return;

  // Các phần tử Modal Dự án dùng chung
  const projectModal = document.getElementById('projectModal');
  const projectForm = document.getElementById('projectForm');
  const projectModalTitle = document.getElementById('projectModalTitle');
  const projectIdInput = document.getElementById('projectIdInput');
  const projectNameInput = document.getElementById('projectNameInput');
  const projectDescInput = document.getElementById('projectDescInput');
  const projectStartInput = document.getElementById('projectStartInput');
  const projectEndInput = document.getElementById('projectEndInput');
  const projectStatusInput = document.getElementById('projectStatusInput');

  function openProjectModal(project = null) {
    if (project) {
      projectModalTitle.textContent = 'Chỉnh sửa dự án';
      projectIdInput.value = project.id;
      projectNameInput.value = project.name;
      projectDescInput.value = project.description;
      projectStartInput.value = project.start_date;
      projectEndInput.value = project.end_date;
      projectStatusInput.value = project.status;
    } else {
      projectModalTitle.textContent = 'Tạo dự án mới';
      projectForm.reset();
      projectIdInput.value = '';
    }
    projectModal.classList.add('active');
    projectNameInput.focus();
  }

  function closeProjectModal() {
    projectModal.classList.remove('active');
  }

  document.getElementById('closeProjectModalBtn')?.addEventListener('click', closeProjectModal);
  document.getElementById('cancelProjectModalBtn')?.addEventListener('click', closeProjectModal);

  // ================= TRANG 1: DANH SÁCH DỰ ÁN (projects.html) =================
  const projectsPage = document.getElementById('projectsPage');
  if (projectsPage) {
    const projectsGrid = document.getElementById('projectsGrid');
    const searchInput = document.getElementById('projectSearchInput');
    const statusFilter = document.getElementById('projectStatusFilter');
    const deleteModal = document.getElementById('deleteModal');
    let projectToDeleteId = null;

    function renderProjectsList() {
      const allProjects = StorageService.getProjectsByUser(currentUser.id);
      const allTasks = StorageService.getTasksByUser(currentUser.id);
      const keyword = searchInput.value.trim().toLowerCase();
      const statusVal = statusFilter.value;

      const filtered = allProjects.filter(p => {
        const matchName = p.name.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword);
        const matchStatus = statusVal === 'ALL' || p.status === statusVal;
        return matchName && matchStatus;
      });

      if (allProjects.length === 0) {
        projectsGrid.style.display = 'block';
        projectsGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <h3 class="empty-state-title">Chưa có dự án nào</h3>
            <p class="empty-state-desc">Hãy tạo dự án đầu tiên để bắt đầu chia nhỏ và quản lý các đầu việc của bạn.</p>
            <button id="emptyCreateProjectBtn" class="btn btn-primary">+ Tạo dự án đầu tiên</button>
          </div>
        `;
        document.getElementById('emptyCreateProjectBtn').addEventListener('click', () => openProjectModal());
        return;
      }

      if (filtered.length === 0) {
        projectsGrid.style.display = 'block';
        projectsGrid.innerHTML = `
          <div class="empty-state">
            <h3 class="empty-state-title">Không tìm thấy dự án phù hợp</h3>
            <p class="empty-state-desc">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
          </div>
        `;
        return;
      }

      projectsGrid.style.display = 'grid';
      projectsGrid.innerHTML = filtered.map(project => {
        const pTasks = allTasks.filter(t => t.project_id === project.id);
        const doneCount = pTasks.filter(t => t.status === 'DONE').length;
        const pct = pTasks.length === 0 ? 0 : Math.round((doneCount / pTasks.length) * 100);

        return `
          <article class="project-card">
            <div>
              <div class="project-card-top">
                <span class="badge badge-${project.status.toLowerCase()}">${project.status}</span>
                <div class="project-card-actions">
                  <button class="btn btn-ghost btn-sm edit-project-btn" data-id="${project.id}" title="Sửa">✎</button>
                  <button class="btn btn-ghost btn-sm delete-project-btn" data-id="${project.id}" title="Xóa">🗑</button>
                </div>
              </div>
              <h3 class="project-card-title">${UIHelper.escapeHTML(project.name)}</h3>
              <p class="project-card-desc">${UIHelper.escapeHTML(project.description) || 'Chưa có mô tả cho dự án này.'}</p>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Tiến độ (${doneCount}/${pTasks.length} tasks)</span>
                <span style="font-weight: 600;">${pct}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${pct === 100 && pTasks.length > 0 ? 'complete' : ''}" style="width: ${pct}%;"></div>
              </div>
              <div class="project-card-meta">
                📅 ${project.start_date ? UIHelper.formatDate(project.start_date) : '...'} &rarr; ${project.end_date ? UIHelper.formatDate(project.end_date) : '...'}
              </div>
              <a href="project-detail.html?id=${project.id}" class="btn btn-secondary btn-full">Xem chi tiết &rarr;</a>
            </div>
          </article>
        `;
      }).join('');

      // Gắn sự kiện Sửa & Xóa cho từng card
      document.querySelectorAll('.edit-project-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const project = StorageService.getProjectById(btn.dataset.id, currentUser.id);
          if (project) openProjectModal(project);
        });
      });

      document.querySelectorAll('.delete-project-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          projectToDeleteId = btn.dataset.id;
          document.getElementById('deleteModalMessage').textContent =
            'Bạn có chắc chắn muốn xóa dự án này? Toàn bộ công việc bên trong dự án cũng sẽ bị xóa.';
          deleteModal.classList.add('active');
        });
      });
    }

    document.getElementById('openCreateProjectBtn').addEventListener('click', () => openProjectModal());
    searchInput.addEventListener('input', renderProjectsList);
    statusFilter.addEventListener('change', renderProjectsList);

    projectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = projectNameInput.value.trim();
      if (!name) return UIHelper.showToast('Vui lòng nhập tên dự án', 'error');

      const payload = {
        name,
        description: projectDescInput.value,
        start_date: projectStartInput.value,
        end_date: projectEndInput.value,
        status: projectStatusInput.value
      };

      const id = projectIdInput.value;
      if (id) {
        StorageService.updateProject(id, currentUser.id, payload);
        UIHelper.showToast('Cập nhật dự án thành công!');
      } else {
        StorageService.createProject(currentUser.id, payload);
        UIHelper.showToast('Tạo dự án mới thành công!');
      }

      closeProjectModal();
      renderProjectsList();
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
      deleteModal.classList.remove('active');
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
      if (projectToDeleteId) {
        StorageService.deleteProject(projectToDeleteId, currentUser.id);
        UIHelper.showToast('Đã xóa dự án.');
        projectToDeleteId = null;
        deleteModal.classList.remove('active');
        renderProjectsList();
      }
    });

    renderProjectsList();
  }

  // ================= TRANG 2: CHI TIẾT DỰ ÁN (project-detail.html) =================
  const projectDetailPage = document.getElementById('projectDetailPage');
  if (projectDetailPage) {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    window.renderProjectHeader = function () {
      const project = StorageService.getProjectById(projectId, currentUser.id);
      if (!project) {
        document.getElementById('projectDetailError').classList.remove('hidden');
        document.getElementById('projectDetailContent').classList.add('hidden');
        return null;
      }

      document.getElementById('projectDetailError').classList.add('hidden');
      document.getElementById('projectDetailContent').classList.remove('hidden');

      const tasks = StorageService.getTasksByProject(project.id, currentUser.id);
      const doneCount = tasks.filter(t => t.status === 'DONE').length;
      const pct = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100);

      document.getElementById('detailProjectName').textContent = project.name;
      const statusBadge = document.getElementById('detailProjectStatus');
      statusBadge.textContent = project.status;
      statusBadge.className = `badge badge-${project.status.toLowerCase()}`;

      document.getElementById('detailProjectDesc').textContent =
        project.description || 'Chưa có mô tả chi tiết cho dự án này.';
      document.getElementById('detailProjectDates').textContent =
        `📅 Thời gian: ${project.start_date ? UIHelper.formatDate(project.start_date) : 'Chưa đặt'} - ${project.end_date ? UIHelper.formatDate(project.end_date) : 'Chưa đặt'}`;
      document.getElementById('detailProjectProgressText').textContent = `${pct}% (${doneCount}/${tasks.length})`;
      document.getElementById('detailProjectProgressBar').style.width = `${pct}%`;
      document.getElementById('openProjectKanbanLink').href = `kanban.html?projectId=${project.id}`;

      return project;
    };

    const currentProject = window.renderProjectHeader();
    if (currentProject) {
      document.getElementById('editCurrentProjectBtn').addEventListener('click', () => {
        const latest = StorageService.getProjectById(projectId, currentUser.id);
        openProjectModal(latest);
      });

      projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = projectNameInput.value.trim();
        if (!name) return UIHelper.showToast('Vui lòng nhập tên dự án', 'error');

        StorageService.updateProject(projectId, currentUser.id, {
          name,
          description: projectDescInput.value,
          start_date: projectStartInput.value,
          end_date: projectEndInput.value,
          status: projectStatusInput.value
        });
        UIHelper.showToast('Đã cập nhật thông tin dự án!');
        closeProjectModal();
        window.renderProjectHeader();
      });
    }
  }
});
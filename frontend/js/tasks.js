document.addEventListener('DOMContentLoaded', () => {
  const projectDetailPage = document.getElementById('projectDetailPage');
  if (!projectDetailPage) return;

  const currentUser = StorageService.getCurrentUser();
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');
  if (!currentUser || !projectId) return;

  const container = document.getElementById('projectTasksContainer');
  const searchInput = document.getElementById('taskSearchInput');
  const statusFilter = document.getElementById('taskStatusFilter');
  const priorityFilter = document.getElementById('taskPriorityFilter');

  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskIdInput = document.getElementById('taskIdInput');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const taskDescInput = document.getElementById('taskDescInput');
  const taskPriorityInput = document.getElementById('taskPriorityInput');
  const taskStatusInput = document.getElementById('taskStatusInput');
  const taskDueDateInput = document.getElementById('taskDueDateInput');

  const deleteModal = document.getElementById('deleteModal');
  let taskToDeleteId = null;

  function openTaskModal(task = null) {
    if (task) {
      taskModalTitle.textContent = 'Chỉnh sửa công việc';
      taskIdInput.value = task.id;
      taskTitleInput.value = task.title;
      taskDescInput.value = task.description;
      taskPriorityInput.value = task.priority;
      taskStatusInput.value = task.status;
      taskDueDateInput.value = task.due_date;
    } else {
      taskModalTitle.textContent = 'Thêm công việc mới';
      taskForm.reset();
      taskIdInput.value = '';
      taskPriorityInput.value = 'MEDIUM';
      taskStatusInput.value = 'TODO';
    }
    taskModal.classList.add('active');
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModal.classList.remove('active');
  }

  function renderProjectTasks() {
    const allTasks = StorageService.getTasksByProject(projectId, currentUser.id);
    const keyword = searchInput.value.trim().toLowerCase();
    const statusVal = statusFilter.value;
    const priorityVal = priorityFilter.value;

    const filtered = allTasks.filter(t => {
      const matchText = t.title.toLowerCase().includes(keyword) || t.description.toLowerCase().includes(keyword);
      const matchStatus = statusVal === 'ALL' || t.status === statusVal;
      const matchPriority = priorityVal === 'ALL' || t.priority === priorityVal;
      return matchText && matchStatus && matchPriority;
    });

    if (allTasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3 class="empty-state-title">Dự án này chưa có công việc nào</h3>
          <p class="empty-state-desc">Hãy thêm công việc đầu tiên để theo dõi tiến độ dự án.</p>
          <button id="emptyAddTaskBtn" class="btn btn-primary">+ Thêm công việc</button>
        </div>
      `;
      document.getElementById('emptyAddTaskBtn').addEventListener('click', () => openTaskModal());
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">Không tìm thấy công việc phù hợp</h3>
          <p class="empty-state-desc">Thử xóa từ khóa tìm kiếm hoặc chọn lại bộ lọc.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="tasks-table-wrapper">
        <table class="tasks-table">
          <thead>
            <tr>
              <th>Công việc</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Hạn chót</th>
              <th style="text-align: right;">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(task => {
              const overdue = UIHelper.isOverdue(task.due_date, task.status);
              return `
                <tr>
                  <td>
                    <div style="font-weight: 600;">${UIHelper.escapeHTML(task.title)}</div>
                    ${task.description ? `<div style="font-size: 12px; color: var(--text-secondary);">${UIHelper.escapeHTML(task.description)}</div>` : ''}
                  </td>
                  <td><span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span></td>
                  <td>
                    <select class="form-control quick-status-select" data-id="${task.id}" style="padding: 4px 8px; font-size: 12px; width: auto;">
                      <option value="TODO" ${task.status === 'TODO' ? 'selected' : ''}>TODO</option>
                      <option value="IN_PROGRESS" ${task.status === 'IN_PROGRESS' ? 'selected' : ''}>IN PROGRESS</option>
                      <option value="IN_REVIEW" ${task.status === 'IN_REVIEW' ? 'selected' : ''}>IN REVIEW</option>
                      <option value="DONE" ${task.status === 'DONE' ? 'selected' : ''}>DONE</option>
                    </select>
                  </td>
                  <td class="${overdue ? 'text-danger' : ''}">
                    ${UIHelper.formatDate(task.due_date)} ${overdue ? '⚠️' : ''}
                  </td>
                  <td style="text-align: right; white-space: nowrap;">
                    <button class="btn btn-ghost btn-sm edit-task-btn" data-id="${task.id}">✎ Sửa</button>
                    <button class="btn btn-ghost btn-sm delete-task-btn" data-id="${task.id}" style="color: var(--color-danger);">🗑 Xóa</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Đổi trạng thái nhanh ngay trên bảng
    document.querySelectorAll('.quick-status-select').forEach(select => {
      select.addEventListener('change', (e) => {
        StorageService.updateTaskStatus(e.target.dataset.id, currentUser.id, e.target.value);
        UIHelper.showToast('Đã cập nhật trạng thái công việc!');
        if (window.renderProjectHeader) window.renderProjectHeader();
        renderProjectTasks();
      });
    });

    // Nút Sửa Task
    document.querySelectorAll('.edit-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const task = allTasks.find(t => t.id === Number(btn.dataset.id));
        if (task) openTaskModal(task);
      });
    });

    // Nút Xóa Task
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        taskToDeleteId = btn.dataset.id;
        document.getElementById('deleteModalMessage').textContent = 'Bạn có chắc chắn muốn xóa công việc này?';
        deleteModal.classList.add('active');
      });
    });
  }

  document.getElementById('openCreateTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('closeTaskModalBtn').addEventListener('click', closeTaskModal);
  document.getElementById('cancelTaskModalBtn').addEventListener('click', closeTaskModal);

  searchInput.addEventListener('input', renderProjectTasks);
  statusFilter.addEventListener('change', renderProjectTasks);
  priorityFilter.addEventListener('change', renderProjectTasks);

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return UIHelper.showToast('Vui lòng nhập tiêu đề công việc', 'error');

    const payload = {
      project_id: projectId,
      title,
      description: taskDescInput.value,
      priority: taskPriorityInput.value,
      status: taskStatusInput.value,
      due_date: taskDueDateInput.value
    };

    const id = taskIdInput.value;
    if (id) {
      StorageService.updateTask(id, currentUser.id, payload);
      UIHelper.showToast('Cập nhật công việc thành công!');
    } else {
      StorageService.createTask(currentUser.id, payload);
      UIHelper.showToast('Thêm công việc mới thành công!');
    }

    closeTaskModal();
    if (window.renderProjectHeader) window.renderProjectHeader();
    renderProjectTasks();
  });

  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    deleteModal.classList.remove('active');
  });

  document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (taskToDeleteId) {
      StorageService.deleteTask(taskToDeleteId, currentUser.id);
      UIHelper.showToast('Đã xóa công việc.');
      taskToDeleteId = null;
      deleteModal.classList.remove('active');
      if (window.renderProjectHeader) window.renderProjectHeader();
      renderProjectTasks();
    }
  });

  renderProjectTasks();
});
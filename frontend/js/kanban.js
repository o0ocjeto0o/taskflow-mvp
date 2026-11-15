document.addEventListener('DOMContentLoaded', () => {
  const kanbanPage = document.getElementById('kanbanPage');
  if (!kanbanPage) return;

  const currentUser = UIHelper.initAppShell();
  if (!currentUser) return;

  const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  const projectFilter = document.getElementById('kanbanProjectFilter');
  const searchInput = document.getElementById('kanbanSearchInput');

  const taskModal = document.getElementById('taskModal');
  const taskForm = document.getElementById('taskForm');
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskIdInput = document.getElementById('taskIdInput');
  const taskProjectSelect = document.getElementById('taskProjectSelect');
  const taskTitleInput = document.getElementById('taskTitleInput');
  const taskDescInput = document.getElementById('taskDescInput');
  const taskPriorityInput = document.getElementById('taskPriorityInput');
  const taskStatusInput = document.getElementById('taskStatusInput');
  const taskDueDateInput = document.getElementById('taskDueDateInput');

  const deleteModal = document.getElementById('deleteModal');
  let taskToDeleteId = null;
  let draggedTaskId = null;
  let cachedProjects = [];
  let cachedTasks = [];

  async function populateProjectDropdowns() {
    try {
      cachedProjects = await ApiService.getProjects();
      const params = new URLSearchParams(window.location.search);
      const preselectedProjectId = params.get('projectId') || 'ALL';

      projectFilter.innerHTML = `<option value="ALL">Tất cả dự án (${cachedProjects.length})</option>` +
        cachedProjects.map(p => `<option value="${p.id}">${UIHelper.escapeHTML(p.name)}</option>`).join('');

      if (cachedProjects.some(p => String(p.id) === preselectedProjectId)) {
        projectFilter.value = preselectedProjectId;
      }

      taskProjectSelect.innerHTML = cachedProjects.map(p =>
        `<option value="${p.id}">${UIHelper.escapeHTML(p.name)}</option>`
      ).join('');
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    }
  }

  function openTaskModal(task = null) {
    if (cachedProjects.length === 0) {
      UIHelper.showToast('Bạn cần tạo ít nhất 1 dự án trước khi thêm công việc!', 'error');
      return;
    }

    if (task) {
      taskModalTitle.textContent = 'Chỉnh sửa công việc';
      taskIdInput.value = task.id;
      taskProjectSelect.value = task.project_id;
      taskTitleInput.value = task.title;
      taskDescInput.value = task.description || '';
      taskPriorityInput.value = task.priority;
      taskStatusInput.value = task.status;
      taskDueDateInput.value = task.due_date || '';
    } else {
      taskModalTitle.textContent = 'Thêm công việc mới';
      taskForm.reset();
      taskIdInput.value = '';
      if (projectFilter.value !== 'ALL') {
        taskProjectSelect.value = projectFilter.value;
      }
    }
    taskModal.classList.add('active');
    taskTitleInput.focus();
  }

  function closeTaskModal() {
    taskModal.classList.remove('active');
  }

  async function renderKanbanBoard() {
    try {
      const selectedProject = projectFilter.value;
      const keyword = searchInput.value.trim();

      const tasks = await ApiService.getTasks({
        projectId: selectedProject,
        search: keyword
      });
      cachedTasks = tasks;

      STATUS_ORDER.forEach(status => {
        const colContainer = document.getElementById(`col-${status}`);
        const countBadge = document.getElementById(`count-${status}`);
        const colTasks = tasks.filter(t => t.status === status);

        countBadge.textContent = colTasks.length;

        if (colTasks.length === 0) {
          colContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 24px 8px;">Chưa có thẻ nào</div>`;
          return;
        }

        const currentIndex = STATUS_ORDER.indexOf(status);
        const prevStatus = currentIndex > 0 ? STATUS_ORDER[currentIndex - 1] : null;
        const nextStatus = currentIndex < STATUS_ORDER.length - 1 ? STATUS_ORDER[currentIndex + 1] : null;

        colContainer.innerHTML = colTasks.map(task => {
          const overdue = UIHelper.isOverdue(task.due_date, task.status);
          const projectName = task.project_name || 'Dự án';

          return `
            <div class="kanban-card" draggable="true" data-id="${task.id}">
              <div class="kanban-card-top">
                <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                <span class="kanban-project-tag" title="${UIHelper.escapeHTML(projectName)}">${UIHelper.escapeHTML(projectName)}</span>
              </div>
              <div class="kanban-card-title">${UIHelper.escapeHTML(task.title)}</div>
              <div class="kanban-card-footer">
                <span class="${overdue ? 'text-danger' : ''}">
                  📅 ${task.due_date ? UIHelper.formatDate(task.due_date) : 'Không hạn'}
                </span>
                <div class="kanban-move-btns">
                  ${prevStatus ? `<button class="btn btn-ghost btn-sm move-btn" data-id="${task.id}" data-target="${prevStatus}" title="Lùi trạng thái">&larr;</button>` : ''}
                  ${nextStatus ? `<button class="btn btn-ghost btn-sm move-btn" data-id="${task.id}" data-target="${nextStatus}" title="Tiến trạng thái">&rarr;</button>` : ''}
                  <button class="btn btn-ghost btn-sm edit-kanban-btn" data-id="${task.id}" title="Sửa">✎</button>
                  <button class="btn btn-ghost btn-sm delete-kanban-btn" data-id="${task.id}" title="Xóa" style="color: var(--color-danger);">🗑</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      });

      attachCardEvents();
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    }
  }

  function attachCardEvents() {
    document.querySelectorAll('.move-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await ApiService.updateTaskStatus(btn.dataset.id, btn.dataset.target);
          await renderKanbanBoard();
        } catch (err) {
          UIHelper.showToast(err.message, 'error');
        }
      });
    });

    document.querySelectorAll('.edit-kanban-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const task = cachedTasks.find(t => t.id === Number(btn.dataset.id));
        if (task) openTaskModal(task);
      });
    });

    document.querySelectorAll('.delete-kanban-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        taskToDeleteId = btn.dataset.id;
        deleteModal.classList.add('active');
      });
    });

    document.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', () => {
        draggedTaskId = card.dataset.id;
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedTaskId = null;
      });
    });
  }

  document.querySelectorAll('.kanban-column').forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });

    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      const newStatus = column.dataset.status;

      if (draggedTaskId && newStatus) {
        try {
          await ApiService.updateTaskStatus(draggedTaskId, newStatus);
          UIHelper.showToast(`Đã lưu trạng thái ${newStatus} vào Database`);
          await renderKanbanBoard();
        } catch (err) {
          UIHelper.showToast(err.message, 'error');
        }
      }
    });
  });

  document.getElementById('openKanbanCreateTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('closeTaskModalBtn').addEventListener('click', closeTaskModal);
  document.getElementById('cancelTaskModalBtn').addEventListener('click', closeTaskModal);

  projectFilter.addEventListener('change', renderKanbanBoard);
  searchInput.addEventListener('input', renderKanbanBoard);

  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    if (!title) return UIHelper.showToast('Vui lòng nhập tiêu đề công việc', 'error');

    const submitBtn = taskForm.querySelector('button[type="submit"]');
    const payload = {
      project_id: Number(taskProjectSelect.value),
      title,
      description: taskDescInput.value,
      priority: taskPriorityInput.value,
      status: taskStatusInput.value,
      due_date: taskDueDateInput.value
    };

    try {
      submitBtn.disabled = true;
      const id = taskIdInput.value;
      if (id) {
        await ApiService.updateTask(id, payload);
        UIHelper.showToast('Đã cập nhật công việc!');
      } else {
        await ApiService.createTask(payload);
        UIHelper.showToast('Đã thêm công việc mới!');
      }

      closeTaskModal();
      await renderKanbanBoard();
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    deleteModal.classList.remove('active');
  });

  document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!taskToDeleteId) return;
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    try {
      confirmBtn.disabled = true;
      await ApiService.deleteTask(taskToDeleteId);
      UIHelper.showToast('Đã xóa công việc.');
      taskToDeleteId = null;
      deleteModal.classList.remove('active');
      await renderKanbanBoard();
    } catch (err) {
      UIHelper.showToast(err.message, 'error');
    } finally {
      confirmBtn.disabled = false;
    }
  });

  // Khởi chạy dữ liệu ban đầu
  populateProjectDropdowns().then(() => renderKanbanBoard());
});
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = UIHelper.initAppShell();
  if (!currentUser) return;

  function renderDashboard() {
    const stats = StorageService.getDashboardStats(currentUser.id);

    // 1. Cập nhật 5 thẻ KPI
    document.getElementById('statTotalProjects').textContent = stats.totalProjects;
    document.getElementById('statTotalTasks').textContent = stats.totalTasks;
    document.getElementById('statCompletedTasks').textContent = stats.completedTasks;
    document.getElementById('statInProgressTasks').textContent = stats.inProgressTasks;
    document.getElementById('statOverdueTasks').textContent = stats.overdueTasks;

    // 2. Cập nhật thanh tiến độ tổng thể
    document.getElementById('statOverallProgress').textContent = `${stats.overallProgress}%`;
    const progressBar = document.getElementById('overallProgressBar');
    progressBar.style.width = `${stats.overallProgress}%`;
    if (stats.overallProgress === 100 && stats.totalTasks > 0) {
      progressBar.classList.add('complete');
    } else {
      progressBar.classList.remove('complete');
    }

    // 3. Hiển thị danh sách dự án gần đây
    const projectsListEl = document.getElementById('activeProjectsList');
    if (stats.projects.length === 0) {
      projectsListEl.innerHTML = `
        <div class="empty-state" style="padding: 24px 16px;">
          <p style="color: var(--text-secondary); margin-bottom: 12px;">Bạn chưa có dự án nào.</p>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <a href="projects.html" class="btn btn-primary btn-sm">+ Tạo dự án đầu tiên</a>
            <button id="seedDemoBtn" class="btn btn-secondary btn-sm">✨ Tạo dữ liệu mẫu</button>
          </div>
        </div>
      `;
      const seedBtn = document.getElementById('seedDemoBtn');
      if (seedBtn) {
        seedBtn.addEventListener('click', () => {
          StorageService.seedDemoData(currentUser.id);
          UIHelper.showToast('Đã tạo dữ liệu mẫu thành công!');
          renderDashboard();
        });
      }
    } else {
      projectsListEl.innerHTML = stats.projects.slice(0, 4).map(project => {
        const pTasks = stats.tasks.filter(t => t.project_id === project.id);
        const doneCount = pTasks.filter(t => t.status === 'DONE').length;
        const pct = pTasks.length === 0 ? 0 : Math.round((doneCount / pTasks.length) * 100);

        return `
          <div class="summary-item">
            <div style="min-width: 0; flex: 1;">
              <a href="project-detail.html?id=${project.id}" style="font-weight: 600; color: var(--text-primary); display: block;">
                ${UIHelper.escapeHTML(project.name)}
              </a>
              <span style="font-size: 12px; color: var(--text-secondary);">Hoàn thành ${doneCount}/${pTasks.length} công việc</span>
            </div>
            <span class="badge badge-${project.status.toLowerCase()}">${pct}%</span>
          </div>
        `;
      }).join('');
    }

    // 4. Hiển thị công việc cần chú ý (chưa DONE, ưu tiên quá hạn hoặc HIGH)
    const urgentTasksEl = document.getElementById('urgentTasksList');
    const pendingTasks = stats.tasks.filter(t => t.status !== 'DONE');

    if (pendingTasks.length === 0) {
      urgentTasksEl.innerHTML = `
        <div class="empty-state" style="padding: 24px 16px;">
          <p style="color: var(--text-secondary);">Tuyệt vời! Không có công việc nào đang tồn đọng.</p>
        </div>
      `;
    } else {
      urgentTasksEl.innerHTML = pendingTasks.slice(0, 5).map(task => {
        const overdue = UIHelper.isOverdue(task.due_date, task.status);
        return `
          <div class="summary-item">
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600;">${UIHelper.escapeHTML(task.title)}</div>
              <div style="font-size: 12px;" class="${overdue ? 'text-danger' : ''}">
                Hạn: ${UIHelper.formatDate(task.due_date)} ${overdue ? '(Quá hạn!)' : ''}
              </div>
            </div>
            <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
          </div>
        `;
      }).join('');
    }
  }

  renderDashboard();
});
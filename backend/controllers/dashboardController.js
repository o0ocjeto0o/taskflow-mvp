const store = require('../data/store');

// GET /api/dashboard/stats
const getDashboardStats = (req, res) => {
  const projects = store.projects;
  const tasks = store.tasks;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdueTasks = tasks.filter(
    t => t.due_date && t.due_date < today && t.status !== 'DONE'
  ).length;

  const overallProgress = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100);

  res.status(200).json({
    success: true,
    data: {
      totalProjects,
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      overallProgress
    }
  });
};

module.exports = {
  getDashboardStats
};
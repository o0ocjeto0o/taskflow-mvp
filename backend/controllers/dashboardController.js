const { dbGet } = require('../database/db');

const DEFAULT_USER_ID = 1;

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 1. Đếm tổng số dự án của user
    const projectRow = await dbGet(
      'SELECT COUNT(*) AS totalProjects FROM projects WHERE user_id = ?',
      [DEFAULT_USER_ID]
    );

    // 2. Thống kê các chỉ số công việc bằng SQL
    const taskStats = await dbGet(
      `SELECT
        COUNT(tasks.id) AS totalTasks,
        COALESCE(SUM(CASE WHEN tasks.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completedTasks,
        COALESCE(SUM(CASE WHEN tasks.status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0) AS inProgressTasks,
        COALESCE(SUM(CASE WHEN tasks.due_date != '' AND tasks.due_date < ? AND tasks.status != 'DONE' THEN 1 ELSE 0 END), 0) AS overdueTasks
       FROM tasks
       INNER JOIN projects ON tasks.project_id = projects.id
       WHERE projects.user_id = ?`,
      [today, DEFAULT_USER_ID]
    );

    const totalProjects = projectRow.totalProjects || 0;
    const totalTasks = taskStats.totalTasks || 0;
    const completedTasks = taskStats.completedTasks || 0;
    const inProgressTasks = taskStats.inProgressTasks || 0;
    const overdueTasks = taskStats.overdueTasks || 0;

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
  } catch (err) {
    console.error('Lỗi getDashboardStats:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi tính toán thống kê.' });
  }
};

module.exports = {
  getDashboardStats
};
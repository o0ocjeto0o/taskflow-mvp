/**
 * Kho dữ liệu tạm thời trên RAM cho Phase 5 (In-Memory Data Store)
 * Sang Phase 6, dữ liệu này sẽ được chuyển hoàn toàn sang Database SQLite.
 * Tạm thời mặc định user_id = 1 (sẽ xử lý đăng nhập thật ở Phase 7).
 */

const store = {
  projects: [
    {
      id: 1,
      user_id: 1,
      name: 'Xây dựng Website TaskFlow',
      description: 'Hoàn thiện dự án Full-stack quản lý công việc đưa vào CV.',
      start_date: '2026-11-01',
      end_date: '2026-12-05',
      status: 'ACTIVE',
      created_at: '2026-11-01 08:00:00'
    },
    {
      id: 2,
      user_id: 1,
      name: 'Ôn tập Cấu trúc dữ liệu & Giải thuật',
      description: 'Luyện giải 30 bài tập thuật toán chuẩn bị phỏng vấn.',
      start_date: '2026-11-10',
      end_date: '2026-11-30',
      status: 'ACTIVE',
      created_at: '2026-11-10 09:30:00'
    }
  ],

  tasks: [
    {
      id: 1,
      project_id: 1,
      title: 'Thiết kế sơ đồ ERD & REST API',
      description: 'Xác định 3 bảng users, projects, tasks và đặc tả HTTP.',
      priority: 'HIGH',
      status: 'DONE',
      due_date: '2026-11-12',
      created_at: '2026-11-02 10:00:00'
    },
    {
      id: 2,
      project_id: 1,
      title: 'Xây dựng Backend REST API với Express',
      description: 'Viết đầy đủ các endpoint cho Projects, Tasks và Dashboard.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      due_date: '2026-11-20',
      created_at: '2026-11-15 11:00:00'
    },
    {
      id: 3,
      project_id: 2,
      title: 'Hoàn thành bài tập Array & Hash Map',
      description: 'Làm 10 bài mức Easy & Medium.',
      priority: 'LOW',
      status: 'TODO',
      due_date: '2026-11-10', // Quá hạn so với ngày hiện tại để test chỉ số Overdue
      created_at: '2026-11-11 14:00:00'
    }
  ],

  // Hàm sinh ID tự tăng giống AUTOINCREMENT trong SQLite
  nextId(list) {
    if (list.length === 0) return 1;
    return Math.max(...list.map(item => item.id)) + 1;
  },

  nowISO() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }
};

module.exports = store;
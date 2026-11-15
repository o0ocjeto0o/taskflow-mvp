const express = require('express');
const cors = require('cors');

// Import các file định tuyến (Routes)
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = 3000;

// ================= MIDDLEWARE TOÀN CỤC =================
// 1. Cho phép Frontend (chạy ở port khác) gọi API sang Server này
app.use(cors());

// 2. Phân tích dữ liệu JSON gửi lên trong req.body
app.use(express.json());

// 3. Middleware ghi log mỗi khi có Request gửi tới (giúp dễ theo dõi khi học & debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next(); // Chuyển tiếp sang bước xử lý tiếp theo
});

// ================= ĐỊNH TUYẾN API =================
// API kiểm tra trạng thái hoạt động của Server
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TaskFlow Backend Server đang hoạt động ổn định!'
  });
});

// Gắn các nhóm API chính
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ================= XỬ LÝ LỖI ĐƯỜNG DẪN & LỖI SERVER =================
// Bắt lỗi 404 nếu người dùng gọi sai đường dẫn API
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`
  });
});

// Khởi động máy chủ
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 TaskFlow Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📡 Kiểm tra sức khỏe API tại:   http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});
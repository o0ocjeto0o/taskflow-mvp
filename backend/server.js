require('dotenv').config(); // Nạp các biến môi trường từ file .env

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database/db');

// Import các file định tuyến (Routes)
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Kiểm tra chắc chắn biến JWT_SECRET đã được cấu hình
if (!process.env.JWT_SECRET) {
  console.error('❌ Lỗi cấu hình: Thiếu biến JWT_SECRET trong file .env');
  process.exit(1);
}

// ================= MIDDLEWARE TOÀN CỤC =================
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ================= ĐỊNH TUYẾN API =================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TaskFlow Backend, SQLite & Authentication đã sẵn sàng!'
  });
});

// Tuyến đường Auth & Profile (/api/auth/* và /api/users/*)
app.use('/api', authRoutes);

// Các tuyến đường được bảo vệ bởi authMiddleware
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Bắt lỗi 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`
  });
});

// ================= KHỞI TẠO DATABASE & CHẠY SERVER =================
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 TaskFlow Server đang chạy tại: http://localhost:${PORT}`);
      console.log(`🔐 Hệ thống xác thực JWT & Bcrypt đã kích hoạt!`);
      console.log('====================================================');
    });
  })
  .catch((err) => {
    console.error('❌ Không thể khởi tạo Database. Dừng khởi động Server:', err.message);
    process.exit(1);
  });
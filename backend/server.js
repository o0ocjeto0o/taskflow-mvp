const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

if (!process.env.JWT_SECRET) {
  console.error('❌ Lỗi cấu hình: Thiếu biến JWT_SECRET trong biến môi trường.');
  process.exit(1);
}

// ================= MIDDLEWARE TOÀN CỤC =================
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// ================= ĐỊNH TUYẾN REST API =================
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    environment: process.env.NODE_ENV || 'development',
    message: 'TaskFlow Full-stack Server đang hoạt động ổn định!'
  });
});

app.use('/api', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Bắt lỗi 404 riêng cho các yêu cầu gọi sai đường dẫn /api/*
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy đường dẫn API: ${req.method} ${req.originalUrl}`
  });
});

// ================= PHỤC VỤ GIAO DIỆN TĨNH (FRONTEND) =================
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// Nếu người dùng nhập một đường dẫn trang web lạ không khớp file HTML nào, đưa về trang chủ
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ================= KHỞI TẠO DATABASE & CHẠY SERVER =================
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 TaskFlow Full-stack đang chạy tại: http://localhost:${PORT}`);
      console.log(`🌐 Mở trình duyệt và truy cập trực tiếp địa chỉ trên!`);
      console.log('====================================================');
    });
  })
  .catch((err) => {
    console.error('❌ Không thể khởi tạo Database. Dừng khởi động Server:', err.message);
    process.exit(1);
  });
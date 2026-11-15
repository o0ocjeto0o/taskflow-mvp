const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Đường dẫn tuyệt đối tới file database và file kịch bản SQL
const dbPath = path.join(__dirname, 'taskflow.sqlite');
const initSqlPath = path.join(__dirname, 'init.sql');

// Mở kết nối tới SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối SQLite:', err.message);
  } else {
    console.log('✅ Đã kết nối tới cơ sở dữ liệu SQLite:', dbPath);
  }
});

/**
 * Hàm chạy câu lệnh SQL thay đổi dữ liệu (INSERT, UPDATE, DELETE, CREATE)
 * Trả về Promise chứa { lastID, changes }
 */
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Hàm truy vấn lấy 1 dòng dữ liệu duy nhất (SELECT ... WHERE id = ?)
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

/**
 * Hàm truy vấn lấy danh sách nhiều dòng dữ liệu (SELECT * FROM ...)
 */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Khởi tạo cấu trúc bảng và tài khoản mặc định (id = 1) phục vụ Phase 6
 */
async function initializeDatabase() {
  // BẮT BUỘC: SQLite mặc định tắt kiểm tra Foreign Key, phải bật lên bằng lệnh PRAGMA
  await dbRun('PRAGMA foreign_keys = ON;');

  // Đọc nội dung file init.sql và thực thi từng câu lệnh tạo bảng
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  await new Promise((resolve, reject) => {
    db.exec(initSql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  // Tạo sẵn User mặc định (id = 1) để ràng buộc khóa ngoại projects.user_id hoạt động
  // trước khi chúng ta xây dựng chức năng Đăng ký/Đăng nhập thật ở Phase 7
  const existingUsers = await dbGet('SELECT COUNT(*) AS count FROM users');
  if (existingUsers.count === 0) {
    await dbRun(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [1, 'Sinh Viên Demo', 'demo@taskflow.com', 'pending_phase7_hash']
    );
    console.log('👤 Đã khởi tạo tài khoản mặc định (user_id = 1) cho Phase 6.');
  }
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initializeDatabase
};
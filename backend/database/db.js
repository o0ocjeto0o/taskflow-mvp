const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'taskflow.sqlite');
const initSqlPath = path.join(__dirname, 'init.sql');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Lỗi kết nối SQLite:', err.message);
  } else {
    console.log('✅ Đã kết nối tới cơ sở dữ liệu SQLite:', dbPath);
  }
});

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initializeDatabase() {
  // Bật kiểm tra khóa ngoại trên SQLite
  await dbRun('PRAGMA foreign_keys = ON;');

  // Tạo các bảng từ kịch bản init.sql
  const initSql = fs.readFileSync(initSqlPath, 'utf8');
  await new Promise((resolve, reject) => {
    db.exec(initSql, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  initializeDatabase
};
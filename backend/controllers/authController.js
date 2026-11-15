const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbRun, dbGet } = require('../database/db');

// Hàm tiện ích kiểm tra định dạng email chuẩn
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Hàm tiện ích tạo JWT Token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// 1. POST /api/auth/register - Đăng ký tài khoản mới
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào (Validation)
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên hiển thị.' });
    }
    if (!email || !isValidEmail(email.trim())) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không hợp lệ.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Kiểm tra email đã tồn tại trong Database chưa
    const existingUser = await dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác.'
      });
    }

    // Băm mật khẩu một chiều bằng bcryptjs (Salt Rounds = 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // Lưu người dùng mới vào SQLite
    const result = await dbRun(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    const newUser = await dbGet(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [result.lastID]
    );

    // Tạo Token để người dùng đăng nhập luôn sau khi đăng ký
    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công!',
      data: {
        user: newUser,
        token
      }
    });
  } catch (err) {
    console.error('Lỗi register:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng ký tài khoản.' });
  }
};

// 2. POST /api/auth/login - Đăng nhập
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ email và mật khẩu.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Tìm người dùng theo email
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      // Trả thông báo chung chung để tránh kẻ xấu dò xem email nào đã đăng ký
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    // So sánh mật khẩu nhập vào với chuỗi băm trong Database
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.'
      });
    }

    const token = generateToken(user);

    // Loại bỏ cột password_hash trước khi trả thông tin user về Frontend
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at
    };

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      data: {
        user: safeUser,
        token
      }
    });
  } catch (err) {
    console.error('Lỗi login:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng nhập.' });
  }
};

// 3. POST /api/auth/logout - Đăng xuất
const logout = (req, res) => {
  // Với JWT Stateless, Server xác nhận đăng xuất thành công; Client sẽ xóa Token khỏi bộ nhớ
  res.status(200).json({
    success: true,
    message: 'Đăng xuất thành công!'
  });
};

// 4. GET /api/users/me - Lấy thông tin hồ sơ người dùng đang đăng nhập
const getMe = async (req, res) => {
  try {
    const user = await dbGet(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Lỗi getMe:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy thông tin cá nhân.' });
  }
};

// 5. PUT /api/users/me - Cập nhật tên hiển thị
const updateMe = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Tên hiển thị không được để trống.' });
    }

    await dbRun('UPDATE users SET name = ? WHERE id = ?', [name.trim(), req.user.id]);

    const updatedUser = await dbGet(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ thành công!',
      data: updatedUser
    });
  } catch (err) {
    console.error('Lỗi updateMe:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi cập nhật hồ sơ.' });
  }
};

// 6. PUT /api/users/me/password - Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự.'
      });
    }

    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
    }

    // Xác thực mật khẩu cũ
    const isOldMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isOldMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không chính xác.'
      });
    }

    // Băm mật khẩu mới và cập nhật vào SQLite
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);

    res.status(200).json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (err) {
    console.error('Lỗi changePassword:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đổi mật khẩu.' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateMe,
  changePassword
};
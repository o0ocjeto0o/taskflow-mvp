const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // 1. Lấy giá trị Header Authorization (định dạng chuẩn: "Bearer <token>")
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Truy cập bị từ chối. Vui lòng đăng nhập để lấy Token xác thực.'
    });
  }

  // 2. Tách lấy phần chuỗi Token phía sau chữ "Bearer "
  const token = authHeader.split(' ')[1];

  try {
    // 3. Xác minh chữ ký và thời hạn của Token bằng JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Lưu thông tin user đã giải mã vào req.user để các Controller phía sau sử dụng
    req.user = {
      id: decoded.id,
      email: decoded.email
    };

    next(); // Token hợp lệ -> Cho phép đi tiếp vào Controller
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }
};

module.exports = authMiddleware;
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Nhóm tuyến đường Xác thực (/api/auth/...)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/logout', authMiddleware, authController.logout);

// Nhóm tuyến đường Hồ sơ người dùng (/api/users/...) - Bắt buộc đi qua authMiddleware
router.get('/users/me', authMiddleware, authController.getMe);
router.put('/users/me', authMiddleware, authController.updateMe);
router.put('/users/me/password', authMiddleware, authController.changePassword);

module.exports = router;
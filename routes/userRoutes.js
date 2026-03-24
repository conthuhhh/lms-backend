const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { csrfMiddleware } = require('../middleware/csrfMiddleware');

// Áp dụng CSRF cho mọi route thay đổi dữ liệu
router.post('/',   authMiddleware, adminMiddleware, csrfMiddleware, userController.createUser);
router.put('/:id', authMiddleware, csrfMiddleware, userController.updateUser);
router.delete('/:id', authMiddleware, adminMiddleware, csrfMiddleware, userController.deleteUser);

// Các route chỉ đọc — không cần CSRF
router.get('/',    authMiddleware, userController.getAllUsers);
router.get('/:id', authMiddleware, userController.getUserById);

module.exports = router;

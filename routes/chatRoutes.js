const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');

// GET /chat/:courseId/messages — lấy tin nhắn
router.get('/:courseId/messages', authMiddleware, chatController.getMessages);

// POST /chat/:courseId/messages — gửi tin nhắn
router.post('/:courseId/messages', authMiddleware, chatController.sendMessage);

// PATCH /chat/:courseId/messages/:messageId/pin — ghim/bỏ ghim
router.patch('/:courseId/messages/:messageId/pin', authMiddleware, chatController.togglePin);

// DELETE /chat/:courseId/messages/:messageId — xóa
router.delete('/:courseId/messages/:messageId', authMiddleware, chatController.deleteMessage);

module.exports = router;

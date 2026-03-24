const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middleware/authMiddleware');
const upload = require('../utils/upload');

router.post('/:courseId', authMiddleware, (req, res, next) => {
  const uploadSingle = upload.array('files', 5);
  uploadSingle(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File quá lớn. Kích thước tối đa là 50MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Tối đa 5 file mỗi lần tải lên.' });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Không có file nào được tải lên.' });
    }

    const attachments = req.files.map((file) => ({
      name: file.originalname,
      url: `/api/uploads/${path.basename(file.destination)}/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json({ files: attachments });
  });
});

module.exports = router;

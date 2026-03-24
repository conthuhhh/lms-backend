const express = require('express');
const router = express.Router();
const { getNextSemesterInfo } = require('../utils/semester');

/** Kì học mặc định (tiếp theo) — không cần đăng nhập */
router.get('/next-semester', (req, res) => {
  res.json(getNextSemesterInfo());
});

module.exports = router;

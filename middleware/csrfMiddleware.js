const { createCsrfSecret, createCsrfToken, verifyCsrfToken } = require('../utils/security');

/** Sinh CSRF secret & token, gửi kèm cookie khi login thành công */
const csrfMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Chỉ apply cho POST/PUT/DELETE
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Nếu không có token → bỏ qua (public route)
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'];
  /** Cookie httpOnly hoặc header (dự phòng khi trình duyệt chặn cookie) */
  const csrfSecret = req.cookies?.csrf_secret || req.headers['x-csrf-secret'];

  if (!csrfToken || !csrfSecret) {
    return res.status(403).json({ message: 'CSRF token missing.' });
  }

  const valid = verifyCsrfToken(csrfToken, csrfSecret);
  if (!valid) {
    return res.status(403).json({ message: 'Invalid CSRF token.' });
  }

  next();
};

/** Sinh CSRF secret mới → gửi cho client qua cookie */
function generateCsrfCookie(req, res, userId) {
  const secret = createCsrfSecret();
  const token = createCsrfToken(secret);

  res.cookie('csrf_secret', secret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 2 * 60 * 60 * 1000, // 2 giờ
    path: '/',
  });

  // Token + secret cho client (secret lưu localStorage + gửi header nếu cookie không tới)
  return { token, secret };
}

module.exports = { csrfMiddleware, generateCsrfCookie, createCsrfToken };

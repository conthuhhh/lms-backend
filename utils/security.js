/**
 * CSRF — dùng secret (cookie httpOnly) + token (header).
 * Token không phụ thuộc method/path để cùng một token dùng cho POST/PUT/DELETE.
 */

const crypto = require('crypto');

function createCsrfSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/** Tạo token: timestamp:HMAC — verify dùng lại đúng timestamp đó */
function createCsrfToken(secret) {
  const timestamp = Date.now().toString(36);
  const data = `csrf:${secret}:${timestamp}`;
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${timestamp}:${hash}`;
}

function verifyCsrfToken(token, secret) {
  if (!token || !secret) return false;

  const parts = token.split(':');
  if (parts.length !== 2) return false;

  const [timestamp, hash] = parts;
  const ts = parseInt(timestamp, 36);
  if (Number.isNaN(ts)) return false;

  const age = Date.now() - ts;
  if (age < 0 || age > 2 * 60 * 60 * 1000) return false;

  const data = `csrf:${secret}:${timestamp}`;
  const expectedHash = crypto.createHmac('sha256', secret).update(data).digest('hex');

  if (hash.length !== expectedHash.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

module.exports = { createCsrfSecret, createCsrfToken, verifyCsrfToken };

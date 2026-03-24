const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = `course_${req.params.id || 'misc'}_${Date.now()}`;
    const dest = path.join(UPLOAD_DIR, subDir);
    fs.mkdirSync(dest, { recursive: true });
    req._uploadPath = dest;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    cb(null, `${baseName}_${Date.now()}${ext}`);
  },
});

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'video/mp4', 'video/webm',
  'application/zip', 'application/x-zip-compressed',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Định dạng file không được hỗ trợ: ${file.mimetype}. Các định dạng cho phép: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, TXT, MP4, ZIP.`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 5,
  },
});

module.exports = upload;

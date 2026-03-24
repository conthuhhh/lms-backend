const mongoose = require('mongoose');

/**
 * Ngành học — do admin tạo (IT, Tiếng Anh, Kinh tế...)
 */
const CATEGORIES = ['CNTT', 'Ngôn ngữ', 'Kinh tế', 'Kỹ thuật', 'Sư phạm', 'Y dược', 'Luật', 'Marketing', 'Thiết kế', 'Khác'];

/**
 * Môn học do Admin cấu hình — giảng viên tham chiếu khi tạo khóa.
 */
const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  /** Ngành mà môn này thuộc về */
  category: {
    type: String,
    required: true,
    enum: CATEGORIES,
    default: 'Khác',
  },
  /** Số sinh viên tối đa mỗi lớp */
  maxStudents: {
    type: Number,
    required: true,
    min: 1,
    max: 200,
  },
  /** Số lớp mở cho môn này (GV chọn Lớp 1 … n) */
  numberOfClasses: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
  },
  /** Thời lượng buổi dạy (VD: 90 phút/buổi, 3 tiết/tuần) */
  sessionDuration: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Subject', subjectSchema);
module.exports.CATEGORIES = CATEGORIES;

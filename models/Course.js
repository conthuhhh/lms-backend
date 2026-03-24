const mongoose = require('mongoose');

const SEMESTERS = ['1', '2', '3'];

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  /** Nội dung bài giảng (văn bản HTML/markdown) */
  content: { type: String, default: '' },
  /** Tài liệu đính kèm: [{ name, url, size, mimetype }] */
  materials: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: '' },
  }],
  /** Video bài giảng (URL YouTube/Vimeo/MP4) */
  videoUrl: { type: String, default: '' },
  duration: { type: String, default: '' },
  /** Số thứ tự bài học */
  order: { type: Number, default: 0 },
}, { timestamps: true });

/** Bảng điểm — giảng viên chấm cho từng SV trong lớp */
const gradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  /** Điểm số (tùy giảng viên nhập, có thể là số hoặc chữ) */
  score: { type: String, default: '' },
  /** Nhận xét */
  comment: { type: String, default: '' },
  gradedAt: { type: Date, default: null },
}, { timestamps: true });

/** Bài tập — do giảng viên tạo */
const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  /** Nội dung chi tiết bài tập (HTML / văn bản) */
  content: { type: String, default: '' },
  /** Hạn nộp (ISO string) */
  dueDate: { type: Date, default: null },
  /** Điểm tối đa */
  maxScore: { type: Number, default: 10 },
  /** Tài liệu đính kèm: [{ name, url, size, mimetype }] */
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: '' },
  }],
  order: { type: Number, default: 0 },
}, { timestamps: true });

/** Bài nộp của sinh viên */
const submissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  /** Nội dung văn bản / HTML */
  content: { type: String, default: '' },
  /** File đính kèm bài nộp: [{ name, url, size, mimetype }] */
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: '' },
  }],
  /** Trạng thái: 'submitted' | 'graded' */
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
  /** Điểm giảng viên chấm */
  score: { type: String, default: '' },
  /** Nhận xét giảng viên */
  instructorComment: { type: String, default: '' },
  submittedAt: { type: Date, default: null },
  gradedAt: { type: Date, default: null },
  /** Đánh dấu nộp sau hạn */
  isLate: { type: Boolean, default: false },
}, { timestamps: true });

/** Tin nhắn trong khóa học */
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['admin', 'instructor', 'student'], required: true },
  content: { type: String, required: true, trim: true },
  isPinned: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  /** Tham chiếu môn cấu hình (admin) */
  subjectTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  academicYear: { type: String, default: '', trim: true },
  classSlot: { type: Number, min: 1 },
  semester: { type: String, enum: SEMESTERS, required: true },
  className: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  maxStudents: { type: Number, required: true, min: 1, max: 200 },
  price: { type: Number, default: 0 },
  thumbnail: { type: String, default: '' },
  duration: { type: String, default: '' },
  /** Danh sách SV — do admin phân lớp */
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  /** Bài giảng do giảng viên đăng tải */
  lessons: [lessonSchema],
  /** Bài tập do giảng viên đăng tải */
  assignments: [assignmentSchema],
  /** Bài nộp của sinh viên */
  submissions: [submissionSchema],
  /** Bảng điểm do giảng viên chấm */
  grades: [gradeSchema],
  /** Tin nhắn trong khóa học */
  messages: [messageSchema],
  isPublished: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

courseSchema.virtual('studentCount').get(function () {
  return this.enrolledStudents?.length || 0;
});

courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Course', courseSchema);
module.exports.SEMESTERS = SEMESTERS;

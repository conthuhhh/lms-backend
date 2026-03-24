const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { csrfMiddleware } = require('../middleware/csrfMiddleware');

// GET /courses — all authenticated users
router.get('/', authMiddleware, courseController.getAllCourses);

// GET /courses/stats — admin: toàn hệ; GV: khóa của mình
router.get('/stats', authMiddleware, courseController.getCourseStats);

// GET /courses/admin — admin: tất cả khóa học
router.get('/admin', authMiddleware, async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only.' });
  next();
}, courseController.getAdminCourses);

// GET /courses/:id
router.get('/:id', authMiddleware, courseController.getCourseById);

// POST /courses — tạo khóa học (instructor hoặc admin)
router.post('/', authMiddleware, csrfMiddleware, courseController.createCourse);

// PUT /courses/:id — cập nhật (instructor chỉ khóa mình, admin cũng được)
router.put('/:id', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role === 'instructor') {
    const Course = require('../models/Course');
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể sửa khóa học của mình.' });
    }
  }
  next();
}, courseController.updateCourse);

// DELETE /courses/:id — xóa (instructor chỉ khóa mình, admin cũng được)
router.delete('/:id', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role === 'instructor') {
    const Course = require('../models/Course');
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể xóa khóa học của mình.' });
    }
  }
  next();
}, courseController.deleteCourse);

// ================================================================
// QUẢN LÝ SINH VIÊN — chỉ admin
// POST /courses/:id/students  { studentIds, action }
// ================================================================
router.post('/:id/students', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin được phân lớp sinh viên.' });
  next();
}, courseController.manageStudents);

// ================================================================
// BÀI GIẢNG — giảng viên / admin
// POST /courses/:id/lessons     { lesson }        — thêm / cập nhật
// DELETE /courses/:id/lessons/:lessonId — xóa
// ================================================================
router.post('/:id/lessons', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền.' });
  }
  next();
}, courseController.manageLesson);

router.delete('/:id/lessons/:lessonId', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền.' });
  }
  next();
}, courseController.deleteLesson);

// ================================================================
// CHẤM ĐIỂM — giảng viên / admin
// POST /courses/:id/grades  { studentId, score, comment }
// ================================================================
router.post('/:id/grades', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền chấm điểm.' });
  }
  next();
}, courseController.gradeStudent);

// ================================================================
// BÀI TẬP — giảng viên / admin
// POST   /courses/:id/assignments     { assignment }        — thêm / cập nhật
// DELETE /courses/:id/assignments/:assignmentId — xóa
// ================================================================
router.post('/:id/assignments', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền.' });
  }
  next();
}, courseController.manageAssignment);

router.delete('/:id/assignments/:assignmentId', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền.' });
  }
  next();
}, courseController.deleteAssignment);

// ================================================================
// BÀI NỘP — sinh viên nộp / giảng viên chấm
// POST /courses/:id/submissions     { assignmentId, content, attachments } — nộp bài
// POST /courses/:id/submissions/grade { submissionId, score, instructorComment } — chấm điểm
// ================================================================
router.post('/:id/submissions', authMiddleware, csrfMiddleware, courseController.submitAssignment);

router.post('/:id/submissions/grade', authMiddleware, csrfMiddleware, async (req, res, next) => {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền chấm điểm.' });
  }
  next();
}, courseController.gradeSubmission);

module.exports = router;

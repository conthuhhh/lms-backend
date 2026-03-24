const Course = require('../models/Course');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { getNextSemesterInfo } = require('../utils/semester');

// Lấy tất cả khóa học (admin: tất cả published; GV: chỉ khóa mình; SV: chỉ enrolled)
exports.getAllCourses = async (req, res) => {
  try {
    const role = req.user?.role;
    const query = { isPublished: true };
    if (role === 'student') {
      query.enrolledStudents = req.user.id;
    } else if (role === 'instructor') {
      query.instructor = req.user.id;
    }
    const courses = await Course.find(query)
      .populate('instructor', 'name email subjectCategory')
      .populate('subjectTemplate', 'name category')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy chi tiết 1 khóa học
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email');
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user?.role === 'instructor') {
      const instructorId =
        course.instructor?._id?.toString() || course.instructor?.toString();
      if (instructorId !== req.user.id) {
        return res.status(403).json({
          message: 'Bạn chỉ có thể xem khóa học do mình phụ trách.',
        });
      }
    }

    // Sinh viên không được xem khóa không published hoặc không được gán
    if (req.user?.role === 'student') {
      const isEnrolled = course.enrolledStudents.some(
        (s) => s._id?.toString() === req.user.id || s.toString() === req.user.id
      );
      if (!course.isPublished || !isEnrolled) {
        return res.status(403).json({ message: 'Bạn không có quyền xem khóa học này.' });
      }
    }

    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo khóa học
exports.createCourse = async (req, res) => {
  try {
    const {
      subjectId, classSlot, description, isPublished,
      semester: semInput, academicYear: yearInput,
    } = req.body;

    if (!subjectId || classSlot == null || !String(description || '').trim()) {
      return res.status(400).json({
        message: 'subjectId, classSlot, description là bắt buộc.',
      });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject || !subject.isActive) {
      return res.status(400).json({ message: 'Môn học không tồn tại hoặc đã ngừng.' });
    }

    // Kiểm tra ngành: giảng viên chỉ được tạo môn cùng ngành
    if (req.user.role === 'instructor' && req.user.subjectCategory) {
      if (subject.category !== req.user.subjectCategory) {
        return res.status(403).json({
          message: `Bạn chỉ được tạo khóa học thuộc ngành "${req.user.subjectCategory}". Môn "${subject.name}" thuộc ngành "${subject.category}".`,
        });
      }
    }

    const slot = Number(classSlot);
    if (Number.isNaN(slot) || slot < 1 || slot > subject.numberOfClasses) {
      return res.status(400).json({
        message: `Chọn lớp từ 1 đến ${subject.numberOfClasses}.`,
      });
    }

    const next = getNextSemesterInfo();
    const semester = semInput && ['1', '2', '3'].includes(String(semInput)) ? String(semInput) : next.semester;
    const academicYear = yearInput?.trim() || next.academicYear;

    const className = `Lớp ${slot}/${subject.numberOfClasses}`;
    const title = `${subject.name} — ${className} — HK${semester} (${academicYear})`;

    const dup = await Course.findOne({
      subjectTemplate: subject._id,
      instructor: req.user.id,
      classSlot: slot,
      semester,
      academicYear,
    });
    if (dup) {
      return res.status(400).json({
        message: 'Bạn đã tạo khóa học cho môn, lớp và kì học này rồi.',
      });
    }

    const course = new Course({
      title,
      subject: subject.name,
      subjectTemplate: subject._id,
      semester,
      academicYear,
      className,
      classSlot: slot,
      description: String(description).trim(),
      instructor: req.user.id,
      maxStudents: subject.maxStudents,
      price: 0,
      duration: subject.sessionDuration,
      isPublished: !!isPublished,
    });

    await course.save();
    await course.populate('instructor', 'name email');
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Cập nhật khóa học (giảng viên chỉ sửa khóa của mình)
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể sửa khóa học của mình.' });
    }

    const { enrolledStudents, lessons, grades, ...courseFields } = req.body;

    if (enrolledStudents !== undefined && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ admin mới được phân lớp sinh viên.' });
    }

    if (lessons !== undefined && req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền sửa bài giảng.' });
    }

    if (grades !== undefined && req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền chấm điểm.' });
    }

    // Cập nhật từng trường
    if (courseFields) Object.assign(course, courseFields);
    if (enrolledStudents !== undefined) course.enrolledStudents = enrolledStudents;
    if (lessons !== undefined) course.lessons = lessons;
    if (grades !== undefined) course.grades = grades;

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Xóa khóa học
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể xóa khóa học của mình.' });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Đã xóa khóa học.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// THỐNG KÊ ĐIỂM — admin: toàn hệ thống / GV: khóa của mình
// ============================================================
exports.getCourseStats = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    const courseQuery = {};
    if (role === 'instructor') courseQuery.instructor = userId;

    const courses = await Course.find(courseQuery)
      .populate('instructor', 'name email')
      .lean();

    const totalCourses = courses.length;
    const totalStudents = new Set(
      courses.flatMap((c) => c.enrolledStudents.map((s) => s.toString()))
    ).size;

    let totalNumericScores = 0;
    let numericCount = 0;
    const gradeBuckets = { A: 0, B: 0, C: 0, D: 0, F: 0, 'Chưa chấm': 0 };

    for (const course of courses) {
      // Grades từ bảng điểm
      for (const g of course.grades || []) {
        const raw = (g.score || '').toString().trim();
        if (!raw) {
          gradeBuckets['Chưa chấm']++;
          continue;
        }
        const num = Number(raw);
        if (!isNaN(num)) {
          totalNumericScores += num;
          numericCount++;
          if (num >= 8.5) gradeBuckets.A++;
          else if (num >= 7.0) gradeBuckets.B++;
          else if (num >= 5.5) gradeBuckets.C++;
          else if (num >= 4.0) gradeBuckets.D++;
          else gradeBuckets.F++;
        } else {
          const upper = raw.toUpperCase();
          if (['A', 'A+', 'A+'].includes(upper)) gradeBuckets.A++;
          else if (['B', 'B+'].includes(upper)) gradeBuckets.B++;
          else if (['C', 'C+'].includes(upper)) gradeBuckets.C++;
          else if (['D', 'D+'].includes(upper)) gradeBuckets.D++;
          else gradeBuckets.F++;
        }
      }

      // Điểm từ submissions (bài tập)
      for (const sub of course.submissions || []) {
        const raw = (sub.score || '').toString().trim();
        if (!raw) {
          gradeBuckets['Chưa chấm']++;
          continue;
        }
        const num = Number(raw);
        if (!isNaN(num)) {
          totalNumericScores += num;
          numericCount++;
          if (num >= 8.5) gradeBuckets.A++;
          else if (num >= 7.0) gradeBuckets.B++;
          else if (num >= 5.5) gradeBuckets.C++;
          else if (num >= 4.0) gradeBuckets.D++;
          else gradeBuckets.F++;
        }
      }
    }

    const averageScore =
      numericCount > 0 ? (totalNumericScores / numericCount).toFixed(2) : null;
    const gradedCount =
      gradeBuckets.A + gradeBuckets.B + gradeBuckets.C + gradeBuckets.D + gradeBuckets.F;
    const passCount =
      gradeBuckets.A + gradeBuckets.B + gradeBuckets.C + gradeBuckets.D;
    const passRate =
      gradedCount > 0 ? ((passCount / gradedCount) * 100).toFixed(1) : null;

    // Top khóa học — tính điểm TB mỗi khóa
    const courseAverages = courses
      .map((c) => {
        const nums = (c.grades || [])
          .concat(c.submissions || [])
          .map((g) => Number((g.score || '').toString().trim()))
          .filter((n) => !isNaN(n));
        const avg =
          nums.length > 0
            ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)
            : null;
        return { _id: c._id, title: c.title, average: avg, count: nums.length };
      })
      .filter((c) => c.count > 0)
      .sort((a, b) => Number(b.average) - Number(a.average))
      .slice(0, 5);

    res.json({
      totalCourses,
      totalStudents,
      totalGrades: gradedCount + gradeBuckets['Chưa chấm'],
      gradedCount,
      ungradedCount: gradeBuckets['Chưa chấm'],
      averageScore,
      passRate,
      gradeBuckets,
      topCourses: courseAverages,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ============================================================
// QUẢN LÝ SINH VIÊN TRONG KHÓA HỌC (chỉ admin)
// ============================================================

// Lấy danh sách khóa học (admin: tất cả)
exports.getAdminCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('instructor', 'name email subjectCategory')
      .populate('subjectTemplate', 'name category')
      .populate('enrolledStudents', 'name email')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Gán/bỏ sinh viên khỏi khóa học (chỉ admin)
exports.manageStudents = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    const { studentIds, action } = req.body; // action: 'assign' | 'remove'

    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ message: 'studentIds phải là mảng.' });
    }

    // Verify all studentIds are valid students
    const students = await User.find({ _id: { $in: studentIds }, role: 'student' });
    if (students.length !== studentIds.length) {
      return res.status(400).json({ message: 'Một số ID không phải sinh viên hợp lệ.' });
    }

    if (action === 'assign') {
      const existing = new Set(course.enrolledStudents.map((id) => id.toString()));
      const toAdd = studentIds.filter((id) => !existing.has(id));
      const totalAfter = course.enrolledStudents.length + toAdd.length;
      if (totalAfter > course.maxStudents) {
        return res.status(400).json({
          message: `Sĩ số vượt quá tối đa (${course.maxStudents}). Chỉ còn chỗ cho ${course.maxStudents - course.enrolledStudents.length} sinh viên.`,
        });
      }
      course.enrolledStudents.push(...toAdd);
    } else if (action === 'remove') {
      const removeSet = new Set(studentIds);
      course.enrolledStudents = course.enrolledStudents.filter(
        (id) => !removeSet.has(id.toString())
      );
      // Xóa luôn điểm của SV bị bỏ
      course.grades = course.grades.filter(
        (g) => !removeSet.has(g.student.toString())
      );
    } else {
      return res.status(400).json({ message: 'action phải là "assign" hoặc "remove".' });
    }

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ============================================================
// BÀI GIẢNG & ĐIỂM (giảng viên / admin)
// ============================================================

// Thêm / cập nhật bài giảng
exports.manageLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể sửa khóa học của mình.' });
    }

    const { lessonId, lesson } = req.body; // lessonId null = thêm mới

    if (lessonId) {
      const idx = course.lessons.findIndex((l) => l._id?.toString() === lessonId);
      if (idx === -1) return res.status(404).json({ message: 'Bài giảng không tồn tại.' });
      Object.assign(course.lessons[idx], lesson);
    } else {
      course.lessons.push({ ...lesson, order: course.lessons.length });
    }

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Xóa bài giảng
exports.deleteLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể sửa khóa học của mình.' });
    }

    course.lessons = course.lessons.filter((l) => l._id?.toString() !== req.params.lessonId);
    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Chấm điểm sinh viên
exports.gradeStudent = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể chấm điểm khóa học của mình.' });
    }

    const { studentId, score, comment } = req.body;

    // Verify student is enrolled
    const enrolled = course.enrolledStudents.map((id) => id.toString());
    if (!enrolled.includes(studentId)) {
      return res.status(400).json({ message: 'Sinh viên không có trong lớp.' });
    }

    const gradeIdx = course.grades.findIndex((g) => g.student.toString() === studentId);
    if (gradeIdx >= 0) {
      course.grades[gradeIdx].score = score ?? '';
      course.grades[gradeIdx].comment = comment ?? '';
      course.grades[gradeIdx].gradedAt = new Date();
    } else {
      course.grades.push({
        student: studentId,
        score: score ?? '',
        comment: comment ?? '',
        gradedAt: new Date(),
      });
    }

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email')
      .populate('submissions.student', 'name email')
      .populate('submissions.assignmentId');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ============================================================
// BÀI TẬP — giảng viên / admin
// ============================================================

// Sinh viên nộp bài tập
exports.submitAssignment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    const studentId = req.user.id;
    const enrolled = course.enrolledStudents.map((id) => id.toString());
    if (!enrolled.includes(studentId)) {
      return res.status(403).json({ message: 'Sinh viên không có trong lớp.' });
    }

    const { assignmentId, content, attachments } = req.body;
    const assignmentExists = course.assignments.some(
      (a) => a._id?.toString() === assignmentId
    );
    if (!assignmentExists) {
      return res.status(404).json({ message: 'Bài tập không tồn tại.' });
    }

    const existingIdx = course.submissions.findIndex(
      (s) =>
        s.assignmentId.toString() === assignmentId &&
        (s.student._id || s.student).toString() === studentId
    );

    if (existingIdx >= 0) {
      course.submissions[existingIdx].content = content ?? '';
      course.submissions[existingIdx].attachments = attachments ?? [];
      course.submissions[existingIdx].status = 'submitted';
      course.submissions[existingIdx].submittedAt = new Date();
    } else {
      const assignment = course.assignments.find((a) => a._id?.toString() === assignmentId);
      const isLate = assignment?.dueDate ? new Date(assignment.dueDate) < new Date() : false;
      course.submissions.push({
        student: studentId,
        assignmentId,
        content: content ?? '',
        attachments: attachments ?? [],
        status: 'submitted',
        submittedAt: new Date(),
        isLate,
      });
    }

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email')
      .populate('submissions.student', 'name email')
      .populate('submissions.assignmentId');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Thêm / cập nhật bài tập
exports.manageAssignment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể quản lý bài tập trong khóa học của mình.' });
    }
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền.' });
    }

    const { assignmentId, assignment } = req.body; // assignmentId null = thêm mới

    if (assignmentId) {
      const idx = course.assignments.findIndex((a) => a._id?.toString() === assignmentId);
      if (idx === -1) return res.status(404).json({ message: 'Bài tập không tồn tại.' });
      Object.assign(course.assignments[idx], assignment);
    } else {
      course.assignments.push({ ...assignment, order: course.assignments.length });
    }

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email')
      .populate('submissions.student', 'name email')
      .populate('submissions.assignmentId');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Xóa bài tập
exports.deleteAssignment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể quản lý bài tập trong khóa học của mình.' });
    }
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền.' });
    }

    course.assignments = course.assignments.filter((a) => a._id?.toString() !== req.params.assignmentId);
    course.submissions = course.submissions.filter(
      (s) => s.assignmentId.toString() !== req.params.assignmentId
    );

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email')
      .populate('submissions.student', 'name email')
      .populate('submissions.assignmentId');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Giảng viên chấm bài nộp
exports.gradeSubmission = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role === 'instructor' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn chỉ có thể chấm điểm khóa học của mình.' });
    }
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền.' });
    }

    const { submissionId, score, instructorComment } = req.body;

    const subIdx = course.submissions.findIndex((s) => s._id?.toString() === submissionId);
    if (subIdx === -1) {
      return res.status(404).json({ message: 'Bài nộp không tồn tại.' });
    }

    course.submissions[subIdx].score = score ?? '';
    course.submissions[subIdx].instructorComment = instructorComment ?? '';
    course.submissions[subIdx].status = 'graded';
    course.submissions[subIdx].gradedAt = new Date();

    await course.save();
    const populated = await Course.findById(course._id)
      .populate('instructor', 'name email')
      .populate('enrolledStudents', 'name email')
      .populate('grades.student', 'name email')
      .populate('submissions.student', 'name email')
      .populate('submissions.assignmentId');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

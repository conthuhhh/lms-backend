const Course = require('../models/Course');

// Lấy tin nhắn của một khóa học (chỉ người trong lớp)
exports.getMessages = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .select('messages instructor enrolledStudents')
      .populate('messages.sender', 'name email role');

    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    const uid = req.user.id;
    const isInstructor = course.instructor.toString() === uid;
    const isStudent = course.enrolledStudents.some(
      (s) => (s._id || s).toString() === uid
    );

    if (!isInstructor && !isStudent && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xem chat của khóa học này.' });
    }

    // Trả messages đã sort: cũ nhất trước (để load more)
    const msgs = (course.messages || [])
      .filter((m) => !m.isDeleted)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(msgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Gửi tin nhắn
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được trống.' });
    }

    const course = await Course.findById(req.params.courseId)
      .select('messages instructor enrolledStudents');

    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    const uid = req.user.id;
    const isInstructor = course.instructor.toString() === uid;
    const isStudent = course.enrolledStudents.some(
      (s) => (s._id || s).toString() === uid
    );

    if (!isInstructor && !isStudent && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn.' });
    }

    const message = {
      sender: uid,
      senderName: req.user.name || 'Không rõ',
      senderRole: req.user.role,
      content: String(content).trim(),
    };

    course.messages.push(message);
    await course.save();

    // Lấy message vừa thêm (có _id)
    const savedMsg = course.messages[course.messages.length - 1];
    const populated = savedMsg.toObject
      ? { ...savedMsg.toObject(), sender: { _id: uid, name: req.user.name, role: req.user.role } }
      : savedMsg;

    // Phát Socket.io — phòng là courseId
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.courseId).emit('new_message', {
        courseId: req.params.courseId,
        message: populated,
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Ghim / bỏ ghim tin nhắn (chỉ instructor hoặc admin)
exports.togglePin = async (req, res) => {
  try {
    const { courseId, messageId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Chỉ giảng viên hoặc admin được ghim tin nhắn.' });
    }

    const msg = course.messages.id(messageId);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn.' });

    msg.isPinned = !msg.isPinned;
    await course.save();

    const io = req.app.get('io');
    if (io) {
      io.to(courseId).emit('message_pinned', { courseId, messageId, isPinned: msg.isPinned });
    }

    res.json({ messageId, isPinned: msg.isPinned });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa tin nhắn (chỉ người gửi hoặc admin/instructor)
exports.deleteMessage = async (req, res) => {
  try {
    const { courseId, messageId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Không tìm thấy khóa học.' });

    const msg = course.messages.id(messageId);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn.' });

    const uid = req.user.id;
    const canDelete =
      req.user.role === 'admin' ||
      course.instructor.toString() === uid ||
      msg.sender.toString() === uid;

    if (!canDelete) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa tin nhắn này.' });
    }

    msg.isDeleted = true;
    await course.save();

    const io = req.app.get('io');
    if (io) {
      io.to(courseId).emit('message_deleted', { courseId, messageId });
    }

    res.json({ messageId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

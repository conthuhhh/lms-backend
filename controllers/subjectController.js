const Course = require('../models/Course');
const Subject = require('../models/Subject');

exports.getAll = async (req, res) => {
  try {
    const query = {};
    if (req.user.role !== 'admin' || req.query.all !== 'true') {
      query.isActive = true;
    }
    // Giảng viên chỉ thấy môn thuộc ngành của mình
    if (req.user.role === 'instructor' && req.user.subjectCategory) {
      query.category = req.user.subjectCategory;
    }
    const list = await Subject.find(query).sort({ category: 1, name: 1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const s = await Subject.findById(req.params.id);
    if (!s) return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    res.json(s);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, category, maxStudents, numberOfClasses, sessionDuration, isActive } = req.body;
    if (!name || maxStudents == null || numberOfClasses == null || !sessionDuration?.trim()) {
      return res.status(400).json({
        message: 'name, maxStudents, numberOfClasses, sessionDuration là bắt buộc.',
      });
    }
    if (!category) {
      return res.status(400).json({ message: 'Vui lòng chọn ngành cho môn học.' });
    }
    const subject = new Subject({
      name: name.trim(),
      category,
      maxStudents: Number(maxStudents),
      numberOfClasses: Number(numberOfClasses),
      sessionDuration: sessionDuration.trim(),
      isActive: isActive !== false,
    });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, category, maxStudents, numberOfClasses, sessionDuration, isActive } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (category !== undefined) patch.category = category;
    if (maxStudents !== undefined) patch.maxStudents = Number(maxStudents);
    if (numberOfClasses !== undefined) patch.numberOfClasses = Number(numberOfClasses);
    if (sessionDuration !== undefined) patch.sessionDuration = String(sessionDuration).trim();
    if (isActive !== undefined) patch.isActive = !!isActive;
    const s = await Subject.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    });
    if (!s) return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    res.json(s);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    // Kiểm tra có khóa học nào đang dùng môn này không
    const relatedCourseCount = await Course.countDocuments({
      subjectTemplate: req.params.id,
    });

    if (relatedCourseCount > 0) {
      return res.status(400).json({
        message: `Không thể xóa: có ${relatedCourseCount} khóa học đang sử dụng môn này. Vui lòng xóa hoặc chuyển khóa học sang môn khác trước.`,
      });
    }

    const s = await Subject.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ message: 'Không tìm thấy môn học.' });
    res.json({ message: 'Đã xóa môn học.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

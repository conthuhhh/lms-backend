/**
 * Xóa mọi khóa học & môn học không phải "Khoa học máy tính".
 * Chạy: node cleanupKeepComputerScience.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');
const Subject = require('./models/Subject');

const KEEP_SUBJECT_NAME = 'Khoa học máy tính';

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    console.log('🔌 Đã kết nối MongoDB.\n');

    const delCourses = await Course.deleteMany({ subject: { $ne: KEEP_SUBJECT_NAME } });
    console.log(`🗑️  Đã xóa ${delCourses.deletedCount} khóa học (không phải "${KEEP_SUBJECT_NAME}").`);

    const delSubjects = await Subject.deleteMany({ name: { $ne: KEEP_SUBJECT_NAME } });
    console.log(`🗑️  Đã xóa ${delSubjects.deletedCount} môn học (không phải "${KEEP_SUBJECT_NAME}").`);

    const remainingCourses = await Course.countDocuments();
    const remainingSubjects = await Subject.countDocuments();
    console.log(`\n✅ Còn lại: ${remainingCourses} khóa học, ${remainingSubjects} môn học.`);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();

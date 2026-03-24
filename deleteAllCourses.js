/**
 * Xóa TẤT CẢ khóa học trong database.
 * Chạy: node deleteAllCourses.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Course = require('./models/Course');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    console.log('🔌 Đã kết nối MongoDB.\n');

    const result = await Course.deleteMany({});
    console.log(`🗑️  Đã xóa ${result.deletedCount} khóa học.`);

    const remaining = await Course.countDocuments();
    console.log(`✅ Còn lại: ${remaining} khóa học.`);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();

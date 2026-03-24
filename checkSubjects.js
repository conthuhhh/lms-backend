/**
 * Kiểm tra danh sách môn học hiện có.
 * Chạy: node checkSubjects.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Subject = require('./models/Subject');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    const subjects = await Subject.find().sort({ category: 1, name: 1 });
    console.log(`\n📚 Danh sách môn học (${subjects.length}):\n`);
    subjects.forEach((s) => {
      console.log(`  [${s.isActive ? '✓' : '✗'}] "${s.name}" | Ngành: ${s.category} | ${s.numberOfClasses} lớp | SV tối đa: ${s.maxStudents}`);
    });

    const instructors = require('./models/User').find({ role: 'instructor' });
    const users = await instructors;
    console.log(`\n👨‍🏫 Giảng viên (${users.length}):\n`);
    users.forEach((u) => {
      console.log(`  - ${u.email} | Ngành: ${u.subjectCategory || '(chưa gán)'}`);
    });
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();

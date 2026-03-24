/**
 * Seed script — tài khoản + môn học (admin) + khóa học mẫu.
 * Chạy: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Course = require('./models/Course');
const Subject = require('./models/Subject');
const { getNextSemesterInfo } = require('./utils/semester');

const ACCOUNTS = [
  { name: 'Admin', email: 'admin@lms.com', password: 'admin123', role: 'admin' },
  { name: 'GV Nguyễn Văn IT', email: 'instructor@lms.com', password: 'instructor123', role: 'instructor', subjectCategory: 'CNTT' },
  { name: 'GV Trần Thị Anh', email: 'instructor_english@lms.com', password: 'instructor123', role: 'instructor', subjectCategory: 'Ngôn ngữ' },
  { name: 'Trần Thị A', email: 'student@lms.com', password: 'student123', role: 'student' },
  { name: 'Lê Văn B', email: 'student2@lms.com', password: 'student123', role: 'student' },
  { name: 'Phạm Thị C', email: 'student3@lms.com', password: 'student123', role: 'student' },
  { name: 'Hoàng Văn D', email: 'student4@lms.com', password: 'student123', role: 'student' },
];

/** Môn học do admin cấu hình (GV sau này chỉ chọn) */
const SUBJECT_SEEDS = [
  // CNTT
  {
    name: 'Lập trình Web',
    category: 'CNTT',
    tuition: 0,
    maxStudents: 40,
    numberOfClasses: 5,
    sessionDuration: '90 phút/buổi — 12 tuần',
  },
  {
    name: 'Khoa học máy tính',
    category: 'CNTT',
    tuition: 500000,
    maxStudents: 30,
    numberOfClasses: 4,
    sessionDuration: '120 phút/buổi — 16 tuần',
  },
  {
    name: 'Trí tuệ nhân tạo',
    category: 'CNTT',
    tuition: 1000000,
    maxStudents: 20,
    numberOfClasses: 3,
    sessionDuration: '150 phút/buổi — 14 tuần',
  },
  // Ngôn ngữ
  {
    name: 'Tiếng Anh giao tiếp',
    category: 'Ngôn ngữ',
    tuition: 800000,
    maxStudents: 35,
    numberOfClasses: 4,
    sessionDuration: '90 phút/buổi — 10 tuần',
  },
  {
    name: 'Tiếng Nhật N5',
    category: 'Ngôn ngữ',
    tuition: 1200000,
    maxStudents: 25,
    numberOfClasses: 3,
    sessionDuration: '120 phút/buổi — 12 tuần',
  },
];

async function seed() {
  try {
    console.log('🔌 Kết nối MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    console.log('✅ Kết nối thành công!\n');

    for (const data of ACCOUNTS) {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        console.log(`⚠️  Tài khoản "${data.email}" đã tồn tại — bỏ qua.`);
        continue;
      }
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(data.password, salt);
      await new User({
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role,
        subjectCategory: data.subjectCategory || null,
      }).save();
      const catInfo = data.subjectCategory ? ` [${data.subjectCategory}]` : '';
      console.log(`✅ Đã tạo: [${data.role.toUpperCase()}${catInfo}] ${data.email} / ${data.password}`);
    }

    // Tạo môn học (nếu chưa có)
    for (const s of SUBJECT_SEEDS) {
      let sub = await Subject.findOne({ name: s.name });
      if (!sub) {
        sub = new Subject(s);
        await sub.save();
        console.log(`✅ Môn học: ${s.name} (${s.category}) — ${s.numberOfClasses} lớp, tối đa ${s.maxStudents} SV`);
      }
    }

    // Tạo khóa học mẫu cho từng giảng viên có ngành
    const instructors = await User.find({ role: 'instructor', subjectCategory: { $ne: null } });
    const next = getNextSemesterInfo();

    for (const instructor of instructors) {
      const subjects = await Subject.find({ category: instructor.subjectCategory, isActive: true });
      if (!subjects.length) {
        console.log(`⚠️  GV "${instructor.email}" (${instructor.subjectCategory}): không có môn học nào trong ngành — bỏ qua.`);
        continue;
      }

      // Lấy sample đầu tiên tương ứng hoặc subject đầu tiên
      const sub = subjects[0];
      const classSlot = 1;
      const className = `Lớp ${classSlot}/${sub.numberOfClasses}`;
      const title = `${sub.name} — ${className} — HK${next.semester} (${next.academicYear})`;

      const existing = await Course.findOne({
        subjectTemplate: sub._id,
        instructor: instructor._id,
        classSlot,
        semester: next.semester,
        academicYear: next.academicYear,
      });
      if (existing) {
        console.log(`⚠️  Khóa "${title}" đã tồn tại — bỏ qua.`);
        continue;
      }

      await new Course({
        title,
        subject: sub.name,
        subjectTemplate: sub._id,
        semester: next.semester,
        academicYear: next.academicYear,
        className,
        classSlot,
        description: `Khóa học mẫu cho ngành ${instructor.subjectCategory}.`,
        instructor: instructor._id,
        maxStudents: sub.maxStudents,
        price: sub.tuition,
        duration: sub.sessionDuration,
        isPublished: true,
      }).save();
      console.log(`✅ Khóa mẫu [${instructor.subjectCategory}]: ${title} (GV: ${instructor.email})`);
    }

    console.log('\n📋 Tài khoản đăng nhập:\n');
    ACCOUNTS.forEach((a) => {
      const catInfo = a.subjectCategory ? `  |  Ngành: ${a.subjectCategory}` : '';
      console.log(`   ${a.email}  |  ${a.password}  |  ${a.role}${catInfo}`);
    });
    console.log('\n🎉 Seed hoàn tất!');
  } catch (err) {
    console.error('❌ Lỗi seed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();

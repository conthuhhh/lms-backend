/**
 * Tính học kì tiếp theo (mặc định cho giảng viên tạo khóa).
 * Giả định: HK1 bắt đầu ~ tháng 8, HK2 ~ tháng 2.
 */
function getNextSemesterInfo(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;

  // Tháng 8–12: đang HK1 (năm học y–y+1) → kì tiếp = HK2
  if (m >= 8) {
    return {
      semester: '2',
      academicYear: `${y}-${y + 1}`,
      label: `Học kì 2 — Năm học ${y}-${y + 1}`,
    };
  }

  // Tháng 1: vẫn thuộc HK1 năm học (y-1)–y → kì tiếp = HK2
  if (m === 1) {
    return {
      semester: '2',
      academicYear: `${y - 1}-${y}`,
      label: `Học kì 2 — Năm học ${y - 1}-${y}`,
    };
  }

  // Tháng 2–7: đang HK2 → kì tiếp = HK1 năm học mới y–y+1
  return {
    semester: '1',
    academicYear: `${y}-${y + 1}`,
    label: `Học kì 1 — Năm học ${y}-${y + 1}`,
  };
}

module.exports = { getNextSemesterInfo };

/**
 * Đổi ngày âm lịch Việt Nam → dương lịch (múi giờ UTC+7) theo thuật toán thiên văn của Hồ Ngọc Đức (điểm Sóc, trung khí).
 * Chỉ dùng để ĐỀ XUẤT ngày Tết Âm lịch, Giỗ Tổ Hùng Vương trong lịch ngày nghỉ — cán bộ đối chiếu thông báo hằng năm
 * rồi mới xác nhận (lich-lam-viec.ts).
 */
const PI = Math.PI;
const INT = Math.floor;
const TZ = 7;

function jdTuNgay(d: number, m: number, y: number): number {
  const a = INT((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  let jd = d + INT((153 * mm + 2) / 5) + 365 * yy + INT(yy / 4) - INT(yy / 100) + INT(yy / 400) - 32045;
  if (jd < 2299161) jd = d + INT((153 * mm + 2) / 5) + 365 * yy + INT(yy / 4) - 32083;
  return jd;
}

function ngayTuJd(jd: number): [number, number, number] {
  let a, b, c;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  return [e - INT((153 * m + 2) / 5) + 1, m + 3 - 12 * INT(m / 10), b * 100 + d - 4800 + INT(m / 10)];
}

/** Ngày (JD) của điểm Sóc thứ k tính từ 1/1/1900. */
function ngaySoc(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return INT(Jd1 + C1 - deltat + 0.5 + TZ / 24);
}

/** Cung hoàng đạo (0–11) của Mặt Trời lúc đầu ngày JD. */
function kinhDoMatTroi(jdn: number): number {
  const T = (jdn - 2451545.5 - TZ / 24) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return INT((L / PI) * 6);
}

function thang11Am(yy: number): number {
  const off = jdTuNgay(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = ngaySoc(k);
  if (kinhDoMatTroi(nm) >= 9) nm = ngaySoc(k - 1);
  return nm;
}

function thangNhuan(a11: number): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last;
  let i = 1;
  let arc = kinhDoMatTroi(ngaySoc(k + i));
  do {
    last = arc;
    i++;
    arc = kinhDoMatTroi(ngaySoc(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

/** Ngày âm (ngày, tháng, năm âm; nhuận) → "yyyy-mm-dd" dương lịch; null nếu không có (vd. tháng nhuận không tồn tại). */
export function amSangDuong(ngay: number, thang: number, nam: number, nhuan = false): string | null {
  let a11, b11;
  if (thang < 11) {
    a11 = thang11Am(nam - 1);
    b11 = thang11Am(nam);
  } else {
    a11 = thang11Am(nam);
    b11 = thang11Am(nam + 1);
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = thang - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = thangNhuan(a11);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (nhuan && thang !== leapMonth) return null;
    if (nhuan || off >= leapOff) off += 1;
  } else if (nhuan) return null;
  const [d, m, y] = ngayTuJd(ngaySoc(k + off) + ngay - 1);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

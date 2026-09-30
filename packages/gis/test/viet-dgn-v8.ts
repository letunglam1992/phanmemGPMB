/**
 * Bộ ghi tệp ghép CFB và DGN V8 tối giản — CHỈ dùng trong kiểm thử để tạo tệp mẫu không chứa dữ liệu thật.
 * Bố cục phần tử theo đúng những gì bộ đọc dgn-v8.ts giả định (xác định từ tệp gCadas thật).
 */
import { zlibSync } from "fflate";

const HET = 0xfffffffe, TRONG = 0xffffffff, FAT_SECT = 0xfffffffd;

interface Nut {
  ten: string;
  con?: Nut[]; // kho
  du?: Uint8Array; // luồng
}

/** Ghi CFB v3 (sector 512, mini sector 64, ngưỡng 4096). `luong`: đường dẫn "a/b/c" -> dữ liệu. */
export function vietCfb(luong: Record<string, Uint8Array>): Uint8Array {
  const goc: Nut = { ten: "Root Entry", con: [] };
  for (const [duongDan, du] of Object.entries(luong)) {
    const phan = duongDan.split("/");
    let n = goc;
    for (const ten of phan.slice(0, -1)) {
      let k = n.con!.find((x) => x.ten === ten);
      if (!k) n.con!.push((k = { ten, con: [] }));
      n = k;
    }
    n.con!.push({ ten: phan.at(-1)!, du });
  }
  // Danh sách mục thư mục (mục 0 = gốc); anh em nối qua "phải" (cây suy biến hợp lệ)
  const muc: { nut: Nut; trai: number; phai: number; con: number; batDau: number; coLon: number }[] = [];
  const them = (nut: Nut): number => {
    const i = muc.length;
    muc.push({ nut, trai: TRONG, phai: TRONG, con: TRONG, batDau: 0, coLon: 0 });
    if (nut.con?.length) {
      const ids = nut.con.map(them);
      muc[i]!.con = ids[0]!;
      ids.forEach((id, k) => (muc[id]!.phai = ids[k + 1] ?? TRONG));
    }
    return i;
  };
  them(goc);

  // Mini stream cho luồng < 4096 byte
  const mini: number[] = [];
  const miniFat: number[] = [];
  const lon: { i: number; du: Uint8Array }[] = [];
  muc.forEach((m, i) => {
    const du = m.nut.du;
    if (!du) return;
    m.coLon = du.length;
    if (du.length === 0) { m.batDau = HET; return; }
    if (du.length < 4096) {
      const dau = mini.length / 64;
      const soO = Math.ceil(du.length / 64);
      for (let k = 0; k < soO; k++) miniFat.push(k === soO - 1 ? HET : dau + k + 1);
      mini.push(...du, ...new Array(soO * 64 - du.length).fill(0));
      m.batDau = dau;
    } else lon.push({ i, du });
  });
  const soSec = (n: number) => Math.ceil(n / 512);
  const secThuMuc = soSec(muc.length * 128);
  const secMiniFat = soSec(miniFat.length * 4);
  const secMini = soSec(mini.length);
  const secLon = lon.reduce((s, x) => s + soSec(x.du.length), 0);
  const noiDung = secThuMuc + secMiniFat + secMini + secLon;
  let soFat = 1;
  while (soFat * 128 < soFat + noiDung) soFat++;
  if (soFat > 109) throw new Error("Tệp thử quá lớn cho bộ ghi tối giản");

  const fat: number[] = new Array(soFat * 128).fill(TRONG);
  for (let k = 0; k < soFat; k++) fat[k] = FAT_SECT;
  let s = soFat;
  const chuoi = (n: number) => {
    const dau = n ? s : HET;
    for (let k = 0; k < n; k++) fat[s + k] = k === n - 1 ? HET : s + k + 1;
    s += n;
    return dau;
  };
  const dauThuMuc = chuoi(secThuMuc);
  const dauMiniFat = chuoi(secMiniFat);
  const dauMini = chuoi(secMini);
  muc[0]!.batDau = dauMini;
  muc[0]!.coLon = mini.length;
  for (const x of lon) muc[x.i]!.batDau = chuoi(soSec(x.du.length));

  const out = new Uint8Array(512 * (1 + s));
  const dv = new DataView(out.buffer);
  out.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  dv.setUint16(24, 0x3e, true);
  dv.setUint16(26, 3, true);
  dv.setUint16(28, 0xfffe, true);
  dv.setUint16(30, 9, true);
  dv.setUint16(32, 6, true);
  dv.setUint32(44, soFat, true);
  dv.setUint32(48, dauThuMuc, true);
  dv.setUint32(56, 4096, true);
  dv.setUint32(60, dauMiniFat, true);
  dv.setUint32(64, secMiniFat, true);
  dv.setUint32(68, HET, true);
  dv.setUint32(72, 0, true);
  for (let k = 0; k < 109; k++) dv.setUint32(76 + k * 4, k < soFat ? k : TRONG, true);
  const viTri = (sec: number) => 512 * (sec + 1);
  fat.forEach((v, k) => dv.setUint32(viTri(0) + k * 4, v, true)); // các sector FAT liền nhau từ sector 0
  muc.forEach((m, k) => {
    const p = viTri(dauThuMuc) + k * 128;
    const ten = m.nut.ten;
    for (let c = 0; c < ten.length; c++) dv.setUint16(p + c * 2, ten.charCodeAt(c), true);
    dv.setUint16(p + 64, (ten.length + 1) * 2, true);
    out[p + 66] = k === 0 ? 5 : m.nut.du ? 2 : 1;
    out[p + 67] = 1; // đen
    dv.setUint32(p + 68, m.trai, true);
    dv.setUint32(p + 72, m.phai, true);
    dv.setUint32(p + 76, m.con, true);
    dv.setUint32(p + 116, m.nut.du || k === 0 ? m.batDau : 0, true);
    dv.setUint32(p + 120, m.coLon, true);
  });
  for (let k = muc.length; k < secThuMuc * 4; k++) {
    const p = viTri(dauThuMuc) + k * 128;
    dv.setUint32(p + 68, TRONG, true);
    dv.setUint32(p + 72, TRONG, true);
    dv.setUint32(p + 76, TRONG, true);
  }
  miniFat.forEach((v, k) => dv.setUint32(viTri(dauMiniFat) + k * 4, v, true));
  for (let k = miniFat.length; k < secMiniFat * 128; k++) dv.setUint32(viTri(dauMiniFat) + k * 4, TRONG, true);
  out.set(mini, viTri(dauMini));
  for (const x of lon) out.set(x.du, viTri(muc[x.i]!.batDau));
  return out;
}

/* ---------------- Phần tử DGN V8 ---------------- */

export const UOR = 1000;
export const GOC_X = -5e8;
export const GOC_Y = -1e9;
const raw = (v: number, goc: number) => v * UOR + goc;

export interface TuyChonPt {
  lop: number;
  thanhPhan?: boolean;
  /** Tọa độ cục bộ của định nghĩa ô dùng chung (không cộng gốc toàn cục). */
  cucBo?: boolean;
}

/** Khung phần tử: `dai` byte (chẵn), vùng hình học kết thúc ở `cuoiHinh`; luôn dư ≥ 4 byte 0 ở cuối. */
function khung(kieu: number, dai: number, cuoiHinh: number, o: TuyChonPt) {
  const b = new Uint8Array(dai);
  const dv = new DataView(b.buffer);
  b[0] = kieu;
  b[3] = o.thanhPhan ? 0x40 : 0;
  dv.setUint32(4, (dai - 4) / 2, true);
  dv.setUint32(8, cuoiHinh / 2, true);
  dv.setUint32(12, o.lop, true);
  return { b, dv };
}
const chan = (n: number) => n + (n % 2);

export function ptDuong(kieu: 3 | 4 | 6, diem: [number, number][], o: TuyChonPt, soChieu: 2 | 3 = 2): Uint8Array {
  const dau = kieu === 3 ? 104 : 112;
  const buoc = soChieu === 2 ? 16 : 24;
  const cuoi = dau + diem.length * buoc;
  const { b, dv } = khung(kieu, cuoi + 8, cuoi, o);
  if (kieu !== 3) dv.setUint32(104, diem.length, true);
  diem.forEach(([x, y], i) => {
    dv.setFloat64(dau + i * buoc, raw(x, o.cucBo ? 0 : GOC_X), true);
    dv.setFloat64(dau + i * buoc + 8, raw(y, o.cucBo ? 0 : GOC_Y), true);
  });
  return b;
}

export function ptPhuc(kieu: 12 | 14, soThanhPhan: number, o: TuyChonPt): Uint8Array {
  const { b, dv } = khung(kieu, 120, 112, o);
  dv.setUint32(104, soThanhPhan, true);
  return b;
}

/** Nút chữ (kiểu 7): chỉ phần đầu, các dòng chữ theo sau là thành phần. */
export function ptNutChu(o: TuyChonPt): Uint8Array {
  return khung(7, 160, 152, o).b;
}

export function ptKieu(kieu: number, dai: number, o: TuyChonPt): Uint8Array {
  return khung(kieu, dai, dai - 8, o).b;
}

/** Chữ 2D: gốc @152, dấu FF FE 01 00 (8 bit) hoặc FF FD (UTF-16) tại 168; uint16 @110 = số byte từ dấu. */
export function ptChu(chu: string | Uint8Array, x: number, y: number, o: TuyChonPt & { unicode?: boolean }): Uint8Array {
  let duLieu: number[];
  if (o.unicode) {
    duLieu = [0xff, 0xfd];
    for (const c of chu as string) duLieu.push(c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8);
    duLieu.push(0, 0);
  } else {
    const bytes = typeof chu === "string" ? [...chu].map((c) => c.charCodeAt(0)) : [...chu];
    duLieu = [0xff, 0xfe, 1, 0, ...bytes, 0];
  }
  const cuoi = chan(168 + duLieu.length);
  const { b, dv } = khung(17, Math.max(176, cuoi) + 8, Math.max(176, cuoi), o);
  dv.setUint16(110, duLieu.length, true);
  b[105] = 1;
  dv.setFloat64(152, raw(x, GOC_X), true);
  dv.setFloat64(160, raw(y, GOC_Y), true);
  b.set(duLieu, 168);
  return b;
}

/**
 * Chữ 8 bit không có dấu FF FE (dạng của tệp MicroStation V8i thông thường): uint16 @110 = số byte, chiều cao @112 (UOR × 100),
 * gốc @152, 2 byte 0 tại @168, chữ tại @170. Cấu trúc xác định từ tệp bản đồ trích đo người dùng cung cấp (không lưu tệp).
 */
export function ptChuKhongDau(chu: string, x: number, y: number, o: TuyChonPt & { caoM?: number }): Uint8Array {
  const bytes = [...chu].map((c) => c.charCodeAt(0) & 0xff);
  const cuoi = chan(170 + bytes.length);
  const { b, dv } = khung(17, Math.max(176, cuoi) + 8, Math.max(172, cuoi), o);
  dv.setUint32(104, 0x9a, true);
  dv.setUint16(110, bytes.length, true);
  dv.setFloat64(112, (o.caoM ?? 2) * UOR * 100, true);
  dv.setFloat64(152, raw(x, GOC_X), true);
  dv.setFloat64(160, raw(y, GOC_Y), true);
  b.set(bytes, 170);
  return b;
}

/** Cung tròn 2D (kiểu 16): @104 góc đầu, @112 góc quét (radian), @120/@128 bán trục, @136 góc xoay, @144 tâm. */
export function ptCung(tam: [number, number], banKinh: number, batDau: number, quet: number, o: TuyChonPt): Uint8Array {
  const { b, dv } = khung(16, 168, 160, o);
  dv.setFloat64(104, batDau, true);
  dv.setFloat64(112, quet, true);
  dv.setFloat64(120, banKinh * UOR, true);
  dv.setFloat64(128, banKinh * UOR, true);
  dv.setFloat64(144, raw(tam[0], o.cucBo ? 0 : GOC_X), true);
  dv.setFloat64(152, raw(tam[1], o.cucBo ? 0 : GOC_Y), true);
  return b;
}

/** Liên kết tên ô dùng chung (mã 0x56D2) tại vùng thuộc tính. */
function lienKetTen(b: Uint8Array, dv: DataView, tai: number, ten: string) {
  b.set([0x0b, 0x10, 0xd2, 0x56], tai);
  dv.setUint32(tai + 4, 1, true);
  dv.setUint32(tai + 8, ten.length, true);
  b.set([...ten].map((c) => c.charCodeAt(0)), tai + 12);
}

/** Định nghĩa ô dùng chung (kiểu 34, kho phi mô hình): ma trận đơn vị, gốc 0; tên ở vùng thuộc tính @256. */
export function ptDinhNghiaO(ten: string): Uint8Array {
  const { b, dv } = khung(34, 288, 256, { lop: 0 });
  for (const q of [160, 192, 224]) dv.setFloat64(q, 1, true);
  lienKetTen(b, dv, 256, ten);
  return b;
}

/** Bản sao ô dùng chung (kiểu 35): ma trận [a b; d e] theo hàng @160, gốc @232 (tọa độ bản đồ, hoặc cục bộ khi lồng). */
export function ptBanSaoO(ten: string, m: [number, number, number, number], goc: [number, number], o: TuyChonPt): Uint8Array {
  const { b, dv } = khung(35, 288, 256, o);
  dv.setFloat64(160, m[0], true);
  dv.setFloat64(168, m[1], true);
  dv.setFloat64(184, m[2], true);
  dv.setFloat64(192, m[3], true);
  dv.setFloat64(224, 1, true);
  dv.setFloat64(232, raw(goc[0], o.cucBo ? 0 : GOC_X), true);
  dv.setFloat64(240, raw(goc[1], o.cucBo ? 0 : GOC_Y), true);
  lienKetTen(b, dv, 256, ten);
  return b;
}

/** Ghi phạm vi cục bộ (đơn vị chính, gốc định nghĩa) vào bản sao ô dùng chung: @112 thấp, @136 cao. */
export function datPhamViO(banSao: Uint8Array, thap: [number, number], cao: [number, number]): Uint8Array {
  const dv = new DataView(banSao.buffer, banSao.byteOffset, banSao.byteLength);
  dv.setFloat64(112, thap[0] * UOR, true);
  dv.setFloat64(120, thap[1] * UOR, true);
  dv.setFloat64(136, cao[0] * UOR, true);
  dv.setFloat64(144, cao[1] * UOR, true);
  return banSao;
}

/** Kích thước (kiểu 33): chiều cao chữ @192 (đơn vị lưu), điểm định vị là bản ghi 48 byte từ @304. */
export function ptKichThuoc(diem: [number, number][], o: TuyChonPt & { caoM?: number; khoiDuoi?: boolean }): Uint8Array {
  // khoiDuoi: khối 40 byte sau các điểm (bắt đầu 14 0C, không có dấu FF FF) như tệp TD_73
  const cuoi = 304 + 48 * diem.length + (o.khoiDuoi ? 40 : 0);
  const { b, dv } = khung(33, cuoi + 8, cuoi, o);
  dv.setFloat64(192, (o.caoM ?? 1.5) * UOR, true);
  diem.forEach(([x, y], i) => {
    dv.setFloat64(304 + 48 * i, raw(x, GOC_X), true);
    dv.setFloat64(312 + 48 * i, raw(y, GOC_Y), true);
    b[304 + 48 * i + 40] = 0xff;
    b[304 + 48 * i + 41] = 0xff;
    b[304 + 48 * i + 42] = 0x10;
  });
  if (o.khoiDuoi) {
    const q = 304 + 48 * diem.length;
    b.set([0x14, 0x0c], q);
    dv.setFloat64(q + 8, 1, true);
  }
  return b;
}

/** Khối "Dgn^G/$n": 16 byte đầu (uint32 số phần tử) + zlib(4 byte đầu khối + phần tử), bỏ 4 byte cuối như tệp thật. */
export function khoiPhanTu(ds: Uint8Array[]): Uint8Array {
  const tong = 4 + ds.reduce((s, x) => s + x.length, 0);
  const du = new Uint8Array(tong);
  let p = 4;
  for (const x of ds) {
    du.set(x, p);
    p += x.length;
  }
  const nen = zlibSync(du.subarray(0, tong - 4));
  const out = new Uint8Array(16 + nen.length);
  new DataView(out.buffer).setUint32(0, ds.length, true);
  out.set(nen, 16);
  return out;
}

export function dauMoHinh(): Uint8Array {
  const b = new Uint8Array(4 + 136);
  const dv = new DataView(b.buffer);
  b[4] = 0x42;
  dv.setUint32(8, 66, true);
  dv.setFloat64(4 + 80, 1, true);
  dv.setFloat64(4 + 88, 1, true);
  dv.setFloat64(4 + 96, UOR, true);
  dv.setFloat64(4 + 112, GOC_X, true);
  dv.setFloat64(4 + 120, GOC_Y, true);
  return zlibSync(b);
}

export function vietDgnV8(khoi: Uint8Array[][], phiMoHinh: Uint8Array[][] = []): Uint8Array {
  const luong: Record<string, Uint8Array> = { "Dgn-Md/#000000/Dgn~Mh": dauMoHinh() };
  khoi.forEach((ds, i) => (luong[`Dgn-Md/#000000/Dgn^G/$${i}`] = khoiPhanTu(ds)));
  phiMoHinh.forEach((ds, i) => (luong[`Dgn^Nm/$${i}`] = khoiPhanTu(ds)));
  return vietCfb(luong);
}

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
    dv.setFloat64(dau + i * buoc, raw(x, GOC_X), true);
    dv.setFloat64(dau + i * buoc + 8, raw(y, GOC_Y), true);
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

export function vietDgnV8(khoi: Uint8Array[][]): Uint8Array {
  const luong: Record<string, Uint8Array> = { "Dgn-Md/#000000/Dgn~Mh": dauMoHinh() };
  khoi.forEach((ds, i) => (luong[`Dgn-Md/#000000/Dgn^G/$${i}`] = khoiPhanTu(ds)));
  return vietCfb(luong);
}

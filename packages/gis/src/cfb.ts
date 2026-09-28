/**
 * Bộ đọc tệp ghép Microsoft Compound File Binary (CFB/OLE2, [MS-CFB]) — vỏ chứa của tệp DGN V8.
 * Chỉ đọc: thư mục, bảng FAT, mini FAT, luồng dữ liệu theo đường dẫn "Kho/Con/Luồng".
 */

export class LoiCfb extends Error {}

const CHU_KY = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const HET = 0xfffffffe; // ENDOFCHAIN
const TRONG = 0xffffffff; // NOSTREAM / FREESECT

export const laCfb = (u8: Uint8Array) => u8.length >= 8 && CHU_KY.every((b, i) => u8[i] === b);

interface MucThuMuc {
  ten: string;
  loai: number; // 1 kho, 2 luồng, 5 gốc
  trai: number;
  phai: number;
  con: number;
  batDau: number;
  coLon: number;
}

export interface TepCfb {
  /** Danh sách đường dẫn luồng (không gồm kho gốc), ví dụ "Dgn-Md/#000000/Dgn^G/$1". */
  dsLuong: string[];
  doc(duongDan: string): Uint8Array | null;
}

export function docCfb(u8: Uint8Array): TepCfb {
  if (!laCfb(u8)) throw new LoiCfb("Không phải tệp ghép OLE (CFB).");
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const coSector = 1 << dv.getUint16(30, true);
  const coMini = 1 << dv.getUint16(32, true);
  const soSectorFat = dv.getUint32(44, true);
  const dauThuMuc = dv.getUint32(48, true);
  const nguongMini = dv.getUint32(56, true);
  const dauMiniFat = dv.getUint32(60, true);
  const dauDifat = dv.getUint32(68, true);
  const soDifat = dv.getUint32(72, true);
  if (coSector !== 512 && coSector !== 4096) throw new LoiCfb(`Cỡ sector không hợp lệ: ${coSector}`);
  const viTri = (s: number) => (s + 1) * coSector;

  // DIFAT: 109 mục trong phần đầu + chuỗi sector DIFAT
  const dsFat: number[] = [];
  for (let i = 0; i < 109 && dsFat.length < soSectorFat; i++) dsFat.push(dv.getUint32(76 + i * 4, true));
  let d = dauDifat;
  for (let k = 0; k < soDifat && d !== HET && d !== TRONG; k++) {
    const p = viTri(d);
    const n = coSector / 4 - 1;
    for (let i = 0; i < n && dsFat.length < soSectorFat; i++) dsFat.push(dv.getUint32(p + i * 4, true));
    d = dv.getUint32(p + n * 4, true);
  }
  const fat = new Uint32Array(dsFat.length * (coSector / 4));
  dsFat.forEach((s, i) => {
    const p = viTri(s);
    if (p + coSector > u8.length) throw new LoiCfb("Bảng FAT vượt quá độ dài tệp (tệp bị cắt?).");
    for (let j = 0; j < coSector / 4; j++) fat[i * (coSector / 4) + j] = dv.getUint32(p + j * 4, true);
  });

  const chuoi = (dau: number, bang: Uint32Array): number[] => {
    const out: number[] = [];
    const daQua = new Set<number>();
    for (let s = dau; s !== HET && s !== TRONG; s = bang[s]!) {
      if (s >= bang.length || daQua.has(s)) throw new LoiCfb("Chuỗi sector hỏng (vòng lặp hoặc vượt bảng).");
      daQua.add(s);
      out.push(s);
    }
    return out;
  };
  const docChuoi = (dau: number) => {
    const ds = chuoi(dau, fat);
    const out = new Uint8Array(ds.length * coSector);
    ds.forEach((s, i) => out.set(u8.subarray(viTri(s), viTri(s) + coSector), i * coSector));
    return out;
  };

  // Thư mục
  const tm = docChuoi(dauThuMuc);
  const dvTm = new DataView(tm.buffer);
  const muc: MucThuMuc[] = [];
  for (let p = 0; p + 128 <= tm.length; p += 128) {
    const dai = dvTm.getUint16(p + 64, true);
    let ten = "";
    for (let i = 0; i + 2 < dai; i += 2) ten += String.fromCharCode(dvTm.getUint16(p + i, true));
    muc.push({
      ten,
      loai: tm[p + 66]!,
      trai: dvTm.getUint32(p + 68, true),
      phai: dvTm.getUint32(p + 72, true),
      con: dvTm.getUint32(p + 76, true),
      batDau: dvTm.getUint32(p + 116, true),
      coLon: dvTm.getUint32(p + 120, true), // phần cao (124) bỏ qua: luồng DGN < 4 GB
    });
  }
  const goc = muc[0];
  if (!goc || goc.loai !== 5) throw new LoiCfb("Thiếu mục gốc của thư mục.");

  // Mini stream (nằm trong luồng của mục gốc) + mini FAT
  const miniLuong = goc.batDau !== HET && goc.batDau !== TRONG ? docChuoi(goc.batDau) : new Uint8Array(0);
  const miniFatByte = dauMiniFat !== HET && dauMiniFat !== TRONG ? docChuoi(dauMiniFat) : new Uint8Array(0);
  const miniFat = new Uint32Array(miniFatByte.buffer, 0, Math.floor(miniFatByte.length / 4));

  // Đường dẫn: duyệt cây đỏ-đen (trái/phải là anh em, con là phần tử con)
  const duongDan = new Map<string, MucThuMuc>();
  const duyet = (i: number, cha: string, daQua: Set<number>) => {
    if (i === TRONG || i >= muc.length || daQua.has(i)) return;
    daQua.add(i);
    const m = muc[i]!;
    const p = cha ? `${cha}/${m.ten}` : m.ten;
    duyet(m.trai, cha, daQua);
    duyet(m.phai, cha, daQua);
    if (m.loai === 2) duongDan.set(p, m);
    if (m.loai === 1) duyet(m.con, p, daQua);
  };
  duyet(goc.con, "", new Set());

  return {
    dsLuong: [...duongDan.keys()],
    doc(p: string) {
      const m = duongDan.get(p);
      if (!m) return null;
      if (m.coLon === 0) return new Uint8Array(0);
      if (m.coLon < nguongMini) {
        const out = new Uint8Array(m.coLon);
        let da = 0;
        for (const s of chuoi(m.batDau, miniFat)) {
          const n = Math.min(coMini, m.coLon - da);
          out.set(miniLuong.subarray(s * coMini, s * coMini + n), da);
          da += n;
        }
        return out;
      }
      return docChuoi(m.batDau).subarray(0, m.coLon);
    },
  };
}

/**
 * Bộ ghi DGN V7 tối giản — CHỈ dùng trong kiểm thử để tạo tệp mẫu không chứa dữ liệu thật.
 */

export function vaxBytes(v: number): number[] {
  if (v === 0) return [0, 0, 0, 0, 0, 0, 0, 0];
  const dau = v < 0 ? 1n : 0n;
  const m = Math.abs(v);
  let mu = Math.floor(Math.log2(m)) + 1 + 128;
  let dinhTri = m / Math.pow(2, mu - 128); // [0.5, 1)
  if (dinhTri >= 1) {
    mu++;
    dinhTri /= 2;
  }
  if (dinhTri < 0.5) {
    mu--;
    dinhTri *= 2;
  }
  const f = BigInt(Math.round((dinhTri * 2 - 1) * 2 ** 52)) << 3n; // 55 bit
  const bits = (dau << 63n) | (BigInt(mu) << 55n) | f;
  const be: number[] = [];
  for (let i = 7; i >= 0; i--) be.push(Number((bits >> BigInt(i * 8)) & 0xffn));
  return [be[1]!, be[0]!, be[3]!, be[2]!, be[5]!, be[4]!, be[7]!, be[6]!];
}

class BoDem {
  b: number[] = [];
  u8(v: number) {
    this.b.push(v & 0xff);
  }
  u16(v: number) {
    this.u8(v);
    this.u8(v >> 8);
  }
  i32(v: number) {
    const u = v >>> 0;
    this.u16(u >>> 16);
    this.u16(u & 0xffff);
  }
  vax(v: number) {
    this.b.push(...vaxBytes(v));
  }
  dem(n: number) {
    for (let i = 0; i < n; i++) this.u8(0);
  }
}

export interface TuyChonPhanTu {
  lop: number;
  phuc?: boolean;
  daXoa?: boolean;
  mau?: number;
}

export class VietDgn {
  private phanTu: number[][] = [];
  constructor(
    private suTrenMu = 1000,
    private uorTrenSu = 1,
    private gocUor: [number, number] = [0, 0],
  ) {}

  private get uorTrenMu() {
    return this.suTrenMu * this.uorTrenSu;
  }
  private uor(v: number) {
    return Math.round(v * this.uorTrenMu);
  }

  private dau(t: TuyChonPhanTu, kieu: number, thanDai: number, d: BoDem) {
    // thanDai: số byte sau 4 byte đầu
    d.u8((t.lop & 0x3f) | (t.phuc ? 0x80 : 0));
    d.u8((kieu & 0x7f) | (t.daXoa ? 0x80 : 0));
    d.u16(thanDai / 2);
    d.dem(24); // phạm vi
    d.u16(0); // nhóm
    d.u16(0); // attindx
    d.u16(0); // thuộc tính
    d.u8(0); // kiểu nét, độ dày
    d.u8(t.mau ?? 1);
  }

  private diemUor(d: BoDem, x: number, y: number) {
    d.i32(this.uor(x) + this.gocUor[0]);
    d.i32(this.uor(y) + this.gocUor[1]);
  }

  duong(t: TuyChonPhanTu, a: [number, number], b: [number, number]) {
    const d = new BoDem();
    this.dau(t, 3, 48, d);
    this.diemUor(d, ...a);
    this.diemUor(d, ...b);
    this.phanTu.push(d.b);
    return this;
  }

  duongGap(t: TuyChonPhanTu, diem: [number, number][], kieu: 4 | 6 = 4) {
    const d = new BoDem();
    this.dau(t, kieu, 34 + 8 * diem.length, d);
    d.u16(diem.length);
    for (const p of diem) this.diemUor(d, ...p);
    this.phanTu.push(d.b);
    return this;
  }

  chuoiPhuc(t: TuyChonPhanTu, thanhPhan: [number, number][][]) {
    const d = new BoDem();
    this.dau(t, 12, 40, d);
    const tong = thanhPhan.reduce((s, tp) => s + 17 + 4 * tp.length, 0) + 16;
    d.u16(tong);
    d.u16(thanhPhan.length);
    d.dem(4);
    this.phanTu.push(d.b);
    for (const tp of thanhPhan) this.duongGap({ ...t, phuc: true }, tp);
    return this;
  }

  cung(t: TuyChonPhanTu, tam: [number, number], banKinh: number, batDauDo: number, quetDo: number) {
    const d = new BoDem();
    this.dau(t, 16, 76, d);
    d.i32(Math.round(batDauDo * 360000));
    d.i32(Math.round(quetDo * 360000));
    d.vax(banKinh * this.uorTrenMu);
    d.vax(banKinh * this.uorTrenMu);
    d.i32(0);
    d.vax(this.uor(tam[0]) + this.gocUor[0]);
    d.vax(this.uor(tam[1]) + this.gocUor[1]);
    this.phanTu.push(d.b);
    return this;
  }

  chu(t: TuyChonPhanTu, goc: [number, number], byteChu: number[] | string) {
    const bytes = typeof byteChu === "string" ? [...byteChu].map((c) => c.charCodeAt(0)) : byteChu;
    const d = new BoDem();
    const than = 56 + bytes.length + (bytes.length % 2);
    this.dau(t, 17, than, d);
    d.u8(1); // font
    d.u8(0); // canh lề
    d.i32(1000); // hệ số dài
    d.i32(1000); // hệ số cao
    d.i32(0); // xoay
    this.diemUor(d, ...goc);
    d.u8(bytes.length);
    d.u8(0);
    for (const c of bytes) d.u8(c);
    if (bytes.length % 2) d.u8(0);
    this.phanTu.push(d.b);
    return this;
  }

  xuat(): Uint8Array {
    const tcb = new BoDem();
    tcb.u8(0x08);
    tcb.u8(0x09);
    tcb.u16((1536 - 4) / 2);
    tcb.dem(1536 - 4);
    const b = tcb.b;
    const ghi32 = (o: number, v: number) => {
      const x = new BoDem();
      x.i32(v);
      b.splice(o, 4, ...x.b);
    };
    ghi32(1112, this.suTrenMu);
    ghi32(1116, this.uorTrenSu);
    b.splice(1120, 4, "m".charCodeAt(0), 0, "m".charCodeAt(0), "m".charCodeAt(0));
    b.splice(1240, 8, ...vaxBytes(this.gocUor[0]));
    b.splice(1248, 8, ...vaxBytes(this.gocUor[1]));
    const tat = [...b, ...this.phanTu.flat(), 0xff, 0xff];
    return new Uint8Array(tat);
  }
}

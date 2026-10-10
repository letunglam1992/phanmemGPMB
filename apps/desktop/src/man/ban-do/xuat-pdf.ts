/**
 * Xuất PDF bản đồ tiến độ GPMB (hạng mục 5 docs/08 §9): khổ A4/A3 ngang, khung, tiêu đề, chú giải hiện trạng, thước tỷ lệ,
 * mũi tên hướng Bắc; thửa tô màu theo hiện trạng hồ sơ. Vẽ trên canvas rồi nhúng ảnh JPEG vào một trang PDF (tự dựng, không
 * thư viện ngoài). Dùng cho báo cáo, họp — KHÔNG phải trích lục thửa đất. Tệp tạo trên máy, lưu qua taiXuong.
 */
import type { DienTichThuHoi, Diem, ThuaBanDo } from "@gpmb/gis";
import { THU_TU_TRANG_THAI, TT_GPMB, type TrangThaiGpmb } from "../../trang-thai";
import type { DuLieuBanDo } from "./du-lieu";
import { NguCanhPdf } from "../../van-ban/ngu-canh-pdf";
import { dongGoiPdf, napPhong, type BoPhong } from "../../van-ban/pdf-chu";

export const KHO_GIAY = { A4: { w: 297, h: 210 }, A3: { w: 420, h: 297 } } as const;
export type KhoGiay = keyof typeof KHO_GIAY;

/** Một trang PDF chứa ảnh JPEG phủ kín trang (mm). */
export function taoPdfAnh(jpeg: Uint8Array, rongPx: number, caoPx: number, khoMm: { w: number; h: number }, tieuDe = "Bản đồ tiến độ GPMB"): Uint8Array {
  const pt = (mm: number) => Math.round((mm / 25.4) * 72 * 100) / 100;
  const W = pt(khoMm.w), H = pt(khoMm.h);
  const enc = new TextEncoder();
  const noiDung = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  // Tiêu đề trong thông tin tệp: UTF-16BE có BOM (chữ Việt)
  const hex = (s: string) => "FEFF" + [...s].map((c) => c.charCodeAt(0).toString(16).padStart(4, "0")).join("").toUpperCase();
  const obj: (string | Uint8Array)[][] = [
    ["<< /Type /Catalog /Pages 2 0 R >>"],
    ["<< /Type /Pages /Kids [3 0 R] /Count 1 >>"],
    [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`],
    [`<< /Type /XObject /Subtype /Image /Width ${rongPx} /Height ${caoPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, "\nendstream"],
    [`<< /Length ${noiDung.length} >>\nstream\n${noiDung}\nendstream`],
    [`<< /Title <${hex(tieuDe)}> /Producer (GPMB Son La) >>`],
  ];
  const phan: Uint8Array[] = [enc.encode("%PDF-1.4\n%âãÏÓ\n")];
  let vt = phan[0]!.length;
  const xref: number[] = [];
  obj.forEach((o, i) => {
    xref.push(vt);
    const ds = [enc.encode(`${i + 1} 0 obj\n`), ...o.map((x) => (typeof x === "string" ? enc.encode(x) : x)), enc.encode("\nendobj\n")];
    for (const d of ds) {
      phan.push(d);
      vt += d.length;
    }
  });
  const bang = `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${xref.map((x) => `${String(x).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${obj.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${vt}\n%%EOF\n`;
  phan.push(enc.encode(bang));
  const out = new Uint8Array(phan.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const x of phan) {
    out.set(x, i);
    i += x.length;
  }
  return out;
}

/** Độ dài "đẹp" cho thước tỷ lệ (1, 2, 5 × 10^n m) gần giá trị cho trước. */
export function doDaiThuoc(m: number): number {
  const mu = Math.pow(10, Math.floor(Math.log10(Math.max(m, 1e-9))));
  const r = m / mu;
  return (r >= 5 ? 5 : r >= 2 ? 2 : 1) * mu;
}

export interface NoiDungIn {
  dl: DuLieuBanDo;
  tieuDe: string;
  phuDe: string;
  ttThua: Map<string, TrangThaiGpmb>;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  ranh: Diem[][][];
  ngay: string;
  /** 1.0.7: in theo vùng chọn (khung đang xem trên bản đồ, tọa độ VN-2000) — không có: theo ranh thu hồi / cả bản đồ. */
  phamVi?: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Hộp bao vòng ngoài của thửa có giao với phạm vi in không. */
const giaoPham = (vong: Diem[] | undefined, p: { minX: number; minY: number; maxX: number; maxY: number }) => {
  if (!vong?.length) return false;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const q of vong) (a = Math.min(a, q.x)), (c = Math.max(c, q.x)), (b = Math.min(b, q.y)), (d = Math.max(d, q.y));
  return a <= p.maxX && c >= p.minX && b <= p.maxY && d >= p.minY;
};

/** Vẽ trang bản đồ tiến độ lên canvas (px), 1 mm = pxMm px. Phạm vi: các thửa trong ranh (nếu có), không thì cả bản đồ. */
export function veTrangBanDo(ctx: CanvasRenderingContext2D, pxMm: number, kho: { w: number; h: number }, n: NoiDungIn) {
  const W = kho.w * pxMm, H = kho.h * pxMm, mm = (v: number) => v * pxMm;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // Khung
  ctx.strokeStyle = "#000";
  ctx.lineWidth = mm(0.5);
  ctx.strokeRect(mm(10), mm(10), W - mm(20), H - mm(20));
  ctx.lineWidth = mm(0.2);
  ctx.strokeRect(mm(12), mm(12), W - mm(24), H - mm(24));
  // Tiêu đề
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `bold ${mm(6)}px "Times New Roman", serif`;
  ctx.fillText(n.tieuDe, W / 2, mm(21));
  ctx.font = `${mm(4)}px "Times New Roman", serif`;
  ctx.fillText(n.phuDe, W / 2, mm(27));
  // Vùng bản đồ: từ y = 32 mm đến H − 14 mm; chú giải cột phải rộng 70 mm
  const khung = { x: mm(14), y: mm(32), w: W - mm(14) - mm(84), h: H - mm(32) - mm(20) };
  const trong = n.dl.kq.thua.filter((t) => (n.thuHoi.get(n.khoaThua(t))?.phamVi ?? "NGOAI") !== "NGOAI");
  const dsPham = trong.length ? trong : n.dl.kq.thua;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of dsPham) for (const d of t.vong[0] ?? []) (minX = Math.min(minX, d.x)), (maxX = Math.max(maxX, d.x)), (minY = Math.min(minY, d.y)), (maxY = Math.max(maxY, d.y));
  for (const r of n.ranh) for (const d of r[0] ?? []) (minX = Math.min(minX, d.x)), (maxX = Math.max(maxX, d.x)), (minY = Math.min(minY, d.y)), (maxY = Math.max(maxY, d.y));
  if (!Number.isFinite(minX)) ({ minX, minY, maxX, maxY } = n.dl.pham);
  const le = Math.max(maxX - minX, maxY - minY) * 0.06 + 5;
  minX -= le; maxX += le; minY -= le; maxY += le;
  if (n.phamVi && n.phamVi.maxX > n.phamVi.minX && n.phamVi.maxY > n.phamVi.minY) ({ minX, minY, maxX, maxY } = n.phamVi);
  const pv = { minX, minY, maxX, maxY };
  // thửa có phần nằm trong phạm vi in (đếm chú giải, vẽ) — in theo vùng chọn thì chỉ đếm thửa trong khung
  const thuaIn = n.dl.kq.thua.filter((t) => giaoPham(t.vong[0], pv));
  const tyLe = Math.min(khung.w / (maxX - minX), khung.h / (maxY - minY)); // px / m
  const ox = khung.x + (khung.w - (maxX - minX) * tyLe) / 2, oy = khung.y + (khung.h - (maxY - minY) * tyLe) / 2;
  const sx = (x: number) => ox + (x - minX) * tyLe, sy = (y: number) => oy + (maxY - y) * tyLe;
  ctx.save();
  ctx.beginPath();
  ctx.rect(khung.x, khung.y, khung.w, khung.h);
  ctx.clip();
  const duong = (v: Diem[]) => v.forEach((d, i) => (i ? ctx.lineTo(sx(d.x), sy(d.y)) : ctx.moveTo(sx(d.x), sy(d.y))));
  // 1.0.6: lưới tọa độ VN-2000 (dưới lớp thửa) — đường dọc theo tọa độ Y (Đông), đường ngang theo tọa độ X (Bắc)
  const buocLuoi = doDaiThuoc(Math.max(maxX - minX, maxY - minY) / 5);
  ctx.strokeStyle = "rgba(60,90,140,0.35)";
  ctx.lineWidth = Math.max(0.5, mm(0.1));
  for (let gx = Math.ceil(minX / buocLuoi) * buocLuoi; gx <= maxX; gx += buocLuoi) { ctx.beginPath(); ctx.moveTo(sx(gx), khung.y); ctx.lineTo(sx(gx), khung.y + khung.h); ctx.stroke(); }
  for (let gy = Math.ceil(minY / buocLuoi) * buocLuoi; gy <= maxY; gy += buocLuoi) { ctx.beginPath(); ctx.moveTo(khung.x, sy(gy)); ctx.lineTo(khung.x + khung.w, sy(gy)); ctx.stroke(); }
  const dem = Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, 0])) as Record<TrangThaiGpmb, number>;
  let chuaHoSo = 0;
  for (const t of thuaIn) {
    const tt = n.ttThua.get(t.ma);
    const trongRanh = (n.thuHoi.get(n.khoaThua(t))?.phamVi ?? "NGOAI") !== "NGOAI";
    ctx.beginPath();
    for (const v of t.vong) { duong(v); ctx.closePath(); }
    if (tt) {
      ctx.fillStyle = TT_GPMB[tt].nen.replace(/[\d.]+\)$/, "0.55)");
      ctx.fill("evenodd");
      dem[tt]++;
    } else if (trongRanh) {
      ctx.fillStyle = "rgba(170,181,176,0.35)";
      ctx.fill("evenodd");
      chuaHoSo++;
    }
    ctx.strokeStyle = "#555";
    ctx.lineWidth = Math.max(1, mm(0.15));
    ctx.stroke();
  }
  ctx.strokeStyle = "#d0021b";
  ctx.lineWidth = mm(0.6);
  for (const r of n.ranh) { ctx.beginPath(); for (const v of r) { duong(v); ctx.closePath(); } ctx.stroke(); }
  // Nhãn số thửa khi thửa đủ lớn trên giấy
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.font = `${mm(2.4)}px Arial, sans-serif`;
  for (const t of thuaIn) {
    if (Math.sqrt(t.dienTichHinhHoc) * tyLe < mm(6)) continue;
    ctx.fillText(`${t.soThua ?? "?"}`, sx(t.tamNhan.x), sy(t.tamNhan.y));
  }
  // nhãn lưới (trong khung, sát mép trên và mép trái)
  ctx.fillStyle = "rgba(40,70,120,0.9)";
  ctx.font = `${mm(2.2)}px "Times New Roman", serif`;
  ctx.textAlign = "center";
  for (let gx = Math.ceil(minX / buocLuoi) * buocLuoi; gx <= maxX; gx += buocLuoi) if (sx(gx) > khung.x + mm(12)) ctx.fillText(`Y ${Math.round(gx).toLocaleString("vi-VN")}`, sx(gx), khung.y + mm(3));
  ctx.textAlign = "left";
  for (let gy = Math.ceil(minY / buocLuoi) * buocLuoi; gy <= maxY; gy += buocLuoi) if (sy(gy) > khung.y + mm(6)) ctx.fillText(`X ${Math.round(gy).toLocaleString("vi-VN")}`, khung.x + mm(1), sy(gy) - mm(0.8));
  ctx.restore();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = mm(0.2);
  ctx.strokeRect(khung.x, khung.y, khung.w, khung.h);
  // Chú giải
  const cx = W - mm(80);
  let y = mm(40);
  ctx.textAlign = "left";
  ctx.font = `bold ${mm(4)}px "Times New Roman", serif`;
  ctx.fillText("CHÚ GIẢI", cx, y);
  y += mm(7);
  if (n.phamVi) {
    ctx.font = `italic ${mm(2.8)}px "Times New Roman", serif`;
    ctx.fillText("(số thửa trong phạm vi in)", cx, y);
    y += mm(5.5);
  }
  ctx.font = `${mm(3.2)}px "Times New Roman", serif`;
  const muc = (mau: string, ten: string, vien = "#555") => {
    ctx.fillStyle = mau;
    ctx.fillRect(cx, y - mm(3.2), mm(8), mm(4.2));
    ctx.strokeStyle = vien;
    ctx.lineWidth = mm(0.2);
    ctx.strokeRect(cx, y - mm(3.2), mm(8), mm(4.2));
    ctx.fillStyle = "#000";
    ctx.fillText(ten, cx + mm(11), y);
    y += mm(6.5);
  };
  for (const t of THU_TU_TRANG_THAI) muc(TT_GPMB[t].nen.replace(/[\d.]+\)$/, "0.55)"), `${TT_GPMB[t].ten} (${dem[t]} thửa)`);
  muc("rgba(170,181,176,0.35)", `Trong ranh, chưa lập hồ sơ (${chuaHoSo} thửa)`);
  ctx.strokeStyle = "#d0021b";
  ctx.lineWidth = mm(0.6);
  ctx.beginPath();
  ctx.moveTo(cx, y - mm(1.2));
  ctx.lineTo(cx + mm(8), y - mm(1.2));
  ctx.stroke();
  ctx.fillText("Ranh GPMB", cx + mm(11), y);
  y += mm(10);
  // Thước tỷ lệ, tỷ lệ số (1 mm giấy = 1/tyLe*pxMm m)
  const mMoiMm = pxMm / tyLe;
  const tl = Math.round((mMoiMm * 1000) / 10) * 10;
  ctx.font = `${mm(3.2)}px "Times New Roman", serif`;
  ctx.fillText(`Tỷ lệ ≈ 1:${tl.toLocaleString("vi-VN")}`, cx, y);
  y += mm(6);
  const dai = doDaiThuoc(mMoiMm * 50);
  const daiPx = (dai / mMoiMm) * pxMm;
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = mm(0.25);
  ctx.fillRect(cx, y, daiPx / 2, mm(1.5));
  ctx.strokeRect(cx, y, daiPx, mm(1.5));
  ctx.fillText("0", cx - mm(1), y + mm(5.5));
  ctx.fillText(`${dai.toLocaleString("vi-VN")} m`, cx + daiPx - mm(3), y + mm(5.5));
  y += mm(24);
  // Mũi tên Bắc
  const ax = cx + mm(10), ay = y;
  ctx.beginPath();
  ctx.moveTo(ax, ay - mm(8));
  ctx.lineTo(ax - mm(3), ay + mm(2));
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax + mm(3), ay + mm(2));
  ctx.closePath();
  ctx.fill();
  ctx.font = `bold ${mm(4)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("B", ax, ay - mm(9.5));
  // Chân trang
  ctx.textAlign = "left";
  ctx.font = `italic ${mm(2.8)}px "Times New Roman", serif`;
  ctx.fillText(`Bản đồ tiến độ GPMB phục vụ báo cáo, họp — không phải trích lục, trích đo thửa đất. Hệ tọa độ VN-2000, lưới ${buocLuoi.toLocaleString("vi-VN")} m (X: Bắc, Y: Đông).${n.phamVi ? " In theo vùng chọn." : ""} Xuất ngày ${n.ngay}.`, mm(14), H - mm(15));
}

/**
 * 1.0.6: PDF vector — nét, vùng tô, chữ thật (phông Liberation Serif nhúng tập con), phóng to không vỡ; không nạp được
 * phông thì dựng PDF ảnh như trước.
 */
export async function xuatPdfBanDo(n: NoiDungIn, kho: KhoGiay, bo?: BoPhong): Promise<Uint8Array> {
  const k = KHO_GIAY[kho];
  try {
    const phong = bo ?? (await napPhong());
    const pt = 72 / 25.4;
    const ctx = new NguCanhPdf(phong, k.w * pt, k.h * pt);
    veTrangBanDo(ctx as unknown as CanvasRenderingContext2D, pt, k, n);
    return await dongGoiPdf({ trang: [ctx.noiDung], dung: ctx.dung, bo: phong, rong: ctx.rong, cao: ctx.cao, tieuDe: n.tieuDe, doTrong: ctx.doTrong });
  } catch {
    return xuatPdfBanDoAnh(n, kho);
  }
}

/** Dựng trang (canvas trong trình duyệt), nén JPEG, đóng gói PDF. 150 dpi. */
export async function xuatPdfBanDoAnh(n: NoiDungIn, kho: KhoGiay): Promise<Uint8Array> {
  const k = KHO_GIAY[kho];
  const pxMm = 150 / 25.4;
  const cv = document.createElement("canvas");
  cv.width = Math.round(k.w * pxMm);
  cv.height = Math.round(k.h * pxMm);
  const ctx = cv.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ vẽ canvas");
  veTrangBanDo(ctx, pxMm, k, n);
  const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", 0.9));
  if (!blob) throw new Error("Không tạo được ảnh bản đồ");
  return taoPdfAnh(new Uint8Array(await blob.arrayBuffer()), cv.width, cv.height, k, n.tieuDe);
}

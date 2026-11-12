/**
 * Thống kê lớp và gợi ý cấu hình lớp cho tệp bản đồ lạ (vd. bản đồ lập bằng gCadas trên MicroStation V8i).
 * Gợi ý chỉ dựa trên cấu trúc dữ liệu thấy được trong tệp; cán bộ xem lại trước khi dùng.
 */
import type { Diem, KetQuaDocDgn, PhanTuChu } from "./dgn.js";
import { phanTuGoc } from "./dgn.js";
import { dienTichGpmbGhi, goiYSoTo, lopKhopDienTich, lopThuaNgoaiPhamVi, type DienTichGhi } from "./khung-to.js";
import { CAU_HINH_MAC_DINH, diemTrongThua, dungThua, giaiMaNhan, loaiHienTrangBanDo, type CauHinhLop, type CauHinhNut, type TruongNut } from "./thua.js";

export interface ThongKeLop {
  lop: number;
  /** Đường, đường gấp, chuỗi phức, cung */
  soDuong: number;
  /** Vùng, vùng phức, elip */
  soVung: number;
  soChu: number;
  /** Số nút chữ (text node) có dòng đầu nằm trên lớp */
  soNut: number;
  /** Vài dòng chữ mẫu (khác nhau) */
  mau: string[];
}

export function thongKeLop(ban: KetQuaDocDgn): ThongKeLop[] {
  const m = new Map<number, ThongKeLop & { daCo: Set<string>; nut: Set<number> }>();
  const lay = (lop: number) => {
    let x = m.get(lop);
    if (!x) m.set(lop, (x = { lop, soDuong: 0, soVung: 0, soChu: 0, soNut: 0, mau: [], daCo: new Set(), nut: new Set() }));
    return x;
  };
  for (const pt of phanTuGoc(ban)) {
    if (pt.loai === "DUONG" || pt.loai === "DUONG_GAP" || pt.loai === "CHUOI_PHUC" || pt.loai === "CUNG") lay(pt.lop).soDuong++;
    else if (pt.loai === "VUNG" || pt.loai === "VUNG_PHUC" || pt.loai === "ELIP") lay(pt.lop).soVung++;
    else if (pt.loai === "CHU") {
      const x = lay(pt.lop);
      x.soChu++;
      if (pt.nut !== undefined) x.nut.add(pt.nut);
      const c = giaiMaNhan(pt);
      if (c && x.mau.length < 6 && !x.daCo.has(c)) {
        x.daCo.add(c);
        x.mau.push(c);
      }
    }
  }
  return [...m.values()]
    .map(({ daCo: _d, nut, ...x }) => ({ ...x, soNut: nut.size }))
    .sort((a, b) => a.lop - b.lop);
}

const RE_SO = /^\d+$/;
const RE_MA_LOAI = /^[A-ZĐ]{2,4}(\+[A-ZĐ]{2,4})*$/;
const RE_NHIEU_TU = /^\p{L}+(\s+\p{L}+)+$/u;

/** Nút chữ theo lớp của dòng đầu: lop -> danh sách nút, mỗi nút là các dòng theo thứ tự trong tệp. */
export function nutTheoLop(ban: KetQuaDocDgn): Map<number, string[][]> {
  const nut = new Map<number, { lop: number; dong: string[] }>();
  for (const pt of phanTuGoc(ban)) {
    if (pt.loai !== "CHU" || (pt as PhanTuChu).nut === undefined) continue;
    const k = (pt as PhanTuChu).nut!;
    const x = nut.get(k) ?? { lop: pt.lop, dong: [] };
    x.dong.push(giaiMaNhan(pt as PhanTuChu));
    nut.set(k, x);
  }
  const out = new Map<number, string[][]>();
  for (const { lop, dong } of nut.values()) out.set(lop, [...(out.get(lop) ?? []), dong]);
  return out;
}

/** 1.3.6: dòng địa chỉ (tổ, bản, tiểu khu, thôn, xóm…, hoặc có dấu phẩy phân cấp hành chính). */
const RE_DIA_CHI = /^(tổ|to|bản|ban|tiểu khu|tk|thôn|xóm|khu|tdp|xã|phường|thị trấn|số nhà|đường|ngõ|khối)\b|,\s*(xã|phường|huyện|tỉnh|tp)\b/iu;
/** 1.3.6: họ tên người / tổ chức: bắt đầu bằng chữ, từ hai từ trở lên, cho phép ngoặc, dấu chấm, gạch ("Ngô Giảng(Nguyễn Thị Thế)"). */
const RE_TEN_NUT = /^\p{L}[\p{L}.]*(\s*[\s(\-–][\s(]*\p{L}[\p{L}.)]*)+\)?$/u;
const RE_DT_NUT = /^(\d+[.,]\d+|\d{1,3}([. ]\d{3})+(,\d+)?)$/;

/**
 * Nhận dạng nút thuộc tính thửa: các dòng cùng vị trí có kiểu giá trị ổn định. 1.3.6 — đối chiếu 4 tệp trích đo gCadas V8 thật:
 * bố cục dòng khác nhau giữa các đơn vị đo (vd. [thửa, DT, loại, chủ, địa chỉ, ghi chú], [tờ, thửa, loại, chủ, chủ 2, địa chỉ],
 * [tờ, thửa, loại, chủ, DT]) → phân loại từng dòng theo giá trị: số nguyên (tờ: ít giá trị khác nhau; thửa: nhiều), số thập
 * phân (diện tích), ký hiệu loại đất, họ tên (dòng tên thứ hai = người đồng sử dụng), địa chỉ, ghi chú (ít giá trị, nhiều ô trống).
 */
export function nhanDangNutThuocTinh(ban: KetQuaDocDgn): (CauHinhNut & { soNut: number }) | null {
  let tot: (CauHinhNut & { soNut: number }) | null = null;
  for (const [lop, ds] of nutTheoLop(ban)) {
    const nut = ds.filter((d) => d.length >= 3);
    if (nut.length < 5) continue;
    const soDong = Math.max(...nut.map((d) => d.length));
    const cot = Array.from({ length: soDong }, (_, i) => {
      const v = nut.map((d) => (d[i] ?? "").trim()).filter(Boolean);
      const ty = (re: RegExp) => (v.length ? v.filter((x) => re.test(x)).length / v.length : 0);
      return {
        i,
        day: v.length / nut.length,
        so: ty(RE_SO) * (v.length / nut.length),
        dt: ty(RE_DT_NUT),
        loai: ty(RE_MA_LOAI),
        diaChi: ty(RE_DIA_CHI),
        ten: v.length ? v.filter((x) => RE_TEN_NUT.test(x) && !RE_DIA_CHI.test(x)).length / v.length : 0,
        khac: v.length ? new Set(v).size / v.length : 0,
        soGiaTri: new Set(v).size,
      };
    });
    const dong: Partial<Record<TruongNut, number>> = {};
    const daDung = () => new Set(Object.values(dong));
    const cotSo = cot.filter((c) => c.so >= 0.8).sort((a, b) => b.khac - a.khac);
    if (!cotSo.length) continue;
    dong.soThua = cotSo[0]!.i;
    const to = cotSo.slice(1).sort((a, b) => a.khac - b.khac)[0];
    if (to && to.khac < cotSo[0]!.khac) dong.soTo = to.i;
    const loai = cot.filter((c) => c.loai >= 0.8 && !daDung().has(c.i)).sort((a, b) => b.loai - a.loai)[0];
    if (loai) dong.loaiDat = loai.i;
    const dt = cot.filter((c) => c.dt >= 0.6 && c.day >= 0.5 && !daDung().has(c.i)).sort((a, b) => b.dt - a.dt)[0];
    if (dt) dong.dienTich = dt.i;
    const ten = cot.filter((c) => c.ten >= 0.6 && c.diaChi < 0.5 && !daDung().has(c.i)).sort((a, b) => a.i - b.i);
    if (ten[0]) dong.chuSuDung = ten[0].i;
    if (ten[1] && ten[1].day >= 0.2) dong.chuSuDung2 = ten[1].i;
    const dc = cot.filter((c) => c.diaChi >= 0.6 && c.day >= 0.3 && !daDung().has(c.i)).sort((a, b) => b.diaChi - a.diaChi)[0];
    if (dc) dong.diaChi = dc.i;
    // ghi chú: dòng sau cùng các trường trên, có giá trị ở một phần nút và ít giá trị khác nhau (vd. "Ngoài")
    const gc = cot.filter((c) => !daDung().has(c.i) && c.day > 0 && c.soGiaTri <= 5 && c.i > Math.max(...daDung())).sort((a, b) => b.day - a.day)[0];
    if (gc) dong.ghiChu = gc.i;
    if (dong.soTo === undefined && dong.chuSuDung === undefined) continue;
    if (!tot || nut.length > tot.soNut) tot = { lop: [lop], dong, soNut: nut.length };
  }
  return tot;
}

const RE_DT_GHI = /^(\d+[.,]\d+|\d{1,3}([. ]\d{3})+(,\d+)?)$/;

/**
 * 1.3.5 — Nhãn kép (dạng phân số) trên ba lớp chữ riêng: loại đất bên cạnh, số thửa TRÊN gạch ngang, diện tích DƯỚI gạch
 * ngang; không có chủ sử dụng, không có số tờ (vd. bản trích đo V8: lớp 2 "CLN", lớp 13 "16", lớp 4 "14308,9"). Nhận dạng:
 * lớp diện tích (≥ 80% chữ là số thập phân), lớp số thửa (≥ 80% số nguyên) mà với ≥ 60% nhãn diện tích, số gần nhất nằm phía
 * trên theo cùng một độ lệch (sai khác ≤ max(1 m, 30%)); lớp loại đất (≥ 80% mã loại đất) cùng độ lệch đều. Không dùng chiều cao
 * chữ (tệp V8 có thể không lưu). Trả null nếu không thấy.
 */
export function nhanDangNhanKep(ban: KetQuaDocDgn): { soThua: number; dienTich: number; loaiDat?: number; soNhan: number } | null {
  type C = { chu: string; x: number; y: number };
  const theoLop = new Map<number, C[]>();
  for (const pt of phanTuGoc(ban)) {
    if (pt.loai !== "CHU" || (pt as PhanTuChu).nut !== undefined) continue;
    const chu = giaiMaNhan(pt as PhanTuChu).trim();
    if (!chu) continue;
    const ds = theoLop.get(pt.lop) ?? [];
    ds.push({ chu, x: (pt as PhanTuChu).goc.x, y: (pt as PhanTuChu).goc.y });
    theoLop.set(pt.lop, ds);
  }
  const tyLe = (ds: C[], re: RegExp) => ds.filter((d) => re.test(d.chu)).length / ds.length;
  const lop = (re: RegExp) => [...theoLop].filter(([, ds]) => ds.length >= 3 && tyLe(ds, re) >= 0.8).map(([l, ds]) => ({ l, ds: ds.filter((d) => re.test(d.chu)) }));
  const trungVi = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]!; };
  /** Tỷ lệ nhãn A có chữ gần nhất thuộc B theo một độ lệch đều; `tren`: chữ B phải nằm phía trên. */
  const deu = (A: C[], B: C[], tren: boolean) => {
    const off = A.map((a) => {
      let m = B[0]!, dm = Infinity;
      for (const b of B) { const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < dm) { dm = d; m = b; } }
      return { dx: m.x - a.x, dy: m.y - a.y };
    });
    const med = { dx: trungVi(off.map((o) => o.dx)), dy: trungVi(off.map((o) => o.dy)) };
    const dai = Math.hypot(med.dx, med.dy);
    if (dai > 25 || (tren && med.dy <= 0)) return 0;
    const sai = Math.max(1, 0.3 * dai);
    return off.filter((o) => Math.hypot(o.dx - med.dx, o.dy - med.dy) <= sai).length / A.length;
  };
  let tot: { soThua: number; dienTich: number; r: number; n: number; A: C[] } | null = null;
  for (const a of lop(RE_DT_GHI))
    for (const b of lop(RE_SO)) {
      if (a.l === b.l || b.ds.length < a.ds.length * 0.5 || b.ds.length > a.ds.length * 2) continue;
      const r = deu(a.ds, b.ds, true);
      if (r >= 0.6 && (!tot || r > tot.r || (r === tot.r && a.ds.length > tot.n))) tot = { soThua: b.l, dienTich: a.l, r, n: a.ds.length, A: a.ds };
    }
  if (!tot) return null;
  let loai: { l: number; r: number } | null = null;
  for (const c of lop(RE_MA_LOAI)) {
    if (c.l === tot.soThua || c.l === tot.dienTich) continue;
    const r = deu(tot.A, c.ds, false);
    if (r >= 0.6 && (!loai || r > loai.r)) loai = { l: c.l, r };
  }
  return { soThua: tot.soThua, dienTich: tot.dienTich, ...(loai ? { loaiDat: loai.l } : {}), soNhan: tot.n };
}

export interface GoiYCauHinh {
  cauHinh: CauHinhLop;
  ghiChu: string[];
  /** 1.3.6: số tờ gợi ý (số hiệu mảnh trên bản vẽ / tên tệp) khi thửa không có số tờ — cán bộ xác nhận khi nạp. */
  soToGoiY?: { soTo: string; nguon: string } | null;
  /** 1.3.6: diện tích trong phạm vi GPMB ghi ở khung tờ — để đối chiếu phạm vi thu hồi cán bộ chọn. */
  dienTichGpmbGhi?: DienTichGhi | null;
  /** 1.3.6: lớp tô các thửa ngoài phạm vi GPMB (phần bù khớp diện tích ghi) — giao diện đề nghị "chọn các thửa còn lại". */
  lopThuaNgoai?: { lop: number; soThuaTrong: number; dienTichTrong: number } | null;
}

/** Gợi ý cấu hình: giữ cấu hình gốc, bổ sung nút thuộc tính nếu nhận dạng được; ghi chú lớp mặc định trống. */
export function goiYCauHinh(ban: KetQuaDocDgn, goc: CauHinhLop = CAU_HINH_MAC_DINH, tenTep = ""): GoiYCauHinh {
  const ghiChu: string[] = [];
  const cauHinh: CauHinhLop = { ...goc };
  const tk = new Map(thongKeLop(ban).map((x) => [x.lop, x]));
  const co = (ds: number[], f: (x: ThongKeLop) => number) => ds.some((l) => (tk.get(l) ? f(tk.get(l)!) : 0) > 0);

  if (!goc.nutThuocTinh) {
    const nut = nhanDangNutThuocTinh(ban);
    if (nut) {
      cauHinh.nutThuocTinh = { lop: nut.lop, dong: nut.dong };
      const ten: Record<TruongNut, string> = { soTo: "số tờ", soThua: "số thửa", loaiDat: "loại đất", chuSuDung: "chủ sử dụng", chuSuDung2: "người đồng sử dụng", dienTich: "diện tích", diaChi: "địa chỉ", ghiChu: "ghi chú" };
      const mo = (Object.keys(nut.dong) as TruongNut[])
        .sort((a, b) => nut.dong[a]! - nut.dong[b]!)
        .map((k) => `dòng ${nut.dong[k]! + 1} = ${ten[k]}`)
        .join(", ");
      ghiChu.push(`Nhận dạng ${nut.soNut} nút chữ thuộc tính thửa trên lớp ${nut.lop[0]} (${mo}) — kiểu bản đồ lập bằng gCadas.`);
      // Lớp nhãn chủ sử dụng đứng riêng: đối chiếu chéo với tên chủ trong nút (để phát hiện mâu thuẫn giữa hai nguồn)
      const lopChu = lopChuDoiChieu(ban, nut);
      if (lopChu && !co(goc.chuSuDung, (x) => x.soChu)) {
        cauHinh.chuSuDung = [lopChu.lop];
        ghiChu.push(
          `Lớp ${lopChu.lop} là nhãn chủ sử dụng đứng riêng (${Math.round(lopChu.tyLeKhop * 100)}% tên trùng với tên trong nút) — dùng để đối chiếu; thửa có tên khác nhau giữa hai nguồn sẽ bị gắn cờ "Nhiều chủ".`,
        );
      }
    }
  }
  let nhanKep = false;
  // 1.3.5: nhãn kép trên ba lớp riêng — chỉ khi lớp số thửa mặc định không chứa số thửa (tệp không theo cấu hình mặc định)
  if (!cauHinh.nutThuocTinh && goc.soThua === CAU_HINH_MAC_DINH.soThua) {
    const chuLop = (ds: number[]) => phanTuGoc(ban).filter((pt) => pt.loai === "CHU" && ds.includes(pt.lop)).map((pt) => giaiMaNhan(pt as PhanTuChu).trim());
    const soMacDinh = chuLop(goc.soThua);
    const nk = !soMacDinh.length || soMacDinh.filter((c) => RE_SO.test(c)).length / soMacDinh.length < 0.5 ? nhanDangNhanKep(ban) : null;
    if (nk) {
      nhanKep = true;
      cauHinh.nhanThua = [];
      cauHinh.soThua = [nk.soThua];
      cauHinh.dienTich = [nk.dienTich];
      if (nk.loaiDat !== undefined) cauHinh.loaiDat = [nk.loaiDat];
      if (!co(cauHinh.soTo, (x) => x.soChu)) cauHinh.soTo = [];
      if (!co(cauHinh.chuSuDung, (x) => x.soChu)) cauHinh.chuSuDung = [];
      ghiChu.push(
        `Nhãn kép ${nk.soNhan} thửa: ${nk.loaiDat !== undefined ? `loại đất lớp ${nk.loaiDat}, ` : ""}số thửa lớp ${nk.soThua} (trên gạch ngang), diện tích lớp ${nk.dienTich} (dưới gạch ngang) — nhãn không có chủ sử dụng, số tờ; nhập số tờ của tệp ở “Số tờ bản đồ của tệp”.`,
      );
    }
  }
  if (!goc.nhanHienTrang?.length) {
    const ht = lopNhanHienTrang(ban);
    if (ht) {
      cauHinh.nhanHienTrang = [ht.lop];
      ghiChu.push(`Lớp ${ht.lop} ghi hiện trạng GPMB trong thửa (${ht.mau}) — dùng để đối chiếu với tiến độ trong phần mềm, không ghi đè.`);
    }
  }
  // 1.3.6 (BĐ-1): tệp không theo số lớp mặc định, không có nút thuộc tính → dò lớp tổng quát theo nội dung (và tên lớp DXF)
  if (!co(cauHinh.ranhThua, (x) => x.soDuong + x.soVung) && goc.ranhThua === CAU_HINH_MAC_DINH.ranhThua) {
    const dl = doLopTongQuat(ban, cauHinh, [...tk.values()]);
    if (dl) {
      Object.assign(cauHinh, dl.cauHinh);
      ghiChu.push(...dl.ghiChu);
    }
  }
  if (!co(cauHinh.ranhThua, (x) => x.soDuong + x.soVung)) ghiChu.push(`Lớp ranh thửa (${cauHinh.ranhThua.join(", ")}) không có đường nào.`);
  // 1.0.7: ranh thửa vẽ trên nhiều lớp (phần giáp đường, suối… nằm ở lớp khác) → thử thêm lớp đường làm ranh thửa
  if (goc.ranhThua === CAU_HINH_MAC_DINH.ranhThua && (cauHinh.nutThuocTinh || co(cauHinh.soThua, (x) => x.soChu))) {
    const bs = boSungLopRanh(ban, cauHinh, [...tk.values()]);
    if (bs) {
      ghiChu.push(`Ranh thửa vẽ trên nhiều lớp: thêm lớp ${bs.them.join(", ")} vào lớp ranh thửa — ${bs.sau}/${bs.soNeo} thửa chứa đúng một nút / nhãn số thửa (trước: ${bs.truoc}). Cán bộ xem lại các lớp này đúng là ranh thửa.`);
      cauHinh.ranhThua = bs.ranhThua;
      // Lớp đã là ranh thửa: chỉ giữ làm ranh GPMB nếu tự khép được vùng (1.3.6 — TD74 thật: thửa bị cắt theo ranh GPMB lớp 30,
      // lớp 30 vừa là cạnh thửa vừa là ranh GPMB); không khép được (mép suối, mép đường) thì bỏ khỏi ranh GPMB như trước
      const trung = bs.them.filter((l) => cauHinh.ranhGpmb.includes(l) && !lopKhepDuoc(ban, l, cauHinh.dienTichToiThieu));
      if (trung.length) {
        cauHinh.ranhGpmb = cauHinh.ranhGpmb.filter((l) => !trung.includes(l));
        ghiChu.push(`Lớp ${trung.join(", ")} là ranh thửa nên không dùng làm lớp ranh GPMB (mặc định) — đã bỏ khỏi lớp ranh GPMB.`);
      }
    }
  }
  // 1.3.5: nhãn kép không có chủ — tìm lớp tên chủ sử dụng đứng riêng trong thửa (sau khi đã ghép lớp ranh thửa)
  if (nhanKep && !cauHinh.chuSuDung.length) {
    const ungVien = [...tk.values()].filter((x) => x.soChu >= 3 && x.mau.length && x.mau.filter((m) => RE_NHIEU_TU.test(m)).length / x.mau.length >= 0.8);
    let tot: { lop: number; n: number; tong: number } | null = null;
    for (const x of ungVien) {
      const ds = dungThua(ban, { ...cauHinh, chuSuDung: [x.lop] }).thua.filter((t) => t.soThua);
      const n = ds.filter((t) => t.chuSuDung && !t.co.includes("NHIEU_CHU")).length;
      if (ds.length && n / ds.length >= 0.7 && (!tot || n > tot.n)) tot = { lop: x.lop, n, tong: ds.length };
    }
    if (tot) {
      cauHinh.chuSuDung = [tot.lop];
      ghiChu.push(`Lớp ${tot.lop} là tên chủ sử dụng ghi riêng trong thửa (${tot.n}/${tot.tong} thửa có đúng một tên) — cán bộ xác nhận.`);
    }
  }
  // 1.3.6: diện tích trong phạm vi GPMB ghi ở khung tờ → lớp khép đúng diện tích đó là ranh GPMB (TD74 thật: lớp 30 khớp 0,00%)
  const dtGhi = dienTichGpmbGhi(ban);
  let daCoRanhTheoDt = false;
  let lopThuaNgoai: GoiYCauHinh["lopThuaNgoai"] = null;
  if (dtGhi) {
    const khop = lopKhopDienTich(ban, dtGhi.dienTich, [...tk.values()].filter((x) => x.soDuong + x.soVung > 0).map((x) => x.lop));
    const so = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });
    if (khop) {
      daCoRanhTheoDt = true;
      cauHinh.ranhGpmb = [khop.lop];
      ghiChu.push(`Lớp ${khop.lop} khép được vùng ${so(khop.dienTich)} m², khớp diện tích ghi trên bản đồ “${dtGhi.chu}” — dùng làm ranh GPMB. Cán bộ xác nhận.`);
    } else {
      const tong = dungThua(ban, { ...cauHinh, ranhGpmb: [] }).thua.reduce((a, t) => a + t.dienTichHinhHoc, 0);
      if (Math.abs(tong - dtGhi.dienTich) <= Math.max(0.5, dtGhi.dienTich * 0.001))
        ghiChu.push(`Tổng diện tích các thửa dựng được (${so(tong)} m²) khớp diện tích ghi “${dtGhi.chu}” — toàn bộ thửa trên tờ thuộc phạm vi GPMB: dùng “Chọn thửa trực tiếp” / chọn tất cả thửa. Cán bộ xác nhận.`);
      else {
        const ds = dungThua(ban, { ...cauHinh, ranhGpmb: [] }).thua;
        lopThuaNgoai = lopThuaNgoaiPhamVi(ban, ds, dtGhi.dienTich, [...tk.values()].filter((x) => x.soVung >= 3 && !cauHinh.ranhThua.includes(x.lop)).map((x) => x.lop));
        if (lopThuaNgoai) {
          daCoRanhTheoDt = true;
          cauHinh.ranhGpmb = cauHinh.ranhGpmb.filter((l) => l !== lopThuaNgoai!.lop);
          ghiChu.push(`Lớp ${lopThuaNgoai.lop} tô các thửa NGOÀI phạm vi GPMB: ${lopThuaNgoai.soThuaTrong} thửa còn lại có tổng ${so(lopThuaNgoai.dienTichTrong)} m², khớp “${dtGhi.chu}” (lệch ${so(Math.abs(lopThuaNgoai.dienTichTrong - dtGhi.dienTich))} m²) — chọn các thửa này làm phạm vi thu hồi (nút ở mục Phạm vi thu hồi). Cán bộ xác nhận.`);
        } else ghiChu.push(`Bản đồ ghi “${dtGhi.chu}” nhưng không lớp nào khép đúng diện tích này — chọn phạm vi thu hồi rồi đối chiếu với con số trên (thẻ Kiểm tra bản đồ).`);
      }
    }
  }
  if (!daCoRanhTheoDt && !co(cauHinh.ranhGpmb, (x) => x.soDuong + x.soVung)) {
    const vt = lopVungThuaThuHoi(ban, cauHinh);
    if (vt) {
      cauHinh.ranhGpmb = [vt.lop];
      ghiChu.push(`Lớp ranh GPMB mặc định (${goc.ranhGpmb.join(", ")}) trống; lớp ${vt.lop} có ${vt.soVung} vùng khép kín trùng thửa đất (${vt.soTrung}/${vt.soVung}) — dùng làm phạm vi thu hồi (chọn các vùng cần tính ở mục Phạm vi thu hồi). Cán bộ xác nhận lớp này đúng là thửa thu hồi.`);
    } else ghiChu.push(`${cauHinh.ranhGpmb.length ? `Lớp ranh GPMB (${cauHinh.ranhGpmb.join(", ")}) không có đường nào` : "Chưa xác định được lớp ranh GPMB"} — chọn lớp ranh GPMB trong cấu hình lớp, hoặc chọn thửa thu hồi trực tiếp trên bản đồ.`);
  }
  // 1.3.6: số tờ — chỉ gợi ý khi phần lớn thửa không đọc được số tờ (nút thuộc tính không có dòng số tờ)
  let soToGoiY: GoiYCauHinh["soToGoiY"] = null;
  const ds = dungThua(ban, cauHinh).thua;
  if (ds.length && ds.filter((t) => !t.soTo).length >= ds.length * 0.8) {
    soToGoiY = goiYSoTo(ban, tenTep);
    if (soToGoiY) ghiChu.push(`Thửa không ghi số tờ; gợi ý số tờ của tệp: “${soToGoiY.soTo}” (${soToGoiY.nguon}) — cán bộ xác nhận ở ô “Số tờ bản đồ của tệp”.`);
  }
  return { cauHinh, ghiChu, soToGoiY, dienTichGpmbGhi: dtGhi, lopThuaNgoai };
}

/** Điểm neo của thửa: dòng đầu nút thuộc tính, hoặc nhãn số thửa / nhãn thửa đứng riêng. */
function diemNeo(ban: KetQuaDocDgn, ch: CauHinhLop): Diem[] {
  const out: Diem[] = [];
  const daCo = new Set<number>();
  for (const pt of phanTuGoc(ban)) {
    if (pt.loai !== "CHU") continue;
    if (ch.nutThuocTinh?.lop.length) {
      if (pt.nut !== undefined && ch.nutThuocTinh.lop.includes(pt.lop) && !daCo.has(pt.nut)) {
        daCo.add(pt.nut);
        out.push(pt.goc);
      }
    } else if ((ch.soThua.includes(pt.lop) || ch.nhanThua.includes(pt.lop)) && /\d/.test(giaiMaNhan(pt))) out.push(pt.goc);
  }
  return out;
}

export interface DiemRanh {
  /** thửa chứa đúng một điểm neo */
  mot: number;
  /** vùng (> ngưỡng) không chứa điểm neo — mảnh vụn, phần ngoài */
  rong: number;
  /** vùng chứa từ hai điểm neo — thiếu cạnh */
  nhieu: number;
  /** điểm neo không nằm trong vùng nào */
  ngoai: number;
  soNeo: number;
}

/** 1.3.6 — Chấm điểm một tập lớp ranh thửa theo các điểm neo (nút thuộc tính / nhãn số thửa). */
export function chamLopRanh(ban: KetQuaDocDgn, ch: CauHinhLop, neo: Diem[] = diemNeo(ban, ch)): DiemRanh {
  const kq = dungThua(ban, { ...ch, nutThuocTinh: null, nhanThua: [], soThua: [], soTo: [], chuSuDung: [], loaiDat: [], dienTich: [], nhanHienTrang: [], ranhGpmb: [], dienTichToiThieu: Math.min(ch.dienTichToiThieu, 0.01) });
  let mot = 0, rong = 0, nhieu = 0;
  const trong = new Set<number>();
  for (const t of kq.thua) {
    const xs = t.vong[0]!.map((d) => d.x), ys = t.vong[0]!.map((d) => d.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let n = 0;
    neo.forEach((d, i) => {
      if (d.x < x0 || d.x > x1 || d.y < y0 || d.y > y1 || !diemTrongThua(d, t.vong)) return;
      n++;
      trong.add(i);
    });
    if (n === 1) mot++;
    else if (n > 1) nhieu++;
    else if (t.dienTichHinhHoc > ch.dienTichToiThieu) rong++;
  }
  return { mot, rong, nhieu, ngoai: neo.length - trong.size, soNeo: neo.length };
}
const diemSo = (d: DiemRanh) => d.mot - d.nhieu - 0.5 * d.rong;

/**
 * 1.0.7 / 1.3.6 — Ranh thửa vẽ trên nhiều lớp (cạnh giáp đường, suối, khung trích đo, đường ranh GPMB nằm ở lớp khác). Thử
 * thêm từng lớp có đường (tối đa 20 lớp nhiều đường nhất), chấm điểm = số thửa chứa đúng một nút / nhãn số thửa − số vùng chứa
 * nhiều nút − ½ số vùng không có nút (mảnh vụn). 1.3.6: thay cách chấm "số thửa khớp diện tích ghi" (lớp ranh GPMB, ký hiệu
 * nhãn bị coi là ranh thửa — TD74, TD48 thật). Chỉ chạy khi < 98% điểm neo nằm riêng trong một thửa. Trả null nếu không cải thiện.
 */
function boSungLopRanh(ban: KetQuaDocDgn, ch: CauHinhLop, tk: ThongKeLop[]): { ranhThua: number[]; them: number[]; truoc: number; sau: number; soNeo: number } | null {
  const neo = diemNeo(ban, ch);
  if (neo.length < 3) return null;
  const goc = chamLopRanh(ban, ch, neo);
  if (goc.mot >= neo.length * 0.98) return null;
  let ranh = [...ch.ranhThua], tot = goc;
  // 1.3.6: bỏ lớp chỉ có thành phần của ô (cell) — ký hiệu nhãn thửa của gCadas (vòng tròn + gạch quanh số thửa, TD74 thật lớp 11)
  const laKyHieu = new Set(tk.map((x) => x.lop).filter((l) => {
    const ds = phanTuGoc(ban).filter((pt) => pt.lop === l && pt.loai !== "CHU" && pt.loai !== "KHAC");
    return ds.length > 0 && ds.every((pt) => pt.laThanhPhan) && !ds.some((pt) => pt.loai === "CHUOI_PHUC" || pt.loai === "VUNG_PHUC");
  }));
  const coPhucCha = new Set(ban.phanTu.filter((pt) => pt.loai === "CHUOI_PHUC" || pt.loai === "VUNG_PHUC").flatMap((pt) => ("thanhPhan" in pt ? pt.thanhPhan.map((c) => c.lop) : [])));
  const ungVien = tk.filter((x) => x.soDuong + x.soVung > 0 && !ranh.includes(x.lop) && !(laKyHieu.has(x.lop) && !coPhucCha.has(x.lop))).sort((a, b) => b.soDuong + b.soVung - (a.soDuong + a.soVung)).slice(0, 20).map((x) => x.lop);
  // vòng 1: lợi riêng từng lớp; sau đó thêm dần theo thứ tự lợi, giữ lớp nào còn làm tăng điểm
  // tối đa 3 vòng: một lớp có thể chỉ có lợi sau khi đã thêm lớp khác (TD48 thật: lớp 32 sau lớp 23, 50)
  for (let vong = 0; vong < 3; vong++) {
    const truocVong = diemSo(tot);
    const loi = ungVien
      .filter((l) => !ranh.includes(l))
      .map((l) => ({ l, d: chamLopRanh(ban, { ...ch, ranhThua: [...ranh, l] }, neo) }))
      .filter((x) => diemSo(x.d) > diemSo(tot) + 0.5)
      .sort((a, b) => diemSo(b.d) - diemSo(a.d));
    for (const { l } of loi) {
      const d = chamLopRanh(ban, { ...ch, ranhThua: [...ranh, l] }, neo);
      if (diemSo(d) > diemSo(tot) + 0.5) [ranh, tot] = [[...ranh, l], d];
    }
    if (diemSo(tot) <= truocVong || tot.mot >= neo.length * 0.98) break;
  }
  if (diemSo(tot) <= diemSo(goc)) return null;
  return { ranhThua: ranh, them: ranh.filter((l) => !ch.ranhThua.includes(l)), truoc: goc.mot, sau: tot.mot, soNeo: neo.length };
}

/** Lớp tự khép được ít nhất một vùng lớn hơn ngưỡng. */
function lopKhepDuoc(ban: KetQuaDocDgn, lop: number, nguong: number): boolean {
  return dungThua(ban, { ...CAU_HINH_MAC_DINH, ranhThua: [], nhanThua: [], soThua: [], soTo: [], chuSuDung: [], nutThuocTinh: null, nhanHienTrang: [], ranhGpmb: [lop], dienTichToiThieu: nguong }).vungGpmb.length > 0;
}

const RE_NHAN_THUA = /^(\d*[\p{L}+]+\s*\d+\s*\/\s*\d+([.,]\d+)?|\d+|\d+[.,]\d+|[A-ZĐ]{2,4}(\+[A-ZĐ]{2,4})*)$/u;
const tenLopCua = (ban: KetQuaDocDgn, l: number) => (ban.tenLop?.[l] ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

/**
 * 1.3.6 (BĐ-1) — Dò lớp khi lớp ranh thửa mặc định trống (tệp DXF đặt tên lớp, tệp của đơn vị đo khác quy ước số lớp):
 *  - lớp chữ nhãn thửa: lớp có nhiều chữ dạng số thửa / diện tích / ký hiệu loại đất / nhãn gộp "LOẠI SỐ/DT" nhất;
 *  - lớp ranh thửa: lớp đường cho nhiều vùng chứa đúng một nhãn số thửa nhất (chấm như bổ sung lớp ranh);
 *  - lớp chủ sử dụng: lớp chữ ≥ 60% là họ tên, phần lớn nằm trong thửa;
 *  - lớp ranh GPMB: tên lớp có "gpmb", "thu hoi", "giai phong" (DXF), nếu có.
 * Kết quả là gợi ý; cán bộ xem ở trình nhập bản đồ / Cấu hình lớp.
 */
function doLopTongQuat(ban: KetQuaDocDgn, goc: CauHinhLop, tk: ThongKeLop[]): { cauHinh: Partial<CauHinhLop>; ghiChu: string[] } | null {
  const chu = new Map<number, string[]>();
  for (const pt of phanTuGoc(ban)) if (pt.loai === "CHU" && pt.nut === undefined) chu.set(pt.lop, [...(chu.get(pt.lop) ?? []), giaiMaNhan(pt).trim()]);
  const lopNhan = [...chu].map(([l, ds]) => ({ l, n: ds.filter((c) => RE_NHAN_THUA.test(c) && /\d|^[A-ZĐ]{2,4}/u.test(c)).length, ds })).filter((x) => x.n >= 3 && x.n / x.ds.length >= 0.6).sort((a, b) => b.n - a.n);
  if (!lopNhan.length) return null;
  const nhanThua = [lopNhan[0]!.l];
  const thu = { ...goc, nutThuocTinh: null, nhanThua, soThua: [], soTo: [], chuSuDung: [], loaiDat: [], dienTich: [] };
  const neo = diemNeo(ban, thu);
  const tenGoi = (l: number) => (/ranh.?thua|thua.?dat|parcel|ranh/.test(tenLopCua(ban, l)) ? 2 : 0);
  let tot: { l: number; d: DiemRanh; diem: number } | null = null;
  for (const x of tk.filter((x) => x.soDuong + x.soVung >= 3).sort((a, b) => b.soDuong + b.soVung - (a.soDuong + a.soVung)).slice(0, 16)) {
    const d = chamLopRanh(ban, { ...thu, ranhThua: [x.lop] }, neo);
    const diem = diemSo(d) + tenGoi(x.lop);
    if (d.mot > 0 && (!tot || diem > tot.diem)) tot = { l: x.lop, d, diem };
  }
  if (!tot) return null;
  const ghiChu = [`Lớp ranh thửa mặc định trống — dò theo nội dung: lớp ${tot.l}${ban.tenLop?.[tot.l] ? ` (“${ban.tenLop[tot.l]}”)` : ""} là ranh thửa (${tot.d.mot}/${tot.d.soNeo} thửa chứa đúng một nhãn), lớp ${nhanThua[0]}${ban.tenLop?.[nhanThua[0]!] ? ` (“${ban.tenLop[nhanThua[0]!]}”)` : ""} là nhãn thửa. Cán bộ xác nhận.`];
  const kq: Partial<CauHinhLop> = { ranhThua: [tot.l], nhanThua, soThua: [], soTo: [], loaiDat: [], dienTich: [] };
  const thua = dungThua(ban, { ...thu, ranhThua: [tot.l] }).thua;
  const lopTen = [...chu].filter(([l, ds]) => l !== nhanThua[0] && ds.length >= 3 && ds.filter((c) => RE_NHIEU_TU.test(c)).length / ds.length >= 0.6);
  let ten: { l: number; n: number } | null = null;
  for (const [l] of lopTen) {
    const n = dungThua(ban, { ...thu, ranhThua: [tot.l], chuSuDung: [l] }).thua.filter((t) => t.chuSuDung).length;
    if (n >= thua.length * 0.3 && (!ten || n > ten.n)) ten = { l, n };
  }
  kq.chuSuDung = ten ? [ten.l] : [];
  if (ten) ghiChu.push(`Lớp ${ten.l}${ban.tenLop?.[ten.l] ? ` (“${ban.tenLop[ten.l]}”)` : ""} là tên chủ sử dụng (${ten.n} thửa có tên).`);
  const gpmb = tk.filter((x) => x.soDuong + x.soVung > 0 && x.lop !== tot!.l && /gpmb|thu.?hoi|giai.?phong/.test(tenLopCua(ban, x.lop)));
  if (gpmb.length === 1) {
    kq.ranhGpmb = [gpmb[0]!.lop];
    ghiChu.push(`Lớp ${gpmb[0]!.lop} (“${ban.tenLop![gpmb[0]!.lop]}”) theo tên lớp là ranh GPMB.`);
  }
  return { cauHinh: kq, ghiChu };
}

/** Lớp chữ ghi hiện trạng GPMB: ≥ 5 dòng chữ, ≥ 60% dạng "Đã GPMB", "Chưa GPMB", "NQH". */
function lopNhanHienTrang(ban: KetQuaDocDgn): { lop: number; mau: string } | null {
  const theoLop = new Map<number, string[]>();
  for (const pt of phanTuGoc(ban)) if (pt.loai === "CHU") theoLop.set(pt.lop, [...(theoLop.get(pt.lop) ?? []), giaiMaNhan(pt)]);
  let tot: { lop: number; mau: string; n: number } | null = null;
  for (const [lop, ds] of theoLop) {
    const khop = ds.filter((x) => loaiHienTrangBanDo(x));
    if (khop.length >= 5 && khop.length / ds.length >= 0.6 && (!tot || khop.length > tot.n)) {
      const dem = new Map<string, number>();
      for (const x of khop) dem.set(x, (dem.get(x) ?? 0) + 1);
      tot = { lop, n: khop.length, mau: [...dem].map(([k, v]) => `"${k}" ${v}`).join(", ") };
    }
  }
  return tot;
}

/**
 * Lớp có vùng khép kín trùng thửa đất (vd. DC5 lớp 40: các thửa thu hồi tô gạch): ≥ 3 vùng, ≥ 60% vùng có
 * điểm trong nằm trong một thửa và diện tích không vượt thửa đó quá 2%.
 */
function lopVungThuaThuHoi(ban: KetQuaDocDgn, ch: CauHinhLop): { lop: number; soVung: number; soTrung: number } | null {
  const kq = dungThua(ban, { ...ch, ranhGpmb: [] });
  if (!kq.thua.length) return null;
  const tk = thongKeLop(ban).filter((x) => x.soVung >= 3 && !ch.ranhThua.includes(x.lop));
  let tot: { lop: number; soVung: number; soTrung: number } | null = null;
  for (const x of tk) {
    const v = dungThua(ban, { ...ch, ranhGpmb: [x.lop] }).vungGpmb.filter((g) => g.nguon === "VUNG_KHEP_KIN");
    if (v.length < 3) continue;
    const trung = v.filter((g) => {
      const d = g.vong[0]!;
      const tam = { x: d.reduce((s, p) => s + p.x, 0) / d.length, y: d.reduce((s, p) => s + p.y, 0) / d.length };
      const t = kq.thua.find((t) => diemTrongThua(tam, t.vong));
      return !!t && g.dienTich <= t.dienTichHinhHoc * 1.02;
    }).length;
    if (trung / v.length >= 0.6 && (!tot || trung > tot.soTrung)) tot = { lop: x.lop, soVung: v.length, soTrung: trung };
  }
  return tot;
}

const chuanTen = (x: string) => x.toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();

/** Lớp chữ đứng riêng (không thuộc nút) mà phần lớn giá trị trùng tên chủ trong nút thuộc tính. */
function lopChuDoiChieu(ban: KetQuaDocDgn, nut: CauHinhNut & { soNut: number }): { lop: number; tyLeKhop: number } | null {
  const iChu = nut.dong.chuSuDung;
  if (iChu === undefined) return null;
  const tenNut = new Set<string>();
  for (const ds of nutTheoLop(ban).get(nut.lop[0]!) ?? []) if (ds[iChu]) tenNut.add(chuanTen(ds[iChu]!));
  const theoLop = new Map<number, string[]>();
  for (const pt of phanTuGoc(ban))
    if (pt.loai === "CHU" && pt.nut === undefined && !nut.lop.includes(pt.lop)) theoLop.set(pt.lop, [...(theoLop.get(pt.lop) ?? []), giaiMaNhan(pt)]);
  let tot: { lop: number; tyLeKhop: number } | null = null;
  for (const [lop, ds] of theoLop) {
    if (ds.length < nut.soNut * 0.5 || ds.length > nut.soNut * 1.5) continue;
    const tyLeKhop = ds.filter((x) => tenNut.has(chuanTen(x))).length / ds.length;
    if (tyLeKhop >= 0.5 && (!tot || tyLeKhop > tot.tyLeKhop)) tot = { lop, tyLeKhop };
  }
  return tot;
}

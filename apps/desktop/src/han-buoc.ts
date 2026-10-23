/**
 * Thời hạn theo bước (docs/05 §1) — chỉ các thời hạn có căn cứ VÀ có mốc bắt đầu xác định được.
 * Mốc "NHAP": cán bộ nhập ngày bắt đầu tính hạn (vd. ngày nhận đủ hồ sơ); mốc "BUOC": ngày hoàn thành bước trước.
 * Thời hạn tính theo "ngày": nếu ngày cuối rơi vào ngày nghỉ thì kết thúc ở ngày làm việc tiếp theo
 * (khoản 5 Điều 148 Bộ luật Dân sự 2015).
 */
import { hanChot, laNgayLamViec, namThieuLich, soNgayLamViec, type LichLamViec } from "./lich-lam-viec";
import type { BuocHo, Ho } from "./mo-hinh";

export interface HanBuoc {
  buoc: string;
  soNgay: number;
  loai: "N" | "NLV";
  moc: { loai: "NHAP"; nhan: string } | { loai: "BUOC"; buoc: string; nhan: string };
  canCu: string;
}

export const HAN_BUOC: HanBuoc[] = [
  // 1.2.0 (B1): bước chung — tính một lần cho dự án / đợt (hanBuocChung), không tính theo từng hộ
  { buoc: "2", soNgay: 3, loai: "N", moc: { loai: "BUOC", buoc: "1", nhan: "ngày phê duyệt Kế hoạch thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm (bước 1; chưa xác nhận thì ngày Kế hoạch T1 đã ghi số)" }, canCu: "khoản 4 Mục V Phần II Sổ tay QĐ 1966/QĐ-UBND — tổ chức họp \"không quá 03 ngày\" kể từ khi Kế hoạch được phê duyệt (mục 2 mục IV Phần II Phụ lục I NĐ 151/2025/NĐ-CP không quy định số ngày)" },
  { buoc: "3", soNgay: 2, loai: "N", moc: { loai: "NHAP", nhan: "Ngày Chủ tịch UBND cấp xã nhận tờ trình ban hành thông báo thu hồi đất (trống = ngày Tờ trình T2 đã ghi số)" }, canCu: "điểm a khoản 2 Mục V Phần II Sổ tay QĐ 1966/QĐ-UBND — ban hành thông báo \"không quá 02 ngày\" kể từ ngày nhận được tờ trình (mục 3 mục IV Phần II Phụ lục I NĐ 151/2025/NĐ-CP không quy định số ngày)" },
  { buoc: "8", soNgay: 30, loai: "N", moc: { loai: "NHAP", nhan: "Ngày nhận đủ hồ sơ thẩm định (thời gian bổ sung hồ sơ không tính — khai báo ở \"Thời gian không tính\")" }, canCu: "khoản 3 Điều 3 NĐ 88/2024/NĐ-CP; mục 8 Phần II Phụ lục I NĐ 151/2025/NĐ-CP — \"không quá 30 ngày\" (Sổ tay QĐ 1966 điểm a khoản 2 Mục XII ghi 30 ngày làm việc; phần mềm theo nghị định)" },
  { buoc: "9", soNgay: 5, loai: "NLV", moc: { loai: "NHAP", nhan: "Ngày nhận tờ trình phê duyệt phương án" }, canCu: "điểm d khoản 2 Mục XII Phần II Sổ tay QĐ 1966/QĐ-UBND (Điều 87 Luật Đất đai 2024 không quy định số ngày)" },
  { buoc: "11", soNgay: 3, loai: "NLV", moc: { loai: "BUOC", buoc: "9", nhan: "ngày phê duyệt phương án (bước 9)" }, canCu: "Mục XV Phần II Sổ tay QĐ 1966/QĐ-UBND (Điều 87 Luật Đất đai 2024 không quy định số ngày)" },
  { buoc: "13", soNgay: 10, loai: "N", moc: { loai: "NHAP", nhan: "Ngày đủ điều kiện ban hành QĐ thu hồi (khoản 5 Điều 87)" }, canCu: "khoản 5, 6 Điều 87 Luật Đất đai 2024" },
  { buoc: "15", soNgay: 3, loai: "NLV", moc: { loai: "BUOC", buoc: "12", nhan: "ngày hoàn thành chi trả (bước 12)" }, canCu: "khoản 1 Mục XVIII Phần II Sổ tay QĐ 1966/QĐ-UBND" },
];

export const hanCuaBuoc = (buoc: string) => HAN_BUOC.find((x) => x.buoc === buoc);

export interface TinhHan {
  han: HanBuoc;
  moc: string | null;
  hanChot: string | null;
  /** Ngày làm việc (NLV) hoặc ngày (N) còn lại tới hạn; âm = đã quá. */
  conLai: number | null;
  trangThai: "CHUA_CO_MOC" | "CON_HAN" | "SAP_HET" | "QUA_HAN" | "XONG_DUNG_HAN" | "XONG_QUA_HAN" | "TAM_DUNG";
  thieuLich: number[];
  /** Số ngày (làm việc nếu thời hạn tính theo NLV) không tính vào thời hạn — đã cộng vào hạn chót */
  khongTinh: number;
}

/**
 * Số ngày không tính vào thời hạn trong các khoảng cán bộ khai báo (có lý do): đếm từ sau ngày `tu` đến hết ngày `den`
 * (khoảng chưa có `den` = đang tạm dừng, tạm tính đến hôm nay). Chỉ tính phần sau ngày mốc.
 */
export function ngayKhongTinh(bh: BuocHo | undefined, han: HanBuoc, moc: string, homNay: string, lich: LichLamViec): { so: number; tamDung: boolean } {
  let so = 0;
  let tamDung = false;
  for (const p of bh?.khongTinh ?? []) {
    if (!p.tu || !p.lyDo?.trim()) continue;
    const tu = p.tu < moc ? moc : p.tu;
    const den = p.den || homNay;
    if (!p.den) tamDung = true;
    if (den <= tu) continue;
    so += han.loai === "NLV" ? soNgayLamViec(tu, den, lich) : Math.round((Date.parse(den) - Date.parse(tu)) / 86400000);
  }
  return { so, tamDung };
}

export function ngayMoc(h: Ho, han: HanBuoc): string | null {
  if (han.moc.loai === "NHAP") return h.tienDo[han.buoc]?.mocHan || null;
  const b = h.tienDo[han.moc.buoc];
  return b?.trangThai === "XONG" && b.ngay ? b.ngay : null;
}

export function tinhHanBuoc(h: Ho, han: HanBuoc, homNay: string, lich: LichLamViec): TinhHan {
  const moc = ngayMoc(h, han);
  const bh: BuocHo | undefined = h.tienDo[han.buoc];
  if (!moc) return { han, moc, hanChot: null, conLai: null, trangThai: "CHUA_CO_MOC", thieuLich: [], khongTinh: 0 };
  const kt = ngayKhongTinh(bh, han, moc, homNay, lich);
  let hc = hanChot(moc, han.soNgay + kt.so, han.loai, lich);
  if (han.loai === "N") while (!laNgayLamViec(hc, lich)) hc = hanChot(hc, 1, "N", lich);
  const thieuLich = namThieuLich(moc, hc, lich);
  if (bh?.trangThai === "XONG") {
    const xong = bh.ngay ?? homNay;
    return { han, moc, hanChot: hc, conLai: null, trangThai: xong > hc ? "XONG_QUA_HAN" : "XONG_DUNG_HAN", thieuLich, khongTinh: kt.so };
  }
  if (kt.tamDung) return { han, moc, hanChot: hc, conLai: null, trangThai: "TAM_DUNG", thieuLich, khongTinh: kt.so };
  const conLai = han.loai === "NLV" ? soNgayLamViec(homNay, hc, lich) : Math.round((Date.parse(hc) - Date.parse(homNay)) / 86400000);
  const trangThai = homNay > hc ? "QUA_HAN" : conLai <= (han.loai === "NLV" ? 1 : 2) ? "SAP_HET" : "CON_HAN";
  return { han, moc, hanChot: hc, conLai, trangThai, thieuLich, khongTinh: kt.so };
}

type BanHan = { trangThai: string; thamDinh?: { yKien: string } | unknown; ho: { hoId: string }[] };

/** Hạn của bước `buoc` cho một bản: hộ có hạn chót sớm nhất; `mocMacDinh` dùng cho hộ chưa ghi mốc riêng ở bước đó. */
export function hanTheoBan(p: BanHan, buoc: string, hos: Ho[], homNay: string, lich: LichLamViec, mocMacDinh?: string | null): TinhHan {
  const han = hanCuaBuoc(buoc)!;
  const ids = new Set(p.ho.map((x) => x.hoId));
  const ds = hos
    .filter((h) => ids.has(h.id))
    .map((h) => (mocMacDinh && !h.tienDo[buoc]?.mocHan ? { ...h, tienDo: { ...h.tienDo, [buoc]: { ...(h.tienDo[buoc] ?? { trangThai: "CHUA" as const }), mocHan: mocMacDinh } } } : h))
    .map((h) => tinhHanBuoc(h, han, homNay, lich));
  const coMoc = ds.filter((t) => t.hanChot);
  if (!coMoc.length) return { han, moc: null, hanChot: null, conLai: null, trangThai: "CHUA_CO_MOC", thieuLich: [], khongTinh: 0 };
  return coMoc.sort((a, b) => a.hanChot!.localeCompare(b.hanChot!))[0]!;
}

/**
 * 1.0.12 — Hạn thẩm định của một bản phương án "Đã chốt" chưa ghi nhận thẩm định: theo bước 8 (≤ 30 ngày [từ 1.0.21; trước đếm ngày làm việc] từ
 * ngày nhận đủ hồ sơ — khoản 3 Điều 3 NĐ 88/2024/NĐ-CP) của các hộ trong bản; mốc là ngày nhận đủ hồ sơ cán bộ ghi ở bước 8
 * (ghi một lần cho cả bản). Lấy hộ có hạn chót sớm nhất; chưa hộ nào có mốc → CHUA_CO_MOC. null nếu không áp dụng.
 */
export function hanThamDinhBan(p: BanHan, hos: Ho[], homNay: string, lich: LichLamViec): TinhHan | null {
  if (p.trangThai !== "DA_CHOT" || p.thamDinh) return null;
  return hanTheoBan(p, "8", hos, homNay, lich);
}

/** "dd/mm/yyyy" (ngày ghi trong văn bản) → "yyyy-mm-dd"; sai dạng → null. */
export const ngayIsoTuChu = (s: string | undefined): string | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((s ?? "").trim());
  return m ? `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}` : null;
};

/**
 * 1.0.13 — Hạn phê duyệt phương án (≤ 5 ngày làm việc từ ngày nhận tờ trình — Sổ tay QĐ 1966; Điều 87 LĐĐ 2024 không quy định số ngày)
 * của bản "Đã chốt" đã thẩm định (không tính bản thẩm định không thống nhất). Mốc: ngày nhận tờ trình ghi ở bước 9 của hộ;
 * hộ chưa ghi thì lấy ngày Tờ trình đề nghị phê duyệt phương án (mẫu 13 / R4) đã ghi số, ngày — của đợt nếu bản thuộc đợt.
 */
export function hanPheDuyetBan(p: BanHan & { dotId?: string }, hos: Ho[], homNay: string, lich: LichLamViec, ngayToTrinh?: string | null): TinhHan | null {
  const td = p.thamDinh as { yKien?: string } | undefined;
  if (p.trangThai !== "DA_CHOT" || !td || td.yKien === "KHONG_THONG_NHAT") return null;
  return hanTheoBan(p, "9", hos, homNay, lich, ngayToTrinh);
}

/** Ngày tờ trình đề nghị phê duyệt phương án (mẫu 13 / R4) đã ghi cho bản: của đợt (nếu bản thuộc đợt) hoặc dự án. */
export function ngayToTrinhPA(duAn: { vanBan?: Record<string, string>; dotThuHoi?: { id: string; vanBan?: Record<string, string> }[] }, p: { dotId?: string }): string | null {
  const dot = p.dotId ? duAn.dotThuHoi?.find((d) => d.id === p.dotId) : undefined;
  return ngayIsoTuChu(dot?.vanBan?.tt_phe_duyet_pa_ngay) ?? (dot ? null : ngayIsoTuChu(duAn.vanBan?.tt_phe_duyet_pa_ngay));
}

/**
 * 1.0.14 — Hạn gửi quyết định phê duyệt phương án đến từng người có đất thu hồi (bước 11: ≤ 3 ngày làm việc kể từ ngày
 * phê duyệt — Sổ tay QĐ 1966) của bản "Đã phê duyệt" có ngày QĐ. Mốc của hộ: ngày xong bước 9
 * nếu đã xác nhận, không thì ngày QĐ phê duyệt ghi ở bản. Chỉ tính hộ chưa xong bước 11; xong cả → null.
 */
export function hanGuiQdBan(p: { trangThai: string; pheDuyet?: { ngay: string }; ho: { hoId: string }[] }, hos: Ho[], homNay: string, lich: LichLamViec): TinhHan | null {
  if (p.trangThai !== "DA_PHE_DUYET" || !p.pheDuyet?.ngay) return null;
  const han = hanCuaBuoc("11")!;
  const ids = new Set(p.ho.map((x) => x.hoId));
  const ds = hos
    .filter((h) => ids.has(h.id) && h.tienDo["11"]?.trangThai !== "XONG" && h.tienDo["11"]?.trangThai !== "KHONG_AP_DUNG")
    .map((h) => (h.tienDo["9"]?.trangThai === "XONG" && h.tienDo["9"]?.ngay ? h : { ...h, tienDo: { ...h.tienDo, "9": { ...(h.tienDo["9"] ?? {}), trangThai: "XONG" as const, ngay: p.pheDuyet!.ngay } } }))
    .map((h) => tinhHanBuoc(h, han, homNay, lich))
    .filter((t) => t.hanChot);
  if (!ds.length) return null;
  return ds.sort((a, b) => a.hanChot!.localeCompare(b.hanChot!))[0]!;
}

/**
 * 1.0.15 — Hạn ban hành quyết định thu hồi đất của một đợt (bước 13: 10 ngày kể từ ngày đủ điều kiện — khoản 5, 6 Điều 87
 * Luật Đất đai 2024). Mốc: ngày đủ điều kiện cán bộ ghi ở bước 13 (ghi một lần cho cả đợt). Chỉ tính hộ chưa xong bước 13;
 * hộ có hạn sớm nhất. Không có hộ nào chưa xong → null.
 */
export function hanThuHoiDot(dotId: string, hos: Ho[], homNay: string, lich: LichLamViec): TinhHan | null {
  return hanThuHoiNhom(hos.filter((h) => h.dotId === dotId), homNay, lich);
}

/** Hạn bước 13 của một nhóm hộ (đợt, hộ chưa xếp đợt, hoặc cả dự án không chia đợt) — xem hanThuHoiDot. */
export function hanThuHoiNhom(nhom: Ho[], homNay: string, lich: LichLamViec): TinhHan | null {
  const han = hanCuaBuoc("13")!;
  const ds = nhom.filter((h) => h.tienDo["13"]?.trangThai !== "XONG" && h.tienDo["13"]?.trangThai !== "KHONG_AP_DUNG");
  if (!ds.length) return null;
  const co = ds.map((h) => tinhHanBuoc(h, han, homNay, lich)).filter((t) => t.hanChot);
  if (!co.length) return { han, moc: null, hanChot: null, conLai: null, trangThai: "CHUA_CO_MOC", thieuLich: [], khongTinh: 0 };
  return co.sort((a, b) => a.hanChot!.localeCompare(b.hanChot!))[0]!;
}

/** Mã nhóm "hộ không thuộc đợt nào" (trùng CHUA_XEP_DOT của dot-thu-hoi.ts). */
export const NHOM_KHONG_DOT = "__chua__";

/**
 * 1.0.16 — Các nhóm hộ tính hạn ban hành QĐ thu hồi đất (bước 13), mỗi nhóm ghi "ngày đủ điều kiện" một lần: từng đợt;
 * hộ không thuộc đợt nào thành một nhóm — "Cả dự án" khi dự án không chia đợt, "Hộ chưa xếp đợt" khi có đợt.
 */
export function nhomThuHoi(duAn: { dotThuHoi?: { id: string; so: number; ten: string }[] }, hos: Ho[]): { id: string; ten: string; hos: Ho[] }[] {
  const dots = duAn.dotThuHoi ?? [];
  const ids = new Set(dots.map((d) => d.id));
  const out = dots.map((d) => ({ id: d.id, ten: d.ten.trim() || `Đợt ${d.so}`, hos: hos.filter((h) => h.dotId === d.id) }));
  const con = hos.filter((h) => !h.dotId || !ids.has(h.dotId));
  if (con.length) out.push({ id: NHOM_KHONG_DOT, ten: dots.length ? "Hộ chưa xếp đợt" : "Cả dự án", hos: con });
  return out;
}

/**
 * 1.1.0 (B3) — Ghi chú khi đổi cách đếm hạn thẩm định (từ 1.0.21: 30 ngày theo k3 Đ3 NĐ 88, mục 8 Phần II PL I NĐ 151; bản
 * 1.0.12–1.0.20 đếm 30 ngày làm việc theo điểm a khoản 2 Mục XII Sổ tay QĐ 1966). Chỉ trả về khi bản đang quá hạn / sắp hết theo
 * cách đếm mới nhưng chưa quá hạn nếu đếm ngày làm việc — để cán bộ biết vì sao bản chuyển trạng thái sau khi cập nhật.
 */
export function ghiChuDoiHanThamDinh(t: TinhHan | null, homNay: string, lich: LichLamViec): string | null {
  if (!t?.moc || !t.hanChot || (t.trangThai !== "QUA_HAN" && t.trangThai !== "SAP_HET")) return null;
  const hcCu = hanChot(hanChot(t.moc, 30, "NLV", lich), t.khongTinh, "N", lich);
  if (homNay > hcCu) return null;
  const vn = (s: string) => s.split("-").reverse().join("/");
  return `Từ bản 1.0.21 hạn thẩm định tính 30 ngày (khoản 3 Điều 3 NĐ 88/2024; mục 8 Phần II Phụ lục I NĐ 151/2025: "không quá 30 ngày"). Sổ tay QĐ 1966 (điểm a khoản 2 Mục XII) ghi 30 ngày làm việc — nếu đếm theo cách đó thì hạn là ${vn(hcCu)}. Đơn vị kiểm tra, áp dụng theo nghị định.`;
}

/** Bước chung có thời hạn (tính một lần cho dự án / đợt). */
export const BUOC_CHUNG_CO_HAN = ["2", "3"] as const;

export interface HanChung {
  /** "" = cả dự án; còn lại = mã đợt */
  dotId: string;
  ten: string;
  t: TinhHan;
}

type NguonHanChung = { tienDoChung?: Record<string, BuocHo>; vanBan?: Record<string, string>; dotThuHoi?: { id: string; so: number; ten: string; tienDoChung?: Record<string, BuocHo>; vanBan?: Record<string, string> }[] };

/**
 * 1.2.0 (B1) — Hạn của bước chung 2 (họp phổ biến: ≤ 03 ngày từ ngày phê duyệt kế hoạch) và bước 3 (ban hành thông báo thu hồi:
 * ≤ 02 ngày từ ngày nhận tờ trình) theo Mục V Phần II Sổ tay QĐ 1966. Tính cho dự án và từng đợt có bước chung riêng / tờ trình
 * riêng (bước để trống ở đợt lấy theo dự án). Mốc bước 3: ngày cán bộ ghi; trống thì ngày Tờ trình T2 đã ghi số (của đợt hoặc dự án).
 */
export function hanBuocChung(duAn: NguonHanChung, homNay: string, lich: LichLamViec): HanChung[] {
  const nhom: { dotId: string; ten: string; td: Record<string, BuocHo>; vanBan?: Record<string, string> }[] = [{ dotId: "", ten: "Cả dự án", td: duAn.tienDoChung ?? {}, vanBan: duAn.vanBan }];
  for (const d of duAn.dotThuHoi ?? []) {
    if (!d.tienDoChung && !d.vanBan?.tt_tb_thu_hoi_ngay && !d.vanBan?.ke_hoach_ngay) continue;
    nhom.push({ dotId: d.id, ten: d.ten.trim() || `Đợt ${d.so}`, td: { ...(duAn.tienDoChung ?? {}), ...(d.tienDoChung ?? {}) }, vanBan: { ...(duAn.vanBan ?? {}), ...(d.vanBan ?? {}) } });
  }
  const out: HanChung[] = [];
  for (const n of nhom) {
    for (const ma of BUOC_CHUNG_CO_HAN) {
      const han = hanCuaBuoc(ma)!;
      const td = { ...n.td };
      // 1.3.0 (C1): bước 1 chưa xác nhận có ngày → mốc bước 2 lấy ngày Kế hoạch (T1) đã ghi số
      if (ma === "2" && !(td["1"]?.trangThai === "XONG" && td["1"]?.ngay)) {
        const kh = ngayIsoTuChu(n.vanBan?.ke_hoach_ngay);
        if (kh) td["1"] = { ...(td["1"] ?? {}), trangThai: "XONG" as const, ngay: kh };
      }
      if (ma === "3" && !td["3"]?.mocHan) {
        const tt = ngayIsoTuChu(n.vanBan?.tt_tb_thu_hoi_ngay);
        if (tt) td["3"] = { ...(td["3"] ?? { trangThai: "CHUA" as const }), mocHan: tt };
      }
      if (td[ma]?.trangThai === "KHONG_AP_DUNG") continue;
      const t = tinhHanBuoc({ tienDo: td } as Ho, han, homNay, lich);
      if (t.trangThai !== "CHUA_CO_MOC") out.push({ dotId: n.dotId, ten: n.ten, t });
    }
  }
  return out;
}


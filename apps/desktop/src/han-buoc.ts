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
  { buoc: "8", soNgay: 30, loai: "NLV", moc: { loai: "NHAP", nhan: "Ngày nhận đủ hồ sơ thẩm định (thời gian bổ sung hồ sơ không tính — khai báo ở \"Thời gian không tính\")" }, canCu: "khoản 3 Điều 3 NĐ 88/2024/NĐ-CP; Mục XII Sổ tay" },
  { buoc: "9", soNgay: 5, loai: "NLV", moc: { loai: "NHAP", nhan: "Ngày nhận tờ trình phê duyệt phương án" }, canCu: "điểm c khoản 3 Điều 87 Luật Đất đai 2024" },
  { buoc: "11", soNgay: 3, loai: "NLV", moc: { loai: "BUOC", buoc: "9", nhan: "ngày phê duyệt phương án (bước 9)" }, canCu: "điểm b khoản 4 Điều 87 Luật Đất đai 2024" },
  { buoc: "13", soNgay: 10, loai: "N", moc: { loai: "NHAP", nhan: "Ngày đủ điều kiện ban hành QĐ thu hồi (khoản 5 Điều 87)" }, canCu: "khoản 5, 6 Điều 87 Luật Đất đai 2024" },
  { buoc: "15", soNgay: 3, loai: "NLV", moc: { loai: "BUOC", buoc: "12", nhan: "ngày hoàn thành chi trả (bước 12)" }, canCu: "Mục XVIII Sổ tay" },
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
 * 1.0.12 — Hạn thẩm định của một bản phương án "Đã chốt" chưa ghi nhận thẩm định: theo bước 8 (≤ 30 ngày làm việc từ
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
 * 1.0.13 — Hạn phê duyệt phương án (≤ 5 ngày làm việc từ ngày nhận tờ trình — điểm c khoản 3 Điều 87 Luật Đất đai 2024)
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
 * phê duyệt — điểm b khoản 4 Điều 87 Luật Đất đai 2024) của bản "Đã phê duyệt" có ngày QĐ. Mốc của hộ: ngày xong bước 9
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
  const han = hanCuaBuoc("13")!;
  const ds = hos.filter((h) => h.dotId === dotId && h.tienDo["13"]?.trangThai !== "XONG" && h.tienDo["13"]?.trangThai !== "KHONG_AP_DUNG");
  if (!ds.length) return null;
  const co = ds.map((h) => tinhHanBuoc(h, han, homNay, lich)).filter((t) => t.hanChot);
  if (!co.length) return { han, moc: null, hanChot: null, conLai: null, trangThai: "CHUA_CO_MOC", thieuLich: [], khongTinh: 0 };
  return co.sort((a, b) => a.hanChot!.localeCompare(b.hanChot!))[0]!;
}

/**
 * Dữ liệu tự điền cho các mẫu dựng theo bộ văn bản dự án thực tế (docs/19): Kế hoạch thu hồi đất, Tờ trình/Thông báo thu
 * hồi đất kèm danh sách, Tờ trình/QĐ phê duyệt phương án 01 hộ (11 mục), Tờ trình/QĐ thu hồi đất nhiều hộ; và bước kiểm tra
 * thống nhất trước khi tạo văn bản (docs/19 mục 5 điểm 4). Chỉ tổng hợp số liệu đã có trong hồ sơ — không tự đặt mức, căn cứ.
 */
import { D, dinhDang } from "@gpmb/core";
import type Decimal from "decimal.js";
import { CAC_BUOC, TEN_HINH_THUC_TDC, type DuAn, type Ho } from "../mo-hinh";
import { tienSddTdc, type KetQuaHo } from "../tinh-ho";
import { docSoTien } from "./doc-so";
import { tenDayDu } from "./loai-dat";
import { laSoMay, soD } from "../so";
import { quyCua } from "../quy-tdc";
import { tinhChiTra, type GiaiDoanTyLe } from "../chi-tra";
import { canhBaoCanCu } from "../van-ban-can-cu";

const soM2 = (v: Decimal) => dinhDang(v, 2);
const tien = (v: Decimal) => dinhDang(v.toDecimalPlaces(0), 0);
const ngayVn = (iso?: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
/** 6 → "Sáu (06)"; dùng trong "Tổng số hộ …: Sáu (06) hộ". */
export const soChu = (n: number) => `${docSoTien(n, "")} (${String(n).padStart(2, "0")})`;
const dtHo = (h: Ho) => h.thua.reduce((s, t) => s.plus(soD(t.dienTichThuHoi)), D(0));
const congDong = (ds: KetQuaHo["tatCa"]) => ds.reduce((s, x) => (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien ? s.plus(x.dong.thanhTien) : s), D(0));
/** Người cùng đứng tên (vợ/chồng) lấy từ nhân khẩu: "vợ: Nguyễn Thị A". */
export function nguoiCungTen(h: Ho): string {
  return h.nhanKhau
    .filter((k) => /^(vợ|chồng)$/i.test(k.quanHe.trim()) && k.hoTen.trim())
    .map((k) => `${k.quanHe.trim().toLowerCase()}: ${k.hoTen.trim()}`)
    .join("; ");
}
const LA_K13 = (ma: string) => ma === "C17";
const DOI_TUONG_GOI: Record<Ho["loai"], string> = { HO_GIA_DINH: "hộ", CA_NHAN: "ông (bà)", TO_CHUC: "tổ chức" };

const tienSo = (x: number) => dinhDang(D(x), 0);

/**
 * Giá trị mặc định tự tính từ hồ sơ cho các trường tổng hợp của phương án (Mẫu 11, 13, 14, R4, R5):
 * tái định cư, chuyển đổi nghề, di dời mồ mả. Không có dữ liệu → undefined (giữ mặc định của mẫu).
 */
export function macDinhTuHoSo(ds: { h: Ho; k: KetQuaHo }[]): Record<string, string> {
  const out: Record<string, string> = {};
  const tdc = ds.filter(({ h }) => h.hoTro.taiDinhCu);
  if (tdc.length) {
    const dem = (ht: string) => tdc.filter(({ h }) => h.hoTro.taiDinhCu!.hinhThuc === ht);
    const tienTdc = (x: typeof tdc) => x.reduce((s, { k }) => s + (k.nhom.find((n) => n.ma === "B.VI")?.dong ?? []).reduce((a, d) => a + (d.dong.trangThai === "TAM_TINH" && d.dong.thanhTien ? d.dong.thanhTien.toNumber() : 0), 0), 0);
    const khu = [...new Set(tdc.map(({ h }) => h.hoTro.taiDinhCu!.khuTdc?.trim()).filter(Boolean))];
    const phan: string[] = [];
    if (dem("DAT_O").length) phan.push(`${dem("DAT_O").length} hộ được giao đất ở tái định cư${khu.length ? ` tại ${khu.join(", ")}` : ""}`);
    if (dem("NHA_O").length) phan.push(`${dem("NHA_O").length} hộ được giao nhà ở tái định cư`);
    if (dem("TU_LO").length) phan.push(`${dem("TU_LO").length} hộ tự lo chỗ ở, hỗ trợ ${tienSo(tienTdc(dem("TU_LO")))} đồng`);
    if (dem("TAI_CHO").length) phan.push(`${dem("TAI_CHO").length} hộ tái định cư tại chỗ`);
    out.pa_tai_dinh_cu = `Bố trí tái định cư cho ${tdc.length} hộ: ${phan.join("; ")}. Tổng hỗ trợ tái định cư ${tienSo(tienTdc(tdc))} đồng.`;
  }
  const cdn = ds.filter(({ k }) => k.theoCot.HT_CDN.gt(0));
  if (cdn.length) out.pa_chuyen_doi_nghe = `Hỗ trợ đào tạo, chuyển đổi nghề và tìm kiếm việc làm cho ${cdn.length} hộ, tổng số tiền ${tienSo(cdn.reduce((s, { k }) => s + k.theoCot.HT_CDN.toNumber(), 0))} đồng.`;
  const mo = ds.reduce((s, { h }) => ({ xay: s.xay + (h.hoTro.moMa?.xay ?? 0), dat: s.dat + (h.hoTro.moMa?.khongXay ?? 0) }), { xay: 0, dat: 0 });
  if (mo.xay + mo.dat > 0) out.pa_mo_ma = `Di dời ${mo.xay + mo.dat} mộ (${mo.xay} mộ xây, ${mo.dat} mộ đất).`;
  return out;
}

/** Tờ trình, QĐ phê duyệt phương án 01 hộ — 11 mục (docs/19 §3.1, §3.2). */
export function duLieuPhuongAnHo(h: Ho, k: KetQuaHo): Record<string, unknown> {
  const dt = dtHo(h);
  const theoLoai = new Map<string, Decimal>();
  for (const t of h.thua) if (soD(t.dienTichThuHoi).gt(0)) theoLoai.set(t.loaiDat, (theoLoai.get(t.loaiDat) ?? D(0)).plus(soD(t.dienTichThuHoi)));
  const nhom = (ma: string) => k.nhom.find((n) => n.ma === ma)?.dong ?? [];
  const aI = nhom("A.I");
  const dauTu = congDong(aI.filter((x) => x.dong.ma === "B07"));
  const btDat = congDong(aI.filter((x) => x.dong.ma !== "B07"));
  const btTaiSan = congDong([...nhom("A.II"), ...nhom("A.III")]);
  const loaiBt = [...new Set(aI.filter((x) => x.dong.ma !== "B07" && x.thuaId).map((x) => h.thua.find((t) => t.id === x.thuaId)?.loaiDat).filter((x): x is string => !!x))].map(tenDayDu);
  // Hỗ trợ: "trong đó" theo nhóm (B.I, B.II, B.IV, B.VI) và theo từng nội dung (B.V, B.VII trừ khoản 13); cây cối, khoản 13 tách riêng
  const trongDo: { ten: string; tien: string }[] = [];
  const themNhom = (ma: string) => {
    const n = k.nhom.find((x) => x.ma === ma);
    const v = n ? congDong(n.dong) : D(0);
    if (n && v.gt(0)) trongDo.push({ ten: n.ten, tien: tien(v) });
  };
  const themDong = (ma: string) => {
    const gop = new Map<string, Decimal>();
    for (const x of nhom(ma)) {
      if (LA_K13(x.dong.ma) || x.dong.trangThai !== "TAM_TINH" || !x.dong.thanhTien?.gt(0)) continue;
      gop.set(x.dong.noiDung, (gop.get(x.dong.noiDung) ?? D(0)).plus(x.dong.thanhTien));
    }
    for (const [ten, v] of gop) trongDo.push({ ten, tien: tien(v) });
  };
  themNhom("B.I");
  themNhom("B.II");
  themNhom("B.IV");
  themDong("B.V");
  themNhom("B.VI");
  themDong("B.VII");
  const k13 = nhom("B.VII").filter((x) => LA_K13(x.dong.ma));
  const k13Tong = congDong(k13);
  const htCay = congDong(nhom("B.III"));
  const chuaDu = k.tatCa.filter((x) => x.dong.trangThai !== "TAM_TINH");
  const cong = btDat.plus(btTaiSan).plus(dauTu).plus(k.tongHoTro);
  const chenh = k.tong.tongLamTron.minus(cong);
  const cungTen = nguoiCungTen(h);
  const tu = macDinhTuHoSo([{ h, k }]);
  return {
    pa_chuyen_doi_nghe_ho: tu.pa_chuyen_doi_nghe ?? "Không.",
    pa_tai_dinh_cu_ho: tu.pa_tai_dinh_cu ?? "Không.",
    pa_boi_thuong_dat_ho: "Không.",
    pa_mo_ma_ho: tu.pa_mo_ma ?? "Không.",
    pa_so_ho_chu: soChu(1),
    // Cách gọi đối tượng trong trích yếu, Điều 1: "hộ Nguyễn Văn A", "ông/bà …", "tổ chức …"
    doi_tuong_goi: DOI_TUONG_GOI[h.loai],
    doi_tuong_goi_hoa: DOI_TUONG_GOI[h.loai].charAt(0).toUpperCase() + DOI_TUONG_GOI[h.loai].slice(1),
    ho_cung_ten: cungTen ? ` (${cungTen})` : "",
    pa_dt_thu_hoi: soM2(dt),
    pa_loai_dat: [...theoLoai].map(([l, v]) => `${tenDayDu(l)}: ${soM2(v)} m²`).join("; "),
    pa_bt_dat: tien(btDat),
    pa_bt_dat_loai: loaiBt.join(", ") || "…",
    pa_bt_tai_san: tien(btTaiSan),
    // Phần mềm không có khoản riêng "bồi thường chi phí di chuyển": di dời, vận chuyển được tính ở nhóm hỗ trợ (B.V)
    pa_bt_di_chuyen: "Không",
    pa_bt_dau_tu: dauTu.gt(0) ? `${tien(dauTu)} đồng` : "Không",
    pa_ho_tro: tien(k.tongHoTro),
    pa_ho_tro_ds: trongDo,
    pa_ht_cay: htCay.gt(0) ? `${tien(htCay)} đồng` : "Không",
    co_k13: k13.length > 0,
    khong_k13: k13.length === 0,
    pa_k13: k13.map((x) => {
      return {
        noi_dung: x.dong.noiDung,
        ly_do: x.dong.thamSo["Lý do"] || "…",
        muc: x.dong.thanhTien ? `${tien(x.dong.thanhTien)} đồng` : "chưa đủ căn cứ",
        can_cu: x.dong.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(" ")).join("; "),
      };
    }),
    pa_k13_tong: tien(k13Tong),
    pa_chenh_lech: chenh.isZero() ? "" : ` (trong đó chênh lệch làm tròn ${tien(chenh)} đồng — ${k.moTaLamTron})`,
    pa_chua_du: chuaDu.length,
    so_cccd: h.soDinhDanh,
    ngay_cap_cccd: h.ngayCapDinhDanh ?? "",
    noi_cap_cccd: h.noiCapDinhDanh ?? "",
  };
}

/** Danh sách thửa của các hộ (mỗi thửa một dòng) — biểu kèm Thông báo và biểu tổng hợp diện tích kèm QĐ thu hồi đất. */
export function bangThuaNhieuHo(ds: { h: Ho }[], diaChiKhuDat: string): { rows: Record<string, unknown>[]; tong: Decimal } {
  const rows: Record<string, unknown>[] = [];
  let tong = D(0);
  ds.forEach(({ h }, i) => {
    const thua = h.thua.filter((t) => soD(t.dienTichThuHoi).gt(0));
    const cungTen = nguoiCungTen(h);
    thua.forEach((t, j) => {
      const v = soD(t.dienTichThuHoi);
      tong = tong.plus(v);
      rows.push({
        stt: j === 0 ? i + 1 : "",
        ho_ten: j === 0 ? h.ten : "",
        cung_ten: j === 0 ? cungTen : "",
        dia_chi: j === 0 ? h.diaChi : "",
        dia_chi_khu_dat: diaChiKhuDat,
        dien_tich: soM2(v),
        so_to: t.soTo,
        so_thua: t.soThua,
        ky_hieu: t.loaiDat.trim().toUpperCase(),
        ghi_chu: soD(t.dienTichThuHoi).gte(soD(t.dienTich)) ? "" : "Thu hồi một phần",
      });
    });
  });
  return { rows, tong };
}

/** Tờ trình, QĐ thu hồi đất nhiều hộ (docs/19 §3.3, §3.4); Thông báo thu hồi đất kèm danh sách (§3, §4.1). */
export function duLieuNhieuHo(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], diaChiKhuDat: string, tenXa: string): Record<string, unknown> {
  const bang = bangThuaNhieuHo(ds, diaChiKhuDat);
  const thieuQd = ds.filter(({ h }) => !h.vanBan?.qd_phe_duyet_so?.trim());
  const tenCq = `Chủ tịch Ủy ban nhân dân ${tenXa}`;
  return {
    so_ho_chu: soChu(ds.length).toLowerCase(),
    so_ho: String(ds.length).padStart(2, "0"),
    bang_thua: bang.rows,
    bang_thua_tong: soM2(bang.tong),
    ds_qd_pa: ds.map(({ h }) => ({
      so: h.vanBan?.qd_phe_duyet_so || "…/QĐ-UBND",
      ngay: h.vanBan?.qd_phe_duyet_ngay || "…",
      ho_ten: h.ten,
      goi: DOI_TUONG_GOI[h.loai],
      co_quan: tenCq,
    })),
    so_ho_thieu_qd_pa: thieuQd.length,
    ds_tb_gui_tien: ds.filter(({ h }) => h.vanBan?.tb_gui_tien_so?.trim()).map(({ h }) => ({ so: h.vanBan!.tb_gui_tien_so, ngay: h.vanBan!.tb_gui_tien_ngay || "…", ho_ten: h.ten, goi: DOI_TUONG_GOI[h.loai] })),
    ds_loai_ten: [...new Set(ds.flatMap(({ h }) => h.thua.filter((t) => soD(t.dienTichThuHoi).gt(0)).map((t) => t.loaiDat.trim().toUpperCase())))].sort().map(tenDayDu).join("; "),
    ten_du_an_tt: duAn.ten,
  };
}

/** Kế hoạch thu hồi đất sinh từ lịch dự kiến (DuAn.keHoach — "Lập kế hoạch" ở màn Dự án). */
export function duLieuKeHoach(duAn: DuAn): Record<string, unknown> {
  const kh = duAn.keHoach ?? {};
  const out: Record<string, unknown> = {};
  for (const b of CAC_BUOC) out[`kh_b${b.ma}`] = ngayVn(kh[b.ma]);
  out.ds_moc = CAC_BUOC.filter((b) => kh[b.ma]).map((b, i) => ({ stt: i + 1, buoc: b.ma, ten: b.ten, ngay: ngayVn(kh[b.ma]), can_cu: b.canCu }));
  out.so_moc = (out.ds_moc as unknown[]).length;
  return out;
}

/** Mẫu có biểu kèm theo dòng "(Kèm theo … số …)" — dòng này dùng chung trường {so} của văn bản. */
const MAU_CO_BIEU = new Set(["T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11"]);

const soTu = (s: unknown) => (typeof s === "string" && /^[\d.]+(,\d+)?$/.test(s.trim()) ? D(s.trim().replace(/\./g, "").replace(",", ".")) : null);

/**
 * Kiểm tra thống nhất khi soạn (docs/19 §5.4): tên cơ quan ban hành (UBND phường/xã, không còn "UBND thành phố/huyện"),
 * số văn bản trong dòng "(Kèm theo …)", tổng bằng số khớp bằng chữ, diện tích trong trích yếu khớp tổng biểu, số QĐ phê
 * duyệt phương án của từng hộ. Trả về danh sách cảnh báo (không chặn tạo văn bản — bản dự thảo).
 */
export function kiemTraThongNhat(ma: string, duAn: DuAn, du: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (!/^(Xã|Phường|Đặc khu) /.test(duAn.xa)) out.push(`Tên đơn vị hành chính của dự án "${duAn.xa}" không bắt đầu bằng "Xã"/"Phường"/"Đặc khu" — cơ quan ban hành phải là UBND cấp xã (chính quyền 2 cấp).`);
  const cu = /(UBND|Ủy ban nhân dân|Uỷ ban nhân dân|Chủ tịch UBND|Chủ tịch Ủy ban nhân dân)\s+(thành phố|huyện|thị xã)[^;,.\n]*/i;
  const daBao = new Set<string>();
  const quet = (v: unknown, khoa: string) => {
    if (typeof v === "string") {
      const m = cu.exec(v);
      if (m && !daBao.has(m[0])) {
        daBao.add(m[0]);
        out.push(`Trường "${khoa}" còn ghi "${m[0].trim()}" — kiểm tra lại cơ quan (từ 01/7/2025 là UBND/Chủ tịch UBND cấp xã; căn cứ là văn bản cũ của cấp huyện thì giữ nguyên).`);
      }
    } else if (Array.isArray(v)) v.forEach((x) => (x && typeof x === "object" ? Object.entries(x).forEach(([k, y]) => quet(y, `${khoa}.${k}`)) : quet(x, khoa)));
  };
  for (const [k, v] of Object.entries(du)) if (!k.startsWith("ds_thua") && k !== "bang_thua") quet(v, k);
  // 1.0.5: căn cứ dẫn văn bản đã được sửa đổi mà chưa dẫn văn bản sửa đổi
  if (Array.isArray(du.can_cu)) {
    const nam = String(du.nam ?? ""), thang = String(du.thang ?? ""), ngay = String(du.ngay ?? "");
    const iso = /^\d{4}$/.test(nam) && thang && ngay ? `${nam}-${thang.padStart(2, "0")}-${ngay.padStart(2, "0")}` : undefined;
    out.push(...canhBaoCanCu(du.can_cu as string[], iso));
  }
  if (MAU_CO_BIEU.has(ma) && !String(du.so ?? "").trim()) out.push("Chưa nhập số văn bản: dòng \"(Kèm theo … số …)\" của biểu kèm theo sẽ để trống cùng chỗ số văn bản — văn thư ghi tay cả hai chỗ khi ký.");
  for (const [k, v] of Object.entries(du)) {
    if (!k.endsWith("_chu") || typeof v !== "string" || !v.endsWith("đồng")) continue;
    const so = soTu(du[k.slice(0, -4)]);
    if (so && docSoTien(so.toFixed(0)) !== v) out.push(`Số tiền "${k.slice(0, -4)}" (${String(du[k.slice(0, -4)])}) không khớp bằng chữ "${v}".`);
  }
  const bangs: [string, string, string][] = [["bang_thua", "dien_tich", "bang_thua_tong"], ["ds_thua_thu_hoi", "dt_thu_hoi", "tong_dt_thu_hoi"]];
  for (const [bang, cot, tongK] of bangs) {
    const rows = du[bang];
    if (!Array.isArray(rows) || !rows.length) continue;
    const s = rows.reduce((a: Decimal, r) => a.plus(soTu((r as Record<string, unknown>)[cot]) ?? 0), D(0));
    const t = soTu(du[tongK]);
    if (t && !s.eq(t)) out.push(`Tổng diện tích biểu (${soM2(s)} m²) khác diện tích ghi trong văn bản (${String(du[tongK])} m²).`);
    if (bang === "bang_thua" && t && soTu(du.tong_dt_thu_hoi) && !t.eq(soTu(du.tong_dt_thu_hoi)!)) out.push(`Diện tích trong trích yếu (${String(du.tong_dt_thu_hoi)} m²) khác tổng biểu (${String(du[tongK])} m²).`);
  }
  if ((ma === "T6" || ma === "T7") && Number(du.so_ho_thieu_qd_pa) > 0) out.push(`${String(du.so_ho_thieu_qd_pa)} hộ chưa có số, ngày QĐ phê duyệt phương án (ghi khi tạo mẫu T5 có số, hoặc nhập ở hồ sơ hộ) — căn cứ in "…".`);
  if ((ma === "T4" || ma === "T5") && Number(du.pa_chua_du) > 0) out.push(`Hộ còn ${String(du.pa_chua_du)} khoản chưa đủ căn cứ/cần xác nhận — không cộng vào tổng kinh phí.`);
  if ((ma === "T10" || ma === "T11") && !Number(du.so_ho_cham)) out.push("Các hộ được chọn không có khoản chi trả chậm (hoặc đã xác nhận chậm do người có đất) — biểu trống.");
  if ((ma === "T10" || ma === "T11") && Number(du.so_ho_chua_xac_nhan) > 0) out.push(`${String(du.so_ho_chua_xac_nhan)} hộ chưa xác nhận nguyên nhân chậm (thẻ Chi trả) — xác nhận trước khi trình.`);
  if ((ma === "T10" || ma === "T11") && Number(du.so_ho_thieu_ty_le) > 0) out.push(`${String(du.so_ho_thieu_ty_le)} hộ thiếu tỷ lệ tiền chậm nộp cho giai đoạn chậm — nhập ở Cài đặt chung → Tiền chậm trả; khoản này ghi "Thiếu căn cứ", không cộng vào tổng.`);
  if ((ma === "T8" || ma === "T9") && !Number(du.so_ho_tdc)) out.push("Các hộ được chọn chưa có thông tin tái định cư (Hồ sơ hộ → Hỗ trợ → Tái định cư) — biểu dự kiến bố trí trống.");
  if ((ma === "T8" || ma === "T9") && !Number(du.so_lo)) out.push("Dự án chưa khai quỹ tái định cư (Tổng quan dự án → Quỹ tái định cư) — biểu lô đất, căn nhà trống.");
  if (ma === "T1" && !Number(du.so_moc)) out.push("Dự án chưa lập kế hoạch từng bước (Dự án → Lập kế hoạch): các mốc thời gian trong Kế hoạch để trống.");
  return out;
}

/**
 * 1.0.5 — Thông báo dự kiến phương án bố trí tái định cư (k1 Điều 111 LĐĐ 2024) và thông báo công bố phương án bố trí
 * TĐC đã phê duyệt (k2 Điều 111): địa điểm, quy mô quỹ đất, quỹ nhà TĐC; diện tích từng lô, căn; giá đất, giá nhà TĐC
 * (Quỹ tái định cư của dự án); dự kiến bố trí cho từng hộ được chọn (thẻ Hỗ trợ → Tái định cư). Không tự xếp lô.
 */
export function duLieuBoTriTdc(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Record<string, unknown> {
  const quy = quyCua(duAn);
  const loCua = new Map(quy.lo.map((l) => [l.id, l]));
  const hoCua = new Map(ds.map(({ h }) => [h.id, h]));
  const tien0 = (v?: string) => (v?.trim() && laSoMay(v.trim()) ? dinhDang(D(v.trim()), 0) : "");
  const khu = [...new Set(quy.lo.map((l) => l.khu.trim()).filter(Boolean))];
  const nhom = (loai: "DAT_O" | "NHA_O") => {
    const x = quy.lo.filter((l) => l.loai === loai);
    return x.length ? `${x.length} ${loai === "DAT_O" ? "lô đất ở" : "căn nhà ở"}, tổng diện tích ${soM2(x.reduce((s, l) => s.plus(soD(l.dienTich)), D(0)))} m²` : "";
  };
  const hoTdc = ds.filter(({ h }) => h.hoTro.taiDinhCu);
  return {
    tdc_khu: khu.join("; ") || "…………",
    tdc_quy_mo: [nhom("DAT_O"), nhom("NHA_O")].filter(Boolean).join("; ") || "…………",
    ds_lo: quy.lo.map((l, i) => {
      const h = l.giao ? hoCua.get(l.giao.hoId) : undefined;
      const duKien = ds.find(({ h: x }) => x.hoTro.taiDinhCu?.loId === l.id)?.h;
      return {
        stt: i + 1,
        khu: l.khu,
        so_lo: l.soLo,
        loai: l.loai === "DAT_O" ? "Đất ở" : "Nhà ở",
        dien_tich: soM2(soD(l.dienTich)),
        gia: tien0(l.gia),
        can_cu_gia: l.canCuGia ?? "",
        ghi_chu: h ? `Đã giao: ${h.ten}` : duKien ? `Dự kiến: ${duKien.ten}` : l.giuLai !== undefined ? "Tạm giữ" : "",
      };
    }),
    so_lo: quy.lo.length,
    ds_ho_tdc: hoTdc.map(({ h }, i) => {
      const t = h.hoTro.taiDinhCu!;
      const l = t.loId ? loCua.get(t.loId) : undefined;
      const sdd = t.hinhThuc === "DAT_O" ? tienSddTdc(t).tien : null;
      return {
        stt: i + 1,
        ho_ten: h.ten,
        dia_chi: h.diaChi,
        hinh_thuc: TEN_HINH_THUC_TDC[t.hinhThuc],
        vi_tri: l ? `${l.khu} – lô ${l.soLo}` : [t.khuTdc, t.viTriLo].filter(Boolean).join(" – ") || (t.hinhThuc === "TU_LO" || t.hinhThuc === "TAI_CHO" ? "" : "Chưa xác định"),
        dien_tich: t.dienTichGiao ? soM2(soD(t.dienTichGiao)) : l ? soM2(soD(l.dienTich)) : "",
        gia: tien0(t.donGia) || tien0(l?.gia),
        tien_sdd: sdd ? dinhDang(sdd, 0) : "",
        ghi_chu: t.ghiChu ?? "",
      };
    }),
    so_ho_tdc: hoTdc.length,
    so_ho_tdc_chu: soChu(hoTdc.length).toLowerCase(),
  };
}

/**
 * 1.0.5 — phương án chi trả bồi thường chậm (điểm b khoản 3 Điều 94 LĐĐ 2024): các hộ có khoản chi sau hạn 30 ngày
 * hoặc còn nợ quá hạn, trừ hộ được xác nhận chậm do người có đất. Tiền chậm trả = mức tiền chậm nộp theo Luật Quản lý
 * thuế do cán bộ nhập (Cài đặt chung → Tiền chậm trả); thiếu tỷ lệ → "Thiếu căn cứ", không cộng.
 */
export function duLieuChamTra(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[], tyLe: GiaiDoanTyLe[], denNgay: string): Record<string, unknown> {
  const dong = ds
    .map(({ h }) => ({ h, r: tinhChiTra(h, duAn.phuongAn ?? [], tyLe, denNgay) }))
    .filter(({ h, r }) => r.chamTra.length && h.chiTra?.nguyenNhanCham !== "DO_NGUOI_DAN");
  const tong = dong.reduce((s, x) => (x.r.tienChamTra ? s.plus(x.r.tienChamTra) : s), D(0));
  return {
    ds_cham_tra: dong.map(({ h, r }, i) => ({
      stt: i + 1,
      ho_ten: h.ten,
      dia_chi: h.diaChi,
      phai_tra: r.phaiTra ? dinhDang(r.phaiTra, 0) : "",
      han_chi: r.hanChi ? r.hanChi.split("-").reverse().join("/") : "",
      khoan: r.chamTra.map((c) => `${dinhDang(c.soTien, 0)} đ × ${c.soNgay} ngày${c.dotId ? ` (chi ngày ${c.ngay.split("-").reverse().join("/")})` : " (chưa chi)"}`).join("; "),
      dien_giai: r.chamTra.map((c) => c.dienGiai).filter(Boolean).join("; "),
      tien_cham: r.tienChamTra ? dinhDang(r.tienChamTra, 0) : "Thiếu căn cứ",
      nguyen_nhan: h.chiTra?.nguyenNhanCham === "DO_CO_QUAN" ? "Do cơ quan, đơn vị thực hiện bồi thường" : "Chưa xác nhận",
    })),
    so_ho_cham: dong.length,
    so_ho_cham_chu: soChu(dong.length).toLowerCase(),
    so_ho_chua_xac_nhan: dong.filter(({ h }) => h.chiTra?.nguyenNhanCham !== "DO_CO_QUAN").length,
    so_ho_thieu_ty_le: dong.filter(({ r }) => !r.tienChamTra).length,
    tong_cham_tra: dinhDang(tong, 0),
    tong_cham_tra_chu: docSoTien(tong.toFixed(0)),
    tinh_den_ngay: denNgay.split("-").reverse().join("/"),
    can_cu_ty_le: [...new Set(tyLe.map((g) => g.canCu).filter(Boolean))].join("; ") || "…………",
  };
}

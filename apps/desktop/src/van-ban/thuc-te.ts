/**
 * Dữ liệu tự điền cho các mẫu dựng theo bộ văn bản dự án thực tế (docs/19): Kế hoạch thu hồi đất, Tờ trình/Thông báo thu
 * hồi đất kèm danh sách, Tờ trình/QĐ phê duyệt phương án 01 hộ (11 mục), Tờ trình/QĐ thu hồi đất nhiều hộ; và bước kiểm tra
 * thống nhất trước khi tạo văn bản (docs/19 mục 5 điểm 4). Chỉ tổng hợp số liệu đã có trong hồ sơ — không tự đặt mức, căn cứ.
 */
import { canhBaoThamQuyen } from "./tham-quyen";
import { D, dinhDang } from "@gpmb/core";
import type Decimal from "decimal.js";
import { CAC_BUOC, TEN_HINH_THUC_TDC, type DuAn, type Ho } from "../mo-hinh";
import { tienSddTdc, type KetQuaHo } from "../tinh-ho";
import { docSoTien } from "./doc-so";
import { tenDayDu } from "./loai-dat";
import { laSoMay, soD } from "../so";
import { canBoTriLo, quyCua, tenLo, trangThaiLo } from "../quy-tdc";
import { tinhChiTra, type GiaiDoanTyLe } from "../chi-tra";
import { canhBaoCanCu } from "../van-ban-can-cu";
import { tinhThuong } from "../ban-giao";
import { NGAY_HL_ND155, TEN_DINH_CHI, TEN_KET_QUA_DON, type DonKhieuNai } from "../khieu-nai";
import { donChoMau } from "../ghi-nguoc-van-ban";

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
  {
    // 1.2.0 (E1): thẩm quyền theo QĐ 27/2026 — ngày ký ngoài thời gian hiệu lực
    const nam = String(du.nam ?? ""), thang = String(du.thang ?? ""), ngay = String(du.ngay ?? "");
    if (/^\d{4}$/.test(nam) && /^\d{1,2}$/.test(thang) && /^\d{1,2}$/.test(ngay)) out.push(...canhBaoThamQuyen(ma, `${nam}-${thang.padStart(2, "0")}-${ngay.padStart(2, "0")}`));
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
  if (ma === "T12" && du.doi_thoai_khong_can) out.push("Hộ không ghi ý kiến \"Không đồng ý\" ở bước 7 (Tiến độ) — đối thoại chỉ bắt buộc khi còn ý kiến không đồng ý (điểm a khoản 3 Điều 87).");
  if ((ma === "20" || ma === "21") && Number(du.thuong_thieu_khai_bao) > 0) out.push(`${String(du.thuong_thieu_khai_bao)} hộ đã bàn giao nhưng chưa tính được thưởng: dự án chưa khai báo đủ mốc, tỷ lệ, cơ sở, căn cứ thưởng (Thông tin dự án → Thưởng bàn giao trước hạn — Điều 15 Phụ lục II QĐ 106/2025).`);
  if ((ma === "20" || ma === "21") && !(Array.isArray(du.ds_thuong) && du.ds_thuong.length)) out.push("Không có hộ đã bàn giao mặt bằng được thưởng trong các hộ được chọn — danh sách để trống.");
  else if ((ma === "20" || ma === "21") && Number(du.thuong_chua_ban_giao) > 0) out.push(`${String(du.thuong_chua_ban_giao)} hộ được chọn chưa ghi bàn giao mặt bằng — không có trong danh sách thưởng.`);
  if ((ma === "R1" || ma === "R2") && du.co_phap_ly && Number(du.so_thua_chua_phap_ly) > 0) out.push(`${String(du.so_thua_chua_phap_ly)} thửa có diện tích thu hồi chưa ghi tình trạng pháp lý nguồn gốc đất (Hồ sơ hộ → Thửa đất) — mục "Phân theo tình trạng pháp lý" có dòng "Chưa ghi".`);
  if (ma === "T13" && !du.boc_tham_chon) out.push("Dự án chưa chọn giao lô bằng hình thức bốc thăm (Tổng quan dự án → Quỹ tái định cư) — kiểm tra lại hình thức giao lô theo phương án bố trí TĐC được duyệt.");
  if (ma === "T13" && !Number(du.so_ho_boc)) out.push("Các hộ được chọn không có hộ cần bố trí lô đất ở/căn nhà ở (Hồ sơ hộ → Hỗ trợ → Tái định cư) — Biểu 02 trống.");
  if (ma === "T13" && Number(du.so_ho_boc) > 0 && Number(du.so_lo_boc) < Number(du.so_ho_boc)) out.push(`Số lô, căn đưa vào bốc thăm (${String(du.so_lo_boc)}) ít hơn số hộ cần bố trí (${String(du.so_ho_boc)}).`);
  if (ma === "T13" && Number(du.so_ho_boc) > 0 && Number(du.boc_tham_thieu_kq) > 0) out.push(du.boc_tham_bien_ban ? `${String(du.boc_tham_thieu_kq)} hộ chưa có trong kết quả bốc thăm đã ghi nhận (${String(du.boc_tham_bien_ban)}) — cột thứ tự, lô để trống.` : "Chưa ghi nhận kết quả bốc thăm cho các hộ được chọn — cột thứ tự, lô bốc được để trống, ghi tay tại buổi bốc thăm rồi ghi nhận lại ở Quỹ tái định cư.");
  if (ma === "T14" && du.kn_khong_co_don) out.push("Hộ chưa có đơn khiếu nại lần đầu (Hồ sơ hộ → thẻ Khiếu nại) — nội dung đơn để trống.");
  else if (ma === "T14" && Number(du.kn_so_don) > 1) out.push(`Hộ có ${String(du.kn_so_don)} đơn khiếu nại lần đầu — mẫu lấy đơn nhận ngày ${String(du.kn_ngay_don_ngan)}; đơn khác soạn riêng, sửa nội dung ở ô nhập thêm.`);
  if (ma === "T14" && !du.kn_khong_co_don && !du.kn_da_thu_ly) out.push("Đơn chưa ghi ngày thụ lý — kiểm tra việc thụ lý (k1 Điều 16 NĐ 124/2020/NĐ-CP) trước khi ban hành quyết định giải quyết.");
  if (/^T(1[89]|2[0-2])$/.test(ma) && du.kn_khong_co_don_kn) out.push("Hộ chưa có đơn khiếu nại (Hồ sơ hộ → thẻ Khiếu nại) — nội dung đơn để trống.");
  if (ma === "T19" && !du.kn_khong_co_don_kn && !String(du.kn_ly_do_khong_thu_ly ?? "").trim()) out.push("Chưa ghi lý do không thụ lý (Điều 11 Luật Khiếu nại) — chọn kết quả \"Không thụ lý\" ở đơn và ghi lý do, hoặc nhập ở ô nhập thêm.");
  if (ma === "T21" && !du.kn_khong_co_don_kn && !du.kn_co_tdc && du.kn_loai_dinh_chi === "tạm đình chỉ") out.push("Đơn chưa ghi tạm đình chỉ (thẻ Khiếu nại → \"+ Tạm đình chỉ\") và chưa có kết quả đình chỉ — lý do để trống.");
  if (ma === "T22" && !du.kn_co_tdc) out.push("Đơn chưa ghi tạm đình chỉ — không có căn cứ ban hành quyết định tiếp tục giải quyết.");
  if (ma === "T24" && du.kn_tb_doi_thoai_thieu) out.push("Đơn chưa ghi ngày tổ chức đối thoại (thẻ Khiếu nại) — thời gian để trống; thông báo phải gửi trước ngày đối thoại ít nhất 05 ngày (khoản 1 Điều 28 NĐ 124/2020 sửa bởi NĐ 155/2026).");
  if ((ma === "T27" || ma === "T28") && du.cc_khong_co) out.push("Hộ chưa có hồ sơ cưỡng chế thu hồi đất (thẻ Khiếu nại → + Cưỡng chế thu hồi đất) — số, ngày quyết định để trống.");
  if (ma === "T27" && du.cc_khong_co !== true && !String(du.cc_qd_ban ?? "").trim()) out.push("Chưa ghi quyết định thành lập Ban cưỡng chế thu hồi đất (điểm a khoản 4 Điều 89 Luật Đất đai) ở hồ sơ cưỡng chế.");
  if (ma === "T26" && /^…/.test(String(du.trach_nhiem_nguoi_co_dat ?? ""))) out.push("Chưa ghi trách nhiệm của người có đất thu hồi (khoản 2 Điều 2 — ghi chú 11 Mẫu 44 NĐ 151/2025).");
  if (ma === "T26" && (du.ds_ho_pa as { ghi_chu: string }[] | undefined)?.some((x) => x.ghi_chu)) out.push("Có hộ còn khoản chưa đủ căn cứ — số tiền trong biểu chỉ gồm khoản Tạm tính; nên chốt phương án trước khi trình ký.");
  if (ma === "T25" && du.kn2_khong_co_don) out.push("Hộ chưa có đơn khiếu nại lần hai (thẻ Khiếu nại → Lần giải quyết: Lần hai) — nội dung đơn để trống.");
  if (ma === "T25" && du.kn2_khong_co_lan_dau) out.push("Chưa có đơn lần đầu đã ghi kết quả — mục II (kết quả giải quyết lần đầu) để trống, cán bộ ghi.");
  if (ma === "T25" && !/01 năm|một năm/.test(String(du.kn2_thoi_han_khoi_kien ?? ""))) out.push("Thời hạn khởi kiện ở Điều 3 khác \"01 năm\" — thời hiệu khởi kiện quyết định giải quyết khiếu nại là 01 năm (điểm a khoản 3 Điều 116 Luật Tố tụng hành chính); kiểm tra lại.");
  if (/^T1[5-7]$/.test(ma) && du.cc_khong_co) out.push("Hộ chưa có hồ sơ cưỡng chế thu hồi đất (Hồ sơ hộ → thẻ Khiếu nại → Cưỡng chế) — thời gian vận động, số QĐ cưỡng chế để trống.");
  if ((ma === "T16" || ma === "T17") && !du.cc_khong_co && !String(du.cc_so_qd ?? "").trim()) out.push("Chưa ghi số quyết định cưỡng chế thực hiện quyết định thu hồi đất ở hồ sơ cưỡng chế của hộ.");
  if (ma === "T16" && !(Array.isArray(du.thanh_vien_ban) && du.thanh_vien_ban.length)) out.push("Chưa nhập thành viên Ban cưỡng chế (điểm a khoản 4 Điều 89 Luật Đất đai 2024).");
  if (ma === "T17" && !(Array.isArray(du.ds_du_toan) && du.ds_du_toan.length)) out.push("Chưa nhập dự toán kinh phí cưỡng chế — bảng dự toán trống.");
  if (ma === "T17" && Number(du.du_toan_loi) > 0) out.push(`${String(du.du_toan_loi)} dòng dự toán không đọc được số tiền (dạng: nội dung | số tiền) — không cộng vào tổng.`);
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
 * 1.0.7 — Biên bản bốc thăm lô TĐC (T13): lô, căn còn trống đưa vào bốc thăm (bỏ tạm giữ, đã giao ngoài lần bốc thăm này)
 * và hộ được chọn cần bố trí lô. Có lần bốc thăm đã ghi nhận gồm hộ được chọn (lần gần nhất) → điền thứ tự, lô bốc được;
 * không thì để trống cột để ghi tay tại buổi bốc thăm. Không tự xếp lô.
 */
export function duLieuBocTham(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Record<string, unknown> {
  const quy = quyCua(duAn);
  const hoBoc = ds.filter(({ h }) => canBoTriLo(h)).map(({ h }) => h);
  const coHo = new Set(hoBoc.map((h) => h.id));
  const kq = [...(quy.ketQuaBocTham ?? [])].sort((a, b) => b.ngay.localeCompare(a.ngay) || b.luc.localeCompare(a.luc)).find((b) => b.ketQua.some((x) => coHo.has(x.hoId)));
  const loKq = new Set(kq?.ketQua.map((x) => x.loId));
  const loBoc = quy.lo.filter((l) => trangThaiLo(l) === "TRONG" || loKq.has(l.id));
  const loCua = new Map(quy.lo.map((l) => [l.id, l]));
  const tien0 = (v?: string) => (v?.trim() && laSoMay(v.trim()) ? dinhDang(D(v.trim()), 0) : "");
  const dongKq = new Map(kq?.ketQua.filter((x) => coHo.has(x.hoId)).map((x) => [x.hoId, x]));
  const thuTu = [...hoBoc].sort((a, b) => (dongKq.get(a.id)?.stt ?? Infinity) - (dongKq.get(b.id)?.stt ?? Infinity));
  const khu = [...new Set(loBoc.map((l) => l.khu.trim()).filter(Boolean))];
  return {
    ds_lo_boc: loBoc.map((l, i) => ({ stt: i + 1, khu: l.khu, so_lo: l.soLo, loai: l.loai === "DAT_O" ? "Đất ở" : "Nhà ở", dien_tich: l.dienTich.trim() ? soM2(soD(l.dienTich)) : "", gia: tien0(l.gia), can_cu_gia: l.canCuGia ?? "" })),
    ds_ket_qua_boc: thuTu.map((h, i) => {
      const x = dongKq.get(h.id);
      const l = x ? loCua.get(x.loId) : undefined;
      return { stt: i + 1, ho_ten: h.ten, dia_chi: h.diaChi, hinh_thuc: h.hoTro.taiDinhCu?.hinhThuc === "NHA_O" ? "Nhà ở" : "Đất ở", thu_tu: x ? String(x.stt) : "", lo: l ? tenLo(l) : "", dien_tich: l?.dienTich.trim() ? soM2(soD(l.dienTich)) : "" };
    }),
    so_ho_boc: hoBoc.length,
    so_ho_boc_chu: soChu(hoBoc.length).toLowerCase(),
    so_lo_boc: loBoc.length,
    tdc_khu_boc: khu.join("; ") || "…………",
    boc_tham_chon: !!quy.bocTham,
    boc_tham_bien_ban: kq?.bienBan ?? "",
    boc_tham_thieu_kq: kq ? thuTu.filter((h) => !dongKq.has(h.id)).length : hoBoc.length,
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

/**
 * 1.0.6 — Biên bản đối thoại (T12): lấy ý kiến không đồng ý, ngày lấy ý kiến và lần đối thoại gần nhất đã ghi ở bước 7
 * của hộ (doi-thoai.ts). Kết quả chỉ ghi theo câu chữ điểm a khoản 3 Điều 87; cán bộ sửa ở ô nhập thêm.
 */
export function duLieuDoiThoai(h: Ho): Record<string, unknown> {
  const y = h.yKienPA;
  const vn = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");
  const cuoi = [...(y?.doiThoai ?? [])].filter((d) => d.ngay).sort((a, b) => a.ngay.localeCompare(b.ngay)).pop();
  return {
    ngay_lay_y_kien: vn(y?.ngayLay),
    y_kien_khong_dong_y: y?.loai === "KHONG_DONG_Y" ? y.noiDung ?? "" : "",
    giai_trinh: cuoi?.noiDung ?? "",
    ket_qua_doi_thoai: !cuoi ? "" : cuoi.ketQua === "THONG_NHAT" ? "Sau khi được giải thích, giải trình, người có đất thống nhất với phương án bồi thường, hỗ trợ, tái định cư." : "Người có đất còn ý kiến không đồng ý về phương án. Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, hỗ trợ, tái định cư tiếp thu, giải trình ý kiến và hoàn chỉnh phương án trình cơ quan có thẩm quyền (điểm a khoản 3 Điều 87 Luật Đất đai năm 2024).",
    doi_thoai_khong_can: y?.loai !== "KHONG_DONG_Y",
  };
}

/**
 * 1.0.6 — Danh sách thưởng bàn giao mặt bằng sớm cho Mẫu 20, 21 (Điều 15 Phụ lục II QĐ 106/2025): hộ đã bàn giao, lấy số
 * thưởng đã lưu khi ghi bàn giao; chưa lưu thì tính lại theo mốc, cơ sở, căn cứ khai báo ở Thông tin dự án (ban-giao.ts).
 * Thiếu khai báo mốc, căn cứ → không đưa số vào, báo ở "Kiểm tra thống nhất".
 */
export function duLieuThuong(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Record<string, unknown> {
  const dong: { stt: number; ho_ten: string; dia_chi: string; ngay_ban_giao: string; muc_ho_tro: string }[] = [];
  let tong = D(0);
  let thieu = 0, chuaBanGiao = 0;
  for (const { h, k } of ds) {
    if (!h.banGiao?.ngay) {
      chuaBanGiao++;
      continue;
    }
    let soTien: Decimal | null = h.banGiao.thuong?.soTien && laSoMay(h.banGiao.thuong.soTien) ? D(h.banGiao.thuong.soTien) : null;
    if (!soTien) {
      const t = tinhThuong(duAn, h, k);
      if (t.loai === "THIEU_CAN_CU") thieu++;
      if (t.loai === "CO") soTien = t.soTien;
    }
    if (!soTien || soTien.lte(0)) continue;
    tong = tong.plus(soTien);
    dong.push({ stt: dong.length + 1, ho_ten: h.ten, dia_chi: h.diaChi, ngay_ban_giao: h.banGiao.ngay.split("-").reverse().join("/"), muc_ho_tro: dinhDang(soTien, 0) });
  }
  if (!dong.length) return { thuong_thieu_khai_bao: thieu, thuong_chua_ban_giao: chuaBanGiao };
  return { ds_thuong: dong, so_ho_thuong: String(dong.length), tong_tien_thuong: dinhDang(tong, 0), tong_tien_thuong_chu: docSoTien(tong.toFixed(0)), thuong_thieu_khai_bao: thieu, thuong_chua_ban_giao: chuaBanGiao };
}

/**
 * 1.0.21 (B2) — Dữ liệu cho T14 (QĐ giải quyết khiếu nại lần đầu) và T15–T17 (vận động, Ban cưỡng chế, phương án cưỡng chế)
 * từ thẻ Khiếu nại của hộ. T14 lấy đơn khiếu nại lần đầu chưa có kết quả mới nhất (không có thì đơn mới nhất); T15–T17 lấy hồ
 * sơ cưỡng chế thu hồi đất mới nhất. Chỉ chép dữ kiện đã ghi — kết luận, biện pháp do cán bộ ghi.
 */
export function duLieuKhieuNaiCuongChe(h: Ho, ngayKy: string, xa: string, ma = "T14"): Record<string, unknown> {
  const chu = (iso?: string) => (iso ? `ngày ${iso.slice(8, 10)} tháng ${iso.slice(5, 7)} năm ${iso.slice(0, 4)}` : "");
  const lan1 = (h.khieuNai ?? []).filter((d) => d.loai === "KHIEU_NAI" && (d.lan ?? 1) === 1);
  const don = donChoMau(h, "T14");
  const ky = ngayKy || new Date().toISOString().slice(0, 10);
  const kn_can_cu = [
    "Căn cứ Luật Khiếu nại ngày 11 tháng 11 năm 2011;",
    ...(ky >= NGAY_HL_ND155 ? ["Căn cứ Luật sửa đổi, bổ sung một số điều của Luật Tiếp công dân, Luật Khiếu nại, Luật Tố cáo ngày 10 tháng 12 năm 2025;"] : []),
    `Căn cứ Nghị định số 124/2020/NĐ-CP ngày 19 tháng 10 năm 2020 của Chính phủ quy định chi tiết một số điều và biện pháp thi hành Luật Khiếu nại${ky >= NGAY_HL_ND155 ? "; Nghị định số 155/2026/NĐ-CP ngày 15 tháng 5 năm 2026 của Chính phủ sửa đổi, bổ sung một số điều của Nghị định số 124/2020/NĐ-CP" : ""};`,
  ];
  // T18–T22: đơn khiếu nại (mọi lần) chưa có kết quả mới nhất, không có thì đơn mới nhất; T21 đình chỉ dùng cả đơn đã đình chỉ
  const dk = donChoMau(h, "T18");
  const tdc = [...(dk?.tamDinhChi ?? [])].sort((a, b) => a.tu.localeCompare(b.tu)).pop();
  const dinhChi = dk?.ketQua === "DINH_CHI" || dk?.ketQua === "RUT";
  const tb = dk?.tbThuLy?.so ? `Thông báo thụ lý giải quyết khiếu nại số ${dk.tbThuLy.so}${dk.tbThuLy.ngay ? ` ngày ${ngayVn(dk.tbThuLy.ngay)}` : ""} của Ủy ban nhân dân ${xa.charAt(0).toLowerCase()}${xa.slice(1)}` : "Thông báo thụ lý giải quyết khiếu nại số ………… ngày …………";
  const canCuKn = [
    "Căn cứ Luật Khiếu nại ngày 11 tháng 11 năm 2011; Luật sửa đổi, bổ sung một số điều của Luật Tiếp công dân, Luật Khiếu nại, Luật Tố cáo ngày 10 tháng 12 năm 2025;",
    "Căn cứ Nghị định số 124/2020/NĐ-CP ngày 19 tháng 10 năm 2020 của Chính phủ quy định chi tiết một số điều và biện pháp thi hành Luật Khiếu nại; Nghị định số 155/2026/NĐ-CP ngày 15 tháng 5 năm 2026 của Chính phủ sửa đổi, bổ sung một số điều của Nghị định số 124/2020/NĐ-CP;",
  ];
  const vang = dk?.vangDoiThoai;
  const knThem = {
    kn_lan_chu: (dk?.lan ?? 1) === 2 ? "lần hai" : "lần đầu",
    kn_ngay_nhan_ngan: ngayVn(dk?.ngayNhan),
    kn_khong_co_don_kn: !dk,
    kn_tdc_dang: !!tdc && !tdc.den,
    kn_co_tdc: !!tdc,
    kn_vang_doi_thoai: vang ? `(Người khiếu nại vắng mặt ngày ${ngayVn(vang.ngay)} — ${vang.coLyDo ? "có lý do chính đáng" : "không có lý do chính đáng; người giải quyết khiếu nại vẫn tiếp tục giải quyết khiếu nại theo khoản 6 Điều 30 Luật Khiếu nại"})` : "",
    ...(dk?.lyDoKhongThuLy ? { kn_ly_do_khong_thu_ly: dk.lyDoKhongThuLy } : {}),
    kn_loai_dinh_chi: dinhChi ? "đình chỉ" : "tạm đình chỉ",
    kn_can_cu_dinh_chi: [...canCuKn, dinhChi ? "Căn cứ khoản 2 Điều 11a Luật Khiếu nại; Điều 28b Nghị định số 124/2020/NĐ-CP được bổ sung bởi Nghị định số 155/2026/NĐ-CP;" : "Căn cứ khoản 1 Điều 11a Luật Khiếu nại; Điều 28a, Điều 28b Nghị định số 124/2020/NĐ-CP được bổ sung bởi Nghị định số 155/2026/NĐ-CP;"],
    kn_can_cu_tiep_tuc: [...canCuKn, `Căn cứ khoản 4 Điều 11a Luật Khiếu nại; khoản 2 Điều 28b Nghị định số 124/2020/NĐ-CP được bổ sung bởi Nghị định số 155/2026/NĐ-CP;${tdc?.soQd ? ` Quyết định tạm đình chỉ giải quyết khiếu nại số ${tdc.soQd} ngày ${ngayVn(tdc.tu)};` : ""}`],
    kn_dieu_1_dinh_chi: `${dinhChi ? "Đình chỉ" : "Tạm đình chỉ"} giải quyết vụ việc khiếu nại của ${h.ten} theo ${tb}.`,
    kn_ly_do_dinh_chi: dinhChi ? (dk?.ketQua === "RUT" ? TEN_DINH_CHI.a : dk?.dinhChi ? TEN_DINH_CHI[dk.dinhChi.truongHop] : "…………") : tdc ? `${(tdc.lyDo || "…………").replace(/[.;]$/, "")}; thuộc trường hợp quy định tại điểm ${tdc.truongHop} khoản 1 Điều 11a Luật Khiếu nại (${tdc.truongHop === "a" ? "sự kiện bất khả kháng, trở ngại khách quan" : "cần chờ kết quả giải quyết của cơ quan, tổ chức, cá nhân có thẩm quyền về vấn đề có liên quan trực tiếp"}).` : "…………",
    kn_dieu_1_tiep_tuc: `Tiếp tục giải quyết vụ việc khiếu nại của ${h.ten} theo ${tb}. Thời hạn giải quyết khiếu nại tiếp tục được tính từ ngày ban hành Quyết định này (khoản 2 Điều 28b Nghị định số 124/2020/NĐ-CP được bổ sung bởi Nghị định số 155/2026/NĐ-CP).`,
    kn_thi_hanh_dinh_chi: `Chánh Văn phòng Hội đồng nhân dân và Ủy ban nhân dân, ${h.ten} và các cơ quan, tổ chức, cá nhân có liên quan`,
  };
  const cc = (h.cuongChe ?? []).filter((c) => c.loai === "THU_HOI").sort((a, b) => (a.ngayQd ?? a.vanDongTu ?? "").localeCompare(b.ngayQd ?? b.vanDongTu ?? "")).pop();
  return {
    kn_nguoi_khieu_nai: h.ten,
    ...knThem,
    CHUC_DANH_GQKN: `CHỦ TỊCH ỦY BAN NHÂN DÂN ${xa.toUpperCase()}`,
    chuc_danh_gqkn: `Chủ tịch Ủy ban nhân dân ${xa.charAt(0).toLowerCase()}${xa.slice(1)}`,
    kn_can_cu,
    kn_khong_co_don: !don,
    kn_so_don: lan1.length,
    kn_da_thu_ly: !!don?.ngayThuLy,
    kn_ngay_don: chu(don?.ngayNhan),
    kn_ngay_don_ngan: ngayVn(don?.ngayNhan),
    kn_doi_tuong: don?.doiTuong ?? "",
    kn_noi_dung: don?.noiDung ?? "",
    kn_so_ngay_lan_hai: don?.vungKhoKhan ? "45" : "30",
    // k2 Điều 21 Luật Khiếu nại sửa bởi k8 Điều 2 Luật 136/2025: Chủ tịch UBND cấp tỉnh giải quyết lần hai QĐ, hành vi của Chủ tịch UBND cấp xã
    kn_nguoi_gq_lan_hai: ky >= NGAY_HL_ND155 ? "Chủ tịch Ủy ban nhân dân tỉnh" : undefined,
    cc_khong_co: !cc,
    cc_van_dong_tu: ngayVn(cc?.vanDongTu),
    cc_van_dong_den: ngayVn(cc?.vanDongDen),
    cc_so_qd: cc?.soQd ?? "",
    cc_ngay_qd: ngayVn(cc?.ngayQd),
    cc_ngay_du_kien: ngayVn(cc?.ngayDuKien),
    cc_qd_ban: cc?.qdBan ?? "",
    // 1.2.0 (B3): T27 — kết quả theo hồ sơ cưỡng chế (điểm b khoản 4 Điều 89)
    ket_qua_cc_chu: cc?.ketQua === "CHAP_HANH" ? `Người bị cưỡng chế chấp hành${cc.ngayKetQua ? ` (ngày ${ngayVn(cc.ngayKetQua)})` : ""}; Ban cưỡng chế lập biên bản ghi nhận sự chấp hành.` : cc?.ketQua === "DA_CUONG_CHE" ? `Người bị cưỡng chế không chấp hành; Ban cưỡng chế tổ chức thực hiện cưỡng chế${cc.ngayKetQua ? ` ngày ${ngayVn(cc.ngayKetQua)}` : ""}.` : "…………",
    ...(ma !== "T14" && ma !== "T25" && dk ? { kn_noi_dung: dk.noiDung } : {}),
    ...(ma === "T24" ? duLieuThongBaoDoiThoai(h, dk) : {}),
    ...(ma === "T25" ? duLieuLanHai(h, chu) : {}),
  };
}

/** Dự toán kinh phí cưỡng chế (T17): mỗi dòng "nội dung | số tiền" do cán bộ nhập; cộng bằng Decimal. */
export function docDuToan(chu: string): { ds_du_toan: { stt: number; noi_dung: string; so_tien: string }[]; tong_du_toan: string; tong_du_toan_chu: string; du_toan_loi: number } {
  const ds: { stt: number; noi_dung: string; so_tien: string }[] = [];
  let tong = D(0);
  let loi = 0;
  for (const dong of chu.split("\n").map((x) => x.trim()).filter(Boolean)) {
    const i = Math.max(dong.lastIndexOf("|"), dong.lastIndexOf("\t"));
    const nd = (i >= 0 ? dong.slice(0, i) : dong).trim();
    const so = i >= 0 ? dong.slice(i + 1).replace(/[.\s]/g, "").replace(",", ".") : "";
    if (!/^\d+(\.\d+)?$/.test(so)) {
      loi++;
      ds.push({ stt: ds.length + 1, noi_dung: nd, so_tien: "" });
      continue;
    }
    tong = tong.plus(so);
    ds.push({ stt: ds.length + 1, noi_dung: nd, so_tien: tien(D(so)) });
  }
  return { ds_du_toan: ds, tong_du_toan: tien(tong), tong_du_toan_chu: docSoTien(tong.toFixed(0)), du_toan_loi: loi };
}

/** 1.0.21 (B1): mẫu 07 / 22 — thời gian bắt đầu cưỡng chế = ngày dự kiến ở hồ sơ cưỡng chế (KIEM_DEM / THU_HOI) mới nhất của hộ. */
export function duLieuCuongCheMau(h: Ho, ma: string): Record<string, unknown> {
  const c = [...(h.cuongChe ?? [])].reverse().find((x) => x.loai === (ma === "07" ? "KIEM_DEM" : "THU_HOI"));
  if (!c?.ngayDuKien) return {};
  return ma === "07" ? { tg_tu: ngayVn(c.ngayDuKien) } : { tg_cuong_che_tu: ngayVn(c.ngayDuKien) };
}

/** 1.1.0 (A2): T24 — thời gian, địa điểm đối thoại đã ghi ở đơn (k1 Điều 28 NĐ 124 sửa bởi NĐ 155). */
function duLieuThongBaoDoiThoai(h: Ho, dk: DonKhieuNai | undefined): Record<string, unknown> {
  const dt = dk?.doiThoai;
  return {
    kn_nguoi_nhan_tb: h.ten,
    ...(dt?.ngay ? { dt_thoi_gian: `ngày ${ngayVn(dt.ngay)}` } : {}),
    ...(dt?.diaDiem ? { dt_dia_diem: dt.diaDiem } : {}),
    kn_tb_doi_thoai_thieu: !dt?.ngay,
  };
}

/**
 * 1.1.0 (A3): T25 — QĐ giải quyết khiếu nại lần hai (Mẫu 16 NĐ 124/2020): đơn lần hai mới nhất; mục II lấy kết quả đơn lần đầu
 * đã ghi. Người giải quyết lần hai mặc định Chủ tịch UBND tỉnh (khoản 2 Điều 21 Luật Khiếu nại sửa bởi Luật 136/2025 — trường hợp
 * người giải quyết lần đầu là Chủ tịch UBND cấp xã); thời hạn khởi kiện mặc định 01 năm (điểm a k3 Điều 116 Luật Tố tụng hành chính).
 */
function duLieuLanHai(h: Ho, chu: (iso?: string) => string): Record<string, unknown> {
  const d2 = donChoMau(h, "T25");
  const d1 = (h.khieuNai ?? []).filter((d) => d.loai === "KHIEU_NAI" && (d.lan ?? 1) === 1 && d.ketQua).sort((a, b) => a.ngayNhan.localeCompare(b.ngayNhan)).pop();
  return {
    kn2_khong_co_don: !d2,
    kn_ngay_don: chu(d2?.ngayNhan),
    kn_doi_tuong: d2?.doiTuong ?? "",
    kn_noi_dung: d2?.noiDung ?? "",
    kn_kq_lan_dau: d1 ? `${d1.soVb ? `Quyết định số ${d1.soVb}${d1.ngayVb ? ` ngày ${ngayVn(d1.ngayVb)}` : ""}` : "Quyết định giải quyết khiếu nại lần đầu"}: ${(TEN_KET_QUA_DON[d1.ketQua!] ?? d1.ketQua!).toLowerCase()}.` : "",
    kn2_khong_co_lan_dau: !d1,
    KN2_CO_QUAN: "ỦY BAN NHÂN DÂN TỈNH SƠN LA",
    kn2_co_quan_cap_tren: "",
    KN2_CHUC_DANH: "CHỦ TỊCH ỦY BAN NHÂN DÂN TỈNH SƠN LA",
    kn2_co_quan: "Chủ tịch Ủy ban nhân dân tỉnh Sơn La",
    kn2_ky_hieu: "UBND",
    // 1.2.0 (A1): thời hiệu khởi kiện 01 năm kể từ ngày nhận được hoặc biết được QĐ giải quyết khiếu nại lần hai
    // (điểm a khoản 3 Điều 116 Luật Tố tụng hành chính — VBHN 109/VBHN-VPQH ngày 27/8/2025); cán bộ sửa được
    kn2_thoi_han_khoi_kien: "01 năm",
  };
}

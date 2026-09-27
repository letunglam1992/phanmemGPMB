/**
 * Dựng dữ liệu điền mẫu từ dự án, hồ sơ và kết quả tính. Các giá trị trống được thay bằng
 * dấu chấm "…………" để cán bộ viết tay/bổ sung.
 */
import { D, dinhDang } from "@gpmb/core";
import type Decimal from "decimal.js";
import { TEN_DOI_TUONG, type DuAn, type Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { docSoTien } from "./doc-so";
import type { MauVanBan } from "./danh-muc";
import { tenLoaiDat } from "./loai-dat";

export const CHAM = "…………";

/** Căn cứ mặc định: trích nguyên văn phần căn cứ của QĐ 14/2026/QĐ-UBND và các văn bản đã có trong bộ tài liệu. */
export const CAN_CU_MAC_DINH = [
  "Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15;",
  "Căn cứ Luật Đất đai số 31/2024/QH15 được sửa đổi, bổ sung một số điều bởi các Luật số 43/2024/QH15, số 47/2024/QH15, số 58/2024/QH15, số 71/2025/QH15, số 84/2025/QH15, số 93/2025/QH15, số 95/2025/QH15, số 146/2025/QH15 và số 147/2025/QH15;",
  "Căn cứ Nghị quyết số 254/2025/QH15 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;",
  "Căn cứ Nghị định số 88/2024/NĐ-CP ngày 15 tháng 7 năm 2024 của Chính phủ quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất;",
  "Căn cứ Quyết định số 106/2025/QĐ-UBND ngày 06 tháng 10 năm 2025 của Ủy ban nhân dân tỉnh Sơn La;",
  "Căn cứ Quyết định số 14/2026/QĐ-UBND ngày 31 tháng 3 năm 2026 của Ủy ban nhân dân tỉnh Sơn La;",
];

/** Thông tin chung mặc định của dự án cho văn bản (người dùng sửa ở màn Văn bản, lưu vào DuAn.vanBan). */
export function thongTinChungMacDinh(duAn: DuAn): Record<string, string> {
  return {
    co_quan_cap_tren_bt: "ỦY BAN NHÂN DÂN TỈNH SƠN LA",
    ten_don_vi_bt: "",
    ky_hieu_don_vi: "",
    ten_phong: "Phòng Kinh tế",
    ky_hieu_phong: "KT",
    co_quan_tham_dinh: "",
    co_quan_dang_tai: `Văn phòng HĐND và UBND ${duAn.xa.replace(/^(Xã|Phường) /, (m) => m.toLowerCase())}`,
    can_cu_du_an: duAn.canCuThuHoi ? `Căn cứ ${duAn.canCuThuHoi};` : "",
    can_cu_chung: CAN_CU_MAC_DINH.join("\n"),
    ly_do_thu_hoi: "",
    dia_diem_du_an: duAn.xa,
    ban_khu_dan_cu: "",
    quyen_han: "CHỦ TỊCH",
    nguoi_ky: "",
    quyen_han_phong: "TRƯỞNG PHÒNG",
    nguoi_ky_phong: "",
    quyen_han_don_vi: "GIÁM ĐỐC",
    nguoi_ky_don_vi: "",
    tp_ubnd: "- Ông/bà: …………………… Chức vụ: ……………………\n- Ông/bà: …………………… Chức vụ: ……………………",
    tp_mttq: "- Ông/bà: …………………… Chức vụ: ……………………",
    tp_don_vi_bt: "- Ông/bà: …………………… Chức vụ: ……………………",
    tp_ban: "- Ông/bà: …………………… Chức vụ: ……………………",
    tp_chu_dau_tu: "- Ông/bà: …………………… Chức vụ: ……………………",
    tp_khac: "- Ông/bà: …………………… Chức vụ: ……………………",
    // Dùng cho mẫu riêng của xã
    pham_vi_dot: "",
    tt_don_vi_so: "",
    tt_don_vi_ngay: "",
    chuc_danh_de_nghi: "",
    can_bo_tham_dinh: "",
    ket_luan_tham_dinh: "Đủ điều kiện thu hồi đất để thực hiện dự án.",
    co_quan_chinh_ly: "",
    dia_diem_niem_yet_qd: "",
  };
}

const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const ngayChu = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const tien = (d: Decimal | null | undefined) => (d ? dinhDang(d.toDecimalPlaces(0), 0) : "");
const soM2 = (v: string | number | Decimal) => dinhDang(D(v || 0), 2);

function moTaThua(h: Ho): string {
  return h.thua
    .filter((t) => Number(t.dienTichThuHoi) > 0)
    .map((t) => `thửa đất số ${t.soThua} (${D(t.dienTichThuHoi).gte(D(t.dienTich || 0)) ? "toàn bộ" : "một phần"} thửa đất), tờ bản đồ số ${t.soTo}`)
    .join("; ");
}

export function duLieuHo(h: Ho, k: KetQuaHo): Record<string, unknown> {
  const dt = h.thua.reduce((s, t) => s.plus(t.dienTichThuHoi || 0), D(0));
  const thuaTheoId = new Map(h.thua.map((t) => [t.id, t]));
  return {
    ho_ten: h.ten,
    loai_doi_tuong: TEN_DOI_TUONG[h.loai],
    loai_doi_tuong_thuong: lower1(TEN_DOI_TUONG[h.loai]),
    dia_chi: h.diaChi,
    so_dinh_danh: h.soDinhDanh,
    dien_thoai: h.dienThoai,
    dt_thu_hoi: soM2(dt),
    dt_thu_hoi_tong: soM2(dt),
    thua_mo_ta: moTaThua(h),
    nguon_goc: [...new Set(h.thua.map((t) => t.nguonGoc).filter(Boolean))].join("; "),
    thua: h.thua.map((t, i) => ({
      stt: i + 1,
      so_to: t.soTo,
      so_thua: t.soThua,
      loai_dat: t.loaiDat,
      dien_tich: soM2(t.dienTich),
      dt_thu_hoi: soM2(t.dienTichThuHoi),
      pham_vi: D(t.dienTichThuHoi || 0).gte(D(t.dienTich || 0)) ? "Thu hồi toàn bộ" : "Thu hồi một phần",
    })),
    tai_san: h.taiSan.map((x, i) => {
      const t = thuaTheoId.get(x.thuaId);
      const kl = x.loai === "CAY" ? x.soLuong : x.khoiLuong;
      return {
        stt: i + 1,
        ten: x.ten,
        dvt: x.loai === "VAT_NUOI" ? "tấn/kg" : x.donVi,
        khoi_luong: kl.replace(/^=/, ""),
        thua: t ? `${t.soThua}/${t.soTo}` : "",
        dot: x.dot,
      };
    }),
    tong_tien: tien(k.tong.tongLamTron),
    tong_tien_chu: docSoTien(k.tong.tongLamTron.toFixed(0)),
    khau_tru: tien(k.khauTru),
    thuc_nhan: tien(k.conLai),
    ...Object.fromEntries(Object.entries(h.vanBan ?? {})),
  };
}

export function duLieuDuAn(duAn: DuAn, ds: { h: Ho; k: KetQuaHo }[]): Record<string, unknown> {
  const theoLoai = new Map<string, Decimal>();
  let tongDt = D(0);
  for (const { h } of ds)
    for (const t of h.thua) {
      const v = D(t.dienTichThuHoi || 0);
      if (v.lte(0)) continue;
      theoLoai.set(t.loaiDat, (theoLoai.get(t.loaiDat) ?? D(0)).plus(v));
      tongDt = tongDt.plus(v);
    }
  const cong = (f: (k: KetQuaHo) => Decimal) => ds.reduce((s, x) => s.plus(f(x.k)), D(0));
  // Diện tích theo nhóm: được/không được bồi thường, hộ gia đình cá nhân/tổ chức, theo tên loại đất
  const nhomLoai = (loc: (h: Ho, t: Ho["thua"][number]) => boolean) => {
    const m = new Map<string, Decimal>();
    let tong = D(0);
    for (const { h } of ds)
      for (const t of h.thua) {
        const v = D(t.dienTichThuHoi || 0);
        if (v.lte(0) || !loc(h, t)) continue;
        const ten = tenLoaiDat(t.loaiDat);
        m.set(ten, (m.get(ten) ?? D(0)).plus(v));
        tong = tong.plus(v);
      }
    return { tong, ds: [...m].map(([ten, v]) => ({ ten, dien_tich: soM2(v) })) };
  };
  const btHo = nhomLoai((h, t) => !t.khongBoiThuong && h.loai !== "TO_CHUC");
  const btTc = nhomLoai((h, t) => !t.khongBoiThuong && h.loai === "TO_CHUC");
  const khongBt = nhomLoai((_, t) => !!t.khongBoiThuong);
  const gom = (n: { ds: unknown[] }) => (n.ds.length ? ", gồm:" : ".");
  const soHo = ds.filter((x) => x.h.loai !== "TO_CHUC").length;
  const soTc = ds.length - soHo;
  let dtCoGcn = D(0), dtKhongGcn = D(0);
  const dsThua: Record<string, unknown>[] = [];
  ds.forEach(({ h }, i) =>
    h.thua
      .filter((t) => D(t.dienTichThuHoi || 0).gt(0))
      .forEach((t) => {
        const tong = D(t.dienTichThuHoi || 0);
        const coGcn = t.gcn?.dtThuHoiCoGcn ? D(t.gcn.dtThuHoiCoGcn) : D(0);
        const khongGcn = tong.minus(coGcn);
        dtCoGcn = dtCoGcn.plus(coGcn);
        dtKhongGcn = dtKhongGcn.plus(khongGcn);
        dsThua.push({
          stt: i + 1,
          ho_ten: h.ten,
          so_to: t.soTo,
          so_thua: t.soThua,
          dt_thu_hoi: soM2(tong),
          loai_dat: t.loaiDat,
          gcn_seri: t.gcn?.seri ?? "",
          gcn_to: t.gcn?.soTo ?? "",
          gcn_thua: t.gcn?.soThua ?? "",
          gcn_dien_tich: t.gcn?.dienTich ? soM2(t.gcn.dienTich) : "",
          gcn_loai_dat: t.gcn?.loaiDat ?? "",
          dt_co_gcn: coGcn.gt(0) ? soM2(coGcn) : "",
          loai_dat_co_gcn: coGcn.gt(0) ? t.gcn?.loaiDatThuHoi || t.loaiDat : "",
          dt_khong_gcn: khongGcn.gt(0) ? soM2(khongGcn) : "",
          loai_dat_khong_gcn: khongGcn.gt(0) ? t.loaiDat : "",
          nguon_goc: t.nguonGoc,
          ghi_chu: t.ghiChu ?? "",
        });
      }),
  );
  const btDat = cong((k) => k.theoCot.BT_DAT);
  const btTaiSan = cong((k) => k.theoCot.BT_CAY.plus(k.theoCot.BT_TAI_SAN));
  const hoTro = cong((k) => k.tongHoTro);
  const tongLamTron = cong((k) => k.tong.tongLamTron);
  const toChuc = ds.filter((x) => x.h.loai === "TO_CHUC").length;
  return {
    ten_du_an: duAn.ten,
    ten_xa: lower1(duAn.xa),
    TEN_XA: duAn.xa.toUpperCase(),
    dia_danh: duAn.xa.replace(/^(Xã|Phường) /, ""),
    chu_dau_tu: duAn.chuDauTu,
    tb_thu_hoi_ngay_du_an: ngayChu(duAn.ngayThongBao),
    tong_dt_thu_hoi: soM2(tongDt),
    dt_theo_loai: [...theoLoai].map(([loai, v]) => ({ loai, dien_tich: soM2(v) })),
    so_doi_tuong: ds.length,
    so_to_chuc: toChuc,
    so_ca_nhan: ds.length - toChuc,
    bt_dat: tien(btDat),
    bt_tai_san: tien(btTaiSan),
    ho_tro: tien(hoTro),
    tien_bthttdc: tien(tongLamTron),
    tien_bthttdc_chu: docSoTien(tongLamTron.toFixed(0)),
    tong_gia_tri: tien(tongLamTron),
    tong_gia_tri_chu: docSoTien(tongLamTron.toFixed(0)),
    ds_ho: ds.map(({ h }, i) => ({
      stt: i + 1,
      ho_ten: h.ten,
      dia_chi: h.diaChi,
      to_thua: h.thua.map((t) => `${t.soTo}/${t.soThua}`).join(", "),
      loai_dat: [...new Set(h.thua.map((t) => t.loaiDat))].join(", "),
      dt_thu_hoi: soM2(h.thua.reduce((s, t) => s.plus(t.dienTichThuHoi || 0), D(0))),
    })),
    ds_thuong: [],
    so_doi_tuong_mo_ta: [soHo ? `${soHo} hộ gia đình, cá nhân` : "", soTc ? `${soTc} tổ chức` : ""].filter(Boolean).join(" và ") || "…",
    dt_duoc_bt: soM2(btHo.tong.plus(btTc.tong)),
    dt_duoc_bt_ho: soM2(btHo.tong),
    dt_duoc_bt_ho_loai: btHo.ds,
    gom_ho: gom(btHo),
    dt_duoc_bt_tc: soM2(btTc.tong),
    dt_duoc_bt_tc_loai: btTc.ds,
    gom_tc: gom(btTc),
    dt_khong_bt: soM2(khongBt.tong),
    dt_khong_bt_loai: khongBt.ds,
    gom_khong: gom(khongBt),
    ds_thua_thu_hoi: dsThua,
    tong_dt_co_gcn: soM2(dtCoGcn),
    tong_dt_khong_gcn: soM2(dtKhongGcn),
    so_ho_thuong: "",
    tong_tien_thuong: "",
    tong_tien_thuong_chu: "",
  };
}

/** Ghép dữ liệu: tự động (dự án + hộ) ← thông tin chung đã lưu ← thông tin nhập riêng cho lần tạo. */
export function ghepDuLieu(p: {
  mau: MauVanBan;
  duAn: DuAn;
  ds: { h: Ho; k: KetQuaHo }[];
  ho?: { h: Ho; k: KetQuaHo };
  chung: Record<string, string>;
  rieng: Record<string, string>;
  so: string;
  ngayKy: string;
}): Record<string, unknown> {
  const du = duLieuDuAn(p.duAn, p.ds);
  const tu = { ...du, ...(p.ho ? duLieuHo(p.ho.h, p.ho.k) : {}) };
  const vbDuAn = p.duAn.vanBan ?? {};
  const [y, m, d] = p.ngayKy ? p.ngayKy.split("-") : ["", "", ""];
  const chung: Record<string, unknown> = { ...p.chung };
  // Căn cứ: căn cứ chung + căn cứ riêng của dự án, mỗi dòng một căn cứ
  chung.can_cu = [...(p.chung.can_cu_chung ?? "").split("\n"), ...(p.chung.can_cu_du_an ?? "").split("\n")].map((s) => s.trim()).filter(Boolean);
  chung.TEN_DON_VI_BT = (p.chung.ten_don_vi_bt ?? "").toUpperCase();
  chung.CO_QUAN_CAP_TREN_BT = (p.chung.co_quan_cap_tren_bt ?? "").toUpperCase();
  chung.TEN_PHONG = (p.chung.ten_phong ?? "").toUpperCase();
  const rieng: Record<string, unknown> = { ...p.rieng };
  rieng.noi_nhan = (p.rieng.noi_nhan ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
  // Nơi nhận có sẵn dấu câu: "- …;" và dòng cuối "- ….", dùng cho mẫu riêng
  const nn = rieng.noi_nhan as string[];
  rieng.noi_nhan_ds = nn.map((x, i) => `- ${x.replace(/[;.]$/, "")}${i === nn.length - 1 ? "." : ";"}`);
  // Căn cứ dạng gạch đầu dòng (báo cáo thẩm định): bỏ chữ "Căn cứ" đầu câu
  chung.can_cu_gach = (chung.can_cu as string[]).map((c) => {
    const bo = c.replace(/^Căn cứ\s+/i, "");
    return bo.charAt(0).toUpperCase() + bo.slice(1);
  });
  // Người ký theo cơ quan ban hành mẫu
  if (p.mau.coQuan === "PHONG") {
    chung.quyen_han = p.chung.quyen_han_phong ?? "TRƯỞNG PHÒNG";
    chung.nguoi_ky = p.chung.nguoi_ky_phong ?? "";
  } else if (p.mau.coQuan === "DON_VI_BT") {
    chung.quyen_han = p.chung.quyen_han_don_vi ?? "";
    chung.nguoi_ky = p.chung.nguoi_ky_don_vi ?? "";
  }
  chung.co_pham_vi = !!(p.rieng.pham_vi_dot || p.chung.pham_vi_dot || "").trim();
  chung.ban_khu_dan_cu_bang = p.chung.ban_khu_dan_cu || "Tổng cộng";
  if (!(p.chung.chuc_danh_de_nghi ?? "").trim()) chung.chuc_danh_de_nghi = `Trưởng ${lower1(p.chung.ten_phong || "phòng chuyên môn")}`;
  if (p.mau.ma === "16") {
    const laThuHoi = p.rieng.loai_qd_giao === "QD_THU_HOI";
    const ref = laThuHoi ? (p.ho?.h.vanBan ?? {}) : vbDuAn;
    const khoa = laThuHoi ? "qd_thu_hoi" : "qd_phe_duyet";
    rieng.ten_quyet_dinh_giao = laThuHoi ? "Quyết định thu hồi đất" : "Quyết định phê duyệt phương án bồi thường, hỗ trợ, tái định cư";
    rieng.qd_giao_so = ref[`${khoa}_so`] ?? "";
    rieng.qd_giao_ngay = ref[`${khoa}_ngay`] ?? "";
    rieng.qd_giao_trich_yeu = laThuHoi ? `thu hồi đất để thực hiện dự án ${p.duAn.ten}` : `phê duyệt phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất để thực hiện dự án ${p.duAn.ten}`;
  }
  const kq: Record<string, unknown> = {
    ...tu,
    ...Object.fromEntries(Object.entries(vbDuAn)),
    tb_thu_hoi_ngay: (p.ho?.h.vanBan?.tb_thu_hoi_ngay ?? vbDuAn.tb_thu_hoi_ngay) || (du.tb_thu_hoi_ngay_du_an as string),
    ...chung,
    ...Object.fromEntries(Object.entries(rieng).filter(([, v]) => v !== "" && v !== undefined)),
    so: p.so,
    ngay_ky_ngan: p.ngayKy ? `${d}/${m}/${y}` : "",
    ngay: d ?? "",
    thang: m ?? "",
    nam: y ?? "",
  };
  // Tổng giá trị phương án = tiền BT, HT, TĐC (9.1) + chi phí tổ chức thực hiện (9.2) nếu đã nhập
  const cp = String(p.rieng.chi_phi_to_chuc ?? "").replace(/[.\s]/g, "").replace(",", ".");
  if (cp && !isNaN(Number(cp))) {
    const tong = p.ds.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)).plus(cp);
    kq.chi_phi_to_chuc = dinhDang(D(cp), 0);
    kq.tong_gia_tri = dinhDang(tong, 0);
    kq.tong_gia_tri_chu = docSoTien(tong.toFixed(0));
  }
  if (!kq.ky_hieu) kq.ky_hieu = "";
  if (!kq.ngay_hieu_luc) kq.ngay_hieu_luc = "ký";
  return kq;
}

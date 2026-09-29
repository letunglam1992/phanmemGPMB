/**
 * Soát phương án trước khi chốt (docs/17 §11.1) — bộ quy tắc kiểm tra chéo hồ sơ, chỉ để NHẮC, không tự sửa, không chặn
 * (việc chặn chốt hộ còn "Thiếu căn cứ"/"Cần xác nhận" đã có ở QD-03).
 * Mỗi quy tắc ghi căn cứ; quy tắc thuần số liệu (không có điều kiện pháp lý) ghi "Kiểm tra số liệu".
 * Phần mềm KHÔNG kết luận hộ được hay không được bồi thường, hỗ trợ, bố trí TĐC — chỉ chỉ ra chỗ cần cán bộ xem xét.
 */
import { D } from "@gpmb/core";
import type { KetQuaHo } from "./tinh-ho";
import { laDatNN, laDatO } from "./tinh-ho";
import { tienDoHieuLuc, type DuAn, type Ho } from "./mo-hinh";
import { nhomMaTrung } from "./ma-ho";
import { hienSo, laSoMay } from "./so";
import { soatQuyTdc } from "./quy-tdc";
import { TEN_CAP, doiChieuDienTich, type NguongLechDt } from "./doi-chieu-dt";

export type MucSoat = "LOI" | "CANH_BAO" | "THONG_TIN";
export const TEN_MUC_SOAT: Record<MucSoat, string> = { LOI: "Lỗi", CANH_BAO: "Cần kiểm tra", THONG_TIN: "Lưu ý" };

export interface KetQuaSoat {
  quyTac: string;
  muc: MucSoat;
  hoId?: string;
  /** Mã hộ (hoặc "Dự án") để hiển thị */
  doiTuong: string;
  noiDung: string;
  canCu: string;
}

export const KIEM_TRA_SO_LIEU = "Kiểm tra số liệu";

/** Tên các quy tắc — hiện ở màn Soát để cán bộ biết đã soát những gì. */
export const QUY_TAC_SOAT: { ma: string; ten: string; canCu: string }[] = [
  { ma: "MA_TRUNG", ten: "Mã hồ sơ trùng trong dự án", canCu: KIEM_TRA_SO_LIEU },
  { ma: "DT_VUOT", ten: "DT thu hồi lớn hơn DT thửa", canCu: KIEM_TRA_SO_LIEU },
  { ma: "DT_TRONG", ten: "Thửa không có DT thu hồi", canCu: KIEM_TRA_SO_LIEU },
  { ma: "THUA_TRUNG", ten: "Cùng tờ, thửa ở nhiều hồ sơ (tổng DT thu hồi vượt DT thửa là lỗi)", canCu: KIEM_TRA_SO_LIEU },
  { ma: "KHOAN_CHUA_DU", ten: "Khoản còn Thiếu căn cứ / Cần xác nhận (không chốt được)", canCu: "QD-03 (docs/06)" },
  { ma: "DAT_O_HET", ten: "Thu hồi toàn bộ thửa đất ở mà chưa ghi thông tin bố trí TĐC", canCu: "Điều 111 Luật Đất đai 2024" },
  { ma: "NN_ON_DINH", ten: "Có đất NN bị thu hồi mà chưa khai DT đất NN đang sử dụng (chưa xét hỗ trợ ổn định đời sống)", canCu: "khoản 1 Điều 19 NĐ 88/2024; Điều 12 Phụ lục II QĐ 106/2025" },
  { ma: "TAM_CU_NK", ten: "Có hỗ trợ tạm cư mà hồ sơ chưa có nhân khẩu", canCu: "khoản 3, khoản 4 Điều 3 QĐ 14/2026" },
  { ma: "PHAP_LY", ten: "Thửa thu hồi chưa phân loại pháp lý nguồn gốc", canCu: "Điều 95 Luật Đất đai 2024 (cán bộ xác định điều kiện)" },
  { ma: "DT_LECH", ten: "Diện tích lệch giữa bản đồ, hồ sơ, phương án, GCN vượt ngưỡng đơn vị đặt (§11.3)", canCu: "Ngưỡng do đơn vị đặt (Cài đặt chung → Ngưỡng lệch diện tích)" },
  { ma: "TDC_LO", ten: "Tái định cư: hai hộ cùng một lô, hồ sơ khác lô đã giao trong quỹ, một hộ nhận nhiều lô (P3-3)", canCu: "Điều 111 Luật Đất đai 2024; quỹ tái định cư của dự án" },
  { ma: "NIEM_YET", ten: "Chưa ghi hoàn thành niêm yết công khai phương án", canCu: "điểm a khoản 3 Điều 87 Luật Đất đai 2024" },
];
const canCu = (ma: string) => QUY_TAC_SOAT.find((q) => q.ma === ma)!.canCu;

const so = (v: string | undefined) => (v && laSoMay(v) ? D(v) : null);
const khoaThua = (soTo: string, soThua: string) => `${soTo.trim().replace(/^0+(?=\d)/, "")}/${soThua.trim().replace(/^0+(?=\d)/, "")}`;

export function soatPhuongAn(duAn: DuAn, kq: { h: Ho; k: KetQuaHo }[], nguong?: NguongLechDt | null): KetQuaSoat[] {
  const out: KetQuaSoat[] = [];
  const bao = (quyTac: string, muc: MucSoat, h: Ho | null, noiDung: string) =>
    out.push({ quyTac, muc, hoId: h?.id, doiTuong: h ? `${h.ma} – ${h.ten}` : "Dự án", noiDung, canCu: canCu(quyTac) });

  for (const n of nhomMaTrung(kq.map((x) => x.h)))
    bao("MA_TRUNG", "LOI", null, `Mã "${n.ma}" dùng cho ${n.ho.length} hồ sơ: ${n.ho.map((h) => h.ten).join("; ")}`);

  // Thửa trùng giữa các hộ
  const theoThua = new Map<string, { h: Ho; dt: string; dtThua: string }[]>();
  for (const { h } of kq)
    for (const t of h.thua) {
      if (!t.soTo.trim() || !t.soThua.trim()) continue;
      const k = khoaThua(t.soTo, t.soThua);
      theoThua.set(k, [...(theoThua.get(k) ?? []), { h, dt: t.dienTichThuHoi, dtThua: t.dienTich }]);
    }
  for (const [k, ds] of theoThua) {
    const hoKhac = new Set(ds.map((x) => x.h.id));
    if (hoKhac.size < 2) continue;
    const [to, thua] = k.split("/");
    const tong = ds.reduce((s, x) => s.plus(so(x.dt) ?? 0), D(0));
    const dtThua = ds.map((x) => so(x.dtThua)).filter((x) => x !== null).reduce((m, x) => (m === null || x!.gt(m) ? x : m), null as ReturnType<typeof D> | null);
    const vuot = dtThua !== null && tong.gt(dtThua);
    bao("THUA_TRUNG", vuot ? "LOI" : "CANH_BAO", null, `Thửa ${thua} tờ ${to} có ở ${hoKhac.size} hồ sơ (${ds.map((x) => `${x.h.ma}: ${hienSo(x.dt || "0")} m²`).join("; ")})${vuot ? ` — tổng DT thu hồi ${hienSo(tong.toString())} m² vượt DT thửa ${hienSo(dtThua!.toString())} m²` : " — đồng sử dụng hay nhập trùng"}`);
  }

  for (const { h, k } of kq) {
    const ho = h.loai !== "TO_CHUC";
    for (const t of h.thua) {
      const ten = `Thửa ${t.soThua} tờ ${t.soTo}`;
      const dt = so(t.dienTich);
      const th = so(t.dienTichThuHoi);
      if (dt && th && th.gt(dt)) bao("DT_VUOT", "LOI", h, `${ten}: DT thu hồi ${hienSo(t.dienTichThuHoi)} m² > DT thửa ${hienSo(t.dienTich)} m²`);
      if (!th || th.lte(0)) bao("DT_TRONG", "CANH_BAO", h, `${ten}: chưa có DT thu hồi (không tính tiền về đất cho thửa này)`);
      if (th && th.gt(0) && !t.phapLy) bao("PHAP_LY", "THONG_TIN", h, `${ten}: chưa chọn tình trạng pháp lý nguồn gốc`);
    }

    const chua = k.tatCa.filter((d) => d.dong.trangThai === "THIEU_CAN_CU" || d.dong.trangThai === "CAN_XAC_NHAN");
    if (chua.length)
      bao("KHOAN_CHUA_DU", "LOI", h, chua.map((d) => `${d.dong.ma} ${d.dong.noiDung}: ${d.dong.trangThai === "THIEU_CAN_CU" ? "Thiếu căn cứ" : "Cần xác nhận"}${d.dong.canhBao[0] ? ` (${d.dong.canhBao[0]})` : ""}`).join("; "));

    if (ho) {
      const datOHet = h.thua.filter((t) => laDatO(t.loaiDat) && so(t.dienTich) && so(t.dienTichThuHoi) && so(t.dienTichThuHoi)!.gte(so(t.dienTich)!) && so(t.dienTich)!.gt(0));
      if (datOHet.length && !h.hoTro.taiDinhCu)
        bao("DAT_O_HET", "CANH_BAO", h, `Thu hồi toàn bộ thửa đất ở (${datOHet.map((t) => `thửa ${t.soThua} tờ ${t.soTo}`).join(", ")}) mà chưa ghi thông tin bố trí TĐC ở thẻ Hỗ trợ — xem xét việc bố trí tái định cư theo hồ sơ thực tế của hộ`);

      const nnThuHoi = h.thua.some((t) => laDatNN(t.loaiDat) && (so(t.dienTichThuHoi)?.gt(0) ?? false));
      const b13 = h.thua.some((t) => t.nongLamTruong && (so(t.dienTichThuHoi)?.gt(0) ?? false));
      if (nnThuHoi && !b13 && !h.hoTro.onDinh)
        bao("NN_ON_DINH", "CANH_BAO", h, "Có đất nông nghiệp bị thu hồi nhưng chưa khai DT đất NN đang sử dụng ở thẻ Hỗ trợ — chưa xác định được tỷ lệ thu hồi để xét hỗ trợ ổn định đời sống");

      if (h.hoTro.tamCu && h.hoTro.tamCu.soThang > 0 && h.nhanKhau.length === 0)
        bao("TAM_CU_NK", "CANH_BAO", h, "Hỗ trợ tạm cư tính theo nhân khẩu nhưng hồ sơ chưa có nhân khẩu (đang tạm tính 1 nhân khẩu) — nhập danh sách nhân khẩu");
    }

    const td = tienDoHieuLuc(duAn, h);
    if (td["6"]?.trangThai !== "XONG") bao("NIEM_YET", "THONG_TIN", h, "Bước 6 \"Niêm yết công khai\" chưa ghi hoàn thành — phương án dự thảo phải được niêm yết, lấy ý kiến trước khi hoàn chỉnh trình thẩm định");
  }

  // §11.3: lệch diện tích — chỉ xét khi đơn vị đã đặt ngưỡng (chưa đặt thì xem ở thẻ Đối chiếu diện tích)
  if (nguong && (nguong.m2.trim() || nguong.phanTram.trim()))
    for (const x of doiChieuDienTich(duAn, kq.map((y) => y.h), nguong).filter((y) => y.vuot)) {
      const h = kq.find((y) => y.h.id === x.hoId)!.h;
      out.push({ quyTac: "DT_LECH", muc: "CANH_BAO", hoId: h.id, doiTuong: `${h.ma} – ${h.ten}`, noiDung: `${x.thua}: ${TEN_CAP[x.cap][0]} ${hienSo(x.a)} m² ↔ ${TEN_CAP[x.cap][1]} ${hienSo(x.b)} m² (lệch ${hienSo(x.chenh)} m²${x.tyLe ? `, ${hienSo(x.tyLe)}%` : ""})`, canCu: `Ngưỡng do đơn vị đặt: ${nguong.canCu}` });
    }

  // P3-3: đối chiếu hồ sơ với quỹ tái định cư (chỉ hộ đang soát)
  const idSoat = new Set(kq.map((x) => x.h.id));
  for (const c of soatQuyTdc(duAn, kq.map((x) => x.h))) {
    if (c.muc === "THONG_TIN" || (c.hoId && !idSoat.has(c.hoId))) continue;
    const h = c.hoId ? kq.find((x) => x.h.id === c.hoId)?.h : undefined;
    out.push({ quyTac: "TDC_LO", muc: c.muc, hoId: h?.id, doiTuong: h ? `${h.ma} – ${h.ten}` : "Dự án", noiDung: c.noiDung, canCu: c.canCu ?? canCu("TDC_LO") });
  }

  const thuTu: Record<MucSoat, number> = { LOI: 0, CANH_BAO: 1, THONG_TIN: 2 };
  return out.sort((a, b) => thuTu[a.muc] - thuTu[b.muc]);
}

/** Đếm theo mức. */
export const demSoat = (ds: KetQuaSoat[]) => ({ LOI: ds.filter((x) => x.muc === "LOI").length, CANH_BAO: ds.filter((x) => x.muc === "CANH_BAO").length, THONG_TIN: ds.filter((x) => x.muc === "THONG_TIN").length });

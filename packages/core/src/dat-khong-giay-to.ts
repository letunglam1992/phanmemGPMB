/**
 * B03, B04, B05 – bồi thường về đất khi người sử dụng đất không có giấy tờ, có vi phạm trước 01/7/2014, được giao không
 * đúng thẩm quyền (Điều 5, 8, 9, 10, 12 NĐ 88/2024/NĐ-CP — NĐ 226/2025/NĐ-CP không sửa các điều này; nguyên văn:
 * policy/nguon/nd88-2024-dieu-5-12.md). Hàm chỉ PHÂN BỔ DIỆN TÍCH theo khoản xác định từ thời điểm sử dụng ổn định;
 * giá đất, hạn mức, tiền sử dụng đất phải nộp do cán bộ nhập kèm căn cứ.
 */
import type Decimal from "decimal.js";
import { D, lamTronDienTich, type SoVao } from "./so";
import type { CanCu } from "./types";

/** Ngày Luật Đất đai 2024 có hiệu lực thi hành (k10 Đ252 LĐĐ 2024, sửa bởi Luật 43/2024/QH15). */
export const NGAY_HIEU_LUC_LDD_2024 = "2024-08-01";

export type DieuDatO = "D8" | "D9" | "D10";
export const TEN_DIEU_DAT_O: Record<DieuDatO, string> = {
  D8: "Điều 8 — không có giấy tờ về quyền sử dụng đất (đủ ĐK khoản 1 Điều 5)",
  D9: "Điều 9 — làm nhà ở có vi phạm pháp luật về đất đai trước 01/7/2014 (khoản 2 Điều 5)",
  D10: "Điều 10 — được giao không đúng thẩm quyền, mua/thanh lý/hóa giá không đúng quy định (khoản 3 Điều 5)",
};

export interface PhanBoDatO {
  /** Khoản, điểm áp dụng (vd. "khoản 2 Điều 8"). */
  khoan: string;
  moTa: string;
  datO: Decimal;
  sxkd: Decimal;
  conLai: Decimal;
  /** Cách xử lý phần còn lại: NN – theo loại đất nông nghiệp (điểm d); HIEN_TRANG – theo hiện trạng (điểm b k3 Đ10);
   * CHUA_QUY_DINH – văn bản không quy định (Điều 9), cán bộ chọn; KHONG_BT – không bồi thường về đất. */
  conLaiLoai: "NN" | "HIEN_TRANG" | "CHUA_QUY_DINH" | "KHONG_BT";
  /** Phần đất ở vượt hạn mức phải trừ tiền SDĐ như khi cấp GCN (đoạn 2 điểm a k1, k2 Điều 8). */
  datOVuot: Decimal;
  hanMuc: "CONG_NHAN" | "GIAO" | null;
  hanMucM2: Decimal | null;
  canCu: CanCu[];
  canhBao: string[];
  /** Khe văn bản cần người dùng xác nhận (vd. điểm b k1 Điều 8 ghi "diện tích thửa đất"). */
  canXacNhan: string[];
  loi?: string;
}

const cc = (viTri: string): CanCu => ({ vanBan: "NĐ 88/2024/NĐ-CP", viTri });
const truoc = (a: string, b: string) => a < b;

/**
 * Phân bổ DT thu hồi của thửa có nhà ở theo Điều 8 (k1: trước 18/12/1980; k2: đến trước 15/10/1993 — hạn mức công nhận
 * đất ở k5 Đ141 LĐĐ; k3: đến trước 01/7/2014 — hạn mức giao đất ở), Điều 9 (vi phạm), Điều 10 (giao không đúng thẩm quyền).
 */
export function phanBoDatO(p: {
  dieu: DieuDatO;
  ngaySuDung: string;
  dtThuHoi: SoVao;
  dtThua: SoVao;
  dtXayDung?: SoVao;
  dtSxkd?: SoVao;
  hanMucCongNhan?: SoVao | null;
  hanMucGiao?: SoVao | null;
  /** Điều 10 k3: thuộc trường hợp điểm a, b k3 Đ140 LĐĐ. */
  d140?: boolean;
  /** Điều 10 k4: có giấy tờ chứng minh đã nộp tiền để được sử dụng đất. */
  giayToNopTien?: boolean;
  /** Điều 9 k4: lấn đất, chiếm đất. */
  lanChiem?: boolean;
}): PhanBoDatO {
  const S = lamTronDienTich(p.dtThuHoi || 0);
  const St = lamTronDienTich(p.dtThua || 0);
  const Sxd = D(p.dtXayDung || 0);
  const Skd = D(p.dtSxkd || 0);
  const ngay = p.ngaySuDung;
  const rong = (khoan: string, loi: string): PhanBoDatO => ({ khoan, moTa: "", datO: D(0), sxkd: D(0), conLai: S, conLaiLoai: "KHONG_BT", datOVuot: D(0), hanMuc: null, hanMucM2: null, canCu: [], canhBao: [], canXacNhan: [], loi });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return rong("", "Chưa nhập thời điểm bắt đầu sử dụng đất ổn định");
  const hmCn = p.hanMucCongNhan != null && p.hanMucCongNhan !== "" ? D(p.hanMucCongNhan) : null;
  const hmGiao = p.hanMucGiao != null && p.hanMucGiao !== "" ? D(p.hanMucGiao) : null;

  /** Điểm a–d khoản 1, 2, 3 Điều 8. */
  const dieu8 = (k: 1 | 2 | 3, canCuThem: CanCu[], moTa: string, tachSxkd = true): PhanBoDatO => {
    const loaiHm = k === 3 ? "GIAO" : "CONG_NHAN";
    const hm = k === 3 ? hmGiao : hmCn;
    const khoan = `khoản ${k} Điều 8`;
    if (!hm || hm.lte(0)) return { ...rong(khoan, k === 3 ? "Chưa có hạn mức giao đất ở (khoản 2 Điều 195, khoản 2 Điều 196 LĐĐ)" : "Chưa có hạn mức công nhận đất ở (khoản 5 Điều 141 LĐĐ)"), hanMuc: loaiHm };
    const canhBao: string[] = [];
    const canXacNhan: string[] = [];
    let datO: Decimal, datOVuot = D(0), diem: string;
    const xd = Sxd.gt(S) ? S : Sxd;
    // Điểm b khoản 1 ghi "diện tích thửa đất nhỏ hơn hạn mức"; khoản 2, 3 ghi "diện tích thu hồi của thửa đất".
    const bApDung = k === 1 ? St.lt(hm) : S.lt(hm);
    if (S.gte(hm)) {
      diem = "a";
      datO = hm;
      if (xd.gt(hm)) {
        datO = xd;
        if (k !== 3) datOVuot = xd.minus(hm);
      }
    } else if (bApDung) {
      diem = "b";
      datO = S;
    } else {
      // k1: DT thu hồi < hạn mức ≤ DT thửa — không thuộc điểm a, b theo câu chữ (VM-39).
      diem = "b";
      datO = S;
      canXacNhan.push("Điểm b khoản 1 Điều 8 ghi \"diện tích thửa đất nhỏ hơn hạn mức\": DT thu hồi nhỏ hơn hạn mức nhưng DT thửa không nhỏ hơn hạn mức — không thuộc điểm a, b theo câu chữ; mặc định bồi thường đất ở toàn bộ DT thu hồi như khoản 2, 3 (VM-39)");
    }
    let sxkd = D(0);
    if (diem === "a" && tachSxkd) {
      const con = S.minus(datO);
      sxkd = Skd.gt(con) ? con : Skd;
      if (Skd.gt(con)) canhBao.push("DT sản xuất, kinh doanh phi nông nghiệp lớn hơn phần DT thu hồi còn lại sau đất ở — chỉ tính phần còn lại");
    } else if (Skd.gt(0) && tachSxkd) canhBao.push(`Điểm b ${khoan}: toàn bộ DT thu hồi được bồi thường về đất ở — không tách DT sản xuất, kinh doanh`);
    const conLai = S.minus(datO).minus(sxkd);
    if (datOVuot.gt(0)) canhBao.push(`DT đã xây dựng nhà ở, công trình phục vụ đời sống vượt hạn mức công nhận ${datOVuot.toString()} m²: bồi thường đất ở theo DT thực tế xây dựng sau khi trừ tiền sử dụng đất phải nộp như khi cấp GCN đối với phần vượt (đoạn 2 điểm a ${khoan})`);
    return {
      khoan: `điểm ${diem} ${khoan}`,
      moTa,
      datO,
      sxkd,
      conLai,
      conLaiLoai: "NN",
      datOVuot,
      hanMuc: loaiHm,
      hanMucM2: hm,
      canCu: [cc(`điểm ${diem}${sxkd.gt(0) ? ", c" : ""}${conLai.gt(0) ? ", d" : ""} ${khoan}`), ...canCuThem],
      canhBao,
      canXacNhan,
    };
  };

  if (p.dieu === "D8") {
    const c5 = [cc("khoản 1 Điều 5")];
    if (truoc(ngay, "1980-12-18")) return dieu8(1, c5, "Sử dụng đất có nhà ở trước ngày 18/12/1980, không có giấy tờ");
    if (truoc(ngay, "1993-10-15")) return dieu8(2, c5, "Sử dụng đất có nhà ở từ 18/12/1980 đến trước 15/10/1993, không có giấy tờ");
    if (truoc(ngay, "2014-07-01")) return dieu8(3, c5, "Sử dụng đất có nhà ở từ 15/10/1993 đến trước 01/7/2014, không có giấy tờ");
    return rong("Điều 8", "Thời điểm sử dụng từ 01/7/2014 trở về sau — không thuộc Điều 8 NĐ 88");
  }

  if (p.dieu === "D9") {
    if (!truoc(ngay, "2014-07-01")) {
      if (p.lanChiem) return { ...rong("khoản 4 Điều 9", ""), loi: undefined, khoan: "khoản 4 Điều 9", moTa: "Lấn đất, chiếm đất từ 01/7/2014 trở về sau — Nhà nước không bồi thường về đất", canCu: [cc("khoản 4 Điều 9")] };
      return rong("Điều 9", "Vi phạm từ 01/7/2014 trở về sau — không thuộc khoản 1, 2, 3 Điều 9 NĐ 88");
    }
    const k1 = truoc(ngay, "1993-10-15");
    const hm = k1 ? hmCn : hmGiao;
    const khoan = k1 ? "khoản 1 Điều 9" : "khoản 2 Điều 9";
    if (!hm || hm.lte(0)) return { ...rong(khoan, k1 ? "Chưa có hạn mức công nhận đất ở tại địa phương" : "Chưa có hạn mức giao đất ở tại địa phương"), hanMuc: k1 ? "CONG_NHAN" : "GIAO" };
    const xd = Sxd.gt(S) ? S : Sxd;
    const k3 = xd.gt(hm);
    const datO = k3 ? xd : S.lt(hm) ? S : hm;
    return {
      khoan: k3 ? "khoản 3 Điều 9" : khoan,
      moTa: `Sử dụng đất làm nhà ở có vi phạm ${k1 ? "trước 15/10/1993" : "từ 15/10/1993 đến trước 01/7/2014"}`,
      datO,
      sxkd: D(0),
      conLai: S.minus(datO),
      conLaiLoai: "CHUA_QUY_DINH",
      datOVuot: D(0),
      hanMuc: k1 ? "CONG_NHAN" : "GIAO",
      hanMucM2: hm,
      canCu: [cc(k3 ? `${khoan}, khoản 3 Điều 9` : khoan), cc("khoản 2 Điều 5")],
      canhBao: k3 ? ["DT đã làm nhà ở lớn hơn hạn mức: bồi thường theo DT thực tế bị thu hồi đã làm nhà ở (khoản 3 Điều 9)"] : [],
      canXacNhan: [],
    };
  }

  // Điều 10
  const c53 = [cc("khoản 3 Điều 5")];
  const theo = (k: 1 | 2 | 3, khoan10: string, moTa: string): PhanBoDatO => {
    const r = dieu8(k === 1 ? 2 : 3, [cc(khoan10), ...c53], moTa);
    return { ...r, khoan: `${khoan10} (áp dụng ${r.khoan})` };
  };
  if (truoc(ngay, "1993-10-15")) return theo(1, "khoản 1 Điều 10", "Đất được giao không đúng thẩm quyền, sử dụng ổn định trước 15/10/1993");
  if (truoc(ngay, "2004-07-01")) return theo(2, "khoản 2 Điều 10", "Sử dụng ổn định từ 15/10/1993 đến trước 01/7/2004");
  if (truoc(ngay, "2014-07-01")) {
    const moTa = "Sử dụng ổn định từ 01/7/2004 đến trước 01/7/2014";
    if (!p.d140)
      return { khoan: "điểm b khoản 3 Điều 10", moTa: `${moTa}; không thuộc điểm a, b khoản 3 Điều 140 LĐĐ — toàn bộ DT thu hồi bồi thường theo hiện trạng sử dụng đất`, datO: D(0), sxkd: D(0), conLai: S, conLaiLoai: "HIEN_TRANG", datOVuot: D(0), hanMuc: null, hanMucM2: null, canCu: [cc("điểm b khoản 3 Điều 10"), ...c53], canhBao: [], canXacNhan: [] };
    // Điểm a k3 Đ10 chỉ dẫn điểm a, b k3 Đ8: không tách DT SXKD (điểm c); phần còn lại theo hiện trạng (điểm b k3 Đ10).
    const r = dieu8(3, [cc("khoản 3 Điều 10"), ...c53], moTa, false);
    if (r.loi) return r;
    const diem = r.khoan.startsWith("điểm a") ? "a" : "b";
    return { ...r, khoan: `khoản 3 Điều 10 (áp dụng điểm ${diem} khoản 3 Điều 8)`, conLaiLoai: "HIEN_TRANG", canCu: [cc(`điểm ${diem} khoản 3 Điều 8`), cc(`điểm a${r.conLai.gt(0) ? ", b" : ""} khoản 3 Điều 10`), ...c53] };
  }
  if (truoc(ngay, NGAY_HIEU_LUC_LDD_2024)) {
    if (!p.giayToNopTien) return rong("khoản 4 Điều 10", "Giao từ 01/7/2014 đến trước 01/8/2024: phải có giấy tờ chứng minh đã nộp tiền để được sử dụng đất (khoản 4 Điều 10) — đánh dấu khi có");
    return theo(3, "khoản 4 Điều 10", "Đất được giao từ 01/7/2014 đến trước ngày Luật Đất đai 2024 có hiệu lực, có giấy tờ đã nộp tiền");
  }
  return rong("Điều 10", "Giao từ ngày Luật Đất đai 2024 có hiệu lực (01/8/2024) — không thuộc Điều 10 NĐ 88");
}

export type TruongHopDatNN = "K1" | "K2" | "K2_KHAI_HOANG" | "K3" | "K5A";
export const TEN_TRUONG_HOP_NN: Record<TruongHopDatNN, string> = {
  K1: "Khoản 1 — không có giấy tờ (đủ ĐK khoản 1 Điều 5)",
  K2: "Khoản 2 — có vi phạm trước 01/7/2014 (đủ ĐK khoản 2 Điều 5)",
  K2_KHAI_HOANG: "Khoản 2 — tự khai hoang, sử dụng ổn định (hạn mức giao đất NN do UBND tỉnh quy định)",
  K3: "Khoản 3 — được giao không đúng thẩm quyền trước 01/7/2014 (đủ ĐK khoản 3 Điều 5)",
  K5A: "Khoản 5 điểm a — nhận chuyển quyền vượt hạn mức trước 01/7/2014 từ người thuộc khoản 2 Điều 95 LĐĐ",
};

export interface PhanBoDatNN {
  boiThuong: Decimal;
  vuot: Decimal;
  /** Phần vượt: BT – bồi thường theo DT thực tế (điểm a k4); HT_K7 – UBND tỉnh quyết định hỗ trợ khác (k7). */
  vuotXuLy: "BT" | "HT_K7" | null;
  khoan: string;
  canCu: CanCu[];
  canhBao: string[];
}

/** B05 – Điều 12 NĐ 88: DT đất nông nghiệp được bồi thường (≤ hạn mức giao đất NN Điều 176 LĐĐ) và xử lý phần vượt. */
export function phanBoDatNN(p: { truongHop: TruongHopDatNN; dtThuHoi: SoVao; hanMuc: SoVao; truoc2004TrucTiepSx?: boolean }): PhanBoDatNN {
  const S = lamTronDienTich(p.dtThuHoi || 0);
  if (p.truongHop === "K5A") return { boiThuong: S, vuot: D(0), vuotXuLy: null, khoan: "điểm a khoản 5 Điều 12", canCu: [cc("điểm a khoản 5 Điều 12")], canhBao: [] };
  const hm = D(p.hanMuc);
  const bt = S.gt(hm) ? hm : S;
  const vuot = S.minus(bt);
  const k = p.truongHop === "K1" ? "1" : p.truongHop === "K3" ? "3" : "2";
  const canCu = [cc(`khoản ${k} Điều 12`), cc(`khoản ${k} Điều 5`)];
  const canhBao: string[] = [];
  let vuotXuLy: PhanBoDatNN["vuotXuLy"] = null;
  if (vuot.gt(0)) {
    if (p.truoc2004TrucTiepSx) {
      const diem = p.truongHop === "K1" ? "a" : p.truongHop === "K3" ? "c" : "b";
      canCu.push(cc(`điểm ${diem} khoản 4 Điều 12`));
      vuotXuLy = p.truongHop === "K1" ? "BT" : "HT_K7";
      canhBao.push(p.truongHop === "K1" ? "Sử dụng ổn định trước 01/7/2004, trực tiếp sản xuất NN, không có giấy tờ: bồi thường theo DT thực tế bị thu hồi (điểm a khoản 4 Điều 12)" : `Phần vượt hạn mức được xem xét hỗ trợ theo khoản 7 Điều 12 (điểm ${diem} khoản 4)`);
    } else {
      vuotXuLy = "HT_K7";
      canCu.push(cc("khoản 7 Điều 12"));
      canhBao.push("Phần DT vượt hạn mức không được bồi thường về đất — UBND cấp tỉnh quyết định hỗ trợ khác cho từng dự án (khoản 7 Điều 12)");
    }
  }
  const btCuoi = vuotXuLy === "BT" ? S : bt;
  return { boiThuong: btCuoi, vuot: vuotXuLy === "BT" ? D(0) : vuot, vuotXuLy, khoan: `khoản ${k} Điều 12`, canCu, canhBao };
}

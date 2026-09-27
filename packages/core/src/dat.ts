import { dong } from "./dong";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";
import type { CanCu, DongTinh } from "./types";

/** Một bước điều chỉnh giá đất theo NQ 152 (GD-09…GD-19, docs/07) hoặc hệ số của dự án. */
export interface DieuChinhGia {
  moTa: string;
  heSo: SoVao;
  canCu: CanCu;
}

/**
 * B01 – bồi thường về đất bằng tiền (QD-02): DT × giá bảng giá × các điều chỉnh × hệ số điều chỉnh.
 * Giá bảng giá tính theo nghìn đồng/m² như NQ 152; quy đổi sang đồng khi tính.
 */
export function boiThuongDat(p: {
  loaiDat: string;
  dienTichM2: SoVao;
  giaBangGiaNghinDong: SoVao;
  nguonGia: string;
  dieuChinh?: DieuChinhGia[];
  heSoDuAn?: { heSo: SoVao; vanBan: string };
  canCu: CanCu[];
}): DongTinh {
  const dt = lamTronDienTich(p.dienTichM2);
  let gia = D(p.giaBangGiaNghinDong).mul(1000);
  const thamSo: Record<string, string> = {
    "Diện tích": `${dinhDang(dt, 2)} m²`,
    "Giá bảng giá": `${dinhDang(gia)} đ/m² (${p.nguonGia})`,
  };
  const canCu = [...p.canCu];
  for (const [i, dc] of (p.dieuChinh ?? []).entries()) {
    gia = gia.mul(dc.heSo);
    thamSo[`Điều chỉnh ${i + 1}`] = `${dc.moTa}: × ${dinhDang(dc.heSo, 2)} → ${dinhDang(gia, 2)} đ/m²`;
    canCu.push(dc.canCu);
  }
  const canhBao: string[] = [];
  if (p.heSoDuAn) {
    gia = gia.mul(p.heSoDuAn.heSo);
    thamSo["Hệ số điều chỉnh"] = `× ${dinhDang(p.heSoDuAn.heSo, 3)} (${p.heSoDuAn.vanBan || "chưa có văn bản"})`;
    if (!p.heSoDuAn.vanBan) canhBao.push("Hệ số điều chỉnh ≠ 1 nhưng chưa ghi văn bản căn cứ");
  }
  return dong({
    ma: "B01",
    noiDung: `Bồi thường về đất – ${p.loaiDat}`,
    thamSo,
    congThuc: "Diện tích × Giá bảng giá × Điều chỉnh × Hệ số",
    thanhTien: dt.mul(gia),
    canCu,
    trangThai: canhBao.length ? "CAN_XAC_NHAN" : "TAM_TINH",
    canhBao,
  });
}

/** B06 – đất PNN không phải đất ở có thời hạn, bồi thường bằng tiền: Tbt = G × S / T1 × T2 (k7 Đ13 NĐ 88). */
export function datPnnCoThoiHan(p: { dienTichM2: SoVao; giaDong: SoVao; T1: SoVao; T2: SoVao; nguonGia: string }): DongTinh {
  const S = lamTronDienTich(p.dienTichM2);
  return dong({
    ma: "B06",
    noiDung: "Bồi thường đất phi nông nghiệp có thời hạn",
    thamSo: { G: `${dinhDang(p.giaDong)} đ/m² (${p.nguonGia})`, S: `${dinhDang(S, 2)} m²`, T1: `${p.T1} năm`, T2: `${p.T2} năm` },
    congThuc: "Tbt = G × S / T1 × T2",
    thanhTien: D(p.giaDong).mul(S).div(p.T1).mul(p.T2),
    canCu: [{ vanBan: "NĐ 88/2024/NĐ-CP", viTri: "khoản 7 Điều 13" }],
  });
}

/** B07 – chi phí đầu tư vào đất còn lại có chứng từ: P = (P1 + P2 + P3 + P4) / T1 × T2 (k4 Đ17 NĐ 88). */
export function chiPhiDauTuConLai(p: { P1: SoVao; P2: SoVao; P3: SoVao; P4: SoVao; T1: SoVao; T2: SoVao }): DongTinh {
  const tong = D(p.P1).plus(p.P2).plus(p.P3).plus(p.P4);
  return dong({
    ma: "B07",
    noiDung: "Bồi thường chi phí đầu tư vào đất còn lại",
    thamSo: { "P1+P2+P3+P4": `${dinhDang(tong)} đ`, T1: `${p.T1} năm`, T2: `${p.T2} năm` },
    congThuc: "P = (P1 + P2 + P3 + P4) / T1 × T2",
    thanhTien: tong.div(p.T1).mul(p.T2),
    canCu: [{ vanBan: "NĐ 88/2024/NĐ-CP", viTri: "khoản 4 Điều 17" }],
  });
}

/**
 * 1.0.5 — Áp dụng QĐ 64/2026/QĐ-UBND: rà soát tác động trên mọi dự án (bộ chính sách đang dùng, phương án đã duyệt
 * trước 06/10/2026, thửa chưa ghi tổ thôn, chênh lệch nếu chuyển bộ) và gợi ý tổ, thôn của thửa theo địa chỉ hộ.
 * Chỉ để rà soát, nhắc — không tự chuyển bộ, không tự ghi tổ thôn.
 */
import { D, thonCoHeSo, type BoChinhSach } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "./mo-hinh";
import { laDatNN, tinhHo } from "./tinh-ho";
import { khongDau } from "./tim-kiem";
import { soD } from "./so";

const chuan = (s: string) => ` ${khongDau(s).replace(/[^a-z0-9/]+/g, " ").replace(/\s+/g, " ").trim()} `;

/** Tổ, thôn trong Phụ lục của xã xuất hiện nguyên cụm trong chuỗi (địa chỉ hộ, ghi chú) — gợi ý, cán bộ xác nhận. */
export function goiYThon(cs: BoChinhSach, xa: string, ...chu: (string | undefined)[]): { thon: string; heSo: string }[] {
  const nguon = chuan(chu.filter(Boolean).join(" | "));
  const ds = thonCoHeSo(cs, xa).filter((x) => nguon.includes(chuan(x.thon)));
  // bỏ gợi ý là phần của gợi ý dài hơn (vd. "Tổ 1" nằm trong "Tổ 10")
  return ds.filter((x) => !ds.some((y) => y !== x && chuan(y.thon).includes(chuan(x.thon)))).map((x) => ({ thon: x.thon, heSo: x.heSo }));
}

/** Thửa đất NN có thu hồi, hộ hưởng chuyển đổi nghề, ở xã có tổ thôn trong Phụ lục mà chưa ghi tổ thôn. */
export const thuaThieuThon = (cs: BoChinhSach, duAn: DuAn, h: Ho) =>
  cs.chuyenDoiNghe.theoThon && h.hoTro.chuyenDoiNghe && h.loai !== "TO_CHUC" && thonCoHeSo(cs, duAn.xa).length
    ? h.thua.filter((t) => laDatNN(t.loaiDat) && soD(t.dienTichThuHoi).gt(0) && !t.thonBan?.length)
    : [];

export interface DongTacDong {
  duAn: DuAn;
  boDangDung: string;
  dungBoCu: boolean;
  /** Bản phương án đã phê duyệt (số QĐ, ngày) */
  paDaDuyet: { so: string; ngay: string }[];
  soHo: number;
  soThuaThieuThon: number;
  soHoThieuThon: number;
  /** Chỉ khi dùng bộ cũ: tổng tạm tính theo bộ cũ / bộ mới (chỉ cộng khoản Tạm tính) và số khoản thành Cần xác nhận */
  tongCu?: Decimal;
  tongMoi?: Decimal;
  soKhoanCanXacNhanMoi?: number;
  deXuat: string;
}

export function raSoatQd64(dsDuAn: DuAn[], hoCua: (id: string) => Ho[], boCs: Record<string, BoChinhSach>, boMoi: string): DongTacDong[] {
  const csMoi = boCs[boMoi]!;
  return dsDuAn.map((d) => {
    const hos = hoCua(d.id);
    const cs = boCs[d.boChinhSach] ?? csMoi;
    const dungBoCu = !!csMoi.chuyenTiep && csMoi.chuyenTiep.boCu === d.boChinhSach;
    const paDaDuyet = (d.phuongAn ?? []).filter((p) => p.trangThai === "DA_PHE_DUYET").map((p) => ({ so: p.pheDuyet?.so ?? "", ngay: p.pheDuyet?.ngay ?? "" }));
    const csXet = dungBoCu ? csMoi : cs;
    const thieu = hos.map((h) => thuaThieuThon(csXet, d, h));
    const r: DongTacDong = {
      duAn: d,
      boDangDung: d.boChinhSach,
      dungBoCu,
      paDaDuyet,
      soHo: hos.length,
      soThuaThieuThon: thieu.reduce((s, x) => s + x.length, 0),
      soHoThieuThon: thieu.filter((x) => x.length).length,
      deXuat: "",
    };
    if (dungBoCu) {
      let cu = D(0), moi = D(0), cxn = 0;
      for (const h of hos) {
        const a = tinhHo(cs, d, h), b = tinhHo(csMoi, { ...d, boChinhSach: boMoi }, h);
        cu = cu.plus(a.tong.tongLamTron);
        moi = moi.plus(b.tong.tongLamTron);
        cxn += b.tatCa.filter((x) => x.dong.trangThai === "CAN_XAC_NHAN").length - a.tatCa.filter((x) => x.dong.trangThai === "CAN_XAC_NHAN").length;
      }
      Object.assign(r, { tongCu: cu, tongMoi: moi, soKhoanCanXacNhanMoi: Math.max(0, cxn) });
    }
    r.deXuat = dungBoCu
      ? paDaDuyet.length
        ? "Có phương án đã duyệt: giữ các bản đã duyệt; hộ, đợt chưa duyệt xem chênh lệch rồi quyết định chuyển bộ (k2 Điều 3 QĐ 64/2026)"
        : "Chưa có phương án được duyệt → thuộc trường hợp áp dụng QĐ 64/2026: xem chênh lệch, chuyển bộ"
      : r.soThuaThieuThon
        ? "Ghi tổ, thôn, bản cho các thửa còn thiếu (khoản chuyển đổi nghề đang Cần xác nhận)"
        : "Không cần xử lý";
    return r;
  });
}

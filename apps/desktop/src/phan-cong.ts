/**
 * P3-4 — Phân công cán bộ phụ trách hồ sơ và "Việc của tôi".
 *
 * Phân công là thông tin quản lý nội bộ (Ho.phuTrach = tên đăng nhập); không thay đổi quyền: mọi cán bộ có quyền sửa hồ
 * sơ vẫn sửa được hồ sơ không do mình phụ trách. "Việc của tôi" chỉ tập hợp hồ sơ được giao kèm bước hiện tại, cảnh báo
 * thời hạn (các thời hạn có căn cứ ở trang-thai.ts) và vướng mắc.
 */
import { CAC_BUOC, daQuaBuoc, hoHieuLuc, type DuAn, type Ho } from "./mo-hinh";
import type { KetQuaHo } from "./tinh-ho";
import { canhBaoDuAn, trangThaiHo, vuongMacHo, type CanhBao, type TrangThaiGpmb } from "./trang-thai";
import type { LichLamViec } from "./lich-lam-viec";
import type { GiaiDoanTyLe } from "./chi-tra";

export interface ViecHo {
  duAn: DuAn;
  h: Ho;
  k: KetQuaHo;
  tt: TrangThaiGpmb;
  buoc: { ma: string; ten: string } | null;
  canhBao: CanhBao[];
  vuongMac: { noiDung: string; muc: "CAO" | "TRUNG_BINH" }[];
  /** Điểm ưu tiên: cảnh báo cao, vướng mắc, cảnh báo trung bình. */
  uuTien: number;
}

export function viecCuaToi(
  ten: string,
  dsDuAn: DuAn[],
  hoCua: (duAnId: string) => Ho[],
  tinh: (duAn: DuAn, h: Ho) => KetQuaHo,
  homNay: string,
  lich?: LichLamViec,
  tyLeCham?: GiaiDoanTyLe[],
): ViecHo[] {
  if (!ten) return [];
  const out: ViecHo[] = [];
  for (const duAn of dsDuAn) {
    const ds = hoCua(duAn.id).filter((h) => h.phuTrach === ten && !h.daXoa).map((h) => ({ h, k: tinh(duAn, h) }));
    if (!ds.length) continue;
    const cb = canhBaoDuAn(duAn, ds, homNay, lich, tyLeCham).filter((c) => c.hoId);
    for (const { h, k } of ds) {
      const hl = hoHieuLuc(duAn, h);
      const b = CAC_BUOC.find((x) => !daQuaBuoc(hl.tienDo[x.ma]?.trangThai));
      const c = cb.filter((x) => x.hoId === h.id);
      const vm = vuongMacHo(duAn, h, k, homNay);
      out.push({
        duAn, h, k,
        tt: trangThaiHo(duAn, h, k, homNay),
        buoc: b ? { ma: b.ma, ten: b.ten } : null,
        canhBao: c,
        vuongMac: vm,
        uuTien: c.filter((x) => x.muc === "CAO").length * 100 + vm.length * 10 + c.filter((x) => x.muc === "TRUNG_BINH").length,
      });
    }
  }
  return out.sort((a, b) => b.uuTien - a.uuTien || a.duAn.ten.localeCompare(b.duAn.ten, "vi") || a.h.ma.localeCompare(b.h.ma, "vi", { numeric: true }));
}

/** Số hồ sơ theo cán bộ phụ trách (một dự án hoặc nhiều dự án); "" = chưa phân công. */
export function demPhanCong(hos: Ho[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const h of hos) if (!h.daXoa) m.set(h.phuTrach ?? "", (m.get(h.phuTrach ?? "") ?? 0) + 1);
  return m;
}

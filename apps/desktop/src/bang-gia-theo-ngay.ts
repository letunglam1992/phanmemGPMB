/**
 * Bảng giá đất áp dụng tại một thời điểm định giá: NQ 152/2025/NQ-HĐND, cộng các nghị quyết sửa đổi đã có hiệu lực
 * (hiện có NQ 28/2026/NQ-HĐND, hiệu lực 01/11/2026 — tệp policy/nguon/nq28-2026-sua-doi-bang-gia-dat.json,
 * dựng bằng tools/extract/nq28_2026.mjs).
 *
 * - Phụ lục I–III: thêm tuyến vào Bảng 05, 06, 07 (dòng có `van_ban` = NQ 28, STT để trống như phụ biểu);
 * - Phụ lục IV: đổi tên tuyến / tên nhóm tuyến (giữ STT, giá của NQ 152; ghi tên cũ trong `thay_doi`);
 * - Phụ lục V: bỏ tuyến khỏi bảng (liệt kê ở `da_bai_bo` để tra lại).
 * Thời điểm trước ngày hiệu lực → giữ nguyên NQ 152 (k1 Điều 3 NQ 28/2026: phương án đã duyệt giữ theo phương án đã duyệt).
 */
import type { BangGiaDat, DongGiaTuyen } from "./du-lieu";

export const VB_NQ152 = "NQ 152/2025/NQ-HĐND";
type KhoaBang = "dat_o" | "dat_tmdv" | "dat_skc";

interface KhoaDong { bang: string; xa: string; stt: string; tuyen: string }
export interface SuaDoiBangGia {
  van_ban: string;
  hieu_luc_tu: string;
  chuyen_tiep?: string;
  bo_sung: Record<KhoaBang, DongGiaTuyen[]>;
  doi_ten: (KhoaDong & { loai: "TUYEN" | "NHOM"; ten_cu: string; ten_moi: string; can_cu: string })[];
  bai_bo: (KhoaDong & { can_cu: string })[];
  canh_bao: Record<string, string[]>;
}

const khoaCua = (r: KhoaDong) => `${r.bang}\u0001${r.xa}\u0001${r.stt}\u0001${r.tuyen}`;
const VB_NGAN = (vb: string) => (vb.match(/(\d+\/\d{4}\/NQ-HĐND)/)?.[1] ? `NQ ${vb.match(/(\d+\/\d{4}\/NQ-HĐND)/)![1]}` : vb);

/** Ngày hôm nay theo giờ máy (ISO yyyy-mm-dd). */
export function homNay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Áp các văn bản sửa đổi có hiệu lực tại `ngay` lên bảng NQ 152 (không sửa đối tượng gốc). */
export function bangGiaTheoNgay(goc: BangGiaDat, dsSuaDoi: SuaDoiBangGia[], ngay: string): BangGiaDat {
  const hl = dsSuaDoi.filter((s) => ngay >= s.hieu_luc_tu).sort((a, b) => a.hieu_luc_tu.localeCompare(b.hieu_luc_tu));
  const ra: BangGiaDat = { ...goc, dat_o: [...goc.dat_o], dat_tmdv: [...goc.dat_tmdv], dat_skc: [...goc.dat_skc], ap_dung: { ngay, van_ban: [goc.van_ban, ...hl.map((s) => s.van_ban)] }, da_bai_bo: [] };
  for (const s of hl) {
    const vb = VB_NGAN(s.van_ban);
    const doi = new Map<string, SuaDoiBangGia["doi_ten"]>();
    for (const d of s.doi_ten) doi.set(khoaCua(d), [...(doi.get(khoaCua(d)) ?? []), d]);
    const bo = new Map(s.bai_bo.map((b) => [khoaCua(b), b]));
    for (const k of ["dat_o", "dat_tmdv", "dat_skc"] as KhoaBang[]) {
      const moi: DongGiaTuyen[] = [];
      for (const r of ra[k]) {
        const b = bo.get(khoaCua(r));
        if (b) { ra.da_bai_bo!.push({ ...r, thay_doi: [...(r.thay_doi ?? []), `Bãi bỏ từ ${hien(s.hieu_luc_tu)} theo ${b.can_cu}`] }); continue; }
        const ds = doi.get(khoaCua(r));
        if (!ds) { moi.push(r); continue; }
        let x: DongGiaTuyen = { ...r, thay_doi: [...(r.thay_doi ?? [])] };
        for (const d of ds) {
          if (d.loai === "NHOM") { x.thay_doi!.push(`Tên nhóm cũ: “${x.nhom}” — điều chỉnh theo ${d.can_cu}`); x = { ...x, nhom: d.ten_moi }; }
          else { x.thay_doi!.push(`Tên cũ: “${x.tuyen}” — điều chỉnh theo ${d.can_cu}`); x = { ...x, tuyen: d.ten_moi }; }
        }
        x.van_ban = `${r.van_ban ?? VB_NQ152}, sửa đổi bởi ${vb}`;
        moi.push(x);
      }
      // Tuyến bổ sung đặt ngay sau dòng cuối cùng của cùng xã (giữ thứ tự xã như NQ 152)
      for (const r of s.bo_sung[k] ?? []) {
        const viTri = moi.map((t) => t.xa).lastIndexOf(r.xa);
        moi.splice(viTri < 0 ? moi.length : viTri + 1, 0, { ...r, van_ban: vb, thay_doi: [`Bổ sung từ ${hien(s.hieu_luc_tu)} theo ${r.can_cu ?? vb}`] });
      }
      ra[k] = moi;
    }
  }
  return ra;
}

const hien = (iso: string) => iso.split("-").reverse().join("/");

/** Mô tả nguồn một dòng tuyến để ghi vào hồ sơ (văn bản, bảng, xã, STT/căn cứ bổ sung, tuyến, vị trí). */
export function nguonDongTuyen(r: DongGiaTuyen, viTri?: number): string {
  const vb = r.van_ban ?? VB_NQ152;
  const stt = r.stt ? `STT ${r.stt}` : r.can_cu ?? "";
  return `${vb}, Bảng ${r.bang}, ${r.xa}, ${stt} (${r.tuyen})${viTri ? `, VT${viTri}` : ""}`;
}

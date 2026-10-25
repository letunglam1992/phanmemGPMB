/**
 * 1.3.1 — NQ 28/2026/NQ-HĐND ngày 19/10/2026 sửa đổi, bổ sung Quy định bảng giá đất ban hành kèm NQ 152/2025/NQ-HĐND (hiệu lực
 * 01/11/2026 — Điều 4): Điều 1 bổ sung tuyến Bảng 05, 06, 07 (Phụ lục I–III), sửa tên (Phụ lục IV), bãi bỏ tuyến (Phụ lục V),
 * bổ sung khoản 8 Điều 7 (đất TMDV có nguồn gốc đất ở = 90% giá đất ở cùng vị trí, tuyến); Điều 2 bãi bỏ khoản 3 Điều 4 (giảm do
 * chênh cao); Điều 3 chuyển tiếp (phương án đã phê duyệt trước 01/11/2026 tiếp tục theo phương án đã duyệt).
 * Dữ liệu: policy/nguon/nq28-2026-sua-bang-gia-dat.json (tools/gia-dat/doc-nq28.py) — mỗi dòng sửa tên, bãi bỏ đã khớp với dòng
 * NQ 152 theo từng bảng. Phần mềm không tự chọn kỳ áp dụng cho phương án: cán bộ chọn "trước/từ 01/11/2026" khi chọn giá.
 */
import { D } from "@gpmb/core";
import type { BangGiaDat, DongGiaTuyen } from "./du-lieu";

type Khop = Partial<Record<"05" | "06" | "07", { stt: string; tuyen: string }>>;
export interface SuaBangGia {
  van_ban: string;
  sua_doi: string;
  hieu_luc_tu: string;
  luu_y_nguon: string;
  bo_sung: { dat_o: DongGiaTuyen[]; dat_tmdv: DongGiaTuyen[]; dat_skc: DongGiaTuyen[] };
  doi_ten: { xa: string; stt: string; ten_cu: string; ten_moi: string; ghi_chu: string; khop: Khop; chi_doi_stt?: boolean }[];
  bai_bo: { xa: string; stt: string; ten: string; ghi_chu: string; khop: Khop }[];
  quy_dinh: { vi_tri: string; noi_dung: string }[];
  chua_ap_dung: { trang: string; ly_do: string }[];
}

export const NQ28 = "NQ 28/2026/NQ-HĐND";
const PHU_LUC: Record<string, string> = { "05": "Phụ lục I", "06": "Phụ lục II", "07": "Phụ lục III" };
const KHOA_BANG = { "05": "dat_o", "06": "dat_tmdv", "07": "dat_skc" } as const;
const vn = (iso: string) => iso.split("-").reverse().join("/");

/** Bảng giá áp dụng tại ngày: trước hiệu lực NQ 28 → NQ 152 nguyên bản; từ hiệu lực → đã sửa đổi, bổ sung, bãi bỏ. */
export function bangGiaTheoNgay(bang: BangGiaDat, sua: SuaBangGia, ngay: string): BangGiaDat {
  if (ngay < sua.hieu_luc_tu) return bang;
  const out: BangGiaDat = { ...bang, van_ban: `${bang.van_ban} (sửa đổi, bổ sung bởi ${sua.van_ban})`, luu_y: sua.luu_y_nguon, nq28: true };
  for (const b of ["05", "06", "07"] as const) {
    const k = KHOA_BANG[b];
    const bo = new Set(sua.bai_bo.flatMap((x) => (x.khop[b] ? [`${x.xa}|${x.khop[b]!.stt}|${x.khop[b]!.tuyen}`] : [])));
    const doi = new Map(sua.doi_ten.flatMap((x) => (x.khop[b] ? [[`${x.xa}|${x.khop[b]!.stt}|${x.khop[b]!.tuyen}`, x] as const] : [])));
    const giu = bang[k].filter((r) => !bo.has(`${r.xa}|${r.stt}|${r.tuyen}`)).map((r) => {
      const d = doi.get(`${r.xa}|${r.stt}|${r.tuyen}`);
      if (!d) return r;
      if (d.chi_doi_stt) return { ...r, canh_bao: [...r.canh_bao, `${d.ten_moi} — Phụ lục IV ${sua.van_ban}`] };
      return { ...r, tuyen: d.ten_moi, van_ban: `${sua.van_ban}, Phụ lục IV (sửa tên)`, canh_bao: [...r.canh_bao, `Tên sửa theo Phụ lục IV ${sua.van_ban}, từ ${vn(sua.hieu_luc_tu)} (tên cũ: ${r.tuyen})`] };
    });
    const them = sua.bo_sung[k].map((r) => ({ ...r, van_ban: `${sua.van_ban}, ${PHU_LUC[b]}`, canh_bao: [...r.canh_bao, `Bổ sung theo ${PHU_LUC[b]} ${sua.van_ban}, áp dụng từ ${vn(sua.hieu_luc_tu)}`] }));
    out[k] = [...giu, ...them];
  }
  return out;
}

/** Dòng đã bãi bỏ từ ngày hiệu lực (để báo khi phương án/giá đã chọn trỏ tới tuyến bị bãi bỏ). */
export function tuyenBaiBo(sua: SuaBangGia, xa: string): string[] {
  return sua.bai_bo.filter((x) => x.xa === xa).map((x) => `STT ${x.stt}: ${x.ten}`);
}

/** Kiểm tra phương án: giá hợp lệ theo một trong hai kỳ (trước / từ hiệu lực NQ 28 — Điều 3 chuyển tiếp). */
export function bangGiaHaiKy(bang: BangGiaDat, sua: SuaBangGia): BangGiaDat {
  const moi = bangGiaTheoNgay(bang, sua, sua.hieu_luc_tu);
  const them = (cu: DongGiaTuyen[], m: DongGiaTuyen[]) => [...cu, ...m.filter((r) => r.van_ban)];
  return { ...bang, dat_o: them(bang.dat_o, moi.dat_o), dat_tmdv: them(bang.dat_tmdv, moi.dat_tmdv), dat_skc: them(bang.dat_skc, moi.dat_skc) };
}

/**
 * Khoản 8 Điều 7 (bổ sung bởi khoản 6 Điều 1 NQ 28/2026): đất TMDV của hộ gia đình, cá nhân sử dụng ổn định lâu dài có nguồn gốc
 * đất ở = 90% đơn giá đất ở cùng vị trí, cùng tuyến (Bảng 05). Trả giá nghìn đồng/m² (Decimal, không làm tròn — đơn vị tự làm tròn
 * theo quy định nếu có).
 */
export const TY_LE_K8 = "0.9";
export const giaTmdTuDatO = (giaDatONghin: number | string) => D(giaDatONghin).mul(TY_LE_K8).toString();

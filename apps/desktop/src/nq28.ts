/**
 * 1.3.1 — Rà soát áp dụng NQ 28/2026/NQ-HĐND (sửa bảng giá đất NQ 152/2025, hiệu lực 01/11/2026): thửa đang dùng giá theo tuyến
 * bị bãi bỏ (Phụ lục V) hoặc đổi tên (Phụ lục IV), giá nhập tay có giảm do chênh cao (khoản 3 Điều 4 đã bãi bỏ — Điều 2).
 * Hộ thuộc phương án đã phê duyệt → khoản 1 Điều 3 (chuyển tiếp: tiếp tục theo phương án đã duyệt). Chỉ rà soát, gợi ý tuyến
 * bổ sung tách từ tuyến bị bãi bỏ — không tự đổi giá.
 */
import type { DuAn, GiaThua, Ho } from "./mo-hinh";
import type { SuaBangGia } from "./bang-gia-nq28";
import { hoDaPheDuyet } from "./phuong-an";
import { khongDau } from "./tim-kiem";

export type LoaiNq28 = "BAI_BO" | "DOI_TEN" | "CHENH_CAO";
export interface DongNq28 {
  duAn: DuAn;
  ho: Ho;
  thuaId: string;
  thua: string;
  loai: LoaiNq28;
  nguon: string;
  /** Hộ có trong phương án đã phê duyệt (khoản 1 Điều 3 NQ 28 — giữ theo phương án đã duyệt) */
  daDuyet: boolean;
  noiDung: string;
  /** Tuyến bổ sung có ghi chú tách từ / bổ sung sau STT của tuyến bị bãi bỏ (gợi ý) */
  goiY: string[];
}

/** Đọc nguồn giá do màn chọn giá ghi: "Bảng 05, Xã …, STT 1.4 (tên tuyến), VT2 …" */
export function docNguonTuyen(nguon: string): { bang: string; xa: string; stt: string; tuyen: string } | null {
  const m = /Bảng (0[567]), ([^,]+), STT ([^\s(]+) \((.*)\), VT\d/.exec(nguon);
  return m ? { bang: m[1]!, xa: m[2]!.trim(), stt: m[3]!, tuyen: m[4]! } : null;
}

const giaCuaThua = (t: Ho["thua"][number]): GiaThua[] =>
  [t.gia, t.chenhLech?.giaHienTrang ? { giaNghinDong: t.chenhLech.giaHienTrang, nguon: t.chenhLech.nguonGia ?? "" } : null, t.khongGiayTo?.giaSxkd ?? null, t.khongGiayTo?.giaConLai ?? null].filter(
    (g): g is GiaThua => !!g && !!g.nguon,
  );

export function raSoatNq28(dsDuAn: DuAn[], hoCua: (id: string) => Ho[], sua: SuaBangGia): DongNq28[] {
  const vn = sua.hieu_luc_tu.split("-").reverse().join("/");
  const out: DongNq28[] = [];
  for (const d of dsDuAn) {
    if (d.daXoa || d.tapHuan) continue;
    const duyet = hoDaPheDuyet(d.phuongAn ?? []);
    for (const h of hoCua(d.id)) {
      if (h.daXoa) continue;
      for (const t of h.thua) {
        for (const g of giaCuaThua(t)) {
          const base = { duAn: d, ho: h, thuaId: t.id, thua: `${t.soTo || "?"}/${t.soThua || "?"}`, nguon: g.nguon, daDuyet: duyet.has(h.id) };
          const n = docNguonTuyen(g.nguon);
          if (n) {
            const k = n.bang as "05" | "06" | "07";
            const bo = sua.bai_bo.find((x) => x.khop[k]?.stt === n.stt && x.khop[k]?.tuyen === n.tuyen && x.xa === n.xa);
            if (bo) {
              const goiY = sua.bo_sung[k === "05" ? "dat_o" : k === "06" ? "dat_tmdv" : "dat_skc"]
                .filter((r) => r.xa === n.xa && new RegExp(`(tách từ tuyến đường|STT|mục|mã)\\s*${n.stt.replace(/\./g, "\\.")}(?![\\d.])`, "i").test((r as { vi_tri_bo_sung?: string }).vi_tri_bo_sung ?? ""))
                .map((r) => `${r.tuyen}: ${r.vt.map((v, i) => `VT${i + 1} ${v ?? "—"}`).join(", ")}`);
              out.push({ ...base, loai: "BAI_BO", noiDung: `Tuyến STT ${n.stt} Bảng ${n.bang} bị bãi bỏ từ ${vn} (Phụ lục V ${sua.van_ban.split(" ngày")[0]})`, goiY });
              continue;
            }
            const doi = sua.doi_ten.find((x) => !x.chi_doi_stt && x.khop[k]?.stt === n.stt && x.khop[k]?.tuyen === n.tuyen && x.xa === n.xa);
            if (doi) out.push({ ...base, loai: "DOI_TEN", noiDung: `Tên tuyến sửa từ ${vn} thành "${doi.ten_moi}" (Phụ lục IV) — giá không đổi; cập nhật nguồn giá khi lập phương án sau ${vn}`, goiY: [] });
          } else if (/^nhap tay/.test(khongDau(g.nguon)) && /chenh (lech )?cao|k3 d4|khoan 3 dieu 4/.test(khongDau(g.nguon))) {
            out.push({ ...base, loai: "CHENH_CAO", noiDung: `Giá nhập tay có giảm do chênh cao — khoản 3 Điều 4 NQ 152 bãi bỏ từ ${vn} (Điều 2 ${sua.van_ban.split(" ngày")[0]})`, goiY: [] });
          }
        }
      }
    }
  }
  return out;
}

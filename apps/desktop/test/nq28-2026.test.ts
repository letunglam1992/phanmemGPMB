/** 1.3.1 — NQ 28/2026/NQ-HĐND sửa đổi, bổ sung bảng giá đất NQ 152/2025 (hiệu lực 01/11/2026). */
import { describe, expect, it } from "vitest";
import nq152 from "../../../policy/nguon/nq152-2025-bang-gia-dat.json";
import nq28 from "../../../policy/nguon/nq28-2026-sua-bang-gia-dat.json";
import { bangGiaHaiKy, bangGiaTheoNgay, giaTmdTuDatO, type SuaBangGia } from "../src/bang-gia-nq28";
import type { BangGiaDat } from "../src/du-lieu";

const bang = nq152 as unknown as BangGiaDat;
const sua = nq28 as unknown as SuaBangGia;
const tim = (b: BangGiaDat, k: "dat_o" | "dat_tmdv" | "dat_skc", xa: string, chu: string) => b[k].filter((r) => r.xa === xa && r.tuyen.includes(chu));

describe("Dữ liệu NQ 28/2026", () => {
  it("đủ phụ lục: 132 tuyến bổ sung mỗi bảng 05, 06, 07; mọi dòng sửa tên, bãi bỏ đã khớp NQ 152; hiệu lực 01/11/2026", () => {
    expect(sua.hieu_luc_tu).toBe("2026-11-01");
    expect(sua.bo_sung.dat_o).toHaveLength(132);
    expect(sua.bo_sung.dat_tmdv).toHaveLength(132);
    expect(sua.bo_sung.dat_skc).toHaveLength(132);
    expect(sua.doi_ten.length).toBeGreaterThanOrEqual(100);
    expect(sua.bai_bo.length).toBeGreaterThanOrEqual(20);
    expect((nq28 as { chua_khop: unknown[] }).chua_khop).toEqual([]);
    for (const d of [...sua.doi_ten, ...sua.bai_bo]) expect(Object.keys(d.khop).length).toBeGreaterThan(0);
    // giá là số, đúng xã trong danh mục, ít nhất một vị trí có giá
    for (const r of [...sua.bo_sung.dat_o, ...sua.bo_sung.dat_tmdv, ...sua.bo_sung.dat_skc]) {
      expect(bang.danh_muc_xa).toContain(r.xa);
      expect(r.vt.some((g) => typeof g === "number" && g > 0)).toBe(true);
    }
    expect(sua.chua_ap_dung.map((x) => x.trang).join()).toContain("NTD");
  });
});

describe("Áp dụng theo ngày", () => {
  it("trước 01/11/2026: NQ 152 nguyên bản", () => {
    expect(bangGiaTheoNgay(bang, sua, "2026-10-31")).toBe(bang);
  });
  it("từ 01/11/2026: bổ sung (Phụ lục I), bãi bỏ (Phụ lục V), sửa tên (Phụ lục IV) — đối chiếu số liệu phụ biểu", () => {
    const m = bangGiaTheoNgay(bang, sua, "2026-11-01");
    expect(m.van_ban).toBe("NQ 152/2025/NQ-HĐND ngày 29/12/2025 (sửa đổi, bổ sung bởi NQ 28/2026/NQ-HĐND ngày 19/10/2026)");
    // PL I: Đoàn Kết "Từ km 46+800 theo Quốc lộ 43 đến Km 45+590" 640/390/290/190/140; PL II TMD 410…; PL III SKC 340…
    const o = tim(m, "dat_o", "Xã Đoàn Kết", "Từ km 46+800 theo Quốc lộ 43 đến Km 45+590");
    expect(o).toHaveLength(1);
    expect(o[0]!.vt).toEqual([640, 390, 290, 190, 140]);
    expect(o[0]!.van_ban).toBe("NQ 28/2026/NQ-HĐND ngày 19/10/2026, Phụ lục I");
    expect(tim(m, "dat_tmdv", "Xã Đoàn Kết", "Từ km 46+800")[0]!.vt).toEqual([410, 250, 190, 120, 85]);
    expect(tim(m, "dat_skc", "Xã Đoàn Kết", "Từ km 46+800")[0]!.vt).toEqual([340, 205, 155, 100, 80]);
    // PL V: bãi bỏ tuyến 1.4 Đoàn Kết "Từ Km 46+800 theo Quốc lộ 43 đến Nhà văn hóa bản Đoàn Kết" (tách thành 2 tuyến mới)
    const bo = "Từ Km 46+800 theo Quốc lộ 43 đến Nhà văn hóa bản Đoàn Kết";
    expect(tim(bang, "dat_o", "Xã Đoàn Kết", bo)).toHaveLength(1);
    expect(tim(m, "dat_o", "Xã Đoàn Kết", bo)).toHaveLength(0);
    expect(tim(m, "dat_skc", "Xã Đoàn Kết", bo)).toHaveLength(0);
    // PL IV: Tô Múa 3.2 "…bản Liên Hưng" → "…bản Hợp Nhất", giữ giá
    const cu = tim(bang, "dat_o", "Xã Tô Múa", "Từ hết đất nhà máy chè Tô Múa đến hết đất khu dân cư bản Liên Hưng")[0]!;
    const moi = m.dat_o.find((r) => r.xa === "Xã Tô Múa" && r.stt === cu.stt && r.tuyen.includes("bản Hợp Nhất"))!;
    expect(moi.vt).toEqual(cu.vt);
    expect(moi.canh_bao.join()).toContain("tên cũ:");
    // số dòng: + bổ sung − bãi bỏ (theo bảng có khớp)
    const boO = sua.bai_bo.filter((x) => x.khop["05"]).length;
    expect(m.dat_o.length).toBe(bang.dat_o.length + 132 - boO);
  });
  it("kiểm tra phương án nhận giá cả hai kỳ; khoản 8 Điều 7: TMDV gốc đất ở = 90% giá đất ở", () => {
    const h = bangGiaHaiKy(bang, sua);
    expect(h.dat_o.length).toBeGreaterThan(bang.dat_o.length + 132 - 1);
    expect(tim(h, "dat_o", "Xã Đoàn Kết", "Từ Km 46+800 theo Quốc lộ 43 đến Nhà văn hóa bản Đoàn Kết")).toHaveLength(1);
    expect(giaTmdTuDatO(640)).toBe("576");
    expect(giaTmdTuDatO(1050)).toBe("945");
    expect(giaTmdTuDatO(155)).toBe("139.5");
  });
});

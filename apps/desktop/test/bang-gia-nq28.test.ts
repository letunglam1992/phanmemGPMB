import { describe, expect, it } from "vitest";
import nq152 from "../../../policy/nguon/nq152-2025-bang-gia-dat.json";
import nq28 from "../../../policy/nguon/nq28-2026-sua-doi-bang-gia-dat.json";
import phuLuc from "../../../policy/nguon/nq28-2026-phu-luc.json";
import { bangGiaTheoNgay, nguonDongTuyen, type SuaDoiBangGia } from "../src/bang-gia-theo-ngay";
import type { BangGiaDat } from "../src/du-lieu";

const goc = nq152 as unknown as BangGiaDat;
const sd = nq28 as unknown as SuaDoiBangGia;
const BANG = { "05": "dat_o", "06": "dat_tmdv", "07": "dat_skc" } as const;

describe("Bảng giá đất theo thời điểm — NQ 28/2026/NQ-HĐND (hiệu lực 01/11/2026)", () => {
  const truoc = bangGiaTheoNgay(goc, [sd], "2026-10-31");
  const sau = bangGiaTheoNgay(goc, [sd], "2026-11-01");

  it("trước 01/11/2026 giữ nguyên NQ 152 (k1 Đ3: phương án đã duyệt giữ theo phương án đã duyệt)", () => {
    expect(truoc.dat_o).toEqual(goc.dat_o);
    expect(truoc.dat_tmdv).toEqual(goc.dat_tmdv);
    expect(truoc.ap_dung!.van_ban).toEqual([goc.van_ban]);
  });

  it("Phụ lục I–III: đủ 132 tuyến bổ sung mỗi bảng, đúng giá phụ biểu", () => {
    expect(sd.hieu_luc_tu).toBe("2026-11-01");
    for (const [pl, k] of [["plI", "dat_o"], ["plII", "dat_tmdv"], ["plIII", "dat_skc"]] as const) {
      const bs = sau[k].filter((r) => r.van_ban === "NQ 28/2026/NQ-HĐND");
      expect(bs).toHaveLength(132);
      const nguon = (phuLuc as unknown as Record<string, { xa: string; ten: string; vt: (number | null)[] }[]>)[pl]!;
      const khoa = (x: [string, string, (number | null)[]]) => JSON.stringify(x);
      expect(bs.map((r) => khoa([r.xa, r.tuyen, r.vt])).sort()).toEqual(nguon.map((r) => khoa([r.xa, r.ten, r.vt])).sort());
    }
    const dk = sau.dat_o.find((r) => r.xa === "Xã Đoàn Kết" && r.tuyen === "Từ km 46+800 theo Quốc lộ 43 đến Km 45+590")!;
    expect(dk.vt).toEqual([640, 390, 290, 190, 140]);
    expect(nguonDongTuyen(dk, 1)).toMatch(/^NQ 28\/2026\/NQ-HĐND, Bảng 05, Xã Đoàn Kết, Phụ lục I .*VT1$/);
  });

  it("Phụ lục V: bãi bỏ đúng số dòng; số dòng sau = NQ 152 − bãi bỏ + bổ sung", () => {
    for (const [b, k] of Object.entries(BANG)) {
      const bo = sd.bai_bo.filter((x) => x.bang === b).length;
      expect(sau[k].length).toBe(goc[k].length - bo + 132);
    }
    expect(sau.da_bai_bo).toHaveLength(sd.bai_bo.length);
    expect(sau.dat_o.some((r) => r.xa === "Xã Đoàn Kết" && r.tuyen === "Từ Km 46+800 theo Quốc lộ 43 đến Nhà văn hóa bản Đoàn Kết")).toBe(false);
  });

  it("mỗi dòng đổi tên / bãi bỏ khớp đúng một dòng NQ 152 (không khớp nhầm)", () => {
    const dem = new Map<string, number>();
    for (const k of Object.values(BANG)) for (const r of goc[k]) { const kk = `${r.bang}|${r.xa}|${r.stt}|${r.tuyen}`; dem.set(kk, (dem.get(kk) ?? 0) + 1); }
    for (const x of [...sd.doi_ten, ...sd.bai_bo]) expect(dem.get(`${x.bang}|${x.xa}|${x.stt}|${x.tuyen}`), `${x.bang} ${x.xa} ${x.stt}`).toBe(1);
  });

  it("Phụ lục IV: Chiềng La — Phụ lục ghi STT 3.1 nhưng áp theo tên ở STT 3.3 NQ 152, có cảnh báo", () => {
    for (const k of Object.values(BANG)) {
      const r = sau[k].find((x) => x.xa === "Xã Chiềng La" && x.stt === "3.3")!;
      expect(r.tuyen).toBe("Đoạn đường từ cầu bản Hình đến giáp đất xã Mường Khiêng");
      expect(r.thay_doi!.join()).toMatch(/Tên cũ: “Từ đất nhà Lò Văn Xôm đến đất nhà ông Quàng Văn Ngấn”.*Phụ lục IV.*STT 3\.1/);
      // STT 3.1 (tuyến Đồng Văn Hiệu) giữ nguyên tên
      expect(sau[k].find((x) => x.xa === "Xã Chiềng La" && x.stt === "3.1")!.tuyen).toMatch(/Đồng Văn Hiệu/);
    }
    expect(sd.canh_bao.lech_stt!.filter((x) => /Chiềng La.*STT 3\.1.*STT 3\.3/.test(x))).toHaveLength(3);
  });

  it("Phụ lục IV: đổi tên nhóm tuyến giữ STT, giá NQ 152", () => {
    const nhom = sd.doi_ten.find((x) => x.loai === "NHOM")!;
    const k = BANG[nhom.bang as keyof typeof BANG];
    const r0 = goc[k].find((r) => r.xa === nhom.xa && r.stt === nhom.stt && r.tuyen === nhom.tuyen)!;
    const r = sau[k].find((x) => x.xa === nhom.xa && x.stt === nhom.stt && x.tuyen === nhom.tuyen)!;
    expect(r.nhom).toBe(nhom.ten_moi);
    expect(r.vt).toEqual(r0.vt);
    expect(r.van_ban).toBe("NQ 152/2025/NQ-HĐND, sửa đổi bởi NQ 28/2026/NQ-HĐND");
  });

  it("bảng khác nhau cùng STT không bị khớp nhầm: Phiêng Pằn STT 3.3 chỉ bãi bỏ ở Bảng 05", () => {
    const bo = sd.bai_bo.filter((x) => x.xa === "Xã Phiêng Pằn" && x.stt === "3.3");
    expect(bo.map((x) => x.bang)).toEqual(["05"]);
    expect(sd.canh_bao.khong_khop!.join()).toMatch(/Phiêng Pằn, Bảng 06, STT 3\.3/);
  });
});

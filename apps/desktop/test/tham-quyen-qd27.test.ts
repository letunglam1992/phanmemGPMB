import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THAM_QUYEN_QD27, canhBaoThamQuyen, QD27 } from "../src/van-ban/tham-quyen";
import { mauTheoMa } from "../src/van-ban/danh-muc";
import { canhBaoCanCu } from "../src/van-ban-can-cu";
import { CAN_CU_MAC_DINH } from "../src/van-ban/du-lieu";
import { chuanHoaChu } from "../src/doi-chieu-quy-trinh";

const nguon = chuanHoaChu(readFileSync(new URL("../../../policy/nguon/qd27-2026-phan-cap-uy-quyen-dat-dai.md", import.meta.url), "utf8"));

describe("QĐ 27/2026 — thẩm quyền Chủ tịch UBND cấp xã", () => {
  it("nội dung phân cấp có nguyên văn trong Phụ lục II", () => {
    for (const t of Object.values(THAM_QUYEN_QD27)) expect(nguon).toContain(t.noiDung.replace(/ \(.*\)$/, ""));
    expect(nguon).toContain("hết hiệu lực thi hành từ ngày 01 tháng 3 năm 2027");
    expect(nguon).toContain("Quyết định giá bán nhà ở tái định cư đối với trường hợp bố trí nhà ở tái định cư tại địa bàn cấp xã khác với địa bàn cấp xã có đất thu hồi.");
  });
  it("mô tả mẫu ghi thẩm quyền; mẫu không có trong QĐ 27 giữ căn cứ NĐ 151", () => {
    expect(mauTheoMa("15").moTa).toContain("khoản 1, 2 mục I Phụ lục II QĐ 27/2026/QĐ-UBND");
    expect(mauTheoMa("T26").moTa).toContain("khoản 3 mục II Phụ lục II");
    expect(mauTheoMa("T17").moTa).toContain("khoản 7 mục I Phụ lục II");
    expect(mauTheoMa("T16").moTa).not.toContain("27/2026");
    expect(mauTheoMa("06").moTa).not.toContain("27/2026");
  });
  it("ngày ký ngoài thời gian hiệu lực → cảnh báo", () => {
    expect(canhBaoThamQuyen("15", "2026-10-23")).toEqual([]);
    expect(canhBaoThamQuyen("15", "2027-03-01")[0]).toContain("hết hiệu lực");
    expect(canhBaoThamQuyen("14", "2026-06-29")[0]).toContain("khoản 1 Điều 5");
    expect(canhBaoThamQuyen("T16", "2027-05-01")).toEqual([]);
  });
  it("căn cứ mặc định có QĐ 27; dẫn sau 01/3/2027 thì cảnh báo", () => {
    const c = CAN_CU_MAC_DINH.find((x) => x.includes(QD27.so))!;
    expect(c).toBeTruthy();
    expect(canhBaoCanCu([c], "2026-12-01")).toEqual([]);
    expect(canhBaoCanCu([c], "2027-03-02")[0]).toContain("hết hiệu lực");
  });
});

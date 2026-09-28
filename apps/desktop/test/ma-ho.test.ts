/** P0-3: mã hồ sơ theo mẫu do người dùng đặt, không trùng trong dự án. */
import { describe, expect, it } from "vitest";
import { boSinhMa, hoTrungMa, loiMauMa, maHoTiepTheo, nhomMaTrung, taoMa } from "../src/ma-ho";

describe("Mã hồ sơ", () => {
  it("tạo mã theo mẫu", () => {
    expect(taoMa("H###", 7)).toBe("H007");
    expect(taoMa("CM-2026-####", 12)).toBe("CM-2026-0012");
    expect(taoMa("TH/##/CB", 3)).toBe("TH/03/CB");
    expect(taoMa("H###", 1234)).toBe("H1234");
  });
  it("mã kế tiếp = số lớn nhất theo mẫu + 1 (xóa một hộ rồi thêm không trùng; mã khác mẫu không tính)", () => {
    expect(maHoTiepTheo([], "H###")).toBe("H001");
    expect(maHoTiepTheo(["H001", "H003"], "H###")).toBe("H004");
    expect(maHoTiepTheo(["h01", "H02", "X99"], "H###")).toBe("H003");
    expect(maHoTiepTheo(["CM-2026-0009", "H050"], "CM-2026-####")).toBe("CM-2026-0010");
  });
  it("sinh nhiều mã liên tiếp không trùng", () => {
    const sinh = boSinhMa(["H001", "H002"], "H###");
    expect([sinh(), sinh(), sinh()]).toEqual(["H003", "H004", "H005"]);
  });
  it("kiểm trùng không phân biệt hoa thường, khoảng trắng; bỏ qua chính hồ sơ", () => {
    const ds = [{ id: "a", ma: "H001", ten: "A" }, { id: "b", ma: "h002 ", ten: "B" }];
    expect(hoTrungMa(ds, " h001")?.id).toBe("a");
    expect(hoTrungMa(ds, "H001", "a")).toBeNull();
    expect(hoTrungMa(ds, "H002")?.id).toBe("b");
    expect(nhomMaTrung([...ds, { id: "c", ma: "H001", ten: "C" }])).toEqual([{ ma: "H001", ho: [ds[0], { id: "c", ma: "H001", ten: "C" }] }]);
  });
  it("kiểm tra mẫu mã", () => {
    expect(loiMauMa("H###")).toBeNull();
    expect(loiMauMa("A##B##")).toMatch(/một dãy/);
    expect(loiMauMa("H*##")).toMatch(/ký tự/);
  });
});

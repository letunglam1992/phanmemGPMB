/** Tìm thửa bản đồ của thửa hồ sơ (nút 🗺 ở Thửa đất). */
import { describe, expect, it } from "vitest";
import type { ThuaBanDo } from "@gpmb/gis";
import { timThuaBanDo } from "../src/man/ho/XemThuaBanDo";

const tb = (ma: string, soTo: string | null, soThua: string | null): ThuaBanDo => ({ ma, soTo, soThua, loaiDatBanDo: null, dienTichGhi: null, dienTichHinhHoc: 1, chuSuDung: null, vong: [], tamNhan: { x: 0, y: 0 }, nhan: [], co: [] });
const ds = [tb("T7-1", "7", "1"), tb("T7-2", "7", "2"), tb("V3", null, null)];
describe("timThuaBanDo", () => {
  it("theo mã đã gắn", () => expect(timThuaBanDo(ds, { maBanDo: "V3", soTo: "", soThua: "" })).toMatchObject({ tb: { ma: "V3" }, theo: "MA" }));
  it("theo số tờ, số thửa, bỏ số 0 đầu", () => expect(timThuaBanDo(ds, { soTo: "07", soThua: "002" })).toMatchObject({ tb: { ma: "T7-2" }, theo: "SO" }));
  it("mã đã gắn khác số tờ hồ sơ, không thửa nào khớp số → vẫn theo mã (giao diện cảnh báo lệch)", () => expect(timThuaBanDo(ds, { maBanDo: "T7-1", soTo: "8", soThua: "1" })).toMatchObject({ tb: { ma: "T7-1" }, theo: "MA" }));
  it("không thấy", () => expect(timThuaBanDo(ds, { soTo: "9", soThua: "1" })).toBeNull());
});

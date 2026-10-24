/** 1.3.1: tệp cấu hình thẩm quyền (B2), chặn mềm ngoài hiệu lực (B3), số liệu phân cấp ghi tay ở máy tỉnh (A2). */
import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import PizZip from "pizzip";
import { QD27_MAC_DINH, datCauHinhThamQuyen, docTepCauHinhThamQuyen, tepCauHinhThamQuyen, xacNhanThamQuyen } from "../src/van-ban/tham-quyen";
import { duLieuBaoCaoPhanCapTinh, gopPhanCapGhiTay, loiPhanCapGhiTay, type PhanCapGhiTay } from "../src/tong-hop-tinh/dien-bien";
import { dienMau } from "../src/van-ban/dien-mau";

afterEach(() => datCauHinhThamQuyen(null));

describe("1.3.1 (B2) — tệp cấu hình thẩm quyền phân cấp", () => {
  const moi = { ...QD27_MAC_DINH, so: "05/2027/QĐ-UBND", hieuLucTu: "2027-03-01", hetHieuLucTu: "", nguoi: "Sở", luc: "2027-02-20T00:00:00Z" };
  it("xuất rồi nạp lại giữ nguyên nội dung; không mang người, lúc cập nhật của máy lập", () => {
    const t = tepCauHinhThamQuyen(moi, "Sở NN&MT (thử)", "2027-02-20T08:00:00Z");
    expect(t).not.toContain("\"nguoi\"");
    const d = docTepCauHinhThamQuyen(t);
    expect(d.nguoiLap).toBe("Sở NN&MT (thử)");
    expect(d.cauHinh).toEqual({ so: moi.so, ten: moi.ten, hieuLucTu: "2027-03-01", hetHieuLucTu: "", baoCao06Thang: true, nhiemVu: moi.nhiemVu });
  });
  it("tệp sai dạng, thiếu vị trí, mã lặp, phiên bản mới hơn → báo lỗi rõ, không nạp", () => {
    const o = JSON.parse(tepCauHinhThamQuyen(moi, "x"));
    expect(() => docTepCauHinhThamQuyen("không phải json")).toThrow(/không đọc được/);
    expect(() => docTepCauHinhThamQuyen(JSON.stringify({ ...o, dinhDang: "khac" }))).toThrow(/Không phải tệp cấu hình/);
    expect(() => docTepCauHinhThamQuyen(JSON.stringify({ ...o, phienBan: 2 }))).toThrow(/phiên bản phần mềm mới hơn/);
    const thieuViTri = { ...o, cauHinh: { ...o.cauHinh, nhiemVu: [{ ...o.cauHinh.nhiemVu[0], viTri: "" }] } };
    expect(() => docTepCauHinhThamQuyen(JSON.stringify(thieuViTri))).toThrow(/vị trí trong văn bản/);
    const lap = { ...o, cauHinh: { ...o.cauHinh, nhiemVu: [o.cauHinh.nhiemVu[0], o.cauHinh.nhiemVu[0]] } };
    expect(() => docTepCauHinhThamQuyen(JSON.stringify(lap))).toThrow(/bị lặp/);
    expect(() => docTepCauHinhThamQuyen(JSON.stringify({ ...o, cauHinh: { ...o.cauHinh, hieuLucTu: "1/3/2027" } }))).toThrow(/thiếu hoặc sai trường/);
  });
});

describe("1.3.1 (B3) — hỏi xác nhận khi ngày ký ngoài hiệu lực văn bản phân cấp", () => {
  it("QĐ 27: ký từ 01/3/2027 → hỏi; trong hiệu lực hoặc mẫu không thuộc nhiệm vụ phân cấp → không hỏi", () => {
    expect(xacNhanThamQuyen("15", "2027-03-01")).toMatch(/hết hiệu lực từ 01\/03\/2027 \(khoản 1 Điều 6\)[\s\S]*Vẫn tạo văn bản\?/);
    expect(xacNhanThamQuyen("15", "2026-06-29")).toMatch(/khoản 1 Điều 5/);
    expect(xacNhanThamQuyen("15", "2026-10-19")).toBeNull();
    expect(xacNhanThamQuyen("15", undefined)).toBeNull();
    expect(xacNhanThamQuyen("22", "2027-03-05")).toBeNull(); // QĐ cưỡng chế — Điều 5 NĐ 151, không thuộc QĐ 27
  });
  it("đã nạp văn bản thay thế (hiệu lực 01/3/2027, không thời hạn) → không hỏi", () => {
    datCauHinhThamQuyen({ ...QD27_MAC_DINH, so: "05/2027/QĐ-UBND", hieuLucTu: "2027-03-01", hetHieuLucTu: "" });
    expect(xacNhanThamQuyen("15", "2027-03-05")).toBeNull();
  });
});

describe("1.3.1 (A2) — số liệu phân cấp ghi tay ở máy tỉnh", () => {
  const dong = [
    { xa: "Xã A", goi: { maGui: "a" }, phanCap: [{ nv: "THU_HOI", ngay: "2026-08-01", so: "1/QĐ-UBND" }] },
    { xa: "Xã B", goi: { maGui: "b" } }, // gói bản cũ — không có phanCap
  ];
  const tay: PhanCapGhiTay = { maGui: "b", donVi: "UBND xã B", xa: "Xã B", tu: "2026-06-30", den: "2026-12-14", theoNv: { THU_HOI: 3, HOI_DONG: 1, KE_HOACH: 0 }, canCu: "Báo cáo số 12/BC-UBND ngày 10/12/2026" };
  it("ghép: đơn vị có ghi tay thay dòng tính từ gói (không đếm hai lần); khác kỳ thì không dùng", () => {
    const { pc, maGuiGhiTay } = gopPhanCapGhiTay(dong, [tay], "2026-06-30", "2026-12-14");
    expect([...maGuiGhiTay]).toEqual(["b"]);
    expect(pc).toEqual([
      { xa: "Xã A", theoNv: { THU_HOI: 1 }, tong: 1 },
      { xa: "Xã B", theoNv: { THU_HOI: 3, HOI_DONG: 1 }, tong: 4, ghiChu: "ghi tay theo Báo cáo số 12/BC-UBND ngày 10/12/2026" },
    ]);
    const khac = gopPhanCapGhiTay(dong, [tay], "2026-01-01", "2026-06-14");
    expect(khac.pc.map((x) => x.xa)).toEqual(["Xã A", "Xã B"]);
    expect(khac.pc[1]!.ghiChu).toBeUndefined();
  });
  it("bắt buộc căn cứ, xã; số nguyên không âm", () => {
    expect(loiPhanCapGhiTay({ ...tay, canCu: " " })).toMatch(/căn cứ/);
    expect(loiPhanCapGhiTay({ ...tay, xa: "" })).toMatch(/xã/);
    expect(loiPhanCapGhiTay({ ...tay, theoNv: { THU_HOI: -1 } })).toMatch(/số nguyên/);
    expect(loiPhanCapGhiTay(tay)).toBeNull();
  });
  it("Word toàn tỉnh ghi rõ nguồn ghi tay", () => {
    const { pc } = gopPhanCapGhiTay(dong, [tay], "2026-06-30", "2026-12-14");
    const d = duLieuBaoCaoPhanCapTinh(pc, QD27_MAC_DINH.nhiemVu, [], { tu: "2026-06-30", den: "2026-12-14" }, { so: QD27_MAC_DINH.so, ten: QD27_MAC_DINH.ten }, {
      coQuanCapTren: "UBND tỉnh Sơn La", coQuan: "Sở Nông nghiệp và Môi trường", kyHieu: "SNNMT", so: "", diaDanh: "Sơn La", ngayKy: "2026-12-15", kinhGui: "UBND tỉnh", khoKhan: "", kienNghi: "", noiNhan: "Lưu: VT", quyenHan: "Giám đốc", nguoiKy: "",
    });
    const t = new PizZip(dienMau(readFileSync(new URL("../public/mau-van-ban/bao-cao-phan-cap-tinh.docx", import.meta.url)), d)).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
    expect(t).toContain("(ghi tay theo Báo cáo số 12/BC-UBND ngày 10/12/2026)");
    expect(t).toContain("tổng cộng 5 văn bản");
  });
});

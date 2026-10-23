import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { cuongCheTuVanBan, kiemCuongChe, type CuongChe } from "../src/cuong-che";
import { hanBuocChung } from "../src/han-buoc";
import { LICH_TRONG } from "../src/lich-lam-viec";
import type { Ho } from "../src/mo-hinh";
import { taiLieuPhieuKiemTra } from "../src/van-ban/phieu-kiem-tra";
import { taoDocx } from "../src/van-ban/tai-lieu-don-gian";

const ho = (p: Partial<Ho> = {}): Ho => ({ id: "h1", duAnId: "d1", ma: "H01", loai: "HO_GIA_DINH", ten: "Hộ mẫu", diaChi: "", soDinhDanh: "", dienThoai: "", nhanKhau: [], thua: [], taiSan: [], hoTro: {} as Ho["hoTro"], khauTru: "0", tienDo: {}, nhatKy: [], ...p });

describe("1.3.0 (C1) — mốc lấy từ văn bản đã ghi số", () => {
  it("QĐ cưỡng chế (Mẫu 22), QĐ thành lập Ban (T16) điền vào hồ sơ cưỡng chế mới nhất cùng loại; ô ghi tay giữ nguyên", () => {
    const c1: CuongChe = { id: "a", loai: "THU_HOI" };
    const c2: CuongChe = { id: "b", loai: "THU_HOI" };
    const h = ho({ vanBan: { qd_cc_thu_hoi_so: "88/QĐ-UBND", qd_cc_thu_hoi_ngay: "21/10/2026", qd_ban_cc_so: "90/QĐ-UBND", qd_ban_cc_ngay: "22/10/2026" }, cuongChe: [c1, c2] });
    expect(cuongCheTuVanBan(c2, h)).toMatchObject({ soQd: "88/QĐ-UBND", ngayQd: "2026-10-21", qdBan: "90/QĐ-UBND ngày 22/10/2026" });
    expect(cuongCheTuVanBan(c1, h)).toEqual(c1); // không phải hồ sơ mới nhất
    expect(cuongCheTuVanBan({ ...c2, soQd: "99/QĐ-UBND" }, { ...h, cuongChe: [c1, { ...c2, soQd: "99/QĐ-UBND" }] }).soQd).toBe("99/QĐ-UBND");
    // hạn giao QĐ (k5 Mục XVII) tính được không cần nhập lại
    expect(kiemCuongChe(c2, h, "2026-10-28", LICH_TRONG).some((k) => k.noiDung.includes("giao QĐ cưỡng chế") && k.noiDung.includes("26/10/2026"))).toBe(true);
    // KIEM_DEM lấy Mẫu 07
    const kd: CuongChe = { id: "k", loai: "KIEM_DEM" };
    expect(cuongCheTuVanBan(kd, ho({ vanBan: { qd_cc_kiem_dem_so: "7/QĐ-UBND", qd_cc_kiem_dem_ngay: "05/10/2026" }, cuongChe: [kd] }))).toMatchObject({ soQd: "7/QĐ-UBND", ngayQd: "2026-10-05" });
  });
  it("bước 2: chưa xác nhận bước 1 thì mốc là ngày Kế hoạch T1 đã ghi số", () => {
    const ds = hanBuocChung({ tienDoChung: {}, vanBan: { ke_hoach_ngay: "05/10/2026" } }, "2026-10-07", LICH_TRONG);
    expect(ds.find((x) => x.t.han.buoc === "2")!.t).toMatchObject({ moc: "2026-10-05", hanChot: "2026-10-08" });
  });
});

describe("1.3.0 (C2) — phiếu kiểm tra trước khi ký", () => {
  it("liệt kê cảnh báo, căn cứ, thẩm quyền; không cảnh báo thì ghi đã kiểm", () => {
    const p = { ma: "15", tenMau: "Quyết định thu hồi đất", duAn: "Dự án A", phamVi: "H01 Hộ mẫu", so: "12/QĐ-UBND", ngayKy: "2026-10-20", canCu: ["Căn cứ Luật Đất đai;"], thamQuyen: "Thẩm quyền: Chủ tịch UBND cấp xã — khoản 1, 2 mục I Phụ lục II QĐ 27/2026/QĐ-UBND", canhBao: ["Số 12/QĐ-UBND đã cấp cho …"], nguoiLap: "Cán bộ", luc: "2026-10-20T08:00:00Z" };
    const chu = (b: Uint8Array) => new PizZip(b).file("word/document.xml")!.asText().replace(/<[^>]+>/g, "");
    const t = chu(taoDocx(taiLieuPhieuKiemTra(p)));
    expect(t).toContain("PHIẾU KIỂM TRA VĂN BẢN TRƯỚC KHI KÝ");
    expect(t).toContain("1. Điểm cần xem (1)");
    expect(t).toContain("Số 12/QĐ-UBND đã cấp cho");
    expect(t).toContain("Ý kiến xử lý");
    expect(t).toContain("khoản 1, 2 mục I Phụ lục II");
    expect(t).toContain("– Căn cứ Luật Đất đai;");
    expect(chu(taoDocx(taiLieuPhieuKiemTra({ ...p, canhBao: [] })))).toContain("Phần mềm không phát hiện điểm cần xem");
  });
});

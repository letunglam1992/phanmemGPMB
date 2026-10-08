import { describe, expect, it } from "vitest";
import { chuanXa, doGiongTen, gomLienXa, loiTuyen, maTiepTheo, tachDsXa, type DoanTinh, type TuyenLienXa } from "../src/tong-hop-tinh/lien-xa";

const doan = (o: Partial<DoanTinh> & { id: string; xa: string; maGui: string }): DoanTinh => ({
  ten: "Đường nối QL6 – Bản Mòng", chuDauTu: "Ban QLDA công trình giao thông", soHo: 10, theoTrangThai: { HOAN_THANH: 10 }, tongTamTinh: "1000",
  dienTichThuHoi: "100.5", soVuongMac: 0, soHoDaChotPA: 10, soHoDaDuyetPA: 10, tienDoBinhQuan: 1, soTepDinhKem: 0, donViGui: `UBND ${o.xa}`, luc: "2026-10-01T00:00:00Z", ...o,
});
const tuyen: TuyenLienXa = { ma: "LX-2026-001", ten: "Đường nối QL6 – Bản Mòng", chuDauTu: "Ban QLDA công trình giao thông", dsXa: ["Xã Chiềng Mung", "Phường Tô Hiệu", "Xã Mường Bon"], taoLuc: "", taoBoi: "" };

describe("Dự án liên xã (1.0.4)", () => {
  it("gom theo mã: đếm một dự án; cộng số liệu các đoạn; xã chưa gửi; chưa hoàn thành toàn tuyến khi còn xã thiếu", () => {
    const ds = [
      doan({ id: "a", xa: "Xã Chiềng Mung", maGui: "g1", lienXa: { ma: "lx-2026-001", kmDau: "Km0+000", kmCuoi: "Km3+200" } }),
      doan({ id: "b", xa: "Phường Tô Hiệu", maGui: "g2", soHo: 5, theoTrangThai: { HOAN_THANH: 2 }, tongTamTinh: "500", lienXa: { ma: "LX-2026-001" } }),
      doan({ id: "c", xa: "Xã Chiềng Mung", maGui: "g1", ten: "Trường học bản Nà", lienXa: undefined }),
    ];
    const kq = gomLienXa(ds, [tuyen]);
    expect(kq.soDuAn).toBe(2);
    const t = kq.tuyen[0]!;
    expect([t.ma, t.tong.soHo, t.tong.banGiao, t.tong.tamTinh.toString(), t.tong.dienTich.toString()]).toEqual(["LX-2026-001", 15, 12, "1500", "201"]);
    expect(t.xaThieu).toEqual(["Xã Mường Bon"]);
    expect(t.hoanThanh).toBe(false);
    expect(kq.le.map((d) => d.id)).toEqual(["c"]);
  });
  it("hoàn thành toàn tuyến khi mọi xã đã gửi, mọi hộ bàn giao; xã ngoài danh sách được đánh dấu; mã chưa khai vẫn gom", () => {
    const ds = ["Xã Chiềng Mung", "Phường Tô Hiệu", "xã mường bon", "Xã Hát Lót"].map((xa, i) => doan({ id: `d${i}`, xa, maGui: `g${i}`, lienXa: { ma: "LX-2026-001" } }));
    const t = gomLienXa(ds, [tuyen]).tuyen[0]!;
    expect(t.hoanThanh).toBe(true);
    expect(t.xa.find((x) => x.xa === "Xã Hát Lót")!.ngoaiDs).toBe(true);
    const k = gomLienXa([doan({ id: "x", xa: "Xã A", maGui: "g", lienXa: { ma: "LX-9" } })], []);
    expect(k.tuyen[0]).toMatchObject({ ma: "LX-9", chuaKhai: true });
  });
  it("gợi ý ghép đoạn chưa có mã (tên giống, cùng chủ đầu tư); ghép tay của tỉnh thì vào tuyến", () => {
    const d = doan({ id: "e", xa: "Xã Mường Bon", maGui: "g3", ten: "Dự án đường nối QL6 - Bản Mòng (đoạn xã Mường Bon)" });
    const kq = gomLienXa([d], [tuyen]);
    expect(kq.goiY).toHaveLength(1);
    expect(kq.goiY[0]!.lyDo).toMatch(/cùng chủ đầu tư/);
    const kq2 = gomLienXa([d], [{ ...tuyen, ghep: ["g3|e"] }]);
    expect(kq2.goiY).toEqual([]);
    expect(kq2.tuyen[0]!.xa.find((x) => x.xa === "Xã Mường Bon")!.doan).toHaveLength(1);
    expect(doGiongTen("Trường học bản Nà", tuyen.ten)).toBeLessThan(0.5);
  });
  it("mã kế tiếp, kiểm tra khai báo, tách danh sách xã, so tên xã", () => {
    expect(maTiepTheo([{ ma: "LX-2026-001" }, { ma: "lx-2026-007" }], 2026)).toBe("LX-2026-008");
    expect(maTiepTheo([], 2026)).toBe("LX-2026-001");
    expect(loiTuyen({ ma: "LX-2026-001", ten: "A", dsXa: ["Xã A", "Xã B"] }, [tuyen])).toMatch(/đã dùng/);
    expect(loiTuyen({ ma: "LX-2026-001", ten: "A", dsXa: ["Xã A", "Xã B"] }, [tuyen], "LX-2026-001")).toBeNull();
    expect(loiTuyen({ ma: "LX-2", ten: "A", dsXa: ["Xã A"] }, [])).toMatch(/hai xã/);
    expect(loiTuyen({ ma: "LX 2 ê", ten: "A", dsXa: ["Xã A", "Xã B"] }, [])).toMatch(/chữ không dấu/);
    expect(tachDsXa("Xã A, Xã B\nPhường C; ")).toEqual(["Xã A", "Xã B", "Phường C"]);
    expect(chuanXa("Phường Tô  Hiệu")).toBe(chuanXa("to hieu"));
  });
});

describe("Nhắc lệch tiến độ giữa các xã của dự án liên xã (1.0.6)", () => {
  it("chưa gửi; số liệu cũ quá ngưỡng; tỷ lệ bàn giao thấp hơn toàn tuyến quá ngưỡng chênh (kèm Km, đoạn vướng); không đặt ngưỡng thì không nhắc", async () => {
    const { canhBaoTuyen } = await import("../src/tong-hop-tinh/lien-xa");
    const ds = [
      doan({ id: "a", xa: "Xã Chiềng Mung", maGui: "g1", soHo: 20, theoTrangThai: { HOAN_THANH: 18 }, lienXa: { ma: "LX-2026-001" } }),
      doan({ id: "b", xa: "Phường Tô Hiệu", maGui: "g2", soHo: 10, theoTrangThai: { HOAN_THANH: 2 }, luc: "2026-09-01T00:00:00Z", lienXa: { ma: "LX-2026-001", kmDau: "Km3+200", kmCuoi: "Km5+000" }, lyTrinh: { tongM: 1800, sachM: 600, chua: [[3500, 4700]] } }),
    ];
    const t = gomLienXa(ds, [tuyen]).tuyen[0]!;
    const bayGio = new Date("2026-10-08T00:00:00Z");
    expect(canhBaoTuyen(t, { nguongNgay: null, nguongChenh: null, bayGio }).map((c) => c.loai)).toEqual(["CHUA_GUI"]); // Xã Mường Bon
    const c = canhBaoTuyen(t, { nguongNgay: 14, nguongChenh: 30, bayGio });
    expect(c.map((x) => [x.xa, x.loai])).toEqual([["Phường Tô Hiệu", "CU"], ["Phường Tô Hiệu", "CHAM"], ["Xã Mường Bon", "CHUA_GUI"]]);
    expect(c[0]!.noiDung).toContain("01/09/2026 (37 ngày");
    expect(c[1]!.noiDung).toBe("bàn giao 2/10 hộ (20%), thấp hơn toàn tuyến (66,7%) 46,7 điểm %; đoạn Km3+200 – Km5+000; còn vướng Km3+500 – Km4+700");
    expect(canhBaoTuyen(t, { nguongNgay: 14, nguongChenh: 50, bayGio }).some((x) => x.loai === "CHAM")).toBe(false);
  });
});

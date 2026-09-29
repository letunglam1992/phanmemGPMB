import { describe, expect, it } from "vitest";
import { phanBoDatNN, phanBoDatO } from "../src";

const s = (x: { toString(): string }) => x.toString();

describe("Điều 8 NĐ 88 — đất có nhà ở không có giấy tờ", () => {
  const co = { dtThua: "600", hanMucCongNhan: "400", hanMucGiao: "200" };
  it("k2 điểm a: DT thu hồi ≥ hạn mức công nhận → đất ở = hạn mức; SXKD theo thực tế; còn lại đất NN", () => {
    const r = phanBoDatO({ ...co, dieu: "D8", ngaySuDung: "1990-01-01", dtThuHoi: "500", dtSxkd: "50" });
    expect([r.khoan, s(r.datO), s(r.sxkd), s(r.conLai), r.conLaiLoai]).toEqual(["điểm a khoản 2 Điều 8", "400", "50", "50", "NN"]);
  });
  it("k1 điểm a đoạn 2: DT xây dựng vượt hạn mức → đất ở theo DT xây dựng, phần vượt phải trừ tiền SDĐ", () => {
    const r = phanBoDatO({ ...co, dieu: "D8", ngaySuDung: "1979-05-01", dtThuHoi: "500", dtXayDung: "450" });
    expect([s(r.datO), s(r.datOVuot), s(r.conLai)]).toEqual(["450", "50", "50"]);
  });
  it("k3: hạn mức giao đất ở; DT xây dựng vượt → đất ở theo DT xây dựng, không trừ tiền SDĐ", () => {
    const r = phanBoDatO({ ...co, dieu: "D8", ngaySuDung: "2000-01-01", dtThuHoi: "500", dtXayDung: "250" });
    expect([r.khoan, s(r.datO), s(r.datOVuot), r.hanMuc]).toEqual(["điểm a khoản 3 Điều 8", "250", "0", "GIAO"]);
  });
  it("điểm b: DT thu hồi < hạn mức → toàn bộ là đất ở; k1 thửa ≥ hạn mức → khe văn bản (VM-39)", () => {
    expect(s(phanBoDatO({ ...co, dieu: "D8", ngaySuDung: "1990-01-01", dtThuHoi: "100" }).datO)).toBe("100");
    const k1 = phanBoDatO({ ...co, dieu: "D8", ngaySuDung: "1970-01-01", dtThuHoi: "100" });
    expect([s(k1.datO), k1.canXacNhan.length]).toEqual(["100", 1]);
    expect(phanBoDatO({ ...co, dtThua: "300", dieu: "D8", ngaySuDung: "1970-01-01", dtThuHoi: "100" }).canXacNhan).toHaveLength(0);
  });
  it("thiếu hạn mức, sau 01/7/2014 → lỗi", () => {
    expect(phanBoDatO({ dieu: "D8", ngaySuDung: "1990-01-01", dtThuHoi: "100", dtThua: "100" }).loi).toMatch(/hạn mức công nhận/);
    expect(phanBoDatO({ ...co, dieu: "D8", ngaySuDung: "2015-01-01", dtThuHoi: "100" }).loi).toMatch(/không thuộc Điều 8/);
  });
});

describe("Điều 9, 10 NĐ 88", () => {
  const co = { dtThua: "600", hanMucCongNhan: "400", hanMucGiao: "200" };
  it("Điều 9: ≤ hạn mức; phần còn lại chưa quy định; k3 DT làm nhà ở vượt; k4 lấn chiếm sau 2014 không bồi thường", () => {
    const a = phanBoDatO({ ...co, dieu: "D9", ngaySuDung: "2000-01-01", dtThuHoi: "300" });
    expect([a.khoan, s(a.datO), s(a.conLai), a.conLaiLoai]).toEqual(["khoản 2 Điều 9", "200", "100", "CHUA_QUY_DINH"]);
    expect(s(phanBoDatO({ ...co, dieu: "D9", ngaySuDung: "2000-01-01", dtThuHoi: "300", dtXayDung: "260" }).datO)).toBe("260");
    const k4 = phanBoDatO({ ...co, dieu: "D9", ngaySuDung: "2016-01-01", dtThuHoi: "300", lanChiem: true });
    expect([k4.khoan, s(k4.datO), k4.conLaiLoai, k4.loi]).toEqual(["khoản 4 Điều 9", "0", "KHONG_BT", undefined]);
  });
  it("Điều 10: k1 → k2 Đ8; k3 có điểm a, b k3 Đ140 → đất ở theo k3 Đ8, còn lại theo hiện trạng; không có → toàn bộ hiện trạng; k4 cần giấy tờ nộp tiền", () => {
    expect(phanBoDatO({ ...co, dieu: "D10", ngaySuDung: "1990-01-01", dtThuHoi: "500" }).khoan).toMatch(/khoản 1 Điều 10 \(áp dụng điểm a khoản 2 Điều 8\)/);
    const k3 = phanBoDatO({ ...co, dieu: "D10", ngaySuDung: "2008-01-01", dtThuHoi: "500", dtSxkd: "50", d140: true });
    expect([s(k3.datO), s(k3.sxkd), s(k3.conLai), k3.conLaiLoai]).toEqual(["200", "0", "300", "HIEN_TRANG"]);
    expect(s(phanBoDatO({ ...co, dieu: "D10", ngaySuDung: "2008-01-01", dtThuHoi: "500" }).conLai)).toBe("500");
    expect(phanBoDatO({ ...co, dieu: "D10", ngaySuDung: "2020-01-01", dtThuHoi: "100" }).loi).toMatch(/nộp tiền/);
    expect(s(phanBoDatO({ ...co, dieu: "D10", ngaySuDung: "2020-01-01", dtThuHoi: "100", giayToNopTien: true }).datO)).toBe("100");
  });
});

describe("Điều 12 NĐ 88 — đất nông nghiệp", () => {
  it("≤ hạn mức; phần vượt hỗ trợ k7; trước 01/7/2004 không giấy tờ → bồi thường toàn bộ; k5a theo thực tế", () => {
    const a = phanBoDatNN({ truongHop: "K2", dtThuHoi: "5000", hanMuc: "3000" });
    expect([s(a.boiThuong), s(a.vuot), a.vuotXuLy]).toEqual(["3000", "2000", "HT_K7"]);
    const b = phanBoDatNN({ truongHop: "K1", dtThuHoi: "5000", hanMuc: "3000", truoc2004TrucTiepSx: true });
    expect([s(b.boiThuong), s(b.vuot), b.vuotXuLy]).toEqual(["5000", "0", "BT"]);
    expect(s(phanBoDatNN({ truongHop: "K5A", dtThuHoi: "5000", hanMuc: "3000" }).boiThuong)).toBe("5000");
  });
});

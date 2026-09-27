/**
 * Kiểm thử trên tệp bản đồ thật do người dùng cung cấp (GPMB.dgn).
 * Tệp chứa họ tên chủ sử dụng → KHÔNG đưa vào kho mã. Chạy khi có biến môi trường:
 *   GPMB_DGN_MAU=/đường/dẫn/GPMB.dgn npm test
 *
 * Số liệu đối chiếu được tính độc lập bằng Python (bộ đọc byte riêng + Shapely polygonize/intersection):
 * 692 thửa > 5 m²; với vùng ranh 192.722,8 m²: 409 toàn bộ, 92 một phần, 191 ngoài ranh,
 * tổng diện tích giao 182.444,6 m². GDAL 3.x chỉ đọc được 28.041 phần tử đầu (dừng ở byte
 * 2.059.132), bỏ sót nửa phía nam bản đồ; phần GDAL đọc được khớp số phần tử theo lớp/kiểu.
 */
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import { docDgn, dungThua, tinhDienTichThuHoi, type KetQuaDocDgn, type KetQuaDungThua } from "../src/index.js";

const tep = process.env.GPMB_DGN_MAU;

describe.skipIf(!tep || !existsSync(tep))("Tệp GPMB.dgn thật", () => {
  let ban: KetQuaDocDgn;
  let kq: KetQuaDungThua;
  beforeAll(() => {
    ban = docDgn(readFileSync(tep!));
    kq = dungThua(ban);
  });

  test("đọc toàn tệp", () => {
    expect(ban.tcb).toMatchObject({ soChieu: 2, suTrenMu: 100, uorTrenSu: 1, donViChinh: "m", donViPhu: "cm" });
    const lop10 = ban.phanTu.filter((p) => p.lop === 10);
    expect(lop10.filter((p) => p.kieu === 3)).toHaveLength(883);
    expect(lop10.filter((p) => p.kieu === 4)).toHaveLength(1281);
  });

  test("692 thửa, nhãn giải mã TCVN3", () => {
    expect(kq.thua).toHaveLength(692);
    expect(kq.thua.filter((t) => t.co.length === 0).length).toBeGreaterThanOrEqual(480);
    expect(kq.thua.some((t) => t.chuSuDung === "UBND Xã")).toBe(true);
  });

  test("diện tích thu hồi khớp Shapely", () => {
    const vung = kq.vungGpmb.find((v) => Math.abs(v.dienTich - 192722.79) < 0.1)!;
    expect(vung).toBeDefined();
    const r = tinhDienTichThuHoi(kq.thua, [vung.vong]);
    const dem = (k: string) => r.filter((x) => x.phamVi === k).length;
    expect([dem("TOAN_BO"), dem("MOT_PHAN"), dem("NGOAI")]).toEqual([409, 92, 191]);
    expect(r.reduce((s, x) => s + x.dienTichThuHoi, 0)).toBeCloseTo(182444.63, 1);
  });
});

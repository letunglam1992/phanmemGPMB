/** Nhiều tờ bản đồ trong một dự án (docs/08 §9.9): chọn tờ dựng chung, số tờ đọc được, tên tệp tham chiếu chưa nạp. */
import { describe, expect, it } from "vitest";
import { VietDgn } from "../../../packages/gis/test/viet-dgn";
import { dsSoTo, khoaNapBanDo, locThuaXoa, napTatCa, phanTichNhieu, tepDangBat, thamChieuThieu } from "../src/man/ban-do/du-lieu";
import type { DuAn } from "../src/mo-hinh";

function to(soTo: string, x0: number, n: number, them = "") {
  const v = new VietDgn(100, 1, [0, 0]);
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 20;
    v.duongGap({ lop: 10 }, [[x, 2350000], [x + 20, 2350000], [x + 20, 2350020], [x, 2350020], [x, 2350000]], 6).chu({ lop: 4 }, [x + 5, 2350008], String(i + 1)).chu({ lop: 5 }, [x + 5, 2350004], soTo);
  }
  const b = v.xuat();
  return them ? new Uint8Array([...b, ...new TextEncoder().encode(them)]) : b;
}
const banDo = (o: Partial<NonNullable<DuAn["banDo"]>> = {}): NonNullable<DuAn["banDo"]> => ({ tenTep: "to7.dgn", ngayNhap: "2026-10-01T00:00:00Z", vungChon: null, tepGhep: [{ id: "a", tenTep: "to8.dgn", ngayNhap: "2026-10-01T00:00:00Z" }], ...o });

describe("Nhiều tờ bản đồ", () => {
  it("khóa nạp đổi khi bật/tắt tờ; tắt hết thì vẫn dùng tệp chính", () => {
    const b = banDo();
    expect(khoaNapBanDo(b)).not.toBe(khoaNapBanDo({ ...b, anTepChinh: true }));
    expect(khoaNapBanDo(b)).not.toBe(khoaNapBanDo({ ...b, tepGhep: [{ ...b.tepGhep![0]!, an: true }] }));
    expect(tepDangBat({ ...b, anTepChinh: true })).toMatchObject({ chinh: false, ghep: [{ id: "a" }] });
    expect(tepDangBat({ ...b, anTepChinh: true, tepGhep: [{ ...b.tepGhep![0]!, an: true }] })).toMatchObject({ chinh: true, ghep: [] });
  });

  it("chỉ dựng các tờ đang bật; số tờ, số thửa; tham chiếu chưa nạp", async () => {
    const tep: Record<string, Uint8Array> = { d: to("7", 500000, 3, "\0C:\\DC\\to9.dgn\0to8.dgn\0"), "d#a": to("8", 500100, 2) };
    const kho = { docBanDo: async (id: string) => tep[id] ?? null };
    const duAn = { id: "d", banDo: banDo() } as unknown as DuAn;
    const ca = (await napTatCa(kho, duAn))!;
    expect(ca.kq.thua).toHaveLength(5);
    expect(dsSoTo(ca).map((x) => [x.soTo, x.soThua])).toEqual([["7", 3], ["8", 2]]);
    expect(ca.tep!.map((t) => [t.khoa, t.ten])).toEqual([["", "to7.dgn"], ["a", "to8.dgn"]]);
    expect(ca.tep![0]!.thamChieu).toEqual(["to9.dgn", "to8.dgn"]);
    expect(thamChieuThieu(ca, duAn.banDo!)).toEqual([{ tu: "to7.dgn", ten: "to9.dgn" }]);
    const chi8 = (await napTatCa(kho, { ...duAn, banDo: banDo({ anTepChinh: true }) }))!;
    expect(dsSoTo(chi8).map((x) => x.soTo)).toEqual(["8"]);
    expect(chi8.tep!.map((t) => t.khoa)).toEqual(["a"]);
    const ph = dsSoTo(chi8)[0]!.pham;
    for (const [k, v] of Object.entries({ minX: 500100, minY: 2350000, maxX: 500140, maxY: 2350020 })) expect(ph[k as keyof typeof ph]).toBeCloseTo(v, 2);
    expect(phanTichNhieu([{ ten: "x.dgn", bytes: tep.d! }]).tep![0]!.khoa).toBe("");
  });

  it("thửa đã xóa: bỏ khi dựng lại từ tệp (theo mã + tâm nhãn), đổi khóa nạp; tâm lệch xa thì không bỏ", async () => {
    const tep: Record<string, Uint8Array> = { d: to("7", 500000, 3) };
    const kho = { docBanDo: async (id: string) => tep[id] ?? null };
    const goc = (await napTatCa(kho, { id: "d", banDo: banDo({ tepGhep: [] }) } as unknown as DuAn))!;
    const t2 = goc.kq.thua.find((t) => t.soThua === "2")!;
    const x = { ma: t2.ma, tam: t2.tamNhan, soTo: "7", soThua: "2", dienTich: 400, ngay: "2026-10-01", nguoi: "a" };
    const b = banDo({ tepGhep: [], thuaXoa: [x] });
    expect(khoaNapBanDo(b)).not.toBe(khoaNapBanDo(banDo({ tepGhep: [] })));
    const sau = (await napTatCa(kho, { id: "d", banDo: b } as unknown as DuAn))!;
    expect(sau.kq.thua.map((t) => t.soThua)).toEqual(["1", "3"]);
    expect(locThuaXoa(goc, [{ ...x, tam: { x: 0, y: 0 } }]).kq.thua).toHaveLength(3);
  });
});

import { kiemTraViTriTo } from "../src/man/ban-do/du-lieu";
describe("1.0.5: kiểm tra vị trí tờ ghép (tham chiếu ngoài)", () => {
  const tep = (khoa: string, ten: string, minX: number, minY: number) => ({ khoa, ten, soPhanTu: 1, thamChieu: [], pham: { minX, minY, maxX: minX + 500, maxY: minY + 500 } });
  const dl = (ds: ReturnType<typeof tep>[]) => ({ tep: ds }) as unknown as Parameters<typeof kiemTraViTriTo>[0];
  it("tờ liền kề cùng VN-2000 → không nhắc; tọa độ cục bộ → nhắc; xa > 20 km → nhắc", () => {
    expect(kiemTraViTriTo(dl([tep("", "chinh.dgn", 500000, 2350000), tep("a", "ke.dgn", 500600, 2350000)]))).toEqual([]);
    const r = kiemTraViTriTo(dl([tep("", "chinh.dgn", 500000, 2350000), tep("b", "cucbo.dgn", 0, 0), tep("c", "xa.dgn", 560000, 2350000)]));
    expect(r.map((x) => x.ten)).toEqual(["cucbo.dgn", "xa.dgn"]);
    expect(r[0]!.noiDung).toMatch(/không giống hệ VN-2000/);
    expect(r[1]!.noiDung).toMatch(/cách tờ chính khoảng 59,5 km/);
  });
});

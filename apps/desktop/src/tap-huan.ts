/**
 * 1.0.20 (D2) — Dự án tập huấn: dữ liệu và bản đồ GIẢ LẬP để cán bộ thực hành (nạp bản đồ, chọn ranh, tra giá, lập, chốt
 * phương án, soạn văn bản…). Không có thông tin cá nhân thật; không gửi lên tỉnh; xóa hẳn ngay được sau buổi tập huấn.
 * Bản đồ: tệp DXF dựng sẵn — 18 thửa (tờ 12) 30 × 25 m, ranh GPMB (lớp 30) là dải 15 m cắt qua hàng thửa giữa
 * (thửa 7–12, mỗi thửa thu hồi 450 m²). Đơn giá đất dùng tham chiếu như dữ liệu mẫu; thửa HNK để trống giá để thực hành tra giá.
 */
import { CAC_BUOC, taoId, type DuAn, type Ho, type TaiSan } from "./mo-hinh";

const X0 = 512000;
const Y0 = 2355000;
export const TO_TAP_HUAN = "12";
const RONG = 30;
const CAO = 25;
/** Dải ranh GPMB: y từ 30 đến 45 m (cắt hàng giữa, y 25–50) */
const RANH = { y1: 30, y2: 45 };

const nhom = (...cap: (string | number)[]) => cap.map(String).join("\r\n");
const lw = (lop: string | number, pts: [number, number][]) =>
  nhom(0, "LWPOLYLINE", 8, lop, 90, pts.length, 70, 1, ...pts.flatMap(([x, y]) => [10, (X0 + x).toFixed(3), 20, (Y0 + y).toFixed(3)]));
const chu = (lop: string | number, s: string, x: number, y: number, cao = 1.8) => nhom(0, "TEXT", 8, lop, 10, (X0 + x).toFixed(3), 20, (Y0 + y).toFixed(3), 40, cao, 1, s);

/** Số thửa theo hàng (từ trên xuống) và cột: hàng 1 (y 50–75): 1–6; hàng 2 (y 25–50): 7–12; hàng 3 (y 0–25): 13–18. */
export const soThuaTapHuan = (hang: number, cot: number) => hang * 6 + cot + 1;

/** Tệp bản đồ DXF (chữ, AutoCAD 2000) của dự án tập huấn. */
export function taoBanDoTapHuan(): Uint8Array {
  const tt: string[] = [];
  for (let hang = 0; hang < 3; hang++)
    for (let cot = 0; cot < 6; cot++) {
      const x = cot * RONG;
      const y = (2 - hang) * CAO;
      tt.push(lw(10, [[x, y], [x + RONG, y], [x + RONG, y + CAO], [x, y + CAO]]));
      tt.push(chu(4, String(soThuaTapHuan(hang, cot)), x + 12, y + 14));
      tt.push(chu(5, TO_TAP_HUAN, x + 12, y + 8, 1.2));
    }
  tt.push(lw(30, [[-5, RANH.y1], [6 * RONG + 5, RANH.y1], [6 * RONG + 5, RANH.y2], [-5, RANH.y2]]));
  tt.push(chu(63, "DUONG TAP HUAN (GIA LAP)", 60, RANH.y2 + 1.5, 2.2));
  const s = [
    nhom(0, "SECTION", 2, "HEADER", 9, "$ACADVER", 1, "AC1015", 9, "$INSUNITS", 70, 6, 0, "ENDSEC"),
    nhom(0, "SECTION", 2, "TABLES", 0, "TABLE", 2, "LAYER", ...[["10", 7], ["4", 1], ["5", 3], ["30", 1], ["63", 5]].flatMap(([l, m]) => [0, "LAYER", 2, l!, 70, 0, 62, m!]), 0, "ENDTAB", 0, "ENDSEC"),
    nhom(0, "SECTION", 2, "ENTITIES", ...tt, 0, "ENDSEC", 0, "EOF"),
  ].join("\r\n");
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

const GIA_CLN = { giaNghinDong: "54", nguon: "Bảng 02, STT 45, Xã Chiềng Mung, CLN" };
const cay = (thuaId: string, ten: string, soLuong: string, donGia: string, matDoHa: string): TaiSan => ({
  id: taoId(), thuaId, dot: 1, loai: "CAY", ten, maDonGia: "PL VIII QĐ 106/2025", donVi: "cây", donGia, soLuong, matDoHa,
});

export const TEN_DU_AN_TAP_HUAN = "Dự án tập huấn – Đường giao thông (dữ liệu giả lập)";

/** Tạo dự án tập huấn: dự án, 6 hộ ở các giai đoạn khác nhau, tệp bản đồ DXF. */
export function taoDuAnTapHuan(homNay = new Date().toISOString().slice(0, 10)): { duAn: DuAn; ho: Ho[]; banDo: Uint8Array } {
  const duAn: DuAn = {
    id: taoId(),
    mau: true,
    tapHuan: true,
    ten: TEN_DU_AN_TAP_HUAN,
    xa: "Xã Chiềng Mung",
    chuDauTu: "Chủ đầu tư giả lập",
    canCuThuHoi: "Thông báo thu hồi đất số …/TB-UBND (giả lập để tập huấn)",
    ngayThongBao: "2026-06-01",
    boChinhSach: "sonla-2026-10-06",
    giaGao: null,
    hanMucNN: { m2: "30000", canCu: "Hạn mức giả lập để tập huấn – nhập theo PL I QĐ 106/2025 khi làm thật" },
    heSoGiaDat: null,
    banDo: { tenTep: "Ban-do-tap-huan.dxf", ngayNhap: homNay, vungChon: null },
    loaiDuAn: "GIAO_THONG",
    tienDoChung: {
      "1": { trangThai: "XONG", ngay: "2026-05-10" },
      "2": { trangThai: "XONG", ngay: "2026-05-20" },
      "3": { trangThai: "XONG", ngay: "2026-06-01", ghiChu: "Thông báo thu hồi đất (giả lập)" },
    },
    taoLuc: new Date().toISOString(),
  };
  const tienDo = (den: number) => Object.fromEntries(CAC_BUOC.map((b, i) => [b.ma, { trangThai: i < den ? "XONG" : i === den ? "DANG" : "CHUA" }])) as Ho["tienDo"];
  const ho = (stt: number, soThua: number, p: Partial<Omit<Ho, "taiSan">> & { loaiDat?: string; gia?: Ho["thua"][number]["gia"]; taiSan?: (thuaId: string) => TaiSan[]; den: number }): Ho => {
    const thuaId = taoId();
    const { loaiDat = "CLN", gia = GIA_CLN, taiSan, den, ...khac } = p;
    return {
      id: taoId(),
      duAnId: duAn.id,
      ma: `H${String(stt).padStart(2, "0")}`,
      loai: "HO_GIA_DINH",
      ten: `Hộ tập huấn ${String(stt).padStart(2, "0")}`,
      diaChi: "Bản giả lập, xã Chiềng Mung",
      soDinhDanh: "",
      dienThoai: "",
      nhanKhau: [{ id: taoId(), hoTen: `Học viên ${String(stt).padStart(2, "0")}`, quanHe: "Chủ hộ" }],
      thua: [{ id: thuaId, soTo: TO_TAP_HUAN, soThua: String(soThua), loaiDat, dienTich: "750", dienTichThuHoi: "450", nguonGoc: "Nhà nước giao (giả lập)", gia }],
      taiSan: taiSan?.(thuaId) ?? [],
      hoTro: { chuyenDoiNghe: true },
      khauTru: "0",
      tienDo: tienDo(den),
      nhatKy: [{ luc: new Date().toISOString(), nguoi: "Hệ thống", noiDung: "Tạo hồ sơ tập huấn (giả lập)" }],
      ...khac,
    };
  };
  const ds: Ho[] = [
    ho(1, 7, { den: 4, taiSan: (t) => [cay(t, "Xoài ĐK >10–15 cm", "12", "790000", "400"), cay(t, "Nhãn ĐK >8–10 cm", "8", "575000", "400")] }),
    ho(2, 8, { den: 5, taiSan: (t) => [cay(t, "Xoài ĐK >15–20 cm", "6", "1150000", "400")] }),
    ho(3, 9, { den: 3, loaiDat: "HNK", gia: null }),
    ho(4, 10, { den: 4, taiSan: (t) => [{ id: taoId(), thuaId: t, dot: 1, loai: "NHA_CT", ten: "Lán tạm (giả lập)", maDonGia: "QĐ32 – chọn đơn giá", donVi: "m²", donGia: "1500000", khoiLuong: "=5*4", cachTinh: "THIET_HAI_THUC_TE", phan: "BOI_THUONG", canCu: "" }] }),
    ho(5, 11, {
      den: 4,
      khieuNai: [{ id: taoId(), loai: "KHIEU_NAI", lan: 1, ngayNhan: "2026-09-01", ngayThuLy: "2026-09-08", doiTuong: "Biên bản kiểm đếm (giả lập)", noiDung: "Đề nghị kiểm đếm lại số cây (tình huống tập huấn)", nguoiGhi: "Hệ thống" }],
    }),
    ho(6, 12, { den: 3, vuongMac: { noiDung: "Chưa thống nhất ranh giới với hộ liền kề (tình huống tập huấn)", ngay: "2026-08-15" } }),
  ];
  return { duAn, ho: ds, banDo: taoBanDoTapHuan() };
}

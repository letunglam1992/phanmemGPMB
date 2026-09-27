/**
 * Dữ liệu mẫu ẨN DANH để trình diễn và kiểm thử. Số liệu thửa 85 lấy từ biểu áp giá (dự thảo)
 * người dùng cung cấp, đã thay tên chủ hộ; không chứa thông tin cá nhân thật.
 */
import { CAC_BUOC, taoId, type DuAn, type Ho, type TaiSan } from "./mo-hinh";

const cay = (thuaId: string, ten: string, soLuong: string, donGia: string, matDoHa: string, maDonGia = "PL VIII QĐ 106/2025"): TaiSan => ({
  id: taoId(), thuaId, dot: 1, loai: "CAY", ten, maDonGia, donVi: "cây", donGia, soLuong, matDoHa,
});

export function taoDuAnMau(): { duAn: DuAn; ho: Ho[] } {
  const duAn: DuAn = {
    id: taoId(),
    ten: "Dự án mẫu – Khu công nghiệp (dữ liệu ẩn danh)",
    xa: "Xã Chiềng Mung",
    chuDauTu: "Chủ đầu tư mẫu",
    canCuThuHoi: "Thông báo thu hồi đất số …/TB-UBND (mẫu)",
    ngayThongBao: "2026-04-15",
    boChinhSach: "sonla-2026-03-31",
    giaGao: null,
    hanMucNN: { m2: "30000", canCu: "Hạn mức mẫu – cần nhập theo PL I QĐ 106/2025" },
    heSoGiaDat: null,
    banDo: null,
    taoLuc: new Date().toISOString(),
  };
  const t85 = taoId();
  const t73 = taoId();
  const tienDo = (den: number) => Object.fromEntries(CAC_BUOC.map((b, i) => [b.ma, { trangThai: i < den ? "XONG" : i === den ? "DANG" : "CHUA" }])) as Ho["tienDo"];
  const ho1: Ho = {
    id: taoId(),
    duAnId: duAn.id,
    ma: "H01",
    loai: "HO_GIA_DINH",
    ten: "Hộ mẫu 01",
    diaChi: "Bản mẫu, xã Chiềng Mung",
    soDinhDanh: "",
    dienThoai: "",
    nhanKhau: [
      { id: taoId(), hoTen: "Chủ hộ mẫu 01", quanHe: "Chủ hộ" },
      { id: taoId(), hoTen: "Thành viên A", quanHe: "Vợ" },
      { id: taoId(), hoTen: "Thành viên B", quanHe: "Con" },
    ],
    thua: [
      {
        id: t85, soTo: "5", soThua: "85", loaiDat: "CLN", dienTich: "9222.1", dienTichThuHoi: "9222.1", nguonGoc: "Nhận chuyển nhượng",
        gia: { giaNghinDong: "54", nguon: "Bảng 02, STT 45, Xã Chiềng Mung, CLN" },
        cayXen: { dienTichTru: "154.3", lyDoTru: "Trừ diện tích công trình xây dựng trên thửa (theo biểu mẫu)", cachXep: "DUNG_KHI_VUOT" },
      },
      {
        id: t73, soTo: "5", soThua: "73", loaiDat: "CLN", dienTich: "443.2", dienTichThuHoi: "443.2", nguonGoc: "Nhận chuyển nhượng",
        gia: { giaNghinDong: "54", nguon: "Bảng 02, STT 45, Xã Chiềng Mung, CLN" },
      },
    ],
    taiSan: [
      { id: taoId(), thuaId: t85, dot: 1, loai: "KHAC", ten: "Đường ống dẫn nước nhựa HDPE", donVi: "m", khoiLuong: "202", heSo: "1", donGia: "50093", canCu: "Công bố giá VLXD của Sở Xây dựng (mẫu)", phan: "HO_TRO" },
      ...[
        ["Nhãn ĐK >30–35 cm", "=5+6+3", "3900000"], ["Nhãn ĐK >25–30 cm", "=3+15+12+2", "1950000"], ["Nhãn ĐK >20–25 cm", "=5+4+9+14+6", "1500000"],
        ["Nhãn ĐK >15–20 cm", "=4+2+21+11+4", "1200000"], ["Nhãn ĐK >10–15 cm", "=9+7+5+44+52+20+1", "800000"], ["Nhãn ĐK >8–10 cm", "=25+8+3+26+9+4", "575000"],
        ["Nhãn ĐK >4–8 cm", "=11+2+16+8+2", "285000"], ["Nhãn ĐK >2–4 cm", "=15+8+11+4+5", "120000"], ["Nhãn trên 1 năm, ĐK ≤ 2 cm", "=10+17", "90000"],
        ["Xoài ĐK >30–35 cm", "10", "3240000"], ["Xoài ĐK >25–30 cm", "=5+19+11+4", "1850000"], ["Xoài ĐK >20–25 cm", "117", "1480000"],
        ["Xoài ĐK >15–20 cm", "=24+4+8+52+63+26", "1150000"], ["Xoài ĐK >10–15 cm", "=18+3+20+49+65+61", "790000"], ["Xoài ĐK >8–10 cm", "=10+1+3+25", "540000"],
        ["Xoài ĐK >6–8 cm", "6", "280000"], ["Xoài ĐK >4–6 cm", "14", "115000"], ["Xoài trên 1 năm, ĐK ≤ 4 cm", "6", "90000"],
      ].map(([ten, sl, dg]) => cay(t85, ten!, sl!, dg!, "400")),
      cay(t85, "Na ĐK >15–20 cm", "4", "1537000", "1100"),
      cay(t85, "Na ĐK >10–15 cm", "10", "1200000", "1100"),
    ],
    hoTro: { chuyenDoiNghe: true },
    khauTru: "0",
    tienDo: tienDo(4),
    nhatKy: [{ luc: new Date().toISOString(), nguoi: "Hệ thống", noiDung: "Tạo hồ sơ mẫu" }],
  };
  const t12 = taoId();
  const ho2: Ho = {
    id: taoId(),
    duAnId: duAn.id,
    ma: "H02",
    loai: "HO_GIA_DINH",
    ten: "Hộ mẫu 02",
    diaChi: "Bản mẫu, xã Chiềng Mung",
    soDinhDanh: "",
    dienThoai: "",
    nhanKhau: [{ id: taoId(), hoTen: "Chủ hộ mẫu 02", quanHe: "Chủ hộ" }],
    thua: [
      { id: t12, soTo: "5", soThua: "12", loaiDat: "HNK", dienTich: "850.5", dienTichThuHoi: "600", nguonGoc: "Nhà nước giao", gia: null },
      {
        id: taoId(), soTo: "5", soThua: "13", loaiDat: "ONT", dienTich: "150.5", dienTichThuHoi: "150.5", nguonGoc: "Công nhận đất ở",
        gia: null,
        phanLop: {
          tuyen: { bang: "05", stt: "1.1", xa: "Xã Chiềng Mung", tuyen: "Từ hết địa phận xã Mai Sơn đến ngã ba đường rẽ vào khu công nghiệp Mai Sơn", vt: [3300, 2750, 1930, 1320, 930] },
          lop: [
            { id: taoId(), lop: 1, viTri: 1, dienTich: "100" },
            { id: taoId(), lop: 2, viTri: 1, dienTich: "50.5" },
          ],
        },
      },
    ],
    taiSan: [
      { id: taoId(), thuaId: t12, dot: 1, loai: "NHA_CT", ten: "Nhà tạm (mẫu)", maDonGia: "QĐ32 – chọn đơn giá", donVi: "m²", donGia: "1500000", khoiLuong: "=6*4.5", cachTinh: "THIET_HAI_THUC_TE", phan: "BOI_THUONG", canCu: "" },
    ],
    hoTro: { chuyenDoiNghe: true, onDinh: { dienTichNNDangSuDung: "850.5", diChuyen: "KHONG_DI_CHUYEN" } },
    khauTru: "0",
    tienDo: tienDo(3),
    nhatKy: [],
  };
  return { duAn, ho: [ho1, ho2] };
}

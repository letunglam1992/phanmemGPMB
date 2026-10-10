/**
 * 1.0.7 — Phần chạy nền ở máy cấp tỉnh (thanh-phan/TheoDoiGoiTinh.tsx) tách ra để kiểm thử: lịch kiểm tra cổng (lần đầu
 * sau khi mở phần mềm 20 giây, sau đó mỗi 30 phút, không chạy chồng) và một lần kiểm tra (khóa tỉnh đang mở → tự tải,
 * nhận gói mới; đang khóa → chỉ cập nhật danh sách gói chờ nhận cho chuông thông báo).
 */
import type { CauHinhCong, GoiTrenCong } from "./cong-tinh";
import type { KhoaTinh } from "./goi-tinh";

export const DAU_KIEM_CONG = 20_000;
export const CHU_KY_KIEM_CONG = 30 * 60_000;

/** Đặt lịch chạy `chay`; trả hàm hủy. Lần chạy trước chưa xong thì bỏ qua lần đến hạn (không chạy chồng). */
export function lapLichKiemCong(chay: () => Promise<void>, o: { dau?: number; chuKy?: number; hen?: typeof setTimeout; lap?: typeof setInterval; boHen?: typeof clearTimeout; boLap?: typeof clearInterval } = {}): () => void {
  const { dau = DAU_KIEM_CONG, chuKy = CHU_KY_KIEM_CONG, hen = setTimeout, lap = setInterval, boHen = clearTimeout, boLap = clearInterval } = o;
  let dang = false;
  const mot = async () => {
    if (dang) return;
    dang = true;
    try {
      await chay();
    } catch {
      /* mất mạng, cổng lỗi: lần sau thử lại */
    } finally {
      dang = false;
    }
  };
  const t0 = hen(() => void mot(), dau);
  const t = lap(() => void mot(), chuKy);
  return () => {
    boHen(t0);
    boLap(t);
  };
}

export interface PhuThuocKiemCong {
  cong: CauHinhCong | null;
  khoaMo: { vanTay: string; biMat: CryptoKey } | null;
  docKhoaTinh: () => Promise<KhoaTinh | null>;
  taiGoiMoi: (cong: CauHinhCong, khoa: { tinh: KhoaTinh; biMat: CryptoKey }) => Promise<{ ketQua: string[]; soNhan: number }>;
  dsGoiTrenCong: (cong: CauHinhCong) => Promise<GoiTrenCong[]>;
  chuaTai: (ds: GoiTrenCong[]) => GoiTrenCong[];
  datChoNhan: (ds: GoiTrenCong[]) => void;
  bao: (s: string) => void;
  phatGoiMoi: () => void;
}

/** Một lần kiểm tra cổng. Trả "NHAN" (khóa mở, đã tải), "CHUONG" (khóa đóng / khóa khác: cập nhật chuông), "KHONG" (chưa cài cổng). */
export async function kiemCongMotLan(p: PhuThuocKiemCong): Promise<"NHAN" | "CHUONG" | "KHONG"> {
  if (!p.cong) return "KHONG";
  const km = p.khoaMo;
  const tinh = km ? await p.docKhoaTinh() : null;
  if (km && tinh && tinh.vanTay === km.vanTay) {
    const r = await p.taiGoiMoi(p.cong, { tinh, biMat: km.biMat });
    if (r.soNhan) {
      p.bao(`Đã tự nhận ${r.soNhan} gói mới từ cổng: ${r.ketQua.filter((k) => /nhận mới|cập nhật/.test(k)).map((k) => k.split(":")[0]).join("; ")}`);
      p.phatGoiMoi();
    }
    return "NHAN";
  }
  p.datChoNhan(p.chuaTai(await p.dsGoiTrenCong(p.cong)));
  return "CHUONG";
}

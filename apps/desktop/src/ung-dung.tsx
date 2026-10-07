import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KHOA_KHOI_PHUC, KHOA_TU_DONG, MAC_DINH_TU_DONG, cachTuDong, coVoWindows, denHan, saoLuuTuDong, type CaiDatTuDong } from "./tu-dong-sao-luu";
import type { BoChinhSach } from "@gpmb/core";
import { BO_CHINH_SACH } from "./du-lieu";
import { taoKhoIndexedDb, type CanBo, type Kho } from "./kho";
import { chiMucNguoi, type HoSoNguoi } from "./nguoi-co-dat";
import { LoiMayChu, docCheDo, laKhoMang } from "./kho-mang";
import type { DuAn, Ho } from "./mo-hinh";
import { docLanSaoLuu, ghiLanSaoLuu, maHoaBanSaoLuu, taoBanSaoLuu, tenTepSaoLuu } from "./sao-luu";
import { THOI_HAN_THUNG_RAC, duocXoaHan, lyDoKhongXoaDuAn, lyDoKhongXoaHo } from "./rang-buoc";
import { taiXuong } from "./tai-xuong";
import { chuyenDoiDuAn, chuyenDoiHo } from "./ra-soat-so";
import type { KhoaKhoiPhuc } from "./ma-hoa";
import { LICH_TRONG, type LichLamViec } from "./lich-lam-viec";
import { KHOA_TY_LE_CHAM, type GiaiDoanTyLe } from "./chi-tra";
import { KHOA_KY_BAO_CAO, type KyBaoCao } from "./ky-bao-cao";
import { KHOA_DON_VI, type DonVi } from "./don-vi";
import { KHOA_NGUONG_LECH, loiNguong, type NguongLechDt } from "./doi-chieu-dt";
import { KHOA_GOI, coBoChinhSach, dangKyGoi, type GoiDaNap } from "./goi-chinh-sach";
import { KHOA_LICH } from "./sao-luu";
import { coQuyen, dungMatKhau, taoTaiKhoan, tenHienThi, type NguoiDung, type Quyen, type VaiTro } from "./tai-khoan";

export type Man =
  | { ten: "tong-quan" }
  | { ten: "du-an"; duAnId?: string; tab?: string; ma?: string; hoId?: string }
  | { ten: "ho"; duAnId: string; hoId: string; tab?: string }
  | { ten: "ban-do"; duAnId: string }
  | { ten: "van-ban"; duAnId: string; ma?: string; hoId?: string }
  | { ten: "tra-cuu"; tim?: string }
  | { ten: "doc-scan" }
  | { ten: "kiem-tra-pa" }
  | { ten: "thung-rac" }
  | { ten: "ra-soat-so" }
  | { ten: "bao-cao" }
  | { ten: "don-vi" }
  | { ten: "huong-dan" }
  /** Hỏi đáp AI: nội bộ (không dùng mạng) hoặc Gemini API (khóa của người dùng). */
  | { ten: "hoi-dap" }
  /** Gửi dữ liệu lên tỉnh (cấp xã) / tổng hợp các đơn vị gửi lên (cấp tỉnh) — docs/21. */
  | { ten: "tong-hop-tinh"; tab?: "gui" | "tinh" }
  /** P3-4: hồ sơ được phân công cho tài khoản đang đăng nhập. */
  | { ten: "viec-cua-toi" }
  /** P3-2: người có đất có nhiều hồ sơ (khớp số định danh). */
  | { ten: "nguoi-co-dat" }
  /** Danh sách hồ sơ (mọi dự án hoặc một dự án) lọc theo hiện trạng, chặng quy trình, từ khóa — đích khi bấm vào các chỉ số. */
  | { ten: "ds-ho"; duAnId?: string; trangThai?: string; chang?: string; tim?: string };

/** Phiên xem dữ liệu đơn vị gửi lên tỉnh (tong-hop-tinh/xem-xa.ts): tài khoản chỉ xem, không tự sao lưu. */
export interface CheDoChiXem {
  taiKhoan: NguoiDung;
  nhan: string;
  manDau?: Man;
  thoat: () => void;
}

interface NguCanh {
  kho: Kho;
  /** Đang xem dữ liệu đơn vị gửi lên tỉnh (chỉ xem) */
  chiXem?: { nhan: string; thoat: () => void };
  /** Dự án đang dùng (không gồm dự án trong thùng rác). */
  dsDuAn: DuAn[];
  /** Hồ sơ của dự án (không gồm hồ sơ trong thùng rác; `kemDaXoa` = gồm cả — dùng khi kiểm trùng mã). */
  hoCua: (duAnId: string, kemDaXoa?: boolean) => Ho[];
  /** Thùng rác (P0-4): dự án, hồ sơ đã xóa mềm. */
  thungRac: { duAn: DuAn[]; ho: Ho[] };
  man: Man;
  di: (m: Man) => void;
  /** Quay lại màn trước (nút Quay lại, Alt + ←, nút lùi của chuột). */
  quayLai: () => void;
  coTheQuayLai: boolean;
  /** Thiết lập đơn vị (Công cụ). */
  dsDonVi: DonVi[];
  /** Ảnh nền thanh tiêu đề do đơn vị chọn (data URL); null = ảnh núi đồi mặc định. */
  anhNen: string | null;
  /** Khóa khôi phục cho sao lưu (P0-5); null = quản trị chưa đặt mật khẩu khôi phục. */
  khoaKhoiPhuc: KhoaKhoiPhuc | null;
  luuKhoaKhoiPhuc: (k: KhoaKhoiPhuc) => Promise<void>;
  luuAnhNen: (url: string | null) => Promise<void>;
  luuDonVi: (ds: DonVi[]) => Promise<void>;
  /** Lưu dự án; mặc định cần quyền SUA_HO_SO (chốt/duyệt phương án truyền quyền riêng). */
  luuDuAn: (d: DuAn, quyen?: Quyen) => Promise<void>;
  luuHo: (h: Ho, nhatKy?: string) => Promise<void>;
  /** Lưu nhiều hồ sơ (cập nhật hàng loạt), tải lại một lần; trả về số hồ sơ lưu được và lỗi từng hồ sơ. */
  luuNhieuHo: (ds: { h: Ho; nhatKy: string }[]) => Promise<{ daLuu: number; loi: string[] }>;
  /** Ghi dự án và các hồ sơ hộ trong một giao dịch (P3-3 giao lô TĐC, bốc thăm); false nếu bị chặn/lỗi (đã báo). */
  ghiDuAnVaHo: (d: DuAn, ds: { h: Ho; nhatKy: string }[], nhatKyDuAn?: [string, string]) => Promise<boolean>;
  /** Xóa mềm (vào thùng rác) — chặn khi có phương án đã chốt/duyệt, chi trả. Trả false nếu bị chặn/lỗi. */
  xoaHo: (id: string, lyDo: string) => Promise<boolean>;
  /**
   * Xóa mềm nhiều hồ sơ (vào thùng rác) trong một lô: hộ có phương án đã chốt/duyệt hoặc đã chi trả bị chặn, kèm lý do.
   * null = không ghi được (lỗi đã báo).
   */
  xoaNhieuHo: (ids: string[], lyDo: string) => Promise<{ daXoa: Ho[]; biChan: { h: Ho; lyDo: string[] }[] } | null>;
  xoaDuAn: (id: string, lyDo: string) => Promise<boolean>;
  khoiPhucHo: (id: string) => Promise<void>;
  khoiPhucDuAn: (id: string) => Promise<void>;
  /** Xóa hẳn khỏi thùng rác: quyền XOA_HAN, sau THOI_HAN_THUNG_RAC ngày. */
  xoaHanHo: (id: string) => Promise<void>;
  xoaHanDuAn: (id: string) => Promise<void>;
  chinhSach: (d: DuAn) => BoChinhSach;
  dangTai: boolean;
  nguoiDung: string;
  /** Nạp lại toàn bộ dữ liệu từ kho (sau khôi phục). */
  taiLai: () => Promise<void>;
  hopSaoLuu: boolean;
  moSaoLuu: (mo: boolean) => void;
  lanSaoLuu: string | null;
  datLanSaoLuu: (luc: string) => void;
  /** Tài khoản đang đăng nhập (null = chưa đăng nhập). */
  taiKhoan: NguoiDung | null;
  coTaiKhoan: boolean | null;
  quyen: (q: Quyen) => boolean;
  dangNhap: (ten: string, matKhau: string) => Promise<string | null>;
  dangXuat: () => Promise<void>;
  khoiTaoQuanTri: (v: { ten: string; hoTen: string; chucVu: string; matKhau: string }) => Promise<void>;
  capNhatTaiKhoan: (u: NguoiDung) => void;
  ghiNhatKy: (hanhDong: string, chiTiet?: string) => Promise<void>;
  /** Thông báo ngắn góc màn hình. */
  bao: (noiDung: string, loai?: "ok" | "loi") => void;
  thongBao: { noiDung: string; loai: "ok" | "loi"; id: number } | null;
  /** Lịch ngày nghỉ, làm bù (VM-25). */
  lich: LichLamViec;
  luuLich: (l: LichLamViec) => Promise<void>;
  hopCaiDat: boolean;
  moCaiDat: (mo: boolean) => void;
  /** Tỷ lệ tiền chậm nộp theo giai đoạn (điểm b k3 Đ94 LĐĐ) do cán bộ nhập kèm căn cứ. */
  tyLeCham: GiaiDoanTyLe[];
  luuTyLeCham: (ds: GiaiDoanTyLe[]) => Promise<void>;
  tuDong: CaiDatTuDong;
  luuTuDong: (c: CaiDatTuDong) => Promise<void>;
  /** Các kỳ báo cáo đã chốt số liệu (src/ky-bao-cao.ts). */
  kyBaoCao: KyBaoCao[];
  /** Thêm kỳ đã chốt — quyền CAI_DAT (lãnh đạo, quản trị). */
  themKyBaoCao: (k: KyBaoCao) => Promise<void>;
  xoaKyBaoCao: (id: string, lyDo: string) => Promise<void>;
  /** Sao lưu tự động ngay (bỏ qua chu kỳ). */
  saoLuuTuDongNgay: () => Promise<CaiDatTuDong>;
  /** P1-5: khôi phục hồ sơ về bản trong lịch sử (quyền KHOI_PHUC_BAN_GHI — quản trị); trả false nếu bị chặn/lỗi. */
  khoiPhucLichSu: (stt: number, lyDo: string) => Promise<boolean>;
  /** Số năm giữ lịch sử bản ghi (0 = không thời hạn) — quản trị đặt. */
  giuLichSu: number;
  luuGiuLichSu: (soNam: number) => Promise<void>;
  /** §11.3: ngưỡng lệch diện tích do đơn vị đặt (null = chưa đặt). */
  nguongLechDt: NguongLechDt | null;
  luuNguongLechDt: (n: NguongLechDt | null) => Promise<void>;
  /** P3-2: chỉ mục số định danh → hồ sơ ở mọi dự án (người có đất dùng chung). */
  nguoiCoDat: Map<string, HoSoNguoi[]>;
  /** P3-4: cán bộ để phân công phụ trách hồ sơ. */
  dsCanBo: CanBo[];
  /** P2-1: gói chính sách đã nạp (ngoài bộ có sẵn). */
  goiDaNap: GoiDaNap[];
  napGoi: (g: Omit<GoiDaNap, "napLuc" | "napBoi">) => Promise<boolean>;
  /** Chuyển dự án sang bộ chính sách khác (bản phương án đã chốt/duyệt giữ bộ cũ). */
  chuyenBoChinhSach: (duAnId: string, khoa: string, tomTat: string) => Promise<boolean>;
}

const Ctx = createContext<NguCanh | null>(null);
/** "yyyy-mm-dd…" → "dd/mm/yyyy" cho nội dung nhật ký. */
const vn = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const KHONG_CO_HO: Ho[] = [];
const chinhSach = (d: DuAn): BoChinhSach => BO_CHINH_SACH[d.boChinhSach] ?? BO_CHINH_SACH["sonla-2026-03-31"]!;

/** Lỗi đã báo cho người dùng (xung đột, không có quyền trên máy chủ…) — người gọi không cần xử lý thêm. */
export class DaBaoLoi extends Error {}
if (typeof window !== "undefined")
  window.addEventListener("unhandledrejection", (e) => {
    if (e.reason instanceof DaBaoLoi) e.preventDefault();
  });

export function useUngDung(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error("Thiếu NguCanh");
  return c;
}

/** `phienDau`: trở lại phiên làm việc (tài khoản, màn hình) sau khi thoát phiên chỉ xem — không phải đăng nhập lại. */
export function NhaCungCap({ children, kho: khoVao, chiXem, phienDau }: { children: ReactNode; kho?: Kho; chiXem?: CheDoChiXem; phienDau?: { taiKhoan: NguoiDung; man: Man } }) {
  const kho = useMemo(() => khoVao ?? taoKhoIndexedDb(), [khoVao]);
  const [dsDuAn, setDsDuAn] = useState<DuAn[]>([]);
  const [dsHo, setDsHo] = useState<Ho[]>([]);
  const [khoaKhoiPhuc, setKhoaKhoiPhuc] = useState<KhoaKhoiPhuc | null>(null);
  const [man, setMan] = useState<Man>(chiXem?.manDau ?? phienDau?.man ?? { ten: "tong-quan" });
  const [lichSu, setLichSu] = useState<Man[]>([]);
  const [dsDonVi, setDsDonVi] = useState<DonVi[]>([]);
  const [anhNen, setAnhNen] = useState<string | null>(null);
  // Lịch sử điều hướng giữ trong ref để tránh tác dụng phụ trong hàm cập nhật state (StrictMode gọi 2 lần)
  const manRef = useRef<Man>(man);
  const lichSuRef = useRef<Man[]>([]);
  const di = useCallback((m: Man) => {
    const cu = manRef.current;
    if (JSON.stringify(cu) !== JSON.stringify(m)) {
      lichSuRef.current = [...lichSuRef.current.slice(-49), cu];
      setLichSu(lichSuRef.current);
    }
    manRef.current = m;
    setMan(m);
  }, []);
  const quayLai = useCallback(() => {
    const ls = lichSuRef.current;
    if (!ls.length) return;
    const m = ls[ls.length - 1]!;
    lichSuRef.current = ls.slice(0, -1);
    setLichSu(lichSuRef.current);
    manRef.current = m;
    setMan(m);
  }, []);
  const [dangTai, setDangTai] = useState(true);
  const [taiKhoan, setTaiKhoan] = useState<NguoiDung | null>(chiXem?.taiKhoan ?? phienDau?.taiKhoan ?? null);
  const [coTaiKhoan, setCoTaiKhoan] = useState<boolean | null>(null);
  const [thongBao, setThongBao] = useState<NguCanh["thongBao"]>(null);
  const [lich, setLich] = useState<LichLamViec>(LICH_TRONG);
  const [hopCaiDat, moCaiDat] = useState(false);
  const [tyLeCham, setTyLeCham] = useState<GiaiDoanTyLe[]>([]);
  const [tuDong, setTuDong] = useState<CaiDatTuDong>(MAC_DINH_TU_DONG);
  const [kyBaoCao, setKyBaoCao] = useState<KyBaoCao[]>([]);
  const [giuLichSu, setGiuLichSu] = useState(0);
  const [nguongLechDt, setNguongLechDt] = useState<NguongLechDt | null>(null);
  const [goiDaNap, setGoiDaNap] = useState<GoiDaNap[]>([]);
  const [dsCanBo, setDsCanBo] = useState<CanBo[]>([]);
  const dangTuDong = useRef(false);
  const [sai, setSai] = useState<{ lan: number; den: number }>({ lan: 0, den: 0 });
  const nguoiDung = tenHienThi(taiKhoan);
  const quyen = (q: Quyen) => coQuyen(taiKhoan?.vaiTro, q);
  const bao = useCallback((noiDung: string, loai: "ok" | "loi" = "ok") => {
    const id = Date.now();
    setThongBao({ noiDung, loai, id });
    setTimeout(() => setThongBao((t) => (t?.id === id ? null : t)), loai === "loi" ? 6000 : 3500);
  }, []);
  // Lỗi không được bắt ở nút bấm (xuất tệp, lưu…) → luôn báo cho người dùng, không im lặng
  useEffect(() => {
    const f = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof DaBaoLoi) return;
      console.error(e.reason);
      bao(`Không thực hiện được: ${String((e.reason as Error)?.message ?? e.reason)}`, "loi");
    };
    window.addEventListener("unhandledrejection", f);
    return () => window.removeEventListener("unhandledrejection", f);
  }, [bao]);
  // Vỏ desktop: báo nơi đã lưu tệp tải về (tai-xuong.ts)
  useEffect(() => {
    const f = (e: Event) => bao(`Đã lưu tệp: ${(e as CustomEvent<string>).detail}`);
    window.addEventListener("gpmb-da-tai", f);
    return () => window.removeEventListener("gpmb-da-tai", f);
  }, [bao]);
  const ghiNhatKy = async (hanhDong: string, chiTiet?: string) => {
    await kho.ghiNhatKy({ nguoi: taiKhoan?.ten ?? "", hoTen: taiKhoan?.hoTen ?? "", hanhDong, chiTiet });
  };
  /** Chặn ghi khi không có quyền (lớp bảo vệ chung; nút bấm cũng được ẩn/khóa theo quyền). */
  const chan = (q: Quyen) => {
    if (coQuyen(taiKhoan?.vaiTro, q)) return false;
    bao(`Tài khoản ${taiKhoan ? `"${taiKhoan.ten}"` : ""} không có quyền: ${q === "SUA_HO_SO" ? "sửa dữ liệu" : q}`, "loi");
    return true;
  };
  const [hopSaoLuu, moSaoLuu] = useState(false);
  const [lanSaoLuu, setLanSaoLuu] = useState<string | null>(() => docLanSaoLuu());

  const taiLai = useCallback(async () => {
    if (laKhoMang(kho) && !kho.coPhien()) return; // máy chủ: chỉ tải sau khi đăng nhập
    const l = await kho.docCaiDat<LichLamViec>(KHOA_LICH);
    if (l) setLich(l);
    setTyLeCham((await kho.docCaiDat<GiaiDoanTyLe[]>(KHOA_TY_LE_CHAM)) ?? []);
    const td = await kho.docCaiDat<CaiDatTuDong>(KHOA_TU_DONG);
    if (td) setTuDong({ ...MAC_DINH_TU_DONG, ...td });
    setKyBaoCao((await kho.docCaiDat<KyBaoCao[]>(KHOA_KY_BAO_CAO)) ?? []);
    setDsDonVi((await kho.docCaiDat<DonVi[]>(KHOA_DON_VI)) ?? []);
    setAnhNen((await kho.docCaiDat<string>("anhNen")) ?? null);
    setKhoaKhoiPhuc((await kho.docCaiDat<KhoaKhoiPhuc>(KHOA_KHOI_PHUC)) ?? null);
    setGiuLichSu((await kho.docCaiDat<{ soNam: number }>("giuLichSu"))?.soNam ?? 0);
    setNguongLechDt((await kho.docCaiDat<NguongLechDt>(KHOA_NGUONG_LECH)) ?? null);
    const goi = (await kho.docCaiDat<GoiDaNap[]>(KHOA_GOI)) ?? [];
    dangKyGoi(goi); // trước khi nạp dự án: tính toán dùng đúng bộ chính sách của dự án
    setGoiDaNap(goi);
    setDsCanBo(await kho.dsCanBo().catch(() => []));
    const da = await kho.dsDuAn();
    const hos = (await Promise.all(da.map((d) => kho.dsHo(d.id)))).flat();
    setDsDuAn(da.sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)));
    setDsHo(hos.sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true })));
    setDangTai(false);
  }, [kho]);

  /**
   * P1-2: cập nhật trạng thái bằng các bản ghi vừa lưu / vừa đổi, không tải lại toàn bộ. Bản ghi không đổi giữ nguyên
   * tham chiếu → kết quả tính, thống kê đã ghi nhớ (P1-1) được dùng lại.
   */
  const capNhat = useCallback((x: { duAn?: DuAn[]; ho?: Ho[]; xoaDuAn?: string[]; xoaHo?: string[] }) => {
    if (x.duAn?.length || x.xoaDuAn?.length) {
      const bo = new Set(x.xoaDuAn ?? []);
      setDsDuAn((ds) => {
        const moi = new Map((x.duAn ?? []).map((d) => [d.id, d]));
        const out = ds.filter((d) => !bo.has(d.id)).map((d) => moi.get(d.id) ?? d);
        for (const d of moi.values()) if (!ds.some((y) => y.id === d.id)) out.push(d);
        return out.sort((a, b) => b.taoLuc.localeCompare(a.taoLuc));
      });
    }
    if (x.ho?.length || x.xoaHo?.length || x.xoaDuAn?.length) {
      const bo = new Set(x.xoaHo ?? []);
      const boDa = new Set(x.xoaDuAn ?? []);
      setDsHo((ds) => {
        const moi = new Map((x.ho ?? []).map((h) => [h.id, h]));
        const out = ds.filter((h) => !bo.has(h.id) && !boDa.has(h.duAnId)).map((h) => moi.get(h.id) ?? h);
        let them = false;
        for (const h of moi.values()) if (!ds.some((y) => y.id === h.id)) (out.push(h), (them = true));
        return them ? out.sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true })) : out;
      });
    }
  }, []);

  /** Ghi qua máy chủ: báo lỗi (xung đột, quyền, quy tắc) và tải lại bản mới nhất; ném DaBaoLoi để màn hình giữ bản nháp. */
  const ghi = async <T,>(f: () => Promise<T>): Promise<T> => {
    try {
      return await f();
    } catch (e) {
      if (!(e instanceof LoiMayChu)) throw e;
      bao(e.message, "loi");
      if (e.ma === 401) setTaiKhoan(null);
      else await taiLai().catch(() => undefined);
      throw new DaBaoLoi(e.message);
    }
  };
  // P0-2: chuyển giá trị số cũ một nghĩa ("9222,1") sang chuẩn máy — một lần mỗi phiên, một giao dịch, ghi nhật ký
  const daChuyenDoi = useRef(false);
  useEffect(() => {
    if (daChuyenDoi.current || dangTai || !taiKhoan || !coQuyen(taiKhoan.vaiTro, "SUA_HO_SO")) return;
    daChuyenDoi.current = true;
    const hoDoi = dsHo.map(chuyenDoiHo).filter((x) => x !== null);
    const daDoi = dsDuAn.map(chuyenDoiDuAn).filter((x) => x !== null);
    if (!hoDoi.length && !daDoi.length) return;
    const n = [...hoDoi, ...daDoi].reduce((s, x) => s + x.doi.length, 0);
    void (async () => {
      try {
        await kho.ghiLo({ ho: hoDoi.map((x) => x.h), duAn: daDoi.map((x) => x.d) });
        await ghiNhatKy("Chuyển đổi định dạng số (P0-2)", `${n} giá trị ở ${hoDoi.length} hồ sơ, ${daDoi.length} dự án: ${[...hoDoi.flatMap((x) => x.doi), ...daDoi.flatMap((x) => x.doi)].slice(0, 20).map((d) => `${d.nhan} "${d.tu}" → ${d.thanh}`).join("; ")}`);
        bao(`Đã chuyển ${n} giá trị số sang định dạng chuẩn (chi tiết trong Nhật ký hồ sơ)`);
        await taiLai();
      } catch {
        /* máy khác vừa chuyển đổi / xung đột: lần mở sau thử lại */
      }
    })();
  }, [dangTai, taiKhoan, dsHo, dsDuAn]); // eslint-disable-line react-hooks/exhaustive-deps
  // Máy chủ: hỏi thay đổi định kỳ, tải lại khi người khác vừa cập nhật
  const seq = useRef<number | null>(null);
  useEffect(() => {
    if (!laKhoMang(kho) || kho.noiBo || !taiKhoan) return;
    let dung = false;
    const hoi = async () => {
      try {
        const r = await kho.thayDoi(seq.current);
        const cuaNguoiKhac = r.ds.filter((x) => x.boi !== taiKhoan.ten);
        const lanDau = seq.current === null;
        seq.current = r.seq;
        if (!lanDau && cuaNguoiKhac.length && !dung) {
          // P1-2: chỉ tải các bản ghi vừa đổi; thay đổi khác (cài đặt, khôi phục toàn bộ) → tải lại hết
          if (cuaNguoiKhac.every((x) => ["ho", "duAn", "pa", "td", "ct"].includes(x.loai))) {
            const r = await kho.docLai(cuaNguoiKhac);
            capNhat(r);
          } else await taiLai();
          const ai = [...new Set(cuaNguoiKhac.map((x) => x.boi))].join(", ");
          bao(`Dữ liệu vừa được cập nhật bởi ${ai}`);
        }
      } catch (e) {
        if (e instanceof LoiMayChu && e.ma === 401) {
          setTaiKhoan(null);
          bao("Phiên đăng nhập đã hết — đăng nhập lại", "loi");
        }
      }
    };
    void hoi();
    const t = setInterval(() => void hoi(), 4000);
    return () => {
      dung = true;
      clearInterval(t);
    };
  }, [kho, taiKhoan, taiLai, bao, capNhat]);

  // Máy đơn: báo một lần sau khi dữ liệu IndexedDB cũ được chuyển sang SQLite (may-don.ts)
  useEffect(() => {
    if (!taiKhoan) return;
    try {
      const x = sessionStorage.getItem("gpmb-da-chuyen-sqlite");
      if (x !== null) {
        sessionStorage.removeItem("gpmb-da-chuyen-sqlite");
        bao(`Đã chuyển dữ liệu máy đơn sang cơ sở dữ liệu SQLite: ${x}. Dữ liệu cũ vẫn giữ nguyên trên máy.`);
      }
    } catch {
      /* không có sessionStorage */
    }
  }, [taiKhoan, bao]);
  useEffect(() => { kho.datNguoi(taiKhoan ? `${taiKhoan.hoTen} (${taiKhoan.ten})` : ""); }, [kho, taiKhoan]);
  useEffect(() => {
    void taiLai();
    if (laKhoMang(kho)) void kho.trangThai().then((t) => setCoTaiKhoan(t.coTaiKhoan), (e) => bao(String((e as Error).message ?? e), "loi"));
    else void kho.dsNguoiDung().then((ds) => setCoTaiKhoan(ds.length > 0));
  }, [taiLai, kho, bao]);

  const chayTuDong = useCallback(
    async (epBuoc: boolean): Promise<CaiDatTuDong> => {
      const c = { ...MAC_DINH_TU_DONG, ...((await kho.docCaiDat<CaiDatTuDong>(KHOA_TU_DONG)) ?? {}) };
      // máy trạm không tự sao lưu (máy chủ hoặc máy đơn đảm nhận)
      if (dangTuDong.current || !coVoWindows() || docCheDo().cheDo === "MAY_TRAM" || chiXem) return c;
      if (!epBuoc && (!denHan(c) || (await kho.dsDuAn()).length === 0)) return c;
      dangTuDong.current = true;
      try {
        const moi = await saoLuuTuDong(kho, c);
        await kho.luuCaiDat(KHOA_TU_DONG, moi);
        setTuDong(moi);
        await kho.ghiNhatKy({ nguoi: "he-thong", hoTen: "Tự động", hanhDong: moi.lanCuoi !== c.lanCuoi ? "Tự động sao lưu" : "Tự động sao lưu không thành công", chiTiet: moi.lanCuoi !== c.lanCuoi ? moi.tepCuoi : moi.loiCuoi });
        return moi;
      } finally {
        dangTuDong.current = false;
      }
    },
    [kho, chiXem],
  );
  useEffect(() => {
    if (!taiKhoan || !coVoWindows() || chiXem) return;
    const t0 = setTimeout(() => void chayTuDong(false), 15_000);
    const t = setInterval(() => void chayTuDong(false), 30 * 60_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [taiKhoan?.ten, chayTuDong, chiXem]);

  const dauXoa = (lyDo: string) => ({ luc: new Date().toISOString(), nguoi: nguoiDung, lyDo: lyDo.trim() });
  // P1-1: danh sách dẫn xuất ghi nhớ theo dữ liệu gốc — màn hình dùng useMemo phụ thuộc các giá trị này không tính lại
  // khi chỉ có trạng thái giao diện thay đổi
  const dsDuAnCon = useMemo(() => dsDuAn.filter((d) => !d.daXoa), [dsDuAn]);
  const hoTheoDuAn = useMemo(() => {
    const m = new Map<string, { tat: Ho[]; con: Ho[] }>();
    for (const h of dsHo) {
      let x = m.get(h.duAnId);
      if (!x) m.set(h.duAnId, (x = { tat: [], con: [] }));
      x.tat.push(h);
      if (!h.daXoa) x.con.push(h);
    }
    return m;
  }, [dsHo]);
  const hoCua = useCallback((id: string, kemDaXoa?: boolean) => (kemDaXoa ? hoTheoDuAn.get(id)?.tat : hoTheoDuAn.get(id)?.con) ?? KHONG_CO_HO, [hoTheoDuAn]);
  const thungRac = useMemo(() => ({ duAn: dsDuAn.filter((d) => d.daXoa), ho: dsHo.filter((h) => h.daXoa && !dsDuAn.find((d) => d.id === h.duAnId)?.daXoa) }), [dsDuAn, dsHo]);
  const nguoiCoDat = useMemo(() => chiMucNguoi(dsDuAn, dsHo), [dsDuAn, dsHo]);
  const giaTri: NguCanh = {
    kho,
    chiXem: chiXem ? { nhan: chiXem.nhan, thoat: chiXem.thoat } : undefined,
    nguoiCoDat,
    dsCanBo,
    dsDuAn: dsDuAnCon,
    hoCua,
    thungRac,
    man,
    di,
    quayLai,
    coTheQuayLai: lichSu.length > 0,
    dsDonVi,
    anhNen,
    luuAnhNen: async (url) => {
      if (chan("CAI_DAT")) return;
      await ghi(() => kho.luuCaiDat("anhNen", url));
      setAnhNen(url);
      await ghiNhatKy(url ? "Đổi ảnh nền thanh tiêu đề" : "Dùng lại ảnh nền mặc định");
    },
    khoaKhoiPhuc,
    luuKhoaKhoiPhuc: async (k) => {
      if (chan("KHOI_PHUC")) return;
      await ghi(() => kho.luuCaiDat(KHOA_KHOI_PHUC, k));
      setKhoaKhoiPhuc(k);
      await ghiNhatKy(khoaKhoiPhuc ? "Đổi mật khẩu khôi phục sao lưu" : "Đặt mật khẩu khôi phục sao lưu", `khóa ${k.vanTay}`);
    },
    luuDonVi: async (ds) => {
      if (chan("CAI_DAT")) return;
      await ghi(() => kho.luuCaiDat(KHOA_DON_VI, ds));
      setDsDonVi(ds);
      await ghiNhatKy("Cập nhật thiết lập đơn vị", ds.map((d) => `${d.ten}${d.suDung ? " (đơn vị sử dụng)" : ""}`).join("; "));
    },
    luuDuAn: async (d, q = "SUA_HO_SO") => {
      if (chan(q)) return;
      capNhat({ duAn: [await ghi(() => kho.luuDuAn(d))] });
    },
    luuHo: async (h, nk) => {
      if (chan("SUA_HO_SO")) return;
      const ban = nk ? { ...h, nhatKy: [...h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: nk }] } : h;
      capNhat({ ho: [await ghi(() => kho.luuHo(ban))] });
    },
    luuNhieuHo: async (ds) => {
      if (chan("SUA_HO_SO")) return { daLuu: 0, loi: ["Tài khoản không có quyền sửa hồ sơ"] };
      // Nguyên tử (P0-6, QD: cập nhật hàng loạt hủy cả lô khi có hộ bị người khác sửa cùng lúc)
      const luc = new Date().toISOString();
      try {
        const r = await kho.ghiLo({ ho: ds.map(({ h, nhatKy }) => ({ ...h, nhatKy: [...h.nhatKy, { luc, nguoi: nguoiDung, noiDung: nhatKy }] })) });
        capNhat({ ho: r.ho });
        return { daLuu: ds.length, loi: [] };
      } catch (e) {
        if (e instanceof LoiMayChu && e.ma === 401) setTaiKhoan(null);
        await taiLai();
        return { daLuu: 0, loi: [`Chưa cập nhật hộ nào (cả lô bị hủy): ${(e as Error).message}. Dữ liệu đã được tải lại — thực hiện lại thao tác.`] };
      }
    },
    ghiDuAnVaHo: async (d, ds, nk) => {
      if (chan("SUA_HO_SO")) return false;
      const luc = new Date().toISOString();
      try {
        const r = await ghi(() => kho.ghiLo({ duAn: [d], ho: ds.map(({ h, nhatKy }) => ({ ...h, nhatKy: [...h.nhatKy, { luc, nguoi: nguoiDung, noiDung: nhatKy }] })) }));
        capNhat({ duAn: r.duAn, ho: r.ho });
      } catch (e) {
        if (!(e instanceof DaBaoLoi)) bao(`Không lưu được: ${(e as Error).message}`, "loi");
        return false;
      }
      if (nk) await ghiNhatKy(nk[0], nk[1]);
      return true;
    },
    xoaHo: async (id, lyDo) => {
      if (chan("SUA_HO_SO")) return false;
      const h = dsHo.find((x) => x.id === id);
      if (!h) return false;
      const ly = lyDoKhongXoaHo(dsDuAn.find((d) => d.id === h.duAnId), h);
      if (ly.length) return bao(`Không xóa được hồ sơ ${h.ma}: ${ly.join("; ")}. Hủy bản phương án (có lý do) hoặc hủy đợt chi trước.`, "loi"), false;
      if (!lyDo.trim()) return bao("Xóa hồ sơ cần ghi lý do", "loi"), false;
      try {
        capNhat({ ho: [await ghi(() => kho.luuHo({ ...h, daXoa: dauXoa(lyDo), nhatKy: [...h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Đưa vào thùng rác: ${lyDo.trim()}` }] }))] });
      } catch {
        return false;
      }
      await ghiNhatKy("Xóa hồ sơ (vào thùng rác)", `${h.ma} · ${h.ten} — ${lyDo.trim()}`);
      return true;
    },
    xoaNhieuHo: async (ids, lyDo) => {
      if (chan("SUA_HO_SO")) return null;
      if (!lyDo.trim()) return bao("Xóa hồ sơ cần ghi lý do", "loi"), null;
      const ds = ids.map((id) => dsHo.find((x) => x.id === id)).filter((h): h is Ho => !!h && !h.daXoa);
      const biChan = ds.map((h) => ({ h, lyDo: lyDoKhongXoaHo(dsDuAn.find((d) => d.id === h.duAnId), h) })).filter((x) => x.lyDo.length);
      const chanId = new Set(biChan.map((x) => x.h.id));
      const xoa = ds.filter((h) => !chanId.has(h.id));
      if (!xoa.length) return { daXoa: [], biChan };
      const luc = new Date().toISOString();
      const nk = { luc, nguoi: nguoiDung, noiDung: `Đưa vào thùng rác (xóa nhiều hồ sơ): ${lyDo.trim()}` };
      try {
        // một lô nguyên tử (P0-6): lỗi giữa chừng → không hộ nào bị xóa
        const r = await ghi(() => kho.ghiLo({ ho: xoa.map((h) => ({ ...h, daXoa: dauXoa(lyDo), nhatKy: [...h.nhatKy, nk] })) }));
        capNhat({ ho: r.ho });
      } catch (e) {
        if (!(e instanceof DaBaoLoi)) bao(`Không xóa được: ${(e as Error).message}`, "loi");
        return null;
      }
      await ghiNhatKy(`Xóa ${xoa.length} hồ sơ (vào thùng rác)`, `${xoa.map((h) => `${h.ma} · ${h.ten}`).join("; ")} — ${lyDo.trim()}${biChan.length ? ` · bị chặn ${biChan.length}: ${biChan.map((x) => `${x.h.ma} (${x.lyDo.join("; ")})`).join("; ")}` : ""}`);
      return { daXoa: xoa, biChan };
    },
    khoiPhucHo: async (id) => {
      if (chan("SUA_HO_SO")) return;
      const h = dsHo.find((x) => x.id === id);
      if (!h?.daXoa) return;
      const { daXoa: _bo, ...con } = h;
      capNhat({ ho: [await ghi(() => kho.luuHo({ ...con, nhatKy: [...h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: "Khôi phục từ thùng rác" }] }))] });
      await ghiNhatKy("Khôi phục hồ sơ từ thùng rác", `${h.ma} · ${h.ten}`);
    },
    xoaHanHo: async (id) => {
      if (chan("XOA_HAN")) return;
      const h = dsHo.find((x) => x.id === id);
      if (!h?.daXoa || !duocXoaHan(h.daXoa)) return bao(`Chỉ xóa hẳn hồ sơ đã nằm trong thùng rác đủ ${THOI_HAN_THUNG_RAC} ngày`, "loi");
      await ghi(() => kho.ghiLo({ xoaHo: [id] }));
      capNhat({ xoaHo: [id] });
      await ghiNhatKy("Xóa hẳn hồ sơ", `${h.ma} · ${h.ten} (vào thùng rác ${vn(h.daXoa.luc)} bởi ${h.daXoa.nguoi}: ${h.daXoa.lyDo})`);
    },
    xoaDuAn: async (id, lyDo) => {
      if (chan("XOA_DU_AN")) return false;
      const d = dsDuAn.find((x) => x.id === id);
      if (!d) return false;
      const ly = lyDoKhongXoaDuAn(d, dsHo.filter((h) => h.duAnId === id));
      if (ly.length) return bao(`Không xóa được dự án: ${ly.join("; ")}`, "loi"), false;
      if (!lyDo.trim()) return bao("Xóa dự án cần ghi lý do", "loi"), false;
      try {
        capNhat({ duAn: [await ghi(() => kho.luuDuAn({ ...d, daXoa: dauXoa(lyDo) }))] });
      } catch {
        return false;
      }
      await ghiNhatKy("Xóa dự án (vào thùng rác)", `${d.ten} — ${lyDo.trim()}`);
      return true;
    },
    khoiPhucDuAn: async (id) => {
      if (chan("XOA_DU_AN")) return;
      const d = dsDuAn.find((x) => x.id === id);
      if (!d?.daXoa) return;
      const { daXoa: _bo, ...con } = d;
      capNhat({ duAn: [await ghi(() => kho.luuDuAn(con))] });
      await ghiNhatKy("Khôi phục dự án từ thùng rác", d.ten);
    },
    xoaHanDuAn: async (id) => {
      if (chan("XOA_HAN")) return;
      const d = dsDuAn.find((x) => x.id === id);
      if (!d?.daXoa || !duocXoaHan(d.daXoa)) return bao(`Chỉ xóa hẳn dự án đã nằm trong thùng rác đủ ${THOI_HAN_THUNG_RAC} ngày`, "loi");
      // Bản sao lưu toàn bộ dữ liệu trước khi xóa hẳn (cán bộ chọn nơi lưu; Hủy = không xóa)
      const ban = await taoBanSaoLuu(kho);
      const bytes = await maHoaBanSaoLuu(ban, await cachTuDong(kho)); // mã hóa bằng khóa khôi phục / DPAPI (P0-5)
      if (!(await taiXuong(bytes, tenTepSaoLuu(ban.thongTin.luc, "GPMB-truoc-xoa-du-an"), "application/zip"))) return bao("Chưa lưu bản sao lưu trước khi xóa — không xóa dự án", "loi");
      await ghi(() => kho.ghiLo({ xoaDuAn: [id] }));
      capNhat({ xoaDuAn: [id] });
      await ghiNhatKy("Xóa hẳn dự án", `${d.ten} (vào thùng rác ${vn(d.daXoa.luc)} bởi ${d.daXoa.nguoi}: ${d.daXoa.lyDo})`);
    },
    chinhSach,
    dangTai,
    nguoiDung,
    taiLai,
    hopSaoLuu,
    moSaoLuu,
    lanSaoLuu,
    datLanSaoLuu: (luc) => {
      ghiLanSaoLuu(luc);
      setLanSaoLuu(luc);
    },
    taiKhoan,
    coTaiKhoan,
    quyen,
    dangNhap: async (ten, matKhau) => {
      if (laKhoMang(kho)) {
        try {
          const u = await kho.dangNhap(ten.trim().toLowerCase(), matKhau);
          setTaiKhoan(u);
          setDangTai(true);
          await taiLai();
          return null;
        } catch (e) {
          return (e as Error).message;
        }
      }
      if (Date.now() < sai.den) return `Nhập sai nhiều lần — thử lại sau ${Math.ceil((sai.den - Date.now()) / 1000)} giây`;
      const u = (await kho.dsNguoiDung()).find((x) => x.ten === ten.trim().toLowerCase());
      const dung = !!u && u.hoatDong && (await dungMatKhau(u, matKhau));
      if (!dung) {
        const lan = sai.lan + 1;
        setSai({ lan, den: lan >= 5 ? Date.now() + 30_000 : 0 });
        await kho.ghiNhatKy({ nguoi: ten.trim().toLowerCase(), hoTen: "", hanhDong: "Đăng nhập không thành công", chiTiet: u && !u.hoatDong ? "tài khoản đã khóa" : "" });
        return u && !u.hoatDong ? "Tài khoản đã bị khóa — liên hệ quản trị" : "Sai tên đăng nhập hoặc mật khẩu";
      }
      setSai({ lan: 0, den: 0 });
      const moi = { ...u!, dangNhapCuoi: new Date().toISOString() };
      await kho.luuNguoiDung(moi);
      await kho.ghiNhatKy({ nguoi: moi.ten, hoTen: moi.hoTen, hanhDong: "Đăng nhập" });
      setTaiKhoan(moi);
      return null;
    },
    dangXuat: async () => {
      if (chiXem) return chiXem.thoat();
      if (laKhoMang(kho)) await kho.dangXuat().catch(() => undefined);
      else if (taiKhoan) await ghiNhatKy("Đăng xuất");
      setTaiKhoan(null);
      manRef.current = { ten: "tong-quan" };
      lichSuRef.current = [];
      setMan({ ten: "tong-quan" });
      setLichSu([]);
    },
    khoiTaoQuanTri: async (v) => {
      if (laKhoMang(kho)) {
        const u = await kho.khoiTao(await taoTaiKhoan([], { ...v, vaiTro: "QUAN_TRI" as VaiTro }));
        setCoTaiKhoan(true);
        setTaiKhoan(u);
        await taiLai();
        return;
      }
      if ((await kho.dsNguoiDung()).length) throw new Error("Đã có tài khoản — đăng nhập để tiếp tục");
      const u = await taoTaiKhoan([], { ...v, vaiTro: "QUAN_TRI" as VaiTro });
      await kho.luuNguoiDung(u);
      await kho.ghiNhatKy({ nguoi: u.ten, hoTen: u.hoTen, hanhDong: "Khởi tạo tài khoản quản trị đầu tiên" });
      setCoTaiKhoan(true);
      setTaiKhoan(u);
    },
    capNhatTaiKhoan: (u) => setTaiKhoan((t) => (t?.ten === u.ten ? (u.hoatDong ? u : null) : t)),
    ghiNhatKy,
    bao,
    thongBao,
    lich,
    luuLich: async (l) => {
      if (chan("CAI_DAT")) return;
      await kho.luuCaiDat(KHOA_LICH, l);
      setLich(l);
      await ghiNhatKy("Cập nhật lịch ngày nghỉ", `${l.nghi.length} ngày nghỉ, ${l.lamBu.length} ngày làm bù; năm đã xác nhận: ${l.namDaDu.join(", ") || "—"}`);
    },
    hopCaiDat,
    moCaiDat,
    tyLeCham,
    luuTyLeCham: async (ds) => {
      if (chan("CAI_DAT")) return;
      await ghi(() => kho.luuCaiDat(KHOA_TY_LE_CHAM, ds));
      setTyLeCham(ds);
      await ghiNhatKy("Cập nhật tỷ lệ tiền chậm trả", ds.map((g) => `từ ${vn(g.tuNgay)}: ${g.tyLe}%/ngày (${g.canCu})`).join("; ") || "xóa hết");
    },
    tuDong,
    luuTuDong: async (c) => {
      if (chan("CAI_DAT")) return;
      await kho.luuCaiDat(KHOA_TU_DONG, c);
      setTuDong(c);
      await ghiNhatKy("Cập nhật tự động sao lưu", `${c.bat ? "bật" : "tắt"}; ${c.soNgay} ngày/lần; giữ ${c.giuLai} bản; thư mục: ${c.thuMuc || "mặc định"}`);
    },
    saoLuuTuDongNgay: () => chayTuDong(true),
    kyBaoCao,
    themKyBaoCao: async (k) => {
      if (chan("CAI_DAT")) return;
      // Đọc lại ngay trước khi ghi: máy khác trong mạng nội bộ có thể vừa chốt kỳ
      const ds = [...((await kho.docCaiDat<KyBaoCao[]>(KHOA_KY_BAO_CAO)) ?? []), k];
      await ghi(() => kho.luuCaiDat(KHOA_KY_BAO_CAO, ds));
      setKyBaoCao(ds);
      await ghiNhatKy("Chốt số liệu kỳ báo cáo", `${k.ten} — số liệu đến ${vn(k.denNgay)}; ${k.dong.length} dự án; SHA-256 ${k.bam.slice(0, 16)}…`);
    },
    khoiPhucLichSu: async (stt, lyDo) => {
      if (chan("KHOI_PHUC_BAN_GHI")) return false;
      if (!lyDo.trim()) return bao("Khôi phục cần ghi lý do", "loi"), false;
      try {
        const kq = await ghi(() => kho.khoiPhucBanLichSu(stt, lyDo.trim(), nguoiDung));
        capNhat(kq);
        const h = kq.ho[0], d = kq.duAn[0];
        const ten = h ? `hồ sơ ${h.ma}` : `thông tin dự án ${d?.ten ?? ""}`;
        if (!laKhoMang(kho)) await ghiNhatKy(h ? "Khôi phục hồ sơ về phiên bản cũ" : "Khôi phục thông tin dự án về phiên bản cũ", `${h ? `${h.ma} · ${h.ten}` : d?.ten ?? ""} — ${lyDo.trim()}`); // máy chủ tự ghi
        bao(`Đã khôi phục ${ten}`);
        return true;
      } catch (e) {
        if (!(e instanceof DaBaoLoi)) bao(`Không khôi phục được: ${(e as Error).message}`, "loi");
        return false;
      }
    },
    giuLichSu,
    luuGiuLichSu: async (soNam) => {
      if (chan("KHOI_PHUC_BAN_GHI")) return;
      if (!Number.isInteger(soNam) || soNam < 0 || soNam > 100) return bao("Số năm giữ lịch sử từ 0 (không thời hạn) đến 100", "loi");
      await ghi(() => kho.luuCaiDat("giuLichSu", { soNam }));
      setGiuLichSu(soNam);
      if (!laKhoMang(kho)) await ghiNhatKy("Đặt thời hạn giữ lịch sử bản ghi", `${soNam} năm`);
    },
    goiDaNap,
    napGoi: async (g) => {
      if (chan("NAP_CHINH_SACH")) return false;
      const cu = (await kho.docCaiDat<GoiDaNap[]>(KHOA_GOI)) ?? [];
      if (cu.some((x) => x.khoa === g.khoa) || coBoChinhSach(g.khoa)) return bao(`Đã có bộ chính sách khóa "${g.khoa}"`, "loi"), false;
      const moi = { ...g, napLuc: new Date().toISOString(), napBoi: nguoiDung };
      const ds = [...cu, moi];
      try {
        await ghi(() => kho.luuCaiDat(KHOA_GOI, ds));
      } catch {
        return false;
      }
      dangKyGoi(ds);
      setGoiDaNap(ds);
      await ghiNhatKy("Nạp gói chính sách", `${g.khoa} — ${g.ten} (mã ${g.ma}, hiệu lực từ ${g.hieuLucTu}); tệp ${g.tenTep}; SHA-256 ${g.sha256}`);
      return true;
    },
    chuyenBoChinhSach: async (duAnId, khoa, tomTat) => {
      if (chan("CAI_DAT")) return false;
      const d = dsDuAn.find((x) => x.id === duAnId);
      if (!d || !coBoChinhSach(khoa)) return false;
      try {
        capNhat({ duAn: [await ghi(() => kho.luuDuAn({ ...d, boChinhSach: khoa }))] });
      } catch {
        return false;
      }
      await ghiNhatKy("Chuyển bộ chính sách của dự án", `${d.ten}: ${d.boChinhSach} → ${khoa}. ${tomTat}`);
      return true;
    },
    nguongLechDt,
    luuNguongLechDt: async (n) => {
      if (chan("CAI_DAT")) return;
      const loi = n && loiNguong(n);
      if (loi) return bao(loi, "loi");
      const v = n && (n.m2.trim() || n.phanTram.trim()) ? { ...n, nguoi: nguoiDung, luc: new Date().toISOString() } : null;
      await ghi(() => kho.luuCaiDat(KHOA_NGUONG_LECH, v));
      setNguongLechDt(v);
      await ghiNhatKy("Đặt ngưỡng lệch diện tích", v ? `${v.m2 || "—"} m²; ${v.phanTram || "—"} %; căn cứ: ${v.canCu}` : "bỏ ngưỡng (liệt kê mọi chênh lệch)");
    },
    xoaKyBaoCao: async (id, lyDo) => {
      if (chan("CAI_DAT")) return;
      const cu = (await kho.docCaiDat<KyBaoCao[]>(KHOA_KY_BAO_CAO)) ?? [];
      const k = cu.find((x) => x.id === id);
      if (!k) return;
      const ds = cu.filter((x) => x.id !== id);
      await ghi(() => kho.luuCaiDat(KHOA_KY_BAO_CAO, ds));
      setKyBaoCao(ds);
      await ghiNhatKy("Xóa kỳ báo cáo đã chốt", `${k.ten} (số liệu đến ${vn(k.denNgay)}) — lý do: ${lyDo}`);
    },
  };
  return <Ctx.Provider value={giaTri}>{children}</Ctx.Provider>;
}

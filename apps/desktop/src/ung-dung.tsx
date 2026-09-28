import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { KHOA_TU_DONG, MAC_DINH_TU_DONG, coVoWindows, denHan, saoLuuTuDong, type CaiDatTuDong } from "./tu-dong-sao-luu";
import type { BoChinhSach } from "@gpmb/core";
import { BO_CHINH_SACH } from "./du-lieu";
import { taoKhoIndexedDb, type Kho } from "./kho";
import { LoiMayChu, docCheDo, laKhoMang } from "./kho-mang";
import type { DuAn, Ho } from "./mo-hinh";
import { docLanSaoLuu, ghiLanSaoLuu } from "./sao-luu";
import { LICH_TRONG, type LichLamViec } from "./lich-lam-viec";
import { KHOA_TY_LE_CHAM, type GiaiDoanTyLe } from "./chi-tra";
import { KHOA_KY_BAO_CAO, type KyBaoCao } from "./ky-bao-cao";
import { KHOA_DON_VI, type DonVi } from "./don-vi";
import { KHOA_LICH } from "./sao-luu";
import { coQuyen, dungMatKhau, taoTaiKhoan, tenHienThi, type NguoiDung, type Quyen, type VaiTro } from "./tai-khoan";

export type Man =
  | { ten: "tong-quan" }
  | { ten: "du-an"; duAnId?: string }
  | { ten: "ho"; duAnId: string; hoId: string; tab?: string }
  | { ten: "ban-do"; duAnId: string }
  | { ten: "van-ban"; duAnId: string; ma?: string; hoId?: string }
  | { ten: "tra-cuu" }
  | { ten: "doc-scan" }
  | { ten: "bao-cao" }
  | { ten: "don-vi" }
  /** Danh sách hồ sơ (mọi dự án hoặc một dự án) lọc theo hiện trạng, chặng quy trình, từ khóa — đích khi bấm vào các chỉ số. */
  | { ten: "ds-ho"; duAnId?: string; trangThai?: string; chang?: string; tim?: string };

interface NguCanh {
  kho: Kho;
  dsDuAn: DuAn[];
  hoCua: (duAnId: string) => Ho[];
  man: Man;
  di: (m: Man) => void;
  /** Quay lại màn trước (nút Quay lại, Alt + ←, nút lùi của chuột). */
  quayLai: () => void;
  coTheQuayLai: boolean;
  /** Thiết lập đơn vị (Công cụ). */
  dsDonVi: DonVi[];
  luuDonVi: (ds: DonVi[]) => Promise<void>;
  /** Lưu dự án; mặc định cần quyền SUA_HO_SO (chốt/duyệt phương án truyền quyền riêng). */
  luuDuAn: (d: DuAn, quyen?: Quyen) => Promise<void>;
  luuHo: (h: Ho, nhatKy?: string) => Promise<void>;
  /** Lưu nhiều hồ sơ (cập nhật hàng loạt), tải lại một lần; trả về số hồ sơ lưu được và lỗi từng hồ sơ. */
  luuNhieuHo: (ds: { h: Ho; nhatKy: string }[]) => Promise<{ daLuu: number; loi: string[] }>;
  xoaHo: (id: string) => Promise<void>;
  xoaDuAn: (id: string) => Promise<void>;
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
}

const Ctx = createContext<NguCanh | null>(null);

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

export function NhaCungCap({ children, kho: khoVao }: { children: ReactNode; kho?: Kho }) {
  const kho = useMemo(() => khoVao ?? taoKhoIndexedDb(), [khoVao]);
  const [dsDuAn, setDsDuAn] = useState<DuAn[]>([]);
  const [dsHo, setDsHo] = useState<Ho[]>([]);
  const [man, setMan] = useState<Man>({ ten: "tong-quan" });
  const [lichSu, setLichSu] = useState<Man[]>([]);
  const [dsDonVi, setDsDonVi] = useState<DonVi[]>([]);
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
  const [taiKhoan, setTaiKhoan] = useState<NguoiDung | null>(null);
  const [coTaiKhoan, setCoTaiKhoan] = useState<boolean | null>(null);
  const [thongBao, setThongBao] = useState<NguCanh["thongBao"]>(null);
  const [lich, setLich] = useState<LichLamViec>(LICH_TRONG);
  const [hopCaiDat, moCaiDat] = useState(false);
  const [tyLeCham, setTyLeCham] = useState<GiaiDoanTyLe[]>([]);
  const [tuDong, setTuDong] = useState<CaiDatTuDong>(MAC_DINH_TU_DONG);
  const [kyBaoCao, setKyBaoCao] = useState<KyBaoCao[]>([]);
  const dangTuDong = useRef(false);
  const [sai, setSai] = useState<{ lan: number; den: number }>({ lan: 0, den: 0 });
  const nguoiDung = tenHienThi(taiKhoan);
  const quyen = (q: Quyen) => coQuyen(taiKhoan?.vaiTro, q);
  const bao = useCallback((noiDung: string, loai: "ok" | "loi" = "ok") => {
    const id = Date.now();
    setThongBao({ noiDung, loai, id });
    setTimeout(() => setThongBao((t) => (t?.id === id ? null : t)), loai === "loi" ? 6000 : 3500);
  }, []);
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
    const da = await kho.dsDuAn();
    const hos = (await Promise.all(da.map((d) => kho.dsHo(d.id)))).flat();
    setDsDuAn(da.sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)));
    setDsHo(hos.sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true })));
    setDangTai(false);
  }, [kho]);

  /** Ghi qua máy chủ: báo lỗi (xung đột, quyền, quy tắc) và tải lại bản mới nhất; ném DaBaoLoi để màn hình giữ bản nháp. */
  const ghi = async (f: () => Promise<void>) => {
    try {
      await f();
    } catch (e) {
      if (!(e instanceof LoiMayChu)) throw e;
      bao(e.message, "loi");
      if (e.ma === 401) setTaiKhoan(null);
      else await taiLai().catch(() => undefined);
      throw new DaBaoLoi(e.message);
    }
  };
  // Máy chủ: hỏi thay đổi định kỳ, tải lại khi người khác vừa cập nhật
  const seq = useRef<number | null>(null);
  useEffect(() => {
    if (!laKhoMang(kho) || !taiKhoan) return;
    let dung = false;
    const hoi = async () => {
      try {
        const r = await kho.thayDoi(seq.current);
        const cuaNguoiKhac = r.ds.filter((x) => x.boi !== taiKhoan.ten);
        const lanDau = seq.current === null;
        seq.current = r.seq;
        if (!lanDau && cuaNguoiKhac.length && !dung) {
          await taiLai();
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
  }, [kho, taiKhoan, taiLai, bao]);

  useEffect(() => {
    void taiLai();
    if (laKhoMang(kho)) void kho.trangThai().then((t) => setCoTaiKhoan(t.coTaiKhoan), (e) => bao(String((e as Error).message ?? e), "loi"));
    else void kho.dsNguoiDung().then((ds) => setCoTaiKhoan(ds.length > 0));
  }, [taiLai, kho, bao]);

  const chayTuDong = useCallback(
    async (epBuoc: boolean): Promise<CaiDatTuDong> => {
      const c = { ...MAC_DINH_TU_DONG, ...((await kho.docCaiDat<CaiDatTuDong>(KHOA_TU_DONG)) ?? {}) };
      // máy trạm không tự sao lưu (máy chủ hoặc máy đơn đảm nhận)
      if (dangTuDong.current || !coVoWindows() || docCheDo().cheDo === "MAY_TRAM") return c;
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
    [kho],
  );
  useEffect(() => {
    if (!taiKhoan || !coVoWindows()) return;
    const t0 = setTimeout(() => void chayTuDong(false), 15_000);
    const t = setInterval(() => void chayTuDong(false), 30 * 60_000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [taiKhoan?.ten, chayTuDong]);

  const giaTri: NguCanh = {
    kho,
    dsDuAn,
    hoCua: (id) => dsHo.filter((h) => h.duAnId === id),
    man,
    di,
    quayLai,
    coTheQuayLai: lichSu.length > 0,
    dsDonVi,
    luuDonVi: async (ds) => {
      if (chan("CAI_DAT")) return;
      await ghi(() => kho.luuCaiDat(KHOA_DON_VI, ds));
      setDsDonVi(ds);
      await ghiNhatKy("Cập nhật thiết lập đơn vị", ds.map((d) => `${d.ten}${d.suDung ? " (đơn vị sử dụng)" : ""}`).join("; "));
    },
    luuDuAn: async (d, q = "SUA_HO_SO") => {
      if (chan(q)) return;
      await ghi(() => kho.luuDuAn(d));
      await taiLai();
    },
    luuHo: async (h, nk) => {
      if (chan("SUA_HO_SO")) return;
      const ban = nk ? { ...h, nhatKy: [...h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: nk }] } : h;
      await ghi(() => kho.luuHo(ban));
      await taiLai();
    },
    luuNhieuHo: async (ds) => {
      if (chan("SUA_HO_SO")) return { daLuu: 0, loi: ["Tài khoản không có quyền sửa hồ sơ"] };
      const luc = new Date().toISOString();
      let daLuu = 0;
      const loi: string[] = [];
      for (const { h, nhatKy } of ds) {
        try {
          await kho.luuHo({ ...h, nhatKy: [...h.nhatKy, { luc, nguoi: nguoiDung, noiDung: nhatKy }] });
          daLuu++;
        } catch (e) {
          loi.push(`${h.ma}: ${(e as Error).message}`);
          if (e instanceof LoiMayChu && e.ma === 401) { setTaiKhoan(null); break; }
        }
      }
      await taiLai();
      return { daLuu, loi };
    },
    xoaHo: async (id) => {
      if (chan("SUA_HO_SO")) return;
      const h = dsHo.find((x) => x.id === id);
      await ghiNhatKy("Xóa hồ sơ", h ? `${h.ma} · ${h.ten}` : id);
      await ghi(() => kho.xoaHo(id));
      await taiLai();
    },
    xoaDuAn: async (id) => {
      if (chan("XOA_DU_AN")) return;
      await ghiNhatKy("Xóa dự án", dsDuAn.find((d) => d.id === id)?.ten ?? id);
      await ghi(() => kho.xoaDuAn(id));
      await taiLai();
    },
    chinhSach: (d) => BO_CHINH_SACH[d.boChinhSach] ?? BO_CHINH_SACH["sonla-2026-03-31"]!,
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
      await ghiNhatKy("Cập nhật tỷ lệ tiền chậm trả", ds.map((g) => `từ ${g.tuNgay}: ${g.tyLe}%/ngày (${g.canCu})`).join("; ") || "xóa hết");
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
      await ghiNhatKy("Chốt số liệu kỳ báo cáo", `${k.ten} — số liệu đến ${k.denNgay}; ${k.dong.length} dự án; SHA-256 ${k.bam.slice(0, 16)}…`);
    },
    xoaKyBaoCao: async (id, lyDo) => {
      if (chan("CAI_DAT")) return;
      const cu = (await kho.docCaiDat<KyBaoCao[]>(KHOA_KY_BAO_CAO)) ?? [];
      const k = cu.find((x) => x.id === id);
      if (!k) return;
      const ds = cu.filter((x) => x.id !== id);
      await ghi(() => kho.luuCaiDat(KHOA_KY_BAO_CAO, ds));
      setKyBaoCao(ds);
      await ghiNhatKy("Xóa kỳ báo cáo đã chốt", `${k.ten} (số liệu đến ${k.denNgay}) — lý do: ${lyDo}`);
    },
  };
  return <Ctx.Provider value={giaTri}>{children}</Ctx.Provider>;
}

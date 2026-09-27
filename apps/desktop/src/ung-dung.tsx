import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BoChinhSach } from "@gpmb/core";
import { BO_CHINH_SACH } from "./du-lieu";
import { taoKhoIndexedDb, type Kho } from "./kho";
import type { DuAn, Ho } from "./mo-hinh";
import { docLanSaoLuu, ghiLanSaoLuu } from "./sao-luu";
import { coQuyen, dungMatKhau, taoTaiKhoan, tenHienThi, type NguoiDung, type Quyen, type VaiTro } from "./tai-khoan";

export type Man =
  | { ten: "tong-quan" }
  | { ten: "du-an"; duAnId: string }
  | { ten: "ho"; duAnId: string; hoId: string; tab?: string }
  | { ten: "ban-do"; duAnId: string }
  | { ten: "van-ban"; duAnId: string; ma?: string; hoId?: string }
  | { ten: "tra-cuu" };

interface NguCanh {
  kho: Kho;
  dsDuAn: DuAn[];
  hoCua: (duAnId: string) => Ho[];
  man: Man;
  di: (m: Man) => void;
  /** Lưu dự án; mặc định cần quyền SUA_HO_SO (chốt/duyệt phương án truyền quyền riêng). */
  luuDuAn: (d: DuAn, quyen?: Quyen) => Promise<void>;
  luuHo: (h: Ho, nhatKy?: string) => Promise<void>;
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
}

const Ctx = createContext<NguCanh | null>(null);

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
  const [dangTai, setDangTai] = useState(true);
  const [taiKhoan, setTaiKhoan] = useState<NguoiDung | null>(null);
  const [coTaiKhoan, setCoTaiKhoan] = useState<boolean | null>(null);
  const [thongBao, setThongBao] = useState<NguCanh["thongBao"]>(null);
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
    const da = await kho.dsDuAn();
    const hos = (await Promise.all(da.map((d) => kho.dsHo(d.id)))).flat();
    setDsDuAn(da.sort((a, b) => b.taoLuc.localeCompare(a.taoLuc)));
    setDsHo(hos.sort((a, b) => a.ma.localeCompare(b.ma, "vi", { numeric: true })));
    setDangTai(false);
  }, [kho]);

  useEffect(() => {
    void taiLai();
    void kho.dsNguoiDung().then((ds) => setCoTaiKhoan(ds.length > 0));
  }, [taiLai, kho]);

  const giaTri: NguCanh = {
    kho,
    dsDuAn,
    hoCua: (id) => dsHo.filter((h) => h.duAnId === id),
    man,
    di: setMan,
    luuDuAn: async (d, q = "SUA_HO_SO") => {
      if (chan(q)) return;
      await kho.luuDuAn(d);
      await taiLai();
    },
    luuHo: async (h, nk) => {
      if (chan("SUA_HO_SO")) return;
      const ban = nk ? { ...h, nhatKy: [...h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: nk }] } : h;
      await kho.luuHo(ban);
      await taiLai();
    },
    xoaHo: async (id) => {
      if (chan("SUA_HO_SO")) return;
      const h = dsHo.find((x) => x.id === id);
      await ghiNhatKy("Xóa hồ sơ", h ? `${h.ma} · ${h.ten}` : id);
      await kho.xoaHo(id);
      await taiLai();
    },
    xoaDuAn: async (id) => {
      if (chan("XOA_DU_AN")) return;
      await ghiNhatKy("Xóa dự án", dsDuAn.find((d) => d.id === id)?.ten ?? id);
      await kho.xoaDuAn(id);
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
      if (taiKhoan) await ghiNhatKy("Đăng xuất");
      setTaiKhoan(null);
      setMan({ ten: "tong-quan" });
    },
    khoiTaoQuanTri: async (v) => {
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
  };
  return <Ctx.Provider value={giaTri}>{children}</Ctx.Provider>;
}

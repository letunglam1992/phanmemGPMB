import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { NGUON_ANH_NEN, diemTrongThua, docKinhTuyen, ghiKinhTuyen, mauUrlHopLe, oNenTrongKhung, urlO, type DienTichThuHoi, type Diem, type ThuaBanDo } from "@gpmb/gis";
import { type Ho } from "../../mo-hinh";
import { THU_TU_TRANG_THAI, TT_GPMB, type TrangThaiGpmb } from "../../trang-thai";
import { Chon } from "../../thanh-phan/Chon";
import { type DuLieuBanDo } from "./du-lieu";
import { boOLoi, layO } from "./anh-nen";
import { chieuRanhXa, cungTenXa, napRanhXa, xaChua, type RanhXa } from "./ranh-xa";
import { TEN_KIEU_BAT, TEN_LOAI, batDiemNangCao, chieuDai, chuanBiVe, dienTich, hinhTuVong, khoangCach, mauLop, phamViToanBo, timPhanTu, type ChuVe, type HinhVe, type KieuBat } from "./hinh-hoc";
import { type DiemDoHienTrang, type GhiChuHienTruong, type KetQuaDoLuu, type NhomGhiChu } from "../../mo-hinh";

/**
 * Trình xem bản đồ kiểu MicroStation (phục vụ GPMB, chỉ đọc): lăn chuột phóng to/thu nhỏ tại con trỏ (không cuộn trang),
 * kéo để di chuyển, phóng theo khung; bật/tắt từng lớp (level) của tệp DGN; công cụ thông tin phần tử, đo khoảng cách,
 * đo diện tích, lấy tọa độ; bắt điểm vào đỉnh; nền đen/sáng. Lớp phủ GPMB (thửa, ranh, tô màu) vẽ trên nền bản vẽ.
 */
type CongCu = "CHON" | "KEO" | "PHONG_KHUNG" | "QUET" | "DO_DAI" | "DO_DT" | "TOA_DO" | "GHI_CHU";
const CONG_CU: { ma: CongCu; ten: string; ky: string; goiY: string }[] = [
  { ma: "CHON", ten: "Chọn, thông tin", ky: "⌖", goiY: "Bấm vào thửa / phần tử để xem thông tin (kéo để di chuyển)" },
  { ma: "KEO", ten: "Di chuyển", ky: "✋", goiY: "Kéo để di chuyển bản đồ" },
  { ma: "PHONG_KHUNG", ten: "Phóng theo khung", ky: "⬚", goiY: "Kéo một khung chữ nhật để phóng tới vùng đó" },
  { ma: "QUET", ten: "Chọn nhiều thửa (quét khung)", ky: "▦", goiY: "Kéo khung để chọn các thửa có tâm nằm trong khung; giữ Shift để chọn thêm" },
  { ma: "DO_DAI", ten: "Đo khoảng cách", ky: "📏", goiY: "Bấm các điểm; bấm đúp hoặc chuột phải để kết thúc; Esc để xóa" },
  { ma: "DO_DT", ten: "Đo diện tích", ky: "▱", goiY: "Bấm các đỉnh vùng; bấm đúp hoặc chuột phải để khép vùng; Esc để xóa" },
  { ma: "TOA_DO", ten: "Tọa độ điểm", ky: "⌗", goiY: "Bấm để lấy tọa độ VN-2000 của điểm (bắt đỉnh nếu bật)" },
  { ma: "GHI_CHU", ten: "Ghi chú hiện trường", ky: "📌", goiY: "Bấm vị trí để thêm ghi chú (vướng mắc, mộ, công trình chưa kiểm đếm…); ghi chú dạng đường: đo khoảng cách rồi bấm “Lưu làm ghi chú”" },
];
/** Màu ghi chú hiện trường theo nhóm (vẽ trên bản đồ, chú giải). */
export const MAU_GHI_CHU: Record<NhomGhiChu, string> = { VUONG_MAC: "#d0021b", MO: "#6a3fb5", CONG_TRINH: "#e07b00", KHAC: "#2f6bd0" };
const so = (v: number, le = 2) => v.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });
const docLuu = <T,>(k: string, mac: T): T => {
  try {
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : mac;
  } catch {
    return mac;
  }
};
const ghiLuu = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
};

/** Ảnh nền trực tuyến (vệ tinh) — tùy chọn theo dự án, trên máy này; mặc định tắt. */
export interface CaiDatAnhNen {
  bat: boolean;
  /** ESRI | OSM | TUY_CHINH */
  nguon: string;
  url: string;
  /** Độ đậm ảnh 0,2–1 */
  doMo: number;
  /** Kinh tuyến trục của bản đồ (độ thập phân) — Sơn La 104°00′ (TT 973/2001/TT-TCĐC) */
  kt: number;
  mui: 3 | 6;
  /** Dịch ảnh (m) theo Đông, Bắc để khớp bản đồ */
  dx: number;
  dy: number;
  /** Mức phóng ảnh tối đa tải về (0 = theo nguồn); cao hơn thì phóng to ảnh mức này */
  mucToiDa?: number;
}
export const ANH_NEN_MAC_DINH: CaiDatAnhNen = { bat: false, nguon: "ESRI", url: "", doMo: 1, kt: 104, mui: 3, dx: 0, dy: 0, mucToiDa: 0 };
const KHOA_DONG_Y_ANH = "gpmb-anh-nen-dong-y";
export const nguonAnh = (c: CaiDatAnhNen) => (c.nguon === "TUY_CHINH" ? { ma: "TUY_CHINH", ten: "Tùy chỉnh", url: c.url.trim(), ghiNguon: `Ảnh: ${(() => { try { return new URL(c.url.trim().replace(/[{}]/g, "")).host; } catch { return "nguồn tùy chỉnh"; } })()}`, mucToiDa: 20 } : NGUON_ANH_NEN.find((n) => n.ma === c.nguon) ?? NGUON_ANH_NEN[0]!);

export function KhungVe(p: {
  dl: DuLieuBanDo;
  vungChon: string[];
  /** Chế độ chọn thửa: bấm thửa để thêm / bỏ khỏi phạm vi thu hồi */
  bamThua?: (t: ThuaBanDo) => void;
  thuaChon: Set<string>;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  chon: ThuaBanDo | null;
  setChon: (t: ThuaBanDo | null) => void;
  daLienKet: Map<string, Ho>;
  ttThua: Map<string, TrangThaiGpmb>;
  /** Khóa lưu tùy chọn hiển thị (lớp tắt, nền) theo dự án, trên máy này. */
  khoaLuu?: string;
  /** Ranh GPMB nhập ngoài (bảng mốc, DGN khác, vẽ) — vẽ như ranh đã chọn. */
  ranhThem?: Diem[][][];
  /** Có: khi vẽ vùng (công cụ đo diện tích) hiện nút "Dùng làm ranh GPMB". */
  luuVung?: (vong: Diem[]) => void;
  /** Bật công cụ vẽ vùng từ bên ngoài (nút "Vẽ ranh trên bản đồ"). */
  batVeVung?: number;
  /** Bật công cụ ghi chú hiện trường từ bên ngoài (nút "+ Ghi chú"). */
  batGhiChu?: number;
  /** Quét khung chọn nhiều thửa (hạng mục 3 docs/08 §9): trả về thửa có tâm nhãn trong khung; them = giữ Shift. */
  quet?: (ds: ThuaBanDo[], them: boolean) => void;
  /** Khóa (khoaThua) các thửa đang chọn bằng quét khung — tô nổi. */
  thuaQuet?: Set<string>;
  /** Phóng tới thửa (tìm thửa/chủ): đổi `n` để phóng lại. */
  phongToi?: { vong: Diem[][]; n: number; vua?: boolean } | null;
  /** Lớp phủ của dự án: ghi chú hiện trường, điểm đo hiện trạng, kết quả đo đã lưu, kết quả so sánh hai bản đồ. */
  lopPhu?: { ghiChu: GhiChuHienTruong[]; diemDo: DiemDoHienTrang[]; ketQuaDo: KetQuaDoLuu[]; soSanh: { vong: Diem[][]; mau: string; net?: number[] }[] };
  themGhiChu?: (loai: "DIEM" | "DUONG", diem: Diem[]) => void;
  luuDo?: (loai: "DAI" | "DT", diem: Diem[], giaTri: number) => void;
  /** Xã, phường của dự án — tô đậm ranh xã này trên lớp ranh giới xã */
  xaDuAn?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const khoa = `gpmb-ban-do-${p.khoaLuu ?? "chung"}`;
  const [cheDo, setCheDo] = useState<"HIEN_TRANG" | "PHAM_VI">("HIEN_TRANG");
  const [lop, setLop] = useState({ nen: true, thua: true, to: true, ranh: true, nhan: true, diaDanh: true, xa: docLuu<boolean>(`gpmb-ban-do-lop-xa`, true) });
  useEffect(() => { ghiLuu("gpmb-ban-do-lop-xa", lop.xa); }, [lop.xa]);
  const [lopAn, setLopAn] = useState<Set<number>>(() => new Set(docLuu<number[]>(`${khoa}-lop-an`, [])));
  const [nenToi, setNenToi] = useState<boolean>(() => docLuu(`${khoa}-nen-toi`, false));
  const [mauTheoLop, setMauTheoLop] = useState<boolean>(() => docLuu(`${khoa}-mau-lop`, true));
  const [kieuBat, setKieuBat] = useState<Set<KieuBat>>(() => new Set(docLuu<KieuBat[]>(`gpmb-ban-do-kieu-bat`, ["DINH"])));
  const bat = kieuBat.size > 0;
  const doiKieuBat = (k: KieuBat, co: boolean) => {
    const s2 = new Set(kieuBat);
    if (co) s2.add(k);
    else s2.delete(k);
    setKieuBat(s2);
    ghiLuu("gpmb-ban-do-kieu-bat", [...s2]);
  };
  const [cong, setCong] = useState<CongCu>("CHON");
  const [anhNen, setAnhNenS] = useState<CaiDatAnhNen>(() => ({ ...ANH_NEN_MAC_DINH, ...docLuu<Partial<CaiDatAnhNen>>(`${khoa}-anh-nen`, {}) }));
  const setAnhNen = (c: Partial<CaiDatAnhNen>) => {
    const moi = { ...anhNen, ...c };
    setAnhNenS(moi);
    ghiLuu(`${khoa}-anh-nen`, moi);
  };
  const [ktNhap, setKtNhap] = useState(() => ghiKinhTuyen(anhNen.kt));
  const [taiO, setTaiO] = useState(0);
  // Ranh giới xã, phường (tệp trong máy) đổi sang VN-2000 theo kinh tuyến trục đang dùng cho ảnh nền
  const [ranhXa, setRanhXa] = useState<RanhXa[] | null>(null);
  const [loiXa, setLoiXa] = useState("");
  useEffect(() => {
    if (!lop.xa) return;
    let huy = false;
    napRanhXa().then((t) => !huy && setRanhXa(chieuRanhXa(t, { kinhTuyenTruc: anhNen.kt, mui: anhNen.mui }))).catch((e) => !huy && setLoiXa(String((e as Error).message ?? e)));
    return () => { huy = true; };
  }, [lop.xa, anhNen.kt, anhNen.mui]);
  const [trangThaiAnh, setTrangThaiAnh] = useState<{ tong: number; loi: number; z: number; phongTo: number; mucThay: number } | null>(null);
  const choVe = useRef(false);
  const batAnhNen = (bat: boolean) => {
    if (bat && !docLuu(KHOA_DONG_Y_ANH, false)) {
      const host = (() => { try { return new URL(nguonAnh(anhNen).url.replace(/[{}]/g, "")).host; } catch { return "máy chủ ảnh"; } })();
      if (!confirm(`Bật ảnh vệ tinh: phần mềm tải ô ảnh từ ${host} qua Internet.\n\nChỉ gửi số hiệu ô ảnh (mức phóng z, cột x, hàng y) của khung đang xem — từ đó máy chủ biết khu vực đang xem; KHÔNG gửi hồ sơ, tên chủ, số liệu thửa, tệp bản đồ.\n\nĐồng ý bật?`)) return;
      ghiLuu(KHOA_DONG_Y_ANH, true);
    }
    boOLoi();
    setAnhNen({ bat });
  };
  // Bảng "Lớp bản đồ" (kiểu Level Manager): các mục mở/đóng độc lập; nhớ theo máy
  const [bangLop, setBangLop] = useState<Set<string>>(() => new Set(docLuu<string[]>(`${khoa}-muc`, ["GPMB", "CHU_GIAI"])));
  const [anBang, setAnBang] = useState<boolean>(() => docLuu(`${khoa}-an-bang`, false));
  // Thanh công cụ thu gọn về góc trái (nhớ theo máy như bảng lớp)
  const [anThanh, setAnThanh] = useState<boolean>(() => docLuu(`${khoa}-an-thanh`, false));
  const batMuc = (m: string) => {
    const s = new Set(bangLop);
    if (s.has(m)) s.delete(m);
    else s.add(m);
    setBangLop(s);
    ghiLuu(`${khoa}-muc`, [...s]);
  };
  useEffect(() => { ghiLuu(`${khoa}-an-bang`, anBang); }, [khoa, anBang]);
  useEffect(() => { ghiLuu(`${khoa}-an-thanh`, anThanh); }, [khoa, anThanh]);
  const [timLop, setTimLop] = useState("");
  const [nhin, setNhin] = useState<{ cx: number; cy: number; tyLe: number } | null>(null);
  const [toaDo, setToaDo] = useState<string>("");
  const [diemDo, setDiemDo] = useState<Diem[]>([]);
  const [xongDo, setXongDo] = useState(false);
  const [troDo, setTroDo] = useState<Diem | null>(null);
  const [batHien, setBatHien] = useState<(Diem & { kieu?: KieuBat }) | null>(null);
  const [khung, setKhung] = useState<{ a: Diem; b: Diem } | null>(null);
  const [thongTin, setThongTin] = useState<{ hinh?: HinhVe; chu?: ChuVe; diem?: Diem } | null>(null);
  const keo = useRef<{ x: number; y: number; cx: number; cy: number; di: boolean; giua: boolean } | null>(null);
  const nhinRef = useRef(nhin);
  useLayoutEffect(() => {
    nhinRef.current = nhin;
  }, [nhin]);
  const { pham } = p.dl;

  useEffect(() => { ghiLuu(`${khoa}-lop-an`, [...lopAn]); }, [khoa, lopAn]);
  useEffect(() => { ghiLuu(`${khoa}-nen-toi`, nenToi); }, [khoa, nenToi]);
  useEffect(() => { ghiLuu(`${khoa}-mau-lop`, mauTheoLop); }, [khoa, mauTheoLop]);

  const ve = useMemo(() => chuanBiVe(p.dl.ban), [p.dl]);
  const hinhHien = useMemo(() => ve.hinh.filter((h) => !lopAn.has(h.lop)), [ve, lopAn]);
  const chuHien = useMemo(() => ve.chu.filter((c) => !lopAn.has(c.lop)), [ve, lopAn]);
  const phamToanBo = useMemo(() => phamViToanBo(ve.hinh, ve.chu), [ve]);
  const hinhThua = useMemo(() => p.dl.kq.thua.map((t) => hinhTuVong(t.vong)), [p.dl]);

  const vuaKhung = (r: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const cv = ref.current;
    if (!cv) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    setNhin({ cx: (r.minX + r.maxX) / 2, cy: (r.minY + r.maxY) / 2, tyLe: Math.min(W / (r.maxX - r.minX), H / (r.maxY - r.minY)) * 0.92 });
  };

  // Lăn chuột: phóng/thu tại con trỏ. Gắn trực tiếp, không thụ động, để chặn cuộn trang.
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const f = (e: WheelEvent) => {
      e.preventDefault();
      const v = nhinRef.current;
      if (!v) return;
      const r = cv.getBoundingClientRect();
      const d = { x: (e.clientX - r.left - r.width / 2) / v.tyLe + v.cx, y: (r.height / 2 - (e.clientY - r.top)) / v.tyLe + v.cy };
      const k = Math.pow(1.0015, -e.deltaY * (e.deltaMode === 1 ? 33 : 1));
      const tyLe = Math.max(0.002, Math.min(400, v.tyLe * k));
      const moi = { tyLe, cx: d.x - (d.x - v.cx) * (v.tyLe / tyLe), cy: d.y - (d.y - v.cy) * (v.tyLe / tyLe) };
      nhinRef.current = moi; // nhiều nấc lăn liên tiếp trước khi vẽ lại vẫn cộng dồn đúng
      setNhin(moi);
    };
    cv.addEventListener("wheel", f, { passive: false });
    return () => cv.removeEventListener("wheel", f);
  }, []);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDiemDo([]);
        setXongDo(false);
        setKhung(null);
        setThongTin(null);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const veLai = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      const v = nhin ?? { cx: (pham.minX + pham.maxX) / 2, cy: (pham.minY + pham.maxY) / 2, tyLe: Math.min(W / (pham.maxX - pham.minX), H / (pham.maxY - pham.minY)) * 0.92 };
      if (!nhin) setNhin(v);
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = nenToi ? "#0b0d0c" : "#fbfcfb";
      ctx.fillRect(0, 0, W, H);
      const sx = (x: number) => (x - v.cx) * v.tyLe + W / 2;
      const sy = (y: number) => H / 2 - (y - v.cy) * v.tyLe;
      // phạm vi đang nhìn (tọa độ bản đồ) để bỏ phần tử ngoài màn hình
      const nx0 = v.cx - W / 2 / v.tyLe, nx1 = v.cx + W / 2 / v.tyLe, ny0 = v.cy - H / 2 / v.tyLe, ny1 = v.cy + H / 2 / v.tyLe;
      // 0. Ảnh vệ tinh (trực tuyến, khi bật): ô Web Mercator đặt theo VN-2000 bằng biến đổi affine từng ô
      const coAnh = anhNen.bat && (anhNen.nguon !== "TUY_CHINH" || mauUrlHopLe(anhNen.url));
      if (coAnh) {
        const ng = nguonAnh(anhNen);
        const ds = oNenTrongKhung({ minX: nx0 - anhNen.dx, maxX: nx1 - anhNen.dx, minY: ny0 - anhNen.dy, maxY: ny1 - anhNen.dy }, v.tyLe, { kinhTuyenTruc: anhNen.kt, mui: anhNen.mui }, anhNen.mucToiDa ? Math.min(anhNen.mucToiDa, ng.mucToiDa) : ng.mucToiDa);
        ctx.fillStyle = "#1d2321";
        ctx.fillRect(0, 0, W, H);
        let loi = 0, phongTo = 0, mucThay = 99;
        const veLaiKhiTai = () => {
          if (choVe.current) return;
          choVe.current = true;
          requestAnimationFrame(() => { choVe.current = false; setTaiO((x) => x + 1); });
        };
        ctx.save();
        ctx.globalAlpha = Math.max(0.2, Math.min(1, anhNen.doMo));
        /** Vẽ phần [ox, oy, k] (ô con thứ ox, oy trong lưới 2^k × 2^k) của ảnh vào vị trí ô o */
        const veO = (img: HTMLImageElement, goc: [Diem, Diem, Diem], ox: number, oy: number, k: number) => {
          const [tl, tr, bl] = goc.map((d) => ({ x: sx(d.x + anhNen.dx), y: sy(d.y + anhNen.dy) })) as [Diem, Diem, Diem];
          ctx.setTransform(dpr * ((tr.x - tl.x) / 256), dpr * ((tr.y - tl.y) / 256), dpr * ((bl.x - tl.x) / 256), dpr * ((bl.y - tl.y) / 256), dpr * tl.x, dpr * tl.y);
          const n = 2 ** k, w = img.naturalWidth / n, h = img.naturalHeight / n;
          ctx.drawImage(img, ox * w, oy * h, w, h, 0, 0, 256.6, 256.6);
        };
        for (const o of ds) {
          const e = layO(urlO(ng.url, o), veLaiKhiTai)!;
          if (e.tt === "OK") {
            veO(e.img, o.goc, 0, 0, 0);
            continue;
          }
          // Chưa có ảnh ở mức này (ô xám "Map data not yet available"), lỗi, hoặc đang tải: dùng ảnh mức thấp hơn phóng to.
          // Đang tải thì chỉ dùng ô đã có trong bộ đệm; ô trống/lỗi thì tải dần các mức cha.
          const canCha = e.tt !== "TAI";
          let xong = false;
          for (let k = 1; k <= 8 && o.z - k >= 0; k++) {
            const c = { z: o.z - k, x: o.x >> k, y: o.y >> k };
            const ec = layO(urlO(ng.url, c), veLaiKhiTai, canCha);
            if (ec?.tt === "OK") {
              veO(ec.img, o.goc, o.x - (c.x << k), o.y - (c.y << k), k);
              if (canCha) { phongTo++; mucThay = Math.min(mucThay, c.z); }
              xong = true;
              break;
            }
            if (ec?.tt === "TAI") break;
          }
          if (!xong && e.tt === "LOI") loi++;
        }
        ctx.restore();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const tt = { tong: ds.length, loi, z: ds[0]?.z ?? 0, phongTo, mucThay };
        if (trangThaiAnh?.tong !== tt.tong || trangThaiAnh.loi !== tt.loi || trangThaiAnh.z !== tt.z || trangThaiAnh.phongTo !== tt.phongTo || trangThaiAnh.mucThay !== tt.mucThay) queueMicrotask(() => setTrangThaiAnh(tt));
      }
      const duong = (ds: Diem[]) => {
        ctx.moveTo(sx(ds[0]!.x), sy(ds[0]!.y));
        for (let i = 1; i < ds.length; i++) ctx.lineTo(sx(ds[i]!.x), sy(ds[i]!.y));
      };
      const chuMau = nenToi ? "#e8efe9" : "#23302b";
      // 1. Bản vẽ DGN theo lớp
      if (lop.nen) {
        const theoMau = new Map<string, HinhVe[]>();
        for (const h of hinhHien) {
          if (h.hop.maxX < nx0 || h.hop.minX > nx1 || h.hop.maxY < ny0 || h.hop.minY > ny1) continue;
          const m = !mauTheoLop && p.dl.ban.bangMau && h.mau ? p.dl.ban.bangMau[h.mau] ?? mauLop(h.lop, nenToi) : mauLop(h.lop, nenToi);
          const ds = theoMau.get(m);
          if (ds) ds.push(h);
          else theoMau.set(m, [h]);
        }
        ctx.lineWidth = 0.8;
        for (const [m, ds] of theoMau) {
          ctx.strokeStyle = m;
          ctx.beginPath();
          for (const h of ds) for (const d of h.duong) duong(d);
          ctx.stroke();
        }
      }
      // 1b. Ranh giới xã, phường (nét đứt tím); xã của dự án nét đậm
      const xaHien = lop.xa && ranhXa ? ranhXa.filter((x) => !(x.hop.maxX < nx0 || x.hop.minX > nx1 || x.hop.maxY < ny0 || x.hop.minY > ny1)) : [];
      for (const x of xaHien) {
        const cua = cungTenXa(x.ten, p.xaDuAn);
        ctx.beginPath();
        for (const pg of x.da_giac) for (const v of pg) { duong(v); ctx.closePath(); }
        ctx.setLineDash(cua ? [10, 4] : [7, 5]);
        ctx.lineWidth = cua ? 2.8 : 1.6;
        ctx.strokeStyle = coAnh ? "#ff8ee6" : "#a03c8c";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // 2. Thửa (tô màu theo hiện trạng / phạm vi)
      for (const t of p.dl.kq.thua) {
        if (!lop.thua) break;
        const th = p.thuHoi.get(p.khoaThua(t));
        const trongRanh = th && th.phamVi !== "NGOAI";
        let to: string | null = null;
        if (lop.to && cheDo === "HIEN_TRANG") {
          const tt = p.ttThua.get(t.ma);
          if (tt) to = TT_GPMB[tt].nen;
          else if (trongRanh) to = "rgba(170,181,176,0.22)";
        } else if (lop.to) {
          if (th?.phamVi === "TOAN_BO") to = "rgba(192,57,43,0.20)";
          else if (th?.phamVi === "MOT_PHAN") to = "rgba(230,140,20,0.26)";
        }
        ctx.beginPath();
        for (const vg of t.vong) {
          duong(vg);
          ctx.closePath();
        }
        if (to) {
          ctx.fillStyle = to;
          ctx.fill("evenodd");
        }
        ctx.lineWidth = coAnh ? 1.2 : 0.8;
        ctx.strokeStyle = coAnh ? "#ffe066" : nenToi ? "#9fb0a9" : "#6f7d77";
        ctx.stroke();
      }
      // 3. Ranh GPMB
      for (const vg of lop.ranh ? p.dl.kq.vungGpmb : []) {
        const laChon = p.vungChon.includes(vg.ma);
        ctx.beginPath();
        duong(vg.vong[0]!);
        ctx.closePath();
        ctx.setLineDash(laChon ? [] : [6, 4]);
        ctx.lineWidth = laChon ? 2.4 : 1.2;
        ctx.strokeStyle = laChon ? "#e0493a" : "#8a5fd6";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const vg of lop.ranh ? (p.ranhThem ?? []) : []) {
        ctx.beginPath();
        for (const r of vg) { duong(r); ctx.closePath(); }
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = "#e0493a";
        ctx.stroke();
      }
      if (p.thuaChon.size) {
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "#e0493a";
        for (const t of p.dl.kq.thua) {
          if (!p.thuaChon.has(t.ma)) continue;
          ctx.beginPath();
          for (const vg of t.vong) { duong(vg); ctx.closePath(); }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      // Lớp phủ: so sánh bản đồ, kết quả đo đã lưu, ghi chú hiện trường, điểm đo hiện trạng
      if (p.lopPhu) {
        for (const x of p.lopPhu.soSanh) {
          ctx.beginPath();
          for (const vg of x.vong) { duong(vg); ctx.closePath(); }
          ctx.setLineDash(x.net ?? []);
          ctx.lineWidth = 2;
          ctx.strokeStyle = x.mau;
          ctx.stroke();
        }
        ctx.setLineDash([4, 3]);
        for (const k of p.lopPhu.ketQuaDo) {
          ctx.beginPath();
          duong(k.diem);
          if (k.loai === "DT") ctx.closePath();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "#8e44ad";
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.font = "11px Segoe UI, sans-serif";
        ctx.textAlign = "left";
        for (const g of p.lopPhu.ghiChu) {
          const mau = g.daXuLy ? "#7f8c8d" : MAU_GHI_CHU[g.nhom];
          ctx.strokeStyle = mau;
          ctx.fillStyle = mau;
          if (g.loai === "DUONG") {
            ctx.beginPath();
            duong(g.diem);
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          const d0 = g.diem[0]!;
          const x = sx(d0.x), y = sy(d0.y);
          ctx.beginPath();
          ctx.arc(x, y - 9, 6, 0, Math.PI * 2);
          ctx.moveTo(x - 4, y - 6);
          ctx.lineTo(x, y);
          ctx.lineTo(x + 4, y - 6);
          ctx.fill();
          if (v.tyLe > 1.5) ctx.fillText(g.noiDung.slice(0, 40), x + 8, y - 8);
        }
        ctx.strokeStyle = "#0b7a75";
        ctx.fillStyle = "#0b7a75";
        ctx.lineWidth = 1.5;
        for (const d of p.lopPhu.diemDo) {
          const x = sx(d.x), y = sy(d.y);
          ctx.beginPath();
          ctx.moveTo(x - 5, y);
          ctx.lineTo(x + 5, y);
          ctx.moveTo(x, y - 5);
          ctx.lineTo(x, y + 5);
          ctx.stroke();
          if (v.tyLe > 2) ctx.fillText(d.ten, x + 6, y - 4);
        }
      }
      if (p.thuaQuet?.size) {
        ctx.fillStyle = "rgba(47,127,214,0.22)";
        ctx.strokeStyle = "#2f7fd6";
        ctx.lineWidth = 1.6;
        for (const t of p.dl.kq.thua) {
          if (!p.thuaQuet.has(p.khoaThua(t))) continue;
          ctx.beginPath();
          for (const vg of t.vong) { duong(vg); ctx.closePath(); }
          ctx.fill("evenodd");
          ctx.stroke();
        }
      }
      if (p.chon) {
        ctx.beginPath();
        for (const vg of p.chon.vong) {
          duong(vg);
          ctx.closePath();
        }
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "#2f7fd6";
        ctx.stroke();
      }
      // phần tử đang xem thông tin
      if (thongTin?.hinh) {
        ctx.beginPath();
        for (const d of thongTin.hinh.duong) duong(d);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#f2b01e";
        ctx.stroke();
      }
      // 4. Chữ của bản vẽ theo lớp (khi đủ lớn để đọc)
      if (lop.diaDanh) {
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        for (const c of chuHien) {
          if (c.x < nx0 - 50 || c.x > nx1 + 50 || c.y < ny0 - 50 || c.y > ny1 + 50) continue;
          const px = c.cao > 0 ? c.cao * v.tyLe : v.tyLe > 2 ? 11 : 0;
          if (px < 5) continue;
          ctx.save();
          ctx.translate(sx(c.x), sy(c.y));
          if (c.xoay) ctx.rotate((-c.xoay * Math.PI) / 180);
          ctx.font = `${Math.min(px, 40)}px Segoe UI, sans-serif`;
          ctx.fillStyle = mauTheoLop ? mauLop(c.lop, nenToi) : chuMau;
          ctx.fillText(c.chu, 0, 0);
          ctx.restore();
        }
      }
      // 5. Nhãn thửa (số thửa, loại đất, DT) do phần mềm dựng
      if (lop.nhan && v.tyLe > 1.2) {
        ctx.font = `${Math.min(13, 7 + v.tyLe * 1.2)}px Segoe UI, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = coAnh ? "#ffffff" : chuMau;
        if (coAnh) { ctx.shadowColor = "rgba(0,0,0,.9)"; ctx.shadowBlur = 3; }
        for (const t of p.dl.kq.thua) {
          const x = sx(t.tamNhan.x), y = sy(t.tamNhan.y);
          if (x < -50 || y < -20 || x > W + 50 || y > H + 20) continue;
          ctx.fillText(`${t.soThua ?? "?"}${t.loaiDatBanDo ? " " + t.loaiDatBanDo : ""}`, x, y);
          if (v.tyLe > 3 && t.dienTichGhi) {
            ctx.fillStyle = coAnh ? "#e8efe9" : nenToi ? "#aab8b2" : "#5d6b66";
            ctx.fillText(String(t.dienTichGhi), x, y + 12);
            ctx.fillStyle = coAnh ? "#ffffff" : chuMau;
          }
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
      }
      // 5b. Tên xã, phường (khi nhìn rộng; nhìn gần chỉ hiện ở thanh tọa độ)
      if (xaHien.length && v.tyLe < 0.6) {
        ctx.font = "600 13px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = coAnh ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.9)";
        ctx.fillStyle = coAnh ? "#ffd6f5" : "#7a2868";
        for (const x of xaHien) {
          const tx = sx(x.nhan.x), ty = sy(x.nhan.y);
          if (tx < 0 || ty < 0 || tx > W || ty > H) continue;
          ctx.strokeText(x.ten, tx, ty);
          ctx.fillText(x.ten, tx, ty);
        }
      }
      // 6. Đo đạc
      const dsDo = xongDo || !troDo ? diemDo : [...diemDo, troDo];
      if (dsDo.length) {
        ctx.beginPath();
        duong(dsDo);
        if (cong === "DO_DT" && dsDo.length > 2) {
          ctx.closePath();
          ctx.fillStyle = "rgba(47,127,214,0.16)";
          ctx.fill();
        }
        ctx.setLineDash([]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#2f7fd6";
        ctx.stroke();
        ctx.fillStyle = "#2f7fd6";
        for (const d of diemDo) ctx.fillRect(sx(d.x) - 3, sy(d.y) - 3, 6, 6);
        // nhãn chiều dài từng đoạn
        ctx.font = "11px Segoe UI, sans-serif";
        ctx.textAlign = "center";
        for (let i = 1; i < dsDo.length; i++) {
          const a = dsDo[i - 1]!, b = dsDo[i]!;
          const l = khoangCach(a, b);
          if (l * v.tyLe < 40) continue;
          const x = (sx(a.x) + sx(b.x)) / 2, y = (sy(a.y) + sy(b.y)) / 2 - 4;
          ctx.fillStyle = nenToi ? "rgba(0,0,0,.7)" : "rgba(255,255,255,.85)";
          const s = `${so(l)} m`;
          ctx.fillRect(x - ctx.measureText(s).width / 2 - 3, y - 11, ctx.measureText(s).width + 6, 14);
          ctx.fillStyle = "#1f5fa8";
          ctx.fillText(s, x, y);
        }
      }
      if (thongTin?.diem) {
        const d = thongTin.diem;
        ctx.strokeStyle = "#e0493a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx(d.x) - 8, sy(d.y));
        ctx.lineTo(sx(d.x) + 8, sy(d.y));
        ctx.moveTo(sx(d.x), sy(d.y) - 8);
        ctx.lineTo(sx(d.x), sy(d.y) + 8);
        ctx.stroke();
      }
      // khung phóng
      if (khung) {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = "#2f7fd6";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(sx(khung.a.x), sy(khung.a.y), sx(khung.b.x) - sx(khung.a.x), sy(khung.b.y) - sy(khung.a.y));
        ctx.setLineDash([]);
      }
      // điểm bắt
      if (batHien) {
        ctx.strokeStyle = "#f2b01e";
        ctx.lineWidth = 2;
        const bx = sx(batHien.x), by = sy(batHien.y);
        ctx.beginPath();
        if (batHien.kieu === "TRUNG_DIEM") (ctx.moveTo(bx, by - 7), ctx.lineTo(bx + 7, by + 6), ctx.lineTo(bx - 7, by + 6), ctx.closePath());
        else if (batHien.kieu === "GIAO_DIEM") (ctx.moveTo(bx - 7, by - 7), ctx.lineTo(bx + 7, by + 7), ctx.moveTo(bx + 7, by - 7), ctx.lineTo(bx - 7, by + 7));
        else if (batHien.kieu === "VUONG_GOC") (ctx.moveTo(bx - 7, by + 6), ctx.lineTo(bx + 7, by + 6), ctx.moveTo(bx, by + 6), ctx.lineTo(bx, by - 7));
        else ctx.rect(bx - 6, by - 6, 12, 12);
        ctx.stroke();
      }
      // thước tỷ lệ
      const m = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((m) => m * v.tyLe > 70) ?? 10000;
      // thước tỷ lệ: giữa cạnh dưới
      const dai = m * v.tyLe, x0 = W / 2 - dai / 2, y0 = H - 22;
      ctx.fillStyle = coAnh ? "#ffffff" : chuMau;
      ctx.fillRect(x0, y0, dai, 3);
      ctx.fillRect(x0, y0 - 4, 1.5, 7);
      ctx.fillRect(x0 + dai - 1.5, y0 - 4, 1.5, 7);
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${m >= 1000 ? `${m / 1000} km` : `${m} m`}`, W / 2, y0 - 6);
    };
    veLai();
    const ro = new ResizeObserver(veLai);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [nhin, hinhHien, chuHien, p.dl, p.thuHoi, p.vungChon.join("|"), p.thuaChon, p.chon, p.ttThua, p.khoaThua, pham, lop, cheDo, nenToi, mauTheoLop, diemDo, troDo, xongDo, khung, batHien, thongTin, cong, p.thuaQuet, p.ranhThem, p.lopPhu, anhNen, taiO, ranhXa, p.xaDuAn]); // eslint-disable-line react-hooks/exhaustive-deps

  const doiToaDo = (e: { clientX: number; clientY: number }): Diem => {
    const cv = ref.current!;
    const r = cv.getBoundingClientRect();
    const v = nhin!;
    return { x: (e.clientX - r.left - r.width / 2) / v.tyLe + v.cx, y: (r.height / 2 - (e.clientY - r.top)) / v.tyLe + v.cy };
  };
  const coBat = cong === "DO_DAI" || cong === "DO_DT" || cong === "TOA_DO" || cong === "GHI_CHU";
  const diemBat = (d: Diem): Diem & { kieu?: KieuBat } => {
    if (!bat || !coBat || !nhin) return d;
    const r = 10 / nhin.tyLe;
    const truoc = cong === "DO_DAI" || cong === "DO_DT" ? (diemDo.length && !xongDo ? diemDo[diemDo.length - 1] : null) : null;
    const kq = batDiemNangCao(d, hinhHien, r, kieuBat, truoc) ?? (lop.thua ? batDiemNangCao(d, hinhThua, r, kieuBat, truoc) : null);
    return kq ? { ...kq.d, kieu: kq.kieu } : d;
  };
  const doiCong = (c: CongCu) => {
    setCong(c);
    setDiemDo([]);
    setXongDo(false);
    setTroDo(null);
    setKhung(null);
    setBatHien(null);
    if (c !== "CHON" && c !== "TOA_DO") setThongTin(null);
  };
  // Tìm thửa/chủ: phóng tới thửa (nới 3 lần kích thước thửa, tối thiểu 60 m)
  useEffect(() => {
    const v = p.phongToi?.vong[0];
    if (!v?.length) return;
    const xs = v.map((d) => d.x), ys = v.map((d) => d.y);
    if (p.phongToi?.vua) return vuaKhung({ minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const r = Math.max(30, (Math.max(...xs) - Math.min(...xs)) * 1.5, (Math.max(...ys) - Math.min(...ys)) * 1.5);
    vuaKhung({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r });
  }, [p.phongToi?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nút "Vẽ ranh trên bản đồ" ở ngoài: chuyển sang công cụ vẽ vùng
  useEffect(() => {
    if (p.batVeVung) doiCong("DO_DT");
  }, [p.batVeVung]);
  useEffect(() => {
    if (p.batGhiChu) doiCong("GHI_CHU");
  }, [p.batGhiChu]);

  const ketQuaDo = diemDo.length > 1 ? { dai: chieuDai(cong === "DO_DT" && xongDo ? [...diemDo, diemDo[0]!] : diemDo), dt: cong === "DO_DT" ? dienTich(diemDo) : 0 } : null;
  const dsLopLoc = ve.lop.filter((l) => !timLop || `${l.lop} ${l.ten ?? ""}`.toLowerCase().includes(timLop.toLowerCase()));

  return (
    <div className={`ban-do${nenToi ? " ban-do-toi" : ""}`}>
      <canvas
        ref={ref}
        data-cong-cu={cong}
        onContextMenu={(e) => {
          e.preventDefault();
          if ((cong === "DO_DAI" || cong === "DO_DT") && diemDo.length) setXongDo(true);
        }}
        onMouseDown={(e) => {
          if (!nhin) return;
          const giua = e.button === 1;
          if (e.button === 2) return;
          if ((cong === "PHONG_KHUNG" || cong === "QUET") && !giua) {
            const d = doiToaDo(e);
            setKhung({ a: d, b: d });
            return;
          }
          if (!giua && (cong === "DO_DAI" || cong === "DO_DT" || cong === "TOA_DO")) return;
          e.preventDefault();
          keo.current = { x: e.clientX, y: e.clientY, cx: nhin.cx, cy: nhin.cy, di: false, giua };
        }}
        onMouseMove={(e) => {
          if (!nhin) return;
          const d = doiToaDo(e);
          const xa = lop.xa && ranhXa ? xaChua(ranhXa, d) : undefined;
          setToaDo(`X ${so(d.y, 2)} · Y ${so(d.x, 2)}${xa ? ` · ${xa.ten}` : ""}`);
          if (khung) setKhung({ ...khung, b: d });
          if (coBat) {
            const b = diemBat(d);
            setBatHien(b !== d ? b : null);
            if ((cong === "DO_DAI" || cong === "DO_DT") && diemDo.length && !xongDo) setTroDo(b);
          }
          const k = keo.current;
          if (!k) return;
          const dx = e.clientX - k.x, dy = e.clientY - k.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) k.di = true;
          if (k.di) setNhin({ ...nhin, cx: k.cx - dx / nhin.tyLe, cy: k.cy + dy / nhin.tyLe });
        }}
        onMouseUp={(e) => {
          if (!nhin || e.button === 2) return;
          if (khung) {
            const { a, b } = khung;
            setKhung(null);
            const r = { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) };
            if (cong === "QUET") {
              if (!p.quet) return;
              const ds = p.dl.kq.thua.filter((t) => t.tamNhan.x >= r.minX && t.tamNhan.x <= r.maxX && t.tamNhan.y >= r.minY && t.tamNhan.y <= r.maxY);
              p.quet(ds, e.shiftKey);
              return;
            }
            if (Math.abs(a.x - b.x) * nhin.tyLe > 8 && Math.abs(a.y - b.y) * nhin.tyLe > 8) vuaKhung(r);
            return;
          }
          const k = keo.current;
          keo.current = null;
          if (k?.di || k?.giua) return;
          const d = doiToaDo(e);
          if (cong === "DO_DAI" || cong === "DO_DT") {
            const b = diemBat(d);
            if (xongDo) {
              setDiemDo([b]);
              setXongDo(false);
            } else setDiemDo([...diemDo, b]);
            return;
          }
          if (cong === "TOA_DO") {
            setThongTin({ diem: diemBat(d) });
            return;
          }
          if (cong === "GHI_CHU") {
            p.themGhiChu?.("DIEM", [diemBat(d)]);
            return;
          }
          if (cong !== "CHON") return;
          const t = lop.thua ? p.dl.kq.thua.find((t) => diemTrongThua(d, t.vong)) : undefined;
          if (t && p.bamThua) p.bamThua(t);
          p.setChon(t ?? null);
          const pt = timPhanTu(d, hinhHien, chuHien, 6 / nhin.tyLe);
          setThongTin(pt);
        }}
        onDoubleClick={() => {
          if ((cong === "DO_DAI" || cong === "DO_DT") && diemDo.length > 1) {
            // bấm đúp thêm điểm trùng ở lần bấm thứ hai → bỏ
            const ds = diemDo.length > 2 && khoangCach(diemDo[diemDo.length - 1]!, diemDo[diemDo.length - 2]!) < 1e-9 ? diemDo.slice(0, -1) : diemDo;
            setDiemDo(ds);
            setXongDo(true);
            setTroDo(null);
          }
        }}
        onMouseLeave={() => {
          keo.current = null;
          setBatHien(null);
        }}
      />

      <div className={`bd-thanh${anThanh ? " thu-gon" : ""}`} role="toolbar" aria-label="Công cụ bản đồ">
        {anThanh ? (
          <button className="nut nut-nho bd-mo-thanh" aria-label="Mở thanh công cụ" aria-expanded={false} title={`Mở thanh công cụ — đang dùng: ${CONG_CU.find((c) => c.ma === cong)?.ten ?? ""}`} onClick={() => setAnThanh(false)}>
            <span aria-hidden>☰</span> <span aria-hidden>{CONG_CU.find((c) => c.ma === cong)?.ky}</span> ▸
          </button>
        ) : (
        <>
        <button className="nut nut-nho bd-mo-thanh" aria-label="Thu gọn thanh công cụ" aria-expanded title="Thu gọn thanh công cụ về góc trái" onClick={() => setAnThanh(true)}>◂</button>
        {CONG_CU.map((c) => (
          <button key={c.ma} className={`nut nut-nho${cong === c.ma ? " chon" : ""}`} aria-pressed={cong === c.ma} title={`${c.ten} — ${c.goiY}`} aria-label={c.ten} onClick={() => doiCong(c.ma)}>
            <span aria-hidden>{c.ky}</span><span className="bd-chu">{c.ten}</span>
          </button>
        ))}
        <span className="bd-vach" />
        <button className="nut nut-nho" title="Phóng to" aria-label="Phóng to" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe * 1.4 })}>＋</button>
        <button className="nut nut-nho" title="Thu nhỏ" aria-label="Thu nhỏ" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe / 1.4 })}>－</button>
        <button className="nut nut-nho" title="Vừa vùng thửa, ranh GPMB" aria-label="Vừa vùng thửa" onClick={() => setNhin(null)}>⤢<span className="bd-chu">Vùng thửa</span></button>
        <button className="nut nut-nho" title="Vừa toàn bộ bản vẽ" aria-label="Toàn bộ bản vẽ" disabled={!phamToanBo} onClick={() => phamToanBo && vuaKhung(phamToanBo)}>⛶<span className="bd-chu">Toàn bộ bản vẽ</span></button>
        {(() => { const x = ranhXa?.find((r) => cungTenXa(r.ten, p.xaDuAn)); return x && lop.xa ? <button className="nut nut-nho" title={`Vừa ranh giới ${x.ten} (xã của dự án)`} aria-label="Vừa ranh xã của dự án" onClick={() => vuaKhung(x.hop)}>▢<span className="bd-chu">{x.ten}</span></button> : null; })()}
        <span className="bd-vach" />
        <details className="bd-bat chu-nho" title="Bắt điểm khi đo, lấy tọa độ, ghi chú">
          <summary aria-label="Kiểu bắt điểm">Bắt: {bat ? [...kieuBat].map((k) => TEN_KIEU_BAT[k]).join(", ") : "tắt"}</summary>
          <div className="bd-bat-ds">
            {(Object.keys(TEN_KIEU_BAT) as KieuBat[]).map((k) => (
              <label key={k}><input type="checkbox" checked={kieuBat.has(k)} onChange={(e) => doiKieuBat(k, e.target.checked)} /> {TEN_KIEU_BAT[k]}{k === "VUONG_GOC" ? " (từ điểm đo trước)" : ""}</label>
            ))}
          </div>
        </details>
        <label className="chu-nho"><input type="checkbox" checked={nenToi} onChange={(e) => setNenToi(e.target.checked)} /> Nền đen</label>
        </>
        )}
      </div>

      <div className={`bd-bang${anBang ? " thu-gon" : ""}`} aria-label="Lớp bản đồ">
        <div className="bd-bang-tieu-de">
          <b>Lớp bản đồ</b>
          <button className="bd-nut-nho" title={anBang ? "Mở bảng lớp" : "Thu gọn bảng lớp"} aria-label={anBang ? "Mở bảng lớp" : "Thu gọn bảng lớp"} onClick={() => setAnBang(!anBang)}>{anBang ? "▸" : "▾"}</button>
        </div>
        {!anBang && (
        <div className="bd-bang-than">
        <button className="bd-muc" aria-expanded={bangLop.has("GPMB")} onClick={() => batMuc("GPMB")}>{bangLop.has("GPMB") ? "▾" : "▸"} Lớp GPMB</button>
        {bangLop.has("GPMB") && (
          <div className="bd-muc-than">
            {([
              ["ranh", "Ranh GPMB"],
              ["thua", "Thửa đất"],
              ["to", "Tô màu"],
              ["nhan", "Nhãn thửa"],
              ["nen", "Nền địa hình, hạ tầng", "Nét bản vẽ của các lớp DGN đang bật"],
              ["diaDanh", "Địa danh", "Chữ bản vẽ (tên đường, cánh đồng, ghi chú…) của các lớp DGN đang bật"],
              ["xa", "Ranh giới xã, phường", "Ranh 75 xã, phường tỉnh Sơn La (tệp tác giả cung cấp, tham khảo — không dùng xác định ranh giới hành chính); xã của dự án nét đậm; tên xã hiện khi thu nhỏ và ở thanh tọa độ"],
            ] as const).map(([k, ten, goiY]) => (
              <label key={k} title={goiY}><input type="checkbox" checked={lop[k]} onChange={(e) => setLop({ ...lop, [k]: e.target.checked })} /> {ten}</label>
            ))}
            <label title="Ảnh vệ tinh trực tuyến dưới bản đồ — cần Internet; chỉ gửi số hiệu ô ảnh của khung đang xem"><input type="checkbox" aria-label="Ảnh vệ tinh" checked={anhNen.bat} onChange={(e) => batAnhNen(e.target.checked)} /> Ảnh vệ tinh (trực tuyến)</label>
            <Chon value={cheDo} onChange={(e) => setCheDo(e.target.value as typeof cheDo)}>
              <option value="HIEN_TRANG">Tô theo hiện trạng GPMB</option>
              <option value="PHAM_VI">Tô theo phạm vi thu hồi</option>
            </Chon>
          </div>
        )}
        <button className="bd-muc" aria-expanded={bangLop.has("ANH")} aria-label="Cài đặt ảnh vệ tinh" onClick={() => batMuc("ANH")}>{bangLop.has("ANH") ? "▾" : "▸"} Ảnh vệ tinh{anhNen.bat ? " · bật" : ""}</button>
        {bangLop.has("ANH") && (
          <div className="bd-muc-than bd-anh">
            <label><input type="checkbox" checked={anhNen.bat} onChange={(e) => batAnhNen(e.target.checked)} /> Hiện ảnh nền trực tuyến</label>
            <Chon aria-label="Chọn nguồn ảnh nền" value={anhNen.nguon} onChange={(e) => setAnhNen({ nguon: e.target.value })}>
              {NGUON_ANH_NEN.map((n) => <option key={n.ma} value={n.ma}>{n.ten}</option>)}
              <option value="TUY_CHINH">Tùy chỉnh (URL XYZ)…</option>
            </Chon>
            {anhNen.nguon === "TUY_CHINH" && (
              <>
                <input aria-label="URL ô ảnh" placeholder="https://…/{z}/{x}/{y}" value={anhNen.url} onChange={(e) => setAnhNen({ url: e.target.value })} />
                {!mauUrlHopLe(anhNen.url) && <span className="chu-nho" style={{ color: "#c0392b" }}>URL https có {"{z}"}, {"{x}"}, {"{y}"} — dùng nguồn ảnh cơ quan có quyền sử dụng</span>}
              </>
            )}
            <label className="chu-nho">Độ đậm <input type="range" aria-label="Độ đậm ảnh" min={20} max={100} step={5} value={Math.round(anhNen.doMo * 100)} onChange={(e) => setAnhNen({ doMo: Number(e.target.value) / 100 })} /> {Math.round(anhNen.doMo * 100)}%</label>
            <div className="bd-anh-luoi chu-nho">
              <label>Kinh tuyến trục<input aria-label="Kinh tuyến trục" value={ktNhap} onChange={(e) => { setKtNhap(e.target.value); const v = docKinhTuyen(e.target.value); if (v !== null) setAnhNen({ kt: v }); }} onBlur={() => setKtNhap(ghiKinhTuyen(anhNen.kt))} /></label>
              <label>Múi chiếu<Chon aria-label="Múi chiếu" value={String(anhNen.mui)} onChange={(e) => setAnhNen({ mui: Number(e.target.value) as 3 | 6 })}><option value="3">3° (k0 0,9999)</option><option value="6">6° (k0 0,9996)</option></Chon></label>
              <label>Mức ảnh tối đa<Chon aria-label="Mức ảnh tối đa" value={String(anhNen.mucToiDa ?? 0)} onChange={(e) => setAnhNen({ mucToiDa: Number(e.target.value) })}><option value="0">Tự động</option>{[15, 16, 17, 18, 19, 20].map((z) => <option key={z} value={z}>{z}</option>)}</Chon></label>
              <span className="mo" style={{ alignSelf: "end" }}>Ô chưa có ảnh tự dùng mức thấp hơn</span>
              <label>Dịch Đông (m)<input aria-label="Dịch ảnh theo Đông" type="number" step={0.5} value={anhNen.dx} onChange={(e) => setAnhNen({ dx: Number(e.target.value) || 0 })} /></label>
              <label>Dịch Bắc (m)<input aria-label="Dịch ảnh theo Bắc" type="number" step={0.5} value={anhNen.dy} onChange={(e) => setAnhNen({ dy: Number(e.target.value) || 0 })} /></label>
            </div>
            <div className="mo chu-nho">VN-2000 → WGS-84 theo 7 tham số QĐ 05/2007/QĐ-BTNMT; kinh tuyến trục Sơn La 104°00′ (TT 973/2001/TT-TCĐC). Ảnh nền sai lệch vài mét — chỉ tham khảo trực quan, không dùng đo đạc; lệch thì chỉnh “Dịch”. Chỉ gửi số hiệu ô ảnh (z/x/y) của khung đang xem.</div>
          </div>
        )}
        <button className="bd-muc" aria-expanded={bangLop.has("DGN")} aria-label="Lớp bản vẽ DGN" onClick={() => batMuc("DGN")}>{bangLop.has("DGN") ? "▾" : "▸"} Lớp bản vẽ DGN (Level) · {ve.lop.length - [...lopAn].filter((l) => ve.lop.some((x) => x.lop === l)).length}/{ve.lop.length}</button>
        {bangLop.has("DGN") && (
          <div className="bd-muc-than bd-lop-dgn">
            <input placeholder="Tìm lớp (số, tên)…" value={timLop} onChange={(e) => setTimLop(e.target.value)} aria-label="Tìm lớp" />
            <div className="nhom-nut">
              <button className="nut nut-nho" onClick={() => setLopAn(new Set([...lopAn].filter((l) => !dsLopLoc.some((x) => x.lop === l))))}>Bật {timLop ? "lớp lọc" : "tất cả"}</button>
              <button className="nut nut-nho" onClick={() => setLopAn(new Set([...lopAn, ...dsLopLoc.map((x) => x.lop)]))}>Tắt {timLop ? "lớp lọc" : "tất cả"}</button>
            </div>
            <label className="chu-nho"><input type="checkbox" checked={mauTheoLop} onChange={(e) => setMauTheoLop(e.target.checked)} /> Màu theo lớp{p.dl.ban.bangMau ? "" : " (tệp V8: luôn theo lớp)"}</label>
            <div className="bd-ds-lop">
              {dsLopLoc.map((l) => (
                <label key={l.lop} title={l.ten ?? "Lớp không có trong Phụ lục 21 TT 26/2024 (địa phương tận dụng)"} data-lop={l.lop}>
                  <input type="checkbox" checked={!lopAn.has(l.lop)} onChange={(e) => { const s = new Set(lopAn); if (e.target.checked) s.delete(l.lop); else s.add(l.lop); setLopAn(s); }} />
                  <i style={{ background: mauLop(l.lop, nenToi) }} />
                  <b>{l.lop}</b>
                  <span className="bd-ten-lop">{l.ten ?? "—"}</span>
                  <span className="mo">{l.soHinh ? `${l.soHinh} nét` : ""}{l.soHinh && l.soChu ? " · " : ""}{l.soChu ? `${l.soChu} chữ` : ""}</span>
                </label>
              ))}
              {!dsLopLoc.length && <span className="mo chu-nho">Không có lớp.</span>}
            </div>
            <div className="mo chu-nho">Tên lớp theo Phụ lục 21 TT 26/2024/TT-BTNMT (số lớp). Tệp V8: số lớp là mã lớp trong tệp.</div>
          </div>
        )}
        <button className="bd-muc" aria-expanded={bangLop.has("CHU_GIAI")} onClick={() => batMuc("CHU_GIAI")}>{bangLop.has("CHU_GIAI") ? "▾" : "▸"} Chú giải</button>
        {bangLop.has("CHU_GIAI") && (
          <div className="bd-muc-than chu-giai">
            {cheDo === "HIEN_TRANG" ? (
              <>
                {THU_TU_TRANG_THAI.map((t) => <span key={t}><i style={{ background: TT_GPMB[t].nen }} />{TT_GPMB[t].bieuTuong} {TT_GPMB[t].ten}</span>)}
                <span><i style={{ background: "rgba(170,181,176,0.22)" }} />Trong ranh, chưa lập hồ sơ</span>
              </>
            ) : (
              <>
                <span><i style={{ background: "rgba(192,57,43,0.35)" }} />Thu hồi toàn bộ</span>
                <span><i style={{ background: "rgba(230,140,20,0.4)" }} />Thu hồi một phần</span>
              </>
            )}
            <span><i style={{ background: "#fff", borderColor: "#c0392b", borderWidth: 2 }} />Ranh GPMB đã chọn</span>
            {lop.xa && <span><i style={{ background: "#fff", borderColor: "#a03c8c", borderStyle: "dashed" }} />Ranh giới xã, phường{loiXa ? ` (lỗi: ${loiXa})` : ""}</span>}
            {p.thuaChon.size > 0 && <span><i style={{ background: "#fff", borderColor: "#c0392b", borderStyle: "dashed" }} />Thửa chọn tay</span>}
            <span><i style={{ background: "#fff", borderColor: "#6a3fb5", borderStyle: "dashed" }} />Ranh ứng viên</span>
          </div>
        )}
        </div>
        )}
      </div>

      {(ketQuaDo || (thongTin && (thongTin.hinh || thongTin.chu || thongTin.diem))) && (
        <div className="bd-ket-qua" role="status">
          {ketQuaDo && (
            <>
              <b>{cong === "DO_DT" ? "Đo diện tích" : "Đo khoảng cách"}</b>
              <div>{cong === "DO_DT" ? "Chu vi" : "Tổng chiều dài"}: <b>{so(ketQuaDo.dai)} m</b> · {diemDo.length} điểm</div>
              {cong === "DO_DAI" && diemDo.length > 1 && <div className="mo">Đoạn cuối: {so(khoangCach(diemDo[diemDo.length - 2]!, diemDo[diemDo.length - 1]!))} m</div>}
              {cong === "DO_DT" && diemDo.length > 2 && <div>Diện tích: <b>{so(ketQuaDo.dt)} m²</b> ({so(ketQuaDo.dt / 10000, 4)} ha)</div>}
              <div className="mo">{xongDo ? "Đã kết thúc — bấm để đo lại, Esc để xóa" : "Bấm đúp / chuột phải để kết thúc"}</div>
              {xongDo && (
                <div className="nhom-nut" style={{ marginTop: 4 }}>
                  {p.luuVung && cong === "DO_DT" && diemDo.length > 2 && <button className="nut nut-nho nut-chinh" onClick={() => { p.luuVung!(diemDo); doiCong("CHON"); }}>Dùng làm ranh GPMB</button>}
                  {p.luuDo && <button className="nut nut-nho" onClick={() => { p.luuDo!(cong === "DO_DT" ? "DT" : "DAI", diemDo, cong === "DO_DT" ? dienTich(diemDo) : chieuDai(diemDo)); doiCong(cong); }}>Lưu kết quả đo</button>}
                  {p.themGhiChu && cong === "DO_DAI" && <button className="nut nut-nho" onClick={() => { p.themGhiChu!("DUONG", diemDo); doiCong(cong); }}>Lưu làm ghi chú (đường)</button>}
                </div>
              )}
            </>
          )}
          {!ketQuaDo && thongTin?.diem && (
            <>
              <b>Tọa độ điểm (VN-2000)</b>
              <div>X = {so(thongTin.diem.y, 3)} · Y = {so(thongTin.diem.x, 3)}</div>
              <button className="nut nut-nho" onClick={() => void navigator.clipboard?.writeText(`${thongTin.diem!.y.toFixed(3)}\t${thongTin.diem!.x.toFixed(3)}`)}>Sao chép X, Y</button>
            </>
          )}
          {!ketQuaDo && thongTin?.hinh && (
            <>
              <b>{TEN_LOAI[thongTin.hinh.loai] ?? thongTin.hinh.loai}</b>{thongTin.hinh.nguon && <span className="mo"> · {thongTin.hinh.nguon}</span>}
              <div>Lớp {thongTin.hinh.lop}{ve.lop.find((l) => l.lop === thongTin.hinh!.lop)?.ten ? ` — ${ve.lop.find((l) => l.lop === thongTin.hinh!.lop)!.ten}` : ""}</div>
              <div>Chiều dài: <b>{so(thongTin.hinh.duong.reduce((s, d) => s + chieuDai(d), 0))} m</b> · {thongTin.hinh.duong.reduce((s, d) => s + d.length, 0)} đỉnh</div>
              {thongTin.hinh.kin && <div>Diện tích: <b>{so(dienTich(thongTin.hinh.duong.flat()))} m²</b></div>}
              <div className="mo">Phần tử số {thongTin.hinh.stt} trong tệp</div>
            </>
          )}
          {!ketQuaDo && thongTin?.chu && (
            <>
              <b>Chữ</b>{thongTin.chu.nguon && <span className="mo"> · {thongTin.chu.nguon}</span>}
              <div>“{thongTin.chu.chu}”</div>
              <div>Lớp {thongTin.chu.lop}{ve.lop.find((l) => l.lop === thongTin.chu!.lop)?.ten ? ` — ${ve.lop.find((l) => l.lop === thongTin.chu!.lop)!.ten}` : ""}</div>
            </>
          )}
        </div>
      )}

      <svg className="mui-ten-bac" width={40} height={52} viewBox="0 0 40 52" aria-label="Hướng Bắc">
        <circle cx={20} cy={30} r={17} fill="rgba(255,255,255,0.92)" stroke="#c4ccc8" />
        <path d="M20 14l7 22-7-5-7 5z" fill="#23302b" />
        <text x={20} y={10} textAnchor="middle" fontSize={11} fontWeight={700} fill={nenToi ? "#e8efe9" : "#23302b"}>B</text>
      </svg>
      {anhNen.bat && (
        <div className="bd-ghi-nguon chu-nho" role="status" aria-label="Ghi nguồn ảnh nền">
          {anhNen.nguon === "TUY_CHINH" && !mauUrlHopLe(anhNen.url) ? "Ảnh nền: URL chưa hợp lệ" : nguonAnh(anhNen).ghiNguon}
          {trangThaiAnh ? ` · mức ${trangThaiAnh.z}` : ""}
          {trangThaiAnh?.phongTo ? ` (ảnh mức ${trangThaiAnh.mucThay} phóng to)` : ""}
          {trangThaiAnh?.loi ? ` · không tải được ${trangThaiAnh.loi}/${trangThaiAnh.tong} ô (kiểm tra Internet)` : ""}
        </div>
      )}
      <div className="toa-do">{toaDo || "VN-2000"}{nhin ? ` · tỷ lệ màn hình ≈ 1:${Math.round(3780 / nhin.tyLe).toLocaleString("vi-VN")}` : ""}</div>
    </div>
  );
}

/* ------------------------- Tạo hồ sơ từ bản đồ ------------------------- */

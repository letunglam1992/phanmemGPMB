import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { diemTrongThua, type DienTichThuHoi, type Diem, type ThuaBanDo } from "@gpmb/gis";
import { type Ho } from "../../mo-hinh";
import { THU_TU_TRANG_THAI, TT_GPMB, type TrangThaiGpmb } from "../../trang-thai";
import { Chon } from "../../thanh-phan/Chon";
import { type DuLieuBanDo } from "./du-lieu";
import { TEN_LOAI, batDiem, chieuDai, chuanBiVe, dienTich, hinhTuVong, khoangCach, mauLop, phamViToanBo, timPhanTu, type ChuVe, type HinhVe } from "./hinh-hoc";

/**
 * Trình xem bản đồ kiểu MicroStation (phục vụ GPMB, chỉ đọc): lăn chuột phóng to/thu nhỏ tại con trỏ (không cuộn trang),
 * kéo để di chuyển, phóng theo khung; bật/tắt từng lớp (level) của tệp DGN; công cụ thông tin phần tử, đo khoảng cách,
 * đo diện tích, lấy tọa độ; bắt điểm vào đỉnh; nền đen/sáng. Lớp phủ GPMB (thửa, ranh, tô màu) vẽ trên nền bản vẽ.
 */
type CongCu = "CHON" | "KEO" | "PHONG_KHUNG" | "QUET" | "DO_DAI" | "DO_DT" | "TOA_DO";
const CONG_CU: { ma: CongCu; ten: string; ky: string; goiY: string }[] = [
  { ma: "CHON", ten: "Chọn, thông tin", ky: "⌖", goiY: "Bấm vào thửa / phần tử để xem thông tin (kéo để di chuyển)" },
  { ma: "KEO", ten: "Di chuyển", ky: "✋", goiY: "Kéo để di chuyển bản đồ" },
  { ma: "PHONG_KHUNG", ten: "Phóng theo khung", ky: "⬚", goiY: "Kéo một khung chữ nhật để phóng tới vùng đó" },
  { ma: "QUET", ten: "Chọn nhiều thửa (quét khung)", ky: "▦", goiY: "Kéo khung để chọn các thửa có tâm nằm trong khung; giữ Shift để chọn thêm" },
  { ma: "DO_DAI", ten: "Đo khoảng cách", ky: "📏", goiY: "Bấm các điểm; bấm đúp hoặc chuột phải để kết thúc; Esc để xóa" },
  { ma: "DO_DT", ten: "Đo diện tích", ky: "▱", goiY: "Bấm các đỉnh vùng; bấm đúp hoặc chuột phải để khép vùng; Esc để xóa" },
  { ma: "TOA_DO", ten: "Tọa độ điểm", ky: "⌗", goiY: "Bấm để lấy tọa độ VN-2000 của điểm (bắt đỉnh nếu bật)" },
];
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
  /** Quét khung chọn nhiều thửa (hạng mục 3 docs/08 §9): trả về thửa có tâm nhãn trong khung; them = giữ Shift. */
  quet?: (ds: ThuaBanDo[], them: boolean) => void;
  /** Khóa (khoaThua) các thửa đang chọn bằng quét khung — tô nổi. */
  thuaQuet?: Set<string>;
  /** Phóng tới thửa (tìm thửa/chủ): đổi `n` để phóng lại. */
  phongToi?: { vong: Diem[][]; n: number } | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const khoa = `gpmb-ban-do-${p.khoaLuu ?? "chung"}`;
  const [cheDo, setCheDo] = useState<"HIEN_TRANG" | "PHAM_VI">("HIEN_TRANG");
  const [lop, setLop] = useState({ nen: true, thua: true, to: true, ranh: true, nhan: true, diaDanh: true });
  const [lopAn, setLopAn] = useState<Set<number>>(() => new Set(docLuu<number[]>(`${khoa}-lop-an`, [])));
  const [nenToi, setNenToi] = useState<boolean>(() => docLuu(`${khoa}-nen-toi`, false));
  const [mauTheoLop, setMauTheoLop] = useState<boolean>(() => docLuu(`${khoa}-mau-lop`, true));
  const [bat, setBat] = useState(true);
  const [cong, setCong] = useState<CongCu>("CHON");
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
  useEffect(() => ghiLuu(`${khoa}-an-bang`, anBang), [khoa, anBang]);
  useEffect(() => ghiLuu(`${khoa}-an-thanh`, anThanh), [khoa, anThanh]);
  const [timLop, setTimLop] = useState("");
  const [nhin, setNhin] = useState<{ cx: number; cy: number; tyLe: number } | null>(null);
  const [toaDo, setToaDo] = useState<string>("");
  const [diemDo, setDiemDo] = useState<Diem[]>([]);
  const [xongDo, setXongDo] = useState(false);
  const [troDo, setTroDo] = useState<Diem | null>(null);
  const [batHien, setBatHien] = useState<Diem | null>(null);
  const [khung, setKhung] = useState<{ a: Diem; b: Diem } | null>(null);
  const [thongTin, setThongTin] = useState<{ hinh?: HinhVe; chu?: ChuVe; diem?: Diem } | null>(null);
  const keo = useRef<{ x: number; y: number; cx: number; cy: number; di: boolean; giua: boolean } | null>(null);
  const nhinRef = useRef(nhin);
  useLayoutEffect(() => {
    nhinRef.current = nhin;
  }, [nhin]);
  const { pham } = p.dl;

  useEffect(() => ghiLuu(`${khoa}-lop-an`, [...lopAn]), [khoa, lopAn]);
  useEffect(() => ghiLuu(`${khoa}-nen-toi`, nenToi), [khoa, nenToi]);
  useEffect(() => ghiLuu(`${khoa}-mau-lop`, mauTheoLop), [khoa, mauTheoLop]);

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
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = nenToi ? "#9fb0a9" : "#6f7d77";
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
        ctx.fillStyle = chuMau;
        for (const t of p.dl.kq.thua) {
          const x = sx(t.tamNhan.x), y = sy(t.tamNhan.y);
          if (x < -50 || y < -20 || x > W + 50 || y > H + 20) continue;
          ctx.fillText(`${t.soThua ?? "?"}${t.loaiDatBanDo ? " " + t.loaiDatBanDo : ""}`, x, y);
          if (v.tyLe > 3 && t.dienTichGhi) {
            ctx.fillStyle = nenToi ? "#aab8b2" : "#5d6b66";
            ctx.fillText(String(t.dienTichGhi), x, y + 12);
            ctx.fillStyle = chuMau;
          }
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
        ctx.strokeRect(sx(batHien.x) - 6, sy(batHien.y) - 6, 12, 12);
      }
      // thước tỷ lệ
      const m = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find((m) => m * v.tyLe > 70) ?? 10000;
      // thước tỷ lệ: giữa cạnh dưới
      const dai = m * v.tyLe, x0 = W / 2 - dai / 2, y0 = H - 22;
      ctx.fillStyle = chuMau;
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
  }, [nhin, hinhHien, chuHien, p.dl, p.thuHoi, p.vungChon.join("|"), p.thuaChon, p.chon, p.ttThua, p.khoaThua, pham, lop, cheDo, nenToi, mauTheoLop, diemDo, troDo, xongDo, khung, batHien, thongTin, cong, p.thuaQuet, p.ranhThem]); // eslint-disable-line react-hooks/exhaustive-deps

  const doiToaDo = (e: { clientX: number; clientY: number }): Diem => {
    const cv = ref.current!;
    const r = cv.getBoundingClientRect();
    const v = nhin!;
    return { x: (e.clientX - r.left - r.width / 2) / v.tyLe + v.cx, y: (r.height / 2 - (e.clientY - r.top)) / v.tyLe + v.cy };
  };
  const coBat = cong === "DO_DAI" || cong === "DO_DT" || cong === "TOA_DO";
  const diemBat = (d: Diem): Diem => {
    if (!bat || !coBat || !nhin) return d;
    const r = 10 / nhin.tyLe;
    return batDiem(d, hinhHien, r) ?? (lop.thua ? batDiem(d, hinhThua, r) : null) ?? d;
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
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const r = Math.max(30, (Math.max(...xs) - Math.min(...xs)) * 1.5, (Math.max(...ys) - Math.min(...ys)) * 1.5);
    vuaKhung({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r });
  }, [p.phongToi?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nút "Vẽ ranh trên bản đồ" ở ngoài: chuyển sang công cụ vẽ vùng
  useEffect(() => {
    if (p.batVeVung) doiCong("DO_DT");
  }, [p.batVeVung]);

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
          setToaDo(`X ${so(d.y, 2)} · Y ${so(d.x, 2)}`);
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
        <span className="bd-vach" />
        <label className="chu-nho" title="Bắt vào đỉnh gần nhất khi đo, lấy tọa độ"><input type="checkbox" checked={bat} onChange={(e) => setBat(e.target.checked)} /> Bắt điểm</label>
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
            ] as const).map(([k, ten, goiY]) => (
              <label key={k} title={goiY}><input type="checkbox" checked={lop[k]} onChange={(e) => setLop({ ...lop, [k]: e.target.checked })} /> {ten}</label>
            ))}
            <label className="mo" title="Cần kết nối Internet tới máy chủ bản đồ ngoài — tắt theo yêu cầu không gửi dữ liệu ra ngoài"><input type="checkbox" disabled /> Ảnh vệ tinh (trực tuyến – tắt)</label>
            <Chon value={cheDo} onChange={(e) => setCheDo(e.target.value as typeof cheDo)}>
              <option value="HIEN_TRANG">Tô theo hiện trạng GPMB</option>
              <option value="PHAM_VI">Tô theo phạm vi thu hồi</option>
            </Chon>
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
              {p.luuVung && cong === "DO_DT" && xongDo && diemDo.length > 2 && <button className="nut nut-nho nut-chinh" onClick={() => { p.luuVung!(diemDo); doiCong("CHON"); }}>Dùng làm ranh GPMB</button>}
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
      <div className="toa-do">{toaDo || "VN-2000"}{nhin ? ` · tỷ lệ màn hình ≈ 1:${Math.round(3780 / nhin.tyLe).toLocaleString("vi-VN")}` : ""}</div>
    </div>
  );
}

/* ------------------------- Tạo hồ sơ từ bản đồ ------------------------- */

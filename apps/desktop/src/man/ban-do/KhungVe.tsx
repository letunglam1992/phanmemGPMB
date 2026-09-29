import { useEffect, useMemo, useRef, useState } from "react";
import { diemTrongThua, giaiMaNhan, type DienTichThuHoi, type PhanTuChu, type ThuaBanDo } from "@gpmb/gis";
import { type Ho } from "../../mo-hinh";
import { THU_TU_TRANG_THAI, TT_GPMB, type TrangThaiGpmb } from "../../trang-thai";
import { Chon } from "../../thanh-phan/Chon";
import { type DuLieuBanDo } from "./du-lieu";

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
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [cheDo, setCheDo] = useState<"HIEN_TRANG" | "PHAM_VI">("HIEN_TRANG");
  const [lop, setLop] = useState({ nen: true, thua: true, to: true, ranh: true, nhan: true, diaDanh: true });
  const [nhin, setNhin] = useState<{ cx: number; cy: number; tyLe: number } | null>(null);
  const [toaDo, setToaDo] = useState<string>("");
  const keo = useRef<{ x: number; y: number; cx: number; cy: number; di: boolean } | null>(null);
  const { pham } = p.dl;

  const nen = useMemo(() => {
    // Nét nền: mọi phần tử hình trong phạm vi bản đồ (bỏ phần tử ở tọa độ cục bộ)
    const w = pham.maxX - pham.minX, h = pham.maxY - pham.minY;
    const tr = { minX: pham.minX - w, maxX: pham.maxX + w, minY: pham.minY - h, maxY: pham.maxY + h };
    const out: { lop: number; diem: { x: number; y: number }[] }[] = [];
    for (const e of p.dl.ban.phanTu) {
      if (!("diem" in e) || e.diem.length < 2) continue;
      const d0 = e.diem[0]!;
      if (d0.x < tr.minX || d0.x > tr.maxX || d0.y < tr.minY || d0.y > tr.maxY) continue;
      out.push({ lop: e.lop, diem: e.diem });
    }
    return out;
  }, [p.dl, pham]);

  const diaDanh = useMemo(
    () =>
      p.dl.ban.phanTu
        .filter((e): e is PhanTuChu => e.loai === "CHU" && [15, 48, 63].includes(e.lop) && e.goc.x > pham.minX - 200 && e.goc.x < pham.maxX + 200 && e.goc.y > pham.minY - 200 && e.goc.y < pham.maxY + 200)
        .map((e) => ({ chu: giaiMaNhan(e), x: e.goc.x, y: e.goc.y })),
    [p.dl, pham],
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ve = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      const v = nhin ?? { cx: (pham.minX + pham.maxX) / 2, cy: (pham.minY + pham.maxY) / 2, tyLe: Math.min(W / (pham.maxX - pham.minX), H / (pham.maxY - pham.minY)) * 0.92 };
      if (!nhin) setNhin(v);
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fbfcfb";
      ctx.fillRect(0, 0, W, H);
      const sx = (x: number) => (x - v.cx) * v.tyLe + W / 2;
      const sy = (y: number) => H / 2 - (y - v.cy) * v.tyLe;
      const duong = (ds: { x: number; y: number }[]) => {
        ctx.moveTo(sx(ds[0]!.x), sy(ds[0]!.y));
        for (let i = 1; i < ds.length; i++) ctx.lineTo(sx(ds[i]!.x), sy(ds[i]!.y));
      };
      // nền
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "#c9d2ce";
      ctx.beginPath();
      if (lop.nen) for (const e of nen) if (e.lop !== 10) duong(e.diem);
      ctx.stroke();
      // thửa
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
        ctx.strokeStyle = "#6f7d77";
        ctx.stroke();
      }
      // ranh GPMB
      for (const vg of lop.ranh ? p.dl.kq.vungGpmb : []) {
        const laChon = p.vungChon.includes(vg.ma);
        ctx.beginPath();
        duong(vg.vong[0]!);
        ctx.closePath();
        ctx.setLineDash(laChon ? [] : [6, 4]);
        ctx.lineWidth = laChon ? 2.4 : 1.2;
        ctx.strokeStyle = laChon ? "#c0392b" : "#6a3fb5";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // thửa chọn tay là thửa thu hồi: viền đỏ đứt
      if (p.thuaChon.size) {
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "#c0392b";
        for (const t of p.dl.kq.thua) {
          if (!p.thuaChon.has(t.ma)) continue;
          ctx.beginPath();
          for (const vg of t.vong) { duong(vg); ctx.closePath(); }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      // thửa chọn
      if (p.chon) {
        ctx.beginPath();
        for (const vg of p.chon.vong) {
          duong(vg);
          ctx.closePath();
        }
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "#1f5fa8";
        ctx.stroke();
      }
      // nhãn
      if (lop.nhan && v.tyLe > 1.2) {
        ctx.font = `${Math.min(13, 7 + v.tyLe * 1.2)}px Segoe UI, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#23302b";
        for (const t of p.dl.kq.thua) {
          const x = sx(t.tamNhan.x), y = sy(t.tamNhan.y);
          if (x < -50 || y < -20 || x > W + 50 || y > H + 20) continue;
          ctx.fillText(`${t.soThua ?? "?"}${t.loaiDatBanDo ? " " + t.loaiDatBanDo : ""}`, x, y);
          if (v.tyLe > 3 && t.dienTichGhi) {
            ctx.fillStyle = "#5d6b66";
            ctx.fillText(String(t.dienTichGhi), x, y + 12);
            ctx.fillStyle = "#23302b";
          }
        }
      }
      // địa danh (tên đường, cánh đồng…)
      ctx.font = "italic 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#5a6f9a";
      if (lop.diaDanh) for (const c of diaDanh) ctx.fillText(c.chu, sx(c.x), sy(c.y));
      // thước tỷ lệ
      const m = [5, 10, 20, 50, 100, 200, 500].find((m) => m * v.tyLe > 70) ?? 1000;
      ctx.fillStyle = "#23302b";
      ctx.fillRect(12, 14, m * v.tyLe, 3);
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${m} m`, 12, 30);
    };
    ve();
    const ro = new ResizeObserver(ve);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [nhin, nen, diaDanh, p.dl, p.thuHoi, p.vungChon.join("|"), p.thuaChon, p.chon, p.ttThua, p.khoaThua, pham, lop, cheDo]); // eslint-disable-line react-hooks/exhaustive-deps

  const doiToaDo = (e: React.MouseEvent) => {
    const cv = ref.current!;
    const r = cv.getBoundingClientRect();
    const v = nhin!;
    return { x: (e.clientX - r.left - r.width / 2) / v.tyLe + v.cx, y: (r.height / 2 - (e.clientY - r.top)) / v.tyLe + v.cy };
  };

  return (
    <div className="ban-do">
      <canvas
        ref={ref}
        onWheel={(e) => {
          if (!nhin) return;
          const d = doiToaDo(e);
          const k = e.deltaY < 0 ? 1.25 : 0.8;
          const tyLe = Math.max(0.05, Math.min(60, nhin.tyLe * k));
          setNhin({ tyLe, cx: d.x - (d.x - nhin.cx) * (nhin.tyLe / tyLe), cy: d.y - (d.y - nhin.cy) * (nhin.tyLe / tyLe) });
        }}
        onMouseDown={(e) => nhin && (keo.current = { x: e.clientX, y: e.clientY, cx: nhin.cx, cy: nhin.cy, di: false })}
        onMouseMove={(e) => {
          if (nhin) {
            const d = doiToaDo(e);
            setToaDo(`X ${d.y.toFixed(2)} · Y ${d.x.toFixed(2)}`);
          }
          const k = keo.current;
          if (!k || !nhin) return;
          const dx = e.clientX - k.x, dy = e.clientY - k.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) k.di = true;
          if (k.di) setNhin({ ...nhin, cx: k.cx - dx / nhin.tyLe, cy: k.cy + dy / nhin.tyLe });
        }}
        onMouseUp={(e) => {
          const k = keo.current;
          keo.current = null;
          if (k?.di || !nhin) return;
          const d = doiToaDo(e);
          const t = p.dl.kq.thua.find((t) => diemTrongThua(d, t.vong));
          if (t && p.bamThua) p.bamThua(t);
          p.setChon(t ?? null);
        }}
        onMouseLeave={() => (keo.current = null)}
      />
      <div className="cong-cu-ban-do">
        <button className="nut" title="Phóng to" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe * 1.4 })}>＋</button>
        <button className="nut" title="Thu nhỏ" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe / 1.4 })}>－</button>
        <button className="nut" title="Toàn bộ" onClick={() => setNhin(null)}>⤢</button>
      </div>
      <div className="lop-ban-do">
        <b>Lớp bản đồ</b>
        {([
          ["ranh", "Ranh GPMB"],
          ["thua", "Thửa đất"],
          ["to", "Tô màu"],
          ["nhan", "Nhãn thửa"],
          ["nen", "Nền địa hình, hạ tầng"],
          ["diaDanh", "Địa danh"],
        ] as const).map(([k, ten]) => (
          <label key={k}><input type="checkbox" checked={lop[k]} onChange={(e) => setLop({ ...lop, [k]: e.target.checked })} /> {ten}</label>
        ))}
        <label className="mo" title="Cần kết nối Internet tới máy chủ bản đồ ngoài — tắt theo yêu cầu không gửi dữ liệu ra ngoài"><input type="checkbox" disabled /> Ảnh vệ tinh (trực tuyến – tắt)</label>
        <Chon value={cheDo} onChange={(e) => setCheDo(e.target.value as typeof cheDo)} className="mt-4">
          <option value="HIEN_TRANG">Tô theo hiện trạng GPMB</option>
          <option value="PHAM_VI">Tô theo phạm vi thu hồi</option>
        </Chon>
      </div>
      <svg className="mui-ten-bac" width={40} height={52} viewBox="0 0 40 52" aria-label="Hướng Bắc">
        <circle cx={20} cy={30} r={17} fill="rgba(255,255,255,0.92)" stroke="#c4ccc8" />
        <path d="M20 14l7 22-7-5-7 5z" fill="#23302b" />
        <text x={20} y={10} textAnchor="middle" fontSize={11} fontWeight={700} fill="#23302b">B</text>
      </svg>
      <div className="chu-giai">
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
      <div className="toa-do">{toaDo || "VN-2000"}</div>
    </div>
  );
}

/* ------------------------- Tạo hồ sơ từ bản đồ ------------------------- */

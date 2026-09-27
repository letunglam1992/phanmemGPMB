import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAU_HINH_MAC_DINH,
  diemTrongThua,
  docDgn,
  giaiMaNhan,
  dungThua,
  tinhDienTichThuHoi,
  type CauHinhLop,
  type DienTichThuHoi,
  type KetQuaDocDgn,
  type KetQuaDungThua,
  type PhanTuChu,
  type ThuaBanDo,
} from "@gpmb/gis";
import { useUngDung } from "../ung-dung";
import { taoId, type DuAn, type Ho } from "../mo-hinh";
import { HopThoai } from "../thanh-phan/chung";
import { hoMoi } from "./DuAn";

interface DuLieuBanDo {
  ban: KetQuaDocDgn;
  kq: KetQuaDungThua;
  pham: { minX: number; minY: number; maxX: number; maxY: number };
}

const boNho = new Map<string, DuLieuBanDo>();

const TEN_CO: Record<string, string> = {
  THIEU_SO_THUA: "Thiếu số thửa",
  NHIEU_SO_THUA: "Nhiều số thửa",
  THIEU_SO_TO: "Thiếu số tờ",
  NHIEU_SO_TO: "Nhiều số tờ",
  THIEU_DIEN_TICH_GHI: "Thiếu nhãn DT",
  LECH_DIEN_TICH: "Lệch DT > 5%",
  THIEU_LOAI_DAT: "Thiếu loại đất",
  NHIEU_CHU: "Nhiều chủ",
  THIEU_CHU: "Thiếu chủ",
};

function phanTich(bytes: Uint8Array, ch: CauHinhLop): DuLieuBanDo {
  const ban = docDgn(bytes);
  const kq = dungThua(ban, ch);
  const pham = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const t of kq.thua)
    for (const d of t.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  for (const v of kq.vungGpmb)
    for (const d of v.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  return { ban, kq, pham };
}

export function BanDo({ duAnId }: { duAnId: string }) {
  const { dsDuAn, kho, luuDuAn, hoCua, di } = useUngDung();
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const [dl, setDl] = useState<DuLieuBanDo | null>(boNho.get(duAnId) ?? null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [chon, setChon] = useState<ThuaBanDo | null>(null);
  const [loc, setLoc] = useState<"TRONG_RANH" | "TAT_CA" | "CO_CO">("TRONG_RANH");
  const [taoHo, setTaoHo] = useState(false);

  useEffect(() => {
    if (dl || !duAn?.banDo) return;
    void kho.docBanDo(duAnId).then((b) => {
      if (!b) return;
      try {
        const d = phanTich(b, CAU_HINH_MAC_DINH);
        boNho.set(duAnId, d);
        setDl(d);
      } catch (e) {
        setLoi((e as Error).message);
      }
    });
  }, [duAnId, duAn?.banDo, dl, kho]);

  const vung = dl?.kq.vungGpmb.find((v) => v.ma === duAn?.banDo?.vungChon) ?? null;
  const thuHoi = useMemo(() => {
    if (!dl || !vung) return new Map<string, DienTichThuHoi>();
    const r = tinhDienTichThuHoi(dl.kq.thua, [vung.vong]);
    return new Map(dl.kq.thua.map((t, i) => [t.ma + "#" + i, r[i]!]));
  }, [dl, vung]);
  const khoaThua = (t: ThuaBanDo) => t.ma + "#" + dl!.kq.thua.indexOf(t);

  const hos = hoCua(duAnId);
  const daLienKet = useMemo(() => {
    const m = new Map<string, Ho>();
    for (const h of hos) for (const t of h.thua) if (t.maBanDo) m.set(t.maBanDo, h);
    return m;
  }, [hos]);

  if (!duAn) return <div className="trang trong">Không tìm thấy dự án.</div>;

  const napTep = async (f: File) => {
    setDangDoc(true);
    setLoi(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const d = phanTich(bytes, CAU_HINH_MAC_DINH);
      await kho.luuBanDo(duAnId, bytes);
      boNho.set(duAnId, d);
      setDl(d);
      await luuDuAn({ ...duAn, banDo: { tenTep: f.name, ngayNhap: new Date().toISOString(), vungChon: null } });
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangDoc(false);
    }
  };

  const dsThua = dl
    ? dl.kq.thua.filter((t) => {
        if (loc === "CO_CO") return t.co.length > 0;
        if (loc === "TRONG_RANH") return !vung || (thuHoi.get(khoaThua(t))?.phamVi ?? "NGOAI") !== "NGOAI";
        return true;
      })
    : [];

  return (
    <div className="trang" style={{ maxWidth: "none" }}>
      <div className="duong-dan">
        <button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / <button onClick={() => di({ ten: "du-an", duAnId })}>{duAn.ten}</button> / Bản đồ
      </div>
      <div className="dong-tieu-de">
        <div>
          <h1>Bản đồ địa chính khu đất thu hồi</h1>
          <div className="mo-ta">
            {duAn.banDo ? `${duAn.banDo.tenTep} · nạp ${new Date(duAn.banDo.ngayNhap).toLocaleDateString("vi-VN")}` : "Chưa nạp bản đồ"} · Tọa độ VN-2000 · Xử lý hoàn toàn trên máy
          </div>
        </div>
        <div className="phai">
          <label className="nut">
            {dangDoc ? "Đang đọc…" : duAn.banDo ? "Nạp tệp khác" : "Nạp tệp DGN"}
            <input type="file" accept=".dgn,.DGN" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && napTep(e.target.files[0])} />
          </label>
          <button className="nut nut-chinh" disabled={!vung} onClick={() => setTaoHo(true)} title={vung ? "" : "Chọn ranh GPMB trước"}>Tạo hồ sơ từ thửa trong ranh</button>
        </div>
      </div>
      {loi && <div className="thong-bao thong-bao-do">{loi}</div>}
      {!dl && !loi && (
        <div className="the the-than" style={{ textAlign: "center", padding: 50 }}>
          <h2>Nạp bản đồ DGN (MicroStation V7)</h2>
          <p className="mo">Phần mềm khép thửa từ đường ranh, đọc nhãn số tờ, số thửa, loại đất, diện tích, chủ sử dụng (phông TCVN3). Kết quả là dữ liệu đề xuất để cán bộ kiểm tra.</p>
          <p className="mo chu-nho">Lớp mặc định: ranh thửa 10 · nhãn thửa 13 · số thửa 4 · số tờ 5 · chủ sử dụng 6 · ranh GPMB 30 (theo tệp mẫu). Tệp DGN V8 cần lưu lại dạng V7.</p>
        </div>
      )}
      {dl && (
        <div className="ban-do-khung">
          <KhungVe dl={dl} vungChon={vung?.ma ?? null} thuHoi={thuHoi} khoaThua={khoaThua} chon={chon} setChon={setChon} daLienKet={daLienKet} />
          <div className="ben-phai">
            <div className="the">
              <div className="the-dau"><h3>Ranh giải phóng mặt bằng</h3></div>
              <div className="the-than" style={{ display: "grid", gap: 6 }}>
                <div className="mo chu-nho">Các vùng khép kín tìm thấy trên lớp ranh GPMB. Phần mềm không tự chọn — cán bộ chọn vùng đúng theo hồ sơ được duyệt.</div>
                {dl.kq.vungGpmb.map((v) => (
                  <label key={v.ma} className="nhom-nut" style={{ alignItems: "center" }}>
                    <input type="radio" name="vung" checked={vung?.ma === v.ma} onChange={() => luuDuAn({ ...duAn, banDo: { ...duAn.banDo!, vungChon: v.ma } })} />
                    <span>
                      <b>{v.dienTich.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m²</b>{" "}
                      <span className="mo chu-nho">· chu vi {v.chuVi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m · {v.nguon === "VUNG_KHEP_KIN" ? "vùng khép kín" : "khép từ đường"}</span>
                    </span>
                  </label>
                ))}
                {dl.kq.vungGpmb.length === 0 && <div className="thong-bao thong-bao-vang">Không có vùng khép kín trên lớp ranh GPMB.</div>}
                {vung && <TomTatThuHoi thuHoi={thuHoi} />}
              </div>
            </div>
            <div className="the" style={{ flex: 1 }}>
              <div className="the-dau">
                <h3>Thửa</h3>
                <span className="mo chu-nho">{dsThua.length}/{dl.kq.thua.length}</span>
                <div className="phai">
                  <select value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)}>
                    <option value="TRONG_RANH">Trong ranh</option>
                    <option value="TAT_CA">Tất cả</option>
                    <option value="CO_CO">Có nghi vấn</option>
                  </select>
                </div>
              </div>
              <div className="bang-cuon">
                <table className="bang">
                  <thead><tr><th>Tờ-thửa</th><th>Loại</th><th className="so">DT ghi</th><th className="so">Thu hồi</th><th>Chủ SD</th></tr></thead>
                  <tbody>
                    {dsThua.slice(0, 800).map((t) => {
                      const th = thuHoi.get(khoaThua(t));
                      return (
                        <tr key={khoaThua(t)} className={`co-the-chon ${chon === t ? "dang-chon" : ""}`} onClick={() => setChon(t)}>
                          <td style={{ whiteSpace: "nowrap" }}>{t.soTo ?? "?"}-{t.soThua ?? "?"}{t.co.length > 0 && <span className="nhan nhan-vang" style={{ marginLeft: 4 }} title={t.co.map((c) => TEN_CO[c]).join(", ")}>!</span>}</td>
                          <td>{t.loaiDatBanDo ?? "—"}</td>
                          <td className="so">{t.dienTichGhi ?? "—"}</td>
                          <td className="so">{th ? (th.phamVi === "NGOAI" ? "—" : th.dienTichThuHoi.toFixed(1)) : ""}</td>
                          <td className="chu-nho">{t.chuSuDung ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {chon && <ChiTietThua t={chon} th={thuHoi.get(khoaThua(chon))} ho={daLienKet.get(chon.ma)} moHo={(h) => di({ ten: "ho", duAnId, hoId: h.id, tab: "thua" })} />}
          </div>
        </div>
      )}
      {dl && dl.ban.canhBao.length > 0 && <div className="mo chu-nho" style={{ marginTop: 8 }}>Ghi chú đọc tệp: {dl.ban.canhBao.join(" ")}</div>}
      {taoHo && dl && vung && (
        <HopTaoHo duAn={duAn} dl={dl} thuHoi={thuHoi} khoaThua={khoaThua} daLienKet={daLienKet} soHo={hos.length} dong={() => setTaoHo(false)} />
      )}
    </div>
  );
}

function TomTatThuHoi({ thuHoi }: { thuHoi: Map<string, DienTichThuHoi> }) {
  const ds = [...thuHoi.values()];
  const dem = (k: string) => ds.filter((x) => x.phamVi === k).length;
  const tong = ds.reduce((s, x) => s + x.dienTichThuHoi, 0);
  return (
    <div className="luoi luoi-3" style={{ marginTop: 6, textAlign: "center" }}>
      <div><div className="chu-nho mo">Toàn bộ</div><b>{dem("TOAN_BO")}</b></div>
      <div><div className="chu-nho mo">Một phần</div><b>{dem("MOT_PHAN")}</b></div>
      <div><div className="chu-nho mo">DT giao (m²)</div><b>{tong.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</b></div>
    </div>
  );
}

function ChiTietThua({ t, th, ho, moHo }: { t: ThuaBanDo; th?: DienTichThuHoi; ho?: Ho; moHo: (h: Ho) => void }) {
  return (
    <div className="the">
      <div className="the-dau"><h3>Tờ {t.soTo ?? "?"}, thửa {t.soThua ?? "?"}</h3></div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
        <div>Chủ sử dụng: <b>{t.chuSuDung ?? "—"}</b> · Loại (bản đồ): <b>{t.loaiDatBanDo ?? "—"}</b></div>
        <div>DT ghi: <b>{t.dienTichGhi ?? "—"}</b> m² · DT hình học: <b>{t.dienTichHinhHoc.toFixed(2)}</b> m²{th && th.phamVi !== "NGOAI" ? <> · Thu hồi: <b>{th.dienTichThuHoi.toFixed(2)}</b> m² ({th.phamVi === "TOAN_BO" ? "toàn bộ" : "một phần"})</> : null}</div>
        {t.co.length > 0 && <div className="nhom-nut">{t.co.map((c) => <span key={c} className="nhan nhan-vang">{TEN_CO[c]}</span>)}</div>}
        <div className="mo">Nhãn trong thửa: {t.nhan.map((n) => `[${n.lop}] ${n.chu}`).join(" · ")}</div>
        {ho && <div>Đã gắn hồ sơ: <button className="nut nut-chu nut-nho" onClick={() => moHo(ho)}>{ho.ma} · {ho.ten}</button></div>}
      </div>
    </div>
  );
}

/* ------------------------- Vẽ bản đồ ------------------------- */

function KhungVe(p: {
  dl: DuLieuBanDo;
  vungChon: string | null;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  chon: ThuaBanDo | null;
  setChon: (t: ThuaBanDo | null) => void;
  daLienKet: Map<string, Ho>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
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
      for (const e of nen) if (e.lop !== 10) duong(e.diem);
      ctx.stroke();
      // thửa
      for (const t of p.dl.kq.thua) {
        const th = p.thuHoi.get(p.khoaThua(t));
        const lk = p.daLienKet.get(t.ma);
        let to: string | null = null;
        if (lk) to = "rgba(31,138,76,0.28)";
        else if (th?.phamVi === "TOAN_BO") to = "rgba(192,57,43,0.20)";
        else if (th?.phamVi === "MOT_PHAN") to = "rgba(230,140,20,0.26)";
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
      for (const vg of p.dl.kq.vungGpmb) {
        const laChon = vg.ma === p.vungChon;
        ctx.beginPath();
        duong(vg.vong[0]!);
        ctx.closePath();
        ctx.setLineDash(laChon ? [] : [6, 4]);
        ctx.lineWidth = laChon ? 2.4 : 1.2;
        ctx.strokeStyle = laChon ? "#c0392b" : "#6a3fb5";
        ctx.stroke();
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
      if (v.tyLe > 1.2) {
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
      for (const c of diaDanh) ctx.fillText(c.chu, sx(c.x), sy(c.y));
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
  }, [nhin, nen, diaDanh, p.dl, p.thuHoi, p.vungChon, p.chon, p.daLienKet, p.khoaThua, pham]);

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
          p.setChon(t ?? null);
        }}
        onMouseLeave={() => (keo.current = null)}
      />
      <div className="cong-cu-ban-do">
        <button className="nut" title="Phóng to" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe * 1.4 })}>＋</button>
        <button className="nut" title="Thu nhỏ" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe / 1.4 })}>－</button>
        <button className="nut" title="Toàn bộ" onClick={() => setNhin(null)}>⤢</button>
      </div>
      <div className="chu-giai">
        <span><i style={{ background: "rgba(192,57,43,0.35)" }} />Thu hồi toàn bộ</span>
        <span><i style={{ background: "rgba(230,140,20,0.4)" }} />Thu hồi một phần</span>
        <span><i style={{ background: "rgba(31,138,76,0.4)" }} />Đã có hồ sơ</span>
        <span><i style={{ background: "#fff", borderColor: "#c0392b", borderWidth: 2 }} />Ranh GPMB đã chọn</span>
        <span><i style={{ background: "#fff", borderColor: "#6a3fb5", borderStyle: "dashed" }} />Ranh ứng viên</span>
      </div>
      <div className="toa-do">{toaDo || "VN-2000"}</div>
    </div>
  );
}

/* ------------------------- Tạo hồ sơ từ bản đồ ------------------------- */

function HopTaoHo(p: {
  duAn: DuAn;
  dl: DuLieuBanDo;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  daLienKet: Map<string, Ho>;
  soHo: number;
  dong: () => void;
}) {
  const { kho, luuDuAn, di } = useUngDung();
  const nhom = useMemo(() => {
    const m = new Map<string, { ten: string; thua: { t: ThuaBanDo; th: DienTichThuHoi }[] }>();
    for (const t of p.dl.kq.thua) {
      const th = p.thuHoi.get(p.khoaThua(t));
      if (!th || th.phamVi === "NGOAI" || p.daLienKet.has(t.ma)) continue;
      const ten = t.chuSuDung ?? `Chưa rõ chủ – tờ ${t.soTo ?? "?"} thửa ${t.soThua ?? "?"}`;
      // Thửa chưa rõ chủ: mỗi thửa một hồ sơ riêng; cùng tên có thể là người khác nhau → cán bộ kiểm tra
      const k = t.chuSuDung ? ten.toLowerCase() : `?${p.khoaThua(t)}`;
      if (!m.has(k)) m.set(k, { ten, thua: [] });
      m.get(k)!.thua.push({ t, th });
    }
    return [...m.values()].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  }, [p]);
  const [dangTao, setDangTao] = useState(false);

  const tao = async () => {
    setDangTao(true);
    let i = p.soHo;
    for (const g of nhom) {
      i++;
      const h = hoMoi(p.duAn.id, `H${String(i).padStart(3, "0")}`, g.ten, /ubnd|cộng đồng|tập thể|công ty|hợp tác/i.test(g.ten) ? "TO_CHUC" : "HO_GIA_DINH");
      h.thua = g.thua.map(({ t, th }) => ({
        id: taoId(),
        soTo: t.soTo ?? "",
        soThua: t.soThua ?? "",
        loaiDat: t.loaiDatBanDo ?? "",
        dienTich: (t.dienTichGhi ?? t.dienTichHinhHoc).toFixed(2).replace(/\.?0+$/, ""),
        dienTichThuHoi: th.phamVi === "TOAN_BO" && t.dienTichGhi ? String(t.dienTichGhi) : th.dienTichThuHoi.toFixed(2),
        nguonGoc: "",
        gia: null,
        maBanDo: t.ma,
        dienTichBanDo: th.dienTichThuHoi,
        ghiChu: t.co.length ? `Nghi vấn khi đọc bản đồ: ${t.co.map((c) => TEN_CO[c]).join(", ")}` : undefined,
      }));
      h.nhatKy = [{ luc: new Date().toISOString(), nguoi: "Cán bộ xã", noiDung: `Tạo từ bản đồ ${p.duAn.banDo?.tenTep ?? ""}: ${h.thua.length} thửa` }];
      await kho.luuHo(h);
    }
    await luuDuAn(p.duAn);
    setDangTao(false);
    p.dong();
    di({ ten: "du-an", duAnId: p.duAn.id });
  };

  const soThua = nhom.reduce((s, g) => s + g.thua.length, 0);
  return (
    <HopThoai
      tieuDe="Tạo hồ sơ từ các thửa trong ranh GPMB"
      dong={p.dong}
      chan={
        <>
          <button className="nut" onClick={p.dong}>Hủy</button>
          <button className="nut nut-chinh" disabled={dangTao || nhom.length === 0} onClick={tao}>{dangTao ? "Đang tạo…" : `Tạo ${nhom.length} hồ sơ (${soThua} thửa)`}</button>
        </>
      }
    >
      <div className="thong-bao thong-bao-xanh">
        Nhóm thửa theo tên chủ sử dụng đọc từ bản đồ (trùng tên có thể là người khác nhau — kiểm tra trước khi tạo). Loại đất giữ nguyên ký hiệu trên bản đồ (vd. "1L", "2L") — cán bộ đổi sang mã loại đất hiện hành và chọn giá đất trong hồ sơ.
        DT thu hồi: thửa nằm trọn trong ranh lấy DT ghi trên bản đồ; thửa một phần lấy DT phần giao (làm tròn 2 số lẻ). Cần đối chiếu với hồ sơ trích đo được duyệt.
      </div>
      <table className="bang">
        <thead><tr><th>Chủ sử dụng (bản đồ)</th><th className="so">Số thửa</th><th>Thửa</th><th className="so">DT thu hồi (m²)</th></tr></thead>
        <tbody>
          {nhom.map((g) => (
            <tr key={g.ten}>
              <td>{g.ten}</td>
              <td className="so">{g.thua.length}</td>
              <td className="chu-nho">{g.thua.map(({ t }) => `${t.soTo ?? "?"}-${t.soThua ?? "?"}`).join(", ")}</td>
              <td className="so">{g.thua.reduce((s, x) => s + x.th.dienTichThuHoi, 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {nhom.length === 0 && <tr><td colSpan={4} className="trong">Mọi thửa trong ranh đã có hồ sơ.</td></tr>}
        </tbody>
      </table>
    </HopThoai>
  );
}

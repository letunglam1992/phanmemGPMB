import { useState } from "react";
import type { DuAn } from "../mo-hinh";
import { O } from "./chung";
import { chuanMa, chuanXa } from "../tong-hop-tinh/lien-xa";
import { docCauHinhCong, dsTuyenTrenCong, LoiCong, type TuyenTrenCong } from "../tong-hop-tinh/cong-tinh";
import { useUngDung } from "../ung-dung";

const KHOA_DS = "gpmb-tuyen-cong-xa";
type DsTinh = { luc: string | null; tuyen: TuyenTrenCong[]; lay: string };
const docDs = (): DsTinh | null => { try { return JSON.parse(localStorage.getItem(KHOA_DS) ?? "null") as DsTinh | null; } catch { return null; } };

/**
 * 1.0.4 — Thông tin dự án → "Dự án liên xã": dự án tuyến qua nhiều xã, phường. Xã điền **mã dự án dùng chung do tỉnh cấp**
 * (tỉnh khai ở Tổng hợp tỉnh → Dự án liên xã) để tỉnh gom các đoạn của các xã thành một dự án; đoạn Km trên địa bàn xã
 * không bắt buộc. Lưu cùng thông tin dự án (nút Lưu).
 */
export function TheLienXa({ d, setD, sua = true }: { d: DuAn; setD: (d: DuAn) => void; sua?: boolean }) {
  const { bao } = useUngDung();
  const lx = d.lienXa;
  // 1.0.5: danh sách dự án liên xã tỉnh đưa lên cổng (xã đã cài mã gửi cổng) — chọn mã thay vì gõ tay
  const cong = docCauHinhCong("XA");
  const [dsTinh, setDsTinh] = useState<DsTinh | null>(docDs);
  const [dang, setDang] = useState(false);
  const layDs = async () => {
    if (!cong) return;
    setDang(true);
    try {
      const r = { ...(await dsTuyenTrenCong(cong)), lay: new Date().toISOString() };
      try { localStorage.setItem(KHOA_DS, JSON.stringify(r)); } catch { /* bỏ qua */ }
      setDsTinh(r);
      bao(r.tuyen.length ? `Đã lấy ${r.tuyen.length} dự án liên xã từ cổng tỉnh` : "Tỉnh chưa đưa dự án liên xã nào lên cổng");
    } catch (e) {
      bao(e instanceof LoiCong && e.ma === 404 ? "Cổng tỉnh chưa có danh sách dự án liên xã (cổng bản cũ) — hỏi cơ quan tổng hợp cấp tỉnh" : `Không lấy được danh sách: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };
  const tuyenChon = lx && dsTinh?.tuyen.find((t) => chuanMa(t.ma) === chuanMa(lx.ma));
  const xaNgoai = tuyenChon && d.xa && !tuyenChon.dsXa.some((x) => chuanXa(x) === chuanXa(d.xa));
  const dat = (p: Partial<NonNullable<DuAn["lienXa"]>>) => setD({ ...d, lienXa: { ma: "", ...lx, ...p } });
  const loiMa = lx && lx.ma.trim() && !/^[A-Z0-9][A-Z0-9._/-]{1,39}$/.test(chuanMa(lx.ma)) ? "Mã chỉ gồm chữ không dấu, số, dấu - . _ /" : null;
  return (
    <div className="the" style={{ gridColumn: "1 / -1" }}>
      <div className="the-dau">
        <h3>Dự án liên xã (tuyến qua nhiều xã, phường)</h3>
        <span className="mo chu-nho">để cấp tỉnh gom các đoạn của các xã thành một dự án</span>
        <label className="phai chu-nho" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" disabled={!sua} checked={!!lx} aria-label="Là dự án liên xã" onChange={(e) => setD(e.target.checked ? { ...d, lienXa: { ma: "" } } : (({ lienXa: _b, ...r }) => r as DuAn)(d))} />
          Là dự án liên xã
        </label>
      </div>
      {lx && (
        <div className="the-than luoi" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)", gap: 10 }}>
          {(cong || dsTinh) && (
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }} data-ds-tinh>
              {dsTinh && dsTinh.tuyen.length > 0 && (
                <select aria-label="Chọn dự án liên xã của tỉnh" disabled={!sua} value={tuyenChon ? tuyenChon.ma : ""} onChange={(e) => { const t = dsTinh.tuyen.find((x) => x.ma === e.target.value); if (t) dat({ ma: t.ma, tenTuyen: t.ten }); }} style={{ minWidth: 320 }}>
                  <option value="">— Chọn dự án liên xã tỉnh đã khai ({dsTinh.tuyen.length}) —</option>
                  {dsTinh.tuyen.map((t) => <option key={t.ma} value={t.ma}>{t.ma} · {t.ten}{d.xa && !t.dsXa.some((x) => chuanXa(x) === chuanXa(d.xa)) ? " (xã không có trong danh sách)" : ""}</option>)}
                </select>
              )}
              {cong && sua && <button className="nut nut-nho" disabled={dang} onClick={() => void layDs()}>{dang ? "Đang lấy…" : dsTinh ? "Lấy lại danh sách từ cổng tỉnh" : "Lấy danh sách dự án liên xã từ cổng tỉnh"}</button>}
              {dsTinh?.lay && <span className="mo chu-nho">lấy lúc {new Date(dsTinh.lay).toLocaleString("vi-VN")}</span>}
            </div>
          )}
          <O nhan="Mã dự án dùng chung (do tỉnh cấp) *" goiY="Lấy đúng mã tỉnh thông báo, vd. LX-2026-001">
            <input aria-label="Mã dự án dùng chung" className={loiMa || !lx.ma.trim() ? "loi-nhap" : ""} disabled={!sua} value={lx.ma} placeholder="LX-2026-001" onChange={(e) => dat({ ma: e.target.value.toUpperCase() })} />
          </O>
          <O nhan="Tên dự án theo tỉnh (toàn tuyến)" goiY="Không bắt buộc — giúp tỉnh đối chiếu">
            <input aria-label="Tên dự án toàn tuyến" disabled={!sua} value={lx.tenTuyen ?? ""} placeholder="vd. Đường nối QL6 – Bản Mòng" onChange={(e) => dat({ tenTuyen: e.target.value || undefined })} />
          </O>
          <O nhan="Đoạn trên địa bàn: từ Km" goiY="Không bắt buộc, vd. Km3+200">
            <input aria-label="Đoạn tuyến từ Km" disabled={!sua} value={lx.kmDau ?? ""} placeholder="Km0+000" onChange={(e) => dat({ kmDau: e.target.value || undefined })} />
          </O>
          <O nhan="đến Km">
            <input aria-label="Đoạn tuyến đến Km" disabled={!sua} value={lx.kmCuoi ?? ""} placeholder="Km3+200" onChange={(e) => dat({ kmCuoi: e.target.value || undefined })} />
          </O>
          {loiMa && <div className="thong-bao thong-bao-do chu-nho" style={{ gridColumn: "1 / -1", margin: 0 }}>{loiMa}</div>}
          {tuyenChon && <div className="mo chu-nho" style={{ gridColumn: "1 / -1" }}>Theo tỉnh: {tuyenChon.ten}{tuyenChon.chuDauTu ? ` · ${tuyenChon.chuDauTu}` : ""} · xã dọc tuyến: {tuyenChon.dsXa.join(", ")}</div>}
          {xaNgoai && <div className="thong-bao thong-bao-vang chu-nho" style={{ gridColumn: "1 / -1", margin: 0 }}>{d.xa} không có trong danh sách xã dọc tuyến tỉnh khai cho mã {tuyenChon!.ma} — kiểm tra lại mã hoặc báo cơ quan tổng hợp cấp tỉnh.</div>}
          {dsTinh && lx.ma.trim() && !loiMa && !tuyenChon && <div className="thong-bao thong-bao-vang chu-nho" style={{ gridColumn: "1 / -1", margin: 0 }}>Mã {chuanMa(lx.ma)} chưa có trong danh sách tỉnh đưa lên cổng — kiểm tra lại (tỉnh sẽ hiện "mã chưa khai").</div>}
          {!lx.ma.trim() && <div className="mo chu-nho" style={{ gridColumn: "1 / -1" }}>Chưa có mã: hỏi cơ quan tổng hợp cấp tỉnh. Khi chưa có mã, tỉnh vẫn nhận số liệu và có thể ghép tay đoạn này vào dự án.</div>}
        </div>
      )}
    </div>
  );
}

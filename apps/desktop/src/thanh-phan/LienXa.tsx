import type { DuAn } from "../mo-hinh";
import { O } from "./chung";
import { chuanMa } from "../tong-hop-tinh/lien-xa";

/**
 * 1.0.4 — Thông tin dự án → "Dự án liên xã": dự án tuyến qua nhiều xã, phường. Xã điền **mã dự án dùng chung do tỉnh cấp**
 * (tỉnh khai ở Tổng hợp tỉnh → Dự án liên xã) để tỉnh gom các đoạn của các xã thành một dự án; đoạn Km trên địa bàn xã
 * không bắt buộc. Lưu cùng thông tin dự án (nút Lưu).
 */
export function TheLienXa({ d, setD, sua = true }: { d: DuAn; setD: (d: DuAn) => void; sua?: boolean }) {
  const lx = d.lienXa;
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
          {!lx.ma.trim() && <div className="mo chu-nho" style={{ gridColumn: "1 / -1" }}>Chưa có mã: hỏi cơ quan tổng hợp cấp tỉnh. Khi chưa có mã, tỉnh vẫn nhận số liệu và có thể ghép tay đoạn này vào dự án.</div>}
        </div>
      )}
    </div>
  );
}

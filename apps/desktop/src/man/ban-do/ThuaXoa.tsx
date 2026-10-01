import { useState } from "react";
import type { ThuaXoa } from "../../mo-hinh";

/** Thửa đã xóa khỏi bản đồ (tệp DGN giữ nguyên): xem lý do, người, ngày; khôi phục từng thửa hoặc tất cả. */
export function TheThuaXoa(p: { ds: ThuaXoa[]; sua: boolean; khoiPhuc: (id: string | null) => void }) {
  const [mo, setMo] = useState(false);
  return (
    <div className="the co-dinh" aria-label="Thửa đã xóa khỏi bản đồ">
      <div className="the-dau">
        <h3>Thửa đã xóa khỏi bản đồ ({p.ds.length})</h3>
        <div className="phai"><button className="nut nut-chu nut-nho" aria-expanded={mo} onClick={() => setMo(!mo)}>{mo ? "Thu gọn" : "Xem"}</button></div>
      </div>
      {mo && (
        <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
          <div className="mo">Chỉ bỏ khỏi bản đồ của phần mềm (thửa dựng sai, trùng, ngoài phạm vi…); tệp DGN không đổi.</div>
          {p.ds.map((x) => (
            <div key={x.ma + x.ngay} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ flex: 1 }}>
                <b>Tờ {x.soTo ?? "?"}, thửa {x.soThua ?? "?"}</b> · {x.dienTich.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} m² · {new Date(x.ngay).toLocaleDateString("vi-VN")}{x.nguoi ? ` · ${x.nguoi}` : ""}
                {x.lyDo && <div className="mo">Lý do: {x.lyDo}</div>}
              </span>
              {p.sua && <button className="nut nut-chu nut-nho" aria-label={`Khôi phục thửa ${x.soThua ?? "?"} tờ ${x.soTo ?? "?"}`} onClick={() => p.khoiPhuc(x.ma + x.ngay)}>Khôi phục</button>}
            </div>
          ))}
          {p.sua && p.ds.length > 1 && <button className="nut nut-nho" onClick={() => p.khoiPhuc(null)}>Khôi phục tất cả</button>}
        </div>
      )}
    </div>
  );
}

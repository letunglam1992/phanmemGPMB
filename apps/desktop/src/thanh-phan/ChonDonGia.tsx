import { useMemo, useState } from "react";
import { DON_GIA, type DongDonGia } from "../du-lieu";
import { HopThoai } from "./chung";

export function ChonDonGia(p: { nguon: DongDonGia["nguon"][]; dong: () => void; chon: (d: DongDonGia) => void; tieuDe: string }) {
  const [nguon, setNguon] = useState(p.nguon[0]!);
  const [q, setQ] = useState("");
  const ds = useMemo(() => {
    const tu = q.toLowerCase().split(/\s+/).filter(Boolean);
    return DON_GIA.filter((r) => r.nguon === nguon && tu.every((t) => `${r.ma} ${r.nhom} ${r.ten}`.toLowerCase().includes(t)));
  }, [nguon, q]);
  return (
    <HopThoai tieuDe={p.tieuDe} dong={p.dong} rong={1100}>
      <div className="nhom-nut" style={{ marginBottom: 10 }}>
        {p.nguon.length > 1 && p.nguon.map((n) => <button key={n} className={`nut nut-nho ${n === nguon ? "nut-chinh" : ""}`} onClick={() => setNguon(n)}>{n}</button>)}
        <input autoFocus placeholder="Tìm: tên, nhóm, mã… (nhiều từ)" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <span className="mo chu-nho" style={{ alignSelf: "center" }}>{ds.length} dòng</span>
      </div>
      <div className="bang-cuon" style={{ maxHeight: "58vh" }}>
        <table className="bang">
          <thead><tr><th>Mã nguồn</th><th>Hạng mục</th><th>ĐVT</th><th className="so">Đơn giá (đ)</th><th className="so">Mật độ</th><th>Trang</th></tr></thead>
          <tbody>
            {ds.slice(0, 400).map((r) => (
              <tr key={r.ma + r.ten} className="co-the-chon" onClick={() => p.chon(r)}>
                <td className="chu-nho" style={{ whiteSpace: "nowrap" }}>{r.ma}</td>
                <td>{r.ten}<div className="can-cu">{r.nhom}</div></td>
                <td>{r.donVi}</td>
                <td className="so">{r.donGia.toLocaleString("vi-VN")}</td>
                <td className="so">{r.matDo ?? ""}</td>
                <td>{r.trang}</td>
              </tr>
            ))}
            {ds.length > 400 && <tr><td colSpan={6} className="trong">Còn {ds.length - 400} dòng — thu hẹp từ khóa tìm kiếm.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

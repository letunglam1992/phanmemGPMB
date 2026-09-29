import { useState } from "react";
import { taoId } from "../../mo-hinh";
import { BieuTuong } from "../../thanh-phan/BieuDo";
import { Chon } from "../../thanh-phan/Chon";
import type { Tab } from "./kieu";

export type CotNk = "tt" | "hoTen" | "namSinh" | "quanHe" | "ghiChu";

export function TabNhanKhau({ h, doi }: Tab) {
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState("");
  const [sx, setSx] = useState<{ cot: CotNk; tang: boolean }>({ cot: "tt", tang: true });
  const sua = (id: string, k: string, v: string) => doi({ ...h, nhanKhau: h.nhanKhau.map((n) => (n.id === id ? { ...n, [k]: v } : n)) });
  const them = () => doi({ ...h, nhanKhau: [...h.nhanKhau, { id: taoId(), hoTen: "", quanHe: h.nhanKhau.length ? "" : "Chủ hộ" }] });
  const dsQuanHe = [...new Set(h.nhanKhau.map((n) => n.quanHe.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const chuan = (x: string) => x.toLocaleLowerCase("vi");
  const ds = h.nhanKhau
    .map((n, i) => ({ n, tt: i + 1 }))
    .filter(({ n }) => !loc || n.quanHe.trim() === loc)
    .filter(({ n }) => !tim || chuan(`${n.hoTen} ${n.namSinh ?? ""} ${n.quanHe} ${n.ghiChu ?? ""}`).includes(chuan(tim)))
    .sort((a, b) => {
      const g = (x: typeof a) => (sx.cot === "tt" ? x.tt : String((x.n as unknown as Record<string, unknown>)[sx.cot] ?? ""));
      const va = g(a), vb = g(b);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "vi", { numeric: true });
      return sx.tang ? c : -c;
    });
  const tieuDe = (cot: CotNk, ten: string, rong?: number) => (
    <th style={rong ? { width: rong } : undefined} aria-sort={sx.cot === cot ? (sx.tang ? "ascending" : "descending") : "none"}>
      <button className="th-sx" onClick={() => setSx({ cot, tang: sx.cot === cot ? !sx.tang : true })}>
        {ten}<span className={sx.cot === cot ? "dang" : ""}><BieuTuong ten="sapXep" co={14} /></span>
      </button>
    </th>
  );
  return (
    <div className="the">
      <div className="nk-dau">
        <div>
          <h2>Nhân khẩu</h2>
          <div className="mo">Dùng tính hỗ trợ ổn định đời sống, tạm cư</div>
        </div>
        <button className="nut nut-chinh nut-lon" onClick={them}><BieuTuong ten="cong" co={17} /> Thêm nhân khẩu</button>
      </div>
      <div className="nk-loc">
        <label className="o-tim">
          <BieuTuong ten="traCuu" co={17} />
          <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm kiếm theo họ tên, năm sinh, quan hệ…" aria-label="Tìm nhân khẩu" />
        </label>
        <label className="o-loc">
          <BieuTuong ten="loc" co={16} />
          <Chon value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Lọc theo quan hệ với chủ hộ">
            <option value="">Tất cả</option>
            {dsQuanHe.map((q) => <option key={q} value={q}>{q}</option>)}
          </Chon>
        </label>
      </div>
      <div className="nk-bang">
        <table className="bang">
          <thead>
            <tr>
              {tieuDe("tt", "TT", 70)}
              {tieuDe("hoTen", "Họ tên")}
              {tieuDe("namSinh", "Năm sinh", 130)}
              {tieuDe("quanHe", "Quan hệ với chủ hộ", 200)}
              {tieuDe("ghiChu", "Ghi chú")}
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {ds.map(({ n, tt }) => (
              <tr key={n.id}>
                <td>{tt}</td>
                <td><input value={n.hoTen} onChange={(e) => sua(n.id, "hoTen", e.target.value)} aria-label={`Họ tên nhân khẩu ${tt}`} /></td>
                <td><input value={n.namSinh ?? ""} inputMode="numeric" onChange={(e) => sua(n.id, "namSinh", e.target.value)} aria-label={`Năm sinh nhân khẩu ${tt}`} /></td>
                <td><input value={n.quanHe} list="ds-quan-he" onChange={(e) => sua(n.id, "quanHe", e.target.value)} aria-label={`Quan hệ nhân khẩu ${tt}`} /></td>
                <td><input value={n.ghiChu ?? ""} onChange={(e) => sua(n.id, "ghiChu", e.target.value)} aria-label={`Ghi chú nhân khẩu ${tt}`} /></td>
                <td><button className="nut nut-chu nut-nguy nut-nho" aria-label={`Xóa nhân khẩu ${tt}`} onClick={() => doi({ ...h, nhanKhau: h.nhanKhau.filter((x) => x.id !== n.id) })}><BieuTuong ten="thungRac" co={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="ds-quan-he">{["Chủ hộ", "Vợ", "Chồng", "Con", "Bố", "Mẹ", "Cháu", "Anh", "Chị", "Em"].map((q) => <option key={q} value={q} />)}</datalist>
        {h.nhanKhau.length === 0 && (
          <div className="trang-trong">
            <div className="trang-trong-hinh" aria-hidden>
              <span className="giay" />
              <span className="huy-hieu"><BieuTuong ten="nguoi" co={24} /></span>
            </div>
            <b>Chưa có nhân khẩu</b>
            <p>Chưa có nhân khẩu nào trong hồ sơ này.<br />Vui lòng thêm nhân khẩu để tính hỗ trợ ổn định đời sống, tạm cư.</p>
            <button className="nut nut-vien" onClick={them}><BieuTuong ten="cong" co={17} /> Thêm nhân khẩu</button>
          </div>
        )}
        {h.nhanKhau.length > 0 && ds.length === 0 && <div className="trong">Không có nhân khẩu khớp điều kiện tìm.</div>}
      </div>
    </div>
  );
}

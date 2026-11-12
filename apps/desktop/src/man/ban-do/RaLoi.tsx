/**
 * 1.3.6 (BĐ-7) — Rà lỗi nhận diện bản đồ: gom thửa theo cờ (thiếu số thửa, nhiều chủ, loại đất lạ…), đầu mút treo của ranh thửa;
 * bấm từng mục để phóng tới trên bản đồ. Lọc "chỉ thửa trong phạm vi thu hồi" để chỉ rà phần cần lập hồ sơ.
 */
import { useState } from "react";
import type { Diem, DienTichThuHoi, ThuaBanDo } from "@gpmb/gis";
import { type DuLieuBanDo, TEN_CO } from "./du-lieu";

const GIOI_HAN = 60;

export function RaLoiNhanDien(p: {
  dl: DuLieuBanDo;
  /** null = chưa có phạm vi thu hồi */
  thuHoi: Map<string, DienTichThuHoi> | null;
  khoaThua: (t: ThuaBanDo) => string;
  xemThua: (t: ThuaBanDo) => void;
  xemDiem: (d: Diem) => void;
  moNhanDien?: () => void;
}) {
  const [mo, setMo] = useState<string | null>(null);
  const [trongPhamVi, setTrongPhamVi] = useState(true);
  const loc = (t: ThuaBanDo) => !p.thuHoi || !trongPhamVi || (p.thuHoi.get(p.khoaThua(t))?.phamVi ?? "NGOAI") !== "NGOAI";
  const ds = p.dl.kq.thua.filter(loc);
  const nhom = Object.keys(TEN_CO)
    .map((c) => ({ c, ds: ds.filter((t) => t.co.includes(c as never)) }))
    .filter((x) => x.ds.length);
  const treo = p.dl.kq.dauTreo ?? [];
  const tong = nhom.reduce((a, x) => a + x.ds.length, 0) + treo.length;
  return (
    <div className="the co-dinh" data-ra-loi>
      <div className="the-dau">
        <h3>Rà lỗi nhận diện</h3>
        <span className={`nhan ${tong ? "nhan-vang" : "nhan-xanh"}`}>{tong ? `${tong} mục cần xem` : "Không có cờ"}</span>
        {p.moNhanDien && <div className="phai"><button className="nut nut-chu nut-nho" onClick={p.moNhanDien}>Trình nhập bản đồ</button></div>}
      </div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
        {p.thuHoi && (
          <label className="nhom-nut giua-doc">
            <input type="checkbox" checked={trongPhamVi} onChange={(e) => setTrongPhamVi(e.target.checked)} /> Chỉ thửa trong phạm vi thu hồi ({ds.length} thửa)
          </label>
        )}
        {nhom.map(({ c, ds: x }) => (
          <div key={c}>
            <button className="nut-lien-ket" aria-expanded={mo === c} onClick={() => setMo(mo === c ? null : c)}>
              {mo === c ? "▾" : "▸"} {TEN_CO[c]} — <b>{x.length}</b> thửa
            </button>
            {mo === c && (
              <div className="nhom-nut" style={{ flexWrap: "wrap", margin: "4px 0 6px 14px" }}>
                {x.slice(0, GIOI_HAN).map((t) => (
                  <button key={p.khoaThua(t)} className="nut nut-nho" title={`${t.chuSuDung ?? "chưa rõ chủ"} · ${t.dienTichHinhHoc.toFixed(1)} m²`} onClick={() => p.xemThua(t)}>
                    {t.soTo ?? "?"}/{t.soThua ?? "?"}
                  </button>
                ))}
                {x.length > GIOI_HAN && <span className="mo">… và {x.length - GIOI_HAN} thửa khác (lọc “Thửa có cờ” ở bảng thửa)</span>}
              </div>
            )}
          </div>
        ))}
        {treo.length > 0 && (
          <div>
            <button className="nut-lien-ket" aria-expanded={mo === "TREO"} onClick={() => setMo(mo === "TREO" ? null : "TREO")}>
              {mo === "TREO" ? "▾" : "▸"} Chỗ hở trên ranh thửa (vòng đỏ) — <b>{treo.length}</b>
            </button>
            {mo === "TREO" && (
              <div style={{ margin: "4px 0 6px 14px" }}>
                <div className="mo">Đầu mút suýt chạm đường khác (≤ 0,5 m): thửa có thể không khép. Nếu đúng là hở do vẽ, đặt “Nối đầu mút hở” ở Cấu hình lớp.</div>
                <div className="nhom-nut" style={{ flexWrap: "wrap" }}>
                  {treo.slice(0, GIOI_HAN).map((d, i) => <button key={i} className="nut nut-nho" onClick={() => p.xemDiem(d)}>Điểm {i + 1}</button>)}
                </div>
              </div>
            )}
          </div>
        )}
        {p.dl.kq.nhanNgoaiThua.length > 0 && <div className="mo">{p.dl.kq.nhanNgoaiThua.length} dòng chữ nhãn nằm ngoài mọi thửa (không gán — thường là nhãn bản đồ khác, chú giải).</div>}
      </div>
    </div>
  );
}

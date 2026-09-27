import { Fragment, useState } from "react";
import { D } from "@gpmb/core";
import { taoId, type DuAn, type Ho, type Thua } from "../../mo-hinh";
import { ChonGiaDat } from "../../thanh-phan/ChonGiaDat";
import { tien } from "../../thanh-phan/chung";

export const LOAI_DAT = ["LUC", "LUK", "LUN", "HNK", "BHK", "NHK", "CLN", "RSX", "RPH", "NTS", "ONT", "ODT", "TMD", "SKC", "SKK", "SKN", "DGT", "NTD", "CSD", "KHAC"];

export function TabThua({ h, duAn, doi }: { h: Ho; duAn: DuAn; doi: (h: Ho) => void }) {
  const [chonGia, setChonGia] = useState<string | null>(null);
  const [moRong, setMoRong] = useState<string | null>(null);
  const sua = (id: string, p: Partial<Thua>) => doi({ ...h, thua: h.thua.map((t) => (t.id === id ? { ...t, ...p } : t)) });
  const them = () =>
    doi({ ...h, thua: [...h.thua, { id: taoId(), soTo: "", soThua: "", loaiDat: "CLN", dienTich: "", dienTichThuHoi: "", nguonGoc: "", gia: null }] });
  const thuaChon = h.thua.find((t) => t.id === chonGia);
  return (
    <div className="the">
      <div className="the-dau">
        <h2>Thửa đất bị thu hồi</h2>
        <span className="mo chu-nho">Diện tích làm tròn 2 chữ số thập phân khi tính (QD-03)</span>
        <div className="phai"><button className="nut nut-nho" onClick={them}>+ Thêm thửa</button></div>
      </div>
      <div className="bang-cuon">
        <table className="bang">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Tờ</th><th style={{ width: 80 }}>Thửa</th><th style={{ width: 100 }}>Loại đất</th>
              <th className="so" style={{ width: 120 }}>DT thửa (m²)</th><th className="so" style={{ width: 120 }}>DT thu hồi (m²)</th>
              <th>Nguồn gốc sử dụng</th><th>Giá đất (bảng giá)</th><th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {h.thua.map((t) => {
              const loiDt = t.dienTich && t.dienTichThuHoi && !isNaN(Number(t.dienTich)) && D(t.dienTichThuHoi || 0).gt(t.dienTich);
              const lechBanDo = t.dienTichBanDo !== undefined && t.dienTichThuHoi && Math.abs(Number(t.dienTichThuHoi) - t.dienTichBanDo) > 0.05;
              return (
                <Fragment key={t.id}>
                  <tr>
                    <td><input value={t.soTo} onChange={(e) => sua(t.id, { soTo: e.target.value })} /></td>
                    <td><input value={t.soThua} onChange={(e) => sua(t.id, { soThua: e.target.value })} /></td>
                    <td>
                      <select value={t.loaiDat} onChange={(e) => sua(t.id, { loaiDat: e.target.value, gia: null })}>
                        {!LOAI_DAT.includes(t.loaiDat) && <option>{t.loaiDat}</option>}
                        {LOAI_DAT.map((l) => <option key={l}>{l}</option>)}
                      </select>
                    </td>
                    <td><input className="o-so" value={t.dienTich} onChange={(e) => sua(t.id, { dienTich: e.target.value })} /></td>
                    <td>
                      <input className={`o-so ${loiDt ? "loi-nhap" : ""}`} value={t.dienTichThuHoi} onChange={(e) => sua(t.id, { dienTichThuHoi: e.target.value })} />
                      {t.dienTichBanDo !== undefined && <div className={`chu-nho ${lechBanDo ? "" : "mo"}`} style={lechBanDo ? { color: "var(--vang)" } : undefined}>Bản đồ: {t.dienTichBanDo.toFixed(2)}</div>}
                    </td>
                    <td><input value={t.nguonGoc} onChange={(e) => sua(t.id, { nguonGoc: e.target.value })} /></td>
                    <td>
                      {t.gia ? (
                        <div><b>{tien(D(t.gia.giaNghinDong).mul(1000))} đ/m²</b> <button className="nut nut-chu nut-nho" onClick={() => setChonGia(t.id)}>Đổi</button><div className="can-cu">{t.gia.nguon}</div></div>
                      ) : (
                        <button className="nut nut-nho" style={{ borderColor: "var(--do)", color: "var(--do)" }} onClick={() => setChonGia(t.id)}>Chọn giá đất…</button>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="nut nut-chu nut-nho" title="Tùy chọn cây trồng xen" onClick={() => setMoRong(moRong === t.id ? null : t.id)}>⋯</button>
                      <button className="nut nut-chu nut-nguy nut-nho" onClick={() => { if (h.taiSan.some((x) => x.thuaId === t.id) && !confirm("Thửa có tài sản kiểm đếm. Xóa cả tài sản?")) return; doi({ ...h, thua: h.thua.filter((x) => x.id !== t.id), taiSan: h.taiSan.filter((x) => x.thuaId !== t.id) }); }}>✕</button>
                    </td>
                  </tr>
                  {moRong === t.id && (
                    <tr>
                      <td colSpan={8} style={{ background: "var(--be-mat-2)" }}>
                        <div className="luoi" style={{ gridTemplateColumns: "200px 1fr 260px", alignItems: "end" }}>
                          <div className="o-nhap"><label>DT công trình trừ khỏi quỹ mật độ (m²)</label><input className="o-so" value={t.cayXen?.dienTichTru ?? ""} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: e.target.value, lyDoTru: t.cayXen?.lyDoTru ?? "", cachXep: t.cayXen?.cachXep ?? "DUNG_KHI_VUOT" } })} /></div>
                          <div className="o-nhap"><label>Lý do trừ (bắt buộc khi &gt; 0 — VM-34)</label><input value={t.cayXen?.lyDoTru ?? ""} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: t.cayXen?.dienTichTru ?? "", lyDoTru: e.target.value, cachXep: t.cayXen?.cachXep ?? "DUNG_KHI_VUOT" } })} /></div>
                          <div className="o-nhap"><label>Cách xếp khi vượt quỹ</label>
                            <select value={t.cayXen?.cachXep ?? "DUNG_KHI_VUOT"} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: t.cayXen?.dienTichTru ?? "", lyDoTru: t.cayXen?.lyDoTru ?? "", cachXep: e.target.value as "DUNG_KHI_VUOT" | "LAP_DAY" } })}>
                              <option value="DUNG_KHI_VUOT">Dừng khi vượt (theo biểu mẫu)</option>
                              <option value="LAP_DAY">Lấp đầy phần quỹ còn dư</option>
                            </select>
                          </div>
                        </div>
                        <div className="mo chu-nho" style={{ marginTop: 6 }}>Thứ tự tính cây = thứ tự dòng ở thẻ Kiểm đếm (chủ sở hữu lựa chọn, k4 Đ5 PL VIII QĐ 106/2025).</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {h.thua.length === 0 && <tr><td colSpan={8} className="trong">Chưa có thửa. Thêm thửa hoặc tạo từ bản đồ.</td></tr>}
          </tbody>
        </table>
      </div>
      {thuaChon && (
        <ChonGiaDat xa={duAn.xa} loaiDat={thuaChon.loaiDat} dong={() => setChonGia(null)} chon={(g) => { sua(thuaChon.id, { gia: g }); setChonGia(null); }} />
      )}
    </div>
  );
}

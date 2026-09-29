import { Fragment, useState } from "react";
import { taoId, type DuAn, type Ho, type Thua } from "../../mo-hinh";
import { ChonGiaDat } from "../../thanh-phan/ChonGiaDat";
import { tien } from "../../thanh-phan/chung";
import { PhanLop } from "./PhanLop";
import { laDatNN } from "../../tinh-ho";
import { useUngDung } from "../../ung-dung";
import { Chon } from "../../thanh-phan/Chon";
import { soD } from "../../so";
import { OSo } from "../../thanh-phan/OSo";
import { NHOM_PHAP_LY, THU_TU_PHAP_LY, goiYPhapLy, type NhomPhapLy } from "../../nguon-goc";

export const LOAI_DAT = ["LUC", "LUK", "LUN", "HNK", "BHK", "NHK", "CLN", "RSX", "RPH", "NTS", "ONT", "ODT", "TMD", "SKC", "SKK", "SKN", "DGT", "NTD", "CSD", "KHAC"];

export function TabThua({ h, duAn, doi }: { h: Ho; duAn: DuAn; doi: (h: Ho) => void }) {
  const [chonGia, setChonGia] = useState<string | null>(null);
  const [moRong, setMoRong] = useState<string | null>(null);
  const [chonTuyen, setChonTuyen] = useState<string | null>(null);
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn);
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
              const loiDt = t.dienTich && t.dienTichThuHoi && !isNaN(Number(t.dienTich)) && soD(t.dienTichThuHoi).gt(soD(t.dienTich));
              const lechBanDo = t.dienTichBanDo !== undefined && t.dienTichThuHoi && Math.abs(Number(t.dienTichThuHoi) - t.dienTichBanDo) > 0.05;
              return (
                <Fragment key={t.id}>
                  <tr>
                    <td data-lich-su={`thua:${t.id}.soTo`} data-lich-su-ten={`Tờ bản đồ (thửa ${t.soThua})`}><input value={t.soTo} onChange={(e) => sua(t.id, { soTo: e.target.value })} /></td>
                    <td data-lich-su={`thua:${t.id}.soThua`} data-lich-su-ten={`Số thửa (tờ ${t.soTo})`}><input value={t.soThua} onChange={(e) => sua(t.id, { soThua: e.target.value })} /></td>
                    <td data-lich-su={`thua:${t.id}.loaiDat`} data-lich-su-ten={`Loại đất thửa ${t.soThua} tờ ${t.soTo}`}>
                      <Chon value={t.loaiDat} onChange={(e) => sua(t.id, { loaiDat: e.target.value, gia: null })}>
                        {!LOAI_DAT.includes(t.loaiDat) && <option>{t.loaiDat}</option>}
                        {LOAI_DAT.map((l) => <option key={l}>{l}</option>)}
                      </Chon>
                    </td>
                    <td data-lich-su={`thua:${t.id}.dienTich`} data-lich-su-ten={`DT thửa ${t.soThua} tờ ${t.soTo}`}><OSo className="o-so" value={t.dienTich} onChange={(v) => sua(t.id, { dienTich: v })} /></td>
                    <td data-lich-su={`thua:${t.id}.dienTichThuHoi`} data-lich-su-ten={`DT thu hồi thửa ${t.soThua} tờ ${t.soTo}`}>
                      <OSo className={`o-so ${loiDt ? "loi-nhap" : ""}`} value={t.dienTichThuHoi} onChange={(v) => sua(t.id, { dienTichThuHoi: v })} />
                      {t.dienTichBanDo !== undefined && <div className={`chu-nho ${lechBanDo ? "" : "mo"}`} style={lechBanDo ? { color: "var(--vang)" } : undefined}>Bản đồ: {t.dienTichBanDo.toFixed(2)}</div>}
                    </td>
                    <td>
                      {/* P2-5: tình trạng pháp lý (danh mục) + diễn giải nguồn gốc (chữ) */}
                      <select value={t.phapLy ?? ""} aria-label="Tình trạng pháp lý nguồn gốc" title="Tình trạng pháp lý nguồn gốc đất — để lọc, thống kê; điều kiện bồi thường do cán bộ xác định (Điều 95 LĐĐ 2024)" className={t.phapLy ? "" : "nhac-nhap"} onChange={(e) => sua(t.id, { phapLy: (e.target.value || undefined) as NhomPhapLy | undefined })} style={{ marginBottom: 4 }}>
                        <option value="">— Pháp lý{goiYPhapLy(t) ? ` (gợi ý: ${NHOM_PHAP_LY[goiYPhapLy(t)!].ngan})` : ""} —</option>
                        {THU_TU_PHAP_LY.map((k) => <option key={k} value={k}>{NHOM_PHAP_LY[k].ngan}</option>)}
                      </select>
                      <input value={t.nguonGoc} placeholder="Diễn giải nguồn gốc" onChange={(e) => sua(t.id, { nguonGoc: e.target.value })} />
                    </td>
                    <td>
                      {t.phanLop?.lop.length ? (
                        <div><b>Phân lớp · {t.phanLop.lop.length} lớp</b> <button className="nut nut-chu nut-nho" onClick={() => setMoRong(t.id)}>Sửa</button><div className="can-cu">Bảng {t.phanLop.tuyen.bang}, STT {t.phanLop.tuyen.stt}: {t.phanLop.tuyen.tuyen}</div></div>
                      ) : t.gia ? (
                        <div><b>{tien(soD(t.gia.giaNghinDong).mul(1000))} đ/m²</b> <button className="nut nut-chu nut-nho" onClick={() => setChonGia(t.id)}>Đổi</button><div className="can-cu">{t.gia.nguon}</div></div>
                      ) : (
                        <button className="nut nut-nho" style={{ borderColor: "var(--do)", color: "var(--do)" }} onClick={() => setChonGia(t.id)}>Chọn giá đất…</button>
                      )}
                    </td>
                    <td className="khong-xuong-dong">
                      <button className="nut nut-chu nut-nho" title="Giấy chứng nhận, phân lớp đất, tùy chọn cây trồng xen" onClick={() => setMoRong(moRong === t.id ? null : t.id)}>⋯</button>
                      <button className="nut nut-chu nut-nguy nut-nho" onClick={() => { if (h.taiSan.some((x) => x.thuaId === t.id) && !confirm("Thửa có tài sản kiểm đếm. Xóa cả tài sản?")) return; doi({ ...h, thua: h.thua.filter((x) => x.id !== t.id), taiSan: h.taiSan.filter((x) => x.thuaId !== t.id) }); }}>✕</button>
                    </td>
                  </tr>
                  {moRong === t.id && (
                    <tr>
                      <td colSpan={8} style={{ background: "var(--be-mat-2)" }}>
                        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--vien)" }}>
                          <div className="nhom-nut" style={{ alignItems: "center", marginBottom: 6 }}>
                            <b className="chu-nho">Giấy chứng nhận, danh sách thu hồi</b>
                            <label className="chu-nho"><input type="checkbox" checked={!!t.khongBoiThuong} onChange={(e) => sua(t.id, { khongBoiThuong: e.target.checked })} /> Diện tích thu hồi <b>không được bồi thường, hỗ trợ</b> về đất</label>
                            <span className="mo chu-nho">(dùng cho diễn giải diện tích trong tờ trình, quyết định thu hồi)</span>
                          </div>
                          <div className="luoi" style={{ gridTemplateColumns: "150px 90px 90px 130px 110px 150px 130px 1fr" }}>
                            {([
                              ["seri", "Số sêri GCN"], ["soTo", "Tờ (GCN)"], ["soThua", "Thửa (GCN)"], ["dienTich", "DT thửa GCN (m²)"], ["loaiDat", "Loại đất GCN"], ["dtThuHoiCoGcn", "DT thu hồi có GCN"], ["loaiDatThuHoi", "Loại đất thu hồi"],
                            ] as const).map(([k, nhan]) => (
                              <div key={k} className="o-nhap"><label>{nhan}</label>
                                {k === "dienTich" || k === "dtThuHoiCoGcn" ? (
                                  <OSo value={t.gcn?.[k] ?? ""} onChange={(v) => sua(t.id, { gcn: { seri: "", soTo: "", soThua: "", dienTich: "", loaiDat: "", dtThuHoiCoGcn: "", loaiDatThuHoi: "", ...t.gcn, [k]: v } })} />
                                ) : (
                                  <input value={t.gcn?.[k] ?? ""} onChange={(e) => sua(t.id, { gcn: { seri: "", soTo: "", soThua: "", dienTich: "", loaiDat: "", dtThuHoiCoGcn: "", loaiDatThuHoi: "", ...t.gcn, [k]: e.target.value } })} />
                                )}
                              </div>
                            ))}
                            <div className="o-nhap"><label>Ghi chú (danh sách)</label><input value={t.ghiChu ?? ""} onChange={(e) => sua(t.id, { ghiChu: e.target.value })} /></div>
                          </div>
                          <div className="mo chu-nho mt-4">DT không có trong GCN = DT thu hồi − DT thu hồi có GCN (tự tính).</div>
                        </div>
                        {cs.nongLamTruong && (
                          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--vien)" }}>
                            <div className="luoi" style={{ gridTemplateColumns: "minmax(260px, 1.2fr) 1fr", alignItems: "end" }}>
                              <div className="o-nhap"><label>Đất nguồn gốc nông, lâm trường (B13 — k9 Đ6 QĐ 14/2026)</label>
                                <Chon value={t.nongLamTruong?.truongHop ?? ""} onChange={(e) => sua(t.id, { nongLamTruong: e.target.value ? { truongHop: e.target.value as NonNullable<typeof t.nongLamTruong>["truongHop"], hoSo: t.nongLamTruong?.hoSo ?? "" } : undefined })}>
                                  <option value="">Không (tính bồi thường như thường)</option>
                                  {Object.entries(cs.nongLamTruong.truongHop).map(([ma, th]) => <option key={ma} value={ma}>{ma} — {th.ten}</option>)}
                                </Chon>
                              </div>
                              <div className="o-nhap"><label>Hồ sơ xác nhận nguồn gốc (bắt buộc)</label>
                                <input disabled={!t.nongLamTruong} placeholder="Hợp đồng giao khoán, xác nhận của công ty, QĐ thu hồi của UBND tỉnh…" value={t.nongLamTruong?.hoSo ?? ""} onChange={(e) => sua(t.id, { nongLamTruong: { truongHop: t.nongLamTruong!.truongHop, hoSo: e.target.value } })} />
                              </div>
                            </div>
                            {t.nongLamTruong && <div className="mo chu-nho mt-4">{cs.nongLamTruong.truongHop[t.nongLamTruong.truongHop].tenKhoanDat}; {cs.nongLamTruong.truongHop[t.nongLamTruong.truongHop].cayTrong === "HO_TRO_100" ? "cây trồng hỗ trợ 100% đơn giá bồi thường" : "cây trồng tính như bồi thường (văn bản không quy định riêng)"}; hỗ trợ ổn định đời sống, chuyển đổi nghề nhập ở thẻ Hỗ trợ. Phần mềm không tự xác định trường hợp.</div>}
                          </div>
                        )}
                        {(t.phanLop || !laDatNN(t.loaiDat)) && (
                          <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--vien)" }}>
                            <PhanLop t={t} cs={cs} sua={(p) => sua(t.id, p)} moChonTuyen={() => setChonTuyen(t.id)} />
                          </div>
                        )}
                        <div className="luoi" style={{ gridTemplateColumns: "200px 1fr 260px", alignItems: "end" }}>
                          <div className="o-nhap"><label>DT công trình trừ khỏi quỹ mật độ (m²)</label><OSo className="o-so" value={t.cayXen?.dienTichTru ?? ""} onChange={(v) => sua(t.id, { cayXen: { dienTichTru: v, lyDoTru: t.cayXen?.lyDoTru ?? "", cachXep: t.cayXen?.cachXep ?? "DUNG_KHI_VUOT" } })} /></div>
                          <div className="o-nhap"><label>Lý do trừ (bắt buộc khi &gt; 0 — VM-34)</label><input value={t.cayXen?.lyDoTru ?? ""} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: t.cayXen?.dienTichTru ?? "", lyDoTru: e.target.value, cachXep: t.cayXen?.cachXep ?? "DUNG_KHI_VUOT" } })} /></div>
                          <div className="o-nhap"><label>Cách xếp khi vượt quỹ</label>
                            <Chon value={t.cayXen?.cachXep ?? "DUNG_KHI_VUOT"} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: t.cayXen?.dienTichTru ?? "", lyDoTru: t.cayXen?.lyDoTru ?? "", cachXep: e.target.value as "DUNG_KHI_VUOT" | "LAP_DAY" } })}>
                              <option value="DUNG_KHI_VUOT">Dừng khi vượt (theo biểu mẫu)</option>
                              <option value="LAP_DAY">Lấp đầy phần quỹ còn dư</option>
                            </Chon>
                          </div>
                        </div>
                        <div className="mo chu-nho mt-6">Thứ tự tính cây = thứ tự dòng ở thẻ Kiểm đếm (chủ sở hữu lựa chọn, k4 Đ5 PL VIII QĐ 106/2025).</div>
                        <div className="luoi" style={{ gridTemplateColumns: "260px 1fr", alignItems: "end", marginTop: 10 }}>
                          <div className="o-nhap"><label>Cây không có mật độ trên thửa trồng xen (VM-35)</label>
                            <Chon value={t.cayXen?.khongMatDo ?? ""} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: t.cayXen?.dienTichTru ?? "", lyDoTru: t.cayXen?.lyDoTru ?? "", cachXep: t.cayXen?.cachXep ?? "DUNG_KHI_VUOT", lyDoKhongMatDo: t.cayXen?.lyDoKhongMatDo ?? "", khongMatDo: (e.target.value || undefined) as "TINH_100" | "TINH_30" | undefined } })}>
                              <option value="">Chưa chọn (cần xác nhận)</option>
                              <option value="TINH_100">Tính 100% đơn giá</option>
                              <option value="TINH_30">Tính 30% như số cây còn lại</option>
                            </Chon>
                          </div>
                          <div className="o-nhap"><label>Lý do, căn cứ lựa chọn (bắt buộc)</label><input value={t.cayXen?.lyDoKhongMatDo ?? ""} onChange={(e) => sua(t.id, { cayXen: { dienTichTru: t.cayXen?.dienTichTru ?? "", lyDoTru: t.cayXen?.lyDoTru ?? "", cachXep: t.cayXen?.cachXep ?? "DUNG_KHI_VUOT", khongMatDo: t.cayXen?.khongMatDo, lyDoKhongMatDo: e.target.value } })} /></div>
                        </div>
                        <div className="mo chu-nho mt-4">Áp dụng cho cây hàng năm, hoa màu tính theo m² và loài chưa có mật độ (vd. đào, táo: nhập mật độ ở thẻ Kiểm đếm thì được xếp vào quỹ).</div>
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
      {chonTuyen && (() => {
        const t = h.thua.find((x) => x.id === chonTuyen)!;
        return (
          <ChonGiaDat xa={duAn.xa} loaiDat={t.loaiDat} dong={() => setChonTuyen(null)} chon={() => undefined}
            chonTuyen={(r) => {
              sua(t.id, { phanLop: { tuyen: { bang: r.bang, stt: r.stt, xa: r.xa, tuyen: r.tuyen, vt: r.vt }, lop: t.phanLop?.lop ?? [{ id: taoId(), lop: 1, viTri: Math.max(1, r.vt.findIndex((g) => g !== null) + 1), dienTich: "" }] } });
              setChonTuyen(null);
              setMoRong(t.id);
            }} />
        );
      })()}
      {thuaChon && (
        <ChonGiaDat xa={duAn.xa} loaiDat={thuaChon.loaiDat} dong={() => setChonGia(null)} chon={(g) => { sua(thuaChon.id, { gia: g }); setChonGia(null); }} />
      )}
    </div>
  );
}

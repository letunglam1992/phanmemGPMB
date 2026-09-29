import { Fragment, useState } from "react";
import { taoId, type DuAn, type Ho, type Thua } from "../../mo-hinh";
import { ChonGiaDat } from "../../thanh-phan/ChonGiaDat";
import { tien } from "../../thanh-phan/chung";
import { PhanLop } from "./PhanLop";
import { TEN_CHENH_LECH, laDatNN } from "../../tinh-ho";
import { TEN_NHOM_HANH_LANG, type NhomDatHanhLang } from "@gpmb/core";
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
  const [chonGiaHT, setChonGiaHT] = useState<string | null>(null);
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
                      <button className="nut nut-chu nut-nho" title="Giấy chứng nhận, phân lớp đất, chênh lệch giá, chi phí đầu tư, hành lang, tùy chọn cây trồng xen" onClick={() => setMoRong(moRong === t.id ? null : t.id)}>⋯</button>
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
                        {cs.hoTroKhac?.chenhLechDat && (
                          <div data-chenh-lech style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--vien)" }}>
                            <div className="luoi" style={{ gridTemplateColumns: "minmax(260px, 1.3fr) 120px 130px 1fr", alignItems: "end" }}>
                              <div className="o-nhap"><label>Hỗ trợ chênh lệch giá đất (khoản 8, 10 Điều 6 QĐ 14/2026)</label>
                                <Chon value={t.chenhLech?.truongHop ?? ""} aria-label="Hỗ trợ chênh lệch giá đất" onChange={(e) => sua(t.id, { chenhLech: e.target.value ? { loaiHienTrang: "", giaHienTrang: "", nguonGia: "", ...t.chenhLech, truongHop: e.target.value as "K8_RSX" | "K8_RPH_RDD" | "K10" } : undefined })}>
                                  <option value="">Không</option>
                                  {Object.entries(TEN_CHENH_LECH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </Chon>
                              </div>
                              {t.chenhLech && t.chenhLech.truongHop !== "K10" && (
                                <div className="o-nhap"><label>Điểm</label>
                                  <Chon value={t.chenhLech.diem8 ?? "a"} onChange={(e) => sua(t.id, { chenhLech: { ...t.chenhLech!, diem8: e.target.value as "a" | "b" } })}>
                                    <option value="a">a</option><option value="b">b</option>
                                  </Chon>
                                </div>
                              )}
                              {t.chenhLech && (
                                <>
                                  <div className="o-nhap"><label>Loại đất hiện trạng</label>
                                    <Chon value={t.chenhLech.loaiHienTrang} aria-label="Loại đất hiện trạng" onChange={(e) => sua(t.id, { chenhLech: { ...t.chenhLech!, loaiHienTrang: e.target.value, giaHienTrang: "", nguonGia: "" } })}>
                                      <option value="">—</option>
                                      {LOAI_DAT.filter((l) => laDatNN(l)).map((l) => <option key={l}>{l}</option>)}
                                    </Chon>
                                  </div>
                                  <div className="o-nhap"><label>Giá đất hiện trạng (nghìn đ/m²)</label>
                                    <div className="nhom-nut">
                                      <OSo className={`o-so gian ${t.chenhLech.giaHienTrang ? "" : "loi-nhap"}`} aria-label="Giá đất hiện trạng" value={t.chenhLech.giaHienTrang} onChange={(v) => sua(t.id, { chenhLech: { ...t.chenhLech!, giaHienTrang: v } })} />
                                      <button className="nut nut-nho" disabled={!t.chenhLech.loaiHienTrang} onClick={() => setChonGiaHT(t.id)}>Bảng giá…</button>
                                    </div>
                                  </div>
                                  <div className="o-nhap"><label>Nguồn giá hiện trạng</label><input value={t.chenhLech.nguonGia} onChange={(e) => sua(t.id, { chenhLech: { ...t.chenhLech!, nguonGia: e.target.value } })} /></div>
                                  <div className="o-nhap"><label>Hạn mức công nhận đất NN cùng loại (m²)</label><OSo className="o-so" value={t.chenhLech.hanMuc ?? ""} placeholder={duAn.hanMucNN ? `Trống = ${duAn.hanMucNN.m2} (dự án)` : "Bắt buộc"} onChange={(v) => sua(t.id, { chenhLech: { ...t.chenhLech!, hanMuc: v || undefined } })} /></div>
                                  <div className="o-nhap"><label>Căn cứ hạn mức</label><input value={t.chenhLech.canCuHanMuc ?? ""} disabled={!t.chenhLech.hanMuc} onChange={(e) => sua(t.id, { chenhLech: { ...t.chenhLech!, canCuHanMuc: e.target.value } })} /></div>
                                </>
                              )}
                            </div>
                            {t.chenhLech && duAn.heSoGiaDat && soD(duAn.heSoGiaDat.heSo).toString() !== "1" && (
                              <div className="luoi mt-6" style={{ gridTemplateColumns: "minmax(260px, 1fr) 2fr", alignItems: "end" }}>
                                <div className="o-nhap"><label>Hệ số điều chỉnh giá đất của dự án ({duAn.heSoGiaDat.heSo}) cho khoản hỗ trợ</label>
                                  <Chon value={t.chenhLech.heSo ? (t.chenhLech.heSo.apDung ? "CO" : "KHONG") : ""} aria-label="Hệ số điều chỉnh cho hỗ trợ chênh lệch" className={t.chenhLech.heSo?.lyDo.trim() ? "" : "nhac-nhap"} onChange={(e) => sua(t.id, { chenhLech: { ...t.chenhLech!, heSo: e.target.value ? { apDung: e.target.value === "CO", lyDo: t.chenhLech!.heSo?.lyDo ?? "" } : undefined } })}>
                                    <option value="">Chưa chọn (tạm nhân hệ số — cần xác nhận)</option>
                                    <option value="CO">Nhân hệ số (giá đất tính tiền bồi thường)</option>
                                    <option value="KHONG">Không nhân hệ số (giá theo bảng giá)</option>
                                  </Chon>
                                </div>
                                <div className="o-nhap"><label>Lý do lựa chọn (bắt buộc)</label><input aria-label="Lý do chọn hệ số chênh lệch" value={t.chenhLech.heSo?.lyDo ?? ""} disabled={!t.chenhLech.heSo} onChange={(e) => sua(t.id, { chenhLech: { ...t.chenhLech!, heSo: { apDung: t.chenhLech!.heSo!.apDung, lyDo: e.target.value } } })} /></div>
                              </div>
                            )}
                            {t.chenhLech && <div className="mo chu-nho mt-4">{t.chenhLech.truongHop === "K8_RPH_RDD" ? "Hỗ trợ về đất bằng giá đất hiện trạng" : "Hỗ trợ về đất bằng chênh lệch giá hiện trạng − giá theo GCN (giá đã chọn cho thửa)"}{t.chenhLech.truongHop !== "K10" ? ", diện tích không vượt hạn mức công nhận" : ""}; chuyển đổi nghề bằng chênh lệch giá đất NN cùng loại theo Điều 14 PL II QĐ 106 (khi hộ có hỗ trợ chuyển đổi nghề). Phần mềm không tự xác định trường hợp.</div>}
                          </div>
                        )}
                        {cs.phuLucII && (
                          <div data-phu-luc-ii style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--vien)" }}>
                            <div className="luoi" style={{ gridTemplateColumns: "minmax(260px, 1.2fr) 150px 1fr", alignItems: "end" }}>
                              <div className="o-nhap"><label>Chi phí đầu tư vào đất còn lại (Điều 3 PL II QĐ 106)</label>
                                <Chon value={t.chiPhiDauTu?.cach ?? ""} aria-label="Chi phí đầu tư vào đất còn lại" onChange={(e) => sua(t.id, { chiPhiDauTu: e.target.value ? { ...t.chiPhiDauTu, cach: e.target.value as "DU_TOAN" | "GIA_DAT" } : undefined })}>
                                  <option value="">Không</option>
                                  <option value="DU_TOAN">Khoản 1 — theo dự toán được Chủ tịch UBND cấp xã phê duyệt</option>
                                  <option value="GIA_DAT">Khoản 2 — không đủ căn cứ lập dự toán: 01 lần giá đất bảng giá × DT thu hồi</option>
                                </Chon>
                              </div>
                              {t.chiPhiDauTu?.cach === "DU_TOAN" && (
                                <>
                                  <div className="o-nhap"><label>Giá trị theo dự toán (đ)</label><OSo className="o-so" aria-label="Giá trị chi phí đầu tư theo dự toán" value={t.chiPhiDauTu.soTien ?? ""} onChange={(v) => sua(t.id, { chiPhiDauTu: { ...t.chiPhiDauTu!, soTien: v } })} /></div>
                                  <div className="o-nhap"><label>Dự toán được duyệt (số, ngày — bắt buộc)</label><input aria-label="Dự toán chi phí đầu tư được duyệt" value={t.chiPhiDauTu.canCu ?? ""} onChange={(e) => sua(t.id, { chiPhiDauTu: { ...t.chiPhiDauTu!, canCu: e.target.value } })} /></div>
                                </>
                              )}
                              {t.chiPhiDauTu?.cach === "GIA_DAT" && (
                                <>
                                  <div className="o-nhap"><label>Thời hạn còn lại (năm)</label><OSo className="o-so" placeholder={h.loai === "TO_CHUC" ? "Bắt buộc" : "Tổ chức"} value={t.chiPhiDauTu.conLaiNam ?? ""} onChange={(v) => sua(t.id, { chiPhiDauTu: { ...t.chiPhiDauTu!, conLaiNam: v } })} /></div>
                                  <div className="o-nhap"><label>Thời hạn sử dụng đất (năm, k4 Đ17 NĐ 88)</label><OSo className="o-so" placeholder={h.loai === "TO_CHUC" ? "Bắt buộc" : "Chỉ với tổ chức"} value={t.chiPhiDauTu.thoiHanNam ?? ""} onChange={(v) => sua(t.id, { chiPhiDauTu: { ...t.chiPhiDauTu!, thoiHanNam: v } })} /></div>
                                </>
                              )}
                            </div>
                            <div className="luoi mt-6" style={{ gridTemplateColumns: "minmax(260px, 1.2fr) minmax(200px, 1fr) 130px 1fr", alignItems: "end" }}>
                              <div className="o-nhap"><label>Đất trong hành lang bảo vệ an toàn (Điều 7 PL II QĐ 106)</label>
                                <Chon value={t.hanhLang?.loai ?? ""} aria-label="Đất trong hành lang bảo vệ an toàn" onChange={(e) => sua(t.id, { hanhLang: e.target.value ? { nhomDat: laDatNN(t.loaiDat) ? (["CLN", "RSX"].includes(t.loaiDat) ? "CLN_RSX" : "HNK") : "O_PNN", dienTich: "", ...t.hanhLang, loai: e.target.value as "DIEN" | "KHAC" } : undefined })}>
                                  <option value="">Không</option>
                                  <option value="DIEN">Khoản 1 — hành lang đường dây dẫn điện trên không</option>
                                  <option value="KHAC">Khoản 2 — hành lang bảo vệ công trình khác</option>
                                </Chon>
                              </div>
                              {t.hanhLang && (
                                <>
                                  <div className="o-nhap"><label>Nhóm đất</label>
                                    <Chon value={t.hanhLang.nhomDat} aria-label="Nhóm đất trong hành lang" onChange={(e) => sua(t.id, { hanhLang: { ...t.hanhLang!, nhomDat: e.target.value as NhomDatHanhLang } })}>
                                      {Object.entries(TEN_NHOM_HANH_LANG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </Chon>
                                  </div>
                                  <div className="o-nhap"><label>DT trong hành lang (m²)</label><OSo className={`o-so ${t.hanhLang.dienTich ? "" : "loi-nhap"}`} aria-label="DT trong hành lang" value={t.hanhLang.dienTich} onChange={(v) => sua(t.id, { hanhLang: { ...t.hanhLang!, dienTich: v } })} /></div>
                                  <div className="o-nhap"><label>Căn cứ xác định DT (biên bản, trích đo)</label><input aria-label="Căn cứ DT hành lang" value={t.hanhLang.canCu ?? ""} onChange={(e) => sua(t.id, { hanhLang: { ...t.hanhLang!, canCu: e.target.value } })} /></div>
                                </>
                              )}
                            </div>
                            {(t.chiPhiDauTu || t.hanhLang) && <div className="mo chu-nho mt-4">{t.chiPhiDauTu ? "Chi phí đầu tư: áp dụng khi không có giấy tờ quy định tại k3 Đ17 NĐ 88/2024 nhưng thực tế đã đầu tư vào đất. " : ""}{t.hanhLang ? `Hành lang: phần đất không thu hồi, tính theo giá đất đã chọn cho thửa × hệ số điều chỉnh của dự án (giá đất cụ thể); ${t.hanhLang.loai === "DIEN" ? "80% / 50% / 30% theo nhóm đất" : "50%, không áp dụng cho đất trồng cây hàng năm"}.` : ""}</div>}
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
      {(() => {
        const t = h.thua.find((x) => x.id === chonGiaHT);
        if (!t?.chenhLech) return null;
        return <ChonGiaDat xa={duAn.xa} loaiDat={t.chenhLech.loaiHienTrang} dong={() => setChonGiaHT(null)} chon={(g) => { sua(t.id, { chenhLech: { ...t.chenhLech!, giaHienTrang: g.giaNghinDong, nguonGia: g.nguon } }); setChonGiaHT(null); }} />;
      })()}
      {thuaChon && (
        <ChonGiaDat xa={duAn.xa} loaiDat={thuaChon.loaiDat} dong={() => setChonGia(null)} chon={(g) => { sua(thuaChon.id, { gia: g }); setChonGia(null); }} />
      )}
    </div>
  );
}

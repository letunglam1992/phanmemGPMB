import { Fragment, useState } from "react";
import { taoId, type DuAn, type Ho, type Thua } from "../../mo-hinh";
import { ChonGiaDat } from "../../thanh-phan/ChonGiaDat";
import { tien } from "../../thanh-phan/chung";
import { PhanLop } from "./PhanLop";
import { TEN_CHENH_LECH, hanMucDatNNThua, hanMucDatOThua, laDatNN } from "../../tinh-ho";
import { TEN_NHOM_HANH_LANG, TEN_TRUONG_HOP_NN, TEN_VI_TRI_HAN_MUC, dinhDang, laPhuong, type ViTriHanMuc, phanBoDatNN, phanBoDatO, type NhomDatHanhLang, type TruongHopDatNN } from "@gpmb/core";
import { TEN_KHONG_GIAY_TO } from "../../tinh-ho";
import { tenDayDu } from "../../van-ban/loai-dat";
import { ONgay } from "../../thanh-phan/ONgay";
import type { KhongGiayTo } from "../../mo-hinh";
import { useUngDung } from "../../ung-dung";
import { Chon } from "../../thanh-phan/Chon";
import { soD } from "../../so";
import { OSo } from "../../thanh-phan/OSo";
import { NHOM_PHAP_LY, THU_TU_PHAP_LY, goiYPhapLy, type NhomPhapLy } from "../../nguon-goc";

export const LOAI_DAT = ["LUC", "LUK", "LUN", "HNK", "BHK", "NHK", "CLN", "RSX", "RPH", "NTS", "ONT", "ODT", "TMD", "SKC", "SKK", "SKN", "DGT", "NTD", "CSD", "KHAC"];

/** Giá trị mặc định của cây trồng xen; sửa một ô thì giữ nguyên các lựa chọn khác (VM-34, VM-35). */
const XEN0 = { dienTichTru: "", lyDoTru: "", cachXep: "DUNG_KHI_VUOT" as const };

export function TabThua({ h, duAn, doi }: { h: Ho; duAn: DuAn; doi: (h: Ho) => void }) {
  const [chonGia, setChonGia] = useState<string | null>(null);
  const [moRong, setMoRong] = useState<string | null>(null);
  const [chonTuyen, setChonTuyen] = useState<string | null>(null);
  const [chonGiaHT, setChonGiaHT] = useState<string | null>(null);
  const [chonGiaKgt, setChonGiaKgt] = useState<{ id: string; loai: "KD" | "CL"; loaiDat: string } | null>(null);
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
              <th style={{ width: 70 }}>Tờ</th><th style={{ width: 80 }}>Thửa</th><th style={{ width: 250 }}>Loại đất</th>
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
                      <Chon value={t.loaiDat} aria-label={`Loại đất thửa ${t.soThua} tờ ${t.soTo}`} title={tenDayDu(t.loaiDat)} onChange={(e) => sua(t.id, { loaiDat: e.target.value, gia: null })}>
                        {!LOAI_DAT.includes(t.loaiDat) && <option>{t.loaiDat}</option>}
                        {LOAI_DAT.map((l) => <option key={l} value={l}>{tenDayDu(l)}</option>)}
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
                      <button className="nut nut-chu nut-nho" title="Giấy chứng nhận, phân lớp đất, không có giấy tờ (NĐ 88), chênh lệch giá, chi phí đầu tư, hành lang, tùy chọn cây trồng xen" onClick={() => setMoRong(moRong === t.id ? null : t.id)}>⋯</button>
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
                        <KhongGiayToThua t={t} h={h} duAn={duAn} sua={(k) => sua(t.id, { khongGiayTo: k })} moChonGia={(loai, loaiDat) => setChonGiaKgt({ id: t.id, loai, loaiDat })} />
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
                                      {LOAI_DAT.filter((l) => laDatNN(l)).map((l) => <option key={l} value={l}>{tenDayDu(l)}</option>)}
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
                          <div className="o-nhap"><label>DT công trình trừ khỏi quỹ mật độ (m²)</label><OSo className="o-so" value={t.cayXen?.dienTichTru ?? ""} onChange={(v) => sua(t.id, { cayXen: { ...XEN0, ...t.cayXen, dienTichTru: v } })} /></div>
                          <div className="o-nhap"><label>Lý do trừ (bắt buộc khi &gt; 0 — VM-34)</label><input value={t.cayXen?.lyDoTru ?? ""} onChange={(e) => sua(t.id, { cayXen: { ...XEN0, ...t.cayXen, lyDoTru: e.target.value } })} /></div>
                          <div className="o-nhap"><label>Cách xếp khi vượt quỹ</label>
                            <Chon value={t.cayXen?.cachXep ?? "DUNG_KHI_VUOT"} onChange={(e) => sua(t.id, { cayXen: { ...XEN0, ...t.cayXen, cachXep: e.target.value as "DUNG_KHI_VUOT" | "LAP_DAY" } })}>
                              <option value="DUNG_KHI_VUOT">Dừng khi vượt (theo biểu mẫu)</option>
                              <option value="LAP_DAY">Lấp đầy phần quỹ còn dư</option>
                            </Chon>
                          </div>
                        </div>
                        <div className="mo chu-nho mt-6">Thứ tự tính cây = thứ tự dòng ở thẻ Kiểm đếm (chủ sở hữu lựa chọn, k4 Đ5 PL VIII QĐ 106/2025).</div>
                        <div className="luoi" style={{ gridTemplateColumns: t.cayXen?.khongMatDo === "TU_NHAP" ? "260px 160px 1fr" : "260px 1fr", alignItems: "end", marginTop: 10 }}>
                          <div className="o-nhap"><label>Cây không có mật độ trên thửa trồng xen (VM-35)</label>
                            <Chon value={t.cayXen?.khongMatDo ?? ""} onChange={(e) => sua(t.id, { cayXen: { ...XEN0, ...t.cayXen, khongMatDo: (e.target.value || undefined) as "TINH_100" | "TINH_30" | "TU_NHAP" | undefined } })}>
                              <option value="">Chưa chọn (cần xác nhận)</option>
                              <option value="TINH_100">Tính 100% đơn giá</option>
                              <option value="TINH_30">Tính 30% như số cây còn lại</option>
                              <option value="TU_NHAP">Tự điền tỷ lệ (%)</option>
                            </Chon>
                          </div>
                          {t.cayXen?.khongMatDo === "TU_NHAP" && <div className="o-nhap"><label>Tỷ lệ tính (%, 0–100)</label><OSo className="o-so" aria-label="Tỷ lệ cây không có mật độ" value={t.cayXen?.tyLeKhongMatDo ?? ""} onChange={(v) => sua(t.id, { cayXen: { ...XEN0, ...t.cayXen, tyLeKhongMatDo: v } })} /></div>}
                          <div className="o-nhap"><label>Lý do, căn cứ lựa chọn (bắt buộc)</label><input value={t.cayXen?.lyDoKhongMatDo ?? ""} onChange={(e) => sua(t.id, { cayXen: { ...XEN0, ...t.cayXen, lyDoKhongMatDo: e.target.value } })} /></div>
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
      {(() => {
        const t = h.thua.find((x) => x.id === chonGiaKgt?.id);
        if (!t?.khongGiayTo || !chonGiaKgt) return null;
        const k = t.khongGiayTo;
        return <ChonGiaDat xa={duAn.xa} loaiDat={chonGiaKgt.loaiDat} dong={() => setChonGiaKgt(null)} chon={(g) => { sua(t.id, { khongGiayTo: chonGiaKgt.loai === "KD" ? { ...k, giaSxkd: g } : { ...k, giaConLai: { ...g, loaiDat: chonGiaKgt.loaiDat } } }); setChonGiaKgt(null); }} />;
      })()}
      {thuaChon && (
        <ChonGiaDat xa={duAn.xa} loaiDat={thuaChon.loaiDat} dong={() => setChonGia(null)} chon={(g) => { sua(thuaChon.id, { gia: g }); setChonGia(null); }} />
      )}
    </div>
  );
}

/** B03, B04, B05 — bồi thường về đất khi không có giấy tờ, vi phạm, giao không đúng thẩm quyền (Điều 5, 8, 9, 10, 12 NĐ 88/2024). */
function KhongGiayToThua({ t, h, duAn, sua, moChonGia }: { t: Thua; h: Ho; duAn: DuAn; sua: (k: KhongGiayTo | undefined) => void; moChonGia: (loai: "KD" | "CL", loaiDat: string) => void }) {
  const k = t.khongGiayTo;
  const [loaiKd, setLoaiKd] = useState("SKC");
  const [loaiCl, setLoaiCl] = useState(k?.giaConLai?.loaiDat || "CLN");
  const dat = (p: Partial<KhongGiayTo>) => sua({ ...k!, ...p });
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn);
  const laNN = laDatNN(t.loaiDat);
  const hmO = k && k.dieu !== "D12" ? hanMucDatOThua(cs, duAn, k) : null;
  const hmNN = k?.dieu === "D12" ? hanMucDatNNThua(cs, duAn, t, k) : null;
  const so = (v?: string) => (v && !isNaN(Number(v)) ? v : "0");
  let tomTat = "";
  if (k && k.dieu !== "D12") {
    const r = phanBoDatO({ dieu: k.dieu, ngaySuDung: k.ngaySuDung, dtThuHoi: so(t.dienTichThuHoi), dtThua: so(t.dienTich || t.dienTichThuHoi), dtXayDung: so(k.dtXayDung), dtSxkd: so(k.dtSxkd), hanMucCongNhan: hmO!.hmCn || null, hanMucGiao: hmO!.hmGiao || null, d140: k.d140, giayToNopTien: k.giayToNopTien, lanChiem: k.lanChiem });
    tomTat = r.loi ? `⚠ ${r.loi}` : `${r.khoan}: đất ở ${dinhDang(r.datO, 2)} m²${r.sxkd.gt(0) ? `; SXKD ${dinhDang(r.sxkd, 2)} m²` : ""}${r.conLai.gt(0) ? `; còn lại ${dinhDang(r.conLai, 2)} m² (${r.conLaiLoai === "NN" ? "theo đất NN" : r.conLaiLoai === "HIEN_TRANG" ? "theo hiện trạng" : r.conLaiLoai === "KHONG_BT" ? "không bồi thường" : "Điều 9 không quy định — chọn cách xử lý"})` : ""}${r.datOVuot.gt(0) ? `; phần đất ở vượt hạn mức ${dinhDang(r.datOVuot, 2)} m² trừ tiền SDĐ` : ""}`;
  } else if (k?.dieu === "D12" && k.truongHopNN) {
    const hm = hmNN!.m2;
    if (hm || k.truongHopNN === "K5A") {
      const r = phanBoDatNN({ truongHop: k.truongHopNN, dtThuHoi: so(t.dienTichThuHoi), hanMuc: hm || "0", truoc2004TrucTiepSx: k.truoc2004TrucTiepSx });
      tomTat = `${r.khoan}: bồi thường ${dinhDang(r.boiThuong, 2)} m²${r.vuot.gt(0) ? `; vượt hạn mức ${dinhDang(r.vuot, 2)} m² — hỗ trợ khác (k7)` : ""}`;
    } else tomTat = "⚠ Chưa có hạn mức";
  }
  return (
    <div data-khong-giay-to style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--vien)" }}>
      <div className="luoi" style={{ gridTemplateColumns: "minmax(280px, 1.3fr) 150px 1fr", alignItems: "end" }}>
        <div className="o-nhap"><label>Bồi thường về đất khi không có giấy tờ, vi phạm, giao không đúng thẩm quyền (NĐ 88/2024)</label>
          <Chon value={k?.dieu ?? ""} aria-label="Bồi thường về đất không có giấy tờ" onChange={(e) => sua(e.target.value ? { ngaySuDung: "", ...k, dieu: e.target.value as KhongGiayTo["dieu"] } : undefined)}>
            <option value="">Không (bồi thường theo giá đất của thửa)</option>
            {(Object.keys(TEN_KHONG_GIAY_TO) as (keyof typeof TEN_KHONG_GIAY_TO)[]).map((d) => <option key={d} value={d}>{TEN_KHONG_GIAY_TO[d]}</option>)}
          </Chon>
        </div>
        {k && k.dieu !== "D12" && <div className="o-nhap"><label>Sử dụng ổn định từ</label><ONgay aria-label="Thời điểm sử dụng đất ổn định" value={k.ngaySuDung} onChange={(e) => dat({ ngaySuDung: e.target.value })} /></div>}
        {k?.dieu === "D12" && (
          <div className="o-nhap" style={{ gridColumn: "2/-1" }}><label>Trường hợp (Điều 12)</label>
            <Chon value={k.truongHopNN ?? ""} aria-label="Trường hợp Điều 12" onChange={(e) => dat({ truongHopNN: (e.target.value || undefined) as TruongHopDatNN | undefined })}>
              <option value="">— Chọn —</option>
              {(Object.keys(TEN_TRUONG_HOP_NN) as TruongHopDatNN[]).map((x) => <option key={x} value={x}>{TEN_TRUONG_HOP_NN[x]}</option>)}
            </Chon>
          </div>
        )}
      </div>
      {k && k.dieu !== "D12" && (
        <>
          {laNN && <div className="chu-do chu-nho mt-4">Điều 8, 9, 10 áp dụng cho thửa đất có nhà ở — loại đất của thửa đang là {tenDayDu(t.loaiDat)}; giá đất ở lấy theo giá đã chọn cho thửa.</div>}
          <div className="luoi mt-6" style={{ gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", alignItems: "end" }}>
            <div className="o-nhap"><label>DT đã xây nhà ở, công trình đời sống (m²)</label><OSo className="o-so" aria-label="DT đã xây dựng nhà ở" value={k.dtXayDung ?? ""} onChange={(v) => dat({ dtXayDung: v })} /></div>
            {k.dieu !== "D9" && <div className="o-nhap"><label>DT sử dụng SXKD phi NN, TMDV (m²)</label><OSo className="o-so" aria-label="DT sản xuất kinh doanh" value={k.dtSxkd ?? ""} onChange={(v) => dat({ dtSxkd: v })} /></div>}
            <div className="o-nhap"><label>Hạn mức riêng của thửa (m²)</label><OSo className="o-so" value={k.hanMuc ?? ""} placeholder={k.viTriHanMuc && cs.hanMucPl1 ? "Trống = theo Phụ lục I" : duAn.hanMucDatO ? `Trống = dự án (${duAn.hanMucDatO.congNhan || "—"} / ${duAn.hanMucDatO.giao || "—"})` : "Chọn vị trí thửa"} onChange={(v) => dat({ hanMuc: v || undefined })} /></div>
            <div className="o-nhap"><label>Căn cứ hạn mức riêng</label><input value={k.canCuHanMuc ?? ""} disabled={!k.hanMuc} onChange={(e) => dat({ canCuHanMuc: e.target.value })} /></div>
          </div>
          {cs.hanMucPl1 && (
            <div className="luoi mt-6" style={{ gridTemplateColumns: "minmax(280px, 1.2fr) 2fr", alignItems: "end" }}>
              <div className="o-nhap"><label>Vị trí thửa — tra hạn mức Phụ lục I QĐ 106/2025 ({laPhuong(duAn.xa) ? "tại phường" : "tại xã"})</label>
                <Chon aria-label="Vị trí thửa tra hạn mức" value={k.viTriHanMuc ?? ""} onChange={(e) => dat({ viTriHanMuc: (e.target.value || undefined) as ViTriHanMuc | undefined })}>
                  <option value="">Chưa chọn (dùng hạn mức dự án)</option>
                  {Object.entries(TEN_VI_TRI_HAN_MUC[laPhuong(duAn.xa) ? "PHUONG" : "XA"]).map(([m, ten]) => <option key={m} value={m}>{ten}</option>)}
                </Chon>
              </div>
              <div className="chu-nho" data-han-muc-dat-o>
                {k.hanMuc ? <>Đang dùng hạn mức riêng của thửa: <b>{k.hanMuc} m²</b> ({k.canCuHanMuc || "chưa ghi căn cứ"}).</> : (
                  <>Hạn mức công nhận: <b>{hmO!.hmCn ? `${hmO!.hmCn} m²` : "—"}</b> ({hmO!.hmCn ? hmO!.canCuCn : k.ngaySuDung >= "1993-10-15" ? "không áp dụng từ 15/10/1993" : "chưa có"}) · Hạn mức giao: <b>{hmO!.hmGiao ? `${hmO!.hmGiao} m²` : "—"}</b> ({hmO!.hmGiao ? hmO!.canCuGiao : "chưa có"})</>
                )}
              </div>
            </div>
          )}
          <div className="luoi mt-6" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
            {k.dieu !== "D9" && (
              <div className="o-nhap"><label>Giá đất SXKD / TMDV (điểm c)</label>
                <div className="nhom-nut">
                  <Chon value={loaiKd} onChange={(e) => setLoaiKd(e.target.value)} style={{ width: 90 }}><option>SKC</option><option>TMD</option></Chon>
                  <button className="nut nut-nho" onClick={() => moChonGia("KD", loaiKd)}>Bảng giá…</button>
                  <span className="chu-nho">{k.giaSxkd ? `${dinhDang(Number(k.giaSxkd.giaNghinDong) * 1000)} đ/m² — ${k.giaSxkd.nguon}` : "chưa chọn"}</span>
                </div>
              </div>
            )}
            <div className="o-nhap"><label>{k.dieu === "D10" ? "Giá đất phần còn lại (theo hiện trạng / đất NN)" : "Giá đất NN phần còn lại (điểm d)"}</label>
              <div className="nhom-nut">
                <Chon value={loaiCl} onChange={(e) => setLoaiCl(e.target.value)} style={{ width: 220 }}>{LOAI_DAT.map((l) => <option key={l} value={l}>{tenDayDu(l)}</option>)}</Chon>
                <button className="nut nut-nho" aria-label="Chọn giá đất phần còn lại" onClick={() => moChonGia("CL", loaiCl)}>Bảng giá…</button>
                <span className="chu-nho">{k.giaConLai ? `${tenDayDu(k.giaConLai.loaiDat)}: ${dinhDang(Number(k.giaConLai.giaNghinDong) * 1000)} đ/m² — ${k.giaConLai.nguon}` : "chưa chọn"}</span>
              </div>
            </div>
          </div>
          <div className="nhom-nut mt-6 chu-nho">
            {k.dieu === "D8" && <label><input type="checkbox" checked={!!k.vungKhoKhan} onChange={(e) => dat({ vungKhoKhan: e.target.checked || undefined })} /> Hộ được giao đất NN (k1 Đ118 LĐĐ), thường trú tại vùng KT-XH khó khăn/ĐBKK (khoản 4 Điều 8)</label>}
            {k.dieu === "D9" && <label><input type="checkbox" checked={!!k.lanChiem} onChange={(e) => dat({ lanChiem: e.target.checked || undefined })} /> Lấn đất, chiếm đất (khoản 4 Điều 9)</label>}
            {k.dieu === "D10" && <label><input type="checkbox" checked={!!k.d140} onChange={(e) => dat({ d140: e.target.checked || undefined })} /> Thuộc điểm a, b khoản 3 Điều 140 LĐĐ (khoản 3 Điều 10)</label>}
            {k.dieu === "D10" && <label><input type="checkbox" checked={!!k.giayToNopTien} onChange={(e) => dat({ giayToNopTien: e.target.checked || undefined })} /> Có giấy tờ chứng minh đã nộp tiền để được sử dụng đất (khoản 4 Điều 10)</label>}
          </div>
          <div className="luoi mt-6" style={{ gridTemplateColumns: "180px 1fr 1fr", alignItems: "end" }}>
            <div className="o-nhap"><label>Tiền SDĐ phải nộp phần vượt (đ)</label><OSo className="o-so" aria-label="Tiền sử dụng đất phải nộp phần vượt" value={k.tienSdd ?? ""} onChange={(v) => dat({ tienSdd: v })} /></div>
            <div className="o-nhap"><label>Căn cứ tiền SDĐ (thông báo thuế, bảng tính)</label><input aria-label="Căn cứ tiền sử dụng đất" value={k.canCuTienSdd ?? ""} onChange={(e) => dat({ canCuTienSdd: e.target.value })} /></div>
            <div className="o-nhap"><label>Lý do xác nhận VM-39 (khi được nhắc)</label><input aria-label="Lý do VM-39" value={k.lyDoVm39 ?? ""} onChange={(e) => dat({ lyDoVm39: e.target.value || undefined })} /></div>
          </div>
          {k.dieu === "D9" && (
            <div className="luoi mt-6" style={{ gridTemplateColumns: "minmax(240px, 1fr) 2fr", alignItems: "end" }}>
              <div className="o-nhap"><label>Phần DT còn lại (Điều 9 không quy định)</label>
                <Chon value={k.conLai?.cach ?? ""} aria-label="Phần còn lại Điều 9" onChange={(e) => dat({ conLai: e.target.value ? { cach: e.target.value as "NN" | "KHONG", lyDo: k.conLai?.lyDo ?? "" } : undefined })}>
                  <option value="">Chưa chọn (cần xác nhận)</option>
                  <option value="NN">Tính theo loại đất nông nghiệp</option>
                  <option value="KHONG">Không bồi thường về đất</option>
                </Chon>
              </div>
              <div className="o-nhap"><label>Lý do (bắt buộc)</label><input aria-label="Lý do phần còn lại Điều 9" value={k.conLai?.lyDo ?? ""} disabled={!k.conLai} onChange={(e) => dat({ conLai: { cach: k.conLai!.cach, lyDo: e.target.value } })} /></div>
            </div>
          )}
        </>
      )}
      {k?.dieu === "D12" && (
        <>
          <div className="luoi mt-6" style={{ gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", alignItems: "end" }}>
            <div className="o-nhap"><label>Hạn mức riêng (m²)</label><OSo className="o-so" aria-label="Hạn mức đất NN riêng" value={k.hanMuc ?? ""} placeholder={!k.hanMuc && hmNN?.m2 ? `Trống = ${hmNN.m2}${k.truongHopNN === "K2_KHAI_HOANG" ? " (Điều 7 PL I)" : " (dự án)"}` : "Bắt buộc"} onChange={(v) => dat({ hanMuc: v || undefined })} /></div>
            <div className="o-nhap"><label>Căn cứ hạn mức riêng</label><input value={k.canCuHanMuc ?? ""} disabled={!k.hanMuc} onChange={(e) => dat({ canCuHanMuc: e.target.value })} /></div>
            <div className="o-nhap"><label>Hỗ trợ khác phần vượt — số tiền (đ)</label><OSo className="o-so" value={k.hoTroK7?.soTien ?? ""} onChange={(v) => dat({ hoTroK7: { soTien: v, canCu: k.hoTroK7?.canCu ?? "" } })} /></div>
            <div className="o-nhap"><label>Văn bản quyết định hỗ trợ (k7)</label><input value={k.hoTroK7?.canCu ?? ""} onChange={(e) => dat({ hoTroK7: { soTien: k.hoTroK7?.soTien ?? "", canCu: e.target.value } })} /></div>
          </div>
          {k.truongHopNN === "K2_KHAI_HOANG" && !k.hanMuc && <div className="chu-nho mt-4" data-han-muc-khai-hoang>{hmNN?.m2 ? <>Hạn mức giao đất NN (đất tự khai hoang): <b>{dinhDang(soD(hmNN.m2), 0)} m²</b> — {hmNN.canCu}{hmNN.luuY ? `. ${hmNN.luuY}` : ""}</> : <span className="chu-do">{tenDayDu(t.loaiDat)} không có trong Điều 7 Phụ lục I QĐ 106/2025 — nhập hạn mức riêng kèm căn cứ.</span>}</div>}
          <label className="chu-nho mt-6" style={{ display: "block" }}><input type="checkbox" checked={!!k.truoc2004TrucTiepSx} onChange={(e) => dat({ truoc2004TrucTiepSx: e.target.checked || undefined })} /> Sử dụng ổn định trước 01/7/2004, trực tiếp sản xuất NN nhưng không đủ điều kiện cấp GCN (khoản 4 Điều 12)</label>
          {!laNN && <div className="chu-do chu-nho mt-4">Điều 12 áp dụng cho đất thuộc nhóm đất nông nghiệp — loại đất của thửa đang là {tenDayDu(t.loaiDat)}.</div>}
        </>
      )}
      {tomTat && <div className="mo chu-nho mt-4" data-tom-tat-kgt>{tomTat}. {h.loai === "TO_CHUC" ? "Điều 8–12 NĐ 88 áp dụng cho hộ gia đình, cá nhân — kiểm tra." : "Phần mềm không tự xác định điều kiện bồi thường (Điều 5); cán bộ chọn trường hợp."}</div>}
    </div>
  );
}

import { ONgay } from "../../thanh-phan/ONgay";
import { useState } from "react";
import { boLanDoi, buocDoi, canQuyenDuyet, docLanDoi, ghiLanDoi, hoanTacLan } from "../../hoan-tac";
import { kiemTraDuyetBuoc } from "../../tai-khoan";
import { hanCuaBuoc, tinhHanBuoc } from "../../han-buoc";
import { homNayIso } from "../../trang-thai";
import { useUngDung } from "../../ung-dung";
import { daQuaBuoc, BUOC_CHUNG, CAC_BUOC, TEN_TRANG_THAI_BUOC, hoHieuLuc, laBuocChung, tienDoHieuLuc, type DuAn, type Ho, type TrangThaiBuoc } from "../../mo-hinh";
import { O, ngayVN } from "../../thanh-phan/chung";
import { DANH_MUC_MAU } from "../../van-ban/danh-muc";
import { Chon } from "../../thanh-phan/Chon";
import type { Tab } from "./kieu";
import { KhungYKienPA } from "../../thanh-phan/DoiThoai";

/**
 * Tiến độ của hộ: bước 1–4 là bước chung của dự án (chỉ xem, cập nhật một lần ở dự án); bước 5–16 theo từng hộ —
 * mỗi hộ một tiến độ riêng, mỗi bước ghi được khó khăn, vướng mắc để lãnh đạo nắm và đưa vào báo cáo.
 */
export function TabTienDo({ h, duAn, doi, luuNgay: luuGoc, soanMau, moDuAn }: Tab & { duAn: DuAn; luuNgay: (h: Ho, nk: string) => Promise<void>; soanMau: (ma: string) => void; moDuAn: () => void }) {
  // 0.9.27: thao tác lưu ngay (gửi duyệt, xác nhận, không áp dụng, giải quyết vướng mắc…) ghi nhận để hoàn tác lần gần nhất
  const { taiKhoan, quyen, bao, lich } = useUngDung();
  const khoaLan = `ho:${h.id}`;
  const [lan, setLan] = useState(() => docLanDoi(khoaLan));
  const luuNgay = async (moi: Ho, nk: string) => {
    const truoc = h.tienDo;
    await luuGoc(moi, nk);
    setLan(ghiLanDoi(khoaLan, nk, truoc, moi.tienDo) ?? docLanDoi(khoaLan));
  };
  const hoanTac = async () => {
    if (!lan) return;
    if (canQuyenDuyet(lan) && !quyen("DUYET_BUOC")) return bao("Chỉ người có quyền xác nhận bước mới hoàn tác được thay đổi liên quan bước đã hoàn thành, không áp dụng", "loi");
    const kq = hoanTacLan(lan, h.tienDo);
    if ("loi" in kq) return bao(kq.loi, "loi");
    if (!confirm(`Hoàn tác "${lan.moTa}" (bước ${buocDoi(lan).join(", ")} về trạng thái trước đó)?`)) return;
    await luuGoc({ ...h, tienDo: kq.tienDo as Ho["tienDo"] }, `Hoàn tác: ${lan.moTa}`);
    boLanDoi(khoaLan);
    setLan(undefined);
  };
  const td = tienDoHieuLuc(duAn, h);
  const BUOC_HO = CAC_BUOC.filter((x) => !laBuocChung(x.ma));
  const [chon, setChon] = useState((BUOC_HO.find((x) => !daQuaBuoc(td[x.ma]?.trangThai)) ?? BUOC_HO[BUOC_HO.length - 1]!).ma);
  const b = CAC_BUOC.find((x) => x.ma === chon)!;
  const bh = h.tienDo[chon] ?? { trangThai: "CHUA" as TrangThaiBuoc };
  const han = hanCuaBuoc(chon);
  const th = han ? tinhHanBuoc(hoHieuLuc(duAn, h), han, homNayIso(), lich) : null;
  const loiDuyet = taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, bh) : "Chưa đăng nhập";
  const chungXong = BUOC_CHUNG.every((ma) => td[ma]?.trangThai === "XONG");
  const chungCu = BUOC_CHUNG.filter((ma) => h.tienDo[ma]);
  const datBuoc = (p: Partial<typeof bh>) => {
    if (p.trangThai === "XONG" && bh.trangThai !== "XONG") return void doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`);
    if (p.trangThai === "CHO_DUYET" && bh.trangThai !== "CHO_DUYET") return void doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`);
    if (daQuaBuoc(bh.trangThai) && p.trangThai && p.trangThai !== bh.trangThai && !quyen("DUYET_BUOC")) return bao("Chỉ người có quyền duyệt mới mở lại bước đã hoàn thành / không áp dụng", "loi");
    doi({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...p } } });
  };
  const doiTrangThai = (tt: TrangThaiBuoc, nk: string, lyDo?: string) => {
    if (tt === "XONG" && loiDuyet) return bao(loiDuyet, "loi");
    if (tt === "KHONG_AP_DUNG" && !quyen("DUYET_BUOC")) return bao("Cần quyền xác nhận bước để đánh dấu Không áp dụng", "loi");
    const ghi = tt === "XONG" || tt === "KHONG_AP_DUNG" ? { duyetBoi: taiKhoan!.ten, ...(lyDo ? { ghiChu: lyDo } : {}) } : tt === "CHO_DUYET" ? { guiBoi: taiKhoan!.ten, duyetBoi: undefined } : {};
    return luuNgay({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...ghi, trangThai: tt, ngay: bh.ngay || new Date().toISOString().slice(0, 10) } } }, nk);
  };
  const giaiQuyet = () => {
    const { vuongMac, vuongMacNgay: _n, ...con } = bh;
    void luuNgay({ ...h, tienDo: { ...h.tienDo, [chon]: con } }, `Đã giải quyết vướng mắc bước ${b.ma}. ${b.ten}: ${vuongMac ?? ""}`);
  };
  /** Bỏ tiến độ bước chung nhập riêng ở hộ (phiên bản trước) — theo bước chung của dự án. */
  const boTienDoChungCu = () => {
    const moi = { ...h.tienDo };
    for (const ma of BUOC_CHUNG) delete moi[ma];
    void luuNgay({ ...h, tienDo: moi }, "Bỏ tiến độ bước 1–4 nhập riêng ở hộ — theo bước chung của dự án");
  };
  const lopTt = (t: TrangThaiBuoc) => (t === "XONG" ? "nhan-xanh" : t === "DANG" ? "nhan-duong" : t === "CHO_DUYET" ? "nhan-tim" : "nhan-xam");
  const khongApDung = () => {
    const lyDo = prompt(`Bước ${b.ma}. ${b.ten} — không áp dụng với hộ này?\nVí dụ: hộ tự nguyện bàn giao, không phải cưỡng chế.\n\nLý do (bắt buộc, ghi vào nhật ký hồ sơ):`)?.trim();
    if (lyDo) doiTrangThai("KHONG_AP_DUNG", `Bước ${b.ma}. ${b.ten}: không áp dụng — ${lyDo}`, lyDo);
  };
  return (
    <div className="luoi" style={{ gap: 14 }}>
      <div className="the td-chung">
        <div className="the-dau">
          <h3>Bước chung của dự án (1–4)</h3>
          <span className="mo chu-nho">Thực hiện chung cho cả dự án — chỉ xem ở đây</span>
          <div className="phai"><button className="nut nut-nho" onClick={moDuAn}>Cập nhật ở dự án →</button></div>
        </div>
        <div className="td-chung-ds">
          {BUOC_CHUNG.map((ma) => {
            const x = CAC_BUOC.find((y) => y.ma === ma)!;
            const t = td[ma]?.trangThai ?? "CHUA";
            return (
              <div key={ma} className={`td-chung-o ${t}`}>
                <span className="so">{t === "XONG" ? "✓" : t === "KHONG_AP_DUNG" ? "–" : ma}</span>
                <div>
                  <b>{x.ten}</b>
                  <div className="chu-nho"><span className={`nhan ${lopTt(t)}`}>{TEN_TRANG_THAI_BUOC[t]}</span>{td[ma]?.ngay ? ` · ${ngayVN(td[ma]!.ngay)}` : ""}</div>
                  {td[ma]?.ghiChu && <div className="chu-nho mo">{td[ma]!.ghiChu}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {!chungXong && <div className="thong-bao thong-bao-vang" style={{ margin: "10px 16px 14px" }}>Dự án chưa hoàn thành đủ bước chung 1–4. Theo trình tự, các bước riêng của từng hộ (từ bước 5 — lập phương án) thực hiện sau khi đã thông báo thu hồi và điều tra, đo đạc, kiểm đếm (trình tự khoản 2, khoản 3 Điều 87 Luật Đất đai 2024).</div>}
        {chungCu.length > 0 && (
          <div className="thong-bao thong-bao-xanh chu-nho" style={{ margin: "10px 16px 14px" }}>
            Hộ còn tiến độ bước {chungCu.join(", ")} nhập riêng ở phiên bản trước — đang dùng khi dự án chưa cập nhật bước đó.{" "}
            {quyen("SUA_HO_SO") && <button className="nut nut-chu nut-nho" onClick={boTienDoChungCu}>Bỏ, theo bước chung của dự án</button>}
          </div>
        )}
      </div>
      <div className="luoi luoi-chinh">
        <div className="the">
          <div className="the-dau">
            <h2>Tiến độ của hộ (bước 5–16)</h2><span className="mo chu-nho">Mỗi hộ một tiến độ; bấm một bước để cập nhật, ghi khó khăn, vướng mắc</span>
            {lan && <div className="phai"><button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} title={`Trả bước ${buocDoi(lan).join(", ")} về trạng thái trước lần: ${lan.moTa}`} onClick={() => void hoanTac()}>↶ Hoàn tác: {lan.moTa}</button></div>}
          </div>
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr><th>Bước</th><th>Nội dung</th><th>Thời hạn</th><th>Trạng thái</th><th>Ngày</th><th>Khó khăn, vướng mắc</th></tr></thead>
              <tbody>
                {BUOC_HO.map((x) => {
                  const t = td[x.ma]?.trangThai ?? "CHUA";
                  const vm = h.tienDo[x.ma]?.vuongMac;
                  return (
                    <tr key={x.ma} data-phim-chon className={`co-the-chon ${chon === x.ma ? "dang-chon" : ""}`} onClick={() => setChon(x.ma)}>
                      <td>{x.ma}</td>
                      <td>{x.ten}<div className="can-cu">{x.canCu}{x.mau ? ` · Mẫu ${x.mau}` : ""}</div></td>
                      <td className="chu-nho">{x.thoiHan ?? "—"}</td>
                      <td><span className={`nhan ${lopTt(t)}`}>{TEN_TRANG_THAI_BUOC[t]}</span></td>
                      <td className="chu-nho">{ngayVN(td[x.ma]?.ngay)}</td>
                      <td className="chu-nho">{vm ? <span className="chu-do">! {vm}</span> : <span className="mo">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="the">
          <div className="the-dau"><h3>Bước {b.ma}. {b.ten}</h3></div>
          <div className="the-than luoi">
            <div className="chu-nho"><b>Căn cứ:</b> {b.canCu}<br /><b>Thời hạn:</b> {b.thoiHan ?? "—"}<br /><b>Mẫu biểu (Sổ tay QĐ 1966):</b> {b.mau ?? "—"}</div>
            {han && th && (
              <div className={`thong-bao ${th.trangThai === "QUA_HAN" || th.trangThai === "XONG_QUA_HAN" ? "thong-bao-do" : th.trangThai === "SAP_HET" ? "thong-bao-vang" : "thong-bao-xanh"}`} style={{ marginBottom: 0 }}>
                <b>Thời hạn:</b> {han.soNgay} {han.loai === "NLV" ? "ngày làm việc" : "ngày"} kể từ {han.moc.nhan.charAt(0).toLowerCase() + han.moc.nhan.slice(1)} ({han.canCu}).
                {han.moc.loai === "NHAP" && (
                  <div className="mt-6">
                    <label className="chu-nho">Ngày mốc: <ONgay value={bh.mocHan ?? ""} onChange={(e) => datBuoc({ mocHan: e.target.value || undefined })} /></label>
                  </div>
                )}
                <div className="mt-6 chu-nho" aria-label="Thời gian không tính vào thời hạn">
                  <b>Thời gian không tính vào thời hạn</b> (vd. từ ngày yêu cầu bổ sung đến ngày nhận đủ hồ sơ bổ sung — bắt buộc lý do):
                  {(bh.khongTinh ?? []).map((p, i) => {
                    const doi = (x: Partial<{ tu: string; den?: string; lyDo: string }>) => datBuoc({ khongTinh: (bh.khongTinh ?? []).map((y, j) => (j === i ? { ...y, ...x } : y)) });
                    return (
                      <div key={i} className="nhom-nut mt-4" style={{ alignItems: "center" }}>
                        từ <ONgay aria-label={`Không tính từ ngày ${i + 1}`} value={p.tu} onChange={(e) => doi({ tu: e.target.value })} />
                        đến <ONgay aria-label={`Không tính đến ngày ${i + 1}`} value={p.den ?? ""} onChange={(e) => doi({ den: e.target.value || undefined })} />
                        <input aria-label={`Lý do không tính ${i + 1}`} className={p.lyDo.trim() ? "" : "loi-nhap"} placeholder="Lý do, văn bản (vd. CV yêu cầu bổ sung số …)" value={p.lyDo} onChange={(e) => doi({ lyDo: e.target.value })} style={{ minWidth: 260 }} />
                        <button className="nut nut-nho nut-nguy" onClick={() => datBuoc({ khongTinh: (bh.khongTinh ?? []).filter((_, j) => j !== i) })}>Xóa</button>
                      </div>
                    );
                  })}
                  <div className="mt-4"><button className="nut nut-nho" onClick={() => datBuoc({ khongTinh: [...(bh.khongTinh ?? []), { tu: homNayIso(), lyDo: "" }] })}>+ Thêm khoảng không tính</button> <span className="mo">Để trống "đến" khi đang chờ bổ sung — thời hạn tạm dừng.</span></div>
                </div>
                <div className="mt-4">
                  {th.trangThai === "CHUA_CO_MOC" && (han.moc.loai === "NHAP" ? "Chưa nhập ngày mốc — chưa tính hạn." : `Chưa có ${han.moc.nhan} — chưa tính hạn.`)}
                  {th.hanChot && <>Hạn chót: <b>{ngayVN(th.hanChot)}</b>. </>}
                  {th.trangThai === "CON_HAN" && `Còn ${th.conLai} ${han.loai === "NLV" ? "ngày làm việc" : "ngày"}.`}
                  {th.trangThai === "SAP_HET" && `Sắp hết hạn: còn ${th.conLai} ${han.loai === "NLV" ? "ngày làm việc" : "ngày"}.`}
                  {th.trangThai === "QUA_HAN" && "Đã quá hạn."}
                  {th.trangThai === "XONG_DUNG_HAN" && "Hoàn thành trong hạn."}
                  {th.trangThai === "XONG_QUA_HAN" && "Hoàn thành sau hạn."}
                  {th.trangThai === "TAM_DUNG" && "Đang tạm dừng tính hạn (khoảng không tính chưa có ngày kết thúc)."}
                  {th.khongTinh > 0 && <div className="chu-nho">Đã lùi hạn {th.khongTinh} {han.loai === "NLV" ? "ngày làm việc" : "ngày"} theo thời gian không tính.</div>}
                  {th.thieuLich.length > 0 && <div className="chu-nho">Chưa xác nhận lịch ngày nghỉ năm {th.thieuLich.join(", ")} — hạn chỉ trừ thứ Bảy, Chủ nhật (Cài đặt chung → Lịch ngày nghỉ).</div>}
                </div>
              </div>
            )}
            <O nhan="Trạng thái">
              <Chon value={bh.trangThai} onChange={(e) => datBuoc({ trangThai: e.target.value as TrangThaiBuoc })}>
                {Object.entries(TEN_TRANG_THAI_BUOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Chon>
            </O>
            <O nhan="Ngày thực hiện / hoàn thành"><ONgay value={bh.ngay ?? ""} onChange={(e) => datBuoc({ ngay: e.target.value })} /></O>
            <O nhan="Nội dung thực hiện, ghi chú, số văn bản"><textarea rows={3} value={bh.ghiChu ?? ""} onChange={(e) => datBuoc({ ghiChu: e.target.value })} /></O>
            {b.ma === "7" && <KhungYKienPA h={h} duAn={duAn} doi={doi} soanMau={soanMau} />}
            <O nhan="Khó khăn, vướng mắc ở bước này" goiY="vd. Không nhất trí đơn giá, đề nghị xem xét lại; chưa nhận tiền; tranh chấp ranh giới… Có nội dung → hộ ở trạng thái Vướng mắc, hiện trong cảnh báo và báo cáo.">
              <textarea rows={3} className={bh.vuongMac ? "o-vuong-mac" : ""} value={bh.vuongMac ?? ""} placeholder="Để trống nếu không có" onChange={(e) => datBuoc({ vuongMac: e.target.value || undefined, vuongMacNgay: e.target.value ? bh.vuongMacNgay ?? homNayIso() : undefined })} />
            </O>
            {bh.vuongMac && (
              <div className="nhom-nut">
                <span className="chu-nho mo">Ghi từ {ngayVN(bh.vuongMacNgay)}</span>
                <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={giaiQuyet}>Đã giải quyết (ghi nhật ký)</button>
              </div>
            )}
            <div className="nhom-nut">
              <button className="nut" disabled={bh.trangThai === "CHO_DUYET" || bh.trangThai === "XONG" || !quyen("GUI_DUYET")} onClick={() => doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`)}>Gửi duyệt</button>
              <button className="nut nut-chinh" disabled={bh.trangThai === "XONG" || !!loiDuyet} title={loiDuyet ?? undefined} onClick={() => doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`)}>Xác nhận hoàn thành</button>
              {b.tuyChon && bh.trangThai !== "KHONG_AP_DUNG" && (
                <button className="nut" disabled={!quyen("DUYET_BUOC")} title="Bước tùy chọn không phát sinh với hộ này — không tính vào tiến độ; bắt buộc lý do" onClick={khongApDung}>Không áp dụng</button>
              )}
            </div>
            {bh.trangThai === "KHONG_AP_DUNG" && <div className="thong-bao">Không áp dụng: {bh.ghiChu || "—"}{bh.duyetBoi ? ` (${bh.duyetBoi})` : ""}</div>}
            <div className="mo chu-nho">
              {bh.guiBoi && <>Gửi duyệt: <b>{bh.guiBoi}</b>. </>}
              {bh.duyetBoi && <>Xác nhận: <b>{bh.duyetBoi}</b>. </>}
              {!daQuaBuoc(bh.trangThai) && loiDuyet && <>{loiDuyet}.</>}
            </div>
            {DANH_MUC_MAU.some((m) => m.buoc === b.ma) && (
              <div>
                <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 4 }}>Soạn mẫu biểu của bước</div>
                <div className="nhom-nut">
                  {DANH_MUC_MAU.filter((m) => m.buoc === b.ma).map((m) => (
                    <button key={m.ma} className="nut nut-nho" title={m.ten} onClick={() => soanMau(m.ma)}>Mẫu {m.ma}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { ONgay } from "./ONgay";
import { Fragment, useEffect, useMemo, useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import type { KetQuaHo } from "../tinh-ho";
import type { DuAn, Ho } from "../mo-hinh";
import { HopThoai, O } from "./chung";
import { xuatExcelChiTra, xuatExcelDuAn, xuatPhieuDoiChieu } from "../xuat-excel";
import { useMauExcel } from "./MauExcel";
import { homNayIso } from "../trang-thai";
import { xuatTienDoThuTuc } from "../tien-do-thu-tuc";
import { GOI_CO_SAN } from "../goi-chinh-sach";
import { CAN_CU_TRUOC_THAM_DINH, kiemTraTruocThamDinh } from "../thu-tuc-ban";
import { hanGuiQdBan, hanPheDuyetBan, hanThamDinhBan, ngayToTrinhPA, type TinhHan } from "../han-buoc";
import { hoHieuLuc } from "../mo-hinh";
import { ngayChu } from "../van-ban/du-lieu";
import {
  moTaBan,
  chotPhuongAn,
  chupHo,
  duAnTheoBan,
  hoChuaDuDieuKien,
  hoDaPheDuyet,
  hoLechSauPheDuyet,
  huyBan,
  kiemTraToanVen,
  pheDuyet,
  boSungQd,
  canhBaoTruocPheDuyet,
  ghiThamDinh,
  tenTrangThai,
  TEN_Y_KIEN_TD,
  type YKienThamDinh,
  dotPheDuyet,
  moTaQd,
  soSanh,
  tinhLaiBan,
  type LoaiThayDoi,
  type PhienBanPA,
} from "../phuong-an";
import { Chon } from "./Chon";
import { coDot, dsDot, tenDot, timDot } from "../dot-thu-hoi";
import { QUY_TAC_SOAT, TEN_MUC_SOAT, demSoat, soatPhuongAn, type KetQuaSoat } from "../soat-phuong-an";

const dong = (x: string | null | undefined) => (x == null ? "—" : dinhDang(D(x), 0));
const dau = (x: string) => (D(x).gt(0) ? "+" : "") + dinhDang(D(x), 0);
const NHAN_TT: Record<string, string> = { DA_CHOT: "nhan-vang", DA_PHE_DUYET: "nhan-xanh", DA_HUY: "nhan-xam" };
const TEN_LOAI: Record<LoaiThayDoi, [string, string]> = { THEM: ["Thêm", "nhan-tim"], BO: ["Bỏ", "nhan-xam"], TANG: ["Tăng", "nhan-vang"], GIAM: ["Giảm", "nhan-do"], GIU: ["Không đổi", "nhan-xanh"] };

/** Thẻ "Phương án – phiên bản" trên màn Dự án. */
export function ThePhuongAn({ duAn, kq }: { duAn: DuAn; kq: { h: Ho; k: KetQuaHo }[] }) {
  const { chinhSach, luuDuAn, luuHo, luuNhieuHo, nguoiDung, quyen, ghiNhatKy, tyLeCham, nguongLechDt, nguoiCoDat, lich, bao } = useUngDung();
  const ds = useMemo(() => [...(duAn.phuongAn ?? [])].sort((a, b) => b.so - a.so), [duAn.phuongAn]);
  /** Lưu bản đã ghi nhận/bổ sung QĐ; ghi số, ngày (ô có giá trị) vào văn bản dự án hoặc của đợt (P3-1). */
  const ghiQd = async (d: PhienBanPA, ghiVanBan: boolean) => {
    const vbQd = { ...(d.pheDuyet!.so ? { qd_phe_duyet_so: d.pheDuyet!.so } : {}), ...(d.pheDuyet!.ngay ? { qd_phe_duyet_ngay: ngayChu(d.pheDuyet!.ngay) } : {}) };
    const coGhi = ghiVanBan && Object.keys(vbQd).length > 0;
    const dotGhi = coGhi && d.dotId ? timDot(duAn, d.dotId) : undefined;
    const vanBan = coGhi && !dotGhi ? { ...(duAn.vanBan ?? {}), ...vbQd } : duAn.vanBan;
    const dotThuHoi = dotGhi ? duAn.dotThuHoi!.map((x) => (x.id === dotGhi.id ? { ...x, vanBan: { ...(x.vanBan ?? {}), ...vbQd } } : x)) : duAn.dotThuHoi;
    await luuDuAn({ ...duAn, vanBan, dotThuHoi, phuongAn: (duAn.phuongAn ?? []).map((x) => (x.id === d.id ? d : x)) }, "PHE_DUYET_PA");
  };
  const [hop, setHop] = useState<null | { loai: "chot" } | { loai: "soat" } | { loai: "duyet" | "huy" | "xem" | "bo-sung" | "tham-dinh"; p: PhienBanPA } | { loai: "nhan-ho-so"; p: PhienBanPA; buoc: "8" | "9" } | { loai: "so-sanh"; a?: string; b?: string }>(null);
  const [toanVen, setToanVen] = useState<Record<string, boolean>>({});
  const [loi, setLoi] = useState("");
  const lech = hoLechSauPheDuyet(ds, kq);

  useEffect(() => {
    let huy = false;
    void Promise.all(ds.map(async (p) => [p.id, await kiemTraToanVen(p)] as const)).then((r) => !huy && setToanVen(Object.fromEntries(r)));
    return () => {
      huy = true;
    };
  }, [ds]);

  const capNhat = async (p: PhienBanPA) => luuDuAn({ ...duAn, phuongAn: (duAn.phuongAn ?? []).map((x) => (x.id === p.id ? p : x)) }, "HUY_PA");

  const docMauExcel = useMauExcel();
  const xuat = async (p: PhienBanPA) => {
    setLoi("");
    const r = tinhLaiBan(chinhSach(duAnTheoBan(duAn, p)), duAn, p);
    if (r.lech.length) {
      setLoi(`Không xuất bản ${p.so}: tính lại từ dữ liệu đã đóng băng khác số đã chốt (${r.lech.map((x) => `${x.ma}: ${dong(x.daChot)} → ${dong(x.tinhLai)}`).join("; ")}). Cách tính trong phần mềm hoặc bộ chính sách đã thay đổi sau khi chốt — cần kiểm tra trước khi dùng.`);
      return;
    }
    await xuatExcelDuAn({ ...duAnTheoBan(duAn, p), ten: `${duAn.ten} - PA ${p.so}` }, r.ds, moTaBan(p), await docMauExcel());
  };

  return (
    <div className="the mb-14" id="the-phuong-an">
      <div className="the-dau">
        <h2>Phương án – phiên bản</h2>
        <span className="mo chu-nho">Chốt để đóng băng số liệu; phê duyệt ghi theo quyết định; mọi thay đổi sau đó lập bản điều chỉnh</span>
        <div className="phai">
          <button className="nut" disabled={kq.length === 0} title="Nghiệm thu: số phần mềm tính từng khoản, cột nhập số phương án đã được phê duyệt thực tế, tự tính chênh lệch" onClick={() => void xuatPhieuDoiChieu(duAn, kq)}>Phiếu đối chiếu</button>
          <button className="nut" disabled={!ds.some((p) => p.trangThai === "DA_PHE_DUYET")} title="Phải trả, đã chi, còn lại, tiền chậm trả tạm tính theo bản đã phê duyệt" onClick={() => void xuatExcelChiTra(duAn, kq.map((x) => x.h), tyLeCham, homNayIso())}>Theo dõi chi trả (Excel)</button>
          <button className="nut" disabled={kq.length === 0} title="Kiểm tra chéo hồ sơ trước khi chốt: DT thu hồi, thửa trùng, khoản thiếu căn cứ, TĐC, ổn định đời sống…" onClick={() => setHop({ loai: "soat" })}>Soát phương án</button>
          <button className="nut" disabled={ds.length === 0} onClick={() => setHop({ loai: "so-sanh" })}>So sánh</button>
          <button className="nut" disabled={ds.length === 0} title="Mỗi bản một dòng: nhận hồ sơ, thẩm định, tờ trình, phê duyệt, gửi QĐ, chi trả, chỉnh lý hồ sơ địa chính, bàn giao — hạn và số ngày chậm" onClick={async () => { if (await xuatTienDoThuTuc(duAn, kq.map((x) => hoHieuLuc(duAn, x.h)), homNayIso(), lich)) bao("Đã xuất tiến độ thủ tục phương án"); }}>Tiến độ thủ tục (Excel)</button>
          {quyen("CHOT_PA") && <button className="nut nut-chinh" disabled={kq.length === 0} onClick={() => setHop({ loai: "chot" })}>Chốt phương án…</button>}
        </div>
      </div>
      {lech.length > 0 && (
        <div className="thong-bao thong-bao-do" style={{ margin: "10px 12px 0" }}>
          {lech.length} hộ đã sửa hồ sơ sau khi phương án được phê duyệt (tạm tính hiện tại khác số đã duyệt): {lech.map((l) => `${l.h.ma} (${dong(l.daDuyet)} → ${dong(l.hienTai)}, bản ${l.ban.so})`).join("; ")}. Nếu thay đổi là đúng, cần lập phương án điều chỉnh, bổ sung.
        </div>
      )}
      {loi && <div className="thong-bao thong-bao-do" style={{ margin: "10px 12px 0" }}>{loi}</div>}
      {ds.length === 0 ? (
        <div className="trong">Chưa có phiên bản nào. Số liệu đang là tạm tính, thay đổi theo hồ sơ.</div>
      ) : (
        <div className="bang-cuon">
          <table className="bang">
            <thead>
              <tr>
                <th>Bản</th><th>Tên</th>{coDot(duAn) && <th>Đợt</th>}<th>Trạng thái</th><th className="so">Số hộ</th><th className="so">Tổng giá trị (đ)</th><th>Chốt lúc</th><th>Quyết định phê duyệt</th><th>Toàn vẹn</th><th />
              </tr>
            </thead>
            <tbody>
              {ds.map((p) => (
                <tr key={p.id}>
                  <td>{p.so}</td>
                  <td>{p.ten}{p.lyDo && <div className="mo chu-nho">Lý do: {p.lyDo}</div>}{p.huy && <div className="mo chu-nho">Hủy: {p.huy.lyDo}</div>}</td>
                  {coDot(duAn) && <td className="chu-nho">{p.dotId ? tenDot(timDot(duAn, p.dotId)) === "Chưa xếp đợt" ? p.dotTen ?? "—" : tenDot(timDot(duAn, p.dotId)) : "Cả dự án"}</td>}
                  <td>
                    <span className={`nhan ${p.trangThai === "DA_CHOT" && p.thamDinh ? (p.thamDinh.yKien === "KHONG_THONG_NHAT" ? "nhan-do" : "nhan-tim") : NHAN_TT[p.trangThai]}`} data-tt-pa={p.so}>{tenTrangThai(p)}</span>
                    {p.thamDinh && <div className="mo chu-nho">Thẩm định: {moTaQd(p.thamDinh)}{p.thamDinh.coQuan ? ` (${p.thamDinh.coQuan})` : ""}</div>}
                    {(() => {
                      // 1.0.12: hạn thẩm định ≤ 30 ngày từ ngày nhận đủ hồ sơ (k3 Đ3 NĐ 88/2024);
                      // 1.0.13: hạn phê duyệt ≤ 5 NLV từ ngày nhận tờ trình (điểm c k3 Đ87 LĐĐ 2024) — mặc định ngày tờ trình mẫu 13 / R4
                      const hos = kq.map((x) => hoHieuLuc(duAn, x.h));
                      const ttr = ngayToTrinhPA(duAn, p);
                      const td = hanThamDinhBan(p, hos, homNayIso(), lich);
                      const pd = hanPheDuyetBan(p, hos, homNayIso(), lich, ttr);
                      const gq = hanGuiQdBan(p, hos, homNayIso(), lich);
                      const ngay = (s: string) => s.split("-").reverse().join("/");
                      const dong = (t: TinhHan, ten: string, chuaMoc: string, buoc: "8" | "9", nutMoi: string, nutSua: string, data: Record<string, number>) => {
                        const lop = t.trangThai === "QUA_HAN" ? "nhan-do" : t.trangThai === "SAP_HET" ? "nhan-vang" : "";
                        return (
                          <div className="chu-nho" {...data} title={t.han.canCu}>
                            {t.trangThai === "CHUA_CO_MOC" ? <span className="mo">{ten}: {chuaMoc}</span>
                              : t.trangThai === "TAM_DUNG" ? <span className="mo">{ten}: tạm dừng (thời gian không tính)</span>
                              : <span className={lop ? `nhan ${lop}` : "mo"}>{ten} {ngay(t.hanChot!)}{t.trangThai === "QUA_HAN" ? " — quá hạn" : t.conLai !== null ? ` (còn ${t.conLai} NLV)` : ""}</span>}
                            {quyen("SUA_HO_SO") && <> <button className="nut nut-chu nut-nho" onClick={() => setHop({ loai: "nhan-ho-so", p, buoc })}>{t.moc ? nutSua : nutMoi}</button></>}
                          </div>
                        );
                      };
                      return (
                        <>
                          {td && dong(td, "Hạn thẩm định", "chưa ghi ngày nhận đủ hồ sơ", "8", "Ngày nhận đủ hồ sơ…", "Sửa ngày nhận hồ sơ…", { "data-han-td": p.so })}
                          {gq && gq.hanChot && (
                            <div className="chu-nho" data-han-gq={p.so} title={gq.han.canCu}>
                              <span className={gq.trangThai === "QUA_HAN" ? "nhan nhan-do" : gq.trangThai === "SAP_HET" ? "nhan nhan-vang" : "mo"}>
                                Hạn gửi QĐ đến từng người {gq.hanChot.split("-").reverse().join("/")}{gq.trangThai === "QUA_HAN" ? " — quá hạn" : gq.conLai !== null ? ` (còn ${gq.conLai} NLV)` : ""}
                              </span>
                              <span className="mo"> · xác nhận bước 11 ở Tiến độ (Cập nhật tiến độ nhiều hộ)</span>
                            </div>
                          )}
                          {pd && dong(pd, "Hạn phê duyệt", "chưa có ngày tờ trình (soạn mẫu 13 / R4 có số, ngày hoặc ghi ngày nhận tờ trình)", "9", "Ngày nhận tờ trình…", "Sửa ngày nhận tờ trình…", { "data-han-pd": p.so })}
                        </>
                      );
                    })()}
                  </td>
                  <td className="so">{p.ho.length}</td>
                  <td className="so">{dong(p.tong)}</td>
                  <td className="chu-nho">{new Date(p.luc).toLocaleString("vi-VN", { hour12: false })}<div className="mo">{p.nguoi}</div></td>
                  <td className="chu-nho">{p.pheDuyet ? <>Đợt {dotPheDuyet(duAn.phuongAn ?? [], p)} · {moTaQd(p.pheDuyet)}{p.pheDuyet.coQuan ? ` (${p.pheDuyet.coQuan})` : ""}{(!p.pheDuyet.so || !p.pheDuyet.ngay) && quyen("PHE_DUYET_PA") && <div><button className="nut nut-chu nut-nho" onClick={() => setHop({ loai: "bo-sung", p })}>Bổ sung số, ngày QĐ…</button></div>}</> : "—"}</td>
                  <td>{toanVen[p.id] === undefined ? "…" : toanVen[p.id] ? <span className="nhan nhan-xanh">Khớp</span> : <span className="nhan nhan-do" title="Mã băm không khớp: số liệu bản chốt đã bị sửa ngoài phần mềm">Không khớp</span>}</td>
                  <td className="khong-xuong-dong">
                    <button className="nut nut-nho" onClick={() => setHop({ loai: "xem", p })}>Xem</button>{" "}
                    <button className="nut nut-nho" onClick={() => void xuat(p)}>Excel</button>{" "}
                    {p.trangThai === "DA_CHOT" && (
                      <>
                        {quyen("PHE_DUYET_PA") && (!p.thamDinh || !p.thamDinh.so || !p.thamDinh.ngay) && <><button className="nut nut-nho" disabled={!toanVen[p.id]} title="Ghi nhận báo cáo/văn bản thẩm định phương án (khoản 3 Điều 3 Nghị định 88/2024/NĐ-CP)" onClick={() => setHop({ loai: "tham-dinh", p })}>{p.thamDinh ? "Bổ sung thẩm định…" : "Thẩm định…"}</button>{" "}</>}
                        {quyen("PHE_DUYET_PA") && <><button className="nut nut-nho nut-chinh" disabled={!toanVen[p.id]} onClick={() => setHop({ loai: "duyet", p })}>Phê duyệt…</button>{" "}</>}
                        {quyen("HUY_PA") && <button className="nut nut-nho nut-nguy" onClick={() => setHop({ loai: "huy", p })}>Hủy…</button>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hop?.loai === "soat" && (
        <HopThoai tieuDe="Soát phương án" dong={() => setHop(null)} rong={1000}>
          <KetQuaSoatPA ds={soatPhuongAn(duAn, kq, nguongLechDt, nguoiCoDat, lich)} duAnId={duAn.id} />
          <details className="mt-10">
            <summary className="mo">Các quy tắc đã soát ({QUY_TAC_SOAT.length})</summary>
            <table className="bang"><tbody>{QUY_TAC_SOAT.map((q) => <tr key={q.ma}><td>{q.ten}</td><td className="chu-nho">{q.canCu}</td></tr>)}</tbody></table>
          </details>
        </HopThoai>
      )}
      {hop?.loai === "chot" && <HopChot duAn={duAn} kq={kq} dong={() => setHop(null)} />}
      {hop?.loai === "duyet" && (
        <HopPheDuyet
          duAn={duAn}
          p={hop.p}
          dong={() => setHop(null)}
          luu={async (qd, ghiVanBan) => {
            const d = pheDuyet(hop.p, { ...qd, dot: dotPheDuyet(duAn.phuongAn ?? [], hop.p) }, nguoiDung);
            await ghiQd(d, ghiVanBan);
            await ghiNhatKy("Ghi nhận phê duyệt phương án", `${duAn.ten} – bản ${d.so}, đợt ${d.pheDuyet!.dot}: ${moTaQd(d.pheDuyet)}; ${d.ho.length} hộ, ${dong(d.tong)} đ`);
            for (const x of d.ho) {
              const h = kq.find((y) => y.h.id === x.hoId)?.h;
              if (h) await luuHo(h, `Phương án bản ${d.so} được phê duyệt (đợt ${d.pheDuyet!.dot}): ${moTaQd(d.pheDuyet)}; giá trị ${dong(x.tong)} đ`);
            }
          }}
        />
      )}
      {hop?.loai === "bo-sung" && (
        <HopPheDuyet
          duAn={duAn}
          p={hop.p}
          boSung
          dong={() => setHop(null)}
          luu={async (qd, ghiVanBan) => {
            const d = boSungQd(hop.p, qd);
            await ghiQd(d, ghiVanBan);
            await ghiNhatKy("Bổ sung số, ngày QĐ phê duyệt phương án", `${duAn.ten} – bản ${d.so}: ${moTaQd(d.pheDuyet)}`);
          }}
        />
      )}
      {hop?.loai === "tham-dinh" && (
        <HopThamDinh
          p={hop.p}
          canhBao={hop.p.thamDinh ? [] : kiemTraTruocThamDinh(duAn, hop.p, kq.map((x) => hoHieuLuc(duAn, x.h)), null, homNayIso(), lich)}
          dong={() => setHop(null)}
          luu={async (td) => {
            const d = ghiThamDinh(hop.p, td, nguoiDung);
            // cơ quan thẩm định điền sẵn cho các mẫu văn bản (ô "Cơ quan chủ trì thẩm định") nếu còn trống
            const vanBan = !duAn.vanBan?.co_quan_tham_dinh?.trim() && d.thamDinh!.coQuan ? { ...(duAn.vanBan ?? {}), co_quan_tham_dinh: d.thamDinh!.coQuan } : duAn.vanBan;
            await luuDuAn({ ...duAn, vanBan, phuongAn: (duAn.phuongAn ?? []).map((x) => (x.id === d.id ? d : x)) }, "PHE_DUYET_PA");
            await ghiNhatKy(hop.p.thamDinh ? "Bổ sung kết quả thẩm định phương án" : "Ghi nhận thẩm định phương án", `${duAn.ten} – bản ${d.so}: ${TEN_Y_KIEN_TD[d.thamDinh!.yKien]}; ${moTaQd(d.thamDinh)}${d.thamDinh!.coQuan ? ` của ${d.thamDinh!.coQuan}` : ""}`);
          }}
        />
      )}
      {hop?.loai === "nhan-ho-so" && (
        <HopNhanHoSo
          p={hop.p}
          buoc={hop.buoc}
          canhBao={hop.buoc === "8" ? (ngay) => kiemTraTruocThamDinh(duAn, hop.p, kq.map((x) => hoHieuLuc(duAn, x.h)), ngay || null, homNayIso(), lich) : undefined}
          ngayDau={kq.find((x) => hop.p.ho.some((y) => y.hoId === x.h.id) && x.h.tienDo[hop.buoc]?.mocHan)?.h.tienDo[hop.buoc]?.mocHan ?? (hop.buoc === "9" ? ngayToTrinhPA(duAn, hop.p) ?? "" : "")}
          dong={() => setHop(null)}
          luu={async (ngay) => {
            const ids = new Set(hop.p.ho.map((x) => x.hoId));
            const ds = kq.filter((x) => ids.has(x.h.id)).map(({ h }) => ({
              h: { ...h, tienDo: { ...h.tienDo, [hop.buoc]: { ...(h.tienDo[hop.buoc] ?? { trangThai: "CHUA" as const }), mocHan: ngay || undefined } } },
              nhatKy: `${ngay ? "" : "Bỏ "}${hop.buoc === "8" ? "ngày nhận đủ hồ sơ thẩm định" : "ngày nhận tờ trình phê duyệt"} phương án (bản ${hop.p.so})${ngay ? `: ${ngay.split("-").reverse().join("/")}` : ""}`.replace(/^n/, "N"),
            }));
            const r = await luuNhieuHo(ds);
            if (r.loi.length) return bao(r.loi.join("; "), "loi");
            bao(`Đã ghi ${hop.buoc === "8" ? "ngày nhận đủ hồ sơ thẩm định" : "ngày nhận tờ trình phê duyệt"} cho ${r.daLuu} hộ của bản ${hop.p.so}`);
          }}
        />
      )}
      {hop?.loai === "huy" && <HopHuy p={hop.p} dong={() => setHop(null)} luu={async (lyDo) => { await capNhat(huyBan(hop.p, lyDo, nguoiDung)); await ghiNhatKy("Hủy bản phương án", `${duAn.ten} – bản ${hop.p.so}: ${lyDo}`); }} />}
      {hop?.loai === "xem" && <HopXem p={hop.p} dong={() => setHop(null)} />}
      {hop?.loai === "so-sanh" && <HopSoSanh ds={ds} kq={kq} dong={() => setHop(null)} />}
    </div>
  );
}

/** Hộp chốt phương án; `chonDau`: các hồ sơ đã chọn ở danh sách hộ (mở từ "Chốt phương án các hồ sơ đã chọn"). */
export function HopChotPhuongAn(p: { duAn: DuAn; kq: { h: Ho; k: KetQuaHo }[]; dong: () => void; chonDau?: string[] }) {
  return <HopChot {...p} />;
}

function HopChot({ duAn, kq: kqDuAn, dong: dongHop, chonDau }: { duAn: DuAn; kq: { h: Ho; k: KetQuaHo }[]; dong: () => void; chonDau?: string[] }) {
  const { chinhSach, luuDuAn, nguoiDung, ghiNhatKy, nguongLechDt, nguoiCoDat, lich } = useUngDung();
  // P3-1: dự án có đợt → phương án chốt theo đợt, chỉ gồm hộ thuộc đợt
  const coDotTH = coDot(duAn);
  const [dotId, setDotId] = useState(() => (chonDau?.length ? kqDuAn.find(({ h }) => chonDau.includes(h.id) && h.dotId)?.h.dotId : undefined) ?? dsDot(duAn)[0]?.id ?? "");
  const kqDot = useMemo(() => (coDotTH ? kqDuAn.filter(({ h }) => h.dotId === dotId) : kqDuAn), [kqDuAn, coDotTH, dotId]);
  // Danh sách hộ: mặc định chỉ hộ đã xác nhận hoàn thành bước 5 "Lập phương án" (nếu dự án có dùng tiến độ bước 5);
  // hộ đã có trong bản phê duyệt thì ẩn (bật "Hiện cả hộ đã phê duyệt" khi cần lập bản điều chỉnh)
  const daLapPA = (h: Ho) => h.tienDo["5"]?.trangThai === "XONG";
  const coBuoc5 = kqDot.some(({ h }) => daLapPA(h));
  const daDuyet0 = useMemo(() => hoDaPheDuyet(duAn.phuongAn ?? []), [duAn.phuongAn]);
  // Mở với hồ sơ đã chọn: không lọc theo bước 5; hiện hộ đã phê duyệt nếu có trong lựa chọn (lập bản điều chỉnh)
  const [chiDaLap, setChiDaLap] = useState(chonDau?.length ? false : coBuoc5);
  const [hienDaDuyet, setHienDaDuyet] = useState(!!chonDau?.some((id) => daDuyet0.has(id)));
  const dangCho = useMemo(() => new Map((duAn.phuongAn ?? []).filter((p) => p.trangThai === "DA_CHOT").flatMap((p) => p.ho.map((x) => [x.hoId, p.so] as const))), [duAn.phuongAn]);
  const kq = useMemo(() => kqDot.filter(({ h }) => (!chiDaLap || daLapPA(h)) && (hienDaDuyet || !daDuyet0.has(h.id))), [kqDot, chiDaLap, hienDaDuyet, daDuyet0]);
  const soAnDuyet = kqDot.filter(({ h }) => daDuyet0.has(h.id) && (!chiDaLap || daLapPA(h))).length;
  const soChuaLap = kqDot.filter(({ h }) => !daLapPA(h) && !daDuyet0.has(h.id)).length;
  /** Mặc định chọn: đủ điều kiện, chưa phê duyệt, chưa nằm trong bản đang chờ duyệt */
  const macDinhChon = (ds: { h: Ho }[]) => new Set(ds.filter(({ h }) => !chua.has(h.id) && !daDuyet0.has(h.id) && !dangCho.has(h.id)).map(({ h }) => h.id));
  const soBan = (duAn.phuongAn ?? []).reduce((m, p) => Math.max(m, p.so), 0) + 1;
  const chua = useMemo(() => new Map(hoChuaDuDieuKien(kqDuAn).map((x) => [x.h.id, x.lyDo])), [kqDuAn]);
  const daDuyet = daDuyet0;
  const [chon, setChon] = useState<Set<string>>(() => (chonDau?.length ? new Set(kq.filter(({ h }) => chonDau.includes(h.id) && !chua.has(h.id)).map(({ h }) => h.id)) : macDinhChon(kq)));
  const ngoaiDot = chonDau?.length && coDotTH ? kqDuAn.filter(({ h }) => chonDau.includes(h.id) && h.dotId !== dotId).length : 0;
  const chuaDuDk = chonDau?.length ? kqDuAn.filter(({ h }) => chonDau.includes(h.id) && chua.has(h.id)).length : 0;
  const tenMacDinh = (id: string) => `Phương án bồi thường, hỗ trợ, TĐC${coDotTH ? ` – ${tenDot(timDot(duAn, id))}` : ""} – bản ${soBan}`;
  const [ten, setTen] = useState(() => tenMacDinh(dotId));
  const doiDot = (id: string) => {
    setDotId(id);
    const moi = kqDuAn.filter(({ h }) => h.dotId === id && (!chiDaLap || daLapPA(h)) && (hienDaDuyet || !daDuyet0.has(h.id)));
    setChon(macDinhChon(moi));
    if (ten === tenMacDinh(dotId)) setTen(tenMacDinh(id));
  };
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const dsChon = kq.filter(({ h }) => chon.has(h.id));
  const canLyDo = dsChon.some(({ h }) => daDuyet.has(h.id));
  const tong = dsChon.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0));
  const soat = useMemo(() => soatPhuongAn(duAn, dsChon, nguongLechDt, nguoiCoDat, lich).filter((x) => x.muc !== "THONG_TIN" && x.quyTac !== "KHOAN_CHUA_DU"), [duAn, dsChon, nguongLechDt, nguoiCoDat, lich]);
  const [xemSoat, setXemSoat] = useState(false);

  const chot = async () => {
    setDang(true);
    setLoi("");
    try {
      const p = await chotPhuongAn(chinhSach(duAn), duAn, dsChon.map((x) => x.h), { ten, lyDo, nguoi: nguoiDung, dotId: coDotTH ? dotId : undefined });
      await luuDuAn({ ...duAn, phuongAn: [...(duAn.phuongAn ?? []), p] }, "CHOT_PA");
      await ghiNhatKy("Chốt phương án", `${duAn.ten} – bản ${p.so} "${p.ten}"${p.dotTen ? ` (${p.dotTen})` : ""}: ${p.ho.length} hộ, ${dong(p.tong)} đ${p.lyDo ? `; lý do: ${p.lyDo}` : ""}`);
      dongHop();
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDang(false);
    }
  };

  return (
    <HopThoai
      tieuDe="Chốt phương án"
      dong={dongHop}
      rong={900}
      chan={
        <>
          <span className="mo" style={{ marginRight: "auto" }}>{dsChon.length} hộ · tổng {dinhDang(tong, 0)} đ</span>
          <button className="nut" onClick={dongHop}>Đóng</button>
          <button className="nut nut-chinh" disabled={dang || !dsChon.length || !ten.trim() || (canLyDo && !lyDo.trim())} onClick={chot}>Chốt, đóng băng số liệu</button>
        </>
      }
    >
      <div className="thong-bao thong-bao-xanh">
        Khi chốt, phần mềm lưu bản sao hồ sơ từng hộ, tham số dự án (giá gạo, hạn mức, hệ số giá đất), kết quả từng khoản và mã kiểm tra. Sửa hồ sơ sau đó không làm thay đổi bản đã chốt. Chỉ hộ không còn khoản "Thiếu căn cứ" hoặc "Cần xác nhận" mới được chốt (QD-03).
      </div>
      {soat.length > 0 && (
        <div className="thong-bao thong-bao-vang mt-8">
          Soát phương án các hộ đã chọn: {demSoat(soat).LOI} lỗi, {demSoat(soat).CANH_BAO} mục cần kiểm tra (không chặn chốt).{" "}
          <button className="nut nut-nho" onClick={() => setXemSoat(!xemSoat)}>{xemSoat ? "Ẩn" : "Xem"}</button>
          {xemSoat && <div className="mt-8"><KetQuaSoatPA ds={soat} duAnId={duAn.id} /></div>}
        </div>
      )}
      {chonDau?.length ? (
        <div className="thong-bao thong-bao-xanh mt-8" role="status">
          Mở từ danh sách hộ: đã chọn sẵn {chon.size}/{chonDau.length} hồ sơ đã chọn.
          {chuaDuDk > 0 && ` ${chuaDuDk} hồ sơ chưa đủ điều kiện chốt (còn khoản Thiếu căn cứ/Cần xác nhận) — không chọn được.`}
          {ngoaiDot > 0 && ` ${ngoaiDot} hồ sơ thuộc đợt khác — chốt riêng theo từng đợt.`}
        </div>
      ) : null}
      {coDotTH && (
        <div className="luoi luoi-2 mt-8">
          <O nhan="Đợt thu hồi" goiY="Phương án chốt, phê duyệt theo từng đợt — chỉ hộ thuộc đợt">
            <Chon value={dotId} onChange={(e) => doiDot(e.target.value)} aria-label="Đợt của phương án">
              {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)} ({kqDuAn.filter((x) => x.h.dotId === d.id).length} hộ)</option>)}
            </Chon>
          </O>
          {kqDuAn.some((x) => !x.h.dotId || !timDot(duAn, x.h.dotId)) && <div className="thong-bao thong-bao-vang chu-nho" style={{ alignSelf: "end", marginBottom: 0 }}>{kqDuAn.filter((x) => !x.h.dotId || !timDot(duAn, x.h.dotId)).length} hộ chưa xếp đợt — không đưa vào phương án nào cho đến khi xếp đợt.</div>}
        </div>
      )}
      <div className="luoi luoi-2">
        <O nhan="Tên phiên bản"><input value={ten} onChange={(e) => setTen(e.target.value)} /></O>
        <O nhan={canLyDo ? "Lý do điều chỉnh, bổ sung (bắt buộc)" : "Ghi chú / lý do (nếu có)"} goiY={canLyDo ? "Có hộ đã nằm trong phương án đã phê duyệt" : undefined}>
          <input value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
        </O>
      </div>
      <div className="nhom-nut mt-8" style={{ alignItems: "center" }}>
        <label className="chu-nho" title="Theo tiến độ từng hộ: bước 5 đã được xác nhận hoàn thành"><input type="checkbox" checked={chiDaLap} onChange={(e) => { setChiDaLap(e.target.checked); setChon(macDinhChon(kqDot.filter(({ h }) => (!e.target.checked || daLapPA(h)) && (hienDaDuyet || !daDuyet0.has(h.id))))); }} /> Chỉ hộ đã xác nhận hoàn thành bước 5 “Lập phương án”{soChuaLap && chiDaLap ? ` (ẩn ${soChuaLap} hộ chưa xác nhận)` : ""}</label>
        <label className="chu-nho" title="Hộ đã có trong bản phương án đã phê duyệt — chỉ hiện khi cần lập bản điều chỉnh, bổ sung (bắt buộc lý do)"><input type="checkbox" checked={hienDaDuyet} onChange={(e) => { setHienDaDuyet(e.target.checked); if (!e.target.checked) setChon(new Set([...chon].filter((id) => !daDuyet0.has(id)))); }} /> Hiện cả hộ đã phê duyệt (lập bản điều chỉnh){soAnDuyet && !hienDaDuyet ? ` — đang ẩn ${soAnDuyet} hộ` : ""}</label>
      </div>
      {chiDaLap && !kq.length && <div className="thong-bao thong-bao-vang mt-8">Chưa có hộ nào {coDotTH ? "trong đợt này " : ""}được xác nhận hoàn thành bước 5 “Lập phương án” (hoặc đã phê duyệt hết). Bỏ đánh dấu “Chỉ hộ đã xác nhận…” để xem mọi hộ.</div>}
      <table className="bang mt-10">
        <thead>
          <tr>
            <th><input type="checkbox" aria-label="Chọn tất cả hộ đủ điều kiện" checked={dsChon.length > 0 && dsChon.length === kq.filter(({ h }) => !chua.has(h.id)).length} onChange={(e) => setChon(new Set(e.target.checked ? kq.filter(({ h }) => !chua.has(h.id) && (hienDaDuyet || !daDuyet0.has(h.id))).map(({ h }) => h.id) : []))} /></th>
            <th>Mã</th><th>Họ tên / tổ chức</th><th className="so">Tổng tạm tính (đ)</th><th>Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          {kq.map(({ h, k }) => (
            <tr key={h.id} className={daDuyet.has(h.id) ? "mo" : undefined}>
              <td><input type="checkbox" disabled={chua.has(h.id)} checked={chon.has(h.id)} onChange={(e) => { const s = new Set(chon); if (e.target.checked) s.add(h.id); else s.delete(h.id); setChon(s); }} /></td>
              <td>{h.ma}</td>
              <td>{h.ten}</td>
              <td className="so">{dinhDang(k.tong.tongLamTron, 0)}</td>
              <td>
                {chua.has(h.id) ? <span className="nhan nhan-do">Chưa chốt được: {chua.get(h.id)}</span> : <span className="nhan nhan-xanh">Đủ điều kiện</span>}
                {daDuyet.has(h.id) && <span className="nhan nhan-tim" style={{ marginLeft: 4 }}>Đã có trong bản duyệt {daDuyet.get(h.id)!.so}</span>}
                {dangCho.has(h.id) && <span className="nhan nhan-vang" style={{ marginLeft: 4 }}>Đang trong bản {dangCho.get(h.id)} chờ duyệt</span>}
                {!chiDaLap && coBuoc5 && !daLapPA(h) && <span className="nhan" style={{ marginLeft: 4 }}>Chưa xác nhận bước 5</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
    </HopThoai>
  );
}

function HopPheDuyet({ duAn, p, boSung, dong: dongHop, luu }: { duAn: DuAn; p: PhienBanPA; boSung?: boolean; dong: () => void; luu: (qd: { so: string; ngay: string; coQuan: string }, ghiVanBan: boolean) => Promise<void> }) {
  const [so, setSo] = useState(boSung ? p.pheDuyet?.so ?? "" : ((p.dotId ? timDot(duAn, p.dotId)?.vanBan?.qd_phe_duyet_so : duAn.vanBan?.qd_phe_duyet_so) ?? ""));
  const [ngay, setNgay] = useState(boSung ? p.pheDuyet?.ngay ?? "" : "");
  const [coQuan, setCoQuan] = useState(boSung && p.pheDuyet?.coQuan ? p.pheDuyet.coQuan : `UBND ${duAn.xa.replace(/^(Xã|Phường) /, (m) => m.toLowerCase())}`);
  const dot = dotPheDuyet(duAn.phuongAn ?? [], p);
  const tenDotThuHoi = p.dotId ? (tenDot(timDot(duAn, p.dotId)) === "Chưa xếp đợt" ? p.dotTen : tenDot(timDot(duAn, p.dotId))) : undefined;
  const [ghi, setGhi] = useState(true);
  const [loi, setLoi] = useState("");
  return (
    <HopThoai
      tieuDe={`${boSung ? "Bổ sung số, ngày QĐ phê duyệt" : "Ghi nhận phê duyệt"} – đợt ${dot}${tenDotThuHoi ? ` (${tenDotThuHoi})` : ""}`}
      dong={dongHop}
      rong={620}
      chan={
        <>
          <button className="nut" onClick={dongHop}>Đóng</button>
          <button className="nut nut-chinh" disabled={boSung && ((!!p.pheDuyet?.so || !so.trim()) && (!!p.pheDuyet?.ngay || !ngay))} onClick={async () => { try { await luu({ so, ngay, coQuan }, ghi); dongHop(); } catch (e) { setLoi((e as Error).message); } }}>{boSung ? "Lưu bổ sung" : "Ghi nhận phê duyệt"}</button>
        </>
      }
    >
      {!boSung && canhBaoTruocPheDuyet(p) && <div className="thong-bao thong-bao-vang chu-nho mb-8" role="status" data-canh-bao-td>{canhBaoTruocPheDuyet(p)}</div>}
      <p className="mt-0"><b>Đợt phê duyệt {dot}</b> · bản phương án {p.so}{tenDotThuHoi ? ` · ${tenDotThuHoi}` : ""} · {p.ho.length} hộ · {dong(p.tong)} đ</p>
      <p className="mo mt-0">
        Phần mềm chỉ <b>ghi nhận</b> quyết định phê duyệt đã được cấp có thẩm quyền ký ban hành (Sổ tay QĐ 1966/QĐ-UBND). Sau khi ghi nhận, bản {p.so} ({p.ho.length} hộ, {dong(p.tong)} đ) không sửa, không hủy được.
      </p>
      <div className="luoi luoi-2">
        <O nhan="Số quyết định (có thể bổ sung sau)"><input value={so} placeholder="…/QĐ-UBND" disabled={boSung && !!p.pheDuyet?.so} onChange={(e) => setSo(e.target.value)} /></O>
        <O nhan="Ngày quyết định (có thể bổ sung sau)"><ONgay value={ngay} disabled={boSung && !!p.pheDuyet?.ngay} onChange={(e) => setNgay(e.target.value)} /></O>
      </div>
      {(!so.trim() || !ngay) && <div className="thong-bao thong-bao-vang chu-nho mt-8" role="status">Chưa có {!so.trim() && !ngay ? "số, ngày" : !so.trim() ? "số" : "ngày"} quyết định — vẫn ghi nhận được; bổ sung sau bằng nút “Bổ sung số, ngày QĐ…” ở bảng phương án. Văn bản các bước sau để trống số, ngày QĐ; chưa có ngày QĐ thì chưa tính được hạn chi trả 30 ngày (điểm a khoản 3 Điều 94 Luật Đất đai 2024).</div>}
      <O nhan="Cơ quan ban hành"><input value={coQuan} onChange={(e) => setCoQuan(e.target.value)} /></O>
      <label style={{ display: "block", marginTop: 8 }}>
        <input type="checkbox" checked={ghi} onChange={(e) => setGhi(e.target.checked)} /> Ghi số, ngày quyết định vào thông tin văn bản của dự án (làm căn cứ cho Mẫu 16 và các mẫu sau)
      </label>
      {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
    </HopThoai>
  );
}

/** 1.0.17: cảnh báo trước thẩm định (niêm yết 30 ngày, ý kiến, đối thoại) — chỉ nhắc, không chặn. */
function CanhBaoTruocTd({ ds }: { ds: string[] }) {
  if (!ds.length) return null;
  return (
    <div className="thong-bao thong-bao-vang chu-nho mb-8" role="status" data-kiem-tra-td>
      <b>Kiểm tra trước thẩm định ({CAN_CU_TRUOC_THAM_DINH}):</b>
      <ul className="mt-4 mb-0">{ds.map((x) => <li key={x}>{x}</li>)}</ul>
    </div>
  );
}

function HopThamDinh({ p, canhBao, dong: dongHop, luu }: { p: PhienBanPA; canhBao: string[]; dong: () => void; luu: (td: { so: string; ngay: string; coQuan: string; yKien: YKienThamDinh; noiDung?: string }) => Promise<void> }) {
  const c = p.thamDinh;
  const [so, setSo] = useState(c?.so ?? "");
  const [ngay, setNgay] = useState(c?.ngay ?? "");
  const [coQuan, setCoQuan] = useState(c?.coQuan ?? "");
  const [yKien, setYKien] = useState<YKienThamDinh>(c?.yKien ?? "THONG_NHAT");
  const [noiDung, setNoiDung] = useState(c?.noiDung ?? "");
  const [loi, setLoi] = useState("");
  return (
    <HopThoai
      tieuDe={`${c ? "Bổ sung kết quả thẩm định" : "Ghi nhận thẩm định"} – bản ${p.so}`}
      dong={dongHop}
      rong={620}
      chan={
        <>
          <button className="nut" onClick={dongHop}>Đóng</button>
          <button className="nut nut-chinh" disabled={!coQuan.trim()} onClick={async () => { try { await luu({ so, ngay, coQuan, yKien, noiDung }); dongHop(); } catch (e) { setLoi((e as Error).message); } }}>{c ? "Lưu bổ sung" : "Ghi nhận thẩm định"}</button>
        </>
      }
    >
      <p className="mo mt-0">
        Ghi theo báo cáo/văn bản thẩm định phương án của cơ quan chuyên môn (khoản 3 Điều 3 Nghị định 88/2024/NĐ-CP; Mục XII Sổ tay — thời hạn thẩm định theo docs/05: không quá 30 ngày kể từ khi nhận đủ hồ sơ). Phần mềm chỉ ghi nhận, không tự kết luận. Đã ghi thì không sửa ý kiến, ô đã điền; thẩm định lại = hủy bản, lập bản mới.
      </p>
      <CanhBaoTruocTd ds={canhBao} />
      <div className="luoi luoi-2">
        <O nhan="Số báo cáo/văn bản thẩm định (có thể bổ sung sau)"><input value={so} placeholder="…/BC-…" disabled={!!c?.so} onChange={(e) => setSo(e.target.value)} /></O>
        <O nhan="Ngày (có thể bổ sung sau)"><ONgay value={ngay} disabled={!!c?.ngay} onChange={(e) => setNgay(e.target.value)} /></O>
      </div>
      <O nhan="Cơ quan thẩm định"><input value={coQuan} disabled={!!c?.coQuan} placeholder="vd. Phòng Kinh tế xã …" onChange={(e) => setCoQuan(e.target.value)} /></O>
      <O nhan="Ý kiến thẩm định">
        <select value={yKien} disabled={!!c} onChange={(e) => setYKien(e.target.value as YKienThamDinh)} aria-label="Ý kiến thẩm định">
          {(Object.keys(TEN_Y_KIEN_TD) as YKienThamDinh[]).map((k) => <option key={k} value={k}>{TEN_Y_KIEN_TD[k]}</option>)}
        </select>
      </O>
      <O nhan="Tóm tắt ý kiến, nội dung yêu cầu chỉnh sửa (nếu có)"><textarea rows={3} value={noiDung} disabled={!!c?.noiDung} onChange={(e) => setNoiDung(e.target.value)} /></O>
      {yKien === "KHONG_THONG_NHAT" && <div className="thong-bao thong-bao-vang chu-nho mt-8">Thẩm định không thống nhất: sau khi ghi nhận, hủy bản {p.so} (ghi lý do) và lập bản mới đã hoàn thiện để thẩm định lại.</div>}
      {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
    </HopThoai>
  );
}

function HopNhanHoSo({ p, buoc, ngayDau, canhBao, dong: dongHop, luu }: { p: PhienBanPA; buoc: "8" | "9"; ngayDau: string; canhBao?: (ngay: string) => string[]; dong: () => void; luu: (ngay: string) => Promise<void> }) {
  const [ngay, setNgay] = useState(ngayDau);
  const ten = buoc === "8" ? "Ngày nhận đủ hồ sơ thẩm định" : "Ngày nhận tờ trình phê duyệt phương án";
  return (
    <HopThoai
      tieuDe={`${ten} – bản ${p.so}`}
      dong={dongHop}
      rong={560}
      chan={
        <>
          <button className="nut" onClick={dongHop}>Đóng</button>
          <button className="nut nut-chinh" onClick={async () => { await luu(ngay); dongHop(); }}>Lưu cho {p.ho.length} hộ</button>
        </>
      }
    >
      <p className="mo mt-0">
        {buoc === "8"
          ? "Thời hạn thẩm định không quá 30 ngày kể từ ngày nhận đủ hồ sơ; thời gian bổ sung hồ sơ không tính (khoản 3 Điều 3 Nghị định 88/2024/NĐ-CP; docs/05). Ngày này ghi vào bước 8 của các hộ trong bản; khoảng bổ sung hồ sơ khai ở Tiến độ của hộ (“Thời gian không tính”)."
          : "Thời hạn phê duyệt phương án không quá 5 ngày làm việc kể từ ngày nhận tờ trình (Sổ tay QĐ 1966/QĐ-UBND — Luật Đất đai 2024 không quy định số ngày; docs/05). Chưa ghi thì phần mềm lấy ngày Tờ trình đề nghị phê duyệt phương án (mẫu 13 / R4) đã ghi số, ngày. Ngày này ghi vào bước 9 của các hộ trong bản."}
      </p>
      <O nhan={ten}><ONgay value={ngay} onChange={(e) => setNgay(e.target.value)} /></O>
      {canhBao && <CanhBaoTruocTd ds={canhBao(ngay)} />}
    </HopThoai>
  );
}

function HopHuy({ p, dong: dongHop, luu }: { p: PhienBanPA; dong: () => void; luu: (lyDo: string) => Promise<void> }) {
  const [lyDo, setLyDo] = useState("");
  return (
    <HopThoai
      tieuDe={`Hủy bản ${p.so}`}
      dong={dongHop}
      rong={560}
      chan={
        <>
          <button className="nut" onClick={dongHop}>Đóng</button>
          <button className="nut nut-nguy" disabled={!lyDo.trim()} onClick={async () => { await luu(lyDo); dongHop(); }}>Hủy bản</button>
        </>
      }
    >
      <p className="mo mt-0">Bản bị hủy vẫn được giữ lại để tra cứu, không dùng để phê duyệt.</p>
      <O nhan="Lý do hủy (bắt buộc)"><input value={lyDo} onChange={(e) => setLyDo(e.target.value)} /></O>
    </HopThoai>
  );
}

function HopXem({ p, dong: dongHop }: { p: PhienBanPA; dong: () => void }) {
  const [mo, setMo] = useState<string | null>(null);
  const { goiDaNap } = useUngDung();
  // 1.0.18: nguồn bộ chính sách của bản — có sẵn trong phần mềm, gói đã ký, hoặc gói chưa ký
  const goi = goiDaNap.find((g) => g.khoa === p.boChinhSach);
  const nguonBo = GOI_CO_SAN.includes(p.boChinhSach) ? "có sẵn trong phần mềm" : goi?.chuKy ? `gói đã ký — ${goi.chuKy.donVi}, ${goi.chuKy.luc.slice(0, 10).split("-").reverse().join("/")}` : goi ? "gói chưa ký" : "chưa nạp trên máy này";
  return (
    <HopThoai tieuDe={`Bản ${p.so}: ${p.ten}`} dong={dongHop} rong={980}>
      <div className="mo mb-8">
        {tenTrangThai(p)} · chốt {new Date(p.luc).toLocaleString("vi-VN", { hour12: false })} ({p.nguoi}) · bộ chính sách {p.boChinhSach} <span data-nguon-bo>({nguonBo})</span> · giá gạo {p.thamSoDuAn.giaGao?.dongKg ?? "—"} đ/kg · hệ số giá đất {p.thamSoDuAn.heSoGiaDat?.heSo ?? "1"}
        {p.ho.some((h) => h.duLieu.boChinhSach && h.duLieu.boChinhSach !== p.boChinhSach) && <> · bộ riêng: {p.ho.filter((h) => h.duLieu.boChinhSach && h.duLieu.boChinhSach !== p.boChinhSach).map((h) => `${h.ma} (${h.duLieu.boChinhSach})`).join(", ")}</>}
        {p.thamDinh && <div>Thẩm định: {TEN_Y_KIEN_TD[p.thamDinh.yKien]} — {moTaQd(p.thamDinh)}{p.thamDinh.coQuan ? ` của ${p.thamDinh.coQuan}` : ""}{p.thamDinh.noiDung ? `. ${p.thamDinh.noiDung}` : ""}</div>}
      </div>
      <table className="bang">
        <thead>
          <tr><th>Mã</th><th>Họ tên</th><th className="so">DT thu hồi (m²)</th><th className="so">Bồi thường</th><th className="so">Hỗ trợ</th><th className="so">Tổng (làm tròn)</th><th className="so">Khấu trừ</th><th className="so">Còn nhận</th></tr>
        </thead>
        <tbody>
          {p.ho.map((h) => (
            <Fragment key={h.hoId}>
              <tr onClick={() => setMo(mo === h.hoId ? null : h.hoId)} style={{ cursor: "pointer" }}>
                <td>{mo === h.hoId ? "▾" : "▸"} {h.ma}</td><td>{h.ten}</td><td className="so">{dinhDang(D(h.dtThuHoi), 1)}</td><td className="so">{dong(h.tongBoiThuong)}</td><td className="so">{dong(h.tongHoTro)}</td><td className="so"><b>{dong(h.tong)}</b></td><td className="so">{dong(h.khauTru)}</td><td className="so">{dong(h.conLai)}</td>
              </tr>
              {mo === h.hoId && (
                <tr>
                  <td colSpan={8} style={{ background: "var(--nen)" }}>
                    <table className="bang">
                      <thead><tr><th>Mã</th><th>Khoản</th><th className="so">Thành tiền</th><th>Căn cứ</th></tr></thead>
                      <tbody>
                        {h.dong.map((d, i) => (
                          <tr key={i}><td>{d.ma}</td><td>{d.noiDung}</td><td className="so">{dong(d.thanhTien)}</td><td className="chu-nho">{d.canCu}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
          <tr><td /><td><b>Tổng cộng</b></td><td /><td /><td /><td className="so"><b>{dong(p.tong)}</b></td><td /><td /></tr>
        </tbody>
      </table>
    </HopThoai>
  );
}

const HIEN_TAI = "__hien_tai";

function HopSoSanh({ ds, kq, dong: dongHop }: { ds: PhienBanPA[]; kq: { h: Ho; k: KetQuaHo }[]; dong: () => void }) {
  const [a, setA] = useState(ds.find((p) => p.trangThai === "DA_PHE_DUYET")?.id ?? ds[0]?.id ?? "");
  const [b, setB] = useState(HIEN_TAI);
  const [mo, setMo] = useState<string | null>(null);
  const hienTai = useMemo(() => kq.map(({ h, k }) => chupHo(h, k)), [kq]);
  const lay = (id: string) => (id === HIEN_TAI ? hienTai : ds.find((p) => p.id === id)?.ho ?? []);
  const ten = (id: string) => (id === HIEN_TAI ? "Tạm tính hiện tại" : `Bản ${ds.find((p) => p.id === id)?.so}`);
  // so với tạm tính hiện tại: chỉ xét các hộ có trong bản kia, trừ khi so hai bản
  const truoc = lay(a);
  const sau = b === HIEN_TAI ? hienTai.filter((h) => truoc.some((x) => x.hoId === h.hoId)) : lay(b);
  const kqSs = soSanh(truoc, sau);
  const chon = (v: string, set: (x: string) => void, coHienTai: boolean) => (
    <Chon value={v} onChange={(e) => set(e.target.value)}>
      {coHienTai && <option value={HIEN_TAI}>Tạm tính hiện tại</option>}
      {ds.map((p) => <option key={p.id} value={p.id}>Bản {p.so} – {tenTrangThai(p)}</option>)}
    </Chon>
  );
  return (
    <HopThoai tieuDe="So sánh phương án" dong={dongHop} rong={1000}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <span>Từ</span>{chon(a, setA, false)}<span>đến</span>{chon(b, setB, true)}
        <span className="mo day-phai">{ten(a)}: {dong(kqSs.tongTruoc)} đ → {ten(b)}: {dong(kqSs.tongSau)} đ · chênh <b>{dau(kqSs.chenh)}</b> đ</span>
      </div>
      {b === HIEN_TAI && <div className="thong-bao thong-bao-xanh">So với tạm tính hiện tại chỉ xét các hộ có trong {ten(a)}.</div>}
      <table className="bang">
        <thead><tr><th>Mã</th><th>Họ tên</th><th className="so">{ten(a)}</th><th className="so">{ten(b)}</th><th className="so">Chênh lệch</th><th>Thay đổi</th></tr></thead>
        <tbody>
          {kqSs.dong.map((d) => (
            <Fragment key={d.hoId}>
              <tr onClick={() => d.loai !== "GIU" && setMo(mo === d.hoId ? null : d.hoId)} style={{ cursor: d.loai !== "GIU" ? "pointer" : undefined }}>
                <td>{d.loai !== "GIU" ? (mo === d.hoId ? "▾ " : "▸ ") : ""}{d.ma}</td><td>{d.ten}</td><td className="so">{dong(d.truoc)}</td><td className="so">{dong(d.sau)}</td><td className="so">{dau(d.chenh)}</td>
                <td><span className={`nhan ${TEN_LOAI[d.loai][1]}`}>{TEN_LOAI[d.loai][0]}</span></td>
              </tr>
              {mo === d.hoId && (
                <tr>
                  <td colSpan={6} style={{ background: "var(--nen)" }}>
                    <div className="chu-nho" style={{ marginBottom: 6 }}>{d.cot.map((c) => `${c.ten}: ${dau(c.chenh)} đ`).join(" · ")}</div>
                    <table className="bang">
                      <thead><tr><th>Mã</th><th>Khoản</th><th className="so">Trước</th><th className="so">Sau</th><th className="so">Chênh</th></tr></thead>
                      <tbody>
                        {d.khoan.map((k, i) => <tr key={i}><td>{k.ma}</td><td>{k.noiDung}</td><td className="so">{dong(k.truoc)}</td><td className="so">{dong(k.sau)}</td><td className="so">{dau(k.chenh)}</td></tr>)}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </HopThoai>
  );
}

const NHAN_MUC: Record<KetQuaSoat["muc"], string> = { LOI: "nhan-do", CANH_BAO: "nhan-vang", THONG_TIN: "nhan-xam" };

/** Bảng kết quả soát phương án (§11.1) — mỗi dòng: mức, hồ sơ, nội dung, căn cứ; bấm để mở đúng thẻ, đúng thửa của hồ sơ. */
export function KetQuaSoatPA({ ds, duAnId }: { ds: KetQuaSoat[]; duAnId: string }) {
  const { di } = useUngDung();
  const [loc, setLoc] = useState<KetQuaSoat["muc"] | "">("");
  const [quyTac, setQuyTac] = useState("");
  const dem = demSoat(ds);
  if (!ds.length) return <div className="thong-bao thong-bao-xanh">Không phát hiện vấn đề theo các quy tắc soát. Kết quả soát không thay cho việc thẩm định phương án.</div>;
  // Tóm tắt điều kiện chốt theo quy tắc: số dòng, số hồ sơ
  const theoQt = QUY_TAC_SOAT.map((q) => { const x = ds.filter((y) => y.quyTac === q.ma); return { ...q, dong: x.length, ho: new Set(x.map((y) => y.hoId).filter(Boolean)).size, muc: x[0]?.muc }; }).filter((q) => q.dong);
  const moO = (x: KetQuaSoat) => x.hoId && di({ ten: "ho", duAnId, hoId: x.hoId, ...(x.tab ? { tab: x.tab } : {}), ...(x.thuaId ? { thuaId: x.thuaId } : {}) });
  return (
    <div>
      <div className="soat-tom-tat" role="group" aria-label="Tóm tắt điều kiện chốt theo quy tắc">
        {theoQt.map((q) => (
          <button key={q.ma} className={`soat-qt${quyTac === q.ma ? " chon" : ""}`} onClick={() => setQuyTac(quyTac === q.ma ? "" : q.ma)} title={q.canCu}>
            <span className={`nhan ${NHAN_MUC[q.muc!]}`}>{q.ho ? `${q.ho} hồ sơ` : `${q.dong}`}</span> {q.ten}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
        {(["", "LOI", "CANH_BAO", "THONG_TIN"] as const).map((m) => (
          <button key={m} className={`nut nut-nho${loc === m ? " nut-chinh" : ""}`} onClick={() => setLoc(m)}>
            {m ? `${TEN_MUC_SOAT[m]} (${dem[m]})` : `Tất cả (${ds.length})`}
          </button>
        ))}
        {quyTac && <button className="nut nut-nho" onClick={() => setQuyTac("")}>Bỏ lọc quy tắc</button>}
        <span className="mo chu-nho day-phai">Chỉ để nhắc — phần mềm không kết luận điều kiện bồi thường, hỗ trợ, TĐC. Bấm dòng để mở đúng chỗ cần sửa.</span>
      </div>
      <table className="bang">
        <thead><tr><th>Mức</th><th>Hồ sơ</th><th>Nội dung</th><th>Căn cứ</th><th /></tr></thead>
        <tbody>
          {ds.filter((x) => (!loc || x.muc === loc) && (!quyTac || x.quyTac === quyTac)).map((x, i) => (
            <tr key={i} className={x.hoId ? "co-the-chon" : ""} onClick={() => moO(x)}>
              <td><span className={`nhan ${NHAN_MUC[x.muc]}`}>{TEN_MUC_SOAT[x.muc]}</span></td>
              <td className="chu-nho">{x.doiTuong}</td>
              <td>{x.noiDung}</td>
              <td className="chu-nho">{x.canCu}</td>
              <td>{x.hoId && <button className="nut nut-chu nut-nho" aria-label={`Đi tới chỗ sửa: ${x.doiTuong}`} onClick={(e) => { e.stopPropagation(); moO(x); }}>Đi tới ›</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

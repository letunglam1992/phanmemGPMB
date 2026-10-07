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
import { ngayChu } from "../van-ban/du-lieu";
import {
  TEN_TT_PA,
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
  const { chinhSach, luuDuAn, luuHo, nguoiDung, quyen, ghiNhatKy, tyLeCham, nguongLechDt, nguoiCoDat } = useUngDung();
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
  const [hop, setHop] = useState<null | { loai: "chot" } | { loai: "soat" } | { loai: "duyet" | "huy" | "xem" | "bo-sung"; p: PhienBanPA } | { loai: "so-sanh"; a?: string; b?: string }>(null);
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
                  <td><span className={`nhan ${NHAN_TT[p.trangThai]}`}>{TEN_TT_PA[p.trangThai]}</span></td>
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
          <KetQuaSoatPA ds={soatPhuongAn(duAn, kq, nguongLechDt, nguoiCoDat)} duAnId={duAn.id} />
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
  const { chinhSach, luuDuAn, nguoiDung, ghiNhatKy, nguongLechDt, nguoiCoDat } = useUngDung();
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
  const soat = useMemo(() => soatPhuongAn(duAn, dsChon, nguongLechDt, nguoiCoDat).filter((x) => x.muc !== "THONG_TIN" && x.quyTac !== "KHOAN_CHUA_DU"), [duAn, dsChon, nguongLechDt, nguoiCoDat]);
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
      <p className="mt-0"><b>Đợt phê duyệt {dot}</b> · bản phương án {p.so}{tenDotThuHoi ? ` · ${tenDotThuHoi}` : ""} · {p.ho.length} hộ · {dong(p.tong)} đ</p>
      <p className="mo mt-0">
        Phần mềm chỉ <b>ghi nhận</b> quyết định phê duyệt đã được cấp có thẩm quyền ký ban hành (điểm c khoản 3 Điều 87 Luật Đất đai 2024). Sau khi ghi nhận, bản {p.so} ({p.ho.length} hộ, {dong(p.tong)} đ) không sửa, không hủy được.
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
  return (
    <HopThoai tieuDe={`Bản ${p.so}: ${p.ten}`} dong={dongHop} rong={980}>
      <div className="mo mb-8">
        {TEN_TT_PA[p.trangThai]} · chốt {new Date(p.luc).toLocaleString("vi-VN", { hour12: false })} ({p.nguoi}) · bộ chính sách {p.boChinhSach} · giá gạo {p.thamSoDuAn.giaGao?.dongKg ?? "—"} đ/kg · hệ số giá đất {p.thamSoDuAn.heSoGiaDat?.heSo ?? "1"}
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
      {ds.map((p) => <option key={p.id} value={p.id}>Bản {p.so} – {TEN_TT_PA[p.trangThai]}</option>)}
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

/** Bảng kết quả soát phương án (§11.1) — mỗi dòng: mức, hồ sơ, nội dung, căn cứ; bấm mã hộ để mở hồ sơ. */
export function KetQuaSoatPA({ ds, duAnId }: { ds: KetQuaSoat[]; duAnId: string }) {
  const { di } = useUngDung();
  const [loc, setLoc] = useState<KetQuaSoat["muc"] | "">("");
  const dem = demSoat(ds);
  if (!ds.length) return <div className="thong-bao thong-bao-xanh">Không phát hiện vấn đề theo các quy tắc soát. Kết quả soát không thay cho việc thẩm định phương án.</div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        {(["", "LOI", "CANH_BAO", "THONG_TIN"] as const).map((m) => (
          <button key={m} className={`nut nut-nho${loc === m ? " nut-chinh" : ""}`} onClick={() => setLoc(m)}>
            {m ? `${TEN_MUC_SOAT[m]} (${dem[m]})` : `Tất cả (${ds.length})`}
          </button>
        ))}
        <span className="mo chu-nho day-phai">Chỉ để nhắc — phần mềm không kết luận điều kiện bồi thường, hỗ trợ, TĐC.</span>
      </div>
      <table className="bang">
        <thead><tr><th>Mức</th><th>Hồ sơ</th><th>Nội dung</th><th>Căn cứ</th></tr></thead>
        <tbody>
          {ds.filter((x) => !loc || x.muc === loc).map((x, i) => (
            <tr key={i}>
              <td><span className={`nhan ${NHAN_MUC[x.muc]}`}>{TEN_MUC_SOAT[x.muc]}</span></td>
              <td className="chu-nho">{x.hoId ? <a href="#" onClick={(e) => { e.preventDefault(); di({ ten: "ho", duAnId, hoId: x.hoId! }); }}>{x.doiTuong}</a> : x.doiTuong}</td>
              <td>{x.noiDung}</td>
              <td className="chu-nho">{x.canCu}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

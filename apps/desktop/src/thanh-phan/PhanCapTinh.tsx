import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { O } from "./chung";
import { ONgay } from "./ONgay";
import { donViChuaGuiPhanCap, duLieuBaoCaoPhanCapTinh, lichCuongCheTinh, phanCapTheoXa, phienBanTu } from "../tong-hop-tinh/dien-bien";
import { HopThoai } from "./chung";
import { dienMau } from "../van-ban/dien-mau";
import { taiXuong } from "../tai-xuong";
import type { TomTatDuAn } from "../tong-hop-tinh/goi-tinh";
import { hanBaoCaoPhanCap } from "../van-ban/tham-quyen";
import { hanGuiCongAn } from "../cuong-che";
import { homNayIso } from "../trang-thai";
import { xuatExcelPhanCapTinh } from "../xuat-excel";

const vn = (iso: string) => iso.split("-").reverse().join("/");

/**
 * 1.3.0 (D1, D2) — máy tỉnh: kết quả thực hiện nhiệm vụ được phân cấp theo xã trong kỳ (số liệu cho báo cáo 06 tháng — khoản 2
 * Điều 4 QĐ 27/2026), lịch cưỡng chế toàn tỉnh; xuất Excel. Gói gửi trước 1.3.0 không có số liệu phân cấp.
 */
const KHOA_TT = "gpmb-bao-cao-phan-cap-tinh";
type TtBc = { coQuanCapTren: string; coQuan: string; kyHieu: string; so: string; diaDanh: string; ngayKy: string; kinhGui: string; khoKhan: string; kienNghi: string; noiNhan: string; quyenHan: string; nguoiKy: string };

export function ThePhanCapTinh({ dong, goi = [] }: { dong: TomTatDuAn[]; goi?: { donViGui: string; thongTin: { luc: string; ungDung: string } }[] }) {
  const { thamQuyen, lich, bao, ghiNhatKy } = useUngDung();
  const [hopWord, setHopWord] = useState(false);
  const [tt, setTt] = useState<TtBc>(() => {
    const mac: TtBc = { coQuanCapTren: "UBND TỈNH SƠN LA", coQuan: "Sở Nông nghiệp và Môi trường", kyHieu: "SNNMT", so: "", diaDanh: "Sơn La", ngayKy: homNayIso(), kinhGui: "Ủy ban nhân dân tỉnh Sơn La", khoKhan: "", kienNghi: "", noiNhan: "Như trên\nLưu: VT", quyenHan: "GIÁM ĐỐC", nguoiKy: "" };
    try { return { ...mac, ...JSON.parse(localStorage.getItem(KHOA_TT) ?? "{}"), so: "", ngayKy: homNayIso(), khoKhan: "", kienNghi: "" }; } catch { return mac; }
  });
  const homNay = homNayIso();
  const han = hanBaoCaoPhanCap(homNay);
  const [tu, setTu] = useState(han?.tu ?? `${homNay.slice(0, 4)}-01-01`);
  const [den, setDen] = useState(han?.den ?? homNay);
  const [dangXuat, setDangXuat] = useState(false);
  const pc = useMemo(() => phanCapTheoXa(dong, tu, den), [dong, tu, den]);
  const lichCc = useMemo(() => lichCuongCheTinh(dong, homNay).map((x) => ({ ...x, hanCongAn: hanGuiCongAn(x.ngay, lich) })), [dong, homNay, lich]);
  // gói từ 1.3.0 mang Sổ văn bản đi (kể cả khi chưa có văn bản phân cấp nào — bảng hiện số 0)
  const coGoiMoi = dong.some((d) => d.phanCap) || goi.some((g) => phienBanTu(g.thongTin.ungDung, "1.3.0"));
  const chuaGui = useMemo(() => donViChuaGuiPhanCap(goi, tu), [goi, tu]);
  const ganHan = !!han && Math.round((Date.parse(han.han) - Date.parse(homNay)) / 86400000) <= 15;
  const taoWord = async () => {
    try {
      try { localStorage.setItem(KHOA_TT, JSON.stringify({ ...tt, so: "", khoKhan: "", kienNghi: "" })); } catch { /* bỏ qua */ }
      const mau = await (await fetch("/mau-van-ban/bao-cao-phan-cap-tinh.docx")).arrayBuffer();
      const du = duLieuBaoCaoPhanCapTinh(pc, thamQuyen.nhiemVu, chuaGui, { tu, den }, { so: thamQuyen.so, ten: thamQuyen.ten }, tt);
      if (!(await taiXuong(dienMau(mau, du), `Bao-cao-phan-cap-toan-tinh_${tu}_${den}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) return;
      await ghiNhatKy("Tạo báo cáo tổng hợp phân cấp toàn tỉnh", `${vn(tu)}–${vn(den)}`);
      bao("Đã tạo báo cáo (dự thảo) — kiểm tra trước khi trình ký");
      setHopWord(false);
    } catch (e) {
      bao(`Không tạo được báo cáo: ${(e as Error).message}`, "loi");
    }
  };
  const o = (k: keyof TtBc, nhan: string, n = 1) => (
    <O nhan={nhan} style={n > 1 ? { gridColumn: "1 / -1" } : undefined}>
      {n > 1 ? <textarea aria-label={nhan} rows={n} value={tt[k]} onChange={(e) => setTt({ ...tt, [k]: e.target.value })} /> : <input aria-label={nhan} value={tt[k]} onChange={(e) => setTt({ ...tt, [k]: e.target.value })} />}
    </O>
  );
  if (!coGoiMoi && !lichCc.length) return null;
  return (
    <div className="the" data-phan-cap-tinh>
      <div className="the-dau" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3>Kết quả phân cấp theo xã, lịch cưỡng chế</h3>
        <div className="phai">
          {coGoiMoi && <button className="nut nut-nho" data-bao-cao-phan-cap-tinh onClick={() => setHopWord(true)}>Word phân cấp toàn tỉnh…</button>}
          <button className="nut nut-nho" disabled={dangXuat} onClick={async () => { setDangXuat(true); try { await xuatExcelPhanCapTinh(pc, thamQuyen.nhiemVu, lichCc, { ky: `${vn(tu)}–${vn(den)}`, qd: thamQuyen.so }); } finally { setDangXuat(false); } }}>Excel phân cấp, lịch cưỡng chế</button>
        </div>
      </div>
      <div className="the-than">
        {coGoiMoi && chuaGui.length > 0 && (
          <div className={`thong-bao ${ganHan ? "thong-bao-vang" : "thong-bao-xanh"} chu-nho mb-10`} data-chua-gui-phan-cap>
            {ganHan && han ? <b>Sắp đến hạn báo cáo (trước {vn(han.han)}). </b> : null}
            Đơn vị chưa có số liệu phân cấp kỳ này ({chuaGui.length}): {chuaGui.map((c) => `${c.donVi} — ${c.lyDo}`).join("; ")}. Đề nghị các đơn vị cập nhật phần mềm 1.3.0 và gửi gói mới.
          </div>
        )}
        {coGoiMoi ? (
          <>
            <div className="luoi luoi-4">
              <O nhan="Từ ngày"><ONgay aria-label="Phân cấp từ ngày" value={tu} onChange={(e) => setTu(e.target.value)} /></O>
              <O nhan="Đến ngày"><ONgay aria-label="Phân cấp đến ngày" value={den} onChange={(e) => setDen(e.target.value)} /></O>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="bang chu-nho mt-6" aria-label="Kết quả phân cấp theo xã">
                <thead><tr><th>Xã, phường</th>{thamQuyen.nhiemVu.map((n) => <th key={n.ma} className="so" title={`${n.noiDung} (${n.viTri} QĐ ${thamQuyen.so})`}>{n.noiDung.replace(/^Quyết định |^Ban hành |^Phê duyệt /, "").slice(0, 28)}</th>)}<th className="so">Tổng</th></tr></thead>
                <tbody>
                  {pc.map((x) => <tr key={x.xa}><td>{x.xa}</td>{thamQuyen.nhiemVu.map((n) => <td key={n.ma} className="so">{x.theoNv[n.ma] ?? 0}</td>)}<td className="so"><b>{x.tong}</b></td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="mo chu-nho mt-6">Đếm văn bản thuộc nhiệm vụ phân cấp (QĐ {thamQuyen.so}) có ngày ký trong kỳ, theo Sổ văn bản đi các xã gửi kèm gói (từ bản 1.3.0). Dùng tổng hợp báo cáo 06 tháng (khoản 2 Điều 4).</div>
          </>
        ) : <div className="mo chu-nho">Các gói đã nhận gửi trước bản 1.3.0 — chưa có số liệu phân cấp.</div>}
        {lichCc.length > 0 && (
          <div className="mt-8" data-lich-cuong-che-tinh>
            <b className="chu-nho">Lịch cưỡng chế từ hôm nay ({lichCc.length} hồ sơ)</b>
            <table className="bang chu-nho mt-6">
              <thead><tr><th>Ngày dự kiến</th><th>Xã, phường</th><th>Dự án</th><th>Loại</th><th title="Điều 37 NĐ 102/2024 — tính theo lịch nghỉ của máy tỉnh">Đề nghị Công an chậm nhất</th></tr></thead>
              <tbody>{lichCc.slice(0, 30).map((x, i) => <tr key={i}><td>{vn(x.ngay)}</td><td>{x.xa}</td><td>{x.duAn}</td><td>{x.loai === "KIEM_DEM" ? "Kiểm đếm bắt buộc" : "Thu hồi đất"}</td><td>{vn(x.hanCongAn)}</td></tr>)}</tbody>
            </table>
            {lichCc.length > 30 && <div className="mo chu-nho">… và {lichCc.length - 30} hồ sơ khác (xem tệp Excel)</div>}
          </div>
        )}
      </div>
      {hopWord && (
        <HopThoai tieuDe="Báo cáo tổng hợp phân cấp toàn tỉnh (Word)" dong={() => setHopWord(false)} rong={820} chan={<><button className="nut" onClick={() => setHopWord(false)}>Hủy</button><button className="nut nut-chinh" onClick={() => void taoWord()}>Tạo tệp Word</button></>}>
          <div className="mo chu-nho mb-10">Kỳ {vn(tu)}–{vn(den)}; số liệu theo bảng ở thẻ (đơn vị đã gửi gói từ 1.3.0), kèm danh sách đơn vị chưa có số liệu. Thông tin cơ quan, người ký được nhớ trên máy này.</div>
          <div className="luoi luoi-2">
            {o("coQuanCapTren", "Cơ quan chủ quản")}{o("coQuan", "Cơ quan báo cáo")}{o("kyHieu", "Ký hiệu (…/BC-?)")}{o("so", "Số báo cáo")}
            {o("diaDanh", "Địa danh")}<O nhan="Ngày ký"><ONgay value={tt.ngayKy} onChange={(e) => setTt({ ...tt, ngayKy: e.target.value })} /></O>
            {o("kinhGui", "Kính gửi")}{o("quyenHan", "Quyền hạn người ký")}{o("nguoiKy", "Họ tên người ký")}
            {o("khoKhan", "Khó khăn, vướng mắc", 3)}{o("kienNghi", "Đề xuất, kiến nghị", 3)}{o("noiNhan", "Nơi nhận (mỗi dòng một nơi)", 3)}
          </div>
        </HopThoai>
      )}
    </div>
  );
}

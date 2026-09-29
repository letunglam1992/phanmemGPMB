import { useEffect, useState } from "react";
import { dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { dtDaBanGiao, dtThuHoiHo, tinhThuong } from "../ban-giao";
import { hienSo } from "../so";
import { O } from "./chung";
import { OSo } from "./OSo";

/**
 * Bàn giao mặt bằng của hộ (P1-4): ngày, biên bản, diện tích đã bàn giao — ghi xong thì hộ "Đã bàn giao mặt bằng"
 * (hoàn thành GPMB). Thưởng bàn giao trước hạn tính theo các mốc khai báo ở Thông tin dự án (ban-giao.ts).
 */
export function TheBanGiao({ h, duAn, kq, luuNgay, moThongTinDuAn }: { h: Ho; duAn: DuAn; kq: KetQuaHo; luuNgay: (h: Ho, nk: string) => Promise<void>; moThongTinDuAn: () => void }) {
  const { quyen, nguoiDung, bao } = useUngDung();
  const bg = h.banGiao;
  const [ngay, setNgay] = useState(bg?.ngay ?? "");
  const [bienBan, setBienBan] = useState(bg?.bienBan ?? "");
  const [dienTich, setDienTich] = useState(bg?.dienTich ?? "");
  const [ghiChu, setGhiChu] = useState(bg?.ghiChu ?? "");
  useEffect(() => {
    setNgay(bg?.ngay ?? "");
    setBienBan(bg?.bienBan ?? "");
    setDienTich(bg?.dienTich ?? "");
    setGhiChu(bg?.ghiChu ?? "");
  }, [bg]);
  const dtTh = dtThuHoiHo(h);
  const chiXong = h.tienDo["12"]?.trangThai === "XONG";
  const thuong = tinhThuong(duAn, { banGiao: ngay ? { ngay, bienBan, nguoiGhi: "" } : undefined }, kq);
  const choSua = quyen("SUA_HO_SO");
  const luu = async () => {
    if (!ngay || !bienBan.trim()) return bao("Nhập ngày bàn giao và số, ngày biên bản bàn giao mặt bằng", "loi");
    if (dienTich && dtTh.gt(0) && Number(dienTich) > dtTh.toNumber() + 0.01) return bao(`Diện tích bàn giao lớn hơn diện tích thu hồi (${hienSo(dtTh.toString())} m²)`, "loi");
    const moi: Ho = {
      ...h,
      banGiao: {
        ngay,
        bienBan: bienBan.trim(),
        ...(dienTich ? { dienTich } : {}),
        ...(ghiChu.trim() ? { ghiChu: ghiChu.trim() } : {}),
        nguoiGhi: nguoiDung,
        ...(thuong.loai === "CO" ? { thuong: { moc: thuong.moc.ten, soTien: thuong.soTien.toFixed(0), canCu: thuong.canCu } } : {}),
      },
    };
    await luuNgay(moi, `Ghi bàn giao mặt bằng ngày ${ngay.split("-").reverse().join("/")}, biên bản ${bienBan.trim()}${dienTich ? `, ${hienSo(dienTich)} m²` : ""}${thuong.loai === "CO" ? `; thưởng ${thuong.moc.ten}: ${dinhDang(thuong.soTien, 0)} đ` : ""}`);
  };
  const huy = async () => {
    if (!quyen("DUYET_BUOC")) return bao("Cần quyền xác nhận bước để hủy ghi bàn giao", "loi");
    const lyDo = prompt("Hủy ghi bàn giao mặt bằng — lý do (bắt buộc):")?.trim();
    if (!lyDo) return;
    const { banGiao: _bo, ...con } = h;
    await luuNgay(con, `Hủy ghi bàn giao mặt bằng (${bg?.bienBan ?? ""}): ${lyDo}`);
  };
  return (
    <div className="the mt-14">
      <div className="the-dau">
        <h3>Bàn giao mặt bằng</h3>
        {bg?.ngay ? <span className="nhan nhan-xanh">Đã bàn giao {bg.ngay.split("-").reverse().join("/")}</span> : <span className="nhan nhan-xam">Chưa bàn giao</span>}
      </div>
      <div className="the-than">
        {!chiXong && !bg && <div className="thong-bao thong-bao-vang mb-8">Bước 12 (chi trả) chưa hoàn thành — kiểm tra trước khi ghi bàn giao (k5, k6 Điều 87 LĐĐ 2024).</div>}
        <fieldset className="khung-quyen" disabled={!choSua}>
          <div className="luoi" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            <O nhan="Ngày bàn giao"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></O>
            <O nhan="Số, ngày biên bản bàn giao"><input value={bienBan} placeholder="vd. 12/BB-BGMB ngày …" onChange={(e) => setBienBan(e.target.value)} /></O>
            <O nhan="Diện tích bàn giao (m²)" goiY={`Để trống = toàn bộ DT thu hồi (${hienSo(dtTh.toDecimalPlaces(2).toString())} m²)`}><OSo value={dienTich} onChange={setDienTich} /></O>
            <O nhan="Ghi chú"><input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></O>
          </div>
        </fieldset>
        <div className="mo chu-nho" style={{ margin: "8px 0" }}>
          <b>Thưởng bàn giao trước hạn</b> (C13 — tính riêng, quyết định sau bàn giao theo Mẫu 20, 21; không cộng vào tổng phương án):{" "}
          {thuong.loai === "CO" ? (
            <><b>{dinhDang(thuong.soTien, 0)} đ</b> — {thuong.dienGiai}. Căn cứ: {thuong.canCu}.</>
          ) : thuong.loai === "THIEU_CAN_CU" ? (
            <><span className="nhan nhan-vang">Thiếu căn cứ</span> {thuong.lyDo}. <button className="nut nut-chu nut-nho" onClick={moThongTinDuAn}>Khai báo ở Thông tin dự án</button></>
          ) : (
            <>{thuong.lyDo}.</>
          )}
        </div>
        <div className="nhom-nut" style={{ justifyContent: "flex-end" }}>
          {bg && <button className="nut" disabled={!quyen("DUYET_BUOC")} onClick={() => void huy()}>Hủy ghi bàn giao</button>}
          <button className="nut nut-chinh" disabled={!choSua || !ngay || !bienBan.trim()} onClick={() => void luu()}>{bg ? "Cập nhật bàn giao" : "Ghi bàn giao mặt bằng"}</button>
        </div>
        {bg && <div className="mo chu-nho">Ghi bởi {bg.nguoiGhi}; DT đã bàn giao: {hienSo(dtDaBanGiao(h).toDecimalPlaces(2).toString())} m²{bg.thuong ? `; thưởng đã ghi: ${bg.thuong.moc} — ${hienSo(bg.thuong.soTien)} đ` : ""}.</div>}
      </div>
    </div>
  );
}

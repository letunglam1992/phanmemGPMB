import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { napSuaNq28 } from "../du-lieu";
import type { SuaBangGia } from "../bang-gia-nq28";
import { raSoatNq28, type DongNq28, type LoaiNq28 } from "../nq28";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";

const TEN: Record<LoaiNq28, string> = { BAI_BO: "Tuyến bị bãi bỏ", DOI_TEN: "Tuyến đổi tên", CHENH_CAO: "Giảm chênh cao (đã bãi bỏ)" };
const canXuLy = (x: DongNq28) => !x.daDuyet && x.loai !== "DOI_TEN";

/** 1.3.1 — Thẻ ở Tổng quan: nhắc rà soát giá đất đã chọn theo NQ 28/2026/NQ-HĐND (hiệu lực 01/11/2026). */
export function TheNq28() {
  const { dsDuAn, hoCua, chiXem } = useUngDung();
  const [sua, setSua] = useState<SuaBangGia | null>(null);
  const [mo, setMo] = useState(false);
  useEffect(() => { void napSuaNq28().then(setSua); }, []);
  const ds = useMemo(() => (sua ? raSoatNq28(dsDuAn, hoCua, sua) : []), [sua, dsDuAn, hoCua]);
  const can = ds.filter(canXuLy);
  if (chiXem || !sua || !ds.length) return null;
  const dem = (l: LoaiNq28) => can.filter((x) => x.loai === l).length;
  return (
    <section className={`the ${can.length ? "thong-bao-vang" : "thong-bao-xanh"}`} aria-label="Áp dụng NQ 28/2026" data-the-nq28 style={{ marginBottom: 14, padding: "10px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <b>Bảng giá đất sửa đổi theo NQ 28/2026/NQ-HĐND (hiệu lực {sua.hieu_luc_tu.split("-").reverse().join("/")}):</b>{" "}
        {can.length
          ? [dem("BAI_BO") ? `${dem("BAI_BO")} giá theo tuyến bị bãi bỏ` : "", dem("CHENH_CAO") ? `${dem("CHENH_CAO")} giá nhập tay có giảm chênh cao` : ""].filter(Boolean).join("; ")
          : "các giá liên quan thuộc phương án đã phê duyệt hoặc chỉ đổi tên tuyến"}
        {ds.length - can.length > 0 && <span className="mo chu-nho"> ({ds.length - can.length} dòng không cần chọn lại)</span>}.
      </div>
      <button className="nut nut-nho nut-chinh" onClick={() => setMo(true)}>Rà soát…</button>
      {mo && <HopRaSoatNq28 ds={ds} sua={sua} dong={() => setMo(false)} />}
    </section>
  );
}

export function HopRaSoatNq28({ ds, sua, dong }: { ds: DongNq28[]; sua: SuaBangGia; dong: () => void }) {
  const { di, bao } = useUngDung();
  const [tatCa, setTatCa] = useState(false);
  const hien = tatCa ? ds : ds.filter(canXuLy);
  const xuat = async () => {
    const { default: Excel } = await import("exceljs");
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet("Ra soat NQ 28");
    ws.columns = [{ width: 5 }, { width: 32 }, { width: 10 }, { width: 24 }, { width: 10 }, { width: 22 }, { width: 50 }, { width: 50 }, { width: 50 }, { width: 14 }];
    ws.addRow([`RÀ SOÁT GIÁ ĐẤT THEO ${sua.van_ban} (hiệu lực ${sua.hieu_luc_tu.split("-").reverse().join("/")})`]).font = { bold: true, size: 13 };
    ws.addRow([]);
    ws.addRow(["STT", "Dự án", "Mã hộ", "Chủ sử dụng", "Tờ/thửa", "Loại", "Nguồn giá đang dùng", "Nội dung", "Gợi ý tuyến bổ sung", "PA đã duyệt"]).font = { bold: true };
    hien.forEach((x, i) => ws.addRow([i + 1, x.duAn.ten, x.ho.ma, x.ho.ten, x.thua, TEN[x.loai], x.nguon, x.noiDung, x.goiY.join("\n"), x.daDuyet ? "Có (k1 Đ3)" : ""]));
    ws.addRow([]);
    ws.addRow(["Khoản 1 Điều 3 NQ 28/2026: phương án đã phê duyệt trước ngày Nghị quyết có hiệu lực tiếp tục thực hiện theo phương án đã duyệt, trừ trường hợp phải điều chỉnh, bổ sung, hủy bỏ."]).font = { italic: true };
    if (await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), `Ra-soat-NQ28-2026_${new Date().toISOString().slice(0, 10)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) bao("Đã xuất Excel rà soát NQ 28/2026");
  };
  return (
    <HopThoai tieuDe="Rà soát giá đất theo NQ 28/2026/NQ-HĐND" rong={1150} dong={dong}
      chan={<><label className="chu-nho" style={{ marginRight: "auto" }}><input type="checkbox" checked={tatCa} onChange={(e) => setTatCa(e.target.checked)} /> Hiện cả dòng không cần chọn lại (đổi tên, PA đã duyệt)</label><button className="nut" onClick={() => void xuat()}>Xuất Excel</button><button className="nut" onClick={dong}>Đóng</button></>}>
      <p className="mo chu-nho" style={{ marginTop: 0 }}>
        Giá đã chọn trước đây không tự đổi. Hộ trong phương án đã phê duyệt: tiếp tục theo phương án đã duyệt (khoản 1 Điều 3). Chưa phê duyệt: mở hồ sơ, chọn lại giá với kỳ "từ 01/11/2026" — tuyến gợi ý là tuyến bổ sung có ghi chú tách từ / bổ sung sau STT tuyến bị bãi bỏ, cán bộ xác nhận theo vị trí thửa.
      </p>
      <div className="bang-cuon" style={{ maxHeight: 460 }}>
        <table className="bang" aria-label="Bảng rà soát NQ 28">
          <thead><tr><th>Dự án, hộ</th><th>Tờ/thửa</th><th>Loại</th><th>Nội dung</th><th>Gợi ý</th><th /></tr></thead>
          <tbody>
            {hien.map((x, i) => (
              <tr key={i}>
                <td><b>{x.ho.ma}</b> {x.ho.ten}<div className="mo chu-nho">{x.duAn.ten}</div></td>
                <td>{x.thua}</td>
                <td className="chu-nho">{TEN[x.loai]}{x.daDuyet && <div><span className="nhan nhan-xanh">PA đã duyệt</span></div>}</td>
                <td className="chu-nho">{x.noiDung}<div className="can-cu">{x.nguon}</div></td>
                <td className="chu-nho">{x.goiY.length ? x.goiY.map((g, j) => <div key={j}>{g}</div>) : "—"}</td>
                <td><button className="nut nut-nho" onClick={() => { dong(); di({ ten: "ho", duAnId: x.duAn.id, hoId: x.ho.id, tab: "thua", thuaId: x.thuaId }); }}>Mở</button></td>
              </tr>
            ))}
            {!hien.length && <tr><td colSpan={6} className="trong">Không có giá cần chọn lại.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

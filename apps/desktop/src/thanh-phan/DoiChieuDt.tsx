import { useMemo, useState } from "react";
import { dinhDang, D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import { TEN_CAP, doiChieuDienTich, type DongDoiChieu } from "../doi-chieu-dt";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";

const so = (v: string, n = 2) => dinhDang(D(v), n);

async function xuatExcel(duAn: DuAn, ds: DongDoiChieu[], nguong: string) {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Đối chiếu DT");
  ws.addRow([`Đối chiếu diện tích — ${duAn.ten}`]).font = { bold: true, size: 13 };
  ws.addRow([`Ngưỡng: ${nguong}. Xuất lúc ${new Date().toLocaleString("vi-VN")}`]);
  ws.addRow([]);
  ws.addRow(["Mã hồ sơ", "Họ tên", "Thửa", "So sánh", "Giá trị A (m²)", "Giá trị B (m²)", "Chênh A − B (m²)", "Chênh (%)", "Nguồn B", "Vượt ngưỡng"]).font = { bold: true };
  for (const x of ds) ws.addRow([x.ma, x.ten, x.thua, `${TEN_CAP[x.cap][0]} ↔ ${TEN_CAP[x.cap][1]}`, Number(x.a), Number(x.b), Number(x.chenh), x.tyLe === null ? "" : Number(x.tyLe), x.nguonB ?? "", x.vuot ? "Có" : ""]);
  ws.columns.forEach((c, i) => (c.width = [10, 24, 16, 46, 14, 14, 14, 10, 22, 10][i]));
  await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), `Doi-chieu-dien-tich - ${duAn.ten}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

/** §11.3: thẻ tóm tắt ở Tổng quan dự án + hộp thoại bảng chi tiết (lọc vượt ngưỡng, xuất Excel). */
export function TheDoiChieuDt({ duAn, hos }: { duAn: DuAn; hos: Ho[] }) {
  const { nguongLechDt, di, moCaiDat } = useUngDung();
  const ds = useMemo(() => doiChieuDienTich(duAn, hos, nguongLechDt), [duAn, hos, nguongLechDt]);
  const [mo, setMo] = useState(false);
  const [chiVuot, setChiVuot] = useState(true);
  const vuot = ds.filter((x) => x.vuot).length;
  const moTaNguong = nguongLechDt ? `${nguongLechDt.m2 ? `${nguongLechDt.m2.replace(".", ",")} m²` : ""}${nguongLechDt.m2 && nguongLechDt.phanTram ? " hoặc " : ""}${nguongLechDt.phanTram ? `${nguongLechDt.phanTram.replace(".", ",")}%` : ""} (${nguongLechDt.canCu})` : "chưa đặt — liệt kê mọi chênh lệch";
  const hien = chiVuot ? ds.filter((x) => x.vuot) : ds;
  return (
    <div className="the">
      <div className="the-dau"><h3>Đối chiếu diện tích</h3><span className="mo chu-nho">bản đồ – hồ sơ – phương án – GCN</span></div>
      <div className="the-than">
        <div style={{ fontSize: 22, fontWeight: 700, color: vuot ? "var(--vang)" : undefined }}>{vuot}<span className="mo" style={{ fontSize: 13, fontWeight: 400 }}> / {ds.length} cặp so sánh lệch vượt ngưỡng</span></div>
        <div className="mo chu-nho" style={{ margin: "4px 0 8px" }}>Ngưỡng: {moTaNguong}</div>
        <button className="nut nut-nho" disabled={!ds.length} onClick={() => setMo(true)}>Xem bảng</button>{" "}
        <button className="nut nut-nho" onClick={() => moCaiDat(true)}>Đặt ngưỡng…</button>
      </div>
      {mo && (
        <HopThoai tieuDe="Đối chiếu diện tích ba nguồn" dong={() => setMo(false)} rong={1060} chan={<><button className="nut" onClick={() => void xuatExcel(duAn, hien, moTaNguong)}>Xuất Excel</button><button className="nut" onClick={() => setMo(false)}>Đóng</button></>}>
          <p className="mo chu-nho" style={{ marginTop: 0 }}>
            Chỉ để nhắc kiểm tra — phần mềm không kết luận số liệu nào đúng. Ngưỡng: {moTaNguong}.{" "}
            <label><input type="checkbox" checked={chiVuot} onChange={(e) => setChiVuot(e.target.checked)} /> Chỉ hiện chênh lệch vượt ngưỡng</label>
          </p>
          <table className="bang">
            <thead><tr><th>Hồ sơ</th><th>Thửa</th><th>So sánh (A ↔ B)</th><th className="so">A (m²)</th><th className="so">B (m²)</th><th className="so">Chênh (m²)</th><th className="so">%</th></tr></thead>
            <tbody>
              {hien.map((x, i) => (
                <tr key={i} className="co-the-chon" onClick={() => di({ ten: "ho", duAnId: duAn.id, hoId: x.hoId, tab: "thua" })}>
                  <td className="chu-nho"><b>{x.ma}</b> {x.ten}</td>
                  <td className="chu-nho">{x.thua}</td>
                  <td className="chu-nho">{TEN_CAP[x.cap][0]} ↔ {TEN_CAP[x.cap][1]}{x.nguonB && <div className="mo">{x.nguonB}</div>}</td>
                  <td className="so">{so(x.a)}</td>
                  <td className="so">{so(x.b)}</td>
                  <td className="so" style={x.vuot ? { color: "var(--vang)", fontWeight: 700 } : undefined}>{so(x.chenh)}</td>
                  <td className="so">{x.tyLe === null ? "—" : so(x.tyLe)}</td>
                </tr>
              ))}
              {!hien.length && <tr><td colSpan={7} className="trong">Không có chênh lệch {chiVuot ? "vượt ngưỡng" : ""}.</td></tr>}
            </tbody>
          </table>
        </HopThoai>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { dinhDang, D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import { TEN_CAP, doiChieuDienTich, doiChieuTongDt, type DongDoiChieu, type DongTongDt } from "../doi-chieu-dt";
import type { DtThuHoiVb } from "../mo-hinh";
import { docSoNhap, hienSo } from "../so";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";

const so = (v: string, n = 2) => dinhDang(D(v), n);

async function xuatExcel(duAn: DuAn, ds: DongDoiChieu[], nguong: string, tong: DongTongDt[] = []) {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Đối chiếu DT");
  ws.addRow([`Đối chiếu diện tích — ${duAn.ten}`]).font = { bold: true, size: 13 };
  ws.addRow([`Ngưỡng: ${nguong}. Xuất lúc ${new Date().toLocaleString("vi-VN")}`]);
  ws.addRow([]);
  ws.addRow(["Mã hồ sơ", "Họ tên", "Thửa", "So sánh", "Giá trị A (m²)", "Giá trị B (m²)", "Chênh A − B (m²)", "Chênh (%)", "Nguồn B", "Vượt ngưỡng"]).font = { bold: true };
  for (const x of ds) ws.addRow([x.ma, x.ten, x.thua, `${TEN_CAP[x.cap][0]} ↔ ${TEN_CAP[x.cap][1]}`, Number(x.a), Number(x.b), Number(x.chenh), x.tyLe === null ? "" : Number(x.tyLe), x.nguonB ?? "", x.vuot ? "Có" : ""]);
  ws.columns.forEach((c, i) => (c.width = [10, 24, 16, 46, 14, 14, 14, 10, 22, 10][i]));
  if (tong.length) {
    const wt = wb.addWorksheet("Tổng DT thu hồi");
    wt.addRow(["Phạm vi", "Số hồ sơ", "So sánh", "Tổng hồ sơ phần được so (m²)", "Nguồn đối chiếu (m²)", "Chênh (m²)", "Chênh (%)", "Ghi chú / căn cứ", "Vượt ngưỡng"]).font = { bold: true };
    for (const r of tong) {
      wt.addRow([r.phamVi, r.soHo, "Tổng DT thu hồi trong hồ sơ", Number(r.hoSo)]);
      for (const x of r.so) wt.addRow(["", "", x.ten, Number(x.goc), Number(x.dienTich), Number(x.chenh), x.tyLe === null ? "" : Number(x.tyLe), x.ghiChu ?? "", x.vuot ? "Có" : ""]);
    }
    wt.columns.forEach((c, i) => (c.width = [22, 9, 40, 16, 16, 12, 9, 50, 10][i]));
  }
  await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), `Doi-chieu-dien-tich - ${duAn.ten}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

/** §11.3: thẻ tóm tắt ở Tổng quan dự án + hộp thoại bảng chi tiết (lọc vượt ngưỡng, xuất Excel). */
export function TheDoiChieuDt({ duAn, hos }: { duAn: DuAn; hos: Ho[] }) {
  const { nguongLechDt, di, moCaiDat, luuDuAn, quyen, bao } = useUngDung();
  const ds = useMemo(() => doiChieuDienTich(duAn, hos, nguongLechDt), [duAn, hos, nguongLechDt]);
  const tong = useMemo(() => doiChieuTongDt(duAn, hos, nguongLechDt), [duAn, hos, nguongLechDt]);
  const [suaVb, setSuaVb] = useState(false);
  const vuotTong = tong.flatMap((r) => r.so).filter((x) => x.vuot).length;
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
        <BangTongDt tong={tong} />
        {vuotTong > 0 && <div className="chu-nho" style={{ color: "var(--vang)" }}>{vuotTong} so sánh tổng diện tích lệch vượt ngưỡng</div>}
        <div className="mo chu-nho" style={{ margin: "4px 0 8px" }}>Ngưỡng: {moTaNguong}</div>
        <button className="nut nut-nho" disabled={!ds.length} onClick={() => setMo(true)}>Xem bảng</button>{" "}
        <button className="nut nut-nho" onClick={() => moCaiDat(true)}>Đặt ngưỡng…</button>{" "}
        <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => setSuaVb(true)}>DT thu hồi theo văn bản…</button>
      </div>
      {suaVb && <HopDtVanBan duAn={duAn} dong={() => setSuaVb(false)} luu={async (d) => { await luuDuAn(d); bao("Đã lưu diện tích thu hồi theo văn bản"); setSuaVb(false); }} />}
      {mo && (
        <HopThoai tieuDe="Đối chiếu diện tích ba nguồn" dong={() => setMo(false)} rong={1060} chan={<><button className="nut" onClick={() => void xuatExcel(duAn, hien, moTaNguong, tong)}>Xuất Excel</button><button className="nut" onClick={() => setMo(false)}>Đóng</button></>}>
          <p className="mo chu-nho mt-0">
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

/** 1.0.6: tóm tắt tổng DT thu hồi theo từng phạm vi (dự án, đợt). */
function BangTongDt({ tong }: { tong: DongTongDt[] }) {
  if (!tong.length) return null;
  return (
    <table className="bang mt-6" aria-label="Đối chiếu tổng diện tích thu hồi">
      <thead><tr><th>Tổng DT thu hồi</th><th className="so">Hồ sơ (m²)</th><th className="so">Nguồn so (m²)</th><th className="so">Chênh (m²)</th></tr></thead>
      <tbody>
        {tong.map((r) => [
          <tr key={r.phamVi} className="nhom"><td><b>{r.phamVi}</b> <span className="mo chu-nho">({r.soHo} hồ sơ)</span></td><td className="so"><b>{so(r.hoSo)}</b></td><td /><td /></tr>,
          ...r.so.map((x) => (
            <tr key={r.phamVi + x.nguon}>
              <td className="chu-nho">{x.ten}{x.ghiChu && <div className="mo">{x.ghiChu}</div>}</td>
              <td className="so chu-nho">{so(x.goc)}</td>
              <td className="so chu-nho">{so(x.dienTich)}</td>
              <td className="so chu-nho" style={x.vuot ? { color: "var(--vang)", fontWeight: 700 } : undefined}>{so(x.chenh)}{x.tyLe !== null && ` (${so(x.tyLe)}%)`}</td>
            </tr>
          )),
          ...(!r.so.some((x) => x.nguon === "VAN_BAN") ? [<tr key={r.phamVi + "vb"}><td colSpan={4} className="mo chu-nho">Chưa nhập DT thu hồi theo văn bản (thông báo thu hồi, văn bản giao đất…)</td></tr>] : []),
        ])}
      </tbody>
    </table>
  );
}

/** 1.0.6: nhập tổng DT thu hồi theo văn bản cho dự án và từng đợt (bắt buộc căn cứ). */
function HopDtVanBan({ duAn, dong, luu }: { duAn: DuAn; dong: () => void; luu: (d: DuAn) => Promise<void> }) {
  const hien = (v?: DtThuHoiVb): DtThuHoiVb => (v ? { ...v, dienTich: hienSo(v.dienTich) } : { dienTich: "", canCu: "" });
  const [duAnVb, setDuAnVb] = useState<DtThuHoiVb>(hien(duAn.dtThuHoiVb));
  const [dot, setDot] = useState<Record<string, DtThuHoiVb>>(() => Object.fromEntries((duAn.dotThuHoi ?? []).map((d) => [d.id, hien(d.dtThuHoiVb)])));
  const chuan = (v: string) => docSoNhap(v).so ?? "";
  const loi = (x: DtThuHoiVb) => (!x.dienTich.trim() ? null : docSoNhap(x.dienTich).loi ?? (!x.canCu.trim() ? "Ghi văn bản, điều khoản có diện tích này" : null));
  const ds = [{ id: "", ten: "Toàn dự án", v: duAnVb, dat: setDuAnVb }, ...(duAn.dotThuHoi ?? []).map((d) => ({ id: d.id, ten: `Đợt ${d.so}${d.ten ? ` – ${d.ten}` : ""}`, v: dot[d.id]!, dat: (x: DtThuHoiVb) => setDot({ ...dot, [d.id]: x }) }))];
  const coLoi = ds.map((x) => loi(x.v)).find(Boolean);
  const ra = (x: DtThuHoiVb) => (x.dienTich.trim() ? { dienTich: chuan(x.dienTich), canCu: x.canCu.trim() } : undefined);
  return (
    <HopThoai tieuDe="Diện tích thu hồi theo văn bản" dong={dong} rong={720} chan={<><button className="nut nut-chinh" disabled={!!coLoi} title={coLoi ?? undefined} onClick={() => void luu({ ...duAn, dtThuHoiVb: ra(duAnVb), dotThuHoi: duAn.dotThuHoi?.map((d) => ({ ...d, dtThuHoiVb: ra(dot[d.id]!) })) })}>Lưu</button><button className="nut" onClick={dong}>Hủy</button></>}>
      <p className="mo chu-nho mt-0">Tổng diện tích thu hồi ghi trong văn bản (thông báo thu hồi đất, văn bản giao đất, cho thuê đất, quy mô dự án được duyệt…) để đối chiếu với tổng diện tích thu hồi trong hồ sơ các hộ. Để trống = không đối chiếu. Phần mềm không kết luận số nào đúng.</p>
      {ds.map((x) => (
        <div key={x.id} className="luoi luoi-2 mb-14" style={{ gap: 8, gridTemplateColumns: "180px 1fr" }}>
          <label className="chu-nho">{x.ten} (m²)<input aria-label={`DT thu hồi theo văn bản — ${x.ten}`} value={x.v.dienTich} onChange={(e) => x.dat({ ...x.v, dienTich: e.target.value })} /></label>
          <label className="chu-nho">Văn bản, điều khoản<input aria-label={`Căn cứ DT thu hồi — ${x.ten}`} className={loi(x.v) && x.v.dienTich.trim() && !x.v.canCu.trim() ? "loi-nhap" : ""} placeholder="vd. Thông báo thu hồi đất số …/TB-UBND ngày …" value={x.v.canCu} onChange={(e) => x.dat({ ...x.v, canCu: e.target.value })} /></label>
        </div>
      ))}
      {coLoi && <div className="thong-bao thong-bao-vang">{coLoi}</div>}
    </HopThoai>
  );
}

import { D, dinhDang, tyLeLop, type BoChinhSach } from "@gpmb/core";
import { taoId, type Thua } from "../../mo-hinh";
import { nhomPhanLop } from "../../tinh-ho";
import { tien } from "../../thanh-phan/chung";
import { Chon } from "../../thanh-phan/Chon";

/**
 * Nhập lớp đất (QD-21): cán bộ thêm lớp, chọn vị trí trong bảng giá, nhập diện tích.
 * Phần mềm điền giá vị trí × tỷ lệ theo lớp; giá sửa khác mặc định phải có lý do.
 */
export function PhanLop({ t, cs, sua, moChonTuyen }: { t: Thua; cs: BoChinhSach; sua: (p: Partial<Thua>) => void; moChonTuyen: () => void }) {
  const pl = t.phanLop;
  if (!pl)
    return (
      <div className="nhom-nut" style={{ alignItems: "center" }}>
        <b className="chu-nho">Tính đất theo phân lớp</b>
        <button className="nut nut-nho" onClick={moChonTuyen}>Chọn tuyến trong bảng giá (Bảng 05–07)…</button>
        <span className="mo chu-nho">Cán bộ tự thêm lớp, vị trí, diện tích; phần mềm điền giá và tỷ lệ giảm theo lớp (k6 Đ4 NQ 152/2025).</span>
      </div>
    );
  const nhom = nhomPhanLop(pl.tuyen.bang);
  const tyLeTruoc = cs.giaDat.phanLop[nhom].tyLeSoVoiLopTruoc;
  const doiLop = (id: string, p: Partial<(typeof pl.lop)[number]>) => sua({ phanLop: { ...pl, lop: pl.lop.map((l) => (l.id === id ? { ...l, ...p } : l)) } });
  const viTriCo = pl.tuyen.vt.map((g, i) => ({ vt: i + 1, g })).filter((x) => x.g !== null);
  const tongDt = pl.lop.reduce((s, l) => s.plus(isNaN(Number(l.dienTich)) || !l.dienTich ? 0 : D(l.dienTich)), D(0));
  const khopDt = t.dienTichThuHoi && !isNaN(Number(t.dienTichThuHoi)) && tongDt.toDecimalPlaces(2).eq(D(t.dienTichThuHoi).toDecimalPlaces(2));
  return (
    <div>
      <div className="nhom-nut" style={{ alignItems: "center", marginBottom: 6 }}>
        <b className="chu-nho">Tính đất theo phân lớp</b>
        <span className="chu-nho">Bảng {pl.tuyen.bang}, STT {pl.tuyen.stt}: {pl.tuyen.tuyen}</span>
        <span className="nhan nhan-duong">{nhom === "DAT_O" ? "Đất ở" : "Đất PNN"}: lớp sau = {Number(tyLeTruoc) * 100}% lớp trước</span>
        <span className="tach" />
        <button className="nut nut-chu nut-nho" onClick={moChonTuyen}>Đổi tuyến</button>
        <button className="nut nut-chu nut-nguy nut-nho" onClick={() => confirm("Bỏ tính theo phân lớp cho thửa này?") && sua({ phanLop: undefined })}>Bỏ phân lớp</button>
      </div>
      <table className="bang">
        <thead>
          <tr>
            <th style={{ width: 70 }}>Lớp</th><th style={{ width: 150 }}>Vị trí</th><th className="so" style={{ width: 120 }}>DT (m²)</th>
            <th className="so">Giá VT (đ/m²)</th><th className="so">Tỷ lệ</th><th className="so" style={{ width: 140 }}>Giá lớp (đ/m²)</th><th>Lý do sửa giá</th><th className="so">Thành tiền (đ)</th><th style={{ width: 30 }} />
          </tr>
        </thead>
        <tbody>
          {pl.lop.map((l) => {
            const gVt = pl.tuyen.vt[l.viTri - 1];
            const tyLe = tyLeLop(cs, nhom, l.lop);
            const macDinh = gVt != null ? D(gVt).mul(1000).mul(tyLe) : null;
            const sua1 = l.giaTuyChinh !== undefined && l.giaTuyChinh !== "" && macDinh !== null && !D(l.giaTuyChinh).mul(1000).eq(macDinh);
            const gia = sua1 ? D(l.giaTuyChinh!).mul(1000) : macDinh;
            const dt = l.dienTich && !isNaN(Number(l.dienTich)) ? D(l.dienTich).toDecimalPlaces(2) : null;
            return (
              <tr key={l.id}>
                <td><input type="number" min={1} value={l.lop} onChange={(e) => doiLop(l.id, { lop: Math.max(1, Number(e.target.value)), giaTuyChinh: undefined })} /></td>
                <td>
                  <Chon value={l.viTri} onChange={(e) => doiLop(l.id, { viTri: Number(e.target.value), giaTuyChinh: undefined })}>
                    {viTriCo.map((x) => <option key={x.vt} value={x.vt}>VT{x.vt} – {x.g} nghìn</option>)}
                  </Chon>
                </td>
                <td><input className={`o-so ${l.dienTich && dt === null ? "loi-nhap" : ""}`} value={l.dienTich} onChange={(e) => doiLop(l.id, { dienTich: e.target.value })} /></td>
                <td className="so">{gVt != null ? tien(D(gVt).mul(1000)) : "—"}</td>
                <td className="so">{dinhDang(tyLe.mul(100), 2)}%</td>
                <td>
                  <input className="o-so" placeholder={macDinh ? tien(macDinh) : ""} title="Đồng/m². Để trống = giá phần mềm điền"
                    value={l.giaTuyChinh ? D(l.giaTuyChinh).mul(1000).toString() : ""}
                    onChange={(e) => { const v = e.target.value.replace(/[.\s]/g, "").replace(",", "."); doiLop(l.id, { giaTuyChinh: v && !isNaN(Number(v)) ? D(v).div(1000).toString() : undefined }); }} />
                  <div className="chu-nho mo" style={{ textAlign: "right" }}>{gia ? `${tien(gia)} đ` : ""}</div>
                </td>
                <td>{sua1 && <input className={l.lyDo ? "" : "loi-nhap"} placeholder="Bắt buộc khi sửa giá" value={l.lyDo ?? ""} onChange={(e) => doiLop(l.id, { lyDo: e.target.value })} />}</td>
                <td className="so">{gia && dt ? tien(gia.mul(dt)) : "—"}</td>
                <td><button className="nut nut-chu nut-nguy nut-nho" onClick={() => sua({ phanLop: { ...pl, lop: pl.lop.filter((x) => x.id !== l.id) } })}>✕</button></td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={2}>
              <button className="nut nut-nho" onClick={() => sua({ phanLop: { ...pl, lop: [...pl.lop, { id: taoId(), lop: (pl.lop.at(-1)?.lop ?? 0) + 1, viTri: pl.lop.at(-1)?.viTri ?? viTriCo[0]?.vt ?? 1, dienTich: "" }] } })}>+ Thêm lớp</button>
            </td>
            <td className="so"><b>{dinhDang(tongDt, 2)}</b></td>
            <td colSpan={6} className="chu-nho">
              {khopDt ? <span className="mo">Khớp DT thu hồi</span> : <span style={{ color: "var(--vang)" }}>Tổng DT các lớp khác DT thu hồi ({t.dienTichThuHoi || "—"} m²)</span>}
              <span className="mo"> · Phần mềm không tự chia lớp theo chiều sâu, không tự áp sàn giá (điểm d k6 Đ4) — cán bộ kiểm tra.</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

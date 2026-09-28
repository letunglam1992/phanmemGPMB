import type { DuAn } from "../mo-hinh";
import { GOI_Y_MA_TRAN, loiCauHinhThuong, type CauHinhThuong, type MocThuong } from "../ban-giao";
import { TEN_COT, type CotTongHop } from "../tinh-ho";
import { O } from "./chung";
import { OSo } from "./OSo";

const CO_SO: CotTongHop[] = ["BT_DAT", "BT_TAI_SAN", "BT_CAY", "HT_DAT", "HT_TAI_SAN", "HT_CAY"];

/** Khai báo thưởng bàn giao mặt bằng trước hạn của dự án (P1-4, C13). Phần mềm không tự đặt mức — cán bộ nhập kèm căn cứ. */
export function CauHinhThuongBanGiao({ d, setD }: { d: DuAn; setD: (d: DuAn) => void }) {
  const c: CauHinhThuong = d.thuongBanGiao ?? { moc: [], coSo: ["BT_DAT", "BT_TAI_SAN"], canCu: "" };
  const dat = (p: Partial<CauHinhThuong>) => setD({ ...d, thuongBanGiao: { ...c, ...p } });
  const suaMoc = (i: number, p: Partial<MocThuong>) => dat({ moc: c.moc.map((m, j) => (j === i ? { ...m, ...p } : m)) });
  const loi = d.thuongBanGiao ? loiCauHinhThuong(c) : null;
  return (
    <div className="the" style={{ gridColumn: "1" }}>
      <div className="the-dau"><h3>Thưởng bàn giao mặt bằng trước hạn</h3><span className="mo chu-nho">C13 · cán bộ khai báo</span></div>
      <div className="the-than luoi" style={{ gap: 8 }}>
        <p className="mo chu-nho" style={{ margin: 0 }}>
          Nhập các mốc (hạn bàn giao, tỷ lệ, mức tối đa) theo văn bản áp dụng cho dự án. Thưởng = tỷ lệ × cơ sở tính, không quá mức tối đa, theo mốc chứa ngày bàn giao. Cơ sở tính (VM-16) do cán bộ chọn.
        </p>
        <O nhan="Căn cứ (bắt buộc)"><input value={c.canCu} placeholder="Điều, khoản, văn bản; văn bản xác định các mốc của dự án" onChange={(e) => dat({ canCu: e.target.value })} /></O>
        <div>
          <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 4 }}>Cơ sở tính</div>
          <div className="nhom-nut" style={{ flexWrap: "wrap" }}>
            {CO_SO.map((k) => (
              <label key={k} className="chu-nho" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <input type="checkbox" checked={c.coSo.includes(k)} onChange={(e) => dat({ coSo: e.target.checked ? [...c.coSo, k] : c.coSo.filter((x) => x !== k) })} /> {TEN_COT[k]}
              </label>
            ))}
          </div>
        </div>
        <table className="bang">
          <thead><tr><th>Mốc</th><th>Bàn giao đến hết ngày</th><th className="so">Tỷ lệ (%)</th><th className="so">Tối đa (đ)</th><th /></tr></thead>
          <tbody>
            {c.moc.map((m, i) => (
              <tr key={i}>
                <td><input value={m.ten} onChange={(e) => suaMoc(i, { ten: e.target.value })} style={{ width: 90 }} /></td>
                <td><input type="date" value={m.denNgay} onChange={(e) => suaMoc(i, { denNgay: e.target.value })} /></td>
                <td><OSo value={m.tyLe} onChange={(v) => suaMoc(i, { tyLe: v })} style={{ width: 70 }} /></td>
                <td><OSo value={m.toiDa} onChange={(v) => suaMoc(i, { toiDa: v })} style={{ width: 130 }} /></td>
                <td><button className="nut nut-chu nut-nguy nut-nho" onClick={() => dat({ moc: c.moc.filter((_, j) => j !== i) })}>✕</button></td>
              </tr>
            ))}
            {!c.moc.length && <tr><td colSpan={5} className="trong">Chưa khai báo mốc — thưởng ở hồ sơ hộ hiện "Thiếu căn cứ".</td></tr>}
          </tbody>
        </table>
        <div className="nhom-nut">
          <button className="nut nut-nho" onClick={() => dat({ moc: [...c.moc, { ten: `Mốc ${c.moc.length + 1}`, denNgay: "", tyLe: "", toiDa: "" }] })}>+ Thêm mốc</button>
          <button className="nut nut-nho" title={GOI_Y_MA_TRAN.canhBao} onClick={() => confirm(GOI_Y_MA_TRAN.canhBao) && dat({ moc: GOI_Y_MA_TRAN.moc.map((m) => ({ ...m })), coSo: [...GOI_Y_MA_TRAN.coSo], canCu: c.canCu || GOI_Y_MA_TRAN.canCu })}>Điền theo ma trận nghiệp vụ (cần đối chiếu)</button>
          {d.thuongBanGiao && <button className="nut nut-nho nut-chu" onClick={() => { const { thuongBanGiao: _b, ...con } = d; setD(con); }}>Bỏ khai báo</button>}
        </div>
        {loi && <div className="chu-do chu-nho">{loi}</div>}
      </div>
    </div>
  );
}

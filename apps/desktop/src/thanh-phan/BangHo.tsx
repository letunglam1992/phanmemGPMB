import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { tienDoHo, daQuaBuoc, CAC_BUOC, hoHieuLuc, type DuAn, type Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { TT_GPMB, vuongMacHo, type TrangThaiGpmb } from "../trang-thai";
import { tien } from "./chung";
import { soD } from "../so";

export interface DongHo {
  h: Ho;
  k: KetQuaHo;
  duAn: DuAn;
  tt: TrangThaiGpmb;
}

const dtThuHoi = (h: Ho) => h.thua.reduce((s, t) => s.plus(soD(t.dienTichThuHoi)), D(0));

/**
 * Bảng hộ, cá nhân, tổ chức: STT, họ tên, địa chỉ, tờ, thửa, diện tích thu hồi, loại đất (mỗi thửa một dòng),
 * bồi thường, hỗ trợ, tổng, tiến độ thực hiện, khó khăn vướng mắc. Bấm một dòng để mở hồ sơ.
 */
export function BangHo({ ds, homNay, coDuAn, mo, trong }: { ds: DongHo[]; homNay: string; coDuAn?: boolean; mo: (x: DongHo) => void; trong?: string }) {
  const tong = (f: (x: DongHo) => Decimal) => ds.reduce((s, x) => s.plus(f(x)), D(0));
  const soCot = coDuAn ? 14 : 13;
  return (
    <div className="bang-cuon bang-ho">
      <table className="bang">
        <thead>
          <tr>
            <th className="so" style={{ width: 44 }}>STT</th>
            <th className="c-ten">Họ và tên</th>
            {coDuAn && <th className="c-da">Dự án</th>}
            <th className="c-dc">Địa chỉ</th>
            <th className="so">Số tờ</th>
            <th className="so">Số thửa</th>
            <th className="so">DT thu hồi (m²)</th>
            <th>Loại đất</th>
            <th className="so">Bồi thường (đ)</th>
            <th className="so">Hỗ trợ (đ)</th>
            <th className="so">Tổng (làm tròn)</th>
            <th style={{ minWidth: 190 }}>Tiến độ thực hiện</th>
            <th style={{ minWidth: 200 }}>Khó khăn, vướng mắc</th>
          </tr>
        </thead>
        <tbody>
          {ds.map((x, i) => {
            const { h, k, duAn, tt } = x;
            const hl = hoHieuLuc(duAn, h);
            const iHt = CAC_BUOC.findIndex((b) => !daQuaBuoc(hl.tienDo[b.ma]?.trangThai));
            const b = CAC_BUOC[iHt];
            const vm = vuongMacHo(duAn, h, k, homNay);
            const thua = h.thua.length ? h.thua : [null];
            return (
              <tr key={h.id} className="co-the-chon" data-ho-id={h.id} data-du-an-id={duAn.id} onClick={() => mo(x)} title="Bấm để mở hồ sơ">
                <td className="so">{i + 1}</td>
                <td className="c-ten"><b>{h.ten}</b><div className="mo chu-nho">{h.ma}</div></td>
                {coDuAn && <td className="chu-nho c-da">{duAn.ten}</td>}
                <td className="chu-nho c-dc">{h.diaChi || "—"}</td>
                <td className="so">{thua.map((t, j) => <div key={j}>{t?.soTo || "—"}</div>)}</td>
                <td className="so">{thua.map((t, j) => <div key={j}>{t?.soThua || "—"}</div>)}</td>
                <td className="so">{thua.map((t, j) => <div key={j}>{t ? tien(soD(t.dienTichThuHoi).toDecimalPlaces(2)) : "—"}</div>)}</td>
                <td>{thua.map((t, j) => <div key={j}>{t?.loaiDat || "—"}</div>)}</td>
                <td className="so">{tien(k.tongBoiThuong)}</td>
                <td className="so">{tien(k.tongHoTro)}</td>
                <td className="so"><b>{tien(k.tong.tongLamTron)}</b></td>
                <td>
                  <div className="chu-nho">{b ? `Bước ${b.ma}. ${b.ten}` : "Đã hoàn thành 16 bước"}</div>
                  <div className="td-mini"><span style={{ width: `${Math.round(tienDoHo(hl).tyLe * 100)}%` }} /></div>
                  <span className="nhan" style={{ background: TT_GPMB[tt].nen, color: "var(--chu)", fontSize: 11 }}>{TT_GPMB[tt].bieuTuong} {TT_GPMB[tt].ten}</span>
                </td>
                <td className="chu-nho">
                  {vm.length === 0 ? <span className="mo">—</span> : vm.map((v, j) => <div key={j} style={{ color: v.muc === "CAO" ? "var(--do)" : "var(--vang)" }}>• {v.noiDung}</div>)}
                </td>
              </tr>
            );
          })}
          {ds.length === 0 && <tr><td colSpan={soCot} className="trong">{trong ?? "Không có hồ sơ."}</td></tr>}
          {ds.length > 0 && (
            <tr className="tong">
              <td colSpan={coDuAn ? 6 : 5}>Tổng cộng ({ds.length} hồ sơ)</td>
              <td className="so">{tien(tong((x) => dtThuHoi(x.h)).toDecimalPlaces(2))}</td>
              <td />
              <td className="so">{tien(tong((x) => x.k.tongBoiThuong))}</td>
              <td className="so">{tien(tong((x) => x.k.tongHoTro))}</td>
              <td className="so">{tien(tong((x) => x.k.tong.tongLamTron))}</td>
              <td colSpan={2} className="mo chu-nho">Tổng chỉ cộng các khoản "Tạm tính"</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useMemo, useRef } from "react";
import { tenDayDu } from "../van-ban/loai-dat";
import { D } from "@gpmb/core";
import { useCuaSo } from "./cua-so";
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
 * `chon`/`doiChon`: cột ô tích chọn (ô tiêu đề = chọn tất cả các hộ đang hiện theo bộ lọc). `toSang`: hộ vừa làm.
 */
export function BangHo({ ds, homNay, coDuAn, mo, trong, chon, doiChon, toSang }: { ds: DongHo[]; homNay: string; coDuAn?: boolean; mo: (x: DongHo) => void; trong?: string; chon?: Set<string>; doiChon?: (ids: string[], co: boolean) => void; toSang?: string }) {
  const tong = (f: (x: DongHo) => Decimal) => ds.reduce((s, x) => s.plus(f(x)), D(0));
  const coChon = !!chon && !!doiChon;
  const soCot = (coDuAn ? 14 : 13) + (coChon ? 1 : 0);
  const soChonHien = coChon ? ds.filter((x) => chon.has(x.h.id)).length : 0;
  const oTatCa = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (oTatCa.current) oTatCa.current.indeterminate = soChonHien > 0 && soChonHien < ds.length;
  }, [soChonHien, ds.length]);
  const khoa = useMemo(() => ds.map((x) => x.h.id), [ds]);
  const cs = useCuaSo(khoa);
  return (
    <div className="bang-cuon bang-ho">
      <table className="bang" ref={(e) => void (cs.bang.current = e)}>
        <thead>
          <tr>
            {coChon && (
              <th style={{ width: 34 }} onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" ref={oTatCa} aria-label="Chọn tất cả hồ sơ theo bộ lọc" title="Chọn / bỏ chọn tất cả hồ sơ đang hiện (theo bộ lọc)" checked={ds.length > 0 && soChonHien === ds.length} disabled={!ds.length} onChange={(e) => doiChon(ds.map((x) => x.h.id), e.target.checked)} />
              </th>
            )}
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
          {cs.dem_tren > 0 && <tr aria-hidden style={{ height: cs.dem_tren }}><td colSpan={soCot} /></tr>}
          {ds.slice(cs.dau, cs.cuoi).map((x, j0) => {
            const i = cs.dau + j0;
            const { h, k, duAn, tt } = x;
            const hl = hoHieuLuc(duAn, h);
            const iHt = CAC_BUOC.findIndex((b) => !daQuaBuoc(hl.tienDo[b.ma]?.trangThai));
            const b = CAC_BUOC[iHt];
            const vm = vuongMacHo(duAn, h, k, homNay);
            const thua = h.thua.length ? h.thua : [null];
            return (
              <tr key={h.id} ref={cs.bat ? cs.do_(h.id) : undefined} className={`co-the-chon${coChon && chon.has(h.id) ? " dang-chon" : ""}${toSang === h.id ? " vua-lam" : ""}`} data-ho-id={h.id} data-du-an-id={duAn.id} onClick={() => mo(x)} title="Bấm để mở hồ sơ">
                {coChon && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Chọn hồ sơ ${h.ma} ${h.ten}`} checked={chon.has(h.id)} onChange={(e) => doiChon([h.id], e.target.checked)} />
                  </td>
                )}
                <td className="so">{i + 1}</td>
                <td className="c-ten"><b>{h.ten}</b><div className="mo chu-nho">{h.ma}</div></td>
                {coDuAn && <td className="chu-nho c-da">{duAn.ten}</td>}
                <td className="chu-nho c-dc">{h.diaChi || "—"}</td>
                <td className="so">{thua.map((t, j) => <div key={j}>{t?.soTo || "—"}</div>)}</td>
                <td className="so">{thua.map((t, j) => <div key={j}>{t?.soThua || "—"}</div>)}</td>
                <td className="so">{thua.map((t, j) => <div key={j}>{t ? tien(soD(t.dienTichThuHoi).toDecimalPlaces(2)) : "—"}</div>)}</td>
                <td>{thua.map((t, j) => <div key={j} className="o-loai-dat" title={t?.loaiDat ? tenDayDu(t.loaiDat) : ""}>{t?.loaiDat ? tenDayDu(t.loaiDat) : "—"}</div>)}</td>
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
          {cs.dem_duoi > 0 && <tr aria-hidden style={{ height: cs.dem_duoi }}><td colSpan={soCot} /></tr>}
          {ds.length === 0 && <tr><td colSpan={soCot} className="trong">{trong ?? "Không có hồ sơ."}</td></tr>}
          {ds.length > 0 && (
            <tr className="tong">
              <td colSpan={(coDuAn ? 6 : 5) + (coChon ? 1 : 0)}>Tổng cộng ({ds.length} hồ sơ)</td>
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

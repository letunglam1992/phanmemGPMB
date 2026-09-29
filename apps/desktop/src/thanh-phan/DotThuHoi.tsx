import { useMemo, useState } from "react";
import { D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import type { DotThuHoi, DuAn, Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { CHUA_XEP_DOT, dotMoi, dsDot, khopDot, loiDot, lyDoKhongDoiDot, lyDoKhongXoaDot, tenDot, tongHopTheoDot } from "../dot-thu-hoi";
import { TEN_TT_PA } from "../phuong-an";
import { HopThoai, O, ngayVN, tien } from "./chung";
import { Chon } from "./Chon";
import { BieuTuong } from "./BieuDo";
import { hienSo } from "../so";
import { khopTuKhoa } from "../tim-kiem";

/** Chọn đợt để lọc: "" = mọi đợt / cả dự án, CHUA_XEP_DOT = chưa xếp đợt. */
export function ChonDot({ duAn, value, onChange, nhanTatCa = "Mọi đợt thu hồi", coChuaXep = true, ...p }: { duAn: DuAn; value: string; onChange: (v: string) => void; nhanTatCa?: string; coChuaXep?: boolean; "aria-label"?: string; style?: React.CSSProperties }) {
  return (
    <Chon value={value} onChange={(e) => onChange(e.target.value)} aria-label={p["aria-label"] ?? "Lọc đợt thu hồi"} style={p.style}>
      <option value="">{nhanTatCa}</option>
      {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)}</option>)}
      {coChuaXep && <option value={CHUA_XEP_DOT}>Chưa xếp đợt</option>}
    </Chon>
  );
}

/**
 * Khai báo đợt thu hồi (thẻ Thông tin dự án) — sửa trên bản nháp `d` của dự án, lưu cùng nút Lưu của thẻ.
 * Xóa đợt bị chặn khi còn hộ hoặc bản phương án thuộc đợt.
 */
export function TheDotThuHoi({ d, setD, hos }: { d: DuAn; setD: (d: DuAn) => void; hos: Ho[] }) {
  const ds = dsDot(d);
  const [loi, setLoi] = useState("");
  const sua = (id: string, p: Partial<DotThuHoi>) => setD({ ...d, dotThuHoi: (d.dotThuHoi ?? []).map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const xoa = (x: DotThuHoi) => {
    const ly = lyDoKhongXoaDot(x, hos, d.phuongAn ?? []);
    if (ly.length) return setLoi(`Không xóa được ${tenDot(x)}: ${ly.join("; ")}.`);
    setLoi("");
    const con = (d.dotThuHoi ?? []).filter((y) => y.id !== x.id);
    setD({ ...d, dotThuHoi: con.length ? con : undefined });
  };
  return (
    <div className="the" style={{ gridColumn: "1 / -1" }}>
      <div className="the-dau">
        <h3>Đợt thu hồi</h3>
        <span className="mo chu-nho">Dự án thu hồi nhiều đợt: phương án chốt, phê duyệt theo từng đợt; mã hồ sơ đánh số chung cả dự án; tổng hợp dự án gồm mọi đợt</span>
        <div className="phai"><button className="nut nut-nho" onClick={() => setD({ ...d, dotThuHoi: [...(d.dotThuHoi ?? []), dotMoi(d)] })}><BieuTuong ten="cong" co={14} /> Thêm đợt</button></div>
      </div>
      {loi && <div className="thong-bao thong-bao-do" style={{ margin: "8px 12px 0" }}>{loi}</div>}
      {ds.length === 0 ? (
        <div className="trong chu-nho">Dự án chưa chia đợt — mọi hộ thuộc một phương án chung. Thêm đợt khi thông báo thu hồi, phương án được lập theo từng đợt.</div>
      ) : (
        <div className="bang-cuon">
          <table className="bang">
            <thead><tr><th style={{ width: 64 }}>Số</th><th style={{ width: 150 }}>Tên đợt</th><th>Căn cứ thu hồi của đợt</th><th style={{ width: 150 }}>Ngày thông báo</th><th>Phạm vi</th><th className="so" style={{ width: 70 }}>Số hộ</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {ds.map((x) => {
                const l = loiDot(x, ds);
                return (
                  <tr key={x.id}>
                    <td><input type="number" min={1} aria-label={`Số thứ tự ${tenDot(x)}`} value={x.so} onChange={(e) => sua(x.id, { so: Number(e.target.value) })} /></td>
                    <td><input className={l ? "loi-nhap" : ""} title={l ?? undefined} aria-label="Tên đợt" value={x.ten} onChange={(e) => sua(x.id, { ten: e.target.value })} /></td>
                    <td><input aria-label={`Căn cứ thu hồi ${tenDot(x)}`} value={x.canCuThuHoi ?? ""} placeholder={d.canCuThuHoi ? `Trống = theo dự án: ${d.canCuThuHoi}` : "vd. Thông báo thu hồi đất số …/TB-UBND"} onChange={(e) => sua(x.id, { canCuThuHoi: e.target.value || undefined })} /></td>
                    <td><input type="date" aria-label={`Ngày thông báo ${tenDot(x)}`} value={x.ngayThongBao ?? ""} onChange={(e) => sua(x.id, { ngayThongBao: e.target.value || undefined })} /></td>
                    <td><input aria-label={`Phạm vi ${tenDot(x)}`} value={x.phamVi ?? ""} placeholder="vd. Km0+000 – Km2+500; bản Mé" onChange={(e) => sua(x.id, { phamVi: e.target.value || undefined })} /></td>
                    <td className="so">{hos.filter((h) => h.dotId === x.id && !h.daXoa).length}</td>
                    <td><button className="nut nut-chu nut-nguy nut-nho" aria-label={`Xóa ${tenDot(x)}`} onClick={() => xoa(x)}><BieuTuong ten="thungRac" co={15} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ds.some((x) => loiDot(x, ds)) && <div className="thong-bao thong-bao-do chu-nho" style={{ margin: 8 }}>{ds.map((x) => loiDot(x, ds)).filter(Boolean).join("; ")}</div>}
        </div>
      )}
    </div>
  );
}
export const loiDsDot = (d: DuAn) => dsDot(d).map((x) => loiDot(x, dsDot(d))).find(Boolean) ?? null;

/** Xếp nhiều hộ vào một đợt (cập nhật hàng loạt, nguyên tử). */
export function HopXepDot({ duAn, hos, dong }: { duAn: DuAn; hos: Ho[]; dong: () => void }) {
  const { luuNhieuHo, bao } = useUngDung();
  const [dot, setDot] = useState(dsDot(duAn)[0]?.id ?? "");
  const [loc, setLoc] = useState(CHUA_XEP_DOT);
  const [tim, setTim] = useState("");
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [dang, setDang] = useState(false);
  const ds = hos.filter((h) => khopDot(h, loc, duAn)).filter((h) => khopTuKhoa({ h, duAnTen: "" }, tim));
  const chan = new Map(hos.map((h) => [h.id, lyDoKhongDoiDot(duAn, h, dot || undefined)]));
  const luu = async () => {
    const dsLuu = hos.filter((h) => chon.has(h.id) && !chan.get(h.id) && (h.dotId ?? "") !== dot);
    if (!dsLuu.length) return bao("Không có hộ nào cần chuyển đợt", "loi");
    setDang(true);
    try {
      const ten = dot ? tenDot(dsDot(duAn).find((x) => x.id === dot)) : "Chưa xếp đợt";
      const r = await luuNhieuHo(dsLuu.map((h) => ({ h: { ...h, dotId: dot || undefined }, nhatKy: `Xếp vào ${ten}${h.dotId ? ` (trước: ${tenDot(dsDot(duAn).find((x) => x.id === h.dotId))})` : ""}` })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
      bao(`Đã xếp ${r.daLuu} hộ vào ${ten}`);
      dong();
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Xếp hộ vào đợt thu hồi" rong={860} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={dang || !chon.size} onClick={() => void luu()}>Xếp {chon.size} hộ</button></>}>
      <div className="luoi luoi-3" style={{ marginBottom: 10 }}>
        <O nhan="Xếp vào đợt">
          <Chon value={dot} onChange={(e) => setDot(e.target.value)} aria-label="Xếp vào đợt">
            {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)}</option>)}
            <option value="">Bỏ khỏi đợt (chưa xếp)</option>
          </Chon>
        </O>
        <O nhan="Hiện hộ"><ChonDot duAn={duAn} value={loc} onChange={(v) => { setLoc(v); setChon(new Set()); }} nhanTatCa="Mọi hộ" aria-label="Hiện hộ theo đợt" /></O>
        <O nhan="Tìm"><input value={tim} placeholder="Tên, mã, tờ/thửa…" onChange={(e) => setTim(e.target.value)} /></O>
      </div>
      <div className="bang-cuon" style={{ maxHeight: 380 }}>
        <table className="bang">
          <thead><tr><th style={{ width: 36 }}><input type="checkbox" aria-label="Chọn tất cả" checked={ds.length > 0 && ds.every((h) => chon.has(h.id) || !!chan.get(h.id))} onChange={(e) => setChon(e.target.checked ? new Set(ds.filter((h) => !chan.get(h.id)).map((h) => h.id)) : new Set())} /></th><th>Mã</th><th>Họ tên</th><th>Đợt hiện tại</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {ds.map((h) => {
              const c = chan.get(h.id);
              return (
                <tr key={h.id}>
                  <td><input type="checkbox" aria-label={`Chọn ${h.ma}`} disabled={!!c} checked={chon.has(h.id)} onChange={(e) => { const s = new Set(chon); if (e.target.checked) s.add(h.id); else s.delete(h.id); setChon(s); }} /></td>
                  <td>{h.ma}</td><td>{h.ten}</td><td>{tenDot(dsDot(duAn).find((x) => x.id === h.dotId))}</td>
                  <td className="chu-nho">{c ? <span className="chu-do">Không chuyển được: {c}</span> : null}</td>
                </tr>
              );
            })}
            {!ds.length && <tr><td colSpan={5} className="trong">Không có hộ khớp điều kiện.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

/** Tổng hợp theo đợt (thẻ Tổng quan dự án). */
export function TheTongHopDot({ duAn, kq, moDot }: { duAn: DuAn; kq: { h: Ho; k: KetQuaHo }[]; moDot?: (dotId: string) => void }) {
  const ds = useMemo(() => tongHopTheoDot(duAn, kq), [duAn, kq]);
  const cong = (f: (x: (typeof ds)[number]) => number | import("decimal.js").default) => ds.reduce((s, x) => s.plus(f(x)), D(0));
  return (
    <div className="the" style={{ marginBottom: 14 }}>
      <div className="the-dau"><h3>Tổng hợp theo đợt thu hồi</h3><span className="mo chu-nho">Phương án chốt, phê duyệt theo đợt; dòng cộng là tổng chung của dự án</span></div>
      <div className="bang-cuon">
        <table className="bang">
          <thead><tr><th>Đợt</th><th>Thông báo</th><th className="so">Số hộ</th><th className="so">DT thu hồi (m²)</th><th className="so">Tạm tính (đ)</th><th>Bản phương án</th><th className="so">Đã phê duyệt (đ)</th><th className="so">Đã bàn giao</th></tr></thead>
          <tbody>
            {ds.map((x) => (
              <tr key={x.dotId} className={moDot ? "co-the-chon" : undefined} onClick={moDot ? () => moDot(x.dotId) : undefined}>
                <td>{x.dotId === CHUA_XEP_DOT ? <span className="nhan nhan-vang">{x.ten}</span> : <b>{x.ten}</b>}</td>
                <td className="chu-nho">{ngayVN(x.ngayThongBao ?? "") || "—"}</td>
                <td className="so">{x.soHo}</td>
                <td className="so">{hienSo(x.dtThuHoi.toFixed())}</td>
                <td className="so">{tien(x.tamTinh)}</td>
                <td className="chu-nho">{x.banPa.length ? x.banPa.map((p) => `Bản ${p.so}: ${TEN_TT_PA[p.trangThai]}${p.qd ? ` (${p.qd})` : ""}`).join("; ") : "—"}</td>
                <td className="so">{x.soHoDaPheDuyet ? <>{tien(x.daPheDuyet)}<div className="mo chu-nho">{x.soHoDaPheDuyet}/{x.soHo} hộ</div></> : "—"}</td>
                <td className="so">{x.soHoBanGiao}/{x.soHo}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><th>Cả dự án</th><th /><th className="so">{cong((x) => x.soHo).toFixed()}</th><th className="so">{hienSo(cong((x) => x.dtThuHoi).toFixed())}</th><th className="so">{tien(cong((x) => x.tamTinh))}</th><th /><th className="so">{tien(cong((x) => x.daPheDuyet))}</th><th className="so">{cong((x) => x.soHoBanGiao).toFixed()}/{cong((x) => x.soHo).toFixed()}</th></tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

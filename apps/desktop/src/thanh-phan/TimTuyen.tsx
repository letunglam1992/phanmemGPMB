import { useMemo, useState } from "react";
import type { Ho } from "../mo-hinh";
import type { DuLieuBanDo } from "../man/ban-do/du-lieu";
import { daiTuyen, docDiem, hienDiem, hienLyTrinh, lyTrinhThua, type DiemXY, type LyTrinh } from "../ly-trinh";
import { HopThoai } from "./chung";
import { useUngDung } from "../ung-dung";

const so = (x: string | null | undefined) => (x ?? "").trim().replace(/^0+(?=\d)/, "");

/**
 * 1.0.5 — tính lý trình gợi ý cho thửa từ đường tim tuyến trong bản đồ: chọn lớp và đường (đường, đường gấp khúc, chuỗi
 * phức), lý trình tại điểm đầu, chiều tính; phần mềm chiếu ranh từng thửa hồ sơ lên tim tuyến. Cán bộ chọn thửa cần ghi
 * — không tự ghi đè lý trình đã có.
 */
export function HopTimTuyen({ dl, hos, dong }: { dl: DuLieuBanDo; hos: Ho[]; dong: () => void }) {
  const { luuNhieuHo, bao } = useUngDung();
  const duong = useMemo(
    () =>
      dl.ban.phanTu
        .filter((p) => !p.laThanhPhan && (p.loai === "DUONG" || p.loai === "DUONG_GAP" || p.loai === "CHUOI_PHUC") && "diem" in p && p.diem.length >= 2)
        .map((p) => ({ stt: p.stt, lop: p.lop, diem: (p as { diem: DiemXY[] }).diem, dai: daiTuyen((p as { diem: DiemXY[] }).diem) }))
        .filter((x) => x.dai > 50),
    [dl],
  );
  const dsLop = [...new Set(duong.map((x) => x.lop))].sort((a, b) => a - b);
  const [lop, setLop] = useState<number>(() => duong.reduce((m, x) => (x.dai > (m?.dai ?? 0) ? x : m), duong[0])?.lop ?? dsLop[0] ?? 0);
  const ds = duong.filter((x) => x.lop === lop).sort((a, b) => b.dai - a.dai);
  const [stt, setStt] = useState<number | null>(null);
  const tuyen = ds.find((x) => x.stt === stt) ?? ds[0];
  const [goc, setGoc] = useState("Km0+000");
  const [dao, setDao] = useState(false);
  const [toiDa, setToiDa] = useState("200");
  const gocM = docDiem(goc);
  const thuaBd = new Map(dl.kq.thua.map((t) => [t.ma, t]));
  const theoSo = new Map(dl.kq.thua.map((t) => [`${so(t.soTo)}/${so(t.soThua)}`, t]));
  const goiY = useMemo(() => {
    if (!tuyen || gocM === null) return [];
    return hos.flatMap((h) =>
      h.thua.flatMap((t) => {
        const bd = (t.maBanDo && thuaBd.get(t.maBanDo)) || theoSo.get(`${so(t.soTo)}/${so(t.soThua)}`);
        if (!bd) return [];
        const r = lyTrinhThua(bd.vong, tuyen.diem, gocM, dao);
        return r && r.cach <= (Number(toiDa) || 200) ? [{ h, t, ...r }] : [];
      }),
    );
  }, [tuyen, gocM, dao, toiDa, hos]); // eslint-disable-line react-hooks/exhaustive-deps
  const [chon, setChon] = useState<Set<string> | null>(null);
  const daChon = chon ?? new Set(goiY.filter((x) => !x.t.lyTrinh).map((x) => x.t.id));
  const [dang, setDang] = useState(false);
  const ghi = async () => {
    const theoHo = new Map<string, { h: Ho; doi: string[] }>();
    for (const x of goiY.filter((y) => daChon.has(y.t.id))) {
      const m = theoHo.get(x.h.id) ?? { h: { ...x.h, thua: x.h.thua.map((y) => ({ ...y })) }, doi: [] };
      m.h.thua.find((y) => y.id === x.t.id)!.lyTrinh = x.ly as LyTrinh;
      m.doi.push(`thửa ${x.t.soThua} tờ ${x.t.soTo}: ${hienLyTrinh(x.ly)}`);
      theoHo.set(x.h.id, m);
    }
    if (!theoHo.size) return;
    setDang(true);
    try {
      const r = await luuNhieuHo([...theoHo.values()].map(({ h, doi }) => ({ h, nhatKy: `Ghi lý trình từ tim tuyến (lớp ${lop}, điểm đầu ${hienDiem(gocM!)}${dao ? ", đảo chiều" : ""}): ${doi.join("; ")}` })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
      bao(`Đã ghi lý trình cho ${daChon.size} thửa của ${r.daLuu} hộ`);
      dong();
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Tính lý trình từ tim tuyến" rong={980} dong={dong}
      chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={dang || !goiY.some((x) => daChon.has(x.t.id))} onClick={() => void ghi()}>{dang ? "Đang ghi…" : `Ghi lý trình cho ${goiY.filter((x) => daChon.has(x.t.id)).length} thửa đã chọn`}</button></>}>
      {!duong.length ? <div className="thong-bao thong-bao-vang">Bản đồ không có đường (đường gấp khúc, chuỗi) dài trên 50 m để làm tim tuyến — nạp tệp có tim tuyến (thường là tệp thiết kế tuyến) làm một tờ bản đồ.</div> : (
        <>
          <p className="mo chu-nho" style={{ marginTop: 0 }}>Chọn lớp, đường tim tuyến; ghi lý trình tại điểm đầu đường vẽ (vd. đoạn qua xã bắt đầu Km12+000). Phần mềm chiếu ranh từng thửa hồ sơ (đã gắn bản đồ, hoặc khớp số tờ/thửa) lên tim tuyến → lý trình đầu–cuối thửa. Kết quả là gợi ý; thửa đã có lý trình mặc định không chọn.</p>
          <div className="luoi luoi-4 mb-10">
            <label className="o-nhap"><span>Lớp tim tuyến</span><select aria-label="Lớp tim tuyến" value={lop} onChange={(e) => { setLop(Number(e.target.value)); setStt(null); setChon(null); }}>{dsLop.map((l) => <option key={l} value={l}>Lớp {l} ({duong.filter((x) => x.lop === l).length} đường)</option>)}</select></label>
            <label className="o-nhap"><span>Đường</span><select aria-label="Đường tim tuyến" value={tuyen?.stt ?? ""} onChange={(e) => { setStt(Number(e.target.value)); setChon(null); }}>{ds.map((x) => <option key={x.stt} value={x.stt}>#{x.stt} — dài {Math.round(x.dai).toLocaleString("vi-VN")} m</option>)}</select></label>
            <label className="o-nhap"><span>Lý trình tại điểm đầu</span><input aria-label="Lý trình tại điểm đầu" className={gocM === null ? "loi-nhap" : ""} value={goc} onChange={(e) => { setGoc(e.target.value); setChon(null); }} /></label>
            <label className="o-nhap"><span>Chỉ thửa cách tim tuyến ≤ (m)</span><input aria-label="Khoảng cách tối đa" value={toiDa} onChange={(e) => setToiDa(e.target.value)} /></label>
          </div>
          <label className="chu-nho"><input type="checkbox" checked={dao} onChange={(e) => { setDao(e.target.checked); setChon(null); }} /> Km0 ở cuối đường vẽ (đảo chiều tính)</label>
          <div className="bang-cuon mt-8" style={{ maxHeight: 380 }}>
            <table className="bang" aria-label="Lý trình gợi ý">
              <thead><tr><th style={{ width: 32 }} /><th>Mã</th><th>Họ và tên</th><th>Tờ/thửa</th><th>Lý trình hiện có</th><th>Gợi ý</th><th className="so">Cách tim tuyến (m)</th></tr></thead>
              <tbody>
                {goiY.map((x) => (
                  <tr key={x.t.id}>
                    <td><input type="checkbox" aria-label={`Ghi lý trình ${x.h.ma} thửa ${x.t.soThua}`} checked={daChon.has(x.t.id)} onChange={(e) => { const s = new Set(daChon); if (e.target.checked) s.add(x.t.id); else s.delete(x.t.id); setChon(s); }} /></td>
                    <td>{x.h.ma}</td><td>{x.h.ten}</td><td>{x.t.soTo}/{x.t.soThua}</td><td className="chu-nho">{hienLyTrinh(x.t.lyTrinh) || "—"}</td><td><b>{hienLyTrinh(x.ly)}</b></td><td className="so">{x.cach.toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                {!goiY.length && <tr><td colSpan={7} className="trong">Không có thửa hồ sơ khớp bản đồ trong khoảng cách đã chọn.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </HopThoai>
  );
}

import { useMemo, useState } from "react";
import { docDgn, docToaDoMoc, kiemTraVung, thongKeLop, vungTuLop, type DienTichThuHoi, type Diem, type KetQuaDocDgn, type ThuaBanDo, type VungUngVien } from "@gpmb/gis";
import { useUngDung } from "../../ung-dung";
import { taoId, type DuAn, type Ho, type RanhNhap, type Thua } from "../../mo-hinh";
import { HopThoai } from "../../thanh-phan/chung";
import { tenDayDu } from "../../van-ban/loai-dat";
import { type DuLieuBanDo } from "./du-lieu";
import { apDtVaoHoSo, canhBaoConLai, dongCapNhatDt } from "./ranh";

const so = (v: number, le = 1) => v.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });
const TEN_NGUON: Record<RanhNhap["nguon"], string> = { EXCEL: "bảng tọa độ mốc", DGN: "tệp DGN khác", VE: "vẽ trên bản đồ" };

/** Vùng có nằm (ít nhất một phần) trong phạm vi bản đồ không — phát hiện nhầm trục X/Y, nhầm hệ tọa độ. */
function trongPhamVi(vong: Diem[], pham: DuLieuBanDo["pham"]): boolean {
  const le = Math.max(pham.maxX - pham.minX, pham.maxY - pham.minY) * 0.5 + 50;
  return vong.some((d) => d.x >= pham.minX - le && d.x <= pham.maxX + le && d.y >= pham.minY - le && d.y <= pham.maxY + le);
}

export async function docBang(f: File): Promise<unknown[][]> {
  const ten = f.name.toLowerCase();
  if (ten.endsWith(".xlsx")) {
    const { default: Excel } = await import("exceljs");
    const wb = new Excel.Workbook();
    await wb.xlsx.load(await f.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const out: unknown[][] = [];
    ws.eachRow({ includeEmpty: true }, (r, i) => {
      const v = (r.values as unknown[]).slice(1).map((x) => (x && typeof x === "object" && "result" in x ? (x as { result: unknown }).result : x && typeof x === "object" && "richText" in x ? (x as { richText: { text: string }[] }).richText.map((t) => t.text).join("") : x));
      out[i - 1] = v;
    });
    return Array.from(out, (x) => x ?? []);
  }
  const chu = await f.text();
  // Tab hoặc chấm phẩy (số kiểu Việt "2352123,45") trước; không có thì phẩy (số kiểu "2352123.45")
  return chu.split(/\r?\n/).map((d) => (d.trim() ? d.split(d.includes("\t") ? "\t" : d.includes(";") ? ";" : ",").map((x) => x.trim()) : []));
}

/** Thẻ "Cách 3 — Ranh GPMB nhập ngoài": danh sách ranh đã nhập, nạp bảng mốc, lấy từ DGN khác, vẽ trên bản đồ. */
export function TheRanhNhap(p: { duAn: DuAn; dl: DuLieuBanDo; veRanh: boolean; batVe: () => void; moCapNhat: () => void; soDaLienKet: number }) {
  const { luuDuAn, quyen, bao, nguoiDung } = useUngDung();
  const [hop, setHop] = useState<"EXCEL" | "DGN" | null>(null);
  const ds = p.duAn.banDo?.ranhNhap ?? [];
  const sua = quyen("SUA_HO_SO");
  const luu = (moi: RanhNhap[]) => p.duAn.banDo && luuDuAn({ ...p.duAn, banDo: { ...p.duAn.banDo, ranhNhap: moi } });
  const them = async (x: Omit<RanhNhap, "id" | "ngay" | "nguoi">[]) => {
    await luu([...ds, ...x.map((r) => ({ ...r, id: taoId(), ngay: new Date().toISOString(), nguoi: nguoiDung }))]);
    bao(`Đã thêm ${x.length} ranh GPMB — diện tích thu hồi từng thửa đã tính lại`);
    setHop(null);
  };
  return (
    <>
      <div className="mo chu-nho mt-4">Cách 3 — ranh GPMB nhập ngoài (tọa độ mốc, tệp DGN khác, vẽ trên bản đồ): phần mềm tự cắt thửa theo ranh, tính DT thu hồi và DT còn lại từng thửa.</div>
      <div className="nhom-nut">
        <button className="nut nut-nho" disabled={!sua} onClick={() => setHop("EXCEL")}>Nạp tọa độ mốc…</button>
        <button className="nut nut-nho" disabled={!sua} onClick={() => setHop("DGN")}>Lấy từ tệp DGN khác…</button>
        <button className={`nut nut-nho ${p.veRanh ? "nut-chinh" : ""}`} disabled={!sua} onClick={p.batVe} title="Bấm các đỉnh ranh trên bản đồ; bấm đúp để khép; bấm “Dùng làm ranh GPMB”">{p.veRanh ? "Đang vẽ ranh…" : "Vẽ ranh trên bản đồ"}</button>
      </div>
      {ds.length > 0 && (
        <div className="ds-vung" aria-label="Ranh GPMB đã nhập">
          {ds.map((r) => (
            <div key={r.id} className="nhom-nut giua-doc">
              <span style={{ flex: 1 }}>
                <b>{r.ten}</b> · {so(r.dienTich)} m² <span className="mo chu-nho">· {TEN_NGUON[r.nguon]}{r.tep ? ` (${r.tep})` : ""} · {new Date(r.ngay).toLocaleDateString("vi-VN")}</span>
              </span>
              <button className="nut nut-chu nut-nguy nut-nho" disabled={!sua} aria-label={`Xóa ranh ${r.ten}`} onClick={() => confirm(`Xóa ranh "${r.ten}"? Diện tích thu hồi trong hồ sơ không tự đổi — dùng “Cập nhật DT vào hồ sơ” nếu cần.`) && void luu(ds.filter((x) => x.id !== r.id))}>✕</button>
            </div>
          ))}
        </div>
      )}
      {p.soDaLienKet > 0 && <button className="nut nut-nho" disabled={!sua} onClick={p.moCapNhat}>Cập nhật DT thu hồi vào hồ sơ ({p.soDaLienKet} thửa đã gắn hồ sơ)…</button>}
      {hop === "EXCEL" && <HopNapMoc dl={p.dl} dong={() => setHop(null)} them={them} />}
      {hop === "DGN" && <HopRanhDgn dl={p.dl} dong={() => setHop(null)} them={them} />}
    </>
  );
}

function XemVung({ ds, pham }: { ds: { ten: string; diem: Diem[] }[]; pham: DuLieuBanDo["pham"] }) {
  return (
    <table className="bang">
      <thead><tr><th>Ranh</th><th className="so">Số mốc</th><th className="so">Diện tích (m²)</th><th>Kiểm tra</th></tr></thead>
      <tbody>
        {ds.map((v, i) => {
          const k = kiemTraVung(v.diem);
          const ngoai = k.hopLe && !trongPhamVi(k.vong, pham);
          return (
            <tr key={i}>
              <td>{v.ten}</td>
              <td className="so">{k.vong.length > 0 ? Math.max(k.vong.length - (k.hopLe ? 1 : 0), 0) : v.diem.length}</td>
              <td className="so">{k.hopLe ? so(k.dienTich) : "—"}</td>
              <td className="chu-nho" style={{ color: k.loi || ngoai ? "var(--do)" : undefined }}>{k.loi ?? (ngoai ? "Nằm ngoài phạm vi bản đồ — kiểm tra hệ tọa độ, thứ tự X/Y" : "Hợp lệ")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function HopNapMoc(p: { dl: DuLieuBanDo; dong: () => void; them: (x: Omit<RanhNhap, "id" | "ngay" | "nguoi">[]) => Promise<void> }) {
  const [kq, setKq] = useState<{ tep: string; vung: { ten: string; diem: Diem[] }[]; doiTruc: boolean; canhBao: string[] } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const hopLe = (kq?.vung ?? []).map((v) => ({ v, k: kiemTraVung(v.diem) })).filter(({ k }) => k.hopLe && trongPhamVi(k.vong, p.dl.pham));
  return (
    <HopThoai tieuDe="Nạp tọa độ mốc ranh GPMB" dong={p.dong} rong={720} chan={<><button className="nut" onClick={p.dong}>Hủy</button><button className="nut nut-chinh" disabled={!hopLe.length} onClick={() => void p.them(hopLe.map(({ v, k }) => ({ ten: v.ten, nguon: "EXCEL", tep: kq!.tep, vong: [k.vong], dienTich: k.dienTich })))}>Thêm {hopLe.length} ranh hợp lệ</button></>}>
      <p className="mt-0 chu-nho">Tệp Excel (.xlsx) hoặc CSV/TXT: các cột <b>Tên mốc · X · Y</b> (tọa độ VN-2000, mét), cột <b>Vùng</b> nếu có nhiều ranh; hoặc để một dòng trống giữa các ranh. Theo quy ước trắc địa, X là tọa độ Bắc — phần mềm tự nhận và đổi trục cho khớp bản đồ. Mốc theo thứ tự đi vòng quanh ranh.</p>
      <input type="file" aria-label="Tệp tọa độ mốc" accept=".xlsx,.csv,.txt" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLoi(null);
        try {
          const r = docToaDoMoc(await docBang(f));
          if (!r.vung.length) throw new Error(r.canhBao.join("; ") || "Không đọc được mốc nào");
          setKq({ tep: f.name, ...r });
        } catch (er) {
          setKq(null);
          setLoi((er as Error).message);
        }
      }} />
      {loi && <div className="thong-bao thong-bao-do">{loi}</div>}
      {kq && (
        <>
          <div className="mo chu-nho mt-8">{kq.doiTruc ? "Cột X là tọa độ Bắc (quy ước VN-2000) — đã đổi trục." : "Cột X là tọa độ Đông — giữ nguyên."} {kq.canhBao.join(" ")}</div>
          <XemVung ds={kq.vung} pham={p.dl.pham} />
        </>
      )}
    </HopThoai>
  );
}

function HopRanhDgn(p: { dl: DuLieuBanDo; dong: () => void; them: (x: Omit<RanhNhap, "id" | "ngay" | "nguoi">[]) => Promise<void> }) {
  const [ban, setBan] = useState<{ tep: string; ban: KetQuaDocDgn } | null>(null);
  const [lop, setLop] = useState<number | null>(null);
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [loi, setLoi] = useState<string | null>(null);
  const tk = useMemo(() => (ban ? thongKeLop(ban.ban).filter((x) => x.soVung + x.soDuong > 0) : []), [ban]);
  const vung: VungUngVien[] = useMemo(() => (ban && lop !== null ? vungTuLop(ban.ban, lop) : []), [ban, lop]);
  const dsChon = vung.filter((v) => chon.has(v.ma));
  return (
    <HopThoai tieuDe="Lấy ranh GPMB từ tệp DGN khác" dong={p.dong} rong={760} chan={<><button className="nut" onClick={p.dong}>Hủy</button><button className="nut nut-chinh" disabled={!dsChon.length} onClick={() => void p.them(dsChon.map((v, i) => ({ ten: `Lớp ${lop} – vùng ${i + 1}`, nguon: "DGN", tep: ban!.tep, vong: v.vong, dienTich: v.dienTich })))}>Thêm {dsChon.length} vùng làm ranh</button></>}>
      <p className="mt-0 chu-nho">Tệp ranh thu hồi đo đạc riêng (điểm k khoản 1 Điều 16 TT 26/2024 — tách khu vực thu hồi thành mảnh đo đạc bổ sung), cùng hệ tọa độ VN-2000 với bản đồ đang xem. Chọn lớp chứa ranh rồi chọn vùng.</p>
      <input type="file" aria-label="Tệp DGN chứa ranh" accept=".dgn,.DGN" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLoi(null);
        try {
          setBan({ tep: f.name, ban: docDgn(new Uint8Array(await f.arrayBuffer())) });
          setLop(null);
          setChon(new Set());
        } catch (er) {
          setLoi((er as Error).message);
        }
      }} />
      {loi && <div className="thong-bao thong-bao-do">{loi}</div>}
      {ban && (
        <div className="nhom-nut mt-8">
          {tk.map((x) => (
            <button key={x.lop} className={`nut nut-nho ${lop === x.lop ? "nut-chinh" : ""}`} onClick={() => { setLop(x.lop); setChon(new Set()); }}>
              Lớp {x.lop} <span className="mo">· {x.soVung} vùng, {x.soDuong} đường</span>
            </button>
          ))}
          {!tk.length && <span className="mo">Tệp không có đường, vùng nào.</span>}
        </div>
      )}
      {lop !== null && (
        <>
          {!vung.length && <div className="thong-bao thong-bao-vang">Lớp {lop} không có vùng khép kín.</div>}
          {vung.length > 0 && <button className="nut nut-nho mt-8" onClick={() => setChon(new Set(vung.map((v) => v.ma)))}>Chọn tất cả {vung.length} vùng</button>}
          <div className="ds-vung">
            {vung.map((v) => {
              const ngoai = !trongPhamVi(v.vong[0]!, p.dl.pham);
              return (
                <label key={v.ma} className="nhom-nut giua-doc">
                  <input type="checkbox" checked={chon.has(v.ma)} onChange={(e) => { const s = new Set(chon); if (e.target.checked) s.add(v.ma); else s.delete(v.ma); setChon(s); }} />
                  <span><b>{so(v.dienTich)} m²</b> <span className="mo chu-nho">· chu vi {so(v.chuVi)} m · {v.nguon === "VUNG_KHEP_KIN" ? "vùng khép kín" : "khép từ đường"}</span>{ngoai && <span className="chu-nho" style={{ color: "var(--do)" }}> · ngoài phạm vi bản đồ</span>}</span>
                </label>
              );
            })}
          </div>
        </>
      )}
    </HopThoai>
  );
}

/** So DT thu hồi trong hồ sơ với DT tính theo ranh; cán bộ chọn dòng để cập nhật (ghi chú thửa, nhật ký hộ). */
export function HopCapNhatDt(p: { duAn: DuAn; dl: DuLieuBanDo; thuHoi: Map<string, DienTichThuHoi>; khoaThua: (t: ThuaBanDo) => string; hos: Ho[]; dong: () => void }) {
  const { luuHo, quyen, bao, nguoiDung } = useUngDung();
  const ds = useMemo(() => dongCapNhatDt(p.dl.kq.thua, p.thuHoi, p.khoaThua, p.hos), [p]);
  const [chon, setChon] = useState<Set<string>>(() => new Set(ds.filter((d) => d.khac).map((d) => d.thua.id)));
  const [dang, setDang] = useState(false);
  const moTa = [p.duAn.banDo?.tenTep, ...(p.duAn.banDo?.ranhNhap ?? []).map((r) => r.ten)].filter(Boolean).join(", ");
  const apDung = async () => {
    if (!quyen("SUA_HO_SO")) return bao("Tài khoản không có quyền sửa hồ sơ", "loi");
    setDang(true);
    try {
      const moi = apDtVaoHoSo(ds, chon, nguoiDung, moTa);
      for (const h of moi) await luuHo(h);
      bao(`Đã cập nhật DT thu hồi ${chon.size} thửa của ${moi.length} hồ sơ`);
      p.dong();
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Cập nhật diện tích thu hồi vào hồ sơ" dong={p.dong} rong={920} chan={<><button className="nut" onClick={p.dong}>Đóng</button><button className="nut nut-chinh" disabled={!chon.size || dang} onClick={() => void apDung()}>Cập nhật {chon.size} thửa</button></>}>
      <p className="mt-0 chu-nho">DT thu hồi = phần giao giữa thửa và ranh GPMB (làm tròn 0,1 m²); thửa thu hồi toàn bộ giữ DT thửa trong hồ sơ. DT còn lại = DT thửa (hồ sơ) − DT thu hồi. Số liệu hình học để đối chiếu — diện tích lập phương án theo hồ sơ đo đạc, trích đo được duyệt; cán bộ chọn dòng cần cập nhật.</p>
      <div className="bang-cuon" style={{ maxHeight: "55vh" }}>
        <table className="bang">
          <thead><tr><th><input type="checkbox" aria-label="Chọn tất cả" checked={chon.size === ds.length && ds.length > 0} onChange={(e) => setChon(new Set(e.target.checked ? ds.map((d) => d.thua.id) : []))} /></th><th>Hồ sơ</th><th>Tờ-thửa</th><th className="so">DT thửa (hồ sơ)</th><th className="so">DT thu hồi (hồ sơ)</th><th className="so">DT thu hồi theo ranh</th><th className="so">DT còn lại</th><th>Phạm vi</th></tr></thead>
          <tbody>
            {ds.map((d) => (
              <tr key={d.thua.id} className={d.khac ? "" : "mo"}>
                <td><input type="checkbox" aria-label={`Cập nhật thửa ${d.thua.soTo}-${d.thua.soThua}`} checked={chon.has(d.thua.id)} onChange={(e) => { const s = new Set(chon); if (e.target.checked) s.add(d.thua.id); else s.delete(d.thua.id); setChon(s); }} /></td>
                <td>{d.h.ma} · {d.h.ten}</td>
                <td>{d.thua.soTo}-{d.thua.soThua}</td>
                <td className="so">{d.thua.dienTich}</td>
                <td className="so">{d.thua.dienTichThuHoi || "0"}</td>
                <td className="so"><b>{d.moi}</b></td>
                <td className="so">{so(Math.max(d.conLai, 0))}</td>
                <td className="chu-nho">{d.th.phamVi === "TOAN_BO" ? "Toàn bộ" : d.th.phamVi === "MOT_PHAN" ? "Một phần" : "Ngoài ranh"}{d.khac ? "" : " · không đổi"}</td>
              </tr>
            ))}
            {!ds.length && <tr><td colSpan={8} className="trong">Chưa có thửa nào của bản đồ gắn với hồ sơ.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

/**
 * Cảnh báo phần đất còn lại nhỏ hơn diện tích tối thiểu tách thửa (Điều 13–16 PL I QĐ 106/2025). Bộ chính sách chưa có
 * nguyên văn → cán bộ nhập ngưỡng cho dự án kèm căn cứ; chưa nhập → "Thiếu căn cứ". Phần mềm không tự kết luận thu hồi.
 */
export function TheConLai(p: { duAn: DuAn; dl: DuLieuBanDo; thuHoi: Map<string, DienTichThuHoi>; khoaThua: (t: ThuaBanDo) => string; hos: Ho[]; chonThua: (t: ThuaBanDo) => void }) {
  const { chinhSach, luuDuAn, quyen } = useUngDung();
  const cs = chinhSach(p.duAn);
  const hoSo = useMemo(() => {
    const m = new Map<string, Thua>();
    for (const h of p.hos) for (const t of h.thua) if (t.maBanDo) m.set(t.maBanDo, t);
    return m;
  }, [p.hos]);
  const ds = canhBaoConLai(cs, p.duAn, p.dl.kq.thua, p.thuHoi, p.khoaThua, hoSo);
  const [moNguong, setMoNguong] = useState(false);
  const [nguong, setNguong] = useState(p.duAn.tachThuaToiThieu ?? []);
  const nho = ds.filter((x) => x.muc !== "THIEU_CAN_CU"), thieu = ds.filter((x) => x.muc === "THIEU_CAN_CU");
  const coCs = !!cs.tachThuaToiThieu?.muc.length;
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid var(--vien)", paddingTop: 8 }} aria-label="Phần đất còn lại">
      <div className="nhom-nut giua-doc">
        <b className="chu-nho" style={{ flex: 1 }}>Phần còn lại sau thu hồi (tách thửa tối thiểu — Điều 13–16 PL I QĐ 106/2025)</b>
        <button className="nut nut-chu nut-nho" onClick={() => setMoNguong(!moNguong)}>{moNguong ? "Ẩn" : "Ngưỡng"}</button>
      </div>
      {!coCs && <div className="chu-nho mo">Bộ chính sách {cs.ma} chưa có nguyên văn Điều 13–16 Phụ lục I QĐ 106/2025 — dùng ngưỡng cán bộ nhập cho dự án (bắt buộc căn cứ).</div>}
      {coCs && <div className="chu-nho mo">Ngưỡng theo Điều 13–16 PL I QĐ 106/2025 (bộ chính sách {cs.ma}); loại đất không có trong các điều này dùng ngưỡng cán bộ nhập cho dự án.</div>}
      {nho.map((x) => (
        <div key={x.tb.ma} className="thong-bao thong-bao-vang chu-nho" style={{ margin: "4px 0" }}>
          Thửa <button className="nut nut-chu nut-nho" onClick={() => p.chonThua(x.tb)}>{x.tb.soTo ?? "?"}-{x.tb.soThua ?? "?"}</button> ({tenDayDu(x.loaiDat)}): còn lại <b>{so(x.conLai)} m²</b>
          {x.muc === "NHO" && <> &lt; {so(x.nguong!.dienTich, 0)} m² — {x.nguong!.moTa} ({x.nguong!.canCu})</>}
          {x.muc === "CAN_VI_TRI" && <> — cần xác định vị trí thửa ({x.nguong!.canCu})</>}
          {x.muc === "HEP" && <> — không bảo đảm kích thước tối thiểu ({x.nguong!.canCu})</>}
          . Xem xét thu hồi phần còn lại theo quy định; cán bộ xác nhận căn cứ.
          {x.ghiChu.length > 0 && <ul style={{ margin: "2px 0 0 16px" }}>{x.ghiChu.map((g) => <li key={g}>{g}</li>)}</ul>}
        </div>
      ))}
      {thieu.length > 0 && <div className="chu-nho" style={{ color: "var(--do)" }}>Thiếu căn cứ ngưỡng cho {thieu.length} thửa thu hồi một phần (loại đất: {[...new Set(thieu.map((x) => x.loaiDat || "chưa rõ"))].join(", ")}).</div>}
      {!ds.length && <div className="chu-nho mo">Không có thửa thu hồi một phần nào có phần còn lại dưới ngưỡng.</div>}
      {moNguong && (
        <div className="luoi" style={{ gap: 4, marginTop: 6 }}>
          {nguong.map((x, i) => (
            <div key={x.id} className="nhom-nut">
              <input style={{ width: 90 }} aria-label="Loại đất (ký hiệu)" placeholder="ONT, ODT" value={x.loaiDat} onChange={(e) => setNguong(nguong.map((y, j) => (j === i ? { ...y, loaiDat: e.target.value } : y)))} />
              <input style={{ width: 80 }} aria-label="Diện tích tối thiểu (m²)" placeholder="m²" value={x.dienTich} onChange={(e) => setNguong(nguong.map((y, j) => (j === i ? { ...y, dienTich: e.target.value.replace(",", ".") } : y)))} />
              <input style={{ flex: 1 }} aria-label="Căn cứ ngưỡng tách thửa" className={x.canCu.trim() ? "" : "loi-nhap"} placeholder="Căn cứ: Điều, khoản PL I QĐ 106/2025 *" value={x.canCu} onChange={(e) => setNguong(nguong.map((y, j) => (j === i ? { ...y, canCu: e.target.value } : y)))} />
              <button className="nut nut-chu nut-nho" aria-label="Xóa ngưỡng" onClick={() => setNguong(nguong.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
          <div className="nhom-nut">
            <button className="nut nut-nho" onClick={() => setNguong([...nguong, { id: taoId(), loaiDat: "", dienTich: "", canCu: "" }])}>+ Ngưỡng</button>
            <button className="nut nut-nho nut-chinh" disabled={!quyen("SUA_HO_SO")} onClick={() => void luuDuAn({ ...p.duAn, tachThuaToiThieu: nguong.filter((x) => x.loaiDat.trim() && Number(x.dienTich) > 0) })}>Lưu ngưỡng của dự án</button>
          </div>
          <div className="chu-nho mo">Ngưỡng thiếu căn cứ không được dùng. Nhập đúng theo nguyên văn văn bản (loại đất, khu vực xã/phường).</div>
        </div>
      )}
    </div>
  );
}

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BO_CHINH_SACH, DON_GIA, napBangGiaDat, type BangGiaDat, type DongDonGia } from "../du-lieu";
import { khongDau } from "../tim-kiem";
import { tenLoaiDat } from "../van-ban/loai-dat";
import { useUngDung } from "../ung-dung";
import { BieuTuong } from "../thanh-phan/BieuDo";
import { Chon } from "../thanh-phan/Chon";

/**
 * Tra cứu đơn giá, giá đất, chính sách (bố cục theo mẫu người dùng gửi 28/9/2026):
 * danh mục dạng cây + bộ lọc đã lưu | kết quả theo nhóm | chi tiết đơn giá kèm căn cứ.
 * Dữ liệu là bản trích xuất từ văn bản gốc (docs/07) — mỗi dòng giữ mã nguồn và số trang để đối chiếu.
 */

type Tab = "QĐ32" | "PL VIII" | "PL V" | "GIA_DAT" | "CS";

interface Muc {
  id: string;
  tab: Tab;
  ma: string;
  /** Đường dẫn danh mục (cây) */
  duong: string[];
  ten: string;
  dvt: string;
  gia: number | null;
  trang: number | null;
  them: [string, string][];
  canhBao: string[];
  /** Dòng trích xuất để đối chiếu với bản gốc */
  trich: string;
}

const TAB: { ma: Tab; ten: string; phu: string; bt: string }[] = [
  { ma: "QĐ32", ten: "Nhà, công trình", phu: "QĐ 32/2025", bt: "toaNha" },
  { ma: "PL VIII", ten: "Cây trồng, thủy sản", phu: "PL VIII QĐ 106/2025", bt: "la" },
  { ma: "PL V", ten: "Di dời vật nuôi", phu: "PL V QĐ 106/2025", bt: "diDoi" },
  { ma: "GIA_DAT", ten: "Bảng giá đất", phu: "NQ 152/2025", bt: "thua" },
  { ma: "CS", ten: "Bộ chính sách áp dụng", phu: "Văn bản liên quan", bt: "vanBan" },
];

/** Văn bản nguồn — chỉ ghi thông tin có trong danh mục tài liệu (docs/01); không tự điền trích yếu chưa có. */
const VAN_BAN: Record<Exclude<Tab, "CS">, { so: string; mo: string; hieuLuc: string; luuY: string; nhan: string }> = {
  "QĐ32": { so: "Quyết định số 32/2025/QĐ-UBND của UBND tỉnh Sơn La", mo: "Đơn giá bồi thường nhà, công trình", hieuLuc: "01/4/2025", luuY: "Bản nhập còn thiếu một số nhóm hạng mục so với văn bản (VM-02) — đối chiếu bản gốc trước khi áp dụng.", nhan: "Đơn giá nhà, công trình" },
  "PL VIII": { so: "Phụ lục VIII – Quyết định số 106/2025/QĐ-UBND ngày 06/10/2025 của UBND tỉnh Sơn La", mo: "Đơn giá bồi thường cây trồng, thủy sản", hieuLuc: "06/10/2025", luuY: "Văn bản nguồn mất Biểu 02 mục 1–15, lệch cột Biểu 03, 04 (VM-02) — đối chiếu bản gốc.", nhan: "Đơn giá cây trồng, thủy sản" },
  "PL V": { so: "Phụ lục V – Quyết định số 106/2025/QĐ-UBND ngày 06/10/2025 của UBND tỉnh Sơn La", mo: "Mức hỗ trợ di dời vật nuôi", hieuLuc: "06/10/2025", luuY: "Bảng nguồn lệch dòng, ví dụ tính sai số học (VM-01) — đối chiếu bản gốc.", nhan: "Mức hỗ trợ di dời vật nuôi" },
  GIA_DAT: { so: "Nghị quyết số 152/2025/NQ-HĐND ngày 29/12/2025 của HĐND tỉnh Sơn La", mo: "Bảng giá đất (Bảng 01–08)", hieuLuc: "01/01/2026", luuY: "26 dòng đúng văn bản nhưng bất thường được đánh dấu cảnh báo (policy/nguon/nq152-can-doi-chieu.md). Đơn vị: nghìn đồng/m².", nhan: "Giá đất" },
};

const tachDuong = (nhom: string) => nhom.split(/\s*(?:›|>)\s*/).map((x) => x.trim()).filter(Boolean);

function tuDonGia(r: DongDonGia, i: number): Muc {
  const duong = tachDuong(r.nhom);
  return {
    id: `${r.nguon}#${i}`, tab: r.nguon, ma: r.ma, duong: duong.length ? duong : ["(Không phân nhóm)"], ten: r.ten, dvt: r.donVi, gia: r.donGia, trang: r.trang,
    them: r.matDo ? [["Mật độ tối đa", `${r.matDo.toLocaleString("vi-VN")} cây/ha`]] : [],
    canhBao: [],
    trich: `${r.nhom ? `${r.nhom} › ` : ""}${r.ten}: ${r.donGia.toLocaleString("vi-VN")} ${/^đồng/i.test(r.donVi) ? r.donVi : `đồng/${r.donVi}`}`,
  };
}

function tuGiaDat(bg: BangGiaDat): Muc[] {
  const out: Muc[] = [];
  bg.dat_nong_nghiep.forEach((r, i) => out.push({
    id: `NN#${i}`, tab: "GIA_DAT", ma: `NQ152/B${r.bang}/${r.stt}/${r.loai_dat}`, duong: [r.xa, `Bảng ${r.bang} – Đất nông nghiệp`], ten: `${tenLoaiDat(r.loai_dat)} (${r.loai_dat})`, dvt: "nghìn đ/m²", gia: r.gia, trang: null,
    them: [["Xã, phường", r.xa], ["Loại đất", r.loai_dat]], canhBao: [], trich: `Bảng ${r.bang}, STT ${r.stt}, ${r.xa}, ${r.loai_dat}: ${r.gia} nghìn đồng/m²`,
  }));
  const tuyen = (ds: BangGiaDat["dat_o"], ten: string, khoa: string) => ds.forEach((r, i) => out.push({
    id: `${khoa}#${i}`, tab: "GIA_DAT", ma: `NQ152/B${r.bang}/${r.xa}/${r.stt}`, duong: [r.xa, `Bảng ${r.bang} – ${ten}`, ...(r.nhom ? [r.nhom] : [])], ten: r.tuyen, dvt: "nghìn đ/m²", gia: r.vt[0] ?? null, trang: null,
    them: [["Xã, phường", r.xa], ...r.vt.map((g, v) => [`Vị trí ${v + 1}`, g === null ? "—" : `${g.toLocaleString("vi-VN")} nghìn đ/m²`] as [string, string])],
    canhBao: r.canh_bao, trich: `Bảng ${r.bang}, ${r.xa}, STT ${r.stt} (${r.tuyen}): ${r.vt.map((g, v) => `VT${v + 1} ${g ?? "—"}`).join("; ")} nghìn đồng/m²`,
  }));
  tuyen(bg.dat_o, "Đất ở", "O");
  tuyen(bg.dat_tmdv, "Đất thương mại, dịch vụ", "TM");
  tuyen(bg.dat_skc, "Đất SXKD phi nông nghiệp", "SKC");
  bg.dat_kcn_ccn.forEach((r, i) => out.push({
    id: `KCN#${i}`, tab: "GIA_DAT", ma: `NQ152/B${r.bang}/${i + 1}`, duong: [r.xa, `Bảng ${r.bang} – Đất KCN, CCN`], ten: r.ten, dvt: "nghìn đ/m²", gia: r.gia, trang: null,
    them: [["Xã, phường", r.xa], ["Loại đất", r.loai_dat]], canhBao: [], trich: `Bảng ${r.bang}, ${r.ten} (${r.xa}): ${r.gia} nghìn đồng/m²`,
  }));
  return out;
}

/** Tô sáng các từ khóa (so khớp không dấu, giữ nguyên chữ gốc). */
function ToSang({ chu, tu }: { chu: string; tu: string[] }) {
  if (!tu.length) return <>{chu}</>;
  const nd = [...chu].map((c) => khongDau(c)[0] ?? c).join("");
  const danh = new Array(chu.length).fill(false);
  for (const t of tu) {
    let i = nd.indexOf(t);
    while (i >= 0 && t) { for (let k = i; k < i + t.length; k++) danh[k] = true; i = nd.indexOf(t, i + t.length); }
  }
  const out: ReactNode[] = [];
  let i = 0;
  while (i < chu.length) {
    let j = i;
    while (j < chu.length && danh[j] === danh[i]) j++;
    out.push(danh[i] ? <mark key={i}>{chu.slice(i, j)}</mark> : chu.slice(i, j));
    i = j;
  }
  return <>{out}</>;
}

interface Nut { khoa: string; ten: string; con: Nut[]; so: number }
function dungCay(ds: Muc[], goc: string): Nut {
  const g: Nut = { khoa: "", ten: goc, con: [], so: 0 };
  for (const m of ds) {
    g.so++;
    let n = g;
    m.duong.forEach((p, i) => {
      const khoa = m.duong.slice(0, i + 1).join(" › ");
      let c = n.con.find((x) => x.khoa === khoa);
      if (!c) n.con.push((c = { khoa, ten: p, con: [], so: 0 }));
      c.so++;
      n = c;
    });
  }
  return g;
}

const KHOA_BO_LOC = "gpmb-tra-cuu-bo-loc";
const KHOA_GHIM = "gpmb-tra-cuu-ghim";
type BoLoc = { ten: string; tab: Tab; q: string; nhom: string };
const doc = <T,>(k: string, md: T): T => { try { return (JSON.parse(localStorage.getItem(k) ?? "null") as T) ?? md; } catch { return md; } };
const ghi = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* bỏ qua */ } };
type SapXep = "MAC_DINH" | "GIA_TANG" | "GIA_GIAM" | "TEN";

export function TraCuu() {
  const { bao } = useUngDung();
  const [tab, setTab] = useState<Tab>("QĐ32");
  const [q, setQ] = useState("");
  const [nhom, setNhom] = useState("");
  const [mo, setMo] = useState<Set<string>>(new Set());
  const [thuGon, setThuGon] = useState(false);
  const [sapXep, setSapXep] = useState<SapXep>("MAC_DINH");
  const [dangLuoi, setDangLuoi] = useState(false);
  const [chon, setChon] = useState<Muc | null>(null);
  const [daChon, setDaChon] = useState<Set<string>>(new Set());
  const [nhomMo, setNhomMo] = useState<Set<string> | null>(null);
  const [boLoc, setBoLoc] = useState<BoLoc[]>(() => doc(KHOA_BO_LOC, []));
  const [quanLy, setQuanLy] = useState(false);
  const [ghim, setGhim] = useState<string[]>(() => doc(KHOA_GHIM, []));
  const [chiGhim, setChiGhim] = useState(false);
  const [bg, setBg] = useState<BangGiaDat | null>(null);
  const canCuRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (tab === "GIA_DAT" && !bg) void napBangGiaDat().then(setBg); }, [tab, bg]);

  const tatCa = useMemo<Muc[]>(() => {
    if (tab === "CS") return [];
    if (tab === "GIA_DAT") return bg ? tuGiaDat(bg) : [];
    return DON_GIA.map((r, i) => ({ r, i })).filter(({ r }) => r.nguon === tab).map(({ r, i }) => tuDonGia(r, i));
  }, [tab, bg]);
  const tu = khongDau(q.trim()).split(/\s+/).filter(Boolean);
  const khop = useMemo(() => tatCa.filter((m) => { const s = khongDau(`${m.ma} ${m.duong.join(" ")} ${m.ten}`); return tu.every((t) => s.includes(t)); }), [tatCa, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const cay = useMemo(() => dungCay(khop, TAB.find((t) => t.ma === tab)!.ten + (tab === "QĐ32" ? " – QĐ 32/2025" : "")), [khop, tab]);
  const ketQua = useMemo(() => {
    let ds = khop.filter((m) => !nhom || m.duong.join(" › ").startsWith(nhom)).filter((m) => !chiGhim || ghim.includes(m.ma));
    if (sapXep === "GIA_TANG") ds = [...ds].sort((a, b) => (a.gia ?? 0) - (b.gia ?? 0));
    else if (sapXep === "GIA_GIAM") ds = [...ds].sort((a, b) => (b.gia ?? 0) - (a.gia ?? 0));
    else if (sapXep === "TEN") ds = [...ds].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
    return ds;
  }, [khop, nhom, sapXep, chiGhim, ghim]);
  const nhomKq = useMemo(() => {
    const m = new Map<string, Muc[]>();
    for (const x of ketQua) { const k = x.duong.join(" › "); m.set(k, [...(m.get(k) ?? []), x]); }
    return [...m.entries()];
  }, [ketQua]);
  const nhomDangMo = nhomMo ?? new Set(nhomKq.slice(0, 3).map(([k]) => k));

  const doiTab = (t: Tab) => { setTab(t); setQ(""); setNhom(""); setChon(null); setDaChon(new Set()); setNhomMo(null); setChiGhim(false); setMo(new Set()); };
  const saoChep = (s: string, nhan: string) => { void navigator.clipboard?.writeText(s).then(() => bao(`Đã sao chép ${nhan}`), () => bao("Không sao chép được", "loi")); };
  const doiGhim = (m: Muc) => { const moi = ghim.includes(m.ma) ? ghim.filter((x) => x !== m.ma) : [...ghim, m.ma]; setGhim(moi); ghi(KHOA_GHIM, moi); };
  const luuBoLoc = () => {
    const ten = window.prompt("Tên bộ lọc:", q.trim() || nhom.split(" › ").at(-1) || "Bộ lọc");
    if (!ten?.trim()) return;
    const moi = [...boLoc, { ten: ten.trim(), tab, q, nhom }];
    setBoLoc(moi); ghi(KHOA_BO_LOC, moi);
  };
  const apBoLoc = (b: BoLoc) => { if (b.tab !== tab) doiTab(b.tab); setTimeout(() => { setQ(b.q); setNhom(b.nhom); setNhomMo(null); }, 0); };
  const vb = tab !== "CS" ? VAN_BAN[tab] : null;
  const chonDs = ketQua.filter((m) => daChon.has(m.id));

  const veNut = (n: Nut, cap: number): ReactNode => {
    const dangMo = mo.has(n.khoa) || (q.trim() !== "" && cap < 2);
    const coCon = n.con.length > 0;
    return (
      <li key={n.khoa}>
        <div className={`cay-dong ${nhom === n.khoa ? "chon" : ""}`} style={{ paddingLeft: 6 + cap * 14 }}>
          {coCon ? (
            <button className="cay-mo" aria-label={dangMo ? "Thu gọn" : "Mở rộng"} onClick={() => { const s = new Set(mo); if (s.has(n.khoa)) s.delete(n.khoa); else s.add(n.khoa); setMo(s); }}>
              <span style={{ display: "inline-flex", transform: dangMo ? "none" : "rotate(-90deg)" }}><BieuTuong ten="xuong" co={14} /></span>
            </button>
          ) : <span className="cay-la"><BieuTuong ten="phai" co={12} /></span>}
          <button className="cay-ten" onClick={() => { setNhom(nhom === n.khoa ? "" : n.khoa); setNhomMo(null); }} title={n.ten}>
            <span>{n.ten}</span><small>{n.so}</small>
          </button>
        </div>
        {coCon && dangMo && <ul>{n.con.map((c) => veNut(c, cap + 1))}</ul>}
      </li>
    );
  };

  return (
    <div className="trang tc-trang">
      <div className="dong-tieu-de" style={{ marginBottom: 12 }}>
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Tra cứu đơn giá, giá đất, chính sách</h1>
          <div className="mo-ta">Dữ liệu trích xuất từ văn bản gốc, mỗi dòng giữ mã nguồn và số trang để đối chiếu (docs/07).</div>
        </div>
      </div>

      <div className="tc-tab" role="tablist">
        {TAB.map((t) => (
          <button key={t.ma} role="tab" aria-selected={tab === t.ma} className={tab === t.ma ? "chon" : ""} onClick={() => doiTab(t.ma)}>
            <span className="bt"><BieuTuong ten={t.bt} co={24} /></span>
            <span><b>{t.ten}</b><small>{t.phu}</small></span>
          </button>
        ))}
      </div>

      {tab === "CS" ? <BoChinhSach /> : (
        <div className={`tc-khung ${thuGon ? "thu-gon" : ""} ${chon ? "" : "khong-ct"}`}>
          {/* Cột 1: danh mục */}
          {!thuGon ? (
            <div className="tc-cot1">
              <div className="the">
                <div className="tc-dau"><h3>Danh mục tra cứu</h3><button className="nut-vuong" aria-label="Thu gọn danh mục" title="Thu gọn" onClick={() => setThuGon(true)}><BieuTuong ten="thuGon" co={16} /></button></div>
                <div style={{ padding: "0 14px 10px" }}>
                  <label className="o-tim">
                    <BieuTuong ten="traCuu" co={16} />
                    <input value={q} onChange={(e) => { setQ(e.target.value); setNhomMo(null); }} placeholder={tab === "GIA_DAT" ? "Tên xã, tuyến đường, loại đất…" : "Tên, nhóm, mã… (nhiều từ, không dấu)"} aria-label="Từ khóa tra cứu" />
                    {q && <button className="o-xoa" aria-label="Xóa từ khóa" onClick={() => setQ("")}>×</button>}
                  </label>
                </div>
                {tab === "GIA_DAT" && !bg ? <div className="trong">Đang nạp bảng giá đất…</div> : (
                  <ul className="cay">
                    <li>
                      <div className={`cay-dong goc ${nhom === "" && !chiGhim ? "chon" : ""}`}>
                        <span className="cay-la"><BieuTuong ten={TAB.find((t) => t.ma === tab)!.bt} co={15} /></span>
                        <button className="cay-ten" onClick={() => { setNhom(""); setChiGhim(false); }}><span>{cay.ten}</span><small>{cay.so}</small></button>
                      </div>
                      <ul>{cay.con.map((c) => veNut(c, 1))}</ul>
                    </li>
                  </ul>
                )}
              </div>
              <div className="the">
                <div className="tc-dau"><h3>Bộ lọc đã lưu</h3><button className="nut nut-chu nut-nho" onClick={() => setQuanLy(!quanLy)}><BieuTuong ten="caiDat" co={14} /> {quanLy ? "Xong" : "Quản lý"}</button></div>
                <ul className="bo-loc">
                  <li>
                    <button className={chiGhim ? "chon" : ""} onClick={() => setChiGhim(!chiGhim)}><BieuTuong ten="ghim" co={15} /> Đã ghim ({ghim.length})</button>
                  </li>
                  {boLoc.map((b, i) => (
                    <li key={i}>
                      <button className={b.tab === tab && b.q === q && b.nhom === nhom ? "chon" : ""} onClick={() => apBoLoc(b)} title={`${TAB.find((t) => t.ma === b.tab)?.ten}${b.q ? ` · “${b.q}”` : ""}${b.nhom ? ` · ${b.nhom}` : ""}`}>
                        <BieuTuong ten="danhDau" co={15} /> <span>{b.ten}</span>{b.tab !== tab && <small>{TAB.find((t) => t.ma === b.tab)?.ten}</small>}
                      </button>
                      {quanLy && <button className="xoa" aria-label={`Xóa bộ lọc ${b.ten}`} onClick={() => { const moi = boLoc.filter((_, j) => j !== i); setBoLoc(moi); ghi(KHOA_BO_LOC, moi); }}>×</button>}
                    </li>
                  ))}
                </ul>
                <div style={{ padding: "0 14px 12px" }}><button className="nut nut-nho" disabled={!q.trim() && !nhom} onClick={luuBoLoc}><BieuTuong ten="cong" co={14} /> Lưu bộ lọc hiện tại</button></div>
              </div>
            </div>
          ) : (
            <button className="tc-mo-dm" onClick={() => setThuGon(false)} title="Mở danh mục" aria-label="Mở danh mục"><BieuTuong ten="danhSach" co={18} /><span>Danh mục</span></button>
          )}

          {/* Cột 2: kết quả */}
          <div className="the tc-cot2">
            <div className="tc-dau">
              <h3>Kết quả tra cứu</h3><span className="mo">({ketQua.length.toLocaleString("vi-VN")} dòng)</span>
              <div className="phai">
                {chonDs.length > 0 && <button className="nut nut-nho" onClick={() => saoChep(["Mã nguồn\tHạng mục\tĐVT\tĐơn giá\tTrang", ...chonDs.map((m) => `${m.ma}\t${m.ten}\t${m.dvt}\t${m.gia ?? ""}\t${m.trang ?? ""}`)].join("\n"), `${chonDs.length} dòng (dán vào Excel)`)}>Sao chép {chonDs.length} dòng</button>}
                <Chon value={sapXep} onChange={(e) => setSapXep(e.target.value as SapXep)} aria-label="Sắp xếp">
                  <option value="MAC_DINH">Sắp xếp: Mặc định</option><option value="GIA_TANG">Đơn giá tăng dần</option><option value="GIA_GIAM">Đơn giá giảm dần</option><option value="TEN">Tên A → Z</option>
                </Chon>
                <div className="nhom-chuyen" role="group" aria-label="Kiểu hiển thị">
                  <button className={!dangLuoi ? "chon" : ""} onClick={() => setDangLuoi(false)} aria-label="Dạng bảng"><BieuTuong ten="danhSach" co={16} /></button>
                  <button className={dangLuoi ? "chon" : ""} onClick={() => setDangLuoi(true)} aria-label="Dạng thẻ"><BieuTuong ten="luoi" co={16} /></button>
                </div>
              </div>
            </div>
            {(nhom || chiGhim) && <div className="tc-loc">{chiGhim && <span className="nhan nhan-xanh">Đã ghim ×</span>} {nhom && <button className="nut nut-nho" onClick={() => setNhom("")}>Nhóm: {nhom.split(" › ").at(-1)} ✕</button>}</div>}
            <div className="tc-kq">
              {nhomKq.slice(0, 200).map(([k, ds]) => {
                const dangMo = nhomDangMo.has(k);
                return (
                  <div key={k} className="tc-nhom">
                    <button className="tc-nhom-dau" onClick={() => { const s = new Set(nhomDangMo); if (s.has(k)) s.delete(k); else s.add(k); setNhomMo(s); }}>
                      <span style={{ display: "inline-flex", transform: dangMo ? "none" : "rotate(-90deg)" }}><BieuTuong ten="xuong" co={15} /></span>
                      <b><ToSang chu={k.split(" › ").at(-1)!} tu={tu} /></b><span className="mo">({ds.length} kết quả)</span>
                      {k.includes(" › ") && <small className="mo tc-duong">{k.split(" › ").slice(0, -1).join(" › ")}</small>}
                    </button>
                    {dangMo && (dangLuoi ? (
                      <div className="tc-the-luoi">
                        {ds.map((m) => (
                          <button key={m.id} className={`tc-the ${chon?.id === m.id ? "chon" : ""}`} onClick={() => setChon(m)}>
                            <small className="mo">{m.ma}{m.trang ? ` · tr. ${m.trang}` : ""}</small>
                            <span className="ten"><ToSang chu={m.ten} tu={tu} /></span>
                            <b>{m.gia === null ? "—" : m.gia.toLocaleString("vi-VN")} <small>{m.dvt}</small></b>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <table className="bang tc-bang">
                        <thead><tr><th style={{ width: 36 }} /><th style={{ width: 44 }}>STT</th><th>Mã nguồn</th><th>Hạng mục</th><th>ĐVT</th><th className="so">{tab === "GIA_DAT" ? "Giá (VT1)" : "Đơn giá (đ)"}</th><th className="so">Trang</th></tr></thead>
                        <tbody>
                          {ds.map((m, i) => (
                            <tr key={m.id} className={`co-the-chon ${chon?.id === m.id ? "dang-chon" : ""}`} onClick={() => setChon(m)}>
                              <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={daChon.has(m.id)} aria-label={`Chọn ${m.ma}`} onChange={() => { const s = new Set(daChon); if (s.has(m.id)) s.delete(m.id); else s.add(m.id); setDaChon(s); }} /></td>
                              <td>{i + 1}</td>
                              <td className="chu-nho" style={{ whiteSpace: "nowrap" }}>{m.ma}{ghim.includes(m.ma) && <span title="Đã ghim"> 📌</span>}</td>
                              <td><ToSang chu={m.ten} tu={tu} />{m.canhBao.length > 0 && <div><span className="nhan nhan-vang">{m.canhBao.join("; ")}</span></div>}</td>
                              <td>{m.dvt}</td>
                              <td className="so">{m.gia === null ? "—" : m.gia.toLocaleString("vi-VN")}</td>
                              <td className="so">{m.trang ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ))}
                  </div>
                );
              })}
              {nhomKq.length > 200 && <div className="trong">Hiển thị 200 nhóm đầu — thu hẹp bằng từ khóa hoặc chọn nhóm ở danh mục.</div>}
              {ketQua.length === 0 && <div className="trong">{tab === "GIA_DAT" && !bg ? "Đang nạp…" : "Không có dòng khớp điều kiện tra cứu."}</div>}
            </div>
          </div>

          {/* Cột 3: chi tiết */}
          {chon && vb && (
            <div className="the tc-cot3">
              <div className="tc-dau"><h3>Chi tiết {tab === "GIA_DAT" ? "giá đất" : "đơn giá"}</h3><button className="nut-vuong" aria-label="Đóng chi tiết" onClick={() => setChon(null)}>×</button></div>
              <div className="tc-ct">
                <span className="nhan nhan-xanh"><BieuTuong ten={TAB.find((t) => t.ma === tab)!.bt} co={13} /> {vb.nhan}</span>
                <h2>{chon.ten}</h2>
                <div className="tc-gia">
                  <small>{tab === "GIA_DAT" ? "Giá vị trí 1" : "Đơn giá"}</small>
                  <div><b>{chon.gia === null ? "—" : chon.gia.toLocaleString("vi-VN")}</b><span>{/^đồng|nghìn/i.test(chon.dvt) ? chon.dvt : `đồng/${chon.dvt}`}</span></div>
                </div>
                <div className="nhom-nut tc-nut">
                  <button className="nut" onClick={() => saoChep(chon.ma, "mã nguồn")}><BieuTuong ten="saoChep" co={15} /> Sao chép mã</button>
                  <button className="nut nut-chinh" onClick={() => { canCuRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); canCuRef.current?.classList.add("nhay"); setTimeout(() => canCuRef.current?.classList.remove("nhay"), 1200); }}><BieuTuong ten="moNgoai" co={15} /> Mở căn cứ</button>
                  <button className={`nut ${ghim.includes(chon.ma) ? "nut-dang" : ""}`} onClick={() => doiGhim(chon)}><BieuTuong ten="ghim" co={15} /> {ghim.includes(chon.ma) ? "Bỏ ghim" : "Ghim"}</button>
                  <button className="nut" title="Sao chép đơn giá kèm căn cứ" aria-label="Sao chép đơn giá kèm căn cứ" onClick={() => saoChep(`${chon.ten}: ${chon.gia?.toLocaleString("vi-VN") ?? "—"} ${chon.dvt} (${chon.ma}${chon.trang ? `, trang ${chon.trang}` : ""}; ${vb.so})`, "đơn giá kèm căn cứ")}><BieuTuong ten="baCham" co={15} /></button>
                </div>
                <h4>Thông tin chung</h4>
                <dl className="tc-dl">
                  <dt>Mã nguồn</dt><dd>{chon.ma}</dd>
                  <dt>Thuộc văn bản</dt><dd>{vb.so.split(" của ")[0]}</dd>
                  {chon.trang !== null && <><dt>Trang</dt><dd>{chon.trang}</dd></>}
                  <dt>Hạng mục</dt><dd>{chon.ten}</dd>
                  <dt>Đơn vị tính</dt><dd>{chon.dvt}</dd>
                  <dt>Nhóm</dt><dd>{chon.duong.join(" › ")}</dd>
                  {chon.them.map(([a, b]) => <Fragment key={a}><dt>{a}</dt><dd>{b}</dd></Fragment>)}
                </dl>
                {chon.canhBao.length > 0 && <div className="thong-bao thong-bao-vang" style={{ margin: "8px 0" }}>{chon.canhBao.join("; ")}</div>}
                <div ref={canCuRef} className="tc-can-cu">
                  <h4>Căn cứ pháp lý</h4>
                  <div className="tc-vb">
                    <span className="bt"><BieuTuong ten="vanBan" co={18} /></span>
                    <div><b>{vb.so}</b><small>{vb.mo} · hiệu lực từ {vb.hieuLuc}</small></div>
                  </div>
                  <div className="tc-trich">
                    <div className="tc-trich-dau"><b>Dòng dữ liệu trích xuất</b>{chon.trang !== null && <span className="mo"> (trang {chon.trang})</span>}<button className="nut nut-nho" onClick={() => saoChep(chon.trich, "trích dẫn")}><BieuTuong ten="saoChep" co={13} /> Sao chép trích dẫn</button></div>
                    <blockquote><ToSang chu={chon.trich} tu={tu} /></blockquote>
                  </div>
                  <div className="chu-nho mo">{vb.luuY}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BoChinhSach() {
  const cs = BO_CHINH_SACH["sonla-2026-03-31"]!;
  return (
    <div className="luoi luoi-2">
      <div className="the the-than">
        <h3>{cs.ten}</h3>
        <p className="chu-nho">Mã: {cs.ma} · Hiệu lực từ {cs.hieuLucTu} · Trạng thái: {cs.trangThai}</p>
        <table className="bang">
          <tbody>
            <tr><td>Làm tròn</td><td>Diện tích {cs.lamTron.dienTichSoLe} số lẻ; tiền {cs.lamTron.cach === "LEN" ? "làm tròn lên" : cs.lamTron.cach} đến {cs.lamTron.tienBuoc.toLocaleString("vi-VN")} đ ở cấp hộ</td></tr>
            <tr><td>Nhà, công trình</td><td>min(max((1 + {Number(cs.nhaCongTrinh.tyLeCongThem) * 100}%) × Tgt; {Number(cs.nhaCongTrinh.san) * 100}% G1); {Number(cs.nhaCongTrinh.tran) * 100}% G1)</td></tr>
            <tr><td>Cây trồng</td><td>≤ {Number(cs.cayTrong.tyLeVuotMatDo) * 100}% mật độ hưởng 100%; phần vượt {Number(cs.cayTrong.tyLePhanVuot) * 100}%</td></tr>
            <tr><td>Ổn định đời sống</td><td>{cs.onDinhDoiSong.kgGaoNhanKhauThang} kg gạo/khẩu/tháng; {cs.onDinhDoiSong.nhom.length} nhóm tỷ lệ</td></tr>
            <tr><td>Chuyển đổi nghề</td><td>Hệ số mặc định {cs.chuyenDoiNghe.heSoMacDinh}; {Object.entries(cs.chuyenDoiNghe.heSoTheoNhom).map(([k, v]) => `${k}: ${v}`).join("; ")}</td></tr>
            <tr><td>Mồ mả</td><td>Mộ xây {Number(cs.moMa.mucXay).toLocaleString("vi-VN")} đ; không xây {Number(cs.moMa.mucKhongXay).toLocaleString("vi-VN")} đ</td></tr>
          </tbody>
        </table>
      </div>
      <div className="the the-than">
        <h3>Căn cứ</h3>
        <ul className="chu-nho">
          {[cs.nhaCongTrinh, cs.cayTrong, cs.onDinhDoiSong, cs.chuyenDoiNghe, cs.tamCu, cs.moMa, cs.vatNuoi, cs.lamTron].flatMap((k) => k.canCu).map((c, i) => (
            <li key={i}><b>{c.vanBan}</b> – {c.viTri}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

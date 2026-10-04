import { useEffect, useMemo, useRef, useState } from "react";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { homNayIso } from "../trang-thai";
import { Chon } from "../thanh-phan/Chon";
import { napChiMuc, tachTu, timDoan, type ChiMuc, type KetQuaTim } from "../hoi-dap/tim-kiem";
import { nhanYDinh, traLoiSoLieu, type DuLieuDuAn } from "../hoi-dap/so-lieu";
import { MO_HINH_MAC_DINH, docCaiDatGemini, hoiGemini, kiemTraKhoa, luuCaiDatGemini, taoYeuCau, type CaiDatGemini } from "../hoi-dap/gemini";
import { coVoWindows } from "../tu-dong-sao-luu";

type CheDo = "NOI_BO" | "GEMINI";
interface Luot {
  hoi: string;
  cheDo: CheDo;
  dap?: string;
  soLieu?: string;
  doan: KetQuaTim[];
  loi?: string;
  dang?: boolean;
}
const CAU_MAU = [
  "Hỗ trợ ổn định đời sống khi thu hồi đất nông nghiệp tính thế nào?",
  "Hạn mức công nhận đất ở đối với đất sử dụng trước ngày 18/12/1980?",
  "Điều kiện bồi thường về đất khi không có giấy tờ về quyền sử dụng đất?",
  "Hỗ trợ khác theo Điều 6 Quyết định 14/2026 gồm những khoản nào?",
  "Dự án có bao nhiêu hộ, tổng kinh phí bao nhiêu?",
  "Hộ nào đang có vướng mắc?",
];
const KHOA_CHE_DO = "gpmb-hoi-dap-che-do";
const docCheDo = (): CheDo => { try { return localStorage.getItem(KHOA_CHE_DO) === "GEMINI" ? "GEMINI" : "NOI_BO"; } catch { return "NOI_BO"; } };

/** Đánh dấu các từ của câu hỏi trong đoạn trích (so không dấu). */
function DoanTrich({ x, so, cauHoi }: { x: KetQuaTim; so: number; cauHoi: string }) {
  const [mo, setMo] = useState(false);
  const tu = new Set(tachTu(cauHoi).filter((t) => !t.includes("_") && t.length > 2));
  const nd = mo ? x.doan.noiDung : x.doan.noiDung.slice(0, 420) + (x.doan.noiDung.length > 420 ? "…" : "");
  const phan = nd.split(/(\s+)/).map((w, i) => (tu.has(w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "")) ? <mark key={i}>{w}</mark> : w));
  return (
    <div className="hd-doan">
      <div className="chu-nho"><b>[{so}] {x.doan.nguon}</b> — {x.doan.tieuDe} {x.doan.loai === "VAN_BAN" ? <span className="nhan nhan-xanh">nguyên văn</span> : <span className="nhan">tài liệu nghiệp vụ</span>}</div>
      <div className="hd-doan-than chu-nho">{phan}</div>
      {x.doan.noiDung.length > 420 && <button className="nut nut-chu nut-nho" onClick={() => setMo(!mo)}>{mo ? "Thu gọn" : "Xem đủ đoạn"}</button>}
    </div>
  );
}

/**
 * Hỏi đáp AI: chế độ Nội bộ (không dùng mạng — tìm nguyên văn văn bản pháp lý, tài liệu nghiệp vụ có trong phần mềm và trả lời
 * số liệu dự án trên máy) và chế độ Gemini API (khóa của người dùng; chỉ gửi câu hỏi đã che số và các đoạn văn bản liên quan,
 * tùy chọn số liệu tổng hợp không có thông tin cá nhân).
 */
export function HoiDap({ dong, hien = true }: { dong?: () => void; hien?: boolean }) {
  const { dsDuAn, hoCua, chinhSach, bao } = useUngDung();
  const [cheDo, setCheDo] = useState<CheDo>(docCheDo);
  useEffect(() => { try { localStorage.setItem(KHOA_CHE_DO, cheDo); } catch { /* bỏ qua */ } }, [cheDo]);
  const [duAnId, setDuAnId] = useState(dsDuAn[0]?.id ?? "");
  const [cm, setCm] = useState<ChiMuc | null>(null);
  const [loiKho, setLoiKho] = useState("");
  useEffect(() => { napChiMuc().then(setCm).catch((e) => setLoiKho(String((e as Error).message ?? e))); }, []);
  const [cauHoi, setCauHoi] = useState("");
  const [luot, setLuot] = useState<Luot[]>([]);
  const [cg, setCg] = useState<CaiDatGemini>(docCaiDatGemini);
  const [khoaNhap, setKhoaNhap] = useState("");
  const [dsMoHinh, setDsMoHinh] = useState<string[]>([]);
  const [kemSoLieu, setKemSoLieu] = useState(false);
  const [moCaiDat, setMoCaiDat] = useState(() => !docCaiDatGemini().khoa);
  const [dangKiem, setDangKiem] = useState(false);
  const cuoi = useRef<HTMLDivElement>(null);
  const oHoi = useRef<HTMLTextAreaElement>(null);
  const [to, setTo] = useState(false);
  useEffect(() => { if (hien) oHoi.current?.focus(); }, [hien]);
  useEffect(() => cuoi.current?.scrollIntoView({ block: "end", behavior: "smooth" }), [luot]);

  const duLieu = useMemo((): DuLieuDuAn[] => {
    const ds = duAnId === "*" ? dsDuAn : dsDuAn.filter((d) => d.id === duAnId);
    return ds.map((duAn) => ({ duAn, kq: hoCua(duAn.id).map((h) => ({ h, k: tinhHo(chinhSach(duAn), duAn, h) })) }));
  }, [duAnId, dsDuAn, hoCua, chinhSach]);

  const hoi = async (q0?: string) => {
    const q = (q0 ?? cauHoi).trim();
    if (!q || !cm) return;
    if (cheDo === "GEMINI" && (!cg.khoa || !cg.dongY)) {
      setMoCaiDat(true);
      return bao(!cg.khoa ? "Chưa có khóa API Gemini — xem hướng dẫn, dán khóa rồi lưu" : "Cần đánh dấu đồng ý điều kiện gửi dữ liệu trước khi dùng Gemini", "loi");
    }
    setCauHoi("");
    const doan = timDoan(cm, q, cheDo === "GEMINI" ? 8 : 5);
    const yd = nhanYDinh(q);
    const soLieu = yd.length && duLieu.length ? traLoiSoLieu(yd, duLieu, homNayIso()) : undefined;
    const i = luot.length;
    setLuot((l) => [...l, { hoi: q, cheDo, doan, soLieu, dang: cheDo === "GEMINI" }]);
    if (cheDo !== "GEMINI") return;
    try {
      // Số liệu gửi ra ngoài chỉ khi người dùng bật "Kèm số liệu tổng hợp"; danh sách vướng mắc (có tên hộ) không gửi
      const soLieuGui = kemSoLieu && duLieu.length ? traLoiSoLieu(["SO_HO", "TONG_TIEN", "DIEN_TICH", "HIEN_TRANG"], duLieu, homNayIso()) : undefined;
      const dap = await hoiGemini(cg, taoYeuCau(q, doan, soLieuGui, luot.filter((x) => x.cheDo === "GEMINI" && x.dap).map((x) => ({ hoi: x.hoi, dap: x.dap! }))));
      setLuot((l) => l.map((x, j) => (j === i ? { ...x, dap, dang: false } : x)));
    } catch (e) {
      setLuot((l) => l.map((x, j) => (j === i ? { ...x, loi: String((e as Error).message ?? e), dang: false } : x)));
    }
  };

  const luuKhoa = async () => {
    if (!khoaNhap.trim()) return;
    setCg(await luuCaiDatGemini({ khoaRo: khoaNhap }));
    setKhoaNhap("");
    bao(coVoWindows() ? "Đã lưu khóa API (mã hóa bằng tài khoản Windows)" : "Đã lưu khóa API trên trình duyệt này");
  };
  const kiem = async () => {
    setDangKiem(true);
    try {
      const ds = await kiemTraKhoa(cg);
      setDsMoHinh(ds);
      bao(`Khóa hợp lệ — ${ds.length} mô hình dùng được`);
      if (ds.length && !ds.includes(cg.moHinh)) setCg(await luuCaiDatGemini({ moHinh: ds.find((m) => /flash/.test(m) && !/lite|preview|exp/.test(m)) ?? ds[0]! }));
    } catch (e) {
      bao(String((e as Error).message ?? e), "loi");
    } finally {
      setDangKiem(false);
    }
  };

  const tieuDeCheDo = cheDo === "NOI_BO" ? "Nội bộ — không dùng mạng" : `Gemini (${cg.moHinh})`;
  return (
    <div className={`tl-khung${to ? " to" : ""}`} role="dialog" aria-label="Trợ lý AI">
      <div className="tl-dau">
        <span className="tl-bt" aria-hidden><RoBot co={22} /></span>
        <div className="tl-ten">
          <b>Trợ lý AI</b>
          <span className="chu-nho">{tieuDeCheDo}</span>
        </div>
        <button className="tl-nut-nho" title={to ? "Thu nhỏ khung" : "Phóng to khung"} aria-label={to ? "Thu nhỏ khung" : "Phóng to khung"} onClick={() => setTo(!to)}>{to ? "▭" : "⛶"}</button>
        {luot.length > 0 && <button className="tl-nut-nho" title="Hội thoại mới" aria-label="Hội thoại mới" onClick={() => setLuot([])}>↺</button>}
        {dong && <button className="tl-nut-nho" title="Đóng (Esc)" aria-label="Đóng trợ lý" onClick={dong}>✕</button>}
      </div>
      <div className="tl-che-do">
        <div className="hd-che-do" role="radiogroup" aria-label="Chế độ hỏi đáp">
          <button role="radio" aria-checked={cheDo === "NOI_BO"} className={cheDo === "NOI_BO" ? "chon" : ""} onClick={() => setCheDo("NOI_BO")}>Nội bộ — không dùng mạng</button>
          <button role="radio" aria-checked={cheDo === "GEMINI"} className={cheDo === "GEMINI" ? "chon" : ""} onClick={() => setCheDo("GEMINI")}>Gemini API — cần Internet</button>
        </div>
        {cheDo === "GEMINI" && (
          <button className="nut nut-chu nut-nho" aria-expanded={moCaiDat} onClick={() => setMoCaiDat(!moCaiDat)} title="Cài đặt Gemini API">
            ⚙ {cg.khoa ? (cg.dongY ? "Cài đặt" : "Chưa đồng ý điều kiện") : "Chưa có khóa"}
          </button>
        )}
      </div>
      <div className="tl-than">
        <div className="tl-chu-thich chu-nho">
          {cheDo === "NOI_BO" ? (
            <>Chạy trên máy, không gửi gì ra ngoài. Trích <b>nguyên văn</b> văn bản pháp lý, tài liệu nghiệp vụ có sẵn{cm ? ` (${cm.doan.length} đoạn)` : ""} và trả lời số liệu dự án. Cán bộ đọc đoạn trích để kết luận.</>
          ) : (
            <>Gửi tới Google <b>câu hỏi</b> (đã che số CCCD, điện thoại) và <b>đoạn văn bản liên quan</b>{kemSoLieu ? <> cùng <b>số liệu tổng hợp</b></> : null}; không gửi hồ sơ, tên, tệp. Không gõ họ tên, số giấy tờ vào câu hỏi; câu trả lời phải đối chiếu đoạn trích.</>
          )}
        </div>
        {cheDo === "GEMINI" && moCaiDat && (
          <div className="the" aria-label="Cài đặt Gemini API">
            <div className="the-than luoi" style={{ gap: 12 }}>
              <div className="hd-huong-dan chu-nho">
                <b>Hướng dẫn tạo khóa API Gemini (miễn phí, làm một lần):</b>
                <ol>
                  <li>Mở trình duyệt, vào địa chỉ <code>https://aistudio.google.com/apikey</code> <button className="nut nut-chu nut-nho" onClick={() => void navigator.clipboard?.writeText("https://aistudio.google.com/apikey").then(() => bao("Đã sao chép địa chỉ"))}>Sao chép địa chỉ</button>, đăng nhập bằng tài khoản Google (Gmail) của cơ quan hoặc cá nhân.</li>
                  <li>Lần đầu: đọc và chấp nhận điều khoản của Google AI Studio.</li>
                  <li>Bấm nút <b>Create API key</b> (Tạo khóa API). Nếu được hỏi dự án Google Cloud, chọn dự án có sẵn hoặc để Google tự tạo.</li>
                  <li>Khóa hiện ra là một chuỗi ký tự bắt đầu bằng <code>AIza…</code>. Bấm biểu tượng sao chép (Copy).</li>
                  <li>Quay lại phần mềm: dán khóa vào ô <b>Khóa API</b> bên dưới → <b>Lưu khóa</b> → <b>Kiểm tra khóa</b> (phần mềm liệt kê các mô hình dùng được, tự chọn mô hình phù hợp).</li>
                  <li>Đọc và đánh dấu ô <b>đồng ý điều kiện gửi dữ liệu</b>, rồi đặt câu hỏi.</li>
                </ol>
                <div className="mo">Lưu ý: khóa API như mật khẩu — không gửi cho người khác; nếu lộ, vào trang trên xóa khóa và tạo khóa mới. Gói miễn phí có giới hạn số lần hỏi mỗi phút/ngày; theo điều khoản của Google, dữ liệu gửi qua gói miễn phí có thể được Google dùng để cải thiện dịch vụ — vì vậy tuyệt đối không đưa thông tin cá nhân vào câu hỏi. Khóa lưu trên máy này{coVoWindows() ? ", mã hóa bằng tài khoản Windows" : ""}; mỗi máy dán khóa riêng.</div>
              </div>
              <div className="tl-hang">
                <label className="chu-nho tl-o-khoa">Khóa API<input type="password" autoComplete="off" aria-label="Khóa API Gemini" placeholder={cg.khoa ? "•••••••• (đã lưu — dán khóa mới để thay)" : "Dán khóa AIza…"} value={khoaNhap} onChange={(e) => setKhoaNhap(e.target.value)} /></label>
                <button className="nut nut-chinh" disabled={!khoaNhap.trim()} onClick={() => void luuKhoa()}>Lưu khóa</button>
                <button className="nut" disabled={!cg.khoa || dangKiem} onClick={() => void kiem()}>{dangKiem ? "Đang kiểm tra…" : "Kiểm tra khóa"}</button>
                <button className="nut nut-nguy" disabled={!cg.khoa} onClick={async () => { if (confirm("Xóa khóa API khỏi máy này?")) setCg(await luuCaiDatGemini({ xoaKhoa: true })); }}>Xóa khóa</button>
              </div>
              <div className="luoi" style={{ gap: 8 }}>
                <label className="chu-nho">Mô hình
                  {dsMoHinh.length ? (
                    <Chon aria-label="Mô hình Gemini" value={cg.moHinh} onChange={async (e) => setCg(await luuCaiDatGemini({ moHinh: e.target.value }))}>
                      {dsMoHinh.map((m) => <option key={m} value={m}>{m}</option>)}
                    </Chon>
                  ) : (
                    <input aria-label="Mô hình Gemini" value={cg.moHinh} placeholder={MO_HINH_MAC_DINH} onChange={(e) => setCg({ ...cg, moHinh: e.target.value })} onBlur={async () => setCg(await luuCaiDatGemini({ moHinh: cg.moHinh || MO_HINH_MAC_DINH }))} />
                  )}
                </label>
                <label className="chu-nho"><input type="checkbox" checked={kemSoLieu} onChange={(e) => setKemSoLieu(e.target.checked)} /> Kèm số liệu tổng hợp của dự án đang chọn (số hộ, kinh phí, diện tích, hiện trạng — không có tên, số giấy tờ)</label>
              </div>
              <label className="thong-bao thong-bao-vang chu-nho" style={{ display: "flex", gap: 8, margin: 0 }}>
                <input type="checkbox" aria-label="Đồng ý điều kiện gửi dữ liệu cho Gemini" checked={!!cg.dongY} onChange={async (e) => setCg(await luuCaiDatGemini({ dongY: e.target.checked }))} />
                <span>Tôi hiểu: ở chế độ Gemini, câu hỏi và các đoạn văn bản pháp lý liên quan được gửi tới máy chủ của Google qua Internet; tôi không nhập họ tên, số giấy tờ, thông tin cá nhân vào câu hỏi; câu trả lời của AI chỉ để tham khảo và phải đối chiếu văn bản gốc.</span>
              </label>
            </div>
          </div>
        )}
          {loiKho && <div className="thong-bao thong-bao-do">{loiKho}</div>}
          {!luot.length && (
            <div className="hd-goi-y">
              <div className="mo chu-nho">Câu hỏi mẫu:</div>
              <div className="nhom-nut">{CAU_MAU.map((c) => <button key={c} className="nut nut-nho" disabled={!cm} onClick={() => void hoi(c)}>{c}</button>)}</div>
            </div>
          )}
          {luot.map((x, i) => (
            <div key={i} className="hd-luot">
              <div className="hd-hoi"><b>Hỏi:</b> {x.hoi}</div>
              <div className="hd-dap">
                <div className="mo chu-nho">{x.cheDo === "GEMINI" ? `Gemini (${cg.moHinh})` : "Nội bộ"}</div>
                {x.soLieu && <div className="hd-so-lieu" role="note" aria-label="Số liệu dự án"><b>Số liệu dự án (tính trên máy):</b>{"\n"}{x.soLieu}</div>}
                {x.dang && <div className="mo">Đang hỏi Gemini…</div>}
                {x.loi && <div className="thong-bao thong-bao-do" style={{ margin: 0 }}>{x.loi}</div>}
                {x.dap && <div className="hd-tra-loi" aria-label="Câu trả lời">{x.dap}</div>}
                {x.cheDo === "NOI_BO" && !x.soLieu && !x.doan.length && <div className="mo">Không tìm thấy đoạn văn bản liên quan. Thử dùng từ ngữ khác (vd. tên khoản hỗ trợ, số Điều), hoặc dùng chế độ Gemini.</div>}
                {x.doan.length > 0 && (
                  <details open={x.cheDo === "NOI_BO"}>
                    <summary className="chu-nho">{x.cheDo === "NOI_BO" ? "Các đoạn văn bản liên quan nhất" : "Đoạn trích đã gửi kèm (để đối chiếu)"} ({x.doan.length})</summary>
                    {x.doan.map((d, j) => <DoanTrich key={j} x={d} so={j + 1} cauHoi={x.hoi} />)}
                  </details>
                )}
                {(x.dap || x.soLieu) && <button className="nut nut-chu nut-nho" onClick={() => void navigator.clipboard?.writeText([x.soLieu, x.dap].filter(Boolean).join("\n\n")).then(() => bao("Đã sao chép"))}>Sao chép câu trả lời</button>}
              </div>
            </div>
          ))}
          <div ref={cuoi} />
      </div>
      <div className="tl-nhap">
        <Chon aria-label="Dự án cho số liệu" value={duAnId} onChange={(e) => setDuAnId(e.target.value)} title="Dự án dùng để trả lời câu hỏi số liệu">
          {dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          {dsDuAn.length > 1 && <option value="*">Mọi dự án</option>}
        </Chon>
        <div className="tl-o-hoi">
          <textarea ref={oHoi} aria-label="Câu hỏi" rows={2} placeholder="Nhập câu hỏi (Enter để gửi, Shift+Enter xuống dòng)…" value={cauHoi} onChange={(e) => setCauHoi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void hoi(); } }} />
          <button className="nut nut-chinh" disabled={!cauHoi.trim() || !cm} onClick={() => void hoi()}>Gửi</button>
        </div>
      </div>
    </div>
  );
}

/** Hình robot của trợ lý. */
export function RoBot({ co = 26 }: { co?: number }) {
  return (
    <svg width={co} height={co} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v2.5" />
      <circle cx="12" cy="2.6" r="1" fill="currentColor" />
      <rect x="4.5" y="6" width="15" height="12" rx="4" />
      <circle cx="9.3" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="11.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9.5 15h5" />
      <path d="M2.5 11v3M21.5 11v3" />
    </svg>
  );
}

/**
 * Trợ lý AI nổi: nút tròn hình robot ở góc dưới phải mọi màn hình; bấm mở khung chat (Hỏi đáp AI). Khung chỉ dựng ở lần mở
 * đầu (không nạp kho tri thức khi chưa dùng); đóng khung vẫn giữ hội thoại. Esc đóng khung.
 */
export function TroLyAi() {
  const [mo, setMo] = useState(false);
  const [daMo, setDaMo] = useState(false);
  useEffect(() => {
    const f = () => { setMo(true); setDaMo(true); };
    window.addEventListener("gpmb-mo-tro-ly", f);
    return () => window.removeEventListener("gpmb-mo-tro-ly", f);
  }, []);
  useEffect(() => {
    if (!mo) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") setMo(false); };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [mo]);
  return (
    <>
      {daMo && <div className="tl-vung" hidden={!mo}><HoiDap dong={() => setMo(false)} hien={mo} /></div>}
      <button className={`tl-nut${mo ? " dang-mo" : ""}`} title={mo ? "Đóng trợ lý AI" : "Trợ lý AI — hỏi đáp quy định, số liệu dự án"} aria-label={mo ? "Đóng trợ lý AI" : "Mở trợ lý AI"} aria-expanded={mo} onClick={() => { setDaMo(true); setMo(!mo); }}>
        {mo ? <span style={{ fontSize: 22, lineHeight: 1 }}>✕</span> : <RoBot co={28} />}
      </button>
    </>
  );
}

/** Mở trợ lý AI từ nơi khác (thanh bên, phím tắt). */
export const moTroLy = () => window.dispatchEvent(new Event("gpmb-mo-tro-ly"));

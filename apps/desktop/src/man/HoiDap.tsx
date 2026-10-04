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
export function HoiDap() {
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

  return (
    <div className="trang" style={{ maxWidth: 1200 }}>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Hỏi đáp AI</h1>
          <div className="mo-ta">Hỏi về quy định bồi thường, hỗ trợ, tái định cư (Sơn La) và số liệu dự án. Câu trả lời chỉ để tham khảo — cán bộ kiểm tra theo văn bản gốc.</div>
        </div>
        <div className="phai nhom-nut">
          <div className="hd-che-do" role="radiogroup" aria-label="Chế độ hỏi đáp">
            <button role="radio" aria-checked={cheDo === "NOI_BO"} className={cheDo === "NOI_BO" ? "chon" : ""} onClick={() => setCheDo("NOI_BO")}>Nội bộ — không dùng mạng</button>
            <button role="radio" aria-checked={cheDo === "GEMINI"} className={cheDo === "GEMINI" ? "chon" : ""} onClick={() => setCheDo("GEMINI")}>Gemini API — cần Internet</button>
          </div>
        </div>
      </div>

      <div className="thong-bao chu-nho" style={{ marginBottom: 12 }}>
        {cheDo === "NOI_BO" ? (
          <><b>Chế độ nội bộ:</b> chạy hoàn toàn trên máy, không gửi gì ra ngoài. Phần mềm tìm và trích <b>nguyên văn</b> các đoạn liên quan trong {cm ? `${cm.doan.length} đoạn` : "kho"} văn bản có sẵn (NĐ 88/2024, NĐ 226/2025, QĐ 106/2025 Phụ lục I, II, QĐ 14/2026, tài liệu nghiệp vụ) và trả lời số liệu dự án (số hộ, kinh phí, diện tích, hiện trạng, vướng mắc, phương án). Không tự soạn câu trả lời — cán bộ đọc đoạn trích để kết luận.</>
        ) : (
          <><b>Chế độ Gemini:</b> gửi tới Google <b>câu hỏi</b> (đã tự che số CCCD, số điện thoại) và <b>các đoạn văn bản pháp lý liên quan</b>{kemSoLieu ? <> cùng <b>số liệu tổng hợp</b> của dự án</> : null}; không gửi hồ sơ, tên chủ sử dụng, tệp, bản đồ. Không gõ họ tên, số giấy tờ vào câu hỏi. Gemini chỉ được dặn trả lời theo đoạn trích, ghi [nguồn] — vẫn có thể sai, phải đối chiếu đoạn trích bên dưới.</>
        )}
      </div>

      {cheDo === "GEMINI" && (
        <div className="the" aria-label="Cài đặt Gemini API">
          <button className="the-dau hd-muc" aria-expanded={moCaiDat} onClick={() => setMoCaiDat(!moCaiDat)}>
            <h3>{moCaiDat ? "▾" : "▸"} Cài đặt Gemini API</h3>
            <span className="mo chu-nho">{cg.khoa ? `Đã có khóa${cg.maHoa ? " (mã hóa)" : ""} · mô hình ${cg.moHinh}` : "Chưa có khóa"}{cg.dongY ? "" : " · chưa đồng ý điều kiện"}</span>
          </button>
          {moCaiDat && (
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
              <div className="luoi" style={{ gridTemplateColumns: "minmax(0, 2fr) auto auto auto", gap: 8, alignItems: "end" }}>
                <label className="chu-nho">Khóa API<input type="password" autoComplete="off" aria-label="Khóa API Gemini" placeholder={cg.khoa ? "•••••••• (đã lưu — dán khóa mới để thay)" : "Dán khóa AIza…"} value={khoaNhap} onChange={(e) => setKhoaNhap(e.target.value)} /></label>
                <button className="nut nut-chinh" disabled={!khoaNhap.trim()} onClick={() => void luuKhoa()}>Lưu khóa</button>
                <button className="nut" disabled={!cg.khoa || dangKiem} onClick={() => void kiem()}>{dangKiem ? "Đang kiểm tra…" : "Kiểm tra khóa"}</button>
                <button className="nut nut-nguy" disabled={!cg.khoa} onClick={async () => { if (confirm("Xóa khóa API khỏi máy này?")) setCg(await luuCaiDatGemini({ xoaKhoa: true })); }}>Xóa khóa</button>
              </div>
              <div className="luoi luoi-2" style={{ gap: 8 }}>
                <label className="chu-nho">Mô hình
                  {dsMoHinh.length ? (
                    <Chon aria-label="Mô hình Gemini" value={cg.moHinh} onChange={async (e) => setCg(await luuCaiDatGemini({ moHinh: e.target.value }))}>
                      {dsMoHinh.map((m) => <option key={m} value={m}>{m}</option>)}
                    </Chon>
                  ) : (
                    <input aria-label="Mô hình Gemini" value={cg.moHinh} placeholder={MO_HINH_MAC_DINH} onChange={(e) => setCg({ ...cg, moHinh: e.target.value })} onBlur={async () => setCg(await luuCaiDatGemini({ moHinh: cg.moHinh || MO_HINH_MAC_DINH }))} />
                  )}
                </label>
                <label className="chu-nho" style={{ alignSelf: "end" }}><input type="checkbox" checked={kemSoLieu} onChange={(e) => setKemSoLieu(e.target.checked)} /> Kèm số liệu tổng hợp của dự án đang chọn (số hộ, kinh phí, diện tích, hiện trạng — không có tên, số giấy tờ)</label>
              </div>
              <label className="thong-bao thong-bao-vang chu-nho" style={{ display: "flex", gap: 8, margin: 0 }}>
                <input type="checkbox" aria-label="Đồng ý điều kiện gửi dữ liệu cho Gemini" checked={!!cg.dongY} onChange={async (e) => setCg(await luuCaiDatGemini({ dongY: e.target.checked }))} />
                <span>Tôi hiểu: ở chế độ Gemini, câu hỏi và các đoạn văn bản pháp lý liên quan được gửi tới máy chủ của Google qua Internet; tôi không nhập họ tên, số giấy tờ, thông tin cá nhân vào câu hỏi; câu trả lời của AI chỉ để tham khảo và phải đối chiếu văn bản gốc.</span>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="the hd-hoi-thoai" aria-label="Hội thoại">
        <div className="the-than luoi" style={{ gap: 14 }}>
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
        <div className="hd-nhap">
          <Chon aria-label="Dự án cho số liệu" value={duAnId} onChange={(e) => setDuAnId(e.target.value)} title="Dự án dùng để trả lời câu hỏi số liệu">
            {dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
            {dsDuAn.length > 1 && <option value="*">Mọi dự án</option>}
          </Chon>
          <textarea aria-label="Câu hỏi" rows={2} placeholder="Nhập câu hỏi (Enter để gửi, Shift+Enter xuống dòng)…" value={cauHoi} onChange={(e) => setCauHoi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void hoi(); } }} />
          <button className="nut nut-chinh" disabled={!cauHoi.trim() || !cm} onClick={() => void hoi()}>Gửi</button>
          {luot.length > 0 && <button className="nut" onClick={() => setLuot([])}>Hội thoại mới</button>}
        </div>
      </div>
    </div>
  );
}

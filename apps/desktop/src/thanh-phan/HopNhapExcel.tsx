import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";
import {
  chuCot,
  coLoiChan,
  goiYAnhXa,
  goiYTrang,
  kiemTraNhap,
  LOAI_TRANG,
  moTepExcel,
  nhanCot,
  taoMauNhap,
  TEN_LOAI_TRANG,
  TRUONG,
  xemTruoc,
  type AnhXa,
  type LoaiTrang,
  type TepExcel,
} from "../nhap-excel";
import type { DuAn } from "../mo-hinh";
import { Chon } from "./Chon";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Nhập hồ sơ từ Excel: tải mẫu hoặc dùng tệp sẵn có → chọn tệp → phần mềm tự đoán ánh xạ trang/cột
 * (cán bộ chỉnh, xem trước) → kiểm tra toàn bộ → nhập (chỉ khi không còn lỗi).
 */
export function HopNhapExcel({ duAn, dong }: { duAn: DuAn; dong: () => void }) {
  const { kho, hoCua, taiLai, quyen, ghiNhatKy, nguoiDung } = useUngDung();
  const [tep, setTep] = useState<{ ten: string; tep: TepExcel } | null>(null);
  const [ax, setAx] = useState<AnhXa | null>(null);
  const [goc, setGoc] = useState<AnhXa | null>(null);
  const [the, setThe] = useState<LoaiTrang>("Thua");
  const [dang, setDang] = useState(false);
  const [loiDoc, setLoiDoc] = useState("");
  const [xong, setXong] = useState("");
  const [taiMau, setTaiMau] = useState(false);

  const kq = useMemo(() => (tep && ax ? kiemTraNhap(tep.tep, ax, duAn, hoCua(duAn.id), tep.ten, nguoiDung) : null), [tep, ax, duAn, hoCua, nguoiDung]);
  const chan = kq ? coLoiChan(kq) : true;
  const soLoi = kq?.loi.filter((l) => l.muc === "LOI").length ?? 0;
  const soCb = (kq?.loi.length ?? 0) - soLoi;

  const chon = async (f?: File) => {
    setTep(null);
    setAx(null);
    setXong("");
    setLoiDoc("");
    if (!f) return;
    setDang(true);
    try {
      const t = await moTepExcel(new Uint8Array(await f.arrayBuffer()));
      const g = goiYAnhXa(t);
      setTep({ ten: f.name, tep: t });
      setAx(g);
      setGoc(g);
      setThe(LOAI_TRANG.find((l) => g[l].trang && l === "Thua") ?? LOAI_TRANG.find((l) => g[l].trang) ?? "Thua");
    } catch {
      setLoiDoc("Không đọc được tệp. Chỉ hỗ trợ .xlsx (Excel 2007 trở lên) — tệp .xls cũ: mở bằng Excel và Lưu thành .xlsx.");
    } finally {
      setDang(false);
    }
  };
  const nhap = async () => {
    if (!kq || chan || !quyen("SUA_HO_SO") || !tep) return;
    setDang(true);
    try {
      // Một giao dịch: nhập đủ hoặc không nhập gì (P0-6)
      try {
        await kho.ghiLo({ ho: [...kq.hoMoi, ...kq.hoBoSung] });
      } catch (e) {
        await taiLai();
        setLoiDoc(`Không nhập được — chưa hồ sơ nào được ghi: ${(e as Error).message}`);
        return;
      }
      await taiLai();
      await ghiNhatKy("Nhập hồ sơ từ Excel", `${duAn.ten} – tệp ${tep.ten}: ${kq.hoMoi.length} hồ sơ mới, bổ sung ${kq.hoBoSung.length}; ${kq.dem.thua} thửa, ${kq.dem.kiemDem} dòng kiểm đếm`);
      const d = kq.dem;
      setXong(`Đã nhập: ${kq.hoMoi.length} hồ sơ mới, bổ sung ${kq.hoBoSung.length} hồ sơ đã có (${d.nhanKhau} nhân khẩu, ${d.thua} thửa, ${d.kiemDem} dòng kiểm đếm). Giá đất và các khoản hỗ trợ chọn tiếp trong từng hồ sơ.`);
      setTep(null);
      setAx(null);
    } finally {
      setDang(false);
    }
  };
  const taiTepMau = async () => {
    setTaiMau(true);
    try {
      await taiXuong(await taoMauNhap(), "Mau-nhap-ho-so-GPMB.xlsx", XLSX);
    } finally {
      setTaiMau(false);
    }
  };

  return (
    <HopThoai
      tieuDe="Nhập hồ sơ từ Excel"
      dong={dong}
      rong={1080}
      chan={
        <>
          <button className="nut" style={{ marginRight: "auto" }} disabled={taiMau} onClick={() => void taiTepMau()}>{taiMau ? "Đang tạo tệp…" : "Tải tệp mẫu"}</button>
          <button className="nut" onClick={dong}>Đóng</button>
          <button className="nut nut-chinh" disabled={dang || chan || !kq || (!kq.hoMoi.length && !kq.hoBoSung.length)} onClick={nhap}>
            {kq ? `Nhập ${kq.hoMoi.length} hồ sơ mới, bổ sung ${kq.hoBoSung.length}` : "Nhập"}
          </button>
        </>
      }
    >
      <p className="mo" style={{ marginTop: 0 }}>
        Dùng <b>tệp mẫu</b> của phần mềm hoặc <b>tệp Excel sẵn có</b> (danh sách hộ, thửa… cấu trúc cột khác): phần mềm tự đoán trang, dòng tiêu đề và cột theo tên cột — anh/chị chỉ cần chỉnh nếu đoán sai, rồi xem bảng xem trước. Tệp không có mã hộ thì chọn cột <b>Tên chủ sử dụng</b>: thửa cùng chủ gộp một hồ sơ. Phần mềm kiểm tra toàn bộ tệp trước; <b>còn lỗi thì không nhập dòng nào</b>. Tệp chỉ đọc trên máy.
      </p>
      <input type="file" accept=".xlsx" aria-label="Chọn tệp Excel" disabled={dang} onChange={(e) => void chon(e.target.files?.[0])} />
      {dang && <span className="mo" style={{ marginLeft: 8 }}>Đang đọc…</span>}
      {loiDoc && <div className="thong-bao thong-bao-do" style={{ marginTop: 12 }}>{loiDoc}</div>}
      {xong && <div className="thong-bao thong-bao-xanh" role="status" style={{ marginTop: 12 }}>{xong}</div>}

      {tep && ax && (
        <AnhXaCot tep={tep.tep} ax={ax} setAx={setAx} the={the} setThe={setThe} datLai={() => goc && setAx(goc)} />
      )}

      {kq && (
        <div style={{ marginTop: 14 }}>
          <h4 className="nx-tieu-de">3. Kết quả kiểm tra</h4>
          <div className={`thong-bao ${soLoi ? "thong-bao-do" : "thong-bao-xanh"}`} role="status">
            {tep?.ten}: {kq.hoMoi.length} hồ sơ mới, bổ sung {kq.hoBoSung.length} hồ sơ đã có · {kq.dem.nhanKhau} nhân khẩu · {kq.dem.thua} thửa · {kq.dem.kiemDem} dòng kiểm đếm.{" "}
            {soLoi ? <b>{soLoi} lỗi — sửa ánh xạ hoặc sửa tệp rồi chọn lại.</b> : "Không có lỗi."} {soCb ? `${soCb} cảnh báo cần xem.` : ""}
          </div>
          {kq.loi.length > 0 && (
            <div className="bang-cuon" style={{ maxHeight: 260 }}>
              <table className="bang">
                <thead><tr><th>Mức</th><th>Trang</th><th className="so">Dòng</th><th>Cột</th><th>Nội dung</th></tr></thead>
                <tbody>
                  {kq.loi.map((l, i) => (
                    <tr key={i}>
                      <td><span className={`nhan ${l.muc === "LOI" ? "nhan-do" : "nhan-vang"}`}>{l.muc === "LOI" ? "Lỗi" : "Cảnh báo"}</span></td>
                      <td>{l.trang}</td><td className="so">{l.dong || ""}</td><td>{l.cot}</td><td>{l.noiDung}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!chan && (kq.hoMoi.length > 0 || kq.hoBoSung.length > 0) && (
            <div className="bang-cuon" style={{ maxHeight: 260, marginTop: 10 }}>
              <table className="bang">
                <thead><tr><th>Mã</th><th>Họ tên</th><th /><th className="so">Nhân khẩu</th><th className="so">Thửa</th><th className="so">Tài sản</th></tr></thead>
                <tbody>
                  {[...kq.hoMoi.map((h) => ({ h, moi: true })), ...kq.hoBoSung.map((h) => ({ h, moi: false }))].map(({ h, moi }) => (
                    <tr key={h.id}><td>{h.ma}</td><td>{h.ten}</td><td><span className={`nhan ${moi ? "nhan-xanh" : "nhan-tim"}`}>{moi ? "Mới" : "Bổ sung"}</span></td><td className="so">{h.nhanKhau.length}</td><td className="so">{h.thua.length}</td><td className="so">{h.taiSan.length}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </HopThoai>
  );
}

/** Ánh xạ cột: mỗi loại dữ liệu một thẻ — chọn trang, dòng tiêu đề, cột cho từng trường; xem trước 5 dòng. */
function AnhXaCot(p: { tep: TepExcel; ax: AnhXa; setAx: (a: AnhXa) => void; the: LoaiTrang; setThe: (l: LoaiTrang) => void; datLai: () => void }) {
  const a = p.ax[p.the];
  const nhan = useMemo(() => (a.trang ? nhanCot(p.tep, a.trang, a.dongTieuDe) : []), [p.tep, a.trang, a.dongTieuDe]);
  const xt = useMemo(() => (a.trang ? xemTruoc(p.tep, a, 5) : []), [p.tep, a]);
  const dat = (moi: Partial<typeof a>) => p.setAx({ ...p.ax, [p.the]: { ...a, ...moi } });
  const doiTrang = (trang: string) => {
    if (!trang) return dat({ trang: null });
    const g = goiYTrang(p.tep, trang, p.the);
    dat({ trang, dongTieuDe: g.dongTieuDe, cot: g.cot });
  };
  const truongDung = TRUONG[p.the].filter((t) => a.cot[t.khoa] != null);
  const soCot = p.tep.trang.find((t) => t.ten === a.trang)?.soCot ?? 0;
  const soDong = p.tep.trang.find((t) => t.ten === a.trang)?.soDong ?? 1;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h4 className="nx-tieu-de" style={{ margin: 0 }}>1. Ánh xạ cột dữ liệu</h4>
        <span className="tach" />
        <button className="nut nut-nho" onClick={p.datLai}>Tự nhận diện lại</button>
      </div>
      <div className="tab" role="tablist" style={{ margin: "8px 0" }}>
        {LOAI_TRANG.map((l) => (
          <button key={l} className={p.the === l ? "chon" : ""} onClick={() => p.setThe(l)}>
            {TEN_LOAI_TRANG[l]} {p.ax[l].trang ? <span className="nhan nhan-xanh" style={{ marginLeft: 4 }}>{p.ax[l].trang}</span> : <span className="mo chu-nho">(không nhập)</span>}
          </button>
        ))}
      </div>
      <div className="luoi" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 10, alignItems: "end" }}>
        <label className="o-nhap">
          <span className="chu-nho mo">Trang trong tệp</span>
          <Chon value={a.trang ?? ""} onChange={(e) => doiTrang(e.target.value)}>
            <option value="">— Không nhập {TEN_LOAI_TRANG[p.the].toLowerCase()} —</option>
            {p.tep.trang.map((t) => <option key={t.ten} value={t.ten}>{t.ten} ({t.soDong} dòng)</option>)}
          </Chon>
        </label>
        <label className="o-nhap">
          <span className="chu-nho mo">Dòng tiêu đề</span>
          <input type="number" min={1} max={soDong} value={a.dongTieuDe} disabled={!a.trang} onChange={(e) => dat({ dongTieuDe: Math.max(1, Math.min(soDong, Number(e.target.value) || 1)) })} />
        </label>
      </div>
      {a.trang && (
        <>
          <div className="bang-cuon nx-anh-xa" style={{ maxHeight: 300, marginTop: 10 }}>
            <table className="bang">
              <thead><tr><th style={{ width: "42%" }}>Trường dữ liệu phần mềm</th><th>Cột tương ứng trong file Excel</th></tr></thead>
              <tbody>
                {TRUONG[p.the].map((t) => {
                  const c = a.cot[t.khoa] ?? null;
                  const thieu = t.batBuoc && c == null;
                  return (
                    <tr key={t.khoa}>
                      <td>
                        <b>{t.tieuDe}</b>{t.batBuoc && <span className="chu-do"> *</span>}{t.motTrong && <span className="mo chu-nho"> (một trong hai)</span>}
                        {t.ghiChu && <div className="mo chu-nho">{t.ghiChu}</div>}
                      </td>
                      <td>
                        <Chon className={thieu ? "o-loi" : ""} value={c ?? ""} onChange={(e) => dat({ cot: { ...a.cot, [t.khoa]: e.target.value ? Number(e.target.value) : null } })}>
                          <option value="">— Không có —</option>
                          {Array.from({ length: soCot }, (_, i) => i + 1).map((i) => (
                            <option key={i} value={i}>Cột {chuCot(i)}: {nhan[i - 1] || "(trống)"}</option>
                          ))}
                        </Chon>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <h4 className="nx-tieu-de">2. Xem trước 5 dòng đầu (theo ánh xạ hiện tại)</h4>
          {xt.length === 0 ? (
            <div className="mo chu-nho">Không có dòng dữ liệu sau dòng tiêu đề {a.dongTieuDe}.</div>
          ) : (
            <div className="bang-cuon">
              <table className="bang">
                <thead><tr><th className="so">Dòng</th>{truongDung.map((t) => <th key={t.khoa}>{t.tieuDe}</th>)}</tr></thead>
                <tbody>
                  {xt.map((r) => (
                    <tr key={r.dong}><td className="so">{r.dong}</td>{truongDung.map((t) => <td key={t.khoa}>{r.gt[t.khoa]}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

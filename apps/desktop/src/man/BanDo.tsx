import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CAU_HINH_MAC_DINH,
  diemTrongThua,
  loaiHienTrangBanDo,
  docDgn,
  giaiMaNhan,
  dungThua,
  goiYCauHinh,
  thongKeLop,
  tenLopPl21,
  LOP_RANH_THUA_PL21,
  tinhDienTichThuHoi,
  type CauHinhLop,
  type TruongNut,
  type DienTichThuHoi,
  type KetQuaDocDgn,
  type KetQuaDungThua,
  type PhanTuChu,
  type ThuaBanDo,
} from "@gpmb/gis";
import { useUngDung } from "../ung-dung";
import { taoId, type DuAn, type Ho } from "../mo-hinh";
import { HopThoai, O } from "../thanh-phan/chung";
import { hoMoi } from "./DuAn";
import { tinhHo } from "../tinh-ho";
import { THU_TU_TRANG_THAI, TT_GPMB, homNayIso, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { PhanBoTrangThai } from "../thanh-phan/BieuDo";
import { Chon } from "../thanh-phan/Chon";

interface DuLieuBanDo {
  ban: KetQuaDocDgn;
  kq: KetQuaDungThua;
  pham: { minX: number; minY: number; maxX: number; maxY: number };
  /** Cấu hình lớp đã dùng để dựng thửa */
  cauHinh: CauHinhLop;
  /** true: cấu hình do phần mềm gợi ý (cán bộ chưa chốt) */
  laGoiY: boolean;
  ghiChuGoiY: string[];
}

const boNho = new Map<string, DuLieuBanDo>();

/** Nạp bản đồ đã lưu của dự án (dùng lại bộ nhớ đệm) — cho bản đồ nhỏ ở màn Dự án. */
export async function napBanDoDuAn(kho: { docBanDo(id: string): Promise<Uint8Array | null> }, duAn: DuAn): Promise<DuLieuBanDo | null> {
  const co = boNho.get(duAn.id);
  if (co) return co;
  const b = await kho.docBanDo(duAn.id);
  if (!b) return null;
  const d = phanTich(b, duAn.banDo?.cauHinh);
  boNho.set(duAn.id, d);
  return d;
}
export type { DuLieuBanDo };

const TEN_CO: Record<string, string> = {
  THIEU_SO_THUA: "Thiếu số thửa",
  NHIEU_SO_THUA: "Nhiều số thửa",
  THIEU_SO_TO: "Thiếu số tờ",
  NHIEU_SO_TO: "Nhiều số tờ",
  THIEU_DIEN_TICH_GHI: "Thiếu nhãn DT",
  LECH_DIEN_TICH: "Lệch DT > 5%",
  THIEU_LOAI_DAT: "Thiếu loại đất",
  NHIEU_CHU: "Nhiều chủ",
  THIEU_CHU: "Thiếu chủ",
};

/** Đọc tệp và dựng thửa; không có cấu hình đã chốt thì dùng cấu hình gợi ý từ cấu trúc tệp. */
function phanTich(bytes: Uint8Array, daChot?: CauHinhLop): DuLieuBanDo {
  const ban = docDgn(bytes);
  const goiY = daChot ? null : goiYCauHinh(ban, CAU_HINH_MAC_DINH);
  const cauHinh = daChot ?? goiY!.cauHinh;
  return dungLai(ban, cauHinh, !daChot, goiY?.ghiChu ?? []);
}

function dungLai(ban: KetQuaDocDgn, cauHinh: CauHinhLop, laGoiY: boolean, ghiChuGoiY: string[]): DuLieuBanDo {
  const kq = dungThua(ban, cauHinh);
  const pham = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const t of kq.thua)
    for (const d of t.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  for (const v of kq.vungGpmb)
    for (const d of v.vong[0]!) {
      pham.minX = Math.min(pham.minX, d.x);
      pham.minY = Math.min(pham.minY, d.y);
      pham.maxX = Math.max(pham.maxX, d.x);
      pham.maxY = Math.max(pham.maxY, d.y);
    }
  return { ban, kq, pham, cauHinh, laGoiY, ghiChuGoiY };
}

export function BanDo({ duAnId }: { duAnId: string }) {
  const { dsDuAn, kho, luuDuAn, hoCua, di, chinhSach, quyen, bao } = useUngDung();
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const [dl, setDl] = useState<DuLieuBanDo | null>(boNho.get(duAnId) ?? null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [chon, setChon] = useState<ThuaBanDo | null>(null);
  const [loc, setLoc] = useState<"TRONG_RANH" | "TAT_CA" | "CO_CO">("TRONG_RANH");
  const [taoHo, setTaoHo] = useState(false);
  const [moCauHinh, setMoCauHinh] = useState(false);

  useEffect(() => {
    if (dl || !duAn?.banDo) return;
    void kho.docBanDo(duAnId).then((b) => {
      if (!b) return;
      try {
        const d = phanTich(b, duAn.banDo?.cauHinh);
        boNho.set(duAnId, d);
        setDl(d);
      } catch (e) {
        setLoi((e as Error).message);
      }
    });
  }, [duAnId, duAn?.banDo, dl, kho]);

  // Phạm vi thu hồi = hợp các vùng ranh / vùng thửa thu hồi đã chọn ∪ các thửa chọn trực tiếp
  const maVungChon = duAn?.banDo?.vungChonDs ?? (duAn?.banDo?.vungChon ? [duAn.banDo.vungChon] : []);
  const vungDs = dl ? dl.kq.vungGpmb.filter((v) => maVungChon.includes(v.ma)) : [];
  const vung = vungDs[0] ?? null;
  const thuaChon = useMemo(() => new Set(duAn?.banDo?.thuaChon ?? []), [duAn?.banDo?.thuaChon]);
  const thuHoi = useMemo(() => {
    if (!dl || (!vungDs.length && !thuaChon.size)) return new Map<string, DienTichThuHoi>();
    const r = vungDs.length ? tinhDienTichThuHoi(dl.kq.thua, vungDs.map((v) => v.vong)) : null;
    return new Map(
      dl.kq.thua.map((t, i) => {
        const g = r?.[i];
        const toanBo: DienTichThuHoi = { ma: t.ma, dienTichHinhHoc: t.dienTichHinhHoc, dienTichThuHoi: t.dienTichHinhHoc, phamVi: "TOAN_BO", vongThuHoi: [t.vong] };
        const kq: DienTichThuHoi = thuaChon.has(t.ma) && (!g || g.phamVi === "NGOAI") ? toanBo : g ?? { ...toanBo, dienTichThuHoi: 0, phamVi: "NGOAI", vongThuHoi: [] };
        return [t.ma + "#" + i, kq];
      }),
    );
  }, [dl, maVungChon.join("|"), thuaChon]); // eslint-disable-line react-hooks/exhaustive-deps
  const coPhamVi = vungDs.length > 0 || thuaChon.size > 0;
  const khoaThua = (t: ThuaBanDo) => t.ma + "#" + dl!.kq.thua.indexOf(t);
  const [cheDoChonThua, setCheDoChonThua] = useState(false);
  const [thieuPhamVi, setThieuPhamVi] = useState(false);
  const luuBanDoDa = (p: Partial<NonNullable<DuAn["banDo"]>>) => duAn?.banDo && luuDuAn({ ...duAn, banDo: { ...duAn.banDo, ...p } });
  const doiThuaChon = (ds: string[]) => void luuBanDoDa({ thuaChon: ds });
  const batTatThua = (t: ThuaBanDo) => { const s = new Set(thuaChon); if (s.has(t.ma)) s.delete(t.ma); else s.add(t.ma); doiThuaChon([...s]); };

  const hos = hoCua(duAnId);
  const ttThua = useMemo(() => {
    const m = new Map<string, TrangThaiGpmb>();
    if (!duAn) return m;
    const homNay = homNayIso();
    for (const h of hos) {
      const tt = trangThaiHo(duAn, h, tinhHo(chinhSach(duAn), duAn, h), homNay);
      for (const t of h.thua) if (t.maBanDo) m.set(t.maBanDo, tt);
    }
    return m;
  }, [hos, duAn, chinhSach]);
  const daLienKet = useMemo(() => {
    const m = new Map<string, Ho>();
    for (const h of hos) for (const t of h.thua) if (t.maBanDo) m.set(t.maBanDo, h);
    return m;
  }, [hos]);

  if (!duAn) return <div className="trang trong">Không tìm thấy dự án.</div>;

  const napTep = async (f: File) => {
    if (!quyen("SUA_HO_SO")) return bao("Tài khoản không có quyền nạp bản đồ", "loi");
    setDangDoc(true);
    setLoi(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const d = phanTich(bytes);
      await kho.luuBanDo(duAnId, bytes);
      boNho.set(duAnId, d);
      setDl(d);
      await luuDuAn({ ...duAn, banDo: { tenTep: f.name, ngayNhap: new Date().toISOString(), vungChon: null, vungChonDs: [], thuaChon: [] } });
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangDoc(false);
    }
  };

  const apDungCauHinh = async (ch: CauHinhLop | null) => {
    if (!dl || !duAn.banDo) return;
    const goiY = ch ? null : goiYCauHinh(dl.ban, CAU_HINH_MAC_DINH);
    const d = dungLai(dl.ban, ch ?? goiY!.cauHinh, !ch, goiY?.ghiChu ?? []);
    boNho.set(duAnId, d);
    setDl(d);
    setChon(null);
    const { cauHinh: _bo, ...banDo } = duAn.banDo;
    const vungChon = d.kq.vungGpmb.some((v) => v.ma === banDo.vungChon) ? banDo.vungChon : null;
    const vungChonDs = (banDo.vungChonDs ?? []).filter((m) => d.kq.vungGpmb.some((v) => v.ma === m));
    await luuDuAn({ ...duAn, banDo: ch ? { ...banDo, vungChon, vungChonDs, cauHinh: ch } : { ...banDo, vungChon, vungChonDs } });
    setMoCauHinh(false);
    bao(ch ? "Đã chốt cấu hình lớp và dựng lại thửa" : "Đã quay về cấu hình gợi ý");
  };

  const dsThua = dl
    ? dl.kq.thua.filter((t) => {
        if (loc === "CO_CO") return t.co.length > 0;
        if (loc === "TRONG_RANH") return !coPhamVi || (thuHoi.get(khoaThua(t))?.phamVi ?? "NGOAI") !== "NGOAI";
        return true;
      })
    : [];

  return (
    <div className="trang" style={{ maxWidth: "none" }}>
      <div className="duong-dan">
        <button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / <button onClick={() => di({ ten: "du-an", duAnId })}>{duAn.ten}</button> / Bản đồ
      </div>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Bản đồ</div>
          <h1>Bản đồ địa chính khu đất thu hồi</h1>
          <div className="mo-ta">
            {duAn.banDo ? `${duAn.banDo.tenTep} · nạp ${new Date(duAn.banDo.ngayNhap).toLocaleDateString("vi-VN")}` : "Chưa nạp bản đồ"} · Tọa độ VN-2000 · Xử lý hoàn toàn trên máy
          </div>
        </div>
        <div className="phai">
          {dl && <button className="nut" onClick={() => setMoCauHinh(true)}>Cấu hình lớp{dl.laGoiY ? " (gợi ý)" : ""}</button>}
          <label className="nut">
            {dangDoc ? "Đang đọc…" : duAn.banDo ? "Nạp tệp khác" : "Nạp tệp DGN"}
            <input type="file" accept=".dgn,.DGN" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && napTep(e.target.files[0])} />
          </label>
          {dl && <button className="nut nut-chinh" onClick={() => (coPhamVi ? setTaoHo(true) : setThieuPhamVi(true))}>Tạo hồ sơ từ thửa thu hồi</button>}
        </div>
      </div>
      {loi && <div className="thong-bao thong-bao-do">{loi}</div>}
      {dl && dl.laGoiY && dl.ghiChuGoiY.length > 0 && (
        <div className="thong-bao thong-bao-vang" style={{ marginBottom: 12 }}>
          <b>Cấu hình lớp đang dùng là gợi ý, chưa được chốt.</b> {dl.ghiChuGoiY.join(" ")}{" "}
          <button className="nut nut-chu nut-nho" onClick={() => setMoCauHinh(true)}>Xem và chốt</button>
        </div>
      )}
      {!dl && !loi && (
        <div className="the the-than" style={{ textAlign: "center", padding: 50 }}>
          <h2>Nạp bản đồ DGN (MicroStation V7, V8/V8i)</h2>
          <p className="mo">Phần mềm khép thửa từ đường ranh, đọc nhãn số tờ, số thửa, loại đất, diện tích, chủ sử dụng (phông TCVN3 hoặc Unicode). Kết quả là dữ liệu đề xuất để cán bộ kiểm tra.</p>
          <p className="mo chu-nho">Lớp mặc định: ranh thửa 10 · nhãn thửa 13 · số thửa 4 · số tờ 5 · chủ sử dụng 6 · ranh GPMB 30. Bản đồ lập bằng gCadas: phần mềm tự nhận nút thuộc tính thửa; cán bộ xem và chốt ở “Cấu hình lớp”.</p>
        </div>
      )}
      {dl && (
        <div className="ban-do-khung">
          <KhungVe dl={dl} vungChon={maVungChon} thuHoi={thuHoi} khoaThua={khoaThua} chon={chon} setChon={setChon} daLienKet={daLienKet} ttThua={ttThua} bamThua={cheDoChonThua && quyen("SUA_HO_SO") ? batTatThua : undefined} thuaChon={thuaChon} />
          <div className="ben-phai">
            <KiemTraBanDo dl={dl} coPhamVi={coPhamVi} soVung={dl.kq.vungGpmb.length} moCauHinh={() => setMoCauHinh(true)} ttThua={ttThua} />
            <div className="the co-dinh">
              <div className="the-dau"><h3>Phạm vi thu hồi</h3><span className="mo chu-nho">{vungDs.length} vùng · {thuaChon.size} thửa chọn tay</span></div>
              <div className="the-than" style={{ display: "grid", gap: 6 }}>
                <div className="mo chu-nho">Cách 1 — chọn các vùng ranh GPMB / vùng thửa thu hồi (lớp {dl.cauHinh.ranhGpmb.join(", ")}): phần mềm tính phần giao, phân biệt thu hồi toàn bộ / một phần. Phần mềm không tự chọn — cán bộ chọn theo hồ sơ được duyệt.</div>
                {dl.kq.vungGpmb.length > 0 && (
                  <div className="nhom-nut">
                    <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => void luuBanDoDa({ vungChonDs: dl.kq.vungGpmb.map((v) => v.ma), vungChon: null })}>Chọn tất cả {dl.kq.vungGpmb.length} vùng</button>
                    <button className="nut nut-nho" disabled={!maVungChon.length || !quyen("SUA_HO_SO")} onClick={() => void luuBanDoDa({ vungChonDs: [], vungChon: null })}>Bỏ chọn</button>
                  </div>
                )}
                <div className="ds-vung">
                  {dl.kq.vungGpmb.map((v) => (
                    <label key={v.ma} className="nhom-nut" style={{ alignItems: "center" }}>
                      <input type="checkbox" disabled={!quyen("SUA_HO_SO")} checked={maVungChon.includes(v.ma)} onChange={(e) => void luuBanDoDa({ vungChonDs: e.target.checked ? [...maVungChon, v.ma] : maVungChon.filter((m) => m !== v.ma), vungChon: null })} />
                      <span>
                        <b>{v.dienTich.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m²</b>{" "}
                        <span className="mo chu-nho">· chu vi {v.chuVi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m · {v.nguon === "VUNG_KHEP_KIN" ? "vùng khép kín" : "khép từ đường"}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {dl.kq.vungGpmb.length === 0 && <div className="thong-bao thong-bao-vang" style={{ marginBottom: 0 }}>Không có vùng khép kín trên lớp {dl.cauHinh.ranhGpmb.join(", ")}. Chọn lớp khác ở <button className="nut nut-chu nut-nho" onClick={() => setMoCauHinh(true)}>Cấu hình lớp</button> hoặc dùng cách 2.</div>}
                <div className="mo chu-nho" style={{ marginTop: 4 }}>Cách 2 — chọn thửa trực tiếp (thu hồi toàn bộ thửa; thửa thu hồi một phần sửa diện tích trong hồ sơ):</div>
                <div className="nhom-nut">
                  <button className={`nut nut-nho ${cheDoChonThua ? "nut-chinh" : ""}`} disabled={!quyen("SUA_HO_SO")} onClick={() => setCheDoChonThua(!cheDoChonThua)}>{cheDoChonThua ? "Đang chọn thửa — bấm để xong" : "Chọn thửa trên bản đồ"}</button>
                  {dl.kq.thua.some((t) => loaiHienTrangBanDo(t.hienTrangBanDo) === "CHUA") && <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => doiThuaChon([...new Set([...thuaChon, ...dl.kq.thua.filter((t) => loaiHienTrangBanDo(t.hienTrangBanDo) === "CHUA").map((t) => t.ma)])])}>+ Thửa ghi "Chưa GPMB/NQH"</button>}
                  {dl.kq.thua.some((t) => loaiHienTrangBanDo(t.hienTrangBanDo)) && <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => doiThuaChon([...new Set([...thuaChon, ...dl.kq.thua.filter((t) => loaiHienTrangBanDo(t.hienTrangBanDo)).map((t) => t.ma)])])}>+ Mọi thửa có nhãn hiện trạng</button>}
                  {thuaChon.size > 0 && <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => doiThuaChon([])}>Bỏ {thuaChon.size} thửa chọn tay</button>}
                </div>
                {cheDoChonThua && <div className="thong-bao thong-bao-xanh chu-nho" style={{ marginBottom: 0 }}>Bấm vào thửa trên bản đồ (hoặc ô ở bảng thửa) để thêm / bỏ khỏi phạm vi thu hồi.</div>}
                {coPhamVi && <TomTatThuHoi thuHoi={thuHoi} />}
                {coPhamVi && (() => {
                  const trong = dl.kq.thua.filter((t) => (thuHoi.get(khoaThua(t))?.phamVi ?? "NGOAI") !== "NGOAI");
                  const dem = Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, 0])) as Record<TrangThaiGpmb, number>;
                  let chuaHoSo = 0;
                  for (const t of trong) { const tt = ttThua.get(t.ma); if (tt) dem[tt]++; else chuaHoSo++; }
                  return (
                    <div style={{ marginTop: 8, borderTop: "1px solid var(--vien)", paddingTop: 8 }}>
                      <div className="chu-nho mo" style={{ marginBottom: 4 }}>Hiện trạng GPMB theo thửa trong ranh ({trong.length} thửa; {chuaHoSo} thửa chưa lập hồ sơ)</div>
                      <PhanBoTrangThai dem={dem} tong={trong.length - chuaHoSo} donVi="thửa" />
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="the" style={{ flex: 1 }}>
              <div className="the-dau">
                <h3>Thửa</h3>
                <span className="mo chu-nho">{dsThua.length}/{dl.kq.thua.length}</span>
                <div className="phai">
                  <Chon value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)}>
                    <option value="TRONG_RANH">Trong ranh</option>
                    <option value="TAT_CA">Tất cả</option>
                    <option value="CO_CO">Có nghi vấn</option>
                  </Chon>
                </div>
              </div>
              <div className="bang-cuon">
                <table className="bang">
                  <thead><tr><th title="Chọn tay là thửa thu hồi">TH</th><th>Tờ-thửa</th><th>Loại</th><th className="so">DT ghi</th><th className="so">Thu hồi</th><th>Chủ SD</th></tr></thead>
                  <tbody>
                    {dsThua.slice(0, 800).map((t) => {
                      const th = thuHoi.get(khoaThua(t));
                      return (
                        <tr key={khoaThua(t)} className={`co-the-chon ${chon === t ? "dang-chon" : ""}`} onClick={() => setChon(t)}>
                          <td onClick={(e) => e.stopPropagation()}><input type="checkbox" disabled={!quyen("SUA_HO_SO")} checked={thuaChon.has(t.ma)} onChange={() => batTatThua(t)} aria-label={`Chọn thửa ${t.soTo ?? "?"}-${t.soThua ?? "?"} là thửa thu hồi`} title="Chọn tay là thửa thu hồi" /></td>
                          <td style={{ whiteSpace: "nowrap" }}>{t.soTo ?? "?"}-{t.soThua ?? "?"}{t.co.length > 0 && <span className="nhan nhan-vang" style={{ marginLeft: 4 }} title={t.co.map((c) => TEN_CO[c]).join(", ")}>!</span>}</td>
                          <td>{t.loaiDatBanDo ?? "—"}</td>
                          <td className="so">{t.dienTichGhi ?? "—"}</td>
                          <td className="so">{th ? (th.phamVi === "NGOAI" ? "—" : th.dienTichThuHoi.toFixed(1)) : ""}</td>
                          <td className="chu-nho">{t.chuSuDung ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {chon && <ChiTietThua t={chon} th={thuHoi.get(khoaThua(chon))} ho={daLienKet.get(chon.ma)} tt={ttThua.get(chon.ma)} moHo={(h) => di({ ten: "ho", duAnId, hoId: h.id, tab: "thua" })} />}
          </div>
        </div>
      )}
      {dl && dl.ban.canhBao.length > 0 && <div className="mo chu-nho" style={{ marginTop: 8 }}>Ghi chú đọc tệp: {dl.ban.canhBao.join(" ")}</div>}
      {moCauHinh && dl && <HopCauHinhLop dl={dl} sua={quyen("SUA_HO_SO")} apDung={apDungCauHinh} dong={() => setMoCauHinh(false)} />}
      {thieuPhamVi && dl && (
        <HopThoai tieuDe="Chưa xác định thửa thu hồi" dong={() => setThieuPhamVi(false)} rong={640} chan={<button className="nut nut-chinh" onClick={() => setThieuPhamVi(false)}>Đã hiểu</button>}>
          <p style={{ marginTop: 0 }}>Để tạo hồ sơ, phần mềm cần biết thửa nào thuộc diện thu hồi. Chọn một trong hai cách ở mục <b>Phạm vi thu hồi</b> (cột bên phải):</p>
          <ol style={{ lineHeight: 1.7 }}>
            <li><b>Chọn vùng ranh GPMB / vùng thửa thu hồi</b> — {dl.kq.vungGpmb.length ? <>lớp {dl.cauHinh.ranhGpmb.join(", ")} đang có {dl.kq.vungGpmb.length} vùng; tích các vùng cần tính (hoặc "Chọn tất cả").</> : <>lớp {dl.cauHinh.ranhGpmb.join(", ")} chưa có vùng khép kín; mở <b>Cấu hình lớp</b> để chọn lớp chứa ranh GPMB hoặc thửa thu hồi (xem bảng thống kê lớp).</>}</li>
            <li><b>Chọn thửa trực tiếp</b> — bấm "Chọn thửa trên bản đồ" rồi bấm từng thửa, hoặc tích ô ở bảng thửa{dl.kq.thua.some((t) => loaiHienTrangBanDo(t.hienTrangBanDo)) ? ', hoặc thêm các thửa có nhãn "Chưa GPMB/NQH"' : ""}.</li>
          </ol>
          <p className="mo chu-nho">Diện tích thu hồi của thửa chọn trực tiếp mặc định bằng cả thửa; thửa thu hồi một phần sửa trong hồ sơ theo trích đo được duyệt.</p>
        </HopThoai>
      )}
      {taoHo && dl && coPhamVi && (
        <HopTaoHo duAn={duAn} dl={dl} thuHoi={thuHoi} khoaThua={khoaThua} daLienKet={daLienKet} soHo={hos.length} dong={() => setTaoHo(false)} />
      )}
    </div>
  );
}

const TEN_TRUONG_NUT: Record<TruongNut, string> = { soTo: "Số tờ", soThua: "Số thửa", loaiDat: "Loại đất", chuSuDung: "Chủ sử dụng" };
const dsLop = (x: string) => [...new Set(x.split(/[,;\s]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0))];

/** Cấu hình lớp: thống kê lớp trong tệp để cán bộ chọn; gợi ý tự động chỉ là điểm xuất phát. */
function HopCauHinhLop(p: { dl: DuLieuBanDo; sua: boolean; apDung: (ch: CauHinhLop | null) => void; dong: () => void }) {
  const tk = useMemo(() => thongKeLop(p.dl.ban), [p.dl.ban]);
  const c0 = p.dl.cauHinh;
  const [f, setF] = useState(() => ({
    ranhThua: c0.ranhThua.join(", "),
    nhanThua: c0.nhanThua.join(", "),
    soThua: c0.soThua.join(", "),
    soTo: c0.soTo.join(", "),
    chuSuDung: c0.chuSuDung.join(", "),
    ranhGpmb: c0.ranhGpmb.join(", "),
    nhanHienTrang: (c0.nhanHienTrang ?? []).join(", "),
    dienTichToiThieu: String(c0.dienTichToiThieu),
    lechPhanTram: String(Math.round(c0.lechDienTichChoPhep * 1000) / 10),
    lopNut: c0.nutThuocTinh?.lop.join(", ") ?? "",
    dong: Object.fromEntries((["soTo", "soThua", "loaiDat", "chuSuDung"] as TruongNut[]).map((k) => [k, c0.nutThuocTinh?.dong[k] !== undefined ? String(c0.nutThuocTinh.dong[k]! + 1) : ""])) as Record<TruongNut, string>,
  }));
  const dat = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const dtMin = Number(f.dienTichToiThieu.replace(",", "."));
  const lech = Number(f.lechPhanTram.replace(",", "."));
  const loi: string[] = [];
  if (!dsLop(f.ranhThua).length) loi.push("Chưa có lớp ranh thửa.");
  if (!(dtMin >= 0)) loi.push("Diện tích tối thiểu không hợp lệ.");
  if (!(lech > 0 && lech < 100)) loi.push("Tỷ lệ lệch diện tích phải trong khoảng (0; 100) %.");
  const lopNut = dsLop(f.lopNut);
  const dongNut: Partial<Record<TruongNut, number>> = {};
  for (const [k, v] of Object.entries(f.dong)) {
    if (!v.trim()) continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) loi.push(`Dòng của “${TEN_TRUONG_NUT[k as TruongNut]}” phải là số nguyên ≥ 1.`);
    else dongNut[k as TruongNut] = n - 1;
  }
  if (new Set(Object.values(dongNut)).size !== Object.values(dongNut).length) loi.push("Hai trường của nút thuộc tính trùng dòng.");
  if (lopNut.length && !Object.keys(dongNut).length) loi.push("Đã chọn lớp nút thuộc tính nhưng chưa chọn dòng nào.");
  const ketQua = (): CauHinhLop => ({
    ranhThua: dsLop(f.ranhThua),
    nhanThua: dsLop(f.nhanThua),
    soThua: dsLop(f.soThua),
    soTo: dsLop(f.soTo),
    chuSuDung: dsLop(f.chuSuDung),
    ranhGpmb: dsLop(f.ranhGpmb),
    nhanHienTrang: dsLop(f.nhanHienTrang),
    dienTichToiThieu: dtMin,
    lechDienTichChoPhep: lech / 100,
    nutThuocTinh: lopNut.length ? { lop: lopNut, dong: dongNut } : null,
  });
  const truong = (k: "ranhThua" | "nhanThua" | "soThua" | "soTo" | "chuSuDung" | "ranhGpmb" | "nhanHienTrang", nhan: string, goiY: string) => (
    <O nhan={nhan} goiY={goiY}><input value={f[k]} onChange={(e) => dat(k, e.target.value)} disabled={!p.sua} /></O>
  );
  return (
    <HopThoai
      tieuDe="Cấu hình lớp bản đồ"
      rong={980}
      dong={p.dong}
      chan={
        <>
          {!p.dl.laGoiY && p.sua && <button className="nut" onClick={() => p.apDung(null)}>Bỏ chốt, dùng gợi ý</button>}
          <button className="nut" onClick={p.dong}>Đóng</button>
          {p.sua && <button className="nut nut-chinh" disabled={loi.length > 0} onClick={() => p.apDung(ketQua())}>Chốt cấu hình và dựng lại thửa</button>}
        </>
      }
    >
      <div className="luoi" style={{ gap: 16, alignItems: "start", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)" }}>
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div className="mo chu-nho">Nhiều lớp cách nhau bằng dấu phẩy. {p.dl.laGoiY ? "Các giá trị đang là gợi ý từ cấu trúc tệp — cán bộ đối chiếu bảng thống kê bên phải trước khi chốt." : "Cấu hình đã được chốt cho tệp này."}</div>
          <div className="luoi" style={{ gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {truong("ranhThua", "Ranh thửa", "đường khép thửa")}
            {truong("nhanThua", "Nhãn thửa", "loại đất, số thửa, DT")}
            {truong("ranhGpmb", "Ranh GPMB / thửa thu hồi", "vùng khép kín")}
            {truong("soThua", "Số thửa (riêng)", "")}
            {truong("soTo", "Số tờ (riêng)", "")}
            {truong("chuSuDung", "Chủ sử dụng (riêng)", "")}
            {truong("nhanHienTrang", "Nhãn hiện trạng GPMB", "chỉ đối chiếu")}
          </div>
          <div className="the" style={{ padding: 10 }}>
            <b className="chu-nho">Nút chữ thuộc tính thửa (gCadas)</b>
            <div className="mo chu-nho" style={{ margin: "2px 0 8px" }}>Nút chữ nhiều dòng đặt trong thửa; nút được gán cho thửa chứa dòng đầu. Để trống lớp nếu tệp không có.</div>
            <div className="luoi" style={{ gap: 8, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <O nhan="Lớp nút" style={{ gridColumn: "1 / -1" }}><input value={f.lopNut} onChange={(e) => dat("lopNut", e.target.value)} disabled={!p.sua} /></O>
              {(Object.keys(TEN_TRUONG_NUT) as TruongNut[]).map((k) => (
                <O key={k} nhan={`${TEN_TRUONG_NUT[k]}: dòng`}>
                  <input value={f.dong[k]} inputMode="numeric" onChange={(e) => setF({ ...f, dong: { ...f.dong, [k]: e.target.value } })} disabled={!p.sua || !lopNut.length} />
                </O>
              ))}
            </div>
          </div>
          <div className="luoi" style={{ gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <O nhan="Bỏ vùng nhỏ hơn (m²)" goiY="mảnh vụn do vẽ chồng nét"><input value={f.dienTichToiThieu} onChange={(e) => dat("dienTichToiThieu", e.target.value)} disabled={!p.sua} /></O>
            <O nhan="Cờ lệch DT ghi/hình học (%)"><input value={f.lechPhanTram} onChange={(e) => dat("lechPhanTram", e.target.value)} disabled={!p.sua} /></O>
          </div>
          {loi.length > 0 && <div className="thong-bao thong-bao-do chu-nho">{loi.join(" ")}</div>}
          {p.dl.ghiChuGoiY.length > 0 && <div className="mo chu-nho">Gợi ý: {p.dl.ghiChuGoiY.join(" ")}</div>}
        </div>
        <div className="bang-cuon" style={{ maxHeight: 440 }}>
          <table className="bang">
            <thead><tr><th className="so">Lớp</th><th>Theo PL 21 TT 26/2024</th><th className="so">Đường</th><th className="so">Vùng</th><th className="so">Chữ</th><th className="so">Nút</th><th>Chữ mẫu</th></tr></thead>
            <tbody>
              {tk.map((x) => (
                <tr key={x.lop}>
                  <td className="so"><b>{x.lop}</b></td>
                  <td className="chu-nho mo">{tenLopPl21(x.lop) ?? "(lớp trống — địa phương dùng)"}</td>
                  <td className="so">{x.soDuong || ""}</td>
                  <td className="so">{x.soVung || ""}</td>
                  <td className="so">{x.soChu || ""}</td>
                  <td className="so">{x.soNut || ""}</td>
                  <td className="chu-nho mo" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={x.mau.join(" · ")}>{x.mau.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </HopThoai>
  );
}

function TomTatThuHoi({ thuHoi }: { thuHoi: Map<string, DienTichThuHoi> }) {
  const ds = [...thuHoi.values()];
  const dem = (k: string) => ds.filter((x) => x.phamVi === k).length;
  const tong = ds.reduce((s, x) => s + x.dienTichThuHoi, 0);
  return (
    <div className="luoi luoi-3" style={{ marginTop: 6, textAlign: "center" }}>
      <div><div className="chu-nho mo">Toàn bộ</div><b>{dem("TOAN_BO")}</b></div>
      <div><div className="chu-nho mo">Một phần</div><b>{dem("MOT_PHAN")}</b></div>
      <div><div className="chu-nho mo">DT giao (m²)</div><b>{tong.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</b></div>
    </div>
  );
}

/**
 * Kiểm tra bản đồ: các điều kiện cần và đủ để dùng bản đồ theo dõi GPMB đến từng thửa và nhập nhanh thông tin
 * (khép thửa, nhãn thửa, tọa độ, phạm vi thu hồi, nhãn hiện trạng) — nêu việc cần làm khi thiếu.
 */
/**
 * Đối chiếu lớp đang dùng với Phụ lục 21 TT 26/2024/TT-BTNMT (điểm d khoản 1 Điều 16): ranh thửa phải là lớp 10/61;
 * lớp ranh thu hồi trùng lớp đã có nghĩa khác (vd. 30 đường mép nước, 40 biên giới quốc gia) → cán bộ xác nhận
 * đây là lớp địa phương tận dụng, không phải đối tượng theo PL 21.
 */
function phanLopPl21(dl: DuLieuBanDo): { ok: boolean | "canh"; ten: string; chiTiet: string } {
  const ch = dl.cauHinh;
  const ghi: string[] = [];
  const ranhLa = ch.ranhThua.filter((l) => !(LOP_RANH_THUA_PL21 as readonly number[]).includes(l));
  if (ranhLa.length) ghi.push(`ranh thửa đang lấy lớp ${ranhLa.join(", ")} (PL 21 quy định lớp 10 hiện trạng, 61 theo giấy tờ)`);
  const trung = ch.ranhGpmb.filter((l) => dl.kq.vungGpmb.length && tenLopPl21(l));
  if (trung.length) ghi.push(`lớp thu hồi ${trung.map((l) => `${l} (PL 21: ${tenLopPl21(l)})`).join(", ")} — xác nhận đây là lớp địa phương tận dụng`);
  return {
    ok: ghi.length ? "canh" : true,
    ten: "Phân lớp theo PL 21 TT 26/2024",
    chiTiet: ghi.length ? `Cần xem: ${ghi.join("; ")}.` : "Lớp ranh thửa và lớp thu hồi phù hợp bảng phân lớp.",
  };
}

function KiemTraBanDo({ dl, coPhamVi, soVung, moCauHinh, ttThua }: { dl: DuLieuBanDo; coPhamVi: boolean; soVung: number; moCauHinh: () => void; ttThua: Map<string, TrangThaiGpmb> }) {
  const [mo, setMo] = useState(true);
  const ds = dl.kq.thua;
  const n = ds.length;
  const pt = (k: number) => (n ? Math.round((k / n) * 100) : 0);
  const du = (f: (t: ThuaBanDo) => unknown) => ds.filter(f).length;
  const { pham } = dl;
  // VN-2000 múi 3°: hoành độ (Y, đông) ~ 500 km ± 200 km; tung độ (X, bắc) Sơn La ~ 2.300–2.450 km
  const toaDoHopLy = pham.minX > 200000 && pham.maxX < 800000 && pham.minY > 2200000 && pham.maxY < 2500000;
  const coHt = ds.filter((t) => loaiHienTrangBanDo(t.hienTrangBanDo));
  const lech = coHt.filter((t) => { const tt = ttThua.get(t.ma); return tt && (loaiHienTrangBanDo(t.hienTrangBanDo) === "DA") !== (tt === "HOAN_THANH"); });
  const muc: { ok: boolean | "canh"; ten: string; chiTiet: string; lam?: ReactNode }[] = [
    { ok: n > 0, ten: "Khép thửa", chiTiet: n ? `${n} thửa từ lớp ranh thửa ${dl.cauHinh.ranhThua.join(", ")}` : `Không khép được thửa nào từ lớp ${dl.cauHinh.ranhThua.join(", ")}`, lam: n ? undefined : <button className="nut nut-chu nut-nho" onClick={moCauHinh}>Chọn lớp ranh thửa</button> },
    { ok: toaDoHopLy ? true : "canh", ten: "Tọa độ VN-2000", chiTiet: toaDoHopLy ? "Tọa độ nằm trong vùng tỉnh Sơn La" : "Tọa độ ngoài khoảng thường gặp của Sơn La — kiểm tra hệ tọa độ, đơn vị (m)" },
    { ok: pt(du((t) => t.soThua && t.soTo)) >= 90 ? true : "canh", ten: "Số tờ, số thửa", chiTiet: `${du((t) => t.soThua && t.soTo)}/${n} thửa (${pt(du((t) => t.soThua && t.soTo))}%)`, lam: pt(du((t) => t.soThua && t.soTo)) < 90 ? <button className="nut nut-chu nut-nho" onClick={moCauHinh}>Cấu hình lớp nhãn</button> : undefined },
    { ok: pt(du((t) => t.loaiDatBanDo)) >= 90 ? true : "canh", ten: "Loại đất", chiTiet: `${du((t) => t.loaiDatBanDo)}/${n} thửa` },
    { ok: pt(du((t) => t.dienTichGhi !== null)) >= 80 ? true : "canh", ten: "Diện tích ghi", chiTiet: `${du((t) => t.dienTichGhi !== null)}/${n} thửa; ${du((t) => t.co.includes("LECH_DIEN_TICH"))} thửa lệch > ${Math.round(dl.cauHinh.lechDienTichChoPhep * 100)}%` },
    { ok: pt(du((t) => t.chuSuDung)) >= 80 ? true : "canh", ten: "Chủ sử dụng", chiTiet: `${du((t) => t.chuSuDung)}/${n} thửa; ${du((t) => t.co.includes("NHIEU_CHU"))} thửa tên khác nhau giữa hai nguồn` },
    { ok: coPhamVi ? true : soVung ? "canh" : false, ten: "Phạm vi thu hồi", chiTiet: coPhamVi ? "Đã chọn vùng / thửa thu hồi" : soVung ? `Có ${soVung} vùng trên lớp ${dl.cauHinh.ranhGpmb.join(", ")} — chưa chọn` : `Lớp ${dl.cauHinh.ranhGpmb.join(", ")} không có vùng khép kín — chọn lớp khác hoặc chọn thửa trực tiếp`, lam: !soVung ? <button className="nut nut-chu nut-nho" onClick={moCauHinh}>Chọn lớp ranh</button> : undefined },
    phanLopPl21(dl),
    ...(dl.cauHinh.nhanHienTrang?.length ? [{ ok: (lech.length ? "canh" : true) as boolean | "canh", ten: "Nhãn hiện trạng trên bản đồ", chiTiet: `${coHt.length} thửa (lớp ${dl.cauHinh.nhanHienTrang.join(", ")}); ${lech.length} thửa khác tiến độ trong phần mềm — chỉ đối chiếu, không ghi đè` }] : []),
  ];
  const soLoi = muc.filter((m) => m.ok === false).length;
  const soCanh = muc.filter((m) => m.ok === "canh").length;
  return (
    <div className="the co-dinh">
      <div className="the-dau">
        <h3>Kiểm tra bản đồ</h3>
        <span className={`nhan ${soLoi ? "nhan-do" : soCanh ? "nhan-vang" : "nhan-xanh"}`}>{soLoi ? `${soLoi} việc cần làm` : soCanh ? `${soCanh} điểm cần xem` : "Đủ điều kiện"}</span>
        <div className="phai"><button className="nut nut-chu nut-nho" onClick={() => setMo(!mo)}>{mo ? "Thu gọn" : "Xem"}</button></div>
      </div>
      {mo && (
        <div className="the-than">
          <ul className="kt-bd">
            {muc.map((m) => (
              <li key={m.ten} className={m.ok === true ? "ok" : m.ok === "canh" ? "canh" : "loi"}>
                <span className="dau">{m.ok === true ? "✓" : "!"}</span>
                <div><b>{m.ten}</b><small>{m.chiTiet}</small>{m.lam && <div>{m.lam}</div>}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChiTietThua({ t, th, ho, tt, moHo }: { t: ThuaBanDo; th?: DienTichThuHoi; ho?: Ho; tt?: TrangThaiGpmb; moHo: (h: Ho) => void }) {
  return (
    <div className="the">
      <div className="the-dau"><h3>Tờ {t.soTo ?? "?"}, thửa {t.soThua ?? "?"}</h3></div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
        <div>Chủ sử dụng: <b>{t.chuSuDung ?? "—"}</b> · Loại (bản đồ): <b>{t.loaiDatBanDo ?? "—"}</b></div>
        <div>DT ghi: <b>{t.dienTichGhi ?? "—"}</b> m² · DT hình học: <b>{t.dienTichHinhHoc.toFixed(2)}</b> m²{th && th.phamVi !== "NGOAI" ? <> · Thu hồi: <b>{th.dienTichThuHoi.toFixed(2)}</b> m² ({th.phamVi === "TOAN_BO" ? "toàn bộ" : "một phần"})</> : null}</div>
        {t.co.length > 0 && <div className="nhom-nut">{t.co.map((c) => <span key={c} className="nhan nhan-vang">{TEN_CO[c]}</span>)}</div>}
        {t.hienTrangBanDo && (
          <div>
            Bản đồ ghi: <b>{t.hienTrangBanDo}</b>
            {tt && ((loaiHienTrangBanDo(t.hienTrangBanDo) === "DA") !== (tt === "HOAN_THANH")) && <span className="nhan nhan-vang" style={{ marginLeft: 6 }}>Khác tiến độ trong phần mềm ({TT_GPMB[tt].ten}) — kiểm tra</span>}
          </div>
        )}
        <div className="mo">Nhãn trong thửa: {t.nhan.map((n) => `[${n.lop}] ${n.chu}`).join(" · ")}</div>
        {ho && <div>Đã gắn hồ sơ: <button className="nut nut-chu nut-nho" onClick={() => moHo(ho)}>{ho.ma} · {ho.ten}</button></div>}
      </div>
    </div>
  );
}

/* ------------------------- Vẽ bản đồ ------------------------- */

function KhungVe(p: {
  dl: DuLieuBanDo;
  vungChon: string[];
  /** Chế độ chọn thửa: bấm thửa để thêm / bỏ khỏi phạm vi thu hồi */
  bamThua?: (t: ThuaBanDo) => void;
  thuaChon: Set<string>;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  chon: ThuaBanDo | null;
  setChon: (t: ThuaBanDo | null) => void;
  daLienKet: Map<string, Ho>;
  ttThua: Map<string, TrangThaiGpmb>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [cheDo, setCheDo] = useState<"HIEN_TRANG" | "PHAM_VI">("HIEN_TRANG");
  const [lop, setLop] = useState({ nen: true, thua: true, to: true, ranh: true, nhan: true, diaDanh: true });
  const [nhin, setNhin] = useState<{ cx: number; cy: number; tyLe: number } | null>(null);
  const [toaDo, setToaDo] = useState<string>("");
  const keo = useRef<{ x: number; y: number; cx: number; cy: number; di: boolean } | null>(null);
  const { pham } = p.dl;

  const nen = useMemo(() => {
    // Nét nền: mọi phần tử hình trong phạm vi bản đồ (bỏ phần tử ở tọa độ cục bộ)
    const w = pham.maxX - pham.minX, h = pham.maxY - pham.minY;
    const tr = { minX: pham.minX - w, maxX: pham.maxX + w, minY: pham.minY - h, maxY: pham.maxY + h };
    const out: { lop: number; diem: { x: number; y: number }[] }[] = [];
    for (const e of p.dl.ban.phanTu) {
      if (!("diem" in e) || e.diem.length < 2) continue;
      const d0 = e.diem[0]!;
      if (d0.x < tr.minX || d0.x > tr.maxX || d0.y < tr.minY || d0.y > tr.maxY) continue;
      out.push({ lop: e.lop, diem: e.diem });
    }
    return out;
  }, [p.dl, pham]);

  const diaDanh = useMemo(
    () =>
      p.dl.ban.phanTu
        .filter((e): e is PhanTuChu => e.loai === "CHU" && [15, 48, 63].includes(e.lop) && e.goc.x > pham.minX - 200 && e.goc.x < pham.maxX + 200 && e.goc.y > pham.minY - 200 && e.goc.y < pham.maxY + 200)
        .map((e) => ({ chu: giaiMaNhan(e), x: e.goc.x, y: e.goc.y })),
    [p.dl, pham],
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ve = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      const v = nhin ?? { cx: (pham.minX + pham.maxX) / 2, cy: (pham.minY + pham.maxY) / 2, tyLe: Math.min(W / (pham.maxX - pham.minX), H / (pham.maxY - pham.minY)) * 0.92 };
      if (!nhin) setNhin(v);
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#fbfcfb";
      ctx.fillRect(0, 0, W, H);
      const sx = (x: number) => (x - v.cx) * v.tyLe + W / 2;
      const sy = (y: number) => H / 2 - (y - v.cy) * v.tyLe;
      const duong = (ds: { x: number; y: number }[]) => {
        ctx.moveTo(sx(ds[0]!.x), sy(ds[0]!.y));
        for (let i = 1; i < ds.length; i++) ctx.lineTo(sx(ds[i]!.x), sy(ds[i]!.y));
      };
      // nền
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "#c9d2ce";
      ctx.beginPath();
      if (lop.nen) for (const e of nen) if (e.lop !== 10) duong(e.diem);
      ctx.stroke();
      // thửa
      for (const t of p.dl.kq.thua) {
        if (!lop.thua) break;
        const th = p.thuHoi.get(p.khoaThua(t));
        const trongRanh = th && th.phamVi !== "NGOAI";
        let to: string | null = null;
        if (lop.to && cheDo === "HIEN_TRANG") {
          const tt = p.ttThua.get(t.ma);
          if (tt) to = TT_GPMB[tt].nen;
          else if (trongRanh) to = "rgba(170,181,176,0.22)";
        } else if (lop.to) {
          if (th?.phamVi === "TOAN_BO") to = "rgba(192,57,43,0.20)";
          else if (th?.phamVi === "MOT_PHAN") to = "rgba(230,140,20,0.26)";
        }
        ctx.beginPath();
        for (const vg of t.vong) {
          duong(vg);
          ctx.closePath();
        }
        if (to) {
          ctx.fillStyle = to;
          ctx.fill("evenodd");
        }
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = "#6f7d77";
        ctx.stroke();
      }
      // ranh GPMB
      for (const vg of lop.ranh ? p.dl.kq.vungGpmb : []) {
        const laChon = p.vungChon.includes(vg.ma);
        ctx.beginPath();
        duong(vg.vong[0]!);
        ctx.closePath();
        ctx.setLineDash(laChon ? [] : [6, 4]);
        ctx.lineWidth = laChon ? 2.4 : 1.2;
        ctx.strokeStyle = laChon ? "#c0392b" : "#6a3fb5";
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // thửa chọn tay là thửa thu hồi: viền đỏ đứt
      if (p.thuaChon.size) {
        ctx.setLineDash([5, 3]);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = "#c0392b";
        for (const t of p.dl.kq.thua) {
          if (!p.thuaChon.has(t.ma)) continue;
          ctx.beginPath();
          for (const vg of t.vong) { duong(vg); ctx.closePath(); }
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
      // thửa chọn
      if (p.chon) {
        ctx.beginPath();
        for (const vg of p.chon.vong) {
          duong(vg);
          ctx.closePath();
        }
        ctx.lineWidth = 2.6;
        ctx.strokeStyle = "#1f5fa8";
        ctx.stroke();
      }
      // nhãn
      if (lop.nhan && v.tyLe > 1.2) {
        ctx.font = `${Math.min(13, 7 + v.tyLe * 1.2)}px Segoe UI, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#23302b";
        for (const t of p.dl.kq.thua) {
          const x = sx(t.tamNhan.x), y = sy(t.tamNhan.y);
          if (x < -50 || y < -20 || x > W + 50 || y > H + 20) continue;
          ctx.fillText(`${t.soThua ?? "?"}${t.loaiDatBanDo ? " " + t.loaiDatBanDo : ""}`, x, y);
          if (v.tyLe > 3 && t.dienTichGhi) {
            ctx.fillStyle = "#5d6b66";
            ctx.fillText(String(t.dienTichGhi), x, y + 12);
            ctx.fillStyle = "#23302b";
          }
        }
      }
      // địa danh (tên đường, cánh đồng…)
      ctx.font = "italic 11px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#5a6f9a";
      if (lop.diaDanh) for (const c of diaDanh) ctx.fillText(c.chu, sx(c.x), sy(c.y));
      // thước tỷ lệ
      const m = [5, 10, 20, 50, 100, 200, 500].find((m) => m * v.tyLe > 70) ?? 1000;
      ctx.fillStyle = "#23302b";
      ctx.fillRect(12, 14, m * v.tyLe, 3);
      ctx.font = "11px Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${m} m`, 12, 30);
    };
    ve();
    const ro = new ResizeObserver(ve);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [nhin, nen, diaDanh, p.dl, p.thuHoi, p.vungChon.join("|"), p.thuaChon, p.chon, p.ttThua, p.khoaThua, pham, lop, cheDo]); // eslint-disable-line react-hooks/exhaustive-deps

  const doiToaDo = (e: React.MouseEvent) => {
    const cv = ref.current!;
    const r = cv.getBoundingClientRect();
    const v = nhin!;
    return { x: (e.clientX - r.left - r.width / 2) / v.tyLe + v.cx, y: (r.height / 2 - (e.clientY - r.top)) / v.tyLe + v.cy };
  };

  return (
    <div className="ban-do">
      <canvas
        ref={ref}
        onWheel={(e) => {
          if (!nhin) return;
          const d = doiToaDo(e);
          const k = e.deltaY < 0 ? 1.25 : 0.8;
          const tyLe = Math.max(0.05, Math.min(60, nhin.tyLe * k));
          setNhin({ tyLe, cx: d.x - (d.x - nhin.cx) * (nhin.tyLe / tyLe), cy: d.y - (d.y - nhin.cy) * (nhin.tyLe / tyLe) });
        }}
        onMouseDown={(e) => nhin && (keo.current = { x: e.clientX, y: e.clientY, cx: nhin.cx, cy: nhin.cy, di: false })}
        onMouseMove={(e) => {
          if (nhin) {
            const d = doiToaDo(e);
            setToaDo(`X ${d.y.toFixed(2)} · Y ${d.x.toFixed(2)}`);
          }
          const k = keo.current;
          if (!k || !nhin) return;
          const dx = e.clientX - k.x, dy = e.clientY - k.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) k.di = true;
          if (k.di) setNhin({ ...nhin, cx: k.cx - dx / nhin.tyLe, cy: k.cy + dy / nhin.tyLe });
        }}
        onMouseUp={(e) => {
          const k = keo.current;
          keo.current = null;
          if (k?.di || !nhin) return;
          const d = doiToaDo(e);
          const t = p.dl.kq.thua.find((t) => diemTrongThua(d, t.vong));
          if (t && p.bamThua) p.bamThua(t);
          p.setChon(t ?? null);
        }}
        onMouseLeave={() => (keo.current = null)}
      />
      <div className="cong-cu-ban-do">
        <button className="nut" title="Phóng to" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe * 1.4 })}>＋</button>
        <button className="nut" title="Thu nhỏ" onClick={() => nhin && setNhin({ ...nhin, tyLe: nhin.tyLe / 1.4 })}>－</button>
        <button className="nut" title="Toàn bộ" onClick={() => setNhin(null)}>⤢</button>
      </div>
      <div className="lop-ban-do">
        <b>Lớp bản đồ</b>
        {([
          ["ranh", "Ranh GPMB"],
          ["thua", "Thửa đất"],
          ["to", "Tô màu"],
          ["nhan", "Nhãn thửa"],
          ["nen", "Nền địa hình, hạ tầng"],
          ["diaDanh", "Địa danh"],
        ] as const).map(([k, ten]) => (
          <label key={k}><input type="checkbox" checked={lop[k]} onChange={(e) => setLop({ ...lop, [k]: e.target.checked })} /> {ten}</label>
        ))}
        <label className="mo" title="Cần kết nối Internet tới máy chủ bản đồ ngoài — tắt theo yêu cầu không gửi dữ liệu ra ngoài"><input type="checkbox" disabled /> Ảnh vệ tinh (trực tuyến – tắt)</label>
        <Chon value={cheDo} onChange={(e) => setCheDo(e.target.value as typeof cheDo)} style={{ marginTop: 4 }}>
          <option value="HIEN_TRANG">Tô theo hiện trạng GPMB</option>
          <option value="PHAM_VI">Tô theo phạm vi thu hồi</option>
        </Chon>
      </div>
      <svg className="mui-ten-bac" width={40} height={52} viewBox="0 0 40 52" aria-label="Hướng Bắc">
        <circle cx={20} cy={30} r={17} fill="rgba(255,255,255,0.92)" stroke="#c4ccc8" />
        <path d="M20 14l7 22-7-5-7 5z" fill="#23302b" />
        <text x={20} y={10} textAnchor="middle" fontSize={11} fontWeight={700} fill="#23302b">B</text>
      </svg>
      <div className="chu-giai">
        {cheDo === "HIEN_TRANG" ? (
          <>
            {THU_TU_TRANG_THAI.map((t) => <span key={t}><i style={{ background: TT_GPMB[t].nen }} />{TT_GPMB[t].bieuTuong} {TT_GPMB[t].ten}</span>)}
            <span><i style={{ background: "rgba(170,181,176,0.22)" }} />Trong ranh, chưa lập hồ sơ</span>
          </>
        ) : (
          <>
            <span><i style={{ background: "rgba(192,57,43,0.35)" }} />Thu hồi toàn bộ</span>
            <span><i style={{ background: "rgba(230,140,20,0.4)" }} />Thu hồi một phần</span>
          </>
        )}
        <span><i style={{ background: "#fff", borderColor: "#c0392b", borderWidth: 2 }} />Ranh GPMB đã chọn</span>
        {p.thuaChon.size > 0 && <span><i style={{ background: "#fff", borderColor: "#c0392b", borderStyle: "dashed" }} />Thửa chọn tay</span>}
        <span><i style={{ background: "#fff", borderColor: "#6a3fb5", borderStyle: "dashed" }} />Ranh ứng viên</span>
      </div>
      <div className="toa-do">{toaDo || "VN-2000"}</div>
    </div>
  );
}

/* ------------------------- Tạo hồ sơ từ bản đồ ------------------------- */

function HopTaoHo(p: {
  duAn: DuAn;
  dl: DuLieuBanDo;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  daLienKet: Map<string, Ho>;
  soHo: number;
  dong: () => void;
}) {
  const { kho, luuDuAn, di, quyen, bao, nguoiDung } = useUngDung();
  const nhom = useMemo(() => {
    const m = new Map<string, { ten: string; thua: { t: ThuaBanDo; th: DienTichThuHoi }[] }>();
    for (const t of p.dl.kq.thua) {
      const th = p.thuHoi.get(p.khoaThua(t));
      if (!th || th.phamVi === "NGOAI" || p.daLienKet.has(t.ma)) continue;
      const ten = t.chuSuDung ?? `Chưa rõ chủ – tờ ${t.soTo ?? "?"} thửa ${t.soThua ?? "?"}`;
      // Thửa chưa rõ chủ: mỗi thửa một hồ sơ riêng; cùng tên có thể là người khác nhau → cán bộ kiểm tra
      const k = t.chuSuDung ? ten.toLowerCase() : `?${p.khoaThua(t)}`;
      if (!m.has(k)) m.set(k, { ten, thua: [] });
      m.get(k)!.thua.push({ t, th });
    }
    return [...m.values()].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  }, [p]);
  const [dangTao, setDangTao] = useState(false);
  const [daXacNhan, setDaXacNhan] = useState(false);
  // Thửa có nghi vấn: cán bộ phải xác nhận đã kiểm tra trước khi tạo hồ sơ
  const nghiVan = (t: ThuaBanDo): string[] => {
    const ds: string[] = t.co.map((c) => TEN_CO[c] ?? c);
    if (!t.chuSuDung) ds.push("chưa rõ chủ sử dụng");
    if (!t.soTo || !t.soThua) ds.push("thiếu số tờ/số thửa");
    return ds;
  };
  const soNghiVan = nhom.reduce((s, g) => s + g.thua.filter(({ t }) => nghiVan(t).length > 0).length, 0);

  const tao = async () => {
    if (!quyen("SUA_HO_SO")) return bao("Tài khoản không có quyền tạo hồ sơ", "loi");
    if (soNghiVan > 0 && !daXacNhan) return bao("Cần xác nhận đã kiểm tra các thửa có nghi vấn", "loi");
    setDangTao(true);
    let i = p.soHo;
    for (const g of nhom) {
      i++;
      const h = hoMoi(p.duAn.id, `H${String(i).padStart(3, "0")}`, g.ten, /ubnd|cộng đồng|tập thể|công ty|hợp tác/i.test(g.ten) ? "TO_CHUC" : "HO_GIA_DINH");
      h.thua = g.thua.map(({ t, th }) => ({
        id: taoId(),
        soTo: t.soTo ?? "",
        soThua: t.soThua ?? "",
        loaiDat: t.loaiDatBanDo ?? "",
        dienTich: (t.dienTichGhi ?? t.dienTichHinhHoc).toFixed(2).replace(/\.?0+$/, ""),
        dienTichThuHoi: th.phamVi === "TOAN_BO" && t.dienTichGhi ? String(t.dienTichGhi) : th.dienTichThuHoi.toFixed(2),
        nguonGoc: "",
        gia: null,
        maBanDo: t.ma,
        dienTichBanDo: th.dienTichThuHoi,
        ghiChu: nghiVan(t).length ? `Nghi vấn khi đọc bản đồ (đã được cán bộ xác nhận kiểm tra): ${nghiVan(t).join(", ")}` : undefined,
      }));
      h.nhatKy = [{ luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Tạo từ bản đồ ${p.duAn.banDo?.tenTep ?? ""}: ${h.thua.length} thửa` }];
      await kho.luuHo(h);
    }
    await luuDuAn(p.duAn);
    setDangTao(false);
    p.dong();
    di({ ten: "du-an", duAnId: p.duAn.id, tab: "ho" });
  };

  const soThua = nhom.reduce((s, g) => s + g.thua.length, 0);
  return (
    <HopThoai
      tieuDe="Tạo hồ sơ từ các thửa thu hồi"
      dong={p.dong}
      chan={
        <>
          <button className="nut" onClick={p.dong}>Hủy</button>
          <button className="nut nut-chinh" disabled={dangTao || nhom.length === 0 || (soNghiVan > 0 && !daXacNhan)} onClick={tao}>{dangTao ? "Đang tạo…" : `Tạo ${nhom.length} hồ sơ (${soThua} thửa)`}</button>
        </>
      }
    >
      <div className="thong-bao thong-bao-xanh">
        Nhóm thửa theo tên chủ sử dụng đọc từ bản đồ (trùng tên có thể là người khác nhau — kiểm tra trước khi tạo). Loại đất giữ nguyên ký hiệu trên bản đồ (vd. "1L", "2L") — cán bộ đổi sang mã loại đất hiện hành và chọn giá đất trong hồ sơ.
        DT thu hồi: thửa nằm trọn trong ranh lấy DT ghi trên bản đồ; thửa một phần lấy DT phần giao (làm tròn 2 số lẻ). Cần đối chiếu với hồ sơ trích đo được duyệt.
      </div>
      <table className="bang">
        <thead><tr><th>Chủ sử dụng (bản đồ)</th><th className="so">Số thửa</th><th>Thửa</th><th className="so">DT thu hồi (m²)</th></tr></thead>
        <tbody>
          {nhom.map((g) => (
            <tr key={g.ten}>
              <td>{g.ten}</td>
              <td className="so">{g.thua.length}</td>
              <td className="chu-nho">
                {g.thua.map(({ t }, i) => {
                  const nv = nghiVan(t);
                  const nhan = `${t.soTo ?? "?"}-${t.soThua ?? "?"}`;
                  return (
                    <span key={t.ma}>
                      {i > 0 && ", "}
                      {nv.length ? <b className="chu-do" title={nv.join("; ")}>⚠ {nhan}</b> : nhan}
                    </span>
                  );
                })}
              </td>
              <td className="so">{g.thua.reduce((s, x) => s + x.th.dienTichThuHoi, 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {nhom.length === 0 && <tr><td colSpan={4} className="trong">Mọi thửa thu hồi đã có hồ sơ.</td></tr>}
        </tbody>
      </table>
      {soNghiVan > 0 && (
        <label className="thong-bao thong-bao-vang" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10 }}>
          <input type="checkbox" checked={daXacNhan} onChange={(e) => setDaXacNhan(e.target.checked)} />
          <span>
            Có <b>{soNghiVan}</b> thửa nghi vấn (đánh dấu ⚠, rê chuột để xem lý do). Tôi đã kiểm tra các thửa này với hồ sơ địa chính/trích đo và đồng ý tạo hồ sơ; nội dung nghi vấn được ghi vào ghi chú của thửa.
          </span>
        </label>
      )}
    </HopThoai>
  );
}

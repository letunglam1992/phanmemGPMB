import { useEffect, useMemo, useRef, useState } from "react";
import { CAU_HINH_MAC_DINH, loaiHienTrangBanDo, goiYCauHinh, tinhDienTichThuHoi, type CauHinhLop, type DienTichThuHoi, type ThuaBanDo } from "@gpmb/gis";
import { useUngDung } from "../ung-dung";
import { type DuAn, type Ho } from "../mo-hinh";
import { HopThoai } from "../thanh-phan/chung";
import { tinhHo } from "../tinh-ho";
import { THU_TU_TRANG_THAI, homNayIso, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { PhanBoTrangThai } from "../thanh-phan/BieuDo";
import { Chon } from "../thanh-phan/Chon";
import { type DuLieuBanDo, boNho, layDem, TEN_CO, phanTich, dungLai } from "./ban-do/du-lieu";
import { HopCauHinhLop } from "./ban-do/CauHinhLop";
import { TomTatThuHoi, KiemTraBanDo, ChiTietThua } from "./ban-do/KiemTra";
import { KhungVe } from "./ban-do/KhungVe";
import { HopTaoHo } from "./ban-do/TaoHo";
/** Nạp bản đồ đã lưu của dự án (dùng lại bộ nhớ đệm) — cho bản đồ nhỏ ở màn Dự án. */
export async function napBanDoDuAn(kho: { docBanDo(id: string): Promise<Uint8Array | null> }, duAn: DuAn): Promise<DuLieuBanDo | null> {
  if (!duAn.banDo) return null;
  const co = layDem(duAn);
  if (co) return co;
  const b = await kho.docBanDo(duAn.id);
  if (!b) return null;
  const d = phanTich(b, duAn.banDo.cauHinh);
  boNho.set(duAn.id, { ngayNhap: duAn.banDo.ngayNhap, d });
  return d;
}
export type { DuLieuBanDo };

export function BanDo({ duAnId }: { duAnId: string }) {
  const { dsDuAn, kho, luuDuAn, hoCua, di, chinhSach, quyen, bao } = useUngDung();
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  // Bản đồ đang hiển thị luôn lấy theo lần nạp hiện tại của dự án (không giữ bản của tệp trước / dự án trước)
  const [, setPhien] = useState(0);
  const veLai = () => setPhien((x) => x + 1);
  const dl = duAn ? layDem(duAn) : null;
  const [loi, setLoi] = useState<string | null>(null);
  const [dangDoc, setDangDoc] = useState(false);
  const [chon, setChon] = useState<ThuaBanDo | null>(null);
  const [loc, setLoc] = useState<"TRONG_RANH" | "TAT_CA" | "CO_CO">("TRONG_RANH");
  const [taoHo, setTaoHo] = useState(false);
  const [moCauHinh, setMoCauHinh] = useState(false);
  const [cheDoChonThua, setCheDoChonThua] = useState(false);
  const inputTep = useRef<HTMLInputElement>(null);
  const khoaNap = duAn?.banDo ? `${duAnId}|${duAn.banDo.ngayNhap}` : "";

  // Đổi dự án hoặc đổi bản đồ: bỏ thửa đang chọn, chế độ chọn thửa, lỗi của lần nạp trước
  useEffect(() => {
    setChon(null);
    setCheDoChonThua(false);
    setLoi(null);
  }, [khoaNap]);

  useEffect(() => {
    if (dl || !duAn?.banDo || dangDoc) return;
    const banDo = duAn.banDo;
    let huy = false;
    kho
      .docBanDo(duAnId)
      .then((b) => {
        if (huy) return;
        if (!b) return setLoi("Không tìm thấy tệp bản đồ đã nạp của dự án. Hãy xóa bản đồ và nạp lại tệp DGN.");
        const d = phanTich(b, banDo.cauHinh);
        boNho.set(duAnId, { ngayNhap: banDo.ngayNhap, d });
        veLai();
      })
      .catch((e) => !huy && setLoi((e as Error).message));
    return () => {
      huy = true;
    };
  }, [duAnId, duAn?.banDo, dl, dangDoc, kho]);

  // Phạm vi thu hồi = hợp các vùng ranh / vùng thửa thu hồi đã chọn ∪ các thửa chọn trực tiếp
  const maVungChon = duAn?.banDo?.vungChonDs ?? (duAn?.banDo?.vungChon ? [duAn.banDo.vungChon] : []);
  const vungDs = dl ? dl.kq.vungGpmb.filter((v) => maVungChon.includes(v.ma)) : [];
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
    setChon(null);
    setCheDoChonThua(false);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const d = phanTich(bytes);
      const ngayNhap = new Date().toISOString();
      await kho.luuBanDo(duAnId, bytes);
      boNho.set(duAnId, { ngayNhap, d });
      // Bản đồ mới: bỏ phạm vi thu hồi, thửa chọn và cấu hình lớp đã chốt của tệp cũ
      await luuDuAn({ ...duAn, banDo: { tenTep: f.name, ngayNhap, vungChon: null, vungChonDs: [], thuaChon: [] } });
      bao(`Đã nạp bản đồ ${f.name}: ${d.kq.thua.length} thửa`);
    } catch (e) {
      setLoi((e as Error).message);
    } finally {
      setDangDoc(false);
      if (inputTep.current) inputTep.current.value = ""; // chọn lại cùng tệp vẫn nạp được
    }
  };

  const xoaBanDo = async () => {
    if (!duAn.banDo) return;
    if (!quyen("SUA_HO_SO")) return bao("Tài khoản không có quyền xóa bản đồ", "loi");
    const soLienKet = daLienKet.size;
    if (
      !confirm(
        `Xóa bản đồ "${duAn.banDo.tenTep}" khỏi dự án?\n\n` +
          "Sẽ xóa: tệp DGN đã nạp, cấu hình lớp đã chốt, phạm vi thu hồi và các thửa đã chọn trên bản đồ.\n" +
          `Giữ nguyên: toàn bộ hồ sơ hộ và số liệu thửa đã tạo${soLienKet ? ` (${soLienKet} thửa đang liên kết bản đồ sẽ liên kết lại khi nạp bản đồ có cùng số tờ, số thửa)` : ""}.`,
      )
    )
      return;
    setDangDoc(true);
    try {
      await kho.xoaBanDo(duAnId);
      boNho.delete(duAnId);
      setChon(null);
      setCheDoChonThua(false);
      setLoi(null);
      await luuDuAn({ ...duAn, banDo: null });
      bao("Đã xóa bản đồ. Có thể nạp tệp DGN mới.");
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
    boNho.set(duAnId, { ngayNhap: duAn.banDo.ngayNhap, d });
    veLai();
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
          <label className="nut" aria-disabled={dangDoc}>
            {dangDoc ? "Đang đọc…" : duAn.banDo ? "Nạp tệp khác" : "Nạp tệp DGN"}
            <input ref={inputTep} type="file" accept=".dgn,.DGN" disabled={dangDoc} className="an" onChange={(e) => e.target.files?.[0] && void napTep(e.target.files[0])} />
          </label>
          {duAn.banDo && (
            <button className="nut nut-nguy" disabled={dangDoc || !quyen("SUA_HO_SO")} onClick={() => void xoaBanDo()} title="Xóa tệp bản đồ đã nạp để nạp bản đồ mới; hồ sơ hộ giữ nguyên">
              Xóa bản đồ
            </button>
          )}
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
      {!dl && !loi && duAn.banDo && <div className="the the-than trong" style={{ textAlign: "center", padding: 40 }}>Đang đọc bản đồ {duAn.banDo.tenTep}…</div>}
      {!dl && !loi && !duAn.banDo && (
        <div className="the the-than" style={{ textAlign: "center", padding: 50 }}>
          <h2>Nạp bản đồ DGN (MicroStation V7, V8/V8i)</h2>
          <p className="mo">Phần mềm khép thửa từ đường ranh, đọc nhãn số tờ, số thửa, loại đất, diện tích, chủ sử dụng (phông TCVN3 hoặc Unicode). Kết quả là dữ liệu đề xuất để cán bộ kiểm tra.</p>
          <p className="mo chu-nho">Lớp mặc định: ranh thửa 10 · nhãn thửa 13 · số thửa 4 · số tờ 5 · chủ sử dụng 6 · ranh GPMB 30. Bản đồ lập bằng gCadas: phần mềm tự nhận nút thuộc tính thửa; cán bộ xem và chốt ở “Cấu hình lớp”.</p>
        </div>
      )}
      {dl && (
        <div className="ban-do-khung">
          <KhungVe key={khoaNap} dl={dl} vungChon={maVungChon} thuHoi={thuHoi} khoaThua={khoaThua} chon={chon} setChon={setChon} daLienKet={daLienKet} ttThua={ttThua} bamThua={cheDoChonThua && quyen("SUA_HO_SO") ? batTatThua : undefined} thuaChon={thuaChon} />
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
                    <label key={v.ma} className="nhom-nut giua-doc">
                      <input type="checkbox" disabled={!quyen("SUA_HO_SO")} checked={maVungChon.includes(v.ma)} onChange={(e) => void luuBanDoDa({ vungChonDs: e.target.checked ? [...maVungChon, v.ma] : maVungChon.filter((m) => m !== v.ma), vungChon: null })} />
                      <span>
                        <b>{v.dienTich.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m²</b>{" "}
                        <span className="mo chu-nho">· chu vi {v.chuVi.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} m · {v.nguon === "VUNG_KHEP_KIN" ? "vùng khép kín" : "khép từ đường"}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {dl.kq.vungGpmb.length === 0 && <div className="thong-bao thong-bao-vang mb-0">Không có vùng khép kín trên lớp {dl.cauHinh.ranhGpmb.join(", ")}. Chọn lớp khác ở <button className="nut nut-chu nut-nho" onClick={() => setMoCauHinh(true)}>Cấu hình lớp</button> hoặc dùng cách 2.</div>}
                <div className="mo chu-nho mt-4">Cách 2 — chọn thửa trực tiếp (thu hồi toàn bộ thửa; thửa thu hồi một phần sửa diện tích trong hồ sơ):</div>
                <div className="nhom-nut">
                  <button className={`nut nut-nho ${cheDoChonThua ? "nut-chinh" : ""}`} disabled={!quyen("SUA_HO_SO")} onClick={() => setCheDoChonThua(!cheDoChonThua)}>{cheDoChonThua ? "Đang chọn thửa — bấm để xong" : "Chọn thửa trên bản đồ"}</button>
                  {dl.kq.thua.some((t) => loaiHienTrangBanDo(t.hienTrangBanDo) === "CHUA") && <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => doiThuaChon([...new Set([...thuaChon, ...dl.kq.thua.filter((t) => loaiHienTrangBanDo(t.hienTrangBanDo) === "CHUA").map((t) => t.ma)])])}>+ Thửa ghi "Chưa GPMB/NQH"</button>}
                  {dl.kq.thua.some((t) => loaiHienTrangBanDo(t.hienTrangBanDo)) && <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => doiThuaChon([...new Set([...thuaChon, ...dl.kq.thua.filter((t) => loaiHienTrangBanDo(t.hienTrangBanDo)).map((t) => t.ma)])])}>+ Mọi thửa có nhãn hiện trạng</button>}
                  {thuaChon.size > 0 && <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => doiThuaChon([])}>Bỏ {thuaChon.size} thửa chọn tay</button>}
                </div>
                {cheDoChonThua && <div className="thong-bao thong-bao-xanh chu-nho mb-0">Bấm vào thửa trên bản đồ (hoặc ô ở bảng thửa) để thêm / bỏ khỏi phạm vi thu hồi.</div>}
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
            <div className="the gian">
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
                        <tr key={khoaThua(t)} data-phim-chon className={`co-the-chon ${chon === t ? "dang-chon" : ""}`} onClick={() => setChon(t)}>
                          <td onClick={(e) => e.stopPropagation()}><input type="checkbox" disabled={!quyen("SUA_HO_SO")} checked={thuaChon.has(t.ma)} onChange={() => batTatThua(t)} aria-label={`Chọn thửa ${t.soTo ?? "?"}-${t.soThua ?? "?"} là thửa thu hồi`} title="Chọn tay là thửa thu hồi" /></td>
                          <td className="khong-xuong-dong">{t.soTo ?? "?"}-{t.soThua ?? "?"}{t.co.length > 0 && <span className="nhan nhan-vang" style={{ marginLeft: 4 }} title={t.co.map((c) => TEN_CO[c]).join(", ")}>!</span>}</td>
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
      {dl && dl.ban.canhBao.length > 0 && <div className="mo chu-nho mt-8">Ghi chú đọc tệp: {dl.ban.canhBao.join(" ")}</div>}
      {moCauHinh && dl && <HopCauHinhLop dl={dl} sua={quyen("SUA_HO_SO")} apDung={apDungCauHinh} dong={() => setMoCauHinh(false)} />}
      {thieuPhamVi && dl && (
        <HopThoai tieuDe="Chưa xác định thửa thu hồi" dong={() => setThieuPhamVi(false)} rong={640} chan={<button className="nut nut-chinh" onClick={() => setThieuPhamVi(false)}>Đã hiểu</button>}>
          <p className="mt-0">Để tạo hồ sơ, phần mềm cần biết thửa nào thuộc diện thu hồi. Chọn một trong hai cách ở mục <b>Phạm vi thu hồi</b> (cột bên phải):</p>
          <ol style={{ lineHeight: 1.7 }}>
            <li><b>Chọn vùng ranh GPMB / vùng thửa thu hồi</b> — {dl.kq.vungGpmb.length ? <>lớp {dl.cauHinh.ranhGpmb.join(", ")} đang có {dl.kq.vungGpmb.length} vùng; tích các vùng cần tính (hoặc "Chọn tất cả").</> : <>lớp {dl.cauHinh.ranhGpmb.join(", ")} chưa có vùng khép kín; mở <b>Cấu hình lớp</b> để chọn lớp chứa ranh GPMB hoặc thửa thu hồi (xem bảng thống kê lớp).</>}</li>
            <li><b>Chọn thửa trực tiếp</b> — bấm "Chọn thửa trên bản đồ" rồi bấm từng thửa, hoặc tích ô ở bảng thửa{dl.kq.thua.some((t) => loaiHienTrangBanDo(t.hienTrangBanDo)) ? ', hoặc thêm các thửa có nhãn "Chưa GPMB/NQH"' : ""}.</li>
          </ol>
          <p className="mo chu-nho">Diện tích thu hồi của thửa chọn trực tiếp mặc định bằng cả thửa; thửa thu hồi một phần sửa trong hồ sơ theo trích đo được duyệt.</p>
        </HopThoai>
      )}
      {taoHo && dl && coPhamVi && (
        <HopTaoHo duAn={duAn} dl={dl} thuHoi={thuHoi} khoaThua={khoaThua} daLienKet={daLienKet} dong={() => setTaoHo(false)} />
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { TabCuon } from "../thanh-phan/TabCuon";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { BUOC_CHUNG, TEN_TRANG_THAI_DU_AN, type DuAn } from "../mo-hinh";
import { O, ngayVN } from "../thanh-phan/chung";
import { BieuTuong, DaiChang, DongMoc, PhanBoTrangThai, VongTienDo } from "../thanh-phan/BieuDo";
import { BangHo } from "../thanh-phan/BangHo";
import { khopTuKhoa } from "../tim-kiem";
import { THU_TU_TRANG_THAI, TT_GPMB, homNayIso, mocTienDo, thongKe, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { xuatExcelDuAn } from "../xuat-excel";
import { BanDoNho } from "../thanh-phan/BanDoNho";
import { ThePhuongAn } from "../thanh-phan/PhuongAn";
import { HopNhapExcel } from "../thanh-phan/HopNhapExcel";
import { BuocChung, HopTienDoDuAn } from "../thanh-phan/TienDoDuAn";
import { BT_LOAI_DU_AN, HopKeHoach, HopThemHo, LOP_TT_DU_AN, thieuDuLieu } from "./DuAn";
import { FormDuAn, kiemTraDuAn } from "./TongQuan";
import { BanDo } from "./BanDo";
import { TRUONG_CHUNG, VanBan } from "./VanBan";
import { thongTinChungMacDinh } from "../van-ban/du-lieu";
import { truongVanBanTuDonVi } from "../don-vi";
import { Chon } from "../thanh-phan/Chon";
import { RaoLoi } from "../thanh-phan/RaoLoi";
import { NHOM_PHAP_LY, THU_TU_PHAP_LY, thongKePhapLy, type NhomPhapLy } from "../nguon-goc";
import { hienSo } from "../so";
import { CauHinhThuongBanGiao } from "../thanh-phan/CauHinhThuong";
import { TheBoChinhSachDuAn } from "../thanh-phan/GoiChinhSach";
import { TheDoiChieuDt } from "../thanh-phan/DoiChieuDt";
import { TheDuBao } from "../thanh-phan/DuBao";
import { TheQuyTdc } from "../thanh-phan/QuyTdc";
import { HopPhanCong } from "../thanh-phan/PhanCong";
import { ChonDot, HopXepDot, TheDotThuHoi, TheTongHopDot, loiDsDot } from "../thanh-phan/DotThuHoi";
import { coDot, khopDot } from "../dot-thu-hoi";
import { MAU_MA_MAC_DINH, loiMauMa, maHoTiepTheo, mauMaCua, nhomMaTrung, taoMa } from "../ma-ho";

/**
 * Không gian "Hồ sơ" của một dự án: mọi việc chi tiết của dự án ở một chỗ — tổng quan, thông tin dự án
 * (kèm thông tin dùng chung cho văn bản: nhập một lần, mọi mẫu văn bản của dự án dùng lại), danh sách hộ,
 * bản đồ, soạn văn bản.
 */
const THE = [
  { ma: "tong-quan", ten: "Tổng quan dự án", bt: "tongQuan" },
  { ma: "thong-tin", ten: "Thông tin dự án", bt: "thongTin" },
  { ma: "buoc-chung", ten: "Bước chung (1–4)", bt: "dongHo" },
  { ma: "ho", ten: "Hộ, cá nhân, tổ chức", bt: "nguoi" },
  { ma: "tai-dinh-cu", ten: "Tái định cư", bt: "nha" },
  { ma: "ban-do", ten: "Bản đồ", bt: "thua" },
] as const;
// Văn bản từng hộ soạn trong hồ sơ hộ (thẻ "Văn bản" sau "Tính toán, giải trình"); văn bản cấp dự án, theo đợt mở bằng nút
// "Văn bản dự án, đợt" ở đầu trang (tab "van-ban", chỉ các mẫu cấp dự án, đợt).

export function KhongGianDuAn({ duAnId, tab = "tong-quan", ma, hoId }: { duAnId: string; tab?: string; ma?: string; hoId?: string }) {
  const { dsDuAn, hoCua, di, chinhSach, xoaDuAn, quyen } = useUngDung();
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const [menuThem, setMenuThem] = useState(false);
  const [dangXuat, setDangXuat] = useState(false);
  const [them, setThem] = useState(false);
  const [nhapExcel, setNhapExcel] = useState(false);
  const [keHoach, setKeHoach] = useState(false);
  const [capNhatTd, setCapNhatTd] = useState<null | "chung" | "hang-loat">(null);
  const hos = hoCua(duAnId);
  const kq = useMemo(() => (duAn ? hos.map((h) => ({ h, k: tinhHo(chinhSach(duAn), duAn, h) })) : []), [hos, duAn, chinhSach]);
  if (!duAn) return <div className="trang trong">Không tìm thấy dự án. <button className="nut nut-nho" onClick={() => di({ ten: "du-an" })}>Về danh sách dự án</button></div>;
  const tt = duAn.trangThaiDuAn ?? "DANG_TRIEN_KHAI";
  const moThe = (t: string) => di({ ten: "du-an", duAnId, tab: t });
  const thieu = thieuDuLieu(duAn);

  return (
    <div className="trang kg-trang">
      <div className="duong-dan"><button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / <button onClick={() => di({ ten: "du-an" })}>Dự án</button> / Hồ sơ</div>
      <div className="the kg-dau">
        <span className="da-bt lon"><BieuTuong ten={BT_LOAI_DU_AN[duAn.loaiDuAn ?? "KHAC"]} co={26} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Chon className="kg-chon" value={duAnId} onChange={(e) => di({ ten: "du-an", duAnId: e.target.value, tab })} aria-label="Chọn dự án" title="Chuyển sang dự án khác">
              {dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
            </Chon>
            <span className={`nhan ${LOP_TT_DU_AN[tt]}`}>{TEN_TRANG_THAI_DU_AN[tt]}</span>
          </div>
          <div className="mo chu-nho">{duAn.xa || "Chưa chọn xã"} · Chủ đầu tư: {duAn.chuDauTu || "—"} · {duAn.canCuThuHoi || "Chưa ghi căn cứ thu hồi"} · TB: {ngayVN(duAn.ngayThongBao) || "—"} · {hos.length} hồ sơ</div>
        </div>
        <div className="phai">
          <button className={`nut ${tab === "van-ban" ? "nut-chinh" : ""}`} title="Tờ trình, niêm yết, lấy ý kiến, thẩm định, quyết định phê duyệt phương án… — văn bản của từng hộ soạn trong hồ sơ hộ (thẻ Văn bản)" onClick={() => moThe("van-ban")}><BieuTuong ten="vanBan" co={16} /> Văn bản dự án, đợt</button>
          <button className="nut" disabled={dangXuat || kq.length === 0} onClick={async () => { setDangXuat(true); try { await xuatExcelDuAn(duAn, kq); } finally { setDangXuat(false); } }}>{dangXuat ? "Đang xuất…" : "Xuất Excel"}</button>
          <div className="menu-nguoi">
            <button className="nut" aria-expanded={menuThem} onClick={() => setMenuThem(!menuThem)}><BieuTuong ten="baCham" co={16} /> Thêm</button>
            {menuThem && (
              <div className="menu-tha" role="menu" onMouseLeave={() => setMenuThem(false)}>
                {quyen("SUA_HO_SO") && <button role="menuitem" onClick={() => { setNhapExcel(true); setMenuThem(false); }}>Nhập hồ sơ từ Excel…</button>}
                {quyen("SUA_HO_SO") && <button role="menuitem" onClick={() => { setCapNhatTd("chung"); setMenuThem(false); }}>Cập nhật tiến độ</button>}
                <button role="menuitem" onClick={() => { setKeHoach(true); setMenuThem(false); }}>Lập kế hoạch từng bước</button>
                <button role="menuitem" onClick={() => { di({ ten: "ds-ho", duAnId }); setMenuThem(false); }}>Danh sách hồ sơ (lọc nâng cao)</button>
                {quyen("XOA_DU_AN") && <><div className="menu-vach" /><button role="menuitem" style={{ color: "var(--do-to)" }} onClick={async () => { setMenuThem(false); const lyDo = prompt(`Đưa dự án "${duAn.ten}" (kèm hồ sơ) vào thùng rác?\nKhôi phục được trong thùng rác; xóa hẳn chỉ Quản trị, sau 30 ngày.\n\nLý do xóa (bắt buộc):`)?.trim(); if (lyDo && (await xoaDuAn(duAn.id, lyDo))) di({ ten: "du-an" }); }}>Xóa dự án</button></>}
              </div>
            )}
          </div>
          {quyen("SUA_HO_SO") && <button className="nut nut-chinh" onClick={() => setThem(true)}><BieuTuong ten="cong" co={15} /> Thêm hộ, tổ chức</button>}
        </div>
      </div>
      <div className="the the-tab">
        <TabCuon chon={tab}>
          {THE.map((t) => (
            <button key={t.ma} role="tab" aria-selected={tab === t.ma} className={tab === t.ma ? "chon" : ""} onClick={() => moThe(t.ma)}>
              <BieuTuong ten={t.bt} co={18} />{t.ten}
              {t.ma === "ho" && <span className="dem">{hos.length}</span>}
              {t.ma === "buoc-chung" && <span className="dem">{BUOC_CHUNG.filter((m) => duAn.tienDoChung?.[m]?.trangThai === "XONG").length}/4</span>}
              {t.ma === "thong-tin" && thieu.length > 0 && <span className="dem" style={{ background: "var(--vang-nen)", color: "var(--vang)" }}>!</span>}
            </button>
          ))}
        </TabCuon>
      </div>
      {thieu.length > 0 && tab !== "thong-tin" && (
        <div className="thong-bao thong-bao-vang">
          Dự án chưa có {thieu.join(" và ")}. Các khoản liên quan sẽ ở trạng thái "Thiếu căn cứ".{" "}
          <button className="nut nut-chu nut-nho" onClick={() => moThe("thong-tin")}>Nhập ngay</button>
        </div>
      )}

      <RaoLoi ten={`thẻ ${THE.find((t) => t.ma === tab)?.ten ?? tab}`} khoa={`${duAnId}|${tab}`}>
      {tab === "tong-quan" && <TheTongQuan duAn={duAn} kq={kq} moHo={(t) => { moThe("ho"); setTimeout(() => window.dispatchEvent(new CustomEvent("gpmb-loc-ho", { detail: t })), 0); }} moDot={(id) => { moThe("ho"); setTimeout(() => window.dispatchEvent(new CustomEvent("gpmb-loc-dot", { detail: id })), 0); }} capNhatTd={setCapNhatTd} keHoach={() => setKeHoach(true)} />}
      {tab === "thong-tin" && <TheThongTin key={duAn.id} duAn={duAn} tiep={() => moThe("buoc-chung")} />}
      {tab === "buoc-chung" && (
        <div className="the the-than">
          <BuocChung duAn={duAn} hos={hos} tiep={{ nhan: "Hộ, cá nhân, tổ chức", di: () => moThe("ho") }} />
        </div>
      )}
      {tab === "ho" && <TheHo duAn={duAn} kq={kq} />}
      {tab === "tai-dinh-cu" && <TheQuyTdc duAn={duAn} hos={hoCua(duAnId, true)} />}
      {tab === "ban-do" && <div className="kg-nhung"><BanDo duAnId={duAnId} /></div>}
      {tab === "van-ban" && <div className="kg-nhung"><VanBan key={`${duAnId}-${ma}-${hoId}`} duAnId={duAnId} maDau={ma} hoIdDau={hoId} chiDuAn={!hoId} /></div>}
      </RaoLoi>

      {keHoach && <HopKeHoach duAn={duAn} dong={() => setKeHoach(false)} />}
      {capNhatTd && <HopTienDoDuAn duAn={duAn} hos={hos} tabDau={capNhatTd} dong={() => setCapNhatTd(null)} />}
      {them && <HopThemHo duAnId={duAnId} dong={() => setThem(false)} />}
      {nhapExcel && <HopNhapExcel duAn={duAn} dong={() => setNhapExcel(false)} />}
    </div>
  );
}

type Kq = { h: import("../mo-hinh").Ho; k: import("../tinh-ho").KetQuaHo }[];

function TheTongQuan({ duAn, kq, moHo, moDot, capNhatTd, keHoach }: { duAn: DuAn; kq: Kq; moHo: (t: TrangThaiGpmb) => void; moDot: (dotId: string) => void; capNhatTd: (t: "chung" | "hang-loat") => void; keHoach: () => void }) {
  const { di, quyen } = useUngDung();
  const homNay = homNayIso();
  const tk = thongKe(duAn, kq, homNay);
  const moc = mocTienDo(duAn, kq.map((x) => x.h), homNay);
  const ttThua = new Map<string, TrangThaiGpmb>();
  for (const { h, k } of kq) for (const t of h.thua) if (t.maBanDo) ttThua.set(t.maBanDo, trangThaiHo(duAn, h, k, homNay));
  return (
    <>
      <div className="da-ba-the" style={{ padding: 0, marginBottom: 14 }}>
        <div className="da-cot">
          <div className="the">
            <div className="the-dau"><h3>Hiện trạng hồ sơ</h3><span className="mo chu-nho">bấm để xem danh sách</span></div>
            <div className="the-than"><PhanBoTrangThai dem={tk.theoTrangThai} tong={tk.soHo} chon={moHo} /></div>
          </div>
          <div className="the">
            <div className="the-dau"><h3>DT thu hồi theo pháp lý nguồn gốc</h3><span className="mo chu-nho">dữ kiện, không phải kết luận bồi thường</span></div>
            <table className="bang">
              <thead><tr><th>Tình trạng pháp lý</th><th className="so">Số thửa</th><th className="so">DT thu hồi (m²)</th></tr></thead>
              <tbody>
                {thongKePhapLy(kq.map((x) => x.h)).map((x) => (
                  <tr key={x.nhom}><td>{x.nhom === "CHUA" ? <span className="nhan nhan-vang">Chưa phân loại</span> : NHOM_PHAP_LY[x.nhom].ngan}</td><td className="so">{x.soThua}</td><td className="so">{hienSo(x.dt)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <TheDuBao duAn={duAn} hos={kq.map((x) => x.h)} moKeHoach={keHoach} />
          <TheDoiChieuDt duAn={duAn} hos={kq.map((x) => x.h)} />
          <div className="the">
            <div className="the-dau"><h3>Bản đồ dự án</h3><span className="mo chu-nho">bấm để mở</span></div>
            <div className="the-than" style={{ padding: 8 }}><BanDoNho duAn={duAn} ttThua={ttThua} /></div>
          </div>
        </div>
        <div className="the">
          <div className="the-dau"><h3>Tiến độ chung</h3><span className="cap-nhat day-phai"><BieuTuong ten="dongHo" co={14} />{tk.capNhatCuoi ? new Date(tk.capNhatCuoi).toLocaleString("vi-VN") : "—"}</span></div>
          <div className="the-than" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
            <VongTienDo tyLe={tk.tienDoChung} nhan="Số bước đã xong / số bước áp dụng" />
            <VongTienDo tyLe={tk.dtThuHoi ? tk.dtDaBanGiao / tk.dtThuHoi : 0} nhan={`Mặt bằng đã bàn giao: ${Math.round(tk.dtDaBanGiao).toLocaleString("vi-VN")} / ${Math.round(tk.dtThuHoi).toLocaleString("vi-VN")} m²`} />
          </div>
          <div className="chu-nho" style={{ padding: "0 16px", fontWeight: 600 }}>Tiến độ theo quy trình</div>
          <div style={{ padding: "0 8px 10px" }}><DaiChang chang={tk.chang} soHo={tk.soHo} bieuTuong={["hoSo", "kiemDem", "phuongAn", "pheDuyet", "chiTra", "banGiao"]} bam={(i) => di({ ten: "ds-ho", duAnId: duAn.id, chang: tk.chang[i]!.buoc })} /></div>
        </div>
        <div className="the">
          <div className="the-dau"><h3>Mốc tiến độ dự án</h3><div className="phai"><button className="nut nut-nho" onClick={keHoach}>Lập kế hoạch</button>{quyen("SUA_HO_SO") && <button className="nut nut-nho nut-chinh" onClick={() => capNhatTd("chung")}>Cập nhật tiến độ</button>}</div></div>
          <div className="bang-cuon" style={{ maxHeight: 420, padding: "6px 10px" }}><DongMoc moc={moc} chon={quyen("SUA_HO_SO") ? (ma) => capNhatTd(["1", "2", "3", "4"].includes(ma) ? "chung" : "hang-loat") : undefined} /></div>
        </div>
      </div>
      {coDot(duAn) && <TheTongHopDot duAn={duAn} kq={kq} moDot={moDot} />}
      <ThePhuongAn duAn={duAn} kq={kq} />
    </>
  );
}

/** Thông tin dự án + thông tin dùng chung cho mọi văn bản của dự án (lưu một lần vào DuAn.vanBan). */
function TheThongTin({ duAn, tiep }: { duAn: DuAn; tiep: () => void }) {
  const { luuDuAn, quyen, bao, dsDonVi, hoCua } = useUngDung();
  const [d, setD] = useState<DuAn>(duAn);
  const [chung, setChung] = useState<Record<string, string>>(() => ({ ...thongTinChungMacDinh(duAn), ...truongVanBanTuDonVi(dsDonVi), ...(duAn.vanBan ?? {}) }));
  const [dang, setDang] = useState(false);
  useEffect(() => { setD(duAn); }, [duAn]);
  const goc = { ...thongTinChungMacDinh(duAn), ...truongVanBanTuDonVi(dsDonVi), ...(duAn.vanBan ?? {}) };
  const daDoi = JSON.stringify(d) !== JSON.stringify(duAn) || JSON.stringify(chung) !== JSON.stringify(goc);
  const { luuDuoc: luuDuocDa } = kiemTraDuAn(d);
  const luuDuoc = luuDuocDa && !loiMauMa(d.mauMaHo ?? "") && !loiDsDot(d);
  const choSua = quyen("SUA_HO_SO");
  const maTiep = maHoTiepTheo(hoCua(duAn.id, true).map((h) => h.ma), mauMaCua(d));
  const nhom = [...new Set(TRUONG_CHUNG.map((t) => t.nhom))];
  const luu = async (sangBuocSau = false) => {
    setDang(true);
    try {
      await luuDuAn({ ...d, vanBan: { ...(duAn.vanBan ?? {}), ...chung } });
      bao(sangBuocSau ? "Đã lưu thông tin dự án — tiếp: cập nhật bước chung 1–4" : "Đã lưu thông tin dự án");
    } finally {
      setDang(false);
    }
    if (sangBuocSau) tiep();
  };
  return (
    <fieldset className="khung-quyen" disabled={!choSua}>
      <div className="kg-luu">
        <span className="mo chu-nho">Thông tin nhập ở đây được dùng chung cho tính toán và <b>mọi mẫu văn bản của dự án</b> — không phải nhập lại ở từng văn bản.</span>
        {daDoi && <span className="nhan nhan-vang">Chưa lưu</span>}
        <button className="nut" disabled={!daDoi} onClick={() => { setD(duAn); setChung(goc); }}><BieuTuong ten="hoanTac" co={16} /> Hoàn tác</button>
        <button className="nut" disabled={!daDoi || !luuDuoc || dang} onClick={() => void luu()}><BieuTuong ten="luu" co={16} /> Lưu</button>
        <button className="nut nut-chinh" disabled={(daDoi && !luuDuoc) || dang} title="Lưu (nếu có thay đổi) rồi chuyển sang cập nhật bước chung 1–4 của dự án" onClick={() => (daDoi ? void luu(true) : tiep())}>{daDoi ? "Lưu và tiếp" : "Tiếp"}: Bước chung (1–4) →</button>
      </div>
      <div className="luoi" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", alignItems: "start" }}>
        <div className="the">
          <div className="the-dau"><h3>Thông tin dự án</h3><span className="mo chu-nho">dùng cho tính toán</span></div>
          <div className="the-than"><FormDuAn d={d} setD={setD} /></div>
        </div>
        <CauHinhThuongBanGiao d={d} setD={setD} />
        <TheBoChinhSachDuAn duAn={duAn} />
        <TheDotThuHoi d={d} setD={setD} hos={hoCua(duAn.id, true)} />
        <div className="the" style={{ gridColumn: "1" }}>
          <div className="the-dau"><h3>Mẫu mã hồ sơ</h3><span className="mo chu-nho">do đơn vị đặt</span></div>
          <div className="the-than">
            <O nhan="Mẫu mã" goiY={loiMauMa(d.mauMaHo ?? "") ?? <>Dãy <b>#</b> là chỗ đánh số (số dấu # = số chữ số). Ví dụ: <code>H###</code> → {taoMa("H###", 1)}; <code>CM-2026-####</code> → {taoMa("CM-2026-####", 1)}. Mã kế tiếp: <b>{maTiep}</b></>}>
              <input className={loiMauMa(d.mauMaHo ?? "") ? "loi-nhap" : ""} value={d.mauMaHo ?? ""} placeholder={MAU_MA_MAC_DINH} onChange={(e) => setD({ ...d, mauMaHo: e.target.value })} />
            </O>
            <p className="mo chu-nho mb-0">Áp dụng cho hồ sơ tạo mới (thêm tay, nhập Excel không có cột mã, tạo từ bản đồ). Hồ sơ đã có giữ nguyên mã; mã luôn duy nhất trong dự án.</p>
          </div>
        </div>
        <div className="the">
          <div className="the-dau">
            <h3>Thông tin dùng chung cho văn bản</h3>
            <div className="phai"><button className="nut nut-nho" disabled={!dsDonVi.length} title={dsDonVi.length ? "Điền tên cơ quan, ký hiệu, người ký từ Công cụ → Thiết lập đơn vị" : "Chưa có đơn vị — vào Công cụ → Thiết lập đơn vị"} onClick={() => setChung({ ...chung, ...truongVanBanTuDonVi(dsDonVi) })}>Điền từ Thiết lập đơn vị</button></div>
          </div>
          <div className="the-than luoi">
            {nhom.map((n) => (
              <div key={n}>
                <div className="chu-nho" style={{ fontWeight: 700, marginBottom: 6, color: "var(--chu-phu)" }}>{n}</div>
                <div className="luoi luoi-2">
                  {TRUONG_CHUNG.filter((t) => t.nhom === n).map((t) => (
                    <O key={t.truong} nhan={t.nhan} goiY={t.goiY} style={t.nhieuDong && n === "Căn cứ" ? { gridColumn: "1/-1" } : undefined}>
                      {t.nhieuDong ? <textarea rows={n === "Căn cứ" ? 5 : 2} value={chung[t.truong] ?? ""} onChange={(e) => setChung({ ...chung, [t.truong]: e.target.value })} /> : <input value={chung[t.truong] ?? ""} onChange={(e) => setChung({ ...chung, [t.truong]: e.target.value })} />}
                    </O>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </fieldset>
  );
}

function TheHo({ duAn, kq }: { duAn: DuAn; kq: Kq }) {
  const { di, quyen } = useUngDung();
  const [locDot, setLocDot] = useState("");
  const [xepDot, setXepDot] = useState(false);
  const [phanCong, setPhanCong] = useState(false);
  const [locPc, setLocPc] = useState("");
  const { dsCanBo } = useUngDung();
  useEffect(() => {
    const nghe = (e: Event) => setLocDot((e as CustomEvent<string>).detail);
    window.addEventListener("gpmb-loc-dot", nghe);
    return () => window.removeEventListener("gpmb-loc-dot", nghe);
  }, []);
  const maTrung = nhomMaTrung(kq.map((x) => x.h));
  const homNay = homNayIso();
  const [loc, setLoc] = useState("");
  const [locTt, setLocTt] = useState<TrangThaiGpmb | "">("");
  const [locPl, setLocPl] = useState<NhomPhapLy | "CHUA" | "">("");
  useEffect(() => {
    const nghe = (e: Event) => setLocTt((e as CustomEvent<TrangThaiGpmb>).detail);
    window.addEventListener("gpmb-loc-ho", nghe);
    return () => window.removeEventListener("gpmb-loc-ho", nghe);
  }, []);
  const ds = kq
    .map(({ h, k }) => ({ h, k, duAn, tt: trangThaiHo(duAn, h, k, homNay) }))
    .filter((x) => !locTt || x.tt === locTt)
    .filter((x) => khopDot(x.h, locDot, duAn))
    .filter((x) => !locPc || (locPc === "__chua__" ? !x.h.phuTrach : x.h.phuTrach === locPc))
    .filter((x) => !locPl || x.h.thua.some((t) => Number(t.dienTichThuHoi) > 0 && (t.phapLy ?? "CHUA") === locPl))
    .filter((x) => khopTuKhoa({ h: x.h, duAnTen: "" }, loc));
  return (
    <div className="the">
      {maTrung.length > 0 && (
        <div className="thong-bao thong-bao-vang" style={{ margin: "0 16px 10px" }}>
          <b>Có {maTrung.length} mã hồ sơ bị trùng</b> (dữ liệu tạo trước phiên bản 0.4): {maTrung.map((g) => `${g.ma} (${g.ho.map((h) => h.ten).join(", ")})`).join("; ")}. Mở từng hồ sơ, đổi mã ở thẻ Thông tin rồi lưu — phần mềm không tự đổi vì mã có thể đã ghi trong văn bản, biên bản.
        </div>
      )}
      <div className="the-dau" style={{ flexWrap: "wrap" }}>
        <h2>Danh sách hộ gia đình, cá nhân, tổ chức</h2>
        <span className="mo">{ds.length}/{kq.length}</span>
        <div className="phai">
          <label className="o-tim" style={{ minWidth: 300 }}><BieuTuong ten="traCuu" co={16} /><input placeholder="Tìm theo tên, mã, địa chỉ, tờ/thửa (vd. 5/85)…" value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Tìm hộ trong dự án" /></label>
          <Chon value={locTt} onChange={(e) => setLocTt(e.target.value as TrangThaiGpmb | "")} aria-label="Lọc hiện trạng" className="chon-cao">
            <option value="">Mọi hiện trạng</option>
            {THU_TU_TRANG_THAI.map((t) => <option key={t} value={t}>{TT_GPMB[t].ten}</option>)}
          </Chon>
          {coDot(duAn) && <ChonDot duAn={duAn} value={locDot} onChange={setLocDot} className="chon-cao" />}
          {coDot(duAn) && quyen("SUA_HO_SO") && <button className="nut" onClick={() => setXepDot(true)}>Xếp đợt…</button>}
          <Chon value={locPc} onChange={(e) => setLocPc(e.target.value)} aria-label="Lọc cán bộ phụ trách" className="chon-cao">
            <option value="">Mọi cán bộ phụ trách</option>
            <option value="__chua__">Chưa phân công</option>
            {dsCanBo.map((c) => <option key={c.ten} value={c.ten}>{c.hoTen}</option>)}
          </Chon>
          {quyen("SUA_HO_SO") && <button className="nut" onClick={() => setPhanCong(true)}>Phân công…</button>}
          <Chon value={locPl} onChange={(e) => setLocPl(e.target.value as NhomPhapLy | "CHUA" | "")} aria-label="Lọc pháp lý nguồn gốc" className="chon-cao">
            <option value="">Mọi pháp lý nguồn gốc</option>
            {THU_TU_PHAP_LY.map((k) => <option key={k} value={k}>{NHOM_PHAP_LY[k].ngan}</option>)}
            <option value="CHUA">Chưa phân loại</option>
          </Chon>
        </div>
      </div>
      <BangHo ds={ds} homNay={homNay} mo={(x) => di({ ten: "ho", duAnId: duAn.id, hoId: x.h.id })} trong={kq.length ? "Không có hồ sơ khớp điều kiện lọc." : "Chưa có hồ sơ. Bấm “Thêm hộ, tổ chức”, nhập Excel (menu Thêm) hoặc tạo từ bản đồ."} />
      {phanCong && <HopPhanCong hos={kq.map((x) => x.h)} dong={() => setPhanCong(false)} />}
      {xepDot && <HopXepDot duAn={duAn} hos={kq.map((x) => x.h)} dong={() => setXepDot(false)} />}
    </div>
  );
}

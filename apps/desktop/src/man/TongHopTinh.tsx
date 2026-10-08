/**
 * Gửi tỉnh, tổng hợp tỉnh (docs/21-tong-hop-cap-tinh.md).
 * - Cấp xã ("Gửi lên tỉnh"): nhập khóa công khai của tỉnh → chọn dự án → xuất gói .gpmbtinh (mã hóa cho tỉnh, ký bằng
 *   khóa của bản cài) để gửi bằng thư điện tử, Zalo, USB…; hoặc gửi thẳng lên cổng Cloudflare của tỉnh.
 * - Cấp tỉnh ("Tổng hợp tỉnh"): tạo khóa cấp tỉnh, nhận gói (tệp hoặc tải từ cổng), bảng tổng hợp theo xã, phường,
 *   xem chi tiết từng dự án như cấp xã (chỉ xem), xuất Excel; quản lý mã truy cập cổng của các xã.
 */
import { TheLienXaTinh } from "../thanh-phan/LienXaTinh";
import { TheDienBienTinh } from "../thanh-phan/DienBienTinh";
import { dienBienTinh } from "../tong-hop-tinh/dien-bien";
import { gomLienXa, type DoanTinh, type TuyenLienXa } from "../tong-hop-tinh/lien-xa";
import { useEffect, useMemo, useState } from "react";
import { ChonTep } from "../thanh-phan/ChonTep";
import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { taiXuong } from "../tai-xuong";
import { taoId } from "../mo-hinh";
import { donViSuDung } from "../don-vi";
import { DANH_MUC_XA } from "../du-lieu";
import { loiMatKhau } from "../ma-hoa";
import { PHIEN_BAN } from "../phien-ban";
import { TT_GPMB } from "../trang-thai";
import { tenTep } from "../ten-tep";
import {
  DUOI_GOI, DUOI_KHOA, KHOA_CD_GUI, KHOA_CD_KHOA_TINH, LoiGoiTinh, THU_TU_TT, docTepKhoa, kiemVanTay, moKhoaTinh, nhomVanTay,
  taoKhoaTinh, tenTepGoi, tepDuPhongKhoa, tepKhoaCongKhai, tomTatDuAn,
  type KhoaCongKhaiTinh, type KhoaTinh, type TomTatDuAn,
} from "../tong-hop-tinh/goi-tinh";
import { LoiDoiKhoaKy, type KetQuaNhap, type BanCu, docBanCu, dsBanCuTatCa, GIU_BAN_CU, docKhoaTinh, dsGoi, dsNhanGoi, dsTuyen, luuKhoaTinh, moGoiDaLuu, nhapGoi, xoaGoi, type BanGhiGoi, type DongNhanGoi } from "../tong-hop-tinh/kho-tinh";
import {
  capMaXa, chuanDiaChi, docCauHinhCong, dsGoiTrenCong, dsXaTrenCong, guiGoiLenCong, kiemTraCong, luuCauHinhCong, nhacCapNhatCong, maTuTen, thuHoiXa, xoaCauHinhCong,
  type CauHinhCong, type GoiTrenCong, type VaiTroCong, type XaTrenCong,
} from "../tong-hop-tinh/cong-tinh";
import { moPhienXem, taoKhoXem } from "../tong-hop-tinh/xem-xa";
import { SU_KIEN_TU_GUI, lanTuGuiTiep, taoGoiTheoCaiDat, type CaiDatGui } from "../tong-hop-tinh/tu-gui";
import { docNguong, dsChamGui, ghiNguong, moTaCham, soNgayTu } from "../tong-hop-tinh/canh-bao";
import { HopBaoCaoTinh } from "../thanh-phan/HopBaoCaoTinh";
import { taoExcelTinh } from "../tong-hop-tinh/excel-tinh";
import { RaoLoi } from "../thanh-phan/RaoLoi";
import { SU_KIEN_GOI_MOI, chuaTai, datChoNhan, datKhoaMo, layKhoaMo, taiGoiMoi, taiBanCu } from "../tong-hop-tinh/phien-tinh";

const ngayGio = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const h = (n: number) => String(n).padStart(2, "0");
  return `${h(d.getDate())}/${h(d.getMonth() + 1)}/${d.getFullYear()} ${h(d.getHours())}:${h(d.getMinutes())}`;
};
const homNay = () => new Date().toISOString().slice(0, 10);
const loiChu = (e: unknown) => String((e as Error)?.message ?? e);
const docTep = (f: File) => f.arrayBuffer().then((b) => new Uint8Array(b));

export function TongHopTinh() {
  const { man, di } = useUngDung();
  const [coKhoaTinh, setCoKhoaTinh] = useState<boolean | null>(null);
  useEffect(() => void docKhoaTinh().then((k) => setCoKhoaTinh(!!k), () => setCoKhoaTinh(false)), []);
  const tab = man.ten === "tong-hop-tinh" && man.tab ? man.tab : coKhoaTinh ? "tinh" : "gui";
  if (coKhoaTinh === null) return <div className="trang"><div className="trong">Đang tải…</div></div>;
  return (
    <div className="trang" style={{ maxWidth: 1400 }}>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Gửi tỉnh, tổng hợp tỉnh</h1>
          <div className="mo-ta">Xã, phường gửi dữ liệu dự án lên tỉnh (tệp mã hóa hoặc cổng Cloudflare); cấp tỉnh tổng hợp tiến độ GPMB theo từng xã, xem chi tiết từng dự án như cấp xã.</div>
        </div>
        <div className="phai nhom-nut">
          <div className="hd-che-do" role="tablist" aria-label="Cấp sử dụng">
            <button role="tab" aria-selected={tab === "gui"} className={tab === "gui" ? "chon" : ""} onClick={() => di({ ten: "tong-hop-tinh", tab: "gui" })}>Gửi lên tỉnh (cấp xã)</button>
            <button role="tab" aria-selected={tab === "tinh"} className={tab === "tinh" ? "chon" : ""} onClick={() => di({ ten: "tong-hop-tinh", tab: "tinh" })}>Tổng hợp tỉnh (cấp tỉnh)</button>
          </div>
        </div>
      </div>
      {tab === "gui" ? <PhanGui /> : <PhanTinh daCoKhoa={() => setCoKhoaTinh(true)} />}
    </div>
  );
}

/* ================================ CẤP XÃ ================================ */

function PhanGui() {
  const { kho, dsDuAn, hoCua, quyen, taiKhoan, dsDonVi, bao, ghiNhatKy } = useUngDung();
  const [khoa, setKhoa] = useState<KhoaCongKhaiTinh | null>(null);
  const [gui, setGui] = useState<CaiDatGui | null>(null);
  const [dang, setDang] = useState("");
  const [soTep, setSoTep] = useState<Map<string, number>>(new Map());
  const [cong, setCong] = useState<CauHinhCong | null>(() => docCauHinhCong("XA"));
  useEffect(() => {
    void (async () => {
      setKhoa(await kho.docCaiDat<KhoaCongKhaiTinh>(KHOA_CD_KHOA_TINH));
      const g = await kho.docCaiDat<CaiDatGui>(KHOA_CD_GUI);
      setGui(g ?? { maGui: taoId(), ten: donViSuDung(dsDonVi)?.ten ?? "" });
      const m = new Map<string, number>();
      for (const d of dsDuAn) m.set(d.id, (await kho.dsDinhKem(d.id)).filter((x) => !x.daXoa).length);
      setSoTep(m);
    })();
  }, [kho, dsDuAn, dsDonVi]);
  const kemTep = gui?.kemTep ?? true;
  const kemBanDo = gui?.kemBanDo ?? true;
  const dsChon = useMemo(() => dsDuAn.filter((d) => !gui?.boQua?.includes(d.id)), [dsDuAn, gui?.boQua]);
  const tomTat = useMemo(() => tomTatDuAn(dsChon, dsChon.flatMap((d) => hoCua(d.id)), (id) => soTep.get(id) ?? 0, homNay()), [dsChon, hoCua, soTep]);
  const coQuyenGui = quyen("SAO_LUU");

  const nhapKhoa = async (f: File | undefined) => {
    if (!f) return;
    try {
      const { congKhai } = docTepKhoa(await f.text());
      if (!(await kiemVanTay(congKhai))) throw new LoiGoiTinh("Tệp khóa hỏng (vân tay không khớp khóa).");
      await kho.luuCaiDat(KHOA_CD_KHOA_TINH, congKhai);
      setKhoa(congKhai);
      await ghiNhatKy("Nhập khóa công khai cấp tỉnh", `${congKhai.donVi} · vân tay ${nhomVanTay(congKhai.vanTay)}`);
      bao("Đã nhập khóa của tỉnh — gọi điện đối chiếu vân tay với cấp tỉnh trước khi gửi");
    } catch (e) {
      bao(loiChu(e), "loi");
    }
  };
  const luuGui = async (g: CaiDatGui) => {
    setGui(g);
    await kho.luuCaiDat(KHOA_CD_GUI, g).catch(() => undefined);
  };
  /** Đổi một phần cài đặt gửi và lưu ngay (tự gửi định kỳ dùng đúng lựa chọn này). */
  const doiGui = (x: Partial<CaiDatGui>) =>
    gui && void luuGui({ ...gui, ...x }).then(() => { if (x.tuDong) window.dispatchEvent(new Event(SU_KIEN_TU_GUI)); }); // bật/đổi chu kỳ: kiểm tra ngay
  const taoGoi = async () => {
    if (!khoa || !gui) throw new LoiGoiTinh("Chưa có khóa của tỉnh");
    return taoGoiTheoCaiDat(kho, gui, { khoaTinh: khoa, ungDung: PHIEN_BAN, nguoiXuat: taiKhoan ? `${taiKhoan.hoTen} (${taiKhoan.ten})` : "" });
  };
  const ghiLanGui = async (cach: string, chiTiet: string) => {
    const { loiTuGui: _bo, ...con } = gui!;
    const g = { ...con, lanGui: { luc: new Date().toISOString(), cach } };
    await luuGui(g);
    await ghiNhatKy(`Gửi dữ liệu lên tỉnh (${cach})`, chiTiet);
  };
  const xuatTep = async () => {
    setDang("Đang tạo gói…");
    try {
      const g = await taoGoi();
      const noi = await taiXuong(g.bytes, tenTepGoi(g.thongTin.donViGui, g.thongTin.luc), "application/octet-stream");
      if (!noi) return;
      await ghiLanGui("tệp", `${g.thongTin.soDuAn} dự án, ${g.thongTin.soHo} hồ sơ, ${g.thongTin.soDinhKem} tệp đính kèm, ${g.thongTin.soBanDo} bản đồ · ${(g.bytes.length / 1048576).toFixed(1)} MB · ${noi}`);
      bao("Đã xuất gói — gửi tệp này cho cấp tỉnh (thư điện tử công vụ, Zalo, USB…). Chỉ máy cấp tỉnh mở được.");
    } catch (e) {
      bao(loiChu(e), "loi");
    } finally {
      setDang("");
    }
  };
  const guiCong = async () => {
    if (!cong) return;
    setDang("Đang tạo gói và gửi lên cổng…");
    try {
      const g = await taoGoi();
      const r = await guiGoiLenCong(cong, g.bytes);
      await ghiLanGui("cổng Cloudflare", `${g.thongTin.soDuAn} dự án, ${g.thongTin.soHo} hồ sơ · ${(r.kichThuoc / 1048576).toFixed(1)} MB`);
      bao(`Đã gửi lên cổng của tỉnh lúc ${ngayGio(r.luc)}`);
    } catch (e) {
      bao(loiChu(e), "loi");
    } finally {
      setDang("");
    }
  };

  if (!gui) return <div className="trong">Đang tải…</div>;
  return (
    <div className="tht-luoi">
      <div className="the">
        <div className="the-dau"><h3>1. Khóa của tỉnh</h3></div>
        <div className="the-than luoi" style={{ gap: 10 }}>
          {khoa ? (
            <>
              <div>Gói chỉ mở được bằng khóa của: <b>{khoa.donVi}</b></div>
              <div>Vân tay khóa: <span className="tht-van-tay" aria-label="Vân tay khóa tỉnh">{nhomVanTay(khoa.vanTay)}</span></div>
              <div className="mo chu-nho">Gọi điện cho cấp tỉnh đọc đối chiếu vân tay này một lần (tránh nhận nhầm tệp khóa giả).</div>
            </>
          ) : (
            <div className="thong-bao thong-bao-vang chu-nho" style={{ margin: 0 }}>Chưa có khóa của tỉnh. Cấp tỉnh gửi tệp <code>{DUOI_KHOA}</code> (Tổng hợp tỉnh → Xuất khóa công khai gửi các xã); nhập tệp đó tại đây một lần.</div>
          )}
          {quyen("CAI_DAT") ? (
            <div className="chu-nho tht-o">{khoa ? "Thay bằng tệp khóa khác" : "Nhập tệp khóa của tỉnh"}
              <ChonTep accept={`${DUOI_KHOA},.json`} aria-label="Chọn tệp khóa của tỉnh" onChange={(e) => void nhapKhoa(e.target.files?.[0])} />
            </div>
          ) : <div className="mo chu-nho">Cần tài khoản quản trị hoặc lãnh đạo để nhập khóa.</div>}
        </div>
      </div>

      <div className="the">
        <div className="the-dau"><h3>2. Nội dung gửi</h3></div>
        <div className="the-than luoi" style={{ gap: 10 }}>
          <label className="chu-nho tht-o">Tên đơn vị gửi
            <input aria-label="Tên đơn vị gửi" value={gui.ten} placeholder="vd. UBND xã Chiềng Mung" onChange={(e) => setGui({ ...gui, ten: e.target.value })} onBlur={() => void luuGui(gui)} />
          </label>
          <div className="chu-nho">Dự án gửi ({dsChon.length}/{dsDuAn.length}):</div>
          <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--vien)", borderRadius: 8, padding: 8 }}>
            {dsDuAn.map((d) => (
              <label key={d.id} className="chu-nho" style={{ display: "flex", gap: 6, padding: "2px 0" }}>
                <input type="checkbox" checked={!gui.boQua?.includes(d.id)} onChange={(e) => { const bo = new Set(gui.boQua ?? []); if (e.target.checked) bo.delete(d.id); else bo.add(d.id); doiGui({ boQua: [...bo] }); }} />
                <span>{d.ten}{d.xa ? ` · ${d.xa}` : ""} · {hoCua(d.id).length} hồ sơ</span>
              </label>
            ))}
            {!dsDuAn.length && <div className="mo">Chưa có dự án.</div>}
          </div>
          <label className="chu-nho"><input type="checkbox" checked={kemTep} onChange={(e) => doiGui({ kemTep: e.target.checked })} /> Kèm tệp đính kèm, tài liệu dự án ({[...soTep.entries()].filter(([id]) => dsChon.some((d) => d.id === id)).reduce((s, [, n]) => s + n, 0)} tệp)</label>
          <label className="chu-nho"><input type="checkbox" checked={kemBanDo} onChange={(e) => doiGui({ kemBanDo: e.target.checked })} /> Kèm bản đồ địa chính (DGN, DXF) đã nạp</label>
          <div className="mo chu-nho">Gói gồm đầy đủ dữ liệu các dự án chọn (hồ sơ hộ, kiểm đếm, phương án, tiến độ, văn bản đã ghi số){kemTep ? ", tệp đính kèm" : ""}{kemBanDo ? ", bản đồ" : ""} — không gồm tài khoản, mật khẩu, nhật ký hệ thống.</div>
        </div>
      </div>

      <div className="the">
        <div className="the-dau"><h3>3. Gửi</h3></div>
        <div className="the-than luoi" style={{ gap: 10 }}>
          <div className="tht-chi-so">
            <div><b>{tomTat.length}</b><span>dự án</span></div>
            <div><b>{tomTat.reduce((s, x) => s + x.soHo, 0)}</b><span>hồ sơ</span></div>
            <div><b>{tomTat.reduce((s, x) => s + (x.theoTrangThai.HOAN_THANH ?? 0), 0)}</b><span>đã bàn giao</span></div>
          </div>
          {gui.lanGui && <div className="chu-nho">Lần gửi gần nhất: <b>{ngayGio(gui.lanGui.luc)}</b> ({gui.lanGui.cach})</div>}
          {!coQuyenGui && <div className="thong-bao thong-bao-vang chu-nho" style={{ margin: 0 }}>Tài khoản không có quyền sao lưu, xuất dữ liệu — không gửi được.</div>}
          <div className="nhom-nut">
            <button className="nut nut-chinh" disabled={!khoa || !coQuyenGui || !dsChon.length || !gui.ten.trim() || !!dang} onClick={() => void xuatTep()}>Xuất gói gửi tỉnh ({DUOI_GOI})</button>
            {cong && <button className="nut" disabled={!khoa || !coQuyenGui || !dsChon.length || !gui.ten.trim() || !!dang} onClick={() => void guiCong()}>Gửi lên cổng của tỉnh</button>}
          </div>
          {dang && <div className="mo" role="status">{dang}</div>}
          <div className="mo chu-nho">Gói được mã hóa (AES-256) bằng khóa của tỉnh: người chuyển tệp, hộp thư, Zalo hay cổng Cloudflare đều không đọc được nội dung. Gửi lại bất kỳ lúc nào — tỉnh luôn giữ bản mới nhất.</div>
          {cong && (
            <div className="tht-tu-gui" aria-label="Tự động gửi định kỳ">
              <label className="chu-nho" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <input type="checkbox" aria-label="Bật tự động gửi" checked={!!gui.tuDong?.bat} disabled={!coQuyenGui || !khoa} onChange={(e) => doiGui({ tuDong: { bat: e.target.checked, soNgay: gui.tuDong?.soNgay ?? 0 }, loiTuGui: undefined })} />
                Tự động gửi lên cổng của tỉnh, mỗi
                <input type="number" min={1} max={365} aria-label="Chu kỳ tự gửi (ngày)" style={{ width: 70 }} value={gui.tuDong?.soNgay || ""} placeholder="số" onChange={(e) => doiGui({ tuDong: { bat: !!gui.tuDong?.bat, soNgay: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
                ngày
              </label>
              {gui.tuDong?.bat && !(gui.tuDong.soNgay >= 1) && <div className="chu-nho" style={{ color: "var(--do)" }}>Nhập số ngày giữa hai lần gửi.</div>}
              {(() => {
                const tiep = lanTuGuiTiep(gui);
                return tiep ? <div className="chu-nho">Lần tự gửi tiếp theo: <b>{tiep.getTime() <= Date.now() ? "ngay khi phần mềm đang mở (trong vài phút)" : ngayGio(tiep.toISOString())}</b>. Gửi theo lựa chọn dự án, tệp đính kèm, bản đồ ở mục 2; chỉ chạy khi phần mềm đang mở (máy đơn hoặc máy chủ).</div> : null;
              })()}
              {gui.loiTuGui && <div className="chu-nho" style={{ color: "var(--do)" }}>Lần tự gửi {ngayGio(gui.loiTuGui.luc)} không thành công: {gui.loiTuGui.loi} — phần mềm thử lại sau 1 giờ.</div>}
            </div>
          )}
          <CaiDatCong vaiTro="XA" cong={cong} datCong={setCong} />
        </div>
      </div>
    </div>
  );
}

/** Cài đặt cổng Cloudflare (địa chỉ + mã truy cập) — xã dùng mã do tỉnh cấp; tỉnh dùng mã quản trị. */
function CaiDatCong({ vaiTro, cong, datCong }: { vaiTro: VaiTroCong; cong: CauHinhCong | null; datCong: (c: CauHinhCong | null) => void }) {
  const { bao, quyen } = useUngDung();
  const [mo, setMo] = useState(false);
  const [diaChi, setDiaChi] = useState(cong?.diaChi ?? "");
  const [ma, setMa] = useState("");
  const [maMoi, setMaMoi] = useState("");
  const luu = async () => {
    try {
      chuanDiaChi(diaChi);
      const c = await luuCauHinhCong(vaiTro, diaChi, ma);
      const tt = await kiemTraCong(c).catch((e) => {
        xoaCauHinhCong(vaiTro);
        throw e;
      });
      if (tt.vaiTro !== vaiTro) {
        xoaCauHinhCong(vaiTro);
        throw new Error(vaiTro === "XA" ? "Đây là mã quản trị của tỉnh — xã dùng mã truy cập được tỉnh cấp riêng" : "Đây là mã của một xã — cần mã quản trị của cổng");
      }
      datCong(c);
      setMa("");
      const nhac = nhacCapNhatCong(tt);
      bao(`${vaiTro === "XA" ? `Đã kết nối cổng — mã của ${tt.ten ?? tt.ma}` : "Đã kết nối cổng với quyền quản trị"}${nhac ? `. ${nhac}` : ""}`, nhac ? "loi" : undefined);
    } catch (e) {
      bao(loiChu(e), "loi");
    }
  };
  if (!quyen("CAI_DAT")) return cong ? <div className="mo chu-nho">Đã cài đặt cổng: {cong.diaChi}</div> : null;
  return (
    <div style={{ borderTop: "1px solid var(--vien)", paddingTop: 10 }}>
      <button className="nut nut-chu nut-nho tht-cong-nut" aria-expanded={mo} onClick={() => setMo(!mo)}>{mo ? "▾" : "▸"} Cổng Cloudflare của tỉnh {cong ? `(đã kết nối: ${cong.diaChi})` : "(tùy chọn)"}</button>
      {mo && (
        <div className="luoi" style={{ gap: 8, marginTop: 8 }}>
          <div className="mo chu-nho">
            {vaiTro === "XA"
              ? "Cấp tỉnh gửi cho xã: địa chỉ cổng và một mã truy cập riêng của xã (bấm \"Cấp mã\" ở phần Tổng hợp tỉnh). Dán vào đây một lần; sau đó bấm \"Gửi lên cổng của tỉnh\"."
              : "Địa chỉ Worker sau khi triển khai (docs/21, mục 4) và mã quản trị đã đặt bằng lệnh wrangler secret put MA_QUAN_TRI."}
          </div>
          <label className="chu-nho tht-o">Địa chỉ cổng<input aria-label={`Địa chỉ cổng ${vaiTro}`} value={diaChi} placeholder="https://gpmb-cong-tinh.<tai-khoan>.workers.dev" onChange={(e) => setDiaChi(e.target.value)} /></label>
          <label className="chu-nho tht-o">{vaiTro === "XA" ? "Mã truy cập của xã" : "Mã quản trị"}<input type="password" autoComplete="off" aria-label={`Mã truy cập cổng ${vaiTro}`} value={ma} placeholder={cong ? "•••••• (đã lưu — dán mã mới để thay)" : ""} onChange={(e) => setMa(e.target.value)} /></label>
          <div className="nhom-nut">
            <button className="nut nut-chinh nut-nho" disabled={!diaChi.trim() || !ma.trim()} onClick={() => void luu()}>Lưu và kiểm tra kết nối</button>
            {cong && <button className="nut nut-nho" onClick={() => void kiemTraCong(cong).then((t) => { const nhac = nhacCapNhatCong(t); bao(`Kết nối tốt (${t.vaiTro === "TINH" ? "quản trị" : t.ten ?? t.ma}${t.phienBanCong ? `, mã Worker bản ${t.phienBanCong}` : ""})${nhac ? `. ${nhac}` : ""}`, nhac ? "loi" : undefined); }, (e) => bao(loiChu(e), "loi"))}>Kiểm tra lại</button>}
            {cong && <button className="nut nut-nguy nut-nho" onClick={() => { if (confirm("Xóa cài đặt cổng khỏi máy này?")) { xoaCauHinhCong(vaiTro); datCong(null); } }}>Xóa cài đặt cổng</button>}
            {vaiTro === "TINH" && <button className="nut nut-nho" onClick={() => { const u = crypto.getRandomValues(new Uint8Array(32)); setMaMoi(btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")); }}>Tạo mã quản trị ngẫu nhiên</button>}
          </div>
          {maMoi && <div className="chu-nho">Mã quản trị mới (dùng cho lệnh <code>wrangler secret put MA_QUAN_TRI</code>, rồi dán vào ô trên; cất giữ như mật khẩu):<div className="tht-ma">{maMoi}</div></div>}
          <div className="mo chu-nho">Mã lưu trên máy này{vaiTro === "XA" ? "" : ""}, mã hóa bằng tài khoản Windows khi dùng bản cài.</div>
        </div>
      )}
    </div>
  );
}

/* ================================ CẤP TỈNH ================================ */

interface DongTongHop extends TomTatDuAn {
  goi: BanGhiGoi;
}

function PhanTinh({ daCoKhoa }: { daCoKhoa: () => void }) {
  const { quyen, taiKhoan, bao, ghiNhatKy, dsDonVi } = useUngDung();
  const [khoa, setKhoa] = useState<KhoaTinh | null | undefined>(undefined);
  const [moKhoa, setMoKhoa] = useState(!!layKhoaMo());
  const [ds, setDs] = useState<BanGhiGoi[]>([]);
  const [tuyen, setTuyen] = useState<TuyenLienXa[]>([]);
  const [nhan, setNhan] = useState<DongNhanGoi[]>([]);
  const [cong, setCong] = useState<CauHinhCong | null>(() => docCauHinhCong("TINH"));
  const [dang, setDang] = useState("");
  const [loc, setLoc] = useState({ xa: "", tim: "" });
  const [ketQua, setKetQua] = useState<string[]>([]);
  const [taoMoi, setTaoMoi] = useState(false);
  const [banCu, setBanCu] = useState<BanCu[]>([]);
  const [moBanCu, setMoBanCu] = useState<string | null>(null);
  const [nguong, setNguong] = useState<number | null>(docNguong);
  const [xaCong, setXaCong] = useState<XaTrenCong[]>([]);
  const [hopBc, setHopBc] = useState(false);
  const [nhacCong, setNhacCong] = useState<string | null>(null);
  useEffect(() => {
    setNhacCong(null);
    if (!cong) return setXaCong([]);
    let bo = false;
    dsXaTrenCong(cong).then((x) => { if (!bo) setXaCong(x); }, () => undefined);
    kiemTraCong(cong).then((t) => { if (!bo) setNhacCong(nhacCapNhatCong(t)); }, () => undefined);
    return () => { bo = true; };
  }, [cong]);
  /** Gói trên cổng chưa tải về máy này (hiện nhắc khi đang khóa). */
  const [choNhan, setChoNhan] = useState<GoiTrenCong[]>([]);
  useEffect(() => {
    if (!cong || moKhoa) {
      setChoNhan([]);
      return;
    }
    let bo = false;
    dsGoiTrenCong(cong).then(
      (ds) => { if (!bo) { setChoNhan(chuaTai(ds)); datChoNhan(chuaTai(ds)); } },
      () => undefined,
    );
    return () => { bo = true; };
  }, [cong, moKhoa]);
  const napLai = async () => {
    setTuyen(await dsTuyen());
    setDs((await dsGoi()).sort((a, b) => a.donViGui.localeCompare(b.donViGui, "vi")));
    setNhan(await dsNhanGoi());
    setBanCu(await dsBanCuTatCa());
  };
  useEffect(() => {
    const f = () => void napLai();
    window.addEventListener(SU_KIEN_GOI_MOI, f);
    return () => window.removeEventListener(SU_KIEN_GOI_MOI, f);
  }, []);
  useEffect(() => {
    void docKhoaTinh().then((k) => {
      setKhoa(k);
      if (k && layKhoaMo()?.vanTay !== k.vanTay) datKhoaMo(null);
      setMoKhoa(!!layKhoaMo());
    });
    void napLai();
  }, []);
  const dong = useMemo<DongTongHop[]>(() => ds.flatMap((g) => g.tomTat.map((t) => ({ ...t, goi: g }))), [ds]);
  const doanTinh = (x: DongTongHop[]): DoanTinh[] => x.map((d) => ({ ...d, maGui: d.goi.maGui, donViGui: d.goi.donViGui, luc: d.goi.thongTin.luc }));
  const dsXa = useMemo(() => [...new Set(dong.map((d) => d.xa || "(Chưa ghi xã, phường)"))].sort((a, b) => a.localeCompare(b, "vi")), [dong]);
  const hien = useMemo(() => {
    const q = loc.tim.trim().toLowerCase();
    return dong.filter((d) => (!loc.xa || (d.xa || "(Chưa ghi xã, phường)") === loc.xa) && (!q || `${d.ten} ${d.chuDauTu} ${d.goi.donViGui}`.toLowerCase().includes(q)));
  }, [dong, loc]);
  const nhom = useMemo(() => {
    const m = new Map<string, DongTongHop[]>();
    for (const d of hien) {
      const x = d.xa || "(Chưa ghi xã, phường)";
      m.set(x, [...(m.get(x) ?? []), d]);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [hien]);
  const cham = useMemo(() => dsChamGui(ds, xaCong, nguong, new Date()), [ds, xaCong, nguong]);

  if (!quyen("CAI_DAT")) return <div className="thong-bao thong-bao-vang">Phần tổng hợp cấp tỉnh dành cho tài khoản quản trị hoặc lãnh đạo.</div>;
  if (khoa === undefined) return <div className="trong">Đang tải…</div>;
  if (!khoa) return <ThietLapKhoa xong={(k) => { setKhoa(k); daCoKhoa(); }} tenMacDinh={donViSuDung(dsDonVi)?.ten ?? ""} />;
  if (taoMoi)
    return (
      <ThietLapKhoa
        khoaCu={khoa}
        huy={() => setTaoMoi(false)}
        xong={(k) => {
          datKhoaMo(null);
          setMoKhoa(false);
          setKhoa(k);
          setTaoMoi(false);
        }}
        tenMacDinh={khoa.donVi}
      />
    );

  const canMo = () => {
    const km = layKhoaMo();
    if (!km) {
      bao("Nhập mật khẩu khóa cấp tỉnh và bấm \"Mở khóa\" trước", "loi");
      return null;
    }
    return { tinh: khoa, biMat: km.biMat };
  };
  const nhapBytes = async (bytes: Uint8Array, nguon: "TEP" | "CONG", ten: string): Promise<string> => {
    const k = canMo();
    if (!k) return `${ten}: chưa mở khóa`;
    try {
      let r: KetQuaNhap;
      try {
        r = await nhapGoi(bytes, k, nguon, { homNay: homNay() });
      } catch (e) {
        if (!(e instanceof LoiDoiKhoaKy)) throw e;
        if (!confirm(`${e.message}\n\nKhóa ký cũ: ${nhomVanTay(e.vanTayCu)}\nKhóa ký mới: ${nhomVanTay(e.thongTin.khoaKy.vanTay)}\n\nĐã xác minh với đơn vị gửi và chấp nhận gói này?`)) return `${ten}: từ chối (khóa ký đổi, chưa xác minh)`;
        r = await nhapGoi(bytes, k, nguon, { homNay: homNay(), chapNhanDoiKhoa: true });
      }
      if ("banGhi" in r) {
        await ghiNhatKy("Nhận gói dữ liệu gửi tỉnh", `${r.banGhi.donViGui} · xuất ${ngayGio(r.banGhi.thongTin.luc)} · ${r.banGhi.thongTin.soDuAn} dự án, ${r.banGhi.thongTin.soHo} hồ sơ · ${nguon === "CONG" ? "cổng" : "tệp"}`);
        return `${r.banGhi.donViGui}: ${r.loai === "MOI" ? "nhận mới" : "cập nhật"} — số liệu đến ${ngayGio(r.banGhi.thongTin.luc)} (${r.banGhi.thongTin.soDuAn} dự án, ${r.banGhi.thongTin.soHo} hồ sơ)`;
      }
      return `${r.thongTin.donViGui}: ${r.loai === "TRUNG" ? "đã có gói này" : "cũ hơn gói đang có"} — không nhập`;
    } catch (e) {
      return `${ten}: ${loiChu(e)}`;
    }
  };
  const nhapTep = async (fs: FileList | null) => {
    if (!fs?.length || !canMo()) return;
    setDang("Đang nhận gói…");
    const kq: string[] = [];
    for (const f of [...fs]) kq.push(await nhapBytes(await docTep(f), "TEP", f.name));
    setKetQua(kq);
    setDang("");
    await napLai();
  };
  const taiTuCong = async () => {
    const k = cong ? canMo() : null;
    if (!cong || !k) return;
    setDang("Đang tải gói từ cổng…");
    let kq: string[] = [];
    try {
      const r = await taiGoiMoi(cong, k, {
        homNay: homNay(),
        tienDo: (ten) => setDang(`Đang tải gói của ${ten}…`),
        xacNhanDoiKhoa: (e) => confirm(`${e.message}\n\nKhóa ký cũ: ${nhomVanTay(e.vanTayCu)}\nKhóa ký mới: ${nhomVanTay(e.thongTin.khoaKy.vanTay)}\n\nĐã xác minh với đơn vị gửi và chấp nhận gói này?`),
        khiNhan: (x) => ghiNhatKy("Nhận gói dữ liệu gửi tỉnh", `${x.banGhi.donViGui} · xuất ${ngayGio(x.banGhi.thongTin.luc)} · ${x.banGhi.thongTin.soDuAn} dự án, ${x.banGhi.thongTin.soHo} hồ sơ · cổng`),
      });
      kq = r.ketQua;
      if (!r.tongTrenCong) kq.push("Cổng chưa có gói nào.");
      else if (!kq.length) kq.push("Không có gói mới trên cổng.");
    } catch (e) {
      kq.push(loiChu(e));
    }
    setKetQua(kq);
    setDang("");
    await napLai();
  };
  /** 1.0.5: tải các bản cũ cổng còn giữ (tối đa 5 bản/xã) → các bản trước để xem diễn biến. */
  const taiBanCuTuCong = async () => {
    const k = cong ? canMo() : null;
    if (!cong || !k) return;
    setDang("Đang tải các bản trên cổng…");
    let kq: string[] = [];
    try {
      const r = await taiBanCu(cong, k, { homNay: homNay(), tienDo: (ten) => setDang(`Đang tải các bản của ${ten}…`) });
      kq = r.ketQua.length ? r.ketQua : ["Không có bản nào mới so với dữ liệu trên máy."];
      if (r.soBan) await ghiNhatKy("Tải các bản cũ từ cổng", `${r.soBan} bản`);
    } catch (e) {
      kq.push(loiChu(e).replace("Không tìm thấy (kiểm tra địa chỉ cổng)", "Cổng chưa có chức năng tải bản cũ — dán lại mã Worker mới (docs/21 mục 4)"));
    }
    setKetQua(kq);
    setDang("");
    await napLai();
  };
  const xem = async (g: BanGhiGoi, duAnId?: string, cu = false) => {
    const k = canMo();
    if (!k || !taiKhoan) return;
    setDang(`Đang mở dữ liệu ${g.donViGui}…`);
    try {
      const ban = await moGoiDaLuu(g, k);
      const khoXem = await taoKhoXem(ban);
      await ghiNhatKy("Xem dữ liệu đơn vị gửi lên tỉnh", `${g.donViGui} · số liệu đến ${ngayGio(g.thongTin.luc)}`);
      moPhienXem({ kho: khoXem, nhan: `${g.donViGui} (${cu ? "bản cũ — " : ""}số liệu đến ${ngayGio(g.thongTin.luc)})`, manDau: duAnId ? { ten: "du-an", duAnId } : undefined, quayVe: { taiKhoan, man: { ten: "tong-hop-tinh", tab: "tinh" } } });
    } catch (e) {
      bao(loiChu(e), "loi");
    } finally {
      setDang("");
    }
  };
  const xuatExcel = async () => {
    const bytes = await taoExcelTinh(hien.map((d) => ({ ...d, maGui: d.goi.maGui, donViGui: d.goi.donViGui, luc: d.goi.thongTin.luc })), khoa.donVi, false, tuyen);
    await taiXuong(bytes, tenTep(`Tong-hop-GPMB-toan-tinh_${homNay()}.xlsx`), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  };

  const tong = (f: (d: DongTongHop) => number) => hien.reduce((s, d) => s + f(d), 0);
  const tongTien = hien.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0));

  return (
    <div className="luoi" style={{ gap: 16 }}>
      {cham.length > 0 && (
        <div className="thong-bao thong-bao-do" role="alert" aria-label="Cảnh báo chậm gửi" style={{ margin: 0 }}>
          <b>{cham.length} đơn vị quá {nguong} ngày chưa gửi số liệu mới:</b>{" "}
          {cham.slice(0, 8).map((c) => `${c.ten} — ${moTaCham(c)}`).join("; ")}{cham.length > 8 ? `; … và ${cham.length - 8} đơn vị khác` : ""}.
        </div>
      )}
      {!moKhoa && choNhan.length > 0 && (
        <div className="thong-bao thong-bao-vang" role="status" aria-label="Gói chờ nhận" style={{ margin: 0 }}>
          Có <b>{choNhan.length} gói mới</b> trên cổng ({choNhan.map((g) => `${g.ten}, ${ngayGio(g.luc)}`).join("; ")}) — nhập mật khẩu khóa, bấm <b>Mở khóa</b> để nhận.
        </div>
      )}
      <div className="tht-luoi">
        <RaoLoi ten="khung Khóa cấp tỉnh">
          <TheKhoa
            khoa={khoa}
            moKhoa={moKhoa}
            datMo={(v) => {
              setMoKhoa(v);
              if (v && cong) void taiTuCong(); // mở khóa xong: tự tải gói mới từ cổng
            }}
            taoMoi={quyen("TAI_KHOAN") ? () => setTaoMoi(true) : undefined}
          />
        </RaoLoi>
        <div className="the">
          <div className="the-dau"><h3>Nhận gói của xã, phường</h3></div>
          <div className="the-than luoi" style={{ gap: 10 }}>
            <div className="chu-nho tht-o">Chọn tệp gói ({DUOI_GOI}, chọn được nhiều tệp)
              <ChonTep multiple accept={DUOI_GOI} aria-label="Chọn gói dữ liệu của xã" disabled={!moKhoa || !!dang} onChange={(e) => { void nhapTep(e.target.files); e.target.value = ""; }} />
            </div>
            {cong && <button className="nut" disabled={!moKhoa || !!dang} onClick={() => void taiTuCong()}>Tải gói mới từ cổng Cloudflare</button>}
            {cong && <button className="nut" disabled={!moKhoa || !!dang} title="Cổng giữ 5 bản gần nhất của mỗi xã — tải các bản máy này chưa có vào “các bản trước” để xem diễn biến" onClick={() => void taiBanCuTuCong()}>Tải các bản cũ trên cổng</button>}
            {!moKhoa && !choNhan.length && <div className="mo chu-nho">Mở khóa cấp tỉnh trước khi nhận gói.</div>}
            {dang && <div className="mo" role="status">{dang}</div>}
            {ketQua.length > 0 && <ul className="chu-nho" aria-label="Kết quả nhận gói" style={{ margin: 0, paddingLeft: 18 }}>{ketQua.map((k, i) => <li key={i}>{k}</li>)}</ul>}
            <div className="mo chu-nho">Mỗi đơn vị gửi giữ gói mới nhất; gói cũ hơn hoặc trùng bị bỏ qua. Gói bị sửa, sai chữ ký, mã hóa cho khóa khác đều bị từ chối.</div>
          </div>
        </div>
        <div className="the">
          <div className="the-dau"><h3>Cổng Cloudflare (tùy chọn)</h3></div>
          <div className="the-than luoi" style={{ gap: 10 }}>
            <div className="mo chu-nho">Các xã gửi gói (đã mã hóa) lên cổng của tỉnh thay cho gửi tệp. Cách triển khai: docs/21, mục 4 (một lần, miễn phí trong hạn mức của Cloudflare).</div>
            {nhacCong && <div className="thong-bao-vang chu-nho" role="status" style={{ padding: "6px 10px" }}>{nhacCong}</div>}
            <RaoLoi ten="phần cổng Cloudflare">
              <CaiDatCong vaiTro="TINH" cong={cong} datCong={setCong} />
              {cong && <MaXa cong={cong} />}
            </RaoLoi>
          </div>
        </div>
      </div>

      <div className="the">
        <div className="the-dau" style={{ flexWrap: "wrap", gap: 8 }}>
          <h3>Tổng hợp tiến độ GPMB theo xã, phường</h3>
          <div className="nhom-nut">
            <select aria-label="Lọc xã, phường" value={loc.xa} onChange={(e) => setLoc({ ...loc, xa: e.target.value })}>
              <option value="">Mọi xã, phường ({dsXa.length})</option>
              {dsXa.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <input aria-label="Tìm dự án" placeholder="Tìm dự án, chủ đầu tư, đơn vị gửi…" value={loc.tim} onChange={(e) => setLoc({ ...loc, tim: e.target.value })} />
            <button className="nut nut-nho" disabled={!hien.length} onClick={() => void xuatExcel()}>Xuất Excel</button>
            <button className="nut nut-nho nut-chinh" disabled={!hien.length} onClick={() => setHopBc(true)}>Báo cáo Word</button>
            <label className="chu-nho" title="Đơn vị quá số ngày này chưa gửi số liệu mới thì cảnh báo. Để trống = không cảnh báo." style={{ display: "flex", gap: 4, alignItems: "center" }}>
              Cảnh báo chậm gửi sau
              <input type="number" min={1} max={365} aria-label="Số ngày cảnh báo chậm gửi" style={{ width: 64 }} placeholder="—" value={nguong ?? ""} onChange={(e) => { const n = Math.floor(Number(e.target.value)); const v = n > 0 ? n : null; setNguong(v); ghiNguong(v); }} />
              ngày
            </label>
          </div>
        </div>
        <div className="the-than">
          <div className="tht-chi-so" aria-label="Chỉ số toàn tỉnh">
            <div><b>{new Set(hien.map((d) => d.goi.maGui)).size}</b><span>đơn vị gửi</span></div>
            <div><b>{new Set(hien.map((d) => d.xa)).size}</b><span>xã, phường</span></div>
            <div title="Dự án liên xã đếm một lần theo mã dùng chung"><b>{gomLienXa(doanTinh(hien), tuyen).soDuAn}</b><span>dự án</span></div>
            <div><b>{tong((d) => d.soHo)}</b><span>hộ, tổ chức</span></div>
            <div><b>{tong((d) => d.theoTrangThai.HOAN_THANH ?? 0)}</b><span>đã bàn giao mặt bằng</span></div>
            <div><b>{tong((d) => d.soVuongMac)}</b><span>hộ có vướng mắc</span></div>
            <div><b>{dinhDang(tongTien.div(1e9), 2)}</b><span>tỷ đồng tạm tính</span></div>
          </div>
          {!dong.length ? <div className="trong">Chưa nhận gói nào. Gửi tệp khóa công khai cho các xã, phường; khi nhận được gói, chọn tệp ở ô "Nhận gói".</div> : (
            <div style={{ overflowX: "auto" }}>
              <table className="bang tht-bang" aria-label="Bảng tổng hợp tỉnh">
                <thead>
                  <tr>
                    <th>Dự án</th><th>Đơn vị gửi · số liệu đến</th><th className="so">Số hộ</th><th>Hiện trạng</th><th className="so">Đã bàn giao</th><th className="so">Vướng mắc</th><th className="so">Đã duyệt PA</th><th className="so">Tạm tính (đồng)</th><th className="so">DT thu hồi (m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {nhom.map(([xa, dsx]) => [
                    <tr key={`x-${xa}`} className="tht-xa">
                      <td colSpan={2}>{xa} · {dsx.length} dự án</td>
                      <td className="so">{dsx.reduce((s, d) => s + d.soHo, 0)}</td>
                      <td />
                      <td className="so">{dsx.reduce((s, d) => s + (d.theoTrangThai.HOAN_THANH ?? 0), 0)}</td>
                      <td className="so">{dsx.reduce((s, d) => s + d.soVuongMac, 0)}</td>
                      <td className="so">{dsx.reduce((s, d) => s + d.soHoDaDuyetPA, 0)}</td>
                      <td className="so">{dinhDang(dsx.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0)), 0)}</td>
                      <td className="so">{dinhDang(dsx.reduce((s, d) => s.plus(D(d.dienTichThuHoi)), D(0)), 1)}</td>
                    </tr>,
                    ...dsx.map((d) => (
                      <tr key={`${d.goi.maGui}-${d.id}`}>
                        <td><button className="nut-chu" title="Xem chi tiết dự án như cấp xã (chỉ xem)" disabled={!moKhoa} onClick={() => void xem(d.goi, d.id)}>{d.ten}</button>{d.lienXa?.ma && <span className="nhan nhan-tim" style={{ marginLeft: 6 }} title="Dự án liên xã — xem thẻ Dự án liên xã">{d.lienXa.ma}</span>}{d.chuDauTu && <div className="mo chu-nho">{d.chuDauTu}</div>}</td>
                        <td className="chu-nho">{d.goi.donViGui}<div className="mo">{ngayGio(d.goi.thongTin.luc)}</div></td>
                        <td className="so">{d.soHo}</td>
                        <td>
                          <div className="tht-thanh" title={THU_TU_TT.filter((t) => d.theoTrangThai[t]).map((t) => `${TT_GPMB[t].ten}: ${d.theoTrangThai[t]}`).join("\n")}>
                            {THU_TU_TT.map((t) => (d.theoTrangThai[t] ? <span key={t} style={{ flex: d.theoTrangThai[t], background: TT_GPMB[t].mau }} /> : null))}
                          </div>
                        </td>
                        <td className="so">{d.theoTrangThai.HOAN_THANH ?? 0}{d.soHo ? ` (${dinhDang(D(d.theoTrangThai.HOAN_THANH ?? 0).div(d.soHo).times(100), 0)}%)` : ""}</td>
                        <td className="so">{d.soVuongMac}</td>
                        <td className="so">{d.soHoDaDuyetPA}</td>
                        <td className="so">{dinhDang(d.tongTamTinh, 0)}</td>
                        <td className="so">{dinhDang(d.dienTichThuHoi, 1)}</td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
          <div className="mo chu-nho" style={{ marginTop: 8 }}>Hiện trạng tính theo cùng quy tắc như cấp xã (tại ngày nhận gói); giá trị "tạm tính" là tổng các khoản phần mềm tính, chưa phải số đã phê duyệt. Bấm tên dự án để xem chi tiết (hồ sơ hộ, kiểm đếm, phương án, bản đồ, văn bản, tệp đính kèm) — chỉ xem.</div>
        </div>
      </div>

      <RaoLoi ten="khung Diễn biến theo tháng">
        <TheDienBienTinh ds={ds} banCu={banCu} />
      </RaoLoi>

      <RaoLoi ten="khung Dự án liên xã">
        <TheLienXaTinh doan={doanTinh(dong)} dsTuyen={tuyen} napLai={napLai} sua={quyen("CAI_DAT")} xaGoiY={dsXa} />
      </RaoLoi>

      <div className="the">
        <div className="the-dau"><h3>Đơn vị đã gửi ({ds.length})</h3></div>
        <div className="the-than" style={{ overflowX: "auto" }}>
          {!ds.length ? <div className="trong">Chưa có.</div> : (
            <table className="bang tht-bang" aria-label="Đơn vị đã gửi">
              <thead><tr><th>Đơn vị gửi</th><th>Số liệu đến</th><th className="so">Số ngày</th><th>Nhận lúc</th><th>Nguồn</th><th className="so">Dự án</th><th className="so">Hồ sơ</th><th className="so">Tệp</th><th>Khóa ký</th><th /></tr></thead>
              <tbody>
                {ds.map((g) => {
                  const cu = banCu.filter((b) => b.maGui === g.maGui).sort((a, b) => b.thongTin.luc.localeCompare(a.thongTin.luc));
                  const soNgay = soNgayTu(g.thongTin.luc, new Date());
                  return [
                  <tr key={g.maGui}>
                    <td>{g.donViGui}<div className="mo chu-nho">{g.thongTin.tenDuAn.slice(0, 3).join("; ")}{g.thongTin.tenDuAn.length > 3 ? "…" : ""}</div></td>
                    <td>{ngayGio(g.thongTin.luc)}</td>
                    <td className="so" style={nguong && soNgay > nguong ? { color: "var(--do)", fontWeight: 700 } : undefined} title={nguong && soNgay > nguong ? `Quá ${nguong} ngày chưa gửi số liệu mới` : undefined}>{soNgay}</td>
                    <td>{ngayGio(g.nhanLuc)}</td>
                    <td>{g.nguon === "CONG" ? "Cổng" : "Tệp"}</td>
                    <td className="so">{g.thongTin.soDuAn}</td>
                    <td className="so">{g.thongTin.soHo}</td>
                    <td className="so">{g.thongTin.soDinhKem}</td>
                    <td className="tht-van-tay chu-nho">{nhomVanTay(g.thongTin.khoaKy.vanTay)}</td>
                    <td className="nhom-nut">
                      <button className="nut nut-nho" disabled={!moKhoa || !!dang} onClick={() => void xem(g)}>Xem chi tiết</button>
                      <button className="nut nut-nho" disabled={!cu.length} aria-expanded={moBanCu === g.maGui} onClick={() => setMoBanCu(moBanCu === g.maGui ? null : g.maGui)}>Các bản trước ({cu.length})</button>
                      <button className="nut nut-nho nut-nguy" onClick={async () => { if (!confirm(`Xóa dữ liệu "${g.donViGui}" (kể cả các bản trước) khỏi máy tổng hợp? (Đơn vị gửi lại thì nhận lại được)`)) return; await xoaGoi(g.maGui); await ghiNhatKy("Xóa gói dữ liệu gửi tỉnh", g.donViGui); await napLai(); }}>Xóa</button>
                    </td>
                  </tr>,
                  moBanCu === g.maGui && (
                    <tr key={`${g.maGui}-cu`}>
                      <td colSpan={10} style={{ background: "var(--be-mat-2, transparent)" }}>
                        <BangBanTruoc hienTai={g} cu={cu} xem={(id) => void docBanCu(id).then((b) => (b ? xem(b, undefined, true) : bao("Không còn bản này", "loi")))} moKhoa={moKhoa && !dang} />
                      </td>
                    </tr>
                  ),
                  ];
                })}
              </tbody>
            </table>
          )}
          {nhan.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="chu-nho">Lịch sử nhận gói ({nhan.length})</summary>
              <table className="bang tht-bang"><tbody>{nhan.slice(0, 200).map((n) => <tr key={n.stt}><td>{ngayGio(n.luc)}</td><td>{n.donViGui}</td><td>xuất {ngayGio(n.lucXuat)}</td><td>{n.nguon === "CONG" ? "cổng" : "tệp"}</td><td>{n.ketQua}</td></tr>)}</tbody></table>
            </details>
          )}
        </div>
      </div>
      {hopBc && (
        <HopBaoCaoTinh
          dong={() => setHopBc(false)}
          tenCoQuan={khoa.donVi}
          dong_={hien.map((d) => ({ ...d, maGui: d.goi.maGui, donViGui: d.goi.donViGui, luc: d.goi.thongTin.luc }))}
          tuyen={tuyen}
          phamVi={loc.xa || "tỉnh"}
          soDonVi={new Set(hien.map((d) => d.goi.maGui)).size}
          cham={cham}
          nguong={nguong}
          dienBien={dienBienTinh([...ds, ...banCu].map((b) => ({ maGui: b.maGui, luc: b.thongTin.luc, tomTat: b.tomTat })), loc.xa ? { loai: "XA", xa: loc.xa } : { loai: "TINH" })}
        />
      )}
    </div>
  );
}

/** So sánh bản hiện tại với các bản gửi trước của một đơn vị (số liệu tóm tắt, không cần mở khóa). */
function BangBanTruoc({ hienTai, cu, xem, moKhoa }: { hienTai: BanGhiGoi; cu: BanCu[]; xem: (id: number) => void; moKhoa: boolean }) {
  const tong = (b: { tomTat: TomTatDuAn[] }) => ({
    soDuAn: b.tomTat.length,
    soHo: b.tomTat.reduce((s, d) => s + d.soHo, 0),
    banGiao: b.tomTat.reduce((s, d) => s + (d.theoTrangThai.HOAN_THANH ?? 0), 0),
    vuongMac: b.tomTat.reduce((s, d) => s + d.soVuongMac, 0),
    duyet: b.tomTat.reduce((s, d) => s + d.soHoDaDuyetPA, 0),
    tien: b.tomTat.reduce((s, d) => s.plus(D(d.tongTamTinh)), D(0)),
  });
  const ht = tong(hienTai);
  const lech = (a: number, b: number) => (a === b ? "" : ` (${a > b ? "+" : ""}${a - b})`);
  return (
    <div className="luoi" style={{ gap: 6 }}>
      <div className="chu-nho"><b>Các bản gửi của {hienTai.donViGui}</b> — máy này giữ tối đa {GIU_BAN_CU} bản gần nhất; số trong ngoặc là thay đổi của bản mới nhất so với bản đó.</div>
      <table className="bang tht-bang chu-nho" aria-label="Các bản trước">
        <thead><tr><th>Số liệu đến</th><th>Nhận lúc</th><th className="so">Dự án</th><th className="so">Hồ sơ</th><th className="so">Đã bàn giao</th><th className="so">Vướng mắc</th><th className="so">Đã duyệt PA</th><th className="so">Tạm tính (đồng)</th><th /></tr></thead>
        <tbody>
          <tr style={{ fontWeight: 600 }}>
            <td>{ngayGio(hienTai.thongTin.luc)} (mới nhất)</td><td>{ngayGio(hienTai.nhanLuc)}</td>
            <td className="so">{ht.soDuAn}</td><td className="so">{ht.soHo}</td><td className="so">{ht.banGiao}</td><td className="so">{ht.vuongMac}</td><td className="so">{ht.duyet}</td><td className="so">{dinhDang(ht.tien, 0)}</td><td />
          </tr>
          {cu.map((b) => {
            const t = tong(b);
            return (
              <tr key={b.id}>
                <td>{ngayGio(b.thongTin.luc)}</td><td>{ngayGio(b.nhanLuc)}</td>
                <td className="so">{t.soDuAn}</td><td className="so">{t.soHo}</td>
                <td className="so">{t.banGiao}<span className="mo">{lech(ht.banGiao, t.banGiao)}</span></td>
                <td className="so">{t.vuongMac}<span className="mo">{lech(ht.vuongMac, t.vuongMac)}</span></td>
                <td className="so">{t.duyet}<span className="mo">{lech(ht.duyet, t.duyet)}</span></td>
                <td className="so">{dinhDang(t.tien, 0)}</td>
                <td><button className="nut nut-nho" disabled={!moKhoa} onClick={() => xem(b.id)}>Xem chi tiết</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Tạo khóa cấp tỉnh lần đầu; hoặc tạo khóa mới thay khóa cũ (`khoaCu`: quên mật khẩu khóa, nghi lộ khóa). */
function ThietLapKhoa({ xong, tenMacDinh, khoaCu, huy }: { xong: (k: KhoaTinh) => void; tenMacDinh: string; khoaCu?: KhoaTinh; huy?: () => void }) {
  const { taiKhoan, bao, ghiNhatKy, quyen } = useUngDung();
  const [ten, setTen] = useState(tenMacDinh);
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [dang, setDang] = useState(false);
  const loi = mk ? loiMatKhau(mk) : null;
  const tao = async () => {
    if (khoaCu && !confirm(`Thay khóa cấp tỉnh (vân tay ${nhomVanTay(khoaCu.vanTay)}) bằng khóa mới?\n\n- Các gói đã nhận vẫn giữ số liệu tổng hợp, nhưng KHÔNG xem chi tiết được nữa (mã hóa cho khóa cũ).\n- Các gói trên cổng chưa tải về cũng không mở được.\n- Phải gửi khóa công khai MỚI cho các xã; các xã nhập lại khóa rồi gửi lại gói.\n\nTiếp tục?`)) return;
    setDang(true);
    try {
      const k = await taoKhoaTinh(mk, ten, taiKhoan?.ten ?? "");
      await luuKhoaTinh(k);
      await ghiNhatKy(khoaCu ? "Thay khóa cấp tỉnh (tạo khóa mới)" : "Tạo khóa cấp tỉnh (tổng hợp dữ liệu các xã)", `${k.donVi} · vân tay ${nhomVanTay(k.vanTay)}${khoaCu ? ` · thay khóa ${nhomVanTay(khoaCu.vanTay)}` : ""}`);
      bao(khoaCu ? "Đã tạo khóa mới — xuất khóa công khai mới gửi các xã, xuất bản dự phòng khóa và cất giữ" : "Đã tạo khóa cấp tỉnh — xuất bản dự phòng khóa và cất giữ an toàn");
      xong(k);
    } catch (e) {
      bao(loiChu(e), "loi");
    } finally {
      setDang(false);
    }
  };
  const khoiPhuc = async (f: File | undefined) => {
    if (!f) return;
    try {
      const { duPhong } = docTepKhoa(await f.text());
      if (!duPhong) throw new LoiGoiTinh("Đây là tệp khóa công khai (gửi các xã) — cần tệp DỰ PHÒNG khóa (có khóa bí mật).");
      if (khoaCu && duPhong.vanTay !== khoaCu.vanTay && !confirm(`Thay khóa hiện tại (${nhomVanTay(khoaCu.vanTay)}) bằng khóa trong bản dự phòng (${nhomVanTay(duPhong.vanTay)})?`)) return;
      await luuKhoaTinh(duPhong);
      await ghiNhatKy("Khôi phục khóa cấp tỉnh từ bản dự phòng", `${duPhong.donVi} · vân tay ${nhomVanTay(duPhong.vanTay)}`);
      xong(duPhong);
    } catch (e) {
      bao(loiChu(e), "loi");
    }
  };
  if (!quyen("TAI_KHOAN")) return <div className="thong-bao thong-bao-vang">Máy này chưa có khóa cấp tỉnh. Tài khoản quản trị tạo khóa (làm một lần trên máy tổng hợp của tỉnh).</div>;
  return (
    <div className="tht-luoi">
      <div className="the">
        <div className="the-dau"><h3>{khoaCu ? "Tạo khóa mới (thay khóa cũ)" : "Tạo khóa cấp tỉnh (làm một lần)"}</h3></div>
        <div className="the-than luoi" style={{ gap: 10 }}>
          {khoaCu && (
            <div className="thong-bao thong-bao-do chu-nho" style={{ margin: 0 }}>
              Dùng khi quên mật khẩu khóa hoặc nghi khóa bị lộ. Khóa hiện tại: <b className="tht-van-tay">{nhomVanTay(khoaCu.vanTay)}</b>. Sau khi thay: gói đã nhận chỉ còn số liệu tổng hợp (không xem chi tiết được); phải gửi <b>khóa công khai mới</b> cho các xã, các xã nhập lại khóa và gửi lại gói.
            </div>
          )}
          <div className="chu-nho">Khóa gồm hai phần: <b>khóa công khai</b> gửi cho các xã để mã hóa gói; <b>khóa bí mật</b> ở lại máy này, bảo vệ bằng mật khẩu khóa — chỉ máy này (khi nhập đúng mật khẩu) mở được gói của xã.</div>
          <label className="chu-nho tht-o">Tên đơn vị tổng hợp<input aria-label="Tên đơn vị tổng hợp" value={ten} placeholder="vd. Sở Nông nghiệp và Môi trường tỉnh Sơn La" onChange={(e) => setTen(e.target.value)} /></label>
          <label className="chu-nho tht-o">Mật khẩu khóa<input type="password" aria-label="Mật khẩu khóa mới" value={mk} onChange={(e) => setMk(e.target.value)} /></label>
          <label className="chu-nho tht-o">Nhập lại mật khẩu<input type="password" aria-label="Nhập lại mật khẩu khóa" value={mk2} onChange={(e) => setMk2(e.target.value)} /></label>
          {loi && <div className="chu-nho" style={{ color: "var(--do)" }}>{loi}</div>}
          {mk2 && mk !== mk2 && <div className="chu-nho" style={{ color: "var(--do)" }}>Hai lần nhập không khớp</div>}
          <div className="thong-bao thong-bao-vang chu-nho" style={{ margin: 0 }}>Quên mật khẩu khóa hoặc mất máy mà không có bản dự phòng: không mở được các gói đã nhận — phải tạo khóa mới và các xã gửi lại.</div>
          <div className="nhom-nut">
            <button className="nut nut-chinh" disabled={dang || !ten.trim() || !mk || !!loi || mk !== mk2} onClick={() => void tao()}>{dang ? "Đang tạo khóa…" : khoaCu ? "Tạo khóa mới" : "Tạo khóa cấp tỉnh"}</button>
            {huy && <button className="nut" disabled={dang} onClick={huy}>Hủy, giữ khóa cũ</button>}
          </div>
        </div>
      </div>
      <div className="the">
        <div className="the-dau"><h3>Hoặc khôi phục khóa đã có</h3></div>
        <div className="the-than luoi" style={{ gap: 10 }}>
          <div className="mo chu-nho">Chuyển sang máy tổng hợp mới: chọn tệp dự phòng khóa đã xuất trước đây ({DUOI_KHOA}, loại "dự phòng").</div>
          <ChonTep accept={`${DUOI_KHOA},.json`} aria-label="Chọn tệp dự phòng khóa" onChange={(e) => void khoiPhuc(e.target.files?.[0])} />
        </div>
      </div>
    </div>
  );
}

function TheKhoa({ khoa, moKhoa, datMo, taoMoi }: { khoa: KhoaTinh; moKhoa: boolean; datMo: (v: boolean) => void; taoMoi?: () => void }) {
  const { bao, ghiNhatKy } = useUngDung();
  const [mk, setMk] = useState("");
  const [dang, setDang] = useState(false);
  const mo = async () => {
    setDang(true);
    const bm = await moKhoaTinh(khoa, mk);
    setDang(false);
    if (!bm) return bao("Mật khẩu khóa không đúng", "loi");
    datKhoaMo({ vanTay: khoa.vanTay, biMat: bm });
    setMk("");
    datMo(true);
  };
  const ten = khoa.donVi.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^A-Za-z0-9]+/g, "-").slice(0, 40);
  return (
    <div className="the">
      <div className="the-dau"><h3>Khóa cấp tỉnh</h3><span className={`nhan ${moKhoa ? "nhan-xanh" : ""}`}>{moKhoa ? "Đã mở khóa" : "Đang khóa"}</span></div>
      <div className="the-than luoi" style={{ gap: 10 }}>
        <div>{khoa.donVi}</div>
        <div>Vân tay: <span className="tht-van-tay" aria-label="Vân tay khóa cấp tỉnh">{nhomVanTay(khoa.vanTay)}</span></div>
        {moKhoa ? (
          <button className="nut nut-nho" onClick={() => { datKhoaMo(null); datMo(false); }}>Khóa lại</button>
        ) : (
          <div className="nhom-nut">
            <input type="password" aria-label="Mật khẩu khóa cấp tỉnh" placeholder="Mật khẩu khóa" value={mk} onChange={(e) => setMk(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void mo()} />
            <button className="nut nut-chinh" disabled={!mk || dang} onClick={() => void mo()}>{dang ? "Đang mở…" : "Mở khóa"}</button>
          </div>
        )}
        <div className="nhom-nut">
          <button className="nut nut-nho" onClick={async () => { if (await taiXuong(new TextEncoder().encode(tepKhoaCongKhai(khoa)), `Khoa-cong-khai_${ten}${DUOI_KHOA}`, "application/json")) await ghiNhatKy("Xuất khóa công khai cấp tỉnh", nhomVanTay(khoa.vanTay)); }}>Xuất khóa công khai gửi các xã</button>
          <button className="nut nut-nho" onClick={async () => { if (!confirm("Bản dự phòng chứa khóa bí mật (đã mã hóa bằng mật khẩu khóa). Chỉ cất vào USB, két — KHÔNG gửi cho xã. Tiếp tục?")) return; if (await taiXuong(new TextEncoder().encode(tepDuPhongKhoa(khoa)), `DU-PHONG-khoa-tinh_${ten}${DUOI_KHOA}`, "application/json")) await ghiNhatKy("Xuất bản dự phòng khóa cấp tỉnh", nhomVanTay(khoa.vanTay)); }}>Xuất bản dự phòng khóa</button>
        </div>
        <div className="mo chu-nho">Gửi tệp khóa công khai cho các xã (thư điện tử, Zalo…) và đọc vân tay qua điện thoại để xã đối chiếu. Khóa công khai không bí mật; mật khẩu khóa không bao giờ rời máy này.</div>
        {taoMoi && (
          <div className="chu-nho" style={{ borderTop: "1px solid var(--vien)", paddingTop: 8 }}>
            Quên mật khẩu khóa? <button className="nut nut-nho nut-nguy" onClick={taoMoi}>Tạo khóa mới (thay khóa cũ)…</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Quản lý mã truy cập cổng của các xã (cấp mới, cấp lại, thu hồi). */
function MaXa({ cong }: { cong: CauHinhCong }) {
  const { bao, ghiNhatKy } = useUngDung();
  const [ds, setDs] = useState<XaTrenCong[] | null>(null);
  const [ten, setTen] = useState("");
  const [moi, setMoi] = useState<{ ten: string; token: string } | null>(null);
  const napLai = () => dsXaTrenCong(cong).then(setDs, (e) => bao(loiChu(e), "loi"));
  useEffect(() => void napLai(), [cong]); // eslint-disable-line react-hooks/exhaustive-deps
  const cap = async () => {
    const ma = maTuTen(ten);
    if (ma.length < 2) return bao("Tên xã không hợp lệ", "loi");
    if (ds?.some((x) => x.ma === ma && !x.thuHoi) && !confirm(`"${ten}" đã có mã. Cấp lại sẽ làm mã cũ hết hiệu lực. Tiếp tục?`)) return;
    try {
      const r = await capMaXa(cong, ma, ten.trim());
      setMoi({ ten: ten.trim(), token: r.token });
      await ghiNhatKy("Cấp mã truy cập cổng tỉnh cho xã", `${ten.trim()} (${ma})`);
      setTen("");
      await napLai();
    } catch (e) {
      bao(loiChu(e), "loi");
    }
  };
  return (
    <div className="luoi" style={{ gap: 8 }}>
      <div className="chu-nho"><b>Mã truy cập của các xã</b></div>
      <div className="nhom-nut">
        <input aria-label="Xã cấp mã" list="ds-xa-cong" placeholder="Chọn hoặc nhập tên xã, phường" value={ten} onChange={(e) => setTen(e.target.value)} />
        <datalist id="ds-xa-cong">{(DANH_MUC_XA as string[]).map((x) => <option key={x} value={x} />)}</datalist>
        <button className="nut nut-nho nut-chinh" disabled={!ten.trim()} onClick={() => void cap()}>Cấp mã</button>
      </div>
      {moi && (
        <div className="thong-bao chu-nho" style={{ margin: 0 }}>
          Mã truy cập của <b>{moi.ten}</b> (chỉ hiện một lần — gửi cho xã cùng địa chỉ cổng <code>{cong.diaChi}</code>):
          <div className="tht-ma" aria-label="Mã truy cập vừa cấp">{moi.token}</div>
          <button className="nut nut-nho" onClick={() => void navigator.clipboard?.writeText(`Địa chỉ cổng: ${cong.diaChi}\nMã truy cập: ${moi.token}`).then(() => bao("Đã sao chép"))}>Sao chép địa chỉ và mã</button>
        </div>
      )}
      {ds && ds.length > 0 && (
        <table className="bang tht-bang chu-nho">
          <tbody>
            {ds.map((x) => (
              <tr key={x.ma}>
                <td>{x.ten}</td>
                <td>{x.thuHoi ? `Đã thu hồi ${ngayGio(x.thuHoi)}` : x.goiCuoi ? `Gửi lần cuối ${ngayGio(x.goiCuoi)}` : "Chưa gửi"}</td>
                <td>{!x.thuHoi && <button className="nut nut-nho nut-nguy" onClick={async () => { if (!confirm(`Thu hồi mã của ${x.ten}? Xã không gửi lên cổng được nữa cho đến khi cấp mã mới.`)) return; try { await thuHoiXa(cong, x.ma); await ghiNhatKy("Thu hồi mã truy cập cổng tỉnh của xã", x.ten); await napLai(); } catch (e) { bao(loiChu(e), "loi"); } }}>Thu hồi</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

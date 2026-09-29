import { useState } from "react";
import { useUngDung } from "../ung-dung";
import { laKhoMang } from "../kho-mang";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";
import { LoiCanMatKhau, LoiSaoLuu, docBanSaoLuu, thongTinMaHoa, khoiPhuc, maHoaBanSaoLuu, taoBanSaoLuu, tenTepSaoLuu, type BanSaoLuu, type ThongTinMaHoa } from "../sao-luu";
import { loiMatKhau, moTaCachMo, type KhoaKhoiPhuc } from "../ma-hoa";
import { KHOA_KHOI_PHUC, cachTuDong, dpapiMoNeuCo } from "../tu-dong-sao-luu";

const ZIP = "application/octet-stream";
const ngayGio = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour12: false });

/** Hộp thoại sao lưu, khôi phục dữ liệu. Tệp chỉ tạo/đọc trên máy, không gửi ra ngoài. */
export function HopSaoLuu() {
  const { kho, moSaoLuu, lanSaoLuu, datLanSaoLuu, taiLai, di, dsDuAn, hoCua, quyen, ghiNhatKy } = useUngDung();
  const [dangLam, setDangLam] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: "ok" | "loi"; noiDung: string } | null>(null);
  const [ban, setBan] = useState<{ ten: string; ban: BanSaoLuu; maHoa: boolean } | null>(null);
  const [cheDo, setCheDo] = useState<"THAY_THE" | "GOP">("THAY_THE");
  const [xacNhan, setXacNhan] = useState(false);
  const soHoHienCo = dsDuAn.reduce((s, d) => s + hoCua(d.id).length, 0);
  // Mã hóa (P0-5): mật khẩu sao lưu bắt buộc; Quản trị được xuất không mã hóa kèm xác nhận, ghi nhật ký
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [khongMaHoa, setKhongMaHoa] = useState(false);
  const [xnKhongMaHoa, setXnKhongMaHoa] = useState(false);
  const loiMk = khongMaHoa ? null : loiMatKhau(mk) ?? (mk !== mk2 ? "Hai lần nhập mật khẩu không khớp" : null);
  // Khôi phục tệp mã hóa: chờ mật khẩu
  const [cho, setCho] = useState<{ ten: string; bytes: Uint8Array; tt: ThongTinMaHoa } | null>(null);
  const [mkMo, setMkMo] = useState("");

  /** Tạo tệp: `matKhau` (sao lưu thủ công), không có → cách tự động (khóa khôi phục + DPAPI), "KHONG" → không mã hóa. */
  const saoLuu = async (tienTo?: string, matKhau?: string | "KHONG") => {
    const ban = await taoBanSaoLuu(kho);
    const khoiPhucKhoa = await kho.docCaiDat<KhoaKhoiPhuc>(KHOA_KHOI_PHUC);
    const bytes = matKhau === "KHONG" ? ban.bytes : await maHoaBanSaoLuu(ban, matKhau ? { matKhau, khoiPhuc: khoiPhucKhoa } : await cachTuDong(kho));
    // null: cán bộ bấm Hủy ở hộp thoại chọn nơi lưu
    return (await taiXuong(bytes, tenTepSaoLuu(ban.thongTin.luc, tienTo), ZIP)) ? ban.thongTin : null;
  };

  const taoBan = async () => {
    setDangLam(true);
    setThongBao(null);
    try {
      if (loiMk) return setThongBao({ loai: "loi", noiDung: loiMk });
      if (khongMaHoa && (!quyen("XUAT_KHONG_MA_HOA") || !xnKhongMaHoa)) return setThongBao({ loai: "loi", noiDung: "Xuất không mã hóa: chỉ Quản trị, cần đánh dấu xác nhận" });
      const tt = await saoLuu(khongMaHoa ? "GPMB-KHONG-MA-HOA" : undefined, khongMaHoa ? "KHONG" : mk);
      if (!tt) return setThongBao({ loai: "loi", noiDung: "Đã hủy — chưa tạo bản sao lưu." });
      datLanSaoLuu(tt.luc);
      await ghiNhatKy(khongMaHoa ? "Xuất bản sao lưu KHÔNG MÃ HÓA" : "Tạo bản sao lưu (mã hóa)", `${tt.soDuAn} dự án, ${tt.soHo} hồ sơ, ${tt.soBanDo} bản đồ, ${tt.soMau} mẫu`);
      setMk("");
      setMk2("");
      setThongBao({ loai: "ok", noiDung: `Đã tạo bản sao lưu: ${tt.soDuAn} dự án, ${tt.soHo} hồ sơ, ${tt.soBanDo} bản đồ, ${tt.soMau} mẫu tự chỉnh. Hãy cất tệp .gpmb ra thiết bị khác (USB, ổ mạng nội bộ).` });
    } catch (e) {
      setThongBao({ loai: "loi", noiDung: `Không tạo được bản sao lưu: ${(e as Error).message}` });
    } finally {
      setDangLam(false);
    }
  };

  const chonTep = async (f: File | undefined) => {
    setBan(null);
    setThongBao(null);
    setXacNhan(false);
    setCho(null);
    setMkMo("");
    if (!f) return;
    const bytes = new Uint8Array(await f.arrayBuffer());
    try {
      setBan({ ten: f.name, ban: await docBanSaoLuu(bytes, { dpapiMo: dpapiMoNeuCo() }), maHoa: !!thongTinMaHoa(bytes) });
    } catch (e) {
      if (e instanceof LoiCanMatKhau) return setCho({ ten: f.name, bytes, tt: e.thongTin });
      setThongBao({ loai: "loi", noiDung: e instanceof LoiSaoLuu ? e.message : `Không đọc được tệp: ${(e as Error).message}` });
    }
  };

  const moBangMatKhau = async () => {
    if (!cho) return;
    setDangLam(true);
    setThongBao(null);
    try {
      setBan({ ten: cho.ten, ban: await docBanSaoLuu(cho.bytes, { matKhau: mkMo, dpapiMo: dpapiMoNeuCo() }), maHoa: true });
      setCho(null);
      setMkMo("");
    } catch (e) {
      setThongBao({ loai: "loi", noiDung: (e as Error).message });
    } finally {
      setDangLam(false);
    }
  };

  const khoiPhucNgay = async () => {
    if (!ban || !quyen("KHOI_PHUC")) return;
    setDangLam(true);
    setThongBao(null);
    try {
      // bản sao lưu an toàn của dữ liệu hiện có trước khi thay thế
      if (cheDo === "THAY_THE" && dsDuAn.length && !(await saoLuu("GPMB-truoc-khoi-phuc")))
        return setThongBao({ loai: "loi", noiDung: "Chưa lưu bản sao lưu an toàn của dữ liệu hiện có (đã bấm Hủy) — chưa khôi phục. Chọn nơi lưu để tiếp tục." });
      await ghiNhatKy("Khôi phục dữ liệu – bắt đầu", `${ban.ten} (${cheDo === "THAY_THE" ? "thay thế" : "gộp"}); sao lưu lúc ${ban.ban.thongTin.luc}`);
      await khoiPhuc(kho, ban.ban, cheDo);
      await taiLai();
      await ghiNhatKy("Khôi phục dữ liệu – xong", `${ban.ban.thongTin.soDuAn} dự án, ${ban.ban.thongTin.soHo} hồ sơ`);
      di({ ten: "tong-quan" });
      const t = ban.ban.thongTin;
      setThongBao({ loai: "ok", noiDung: `Đã khôi phục ${t.soDuAn} dự án, ${t.soHo} hồ sơ, ${t.soBanDo} bản đồ, ${t.soMau} mẫu tự chỉnh (${cheDo === "THAY_THE" ? "thay thế toàn bộ" : "gộp vào dữ liệu hiện có"}).` });
      setBan(null);
    } catch (e) {
      setThongBao({ loai: "loi", noiDung: `Khôi phục không thành công: ${(e as Error).message}. Nếu dữ liệu hiện tại bị ảnh hưởng, dùng tệp "GPMB-truoc-khoi-phuc" vừa tải về để khôi phục lại.` });
      await taiLai();
    } finally {
      setDangLam(false);
      setXacNhan(false);
    }
  };

  return (
    <HopThoai tieuDe="Sao lưu, khôi phục dữ liệu" dong={() => moSaoLuu(false)} rong={720}>
      <p className="mo-ta mt-0">
        Toàn bộ dữ liệu (dự án, hồ sơ hộ, bản đồ đã nạp, mẫu văn bản tự chỉnh) được đóng thành một tệp <b>.gpmb</b> trên máy này. Phần mềm không gửi tệp đi đâu; cán bộ tự cất giữ tệp theo quy định bảo mật của cơ quan (tệp có thông tin cá nhân của người có đất thu hồi).
      </p>

      {quyen("SAO_LUU") && <div className="the" style={{ padding: 14, marginBottom: 12 }}>
        <h3 className="mt-0">Tạo bản sao lưu</h3>
        <div className="mo-ta">
          Dữ liệu hiện có: {dsDuAn.length} dự án, {soHoHienCo} hồ sơ. Lần sao lưu gần nhất: <b>{lanSaoLuu ? ngayGio(lanSaoLuu) : "chưa có"}</b>.
        </div>
        <div className="luoi luoi-2 mt-10">
          <div className="o-nhap"><label>Mật khẩu sao lưu</label><input type="password" autoComplete="new-password" disabled={khongMaHoa} value={mk} onChange={(e) => setMk(e.target.value)} /></div>
          <div className="o-nhap"><label>Nhập lại mật khẩu</label><input type="password" autoComplete="new-password" disabled={khongMaHoa} value={mk2} onChange={(e) => setMk2(e.target.value)} /></div>
        </div>
        <p className="mo chu-nho" style={{ margin: "6px 0" }}>
          Tệp được mã hóa AES-256 (tối thiểu 12 ký tự, có chữ và số, hoặc cụm từ từ 16 ký tự). <b>Quên mật khẩu là không mở được tệp</b> — trừ khi quản trị đã đặt <i>mật khẩu khôi phục</i> (Cài đặt chung → Tự động sao lưu): khi đó tệp mở được bằng một trong hai mật khẩu.
        </p>
        {quyen("XUAT_KHONG_MA_HOA") && (
          <div className="thong-bao thong-bao-vang" style={{ margin: "8px 0" }}>
            <label><input type="checkbox" checked={khongMaHoa} onChange={(e) => { setKhongMaHoa(e.target.checked); setXnKhongMaHoa(false); }} /> Xuất <b>không mã hóa</b> (chỉ Quản trị)</label>
            {khongMaHoa && (
              <label style={{ display: "block", marginTop: 6 }}>
                <input type="checkbox" checked={xnKhongMaHoa} onChange={(e) => setXnKhongMaHoa(e.target.checked)} /> Tôi hiểu tệp chứa họ tên, số định danh, điện thoại của người dân ở dạng đọc được; tự chịu trách nhiệm bảo quản theo quy định về bảo vệ dữ liệu cá nhân. Việc xuất được ghi nhật ký hệ thống.
              </label>
            )}
          </div>
        )}
        {!khongMaHoa && mk && loiMk && <div className="chu-do chu-nho">{loiMk}</div>}
        <button className="nut nut-chinh mt-10" disabled={dangLam || !dsDuAn.length || !!loiMk || (khongMaHoa && !xnKhongMaHoa)} onClick={taoBan}>
          {khongMaHoa ? "Tạo bản sao lưu KHÔNG mã hóa" : "Tạo bản sao lưu mã hóa (.gpmb)"}
        </button>
      </div>}

      {!quyen("KHOI_PHUC") && <p className="mo chu-nho">Khôi phục dữ liệu chỉ dành cho tài khoản Quản trị.</p>}
      {quyen("KHOI_PHUC") && <div className="the" style={{ padding: 14 }}>
        <h3 className="mt-0">Khôi phục từ tệp sao lưu</h3>
        {laKhoMang(kho) && !kho.noiBo && <div className="thong-bao thong-bao-vang">Đang làm việc trên <b>máy chủ mạng nội bộ</b>: khôi phục thay đổi dữ liệu chung của mọi người dùng.</div>}
        <input type="file" accept=".gpmb,application/zip" aria-label="Chọn tệp sao lưu" disabled={dangLam} onChange={(e) => void chonTep(e.target.files?.[0])} />
        {cho && (
          <div className="mt-10">
            <div className="mo chu-nho">Tệp <b>{cho.ten}</b> đã mã hóa (sao lưu lúc {ngayGio(cho.tt.luc)}; {cho.tt.soDuAn} dự án, {cho.tt.soHo} hồ sơ). Mở bằng {moTaCachMo(cho.tt.maHoa)}.</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input type="password" placeholder="Mật khẩu sao lưu hoặc mật khẩu khôi phục" value={mkMo} onChange={(e) => setMkMo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void moBangMatKhau()} className="gian" />
              <button className="nut nut-chinh" disabled={dangLam || !mkMo} onClick={() => void moBangMatKhau()}>{dangLam ? "Đang mở…" : "Mở tệp"}</button>
            </div>
          </div>
        )}
        {ban && (
          <div className="mt-12">
            <table className="bang">
              <tbody>
                <tr><th>Tệp</th><td>{ban.ten}</td></tr>
                <tr><th>Thời điểm sao lưu</th><td>{ngayGio(ban.ban.thongTin.luc)}</td></tr>
                <tr><th>Nội dung</th><td>{ban.ban.thongTin.soDuAn} dự án, {ban.ban.thongTin.soHo} hồ sơ, {ban.ban.thongTin.soBanDo} bản đồ, {ban.ban.thongTin.soMau} mẫu tự chỉnh</td></tr>
                <tr><th>Kiểm tra toàn vẹn</th><td><span className="nhan nhan-xanh">Khớp mã SHA-256</span><span className="mo chu-nho"> · {ban.maHoa ? "tệp đã mã hóa" : "tệp KHÔNG mã hóa — sau khi khôi phục nên xóa tệp này và sao lưu lại bản mã hóa"}</span></td></tr>
                <tr><th>Dự án trong tệp</th><td>{ban.ban.duAn.map((d) => d.ten).join("; ") || "—"}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              <label>
                <input type="radio" name="che-do" checked={cheDo === "THAY_THE"} onChange={() => setCheDo("THAY_THE")} /> <b>Thay thế toàn bộ</b> — xóa dữ liệu hiện có trên máy rồi nạp bản sao lưu. Trước khi xóa, phần mềm lưu một bản sao lưu dữ liệu hiện có (tệp "GPMB-truoc-khoi-phuc…", mã hóa bằng mật khẩu khôi phục / tài khoản Windows).
              </label>
              <label>
                <input type="radio" name="che-do" checked={cheDo === "GOP"} onChange={() => setCheDo("GOP")} /> <b>Gộp</b> — giữ dữ liệu hiện có; dự án, hồ sơ trùng mã định danh sẽ bị ghi đè bằng bản trong tệp.
              </label>
            </div>
            <label style={{ display: "block", marginTop: 10 }}>
              <input type="checkbox" checked={xacNhan} onChange={(e) => setXacNhan(e.target.checked)} /> Tôi đã kiểm tra thông tin tệp và đồng ý khôi phục.
            </label>
            <button className="nut nut-chinh mt-10" disabled={dangLam || !xacNhan} onClick={khoiPhucNgay}>
              Khôi phục
            </button>
          </div>
        )}
      </div>}

      {thongBao && (
        <div className={`nhan ${thongBao.loai === "ok" ? "nhan-xanh" : "nhan-do"}`} role="status" style={{ display: "block", marginTop: 12, padding: "8px 10px", whiteSpace: "normal", lineHeight: 1.5 }}>
          {thongBao.noiDung}
        </div>
      )}
    </HopThoai>
  );
}

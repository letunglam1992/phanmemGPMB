import { useState } from "react";
import { useUngDung } from "../ung-dung";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";
import { LoiSaoLuu, docBanSaoLuu, khoiPhuc, taoBanSaoLuu, tenTepSaoLuu, type BanSaoLuu } from "../sao-luu";

const ZIP = "application/octet-stream";
const ngayGio = (iso: string) => new Date(iso).toLocaleString("vi-VN", { hour12: false });

/** Hộp thoại sao lưu, khôi phục dữ liệu. Tệp chỉ tạo/đọc trên máy, không gửi ra ngoài. */
export function HopSaoLuu() {
  const { kho, moSaoLuu, lanSaoLuu, datLanSaoLuu, taiLai, di, dsDuAn, hoCua, quyen, ghiNhatKy } = useUngDung();
  const [dangLam, setDangLam] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: "ok" | "loi"; noiDung: string } | null>(null);
  const [ban, setBan] = useState<{ ten: string; ban: BanSaoLuu } | null>(null);
  const [cheDo, setCheDo] = useState<"THAY_THE" | "GOP">("THAY_THE");
  const [xacNhan, setXacNhan] = useState(false);
  const soHoHienCo = dsDuAn.reduce((s, d) => s + hoCua(d.id).length, 0);

  const saoLuu = async (tienTo?: string) => {
    const { bytes, thongTin } = await taoBanSaoLuu(kho);
    taiXuong(bytes, tenTepSaoLuu(thongTin.luc, tienTo), ZIP);
    return thongTin;
  };

  const taoBan = async () => {
    setDangLam(true);
    setThongBao(null);
    try {
      const tt = await saoLuu();
      datLanSaoLuu(tt.luc);
      await ghiNhatKy("Tạo bản sao lưu", `${tt.soDuAn} dự án, ${tt.soHo} hồ sơ, ${tt.soBanDo} bản đồ, ${tt.soMau} mẫu`);
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
    if (!f) return;
    try {
      setBan({ ten: f.name, ban: await docBanSaoLuu(new Uint8Array(await f.arrayBuffer())) });
    } catch (e) {
      setThongBao({ loai: "loi", noiDung: e instanceof LoiSaoLuu ? e.message : `Không đọc được tệp: ${(e as Error).message}` });
    }
  };

  const khoiPhucNgay = async () => {
    if (!ban || !quyen("KHOI_PHUC")) return;
    setDangLam(true);
    setThongBao(null);
    try {
      // bản sao lưu an toàn của dữ liệu hiện có trước khi thay thế
      if (cheDo === "THAY_THE" && dsDuAn.length) await saoLuu("GPMB-truoc-khoi-phuc");
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
      <p className="mo-ta" style={{ marginTop: 0 }}>
        Toàn bộ dữ liệu (dự án, hồ sơ hộ, bản đồ đã nạp, mẫu văn bản tự chỉnh) được đóng thành một tệp <b>.gpmb</b> trên máy này. Phần mềm không gửi tệp đi đâu; cán bộ tự cất giữ tệp theo quy định bảo mật của cơ quan (tệp có thông tin cá nhân của người có đất thu hồi).
      </p>

      {quyen("SAO_LUU") && <div className="the" style={{ padding: 14, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Tạo bản sao lưu</h3>
        <div className="mo-ta">
          Dữ liệu hiện có: {dsDuAn.length} dự án, {soHoHienCo} hồ sơ. Lần sao lưu gần nhất: <b>{lanSaoLuu ? ngayGio(lanSaoLuu) : "chưa có"}</b>.
        </div>
        <button className="nut nut-chinh" style={{ marginTop: 10 }} disabled={dangLam || !dsDuAn.length} onClick={taoBan}>
          Tạo bản sao lưu (.gpmb)
        </button>
      </div>}

      {!quyen("KHOI_PHUC") && <p className="mo chu-nho">Khôi phục dữ liệu chỉ dành cho tài khoản Quản trị.</p>}
      {quyen("KHOI_PHUC") && <div className="the" style={{ padding: 14 }}>
        <h3 style={{ marginTop: 0 }}>Khôi phục từ tệp sao lưu</h3>
        <input type="file" accept=".gpmb,application/zip" aria-label="Chọn tệp sao lưu" disabled={dangLam} onChange={(e) => void chonTep(e.target.files?.[0])} />
        {ban && (
          <div style={{ marginTop: 12 }}>
            <table className="bang">
              <tbody>
                <tr><th>Tệp</th><td>{ban.ten}</td></tr>
                <tr><th>Thời điểm sao lưu</th><td>{ngayGio(ban.ban.thongTin.luc)}</td></tr>
                <tr><th>Nội dung</th><td>{ban.ban.thongTin.soDuAn} dự án, {ban.ban.thongTin.soHo} hồ sơ, {ban.ban.thongTin.soBanDo} bản đồ, {ban.ban.thongTin.soMau} mẫu tự chỉnh</td></tr>
                <tr><th>Kiểm tra toàn vẹn</th><td><span className="nhan nhan-xanh">Khớp mã SHA-256</span></td></tr>
                <tr><th>Dự án trong tệp</th><td>{ban.ban.duAn.map((d) => d.ten).join("; ") || "—"}</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              <label>
                <input type="radio" name="che-do" checked={cheDo === "THAY_THE"} onChange={() => setCheDo("THAY_THE")} /> <b>Thay thế toàn bộ</b> — xóa dữ liệu hiện có trên máy rồi nạp bản sao lưu. Trước khi xóa, phần mềm tự tải về một bản sao lưu dữ liệu hiện có (tệp "GPMB-truoc-khoi-phuc…").
              </label>
              <label>
                <input type="radio" name="che-do" checked={cheDo === "GOP"} onChange={() => setCheDo("GOP")} /> <b>Gộp</b> — giữ dữ liệu hiện có; dự án, hồ sơ trùng mã định danh sẽ bị ghi đè bằng bản trong tệp.
              </label>
            </div>
            <label style={{ display: "block", marginTop: 10 }}>
              <input type="checkbox" checked={xacNhan} onChange={(e) => setXacNhan(e.target.checked)} /> Tôi đã kiểm tra thông tin tệp và đồng ý khôi phục.
            </label>
            <button className="nut nut-chinh" style={{ marginTop: 10 }} disabled={dangLam || !xacNhan} onClick={khoiPhucNgay}>
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

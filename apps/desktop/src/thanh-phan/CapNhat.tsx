import { useState } from "react";
import { useUngDung } from "../ung-dung";
import { caiDatCapNhat, coCapNhat, docCaiDat, ghiCaiDat, kiemTraCapNhat, type KetQuaKiemTra } from "../cap-nhat";
import { PHIEN_BAN } from "../phien-ban";

/** Thẻ "Cập nhật phần mềm" trong hộp Giới thiệu: kiểm tra, xem nội dung bản mới, sao lưu rồi cài đè, khởi động lại. */
export function TheCapNhat({ kqDau }: { kqDau?: KetQuaKiemTra | null }) {
  const { saoLuuTuDongNgay, quyen, bao } = useUngDung();
  const [kq, setKq] = useState<KetQuaKiemTra | null>(kqDau ?? null);
  const [dang, setDang] = useState<"" | "KIEM" | "CAI">("");
  const [loi, setLoi] = useState("");
  const [tienDo, setTienDo] = useState<{ pt: number | null; mb: number } | null>(null);
  const [tuDong, setTuDong] = useState(() => docCaiDat().tuDong);
  if (!coCapNhat()) return <p className="chu-nho mo">Cập nhật phần mềm chỉ có trong bản cài đặt Windows.</p>;
  const kiem = async () => {
    setDang("KIEM");
    setLoi("");
    try {
      setKq(await kiemTraCapNhat());
    } catch (e) {
      setLoi(String((e as Error).message ?? e));
    } finally {
      setDang("");
    }
  };
  const cai = async () => {
    if (!kq?.ban_moi) return;
    if (!confirm(`Cài phiên bản ${kq.ban_moi.phien_ban}?\n\nPhần mềm sẽ sao lưu dữ liệu, tải bộ cài, kiểm tra chữ ký, cài đè lên bản đang dùng (giữ nguyên dữ liệu) rồi tự khởi động lại.\nCác máy khác trong mạng nội bộ nên đóng phần mềm trong lúc cài.`)) return;
    setDang("CAI");
    setLoi("");
    try {
      try {
        await saoLuuTuDongNgay();
        bao("Đã sao lưu dữ liệu trước khi cập nhật");
      } catch (e) {
        if (!confirm(`Không sao lưu tự động được: ${String((e as Error).message ?? e)}\n\nVẫn tiếp tục cập nhật? (nên bấm Hủy, vào Quản trị → Sao lưu, khôi phục để sao lưu tay trước)`)) return;
      }
      await caiDatCapNhat((pt, daTai) => setTienDo({ pt, mb: daTai / 1048576 }));
    } catch (e) {
      setLoi(String((e as Error).message ?? e));
    } finally {
      setDang("");
    }
  };
  return (
    <div className="the-cap-nhat" aria-label="Cập nhật phần mềm">
      <div className="nhom-nut" style={{ alignItems: "center" }}>
        <b>Cập nhật phần mềm</b>
        <span className="mo chu-nho">đang dùng {PHIEN_BAN}</span>
        <button className="nut nut-nho" disabled={!!dang} onClick={() => void kiem()}>{dang === "KIEM" ? "Đang kiểm tra…" : "Kiểm tra cập nhật"}</button>
        <label className="chu-nho"><input type="checkbox" checked={tuDong} onChange={(e) => { setTuDong(e.target.checked); ghiCaiDat({ ...docCaiDat(), tuDong: e.target.checked }); }} /> Tự kiểm tra khi mở phần mềm</label>
      </div>
      {loi && <div className="thong-bao thong-bao-do chu-nho mt-8">{loi}</div>}
      {kq && !kq.san_sang && <div className="thong-bao thong-bao-vang chu-nho mt-8">Bản cài này chưa gắn khóa ký cập nhật — chưa cập nhật trong phần mềm được. Cài bản mới bằng bộ cài (chạy đè lên, không cần gỡ bản cũ, dữ liệu giữ nguyên).</div>}
      {kq?.san_sang && !kq.ban_moi && <div className="thong-bao thong-bao-xanh chu-nho mt-8" role="status">Đang dùng bản mới nhất ({kq.hien_tai}).</div>}
      {kq?.ban_moi && (
        <div className="thong-bao thong-bao-xanh mt-8" role="status">
          <b>Có bản mới {kq.ban_moi.phien_ban}</b>{kq.ban_moi.ngay ? ` (phát hành ${kq.ban_moi.ngay.split("-").reverse().join("/")})` : ""} — đang dùng {kq.ban_moi.hien_tai}.
          {kq.ban_moi.ghi_chu && <pre className="cap-nhat-ghi-chu chu-nho">{kq.ban_moi.ghi_chu}</pre>}
          <div className="nhom-nut mt-8" style={{ alignItems: "center" }}>
            <button className="nut nut-chinh nut-nho" disabled={!!dang || !quyen("CAI_DAT")} title={quyen("CAI_DAT") ? undefined : "Chỉ tài khoản Quản trị được cập nhật phần mềm"} onClick={() => void cai()}>{dang === "CAI" ? "Đang cập nhật…" : "Sao lưu và cập nhật"}</button>
            {!dang && <button className="nut nut-chu nut-nho" onClick={() => { ghiCaiDat({ ...docCaiDat(), boQua: kq.ban_moi!.phien_ban }); setKq({ ...kq, ban_moi: null }); }}>Để sau</button>}
            {tienDo && <span className="chu-nho">Đã tải {tienDo.mb.toFixed(1).replace(".", ",")} MB{tienDo.pt !== null ? ` (${tienDo.pt}%)` : ""}</span>}
          </div>
        </div>
      )}
      <p className="chu-nho mo mb-0 mt-8">Chỉ cài bản có chữ ký số của tác giả. Kiểm tra cập nhật chỉ tải tệp thông tin phiên bản công khai trên GitHub — không gửi dữ liệu hồ sơ.</p>
    </div>
  );
}

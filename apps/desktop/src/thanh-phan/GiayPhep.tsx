import { useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import { BAN_QUYEN } from "../phien-ban";
import { SO_DU_AN_DUNG_THU, SU_KIEN_GIOI_HAN, demDuAnTinh, moTaGiayPhep } from "../giay-phep";
import { HopThoai } from "./chung";

/** 1.0.10 — Trạng thái bản quyền sử dụng: dùng thử / đã kích hoạt; mã cài đặt; nhập mã kích hoạt; liên hệ tác giả. */
export function TheGiayPhep() {
  const { giayPhep, maCaiDat, kichHoat, quyen, dsDuAn, bao } = useUngDung();
  const [ma, setMa] = useState("");
  const [dang, setDang] = useState(false);
  const co = demDuAnTinh(dsDuAn);
  const hopLe = giayPhep.loai === "HOP_LE";
  return (
    <div className="the" data-giay-phep={giayPhep.loai}>
      <div className="the-dau"><h3>Bản quyền sử dụng</h3><span className={`nhan ${hopLe ? "nhan-xanh" : "nhan-vang"}`}>{hopLe ? "Đã kích hoạt" : "Dùng thử"}</span></div>
      <div className="the-than" style={{ display: "grid", gap: 8 }}>
        <div aria-label="Trạng thái bản quyền">{moTaGiayPhep(giayPhep)}. Đang dùng <b>{co}</b>{Number.isFinite(giayPhep.gioiHan) ? `/${giayPhep.gioiHan}` : ""} dự án <span className="mo chu-nho">(không tính dự án mẫu, dự án trong thùng rác)</span>.</div>
        {!hopLe && (
          <div className="chu-nho">
            Bản dùng thử dùng đủ chức năng với {SO_DU_AN_DUNG_THU} dự án. Muốn dùng thêm dự án, liên hệ tác giả <b>{BAN_QUYEN.tacGia}</b> – {BAN_QUYEN.donVi}, điện thoại <b>{BAN_QUYEN.dienThoai}</b>, gửi <b>tên đơn vị</b> và <b>Mã cài đặt</b> dưới đây để được cấp mã kích hoạt.
          </div>
        )}
        <div className="nhom-nut" style={{ alignItems: "center" }}>
          <span>Mã cài đặt của máy này: <b style={{ fontFamily: "monospace", fontSize: 15 }} aria-label="Mã cài đặt">{maCaiDat ?? "— (tài khoản Quản trị mở phần mềm để tạo)"}</b></span>
          {maCaiDat && <button className="nut nut-nho" onClick={() => void navigator.clipboard?.writeText(maCaiDat).then(() => bao("Đã chép mã cài đặt"), () => undefined)}>Chép</button>}
        </div>
        {quyen("CAI_DAT") ? (
          <div className="nhom-nut">
            <input aria-label="Mã kích hoạt" className="gian" placeholder="Dán mã kích hoạt (GPMB1.…)" value={ma} onChange={(e) => setMa(e.target.value)} />
            <button className="nut nut-chinh" disabled={!ma.trim() || dang} onClick={async () => {
              setDang(true);
              try {
                if (await kichHoat(ma)) {
                  setMa("");
                  bao("Đã kích hoạt phần mềm");
                }
              } finally {
                setDang(false);
              }
            }}>Kích hoạt</button>
          </div>
        ) : <div className="mo chu-nho">Tài khoản Quản trị (hoặc có quyền cài đặt) nhập mã kích hoạt.</div>}
        <div className="mo chu-nho">Mã cài đặt gắn với máy này (hoặc máy chủ mạng nội bộ); không đi theo bản sao lưu. Dự án đã có vẫn xem, sửa, xuất được khi mã hết hạn — chỉ không thêm dự án vượt mức.</div>
      </div>
    </div>
  );
}

/** Hộp mở khi thêm dự án vượt mức (sự kiện từ ung-dung luuDuAn / khôi phục sao lưu). */
export function HopGioiHanDuAn() {
  const [noiDung, setNoiDung] = useState<string | null>(null);
  useEffect(() => {
    const f = (e: Event) => setNoiDung((e as CustomEvent<string>).detail);
    window.addEventListener(SU_KIEN_GIOI_HAN, f);
    return () => window.removeEventListener(SU_KIEN_GIOI_HAN, f);
  }, []);
  if (!noiDung) return null;
  return (
    <HopThoai tieuDe="Dùng thêm dự án" rong={640} dong={() => setNoiDung(null)} chan={<button className="nut nut-chinh" onClick={() => setNoiDung(null)}>Đóng</button>}>
      <div className="thong-bao thong-bao-vang" role="alert">{noiDung}</div>
      <TheGiayPhep />
    </HopThoai>
  );
}

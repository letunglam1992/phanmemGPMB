import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./giao-dien.css";
import { UngDung } from "./UngDung";
import { NhaCungCap, type CheDoChiXem } from "./ung-dung";
import { TAI_KHOAN_XEM, dangKyPhienXem, type PhienXem } from "./tong-hop-tinh/xem-xa";
import type { Kho } from "./kho";
import { ManLoiKetNoi, moKho } from "./thanh-phan/KetNoi";
import { apDungGiaoDien, docGiaoDien } from "./giao-dien-sang-toi";

apDungGiaoDien(docGiaoDien());

/** Mở kho theo chế độ của máy (máy đơn / máy chủ / máy trạm) rồi mới dựng giao diện. */
function KhoiDong() {
  const [tt, setTt] = useState<{ kho?: Kho; loi?: string }>({});
  const chay = () => {
    setTt({});
    moKho().then(
      (kho) => setTt({ kho }),
      (e) => setTt({ loi: String((e as Error)?.message ?? e) }),
    );
  };
  useEffect(chay, []);
  // Phiên xem dữ liệu đơn vị gửi lên tỉnh: thay phiên làm việc chính; thoát thì trở lại đúng tài khoản, màn hình cũ
  const [xem, setXem] = useState<PhienXem | null>(null);
  const [quayVe, setQuayVe] = useState<PhienXem["quayVe"] | undefined>();
  useEffect(
    () =>
      dangKyPhienXem((p) => {
        if (p) setQuayVe(p.quayVe);
        setXem(p);
      }),
    [],
  );
  const cheDoXem = useMemo<CheDoChiXem | undefined>(() => (xem ? { taiKhoan: TAI_KHOAN_XEM, nhan: xem.nhan, manDau: xem.manDau, thoat: () => setXem(null) } : undefined), [xem]);
  if (tt.loi) return <ManLoiKetNoi loi={tt.loi} thuLai={chay} />;
  if (!tt.kho) return <div className="man-dang-nhap"><div className="trong">Đang mở dữ liệu…</div></div>;
  return (
    <>
      {xem && cheDoXem ? (
        <NhaCungCap key={`xem-${xem.id}`} kho={xem.kho} chiXem={cheDoXem}>
          <UngDung />
        </NhaCungCap>
      ) : (
        <NhaCungCap key="chinh" kho={tt.kho} phienDau={quayVe}>
          <UngDung />
        </NhaCungCap>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KhoiDong />
  </StrictMode>,
);

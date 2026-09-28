import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./giao-dien.css";
import { UngDung } from "./UngDung";
import { NhaCungCap } from "./ung-dung";
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
  if (tt.loi) return <ManLoiKetNoi loi={tt.loi} thuLai={chay} />;
  if (!tt.kho) return <div className="man-dang-nhap"><div className="trong">Đang mở dữ liệu…</div></div>;
  return (
    <NhaCungCap kho={tt.kho}>
      <UngDung />
    </NhaCungCap>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <KhoiDong />
  </StrictMode>,
);

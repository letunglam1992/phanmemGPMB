import { useMemo } from "react";
import { BieuDoKy } from "./BieuDoKy";
import type { DuAn, Ho } from "../mo-hinh";
import { dienBienDuAn } from "../dien-bien-du-an";
import { homNayIso } from "../trang-thai";

/** 1.2.0 (D2) — thẻ "Tiến độ theo tháng" ở Tổng quan dự án (cần mốc ngày từ ít nhất hai tháng). */
export function TheDienBienDuAn({ duAn, hos }: { duAn: DuAn; hos: Ho[] }) {
  const homNay = homNayIso();
  const ky = useMemo(() => dienBienDuAn(duAn, hos, homNay), [duAn, hos, homNay]);
  if (ky.length < 2) return null;
  const nhan = ky.map((k) => `${k.ky.slice(5)}/${k.ky.slice(2, 4)}`);
  const cuoi = ky[ky.length - 1]!;
  const giao = ky.filter((k) => k.giaoCdt).map((k) => `${k.ky.slice(5)}/${k.ky.slice(0, 4)}`);
  return (
    <div className="the" data-dien-bien-du-an>
      <div className="the-dau"><h3>Tiến độ theo tháng</h3><span className="mo chu-nho">số hộ lũy kế đến cuối tháng</span></div>
      <div className="the-than">
        <BieuDoKy kieu="duong" nhanKy={nhan} hienTai={ky.length - 1} maxY={cuoi.soHo} dinhDang={(v) => `${Math.round(v)}`} moTa="Số hộ đã duyệt phương án, đã chi trả, đã có quyết định thu hồi, đã bàn giao mặt bằng, lũy kế theo tháng"
          chuoi={[
            { ten: "Đã duyệt phương án", giaTri: ky.map((k) => k.duyetPA) },
            { ten: "Đã chi trả", giaTri: ky.map((k) => k.chiTra) },
            { ten: "Đã có QĐ thu hồi đất", giaTri: ky.map((k) => k.qdThuHoi) },
            { ten: "Đã bàn giao mặt bằng", giaTri: ky.map((k) => k.banGiao) },
          ]} />
        <div className="chu-nho" style={{ marginTop: 6 }}>
          Tháng {nhan[nhan.length - 1]}: {cuoi.soHo} hộ · duyệt PA {cuoi.duyetPA} · chi trả {cuoi.chiTra} · QĐ thu hồi {cuoi.qdThuHoi} · bàn giao mặt bằng {cuoi.banGiao}.
          {giao.length ? ` Bàn giao đất trên thực địa cho chủ đầu tư: tháng ${giao.join(", ")}.` : ""}
        </div>
        <div className="mo chu-nho">Đếm theo ngày đã ghi ở bước đã xong (bước 9, 12, 13) và ngày bàn giao mặt bằng — không ước tính phần chưa ghi.</div>
      </div>
    </div>
  );
}

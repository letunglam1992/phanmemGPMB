import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useUngDung } from "../ung-dung";
import { layTienDoNen, ngheTinhNen, tinhNen, type ViecTinh } from "../tinh-nen";

/** 1.0.7 — Thanh tiến độ tính nền (dữ liệu lớn); chỉ thẻ này vẽ lại theo tiến độ. */
export function TienDoTinhNen({ ghiChu }: { ghiChu?: string }) {
  const t = useSyncExternalStore(ngheTinhNen, layTienDoNen);
  const pt = t.tong ? Math.floor((t.xong / t.tong) * 100) : 0;
  return (
    <div className="thong-bao thong-bao-xanh" role="status" aria-label="Đang tính số liệu tổng hợp">
      <b>Đang tính phương án các hộ lần đầu{t.tong ? `: ${t.xong.toLocaleString("vi-VN")}/${t.tong.toLocaleString("vi-VN")} hộ (${pt}%)` : "…"}</b>
      <div className="chu-nho">{ghiChu ?? "Giao diện vẫn dùng được trong lúc tính; số liệu, cảnh báo của Tổng quan hiện khi tính xong. Các lần mở sau trong phiên dùng kết quả đã tính."}</div>
      <progress max={100} value={pt} style={{ width: "100%" }} />
    </div>
  );
}

/**
 * 1.0.7 — Cổng tính nền cho màn cần kết quả tính của nhiều hộ (Danh sách hộ, Dự án, Báo cáo, Việc của tôi): còn nhiều hộ
 * chưa tính (dữ liệu lớn, lần mở đầu) thì hiện tiến độ, tính nền từng lát rồi mới dựng màn — giao diện không đứng.
 * `duAnId`: chỉ các hộ của một dự án; trống: mọi dự án.
 */
export function CongTinhNen({ duAnId, children }: { duAnId?: string; children: ReactNode }) {
  const { dsDuAn, hoCua, chinhSach } = useUngDung();
  const lan = useSyncExternalStore(ngheTinhNen, () => layTienDoNen().lan);
  const dangTinh = useMemo(() => {
    const viec = dsDuAn
      .filter((d) => !duAnId || d.id === duAnId)
      .flatMap((d) => {
        const cs = chinhSach(d);
        return hoCua(d.id).map((h): ViecTinh => [cs, d, h]);
      });
    return tinhNen(viec);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lan: kiểm lại khi một lần tính nền xong
  }, [dsDuAn, hoCua, chinhSach, duAnId, lan]);
  if (!dangTinh) return <>{children}</>;
  return (
    <div className="trang">
      <TienDoTinhNen ghiChu="Màn hình này cần kết quả tính của các hộ — sẽ tự mở khi tính xong. Có thể chuyển sang màn khác trong lúc chờ." />
    </div>
  );
}

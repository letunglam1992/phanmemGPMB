import { useMemo } from "react";
import { D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { canhBaoSaoLuu } from "../sao-luu";
import { canhBaoChung, canhBaoDuAn, homNayIso, thongKe } from "../trang-thai";

export interface MucCanhBao {
  muc: "CAO" | "TRUNG_BINH" | "THONG_TIN";
  noiDung: string;
  canCu?: string;
  duAnId: string;
  hoId?: string;
  saoLuu?: boolean;
  caiDat?: boolean;
}

/** Số liệu tổng hợp mọi dự án + danh sách cảnh báo (dùng ở Tổng quan và chuông thông báo trên thanh tiêu đề). */
export function useTongHop() {
  const { dsDuAn, hoCua, chinhSach, lich, tyLeCham, lanSaoLuu, quyen, di, moCaiDat, moSaoLuu } = useUngDung();
  const homNay = homNayIso();
  const duLieu = useMemo(
    () =>
      dsDuAn.map((d) => {
        const ds = hoCua(d.id).map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) }));
        return { d, ds, tk: thongKe(d, ds, homNay), cb: canhBaoDuAn(d, ds, homNay, lich, tyLeCham), tong: ds.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)) };
      }),
    [dsDuAn, hoCua, chinhSach, homNay, lich, tyLeCham],
  );
  const nhacSaoLuu = quyen("SAO_LUU") ? canhBaoSaoLuu(lanSaoLuu, homNay, dsDuAn.length > 0) : null;
  const canhBao: MucCanhBao[] = [
    ...canhBaoChung(homNay, lich).map((c) => ({ ...c, muc: c.muc ?? ("CAO" as const), duAnId: "" })),
    ...(nhacSaoLuu ? [{ noiDung: nhacSaoLuu, canCu: "Bấm để mở Sao lưu, khôi phục", muc: "TRUNG_BINH" as const, duAnId: "", saoLuu: true }] : []),
    ...duLieu.flatMap((x) => x.cb),
  ];
  const mo = (c: MucCanhBao) =>
    c.caiDat ? moCaiDat(true) : c.saoLuu ? moSaoLuu(true) : c.duAnId && (c.hoId ? di({ ten: "ho", duAnId: c.duAnId, hoId: c.hoId, tab: "tien-do" }) : di({ ten: "du-an", duAnId: c.duAnId }));
  return { duLieu, canhBao, mo, homNay };
}

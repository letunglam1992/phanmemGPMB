import { useMemo, useSyncExternalStore } from "react";
import type { BoChinhSach } from "@gpmb/core";
import type { DuAn, Ho } from "../mo-hinh";
import type { LichLamViec } from "../lich-lam-viec";
import type { GiaiDoanTyLe } from "../chi-tra";
import { D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { canhBaoSaoLuu } from "../sao-luu";
import { canhBaoChung, canhBaoDuAn, homNayIso, thongKe } from "../trang-thai";
import { useChoNhan } from "../tong-hop-tinh/phien-tinh";
import { layTienDoNen, ngheTinhNen, tinhNen, type ViecTinh } from "../tinh-nen";

export interface MucCanhBao {
  muc: "CAO" | "TRUNG_BINH" | "THONG_TIN";
  noiDung: string;
  canCu?: string;
  duAnId: string;
  hoId?: string;
  saoLuu?: boolean;
  caiDat?: boolean;
  /** Gói mới trên cổng chờ nhận (cấp tỉnh) — bấm để mở Tổng hợp tỉnh */
  tinh?: boolean;
}

type ThamSo = Parameters<typeof tinhTongHop>;
let lanCuoi: { vao: ThamSo; ra: ReturnType<typeof tinhTongHop> } | null = null;

function tinhTongHop(dsDuAn: DuAn[], hoCua: (id: string) => Ho[], chinhSach: (d: DuAn) => BoChinhSach, homNay: string, lich: LichLamViec, tyLeCham: GiaiDoanTyLe[]) {
  return dsDuAn.map((d) => {
    const ds = hoCua(d.id).map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) }));
    return { d, ds, tk: thongKe(d, ds, homNay), cb: canhBaoDuAn(d, ds, homNay, lich, tyLeCham), tong: ds.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)) };
  });
}
/** P1-1: thanh tiêu đề (chuông) và Tổng quan dùng chung một lần tính cho cùng dữ liệu vào. */
function tongHopNho(...vao: ThamSo) {
  if (lanCuoi && lanCuoi.vao.every((x, i) => x === vao[i])) return lanCuoi.ra;
  lanCuoi = { vao, ra: tinhTongHop(...vao) };
  return lanCuoi.ra;
}

/** Số liệu tổng hợp mọi dự án + danh sách cảnh báo (dùng ở Tổng quan và chuông thông báo trên thanh tiêu đề). */
export function useTongHop() {
  const { dsDuAn, hoCua, chinhSach, lich, tyLeCham, lanSaoLuu, quyen, di, moCaiDat, moSaoLuu, khoaKhoiPhuc } = useUngDung();
  const homNay = homNayIso();
  // 1.0.7: nhiều hộ chưa tính (lần mở đầu với dữ liệu lớn) → tính nền từng lát, tổng hợp khi xong (`lan` tăng)
  const lanNen = useSyncExternalStore(ngheTinhNen, () => layTienDoNen().lan);
  const tinh = useMemo(() => {
    const vao: ThamSo = [dsDuAn, hoCua, chinhSach, homNay, lich, tyLeCham];
    if (lanCuoi && lanCuoi.vao.every((x, i) => x === vao[i])) return lanCuoi.ra;
    const viec = dsDuAn.flatMap((d) => {
      const cs = chinhSach(d);
      return hoCua(d.id).map((h): ViecTinh => [cs, d, h]);
    });
    if (tinhNen(viec)) return null;
    return tongHopNho(...vao);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lanNen: tính lại khi tính nền xong
  }, [dsDuAn, hoCua, chinhSach, homNay, lich, tyLeCham, lanNen]);
  const duLieu = tinh ?? [];
  const choNhan = useChoNhan();
  const nhacSaoLuu = quyen("SAO_LUU") ? canhBaoSaoLuu(lanSaoLuu, homNay, dsDuAn.length > 0) : null;
  const canhBao: MucCanhBao[] = [
    ...canhBaoChung(homNay, lich, quyen("KHOI_PHUC") && !khoaKhoiPhuc && dsDuAn.length > 0).map((c) => ({ ...c, muc: c.muc ?? ("CAO" as const), duAnId: "" })),
    ...(nhacSaoLuu ? [{ noiDung: nhacSaoLuu, canCu: "Bấm để mở Sao lưu, khôi phục", muc: "TRUNG_BINH" as const, duAnId: "", saoLuu: true }] : []),
    ...(choNhan.length && quyen("CAI_DAT") ? [{ noiDung: `Có ${choNhan.length} gói mới trên cổng chờ nhận (${choNhan.map((g) => g.ten).join(", ")}) — mở khóa cấp tỉnh để nhận`, canCu: "Bấm để mở Gửi tỉnh, tổng hợp tỉnh", muc: "TRUNG_BINH" as const, duAnId: "", tinh: true }] : []),
    ...duLieu.flatMap((x) => x.cb),
  ];
  const mo = (c: MucCanhBao) =>
    c.tinh ? di({ ten: "tong-hop-tinh", tab: "tinh" }) : c.caiDat ? moCaiDat(true) : c.saoLuu ? moSaoLuu(true) : c.duAnId && (c.hoId ? di({ ten: "ho", duAnId: c.duAnId, hoId: c.hoId, tab: "tien-do" }) : di({ ten: "du-an", duAnId: c.duAnId }));
  return { duLieu, canhBao, mo, homNay, dangTinh: tinh === null };
}

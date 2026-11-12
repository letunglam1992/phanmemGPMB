/// <reference lib="webworker" />
/**
 * 1.3.6 (BĐ-10) — Đọc tệp, dựng thửa, gợi ý cấu hình lớp ở luồng nền: gợi ý cấu hình thử nhiều tổ hợp lớp (tệp trích đo
 * gCadas thật ~600 thửa: vài giây), chạy trên luồng giao diện làm đứng màn hình. Dữ liệu không rời máy.
 */
import { dungLai, phanTichNhieu, type MauCauHinh } from "./du-lieu";
import { CAU_HINH_MAC_DINH, goiYCauHinh, type CauHinhLop, type KetQuaDocDgn } from "@gpmb/gis";

export type ViecNen =
  | { loai: "NHIEU"; ds: { khoa?: string; ten: string; bytes: Uint8Array; soTo?: string }[]; daChot?: CauHinhLop; mau?: MauCauHinh[] }
  | { loai: "GOI_Y"; ban: KetQuaDocDgn; tenTep: string };

self.onmessage = (e: MessageEvent<ViecNen>) => {
  try {
    const v = e.data;
    if (v.loai === "NHIEU") postMessage({ ok: phanTichNhieu(v.ds, v.daChot, v.mau ?? []) });
    else {
      const g = goiYCauHinh(v.ban, CAU_HINH_MAC_DINH, v.tenTep);
      postMessage({ ok: { ...dungLai(v.ban, g.cauHinh, true, g.ghiChu), khung: { soToGoiY: g.soToGoiY, dienTichGpmbGhi: g.dienTichGpmbGhi, lopThuaNgoai: g.lopThuaNgoai } } });
    }
  } catch (er) {
    postMessage({ loi: (er as Error).message || String(er) });
  }
};

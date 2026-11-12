/**
 * 1.3.6 (BĐ-10) — Gọi phân tích bản đồ ở luồng nền (Web Worker); môi trường không có Worker (kiểm thử Node) thì chạy trực tiếp.
 * Mỗi lần gọi một worker riêng, xong thì đóng — không giữ bản vẽ trong bộ nhớ luồng nền.
 */
import { CAU_HINH_MAC_DINH, goiYCauHinh, type CauHinhLop, type KetQuaDocDgn } from "@gpmb/gis";
import { dungLai, phanTichNhieu, type DuLieuBanDo, type MauCauHinh } from "./du-lieu";
import type { ViecNen } from "./phan-tich.worker";

function chay(v: ViecNen): Promise<DuLieuBanDo> {
  if (typeof Worker === "undefined") {
    if (v.loai === "NHIEU") return Promise.resolve(phanTichNhieu(v.ds, v.daChot, v.mau ?? []));
    const g = goiYCauHinh(v.ban, CAU_HINH_MAC_DINH, v.tenTep);
    return Promise.resolve({ ...dungLai(v.ban, g.cauHinh, true, g.ghiChu), khung: { soToGoiY: g.soToGoiY, dienTichGpmbGhi: g.dienTichGpmbGhi, lopThuaNgoai: g.lopThuaNgoai } });
  }
  return new Promise((xong, loi) => {
    const w = new Worker(new URL("./phan-tich.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<{ ok?: DuLieuBanDo; loi?: string }>) => {
      w.terminate();
      if (e.data.ok) xong(e.data.ok);
      else loi(new Error(e.data.loi ?? "Lỗi đọc bản đồ"));
    };
    w.onerror = (e) => {
      w.terminate();
      loi(new Error(e.message || "Lỗi luồng nền khi đọc bản đồ"));
    };
    w.postMessage(v);
  });
}

export const phanTichNen = (ds: { khoa?: string; ten: string; bytes: Uint8Array; soTo?: string }[], daChot?: CauHinhLop, mau: MauCauHinh[] = []) => chay({ loai: "NHIEU", ds, daChot, mau });
export const goiYNen = (ban: KetQuaDocDgn, tenTep: string) => chay({ loai: "GOI_Y", ban, tenTep });

/**
 * Xem dữ liệu một đơn vị gửi lên tỉnh với đầy đủ chức năng xem như cấp xã: dựng kho trong bộ nhớ từ gói đã giải mã,
 * bọc chặn ghi, mở một phiên giao diện riêng (main.tsx) với tài khoản "Chỉ xem" thay cho phiên làm việc chính; thoát thì
 * bỏ toàn bộ khỏi bộ nhớ và trở lại phiên chính (giữ tài khoản, màn hình) — không ghi gì vào dữ liệu nghiệp vụ của máy tỉnh.
 */
import { taoKhoBoNho, type Kho } from "../kho";
import { khoiPhuc, type BanSaoLuu } from "../sao-luu";
import type { NguoiDung } from "../tai-khoan";
import type { Man } from "../ung-dung";

export class LoiChiXem extends Error {
  constructor() {
    super("Dữ liệu do đơn vị gửi lên tỉnh — chỉ xem, không sửa được. Đơn vị gửi sửa và gửi lại gói mới.");
  }
}

/** Chặn mọi thao tác ghi dữ liệu nghiệp vụ; nhật ký, cài đặt giao diện ghi vào bộ nhớ (mất khi thoát). */
export function khoChiXem(k: Kho): Kho {
  const chan = async (): Promise<never> => {
    throw new LoiChiXem();
  };
  return { ...k, ghiLo: chan, luuDuAn: chan, xoaDuAn: chan, luuHo: chan, xoaHo: chan, khoiPhucBanLichSu: chan, luuBanDo: chan, xoaBanDo: chan, luuMau: chan, xoaMau: chan, xoaTatCa: chan, luuNguoiDung: chan };
}

export async function taoKhoXem(ban: BanSaoLuu): Promise<Kho> {
  const k = taoKhoBoNho();
  await khoiPhuc(k, ban, "THAY_THE");
  return khoChiXem(k);
}

export const TAI_KHOAN_XEM: NguoiDung = {
  ten: "cap-tinh-xem",
  hoTen: "Cấp tỉnh (chỉ xem)",
  chucVu: "",
  vaiTro: "XEM",
  hoatDong: true,
  muoi: "",
  vongLap: 0,
  bam: "",
  taoLuc: "",
};

export interface PhienXem {
  id: number;
  kho: Kho;
  nhan: string;
  /** Màn mở đầu (vd. dự án được bấm từ bảng tổng hợp) */
  manDau?: { ten: "du-an"; duAnId: string };
  /** Phiên làm việc chính để trở lại khi thoát (tài khoản, màn hình đang mở) */
  quayVe: { taiKhoan: NguoiDung; man: Man };
}

type Nghe = (p: PhienXem | null) => void;
let nghe: Nghe | null = null;
let dem = 0;
export const dangKyPhienXem = (f: Nghe) => {
  nghe = f;
  return () => {
    if (nghe === f) nghe = null;
  };
};
export const moPhienXem = (p: Omit<PhienXem, "id">) => nghe?.({ ...p, id: ++dem });
export const dongPhienXem = () => nghe?.(null);

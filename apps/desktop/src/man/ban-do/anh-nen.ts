/**
 * Bộ đệm ô ảnh nền trực tuyến (docs/08 §5). Máy chủ ảnh vệ tinh (vd. Esri) trả ô "Map data not yet available" (ảnh xám)
 * ở mức phóng chưa có ảnh cho khu vực — nhận ra ô xám đó, đánh dấu "không có ảnh" và vẽ ảnh của mức thấp hơn phóng to.
 */
export type TrangThaiO = "TAI" | "OK" | "TRONG" | "LOI";
export interface OAnh {
  img: HTMLImageElement;
  tt: TrangThaiO;
}

const boDem = new Map<string, OAnh>();

/**
 * Ô "chưa có ảnh": mọi điểm mẫu xám trung tính (R ≈ G ≈ B) và sáng vừa (ô báo của máy chủ, có chữ trắng). Ảnh vệ tinh thật
 * gần như luôn có điểm lệch màu; ô mây trắng có thể bị coi là trống — khi đó dùng ảnh mức thấp hơn, không mất gì.
 */
export function laOTrong(rgba: ArrayLike<number>): boolean {
  let n = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i]!, g = rgba[i + 1]!, b = rgba[i + 2]!;
    if (Math.max(r, g, b) - Math.min(r, g, b) > 10 || r < 120) return false;
    n++;
  }
  return n > 0;
}

function kiemTrong(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 16;
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return false;
    g.drawImage(img, 0, 0, 16, 16);
    return laOTrong(g.getImageData(0, 0, 16, 16).data);
  } catch {
    return false; // ảnh không cho đọc điểm (máy chủ không hỗ trợ CORS) — coi như có ảnh
  }
}

/**
 * Lấy ô theo URL; `tai` = false thì chỉ tra bộ đệm (không gửi yêu cầu mới). Tải xong gọi `xong` để vẽ lại. Thử tải có CORS để
 * nhận ra ô trống; máy chủ không hỗ trợ CORS thì tải lại không CORS.
 */
export function layO(url: string, xong: () => void, tai = true): OAnh | undefined {
  const co = boDem.get(url);
  if (co || !tai) return co;
  const moi = (cors: boolean): OAnh => {
    const img = new Image();
    img.decoding = "async";
    if (cors) img.crossOrigin = "anonymous";
    const e: OAnh = { img, tt: "TAI" };
    img.onload = () => {
      e.tt = cors && kiemTrong(img) ? "TRONG" : "OK";
      xong();
    };
    img.onerror = () => {
      if (cors) boDem.set(url, moi(false));
      else e.tt = "LOI";
      xong();
    };
    img.src = url;
    return e;
  };
  const e = moi(true);
  boDem.set(url, e);
  if (boDem.size > 800) boDem.delete(boDem.keys().next().value!);
  return e;
}

/** Bật lại ảnh nền: bỏ các ô lỗi (mất mạng trước đó) để tải lại. */
export function boOLoi() {
  for (const [k, e] of boDem) if (e.tt === "LOI") boDem.delete(k);
}

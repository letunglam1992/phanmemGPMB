/**
 * 1.0.9 — Ảnh vệ tinh làm nền cho PDF bản đồ tiến độ. Dựng một ảnh JPEG phủ đúng phạm vi in (tọa độ VN-2000) từ các ô ảnh
 * trực tuyến của nguồn đang chọn trên bản đồ (Esri, OSM, URL tùy chỉnh) — cùng phép đặt ô affine như màn hình. Chỉ gửi số
 * hiệu ô z/x/y tới máy chủ ảnh (như khi xem). Ô phải tải được có CORS (đọc điểm ảnh để nén JPEG); ô thiếu, ô "chưa có ảnh"
 * thì dùng ảnh mức thấp hơn phóng to.
 */
import { oNenTrongKhung, urlO, type Diem } from "@gpmb/gis";
import { laOTrong } from "./anh-nen";

export interface PhamVi {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface AnhNenIn {
  /** Phạm vi ảnh phủ (VN-2000) — trùng phạm vi in */
  phamVi: PhamVi;
  canvas: HTMLCanvasElement;
  jpeg: Uint8Array;
  rongPx: number;
  caoPx: number;
  /** Ghi nguồn ảnh (bắt buộc theo điều khoản nguồn ảnh) */
  ghiNguon: string;
  soO: number;
  soThieu: number;
}

export interface CaiDatIn {
  url: string;
  ghiNguon: string;
  mucToiDa: number;
  he: { kinhTuyenTruc: number; mui: 3 | 6 };
  dx: number;
  dy: number;
  doMo: number;
}

/** Số điểm ảnh mỗi mét trên ảnh nền: khoảng `pxDai` điểm ảnh theo cạnh dài, ≥ 0,5 px/m (giới hạn để không quá nặng). */
export function pxMoiMetIn(pv: PhamVi, pxDai = 3000): number {
  return pxDai / Math.max(pv.maxX - pv.minX, pv.maxY - pv.minY, 1);
}

/** Tải một ô ảnh có CORS; null nếu lỗi, hết giờ hoặc là ô "chưa có ảnh". */
function taiO(url: string, choMs: number): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => ok(null), choMs);
    img.onload = () => {
      clearTimeout(t);
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 16;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0, 16, 16);
        ok(laOTrong(g.getImageData(0, 0, 16, 16).data) ? null : img);
      } catch {
        ok(null); // không đọc được điểm ảnh (máy chủ không cho CORS) — không dùng được cho bản in
      }
    };
    img.onerror = () => {
      clearTimeout(t);
      ok(null);
    };
    img.src = url;
  });
}

/**
 * Dựng ảnh nền cho phạm vi in. `taiAnh` thay được trong kiểm thử. Lỗi khi không tải được ô nào (mất mạng, máy chủ chặn CORS).
 */
export async function dungAnhNenIn(pv: PhamVi, c: CaiDatIn, o: { pxDai?: number; choMs?: number; taiAnh?: (url: string) => Promise<CanvasImageSource | null> } = {}): Promise<AnhNenIn> {
  const pxM = pxMoiMetIn(pv, o.pxDai);
  const rongPx = Math.max(1, Math.round((pv.maxX - pv.minX) * pxM));
  const caoPx = Math.max(1, Math.round((pv.maxY - pv.minY) * pxM));
  const ds = oNenTrongKhung({ minX: pv.minX - c.dx, maxX: pv.maxX - c.dx, minY: pv.minY - c.dy, maxY: pv.maxY - c.dy }, pxM, c.he, c.mucToiDa, 400);
  if (!ds.length) throw new Error("Phạm vi in nằm ngoài vùng có ảnh — kiểm tra kinh tuyến trục, múi chiếu ở mục Ảnh vệ tinh");
  const tai = o.taiAnh ?? ((u: string) => taiO(u, o.choMs ?? 20000));
  const boDem = new Map<string, Promise<CanvasImageSource | null>>();
  const lay = (z: number, x: number, y: number) => {
    const u = urlO(c.url, { z, x, y });
    if (!boDem.has(u)) boDem.set(u, tai(u));
    return boDem.get(u)!;
  };
  const cv = document.createElement("canvas");
  cv.width = rongPx;
  cv.height = caoPx;
  const g = cv.getContext("2d");
  if (!g) throw new Error("Trình duyệt không hỗ trợ vẽ canvas");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, rongPx, caoPx);
  g.globalAlpha = Math.max(0.2, Math.min(1, c.doMo));
  const px = (d: Diem) => ({ x: (d.x + c.dx - pv.minX) * pxM, y: (pv.maxY - (d.y + c.dy)) * pxM });
  let soThieu = 0;
  // tải song song theo lô 12 ô
  const kq: { o: (typeof ds)[number]; img: CanvasImageSource | null; ox: number; oy: number; k: number }[] = [];
  for (let i = 0; i < ds.length; i += 12) {
    kq.push(
      ...(await Promise.all(
        ds.slice(i, i + 12).map(async (oo) => {
          for (let k = 0; k <= 6 && oo.z - k >= 0; k++) {
            const img = await lay(oo.z - k, oo.x >> k, oo.y >> k);
            if (img) return { o: oo, img, ox: oo.x - ((oo.x >> k) << k), oy: oo.y - ((oo.y >> k) << k), k };
          }
          return { o: oo, img: null, ox: 0, oy: 0, k: 0 };
        }),
      )),
    );
  }
  for (const { o: oo, img, ox, oy, k } of kq) {
    if (!img) {
      soThieu++;
      continue;
    }
    const [tl, tr, bl] = oo.goc.map(px) as [Diem, Diem, Diem];
    g.setTransform((tr.x - tl.x) / 256, (tr.y - tl.y) / 256, (bl.x - tl.x) / 256, (bl.y - tl.y) / 256, tl.x, tl.y);
    const n = 2 ** k;
    const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width || 256;
    const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height || 256;
    g.drawImage(img, (ox * iw) / n, (oy * ih) / n, iw / n, ih / n, 0, 0, 256.6, 256.6);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (soThieu === ds.length) throw new Error("Không tải được ảnh vệ tinh (mất mạng hoặc máy chủ ảnh không cho phép dùng ảnh để in) — xuất lại không kèm ảnh");
  const blob = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("Không nén được ảnh nền");
  return { phamVi: pv, canvas: cv, jpeg: new Uint8Array(await blob.arrayBuffer()), rongPx, caoPx, ghiNguon: c.ghiNguon, soO: ds.length, soThieu };
}

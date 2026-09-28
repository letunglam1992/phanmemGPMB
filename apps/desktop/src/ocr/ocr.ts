/**
 * Nhận dạng chữ (OCR) tiếng Việt chạy hoàn toàn trên máy: Tesseract (WebAssembly) + dữ liệu `vie`
 * đóng gói trong bộ cài (vite.config.ts → /ocr/). Không gửi ảnh, văn bản ra ngoài.
 * PDF scan: dựng từng trang thành ảnh bằng pdf.js rồi nhận dạng.
 */
import type { Worker as TessWorker } from "tesseract.js";

export interface TrangOcr {
  tep: string;
  trang: number;
  chu: string;
  /** Độ tin cậy trung bình (0–100) do Tesseract báo. */
  doTinCay: number;
}

export interface TienDo {
  tep: string;
  trang: number;
  soTrang: number;
  /** 0–1 trong trang hiện tại */
  phan: number;
  buoc: string;
}

/** Độ phân giải dựng trang PDF (~300 dpi với khổ A4 ở 72 dpi gốc). */
const TY_LE_PDF = 300 / 72;
/** Cạnh dài tối đa của ảnh đưa vào nhận dạng — ảnh chụp điện thoại rất lớn làm chậm, không tăng độ chính xác. */
const CANH_TOI_DA = 4200;

let tho: Promise<TessWorker> | null = null;
let baoTienDo: ((phan: number, buoc: string) => void) | null = null;

function layTho(): Promise<TessWorker> {
  if (!tho) {
    tho = import("tesseract.js").then(({ createWorker, OEM }) =>
      createWorker("vie", OEM.LSTM_ONLY, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr",
        langPath: "/ocr",
        gzip: true,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (m: { status: string; progress: number }) => baoTienDo?.(m.progress, m.status),
      }),
    );
    tho.catch(() => (tho = null));
  }
  return tho;
}

/** Giải phóng bộ nhận dạng (khoảng 100 MB bộ nhớ) khi rời màn hình. */
export async function dongOcr() {
  if (!tho) return;
  const t = tho;
  tho = null;
  await (await t).terminate();
}

function veLenCanvas(nguon: CanvasImageSource, rong: number, cao: number): HTMLCanvasElement {
  const k = Math.min(1, CANH_TOI_DA / Math.max(rong, cao));
  const c = document.createElement("canvas");
  c.width = Math.round(rong * k);
  c.height = Math.round(cao * k);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(nguon, 0, 0, c.width, c.height);
  return c;
}

async function trangPdf(tep: File, moiTrang: (c: HTMLCanvasElement, i: number, n: number) => Promise<void>) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  const tai = pdfjs.getDocument({ data: new Uint8Array(await tep.arrayBuffer()), isEvalSupported: false });
  const doc = await tai.promise;
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const trang = await doc.getPage(i);
      const vp = trang.getViewport({ scale: TY_LE_PDF });
      const c = document.createElement("canvas");
      c.width = Math.round(vp.width);
      c.height = Math.round(vp.height);
      const g = c.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      await trang.render({ canvasContext: g, viewport: vp }).promise;
      await moiTrang(veLenCanvas(c, c.width, c.height), i, doc.numPages);
      trang.cleanup();
    }
  } finally {
    await tai.destroy();
  }
}

/** Nhận dạng lần lượt các tệp (ảnh PNG/JPG/BMP/WEBP hoặc PDF). */
export async function nhanDang(ds: File[], tienDo: (t: TienDo) => void, huy?: { da: boolean }): Promise<TrangOcr[]> {
  const kq: TrangOcr[] = [];
  tienDo({ tep: "", trang: 0, soTrang: 0, phan: 0, buoc: "Khởi động bộ nhận dạng" });
  const w = await layTho();
  const doc = async (tep: File, c: HTMLCanvasElement, i: number, n: number) => {
    if (huy?.da) throw new Error("Đã dừng");
    baoTienDo = (phan, buoc) => tienDo({ tep: tep.name, trang: i, soTrang: n, phan, buoc });
    const r = await w.recognize(c);
    kq.push({ tep: tep.name, trang: i, chu: r.data.text.trim(), doTinCay: Math.round(r.data.confidence) });
  };
  try {
    for (const tep of ds) {
      if (tep.type === "application/pdf" || /\.pdf$/i.test(tep.name)) await trangPdf(tep, (c, i, n) => doc(tep, c, i, n));
      else {
        const anh = await createImageBitmap(tep);
        const c = veLenCanvas(anh, anh.width, anh.height);
        anh.close();
        await doc(tep, c, 1, 1);
      }
    }
  } finally {
    baoTienDo = null;
  }
  return kq;
}

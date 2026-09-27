/** Điền mẫu .docx bằng docxtemplater (chạy trên máy, không gửi dữ liệu ra ngoài). */
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { CHAM } from "./du-lieu";

const TRONG_KY = "      "; // chỗ để văn thư ghi số, ngày khi ký

function chuanHoa(v: unknown, khoa: string, trongBang = false): unknown {
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" ? chuanHoaObj(x as Record<string, unknown>, true) : chuanHoa(x, "")));
  if (trongBang && (v === null || v === undefined || (typeof v === "string" && v.trim() === ""))) return ""; // ô trống trong bảng để trắng
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return ["so", "ngay", "thang", "nam", "ky_hieu", "ngay_ky_ngan"].includes(khoa) ? TRONG_KY : CHAM;
  return v;
}
function chuanHoaObj(o: Record<string, unknown>, trongBang = false): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, chuanHoa(v, k, trongBang)]));
}

export interface LoiDienMau {
  thongBao: string;
  chiTiet: string[];
}

/** Điền dữ liệu vào mẫu; lỗi cú pháp trường (khi cán bộ tự sửa mẫu) được báo rõ. */
export function dienMau(mau: ArrayBuffer | Uint8Array, duLieu: Record<string, unknown>): Uint8Array {
  const zip = new PizZip(mau);
  let doc: Docxtemplater;
  try {
    doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => CHAM });
  } catch (e) {
    const err = e as { properties?: { errors?: { properties?: { explanation?: string } }[] } };
    throw Object.assign(new Error("Mẫu có trường viết sai cú pháp {…}"), {
      chiTiet: (err.properties?.errors ?? []).map((x) => x.properties?.explanation ?? "").filter(Boolean),
    });
  }
  doc.render(chuanHoaObj(duLieu));
  return doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
}

/** Liệt kê các trường {…} có trong mẫu (để kiểm tra mẫu tải lên). */
export function truongTrongMau(mau: ArrayBuffer | Uint8Array): string[] {
  const zip = new PizZip(mau);
  const xml = zip.file("word/document.xml")?.asText() ?? "";
  const text = xml.replace(/<[^>]+>/g, "");
  return [...new Set([...text.matchAll(/\{([#/]?[\w.]+)\}/g)].map((m) => m[1]!))];
}

export function dongGoiZip(tep: { ten: string; noiDung: Uint8Array }[]): Uint8Array {
  const zip = new PizZip();
  for (const t of tep) zip.file(t.ten, t.noiDung);
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}

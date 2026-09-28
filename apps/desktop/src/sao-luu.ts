/**
 * Sao lưu, khôi phục toàn bộ dữ liệu trên máy thành một tệp .gpmb (định dạng zip):
 *   thong-tin.json  – định dạng, phiên bản, thời điểm, số lượng, mã băm SHA-256 của du-lieu.json
 *   du-lieu.json    – dự án, hồ sơ hộ
 *   ban-do/<id>.dgn – bản đồ DGN đã nạp theo dự án
 *   mau/<ma>.docx   – mẫu văn bản cán bộ tự chỉnh (+ mau/danh-sach.json)
 * Tệp chỉ tạo và đọc trên máy; không gửi đi đâu.
 */
import PizZip from "pizzip";
import type { Kho } from "./kho";
import type { DuAn, Ho } from "./mo-hinh";

export const DINH_DANG = "gpmb-sonla-sao-luu";
export const KHOA_LICH = "lichLamViec";
export const PHIEN_BAN_SAO_LUU = 1;

export interface ThongTinSaoLuu {
  dinhDang: string;
  phienBan: number;
  luc: string;
  ungDung: string;
  soDuAn: number;
  soHo: number;
  soBanDo: number;
  soMau: number;
  bamDuLieu: string;
}

export interface BanSaoLuu {
  thongTin: ThongTinSaoLuu;
  duAn: DuAn[];
  ho: Ho[];
  banDo: Map<string, Uint8Array>;
  mau: { ma: string; tenTep: string; luc: string; bytes: Uint8Array }[];
  /** Cài đặt dùng chung (có từ bản ghi lịch làm việc; tệp cũ không có). */
  caiDat?: { lichLamViec?: unknown; tyLeChamTra?: unknown; kyBaoCao?: unknown; donVi?: unknown; anhNen?: unknown };
}

export class LoiSaoLuu extends Error {}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function taoBanSaoLuu(kho: Kho, ungDung = "0.1"): Promise<{ bytes: Uint8Array; thongTin: ThongTinSaoLuu }> {
  const duAn = await kho.dsDuAn();
  const ho = (await Promise.all(duAn.map((d) => kho.dsHo(d.id)))).flat();
  const zip = new PizZip();
  const caiDat = { lichLamViec: await kho.docCaiDat(KHOA_LICH), tyLeChamTra: await kho.docCaiDat("tyLeChamTra"), kyBaoCao: await kho.docCaiDat("kyBaoCao"), donVi: await kho.docCaiDat("donVi"), anhNen: await kho.docCaiDat("anhNen") };
  const duLieu = JSON.stringify({ duAn, ho, caiDat });
  zip.file("du-lieu.json", duLieu);
  let soBanDo = 0;
  for (const id of await kho.dsBanDo()) {
    const b = await kho.docBanDo(id);
    if (b) {
      zip.file(`ban-do/${id}.dgn`, b);
      soBanDo++;
    }
  }
  const dsMau: { ma: string; tenTep: string; luc: string }[] = [];
  for (const ma of await kho.dsMauTuy()) {
    const m = await kho.docMau(ma);
    if (m) {
      zip.file(`mau/${ma}.docx`, m.bytes);
      dsMau.push({ ma, tenTep: m.tenTep, luc: m.luc });
    }
  }
  zip.file("mau/danh-sach.json", JSON.stringify(dsMau));
  const thongTin: ThongTinSaoLuu = {
    dinhDang: DINH_DANG,
    phienBan: PHIEN_BAN_SAO_LUU,
    luc: new Date().toISOString(),
    ungDung,
    soDuAn: duAn.length,
    soHo: ho.length,
    soBanDo,
    soMau: dsMau.length,
    bamDuLieu: await sha256(duLieu),
  };
  zip.file("thong-tin.json", JSON.stringify(thongTin, null, 2));
  return { bytes: zip.generate({ type: "uint8array", compression: "DEFLATE" }), thongTin };
}

/** Đọc và kiểm tra tệp sao lưu (định dạng, phiên bản, mã băm, số lượng). */
export async function docBanSaoLuu(bytes: Uint8Array | ArrayBuffer): Promise<BanSaoLuu> {
  let zip: PizZip;
  try {
    zip = new PizZip(bytes);
  } catch {
    throw new LoiSaoLuu("Tệp không phải bản sao lưu của phần mềm (không đọc được dạng nén).");
  }
  const tt = zip.file("thong-tin.json");
  const dl = zip.file("du-lieu.json");
  if (!tt || !dl) throw new LoiSaoLuu("Tệp thiếu thông tin sao lưu (thong-tin.json, du-lieu.json).");
  const thongTin = JSON.parse(tt.asText()) as ThongTinSaoLuu;
  if (thongTin.dinhDang !== DINH_DANG) throw new LoiSaoLuu("Tệp không đúng định dạng sao lưu GPMB Sơn La.");
  if (thongTin.phienBan > PHIEN_BAN_SAO_LUU) throw new LoiSaoLuu(`Bản sao lưu phiên bản ${thongTin.phienBan} mới hơn phần mềm — cần cập nhật phần mềm.`);
  const duLieu = dl.asText();
  if ((await sha256(duLieu)) !== thongTin.bamDuLieu) throw new LoiSaoLuu("Dữ liệu trong tệp sao lưu không khớp mã kiểm tra — tệp có thể bị hỏng hoặc bị sửa. Không khôi phục.");
  const { duAn, ho, caiDat } = JSON.parse(duLieu) as { duAn: DuAn[]; ho: Ho[]; caiDat?: BanSaoLuu["caiDat"] };
  if (duAn.length !== thongTin.soDuAn || ho.length !== thongTin.soHo) throw new LoiSaoLuu("Số lượng dự án/hồ sơ không khớp thông tin sao lưu.");
  const banDo = new Map<string, Uint8Array>();
  for (const f of zip.file(/^ban-do\/.+\.dgn$/)) banDo.set(f.name.slice(7, -4), f.asUint8Array());
  const dsMau = JSON.parse(zip.file("mau/danh-sach.json")?.asText() ?? "[]") as { ma: string; tenTep: string; luc: string }[];
  const mau = dsMau.map((m) => ({ ...m, bytes: zip.file(`mau/${m.ma}.docx`)!.asUint8Array() }));
  if (banDo.size !== thongTin.soBanDo || mau.length !== thongTin.soMau) throw new LoiSaoLuu("Số bản đồ/mẫu văn bản không khớp thông tin sao lưu.");
  return { thongTin, duAn, ho, banDo, mau, caiDat };
}

/** Khôi phục: THAY_THE xóa dữ liệu hiện có rồi nạp; GOP ghi đè bản ghi cùng mã, giữ bản ghi khác. */
export async function khoiPhuc(kho: Kho, ban: BanSaoLuu, cheDo: "THAY_THE" | "GOP"): Promise<void> {
  // Một giao dịch (P0-6): kiểu thay thế không còn "xóa hết rồi ghi dở" — lỗi giữa chừng thì dữ liệu cũ còn nguyên
  await kho.ghiLo({
    xoaTatCa: cheDo === "THAY_THE",
    ghiDe: true,
    duAn: ban.duAn,
    ho: ban.ho,
    banDo: [...ban.banDo].map(([duAnId, bytes]) => ({ duAnId, bytes })),
    mau: ban.mau.map((m) => ({ ma: m.ma, bytes: m.bytes, tenTep: m.tenTep, luc: m.luc })),
  });
  if (ban.caiDat?.lichLamViec) await kho.luuCaiDat(KHOA_LICH, ban.caiDat.lichLamViec);
  if (ban.caiDat?.tyLeChamTra) await kho.luuCaiDat("tyLeChamTra", ban.caiDat.tyLeChamTra);
  if (ban.caiDat?.kyBaoCao) await kho.luuCaiDat("kyBaoCao", ban.caiDat.kyBaoCao);
  if (ban.caiDat?.donVi) await kho.luuCaiDat("donVi", ban.caiDat.donVi);
  if (ban.caiDat?.anhNen) await kho.luuCaiDat("anhNen", ban.caiDat.anhNen);
}

const KHOA_LAN_CUOI = "gpmb-sao-luu-lan-cuoi";
export function ghiLanSaoLuu(luc: string) {
  try {
    localStorage.setItem(KHOA_LAN_CUOI, luc);
  } catch {
    /* bỏ qua khi trình duyệt chặn lưu trữ */
  }
}
export function docLanSaoLuu(): string | null {
  try {
    return localStorage.getItem(KHOA_LAN_CUOI);
  } catch {
    return null;
  }
}

/** Nhắc sao lưu: chưa từng sao lưu, hoặc quá `soNgay` ngày kể từ lần cuối (chỉ khi đã có dữ liệu). */
export function canhBaoSaoLuu(lanCuoi: string | null, homNay: string, coDuLieu: boolean, soNgay = 7): string | null {
  if (!coDuLieu) return null;
  if (!lanCuoi) return "Chưa có bản sao lưu dữ liệu nào — nên tạo bản sao lưu và cất ra thiết bị khác (USB, ổ mạng nội bộ).";
  const cach = Math.floor((Date.parse(homNay) - Date.parse(lanCuoi.slice(0, 10))) / 86400000);
  return cach > soNgay ? `Đã ${cach} ngày chưa sao lưu dữ liệu (lần cuối ${lanCuoi.slice(8, 10)}/${lanCuoi.slice(5, 7)}/${lanCuoi.slice(0, 4)}).` : null;
}

export const tenTepSaoLuu = (luc: string, tienTo = "GPMB-sao-luu") => `${tienTo}_${luc.slice(0, 10)}_${luc.slice(11, 16).replace(":", "")}.gpmb`;

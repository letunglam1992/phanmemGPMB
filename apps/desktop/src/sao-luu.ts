/**
 * Sao lưu, khôi phục toàn bộ dữ liệu trên máy thành một tệp .gpmb (định dạng zip):
 *   thong-tin.json  – định dạng, phiên bản, thời điểm, số lượng, mã băm SHA-256 của du-lieu.json
 *   du-lieu.json    – dự án, hồ sơ hộ
 *   ban-do/<id>.dgn – bản đồ DGN đã nạp theo dự án
 *   mau/<ma>.docx   – mẫu văn bản cán bộ tự chỉnh (+ mau/danh-sach.json)
 *   dinh-kem/<id>.bin – tệp đính kèm hồ sơ (P2-2, + dinh-kem/danh-sach.json; tệp cũ không có)
 *   lich-su.json    – lịch sử thay đổi (bản cũ của bản ghi, P1-5; có từ 0.9.27, mã băm riêng trong thong-tin.json)
 * Tệp chỉ tạo và đọc trên máy; không gửi đi đâu.
 *
 * Phiên bản 2 (P0-5, mã hóa): tệp .gpmb ngoài chỉ gồm
 *   thong-tin.json  – định dạng, phiên bản 2, thời điểm, số lượng, tham số mã hóa (không có dữ liệu cá nhân)
 *   du-lieu.bin     – tệp phiên bản 1 ở trên, mã hóa AES-256-GCM (ma-hoa.ts)
 * Tệp phiên bản 1 (không mã hóa) vẫn đọc được để không mất bản cũ.
 */
import PizZip from "pizzip";
import type { BanLichSu, DinhKem, Kho } from "./kho";
import type { DuAn, Ho } from "./mo-hinh";
import { LoiMaHoa, giaiMa, maHoa, moTaCachMo, type CachMaHoa, type GoiMaHoa } from "./ma-hoa";

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
  /** Số tệp đính kèm (có từ 0.7.0) */
  soDinhKem?: number;
  /** Số bản lịch sử thay đổi, mã băm lich-su.json (có từ 0.9.27) */
  soLichSu?: number;
  bamLichSu?: string;
  bamDuLieu: string;
}

export interface BanSaoLuu {
  thongTin: ThongTinSaoLuu;
  duAn: DuAn[];
  ho: Ho[];
  banDo: Map<string, Uint8Array>;
  mau: { ma: string; tenTep: string; luc: string; bytes: Uint8Array }[];
  dinhKem: { meta: DinhKem; bytes: Uint8Array }[];
  /** Lịch sử thay đổi (0.9.27; tệp cũ không có) */
  lichSu?: BanLichSu[];
  /** Cài đặt dùng chung (có từ bản ghi lịch làm việc; tệp cũ không có). */
  caiDat?: { lichLamViec?: unknown; tyLeChamTra?: unknown; kyBaoCao?: unknown; donVi?: unknown; anhNen?: unknown; goiChinhSach?: unknown };
}

export class LoiSaoLuu extends Error {}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lọc nội dung (gói gửi cấp tỉnh): chỉ các dự án chọn; bỏ tệp đính kèm / bản đồ / mẫu văn bản. */
export interface LocSaoLuu {
  duAnIds?: string[];
  boDinhKem?: boolean;
  boBanDo?: boolean;
  boMau?: boolean;
  /** Bỏ tệp đính kèm đã xóa (thùng rác tệp) — gói gửi tỉnh */
  boTepDaXoa?: boolean;
  /** Bỏ lịch sử thay đổi (gói gửi tỉnh) */
  boLichSu?: boolean;
}

export async function taoBanSaoLuu(kho: Kho, ungDung = "0.1", loc: LocSaoLuu = {}): Promise<{ bytes: Uint8Array; thongTin: ThongTinSaoLuu }> {
  const chon = loc.duAnIds ? new Set(loc.duAnIds) : null;
  const duAn = (await kho.dsDuAn()).filter((d) => !chon || chon.has(d.id));
  const ho = (await Promise.all(duAn.map((d) => kho.dsHo(d.id)))).flat();
  const zip = new PizZip();
  const caiDat = { lichLamViec: await kho.docCaiDat(KHOA_LICH), tyLeChamTra: await kho.docCaiDat("tyLeChamTra"), kyBaoCao: await kho.docCaiDat("kyBaoCao"), donVi: await kho.docCaiDat("donVi"), anhNen: await kho.docCaiDat("anhNen"), goiChinhSach: await kho.docCaiDat("goiChinhSach") };
  const duLieu = JSON.stringify({ duAn, ho, caiDat });
  zip.file("du-lieu.json", duLieu);
  let soBanDo = 0;
  for (const id of loc.boBanDo ? [] : await kho.dsBanDo()) {
    if (chon && !chon.has(id.split("#")[0]!)) continue;
    const b = await kho.docBanDo(id);
    if (b) {
      zip.file(`ban-do/${id}.dgn`, b);
      soBanDo++;
    }
  }
  const dsMau: { ma: string; tenTep: string; luc: string }[] = [];
  for (const ma of loc.boMau ? [] : await kho.dsMauTuy()) {
    const m = await kho.docMau(ma);
    if (m) {
      zip.file(`mau/${ma}.docx`, m.bytes);
      dsMau.push({ ma, tenTep: m.tenTep, luc: m.luc });
    }
  }
  zip.file("mau/danh-sach.json", JSON.stringify(dsMau));
  const dsDk: DinhKem[] = [];
  for (const d of loc.boDinhKem ? [] : duAn)
    for (const m of await kho.dsDinhKem(d.id)) {
      if (loc.boTepDaXoa && (m.daXoa || m.thayBoi)) continue; // 1.0.7: gói tỉnh không kèm bản trước của tệp
      const b = await kho.docDinhKem(m.id);
      if (b) {
        zip.file(`dinh-kem/${m.id}.bin`, b);
        dsDk.push(m);
      }
    }
  zip.file("dinh-kem/danh-sach.json", JSON.stringify(dsDk));
  const lichSu = loc.boLichSu ? null : await kho.xuatLichSu(chon ? [...chon] : undefined);
  const chuLs = lichSu && JSON.stringify(lichSu);
  if (chuLs) zip.file("lich-su.json", chuLs);
  const thongTin: ThongTinSaoLuu = {
    dinhDang: DINH_DANG,
    phienBan: PHIEN_BAN_SAO_LUU,
    luc: new Date().toISOString(),
    ungDung,
    soDuAn: duAn.length,
    soHo: ho.length,
    soBanDo,
    soMau: dsMau.length,
    soDinhKem: dsDk.length,
    ...(lichSu && chuLs ? { soLichSu: lichSu.length, bamLichSu: await sha256(chuLs) } : {}),
    bamDuLieu: await sha256(duLieu),
  };
  zip.file("thong-tin.json", JSON.stringify(thongTin, null, 2));
  return { bytes: zip.generate({ type: "uint8array", compression: "DEFLATE" }), thongTin };
}

export const PHIEN_BAN_MA_HOA = 2;

/** Thông tin ngoài của tệp mã hóa (đọc được khi chưa có mật khẩu). */
export interface ThongTinMaHoa extends Omit<ThongTinSaoLuu, "bamDuLieu"> {
  maHoa: GoiMaHoa;
}

/** Tệp cần mật khẩu: giao diện hỏi mật khẩu rồi gọi lại docBanSaoLuu. */
export class LoiCanMatKhau extends LoiSaoLuu {
  constructor(public thongTin: ThongTinMaHoa, loi?: string) {
    super(loi ?? `Tệp sao lưu đã mã hóa — nhập ${moTaCachMo(thongTin.maHoa)}.`);
  }
}

/** Mã hóa một bản sao lưu (phiên bản 1) thành tệp phiên bản 2. */
export async function maHoaBanSaoLuu(ban: { bytes: Uint8Array; thongTin: ThongTinSaoLuu }, cach: CachMaHoa): Promise<Uint8Array> {
  const { goi, bytes } = await maHoa(ban.bytes, cach);
  const { bamDuLieu: _bo, ...tt } = ban.thongTin;
  const ngoai: ThongTinMaHoa = { ...tt, phienBan: PHIEN_BAN_MA_HOA, maHoa: goi };
  const zip = new PizZip();
  zip.file("thong-tin.json", JSON.stringify(ngoai, null, 2));
  zip.file("du-lieu.bin", bytes);
  return zip.generate({ type: "uint8array", compression: "STORE" });
}

/** Đọc thông tin ngoài: null nếu là tệp phiên bản 1 (không mã hóa). */
export function thongTinMaHoa(bytes: Uint8Array | ArrayBuffer): ThongTinMaHoa | null {
  try {
    const tt = JSON.parse(new PizZip(bytes).file("thong-tin.json")?.asText() ?? "{}") as Partial<ThongTinMaHoa>;
    return tt.dinhDang === DINH_DANG && tt.maHoa ? (tt as ThongTinMaHoa) : null;
  } catch {
    return null;
  }
}

/**
 * Đọc và kiểm tra tệp sao lưu (định dạng, phiên bản, mã băm, số lượng). Tệp mã hóa: giải mã bằng `cach`
 * (DPAPI của máy, mật khẩu sao lưu hoặc mật khẩu khôi phục); chưa mở được → LoiCanMatKhau.
 */
export async function docBanSaoLuu(bytes: Uint8Array | ArrayBuffer, cach: { matKhau?: string; dpapiMo?: ((b: Uint8Array) => Promise<Uint8Array>) | null } = {}): Promise<BanSaoLuu> {
  const mh = thongTinMaHoa(bytes);
  if (mh) {
    if (mh.phienBan > PHIEN_BAN_MA_HOA) throw new LoiSaoLuu(`Bản sao lưu phiên bản ${mh.phienBan} mới hơn phần mềm — cần cập nhật phần mềm.`);
    const du = new PizZip(bytes).file("du-lieu.bin")?.asUint8Array();
    if (!du) throw new LoiSaoLuu("Tệp thiếu dữ liệu (du-lieu.bin).");
    let trong: Uint8Array;
    try {
      trong = await giaiMa(mh.maHoa, du, cach);
    } catch (e) {
      if (e instanceof LoiMaHoa && /hỏng|bị sửa/.test(e.message)) throw new LoiSaoLuu(e.message);
      throw new LoiCanMatKhau(mh, cach.matKhau ? (e as Error).message : undefined);
    }
    return docBanSaoLuu(trong);
  }
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
  const dsDk = JSON.parse(zip.file("dinh-kem/danh-sach.json")?.asText() ?? "[]") as DinhKem[];
  const dinhKem = dsDk.flatMap((meta) => {
    const f = zip.file(`dinh-kem/${meta.id}.bin`);
    return f ? [{ meta, bytes: f.asUint8Array() }] : [];
  });
  if (thongTin.soDinhKem !== undefined && dinhKem.length !== thongTin.soDinhKem) throw new LoiSaoLuu("Số tệp đính kèm không khớp thông tin sao lưu.");
  let lichSu: BanLichSu[] | undefined;
  if (thongTin.bamLichSu) {
    const chu = zip.file("lich-su.json")?.asText();
    if (!chu || (await sha256(chu)) !== thongTin.bamLichSu) throw new LoiSaoLuu("Lịch sử thay đổi trong tệp sao lưu không khớp mã kiểm tra — tệp có thể bị hỏng hoặc bị sửa. Không khôi phục.");
    lichSu = JSON.parse(chu) as BanLichSu[];
    if (lichSu.length !== thongTin.soLichSu) throw new LoiSaoLuu("Số bản lịch sử không khớp thông tin sao lưu.");
  }
  return { thongTin, duAn, ho, banDo, mau, caiDat, dinhKem, ...(lichSu ? { lichSu } : {}) };
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
    dinhKem: (ban.dinhKem ?? []).map((f) => ({ meta: f.meta, bytes: f.bytes })),
  });
  // lịch sử thay đổi (0.9.27): thêm các bản chưa có — không đổi dữ liệu hiện hành
  if (ban.lichSu?.length) await kho.napLichSu(ban.lichSu);
  if (ban.caiDat?.lichLamViec) await kho.luuCaiDat(KHOA_LICH, ban.caiDat.lichLamViec);
  if (ban.caiDat?.tyLeChamTra) await kho.luuCaiDat("tyLeChamTra", ban.caiDat.tyLeChamTra);
  if (ban.caiDat?.kyBaoCao) await kho.luuCaiDat("kyBaoCao", ban.caiDat.kyBaoCao);
  if (ban.caiDat?.donVi) await kho.luuCaiDat("donVi", ban.caiDat.donVi);
  if (ban.caiDat?.anhNen) await kho.luuCaiDat("anhNen", ban.caiDat.anhNen);
  // gói chính sách (P2-1): gộp theo khóa — dự án trong bản sao lưu cần bộ chính sách của nó
  if (Array.isArray(ban.caiDat?.goiChinhSach) && ban.caiDat.goiChinhSach.length) {
    const cu = ((await kho.docCaiDat<{ khoa: string }[]>("goiChinhSach")) ?? []);
    const them = (ban.caiDat.goiChinhSach as { khoa: string }[]).filter((g) => !cu.some((x) => x.khoa === g.khoa));
    if (them.length) await kho.luuCaiDat("goiChinhSach", [...cu, ...them]);
  }
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

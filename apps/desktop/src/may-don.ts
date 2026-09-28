/**
 * Máy đơn trên bản cài Windows (Giai đoạn 3): dữ liệu lưu SQLite qua lõi Rust gọi trong tiến trình (cùng lõi, cùng quy tắc
 * nghiệp vụ, lịch sử, kiểm tra cấu trúc với máy chủ mạng nội bộ) — không mở cổng mạng.
 * Lần đầu mở: nếu CSDL SQLite còn trống mà IndexedDB (bản ≤ 0.5) có dữ liệu → chuyển toàn bộ sang SQLite trong một giao dịch
 * (tài khoản, nhật ký hệ thống giữ nguyên chuỗi băm, cài đặt, bản đồ, mẫu văn bản). Dữ liệu IndexedDB giữ nguyên, không xóa.
 */
import { taoKhoIndexedDb, taoKhoBoNho, type Kho } from "./kho";
import { DIA_CHI_NOI_BO, guiQuaVo, taoKhoMang, type GuiYeuCau, type KhoMang } from "./kho-mang";
import type { DuAn, Ho } from "./mo-hinh";
import type { NguoiDung } from "./tai-khoan";
import type { DongNhatKy } from "./nhat-ky";
import { KHOA_LICH } from "./sao-luu";
import { KHOA_TY_LE_CHAM } from "./chi-tra";
import { KHOA_KHOI_PHUC, KHOA_TU_DONG } from "./tu-dong-sao-luu";
import { KHOA_KY_BAO_CAO } from "./ky-bao-cao";
import { KHOA_DON_VI } from "./don-vi";

/** Các khóa cài đặt lưu trong kho (đồng bộ với nơi dùng docCaiDat/luuCaiDat). */
export const KHOA_CAI_DAT = [KHOA_LICH, KHOA_TY_LE_CHAM, KHOA_TU_DONG, KHOA_KY_BAO_CAO, KHOA_DON_VI, "anhNen", KHOA_KHOI_PHUC, "giuLichSu"];

export interface DuLieuMayDon {
  duAn: DuAn[];
  ho: Ho[];
  tep: { loai: "banDo" | "mau"; id: string; meta: string; noiDung: string }[];
  caiDat: { khoa: string; giaTri: unknown }[];
  nguoiDung: NguoiDung[];
  nhatKy: DongNhatKy[];
}

const b64 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Đọc toàn bộ dữ liệu của một kho cục bộ (IndexedDB) theo định dạng chuyển đổi. */
export async function docToanBo(kho: Kho, khoaCaiDat = KHOA_CAI_DAT): Promise<DuLieuMayDon> {
  const duAn = await kho.dsDuAn();
  const ho = (await Promise.all(duAn.map((d) => kho.dsHo(d.id)))).flat();
  const tep: DuLieuMayDon["tep"] = [];
  for (const id of await kho.dsBanDo()) {
    const b = await kho.docBanDo(id);
    if (b) tep.push({ loai: "banDo", id, meta: "{}", noiDung: b64(b) });
  }
  for (const ma of await kho.dsMauTuy()) {
    const m = await kho.docMau(ma);
    if (m) tep.push({ loai: "mau", id: ma, meta: JSON.stringify({ tenTep: m.tenTep, luc: m.luc }), noiDung: b64(m.bytes) });
  }
  const caiDat: DuLieuMayDon["caiDat"] = [];
  for (const k of khoaCaiDat) {
    const v = await kho.docCaiDat<unknown>(k);
    if (v !== null) caiDat.push({ khoa: k, giaTri: v });
  }
  return { duAn, ho, tep, caiDat, nguoiDung: await kho.dsNguoiDung(), nhatKy: (await kho.dsNhatKy()).sort((a, b) => a.stt - b.stt) };
}

/** Dựng kho bộ nhớ từ dữ liệu xuất (để dùng lại các chức năng sao lưu / đưa lên máy chủ). */
export async function khoTuDuLieu(d: DuLieuMayDon): Promise<Kho> {
  const k = taoKhoBoNho();
  await k.ghiLo({ duAn: d.duAn, ho: d.ho, banDo: d.tep.filter((t) => t.loai === "banDo").map((t) => ({ duAnId: t.id, bytes: tuB64(t.noiDung) })) });
  for (const t of d.tep.filter((x) => x.loai === "mau")) {
    const m = JSON.parse(t.meta || "{}") as { tenTep?: string };
    await k.luuMau(t.id, tuB64(t.noiDung), m.tenTep ?? `${t.id}.docx`);
  }
  for (const c of d.caiDat) await k.luuCaiDat(c.khoa, c.giaTri);
  for (const u of d.nguoiDung) await k.luuNguoiDung(u);
  return k;
}

async function coIndexedDbCu(): Promise<boolean> {
  try {
    const ds = await indexedDB.databases?.();
    return !!ds?.some((x) => x.name === "gpmb-sonla");
  } catch {
    return true; // không liệt kê được: mở thử (mở tạo CSDL trống nếu chưa có — vô hại)
  }
}

/** Mở máy đơn SQLite; chuyển dữ liệu IndexedDB cũ nếu cần. Trả kho và tóm tắt chuyển đổi (nếu có). */
export async function moMayDon(
  gui: GuiYeuCau = guiQuaVo({ diaChi: DIA_CHI_NOI_BO, vanTay: "" }),
  khoCu: () => Promise<Kho | null> = async () => ((await coIndexedDbCu()) ? taoKhoIndexedDb() : null),
): Promise<{ kho: KhoMang; daChuyen: string | null }> {
  const kho = taoKhoMang({ diaChi: DIA_CHI_NOI_BO, vanTay: "" }, gui);
  const tt = await kho.trangThai();
  let daChuyen: string | null = null;
  const nguon = tt.coTaiKhoan ? null : await khoCu();
  if (nguon) {
    const cu = await docToanBo(nguon);
    if (cu.nguoiDung.length || cu.duAn.length) {
      const r = await gui("POST", "/api/noi-bo/chuyen-du-lieu", { than: new TextEncoder().encode(JSON.stringify(cu)) });
      const v = JSON.parse(new TextDecoder().decode(r.than)) as { tomTat?: string; loi?: string };
      if (r.ma !== 200) throw new Error(`Không chuyển được dữ liệu máy đơn cũ sang SQLite: ${v.loi ?? r.ma}. Dữ liệu cũ vẫn nguyên vẹn.`);
      daChuyen = v.tomTat ?? "";
    }
  }
  return { kho, daChuyen };
}

/** Dữ liệu máy đơn của máy này (SQLite nếu là bản cài Windows, không cần đăng nhập) — để đưa lên máy chủ. */
export async function docDuLieuMayDon(gui: GuiYeuCau = guiQuaVo({ diaChi: DIA_CHI_NOI_BO, vanTay: "" })): Promise<DuLieuMayDon> {
  const r = await gui("GET", "/api/noi-bo/xuat");
  if (r.ma !== 200) throw new Error(`Không đọc được dữ liệu máy đơn (mã ${r.ma})`);
  return JSON.parse(new TextDecoder().decode(r.than)) as DuLieuMayDon;
}

/**
 * Kho dữ liệu qua máy chủ mạng nội bộ (docs/11). Mọi yêu cầu đi qua vỏ ứng dụng (lệnh goi_may_chu)
 * bằng HTTPS ghim vân tay chứng chỉ. Máy chủ kiểm tra lại quyền và quy tắc nghiệp vụ; kho này chỉ
 * chuyển tiếp, giữ phiên bản bản ghi để phát hiện xung đột khi hai người cùng sửa.
 */
import type { BanLichSu, CanBo, DinhKem, Kho, KetQuaGhi } from "./kho";
import type { PhienBanPA } from "./phuong-an";
import type { DuAn, Ho } from "./mo-hinh";
import type { NguoiDung } from "./tai-khoan";
import type { DongNhatKy } from "./nhat-ky";

export interface KetNoi {
  /** IP[:cổng] của máy chủ, vd. 192.168.1.10:47800 */
  diaChi: string;
  /** Vân tay SHA-256 chứng chỉ máy chủ (AB:CD:…). */
  vanTay: string;
}

export interface TraLoi {
  ma: number;
  meta: string;
  than: Uint8Array;
}

export type GuiYeuCau = (phuongThuc: string, duongDan: string, o?: { token?: string; than?: Uint8Array; meta?: string }) => Promise<TraLoi>;

/** Lỗi do máy chủ trả về (mã HTTP + thông báo tiếng Việt). */
export class LoiMayChu extends Error {
  constructor(
    public ma: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ThayDoi {
  seq: number;
  loai: string;
  id: string;
  duAnId: string | null;
  boi: string;
  luc: string;
}

export interface KhoMang extends Kho {
  mang: true;
  ketNoi: KetNoi;
  /** Máy đơn: lõi SQLite gọi trong tiến trình (không qua mạng). */
  noiBo: boolean;
  trangThai(): Promise<{ coTaiKhoan: boolean; phienBan: string }>;
  dangNhap(ten: string, matKhau: string): Promise<NguoiDung>;
  khoiTao(u: NguoiDung): Promise<NguoiDung>;
  dangXuat(): Promise<void>;
  /** Đổi mật khẩu của chính mình: `moi` đã băm ở máy trạm; máy chủ kiểm tra mật khẩu cũ. */
  doiMatKhau(moi: NguoiDung, matKhauCu: string): Promise<NguoiDung>;
  thayDoi(sau: number | null): Promise<{ seq: number; ds: ThayDoi[] }>;
  /** Đọc lại các bản ghi vừa đổi (P1-2); bản ghi đã xóa → null. Phương án trả về kèm mã dự án. */
  docNhieu(ds: { loai: string; id: string }[]): Promise<BanGhiDoc[]>;
  /** Đọc lại hồ sơ, dự án (đã ghép phần con) theo danh sách thay đổi của máy chủ. */
  docLai(ds: ThayDoi[]): Promise<{ ho: Ho[]; xoaHo: string[]; duAn: DuAn[]; xoaDuAn: string[] }>;
  coPhien(): boolean;
}

export type BanGhiDoc =
  | { loai: "ho"; id: string; duLieu: Ho | null }
  | { loai: "duAn"; id: string; duLieu: DuAn | null }
  | { loai: "pa"; id: string; duLieu: { id: string; duAnId: string; pa: PhienBanPA } | null };

export const DIA_CHI_NOI_BO = "noi-bo";

/** JSON với khóa sắp xếp, bỏ trường undefined — so sánh nội dung không phụ thuộc thứ tự khóa. */
export function chuan(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : x,
  );
}

export const laKhoMang = (k: Kho): k is KhoMang => (k as Partial<KhoMang>).mang === true;

const MA = new TextEncoder();
const GIAI = new TextDecoder();

/** Gửi qua vỏ Tauri: lệnh goi_may_chu (HTTPS tới máy chủ) hoặc goi_noi_bo (máy đơn, lõi SQLite trong tiến trình). */
export function guiQuaVo(k: KetNoi): GuiYeuCau {
  return async (phuongThuc, duongDan, o = {}) => {
    const { invoke } = await import("@tauri-apps/api/core");
    const headers: Record<string, string> = { "x-dia-chi": k.diaChi, "x-van-tay": k.vanTay, "x-phuong-thuc": phuongThuc, "x-duong-dan": duongDan };
    if (o.token) headers["x-token"] = o.token;
    if (o.meta) headers["x-meta"] = o.meta;
    const r = await invoke<ArrayBuffer>(k.diaChi === DIA_CHI_NOI_BO ? "goi_noi_bo" : "goi_may_chu", o.than ?? new Uint8Array(), { headers });
    const b = new Uint8Array(r);
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const ma = dv.getUint16(0);
    const n = dv.getUint32(2);
    return { ma, meta: GIAI.decode(b.subarray(6, 6 + n)), than: b.subarray(6 + n) };
  };
}

export function taoKhoMang(ketNoi: KetNoi, gui: GuiYeuCau = guiQuaVo(ketNoi)): KhoMang {
  let token: string | undefined;
  const phienBan = new Map<string, number>();

  async function goi(pt: string, dd: string, o: { json?: unknown; than?: Uint8Array; meta?: string; cho404?: boolean } = {}): Promise<TraLoi> {
    const than = o.json !== undefined ? MA.encode(JSON.stringify(o.json)) : o.than;
    const r = await gui(pt, dd, { token, than, meta: o.meta });
    if (r.ma >= 200 && r.ma < 300) return r;
    if (r.ma === 404 && o.cho404) return r;
    let tb = `Máy chủ trả lỗi ${r.ma}`;
    try {
      tb = (JSON.parse(GIAI.decode(r.than)) as { loi?: string }).loi ?? tb;
    } catch {
      /* thân không phải JSON */
    }
    if (r.ma === 401) token = undefined;
    throw new LoiMayChu(r.ma, tb);
  }
  const json = async <T>(pt: string, dd: string, o?: Parameters<typeof goi>[2]): Promise<T> => JSON.parse(GIAI.decode((await goi(pt, dd, o)).than)) as T;
  const ma = encodeURIComponent;

  async function dsBanGhi<T extends { id: string }>(loai: string, dd: string): Promise<T[]> {
    const ds = await json<{ duLieu: T; phienBan: number }[]>("GET", dd);
    for (const x of ds) phienBan.set(`${loai}:${x.duLieu.id}`, x.phienBan);
    return ds.map((x) => x.duLieu);
  }
  /**
   * P1-6: mỗi bản phương án là một bản ghi riêng ("pa") trên máy chủ; giao diện vẫn dùng DuAn.phuongAn. Khi lưu dự án chỉ
   * gửi phần đã đổi (lõi dự án / từng bản phương án) — sửa thông tin dự án không xung đột với người đang chốt phương án.
   */
  const daDoc = new Map<string, string>(); // "loai:id" → JSON (khóa sắp xếp) bản đã đọc/ghi gần nhất
  const tach = (d: DuAn) => {
    const { phuongAn, ...loi } = d;
    return { loi: loi as DuAn, pa: (phuongAn ?? []).map((p) => ({ id: p.id, duAnId: d.id, pa: p })) };
  };
  const ghep = (loi: DuAn, pa: { duAnId: string; pa: PhienBanPA }[]): DuAn => {
    const ds = pa.filter((x) => x.duAnId === loi.id).map((x) => x.pa);
    return ds.length ? { ...loi, phuongAn: ds } : { ...loi };
  };
  const nho = (loai: string, v: { id: string }, pb?: number) => {
    daDoc.set(`${loai}:${v.id}`, chuan(v));
    if (pb !== undefined) phienBan.set(`${loai}:${v.id}`, pb);
  };
  const muc = (loai: string, duLieu: { id: string }, ghiDe = false) => ({ loai, duLieu, phienBanTruoc: ghiDe ? null : phienBan.get(`${loai}:${duLieu.id}`) ?? null });
  /** Các mục cần gửi để lưu một dự án (lõi + bản phương án đã đổi). */
  const mucDuAn = (d: DuAn, ghiDe: boolean) => {
    const { loi, pa } = tach(d);
    const out = [];
    if (ghiDe || daDoc.get(`duAn:${d.id}`) !== chuan(loi)) out.push(muc("duAn", loi, ghiDe));
    for (const p of pa) if (ghiDe || daDoc.get(`pa:${p.id}`) !== chuan(p)) out.push(muc("pa", p, ghiDe));
    return out;
  };
  /**
   * P2-7: hồ sơ trên máy chủ gồm bản ghi chính ("ho"), tiến độ ("td") và chi trả ("ct") — mỗi phần một phiên bản, để
   * người ghi chi trả không xung đột với người cập nhật tiến độ hay thông tin hồ sơ. Nhật ký hồ sơ nằm ở phần nào sinh ra
   * nó; dòng nhật ký mới đi vào phần có thay đổi (ưu tiên bản ghi chính, rồi chi trả, rồi tiến độ). Giao diện vẫn dùng Ho đầy đủ.
   */
  type TienDoBg = { id: string; duAnId: string; tienDo: Ho["tienDo"]; nhatKy: Ho["nhatKy"] };
  type ChiTraBg = { id: string; duAnId: string; chiTra: NonNullable<Ho["chiTra"]>; nhatKy: Ho["nhatKy"] };
  const docCache = <T,>(k: string): T | null => {
    const x = daDoc.get(k);
    return x ? (JSON.parse(x) as T) : null;
  };
  const khongNk = <T extends { nhatKy?: unknown }>(x: T | null) => (x ? chuan({ ...x, nhatKy: undefined }) : null);
  const tachHo = (h: Ho): { loi: Ho; td: TienDoBg; ct: ChiTraBg | null } => {
    const { tienDo, chiTra, nhatKy, ...con } = h;
    const [cLoi, cTd, cCt] = [docCache<Ho>(`ho:${h.id}`), docCache<TienDoBg>(`td:${h.id}`), docCache<ChiTraBg>(`ct:${h.id}`)];
    const loi = { ...con, nhatKy: [] as Ho["nhatKy"] } as Ho;
    const td: TienDoBg = { id: h.id, duAnId: h.duAnId, tienDo: tienDo ?? {}, nhatKy: [] };
    const ct: ChiTraBg | null = chiTra ? { id: h.id, duAnId: h.duAnId, chiTra, nhatKy: [] } : null;
    const bo = (ds: Ho["nhatKy"] | undefined) => new Set((ds ?? []).map((x) => JSON.stringify(x)));
    const [kLoi, kTd, kCt] = [bo(cLoi?.nhatKy), bo(cTd?.nhatKy), bo(cCt?.nhatKy)];
    const doiLoi = khongNk(loi) !== khongNk(cLoi), doiCt = !!ct && khongNk(ct) !== khongNk(cCt), doiTd = khongNk(td) !== khongNk(cTd);
    const dich = doiLoi || !cLoi ? loi : doiCt ? ct! : doiTd ? td : loi;
    for (const n of nhatKy ?? []) {
      const k = JSON.stringify(n);
      (kTd.has(k) ? td : kCt.has(k) && ct ? ct : kLoi.has(k) ? loi : dich).nhatKy.push(n);
    }
    return { loi, td, ct };
  };
  const ghepHo = (loi: Ho, td: TienDoBg | null, ct: ChiTraBg | null): Ho => {
    const nk = [...(loi.nhatKy ?? []), ...(td?.nhatKy ?? []), ...(ct?.nhatKy ?? [])].sort((a, b) => a.luc.localeCompare(b.luc));
    return { ...loi, tienDo: td?.tienDo ?? {}, ...(ct ? { chiTra: ct.chiTra } : {}), nhatKy: nk };
  };
  const ghepTuCache = (id: string): Ho | null => {
    const loi = docCache<Ho>(`ho:${id}`);
    return loi && ghepHo(loi, docCache<TienDoBg>(`td:${id}`), docCache<ChiTraBg>(`ct:${id}`));
  };
  const mucHo = (h: Ho, ghiDe: boolean) => {
    const t = tachHo(h);
    const out = [];
    for (const [loai, v] of [["ho", t.loi], ["td", t.td], ["ct", t.ct]] as const)
      if (v && (ghiDe || daDoc.get(`${loai}:${h.id}`) !== chuan(v))) out.push(muc(loai, v, ghiDe));
    return out;
  };

  /** Gửi lô, nhận bản ghi đã lưu; cập nhật phiên bản và bộ nhớ đọc. */
  async function guiLo(than: Record<string, unknown>, ghi: ReturnType<typeof muc>[], dsDuAnGoc: DuAn[], dsHoGoc: Ho[] = []): Promise<KetQuaGhi> {
    const r = await json<{ phienBan: { loai: string; id: string; phienBan: number; duLieu: { id: string } }[] }>("POST", "/api/lo", { json: { ...than, ghi } });
    const loi = new Map<string, DuAn>();
    const pa: { id: string; duAnId: string; pa: PhienBanPA }[] = [];
    for (const x of r.phienBan) {
      nho(x.loai, x.duLieu, x.phienBan);
      if (x.loai === "duAn") loi.set(x.id, x.duLieu as DuAn);
      else if (x.loai === "pa") pa.push(x.duLieu as { id: string; duAnId: string; pa: PhienBanPA });
    }
    const duAn = dsDuAnGoc.map((d) => {
      const t = tach(d);
      const l = loi.get(d.id) ?? t.loi;
      return ghep(l, t.pa.map((p) => pa.find((q) => q.id === p.id) ?? p));
    });
    return { duAn, ho: dsHoGoc.map((h) => ghepTuCache(h.id) ?? h) };
  }

  const dsTep = (loai: string) => json<string[]>("GET", `/api/tep/${loai}`);

  return {
    mang: true,
    ketNoi,
    coPhien: () => !!token,
    trangThai: () => json("GET", "/api/trang-thai"),
    async dangNhap(ten, matKhau) {
      const r = await json<{ token: string; nguoiDung: NguoiDung }>("POST", "/api/dang-nhap", { json: { ten, matKhau } });
      token = r.token;
      return r.nguoiDung;
    },
    async khoiTao(u) {
      const r = await json<{ token: string; nguoiDung: NguoiDung }>("POST", "/api/khoi-tao", { json: u });
      token = r.token;
      return r.nguoiDung;
    },
    async dangXuat() {
      try {
        await goi("POST", "/api/dang-xuat");
      } finally {
        token = undefined;
      }
    },
    doiMatKhau: (moi, matKhauCu) => json("POST", "/api/doi-mat-khau", { json: { matKhauCu, moi: { muoi: moi.muoi, vongLap: moi.vongLap, bam: moi.bam } } }),
    thayDoi: (sau) => json("GET", `/api/thay-doi${sau === null ? "" : `?sau=${sau}`}`),

    noiBo: ketNoi.diaChi === DIA_CHI_NOI_BO,
    datNguoi() {
      /* máy chủ ghi người theo phiên đăng nhập */
    },
    async dsDuAn() {
      const loi = await dsBanGhi<DuAn>("duAn", "/api/du-an");
      const pa = await dsBanGhi<{ id: string; duAnId: string; pa: PhienBanPA }>("pa", "/api/pa");
      for (const d of loi) nho("duAn", d);
      for (const p of pa) nho("pa", p);
      return loi.map((d) => ghep(d, pa));
    },
    async luuDuAn(d) {
      const ghi = mucDuAn(d, false);
      if (!ghi.length) return d;
      if (ghi.length === 1 && ghi[0]!.loai === "duAn") {
        const r = await json<{ duLieu: DuAn; phienBan: number }>("PUT", `/api/du-an/${ma(d.id)}`, { json: { duLieu: ghi[0]!.duLieu, phienBanTruoc: ghi[0]!.phienBanTruoc } });
        nho("duAn", r.duLieu, r.phienBan);
        return { ...r.duLieu, ...(d.phuongAn ? { phuongAn: d.phuongAn } : {}) };
      }
      return (await guiLo({}, ghi, [d])).duAn[0]!;
    },
    async xoaDuAn(id) {
      await goi("DELETE", `/api/du-an/${ma(id)}`);
    },
    async dsHo(duAnId) {
      const loi = await dsBanGhi<Ho>("ho", `/api/ho?duAn=${ma(duAnId)}`);
      const td = await dsBanGhi<TienDoBg>("td", `/api/ban-ghi?loai=td&duAn=${ma(duAnId)}`);
      const ct = await dsBanGhi<ChiTraBg>("ct", `/api/ban-ghi?loai=ct&duAn=${ma(duAnId)}`);
      for (const x of loi) nho("ho", x);
      for (const x of td) nho("td", x);
      for (const x of ct) nho("ct", x);
      const mTd = new Map(td.map((x) => [x.id, x])), mCt = new Map(ct.map((x) => [x.id, x]));
      return loi.map((h) => ghepHo(h, mTd.get(h.id) ?? null, mCt.get(h.id) ?? null));
    },
    async luuHo(h) {
      const ghi = mucHo(h, false);
      if (!ghi.length) return ghepTuCache(h.id) ?? h;
      if (ghi.length === 1 && ghi[0]!.loai === "ho") {
        const r = await json<{ duLieu: Ho; phienBan: number }>("PUT", `/api/ho/${ma(h.id)}`, { json: { duLieu: ghi[0]!.duLieu, phienBanTruoc: ghi[0]!.phienBanTruoc } });
        nho("ho", r.duLieu, r.phienBan);
      } else await guiLo({}, ghi, []);
      return ghepTuCache(h.id)!;
    },
    async docLai(ds) {
      const hoId = [...new Set(ds.filter((x) => x.loai === "ho" || x.loai === "td" || x.loai === "ct").map((x) => x.id))];
      const duAnId = [...new Set(ds.flatMap((x) => (x.loai === "duAn" ? [x.id] : x.loai === "pa" && x.duAnId ? [x.duAnId] : [])))];
      const r = await this.docNhieu([...hoId.flatMap((id) => ["ho", "td", "ct"].map((loai) => ({ loai, id }))), ...duAnId.map((id) => ({ loai: "duAn", id }))]);
      const out = { ho: [] as Ho[], xoaHo: [] as string[], duAn: [] as DuAn[], xoaDuAn: [] as string[] };
      for (const id of hoId) {
        const h = ghepTuCache(id);
        if (h) out.ho.push(h);
        else out.xoaHo.push(id);
      }
      for (const id of duAnId) {
        const d = r.find((x) => x.loai === "duAn" && x.id === id)?.duLieu as DuAn | null | undefined;
        if (!d) {
          out.xoaDuAn.push(id);
          continue;
        }
        const pa = await dsBanGhi<{ id: string; duAnId: string; pa: PhienBanPA }>("pa", `/api/ban-ghi?loai=pa&duAn=${ma(id)}`);
        for (const p of pa) nho("pa", p);
        out.duAn.push(ghep(d, pa));
      }
      return out;
    },
    async docNhieu(ds) {
      const r = await json<{ loai: string; id: string; duLieu: { id: string } | null; phienBan: number | null }[]>("POST", "/api/doc", { json: { ds } });
      for (const x of r) {
        if (x.duLieu) nho(x.loai, x.duLieu, x.phienBan ?? undefined);
        else (phienBan.delete(`${x.loai}:${x.id}`), daDoc.delete(`${x.loai}:${x.id}`));
      }
      return r as BanGhiDoc[];
    },
    async lichSu(loai, id) {
      const doc = (l: string) => json<{ ds: BanLichSu[]; soNamGiu: number }>("GET", `/api/lich-su?loai=${ma(l)}&id=${ma(id)}`);
      if (loai !== "ho") return doc(loai);
      // hồ sơ: gộp lịch sử bản ghi chính, tiến độ, chi trả (P2-7)
      const [a, b, c] = await Promise.all([doc("ho"), doc("td"), doc("ct")]);
      return { ds: [...a.ds, ...b.ds, ...c.ds].sort((x, y) => y.stt - x.stt), soNamGiu: a.soNamGiu };
    },
    hoDaXoaHan: (duAnId) => json<BanLichSu[]>("GET", `/api/lich-su/da-xoa?duAn=${ma(duAnId)}`),
    async khoiPhucBanLichSu(stt, lyDo) {
      const r = await json<{ duLieu: Ho; phienBan: number }>("POST", "/api/lich-su/khoi-phuc", { json: { stt, lyDo } });
      await this.docNhieu(["ho", "td", "ct"].map((loai) => ({ loai, id: r.duLieu.id })));
      return ghepTuCache(r.duLieu.id)!;
    },
    async xoaHo(id) {
      await goi("DELETE", `/api/ho/${ma(id)}`);
    },
    async ghiLo(lo) {
      const b64 = (b: Uint8Array) => {
        let s = "";
        for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
        return btoa(s);
      };
      if (lo.xoaTatCa) (phienBan.clear(), daDoc.clear());
      const ghiDe = !!lo.ghiDe || !!lo.xoaTatCa;
      const ghi = [...(lo.duAn ?? []).flatMap((d) => mucDuAn(d, ghiDe)), ...(lo.ho ?? []).flatMap((h) => mucHo(h, ghiDe))];
      const tep = [
        ...(lo.banDo ?? []).map((x) => ({ loai: "banDo", id: x.duAnId, meta: "{}", noiDung: x.bytes ? b64(x.bytes) : null })),
        ...(lo.mau ?? []).map((m) => ({ loai: "mau", id: m.ma, meta: JSON.stringify({ tenTep: m.tenTep ?? `${m.ma}.docx`, luc: m.luc ?? new Date().toISOString() }), noiDung: m.bytes ? b64(m.bytes) : null })),
        ...(lo.dinhKem ?? []).map((f) => ({ loai: "dinhKem", id: f.meta.id, meta: JSON.stringify(f.meta), noiDung: f.bytes ? b64(f.bytes) : null })),
      ];
      const kq = await guiLo({ xoaTatCa: !!lo.xoaTatCa, ghiDe: !!lo.ghiDe, xoaDuAn: lo.xoaDuAn ?? [], xoaHo: lo.xoaHo ?? [], tep }, ghi, lo.duAn ?? [], lo.ho ?? []);
      for (const id of lo.xoaHo ?? []) for (const l of ["ho", "td", "ct"]) (phienBan.delete(`${l}:${id}`), daDoc.delete(`${l}:${id}`));
      return kq;
    },
    async luuBanDo(duAnId, bytes) {
      await goi("PUT", `/api/tep/banDo/${ma(duAnId)}`, { than: bytes, meta: ma("{}") });
    },
    async docBanDo(duAnId) {
      const r = await goi("GET", `/api/tep/banDo/${ma(duAnId)}`, { cho404: true });
      return r.ma === 404 ? null : r.than;
    },
    async xoaBanDo(duAnId) {
      await goi("DELETE", `/api/tep/banDo/${ma(duAnId)}`);
    },
    async luuMau(m, bytes, tenTep) {
      await goi("PUT", `/api/tep/mau/${ma(m)}`, { than: bytes, meta: ma(JSON.stringify({ tenTep, luc: new Date().toISOString() })) });
    },
    async docMau(m) {
      const r = await goi("GET", `/api/tep/mau/${ma(m)}`, { cho404: true });
      if (r.ma === 404) return null;
      const meta = JSON.parse(decodeURIComponent(r.meta || "%7B%7D")) as { tenTep?: string; luc?: string };
      return { bytes: r.than, tenTep: meta.tenTep ?? `${m}.docx`, luc: meta.luc ?? "" };
    },
    async xoaMau(m) {
      await goi("DELETE", `/api/tep/mau/${ma(m)}`);
    },
    dsMauTuy: () => dsTep("mau"),
    dsDinhKem: (duAnId) => json<DinhKem[]>("GET", `/api/dinh-kem?duAn=${ma(duAnId)}`),
    async docDinhKem(id) {
      const r = await goi("GET", `/api/tep/dinhKem/${ma(id)}`, { cho404: true });
      return r.ma === 404 ? null : r.than;
    },
    dsBanDo: () => dsTep("banDo"),
    async xoaTatCa() {
      await goi("POST", "/api/xoa-tat-ca");
      phienBan.clear();
      daDoc.clear();
    },
    dsNguoiDung: () => json<NguoiDung[]>("GET", "/api/nguoi-dung"),
    dsCanBo: () => json<CanBo[]>("GET", "/api/can-bo"),
    async luuNguoiDung(u) {
      await goi("PUT", `/api/nguoi-dung/${ma(u.ten)}`, { json: u });
    },
    ghiNhatKy: (e) => json<DongNhatKy>("POST", "/api/nhat-ky", { json: { hanhDong: e.hanhDong, chiTiet: e.chiTiet ?? "" } }),
    dsNhatKy: () => json<DongNhatKy[]>("GET", "/api/nhat-ky"),
    async docCaiDat<T>(khoa: string) {
      return json<T | null>("GET", `/api/cai-dat/${ma(khoa)}`);
    },
    async luuCaiDat(khoa, giaTri) {
      await goi("PUT", `/api/cai-dat/${ma(khoa)}`, { json: giaTri });
    },
  };
}

// ---------------- Chế độ kết nối của từng máy ----------------

export type CheDoMang = { cheDo: "MAY_DON" } | { cheDo: "MAY_CHU"; cong: number } | { cheDo: "MAY_TRAM"; ketNoi: KetNoi };
const KHOA_CHE_DO = "gpmb-ket-noi";
export const CONG_MAC_DINH = 47800;

export function docCheDo(): CheDoMang {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA_CHE_DO) ?? "null") as CheDoMang | null;
    if (v && (v.cheDo === "MAY_DON" || v.cheDo === "MAY_CHU" || v.cheDo === "MAY_TRAM")) return v;
  } catch {
    /* bỏ qua */
  }
  return { cheDo: "MAY_DON" };
}

export function ghiCheDo(c: CheDoMang) {
  localStorage.setItem(KHOA_CHE_DO, JSON.stringify(c));
}

/** Chuẩn hóa địa chỉ nhập tay: thêm cổng mặc định nếu thiếu. */
export function chuanDiaChi(s: string): string | null {
  const t = s.trim();
  const m = /^(\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*)(?::(\d{1,5}))?$/.exec(t);
  if (!m) return null;
  const cong = m[2] ? Number(m[2]) : CONG_MAC_DINH;
  if (cong < 1 || cong > 65535) return null;
  return `${m[1]}:${cong}`;
}

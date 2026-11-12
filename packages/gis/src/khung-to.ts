/**
 * 1.3.6 — Thông tin ghi ở khung tờ trích đo (chú giải, bảng diện tích, tên mảnh): đối chiếu 4 tệp trích đo gCadas V8 thật do
 * người dùng cung cấp (đọc tại chỗ, không lưu vào kho). Chỉ đọc những gì bản đồ GHI SẴN; không suy ra số liệu.
 *  - Diện tích trong phạm vi GPMB ghi ở khung ("Diện tích trong phạm vi GPMB: 156.361,2 m²", "Tổng diện đo đạc GPMB: 15.321,2 m2")
 *    → tìm lớp khép được vùng đúng diện tích đó làm ranh GPMB (khớp 0,1%), hoặc dùng để đối chiếu phạm vi cán bộ chọn.
 *  - Số hiệu mảnh trích đo ("TĐ18-2026", "TĐ 48-2026") → gợi ý số tờ của tệp khi nút thuộc tính không có số tờ.
 */
import type { KetQuaDocDgn, PhanTuChu } from "./dgn.js";
import { phanTuGoc } from "./dgn.js";
import { CAU_HINH_MAC_DINH, diemTrongThua, dungThua, giaiMaNhan, type ThuaBanDo } from "./thua.js";

/** Các dòng chữ của bản vẽ; dòng thuộc cùng một nút chữ được ghép lại (bảng diện tích thường tách số ra dòng riêng). */
function dongChu(ban: KetQuaDocDgn): { lop: number; chu: string }[] {
  const nut = new Map<number, { lop: number; ds: string[] }>();
  const out: { lop: number; chu: string }[] = [];
  for (const pt of phanTuGoc(ban)) {
    if (pt.loai !== "CHU") continue;
    const c = giaiMaNhan(pt as PhanTuChu);
    if (!c) continue;
    const k = (pt as PhanTuChu).nut;
    if (k === undefined) out.push({ lop: pt.lop, chu: c });
    else {
      const x = nut.get(k) ?? { lop: pt.lop, ds: [] };
      x.ds.push(c);
      nut.set(k, x);
    }
  }
  // nút nhiều dòng: từng dòng ghép với tối đa 2 dòng kế (số liệu có thể tách dòng: "Diện tích … là:" / "382.667,0" / "m²")
  for (const x of nut.values()) for (let i = 0; i < x.ds.length; i++) out.push({ lop: x.lop, chu: x.ds.slice(i, i + 3).join(" ") });
  return out;
}

/** Số kiểu Việt "156.361,2" / "15.321,2" / "382667,0" / "1905.9" → số. */
export function docSoVn(s: string): number | null {
  const t = s.trim();
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d+(,\d+)?$/.test(t)) return Number(t.replace(",", "."));
  if (/^\d+\.\d{1,2}$/.test(t)) return Number(t);
  return null;
}

const RE_DT_GPMB = /(trong\s+phạm\s+vi\s+(GPMB|giải\s+phóng\s+mặt\s+bằng|thu\s+hồi)|diện\s+(tích\s+)?đo\s+đạc\s+GPMB|diện\s+tích\s+(đề\s+nghị\s+)?thu\s+hồi)[^0-9]{0,40}?(\d[\d.,]*\d)\s*m/iu;

export interface DienTichGhi {
  dienTich: number;
  /** Dòng chữ gốc trên bản đồ */
  chu: string;
}

/** Diện tích trong phạm vi GPMB (thu hồi) ghi ở khung tờ, nếu có và đọc được một giá trị duy nhất. */
export function dienTichGpmbGhi(ban: KetQuaDocDgn): DienTichGhi | null {
  const ds: DienTichGhi[] = [];
  for (const { chu } of dongChu(ban)) {
    const m = RE_DT_GPMB.exec(chu);
    // bỏ khi trước con số có "ngoài phạm vi" (dòng diện tích ngoài phạm vi GPMB)
    if (m && /ngoài\s+phạm\s+vi/iu.test(chu.slice(0, (m.index ?? 0) + m[0].length))) continue;
    const v = m ? docSoVn(m[5]!) : null;
    if (v && v > 0) ds.push({ dienTich: v, chu: `${m![0].replace(/\s+/g, " ").trim()}²` });
  }
  const khac = [...new Set(ds.map((x) => x.dienTich))];
  return khac.length === 1 ? ds[0]! : null;
}

/**
 * Lớp có vùng khép kín (một vùng, hoặc hợp các vùng) đúng diện tích ghi, sai khác ≤ 0,1% (tối thiểu 0,5 m²). Trả null nếu
 * không có lớp nào khớp hoặc nhiều lớp cùng khớp (không tự chọn).
 */
export function lopKhopDienTich(ban: KetQuaDocDgn, dienTich: number, cacLop: number[]): { lop: number; dienTich: number } | null {
  const sai = Math.max(0.5, dienTich * 0.001);
  const khop: { lop: number; dienTich: number }[] = [];
  for (const lop of cacLop) {
    const vung = dungThua(ban, { ...CAU_HINH_MAC_DINH, ranhThua: [], nhanThua: [], soThua: [], soTo: [], chuSuDung: [], nutThuocTinh: null, nhanHienTrang: [], ranhGpmb: [lop], dienTichToiThieu: 1 }).vungGpmb;
    const motVung = vung.find((v) => Math.abs(v.dienTich - dienTich) <= sai);
    if (motVung) khop.push({ lop, dienTich: motVung.dienTich });
  }
  return khop.length === 1 ? khop[0]! : null;
}

/**
 * Gợi ý số tờ của tệp: số hiệu mảnh trích đo ghi trên bản vẽ ("TĐ18-2026") — ưu tiên số hiệu trùng số trong tên tệp
 * (bản vẽ có sơ đồ ghép ghi nhiều mảnh); không có trên bản vẽ thì lấy theo tên tệp. Trả null nếu không chắc.
 */
export function goiYSoTo(ban: KetQuaDocDgn, tenTep = ""): { soTo: string; nguon: string } | null {
  const re = /^T[ĐD]\s?\d{1,4}\s?[-–]\s?\d{4}$/iu;
  const tren = [...new Set(dongChu(ban).map((x) => x.chu.trim()).filter((c) => re.test(c)))];
  const soTen = /T[ĐD]\s?[_-]?(\d{1,4})[\s_-]+(\d{4})/iu.exec(tenTep);
  const so = (c: string) => /(\d{1,4})\s?[-–]\s?(\d{4})/.exec(c);
  if (soTen) {
    const trung = tren.find((c) => so(c)?.[1] === String(Number(soTen[1])) && so(c)?.[2] === soTen[2]);
    if (trung) return { soTo: trung, nguon: `số hiệu mảnh ghi trên bản vẽ, trùng tên tệp` };
  }
  if (tren.length === 1) return { soTo: tren[0]!, nguon: "số hiệu mảnh ghi trên bản vẽ" };
  if (soTen) return { soTo: `TĐ${Number(soTen[1])}-${soTen[2]}`, nguon: "theo tên tệp" };
  return null;
}

const vungKhepKin = (ban: KetQuaDocDgn, lop: number) =>
  dungThua(ban, { ...CAU_HINH_MAC_DINH, ranhThua: [], nhanThua: [], soThua: [], soTo: [], chuSuDung: [], nutThuocTinh: null, nhanHienTrang: [], ranhGpmb: [lop], dienTichToiThieu: 1 }).vungGpmb.filter((v) => v.nguon === "VUNG_KHEP_KIN");

/** Thửa có điểm trong nằm trong một vùng khép kín (vùng, vùng phức) của lớp. */
export function thuaPhuBoiLop(ban: KetQuaDocDgn, thua: ThuaBanDo[], lop: number): Set<ThuaBanDo> {
  const v = vungKhepKin(ban, lop);
  return new Set(thua.filter((t) => v.some((g) => diemTrongThua(t.tamNhan, g.vong))));
}

/**
 * 1.3.6 — Lớp tô / gạch các thửa NGOÀI phạm vi GPMB ("Phần đất chưa thu hồi đợt này", "Những thửa đất ngoài phạm vi GPMB" —
 * TD111 thật: lớp 40 phủ 254 thửa; các thửa còn lại 156.288,1 m² so với ghi 156.361,2 m², lệch 0,05%): tổng diện tích các thửa
 * KHÔNG bị lớp phủ khớp diện tích trong phạm vi GPMB ghi ở khung (sai khác ≤ 0,1%). Nhiều lớp cùng khớp → null (không tự chọn).
 */
export function lopThuaNgoaiPhamVi(ban: KetQuaDocDgn, thua: ThuaBanDo[], dienTich: number, cacLop: number[]): { lop: number; soThuaTrong: number; dienTichTrong: number } | null {
  const tong = thua.reduce((a, t) => a + t.dienTichHinhHoc, 0);
  const sai = Math.max(0.5, dienTich * 0.001);
  const khop: { lop: number; soThuaTrong: number; dienTichTrong: number }[] = [];
  for (const lop of cacLop) {
    const phu = thuaPhuBoiLop(ban, thua, lop);
    if (!phu.size || phu.size === thua.length) continue;
    const dtTrong = tong - [...phu].reduce((a, t) => a + t.dienTichHinhHoc, 0);
    if (Math.abs(dtTrong - dienTich) <= sai) khop.push({ lop, soThuaTrong: thua.length - phu.size, dienTichTrong: dtTrong });
  }
  return khop.length === 1 ? khop[0]! : null;
}

/**
 * Tìm đoạn văn bản liên quan cho Hỏi đáp (chạy hoàn toàn trên máy): BM25 trên từ và cặp từ đã bỏ dấu; cộng điểm khi câu
 * hỏi nêu đúng số Điều/khoản. Dùng cho chế độ Nội bộ (trả lời bằng chính các đoạn nguyên văn) và làm ngữ cảnh cho Gemini.
 */
export interface DoanTriThuc {
  id: number;
  nguon: string;
  loai: "VAN_BAN" | "NGHIEP_VU";
  tieuDe: string;
  noiDung: string;
}
export interface KhoTriThuc {
  mo_ta: string;
  nguon: { tep: string; ten: string; loai: string }[];
  doan: DoanTriThuc[];
}

/** Bỏ dấu, chữ thường, giữ chữ số; "đ" → "d". */
export const boDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();

/** Từ dừng (không mang nghĩa tìm kiếm) — đã bỏ dấu. */
const DUNG = new Set("la cua va cac nhung duoc cho voi trong khi thi nay do mot co khong ve theo tai den tu nhu de hay hoac bang the nao gi sao bao nhieu ai o ra vao lam nao".split(" "));

export function tachTu(s: string): string[] {
  const tu = boDau(s).split(/[^a-z0-9]+/).filter((t) => t.length > 0 && !DUNG.has(t));
  const ra = [...tu];
  for (let i = 0; i + 1 < tu.length; i++) ra.push(`${tu[i]}_${tu[i + 1]}`);
  return ra;
}

export interface ChiMuc {
  doan: DoanTriThuc[];
  tf: Map<string, number>[];
  dai: number[];
  df: Map<string, number>;
  daiTb: number;
}

export function taoChiMuc(doan: DoanTriThuc[]): ChiMuc {
  const tf: Map<string, number>[] = [];
  const dai: number[] = [];
  const df = new Map<string, number>();
  for (const d of doan) {
    const m = new Map<string, number>();
    const ts = tachTu(`${d.tieuDe} ${d.tieuDe} ${d.noiDung}`);
    for (const t of ts) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    tf.push(m);
    dai.push(ts.length);
  }
  return { doan, tf, dai, df, daiTb: dai.reduce((s, x) => s + x, 0) / Math.max(1, dai.length) };
}

export interface KetQuaTim {
  doan: DoanTriThuc;
  diem: number;
}

/** k đoạn liên quan nhất (điểm > 0). Câu hỏi nêu "Điều 6" thì đoạn có tiêu đề Điều 6 được cộng điểm. */
export function timDoan(cm: ChiMuc, cauHoi: string, k = 5): KetQuaTim[] {
  const q = [...new Set(tachTu(cauHoi))];
  if (!q.length) return [];
  const N = cm.doan.length, k1 = 1.4, b = 0.75;
  const dieu = [...boDau(cauHoi).matchAll(/dieu\s+(\d+)/g)].map((m) => m[1]!);
  const ra: KetQuaTim[] = [];
  cm.doan.forEach((d, i) => {
    let s = 0;
    for (const t of q) {
      const f = cm.tf[i]!.get(t);
      if (!f) continue;
      const n = cm.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * cm.dai[i]!) / cm.daiTb))) * (t.includes("_") ? 1.6 : 1);
    }
    if (s > 0 && dieu.length && dieu.some((x) => new RegExp(`^dieu\\s+${x}\\b`).test(boDau(d.tieuDe)))) s *= 1.8;
    if (s > 0 && d.loai === "VAN_BAN") s *= 1.1;
    if (s > 0) ra.push({ doan: d, diem: s });
  });
  return ra.sort((a, b2) => b2.diem - a.diem).slice(0, k);
}

let dangNap: Promise<ChiMuc> | null = null;
export function napChiMuc(): Promise<ChiMuc> {
  dangNap ??= fetch(`${import.meta.env.BASE_URL}tri-thuc/kho.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Không đọc được kho tri thức (${r.status})`);
      return r.json() as Promise<KhoTriThuc>;
    })
    .then((k) => taoChiMuc(k.doan));
  dangNap.catch(() => { dangNap = null; });
  return dangNap;
}

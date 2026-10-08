/**
 * 1.0.6 — Ngữ cảnh vẽ giả lập phần API canvas 2D mà các hàm vẽ trang (vd. veTrangBanDo) dùng, nhưng ghi ra lệnh PDF
 * vector: đường, vùng tô (cả quy tắc evenodd), cắt vùng, màu kèm độ trong suốt, chữ thật bằng phông nhúng. Đơn vị: điểm
 * (pt), gốc trên-trái như canvas; đổi trục tung khi ghi. Chỉ hỗ trợ phần API được dùng — gọi hàm khác sẽ báo lỗi.
 */
import { coCua, doChuPhong, kieuCua, mauPdf, soPdf as so, viChu, type BoPhong, type DaDung } from "./pdf-chu";

type TrangThai = { fillStyle: string; strokeStyle: string; lineWidth: number; font: string; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline; dash: number[] };

/** "#rgb", "#rrggbb", "rgb(…)", "rgba(…)" → [r g b (0–1), alpha] */
export function docMau(c: string): [string, number] {
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(c.trim());
  if (m) return [[m[1], m[2], m[3]].map((v) => so(Number(v) / 255)).join(" "), m[4] === undefined ? 1 : Number(m[4])];
  if (/^#[0-9a-f]{3,6}$/i.test(c.trim())) return [mauPdf(c.trim()), 1];
  return ["0 0 0", 1];
}

export class NguCanhPdf {
  private ops: string[] = [];
  private duong: string[] = [];
  private ngan: TrangThai[] = [];
  private s: TrangThai = { fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, font: '10px "Times New Roman", serif', textAlign: "start", textBaseline: "alphabetic", dash: [] };
  readonly dung: DaDung = new Map();
  readonly doTrong = new Map<string, { ca?: number; CA?: number }>();
  private doChu: (t: string, f: string) => number;
  constructor(private bo: BoPhong, readonly rong: number, readonly cao: number) {
    this.doChu = doChuPhong(bo);
  }
  get noiDung() {
    return this.ops.join("\n");
  }
  // ---- thuộc tính kiểu canvas
  get fillStyle() { return this.s.fillStyle; }
  set fillStyle(v: string) { this.s.fillStyle = v; }
  get strokeStyle() { return this.s.strokeStyle; }
  set strokeStyle(v: string) { this.s.strokeStyle = v; }
  get lineWidth() { return this.s.lineWidth; }
  set lineWidth(v: number) { this.s.lineWidth = v; }
  get font() { return this.s.font; }
  set font(v: string) { this.s.font = v; }
  get textAlign() { return this.s.textAlign; }
  set textAlign(v: CanvasTextAlign) { this.s.textAlign = v; }
  get textBaseline() { return this.s.textBaseline; }
  set textBaseline(v: CanvasTextBaseline) { this.s.textBaseline = v; }
  setLineDash(d: number[]) { this.s.dash = d; }

  private y = (v: number) => so(this.cao - v);
  private gs(loai: "ca" | "CA", a: number): string {
    const ten = `a${loai}${Math.round(a * 100)}`;
    if (!this.doTrong.has(ten)) this.doTrong.set(ten, { [loai]: a });
    return `/${ten} gs`;
  }
  private to(): string {
    const [c, a] = docMau(this.s.fillStyle);
    return `${this.gs("ca", a)} ${c} rg`;
  }
  private net(): string {
    const [c, a] = docMau(this.s.strokeStyle);
    return `${this.gs("CA", a)} ${c} RG ${so(this.s.lineWidth)} w [${this.s.dash.map(so).join(" ")}] 0 d`;
  }
  save() {
    this.ngan.push({ ...this.s, dash: [...this.s.dash] });
    this.ops.push("q");
  }
  restore() {
    const t = this.ngan.pop();
    if (t) this.s = t;
    this.ops.push("Q");
  }
  // ---- đường
  beginPath() { this.duong = []; }
  moveTo(x: number, y: number) { this.duong.push(`${so(x)} ${this.y(y)} m`); }
  lineTo(x: number, y: number) { this.duong.push(`${so(x)} ${this.y(y)} l`); }
  closePath() { this.duong.push("h"); }
  rect(x: number, y: number, w: number, h: number) { this.duong.push(`${so(x)} ${this.y(y + h)} ${so(w)} ${so(h)} re`); }
  arc(x: number, y: number, r: number, a0: number, a1: number) {
    // xấp xỉ bằng 24 đoạn (chỉ dùng cho điểm tròn nhỏ)
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      this.duong.push(`${so(x + r * Math.cos(a))} ${this.y(y + r * Math.sin(a))} ${i ? "l" : "m"}`);
    }
  }
  fill(quyTac?: CanvasFillRule) {
    if (this.duong.length) this.ops.push(`${this.to()} ${this.duong.join(" ")} ${quyTac === "evenodd" ? "f*" : "f"}`);
  }
  stroke() {
    if (this.duong.length) this.ops.push(`${this.net()} ${this.duong.join(" ")} S`);
  }
  clip() {
    if (this.duong.length) this.ops.push(`${this.duong.join(" ")} W n`);
  }
  fillRect(x: number, y: number, w: number, h: number) { this.ops.push(`${this.to()} ${so(x)} ${this.y(y + h)} ${so(w)} ${so(h)} re f`); }
  strokeRect(x: number, y: number, w: number, h: number) { this.ops.push(`${this.net()} ${so(x)} ${this.y(y + h)} ${so(w)} ${so(h)} re S`); }
  // ---- chữ
  measureText(t: string) { return { width: this.doChu(t, this.s.font) } as TextMetrics; }
  fillText(t: string, x: number, y: number) {
    if (!t) return;
    const k = kieuCua(this.s.font), co = coCua(this.s.font), p = this.bo[k];
    const w = this.doChu(t, this.s.font);
    const dx = this.s.textAlign === "center" ? -w / 2 : this.s.textAlign === "right" || this.s.textAlign === "end" ? -w : 0;
    const asc = (p.ascender / p.upm) * co, desc = (-p.descender / p.upm) * co;
    const dy = this.s.textBaseline === "top" || this.s.textBaseline === "hanging" ? asc : this.s.textBaseline === "middle" ? (asc - desc) / 2 : this.s.textBaseline === "bottom" ? -desc : 0;
    this.ops.push(`BT ${this.to()} /${k} ${so(co)} Tf ${so(x + dx)} ${this.y(y + dy)} Td <${viChu(this.bo, this.dung, k, t)}> Tj ET`);
  }
}

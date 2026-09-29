import { useEffect, useRef, useState } from "react";

/**
 * Biểu đồ diễn biến theo kỳ (SVG, không thư viện): đường (tỷ lệ %) hoặc cột nhóm (tiền).
 * Một trục tung; ≤ 2 chuỗi, màu chuỗi cố định theo thứ tự (--bd-1, --bd-2), có chú giải + nhãn trực tiếp ở điểm cuối;
 * rê chuột vào một kỳ: đường dóng + bảng số liệu của kỳ. Điểm "hiện tại" (chưa chốt) vẽ rỗng, nét đứt.
 */
export interface ChuoiBd {
  ten: string;
  giaTri: (number | null)[];
}

const MAU = ["var(--bd-1)", "var(--bd-2)"];
const CAO = 220;
const LE = { tren: 14, duoi: 30, trai: 44, phai: 58 };

/** Vạch chia "đẹp" cho trục tung */
function vachChia(max: number): number[] {
  if (max <= 0) return [0, 1];
  const buoc0 = max / 4;
  const mu = 10 ** Math.floor(Math.log10(buoc0));
  const buoc = [1, 2, 2.5, 5, 10].map((k) => k * mu).find((b) => b >= buoc0)!;
  return Array.from({ length: Math.ceil(max / buoc) + 1 }, (_, i) => i * buoc);
}

export function BieuDoKy(p: {
  nhanKy: string[];
  chuoi: ChuoiBd[];
  kieu: "duong" | "cot";
  dinhDang: (v: number) => string;
  /** Trục tung cố định (vd. 100 cho %) */
  maxY?: number;
  /** Chỉ số kỳ "hiện tại" (chưa chốt) — vẽ phân biệt */
  hienTai?: number;
  moTa: string;
}) {
  const khung = useRef<HTMLDivElement>(null);
  const [rong, setRong] = useState(560);
  const [chon, setChon] = useState<number | null>(null);
  useEffect(() => {
    const el = khung.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setRong(Math.max(280, e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = p.nhanKy.length;
  const tatCa = p.chuoi.flatMap((c) => c.giaTri.filter((v): v is number => v !== null));
  const vach = vachChia(p.maxY ?? Math.max(0, ...tatCa));
  const top = vach.at(-1)!;
  const w = rong - LE.trai - LE.phai;
  const h = CAO - LE.tren - LE.duoi;
  const oRong = w / Math.max(n, 1);
  const xGiua = (i: number) => LE.trai + oRong * (i + 0.5);
  const y = (v: number) => LE.tren + h - (v / top) * h;
  const nhanX = (i: number) => (n > 8 && i % Math.ceil(n / 8) !== 0 && i !== n - 1 ? "" : p.nhanKy[i]!);

  return (
    <div className="bd-khung" ref={khung} onMouseLeave={() => setChon(null)}>
      {p.chuoi.length > 1 && (
        <div className="bd-chu-giai">
          {p.chuoi.map((c, i) => <span key={c.ten}><i style={{ background: MAU[i] }} />{c.ten}</span>)}
          {p.hienTai !== undefined && <span className="day-phai">○ số liệu hiện tại (chưa chốt)</span>}
        </div>
      )}
      <svg height={CAO} viewBox={`0 0 ${rong} ${CAO}`} role="img" aria-label={p.moTa}>
        {vach.map((v) => (
          <g key={v}>
            <line className="bd-luoi" x1={LE.trai} x2={rong - LE.phai} y1={y(v)} y2={y(v)} />
            <text className="bd-truc" x={LE.trai - 6} y={y(v) + 4} textAnchor="end">{p.dinhDang(v)}</text>
          </g>
        ))}
        {p.nhanKy.map((_, i) => (
          <text key={i} className="bd-truc" x={xGiua(i)} y={CAO - 10} textAnchor="middle">{nhanX(i)}</text>
        ))}
        {chon !== null && <line x1={xGiua(chon)} x2={xGiua(chon)} y1={LE.tren} y2={LE.tren + h} stroke="var(--vien-dam)" strokeDasharray="3 3" />}

        {p.kieu === "cot" &&
          p.chuoi.map((c, si) => {
            const khe = 2;
            const rongCot = Math.min(28, (oRong * 0.64 - khe * (p.chuoi.length - 1)) / p.chuoi.length);
            const trai0 = (i: number) => xGiua(i) - (rongCot * p.chuoi.length + khe * (p.chuoi.length - 1)) / 2;
            return c.giaTri.map((v, i) => {
              if (v === null || v <= 0) return null;
              const x = trai0(i) + si * (rongCot + khe);
              const yy = y(v);
              const r = Math.min(4, rongCot / 2, LE.tren + h - yy);
              // Cột bo tròn 4px ở đầu, đáy vuông bám trục
              const d = `M${x},${LE.tren + h}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + rongCot - r}Q${x + rongCot},${yy} ${x + rongCot},${yy + r}V${LE.tren + h}Z`;
              return <path key={`${si}-${i}`} d={d} fill={MAU[si]} opacity={p.hienTai === i ? 0.45 : 1} stroke={p.hienTai === i ? MAU[si] : "none"} strokeDasharray={p.hienTai === i ? "3 2" : undefined} />;
            });
          })}

        {p.kieu === "duong" &&
          p.chuoi.map((c, si) => {
            const diem = c.giaTri.map((v, i) => (v === null ? null : ([xGiua(i), y(v)] as const)));
            const doan: string[] = [];
            diem.forEach((d, i) => {
              if (!d) return;
              const truoc = diem[i - 1];
              const netDut = p.hienTai === i;
              if (truoc) doan.push(`${netDut ? "D" : "L"}${truoc[0]},${truoc[1]} ${d[0]},${d[1]}`);
            });
            const cuoi = [...diem.keys()].reverse().find((i) => diem[i]);
            return (
              <g key={c.ten}>
                {doan.map((s, k) => {
                  const [, a, b] = s.match(/^[LD](\S+) (\S+)$/)!;
                  return <path key={k} d={`M${a}L${b}`} stroke={MAU[si]} strokeWidth={2} fill="none" strokeDasharray={s.startsWith("D") ? "5 4" : undefined} strokeLinecap="round" />;
                })}
                {diem.map((d, i) =>
                  d ? <circle key={i} cx={d[0]} cy={d[1]} r={4} fill={p.hienTai === i ? "var(--be-mat)" : MAU[si]} stroke={p.hienTai === i ? MAU[si] : "var(--be-mat)"} strokeWidth={2} /> : null,
                )}
                {cuoi !== undefined && (
                  <text className="bd-nhan" x={diem[cuoi]![0] + 8} y={diem[cuoi]![1] + (si === 0 ? -6 : 12)}>{p.dinhDang(c.giaTri[cuoi]!)}</text>
                )}
              </g>
            );
          })}

        {/* Vùng bắt rê chuột theo từng kỳ (rộng hơn điểm/cột) */}
        {p.nhanKy.map((_, i) => (
          <rect key={i} x={LE.trai + oRong * i} y={LE.tren} width={oRong} height={h} fill="transparent" onMouseEnter={() => setChon(i)} onFocus={() => setChon(i)} tabIndex={0} aria-label={`${p.nhanKy[i]}: ${p.chuoi.map((c) => `${c.ten} ${c.giaTri[i] === null ? "—" : p.dinhDang(c.giaTri[i]!)}`).join("; ")}`} />
        ))}
      </svg>
      {chon !== null && (
        <div className="bd-goi-y" style={{ left: Math.min(xGiua(chon) + 12, rong - 190), top: 24 }}>
          <b>{p.nhanKy[chon]}{p.hienTai === chon ? " (chưa chốt)" : ""}</b>
          {p.chuoi.map((c, i) => (
            <div key={c.ten}><em style={{ fontStyle: "normal" }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: MAU[i], marginRight: 6 }} />{c.ten}</em><span>{c.giaTri[chon] === null ? "—" : p.dinhDang(c.giaTri[chon]!)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

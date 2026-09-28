import type { ReactNode } from "react";
import { THU_TU_TRANG_THAI, TT_GPMB, TT_MOC, type MocTienDo, type TrangThaiGpmb } from "../trang-thai";
import { ngayVN } from "./chung";

/* ---------- Biểu tượng nét (tự vẽ) ---------- */
const P: Record<string, ReactNode> = {
  hoSo: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  kiemDem: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM8.5 12l2 2 4-4M8.5 17h7" /></>,
  phuongAn: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18.5h8" /></>,
  pheDuyet: <><path d="M12 3l7 3v6c0 4.2-3 7.4-7 9-4-1.6-7-4.8-7-9V6z" /><path d="M8.8 12.2l2.2 2.2 4.3-4.4" /></>,
  chiTra: <><circle cx="12" cy="12" r="8.5" /><path d="M14.8 9.2c-.5-1-1.6-1.6-2.8-1.6-1.6 0-2.8.9-2.8 2.1 0 2.8 5.8 1.4 5.8 4.3 0 1.2-1.3 2.2-3 2.2-1.3 0-2.5-.7-3-1.7M12 6v1.6M12 16.4V18" /></>,
  banGiao: <><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></>,
  canhBao: <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.2v.3" /></>,
  thua: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  nguoi: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.6c2.3 0 4 1.3 4.6 3.8" /></>,
  dongHo: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  la: <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7" />,
  tongQuan: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  danhSach: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r=".9" /><circle cx="4.5" cy="12" r=".9" /><circle cx="4.5" cy="18" r=".9" /></>,
  vanBan: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  traCuu: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3" /></>,
  caiDat: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  saoLuu: <><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" /><path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12" /></>,
  sang: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  toi: <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />,
  taiKhoan: <><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20.5c.8-3.6 3.8-5.6 7.5-5.6s6.7 2 7.5 5.6" /></>,
  nhatKy: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4h4M12 8v4.5l3 1.8" /></>,
  thoat: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" /></>,
  khoa: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  toaNha: <><path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2.5 10L12 4l9.5 6" /></>,
  mang: <><rect x="9" y="3" width="6" height="5" rx="1" /><rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" /><path d="M12 8v4M6 16v-2h12v2" /></>,
  lich: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  xuong: <path d="M6 9l6 6 6-6" />,
};
export function BieuTuong({ ten, co = 20 }: { ten: keyof typeof P | string; co?: number }) {
  return (
    <svg width={co} height={co} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {P[ten]}
    </svg>
  );
}

const phanTram = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export type TongMau = "xanh" | "vang" | "do" | "duong" | "xam" | "chinh";

/** Thẻ chỉ số (KPI): vạch màu trạng thái trên đầu, ô biểu tượng, số lớn, mẫu số, thanh đo cùng tông. */
export function TheChiSo(p: { bieuTuong: string; nhan: string; giaTri: number | string; mauSo?: number; tong: TongMau; phu?: ReactNode; bam?: () => void; nong?: boolean }) {
  const tl = typeof p.giaTri === "number" && p.mauSo ? phanTram(p.giaTri, p.mauSo) : null;
  return (
    <div className={`the the-chi-so ${p.tong === "chinh" ? "" : p.tong} ${p.bam ? "bam" : ""} ${p.nong ? "nong" : ""}`} onClick={p.bam} role={p.bam ? "button" : undefined} tabIndex={p.bam ? 0 : undefined}>
      <div className="the-chi-so-dau">
        <span className="the-chi-so-bt"><BieuTuong ten={p.bieuTuong} /></span>
        <span className="nhan-chi-so">{p.nhan}</span>
        {tl !== null && <span className="the-chi-so-pt">{tl}%</span>}
      </div>
      <div className="gia-tri">
        {typeof p.giaTri === "number" ? p.giaTri.toLocaleString("vi-VN") : p.giaTri}
        {p.mauSo !== undefined && <small> / {p.mauSo.toLocaleString("vi-VN")}</small>}
      </div>
      {tl !== null && (
        <div className="thanh-do" role="meter" aria-valuenow={tl} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${tl}%` }} />
        </div>
      )}
      {p.phu && <div className="chu-nho mo" style={{ marginTop: 6 }}>{p.phu}</div>}
    </div>
  );
}

/** Phân bố trạng thái: một thanh xếp chồng (khe 2px) + chú giải có biểu tượng, số lượng, tỷ lệ. */
export function PhanBoTrangThai({ dem, tong, donVi = "hộ" }: { dem: Record<TrangThaiGpmb, number>; tong: number; donVi?: string }) {
  return (
    <div>
      <div className="thanh-xep" role="img" aria-label={THU_TU_TRANG_THAI.map((t) => `${TT_GPMB[t].ten} ${dem[t]}`).join(", ")}>
        {tong === 0 && <span style={{ flex: 1, background: "var(--xam-nen)" }} />}
        {THU_TU_TRANG_THAI.filter((t) => dem[t] > 0).map((t) => (
          <span key={t} style={{ flex: dem[t], background: TT_GPMB[t].mau }} title={`${TT_GPMB[t].ten}: ${dem[t]} ${donVi} (${phanTram(dem[t], tong)}%)`} />
        ))}
      </div>
      <div className="chu-giai-tt">
        {THU_TU_TRANG_THAI.map((t) => (
          <div key={t}>
            <i style={{ background: TT_GPMB[t].mau }}>{TT_GPMB[t].bieuTuong}</i>
            <span>{TT_GPMB[t].ten}</span>
            <b>{dem[t]}</b>
            <span className="mo">{phanTram(dem[t], tong)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Vòng tiến độ chung: một tỷ lệ so với 100% (đồng hồ đo), số ở giữa. */
export function VongTienDo({ tyLe, nhan }: { tyLe: number; nhan: string }) {
  const r = 42, cv = 2 * Math.PI * r, pt = Math.round(tyLe * 100);
  return (
    <div className="vong-tien-do">
      <svg width={112} height={112} viewBox="0 0 112 112" role="meter" aria-valuenow={pt} aria-label={nhan}>
        <circle cx={56} cy={56} r={r} fill="none" stroke="var(--xam-nen)" strokeWidth={10} />
        <circle cx={56} cy={56} r={r} fill="none" stroke="var(--chinh)" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${(cv * pt) / 100} ${cv}`} transform="rotate(-90 56 56)" />
        <text x={56} y={61} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--chu)">{pt}%</text>
      </svg>
      <div>
        <div className="chu-nho mo">{nhan}</div>
        <div><b style={{ fontSize: 18 }}>{pt}%</b> <span className="mo chu-nho">hoàn thành</span></div>
        <div><b style={{ fontSize: 18 }}>{100 - pt}%</b> <span className="mo chu-nho">còn lại</span></div>
      </div>
    </div>
  );
}

/** Dải chặng nghiệp vụ: số hộ đã qua từng chặng. */
export function DaiChang({ chang, soHo, bieuTuong }: { chang: { ten: string; soHo: number }[]; soHo: number; bieuTuong: string[] }) {
  return (
    <div className="dai-chang">
      {chang.map((c, i) => (
        <div key={c.ten} className="chang">
          <span className="chang-bt"><BieuTuong ten={bieuTuong[i] ?? "hoSo"} co={22} /></span>
          <div className="chang-ten">{c.ten}</div>
          <div className="chang-so"><b>{c.soHo}</b>/{soHo} hộ</div>
          <div className="thanh-do"><span style={{ width: `${phanTram(c.soHo, soHo)}%`, background: "var(--chinh)" }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Dòng thời gian mốc tiến độ dự án. */
export function DongMoc({ moc, chon }: { moc: MocTienDo[]; chon?: (ma: string) => void }) {
  return (
    <ol className="dong-moc">
      {moc.map((m) => (
        <li key={m.ma} className={`moc-${m.trangThai}`} onClick={() => chon?.(m.ma)}>
          <span className="moc-cham">{m.trangThai === "HOAN_THANH" ? "✓" : m.trangThai === "QUA_HAN" ? "!" : m.ma}</span>
          <div>
            <div className="chu-nho mo">{m.ngayKeHoach ? `Kế hoạch ${ngayVN(m.ngayKeHoach)}` : "Chưa có kế hoạch"}</div>
            <div className="moc-ten">{m.ma}. {m.ten}</div>
            <div className="chu-nho"><span className={`nhan ${TT_MOC[m.trangThai].lop}`}>{TT_MOC[m.trangThai].ten}</span> <span className="mo">{m.soXong}/{m.soHo} hộ</span></div>
          </div>
        </li>
      ))}
    </ol>
  );
}

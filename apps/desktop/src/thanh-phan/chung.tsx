import type { ReactNode } from "react";
import { dinhDang, type DongTinh } from "@gpmb/core";
import type Decimal from "decimal.js";
import { daQuaBuoc, CAC_BUOC, TEN_TRANG_THAI_BUOC, type Ho } from "../mo-hinh";

export const tien = (d: Decimal | null | undefined) => (d ? dinhDang(d, 0) : "—");

export function NhanDong({ d }: { d: DongTinh }) {
  if (d.trangThai === "THIEU_CAN_CU") return <span className="nhan nhan-do">Thiếu căn cứ</span>;
  if (d.trangThai === "CAN_XAC_NHAN") return <span className="nhan nhan-vang">Cần xác nhận</span>;
  if (d.luaChon.length) return <span className="nhan nhan-tim">Có lựa chọn</span>;
  return <span className="nhan nhan-xanh">Tạm tính</span>;
}

export const lopDong = (d: DongTinh) => `tt-${d.trangThai === "TAM_TINH" && d.luaChon.length ? "LUA_CHON" : d.trangThai}`;

export function HopThoai(p: { tieuDe: ReactNode; dong: () => void; children: ReactNode; chan?: ReactNode; rong?: number }) {
  return (
    <div className="nen-mo" onMouseDown={(e) => e.target === e.currentTarget && p.dong()}>
      <div className="hop-thoai" style={p.rong ? { width: `min(${p.rong}px, 94vw)` } : undefined} role="dialog">
        <div className="the-dau">
          <h2>{p.tieuDe}</h2>
          <div className="phai">
            <button className="nut nut-chu" onClick={p.dong} aria-label="Đóng">✕</button>
          </div>
        </div>
        <div className="than">{p.children}</div>
        {p.chan && <div className="chan-hop">{p.chan}</div>}
      </div>
    </div>
  );
}

export function O(p: { nhan: string; children: ReactNode; goiY?: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="o-nhap" style={p.style}>
      <label>{p.nhan}</label>
      {p.children}
      {p.goiY && <span className="goi-y">{p.goiY}</span>}
    </div>
  );
}

export function ThanhBuoc({ ho, chon, onChon }: { ho: Ho; chon?: string; onChon?: (ma: string) => void }) {
  const hienTai = CAC_BUOC.findIndex((b) => !daQuaBuoc(ho.tienDo[b.ma]?.trangThai));
  return (
    <div className="buoc">
      {CAC_BUOC.map((b, i) => {
        const tt = ho.tienDo[b.ma]?.trangThai ?? "CHUA";
        return (
          <button
            key={b.ma}
            className={`${tt} ${i === hienTai || chon === b.ma ? "hien-tai" : ""}`}
            title={`Bước ${b.ma}. ${b.ten} — ${TEN_TRANG_THAI_BUOC[tt]}`}
            onClick={() => onChon?.(b.ma)}
          >
            <span className="vach" />
            <span className="ten">{b.ma}. {b.ten}</span>
          </button>
        );
      })}
    </div>
  );
}

export function GiaiTrinh({ d }: { d: DongTinh }) {
  return (
    <div className="giai-trinh">
      <div className="nhom-nut" style={{ alignItems: "center" }}>
        <span className="mo chu-nho">Mã khoản {d.ma}</span>
        <NhanDong d={d} />
      </div>
      <h3 style={{ marginTop: 6 }}>{d.noiDung}</h3>
      <div className="so-tien">{d.thanhTien ? `${tien(d.thanhTien)} đ` : "Chưa tính được"}</div>
      {d.thanhTien && !d.thanhTien.isInteger() && <div className="mo chu-nho">Giá trị đầy đủ: {d.thanhTien.toString()} đ (làm tròn ở tổng hộ)</div>}
      <div className="cong-thuc">{d.congThuc}</div>
      {Object.keys(d.thamSo).length > 0 && (
        <dl>
          {Object.entries(d.thamSo).map(([k, v]) => (
            <FragmentDl key={k} k={k} v={v} />
          ))}
        </dl>
      )}
      <div className="muc">
        <h4>Căn cứ</h4>
        <ul>
          {d.canCu.map((c, i) => (
            <li key={i}>
              <b>{c.vanBan}</b>
              {c.viTri ? ` – ${c.viTri}` : ""}
              {c.ghiChu ? <div className="mo">{c.ghiChu}</div> : null}
            </li>
          ))}
        </ul>
      </div>
      {d.luaChon.length > 0 && (
        <div className="muc">
          <h4>Áp dụng theo lựa chọn của người dùng</h4>
          <ul>
            {d.luaChon.map((l, i) => (
              <li key={i}>
                <b>{l.ma}</b>: {l.giaTri} — <i>{l.lyDo}</i>
              </li>
            ))}
          </ul>
        </div>
      )}
      {d.canhBao.length > 0 && (
        <div className="muc">
          <h4>Cảnh báo</h4>
          <ul>
            {d.canhBao.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FragmentDl({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}

export function ngayVN(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

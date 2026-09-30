import { useMemo, useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import type { DienTichThuHoi, ThuaBanDo } from "@gpmb/gis";
import { useUngDung } from "../../ung-dung";
import type { DuAn, Ho } from "../../mo-hinh";
import { tinhHo } from "../../tinh-ho";
import { THU_TU_TRANG_THAI, TT_GPMB, type TrangThaiGpmb } from "../../trang-thai";
import { PhanBoTrangThai } from "../../thanh-phan/BieuDo";
import { HopPhanCong } from "../../thanh-phan/PhanCong";
import { HopXepDot } from "../../thanh-phan/DotThuHoi";
import { coDot } from "../../dot-thu-hoi";
import { HopTaoHo } from "./TaoHo";
import { type DuLieuBanDo } from "./du-lieu";

const khongDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
const m2 = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

/** Tổng hợp vùng thửa chọn bằng quét khung (hạng mục 3 docs/08 §9) và thao tác hàng loạt. */
export function TheVungChon(p: {
  duAn: DuAn;
  dl: DuLieuBanDo;
  chon: Set<string>;
  boChon: () => void;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  daLienKet: Map<string, Ho>;
  ttThua: Map<string, TrangThaiGpmb>;
}) {
  const { chinhSach, quyen, di } = useUngDung();
  const [hop, setHop] = useState<"TAO" | "DOT" | "PC" | null>(null);
  const ds = p.dl.kq.thua.filter((t) => p.chon.has(p.khoaThua(t)));
  const hos = [...new Map(ds.map((t) => p.daLienKet.get(t.ma)).filter((h): h is Ho => !!h).map((h) => [h.id, h])).values()];
  const chuaHoSo = ds.filter((t) => !p.daLienKet.has(t.ma));
  const tongTien = useMemo(() => hos.reduce((s, h) => s.plus(tinhHo(chinhSach(p.duAn), p.duAn, h).tong.tongLamTron), D(0)), [hos.map((h) => h.id).join("|"), p.duAn, chinhSach]); // eslint-disable-line react-hooks/exhaustive-deps
  const dtThua = ds.reduce((s, t) => s + t.dienTichHinhHoc, 0);
  const dtThuHoi = ds.reduce((s, t) => s + (p.thuHoi.get(p.khoaThua(t))?.dienTichThuHoi ?? 0), 0);
  const dem = Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, 0])) as Record<TrangThaiGpmb, number>;
  for (const t of ds) {
    const tt = p.ttThua.get(t.ma);
    if (tt) dem[tt]++;
  }
  // Tạo hồ sơ cho thửa chọn chưa có hồ sơ: trong ranh giữ DT giao; ngoài phạm vi coi như thu hồi toàn bộ (như chọn thửa trực tiếp)
  const { dl, chon, thuHoi, khoaThua } = p;
  const thuHoiTao = useMemo(() => {
    const m = new Map<string, DienTichThuHoi>();
    dl.kq.thua.forEach((t) => {
      const k = khoaThua(t);
      const g = thuHoi.get(k);
      if (!chon.has(k)) return m.set(k, { ma: t.ma, dienTichHinhHoc: t.dienTichHinhHoc, dienTichThuHoi: 0, phamVi: "NGOAI", vongThuHoi: [] });
      m.set(k, g && g.phamVi !== "NGOAI" ? g : { ma: t.ma, dienTichHinhHoc: t.dienTichHinhHoc, dienTichThuHoi: t.dienTichHinhHoc, phamVi: "TOAN_BO", vongThuHoi: [t.vong] });
    });
    return m;
  }, [dl, chon, thuHoi, khoaThua]);
  const sua = quyen("SUA_HO_SO");
  return (
    <div className="the co-dinh" aria-label="Vùng thửa đang chọn">
      <div className="the-dau"><h3>Vùng chọn: {ds.length} thửa</h3><div className="phai"><button className="nut nut-chu nut-nho" onClick={p.boChon}>Bỏ chọn</button></div></div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 6 }}>
        <div>
          <b>{hos.length}</b> hồ sơ · <b>{chuaHoSo.length}</b> thửa chưa có hồ sơ · DT thửa <b>{m2(dtThua)}</b> m² · DT thu hồi <b>{m2(dtThuHoi)}</b> m²
        </div>
        <div>Tổng tiền (tạm tính, {hos.length} hồ sơ): <b>{dinhDang(tongTien, 0)}</b> đ</div>
        {hos.length > 0 && <PhanBoTrangThai dem={dem} tong={ds.length - chuaHoSo.length} donVi="thửa" />}
        <div className="nhom-nut">
          {chuaHoSo.length > 0 && <button className="nut nut-nho" disabled={!sua} onClick={() => setHop("TAO")}>Tạo hồ sơ ({chuaHoSo.length} thửa)…</button>}
          {hos.length > 0 && coDot(p.duAn) && <button className="nut nut-nho" disabled={!sua} onClick={() => setHop("DOT")}>Xếp đợt…</button>}
          {hos.length > 0 && <button className="nut nut-nho" disabled={!sua} onClick={() => setHop("PC")}>Phân công…</button>}
          {hos.length > 0 && (
            <button className="nut nut-nho" onClick={() => { di({ ten: "du-an", duAnId: p.duAn.id, tab: "ho" }); setTimeout(() => window.dispatchEvent(new CustomEvent("gpmb-loc-ho-ids", { detail: hos.map((h) => h.id) })), 0); }}>
              Mở danh sách {hos.length} hộ
            </button>
          )}
        </div>
      </div>
      {hop === "TAO" && <HopTaoHo duAn={p.duAn} dl={p.dl} thuHoi={thuHoiTao} khoaThua={p.khoaThua} daLienKet={p.daLienKet} dong={() => setHop(null)} />}
      {hop === "DOT" && <HopXepDot duAn={p.duAn} hos={hos} dong={() => setHop(null)} />}
      {hop === "PC" && <HopPhanCong hos={hos} dong={() => setHop(null)} />}
    </div>
  );
}

/** Tìm thửa theo "tờ-thửa", tên chủ trên bản đồ hoặc tên, mã hồ sơ đã gắn (hạng mục 4 docs/08 §9). */
export function TimThua(p: { dl: DuLieuBanDo; daLienKet: Map<string, Ho>; chon: (t: ThuaBanDo) => void }) {
  const [q, setQ] = useState("");
  const kq = useMemo(() => {
    const s = khongDau(q.trim());
    if (!s) return [];
    const so = /^(?:t(?:o)?\s*)?(\d+)\s*[-/ ,.]\s*(?:t(?:hua)?\s*)?(\d+)$/.exec(s);
    return p.dl.kq.thua
      .filter((t) => {
        if (so) return t.soTo === so[1] && t.soThua === so[2];
        if (/^\d+$/.test(s)) return t.soThua === s;
        const h = p.daLienKet.get(t.ma);
        return khongDau(`${t.chuSuDung ?? ""} ${h?.ten ?? ""} ${h?.ma ?? ""}`).includes(s);
      })
      .slice(0, 20);
  }, [q, p.dl, p.daLienKet]);
  return (
    <div className="tim-thua" style={{ width: "100%" }}>
      <input placeholder="Tìm tờ-thửa (7-12), tên chủ, mã hồ sơ…" aria-label="Tìm thửa trên bản đồ" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%" }} onKeyDown={(e) => { if (e.key === "Enter" && kq[0]) { p.chon(kq[0]); setQ(""); } }} />
      {q.trim() && (
        <div className="the co-dinh" role="listbox" style={{ maxHeight: 240, overflow: "auto", marginTop: 4 }}>
          {kq.map((t, i) => {
            const h = p.daLienKet.get(t.ma);
            return (
              <div key={t.ma + i} role="option" aria-selected={false} className="muc-mau" onClick={() => { p.chon(t); setQ(""); }}>
                <span className="so-mau">{t.soTo ?? "?"}-{t.soThua ?? "?"}</span>
                <span>{t.chuSuDung ?? "—"}{h ? <span className="mo chu-nho"> · {h.ma} {h.ten}</span> : null}</span>
              </div>
            );
          })}
          {!kq.length && <div className="mo chu-nho" style={{ padding: 8 }}>Không tìm thấy thửa.</div>}
        </div>
      )}
    </div>
  );
}

/** Thẻ tóm tắt hộ của thửa đang chọn (tìm thửa, bấm thửa). */
export function TomTatHo({ duAn, h, tt, moHo }: { duAn: DuAn; h: Ho; tt?: TrangThaiGpmb; moHo: () => void }) {
  const { chinhSach } = useUngDung();
  const k = useMemo(() => tinhHo(chinhSach(duAn), duAn, h), [duAn, h, chinhSach]);
  const dt = h.thua.reduce((s, t) => s + (Number(t.dienTichThuHoi) || 0), 0);
  return (
    <div className="chu-nho" style={{ display: "grid", gap: 3, borderTop: "1px solid var(--vien)", paddingTop: 6 }} aria-label="Tóm tắt hồ sơ">
      <div><b>{h.ma} · {h.ten}</b>{tt && <span className="nhan" style={{ marginLeft: 6, background: TT_GPMB[tt].nen }}>{TT_GPMB[tt].ten}</span>}</div>
      <div>{h.thua.length} thửa · DT thu hồi {m2(dt)} m² · tổng tiền (tạm tính) <b>{dinhDang(k.tong.tongLamTron, 0)}</b> đ{k.tong.duocChot ? "" : " · còn khoản chưa đủ căn cứ"}</div>
      <div><button className="nut nut-nho nut-chinh" onClick={moHo}>Mở hồ sơ</button></div>
    </div>
  );
}

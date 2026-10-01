/**
 * Xem thửa của hồ sơ trên bản đồ GPMB đã nạp của dự án: phóng tới, tô nổi thửa; thửa chưa liên kết (chưa có mã bản đồ, không
 * khớp số tờ/số thửa) thì cán bộ bấm thửa trên bản đồ để gắn — cập nhật mã bản đồ, DT bản đồ (DT hồ sơ không tự đổi).
 */
import { useEffect, useMemo, useState } from "react";
import type { ThuaBanDo } from "@gpmb/gis";
import { useUngDung } from "../../ung-dung";
import type { DuAn, Ho, Thua } from "../../mo-hinh";
import { HopThoai } from "../../thanh-phan/chung";
import { choPhongThua, napBanDoDuAn, type DuLieuBanDo } from "../BanDo";
import { KhungVe } from "../ban-do/KhungVe";

const chuan = (s: string | null | undefined) => (s ?? "").trim().replace(/^0+(?=\d)/, "").toUpperCase();

/** Thửa bản đồ của thửa hồ sơ: theo mã bản đồ đã gắn; không có thì theo số tờ + số thửa. */
export function timThuaBanDo(ds: ThuaBanDo[], t: Pick<Thua, "maBanDo" | "soTo" | "soThua">): { tb: ThuaBanDo; theo: "MA" | "SO" } | null {
  const theoMa = t.maBanDo ? ds.find((x) => x.ma === t.maBanDo) : undefined;
  if (theoMa && (!t.soTo || !theoMa.soTo || chuan(theoMa.soTo) === chuan(t.soTo))) return { tb: theoMa, theo: "MA" };
  if (!chuan(t.soTo) || !chuan(t.soThua)) return theoMa ? { tb: theoMa, theo: "MA" } : null;
  const theoSo = ds.find((x) => chuan(x.soTo) === chuan(t.soTo) && chuan(x.soThua) === chuan(t.soThua));
  return theoSo ? { tb: theoSo, theo: "SO" } : theoMa ? { tb: theoMa, theo: "MA" } : null;
}

export function HopXemThuaBanDo(p: { duAn: DuAn; h: Ho; thua: Thua; doi: (h: Ho) => void; dong: () => void }) {
  const { kho, di, quyen, nguoiDung } = useUngDung();
  const [dl, setDl] = useState<DuLieuBanDo | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState<ThuaBanDo | null>(null);
  const [gan, setGan] = useState(false);
  useEffect(() => {
    let huy = false;
    napBanDoDuAn(kho, p.duAn).then((d) => { if (!huy) d ? setDl(d) : setLoi("Không đọc được tệp bản đồ đã nạp của dự án."); }).catch((e) => !huy && setLoi((e as Error).message));
    return () => { huy = true; };
  }, [kho, p.duAn]);
  const kq = useMemo(() => (dl ? timThuaBanDo(dl.kq.thua, p.thua) : null), [dl, p.thua]);
  useEffect(() => { if (kq) setChon(kq.tb); }, [kq]);
  const [phongToi, setPhongToi] = useState<{ vong: ThuaBanDo["vong"]; n: number } | null>(null);
  useEffect(() => { if (kq) setPhongToi({ vong: kq.tb.vong, n: Date.now() }); }, [kq]);
  const sua = quyen("SUA_HO_SO");
  const ganThua = (tb: ThuaBanDo) => {
    const dt = Math.round(tb.dienTichHinhHoc * 100) / 100;
    const ghi = `Gắn thửa bản đồ ${tb.soTo ?? "?"}/${tb.soThua ?? "?"} (DT hình học ${dt.toFixed(2)} m²)`;
    p.doi({
      ...p.h,
      thua: p.h.thua.map((t) => (t.id === p.thua.id ? { ...t, maBanDo: tb.ma, dienTichBanDo: dt, soTo: t.soTo || tb.soTo || "", soThua: t.soThua || tb.soThua || "" } : t)),
      nhatKy: [...p.h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Thửa ${p.thua.soThua || "?"}/${p.thua.soTo || "?"}: ${ghi}` }],
    });
    setGan(false);
  };
  const ten = `thửa ${p.thua.soThua || "?"} tờ ${p.thua.soTo || "?"}`;
  const daLienKet = useMemo(() => new Map<string, Ho>(), []);
  const rong = useMemo(() => new Map(), []);
  const tap = useMemo(() => (chon ? new Set([chon.ma]) : new Set<string>()), [chon]);
  return (
    <HopThoai
      tieuDe={`Vị trí ${ten} trên bản đồ GPMB`}
      dong={p.dong}
      rong={1100}
      chan={
        <>
          {kq && <button className="nut" onClick={() => { choPhongThua.set(p.duAn.id, kq.tb.ma); di({ ten: "du-an", duAnId: p.duAn.id, tab: "ban-do" }); }}>Mở màn Bản đồ tại thửa này</button>}
          <button className="nut" onClick={p.dong}>Đóng</button>
        </>
      }
    >
      {loi && <div className="thong-bao thong-bao-do">{loi}</div>}
      {!dl && !loi && <div className="trong">Đang đọc bản đồ {p.duAn.banDo?.tenTep}…</div>}
      {dl && (
        <>
          <div className="nhom-nut" role="status" aria-label="Kết quả tìm thửa trên bản đồ" style={{ marginBottom: 8, alignItems: "center" }}>
            {kq ? (
              <span>
                <b>Thửa bản đồ {kq.tb.soTo ?? "?"}/{kq.tb.soThua ?? "?"}</b> · {kq.tb.loaiDatBanDo ?? "—"} · DT hình học {kq.tb.dienTichHinhHoc.toFixed(2).replace(".", ",")} m²{kq.tb.chuSuDung ? ` · ${kq.tb.chuSuDung}` : ""}
                <span className="mo chu-nho"> — tìm theo {kq.theo === "MA" ? "liên kết bản đồ đã gắn" : "số tờ, số thửa"}</span>
                {(chuan(kq.tb.soTo) !== chuan(p.thua.soTo) || chuan(kq.tb.soThua) !== chuan(p.thua.soThua)) && <span className="chu-nho" style={{ color: "var(--vang)" }}> · Số tờ/số thửa hồ sơ ({p.thua.soTo || "?"}/{p.thua.soThua || "?"}) khác nhãn bản đồ — kiểm tra lại</span>}
              </span>
            ) : (
              <span className="thong-bao thong-bao-vang" style={{ margin: 0 }}>Chưa tìm thấy {ten} trên bản đồ (chưa gắn, hoặc số tờ/số thửa không khớp nhãn bản đồ).</span>
            )}
            {sua && !gan && <button className="nut nut-nho" onClick={() => setGan(true)}>{kq ? "Gắn thửa khác…" : "Chọn thửa trên bản đồ để gắn…"}</button>}
            {gan && <span className="chu-nho"><b>Bấm vào thửa trên bản đồ</b>, rồi bấm “Gắn thửa đang chọn”. <button className="nut nut-chu nut-nho" onClick={() => setGan(false)}>Hủy</button></span>}
            {gan && chon && chon.ma !== kq?.tb.ma && <button className="nut nut-nho nut-chinh" onClick={() => ganThua(chon)}>Gắn thửa đang chọn ({chon.soTo ?? "?"}/{chon.soThua ?? "?"})</button>}
          </div>
          <div style={{ height: "min(62vh, 640px)", display: "grid" }}>
            <KhungVe dl={dl} vungChon={p.duAn.banDo?.vungChonDs ?? (p.duAn.banDo?.vungChon ? [p.duAn.banDo.vungChon] : [])} thuaChon={tap} thuHoi={rong} khoaThua={(t) => t.ma} chon={chon} setChon={setChon} daLienKet={daLienKet} ttThua={rong} khoaLuu={p.duAn.id} phongToi={phongToi} />
          </div>
        </>
      )}
    </HopThoai>
  );
}

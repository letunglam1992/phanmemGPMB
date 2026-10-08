import { useMemo, useState } from "react";
import { hienDiem } from "../ly-trinh";
import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { HopThoai, O } from "./chung";
import { chuanMa, gomLienXa, khoaDoan, loiTuyen, maTiepTheo, tachDsXa, type DoanTinh, type TongHopTuyen, type TuyenLienXa } from "../tong-hop-tinh/lien-xa";
import { dsTuyen as docDsTuyen, luuTuyen, xoaTuyen } from "../tong-hop-tinh/kho-tinh";
import { docCauHinhCong, guiTuyenLenCong, LoiCong } from "../tong-hop-tinh/cong-tinh";

const KHOA_LUC_CONG = "gpmb-tuyen-cong-luc";
const docLuc = () => { try { return localStorage.getItem(KHOA_LUC_CONG); } catch { return null; } };

const ptBanGiao = (bg: number, so: number) => (so ? `${dinhDang(D(bg).div(so).times(100), 0)}%` : "—");

/**
 * 1.0.4 — Tổng hợp tỉnh → "Dự án liên xã": tỉnh cấp mã dùng chung, khai xã dọc tuyến; xem số liệu từng đoạn (xã), xã
 * chưa gửi; gợi ý ghép đoạn chưa ghi mã (cán bộ xác nhận), bỏ ghép.
 */
export function TheLienXaTinh({ doan, dsTuyen, napLai, sua, xaGoiY }: { doan: DoanTinh[]; dsTuyen: TuyenLienXa[]; napLai: () => Promise<void>; sua: boolean; xaGoiY: string[] }) {
  const { bao, ghiNhatKy, taiKhoan } = useUngDung();
  const [hop, setHop] = useState<TuyenLienXa | "moi" | null>(null);
  const kq = useMemo(() => gomLienXa(doan, dsTuyen), [doan, dsTuyen]);
  const tuyenCua = (ma: string) => dsTuyen.find((t) => chuanMa(t.ma) === ma);
  // 1.0.5: đưa danh sách lên cổng (nếu tỉnh đã cài cổng) để xã chọn mã — chỉ mã, tên, chủ đầu tư, xã dọc tuyến
  const cong = docCauHinhCong("TINH");
  const [lucCong, setLucCong] = useState(docLuc);
  const dongBoCong = async (imLang = false) => {
    if (!cong) return;
    try {
      const r = await guiTuyenLenCong(cong, await docDsTuyen());
      try { localStorage.setItem(KHOA_LUC_CONG, r.luc); } catch { /* bỏ qua */ }
      setLucCong(r.luc);
      if (!imLang) bao(`Đã đưa ${r.soTuyen} dự án liên xã lên cổng — các xã chọn mã ở Thông tin dự án`);
    } catch (e) {
      bao(e instanceof LoiCong && e.ma === 404 ? "Cổng chưa có chức năng dự án liên xã — dán lại mã Worker mới (tools/cong-tinh/worker.js, docs/21 mục 4)" : `Chưa đưa được danh sách lên cổng: ${(e as Error).message}`, "loi");
    }
  };
  const ghep = async (d: DoanTinh, ma: string, bo = false) => {
    const t = tuyenCua(ma);
    if (!t) return;
    const k = khoaDoan(d);
    await luuTuyen({ ...t, ghep: bo ? (t.ghep ?? []).filter((x) => x !== k) : [...new Set([...(t.ghep ?? []), k])] });
    await ghiNhatKy(bo ? "Bỏ ghép đoạn khỏi dự án liên xã" : "Ghép đoạn vào dự án liên xã", `${t.ma} · ${d.ten} (${d.xa}, ${d.donViGui})`);
    await napLai();
    bao(bo ? "Đã bỏ ghép" : `Đã ghép vào ${t.ma}`);
  };
  const xoa = async (t: TuyenLienXa) => {
    if (!confirm(`Xóa khai báo dự án liên xã ${t.ma} — ${t.ten}?\nSố liệu các xã gửi không bị xóa; các đoạn ghi mã này sẽ hiện "mã chưa khai".`)) return;
    await xoaTuyen(t.ma);
    await ghiNhatKy("Xóa khai báo dự án liên xã", `${t.ma} · ${t.ten}`);
    await napLai();
    await dongBoCong(true);
  };
  return (
    <div className="the" aria-label="Dự án liên xã">
      <div className="the-dau">
        <h3>Dự án liên xã (tuyến qua nhiều xã, phường)</h3>
        <span className="mo chu-nho">{kq.tuyen.length} dự án · tỉnh cấp mã dùng chung, các xã điền mã vào dự án của mình</span>
        {sua && (
          <div className="phai nhom-nut">
            {cong && <button className="nut nut-nho" title={lucCong ? `Lần đưa gần nhất: ${new Date(lucCong).toLocaleString("vi-VN")}` : "Chưa đưa lần nào"} onClick={() => void dongBoCong()}>Đưa danh sách lên cổng{lucCong ? " ✓" : ""}</button>}
            <button className="nut nut-nho nut-chinh" onClick={() => setHop("moi")}>+ Khai dự án liên xã</button>
          </div>
        )}
      </div>
      <div className="the-than luoi" style={{ gap: 12 }}>
        {!kq.tuyen.length && <div className="trong">Chưa khai dự án liên xã. Khai mã, tên, chủ đầu tư và các xã dọc tuyến; thông báo mã cho các xã điền ở Thông tin dự án → Dự án liên xã.</div>}
        {kq.tuyen.map((t) => <KhoiTuyen key={t.ma} t={t} sua={sua} suaTuyen={() => t.tuyen && setHop(t.tuyen)} xoa={() => t.tuyen && void xoa(t.tuyen)} boGhep={(d) => void ghep(d, t.ma, true)} />)}
        {kq.goiY.length > 0 && (
          <div className="thong-bao thong-bao-vang" style={{ margin: 0 }} aria-label="Gợi ý ghép">
            <b>Gợi ý ghép ({kq.goiY.length})</b> — dự án các xã gửi chưa ghi mã nhưng có thể thuộc dự án liên xã. Kiểm tra rồi bấm Ghép (không tự gộp):
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {kq.goiY.map((g) => (
                <li key={khoaDoan(g.doan) + g.ma} className="chu-nho">
                  <b>{g.doan.ten}</b> ({g.doan.xa}, {g.doan.donViGui}) → <b>{g.ma}</b> · {g.lyDo}{" "}
                  {sua && <button className="nut nut-nho" onClick={() => void ghep(g.doan, g.ma)}>Ghép vào {g.ma}</button>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {hop && (
        <HopTuyen
          cu={hop === "moi" ? null : hop}
          dsTuyen={dsTuyen}
          xaGoiY={xaGoiY}
          dong={() => setHop(null)}
          luu={async (t, maCu) => {
            if (maCu && chuanMa(maCu) !== chuanMa(t.ma)) await xoaTuyen(maCu);
            await luuTuyen({ ...t, ma: chuanMa(t.ma), taoLuc: t.taoLuc || new Date().toISOString(), taoBoi: t.taoBoi || taiKhoan?.ten || "" });
            await ghiNhatKy(maCu ? "Sửa khai báo dự án liên xã" : "Khai dự án liên xã", `${chuanMa(t.ma)} · ${t.ten} · ${t.dsXa.join(", ")}`);
            await napLai();
            setHop(null);
            bao(`Đã lưu dự án liên xã ${chuanMa(t.ma)} — ${cong ? "đang đưa lên cổng để các xã chọn mã" : `thông báo mã cho ${t.dsXa.length} xã, phường`}`);
            await dongBoCong(true);
          }}
        />
      )}
    </div>
  );
}

function KhoiTuyen({ t, sua, suaTuyen, xoa, boGhep }: { t: TongHopTuyen; sua: boolean; suaTuyen: () => void; xoa: () => void; boGhep: (d: DoanTinh) => void }) {
  const ghepTay = new Set(t.tuyen?.ghep ?? []);
  return (
    <div className="lx-khoi" aria-label={`Dự án liên xã ${t.ma}`}>
      <div className="lx-dau">
        <span className="nhan nhan-tim">{t.ma}</span>
        <b>{t.ten}</b>
        {t.tuyen?.chuDauTu && <span className="mo chu-nho">· {t.tuyen.chuDauTu}</span>}
        {t.chuaKhai && <span className="nhan nhan-vang" title="Xã ghi mã này nhưng tỉnh chưa khai — bấm Khai dự án liên xã với đúng mã">Mã chưa khai ở tỉnh</span>}
        {t.hoanThanh ? <span className="nhan nhan-xanh">Hoàn thành GPMB toàn tuyến</span> : t.xaThieu.length ? <span className="nhan nhan-do">{t.xaThieu.length} xã chưa có số liệu</span> : null}
        {sua && t.tuyen && <span className="phai nhom-nut"><button className="nut nut-chu nut-nho" onClick={suaTuyen}>Sửa</button><button className="nut nut-chu nut-nguy nut-nho" onClick={xoa}>Xóa</button></span>}
      </div>
      <table className="bang tht-bang">
        <thead><tr><th>Xã, phường</th><th>Đoạn (Km)</th><th>Đơn vị gửi · số liệu đến</th><th className="so">Số hộ</th><th className="so">Đã bàn giao</th><th className="so">Duyệt PA</th><th className="so">Vướng mắc</th><th className="so">Tạm tính (đ)</th><th className="so">DT thu hồi (m²)</th></tr></thead>
        <tbody>
          {t.xa.map((x) =>
            !x.doan.length ? (
              <tr key={x.xa} className="lx-thieu"><td>{x.xa}</td><td colSpan={8}><span className="nhan nhan-do">Chưa có số liệu</span> <span className="mo chu-nho">xã chưa gửi gói có dự án ghi mã {t.ma}</span></td></tr>
            ) : (
              x.doan.map((d, i) => (
                <tr key={khoaDoan(d)}>
                  {i === 0 && <td rowSpan={x.doan.length}>{x.xa}{x.ngoaiDs && <div><span className="nhan nhan-vang" title="Xã không có trong danh sách xã dọc tuyến tỉnh khai">ngoài danh sách</span></div>}</td>}
                  <td className="chu-nho">{d.lienXa?.kmDau || d.lienXa?.kmCuoi ? `${d.lienXa?.kmDau ?? "?"} – ${d.lienXa?.kmCuoi ?? "?"}` : "—"}{d.lyTrinh && <div className="mo" title={d.lyTrinh.chua.length ? `Đoạn còn vướng: ${d.lyTrinh.chua.map(([a, b]) => `${hienDiem(a)} – ${hienDiem(b)}`).join("; ")}` : "Không còn đoạn vướng"}>sạch {(d.lyTrinh.sachM / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })}/{(d.lyTrinh.tongM / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} km</div>}</td>
                  <td className="chu-nho">{d.donViGui}<div className="mo">{d.ten}{ghepTay.has(khoaDoan(d)) && <> · ghép tay {sua && <button className="nut nut-chu nut-nho" onClick={() => boGhep(d)}>Bỏ ghép</button>}</>}</div></td>
                  <td className="so">{d.soHo}</td>
                  <td className="so">{d.theoTrangThai.HOAN_THANH ?? 0} ({ptBanGiao(d.theoTrangThai.HOAN_THANH ?? 0, d.soHo)})</td>
                  <td className="so">{d.soHoDaDuyetPA}</td>
                  <td className="so">{d.soVuongMac}</td>
                  <td className="so">{dinhDang(d.tongTamTinh, 0)}</td>
                  <td className="so">{dinhDang(d.dienTichThuHoi, 1)}</td>
                </tr>
              ))
            ),
          )}
          <tr className="tong">
            <td colSpan={3}>Toàn tuyến ({t.xa.filter((x) => x.doan.length).length}/{t.xa.length} xã có số liệu)</td>
            <td className="so">{t.tong.soHo}</td>
            <td className="so">{t.tong.banGiao} ({ptBanGiao(t.tong.banGiao, t.tong.soHo)})</td>
            <td className="so">{t.tong.duyetPA}</td>
            <td className="so">{t.tong.soVuongMac}</td>
            <td className="so">{dinhDang(t.tong.tamTinh, 0)}</td>
            <td className="so">{dinhDang(t.tong.dienTich, 1)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function HopTuyen({ cu, dsTuyen, xaGoiY, dong, luu }: { cu: TuyenLienXa | null; dsTuyen: TuyenLienXa[]; xaGoiY: string[]; dong: () => void; luu: (t: TuyenLienXa, maCu?: string) => Promise<void> }) {
  const [t, setT] = useState<TuyenLienXa>(cu ?? { ma: maTiepTheo(dsTuyen), ten: "", chuDauTu: "", dsXa: [], taoLuc: "", taoBoi: "" });
  const [xaChu, setXaChu] = useState((cu?.dsXa ?? []).join("\n"));
  const ds = tachDsXa(xaChu);
  const loi = loiTuyen({ ...t, dsXa: ds }, dsTuyen, cu?.ma);
  const them = (x: string) => !ds.includes(x) && setXaChu([...ds, x].join("\n"));
  return (
    <HopThoai tieuDe={cu ? `Sửa dự án liên xã ${cu.ma}` : "Khai dự án liên xã"} dong={dong} rong={720} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={!!loi} onClick={() => void luu({ ...t, dsXa: ds, ghiChu: t.ghiChu?.trim() || undefined }, cu?.ma)}>Lưu</button></>}>
      <div className="luoi" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)", gap: 10 }}>
        <O nhan="Mã dự án dùng chung *" goiY="Tỉnh cấp; các xã điền đúng mã này"><input aria-label="Mã dự án liên xã" value={t.ma} onChange={(e) => setT({ ...t, ma: e.target.value.toUpperCase() })} /></O>
        <O nhan="Tên dự án *"><input aria-label="Tên dự án liên xã" value={t.ten} onChange={(e) => setT({ ...t, ten: e.target.value })} /></O>
        <O nhan="Chủ đầu tư" className="ca-hang"><input aria-label="Chủ đầu tư dự án liên xã" value={t.chuDauTu} onChange={(e) => setT({ ...t, chuDauTu: e.target.value })} /></O>
        <O nhan="Các xã, phường dọc tuyến * (mỗi dòng một xã)" goiY="Theo quyết định chủ trương / phạm vi dự án — xã chưa gửi số liệu sẽ được nêu" className="ca-hang">
          <textarea aria-label="Xã dọc tuyến" rows={5} value={xaChu} onChange={(e) => setXaChu(e.target.value)} placeholder={"Xã Chiềng Mung\nPhường Tô Hiệu"} />
        </O>
        {xaGoiY.filter((x) => !ds.includes(x)).length > 0 && (
          <div className="ca-hang chu-nho">Thêm nhanh: {xaGoiY.filter((x) => !ds.includes(x)).map((x) => <button key={x} className="nut nut-nho" style={{ margin: 2 }} onClick={() => them(x)}>+ {x}</button>)}</div>
        )}
        <O nhan="Ghi chú (quyết định chủ trương, chiều dài tuyến…)" className="ca-hang"><input aria-label="Ghi chú dự án liên xã" value={t.ghiChu ?? ""} onChange={(e) => setT({ ...t, ghiChu: e.target.value })} /></O>
      </div>
      {loi && <div className="thong-bao thong-bao-do chu-nho mt-10">{loi}</div>}
    </HopThoai>
  );
}

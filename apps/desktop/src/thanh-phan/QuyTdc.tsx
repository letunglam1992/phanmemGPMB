import { ONgay } from "./ONgay";
import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import {
  LoiQuyTdc,
  TEN_HINH_THUC_GIAO,
  TEN_LOAI_LO,
  TEN_TT_LO,
  canBoTriLo,
  ghiKetQuaBocTham,
  giaoLo,
  loMoi,
  loiLo,
  quyCua,
  soatQuyTdc,
  tenLo,
  thongKeQuy,
  thuHoiGiao,
  trangThaiLo,
  type HinhThucGiao,
  type LoTdc,
  type LoaiLo,
} from "../quy-tdc";
import { HopThoai, O, ngayVN, tien } from "./chung";
import { Chon } from "./Chon";
import { OSo } from "./OSo";
import { BieuTuong } from "./BieuDo";
import { hienSo } from "../so";
import { homNayIso } from "../trang-thai";
import { xuatExcelQuyTdc } from "../xuat-excel";
import { D } from "@gpmb/core";

const LOP_TT: Record<string, string> = { TRONG: "nhan-xanh", GIU_LAI: "nhan-vang", DA_GIAO: "nhan-duong" };
const MUC: Record<string, string> = { LOI: "thong-bao-do", CANH_BAO: "thong-bao-vang", THONG_TIN: "thong-bao-xanh" };

/**
 * Thẻ "Tái định cư" của dự án (P3-3): quỹ lô/căn, giá do đơn vị nhập kèm căn cứ, giao lô cho hộ (ghi đồng thời vào hồ sơ
 * hộ), thu hồi giao có lý do, ghi nhận kết quả bốc thăm khi dự án chọn hình thức bốc thăm.
 */
export function TheQuyTdc({ duAn, hos }: { duAn: DuAn; hos: Ho[] }) {
  const { luuDuAn, quyen, ghiNhatKy, di } = useUngDung();
  const q = quyCua(duAn);
  const tk = thongKeQuy(duAn, hos);
  const canhBao = useMemo(() => soatQuyTdc(duAn, hos), [duAn, hos]);
  const [hop, setHop] = useState<null | { loai: "lo"; lo?: LoTdc } | { loai: "nhieu" } | { loai: "giao" | "thu-hoi"; lo: LoTdc } | { loai: "boc-tham" }>(null);
  const [loc, setLoc] = useState("");
  const [locTt, setLocTt] = useState("");
  const choSua = quyen("SUA_HO_SO");
  const tenHo = (id: string) => {
    const h = hos.find((x) => x.id === id);
    return h ? `${h.ma} · ${h.ten}` : "(hồ sơ không còn)";
  };
  const ds = [...q.lo]
    .filter((l) => !locTt || trangThaiLo(l) === locTt)
    .filter((l) => !loc || `${l.khu} ${l.soLo} ${l.giao ? tenHo(l.giao.hoId) : ""}`.toLowerCase().includes(loc.toLowerCase()))
    .sort((a, b) => `${a.khu}|${a.soLo}`.localeCompare(`${b.khu}|${b.soLo}`, "vi", { numeric: true }));
  const xoaLo = async (l: LoTdc) => {
    if (l.giao) return;
    if (!confirm(`Xóa ${tenLo(l)} khỏi quỹ tái định cư?`)) return;
    await luuDuAn({ ...duAn, quyTdc: { ...q, lo: q.lo.filter((x) => x.id !== l.id) } });
    await ghiNhatKy("Xóa lô tái định cư", `${duAn.ten}: ${tenLo(l)}`);
  };
  const datBocTham = async (bat: boolean) => {
    await luuDuAn({ ...duAn, quyTdc: { ...q, bocTham: bat || undefined } });
    await ghiNhatKy(bat ? "Chọn giao lô tái định cư bằng bốc thăm" : "Bỏ hình thức bốc thăm lô tái định cư", duAn.ten);
  };

  return (
    <div className="luoi" style={{ gap: 14 }}>
      <div className="the">
        <div className="the-dau" style={{ flexWrap: "wrap" }}>
          <h2>Quỹ đất ở, nhà ở tái định cư</h2>
          <span className="mo chu-nho">Giá lô do đơn vị nhập kèm căn cứ (k3 Điều 111 Luật Đất đai 2024) · mỗi lô giao một hộ</span>
          <div className="phai">
            <button className="nut" disabled={!q.lo.length} onClick={() => void xuatExcelQuyTdc(duAn, hos)}>Xuất Excel</button>
            {choSua && <button className="nut" onClick={() => setHop({ loai: "nhieu" })}>Thêm nhiều lô…</button>}
            {choSua && <button className="nut nut-chinh" onClick={() => setHop({ loai: "lo" })}><BieuTuong ten="cong" co={15} /> Thêm lô</button>}
          </div>
        </div>
        <div className="the-than">
          <div className="tdc-so">
            <div><span>Tổng số lô, căn</span><b>{tk.soLo}</b></div>
            <div><span>Còn trống</span><b>{tk.trong}</b></div>
            <div><span>Tạm giữ</span><b>{tk.giuLai}</b></div>
            <div><span>Đã giao</span><b>{tk.daGiao}</b></div>
            <div><span>DT đã giao / tổng (m²)</span><b>{hienSo(tk.dtDaGiao.toFixed())} / {hienSo(tk.dtTong.toFixed())}</b></div>
            <div><span>Hộ chờ bố trí lô</span><b>{tk.hoChoLo}</b></div>
          </div>
          <label className="o-chon-kem mt-10">
            <input type="checkbox" disabled={!choSua} checked={!!q.bocTham} onChange={(e) => void datBocTham(e.target.checked)} aria-label="Giao lô bằng hình thức bốc thăm" />
            <span><b>Giao lô bằng hình thức bốc thăm</b> — bật để ghi nhận kết quả bốc thăm theo biên bản (phần mềm không bốc thăm thay, chỉ ghi nhận kết quả do hội đồng/tổ công tác lập).</span>
          </label>
          {canhBao.map((c, i) => (
            <div key={i} className={`thong-bao ${MUC[c.muc]} chu-nho`} style={{ margin: "8px 0 0" }}>
              {c.noiDung}{c.canCu ? <span className="mo"> ({c.canCu})</span> : null}
              {c.hoId && <button className="nut nut-chu nut-nho" onClick={() => di({ ten: "ho", duAnId: duAn.id, hoId: c.hoId!, tab: "ho-tro" })}>Mở hồ sơ</button>}
            </div>
          ))}
        </div>
      </div>

      <div className="the">
        <div className="the-dau" style={{ flexWrap: "wrap" }}>
          <h3>Danh sách lô, căn</h3>
          <span className="mo">{ds.length}/{q.lo.length}</span>
          <div className="phai">
            <input placeholder="Tìm khu, lô, hộ…" value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Tìm lô" style={{ width: 220 }} />
            <Chon value={locTt} onChange={(e) => setLocTt(e.target.value)} aria-label="Lọc trạng thái lô">
              <option value="">Mọi trạng thái</option>
              {Object.entries(TEN_TT_LO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Chon>
          </div>
        </div>
        {q.lo.length === 0 ? (
          <div className="trong">Chưa có lô nào. Thêm lô theo quy hoạch chi tiết khu tái định cư (khu, số lô, diện tích, giá kèm căn cứ).</div>
        ) : (
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr><th>Khu, điểm TĐC</th><th>Lô / căn</th><th>Loại</th><th className="so">DT (m²)</th><th className="so">Giá (đ/m²)</th><th>Căn cứ giá</th><th>Trạng thái</th><th>Hộ được giao</th><th /></tr></thead>
              <tbody>
                {ds.map((l) => {
                  const tt = trangThaiLo(l);
                  const e = loiLo(l, q.lo);
                  return (
                    <tr key={l.id} data-lo={tenLo(l)}>
                      <td>{l.khu}</td>
                      <td><b>{l.soLo}</b></td>
                      <td className="chu-nho">{TEN_LOAI_LO[l.loai]}</td>
                      <td className="so">{hienSo(l.dienTich) || "—"}</td>
                      <td className="so">{l.gia ? tien(D(l.gia)) : <span className="mo">—</span>}</td>
                      <td className="chu-nho">{l.canCuGia || (l.gia ? <span className="chu-do">Thiếu căn cứ</span> : "—")}</td>
                      <td><span className={`nhan ${LOP_TT[tt]}`}>{TEN_TT_LO[tt]}</span>{l.giuLai && <div className="mo chu-nho">{l.giuLai}</div>}{e && <div className="chu-do chu-nho">{e}</div>}</td>
                      <td className="chu-nho">{l.giao ? <>{tenHo(l.giao.hoId)}<div className="mo">{TEN_HINH_THUC_GIAO[l.giao.hinhThuc]} {ngayVN(l.giao.ngay)} – {l.giao.canCu}</div></> : "—"}</td>
                      <td className="khong-xuong-dong">
                        {choSua && (
                          <>
                            <button className="nut nut-nho" onClick={() => setHop({ loai: "lo", lo: l })}>Sửa</button>{" "}
                            {tt === "TRONG" && <button className="nut nut-nho nut-chinh" disabled={!!e} title={e ?? undefined} onClick={() => setHop({ loai: "giao", lo: l })}>Giao…</button>}
                            {tt === "DA_GIAO" && <button className="nut nut-nho" onClick={() => setHop({ loai: "thu-hoi", lo: l })}>Thu hồi giao…</button>}
                            {tt !== "DA_GIAO" && <button className="nut nut-chu nut-nguy nut-nho" aria-label={`Xóa ${tenLo(l)}`} onClick={() => void xoaLo(l)}><BieuTuong ten="thungRac" co={15} /></button>}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(q.bocTham || (q.ketQuaBocTham?.length ?? 0) > 0) && (
        <div className="the">
          <div className="the-dau">
            <h3>Kết quả bốc thăm</h3>
            <span className="mo chu-nho">Ghi nhận theo biên bản bốc thăm; lô giao theo kết quả được ghi vào hồ sơ từng hộ</span>
            <div className="phai nhom-nut"><button className="nut" onClick={() => di({ ten: "van-ban", duAnId: duAn.id, ma: "T13" })}>Soạn biên bản bốc thăm (T13)</button>{choSua && q.bocTham && <button className="nut nut-chinh" disabled={!tk.trong || !tk.hoChoLo} title={!tk.trong ? "Không còn lô trống" : !tk.hoChoLo ? "Không có hộ chờ bố trí lô" : undefined} onClick={() => setHop({ loai: "boc-tham" })}>Ghi nhận kết quả bốc thăm…</button>}</div>
          </div>
          {(q.ketQuaBocTham ?? []).length === 0 ? (
            <div className="trong chu-nho">Chưa ghi nhận lần bốc thăm nào. Xuất Excel (trang “Hộ chờ bố trí”, “Lô trống”) để chuẩn bị danh sách bốc thăm.</div>
          ) : (
            <table className="bang">
              <thead><tr><th>Biên bản</th><th>Ngày</th><th>Kết quả</th><th>Người ghi</th></tr></thead>
              <tbody>
                {[...(q.ketQuaBocTham ?? [])].reverse().map((b) => (
                  <tr key={b.id}>
                    <td>{b.bienBan}{b.thanhPhan && <div className="mo chu-nho">{b.thanhPhan}</div>}</td>
                    <td>{ngayVN(b.ngay)}</td>
                    <td className="chu-nho">{b.ketQua.map((x) => { const l = q.lo.find((y) => y.id === x.loId); return <div key={x.stt}>{x.stt}. {tenHo(x.hoId)} → {l ? tenLo(l) : "(lô không còn)"}</div>; })}</td>
                    <td className="chu-nho">{b.nguoi}<div className="mo">{new Date(b.luc).toLocaleString("vi-VN", { hour12: false })}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(q.huyGiao?.length ?? 0) > 0 && (
        <details className="the" style={{ padding: "8px 14px" }}>
          <summary className="chu-nho" style={{ fontWeight: 600 }}>Lịch sử thu hồi giao lô ({q.huyGiao!.length})</summary>
          <table className="bang mt-8">
            <thead><tr><th>Lô</th><th>Hộ</th><th>Giao</th><th>Lý do thu hồi</th><th>Người, lúc</th></tr></thead>
            <tbody>
              {[...q.huyGiao!].reverse().map((x, i) => { const l = q.lo.find((y) => y.id === x.loId); return (
                <tr key={i}><td>{l ? tenLo(l) : "(lô đã xóa)"}</td><td>{tenHo(x.hoId)}</td><td className="chu-nho">{TEN_HINH_THUC_GIAO[x.giao.hinhThuc]} {ngayVN(x.giao.ngay)} – {x.giao.canCu}</td><td>{x.lyDo}</td><td className="chu-nho">{x.nguoi} · {new Date(x.luc).toLocaleString("vi-VN", { hour12: false })}</td></tr>
              ); })}
            </tbody>
          </table>
        </details>
      )}

      {hop?.loai === "lo" && <HopLo duAn={duAn} lo={hop.lo} dong={() => setHop(null)} />}
      {hop?.loai === "nhieu" && <HopNhieuLo duAn={duAn} dong={() => setHop(null)} />}
      {hop?.loai === "giao" && <HopGiao duAn={duAn} hos={hos} lo={hop.lo} dong={() => setHop(null)} />}
      {hop?.loai === "thu-hoi" && <HopThuHoi duAn={duAn} hos={hos} lo={hop.lo} dong={() => setHop(null)} />}
      {hop?.loai === "boc-tham" && <HopBocTham duAn={duAn} hos={hos} dong={() => setHop(null)} />}
    </div>
  );
}

function HopLo({ duAn, lo, dong }: { duAn: DuAn; lo?: LoTdc; dong: () => void }) {
  const { luuDuAn, ghiNhatKy } = useUngDung();
  const q = quyCua(duAn);
  const [l, setL] = useState<LoTdc>(() => lo ?? loMoi({ khu: q.lo.at(-1)?.khu ?? "", loai: q.lo.at(-1)?.loai ?? "DAT_O", canCuGia: q.lo.at(-1)?.canCuGia }));
  const [giu, setGiu] = useState(lo?.giuLai !== undefined);
  const ban = { ...l, giuLai: giu ? (l.giuLai ?? "") : undefined };
  const loi = loiLo(ban, q.lo);
  const doiGia = !!lo?.giao && (lo.gia !== ban.gia || lo.dienTich !== ban.dienTich);
  const luu = async () => {
    const ds = lo ? q.lo.map((x) => (x.id === lo.id ? ban : x)) : [...q.lo, ban];
    await luuDuAn({ ...duAn, quyTdc: { ...q, lo: ds } });
    await ghiNhatKy(lo ? "Sửa lô tái định cư" : "Thêm lô tái định cư", `${duAn.ten}: ${tenLo(ban)}; DT ${ban.dienTich || "—"} m²; giá ${ban.gia || "—"} đ/m²${ban.canCuGia ? ` (${ban.canCuGia})` : ""}`);
    dong();
  };
  return (
    <HopThoai tieuDe={lo ? `Sửa ${tenLo(lo)}` : "Thêm lô tái định cư"} rong={720} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={!!loi} onClick={() => void luu()}>Lưu</button></>}>
      <div className="luoi luoi-2">
        <O nhan="Khu, điểm tái định cư"><input value={l.khu} onChange={(e) => setL({ ...l, khu: e.target.value })} placeholder="vd. Khu TĐC bản Mé" /></O>
        <O nhan="Số lô / số căn"><input value={l.soLo} onChange={(e) => setL({ ...l, soLo: e.target.value })} placeholder="vd. A-12" /></O>
        <O nhan="Loại"><Chon value={l.loai} onChange={(e) => setL({ ...l, loai: e.target.value as LoaiLo })}>{Object.entries(TEN_LOAI_LO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Chon></O>
        <O nhan="Diện tích (m²)"><OSo className="o-so" value={l.dienTich} onChange={(v) => setL({ ...l, dienTich: v })} /></O>
        <O nhan={l.loai === "NHA_O" ? "Giá bán nhà ở TĐC (đ/m²)" : "Giá đất ở tại khu TĐC (đ/m²)"} goiY={l.loai === "NHA_O" ? "Do UBND có thẩm quyền quyết định (k3 Đ111 LĐĐ)" : "Theo bảng giá đất tại thời điểm phê duyệt phương án (k3 Đ111 LĐĐ) — đơn vị nhập"}><OSo className="o-so" value={l.gia ?? ""} onChange={(v) => setL({ ...l, gia: v || undefined })} /></O>
        <O nhan="Căn cứ giá" goiY={l.gia ? "Bắt buộc khi có giá" : undefined}><input className={l.gia && !l.canCuGia?.trim() ? "loi-nhap" : ""} value={l.canCuGia ?? ""} onChange={(e) => setL({ ...l, canCuGia: e.target.value || undefined })} placeholder="vd. NQ 152/2025/NQ-HĐND, Bảng 05, vị trí 1" /></O>
        {!lo?.giao && (
          <O nhan="Tạm giữ lô" className="ca-hang">
            <div className="nhom-nut">
              <label><input type="checkbox" checked={giu} onChange={(e) => setGiu(e.target.checked)} /> Tạm giữ (không giao, không bốc thăm)</label>
              {giu && <input className={`gian${!l.giuLai?.trim() ? " loi-nhap" : ""}`} value={l.giuLai ?? ""} placeholder="Lý do (bắt buộc)" onChange={(e) => setL({ ...l, giuLai: e.target.value })} />}
            </div>
          </O>
        )}
        <O nhan="Ghi chú" className="ca-hang"><input value={l.ghiChu ?? ""} onChange={(e) => setL({ ...l, ghiChu: e.target.value || undefined })} /></O>
      </div>
      {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
      {doiGia && <div className="thong-bao thong-bao-vang mt-8">Lô đã giao: đổi diện tích, giá ở đây không tự sửa hồ sơ hộ — phần mềm sẽ cảnh báo hồ sơ khác lô để cán bộ cập nhật (có kiểm soát).</div>}
    </HopThoai>
  );
}

function HopNhieuLo({ duAn, dong }: { duAn: DuAn; dong: () => void }) {
  const { luuDuAn, ghiNhatKy } = useUngDung();
  const q = quyCua(duAn);
  const [khu, setKhu] = useState(q.lo.at(-1)?.khu ?? "");
  const [tien_, setTien] = useState("");
  const [tu, setTu] = useState("1");
  const [den, setDen] = useState("10");
  const [loai, setLoai] = useState<LoaiLo>("DAT_O");
  const [dt, setDt] = useState("");
  const [gia, setGia] = useState("");
  const [canCu, setCanCu] = useState("");
  const a = Number(tu), b = Number(den);
  const moi = Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= a && b - a < 500 ? Array.from({ length: b - a + 1 }, (_, i) => loMoi({ khu: khu.trim(), soLo: `${tien_}${a + i}`, loai, dienTich: dt, gia: gia || undefined, canCuGia: canCu.trim() || undefined })) : [];
  const loi = !moi.length ? "Khoảng số lô không hợp lệ (tối đa 500 lô một lần)" : moi.map((l) => loiLo(l, [...q.lo, ...moi])).find(Boolean) ?? null;
  const luu = async () => {
    await luuDuAn({ ...duAn, quyTdc: { ...q, lo: [...q.lo, ...moi] } });
    await ghiNhatKy("Thêm nhiều lô tái định cư", `${duAn.ten}: ${khu} lô ${tien_}${a}–${tien_}${b} (${moi.length} lô)`);
    dong();
  };
  return (
    <HopThoai tieuDe="Thêm nhiều lô tái định cư" rong={720} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={!!loi} onClick={() => void luu()}>Thêm {moi.length} lô</button></>}>
      <div className="luoi luoi-3">
        <O nhan="Khu, điểm TĐC" className="ca-hang"><input value={khu} onChange={(e) => setKhu(e.target.value)} /></O>
        <O nhan="Tiền tố số lô"><input value={tien_} placeholder="vd. A-" onChange={(e) => setTien(e.target.value)} /></O>
        <O nhan="Từ số"><input type="number" min={1} value={tu} onChange={(e) => setTu(e.target.value)} /></O>
        <O nhan="Đến số"><input type="number" min={1} value={den} onChange={(e) => setDen(e.target.value)} /></O>
        <O nhan="Loại"><Chon value={loai} onChange={(e) => setLoai(e.target.value as LoaiLo)}>{Object.entries(TEN_LOAI_LO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Chon></O>
        <O nhan="DT mỗi lô (m²)"><OSo className="o-so" value={dt} onChange={setDt} /></O>
        <O nhan="Giá (đ/m²)"><OSo className="o-so" value={gia} onChange={setGia} /></O>
        <O nhan="Căn cứ giá" className="ca-hang"><input value={canCu} onChange={(e) => setCanCu(e.target.value)} placeholder="Bắt buộc khi có giá" /></O>
      </div>
      {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
    </HopThoai>
  );
}

function HopGiao({ duAn, hos, lo, dong }: { duAn: DuAn; hos: Ho[]; lo: LoTdc; dong: () => void }) {
  const { ghiDuAnVaHo, nguoiDung } = useUngDung();
  const q = quyCua(duAn);
  const daCo = new Set(q.lo.filter((l) => l.giao).map((l) => l.giao!.hoId));
  const [chiCho, setChiCho] = useState(true);
  const dsHo = hos.filter((h) => !h.daXoa && (!chiCho || (canBoTriLo(h) && !daCo.has(h.id))));
  const [hoId, setHoId] = useState(dsHo[0]?.id ?? "");
  const [ngay, setNgay] = useState(homNayIso());
  const [hinhThuc, setHinhThuc] = useState<HinhThucGiao>(q.bocTham ? "BOC_THAM" : "XET_GIAO");
  const [canCu, setCanCu] = useState("");
  const [loi, setLoi] = useState("");
  const h = hos.find((x) => x.id === hoId);
  const luu = async () => {
    setLoi("");
    try {
      const r = giaoLo(duAn, h!, lo.id, { ngay, hinhThuc, canCu, nguoi: nguoiDung });
      if (await ghiDuAnVaHo(r.duAn, [{ h: r.ho, nhatKy: `Giao ${tenLo(lo)} (${TEN_HINH_THUC_GIAO[hinhThuc]}, ${canCu.trim()})` }], ["Giao lô tái định cư", `${duAn.ten}: ${tenLo(lo)} → ${h!.ma} · ${h!.ten}; ${canCu.trim()}`])) dong();
    } catch (e) {
      setLoi(e instanceof LoiQuyTdc ? e.message : String((e as Error).message));
    }
  };
  return (
    <HopThoai tieuDe={`Giao ${tenLo(lo)}`} rong={720} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={!h || !canCu.trim() || !ngay} onClick={() => void luu()}>Giao lô</button></>}>
      <div className="chu-nho mo mb-8">{TEN_LOAI_LO[lo.loai]} · {hienSo(lo.dienTich) || "—"} m² · giá {lo.gia ? `${tien(D(lo.gia))} đ/m² (${lo.canCuGia})` : "chưa nhập"}. Thông tin lô được ghi vào thẻ Hỗ trợ tái định cư của hồ sơ hộ.</div>
      <div className="luoi luoi-2">
        <O nhan="Hộ được giao" className="ca-hang">
          <div className="nhom-nut">
            <Chon value={hoId} onChange={(e) => setHoId(e.target.value)} aria-label="Hộ được giao" className="gian">
              {!dsHo.length && <option value="">— Không có hộ —</option>}
              {dsHo.map((x) => <option key={x.id} value={x.id}>{x.ma} · {x.ten}{daCo.has(x.id) ? " (đã có lô)" : ""}</option>)}
            </Chon>
            <label className="chu-nho"><input type="checkbox" checked={chiCho} onChange={(e) => setChiCho(e.target.checked)} /> Chỉ hộ chờ bố trí (TĐC giao đất ở/nhà ở, chưa có lô)</label>
          </div>
        </O>
        <O nhan="Hình thức"><Chon value={hinhThuc} onChange={(e) => setHinhThuc(e.target.value as HinhThucGiao)}>{Object.entries(TEN_HINH_THUC_GIAO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Chon></O>
        <O nhan="Ngày giao"><ONgay value={ngay} onChange={(e) => setNgay(e.target.value)} /></O>
        <O nhan="Căn cứ giao (bắt buộc)" className="ca-hang"><input className={!canCu.trim() ? "loi-nhap" : ""} value={canCu} onChange={(e) => setCanCu(e.target.value)} placeholder={hinhThuc === "BOC_THAM" ? "Biên bản bốc thăm số …, ngày …" : "Quyết định/biên bản giao đất số …, ngày …"} /></O>
      </div>
      {h && daCo.has(h.id) && <div className="thong-bao thong-bao-vang mt-8">Hộ đã được giao lô khác — chỉ giao thêm khi thuộc trường hợp được bố trí nhiều hơn một lô (Điều 111 Luật Đất đai 2024), phần mềm sẽ cảnh báo để kiểm tra.</div>}
      {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
    </HopThoai>
  );
}

function HopThuHoi({ duAn, hos, lo, dong }: { duAn: DuAn; hos: Ho[]; lo: LoTdc; dong: () => void }) {
  const { ghiDuAnVaHo, nguoiDung } = useUngDung();
  const [lyDo, setLyDo] = useState("");
  const [loi, setLoi] = useState("");
  const h = hos.find((x) => x.id === lo.giao?.hoId);
  const luu = async () => {
    try {
      const r = thuHoiGiao(duAn, h, lo.id, lyDo, nguoiDung);
      if (await ghiDuAnVaHo(r.duAn, r.ho ? [{ h: r.ho, nhatKy: `Thu hồi giao ${tenLo(lo)}: ${lyDo.trim()}` }] : [], ["Thu hồi giao lô tái định cư", `${duAn.ten}: ${tenLo(lo)} (${h ? `${h.ma} · ${h.ten}` : "hồ sơ không còn"}) — ${lyDo.trim()}`])) dong();
    } catch (e) {
      setLoi((e as Error).message);
    }
  };
  return (
    <HopThoai tieuDe={`Thu hồi giao ${tenLo(lo)}`} rong={620} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-nguy" disabled={!lyDo.trim()} onClick={() => void luu()}>Thu hồi giao</button></>}>
      <p>Lô đang giao cho <b>{h ? `${h.ma} · ${h.ten}` : "(hồ sơ không còn)"}</b>. Thu hồi giao sẽ xóa thông tin lô trong thẻ Hỗ trợ tái định cư của hồ sơ hộ (giữ hình thức và khoản hỗ trợ khác), lưu vết vào lịch sử thu hồi giao.</p>
      <O nhan="Lý do (bắt buộc)"><input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="vd. Giao nhầm lô; hộ đổi lô theo biên bản …" /></O>
      {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
    </HopThoai>
  );
}

function HopBocTham({ duAn, hos, dong }: { duAn: DuAn; hos: Ho[]; dong: () => void }) {
  const { ghiDuAnVaHo, nguoiDung } = useUngDung();
  const q = quyCua(duAn);
  const daCo = new Set(q.lo.filter((l) => l.giao).map((l) => l.giao!.hoId));
  const hoCho = hos.filter((h) => canBoTriLo(h) && !daCo.has(h.id));
  const loTrong = q.lo.filter((l) => trangThaiLo(l) === "TRONG");
  const [ngay, setNgay] = useState(homNayIso());
  const [bienBan, setBienBan] = useState("");
  const [thanhPhan, setThanhPhan] = useState("");
  const [dong_, setDong] = useState<{ stt: number; hoId: string; loId: string }[]>(() => hoCho.map((h, i) => ({ stt: i + 1, hoId: h.id, loId: "" })));
  const [loi, setLoi] = useState("");
  const sua = (i: number, p: Partial<(typeof dong_)[number]>) => setDong(dong_.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const luu = async () => {
    setLoi("");
    try {
      const dsGhi = dong_.filter((x) => x.loId);
      const r = ghiKetQuaBocTham(duAn, hos, { ngay, bienBan, thanhPhan: thanhPhan.trim() || undefined, ketQua: dsGhi }, nguoiDung);
      if (await ghiDuAnVaHo(r.duAn, r.ho.map((h) => { const x = r.ban.ketQua.find((y) => y.hoId === h.id)!; return { h, nhatKy: `Bốc thăm (biên bản ${r.ban.bienBan}, thứ tự ${x.stt}): ${tenLo(q.lo.find((l) => l.id === x.loId)!)}` }; }), ["Ghi nhận kết quả bốc thăm lô tái định cư", `${duAn.ten}: biên bản ${r.ban.bienBan}; ${r.ban.ketQua.length} hộ`])) dong();
    } catch (e) {
      setLoi((e as Error).message);
    }
  };
  const daChon = new Set(dong_.map((x) => x.loId).filter(Boolean));
  return (
    <HopThoai tieuDe="Ghi nhận kết quả bốc thăm" rong={940} dong={dong} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={!bienBan.trim() || !daChon.size} onClick={() => void luu()}>Ghi nhận {daChon.size} kết quả</button></>}>
      <div className="thong-bao thong-bao-xanh chu-nho">Nhập đúng theo biên bản bốc thăm. Hộ không tham gia/vắng mặt: để trống cột lô. Mỗi hộ, mỗi lô chỉ xuất hiện một lần; lô được giao sẽ ghi vào hồ sơ hộ.</div>
      <div className="luoi luoi-3">
        <O nhan="Ngày bốc thăm"><ONgay value={ngay} onChange={(e) => setNgay(e.target.value)} /></O>
        <O nhan="Biên bản số, ngày (bắt buộc)" style={{ gridColumn: "span 2" }}><input className={!bienBan.trim() ? "loi-nhap" : ""} value={bienBan} onChange={(e) => setBienBan(e.target.value)} placeholder="vd. 05/BB-HĐBT ngày 10/10/2026" /></O>
        <O nhan="Thành phần chủ trì, chứng kiến" className="ca-hang"><input value={thanhPhan} onChange={(e) => setThanhPhan(e.target.value)} placeholder="vd. Hội đồng BT, HT, TĐC; UBMTTQ xã; đại diện các hộ" /></O>
      </div>
      <div className="bang-cuon" style={{ maxHeight: 360, marginTop: 8 }}>
        <table className="bang">
          <thead><tr><th style={{ width: 90 }}>Thứ tự bốc</th><th>Hộ</th><th>Lô bốc được</th></tr></thead>
          <tbody>
            {dong_.map((x, i) => {
              const h = hos.find((y) => y.id === x.hoId);
              return (
                <tr key={x.hoId}>
                  <td><input type="number" min={1} aria-label={`Thứ tự bốc ${h?.ma}`} value={x.stt} onChange={(e) => sua(i, { stt: Number(e.target.value) })} /></td>
                  <td>{h?.ma} · {h?.ten}</td>
                  <td>
                    <Chon value={x.loId} aria-label={`Lô bốc được ${h?.ma}`} onChange={(e) => sua(i, { loId: e.target.value })}>
                      <option value="">— Không bốc / vắng —</option>
                      {loTrong.filter((l) => l.id === x.loId || !daChon.has(l.id)).map((l) => <option key={l.id} value={l.id}>{tenLo(l)} · {hienSo(l.dienTich)} m²</option>)}
                    </Chon>
                  </td>
                </tr>
              );
            })}
            {!dong_.length && <tr><td colSpan={3} className="trong">Không có hộ chờ bố trí lô.</td></tr>}
          </tbody>
        </table>
      </div>
      {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
    </HopThoai>
  );
}

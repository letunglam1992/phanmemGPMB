import { useEffect, useMemo, useState } from "react";
import { ChonTep } from "../../thanh-phan/ChonTep";
import { diemTrongThua, docBangDiem, docDgn, dungThua, soSanhBanDo, type Diem, type SoSanhThua, type ThuaBanDo } from "@gpmb/gis";
import { useUngDung } from "../../ung-dung";
import { taoId, TEN_NHOM_GHI_CHU, type DiemDoHienTrang, type DuAn, type GhiChuHienTruong, type Ho, type KetQuaDoLuu, type NhomGhiChu } from "../../mo-hinh";
import { HopThoai, O } from "../../thanh-phan/chung";
import { Chon } from "../../thanh-phan/Chon";
import { taiXuong } from "../../tai-xuong";
import type { DinhKem } from "../../kho";
import { xoaMemTep } from "../../dinh-kem-thung-rac";
import { laAnhXemDuoc, loiTepDinhKem } from "../../thanh-phan/DinhKemHo";
import { tenTep } from "../../ten-tep";
import { MAU_GHI_CHU } from "./KhungVe";
import { type DuLieuBanDo, dsSoTo, khoaTepGhep, thamChieuThieu } from "./du-lieu";
import { docBang } from "./RanhGpmb";
import { doiChieuSoSanh } from "./ranh";
import { hienSo } from "../../so";

const so = (v: number, le = 2) => v.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });
const ngayVn = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");
/** Ô vuông quanh điểm để phóng tới (bán kính 15 m). */
export const vongQuanh = (ds: Diem[]): Diem[][] => {
  const xs = ds.map((d) => d.x), ys = ds.map((d) => d.y);
  const [a, b, c, e] = [Math.min(...xs) - 15, Math.max(...xs) + 15, Math.min(...ys) - 15, Math.max(...ys) + 15];
  return [[{ x: a, y: c }, { x: b, y: c }, { x: b, y: e }, { x: a, y: e }, { x: a, y: c }]];
};
const thuaChua = (dl: DuLieuBanDo, d: Diem) => dl.kq.thua.find((t) => diemTrongThua(d, t.vong));

type LuuBanDo = (p: Partial<NonNullable<DuAn["banDo"]>>) => unknown;

/** Hộp thoại thêm ghi chú hiện trường (docs/08 §9.6): nhóm, nội dung, hộ (mặc định hộ của thửa chứa điểm đầu). */
export function HopGhiChu(p: { dl: DuLieuBanDo; loai: "DIEM" | "DUONG"; diem: Diem[]; daLienKet: Map<string, Ho>; hos: Ho[]; luu: (g: Omit<GhiChuHienTruong, "id" | "ngay" | "nguoi">) => void; dong: () => void }) {
  const t = thuaChua(p.dl, p.diem[0]!);
  const [nhom, setNhom] = useState<NhomGhiChu>("VUONG_MAC");
  const [noiDung, setNoiDung] = useState("");
  const [hoId, setHoId] = useState(t ? (p.daLienKet.get(t.ma)?.id ?? "") : "");
  return (
    <HopThoai tieuDe={p.loai === "DIEM" ? "Thêm ghi chú hiện trường (điểm)" : "Thêm ghi chú hiện trường (đường)"} dong={p.dong} rong={560} chan={<><button className="nut" onClick={p.dong}>Hủy</button><button className="nut nut-chinh" disabled={!noiDung.trim()} onClick={() => { p.luu({ loai: p.loai, nhom, noiDung: noiDung.trim(), diem: p.diem, hoId: hoId || undefined }); p.dong(); }}>Lưu ghi chú</button></>}>
      <div className="chu-nho mo mb-10">{t ? `Trong thửa ${t.soTo ?? "?"}-${t.soThua ?? "?"}` : "Ngoài các thửa của bản đồ"} · X {so(p.diem[0]!.y)} · Y {so(p.diem[0]!.x)}{p.loai === "DUONG" ? ` · ${p.diem.length} điểm` : ""}</div>
      <div className="luoi" style={{ gap: 8 }}>
        <O nhan="Nhóm">
          <Chon value={nhom} aria-label="Nhóm ghi chú" onChange={(e) => setNhom(e.target.value as NhomGhiChu)}>
            {(Object.keys(TEN_NHOM_GHI_CHU) as NhomGhiChu[]).map((k) => <option key={k} value={k}>{TEN_NHOM_GHI_CHU[k]}</option>)}
          </Chon>
        </O>
        <O nhan="Nội dung *"><textarea rows={3} aria-label="Nội dung ghi chú" value={noiDung} onChange={(e) => setNoiDung(e.target.value)} placeholder="vd. Hộ chưa đồng ý vị trí cọc; 02 mộ đất chưa kiểm đếm…" /></O>
        <O nhan="Gắn với hộ">
          <Chon value={hoId} aria-label="Gắn với hộ" onChange={(e) => setHoId(e.target.value)}>
            <option value="">— Không gắn —</option>
            {p.hos.map((h) => <option key={h.id} value={h.id}>{h.ma} · {h.ten}</option>)}
          </Chon>
        </O>
      </div>
    </HopThoai>
  );
}

/** Ảnh hiện trường nhận được (xem trước trong phần mềm trừ HEIC). */
export const DUOI_ANH_GHI_CHU = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

/**
 * Ảnh của ghi chú hiện trường (0.9.27): lưu như tệp đính kèm (của hộ gắn với ghi chú; không gắn hộ → tài liệu chung của dự án,
 * nhóm "Bản đồ, trích đo"), nên có trong bản sao lưu và thùng rác tệp; ghi chú giữ mã tệp.
 */
function HopAnhGhiChu(p: { duAn: DuAn; g: GhiChuHienTruong; hos: Ho[]; sua: boolean; doiAnh: (anh: string[]) => Promise<unknown>; dong: () => void }) {
  const { kho, nguoiDung, ghiNhatKy, bao } = useUngDung();
  const [ds, setDs] = useState<{ meta: DinhKem; url: string | null }[] | null>(null);
  const [dang, setDang] = useState(false);
  const anh = p.g.anh ?? [];
  useEffect(() => {
    let huy = false;
    const urls: string[] = [];
    void (async () => {
      const tep = (await kho.dsDinhKem(p.duAn.id)).filter((x) => anh.includes(x.id) && !x.daXoa);
      const out = await Promise.all(tep.map(async (meta) => {
        const b = laAnhXemDuoc(meta.ten) ? await kho.docDinhKem(meta.id) : null;
        const url = b ? URL.createObjectURL(new Blob([b.slice()], { type: meta.loai || "image/jpeg" })) : null;
        if (url) urls.push(url);
        return { meta, url };
      }));
      if (!huy) setDs(out);
    })().catch(() => !huy && setDs([]));
    return () => {
      huy = true;
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [kho, p.duAn.id, anh.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const them = async (ts: FileList) => {
    const loi = [...ts].map((f) => (!DUOI_ANH_GHI_CHU.some((d) => f.name.toLowerCase().endsWith(d)) ? `"${f.name}": chỉ nhận ảnh ${DUOI_ANH_GHI_CHU.join(", ")}` : loiTepDinhKem(f.name, f.size))).filter(Boolean);
    if (loi.length) return bao(`Không thêm được ảnh: ${loi.join("; ")}`, "loi");
    setDang(true);
    try {
      const h = p.hos.find((x) => x.id === p.g.hoId);
      const lo = await Promise.all([...ts].map(async (f) => ({
        meta: { id: taoId(), hoId: h?.id ?? "", duAnId: p.duAn.id, buoc: "", ten: f.name, loai: f.type || "image/jpeg", kichThuoc: f.size, luc: new Date().toISOString(), nguoi: nguoiDung, ghiChu: `Ảnh ghi chú hiện trường: ${p.g.noiDung}`.slice(0, 300), ...(h ? {} : { nhom: "BAN_DO" }) } as DinhKem,
        bytes: new Uint8Array(await f.arrayBuffer()),
      })));
      await kho.ghiLo({ dinhKem: lo });
      await p.doiAnh([...anh, ...lo.map((x) => x.meta.id)]);
      await ghiNhatKy("Thêm ảnh ghi chú hiện trường", `${p.duAn.ten}${h ? ` · ${h.ma} ${h.ten}` : ""}: ${p.g.noiDung} — ${lo.map((x) => x.meta.ten).join(", ")}`);
      bao(`Đã thêm ${lo.length} ảnh`);
    } catch (e) {
      bao(`Không thêm được ảnh: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };
  const bo = async (x: DinhKem) => {
    if (!confirm(`Bỏ ảnh "${x.ten}" khỏi ghi chú? Tệp chuyển vào "Tệp đã xóa", khôi phục được.`)) return;
    await xoaMemTep(kho, x, nguoiDung);
    await p.doiAnh(anh.filter((id) => id !== x.id));
  };
  return (
    <HopThoai tieuDe={`Ảnh hiện trường: ${p.g.noiDung.slice(0, 60)}`} dong={p.dong} rong={760} chan={<button className="nut" onClick={p.dong}>Đóng</button>}>
      <p className="mo chu-nho mt-0">Ảnh lưu cùng tệp đính kèm {p.g.hoId ? "của hồ sơ hộ gắn với ghi chú" : "chung của dự án (Tài liệu, văn bản → Bản đồ, trích đo)"}; có trong bản sao lưu; tối đa 20 MB mỗi ảnh. Ảnh HEIC (iPhone): tải về mở bằng ứng dụng Ảnh.</p>
      {p.sua && (
        <label className={`nut nut-chinh ${dang ? "tat" : ""}`}>
          {dang ? "Đang lưu…" : "Thêm ảnh…"}
          <input type="file" multiple aria-label="Chọn ảnh hiện trường" accept={DUOI_ANH_GHI_CHU.join(",")} className="an" disabled={dang} onChange={(e) => { const f = e.target.files; if (f?.length) void them(f); e.target.value = ""; }} />
        </label>
      )}
      {ds === null ? <div className="trong">Đang tải…</div> : !ds.length ? <div className="trong">Chưa có ảnh.</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
          {ds.map(({ meta, url }) => (
            <figure key={meta.id} style={{ margin: 0, border: "1px solid var(--vien)", borderRadius: 6, padding: 6 }}>
              {url ? <img src={url} alt={meta.ten} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 4 }} /> : <div className="trong" style={{ height: 150 }}>Không xem trước được</div>}
              <figcaption className="chu-nho" style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 4 }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={meta.ten}>{meta.ten}</span>
                <button className="nut nut-chu nut-nho" onClick={async () => { const b = await kho.docDinhKem(meta.id); if (b) await taiXuong(b, meta.ten, meta.loai); }}>Tải</button>
                {p.sua && <button className="nut nut-chu nut-nguy nut-nho" aria-label={`Bỏ ảnh ${meta.ten}`} onClick={() => void bo(meta)}>✕</button>}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </HopThoai>
  );
}

/** Danh sách ghi chú hiện trường: lọc chưa xử lý, phóng tới, đánh dấu đã xử lý, mở hồ sơ, ảnh, xóa. */
export function TheGhiChu(p: { duAn: DuAn; hos: Ho[]; luu: LuuBanDo; phongToi: (v: Diem[][]) => void; batCongCu: () => void }) {
  const { quyen, di } = useUngDung();
  const [tatCa, setTatCa] = useState(false);
  const [xemAnh, setXemAnh] = useState<string | null>(null);
  const ds = (p.duAn.banDo?.ghiChu ?? []).filter((g) => tatCa || !g.daXuLy);
  const sua = quyen("SUA_HO_SO");
  const doi = (id: string, f: (g: GhiChuHienTruong) => GhiChuHienTruong | null) => p.luu({ ghiChu: (p.duAn.banDo?.ghiChu ?? []).map((g) => (g.id === id ? f(g) : g)).filter((g): g is GhiChuHienTruong => !!g) });
  const tong = p.duAn.banDo?.ghiChu?.length ?? 0;
  return (
    <div className="the co-dinh" aria-label="Danh sách ghi chú hiện trường">
      <div className="the-dau"><h3>Ghi chú hiện trường</h3><span className="mo chu-nho">{ds.length}/{tong}</span><div className="phai"><button className="nut nut-nho" disabled={!sua} onClick={p.batCongCu} title="Chọn công cụ 📌 rồi bấm vị trí trên bản đồ">+ Ghi chú</button></div></div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
        <label><input type="checkbox" checked={tatCa} onChange={(e) => setTatCa(e.target.checked)} /> Hiện cả ghi chú đã xử lý</label>
        {ds.map((g) => {
          const h = p.hos.find((x) => x.id === g.hoId);
          return (
            <div key={g.id} className="nhom-nut giua-doc" style={{ borderTop: "1px solid var(--vien)", paddingTop: 4, opacity: g.daXuLy ? 0.6 : 1 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: MAU_GHI_CHU[g.nhom], display: "inline-block" }} />
              <span style={{ flex: 1 }}>
                <b>{TEN_NHOM_GHI_CHU[g.nhom]}</b>: {g.noiDung}
                <span className="mo"> · {g.loai === "DUONG" ? "đường" : "điểm"} · {ngayVn(g.ngay)}{g.nguoi ? ` · ${g.nguoi}` : ""}</span>
                {h && <> · <button className="nut nut-chu nut-nho" onClick={() => di({ ten: "ho", duAnId: p.duAn.id, hoId: h.id })}>{h.ma} {h.ten}</button></>}
              </span>
              <button className="nut nut-chu nut-nho" aria-label={`Ảnh ghi chú ${g.noiDung}`} title="Ảnh hiện trường" onClick={() => setXemAnh(g.id)}>📷{g.anh?.length ? ` ${g.anh.length}` : ""}</button>
              <button className="nut nut-chu nut-nho" aria-label={`Phóng tới ghi chú ${g.noiDung}`} onClick={() => p.phongToi(vongQuanh(g.diem))}>⌖</button>
              <button className="nut nut-chu nut-nho" disabled={!sua} onClick={() => doi(g.id, (x) => ({ ...x, daXuLy: !x.daXuLy }))}>{g.daXuLy ? "Mở lại" : "Đã xử lý"}</button>
              <button className="nut nut-chu nut-nguy nut-nho" disabled={!sua} aria-label="Xóa ghi chú" onClick={() => confirm("Xóa ghi chú này?") && doi(g.id, () => null)}>✕</button>
            </div>
          );
        })}
        {!ds.length && <div className="mo">Chưa có ghi chú{tong ? " chưa xử lý" : ""}.</div>}
      </div>
      {xemAnh && (() => {
        const g = p.duAn.banDo?.ghiChu?.find((x) => x.id === xemAnh);
        return g ? <HopAnhGhiChu duAn={p.duAn} g={g} hos={p.hos} sua={sua} doiAnh={(anh) => Promise.resolve(doi(g.id, (x) => ({ ...x, anh: anh.length ? anh : undefined })))} dong={() => setXemAnh(null)} /> : null;
      })()}
    </div>
  );
}

/**
 * Điểm đo hiện trạng (docs/08 §9.7): nạp bảng tọa độ, chồng lên bản đồ; gắn điểm với tài sản kiểm đếm của hộ; đối chiếu điểm có
 * nằm trong thửa của tài sản đó không.
 */
export function TheDiemDo(p: { duAn: DuAn; dl: DuLieuBanDo; daLienKet: Map<string, Ho>; hos: Ho[]; luu: LuuBanDo; phongToi: (v: Diem[][]) => void }) {
  const { quyen, bao } = useUngDung();
  const ds = p.duAn.banDo?.diemDo ?? [];
  const sua = quyen("SUA_HO_SO");
  const doi = (id: string, x: Partial<DiemDoHienTrang>) => p.luu({ diemDo: ds.map((d) => (d.id === id ? { ...d, ...x } : d)) });
  const nap = async (f: File) => {
    try {
      const r = docBangDiem(await docBang(f));
      if (!r.diem.length) throw new Error(r.canhBao.join("; ") || "Không đọc được điểm nào");
      const ngoai = r.diem.filter((d) => !thuaChua(p.dl, d) && (d.x < p.dl.pham.minX - 500 || d.x > p.dl.pham.maxX + 500 || d.y < p.dl.pham.minY - 500 || d.y > p.dl.pham.maxY + 500)).length;
      await p.luu({ diemDo: [...ds, ...r.diem.map((d) => ({ id: taoId(), ...d, tep: f.name }))] });
      bao(`Đã nạp ${r.diem.length} điểm đo${r.doiTruc ? " (X là tọa độ Bắc — đã đổi trục)" : ""}${ngoai ? `; ${ngoai} điểm nằm xa phạm vi bản đồ — kiểm tra hệ tọa độ` : ""}`, ngoai ? "loi" : undefined);
    } catch (e) {
      bao((e as Error).message, "loi");
    }
  };
  return (
    <div className="the co-dinh" aria-label="Điểm đo hiện trạng">
      <div className="the-dau">
        <h3>Điểm đo hiện trạng</h3><span className="mo chu-nho">{ds.length} điểm</span>
        <div className="phai">
          <label className="nut nut-nho" aria-disabled={!sua}>Nạp điểm đo…<input type="file" aria-label="Tệp điểm đo" accept=".xlsx,.csv,.txt" className="an" disabled={!sua} onChange={(e) => { const f = e.target.files?.[0]; if (f) void nap(f); e.target.value = ""; }} /></label>
          {ds.length > 0 && <button className="nut nut-chu nut-nguy nut-nho" disabled={!sua} onClick={() => confirm(`Xóa ${ds.length} điểm đo?`) && p.luu({ diemDo: [] })}>Xóa hết</button>}
        </div>
      </div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4, maxHeight: 300, overflow: "auto" }}>
        {!ds.length && <div className="mo">Bảng Excel/CSV: Tên điểm · X · Y · Mô tả (VN-2000, m). Gắn từng điểm với tài sản kiểm đếm để đối chiếu vị trí thực địa.</div>}
        {ds.map((d) => {
          const t = thuaChua(p.dl, d);
          const hoThua = t ? p.daLienKet.get(t.ma) : undefined;
          const ho = p.hos.find((h) => h.id === (d.hoId ?? hoThua?.id));
          const ts = ho?.taiSan.find((x) => x.id === d.taiSanId);
          const thuaTs = ts ? ho!.thua.find((x) => x.id === ts.thuaId) : undefined;
          const lech = ts && t && thuaTs?.maBanDo && thuaTs.maBanDo !== t.ma;
          return (
            <div key={d.id} style={{ borderTop: "1px solid var(--vien)", paddingTop: 4 }}>
              <div className="nhom-nut giua-doc">
                <b>{d.ten}</b><span className="mo" style={{ flex: 1 }}>{d.moTa} · {t ? `thửa ${t.soTo ?? "?"}-${t.soThua ?? "?"}` : "ngoài thửa"}{hoThua ? ` · ${hoThua.ma}` : ""}</span>
                <button className="nut nut-chu nut-nho" aria-label={`Phóng tới điểm ${d.ten}`} onClick={() => p.phongToi(vongQuanh([d]))}>⌖</button>
                <button className="nut nut-chu nut-nguy nut-nho" disabled={!sua} aria-label={`Xóa điểm ${d.ten}`} onClick={() => p.luu({ diemDo: ds.filter((x) => x.id !== d.id) })}>✕</button>
              </div>
              {ho && (
                <Chon value={d.taiSanId ?? ""} aria-label={`Tài sản của điểm ${d.ten}`} disabled={!sua} onChange={(e) => doi(d.id, { hoId: ho.id, taiSanId: e.target.value || undefined })}>
                  <option value="">— Gắn tài sản kiểm đếm của {ho.ma} —</option>
                  {ho.taiSan.map((x) => <option key={x.id} value={x.id}>{x.ten || "(chưa đặt tên)"}{(() => { const th = ho.thua.find((y) => y.id === x.thuaId); return th ? ` (thửa ${th.soThua}/${th.soTo})` : ""; })()}</option>)}
                </Chon>
              )}
              {lech && <div style={{ color: "var(--do)" }}>Điểm đo nằm ngoài thửa của tài sản “{ts!.ten}” (kiểm đếm ở thửa {thuaTs!.soThua}/{thuaTs!.soTo}) — đối chiếu biên bản kiểm đếm.</div>}
              {ts && !lech && <div className="mo">Vị trí thực địa của tài sản “{ts.ten}”.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Kết quả đo đã lưu (docs/08 §9.10): phóng tới, xóa, xuất CSV tọa độ các đỉnh. */
export function TheKetQuaDo(p: { duAn: DuAn; luu: LuuBanDo; phongToi: (v: Diem[][]) => void }) {
  const { quyen } = useUngDung();
  const ds = p.duAn.banDo?.ketQuaDo ?? [];
  if (!ds.length) return null;
  const xuat = async () => {
    const dong = ["Ten;Loai;Gia tri;Dinh;X (Bac);Y (Dong)", ...ds.flatMap((k) => k.diem.map((d, i) => `${k.ten};${k.loai === "DT" ? "Dien tich (m2)" : "Chieu dai (m)"};${k.giaTri.toFixed(2).replace(".", ",")};${i + 1};${d.y.toFixed(3).replace(".", ",")};${d.x.toFixed(3).replace(".", ",")}`))];
    await taiXuong(new TextEncoder().encode("﻿" + dong.join("\r\n")), `Ket-qua-do_${tenTep(p.duAn.ten, 60)}.csv`, "text/csv");
  };
  return (
    <div className="the co-dinh" aria-label="Kết quả đo đã lưu">
      <div className="the-dau"><h3>Kết quả đo đã lưu</h3><div className="phai"><button className="nut nut-nho" onClick={() => void xuat()}>Xuất CSV tọa độ</button></div></div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
        {ds.map((k) => (
          <div key={k.id} className="nhom-nut giua-doc">
            <span style={{ flex: 1 }}><b>{k.ten}</b> · {k.loai === "DT" ? `${so(k.giaTri)} m²` : `${so(k.giaTri)} m`} <span className="mo">· {k.diem.length} điểm · {ngayVn(k.ngay)}</span></span>
            <button className="nut nut-chu nut-nho" aria-label={`Phóng tới ${k.ten}`} onClick={() => p.phongToi(vongQuanh(k.diem))}>⌖</button>
            <button className="nut nut-chu nut-nguy nut-nho" disabled={!quyen("SUA_HO_SO")} aria-label={`Xóa ${k.ten}`} onClick={() => p.luu({ ketQuaDo: ds.filter((x) => x.id !== k.id) })}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export const taoKetQuaDo = (ds: KetQuaDoLuu[], loai: "DAI" | "DT", diem: Diem[], giaTri: number, nguoi: string): KetQuaDoLuu => ({
  id: taoId(),
  ten: `${loai === "DT" ? "Diện tích" : "Khoảng cách"} ${ds.filter((x) => x.loai === loai).length + 1}`,
  loai,
  diem,
  giaTri,
  ngay: new Date().toISOString(),
  nguoi,
});

export const TEN_SO_SANH: Record<SoSanhThua["trangThai"], string> = { GIONG: "Không đổi", DOI_DT: "Đổi diện tích", DOI_HINH: "Đổi hình dạng", MOI: "Thửa mới", MAT: "Không còn ở bản mới" };
export const MAU_SO_SANH: Record<SoSanhThua["trangThai"], string> = { GIONG: "#7f8c8d", DOI_DT: "#e07b00", DOI_HINH: "#c9a400", MOI: "#1f8a3a", MAT: "#d0021b" };

/** So sánh bản đồ đang xem (bản cũ) với một tệp DGN khác (bản mới) — docs/08 §9.8. Kết quả giữ trong phiên. */
export function HopSoSanh(p: { duAn: DuAn; dl: DuLieuBanDo; ketQua: (kq: { tep: string; ds: SoSanhThua[] } | null) => void; dong: () => void }) {
  const [loi, setLoi] = useState<string | null>(null);
  const [kq, setKq] = useState<{ tep: string; ds: SoSanhThua[] } | null>(null);
  const dem = useMemo(() => {
    const m: Record<string, number> = {};
    for (const x of kq?.ds ?? []) m[x.trangThai] = (m[x.trangThai] ?? 0) + 1;
    return m;
  }, [kq]);
  const { hoCua, bao } = useUngDung();
  const khac = useMemo(() => doiChieuSoSanh((kq?.ds ?? []).filter((x) => x.trangThai !== "GIONG"), hoCua(p.duAn.id)), [kq, hoCua, p.duAn.id]);
  const xuat = async () => {
    if (!kq) return;
    const { default: E } = await import("exceljs");
    const wb = new E.Workbook();
    const ws = wb.addWorksheet("So sánh bản đồ");
    ws.addRow([`So sánh bản đồ — ${p.duAn.ten}: bản đang dùng với tệp ${kq.tep} (${new Date().toLocaleDateString("vi-VN")})`]).font = { bold: true };
    ws.addRow(["DT hình học tính từ bản đồ, chỉ để đối chiếu — DT lập phương án theo hồ sơ đo đạc, trích đo được duyệt."]).font = { italic: true };
    ws.addRow(["Tờ", "Thửa", "Thay đổi", "DT cũ (m²)", "DT mới (m²)", "Chênh (m²)", "Khác biệt hình (m²)", "Hồ sơ", "DT thửa trong hồ sơ (m²)", "DT thu hồi trong hồ sơ (m²)"]).font = { bold: true };
    const lam = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
    for (const { x, ho } of khac)
      ws.addRow([x.soTo ?? "", x.soThua ?? "", TEN_SO_SANH[x.trangThai], lam(x.dtCu), lam(x.dtMoi), x.dtCu !== null && x.dtMoi !== null ? lam(x.dtMoi - x.dtCu) : null, lam(x.khacBiet), ho.map((h) => `${h.ma} ${h.ten}`).join("; "), ho.map((h) => h.dtThua).join("; "), ho.map((h) => h.dtThuHoi).join("; ")]);
    ws.columns.forEach((c, i) => (c.width = [6, 8, 18, 12, 12, 11, 12, 30, 14, 14][i]));
    for (const k of [4, 5, 6, 7]) ws.getColumn(k).numFmt = "#,##0.00";
    if (await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), tenTep(`So-sanh-ban-do - ${p.duAn.ten}.xlsx`), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) bao("Đã xuất bảng so sánh bản đồ");
  };
  return (
    <HopThoai tieuDe="So sánh với bản đồ khác (trích đo bổ sung)" dong={p.dong} rong={820} chan={<><button className="nut" disabled={!kq} onClick={() => void xuat()}>Xuất Excel</button><button className="nut" onClick={p.dong}>Đóng</button><button className="nut nut-chinh" disabled={!kq} onClick={() => { p.ketQua(kq); p.dong(); }}>Hiện trên bản đồ</button></>}>
      <p className="mt-0 chu-nho">Bản đang xem là bản cũ; chọn tệp DGN hoặc DXF bản mới (cùng hệ VN-2000). Thửa ghép theo số tờ, số thửa (thửa thiếu số ghép theo vị trí nhãn). Đổi diện tích: lệch &gt; 0,5 m² và &gt; 0,1%; đổi hình: phần khác biệt &gt; 1 m². Dùng cấu hình lớp của bản đồ đang xem.</p>
      <ChonTep aria-label="Tệp bản đồ bản mới" accept=".dgn,.dxf,.dwg" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLoi(null);
        try {
          const moi = dungThua(docDgn(new Uint8Array(await f.arrayBuffer())), p.dl.cauHinh).thua;
          if (!moi.length) throw new Error("Không dựng được thửa nào ở tệp mới với cấu hình lớp hiện tại");
          setKq({ tep: f.name, ds: soSanhBanDo(p.dl.kq.thua, moi) });
        } catch (er) {
          setLoi((er as Error).message);
        }
      }} />
      {loi && <div className="thong-bao thong-bao-do">{loi}</div>}
      {kq && (
        <>
          <div className="nhom-nut mt-8 chu-nho">{(Object.keys(TEN_SO_SANH) as SoSanhThua["trangThai"][]).map((k) => <span key={k} className="nhan" style={{ borderColor: MAU_SO_SANH[k] }}>{TEN_SO_SANH[k]}: {dem[k] ?? 0}</span>)}</div>
          <div className="bang-cuon" style={{ maxHeight: "45vh" }}>
            <table className="bang" aria-label="Kết quả so sánh">
              <thead><tr><th>Tờ-thửa</th><th>Thay đổi</th><th className="so">DT cũ (m²)</th><th className="so">DT mới (m²)</th><th className="so">Chênh (m²)</th><th className="so">Khác biệt hình (m²)</th><th>Hồ sơ (DT thửa / thu hồi)</th></tr></thead>
              <tbody>
                {khac.map(({ x, ho }, i) => (
                  <tr key={x.ma + i}>
                    <td>{x.soTo ?? "?"}-{x.soThua ?? "?"}</td>
                    <td style={{ color: MAU_SO_SANH[x.trangThai] }}>{TEN_SO_SANH[x.trangThai]}</td>
                    <td className="so">{x.dtCu === null ? "—" : so(x.dtCu)}</td>
                    <td className="so">{x.dtMoi === null ? "—" : so(x.dtMoi)}</td>
                    <td className="so">{x.dtCu !== null && x.dtMoi !== null ? so(x.dtMoi - x.dtCu) : "—"}</td>
                    <td className="so">{so(x.khacBiet)}</td>
                    <td className="chu-nho">{ho.length ? ho.map((h) => <div key={h.id}>{h.ma} {h.ten}: {hienSo(h.dtThua) || "—"} / {hienSo(h.dtThuHoi) || "—"}</div>) : <span className="mo">—</span>}</td>
                  </tr>
                ))}
                {!khac.length && <tr><td colSpan={7} className="trong">Hai bản đồ không khác nhau (theo dung sai).</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </HopThoai>
  );
}

/** Ô số tờ nhập tay của một tệp: lưu khi rời ô / Enter. */
function OSoToTep(p: { giaTri: string; ten: string; sua: boolean; luu: (v: string) => void }) {
  const [v, setV] = useState(p.giaTri);
  useEffect(() => {
    setV(p.giaTri);
  }, [p.giaTri]);
  const ghi = () => v.trim() !== p.giaTri && p.luu(v);
  return <input style={{ width: 80 }} value={v} disabled={!p.sua} aria-label={`Số tờ nhập tay của ${p.ten}`} placeholder="—" onChange={(e) => setV(e.target.value.slice(0, 16))} onBlur={ghi} onKeyDown={(e) => e.key === "Enter" && ghi()} />;
}

/** Tệp DGN ghép thêm vào bản đồ của dự án (tờ khác, mảnh trích đo khác) — docs/08 §9.9. */
/**
 * Tờ bản đồ của dự án (docs/08 §9.9): tệp chính + các tờ/mảnh trích đo nạp thêm; bật/tắt từng tờ để chọn tờ dựng chung,
 * phóng tới tờ, dò tên tệp tham chiếu (reference) chưa nạp. Tham chiếu ngoài không dựng được (vị trí, tỷ lệ, xoay của
 * tham chiếu không đọc) — nạp chính các tệp được tham chiếu làm tờ của dự án.
 */
export function HopTepGhep(p: { duAn: DuAn; dl: DuLieuBanDo | null; dong: () => void; phongToi: (r: { minX: number; minY: number; maxX: number; maxY: number }) => void }) {
  const { kho, luuDuAn, quyen, bao } = useUngDung();
  const banDo = p.duAn.banDo;
  const ds = banDo?.tepGhep ?? [];
  const [dang, setDang] = useState(false);
  const sua = quyen("SUA_HO_SO");
  const thieu = banDo && p.dl ? thamChieuThieu(p.dl, banDo) : [];
  const soTo = useMemo(() => (p.dl ? dsSoTo(p.dl) : []), [p.dl]);
  const tt = (khoa: string) => p.dl?.tep?.find((t) => t.khoa === khoa);
  const soBat = (banDo && !banDo.anTepChinh ? 1 : 0) + ds.filter((t) => !t.an).length;
  const them = async (fs: FileList) => {
    if (!banDo) return;
    setDang(true);
    try {
      const moi = [...ds];
      const trung: string[] = [];
      for (const f of [...fs]) {
        if ([banDo.tenTep, ...moi.map((t) => t.tenTep)].some((x) => x.toLowerCase() === f.name.toLowerCase())) {
          trung.push(f.name);
          continue;
        }
        const bytes = new Uint8Array(await f.arrayBuffer());
        docDgn(bytes); // kiểm tra đọc được trước khi lưu
        const id = taoId();
        await kho.luuBanDo(khoaTepGhep(p.duAn.id, id), bytes);
        moi.push({ id, tenTep: f.name, ngayNhap: new Date().toISOString() });
      }
      if (moi.length > ds.length) await luuDuAn({ ...p.duAn, banDo: { ...banDo, tepGhep: moi } });
      bao(`${moi.length > ds.length ? `Đã thêm ${moi.length - ds.length} tờ — bản đồ dựng lại` : "Không thêm tờ nào"}${trung.length ? `; bỏ qua tệp trùng tên: ${trung.join(", ")}` : ""}`, moi.length > ds.length ? undefined : "loi");
    } catch (e) {
      bao(`Không thêm được tệp: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };
  const bo = async (id: string) => {
    if (!banDo) return;
    await kho.xoaBanDo(khoaTepGhep(p.duAn.id, id));
    await luuDuAn({ ...p.duAn, banDo: { ...banDo, tepGhep: ds.filter((x) => x.id !== id) } });
  };
  const batTat = async (khoa: string, bat: boolean) => {
    if (!banDo) return;
    if (!bat && soBat <= 1) return bao("Cần bật ít nhất một tờ bản đồ", "loi");
    await luuDuAn({ ...p.duAn, banDo: khoa === "" ? { ...banDo, anTepChinh: !bat } : { ...banDo, tepGhep: ds.map((t) => (t.id === khoa ? { ...t, an: !bat } : t)) } });
  };
  const tatCa = async (bat: boolean, chiKhoa?: string) =>
    banDo && (await luuDuAn({ ...p.duAn, banDo: { ...banDo, anTepChinh: chiKhoa !== undefined ? chiKhoa !== "" : !bat, tepGhep: ds.map((t) => ({ ...t, an: chiKhoa !== undefined ? t.id !== chiKhoa : !bat })) } }));
  /** 0.9.27: số tờ cán bộ nhập cho từng tệp — dùng cho thửa bản đồ không ghi số tờ. */
  const doiSoTo = async (khoa: string, v: string) => {
    if (!banDo) return;
    const soTo = v.trim() || undefined;
    await luuDuAn({ ...p.duAn, banDo: khoa === "" ? { ...banDo, soTo } : { ...banDo, tepGhep: ds.map((t) => (t.id === khoa ? { ...t, soTo } : t)) } });
  };
  const dong = (khoa: string, ten: string, ngay: string, an: boolean | undefined, laChinh: boolean) => {
    const t = tt(khoa);
    return (
      <tr key={khoa || "chinh"} className={an ? "mo" : undefined}>
        <td><input type="checkbox" checked={!an} disabled={!sua} aria-label={`Dùng tờ ${ten}`} onChange={(e) => void batTat(khoa, e.target.checked)} /></td>
        <td><b>{ten}</b>{laChinh && <span className="mo chu-nho"> (tệp chính)</span>}{t?.thamChieu.length ? <div className="mo chu-nho">Nhắc tới: {t.thamChieu.join(", ")}</div> : null}</td>
        <td>{ngayVn(ngay)}</td>
        <td className="so">{an ? "tắt" : t ? t.soPhanTu.toLocaleString("vi-VN") : "—"}</td>
        <td><OSoToTep giaTri={(laChinh ? banDo?.soTo : ds.find((x) => x.id === khoa)?.soTo) ?? ""} ten={ten} sua={sua} luu={(v) => void doiSoTo(khoa, v)} /></td>
        <td>
          <span className="nhom-nut" style={{ gap: 4, flexWrap: "nowrap" }}>
            {t?.pham && <button className="nut nut-chu nut-nho" aria-label={`Phóng tới tờ ${ten}`} onClick={() => { p.phongToi(t.pham!); p.dong(); }}>Phóng tới</button>}
            {sua && soBat > 1 && !an && <button className="nut nut-chu nut-nho" title="Chỉ dùng tờ này, tắt các tờ khác" onClick={() => void tatCa(true, khoa)}>Chỉ tờ này</button>}
            {!laChinh && <button className="nut nut-chu nut-nguy nut-nho" disabled={!sua} aria-label={`Bỏ tệp ${ten}`} onClick={() => void bo(khoa)}>Bỏ</button>}
          </span>
        </td>
      </tr>
    );
  };
  return (
    <HopThoai tieuDe="Tờ bản đồ của dự án" dong={p.dong} rong={860} chan={<button className="nut" onClick={p.dong}>Đóng</button>}>
      <p className="mt-0 chu-nho">Một dự án có nhiều tờ bản đồ địa chính / mảnh trích đo (cùng hệ VN-2000): thêm từng tệp DGN làm một tờ, đánh dấu chọn các tờ cần dùng — thửa, ranh, nhãn của các tờ đang chọn dựng chung theo cấu hình lớp đã chốt. Tham chiếu ngoài (reference) trong tệp không dựng được; phần mềm dò tên tệp được tham chiếu để cán bộ nạp chính các tệp đó.</p>
      {thieu.length > 0 && (
        <div className="thong-bao thong-bao-vang" role="status" style={{ marginBottom: 8 }}>
          <b>Tệp nhắc tới chưa nạp ({thieu.length}):</b> {thieu.map((x) => `${x.ten} (trong ${x.tu})`).join("; ")}. Có thể là tờ tham chiếu — nếu đúng, thêm các tệp này làm tờ bản đồ.
        </div>
      )}
      <table className="bang" aria-label="Danh sách tờ bản đồ">
        <thead><tr><th>Dùng</th><th>Tệp</th><th>Ngày nạp</th><th className="so">Phần tử</th><th title="Dùng cho thửa bản đồ không ghi số tờ">Số tờ (nhập tay)</th><th /></tr></thead>
        <tbody>
          {banDo && dong("", banDo.tenTep, banDo.ngayNhap, banDo.anTepChinh, true)}
          {ds.map((t) => dong(t.id, t.tenTep, t.ngayNhap, t.an, false))}
        </tbody>
      </table>
      <div className="nhom-nut mt-8">
        <label className="nut nut-nho" aria-disabled={!sua || dang}>{dang ? "Đang nạp…" : "Thêm tờ bản đồ (DGN, DXF)…"}<input type="file" aria-label="Tệp DGN ghép thêm" accept=".dgn,.dxf,.dwg" multiple className="an" disabled={!sua || dang} onChange={(e) => { if (e.target.files?.length) void them(e.target.files); e.target.value = ""; }} /></label>
        {ds.length > 0 && sua && <button className="nut nut-nho" onClick={() => void tatCa(true)}>Dùng tất cả các tờ</button>}
      </div>
      {!p.dl && <p className="mo chu-nho" role="status">Đang dựng lại bản đồ từ các tờ đã chọn…</p>}
      {soTo.length > 0 && (
        <>
          <h3 className="mt-8" style={{ fontSize: 14 }}>Số tờ đọc được trên các tờ đang dùng</h3>
          <div className="nhom-nut" aria-label="Số tờ đọc được" style={{ gap: 6 }}>
            {soTo.map((x) => (
              <button key={x.soTo} className="nut nut-nho" title={`Phóng tới tờ số ${x.soTo}`} onClick={() => { p.phongToi(x.pham); p.dong(); }}>
                {x.soTo === "?" ? "Chưa rõ số tờ" : `Tờ ${x.soTo}`} · {x.soThua} thửa
              </button>
            ))}
          </div>
        </>
      )}
    </HopThoai>
  );
}

export type { ThuaBanDo };

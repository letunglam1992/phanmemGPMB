import { conDung, trongThungRac, xoaMemTep } from "../dinh-kem-thung-rac";
import { ThungRacTep } from "./ThungRacTep";
import { PhienBanTep } from "./PhienBanTep";
import { useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import { CAC_BUOC, taoId, type DuAn, type Ho } from "../mo-hinh";
import { TOI_DA_DINH_KEM, type DinhKem } from "../kho";
import { taiXuong } from "../tai-xuong";
import { Chon } from "./Chon";

/** Loại tệp nhận: văn bản, bản quét, ảnh, bảng tính. */
export const DUOI_DINH_KEM = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".bmp", ".tif", ".tiff", ".doc", ".docx", ".xls", ".xlsx"];
/** Ảnh xem trước được trong phần mềm (HEIC của iPhone: tải về mở bằng Ảnh của Windows) */
export const laAnhXemDuoc = (ten: string) => /\.(jpe?g|png|webp|bmp)$/i.test(ten);
export const loiTepDinhKem = (ten: string, co: number): string | null =>
  !DUOI_DINH_KEM.some((d) => ten.toLowerCase().endsWith(d)) ? `"${ten}": chỉ nhận ${DUOI_DINH_KEM.join(", ")}` : co > TOI_DA_DINH_KEM ? `"${ten}": quá 20 MB` : co === 0 ? `"${ten}": tệp rỗng` : null;
export const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Tệp đính kèm hồ sơ (P2-2): biên bản đã ký, QĐ bản quét, GCN… theo hộ và theo bước. Lưu trên máy / máy chủ nội bộ,
 * có trong bản sao lưu; không gửi ra ngoài. Tối đa 20 MB mỗi tệp.
 */
export function DinhKemHo({ h, duAn }: { h: Ho; duAn: DuAn }) {
  const { kho, quyen, nguoiDung, ghiNhatKy, bao } = useUngDung();
  const [ds, setDs] = useState<DinhKem[] | null>(null);
  const [buoc, setBuoc] = useState("");
  const [loc, setLoc] = useState("*");
  const [ghiChu, setGhiChu] = useState("");
  const [dang, setDang] = useState(false);
  const tai = async () => setDs((await kho.dsDinhKem(duAn.id)).filter((x) => x.hoId === h.id).sort((a, b) => b.luc.localeCompare(a.luc)));
  useEffect(() => void tai().catch(() => setDs([])), [h.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sua = quyen("SUA_HO_SO");
  const them = async (ts: FileList) => {
    const loi = [...ts].map((f) => loiTepDinhKem(f.name, f.size)).filter(Boolean);
    if (loi.length) return bao(`Không đính kèm được: ${loi.join("; ")}`, "loi");
    setDang(true);
    try {
      const lo = await Promise.all([...ts].map(async (f) => ({ meta: { id: taoId(), hoId: h.id, duAnId: duAn.id, buoc, ten: f.name, loai: f.type || "application/octet-stream", kichThuoc: f.size, luc: new Date().toISOString(), nguoi: nguoiDung, ...(ghiChu.trim() ? { ghiChu: ghiChu.trim() } : {}) }, bytes: new Uint8Array(await f.arrayBuffer()) })));
      await kho.ghiLo({ dinhKem: lo });
      await ghiNhatKy("Đính kèm tệp vào hồ sơ", `${h.ma} · ${h.ten}${buoc ? ` — bước ${buoc}` : ""}: ${lo.map((x) => x.meta.ten).join(", ")}`);
      setGhiChu("");
      await tai();
      bao(`Đã đính kèm ${lo.length} tệp`);
    } catch (e) {
      bao(`Không đính kèm được: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };
  const xoa = async (x: DinhKem) => {
    if (!confirm(`Xóa tệp "${x.ten}"? Tệp chuyển vào mục "Tệp đã xóa", khôi phục được.`)) return;
    await xoaMemTep(kho, x, nguoiDung);
    await ghiNhatKy("Xóa tệp đính kèm", `${h.ma} · ${h.ten}: ${x.ten}`);
    await tai();
  };
  const moTep = async (x: DinhKem) => {
    const b = await kho.docDinhKem(x.id);
    if (!b) return bao("Không còn tệp này", "loi");
    await taiXuong(b, x.ten, x.loai);
  };
  const tenBuoc = (m: string) => (m ? `${m}. ${CAC_BUOC.find((b) => b.ma === m)?.ten ?? ""}` : "Chung");
  const hien = (ds ?? []).filter((x) => conDung(x) && (loc === "*" || x.buoc === loc));
  return (
    <div className="the">
      <div className="the-dau"><h2>Tệp đính kèm</h2><span className="mo chu-nho">Biên bản đã ký, QĐ bản quét, GCN, ảnh chụp điện thoại… — PDF, Word, Excel, ảnh (JPG, PNG, HEIC); tối đa 20 MB mỗi tệp; có trong bản sao lưu. Tài liệu chung của dự án: Hồ sơ dự án → thẻ “Tài liệu, văn bản”</span></div>
      {sua && (
        <div className="the-than" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Chon value={buoc} onChange={(e) => setBuoc(e.target.value)} aria-label="Bước của tệp đính kèm">
            <option value="">Chung của hồ sơ</option>
            {CAC_BUOC.map((b) => <option key={b.ma} value={b.ma}>Bước {b.ma}. {b.ten}</option>)}
          </Chon>
          <input style={{ flex: 1, minWidth: 200 }} placeholder="Ghi chú (vd. Biên bản kiểm đếm đã ký ngày …)" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
          <label className={`nut nut-chinh ${dang ? "tat" : ""}`}>
            {dang ? "Đang lưu…" : "Chọn tệp đính kèm…"}
            <input type="file" multiple accept={DUOI_DINH_KEM.join(",")} className="an" disabled={dang} onChange={(e) => { const f = e.target.files; if (f?.length) void them(f); e.target.value = ""; }} />
          </label>
        </div>
      )}
      <div className="the-than" style={{ paddingTop: 0 }}>
        <Chon value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Lọc theo bước">
          <option value="*">Mọi bước ({(ds ?? []).length})</option>
          <option value="">Chung</option>
          {CAC_BUOC.filter((b) => (ds ?? []).some((x) => x.buoc === b.ma)).map((b) => <option key={b.ma} value={b.ma}>Bước {b.ma} ({(ds ?? []).filter((x) => x.buoc === b.ma).length})</option>)}
        </Chon>
      </div>
      <table className="bang">
        <thead><tr><th>Tệp</th><th>Bước</th><th className="so">Dung lượng</th><th>Người đính kèm</th><th>Ghi chú</th><th /></tr></thead>
        <tbody>
          {hien.map((x) => (
            <tr key={x.id}>
              <td><button className="nut nut-chu nut-nho" title="Tải về, mở" onClick={() => void moTep(x)}>{x.ten}</button></td>
              <td className="chu-nho">{tenBuoc(x.buoc)}</td>
              <td className="so chu-nho">{kb(x.kichThuoc)}</td>
              <td className="chu-nho">{x.nguoi}<div className="mo">{new Date(x.luc).toLocaleString("vi-VN")}</div></td>
              <td className="chu-nho">{x.ghiChu ?? ""}</td>
              <td><span className="nhom-nut" style={{ gap: 4 }}><PhienBanTep x={x} ds={ds ?? []} sua={sua} moTa={`${h.ma} · ${h.ten}`} kiemTep={loiTepDinhKem} xong={tai} />{sua && <button className="nut nut-nho nut-nguy" onClick={() => void xoa(x)}>Xóa</button>}</span></td>
            </tr>
          ))}
          {ds !== null && !hien.length && <tr><td colSpan={6} className="trong">Chưa có tệp đính kèm.</td></tr>}
          {ds === null && <tr><td colSpan={6} className="trong">Đang tải…</td></tr>}
        </tbody>
      </table>
      <ThungRacTep ds={(ds ?? []).filter(trongThungRac)} tatCa={ds ?? []} nhan={(x) => (x.buoc ? `bước ${x.buoc}` : "chung")} xong={tai} />
    </div>
  );
}

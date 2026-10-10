import { conDung, trongThungRac, xoaMemTep } from "../dinh-kem-thung-rac";
import { PhienBanTep } from "./PhienBanTep";
import { ThungRacTep } from "./ThungRacTep";
import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { CAC_BUOC, taoId, type DuAn } from "../mo-hinh";
import { type DinhKem } from "../kho";
import { taiXuong } from "../tai-xuong";
import { tenTep } from "../ten-tep";
import { dongGoiZip } from "../van-ban/dien-mau";
import { Chon } from "./Chon";
import { HopThoai } from "./chung";
import { DUOI_DINH_KEM, kb, laAnhXemDuoc, loiTepDinhKem } from "./DinhKemHo";

/** Nhóm tài liệu chung của dự án (sắp xếp lưu trữ, tra cứu khi thanh tra, kiểm tra). */
export const NHOM_TAI_LIEU: { ma: string; ten: string }[] = [
  { ma: "DU_AN", ten: "Chủ trương, quyết định phê duyệt dự án, giao đất, cho thuê đất" },
  { ma: "KE_HOACH", ten: "Kế hoạch thu hồi đất, điều tra, khảo sát, đo đạc, kiểm đếm" },
  { ma: "THONG_BAO", ten: "Thông báo thu hồi đất" },
  { ma: "HOP_DAN", ten: "Biên bản họp, đối thoại, lấy ý kiến, niêm yết" },
  { ma: "GIA_DAT", ten: "Giá đất cụ thể, đơn giá bồi thường" },
  { ma: "PHUONG_AN", ten: "Phương án BT, HT, TĐC: tờ trình, thẩm định, quyết định phê duyệt" },
  { ma: "THU_HOI", ten: "Quyết định thu hồi đất, cưỡng chế" },
  { ma: "CHI_TRA", ten: "Kinh phí, chi trả, bàn giao mặt bằng" },
  { ma: "TDC", ten: "Tái định cư" },
  { ma: "BAN_DO", ten: "Bản đồ, trích đo, hồ sơ kỹ thuật" },
  { ma: "KHAC", ten: "Văn bản khác" },
];
export const tenNhom = (ma?: string) => NHOM_TAI_LIEU.find((n) => n.ma === ma)?.ten ?? "Văn bản khác";
const tenBuoc = (m: string) => (m ? `Bước ${m}. ${CAC_BUOC.find((b) => b.ma === m)?.ten ?? ""}` : "Chung của hồ sơ");

/** Đường dẫn trong tệp nén: Du-an/<nhóm>/tệp, Ho/<mã>_<tên>/tệp; trùng tên thì thêm (2), (3)… */
export function duongDanNen(ds: { meta: DinhKem; ho?: { ma: string; ten: string } }[]): string[] {
  const da = new Set<string>();
  return ds.map(({ meta, ho }) => {
    const thuMuc = meta.hoId ? `Ho/${tenTep(`${ho?.ma ?? "?"}_${ho?.ten ?? ""}`, 60)}` : `Du-an/${tenTep(tenNhom(meta.nhom), 60)}`;
    const cham = meta.ten.lastIndexOf(".");
    const goc = tenTep(cham > 0 ? meta.ten.slice(0, cham) : meta.ten, 80) || "tep";
    const duoi = cham > 0 ? meta.ten.slice(cham).toLowerCase() : "";
    let p = `${thuMuc}/${goc}${duoi}`;
    for (let i = 2; da.has(p.toLowerCase()); i++) p = `${thuMuc}/${goc} (${i})${duoi}`;
    da.add(p.toLowerCase());
    return p;
  });
}

/**
 * Tài liệu, văn bản của dự án: tải lên văn bản pháp lý chung (Word, PDF, Excel, ảnh chụp điện thoại), xem danh sách
 * tệp của cả dự án và của từng hộ, tìm theo tên/số hiệu, tải toàn bộ thành tệp nén để phục vụ thanh tra, kiểm tra.
 * Lưu trên máy / máy chủ nội bộ, có trong bản sao lưu; không gửi ra ngoài.
 */
export function TaiLieuDuAn({ duAn }: { duAn: DuAn }) {
  const { kho, quyen, nguoiDung, ghiNhatKy, bao, hoCua, di } = useUngDung();
  const [ds, setDs] = useState<DinhKem[] | null>(null);
  const [nhom, setNhom] = useState("DU_AN");
  const [soHieu, setSoHieu] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [dang, setDang] = useState(false);
  const [pham, setPham] = useState<"DU_AN" | "HO" | "TAT_CA">("DU_AN");
  const [locNhom, setLocNhom] = useState("*");
  const [tim, setTim] = useState("");
  const [xem, setXem] = useState<{ ten: string; url: string } | null>(null);
  const hos = hoCua(duAn.id, true);
  const hoTheoId = useMemo(() => new Map(hos.map((h) => [h.id, h])), [hos]);
  const tai = async () => setDs((await kho.dsDinhKem(duAn.id)).sort((a, b) => b.luc.localeCompare(a.luc)));
  useEffect(() => void tai().catch(() => setDs([])), [duAn.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (xem) URL.revokeObjectURL(xem.url); }, [xem]);
  const sua = quyen("SUA_HO_SO");

  const them = async (ts: FileList) => {
    const loi = [...ts].map((f) => loiTepDinhKem(f.name, f.size)).filter(Boolean);
    if (loi.length) return bao(`Không tải lên được: ${loi.join("; ")}`, "loi");
    setDang(true);
    try {
      const lo = await Promise.all(
        [...ts].map(async (f) => ({
          meta: { id: taoId(), hoId: "", duAnId: duAn.id, buoc: "", nhom, ten: f.name, loai: f.type || "application/octet-stream", kichThuoc: f.size, luc: new Date().toISOString(), nguoi: nguoiDung, ...(soHieu.trim() ? { soHieu: soHieu.trim() } : {}), ...(ghiChu.trim() ? { ghiChu: ghiChu.trim() } : {}) },
          bytes: new Uint8Array(await f.arrayBuffer()),
        })),
      );
      await kho.ghiLo({ dinhKem: lo });
      await ghiNhatKy("Tải lên tài liệu dự án", `${duAn.ten} — ${tenNhom(nhom)}: ${lo.map((x) => x.meta.ten).join(", ")}`);
      setSoHieu("");
      setGhiChu("");
      await tai();
      bao(`Đã lưu ${lo.length} tệp vào tài liệu dự án`);
    } catch (e) {
      bao(`Không tải lên được: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };
  const xoa = async (x: DinhKem) => {
    if (!confirm(`Xóa tệp "${x.ten}"? Tệp chuyển vào mục "Tệp đã xóa", khôi phục được.`)) return;
    await xoaMemTep(kho, x, nguoiDung);
    await ghiNhatKy("Xóa tài liệu", `${duAn.ten}${x.hoId ? ` — hồ sơ ${hoTheoId.get(x.hoId)?.ma ?? ""}` : ""}: ${x.ten}`);
    await tai();
  };
  const moTep = async (x: DinhKem) => {
    const b = await kho.docDinhKem(x.id);
    if (!b) return bao("Không còn tệp này", "loi");
    if (laAnhXemDuoc(x.ten)) return setXem({ ten: x.ten, url: URL.createObjectURL(new Blob([b.slice()], { type: x.loai || "image/jpeg" })) });
    await taiXuong(b, x.ten, x.loai);
  };

  const hien = (ds ?? []).filter(conDung).filter((x) => {
    if (pham === "DU_AN" && x.hoId) return false;
    if (pham === "HO" && !x.hoId) return false;
    if (locNhom !== "*" && (x.hoId || (x.nhom ?? "KHAC") !== locNhom)) return false;
    if (!tim.trim()) return true;
    const h = x.hoId ? hoTheoId.get(x.hoId) : undefined;
    return `${x.ten} ${x.soHieu ?? ""} ${x.ghiChu ?? ""} ${h?.ma ?? ""} ${h?.ten ?? ""}`.toLowerCase().includes(tim.trim().toLowerCase());
  });
  const tong = hien.reduce((s, x) => s + x.kichThuoc, 0);
  const taiTatCa = async () => {
    if (!hien.length) return;
    setDang(true);
    try {
      const muc = hien.map((meta) => ({ meta, ho: meta.hoId ? hoTheoId.get(meta.hoId) : undefined }));
      const duong = duongDanNen(muc);
      const tep: { ten: string; noiDung: Uint8Array }[] = [];
      for (const [i, m] of muc.entries()) {
        const b = await kho.docDinhKem(m.meta.id);
        if (b) tep.push({ ten: duong[i]!, noiDung: b });
      }
      // Bảng kê kèm theo để đối chiếu khi thanh tra
      const dong = [["STT", "Đường dẫn trong tệp nén", "Tên tệp gốc", "Thuộc", "Nhóm / bước", "Số, ký hiệu, ngày", "Ghi chú", "Người tải lên", "Thời điểm"]];
      muc.forEach((m, i) => dong.push([String(i + 1), duong[i]!, m.meta.ten, m.meta.hoId ? `Hồ sơ ${m.ho?.ma ?? ""} ${m.ho?.ten ?? ""}` : "Dự án", m.meta.hoId ? tenBuoc(m.meta.buoc) : tenNhom(m.meta.nhom), m.meta.soHieu ?? "", m.meta.ghiChu ?? "", m.meta.nguoi, new Date(m.meta.luc).toLocaleString("vi-VN")]));
      const csv = "﻿" + dong.map((d) => d.map((o) => `"${o.replace(/"/g, '""')}"`).join(",")).join("\r\n");
      tep.push({ ten: "Bang-ke-tai-lieu.csv", noiDung: new TextEncoder().encode(csv) });
      const ok = await taiXuong(dongGoiZip(tep), `Tai-lieu_${tenTep(duAn.ten, 60)}.zip`, "application/zip");
      if (ok) {
        bao(`Đã tải ${tep.length - 1} tệp kèm bảng kê`);
        await ghiNhatKy("Tải toàn bộ tài liệu dự án", `${duAn.ten}: ${tep.length - 1} tệp`);
      }
    } catch (e) {
      bao(`Không tạo được tệp nén: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };

  const soDuAn = (ds ?? []).filter((x) => !x.hoId).length;
  const soHo = (ds ?? []).length - soDuAn;
  return (
    <div className="the" aria-label="Tài liệu, văn bản của dự án">
      <div className="the-dau">
        <h2>Tài liệu, văn bản của dự án</h2>
        <span className="mo chu-nho">Văn bản pháp lý chung của dự án; tệp của từng hộ đính kèm ở hồ sơ hộ (thẻ Đính kèm). PDF, Word, Excel, ảnh chụp (JPG, PNG, HEIC) — tối đa 20 MB mỗi tệp; lưu trên máy/máy chủ nội bộ, có trong bản sao lưu</span>
      </div>
      {sua && (
        <div className="the-than luoi" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr) auto", gap: 8, alignItems: "center" }}>
          <Chon value={nhom} onChange={(e) => setNhom(e.target.value)} aria-label="Nhóm tài liệu">
            {NHOM_TAI_LIEU.map((n) => <option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </Chon>
          <input aria-label="Số, ký hiệu, ngày văn bản" placeholder="Số, ký hiệu, ngày (vd. 123/QĐ-UBND ngày 05/8/2025)" value={soHieu} onChange={(e) => setSoHieu(e.target.value)} />
          <input aria-label="Ghi chú tài liệu" placeholder="Trích yếu, ghi chú" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
          <label className={`nut nut-chinh ${dang ? "tat" : ""}`}>
            {dang ? "Đang lưu…" : "Tải tệp lên…"}
            <input type="file" multiple accept={DUOI_DINH_KEM.join(",")} aria-label="Tệp tài liệu dự án" className="an" disabled={dang} onChange={(e) => { const f = e.target.files; if (f?.length) void them(f); e.target.value = ""; }} />
          </label>
        </div>
      )}
      <div className="the-than nhom-nut" style={{ paddingTop: 0, alignItems: "center" }}>
        <Chon value={pham} onChange={(e) => setPham(e.target.value as typeof pham)} aria-label="Phạm vi tài liệu">
          <option value="DU_AN">Tài liệu chung của dự án ({soDuAn})</option>
          <option value="HO">Tệp của các hộ ({soHo})</option>
          <option value="TAT_CA">Tất cả ({(ds ?? []).length})</option>
        </Chon>
        {pham !== "HO" && (
          <Chon value={locNhom} onChange={(e) => setLocNhom(e.target.value)} aria-label="Lọc nhóm tài liệu">
            <option value="*">Mọi nhóm</option>
            {NHOM_TAI_LIEU.filter((n) => (ds ?? []).some((x) => !x.hoId && (x.nhom ?? "KHAC") === n.ma)).map((n) => <option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </Chon>
        )}
        <input aria-label="Tìm tài liệu" placeholder="Tìm tên tệp, số hiệu, mã/tên hộ…" value={tim} onChange={(e) => setTim(e.target.value)} style={{ minWidth: 220 }} />
        <span className="mo chu-nho">{hien.length} tệp · {kb(tong)}</span>
        <button className="nut nut-nho" disabled={dang || !hien.length} title="Tải các tệp đang hiện thành một tệp nén (thư mục theo nhóm, theo hộ) kèm bảng kê — phục vụ thanh tra, kiểm tra" onClick={() => void taiTatCa()}>Tải tất cả (.zip)</button>
      </div>
      <div className="bang-cuon">
        <table className="bang" aria-label="Danh sách tài liệu">
          <thead><tr><th>Tệp</th><th>Thuộc</th><th>Nhóm / bước</th><th>Số, ký hiệu, ngày</th><th className="so">Dung lượng</th><th>Người tải lên</th><th>Ghi chú</th><th /></tr></thead>
          <tbody>
            {hien.map((x) => {
              const h = x.hoId ? hoTheoId.get(x.hoId) : undefined;
              return (
                <tr key={x.id}>
                  <td><button className="nut nut-chu nut-nho" title={laAnhXemDuoc(x.ten) ? "Xem ảnh" : "Tải về, mở"} onClick={() => void moTep(x)}>{x.ten}</button></td>
                  <td className="chu-nho">{x.hoId ? (h ? <button className="nut-lien-ket" onClick={() => di({ ten: "ho", duAnId: duAn.id, hoId: h.id, tab: "dinh-kem" })}>{h.ma} · {h.ten}</button> : "Hồ sơ đã xóa") : "Dự án"}</td>
                  <td className="chu-nho">{x.hoId ? tenBuoc(x.buoc) : tenNhom(x.nhom)}</td>
                  <td className="chu-nho">{x.soHieu ?? ""}</td>
                  <td className="so chu-nho">{kb(x.kichThuoc)}</td>
                  <td className="chu-nho">{x.nguoi}<div className="mo">{new Date(x.luc).toLocaleString("vi-VN")}</div></td>
                  <td className="chu-nho">{x.ghiChu ?? ""}</td>
                  <td><span className="nhom-nut" style={{ gap: 4 }}><PhienBanTep x={x} ds={ds ?? []} sua={sua} moTa={`${duAn.ten}${h ? ` · ${h.ma}` : ""}`} kiemTep={loiTepDinhKem} xong={tai} />{sua && <button className="nut nut-nho nut-nguy" aria-label={`Xóa tệp ${x.ten}`} onClick={() => void xoa(x)}>Xóa</button>}</span></td>
                </tr>
              );
            })}
            {ds !== null && !hien.length && <tr><td colSpan={8} className="trong">Chưa có tài liệu.</td></tr>}
            {ds === null && <tr><td colSpan={8} className="trong">Đang tải…</td></tr>}
          </tbody>
        </table>
        <ThungRacTep ds={(ds ?? []).filter(trongThungRac)} nhan={(x) => (x.hoId ? `hồ sơ ${hoTheoId.get(x.hoId)?.ma ?? ""}` : "tài liệu dự án")} xong={tai} />
      </div>
      {xem && (
        <HopThoai tieuDe={xem.ten} rong={1000} dong={() => setXem(null)} chan={<button className="nut" onClick={() => setXem(null)}>Đóng</button>}>
          <img src={xem.url} alt={xem.ten} style={{ maxWidth: "100%", maxHeight: "70vh", display: "block", margin: "0 auto" }} />
        </HopThoai>
      )}
    </div>
  );
}

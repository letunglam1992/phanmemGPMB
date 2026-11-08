/**
 * Biểu mẫu Excel của đơn vị (QD-32): tải mẫu mặc định về sửa, thay mẫu (điền thử bằng số liệu dự án trước khi lưu), khôi
 * phục mẫu của phần mềm. Khi có mẫu của đơn vị, mọi nút "Xuất Excel" phương án dùng mẫu đó (giữ định dạng của mẫu).
 * 1.3.5 (QD-48): mẫu riêng theo xã, phường; nhập tệp phương án sẵn có của xã → tự nhận diện bố cục (mau-excel-nhan-dien.ts).
 */
import { useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";
import { MA_MAU_EXCEL, dienMauExcel } from "../mau-excel";
import { TRUONG_MAU_EXCEL, duLieuMauExcel, taoMauExcelMacDinh, taoWorkbook } from "../xuat-excel";
import { nhanDienMauCoSan } from "../mau-excel-nhan-dien";
import { CSS_XEM_TRUOC_EXCEL, workbookSangHtml, type TrangXemTruoc } from "../xem-truoc-excel";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** 1.3.5: khóa mẫu riêng của một xã, phường. */
export const maMauExcelXa = (xa: string) => `${MA_MAU_EXCEL}@${xa.trim()}`;

/** Đọc mẫu Excel: mẫu riêng của xã, phường (1.3.5) → mẫu chung của đơn vị → null (bố cục của phần mềm). */
export function useMauExcel(): (xa?: string) => Promise<Uint8Array | null> {
  const { kho } = useUngDung();
  return async (xa?: string) => (xa?.trim() ? (await kho.docMau(maMauExcelXa(xa)))?.bytes : undefined) ?? (await kho.docMau(MA_MAU_EXCEL))?.bytes ?? null;
}

export function HopMauExcel({ duAn, ds, dong }: { duAn: DuAn; ds: { h: Ho; k: KetQuaHo }[]; dong: () => void }) {
  const { kho, quyen, bao, ghiNhatKy } = useUngDung();
  const xaDuAn = duAn.xa?.trim() ?? "";
  /** "" = mẫu chung của đơn vị; tên xã = mẫu riêng của xã đó */
  const [pham, setPham] = useState<string>(xaDuAn);
  const [dsMau, setDsMau] = useState<{ xa: string; tenTep: string; luc: string }[] | undefined>(undefined);
  const [canhBao, setCanhBao] = useState<string[]>([]);
  const [moTa, setMoTa] = useState<string[]>([]);
  const [xem, setXem] = useState<{ ds: TrangXemTruoc[]; chon: number } | null>(null);
  const docMauDung = useMauExcel();
  const maCua = (xa: string) => (xa ? maMauExcelXa(xa) : MA_MAU_EXCEL);
  const tenPham = (xa: string) => (xa ? `mẫu riêng của ${xa}` : "mẫu chung của đơn vị");
  /** 1.2.0 (C3): điền mẫu đang dùng cho dự án này (mẫu của xã → mẫu chung → bố cục của phần mềm) rồi xem trong phần mềm */
  const xemTruoc = async () => {
    try {
      const m = await docMauDung(xaDuAn);
      const wb = m ? (await dienMauExcel(m, duLieuMauExcel(duAn, ds))).wb : await taoWorkbook(duAn, ds);
      setXem({ ds: workbookSangHtml(wb), chon: 0 });
    } catch (e) {
      bao(`Không xem trước được — ${(e as Error).message}`, "loi");
    }
  };
  const tai = async () => {
    const ma = (await kho.dsMauTuy()).filter((m) => m === MA_MAU_EXCEL || m.startsWith(`${MA_MAU_EXCEL}@`));
    const kq = await Promise.all(ma.map(async (m) => {
      const t = await kho.docMau(m);
      return { xa: m === MA_MAU_EXCEL ? "" : m.slice(MA_MAU_EXCEL.length + 1), tenTep: t?.tenTep ?? "", luc: t?.luc ?? "" };
    }));
    setDsMau(kq.sort((x, y) => (x.xa === "" ? -1 : y.xa === "" ? 1 : x.xa.localeCompare(y.xa, "vi"))));
  };
  useEffect(() => void tai(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sua = quyen("THAY_MAU");
  const coMau = (xa: string) => dsMau?.find((m) => m.xa === xa);
  const dangDung = xaDuAn && coMau(xaDuAn) ? coMau(xaDuAn) : coMau("");
  const dsPham = [...new Set(["", ...(xaDuAn ? [xaDuAn] : []), ...(dsMau ?? []).map((m) => m.xa)])];

  /** Nhập mẫu: tệp chưa có trường {{…}} (phương án sẵn có của xã) → tự nhận diện bảng rồi đánh dấu trường; điền thử trước khi lưu. */
  const thayMau = async (f: File) => {
    let bytes: Uint8Array = new Uint8Array(await f.arrayBuffer());
    let thieu: string[];
    let mt: string[] = [];
    try {
      const nd = await nhanDienMauCoSan(bytes);
      if (!nd.daCoTruong) mt = nd.moTa;
      bytes = nd.bytes;
      // điền thử bằng số liệu của dự án đang mở (ít nhất 1 hộ mẫu rỗng nếu dự án chưa có hộ)
      thieu = (await dienMauExcel(bytes, duLieuMauExcel(duAn, ds.slice(0, 3)))).thieu;
    } catch (e) {
      bao(`Mẫu không dùng được — ${(e as Error).message}`, "loi");
      return;
    }
    const tenTep = mt.length ? f.name.replace(/\.xlsx$/i, "") + " (nhận diện).xlsx" : f.name;
    await kho.luuMau(maCua(pham), bytes, tenTep);
    await ghiNhatKy(`Thay biểu mẫu Excel phương án — ${tenPham(pham)}`, f.name);
    setCanhBao(thieu);
    setMoTa(mt);
    await tai();
    bao(`Đã lưu ${tenPham(pham)}${mt.length ? " (tự nhận diện bố cục)" : ""}${thieu.length ? `; ${thieu.length} trường không có dữ liệu (để trống khi xuất)` : ""}`);
  };
  const xoa = async (xa: string) => {
    if (!confirm(xa ? `Bỏ mẫu riêng của ${xa}? Dự án ở xã này sẽ dùng mẫu chung của đơn vị (nếu có) hoặc bố cục của phần mềm.` : "Bỏ mẫu chung của đơn vị, dùng lại bố cục của phần mềm?")) return;
    await kho.xoaMau(maCua(xa));
    await ghiNhatKy(xa ? `Bỏ mẫu Excel riêng của ${xa}` : "Khôi phục bố cục Excel của phần mềm");
    setCanhBao([]);
    setMoTa([]);
    await tai();
  };
  const taiVe = async (xa: string) => {
    const m = await kho.docMau(maCua(xa));
    if (m) await taiXuong(m.bytes, m.tenTep || "Mau-Excel-phuong-an.xlsx", XLSX);
  };

  return (
    <HopThoai tieuDe="Biểu mẫu Excel phương án" dong={dong} rong={980}>
      <div className="chu-nho" data-mau-excel>
        Dự án này{xaDuAn ? ` (${xaDuAn})` : ""} đang dùng:{" "}
        {dsMau === undefined ? "…" : dangDung ? (
          <b>{tenPham(dangDung.xa)} — {dangDung.tenTep}{dangDung.luc ? ` (cập nhật ${new Date(dangDung.luc).toLocaleDateString("vi-VN")})` : ""}</b>
        ) : (
          <b>bố cục của phần mềm</b>
        )}
      </div>
      <div className="nhom-nut mt-8">
        <button className="nut nut-nho" data-xem-truoc-excel onClick={() => void xemTruoc()}>Xem trước (số liệu dự án)</button>
        <button className="nut nut-nho" onClick={async () => taiXuong(await taoMauExcelMacDinh(), "Mau-Excel-phuong-an_mac-dinh.xlsx", XLSX)}>Tải mẫu mặc định (có trường)</button>
      </div>
      <fieldset className="mt-8" data-mau-theo-xa>
        <legend>Mẫu theo xã, phường</legend>
        <div className="chu-nho mo">
          Mỗi xã, phường có thể có mẫu phương án riêng: chọn xã rồi nhập tệp Excel phương án sẵn có của xã (không cần sửa) — phần mềm tự nhận
          bảng chi tiết của hộ (dòng tiêu đề có “Đơn giá”, “Thành tiền”) và bảng tổng hợp (cột “Họ và tên”, cột số tiền), giữ nguyên tiêu đề,
          phông chữ, khung, chữ ký của xã. Khi xuất, dự án ở xã nào dùng mẫu của xã đó; xã chưa có mẫu riêng dùng mẫu chung của đơn vị.
        </div>
        <div className="nhom-nut mt-6" style={{ alignItems: "center", flexWrap: "wrap" }}>
          <label className="chu-nho">Áp dụng cho{" "}
            <select aria-label="Phạm vi mẫu Excel" data-pham-vi-mau value={pham} onChange={(e) => setPham(e.target.value)}>
              {dsPham.map((x) => <option key={x || "_chung"} value={x}>{x ? `${x}${x === xaDuAn ? " (xã của dự án)" : ""}` : "Mẫu chung của đơn vị (xã chưa có mẫu riêng)"}</option>)}
            </select>
          </label>
          {sua && <label className="nut nut-nho nut-chinh">Nhập mẫu{pham ? ` của ${pham}` : " chung"}…<input type="file" accept=".xlsx" className="an" aria-label="Chọn tệp mẫu Excel" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void thayMau(f); }} /></label>}
        </div>
        {dsMau && dsMau.length > 0 && (
          <table className="bang mt-6" data-ds-mau-excel>
            <thead><tr><th>Phạm vi</th><th>Tệp mẫu</th><th>Cập nhật</th><th /></tr></thead>
            <tbody>
              {dsMau.map((m) => (
                <tr key={m.xa || "_chung"} data-mau-xa={m.xa}>
                  <td className="chu-nho">{m.xa || "Mẫu chung của đơn vị"}</td>
                  <td className="chu-nho">{m.tenTep}</td>
                  <td className="chu-nho">{m.luc ? new Date(m.luc).toLocaleDateString("vi-VN") : ""}</td>
                  <td className="nhom-nut">
                    <button className="nut nut-nho" onClick={() => void taiVe(m.xa)}>Tải về</button>
                    {sua && <button className="nut nut-nho" onClick={() => void xoa(m.xa)}>Bỏ mẫu</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {moTa.length > 0 && (
          <div className="chu-nho mt-6" data-mo-ta-nhan-dien>
            <b>Đã nhận diện bố cục của tệp — đối chiếu bằng nút Xem trước:</b>
            <ul style={{ margin: "4px 0 0 18px" }}>{moTa.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>
        )}
      </fieldset>
      {xem && (
        <HopThoai tieuDe="Xem trước biểu Excel" dong={() => setXem(null)} rong={1200}>
          <style>{CSS_XEM_TRUOC_EXCEL}</style>
          <div className="nhom-nut" style={{ flexWrap: "wrap", marginBottom: 6 }}>
            {xem.ds.map((t, i) => <button key={t.ten + i} className={`nut nut-nho ${i === xem.chon ? "nut-chinh" : ""}`} onClick={() => setXem({ ...xem, chon: i })}>{t.ten}</button>)}
          </div>
          <div className="chu-nho mo" style={{ marginBottom: 4 }}>Chỉ để soát số liệu; độ rộng cột, khung, trang in xem trong Excel.{xem.ds[xem.chon]!.soDong > 300 ? ` Trang có ${xem.ds[xem.chon]!.soDong} dòng — hiện 300 dòng đầu.` : ""}</div>
          <div style={{ overflow: "auto", maxHeight: "70vh", background: "#fff", padding: 8 }} data-noi-dung-xem-truoc-excel dangerouslySetInnerHTML={{ __html: xem.ds[xem.chon]!.html }} />
        </HopThoai>
      )}
      {canhBao.length > 0 && <div className="chu-do chu-nho mt-6">Trường có trong mẫu nhưng phần mềm không có dữ liệu: {canhBao.map((t) => `{{${t}}}`).join(", ")}</div>}
      <div className="mo chu-nho mt-8">
        Sửa mẫu trong Excel: đổi tiêu đề, phông chữ, độ rộng cột, ô gộp, khung, chữ ký, thiết lập trang in… và giữ các trường {"{{…}}"}. Dòng có ô đầu bắt đầu bằng {"{{#bang}}"} được nhân theo từng dòng dữ liệu (giữ định dạng dòng); trang có tên chứa {"{{…}}"} được nhân thành một trang cho mỗi hộ. Công thức phía dưới dòng lặp tự dời; vùng SUM kết thúc tại dòng lặp tự mở rộng. Mẫu tải lên được điền thử bằng số liệu dự án đang mở trước khi lưu.
      </div>
      <table className="bang mt-8">
        <thead><tr><th>Trường</th><th>Ý nghĩa</th></tr></thead>
        <tbody>{TRUONG_MAU_EXCEL.map(([t, m]) => <tr key={t}><td className="chu-nho" style={{ fontFamily: "monospace", wordBreak: "break-word", maxWidth: 420 }}>{t}</td><td className="chu-nho">{m}</td></tr>)}</tbody>
      </table>
    </HopThoai>
  );
}

/**
 * Biểu mẫu Excel của đơn vị (QD-32): tải mẫu mặc định về sửa, thay mẫu (điền thử bằng số liệu dự án trước khi lưu), khôi
 * phục mẫu của phần mềm. Khi có mẫu của đơn vị, mọi nút "Xuất Excel" phương án dùng mẫu đó (giữ định dạng của mẫu).
 */
import { useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";
import { MA_MAU_EXCEL, dienMauExcel } from "../mau-excel";
import { TRUONG_MAU_EXCEL, duLieuMauExcel, taoMauExcelMacDinh } from "../xuat-excel";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Đọc mẫu Excel của đơn vị (null = dùng bố cục của phần mềm). */
export function useMauExcel(): () => Promise<Uint8Array | null> {
  const { kho } = useUngDung();
  return async () => (await kho.docMau(MA_MAU_EXCEL))?.bytes ?? null;
}

export function HopMauExcel({ duAn, ds, dong }: { duAn: DuAn; ds: { h: Ho; k: KetQuaHo }[]; dong: () => void }) {
  const { kho, quyen, bao, ghiNhatKy } = useUngDung();
  const [mau, setMau] = useState<{ tenTep: string; luc: string } | null | undefined>(undefined);
  const [canhBao, setCanhBao] = useState<string[]>([]);
  const tai = async () => {
    const m = await kho.docMau(MA_MAU_EXCEL);
    setMau(m ? { tenTep: m.tenTep, luc: m.luc } : null);
  };
  useEffect(() => void tai(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sua = quyen("THAY_MAU");

  const thayMau = async (f: File) => {
    const bytes = new Uint8Array(await f.arrayBuffer());
    let thieu: string[];
    try {
      // điền thử bằng số liệu của dự án đang mở (ít nhất 1 hộ mẫu rỗng nếu dự án chưa có hộ)
      thieu = (await dienMauExcel(bytes, duLieuMauExcel(duAn, ds.slice(0, 3)))).thieu;
    } catch (e) {
      bao(`Mẫu không dùng được — ${(e as Error).message}`, "loi");
      return;
    }
    await kho.luuMau(MA_MAU_EXCEL, bytes, f.name);
    await ghiNhatKy("Thay biểu mẫu Excel phương án", f.name);
    setCanhBao(thieu);
    await tai();
    bao(thieu.length ? `Đã lưu mẫu; ${thieu.length} trường không có dữ liệu (để trống khi xuất)` : "Đã lưu biểu mẫu Excel của đơn vị");
  };

  return (
    <HopThoai tieuDe="Biểu mẫu Excel phương án" dong={dong} rong={980}>
      <div className="chu-nho" data-mau-excel>
        Đang dùng:{" "}
        {mau === undefined ? "…" : mau ? (
          <b>mẫu của đơn vị — {mau.tenTep}{mau.luc ? ` (cập nhật ${new Date(mau.luc).toLocaleDateString("vi-VN")})` : ""}</b>
        ) : (
          <b>bố cục của phần mềm</b>
        )}
      </div>
      <div className="nhom-nut mt-8">
        <button className="nut nut-nho" onClick={async () => taiXuong(await taoMauExcelMacDinh(), "Mau-Excel-phuong-an_mac-dinh.xlsx", XLSX)}>Tải mẫu mặc định (có trường)</button>
        {mau && <button className="nut nut-nho" onClick={async () => { const m = await kho.docMau(MA_MAU_EXCEL); if (m) await taiXuong(m.bytes, m.tenTep || "Mau-Excel-phuong-an.xlsx", XLSX); }}>Tải mẫu đang dùng</button>}
        {sua && <label className="nut nut-nho">Thay mẫu…<input type="file" accept=".xlsx" className="an" aria-label="Chọn tệp mẫu Excel" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void thayMau(f); }} /></label>}
        {sua && mau && <button className="nut nut-nho" onClick={async () => { if (!confirm("Bỏ mẫu của đơn vị, dùng lại bố cục của phần mềm?")) return; await kho.xoaMau(MA_MAU_EXCEL); await ghiNhatKy("Khôi phục bố cục Excel của phần mềm"); setCanhBao([]); await tai(); }}>Khôi phục bố cục của phần mềm</button>}
      </div>
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

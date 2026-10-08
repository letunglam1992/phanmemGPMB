import { useMemo, useState } from "react";
import { dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { BO_CHINH_SACH } from "../du-lieu";
import { GOI_MOI_NHAT, tenBoChinhSach } from "../goi-chinh-sach";
import { raSoatQd64, type DongTacDong } from "../qd64";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";

const can = (x: DongTacDong) => x.dungBoCu || x.soThuaThieuThon > 0;

/** Thẻ ở Tổng quan: nhắc áp dụng QĐ 64/2026 khi còn dự án dùng bộ cũ hoặc thửa chưa ghi tổ, thôn (1.0.5). */
export function TheQd64() {
  const { dsDuAn, hoCua, chiXem } = useUngDung();
  const [mo, setMo] = useState(false);
  const ds = useMemo(() => raSoatQd64(dsDuAn, hoCua, BO_CHINH_SACH, GOI_MOI_NHAT), [dsDuAn, hoCua]);
  const boCu = ds.filter((x) => x.dungBoCu).length;
  const thieu = ds.reduce((s, x) => s + x.soThuaThieuThon, 0);
  if (chiXem || !ds.some(can)) return null;
  return (
    <section className="the thong-bao-vang" aria-label="Áp dụng QĐ 64/2026" style={{ marginBottom: 14, padding: "10px 16px", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <b>Áp dụng QĐ 64/2026/QĐ-UBND (hiệu lực 06/10/2026):</b>{" "}
        {[boCu ? `${boCu} dự án còn dùng bộ chính sách cũ` : "", thieu ? `${thieu} thửa chưa ghi tổ, thôn (hỗ trợ chuyển đổi nghề đang “Cần xác nhận”)` : ""].filter(Boolean).join("; ")}.
      </div>
      <button className="nut nut-nho nut-chinh" onClick={() => setMo(true)}>Rà soát…</button>
      {mo && <HopRaSoatQd64 ds={ds} dong={() => setMo(false)} />}
    </section>
  );
}

export function HopRaSoatQd64({ ds, dong }: { ds: DongTacDong[]; dong: () => void }) {
  const { di, bao } = useUngDung();
  const [tatCa, setTatCa] = useState(false);
  const hien = tatCa ? ds : ds.filter(can);
  const xuat = async () => {
    const { default: Excel } = await import("exceljs");
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet("Ra soat QD 64");
    ws.columns = [{ width: 5 }, { width: 36 }, { width: 18 }, { width: 22 }, { width: 22 }, { width: 8 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 50 }];
    ws.addRow(["RÀ SOÁT ÁP DỤNG QĐ 64/2026/QĐ-UBND (hiệu lực 06/10/2026)"]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const h = ws.addRow(["STT", "Dự án", "Xã, phường", "Bộ chính sách đang dùng", "PA đã phê duyệt (số QĐ)", "Số hộ", "Thửa chưa ghi tổ, thôn", "Tạm tính bộ cũ (đ)", "Tạm tính bộ mới (đ)", "Khoản mới cần xác nhận", "Đề xuất"]);
    h.font = { bold: true };
    hien.forEach((x, i) => ws.addRow([i + 1, x.duAn.ten, x.duAn.xa, x.boDangDung, x.paDaDuyet.map((p) => `${p.so} (${p.ngay})`).join("; "), x.soHo, x.soThuaThieuThon, x.tongCu ? Number(x.tongCu.toFixed(0)) : null, x.tongMoi ? Number(x.tongMoi.toFixed(0)) : null, x.soKhoanCanXacNhanMoi ?? null, x.deXuat]));
    ws.addRow([]);
    ws.addRow(["Tạm tính chỉ cộng khoản “Tạm tính”; khoản “Cần xác nhận” (vd. chuyển đổi nghề khi thửa chưa ghi tổ, thôn) chưa cộng — chênh lệch thực tế xác định sau khi ghi đủ tổ, thôn."]).font = { italic: true };
    if (await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), `Ra-soat-QD64-2026_${new Date().toISOString().slice(0, 10)}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) bao("Đã xuất Excel rà soát QĐ 64/2026");
  };
  return (
    <HopThoai tieuDe="Rà soát áp dụng QĐ 64/2026/QĐ-UBND" rong={1100} dong={dong}
      chan={<><label className="chu-nho" style={{ marginRight: "auto" }}><input type="checkbox" checked={tatCa} onChange={(e) => setTatCa(e.target.checked)} /> Hiện cả dự án không cần xử lý</label><button className="nut" onClick={() => void xuat()}>Xuất Excel</button><button className="nut" onClick={dong}>Đóng</button></>}>
      <p className="mo chu-nho" style={{ marginTop: 0 }}>
        Khoản 2 Điều 3 QĐ 64/2026: phương án đã được phê duyệt trước 06/10/2026 tiếp tục thực hiện; chưa phê duyệt thì áp dụng QĐ 64/2026. Bảng chỉ để rà soát — chuyển bộ chính sách ở Thông tin dự án (xem chênh lệch từng hộ trước khi áp dụng). Tạm tính chỉ cộng khoản “Tạm tính”.
      </p>
      <div className="bang-cuon" style={{ maxHeight: 460 }}>
        <table className="bang" aria-label="Bảng rà soát QĐ 64">
          <thead><tr><th>Dự án</th><th>Bộ chính sách</th><th>PA đã duyệt</th><th className="so">Hộ</th><th className="so">Thửa chưa ghi tổ, thôn</th><th className="so">Tạm tính bộ cũ → mới (đ)</th><th>Đề xuất</th><th /></tr></thead>
          <tbody>
            {hien.map((x) => (
              <tr key={x.duAn.id}>
                <td><b>{x.duAn.ten}</b><div className="mo chu-nho">{x.duAn.xa}</div></td>
                <td className="chu-nho">{tenBoChinhSach(x.boDangDung)}{x.dungBoCu && <div><span className="nhan nhan-vang">bộ cũ</span></div>}</td>
                <td className="chu-nho">{x.paDaDuyet.length ? x.paDaDuyet.map((p) => `${p.so || "?"} (${p.ngay || "?"})`).join("; ") : "Chưa"}</td>
                <td className="so">{x.soHo}</td>
                <td className="so">{x.soThuaThieuThon ? <b className="chu-do">{x.soThuaThieuThon}</b> : 0}{x.soHoThieuThon > 0 && <div className="mo chu-nho">{x.soHoThieuThon} hộ</div>}</td>
                <td className="so chu-nho">{x.tongCu ? <>{dinhDang(x.tongCu, 0)} → {dinhDang(x.tongMoi!, 0)}{x.soKhoanCanXacNhanMoi ? <div className="chu-do">+{x.soKhoanCanXacNhanMoi} khoản cần xác nhận</div> : null}</> : "—"}</td>
                <td className="chu-nho">{x.deXuat}</td>
                <td>{can(x) && <button className="nut nut-nho" onClick={() => { dong(); di({ ten: "du-an", duAnId: x.duAn.id, tab: x.dungBoCu ? "thong-tin" : "ho" }); }}>Mở</button>}</td>
              </tr>
            ))}
            {!hien.length && <tr><td colSpan={8} className="trong">Không có dự án cần xử lý.</td></tr>}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

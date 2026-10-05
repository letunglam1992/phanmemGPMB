import { useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DinhKem } from "../kho";
import { khoiPhucTep, xoaHanTep } from "../dinh-kem-thung-rac";
import { ngayVN } from "./chung";

/** Danh sách tệp đã xóa (thùng rác tệp): khôi phục (quyền sửa), xóa hẳn (quyền Quản trị). */
export function ThungRacTep({ ds, nhan, xong }: { ds: DinhKem[]; nhan: (x: DinhKem) => string; xong: () => Promise<void> }) {
  const { kho, quyen, ghiNhatKy, bao } = useUngDung();
  const [mo, setMo] = useState(false);
  if (!ds.length) return null;
  return (
    <div className="mt-6" aria-label="Tệp đã xóa">
      <button className="nut nut-chu nut-nho" aria-expanded={mo} onClick={() => setMo(!mo)}>{mo ? "▾" : "▸"} Tệp đã xóa ({ds.length}) — khôi phục được</button>
      {mo && (
        <table className="bang chu-nho mt-4">
          <tbody>
            {ds.map((x) => (
              <tr key={x.id}>
                <td>{x.ten}</td>
                <td className="mo">{nhan(x)}</td>
                <td className="mo">Xóa {ngayVN(x.daXoa!.luc.slice(0, 10))} · {x.daXoa!.nguoi}</td>
                <td className="nhom-nut">
                  {quyen("SUA_HO_SO") && <button className="nut nut-nho" onClick={async () => { try { await khoiPhucTep(kho, x); await ghiNhatKy("Khôi phục tệp đính kèm", x.ten); await xong(); bao(`Đã khôi phục "${x.ten}"`); } catch (e) { bao((e as Error).message, "loi"); } }}>Khôi phục</button>}
                  {quyen("XOA_HAN") && <button className="nut nut-nho nut-nguy" onClick={async () => { if (!confirm(`Xóa hẳn tệp "${x.ten}"? Sau khi xóa hẳn chỉ lấy lại được từ bản sao lưu cũ.`)) return; await xoaHanTep(kho, x); await ghiNhatKy("Xóa hẳn tệp đính kèm", x.ten); await xong(); }}>Xóa hẳn</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

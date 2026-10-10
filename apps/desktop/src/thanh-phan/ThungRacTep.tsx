import { useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DinhKem } from "../kho";
import { khoiPhucTep, xoaHanTep } from "../dinh-kem-thung-rac";
import { banTruoc, xoaHanCoPhienBan } from "../dinh-kem-phien-ban";
import { ngayVN } from "./chung";

/** Danh sách tệp đã xóa (thùng rác tệp): khôi phục (quyền sửa), xóa hẳn (quyền Quản trị). */
export function ThungRacTep({ ds, tatCa = ds, nhan, xong }: { ds: DinhKem[]; tatCa?: DinhKem[]; nhan: (x: DinhKem) => string; xong: () => Promise<void> }) {
  const { kho, quyen, ghiNhatKy, bao } = useUngDung();
  const [mo, setMo] = useState(false);
  if (!ds.length) return null;
  // 1.0.7: tệp còn bản trước (lịch sử phiên bản) → hỏi đưa bản gần nhất lên hay xóa cả nhóm
  const xoaHan = async (x: DinhKem) => {
    const truoc = banTruoc(tatCa, x);
    if (!truoc.length) {
      if (!confirm(`Xóa hẳn tệp "${x.ten}"? Sau khi xóa hẳn chỉ lấy lại được từ bản sao lưu cũ.`)) return;
      await xoaHanTep(kho, x);
      await ghiNhatKy("Xóa hẳn tệp đính kèm", x.ten);
      return xong();
    }
    let cach: "DUA_LEN" | "CA_NHOM";
    if (confirm(`Tệp "${x.ten}" còn ${truoc.length} bản trước.\n\nOK: xóa hẳn tệp này, đưa bản gần nhất ("${truoc[0]!.ten}", ${ngayVN(truoc[0]!.luc.slice(0, 10))}) lên làm bản đang dùng.\nHủy: chọn cách khác.`)) cach = "DUA_LEN";
    else if (confirm(`Xóa hẳn "${x.ten}" CÙNG ${truoc.length} bản trước? Sau khi xóa hẳn chỉ lấy lại được từ bản sao lưu cũ.`)) cach = "CA_NHOM";
    else return;
    try {
      const len = await xoaHanCoPhienBan(kho, tatCa, x, cach);
      await ghiNhatKy("Xóa hẳn tệp đính kèm", cach === "CA_NHOM" ? `${x.ten} và ${truoc.length} bản trước` : `${x.ten}; dùng lại bản trước "${len?.ten ?? ""}"`);
      await xong();
    } catch (e) {
      bao((e as Error).message, "loi");
    }
  };
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
                  {quyen("XOA_HAN") && <button className="nut nut-nho nut-nguy" onClick={() => void xoaHan(x)}>Xóa hẳn</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

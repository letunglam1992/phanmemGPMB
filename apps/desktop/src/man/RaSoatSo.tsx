import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { apDungCachHieu, raSoat, type MucRaSoat } from "../ra-soat-so";
import { hienSo } from "../so";

const TEN_LOAI: Record<MucRaSoat["loai"], [string, string]> = {
  MO_HO: ["Cần chọn cách hiểu", "nhan-do"],
  KHONG_DOC_DUOC: ["Không đọc được", "nhan-do"],
  HOP_LY: ["Kiểm tra lại", "nhan-vang"],
};

/**
 * Rà soát số liệu (P0-2): giá trị mơ hồ từ dữ liệu cũ ("20.000" đang được tính là 20), giá trị không đọc được,
 * giá trị bất thường (ngưỡng kỹ thuật, không phải quy định). Cán bộ chọn cách hiểu — phần mềm ghi nhật ký hồ sơ.
 */
export function RaSoatSo() {
  const { dsDuAn, hoCua, luuHo, luuDuAn, di, quyen, nguoiDung, bao } = useUngDung();
  const ds = useMemo(() => raSoat(dsDuAn, (id) => hoCua(id)), [dsDuAn, hoCua]);
  const [loc, setLoc] = useState<MucRaSoat["loai"] | "">("");
  const chon = async (m: MucRaSoat, giaTri: string) => {
    if (m.hoId) {
      const h = hoCua(m.duAnId).find((x) => x.id === m.hoId);
      if (!h) return;
      const ban = structuredClone(h);
      if (!apDungCachHieu(ban, m, giaTri)) return bao("Giá trị đã thay đổi — tải lại danh sách", "loi");
      ban.nhatKy = [...ban.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Xác nhận cách hiểu số: ${m.nhan}: "${m.gt}" → ${giaTri} (${hienSo(giaTri)})` }];
      await luuHo(ban);
    } else {
      const d = dsDuAn.find((x) => x.id === m.duAnId);
      if (!d) return;
      const ban = structuredClone(d);
      if (!apDungCachHieu(ban, m, giaTri)) return bao("Giá trị đã thay đổi — tải lại danh sách", "loi");
      await luuDuAn(ban);
    }
    bao(`Đã ghi ${m.nhan} = ${hienSo(giaTri)}`);
  };
  const hien = ds.filter((m) => !loc || m.loai === loc);
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Rà soát số liệu</h1>
          <div className="mo-ta">
            Từ phiên bản 0.4, số nhập theo quy ước Việt Nam: dấu chấm phân cách nghìn, dấu phẩy thập phân. Số cũ ghi dạng “20.000” trước đây được tính là <b>20</b>; theo quy ước mới là <b>20.000</b> — cán bộ chọn cách hiểu đúng cho từng mục. Mục “Kiểm tra lại” dùng ngưỡng kỹ thuật để soát nhập liệu, không phải quy định.
          </div>
        </div>
        <div className="phai">
          <select value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)}>
            <option value="">Tất cả ({ds.length})</option>
            {(Object.keys(TEN_LOAI) as MucRaSoat["loai"][]).map((l) => <option key={l} value={l}>{TEN_LOAI[l][0]} ({ds.filter((m) => m.loai === l).length})</option>)}
          </select>
        </div>
      </div>
      <div className="the">
        <table className="bang">
          <thead><tr><th>Loại</th><th>Dự án / hồ sơ</th><th>Trường</th><th className="so">Giá trị đang lưu</th><th>Nội dung</th><th /></tr></thead>
          <tbody>
            {hien.map((m, i) => (
              <tr key={i}>
                <td><span className={`nhan ${TEN_LOAI[m.loai][1]}`}>{TEN_LOAI[m.loai][0]}</span></td>
                <td className="chu-nho">{m.doiTuong}</td>
                <td className="chu-nho">{m.nhan}</td>
                <td className="so"><code>{m.gt}</code></td>
                <td className="chu-nho">{m.noiDung}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {m.chon && quyen("SUA_HO_SO") && (
                    <>
                      <button className="nut nut-nho nut-chinh" onClick={() => void chon(m, m.chon!.moi)}>= {hienSo(m.chon.moi)}</button>{" "}
                      <button className="nut nut-nho" title="Giữ cách tính hiện tại" onClick={() => void chon(m, m.chon!.cu)}>= {hienSo(m.chon.cu)}</button>{" "}
                    </>
                  )}
                  {m.hoId ? (
                    <button className="nut nut-nho nut-chu" onClick={() => di({ ten: "ho", duAnId: m.duAnId, hoId: m.hoId! })}>Mở hồ sơ</button>
                  ) : (
                    <button className="nut nut-nho nut-chu" onClick={() => di({ ten: "du-an", duAnId: m.duAnId, tab: "thong-tin" })}>Mở dự án</button>
                  )}
                </td>
              </tr>
            ))}
            {!hien.length && <tr><td colSpan={6} className="trong">Không có số liệu cần rà soát.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

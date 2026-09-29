import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { homNayIso, TT_GPMB } from "../trang-thai";
import { viecCuaToi } from "../phan-cong";
import { tien } from "../thanh-phan/chung";

/** P3-4: hồ sơ được phân công cho tài khoản đang đăng nhập — ưu tiên hồ sơ có cảnh báo thời hạn, vướng mắc. */
export function ViecCuaToi() {
  const { taiKhoan, dsDuAn, hoCua, chinhSach, di, lich, tyLeCham } = useUngDung();
  const [chiCanhBao, setChiCanhBao] = useState(false);
  const homNay = homNayIso();
  const ds = useMemo(() => viecCuaToi(taiKhoan?.ten ?? "", dsDuAn, hoCua, (d, h) => tinhHo(chinhSach(d), d, h), homNay, lich, tyLeCham), [taiKhoan?.ten, dsDuAn, hoCua, chinhSach, homNay, lich, tyLeCham]);
  const hien = chiCanhBao ? ds.filter((x) => x.canhBao.length || x.vuongMac.length) : ds;
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Theo dõi</div>
          <h1>Việc của tôi</h1>
          <div className="mo-ta">{ds.length} hồ sơ được phân công cho {taiKhoan?.hoTen ?? "—"} · sắp theo mức ưu tiên (cảnh báo thời hạn, vướng mắc)</div>
        </div>
        <div className="phai"><label className="chu-nho"><input type="checkbox" checked={chiCanhBao} onChange={(e) => setChiCanhBao(e.target.checked)} /> Chỉ hồ sơ có cảnh báo, vướng mắc</label></div>
      </div>
      <div className="the">
        {hien.length === 0 ? (
          <div className="trong">{ds.length ? "Không có hồ sơ có cảnh báo." : "Chưa có hồ sơ nào được phân công cho tài khoản này. Phân công ở thẻ Thông tin của hồ sơ hoặc “Phân công…” ở danh sách hộ của dự án."}</div>
        ) : (
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr><th>Dự án</th><th>Hồ sơ</th><th>Bước hiện tại</th><th>Hiện trạng</th><th className="so">Tổng (đ)</th><th>Cảnh báo, vướng mắc</th></tr></thead>
              <tbody>
                {hien.map((x) => (
                  <tr key={x.h.id} className="co-the-chon" data-viec={x.h.ma} onClick={() => di({ ten: "ho", duAnId: x.duAn.id, hoId: x.h.id })}>
                    <td className="chu-nho">{x.duAn.ten}</td>
                    <td><b>{x.h.ten}</b><div className="mo chu-nho">{x.h.ma}</div></td>
                    <td className="chu-nho">{x.buoc ? `Bước ${x.buoc.ma}. ${x.buoc.ten}` : "Đã hoàn thành"}</td>
                    <td><span className="nhan" style={{ background: TT_GPMB[x.tt].nen, color: "var(--chu)" }}>{TT_GPMB[x.tt].ten}</span></td>
                    <td className="so">{tien(x.k.tong.tongLamTron)}</td>
                    <td className="chu-nho">
                      {x.canhBao.map((c, i) => <div key={i} style={{ color: c.muc === "CAO" ? "var(--do)" : c.muc === "TRUNG_BINH" ? "var(--vang)" : undefined }}>• {c.noiDung.replace(`${x.h.ma} · ${x.h.ten}: `, "")}</div>)}
                      {x.vuongMac.map((v, i) => <div key={`v${i}`} style={{ color: v.muc === "CAO" ? "var(--do)" : "var(--vang)" }}>• {v.noiDung}</div>)}
                      {!x.canhBao.length && !x.vuongMac.length && <span className="mo">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

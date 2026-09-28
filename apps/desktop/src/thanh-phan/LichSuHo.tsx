import { Fragment, useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { BanLichSu } from "../kho";
import type { Ho } from "../mo-hinh";
import { khacBiet } from "../lich-su";

const gio = (s: string | null) => (s ? new Date(s).toLocaleString("vi-VN", { hour12: false }) : "—");

/**
 * Lịch sử thay đổi của hồ sơ (P1-5): mỗi lần lưu, bản cũ được giữ lại; bảng nêu từng trường "từ … thành …" giữa hai bản
 * liên tiếp. Quản trị khôi phục được hồ sơ về một bản cũ (bắt buộc lý do; bản hiện tại cũng được giữ trong lịch sử).
 */
export function LichSuHo({ h }: { h: Ho }) {
  const { kho, quyen, khoiPhucLichSu, giuLichSu } = useUngDung();
  const [ds, setDs] = useState<BanLichSu[] | null>(null);
  const [loi, setLoi] = useState("");
  const [mo, setMo] = useState<number | null>(null);
  useEffect(() => {
    let huy = false;
    kho.lichSu("ho", h.id).then(
      (r) => !huy && setDs(r.ds),
      (e) => !huy && setLoi(String((e as Error).message ?? e)),
    );
    return () => {
      huy = true;
    };
  }, [kho, h]);
  const khoiPhuc = async (x: BanLichSu) => {
    const lyDo = prompt(`Khôi phục hồ sơ ${h.ma} về bản lưu lúc ${gio(x.suaLuc ?? x.luuLuc)}?\nBản hiện tại được giữ trong lịch sử.\n\nLý do khôi phục (bắt buộc):`)?.trim();
    if (lyDo) await khoiPhucLichSu(x.stt, lyDo);
  };
  return (
    <div className="the" style={{ marginTop: 14 }}>
      <div className="the-dau">
        <h2>Lịch sử thay đổi</h2>
        <span className="mo chu-nho">Bản cũ của hồ sơ mỗi lần lưu — giữ {giuLichSu ? `${giuLichSu} năm` : "không thời hạn"} (quản trị đặt ở Cài đặt chung)</span>
      </div>
      {loi && <div className="thong-bao thong-bao-do" style={{ margin: 12 }}>{loi}</div>}
      {ds === null ? (
        <div className="trong">Đang tải…</div>
      ) : ds.length === 0 ? (
        <div className="trong">Chưa có bản cũ (hồ sơ chưa được sửa kể từ khi có tính năng lịch sử).</div>
      ) : (
        <table className="bang">
          <thead><tr><th>Bản cũ</th><th>Bị thay lúc</th><th>Thay đổi sang bản sau</th><th /></tr></thead>
          <tbody>
            {ds.map((x, i) => {
              const sau = (i === 0 ? h : (ds[i - 1]!.duLieu as Ho)) as Ho;
              const kb = khacBiet(x.duLieu as Ho, sau);
              return (
                <Fragment key={x.stt}>
                  <tr>
                    <td className="chu-nho">{x.phienBan ? `Phiên bản ${x.phienBan}` : "Bản cũ"}{x.suaBoi && <div className="mo">lưu {gio(x.suaLuc)} · {x.suaBoi}</div>}</td>
                    <td className="chu-nho">{gio(x.luuLuc)}<div className="mo">{x.luuBoi || "—"} · {x.lyDo || "Sửa"}</div></td>
                    <td className="chu-nho">
                      {kb.length === 0 ? <span className="mo">Không khác (chỉ nhật ký)</span> : (
                        <>
                          {kb.slice(0, mo === x.stt ? 300 : 3).map((k, j) => <div key={j}><b>{k.truong}</b>: {k.tu} → {k.thanh}</div>)}
                          {kb.length > 3 && <button className="nut nut-chu nut-nho" onClick={() => setMo(mo === x.stt ? null : x.stt)}>{mo === x.stt ? "Thu gọn" : `Xem cả ${kb.length} thay đổi`}</button>}
                        </>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{quyen("KHOI_PHUC_BAN_GHI") && <button className="nut nut-nho" title="Chỉ quản trị" onClick={() => void khoiPhuc(x)}>Khôi phục bản này</button>}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

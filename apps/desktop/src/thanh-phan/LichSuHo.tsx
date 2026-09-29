import { Fragment, useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import type { BanLichSu } from "../kho";
import type { Ho } from "../mo-hinh";
import { khacBiet, thuocO } from "../lich-su";
import { HopThoai } from "./chung";

const TEN_PHAN: Record<string, string> = { td: "Tiến độ · ", ct: "Chi trả · " };

/**
 * Cặp (bản cũ, bản sau) để so sánh. Máy chủ lưu tiến độ ("td"), chi trả ("ct") là bản ghi con riêng (P2-7): so trong phần
 * tương ứng; bản ghi chính so phần còn lại (bỏ tiến độ, chi trả nếu bản cũ không chứa chúng).
 */
export function cap(x: BanLichSu, sauLs: BanLichSu | undefined, h: Ho): [Ho, Ho] {
  const sau = (sauLs?.duLieu ?? null) as Record<string, unknown> | null;
  const cu = x.duLieu as Record<string, unknown>;
  if (x.loai === "td") return [{ tienDo: cu.tienDo } as unknown as Ho, { tienDo: sau ? sau.tienDo : h.tienDo } as unknown as Ho];
  if (x.loai === "ct") return [{ chiTra: cu.chiTra } as unknown as Ho, { chiTra: sau ? sau.chiTra : h.chiTra } as unknown as Ho];
  const bo = (o: Record<string, unknown>) => ("tienDo" in cu ? o : (({ tienDo: _a, chiTra: _b, ...r }) => r)(o));
  return [bo(cu) as unknown as Ho, bo((sau ?? h) as unknown as Record<string, unknown>) as unknown as Ho];
}

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
    <div className="the mt-14">
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
              const kb = khacBiet(...cap(x, ds.slice(0, i).reverse().find((y) => y.loai === x.loai), h));
              return (
                <Fragment key={x.stt}>
                  <tr>
                    <td className="chu-nho">{TEN_PHAN[x.loai] ?? ""}{x.phienBan ? `Phiên bản ${x.phienBan}` : "Bản cũ"}{x.suaBoi && <div className="mo">lưu {gio(x.suaLuc)} · {x.suaBoi}</div>}</td>
                    <td className="chu-nho">{gio(x.luuLuc)}<div className="mo">{x.luuBoi || "—"} · {x.lyDo || "Sửa"}</div></td>
                    <td className="chu-nho">
                      {kb.length === 0 ? <span className="mo">Không khác (chỉ nhật ký)</span> : (
                        <>
                          {kb.slice(0, mo === x.stt ? 300 : 3).map((k, j) => <div key={j}><b>{k.truong}</b>: {k.tu} → {k.thanh}</div>)}
                          {kb.length > 3 && <button className="nut nut-chu nut-nho" onClick={() => setMo(mo === x.stt ? null : x.stt)}>{mo === x.stt ? "Thu gọn" : `Xem cả ${kb.length} thay đổi`}</button>}
                        </>
                      )}
                    </td>
                    <td className="khong-xuong-dong">{quyen("KHOI_PHUC_BAN_GHI") && x.loai === "ho" && <button className="nut nut-nho" title="Chỉ quản trị" onClick={() => void khoiPhuc(x)}>Khôi phục bản này</button>}</td>
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

/** §11.5: lịch sử thay đổi của một ô (chuột phải trên ô → "Lịch sử thay đổi của ô này"). */
export function HopLichSuO({ h, khoa, ten, dong }: { h: Ho; khoa: string; ten: string; dong: () => void }) {
  const { kho } = useUngDung();
  const [ds, setDs] = useState<{ luc: string; ai: string; tu: string; thanh: string; truong: string; lyDo: string }[] | null>(null);
  useEffect(() => {
    let huy = false;
    void kho.lichSu("ho", h.id).then((r) => {
      const out: NonNullable<typeof ds> = [];
      r.ds.forEach((x, i) => {
        for (const k of khacBiet(...cap(x, r.ds.slice(0, i).reverse().find((y) => y.loai === x.loai), h)))
          if (thuocO(k, khoa)) out.push({ luc: x.luuLuc, ai: x.luuBoi || "—", tu: k.tu, thanh: k.thanh, truong: k.truong, lyDo: x.lyDo || "Sửa" });
      });
      if (!huy) setDs(out);
    }, () => !huy && setDs([]));
    return () => {
      huy = true;
    };
  }, [kho, h, khoa]);
  return (
    <HopThoai tieuDe={`Lịch sử ô: ${ten || khoa}`} dong={dong} rong={760}>
      <p className="mo chu-nho mt-0">Mỗi dòng: lần lưu làm ô này đổi giá trị — thời điểm, người lưu, từ … thành …. Chỉ gồm các lần lưu từ khi có lịch sử (0.6.0).</p>
      <table className="bang">
        <thead><tr><th>Thời điểm</th><th>Người lưu</th><th>Trường</th><th>Từ</th><th>Thành</th></tr></thead>
        <tbody>
          {(ds ?? []).map((x, i) => (
            <tr key={i}><td className="chu-nho">{gio(x.luc)}</td><td className="chu-nho">{x.ai}{x.lyDo !== "Sửa" && <div className="mo">{x.lyDo}</div>}</td><td className="chu-nho">{x.truong}</td><td>{x.tu}</td><td><b>{x.thanh}</b></td></tr>
          ))}
          {ds !== null && !ds.length && <tr><td colSpan={5} className="trong">Ô này chưa thay đổi (hoặc thay đổi trước khi có lịch sử).</td></tr>}
          {ds === null && <tr><td colSpan={5} className="trong">Đang tải…</td></tr>}
        </tbody>
      </table>
    </HopThoai>
  );
}

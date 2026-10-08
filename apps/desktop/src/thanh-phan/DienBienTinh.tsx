import { useMemo, useState } from "react";
import { dinhDang } from "@gpmb/core";
import { BieuDoKy } from "./BieuDoKy";
import { Chon } from "./Chon";
import { dienBienTinh, type BanGui, type PhamViDienBien } from "../tong-hop-tinh/dien-bien";
import type { BanCu, BanGhiGoi } from "../tong-hop-tinh/kho-tinh";
import { chuanMa } from "../tong-hop-tinh/lien-xa";

/**
 * 1.0.5 — biểu đồ diễn biến theo tháng ở cấp tỉnh (toàn tỉnh / một xã / một dự án liên xã) dựng từ bản gửi hiện tại
 * và các bản trước đã lưu của từng đơn vị. Chỉ cộng số liệu các đơn vị đã gửi.
 */
export function TheDienBienTinh({ ds, banCu }: { ds: BanGhiGoi[]; banCu: BanCu[] }) {
  const [chon, setChon] = useState("TINH");
  const ban = useMemo<BanGui[]>(
    () => [...ds, ...banCu].map((b) => ({ maGui: b.maGui, luc: b.thongTin.luc, tomTat: b.tomTat })),
    [ds, banCu],
  );
  const dsXa = useMemo(() => [...new Set(ban.flatMap((b) => b.tomTat.map((d) => d.xa)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi")), [ban]);
  const dsLx = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of ban) for (const d of b.tomTat) if (d.lienXa?.ma) m.set(chuanMa(d.lienXa.ma), d.lienXa.tenTuyen || d.ten);
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "vi"));
  }, [ban]);
  const pv: PhamViDienBien = chon.startsWith("XA:") ? { loai: "XA", xa: chon.slice(3) } : chon.startsWith("LX:") ? { loai: "LIEN_XA", ma: chon.slice(3) } : { loai: "TINH" };
  const ky = useMemo(() => dienBienTinh(ban, pv), [ban, chon]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!ban.length) return null;
  const nhan = ky.map((k) => `${k.ky.slice(5)}/${k.ky.slice(2, 4)}`);
  const tl = (a: number, b: number) => (b ? (a / b) * 100 : null);
  const cuoi = ky[ky.length - 1];
  return (
    <div className="the">
      <div className="the-dau" style={{ flexWrap: "wrap", gap: 8 }}>
        <h3>Diễn biến theo tháng</h3>
        <Chon value={chon} onChange={(e) => setChon(e.target.value)} aria-label="Phạm vi diễn biến" style={{ maxWidth: 320 }}>
          <option value="TINH">Toàn tỉnh</option>
          {dsXa.length > 0 && <optgroup label="Xã, phường">{dsXa.map((x) => <option key={x} value={`XA:${x}`}>{x}</option>)}</optgroup>}
          {dsLx.length > 0 && <optgroup label="Dự án liên xã">{dsLx.map(([m, t]) => <option key={m} value={`LX:${m}`}>{t} ({m})</option>)}</optgroup>}
        </Chon>
      </div>
      <div className="the-than">
        {ky.length < 2 ? (
          <div className="mo chu-nho">Cần số liệu gửi từ ít nhất hai tháng khác nhau để vẽ diễn biến. Dùng “Tải các bản cũ trên cổng” hoặc nhập các gói gửi trước.</div>
        ) : (
          <div className="luoi luoi-2 mb-14">
            <div>
              <div className="nhan-muc">Tỷ lệ hộ đã bàn giao mặt bằng, đã duyệt phương án (%)</div>
              <BieuDoKy kieu="duong" nhanKy={nhan} hienTai={ky.length - 1} maxY={100} dinhDang={(v) => `${dinhDang(v, 0)}%`} moTa="Tỷ lệ hộ đã bàn giao mặt bằng và hộ đã duyệt phương án trên tổng số hộ theo tháng"
                chuoi={[{ ten: "Đã bàn giao / tổng số hộ", giaTri: ky.map((k) => tl(k.banGiao, k.soHo)) }, { ten: "Đã duyệt PA / tổng số hộ", giaTri: ky.map((k) => tl(k.duyetPA, k.soHo)) }]} />
            </div>
            <div>
              <div className="nhan-muc">Giá trị tạm tính (tỷ đồng)</div>
              <BieuDoKy kieu="cot" nhanKy={nhan} hienTai={ky.length - 1} dinhDang={(v) => dinhDang(v, v < 10 ? 2 : 1)} moTa="Tổng giá trị tạm tính theo tháng, tỷ đồng"
                chuoi={[{ ten: "Tạm tính", giaTri: ky.map((k) => k.tamTinh / 1e9) }]} />
            </div>
          </div>
        )}
        {cuoi && (
          <div className="chu-nho">
            Tháng {nhan[nhan.length - 1]}: {cuoi.soDonVi} đơn vị gửi · {cuoi.soHo} hộ · {cuoi.banGiao} hộ đã bàn giao · {cuoi.duyetPA} hộ đã duyệt PA · diện tích thu hồi {dinhDang(cuoi.dtThuHoi, 1)} m².
          </div>
        )}
        <div className="mo chu-nho" style={{ marginTop: 6 }}>
          Mỗi tháng lấy bản gửi gần nhất của từng đơn vị có thời điểm xuất đến cuối tháng (tháng hiện tại: đến hôm nay, vẽ nét đứt); đơn vị chưa gửi trước tháng đó thì không tính. Chỉ cộng số liệu đã gửi, không ước tính phần thiếu — số đơn vị gửi thay đổi giữa các tháng có thể làm đường biểu đồ thay đổi.
        </div>
      </div>
    </div>
  );
}

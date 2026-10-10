import { useUngDung } from "../ung-dung";
import type { DinhKem } from "../kho";
import { banTruoc, khoiPhucBan, thayTep } from "../dinh-kem-phien-ban";
import { taiXuong } from "../tai-xuong";

/**
 * 1.0.7 — Phiên bản tệp trong một dòng bảng tệp: "Bản mới…" thay tệp (giữ bản cũ), danh sách bản trước (tải về, khôi
 * phục). `moTa`: mô tả nơi của tệp cho nhật ký (vd. "H001 · Nguyễn Văn A").
 */
export function PhienBanTep({ x, ds, sua, moTa, kiemTep, xong }: { x: DinhKem; ds: DinhKem[]; sua: boolean; moTa: string; kiemTep: (ten: string, co: number) => string | null; xong: () => Promise<void> }) {
  const { kho, nguoiDung, ghiNhatKy, bao } = useUngDung();
  const truoc = banTruoc(ds, x);
  const banMoi = async (f: File) => {
    const loi = kiemTep(f.name, f.size);
    if (loi) return bao(loi, "loi");
    const gc = prompt(`Tải bản mới thay cho "${x.ten}" (bản hiện tại được giữ lại, xem và khôi phục được).\nGhi chú cho bản mới (vd. "Bản đã ký, đóng dấu"; để trống = giữ ghi chú cũ):`, "");
    if (gc === null) return;
    try {
      await thayTep(kho, x, { ten: f.name, loai: f.type || "application/octet-stream", bytes: new Uint8Array(await f.arrayBuffer()) }, nguoiDung, gc);
      await ghiNhatKy("Tải bản mới của tệp", `${moTa}: "${x.ten}" → "${f.name}" (giữ bản cũ)`);
      await xong();
      bao("Đã thay bằng bản mới; bản cũ ở mục \"bản trước\"");
    } catch (e) {
      bao(`Không thay được tệp: ${(e as Error).message}`, "loi");
    }
  };
  const khoiPhuc = async (b: DinhKem) => {
    if (!confirm(`Dùng lại bản "${b.ten}" (${new Date(b.luc).toLocaleString("vi-VN")})? Bản đang dùng chuyển thành bản trước.`)) return;
    try {
      await khoiPhucBan(kho, ds, b, nguoiDung);
      await ghiNhatKy("Khôi phục bản trước của tệp", `${moTa}: "${b.ten}" (${b.luc}) thay "${x.ten}"`);
      await xong();
    } catch (e) {
      bao((e as Error).message, "loi");
    }
  };
  const tai = async (b: DinhKem) => {
    const d = await kho.docDinhKem(b.id);
    if (!d) return bao("Không còn tệp này", "loi");
    await taiXuong(d, b.ten, b.loai);
  };
  return (
    <span className="nhom-nut" style={{ gap: 4, flexWrap: "wrap" }}>
      {sua && (
        <label className="nut nut-nho" title="Thay bằng tệp mới, giữ bản hiện tại trong lịch sử phiên bản">
          Bản mới…
          <input type="file" className="an" aria-label={`Tải bản mới của ${x.ten}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void banMoi(f); e.target.value = ""; }} />
        </label>
      )}
      {truoc.length > 0 && (
        <details className="chu-nho">
          <summary aria-label={`Bản trước của ${x.ten}`}>{truoc.length} bản trước</summary>
          {truoc.map((b) => (
            <div key={b.id} className="nhom-nut" style={{ gap: 4, alignItems: "center", marginTop: 4 }}>
              <button className="nut nut-chu nut-nho" onClick={() => void tai(b)}>{b.ten}</button>
              <span className="mo">{new Date(b.luc).toLocaleString("vi-VN")} · {b.nguoi}</span>
              {sua && <button className="nut nut-nho" onClick={() => void khoiPhuc(b)}>Dùng lại bản này</button>}
            </div>
          ))}
        </details>
      )}
    </span>
  );
}

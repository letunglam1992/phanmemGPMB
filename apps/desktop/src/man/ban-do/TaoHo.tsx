import { useMemo, useState } from "react";
import { type DienTichThuHoi, type ThuaBanDo } from "@gpmb/gis";
import { useUngDung } from "../../ung-dung";
import { taoId, type DuAn, type Ho } from "../../mo-hinh";
import { HopThoai } from "../../thanh-phan/chung";
import { hoMoi } from "../DuAn";
import { boSinhMa, mauMaCua } from "../../ma-ho";
import { type DuLieuBanDo, TEN_CO } from "./du-lieu";

export function HopTaoHo(p: {
  duAn: DuAn;
  dl: DuLieuBanDo;
  thuHoi: Map<string, DienTichThuHoi>;
  khoaThua: (t: ThuaBanDo) => string;
  daLienKet: Map<string, Ho>;
  dong: () => void;
  /** Bấm số thửa: tạm ẩn hộp, phóng tới thửa trên bản đồ (quay lại danh sách bằng thanh "Quay lại") */
  xemThua?: (t: ThuaBanDo) => void;
}) {
  const { kho, taiLai, di, quyen, bao, nguoiDung, hoCua } = useUngDung();
  const nhom = useMemo(() => {
    const m = new Map<string, { ten: string; thua: { t: ThuaBanDo; th: DienTichThuHoi }[] }>();
    for (const t of p.dl.kq.thua) {
      const th = p.thuHoi.get(p.khoaThua(t));
      if (!th || th.phamVi === "NGOAI" || p.daLienKet.has(t.ma)) continue;
      const ten = t.chuSuDung ?? `Chưa rõ chủ – tờ ${t.soTo ?? "?"} thửa ${t.soThua ?? "?"}`;
      // Thửa chưa rõ chủ: mỗi thửa một hồ sơ riêng; cùng tên có thể là người khác nhau → cán bộ kiểm tra
      const k = t.chuSuDung ? ten.toLowerCase() : `?${p.khoaThua(t)}`;
      if (!m.has(k)) m.set(k, { ten, thua: [] });
      m.get(k)!.thua.push({ t, th });
    }
    return [...m.values()].sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
  }, [p]);
  const [dangTao, setDangTao] = useState(false);
  const [daXacNhan, setDaXacNhan] = useState(false);
  // Thửa có nghi vấn: cán bộ phải xác nhận đã kiểm tra trước khi tạo hồ sơ
  const nghiVan = (t: ThuaBanDo): string[] => {
    const ds: string[] = t.co.map((c) => TEN_CO[c] ?? c);
    if (!t.chuSuDung) ds.push("chưa rõ chủ sử dụng");
    if (!t.soTo || !t.soThua) ds.push("thiếu số tờ/số thửa");
    return ds;
  };
  const soNghiVan = nhom.reduce((s, g) => s + g.thua.filter(({ t }) => nghiVan(t).length > 0).length, 0);

  const tao = async () => {
    if (!quyen("SUA_HO_SO")) return bao("Tài khoản không có quyền tạo hồ sơ", "loi");
    if (soNghiVan > 0 && !daXacNhan) return bao("Cần xác nhận đã kiểm tra các thửa có nghi vấn", "loi");
    setDangTao(true);
    // Mã theo mẫu của dự án, tiếp số lớn nhất đang dùng — không trùng hồ sơ đã có (P0-3)
    const maMoi = boSinhMa(hoCua(p.duAn.id, true).map((h) => h.ma), mauMaCua(p.duAn));
    const dsMoi: Ho[] = [];
    for (const g of nhom) {
      const h = hoMoi(p.duAn.id, maMoi(), g.ten, /ubnd|cộng đồng|tập thể|công ty|hợp tác/i.test(g.ten) ? "TO_CHUC" : "HO_GIA_DINH");
      h.thua = g.thua.map(({ t, th }) => ({
        id: taoId(),
        soTo: t.soTo ?? "",
        soThua: t.soThua ?? "",
        loaiDat: t.loaiDatBanDo ?? "",
        dienTich: (t.dienTichGhi ?? t.dienTichHinhHoc).toFixed(2).replace(/\.?0+$/, ""),
        dienTichThuHoi: th.phamVi === "TOAN_BO" && t.dienTichGhi ? String(t.dienTichGhi) : th.dienTichThuHoi.toFixed(2),
        nguonGoc: "",
        gia: null,
        maBanDo: t.ma,
        dienTichBanDo: th.dienTichThuHoi,
        ghiChu: nghiVan(t).length ? `Nghi vấn khi đọc bản đồ (đã được cán bộ xác nhận kiểm tra): ${nghiVan(t).join(", ")}` : undefined,
      }));
      h.nhatKy = [{ luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Tạo từ bản đồ ${p.duAn.banDo?.tenTep ?? ""}: ${h.thua.length} thửa` }];
      dsMoi.push(h);
    }
    // Một giao dịch: tạo đủ tất cả hồ sơ hoặc không tạo hồ sơ nào (P0-6)
    try {
      await kho.ghiLo({ ho: dsMoi });
    } catch (e) {
      setDangTao(false);
      return bao(`Không tạo được hồ sơ (chưa hồ sơ nào được ghi): ${(e as Error).message}`, "loi");
    }
    await taiLai();
    setDangTao(false);
    p.dong();
    di({ ten: "du-an", duAnId: p.duAn.id, tab: "ho" });
  };

  const soThua = nhom.reduce((s, g) => s + g.thua.length, 0);
  return (
    <HopThoai
      tieuDe="Tạo hồ sơ từ các thửa thu hồi"
      dong={p.dong}
      chan={
        <>
          <button className="nut" onClick={p.dong}>Hủy</button>
          <button className="nut nut-chinh" disabled={dangTao || nhom.length === 0 || (soNghiVan > 0 && !daXacNhan)} onClick={tao}>{dangTao ? "Đang tạo…" : `Tạo ${nhom.length} hồ sơ (${soThua} thửa)`}</button>
        </>
      }
    >
      <div className="thong-bao thong-bao-xanh">
        Nhóm thửa theo tên chủ sử dụng đọc từ bản đồ (trùng tên có thể là người khác nhau — kiểm tra trước khi tạo). Loại đất giữ nguyên ký hiệu trên bản đồ (vd. "1L", "2L") — cán bộ đổi sang mã loại đất hiện hành và chọn giá đất trong hồ sơ.
        Bấm số thửa để xem thửa trên bản đồ (quay lại danh sách bằng nút “Quay lại”). DT thu hồi: thửa nằm trọn trong ranh lấy DT ghi trên bản đồ; thửa một phần lấy DT phần giao (làm tròn 2 số lẻ). Cần đối chiếu với hồ sơ trích đo được duyệt.
      </div>
      <table className="bang">
        <thead><tr><th>Chủ sử dụng (bản đồ)</th><th className="so">Số thửa</th><th>Thửa</th><th className="so">DT thu hồi (m²)</th></tr></thead>
        <tbody>
          {nhom.map((g) => (
            <tr key={g.ten}>
              <td>{g.ten}</td>
              <td className="so">{g.thua.length}</td>
              <td className="chu-nho">
                {g.thua.map(({ t }, i) => {
                  const nv = nghiVan(t);
                  const nhan = `${t.soTo ?? "?"}-${t.soThua ?? "?"}`;
                  return (
                    <span key={t.ma}>
                      {i > 0 && ", "}
                      {p.xemThua ? (
                        <button className={`nut-lien-ket${nv.length ? " chu-do" : ""}`} title={`${nv.length ? `${nv.join("; ")} — ` : ""}Bấm để xem thửa ${nhan} trên bản đồ`} aria-label={`Xem thửa ${nhan} trên bản đồ`} onClick={() => p.xemThua!(t)}>{nv.length ? <b>⚠ {nhan}</b> : nhan}</button>
                      ) : nv.length ? <b className="chu-do" title={nv.join("; ")}>⚠ {nhan}</b> : nhan}
                    </span>
                  );
                })}
              </td>
              <td className="so">{g.thua.reduce((s, x) => s + x.th.dienTichThuHoi, 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {nhom.length === 0 && <tr><td colSpan={4} className="trong">Mọi thửa thu hồi đã có hồ sơ.</td></tr>}
        </tbody>
      </table>
      {soNghiVan > 0 && (
        <label className="thong-bao thong-bao-vang" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10 }}>
          <input type="checkbox" checked={daXacNhan} onChange={(e) => setDaXacNhan(e.target.checked)} />
          <span>
            Có <b>{soNghiVan}</b> thửa nghi vấn (đánh dấu ⚠, rê chuột để xem lý do). Tôi đã kiểm tra các thửa này với hồ sơ địa chính/trích đo và đồng ý tạo hồ sơ; nội dung nghi vấn được ghi vào ghi chú của thửa.
          </span>
        </label>
      )}
    </HopThoai>
  );
}

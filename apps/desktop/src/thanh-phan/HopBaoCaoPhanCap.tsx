import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { HopThoai, O } from "./chung";
import { ONgay } from "./ONgay";
import { KHOA_SO_VB, type SoVanBanDi } from "../so-van-ban";
import { duLieuBaoCaoPhanCap, thongKePhanCap, type ThongTinBcpc } from "../bao-cao-phan-cap";
import { hanBaoCaoPhanCap } from "../van-ban/tham-quyen";
import { dienMau } from "../van-ban/dien-mau";
import { taiXuong } from "../tai-xuong";
import { homNayIso } from "../trang-thai";
import { donViSuDung } from "../don-vi";

const KHOA = "gpmb-bao-cao-phan-cap";
const vn = (iso: string) => iso.split("-").reverse().join("/");
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * 1.3.0 (A1) — Báo cáo kết quả thực hiện nhiệm vụ, quyền hạn được phân cấp (khoản 2 Điều 4 QĐ 27/2026/QĐ-UBND, định kỳ 06 tháng):
 * kỳ mặc định từ hạn trước đến trước hạn gần nhất (sửa được); bảng đếm theo Sổ văn bản đi; tạo Word.
 */
export function HopBaoCaoPhanCap({ dong }: { dong: () => void }) {
  const { kho, thamQuyen, dsDonVi, dsDuAn, bao, ghiNhatKy } = useUngDung();
  const han = hanBaoCaoPhanCap(homNayIso());
  const [tu, setTu] = useState(han?.tu ?? `${homNayIso().slice(0, 4)}-01-01`);
  const [den, setDen] = useState(han?.den ?? homNayIso());
  const [so, setSo] = useState<SoVanBanDi | null>(null);
  const dv = donViSuDung(dsDonVi);
  const [t, setT] = useState<ThongTinBcpc>(() => {
    const mac: ThongTinBcpc = {
      so: "", ngayKy: homNayIso(), tenXa: dv?.ten?.replace(/^Ủy ban nhân dân\s+/i, "") || dsDuAn[0]?.xa || "", diaDanh: dv?.diaDanh ?? "",
      kinhGui: "Ủy ban nhân dân tỉnh Sơn La (qua Sở Nông nghiệp và Môi trường)", khoKhan: "", kienNghi: "", noiDungKhac: "",
      noiNhan: "Như trên\nSở Nông nghiệp và Môi trường\nLưu: VT", quyenHan: "CHỦ TỊCH", nguoiKy: dv?.nguoiKy ?? "",
    };
    try { return { ...mac, ...JSON.parse(localStorage.getItem(KHOA) ?? "{}"), so: "", ngayKy: homNayIso(), khoKhan: "", kienNghi: "", noiDungKhac: "" }; } catch { return mac; }
  });
  useEffect(() => void kho.docCaiDat<SoVanBanDi>(KHOA_SO_VB).then(setSo).catch(() => setSo(null)), [kho]);
  const dongTk = useMemo(() => thongKePhanCap(so?.ds ?? [], tu, den, thamQuyen), [so, tu, den, thamQuyen]);
  const tong = dongTk.reduce((s, x) => s + x.ds.length, 0);
  const o = (k: keyof ThongTinBcpc, nhan: string, n = 1) => (
    <O nhan={nhan} style={n > 1 ? { gridColumn: "1 / -1" } : undefined}>
      {n > 1 ? <textarea aria-label={nhan} rows={n} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} /> : <input aria-label={nhan} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} />}
    </O>
  );
  const tao = async () => {
    try {
      try { localStorage.setItem(KHOA, JSON.stringify({ tenXa: t.tenXa, diaDanh: t.diaDanh, kinhGui: t.kinhGui, noiNhan: t.noiNhan, quyenHan: t.quyenHan, nguoiKy: t.nguoiKy })); } catch { /* bỏ qua */ }
      const mau = await (await fetch("/mau-van-ban/bao-cao-phan-cap.docx")).arrayBuffer();
      if (!(await taiXuong(dienMau(mau, duLieuBaoCaoPhanCap(dongTk, tu, den, t, thamQuyen)), `Bao-cao-phan-cap_${tu}_${den}.docx`, DOCX))) return;
      await ghiNhatKy("Tạo báo cáo kết quả thực hiện nhiệm vụ được phân cấp", `${vn(tu)}–${vn(den)}: ${tong} văn bản`);
      bao("Đã tạo báo cáo (dự thảo) — kiểm tra, bổ sung trước khi trình ký");
    } catch (e) {
      bao(`Không tạo được báo cáo: ${(e as Error).message}`, "loi");
    }
  };
  return (
    <HopThoai tieuDe="Báo cáo kết quả thực hiện nhiệm vụ được phân cấp" dong={dong} rong={940} chan={<><button className="nut" onClick={dong}>Đóng</button><button className="nut nut-chinh" onClick={() => void tao()}>Tạo tệp Word</button></>}>
      <div className="mo chu-nho mb-10" data-bao-cao-phan-cap>
        Khoản 2 Điều 4 QĐ {thamQuyen.so}: định kỳ 06 tháng (trước ngày 15/6 và 15/12 hằng năm) báo cáo UBND tỉnh (qua Sở Nông nghiệp và Môi trường).
        {han ? <> Hạn gần nhất: <b>trước {vn(han.han)}</b>; kỳ số liệu mặc định {vn(han.tu)}–{vn(han.den)} (sửa được).</> : <> Văn bản phân cấp đang áp dụng không còn hạn báo cáo trong thời gian hiệu lực.</>}
        {" "}Số liệu lấy từ <b>Sổ văn bản đi</b>: văn bản tạo từ mẫu thuộc nhiệm vụ phân cấp và văn bản ghi tay có chọn nhiệm vụ.
      </div>
      <div className="luoi luoi-4">
        <O nhan="Từ ngày"><ONgay aria-label="Kỳ báo cáo từ ngày" value={tu} onChange={(e) => setTu(e.target.value)} /></O>
        <O nhan="Đến ngày"><ONgay aria-label="Kỳ báo cáo đến ngày" value={den} onChange={(e) => setDen(e.target.value)} /></O>
        {o("so", "Số báo cáo")}
        <O nhan="Ngày ký"><ONgay value={t.ngayKy} onChange={(e) => setT({ ...t, ngayKy: e.target.value })} /></O>
      </div>
      <table className="bang chu-nho mt-8" aria-label="Kết quả phân cấp theo nhiệm vụ">
        <thead><tr><th>Nhiệm vụ được phân cấp</th><th>Căn cứ</th><th className="so">Số văn bản</th></tr></thead>
        <tbody>
          {dongTk.map((x) => (
            <tr key={x.nv.ma} data-nv={x.nv.ma}>
              <td>{x.nv.noiDung}</td><td>{x.nv.viTri}</td>
              <td className="so" title={x.ds.map((v) => `${v.soDayDu} ngày ${vn(v.ngay)}`).join("\n")}>{x.ds.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="luoi luoi-2 mt-8">
        {o("tenXa", "Tên xã, phường (vd. Xã Chiềng Mung)")}
        {o("diaDanh", "Địa danh")}
        {o("kinhGui", "Kính gửi")}
        {o("quyenHan", "Quyền hạn người ký")}
        {o("nguoiKy", "Họ tên người ký")}
        {o("noiDungKhac", "Nhiệm vụ khác tại Phụ lục II (giao đất, cho thuê đất…) — đơn vị tự ghi", 3)}
        {o("khoKhan", "Khó khăn, vướng mắc", 3)}
        {o("kienNghi", "Đề xuất, kiến nghị", 3)}
        {o("noiNhan", "Nơi nhận (mỗi dòng một nơi)", 3)}
      </div>
    </HopThoai>
  );
}

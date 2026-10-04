/** Soạn báo cáo tổng hợp toàn tỉnh (Word) từ số liệu các xã, phường gửi lên — mẫu public/mau-van-ban/bao-cao-tong-hop-tinh.docx. */
import { useState } from "react";
import { useUngDung } from "../ung-dung";
import { ONgay } from "./ONgay";
import { HopThoai, O } from "./chung";
import { homNayIso } from "../trang-thai";
import { dienMau } from "../van-ban/dien-mau";
import { taiXuong } from "../tai-xuong";
import { duLieuBaoCaoTinh, type DongBaoCao, type ThongTinBaoCaoTinh } from "../tong-hop-tinh/bao-cao-tinh";
import type { ChamGui } from "../tong-hop-tinh/canh-bao";

const KHOA_TT = "gpmb-bao-cao-tinh-thong-tin";
const macDinh = (coQuan: string): ThongTinBaoCaoTinh => ({
  coQuanCapTren: "",
  coQuan,
  kyHieu: "",
  diaDanh: "",
  kinhGui: "",
  so: "",
  ngayKy: homNayIso(),
  moDau: `Trên cơ sở số liệu các xã, phường gửi qua phần mềm, ${coQuan || "…"} báo cáo tình hình thực hiện công tác bồi thường, hỗ trợ, tái định cư các dự án như sau:`,
  khoKhanKhac: "",
  nhiemVu: "",
  kienNghi: "",
  ketThuc: "Trên đây là báo cáo tình hình thực hiện công tác bồi thường, hỗ trợ, tái định cư các dự án./.",
  noiNhan: "Như trên\nLưu: VT",
  quyenHan: "",
  nguoiKy: "",
});
function docTt(coQuan: string): ThongTinBaoCaoTinh {
  try {
    return { ...macDinh(coQuan), ...JSON.parse(localStorage.getItem(KHOA_TT) ?? "{}"), ngayKy: homNayIso(), so: "" };
  } catch {
    return macDinh(coQuan);
  }
}

export function HopBaoCaoTinh(p: { dong: () => void; tenCoQuan: string; dong_: DongBaoCao[]; phamVi: string; soDonVi: number; cham: ChamGui[]; nguong: number | null }) {
  const { bao, ghiNhatKy } = useUngDung();
  const [t, setT] = useState<ThongTinBaoCaoTinh>(() => docTt(p.tenCoQuan));
  const [dang, setDang] = useState(false);
  const o = (k: keyof ThongTinBaoCaoTinh, nhan: string, dong = 1, goiY?: string) => (
    <O nhan={nhan} goiY={goiY} style={dong > 1 ? { gridColumn: "1/-1" } : undefined}>
      {dong > 1 ? <textarea aria-label={nhan} rows={dong} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} /> : <input aria-label={nhan} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} />}
    </O>
  );
  const tao = async () => {
    setDang(true);
    try {
      try {
        localStorage.setItem(KHOA_TT, JSON.stringify({ ...t, so: "", ngayKy: "" }));
      } catch {
        /* bỏ qua */
      }
      const mau = await (await fetch("/mau-van-ban/bao-cao-tong-hop-tinh.docx")).arrayBuffer();
      const duLieu = duLieuBaoCaoTinh(p.dong_, t, { phamVi: p.phamVi, denNgay: homNayIso(), soDonVi: p.soDonVi, cham: p.cham, nguong: p.nguong });
      const ten = `Bao-cao-tong-hop-GPMB-toan-tinh_${homNayIso()}.docx`;
      if (!(await taiXuong(dienMau(mau, duLieu), ten, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))) return;
      await ghiNhatKy("Tạo báo cáo tổng hợp toàn tỉnh (Word)", `${p.dong_.length} dự án, ${p.soDonVi} đơn vị gửi`);
      bao("Đã tạo báo cáo Word (dự thảo) — kiểm tra trước khi trình ký");
      p.dong();
    } catch (e) {
      bao(`Không tạo được báo cáo: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Soạn báo cáo tổng hợp toàn tỉnh (Word)" dong={p.dong} rong={860} chan={<><button className="nut" onClick={p.dong}>Hủy</button><button className="nut nut-chinh" disabled={dang} onClick={() => void tao()}>{dang ? "Đang tạo…" : "Tạo tệp Word"}</button></>}>
      <div className="mo chu-nho mb-10">
        Phần số liệu phần mềm tự điền từ {p.dong_.length} dự án đang hiện ở bảng tổng hợp ({p.phamVi === "tỉnh" ? "toàn tỉnh" : p.phamVi}): kết quả chung, bảng theo xã, phường, bảng từng dự án, tình hình gửi số liệu{p.nguong ? ` (ngưỡng ${p.nguong} ngày)` : ""}, số hộ vướng mắc. Các ô dưới đây cán bộ nhập; thông tin cơ quan, người ký được nhớ cho lần sau trên máy này.
      </div>
      <div className="luoi luoi-2">
        {o("coQuanCapTren", "Cơ quan chủ quản", 1, "vd. UBND tỉnh Sơn La")}
        {o("coQuan", "Cơ quan báo cáo")}
        {o("kyHieu", "Ký hiệu (…/BC-?)")}
        {o("so", "Số báo cáo", 1, "Để trống: văn thư ghi khi ký")}
        {o("diaDanh", "Địa danh", 1, "vd. Sơn La")}
        <O nhan="Ngày ký"><ONgay value={t.ngayKy} onChange={(e) => setT({ ...t, ngayKy: e.target.value })} /></O>
        {o("kinhGui", "Kính gửi")}
        {o("quyenHan", "Quyền hạn, chức vụ người ký")}
        {o("nguoiKy", "Họ tên người ký")}
        {o("moDau", "Mở đầu", 2)}
        {o("khoKhanKhac", "Khó khăn, vướng mắc khác", 3)}
        {o("nhiemVu", "Nhiệm vụ, giải pháp thời gian tới", 3)}
        {o("kienNghi", "Đề xuất, kiến nghị", 3)}
        {o("ketThuc", "Câu kết", 2)}
        {o("noiNhan", "Nơi nhận (mỗi dòng một nơi)", 3)}
      </div>
    </HopThoai>
  );
}

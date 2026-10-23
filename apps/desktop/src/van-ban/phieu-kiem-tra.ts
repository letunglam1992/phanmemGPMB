/**
 * 1.3.0 (C2) — Phiếu kiểm tra văn bản trước khi ký: gom các cảnh báo của phần mềm cho văn bản đang soạn (căn cứ, thẩm quyền, số
 * đã cấp, hạn, số liệu…), căn cứ sẽ in, thẩm quyền theo văn bản phân cấp; để in kèm phiếu trình. Phần mềm chỉ liệt kê — người
 * soạn, người kiểm tra ghi ý kiến xử lý và ký.
 */
import type { TaiLieu } from "./tai-lieu-don-gian";

export interface ThongTinPhieu {
  ma: string;
  tenMau: string;
  duAn: string;
  /** Hộ, đợt áp dụng (mô tả ngắn) */
  phamVi: string;
  so: string;
  /** ISO */
  ngayKy: string;
  canCu: string[];
  thamQuyen?: string;
  canhBao: string[];
  nguoiLap: string;
  /** ISO thời điểm lập phiếu */
  luc: string;
}

const vn = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

export function taiLieuPhieuKiemTra(p: ThongTinPhieu): TaiLieu {
  return {
    tieuDe: `Phiếu kiểm tra văn bản ${p.ma}`,
    khoi: [
      { loai: "tieu-de", chu: "PHIẾU KIỂM TRA VĂN BẢN TRƯỚC KHI KÝ", cap: 1 },
      { loai: "doan", chu: [{ t: "(Phần mềm GPMB Sơn La lập tự động — chỉ liệt kê điểm cần xem; không thay việc kiểm tra của người có thẩm quyền)", nghieng: true }], canh: "giua" },
      {
        loai: "bang",
        cot: [{ ten: "Mục", rong: 28 }, { ten: "Nội dung", rong: 72 }],
        dong: [
          { o: ["Văn bản", `${p.ma} – ${p.tenMau}`] },
          { o: ["Dự án", p.duAn] },
          { o: ["Phạm vi", p.phamVi || "—"] },
          { o: ["Số, ngày ký", `${p.so.trim() || "(chưa ghi số)"}${p.ngayKy ? ` · ${vn(p.ngayKy)}` : " · (chưa ghi ngày ký)"}`] },
          { o: ["Thẩm quyền", p.thamQuyen || "Theo quy định (mẫu không thuộc nhiệm vụ phân cấp đang theo dõi)"] },
        ],
      },
      { loai: "tieu-de", chu: `1. Điểm cần xem (${p.canhBao.length})`, cap: 2 },
      p.canhBao.length
        ? { loai: "bang", cot: [{ ten: "TT", rong: 6 }, { ten: "Nội dung phần mềm phát hiện", rong: 64 }, { ten: "Ý kiến xử lý", rong: 30 }], dong: p.canhBao.map((c, i) => ({ o: [String(i + 1), c, ""] })) }
        : { loai: "doan", chu: ["Phần mềm không phát hiện điểm cần xem (đã kiểm: cơ quan ban hành, căn cứ đã sửa đổi, hiệu lực văn bản phân cấp, số đã cấp, số tiền bằng chữ, trường bắt buộc của mẫu)."] },
      { loai: "tieu-de", chu: `2. Căn cứ in trong văn bản (${p.canCu.length})`, cap: 2 },
      ...(p.canCu.length ? p.canCu.map((c): TaiLieu["khoi"][number] => ({ loai: "doan", chu: [`– ${c}`] })) : [{ loai: "doan" as const, chu: ["(Mẫu không có phần căn cứ)"] }]),
      { loai: "doan", chu: [{ t: `Lập lúc ${new Date(p.luc).toLocaleString("vi-VN")}${p.nguoiLap ? ` — ${p.nguoiLap}` : ""}.`, nghieng: true }], truoc: 6 },
      {
        loai: "bang",
        cot: [{ ten: "NGƯỜI SOẠN THẢO", rong: 50 }, { ten: "NGƯỜI KIỂM TRA", rong: 50 }],
        dong: [{ o: ["\n\n\n", "\n\n\n"] }],
      },
    ],
  };
}

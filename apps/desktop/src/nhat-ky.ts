/**
 * Nhật ký hệ thống: ghi nối tiếp, mỗi dòng mang mã băm SHA-256 của dòng trước (chuỗi băm).
 * Sửa hoặc xóa một dòng ở giữa làm đứt chuỗi → phát hiện được khi kiểm tra. Không ngăn được việc xóa
 * toàn bộ cơ sở dữ liệu ngoài phần mềm (nêu rõ ở docs/09).
 */
export interface DongNhatKy {
  stt: number;
  luc: string;
  nguoi: string;
  hoTen: string;
  hanhDong: string;
  chiTiet: string;
  bamTruoc: string;
  bam: string;
}

export const GOC = "0".repeat(64);

async function sha256(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

const noiDung = (d: Omit<DongNhatKy, "bam">) => JSON.stringify([d.stt, d.luc, d.nguoi, d.hoTen, d.hanhDong, d.chiTiet, d.bamTruoc]);

export async function taoDong(truoc: DongNhatKy | null, e: { nguoi: string; hoTen: string; hanhDong: string; chiTiet?: string; luc?: string }): Promise<DongNhatKy> {
  const d = { stt: (truoc?.stt ?? 0) + 1, luc: e.luc ?? new Date().toISOString(), nguoi: e.nguoi, hoTen: e.hoTen, hanhDong: e.hanhDong, chiTiet: e.chiTiet ?? "", bamTruoc: truoc?.bam ?? GOC };
  return { ...d, bam: await sha256(noiDung(d)) };
}

/** Kiểm tra chuỗi: trả về số thứ tự dòng đầu tiên bị sai (null = nguyên vẹn). */
export async function kiemTraChuoi(ds: DongNhatKy[]): Promise<{ stt: number; lyDo: string } | null> {
  const x = [...ds].sort((a, b) => a.stt - b.stt);
  let truoc = GOC;
  for (let i = 0; i < x.length; i++) {
    const d = x[i]!;
    if (d.stt !== i + 1) return { stt: d.stt, lyDo: `thiếu dòng trước dòng ${d.stt}` };
    if (d.bamTruoc !== truoc) return { stt: d.stt, lyDo: "không nối với dòng trước" };
    if ((await sha256(noiDung(d))) !== d.bam) return { stt: d.stt, lyDo: "nội dung đã bị sửa" };
    truoc = d.bam;
  }
  return null;
}

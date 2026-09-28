/**
 * Lưu tệp xuất ra máy — MỌI nút xuất tệp (Excel, Word, zip, sao lưu, .txt) đều đi qua hàm này.
 * - Mặc định hỏi nơi lưu: vỏ desktop (Tauri/WebView2) mở hộp thoại "Lưu thành" của Windows (lệnh Rust
 *   `luu_tep_chon_noi`), mở sẵn thư mục lần lưu trước; trình duyệt dùng `showSaveFilePicker` nếu có.
 * - Tắt "Hỏi nơi lưu" (Cài đặt chung): lưu thẳng vào Downloads và mở Explorer chọn sẵn tệp (`luu_tai_xuong`).
 * Trả về đường dẫn đã lưu; `null` khi người dùng bấm Hủy ở hộp thoại (nút gọi không báo "đã xuất").
 * Thành công phát sự kiện "gpmb-da-tai" (thông báo đường dẫn); lỗi ném ra để nút gọi báo cho người dùng.
 */

const KHOA_HOI = "gpmb-hoi-noi-luu";
const KHOA_THU_MUC = "gpmb-thu-muc-luu-cuoi";

/** Có hỏi nơi lưu mỗi lần xuất tệp không (mặc định có). Cài đặt theo máy. */
export function hoiNoiLuu(): boolean {
  try {
    return localStorage.getItem(KHOA_HOI) !== "0";
  } catch {
    return true;
  }
}
export function datHoiNoiLuu(co: boolean) {
  try {
    localStorage.setItem(KHOA_HOI, co ? "1" : "0");
  } catch {
    /* trình duyệt chặn lưu trữ: giữ mặc định */
  }
}
function thuMucCuoi(): string {
  try {
    return localStorage.getItem(KHOA_THU_MUC) ?? "";
  } catch {
    return "";
  }
}
function ghiThuMucCuoi(duongDan: string) {
  const i = Math.max(duongDan.lastIndexOf("\\"), duongDan.lastIndexOf("/"));
  if (i <= 0) return;
  try {
    localStorage.setItem(KHOA_THU_MUC, duongDan.slice(0, i));
  } catch {
    /* bỏ qua */
  }
}

const LOAI_TEP: Record<string, string> = {
  xlsx: "Bảng tính Excel",
  docx: "Văn bản Word",
  zip: "Tệp nén",
  gpmb: "Bản sao lưu GPMB",
  txt: "Văn bản thuần",
  pdf: "Tệp PDF",
};
const duoiTep = (ten: string) => (/\.([a-z0-9]+)$/i.exec(ten)?.[1] ?? "").toLowerCase();

const baoDaLuu = (noi: string) => window.dispatchEvent(new CustomEvent("gpmb-da-tai", { detail: noi }));

export async function taiXuong(bytes: Uint8Array, ten: string, loai: string): Promise<string | null> {
  const hoi = hoiNoiLuu();
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    if (hoi) {
      const duoi = duoiTep(ten);
      const duongDan = await invoke<string | null>("luu_tep_chon_noi", bytes as never, {
        headers: { "ten-tep": encodeURIComponent(ten), "thu-muc": encodeURIComponent(thuMucCuoi()), "loai-tep": encodeURIComponent(LOAI_TEP[duoi] ?? "Tệp") },
      });
      if (!duongDan) return null;
      ghiThuMucCuoi(duongDan);
      baoDaLuu(duongDan);
      return duongDan;
    }
    try {
      const duongDan = await invoke<string>("luu_tai_xuong", bytes as never, { headers: { "ten-tep": encodeURIComponent(ten) } });
      baoDaLuu(duongDan);
      return duongDan;
    } catch (e) {
      console.error("luu_tai_xuong", e);
      taiBangLienKet(bytes, ten, loai);
      baoDaLuu(`thư mục Downloads (${ten})`);
      return ten;
    }
  }
  // Trình duyệt (bản thử giao diện): hộp thoại lưu của trình duyệt nếu hỗ trợ
  const w = window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<{ name: string; createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
  if (hoi && typeof w.showSaveFilePicker === "function") {
    const duoi = duoiTep(ten);
    let tep;
    try {
      tep = await w.showSaveFilePicker({
        suggestedName: ten,
        types: duoi ? [{ description: LOAI_TEP[duoi] ?? "Tệp", accept: { [loai.split(";")[0]!]: [`.${duoi}`] } }] : undefined,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return null;
      throw e;
    }
    const ghi = await tep.createWritable();
    await ghi.write(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: loai }));
    await ghi.close();
    baoDaLuu(tep.name);
    return tep.name;
  }
  taiBangLienKet(bytes, ten, loai);
  return ten;
}

function taiBangLienKet(bytes: Uint8Array, ten: string, loai: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: loai }));
  a.download = ten;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

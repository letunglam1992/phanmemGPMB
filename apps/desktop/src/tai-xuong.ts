/**
 * Tải tệp về máy — MỌI nút xuất tệp (Excel, Word, zip, sao lưu, .txt) đều đi qua hàm này.
 * - Vỏ desktop (Tauri/WebView2): gọi lệnh Rust `luu_tai_xuong` ghi vào thư mục Downloads và mở Explorer chọn
 *   sẵn tệp. Lệnh lỗi → dự phòng bằng liên kết tải (vỏ Rust có trình xử lý tải xuống, cũng lưu vào Downloads).
 * - Trình duyệt: liên kết tải (neo phải gắn vào DOM trước khi click để nhận tên tệp).
 * Thành công phát sự kiện "gpmb-da-tai" (thông báo đường dẫn); thất bại ném lỗi để nút gọi báo cho người dùng.
 */
export async function taiXuong(bytes: Uint8Array, ten: string, loai: string): Promise<string> {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const duongDan = await invoke<string>("luu_tai_xuong", bytes as never, { headers: { "ten-tep": encodeURIComponent(ten) } });
      window.dispatchEvent(new CustomEvent("gpmb-da-tai", { detail: duongDan }));
      return duongDan;
    } catch (e) {
      console.error("luu_tai_xuong", e);
      taiBangLienKet(bytes, ten, loai);
      window.dispatchEvent(new CustomEvent("gpmb-da-tai", { detail: `thư mục Downloads (${ten})` }));
      return ten;
    }
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

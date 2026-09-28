/**
 * Tải tệp về máy.
 * - Vỏ desktop (Tauri/WebView2): WebView2 không tự lưu liên kết blob → gọi lệnh Rust `luu_tai_xuong` ghi vào
 *   thư mục Downloads và mở Explorer chọn sẵn tệp. Lỗi → thông báo.
 * - Trình duyệt: neo tải về (neo phải gắn vào DOM trước khi click để nhận tên tệp).
 */
export async function taiXuong(bytes: Uint8Array, ten: string, loai: string): Promise<string | null> {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const duongDan = await invoke<string>("luu_tai_xuong", bytes as never, { headers: { "ten-tep": encodeURIComponent(ten) } });
      window.dispatchEvent(new CustomEvent("gpmb-da-tai", { detail: duongDan }));
      return duongDan;
    } catch (e) {
      window.alert(`Không lưu được tệp "${ten}": ${String((e as Error)?.message ?? e)}`);
      return null;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: loai }));
  a.download = ten;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return ten;
}

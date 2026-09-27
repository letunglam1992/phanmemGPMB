/** Tải tệp về máy (trình duyệt/WebView). Neo phải gắn vào DOM trước khi click để WebView nhận tên tệp. */
export function taiXuong(bytes: Uint8Array, ten: string, loai: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: loai }));
  a.download = ten;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Tên tệp an toàn: bỏ dấu tiếng Việt (một số trình duyệt/WebView đổi tên có dấu thành "download"). */
export function tenTep(s: string, dai = 90): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[\\/:*?"<>|–—]/g, "-")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, dai);
}

import { useEffect, type RefObject } from "react";

/**
 * 1.0.9 — Ô thả xuống (Tệp đã xuất, Thông báo, menu tài khoản): bấm chuột ra ngoài vùng `ref` hoặc nhấn Esc thì đóng.
 * Bấm vào nút mở của một ô khác cũng là "bấm ra ngoài" nên chỉ một ô mở tại một thời điểm.
 */
export function useDongKhiBamNgoai(ref: RefObject<HTMLElement | null>, mo: boolean, dong: () => void) {
  useEffect(() => {
    if (!mo) return;
    const bam = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) dong();
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    document.addEventListener("pointerdown", bam, true);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("pointerdown", bam, true);
      document.removeEventListener("keydown", phim);
    };
  }, [ref, mo, dong]);
}

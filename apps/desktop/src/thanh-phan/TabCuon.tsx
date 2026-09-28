import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Dải tab cuộn ngang (P1-7): khi không đủ chỗ (laptop 1366×768), hiện mũi tên ‹ › ở hai đầu thay vì cắt mất tab;
 * tab đang chọn luôn được cuộn vào vùng nhìn thấy. Phím ← → giữa các tab vẫn do BanPhim xử lý.
 */
export function TabCuon({ className = "tab tab-bt", children, chon }: { className?: string; children: ReactNode; chon?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mep, setMep] = useState({ trai: false, phai: false });
  const doLai = useCallback(() => {
    const e = ref.current;
    if (!e) return;
    setMep({ trai: e.scrollLeft > 2, phai: e.scrollLeft + e.clientWidth < e.scrollWidth - 2 });
  }, []);
  useLayoutEffect(() => {
    const e = ref.current;
    if (!e) return;
    doLai();
    const ro = new ResizeObserver(doLai);
    ro.observe(e);
    e.addEventListener("scroll", doLai, { passive: true });
    return () => {
      ro.disconnect();
      e.removeEventListener("scroll", doLai);
    };
  }, [doLai]);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [chon]);
  const cuon = (huong: number) => ref.current?.scrollBy({ left: huong * Math.max(160, (ref.current?.clientWidth ?? 0) * 0.6), behavior: "smooth" });
  return (
    <div className="tab-cuon">
      {mep.trai && <button type="button" className="tab-mui-ten trai" tabIndex={-1} aria-label="Các tab bên trái" onClick={() => cuon(-1)}>‹</button>}
      <div ref={ref} className={className} role="tablist">{children}</div>
      {mep.phai && <button type="button" className="tab-mui-ten phai" tabIndex={-1} aria-label="Các tab bên phải" onClick={() => cuon(1)}>›</button>}
    </div>
  );
}

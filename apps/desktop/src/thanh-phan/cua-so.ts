import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Ảo hóa bảng dài (P2-3): chỉ dựng các dòng nằm trong vùng nhìn thấy (cộng vùng đệm) của khung cuộn gần nhất;
 * phần trên/dưới thay bằng một dòng đệm có chiều cao tương ứng. Dòng cao thấp khác nhau (mỗi thửa một dòng con)
 * được đo sau khi dựng; dòng chưa dựng ước theo chiều cao trung bình đã đo.
 * Danh sách ngắn (≤ `nguong`) dựng toàn bộ như cũ.
 */
export function useCuaSo(khoa: string[], nguong = 300, dem = 15) {
  const bang = useRef<HTMLElement | null>(null);
  const cao = useRef(new Map<string, number>());
  const [vung, setVung] = useState<{ dau: number; cuoi: number }>({ dau: 0, cuoi: Math.min(khoa.length, 60) });
  const bat = khoa.length > nguong;

  const tinh = useCallback(() => {
    const e = bang.current;
    if (!e || !bat) return;
    const cuon = khungCuon(e);
    const tb = trungBinh(cao.current);
    const top = cuon === window ? -e.getBoundingClientRect().top : (cuon as HTMLElement).getBoundingClientRect().top - e.getBoundingClientRect().top;
    const hNhin = cuon === window ? window.innerHeight : (cuon as HTMLElement).clientHeight;
    let y = 0;
    let dau = 0;
    while (dau < khoa.length && y + (cao.current.get(khoa[dau]!) ?? tb) < top) y += cao.current.get(khoa[dau++]!) ?? tb;
    let cuoi = dau;
    while (cuoi < khoa.length && y < top + hNhin) y += cao.current.get(khoa[cuoi++]!) ?? tb;
    const moi = { dau: Math.max(0, dau - dem), cuoi: Math.min(khoa.length, cuoi + dem) };
    setVung((v) => (v.dau === moi.dau && v.cuoi === moi.cuoi ? v : moi));
  }, [khoa, bat, dem]);

  useLayoutEffect(() => {
    tinh();
  }, [tinh]);
  useEffect(() => {
    const e = bang.current;
    if (!e || !bat) return;
    const cuon = khungCuon(e);
    const f = () => tinh();
    cuon.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => {
      cuon.removeEventListener("scroll", f);
      window.removeEventListener("resize", f);
    };
  }, [tinh, bat]);

  /** Gắn vào mỗi dòng dựng ra để đo chiều cao thật. */
  const do_ = useCallback((k: string) => (el: HTMLElement | null) => {
    if (el) cao.current.set(k, el.getBoundingClientRect().height || 0);
  }, []);

  if (!bat) return { bat, dau: 0, cuoi: khoa.length, dem_tren: 0, dem_duoi: 0, bang, do_ };
  const tb = trungBinh(cao.current);
  const h = (i: number) => cao.current.get(khoa[i]!) ?? tb;
  let tren = 0;
  for (let i = 0; i < vung.dau; i++) tren += h(i);
  let duoi = 0;
  for (let i = Math.min(vung.cuoi, khoa.length); i < khoa.length; i++) duoi += h(i);
  return { bat, dau: vung.dau, cuoi: Math.min(vung.cuoi, khoa.length), dem_tren: tren, dem_duoi: duoi, bang, do_ };
}

function trungBinh(m: Map<string, number>) {
  if (!m.size) return 64;
  let s = 0;
  for (const v of m.values()) s += v;
  return s / m.size || 64;
}

function khungCuon(e: HTMLElement): HTMLElement | Window {
  for (let p = e.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
}

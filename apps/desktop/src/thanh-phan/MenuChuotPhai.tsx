import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUngDung } from "../ung-dung";
import { taiXuong } from "../tai-xuong";
import { soTuChuVN } from "../kiem-tra-pa";

/**
 * Menu chuột phải dùng chung toàn phần mềm (thay menu mặc định của WebView2: Back/Refresh/Print… không hợp phần mềm).
 * Mục theo ngữ cảnh chỗ bấm:
 * - ô nhập: hoàn tác, cắt, sao chép, dán, chọn tất cả, xóa nội dung;
 * - chữ đang chọn: sao chép, tìm hồ sơ/dự án, tra cứu đơn giá theo chữ đó;
 * - dòng hồ sơ (`data-ho-id`, `data-du-an-id`): mở hồ sơ ở từng thẻ, sao chép mã – tên;
 * - dự án (`data-du-an-id`): mở dự án, danh sách hộ, bản đồ, văn bản;
 * - bảng (`table.bang`): sao chép dòng, sao chép cả bảng (dán vào Excel), xuất bảng ra Excel;
 * - chung: quay lại, tìm kiếm nhanh, tra cứu, kiểm tra phương án, sao lưu, sáng/tối, hướng dẫn.
 * Shift + chuột phải: menu gốc của trình duyệt (khi cần kiểm tra chính tả…).
 */

interface Muc {
  nhan: string;
  phim?: string;
  lam: () => void | Promise<void>;
  tat?: boolean;
  nguy?: boolean;
}
type Nhom = { ten?: string; muc: Muc[] };

type ONhap = HTMLInputElement | HTMLTextAreaElement;
const laONhap = (el: Element | null): el is ONhap =>
  !!el && (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && /^(text|search|number|tel|email|url|password|date|)$/.test(el.type)));

// Ô tiêu đề: chữ gốc (innerText trả chữ đã viết hoa theo CSS); ô dữ liệu: innerText để giữ ranh giới các dòng trong ô
const chuO = (el: Element) => ((el.tagName === "TH" ? el.textContent : (el as HTMLElement).innerText) ?? "").replace(/\s*\n\s*/g, " ").replace(/\t/g, " ").trim();
const dongTsv = (tr: HTMLTableRowElement) => [...tr.cells].map(chuO).join("\t");
const bangTsv = (t: HTMLTableElement) => [...t.rows].map(dongTsv).join("\r\n");
const ngan = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

async function saoChep(s: string) {
  try {
    await navigator.clipboard.writeText(s);
  } catch {
    // Dự phòng khi không có quyền bộ nhớ tạm
    const t = document.createElement("textarea");
    t.value = s;
    t.style.position = "fixed";
    t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
}

/** Chèn chữ vào ô nhập đang điều khiển bởi React (giữ được Hoàn tác, phát sự kiện input). */
function chenChu(el: ONhap, s: string) {
  el.focus();
  if (document.execCommand("insertText", false, s)) return;
  const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  const dat = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  dat.call(el, el.value.slice(0, a) + s + el.value.slice(b));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function xuatBang(t: HTMLTableElement, tieuDe: string) {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Bảng");
  ws.addRow([tieuDe]).font = { bold: true, size: 13 };
  ws.addRow([`Xuất lúc ${new Date().toLocaleString("vi-VN")}`]);
  ws.addRow([]);
  for (const tr of t.rows) {
    const laDau = tr.parentElement?.tagName === "THEAD";
    const r = ws.addRow([...tr.cells].map((c) => {
      const s = chuO(c);
      const n = laDau ? s : soTuChuVN(s);
      return typeof n === "number" && /^[-\d.,\s]+$/.test(s) ? n : s;
    }));
    if (laDau) r.font = { bold: true };
  }
  for (let c = 1; c <= ws.actualColumnCount; c++) ws.getColumn(c).width = 16;
  const ten = `${tieuDe.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "bang"}.xlsx`;
  await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), ten, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function MenuChuotPhai({ laToi, doiGiaoDien }: { laToi: boolean; doiGiaoDien: () => void }) {
  const { di, quayLai, coTheQuayLai, moSaoLuu, quyen, dsDuAn, hoCua, bao } = useUngDung();
  const [menu, setMenu] = useState<{ x: number; y: number; nhom: Nhom[] } | null>(null);
  const [chon, setChon] = useState(-1);
  const hop = useRef<HTMLDivElement>(null);
  const moLuc = useRef(0);
  const [viTri, setViTri] = useState<{ left: number; top: number } | null>(null);

  // Dựng danh sách mục theo chỗ bấm
  const dung = (e: MouseEvent): Nhom[] => {
    const dich = e.target as Element;
    const nhom: Nhom[] = [];
    const o = dich.closest("input, textarea");
    const chuChon = (window.getSelection()?.toString() ?? "").trim();

    if (laONhap(o) && !o.disabled) {
      const coChon = (o.selectionEnd ?? 0) > (o.selectionStart ?? 0);
      const doc = o.readOnly;
      const chu = coChon ? o.value.slice(o.selectionStart!, o.selectionEnd!) : "";
      nhom.push({
        ten: "Ô nhập",
        muc: [
          { nhan: "Hoàn tác", phim: "Ctrl+Z", tat: doc, lam: () => { o.focus(); document.execCommand("undo"); } },
          { nhan: "Cắt", phim: "Ctrl+X", tat: doc || !coChon, lam: async () => { await saoChep(chu); o.focus(); document.execCommand("delete"); } },
          { nhan: "Sao chép", phim: "Ctrl+C", tat: !coChon || o.type === "password", lam: () => saoChep(chu) },
          {
            nhan: "Dán",
            phim: "Ctrl+V",
            tat: doc,
            lam: async () => {
              try {
                chenChu(o, await navigator.clipboard.readText());
              } catch {
                bao("Không đọc được bộ nhớ tạm — dùng Ctrl+V", "loi");
              }
            },
          },
          { nhan: "Chọn tất cả", phim: "Ctrl+A", lam: () => { o.focus(); o.select(); } },
          { nhan: "Xóa nội dung ô", tat: doc || !o.value, nguy: true, lam: () => { o.focus(); o.select(); document.execCommand("delete"); } },
        ],
      });
    } else if (chuChon) {
      nhom.push({
        ten: "Chữ đang chọn",
        muc: [
          { nhan: `Sao chép “${ngan(chuChon)}”`, phim: "Ctrl+C", lam: () => saoChep(chuChon) },
          { nhan: `Tìm hồ sơ, dự án: “${ngan(chuChon)}”`, lam: () => void window.dispatchEvent(new CustomEvent("gpmb-tim", { detail: chuChon })) },
          { nhan: `Tra cứu đơn giá, giá đất: “${ngan(chuChon)}”`, lam: () => di({ ten: "tra-cuu", tim: chuChon }) },
        ],
      });
    }

    const phanHo = dich.closest<HTMLElement>("[data-ho-id]");
    const phanDa = dich.closest<HTMLElement>("[data-du-an-id]");
    if (phanHo?.dataset.hoId && phanHo.dataset.duAnId) {
      const hoId = phanHo.dataset.hoId, duAnId = phanHo.dataset.duAnId;
      const h = hoCua(duAnId).find((x) => x.id === hoId);
      const mo = (tab?: string) => () => di({ ten: "ho", duAnId, hoId, tab });
      nhom.push({
        ten: h ? `Hồ sơ ${h.ma} – ${ngan(h.ten, 24)}` : "Hồ sơ",
        muc: [
          { nhan: "Mở hồ sơ", lam: mo() },
          { nhan: "Thửa đất", lam: mo("thua") },
          { nhan: "Kiểm đếm tài sản", lam: mo("kiem-dem") },
          { nhan: "Tính toán, giải trình", lam: mo("tinh") },
          { nhan: "Tiến độ", lam: mo("tien-do") },
          { nhan: "Chi trả", lam: mo("chi-tra") },
          { nhan: "Văn bản của hộ", lam: mo("van-ban") },
          { nhan: "Sao chép mã – họ tên", tat: !h, lam: () => saoChep(`${h!.ma} – ${h!.ten}`) },
        ],
      });
    } else if (phanDa?.dataset.duAnId) {
      const duAnId = phanDa.dataset.duAnId;
      const d = dsDuAn.find((x) => x.id === duAnId);
      nhom.push({
        ten: d ? `Dự án: ${ngan(d.ten, 30)}` : "Dự án",
        muc: [
          { nhan: "Mở dự án", lam: () => di({ ten: "du-an", duAnId }) },
          { nhan: "Hộ, cá nhân, tổ chức", lam: () => di({ ten: "du-an", duAnId, tab: "ho" }) },
          { nhan: "Bản đồ", lam: () => di({ ten: "du-an", duAnId, tab: "ban-do" }) },
          { nhan: "Văn bản", lam: () => di({ ten: "du-an", duAnId, tab: "van-ban" }) },
          { nhan: "Sao chép tên dự án", tat: !d, lam: () => saoChep(d!.ten) },
        ],
      });
    }

    const bang = dich.closest<HTMLTableElement>("table.bang");
    if (bang && !laONhap(o)) {
      const tr = dich.closest<HTMLTableRowElement>("tr");
      const tieuDe = document.querySelector(".trang h1")?.textContent?.trim() || "Bảng";
      nhom.push({
        ten: "Bảng",
        muc: [
          { nhan: "Sao chép dòng này", tat: !tr, lam: () => saoChep(dongTsv(tr!)) },
          { nhan: "Sao chép cả bảng (dán vào Excel)", lam: async () => { await saoChep(bangTsv(bang)); bao(`Đã sao chép ${bang.rows.length} dòng — dán vào Excel bằng Ctrl+V`); } },
          { nhan: "Xuất bảng ra Excel…", lam: () => xuatBang(bang, tieuDe) },
        ],
      });
    }

    nhom.push({
      ten: "Chung",
      muc: [
        { nhan: "Quay lại", phim: "Alt+←", tat: !coTheQuayLai, lam: quayLai },
        { nhan: "Tìm kiếm nhanh", phim: "Ctrl+K", lam: () => void window.dispatchEvent(new CustomEvent("gpmb-tim", { detail: "" })) },
        { nhan: "Tổng quan", lam: () => di({ ten: "tong-quan" }) },
        { nhan: "Tra cứu đơn giá, giá đất", lam: () => di({ ten: "tra-cuu" }) },
        { nhan: "Kiểm tra phương án (Excel, Word)", lam: () => di({ ten: "kiem-tra-pa" }) },
        { nhan: "Sao lưu, khôi phục", tat: !(quyen("SAO_LUU") || quyen("KHOI_PHUC")), lam: () => moSaoLuu(true) },
        { nhan: laToi ? "Giao diện sáng" : "Giao diện tối", lam: doiGiaoDien },
        { nhan: "Hướng dẫn sử dụng", lam: () => di({ ten: "huong-dan" }) },
        { nhan: "Phím tắt", phim: "F1", lam: () => void window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" })) },
      ],
    });
    return nhom;
  };
  const dungRef = useRef(dung);
  dungRef.current = dung;

  useEffect(() => {
    const mo = (e: MouseEvent) => {
      if (e.shiftKey) return; // menu gốc
      // Vùng tự xử lý chuột phải (đánh dấu data-menu-rieng)
      if ((e.target as Element).closest("[data-menu-rieng]")) return;
      e.preventDefault();
      moLuc.current = performance.now();
      // Mở bằng bàn phím (Shift + F10, phím Menu): đặt menu tại phần tử đang chọn
      let { clientX: x, clientY: y } = e;
      if (x === 0 && y === 0 && document.activeElement && document.activeElement !== document.body) {
        const r = document.activeElement.getBoundingClientRect();
        x = r.left + Math.min(24, r.width / 2);
        y = r.top + Math.min(r.height, 28);
      }
      setMenu({ x, y, nhom: dungRef.current(e) });
      setChon(0);
      setViTri(null);
    };
    window.addEventListener("contextmenu", mo);
    return () => window.removeEventListener("contextmenu", mo);
  }, []);

  const tat = menu ? menu.nhom.flatMap((n) => n.muc) : [];
  const dong = () => setMenu(null);
  const chay = (m: Muc) => {
    if (m.tat) return;
    dong();
    void Promise.resolve(m.lam()).catch((e) => bao(`Không thực hiện được: ${(e as Error).message}`, "loi"));
  };

  useEffect(() => {
    if (!menu) return;
    const ngoai = (e: MouseEvent) => !hop.current?.contains(e.target as Node) && dong();
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); return dong(); }
      const bat = tat.map((m, i) => (m.tat ? -1 : i)).filter((i) => i >= 0);
      if (!bat.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const k = bat.indexOf(chon);
        setChon(e.key === "ArrowDown" ? bat[(k + 1) % bat.length]! : bat[(k - 1 + bat.length) % bat.length]!);
      } else if (e.key === "Enter" && chon >= 0) {
        e.preventDefault();
        chay(tat[chon]!);
      }
    };
    // Cuộn trang đóng menu — bỏ qua cuộn trễ ngay sau khi mở (cuộn tới phần tử vừa bấm)
    const cuon = () => performance.now() - moLuc.current > 200 && dong();
    window.addEventListener("mousedown", ngoai, true);
    window.addEventListener("keydown", phim, true);
    window.addEventListener("resize", dong);
    window.addEventListener("blur", dong);
    document.addEventListener("scroll", cuon, true);
    return () => {
      window.removeEventListener("mousedown", ngoai, true);
      window.removeEventListener("keydown", phim, true);
      window.removeEventListener("resize", dong);
      window.removeEventListener("blur", dong);
      document.removeEventListener("scroll", cuon, true);
    };
  });

  // Giữ menu trong cửa sổ
  useLayoutEffect(() => {
    if (!menu || !hop.current) return;
    const r = hop.current.getBoundingClientRect();
    setViTri({ left: Math.max(4, Math.min(menu.x, window.innerWidth - r.width - 4)), top: Math.max(4, Math.min(menu.y, window.innerHeight - r.height - 4)) });
  }, [menu]);

  if (!menu) return null;
  let i = -1;
  return (
    <div
      ref={hop}
      className="menu-tha menu-chuot-phai"
      role="menu"
      style={{ position: "fixed", left: viTri?.left ?? menu.x, top: viTri?.top ?? menu.y, right: "auto", visibility: viTri ? "visible" : "hidden" }}
      onMouseDown={(e) => e.preventDefault() /* giữ tiêu điểm, vùng chọn của ô nhập */}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.nhom.map((n, k) => (
        <div key={k}>
          {k > 0 && <div className="menu-vach" />}
          {n.ten && <div className="menu-nhan">{n.ten}</div>}
          {n.muc.map((m) => {
            i++;
            const so = i;
            return (
              <button key={so} role="menuitem" disabled={m.tat} className={`${chon === so ? "dang-chon" : ""} ${m.nguy ? "nut-nguy" : ""}`} onMouseEnter={() => setChon(so)} onClick={() => chay(m)}>
                <span style={{ flex: 1 }}>{m.nhan}</span>
                {m.phim && <span className="menu-phim">{m.phim}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="menu-vach" />
      <div className="menu-goi-y">Shift + chuột phải: menu gốc</div>
    </div>
  );
}

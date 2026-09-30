import { useEffect, useState } from "react";
import { HopThoai } from "./chung";

/**
 * Thao tác bằng bàn phím trên toàn phần mềm (bổ sung cho chuột):
 * - thẻ (tab): ← → Home End chuyển và mở thẻ; Ctrl + PgDn / PgUp: thẻ kế tiếp / trước của màn đang mở;
 * - dòng bảng bấm được (`tr.co-the-chon`): ↑ ↓ Home End di chuyển, Enter / Space mở; bảng chọn chi tiết
 *   (`data-phim-chon`) thì di chuyển là chọn luôn;
 * - ô nhập trong bảng: Enter / Shift + Enter xuống / lên ô cùng cột; ← → ở đầu / cuối ô sang ô trước / sau;
 * - Ctrl + S lưu, Ctrl + Enter lưu và tiếp (hồ sơ), Esc đóng hộp thoại, F5 nạp lại dữ liệu (không tải lại trang),
 *   Alt + 1…6 chuyển màn, F1 bảng phím tắt; Alt + ← quay lại, Ctrl + K tìm kiếm (đã có ở UngDung, TimKiem).
 * Không can thiệp khi thành phần đã tự xử lý phím (defaultPrevented) hoặc đang gõ bộ gõ (isComposing).
 */

export interface MucPhim {
  phim: string;
  ten: string;
  bam: () => void;
}

const hienThi = (el: Element) => (el as HTMLElement).offsetParent !== null || (el as HTMLElement).getClientRects().length > 0;
const vungHienTai = (): ParentNode => {
  const hop = [...document.querySelectorAll(".nen-mo .hop-thoai")];
  return hop[hop.length - 1] ?? document.querySelector("main") ?? document;
};
const TAB = '[role="tablist"], .tab, .tc-tab';
const dsTab = (ds: Element) => [...ds.querySelectorAll<HTMLButtonElement>(":scope > button")].filter((b) => !b.disabled && hienThi(b));
const laTabChon = (b: Element) => b.getAttribute("aria-selected") === "true" || b.classList.contains("chon");

function oNhapTrong(td: Element | null | undefined): HTMLElement | null {
  return td?.querySelector<HTMLElement>("input:not([type=checkbox]):not([type=radio]):not(:disabled), select:not(:disabled), textarea:not(:disabled)") ?? null;
}
function denO(el: HTMLElement | null) {
  if (!el) return false;
  el.focus();
  if (el instanceof HTMLInputElement && /^(text|search|)$/.test(el.type)) el.select();
  return true;
}

function nutLuu(vung: ParentNode, loai: "luu" | "luu-tiep"): HTMLButtonElement | null {
  const nut = [...vung.querySelectorAll<HTMLButtonElement>("button")].filter((b) => !b.disabled && hienThi(b));
  const ganNhan = nut.find((b) => b.dataset.phim === loai);
  if (ganNhan || loai === "luu-tiep") return ganNhan ?? null;
  const ungVien = nut.filter((b) => /^Lưu(\s|$)/.test((b.textContent ?? "").trim()) && !/^Lưu và/.test((b.textContent ?? "").trim()));
  return ungVien.find((b) => b.classList.contains("nut-chinh")) ?? (ungVien.length === 1 ? ungVien[0]! : null);
}

export function BanPhim({ diMuc, napLai, bao }: { diMuc: MucPhim[]; napLai: () => Promise<void>; bao: (s: string, loai?: "ok" | "loi") => void }) {
  const [hopPhim, setHopPhim] = useState(false);

  // Dòng bảng bấm được nhận tiêu điểm bằng Tab / chuột để dùng phím mũi tên
  useEffect(() => {
    const gan = () => document.querySelectorAll("tr.co-the-chon:not([tabindex])").forEach((tr) => tr.setAttribute("tabindex", "0"));
    gan();
    let cho = 0;
    const qs = new MutationObserver(() => {
      if (cho) return;
      cho = requestAnimationFrame(() => {
        cho = 0;
        gan();
      });
    });
    qs.observe(document.body, { childList: true, subtree: true });
    return () => qs.disconnect();
  }, []);

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const el = document.activeElement as HTMLElement | null;
      const k = e.key;
      const ctrl = e.ctrlKey || e.metaKey;

      // ---- Phím tắt chung ----
      if (k === "F1") {
        e.preventDefault();
        return setHopPhim((x) => !x);
      }
      if (k === "F5" || (ctrl && k.toLowerCase() === "r")) {
        // Tải lại trang làm mất dữ liệu đang nhập chưa lưu → chỉ nạp lại dữ liệu
        e.preventDefault();
        void napLai().then(() => bao("Đã nạp lại dữ liệu"));
        return;
      }
      if (ctrl && k.toLowerCase() === "s") {
        e.preventDefault();
        const n = nutLuu(vungHienTai(), "luu");
        if (n) n.click();
        else bao("Màn này không có nút Lưu, hoặc chưa có thay đổi để lưu");
        return;
      }
      if (ctrl && k === "Enter") {
        const n = nutLuu(vungHienTai(), "luu-tiep");
        if (n) {
          e.preventDefault();
          n.click();
        }
        return;
      }
      if (k === "Escape") {
        const hop = [...document.querySelectorAll<HTMLElement>(".nen-mo .hop-thoai")].pop();
        if (hop) {
          e.preventDefault();
          hop.querySelector<HTMLButtonElement>('.the-dau button[aria-label="Đóng"]')?.click();
        }
        return;
      }
      if (e.altKey && !ctrl && /^[1-9]$/.test(k)) {
        const m = diMuc[Number(k) - 1];
        if (m) {
          e.preventDefault();
          m.bam();
        }
        return;
      }
      if (ctrl && (k === "PageDown" || k === "PageUp")) {
        const ds = [...vungHienTai().querySelectorAll(TAB)].find(hienThi);
        if (!ds) return;
        const nut = dsTab(ds);
        const i = nut.findIndex(laTabChon);
        const moi = nut[(i + (k === "PageDown" ? 1 : -1) + nut.length) % nut.length];
        if (moi) {
          e.preventDefault();
          moi.click();
          moi.focus();
        }
        return;
      }
      if (!el || e.altKey || ctrl) return;

      // ---- Thẻ: ← → Home End ----
      const dsThe = el.tagName === "BUTTON" ? el.parentElement?.closest(TAB) : null;
      if (dsThe && el.parentElement === dsThe && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(k)) {
        const nut = dsTab(dsThe);
        const i = nut.indexOf(el as HTMLButtonElement);
        const j = k === "Home" ? 0 : k === "End" ? nut.length - 1 : (i + (k === "ArrowRight" ? 1 : -1) + nut.length) % nut.length;
        e.preventDefault();
        nut[j]?.focus();
        nut[j]?.click();
        return;
      }

      // ---- Dòng bảng: ↑ ↓ Home End Enter Space ----
      if (el.tagName === "TR" && el.classList.contains("co-the-chon")) {
        const ds = [...(el.parentElement?.querySelectorAll<HTMLTableRowElement>(":scope > tr.co-the-chon") ?? [])].filter(hienThi);
        const i = ds.indexOf(el as HTMLTableRowElement);
        if (k === "Enter" || k === " ") {
          e.preventDefault();
          el.click();
          return;
        }
        const j = k === "ArrowDown" ? i + 1 : k === "ArrowUp" ? i - 1 : k === "Home" ? 0 : k === "End" ? ds.length - 1 : -2;
        if (j === -2) return;
        e.preventDefault();
        const moi = ds[Math.max(0, Math.min(ds.length - 1, j))];
        if (moi && moi !== el) {
          moi.focus();
          moi.scrollIntoView({ block: "nearest" });
          if (moi.hasAttribute("data-phim-chon")) moi.click(); // bảng chọn chi tiết: di chuyển là chọn
        }
        return;
      }

      // ---- Ô nhập trong bảng ----
      const td = el.closest("td");
      const bang = td?.closest("table.bang");
      if (!td || !bang || !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
      const tr = td.parentElement as HTMLTableRowElement;
      if (k === "Enter" && el instanceof HTMLInputElement) {
        // Xuống / lên ô cùng cột (như Excel)
        const hang = [...(tr.parentElement?.children ?? [])] as HTMLTableRowElement[];
        const i = hang.indexOf(tr);
        for (let j = i + (e.shiftKey ? -1 : 1); j >= 0 && j < hang.length; j += e.shiftKey ? -1 : 1) {
          if (denO(oNhapTrong(hang[j]!.cells[td.cellIndex]))) {
            e.preventDefault();
            return;
          }
        }
        return;
      }
      if ((k === "ArrowLeft" || k === "ArrowRight") && el instanceof HTMLInputElement) {
        let dau = false, cuoi = false;
        try {
          dau = el.selectionStart === 0 && el.selectionEnd === 0;
          cuoi = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
        } catch {
          return; // ô số: không có vị trí con trỏ, giữ nguyên phím
        }
        if ((k === "ArrowLeft" && !dau) || (k === "ArrowRight" && !cuoi)) return;
        const o = [...tr.cells].map(oNhapTrong).filter((x): x is HTMLElement => !!x);
        const i = o.indexOf(el);
        if (denO(o[i + (k === "ArrowRight" ? 1 : -1)] ?? null)) e.preventDefault();
      }
    };
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  }, [diMuc, napLai, bao]);

  if (!hopPhim) return null;
  return (
    <HopThoai tieuDe="Phím tắt" dong={() => setHopPhim(false)} rong={760}>
      <BangPhimTat diMuc={diMuc} />
    </HopThoai>
  );
}

export function BangPhimTat({ diMuc }: { diMuc: MucPhim[] }) {
  const nhom: [string, [string, string][]][] = [
    ["Chung", [
      ["F1", "Mở / đóng bảng phím tắt này"],
      ["Ctrl + K", "Tìm kiếm nhanh dự án, hồ sơ"],
      ["Alt + ←", "Quay lại màn trước"],
      ...diMuc.map((m): [string, string] => [`Alt + ${m.phim}`, m.ten]),
      ["F5", "Nạp lại dữ liệu (không tải lại trang, không mất dữ liệu đang nhập)"],
      ["Esc", "Đóng hộp thoại, menu, danh sách chọn"],
      ["Shift + F10 hoặc phím Menu", "Mở menu chuột phải tại chỗ đang chọn"],
    ]],
    ["Lưu", [
      ["Ctrl + S", "Lưu (hồ sơ, hộp thoại đang mở)"],
      ["Ctrl + Enter", "Lưu và sang thẻ tiếp theo (hồ sơ)"],
    ]],
    ["Hồ sơ hộ (nhập nhiều hộ)", [
      ["Alt + ↑", "Về danh sách hộ (giữ bộ lọc, vị trí cuộn; tô sáng hộ vừa làm)"],
      ["Alt + →", "Sang hộ tiếp theo theo danh sách đang lọc (chưa lưu thì hỏi lưu)"],
    ]],
    ["Thẻ (tab)", [
      ["← →", "Sang thẻ trước / sau (khi đang chọn một thẻ)"],
      ["Home / End", "Thẻ đầu / cuối"],
      ["Ctrl + PgDn / PgUp", "Thẻ kế tiếp / trước của màn đang mở"],
    ]],
    ["Bảng, danh sách", [
      ["Tab", "Đến dòng bảng (dòng bấm được)"],
      ["↑ ↓ / Home End", "Dòng trên / dưới, đầu / cuối"],
      ["Enter / Space", "Mở dòng đang chọn (hồ sơ, dự án…)"],
    ]],
    ["Ô nhập trong bảng (thửa, kiểm đếm…)", [
      ["Enter / Shift + Enter", "Xuống / lên ô cùng cột"],
      ["← → ở đầu / cuối ô", "Sang ô trước / sau trong dòng"],
      ["Tab / Shift + Tab", "Ô kế tiếp / trước"],
    ]],
    ["Danh sách chọn, menu", [
      ["↑ ↓ Enter", "Chọn mục"],
      ["Gõ chữ", "Lọc nhanh (ô chọn có tìm kiếm)"],
    ]],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
      {nhom.map(([ten, ds]) => (
        <div key={ten}>
          <div className="nhan-muc">{ten}</div>
          <table className="bang">
            <tbody>
              {ds.map(([p, m]) => (
                <tr key={p + m}>
                  <td style={{ whiteSpace: "nowrap", width: "1%", paddingRight: 14 }}>{p.split(" + ").map((x, i) => <span key={i}>{i > 0 && " + "}<kbd className="phim">{x}</kbd></span>)}</td>
                  <td>{m}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/**
 * Tạo kho tri thức cho Hỏi đáp AI (apps/desktop/public/tri-thuc/kho.json) từ văn bản nguyên văn trong policy/nguon và
 * tài liệu nghiệp vụ trong docs. Mỗi đoạn: nguồn, tiêu đề (Điều …/mục), nội dung. Chạy: node tools/tri-thuc/tao-kho.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const goc = join(dirname(fileURLToPath(import.meta.url)), "../..");
/** [tệp, tên nguồn hiển thị, loại] — VAN_BAN: văn bản pháp luật nguyên văn; NGHIEP_VU: tài liệu nghiệp vụ, hướng dẫn */
export const NGUON = [
  ["policy/nguon/luat-dat-dai-vbhn-44-2026.md", "Luật Đất đai (VBHN 44/VBHN-VPQH ngày 16/3/2026)", "VAN_BAN"],
  ["policy/nguon/nd88-2024-dieu-5-12.md", "Nghị định 88/2024/NĐ-CP (Điều 5, 8–12)", "VAN_BAN"],
  ["policy/nguon/nd226-2025-sua-nd88.md", "Nghị định 226/2025/NĐ-CP (sửa đổi NĐ 88/2024)", "VAN_BAN"],
  ["policy/nguon/qd106-2025-phu-luc-1.md", "QĐ 106/2025/QĐ-UBND – Phụ lục I", "VAN_BAN"],
  ["policy/nguon/qd106-2025-phu-luc-2.md", "QĐ 106/2025/QĐ-UBND – Phụ lục II", "VAN_BAN"],
  ["policy/nguon/qd14-2026-dieu-3-7.md", "QĐ 14/2026/QĐ-UBND (Điều 3–7)", "VAN_BAN"],
  ["policy/nguon/nq152-can-doi-chieu.md", "NQ 152/2025 – bảng giá đất (dòng cần đối chiếu)", "VAN_BAN"],
  ["docs/05-quy-trinh-thoi-han.md", "Quy trình, thời hạn (tài liệu phần mềm)", "NGHIEP_VU"],
  ["docs/06-quyet-dinh-nghiep-vu.md", "Quyết định nghiệp vụ đã xác nhận (QD-xx)", "NGHIEP_VU"],
  ["docs/03-so-vuong-mac.md", "Sổ vướng mắc (VM-xx)", "NGHIEP_VU"],
  ["docs/13-huong-dan-su-dung.md", "Hướng dẫn sử dụng phần mềm", "NGHIEP_VU"],
];

const DAI = 1600;
const laDau = (l) => /^(#{1,4}\s|\*\*Điều\s+\d+|Điều\s+\d+[a-zđ]?\.)/u.test(l.trim());
const sach = (l) => l.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();

export function chiaDoan(text, nguon, loai) {
  const out = [];
  const dong = text.split(/\r?\n/);
  let tieuDe = sach(dong[0] ?? nguon), buf = [];
  const day = () => {
    const nd = buf.join("\n").trim();
    buf = [];
    if (nd.length < 40) return;
    // Bảng markdown: mỗi dòng bảng một đoạn (QD-xx, VM-xx…)
    if (nd.split("\n").filter((l) => l.startsWith("|")).length > 3) {
      for (const l of nd.split("\n")) if (l.startsWith("|") && !/^\|[\s:-|]+\|$/.test(l) && l.replace(/[|\s-]/g, "").length > 30) out.push({ nguon, loai, tieuDe, noiDung: l.replace(/\|/g, " · ").replace(/\s+/g, " ").trim() });
      return;
    }
    // Đoạn dài: cắt theo khoản "1.", "2." hoặc dòng trống, mỗi phần ≤ DAI ký tự
    let phan = "";
    for (const l of nd.split("\n")) {
      if (phan.length + l.length > DAI && phan) { out.push({ nguon, loai, tieuDe, noiDung: phan.trim() }); phan = ""; }
      phan += l + "\n";
    }
    if (phan.trim()) out.push({ nguon, loai, tieuDe, noiDung: phan.trim() });
  };
  for (const l of dong.slice(1)) {
    if (laDau(l)) { day(); tieuDe = sach(l).slice(0, 220); continue; }
    buf.push(l);
  }
  day();
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const doan = [];
  for (const [tep, ten, loai] of NGUON) doan.push(...chiaDoan(readFileSync(join(goc, tep), "utf8"), ten, loai));
  const ra = join(goc, "apps/desktop/public/tri-thuc/kho.json");
  mkdirSync(dirname(ra), { recursive: true });
  writeFileSync(ra, JSON.stringify({ mo_ta: "Kho tri thức Hỏi đáp AI — tạo từ tools/tri-thuc/tao-kho.mjs", nguon: NGUON.map(([tep, ten, loai]) => ({ tep, ten, loai })), doan: doan.map((d, i) => ({ id: i, ...d })) }));
  console.log(`${doan.length} đoạn từ ${NGUON.length} nguồn → ${ra}`);
}

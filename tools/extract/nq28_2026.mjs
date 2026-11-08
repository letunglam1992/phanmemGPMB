/**
 * Dựng tệp sửa đổi Bảng giá đất theo Nghị quyết số 28/2026/NQ-HĐND ngày 19/10/2026 của HĐND tỉnh Sơn La
 * (hiệu lực từ 01/11/2026) — sửa đổi Quy định bảng giá đất ban hành kèm NQ 152/2025/NQ-HĐND.
 *
 * Đầu vào:
 *   - policy/nguon/nq152-2025-bang-gia-dat.json   (Bảng 05, 06, 07 NQ 152)
 *   - policy/nguon/nq28-2026-phu-luc.json         (Phụ lục I–V đã chuẩn hóa từ phụ biểu Excel kèm Nghị quyết, đối chiếu bản ký;
 *                                                  nguồn: kho tra-cuu-tthc-dat-dai-son-la, cong-cu/du-lieu/nq28-2026.json)
 * Đầu ra:
 *   - policy/nguon/nq28-2026-sua-doi-bang-gia-dat.json
 *
 * Cách khớp Phụ lục IV (đổi tên) và Phụ lục V (bãi bỏ) với NQ 152 — giống công cụ cong-cu/nhap-bang-gia-dat.js của kho tra cứu TTHC:
 *   - theo xã + STT của NQ 152;
 *   - dòng “-” khớp theo tên trong nhóm đang xét;
 *   - dòng số nguyên: là cả nhóm (đổi tên nhóm) hoặc tuyến đứng riêng; ở Phụ lục V, dòng số nguyên có dòng con được liệt kê là tiêu đề;
 *   - STT ghi trong Phụ lục không khớp tên ở NQ 152 → tìm theo tên trong cùng xã, áp theo tên và ghi cảnh báo
 *     (vd. xã Chiềng La: Phụ lục IV ghi STT 3.1 nhưng tên ở STT 3.3 NQ 152).
 *
 * Cách dùng: node tools/extract/nq28_2026.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const G = JSON.parse(fs.readFileSync(path.join(goc, "policy/nguon/nq152-2025-bang-gia-dat.json"), "utf8"));
const N = JSON.parse(fs.readFileSync(path.join(goc, "policy/nguon/nq28-2026-phu-luc.json"), "utf8"));
const VB = "NQ 28/2026/NQ-HĐND";

const BANG = [
  { khoa: "dat_o", bang: "05", loai: "ODT/ONT", pl: "plI", tenPl: "Phụ lục I" },
  { khoa: "dat_tmdv", bang: "06", loai: "TMD", pl: "plII", tenPl: "Phụ lục II" },
  { khoa: "dat_skc", bang: "07", loai: "SKC", pl: "plIII", tenPl: "Phụ lục III" },
];
const xaHopLe = new Set(G.danh_muc_xa);

// ---- 1. Phụ lục I–III: bổ sung giá tuyến (khoản 1–3 Điều 1)
const boSung = {};
for (const b of BANG) {
  boSung[b.khoa] = N[b.pl].map((r, i) => {
    if (!xaHopLe.has(r.xa)) throw new Error(`${b.tenPl}: xã ngoài danh mục NQ 152: ${r.xa}`);
    const vt = r.vt.map((v) => (v == null ? null : v));
    const canh_bao = [];
    for (let j = 1; j < vt.length; j++) if (vt[j] != null && vt[j - 1] != null && vt[j] > vt[j - 1]) { canh_bao.push("Giá vị trí sau cao hơn vị trí trước (đúng phụ biểu)"); break; }
    if (vt.some((v) => v == null)) canh_bao.push("Có vị trí trống (đúng phụ biểu)");
    return {
      bang: b.bang, loai_dat: b.loai, xa: r.xa, stt: "", nhom: r.nhom || "", tuyen: r.ten, vt, so_vi_tri: vt.length, canh_bao,
      van_ban: VB, can_cu: `${b.tenPl} ${VB} (khoản ${BANG.indexOf(b) + 1} Điều 1), dòng ${i + 1}`, ...(r.ghiChu ? { ghi_chu: r.ghiChu } : {}),
    };
  });
}

// ---- 2. Khớp Phụ lục IV, V với NQ 152
const tatCa = BANG.flatMap((b, l) => G[b.khoa].map((r) => ({ l, r: { ...r, nhom: r.nhom || "" } })));
const chuan = (s) => String(s || "").normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function giong(a, b) { // hệ số Dice trên cặp ký tự
  a = chuan(a); b = chuan(b);
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const m = new Map();
  for (let i = 0; i < a.length - 1; i++) { const k = a.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); }
  let c = 0;
  for (let i = 0; i < b.length - 1; i++) { const k = b.slice(i, i + 2), v = m.get(k); if (v) { c++; m.set(k, v - 1); } }
  return (2 * c) / (a.length + b.length - 2);
}
const soNhom = ({ r }) => (r.nhom.match(/^(\d+)\./) || [])[1] ?? (/^\d+$/.test(r.stt) ? r.stt : (r.stt.match(/^(\d+)\./) || [])[1]);
const canhBao = { lech_stt: [], nghi_ngo: [], khong_khop: [], bo_qua: [] };

function khop(ds, coMoi) {
  const ra = [];
  let nhomHienTai = null;
  ds.forEach((p, i) => {
    if (!xaHopLe.has(p.xa)) return void canhBao.khong_khop.push(`${p.xa} ${p.stt}: xã ngoài danh mục`);
    const ke = ds[i + 1], laSoNguyen = /^\d+$/.test(p.stt);
    if (laSoNguyen) nhomHienTai = p.stt;
    if (coMoi && !p.moi) return; // tiêu đề nhóm, không đổi tên
    if (coMoi && /^Sửa đổi STT/i.test(p.moi)) return void canhBao.bo_qua.push(`${p.xa} STT ${p.stt}: ${p.moi}`);
    const coCon = laSoNguyen && ke && ke.xa === p.xa && (ke.stt.startsWith(p.stt + ".") || ke.stt === "-");
    const cung = tatCa.filter((t) => t.r.xa === p.xa);
    let chon, kieu;
    if (laSoNguyen) {
      if (!coMoi && coCon) return; // tiêu đề nhóm có dòng con được liệt kê
      chon = cung.filter((t) => soNhom(t) === p.stt); kieu = "NHOM";
    } else if (p.stt === "-") {
      const ung = cung.filter((t) => t.r.stt === "-" && (!nhomHienTai || soNhom(t) === nhomHienTai));
      const tot = Math.max(0, ...ung.map((t) => giong(t.r.tuyen, p.cu)));
      chon = ung.filter((t) => giong(t.r.tuyen, p.cu) === tot && tot >= 0.5); kieu = "TUYEN";
    } else {
      const ung = cung.filter((t) => t.r.stt === p.stt);
      // STT trùng (vd. hai dòng 5.1): giữ dòng giống tên cũ nhất trong mỗi bảng
      const tot = (l) => Math.max(0, ...ung.filter((t) => t.l === l).map((t) => giong(t.r.tuyen, p.cu)));
      chon = ung.filter((t) => giong(t.r.tuyen, p.cu) === tot(t.l)); kieu = "TUYEN";
    }
    const simTuyen = (d) => Math.max(0, ...d.map((t) => giong(t.r.tuyen, p.cu)));
    if (kieu === "TUYEN") {
      // Xét riêng từng bảng: Bảng 05, 06, 07 của NQ 152 có chỗ cùng STT nhưng khác tên tuyến
      // (vd. xã Phiêng Pằn STT 3.3) — không được lấy dòng cùng STT mà khác tên.
      const moi = [];
      BANG.forEach((b, l) => {
        const o = chon.filter((t) => t.l === l);
        if (simTuyen(o) >= 0.6) return void moi.push(...o);
        const trongBang = cung.filter((t) => t.l === l);
        const tot = simTuyen(trongBang);
        const theoTen = tot >= 0.85 ? trongBang.filter((t) => giong(t.r.tuyen, p.cu) === tot) : [];
        if (theoTen.length) {
          canhBao.lech_stt.push(`${p.xa}, Bảng ${b.bang}: Phụ lục ghi STT ${p.stt} “${p.cu}” — tên này ở STT ${theoTen[0].r.stt || "(để trống)"} của NQ 152 ${o[0] ? `(STT ${p.stt} của NQ 152 là “${o[0].r.tuyen}”)` : `(không có dòng STT ${p.stt} cùng tên)`}; áp dụng theo tên`);
          moi.push(...theoTen);
        } else canhBao.khong_khop.push(`${p.xa}, Bảng ${b.bang}, STT ${p.stt}: không có tuyến “${p.cu}” trong NQ 152${o[0] ? ` (STT ${p.stt} của bảng này là “${o[0].r.tuyen}”)` : ""}`);
      });
      chon = moi;
    }
    if (!chon.length) return;
    const sim = kieu === "NHOM"
      ? Math.max(...chon.map((t) => Math.max(giong(t.r.nhom.replace(/^\d+\.\s*/, ""), p.cu), giong(t.r.tuyen, p.cu))))
      : Math.min(...BANG.map((_, l) => chon.filter((t) => t.l === l)).filter((o) => o.length).map(simTuyen));
    if (sim < 0.75) canhBao.nghi_ngo.push(`${p.xa} STT ${p.stt} (độ giống ${sim.toFixed(2)}): Phụ lục “${p.cu}” ↔ NQ 152 “${kieu === "NHOM" && chon[0].r.nhom ? chon[0].r.nhom : chon[0].r.tuyen}”`);
    ra.push({ p, chon, kieu });
  });
  return ra;
}

const khoa = ({ r }) => ({ bang: r.bang, xa: r.xa, stt: r.stt, tuyen: r.tuyen });
const doiTen = [];
for (const { p, chon, kieu } of khop(N.plIV, true)) {
  const can_cu = `Phụ lục IV ${VB} (khoản 4 Điều 1), ${p.xa} STT ${p.stt}`;
  for (const t of chon) {
    if (kieu === "NHOM" && t.r.nhom) doiTen.push({ ...khoa(t), loai: "NHOM", ten_cu: t.r.nhom, ten_moi: `${p.stt}. ${p.moi}`, can_cu });
    else doiTen.push({ ...khoa(t), loai: "TUYEN", ten_cu: t.r.tuyen, ten_moi: p.moi, can_cu });
  }
}
const baiBo = [];
for (const { p, chon } of khop(N.plV, false)) for (const t of chon) baiBo.push({ ...khoa(t), can_cu: `Phụ lục V ${VB} (khoản 5 Điều 1), ${p.xa} STT ${p.stt}` });

const ra = {
  van_ban: N.vanBan,
  hieu_luc_tu: N.hieuLucTu,
  sua_doi: "Quy định Bảng giá đất ban hành kèm theo NQ 152/2025/NQ-HĐND",
  don_vi: G.don_vi,
  nguon: `Phụ biểu ${N.nguon} kèm Nghị quyết, đã đối chiếu bản ký (policy/nguon/nq28-2026-phu-luc.json)`,
  chuyen_tiep: "Khoản 1 Điều 3: phương án bồi thường, hỗ trợ, tái định cư đã phê duyệt trước 01/11/2026 tiếp tục thực hiện theo phương án đã duyệt, trừ trường hợp phải điều chỉnh, bổ sung, hủy bỏ",
  bo_sung: boSung,
  doi_ten: doiTen,
  bai_bo: baiBo,
  canh_bao: canhBao,
};
fs.writeFileSync(path.join(goc, "policy/nguon/nq28-2026-sua-doi-bang-gia-dat.json"), JSON.stringify(ra, null, 1) + "\n");
console.log(`Bổ sung: ${BANG.map((b) => `${b.bang}: ${boSung[b.khoa].length}`).join(", ")}; đổi tên: ${doiTen.length} dòng (${doiTen.filter((x) => x.loai === "NHOM").length} nhóm); bãi bỏ: ${baiBo.length} dòng`);
for (const [k, v] of Object.entries(canhBao)) if (v.length) console.warn(`${k}:\n  ${v.join("\n  ")}`);

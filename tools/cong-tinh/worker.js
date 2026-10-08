/**
 * Cổng tổng hợp cấp tỉnh — phần mềm GPMB Sơn La (docs/21-tong-hop-cap-tinh.md, phương án 2 mức b).
 * Cloudflare Worker + R2. Cổng CHỈ lưu và trả lại gói .gpmbtinh đã mã hóa bằng khóa công khai của tỉnh:
 * không giải mã, không đọc được hồ sơ. Xác thực:
 *   - Quản trị (cấp tỉnh): biến bí mật MA_QUAN_TRI (đặt bằng `wrangler secret put MA_QUAN_TRI`), gửi "Authorization: Bearer <mã>".
 *   - Đơn vị gửi (xã, phường): mã "<mã-xã>.<chuỗi ngẫu nhiên>" do tỉnh cấp qua phần mềm; cổng chỉ lưu mã băm SHA-256.
 * Ràng buộc R2: binding tên KHO.
 *
 * API (JSON, lỗi: { loi }):
 *   GET    /api/trang-thai      → { vaiTro: "TINH" | "XA", ma?, ten?, phienBanCong }
 *   PUT    /api/goi             (xã)    thân = gói → { luc, kichThuoc }  (giữ 5 bản gần nhất mỗi xã)
 *   GET    /api/goi             (tỉnh)  → [{ ma, ten, luc, kichThuoc }]
 *   GET    /api/goi/:ma         (tỉnh)  → gói mới nhất của xã
 *   GET    /api/xa              (tỉnh)  → [{ ma, ten, taoLuc, thuHoi?, goiCuoi? }]
 *   POST   /api/xa              (tỉnh)  { ma, ten } → { ma, token } (cấp mới / cấp lại — mã cũ hết hiệu lực)
 *   DELETE /api/xa/:ma          (tỉnh)  thu hồi mã của xã
 *   PUT    /api/tuyen          (tỉnh)  [{ ma, ten, chuDauTu, dsXa, ghiChu? }] → { soTuyen, luc }  (1.0.5: dự án liên xã)
 *   GET    /api/tuyen          (tỉnh, xã) → { luc, tuyen: [...] } — danh sách dự án liên xã do tỉnh khai (không có hồ sơ)
 *   GET    /api/goi/:ma/ban    (tỉnh)  → [{ id, luc, kichThuoc }] — các bản cổng đang giữ của xã (tối đa 5, cũ → mới) (1.0.5)
 *   GET    /api/goi/:ma/ban/:id (tỉnh) → gói của bản đó
 */
const GIU_BAN = 5;
const TOI_DA = 95 * 1024 * 1024;
const MA_HOP_LE = /^[a-z0-9][a-z0-9-]{1,39}$/;

/** Phiên bản mã Worker — phần mềm so với bản nó cần để nhắc dán lại Worker (1.0.5). */
const PHIEN_BAN_CONG = "1.0.5";
const tl = (du, ma = 200) =>
  new Response(JSON.stringify(du), { status: ma, headers: { "content-type": "application/json; charset=utf-8", ...CORS } });
const loi = (ma, thongBao) => tl({ loi: thongBao }, ma);
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, PUT, POST, DELETE, OPTIONS" };

async function bam(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
/** So sánh thời gian hằng (chuỗi hex cùng độ dài). */
function bang(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function ngauNhien() {
  const u = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function xacThuc(req, env) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const token = m[1];
  // bỏ khoảng trắng, xuống dòng thừa khi dán mã quản trị vào Cloudflare (1.0.5)
  const maQt = (env.MA_QUAN_TRI ?? "").trim();
  if (maQt.length >= 24 && bang(await bam(token), await bam(maQt))) return { vaiTro: "TINH" };
  const i = token.indexOf(".");
  if (i < 0) return null;
  const ma = token.slice(0, i);
  if (!MA_HOP_LE.test(ma)) return null;
  const o = await env.KHO.get(`xa/${ma}.json`);
  if (!o) return null;
  const xa = await o.json();
  if (xa.thuHoi || !bang(await bam(token), xa.bam)) return null;
  return { vaiTro: "XA", ma, ten: xa.ten };
}

async function dsXa(env) {
  const out = [];
  let cursor;
  do {
    const r = await env.KHO.list({ prefix: "xa/", cursor });
    for (const o of r.objects) {
      const x = await (await env.KHO.get(o.key)).json();
      out.push({ ma: x.ma, ten: x.ten, taoLuc: x.taoLuc, thuHoi: x.thuHoi, goiCuoi: x.goiCuoi });
    }
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  return out;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, "");
    if (!p.startsWith("/api/")) return loi(404, "Không có đường dẫn này");
    if (!env.KHO) return loi(500, "Cổng chưa gắn R2 (binding KHO)");
    const ai = await xacThuc(req, env);
    if (!ai) return loi(401, "Mã truy cập không đúng hoặc đã bị thu hồi");

    if (p === "/api/trang-thai" && req.method === "GET") return tl({ ...ai, phienBanCong: PHIEN_BAN_CONG });

    // 1.0.5: danh sách dự án liên xã (mã dùng chung, tên, chủ đầu tư, xã dọc tuyến) — chỉ thông tin dự án, không có hồ sơ
    if (p === "/api/tuyen" && req.method === "GET") {
      const o = await env.KHO.get("tuyen.json");
      return tl(o ? await o.json() : { luc: null, tuyen: [] });
    }
    if (p === "/api/tuyen" && req.method === "PUT") {
      if (ai.vaiTro !== "TINH") return loi(403, "Chỉ quản trị cấp tỉnh");
      const chu = await req.text();
      if (chu.length > 1024 * 1024) return loi(413, "Danh sách quá lớn (tối đa 1 MB)");
      let ds;
      try {
        ds = JSON.parse(chu);
      } catch {
        return loi(400, "Thân yêu cầu không phải JSON");
      }
      if (!Array.isArray(ds)) return loi(400, "Danh sách dự án liên xã phải là mảng");
      const s = (v, n) => String(v ?? "").trim().slice(0, n);
      const tuyen = ds
        .filter((t) => t && /^[A-Z0-9][A-Z0-9._/-]{1,39}$/.test(String(t.ma ?? "")))
        .map((t) => ({ ma: t.ma, ten: s(t.ten, 300), chuDauTu: s(t.chuDauTu, 200), dsXa: (Array.isArray(t.dsXa) ? t.dsXa : []).map((x) => s(x, 80)).filter(Boolean).slice(0, 200), ...(t.ghiChu ? { ghiChu: s(t.ghiChu, 500) } : {}) }));
      const luc = new Date().toISOString();
      await env.KHO.put("tuyen.json", JSON.stringify({ luc, tuyen }));
      return tl({ soTuyen: tuyen.length, luc });
    }

    if (p === "/api/goi" && req.method === "PUT") {
      if (ai.vaiTro !== "XA") return loi(403, "Chỉ đơn vị cấp xã gửi gói");
      const du = new Uint8Array(await req.arrayBuffer());
      if (du.length < 100 || du.length > TOI_DA) return loi(413, "Gói rỗng hoặc vượt 95 MB");
      if (du[0] !== 0x50 || du[1] !== 0x4b) return loi(400, "Không phải gói .gpmbtinh");
      const luc = new Date().toISOString();
      await env.KHO.put(`goi/${ai.ma}/${luc.replace(/[:.]/g, "-")}.gpmbtinh`, du, { customMetadata: { luc } });
      const ds = (await env.KHO.list({ prefix: `goi/${ai.ma}/` })).objects.map((o) => o.key).sort();
      for (const k of ds.slice(0, Math.max(0, ds.length - GIU_BAN))) await env.KHO.delete(k);
      const o = await env.KHO.get(`xa/${ai.ma}.json`);
      if (o) await env.KHO.put(`xa/${ai.ma}.json`, JSON.stringify({ ...(await o.json()), goiCuoi: luc }));
      return tl({ luc, kichThuoc: du.length });
    }

    if (ai.vaiTro !== "TINH") return loi(403, "Chỉ quản trị cấp tỉnh");

    if (p === "/api/goi" && req.method === "GET") {
      const out = [];
      for (const x of await dsXa(env)) {
        if (!x.goiCuoi) continue;
        const ds = (await env.KHO.list({ prefix: `goi/${x.ma}/` })).objects.sort((a, b) => a.key.localeCompare(b.key));
        const cuoi = ds.at(-1);
        if (cuoi) out.push({ ma: x.ma, ten: x.ten, luc: x.goiCuoi, kichThuoc: cuoi.size });
      }
      return tl(out);
    }
    const mb = /^\/api\/goi\/([a-z0-9-]+)\/ban(?:\/([0-9TZ-]+))?$/.exec(p);
    if (mb && req.method === "GET") {
      const ds = (await env.KHO.list({ prefix: `goi/${mb[1]}/` })).objects.sort((a, b) => a.key.localeCompare(b.key));
      if (!mb[2]) return tl(ds.map((o) => { const id = o.key.slice(`goi/${mb[1]}/`.length).replace(/\.gpmbtinh$/, ""); return { id, luc: id.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, "$1:$2:$3.$4Z"), kichThuoc: o.size }; }));
      const o = await env.KHO.get(`goi/${mb[1]}/${mb[2]}.gpmbtinh`);
      if (!o) return loi(404, "Không còn bản này trên cổng");
      return new Response(o.body, { headers: { "content-type": "application/octet-stream", ...CORS } });
    }
    const mg = /^\/api\/goi\/([a-z0-9-]+)$/.exec(p);
    if (mg && req.method === "GET") {
      const ds = (await env.KHO.list({ prefix: `goi/${mg[1]}/` })).objects.sort((a, b) => a.key.localeCompare(b.key));
      if (!ds.length) return loi(404, "Xã này chưa gửi gói");
      const o = await env.KHO.get(ds.at(-1).key);
      return new Response(o.body, { headers: { "content-type": "application/octet-stream", ...CORS } });
    }
    if (p === "/api/xa" && req.method === "GET") return tl(await dsXa(env));
    if (p === "/api/xa" && req.method === "POST") {
      let b;
      try {
        b = await req.json();
      } catch {
        return loi(400, "Thân yêu cầu không phải JSON");
      }
      if (!MA_HOP_LE.test(b.ma ?? "")) return loi(400, "Mã xã chỉ gồm chữ thường không dấu, số, gạch ngang (2–40 ký tự)");
      const ten = String(b.ten ?? "").trim().slice(0, 120);
      if (!ten) return loi(400, "Thiếu tên đơn vị");
      const token = `${b.ma}.${ngauNhien()}`;
      const cu = await env.KHO.get(`xa/${b.ma}.json`);
      const goiCuoi = cu ? (await cu.json()).goiCuoi : undefined;
      await env.KHO.put(`xa/${b.ma}.json`, JSON.stringify({ ma: b.ma, ten, bam: await bam(token), taoLuc: new Date().toISOString(), goiCuoi }));
      return tl({ ma: b.ma, token });
    }
    const mx = /^\/api\/xa\/([a-z0-9-]+)$/.exec(p);
    if (mx && req.method === "DELETE") {
      const o = await env.KHO.get(`xa/${mx[1]}.json`);
      if (!o) return loi(404, "Không có xã này");
      await env.KHO.put(`xa/${mx[1]}.json`, JSON.stringify({ ...(await o.json()), thuHoi: new Date().toISOString() }));
      return tl({ ok: true });
    }
    return loi(404, "Không có đường dẫn này");
  },
};

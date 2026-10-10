/**
 * Dò tên tệp DGN được tham chiếu (reference attachment) trong một tệp DGN — docs/08 §9.9. Phần mềm không dựng được bản vẽ
 * tham chiếu (vị trí, tỷ lệ, xoay của tham chiếu không đọc), nên chỉ liệt kê tên tệp để cán bộ nạp chính các tệp đó làm
 * "tờ bản đồ" của dự án. Cách dò: tìm chuỗi tên tệp *.dgn (ASCII của V7, UTF-16 của V8) trong tệp — có thể lẫn tên tệp
 * khác (tệp mẫu…), nên gọi là "tên tệp nhắc tới", cán bộ đối chiếu.
 *
 * 1.0.7 (kiểm trên tệp V8 người dùng cung cấp, đọc tại chỗ, không lưu vào kho): tệp V8 là tệp ghép OLE, dữ liệu phần tử
 * nén zlib — dò trên bản thô chỉ gặp luồng thuộc tính tài liệu (SummaryInformation…, tên bắt đầu bằng \x05), nơi lưu tên
 * tệp gốc khi "Lưu thành" chứ không phải tham chiếu → báo nhầm. Nay với V8: bỏ luồng thuộc tính, dò trong các luồng còn
 * lại (thô và đã giải nén).
 */
import { unzlibSync } from "fflate";
import { docCfb, laCfb } from "./cfb.js";
const MAU = /[^\x00-\x1f"*?<>|]{1,240}?\.dgn(?![a-z0-9])/gi;
const KY_TEN = /[^\\/:\x00-\x1f"*?<>|]+\.dgn$/i;

/** Các vùng dữ liệu cần dò: V7 → cả tệp; V8 → từng luồng (trừ luồng thuộc tính), thô và giải nén (bỏ 0/16/20 byte đầu). */
function vungDo(bytes: Uint8Array): Uint8Array[] {
  if (!laCfb(bytes)) return [bytes];
  let t: ReturnType<typeof docCfb>;
  try {
    t = docCfb(bytes);
  } catch {
    return [bytes];
  }
  const out: Uint8Array[] = [];
  for (const l of t.dsLuong) {
    const ten = l.split("/").pop() ?? "";
    if (ten.charCodeAt(0) === 5 || /SummaryInformation$/.test(ten)) continue;
    const d = t.doc(l);
    if (!d) continue;
    out.push(d);
    for (const lech of [0, 16, 20])
      try {
        out.push(unzlibSync(d.subarray(lech)));
        break;
      } catch {
        /* không phải zlib ở vị trí này */
      }
  }
  return out;
}

export function timThamChieu(bytes: Uint8Array, tenTep?: string): string[] {
  const ds = new Map<string, string>();
  const them = (s: string) => {
    const m = KY_TEN.exec(s.trim());
    if (!m) return;
    const ten = m[0].trim();
    if (!/[a-z0-9]/i.test(ten.slice(0, -4)) || /seed/i.test(ten)) return;
    if (tenTep && ten.toLowerCase() === tenTep.toLowerCase()) return;
    if (!ds.has(ten.toLowerCase())) ds.set(ten.toLowerCase(), ten);
  };
  for (const vung of vungDo(bytes)) {
    const latin = new TextDecoder("latin1").decode(vung);
    for (const m of latin.matchAll(MAU)) them(m[0]);
    for (const lech of [0, 1]) {
      const n = Math.floor((vung.length - lech) / 2) * 2;
      const u16 = new TextDecoder("utf-16le").decode(vung.subarray(lech, lech + n));
      for (const m of u16.matchAll(MAU)) them(m[0]);
    }
  }
  return [...ds.values()];
}

/**
 * Dò tên tệp DGN được tham chiếu (reference attachment) trong một tệp DGN — docs/08 §9.9. Phần mềm không dựng được bản vẽ
 * tham chiếu (vị trí, tỷ lệ, xoay của tham chiếu không đọc), nên chỉ liệt kê tên tệp để cán bộ nạp chính các tệp đó làm
 * "tờ bản đồ" của dự án. Cách dò: tìm chuỗi tên tệp *.dgn (ASCII của V7, UTF-16 của V8) trong tệp — có thể lẫn tên tệp
 * khác (tệp mẫu…), nên gọi là "tên tệp nhắc tới", cán bộ đối chiếu.
 */
const MAU = /[^\x00-\x1f"*?<>|]{1,240}?\.dgn(?![a-z0-9])/gi;
const KY_TEN = /[^\\/:\x00-\x1f"*?<>|]+\.dgn$/i;

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
  const latin = new TextDecoder("latin1").decode(bytes);
  for (const m of latin.matchAll(MAU)) them(m[0]);
  for (const lech of [0, 1]) {
    const n = Math.floor((bytes.length - lech) / 2) * 2;
    const u16 = new TextDecoder("utf-16le").decode(bytes.subarray(lech, lech + n));
    for (const m of u16.matchAll(MAU)) them(m[0]);
  }
  return [...ds.values()];
}

/** Đọc số tiền thành chữ tiếng Việt (dùng cho "Bằng chữ: …" trong văn bản). */
const CHU_SO = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const DON_VI = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];

function docBaSo(n: number, dayDu: boolean): string {
  const tram = Math.floor(n / 100), chuc = Math.floor((n % 100) / 10), dv = n % 10;
  const out: string[] = [];
  if (tram > 0 || dayDu) out.push(`${CHU_SO[tram]} trăm`);
  if (chuc > 1) {
    out.push(`${CHU_SO[chuc]} mươi`);
    if (dv === 1) out.push("mốt");
    else if (dv === 4) out.push("tư");
    else if (dv === 5) out.push("lăm");
    else if (dv > 0) out.push(CHU_SO[dv]!);
  } else if (chuc === 1) {
    out.push("mười");
    if (dv === 5) out.push("lăm");
    else if (dv > 0) out.push(CHU_SO[dv]!);
  } else if (dv > 0) {
    if (tram > 0 || dayDu) out.push("linh");
    out.push(CHU_SO[dv]!);
  }
  return out.join(" ");
}

/** 1234500 → "Một triệu hai trăm ba mươi tư nghìn năm trăm đồng". Chỉ nhận số nguyên không âm. */
export function docSoTien(so: number | bigint | string, donVi = "đồng"): string {
  let n = BigInt(typeof so === "string" ? so.replace(/[.\s]/g, "").split(",")[0]! : typeof so === "number" ? Math.round(so) : so);
  if (n < 0n) return "Âm " + docSoTien(-n, donVi).toLowerCase();
  if (n === 0n) return `Không ${donVi}`.trim();
  const nhom: number[] = [];
  while (n > 0n) {
    nhom.push(Number(n % 1000n));
    n /= 1000n;
  }
  const phan: string[] = [];
  for (let i = nhom.length - 1; i >= 0; i--) {
    const g = nhom[i]!;
    if (g === 0) continue;
    phan.push(docBaSo(g, i < nhom.length - 1) + DON_VI[i]);
  }
  const s = `${phan.join(" ")} ${donVi}`.trim().replace(/\s+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

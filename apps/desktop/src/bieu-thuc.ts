/**
 * Tính biểu thức khối lượng kiểu Excel ("=10*9.8", "=5+6+3", "(2,5+1)*3") bằng số thập phân chính
 * xác. Chỉ cho phép số, + − × ÷ và ngoặc; không dùng eval.
 */
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { docSoNhap } from "./so";

export class LoiBieuThuc extends Error {}

export function tinhBieuThuc(vao: string): Decimal {
  // Số thường (không bắt đầu bằng "="): quy ước Việt Nam — "1.500" = một nghìn năm trăm, "2,5" = hai phẩy năm (P0-2).
  // Biểu thức bắt đầu bằng "=" giữ cách viết kiểu Excel: dấu chấm hoặc phẩy là phần thập phân ("=10*9.8").
  if (!vao.trim().startsWith("=")) {
    const r = docSoNhap(vao);
    if (r.so !== null) return D(r.so);
  }
  const s = vao.trim().replace(/^=/, "").replace(/,/g, ".").replace(/[×x]/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  if (s === "") throw new LoiBieuThuc("Chưa nhập giá trị");
  let i = 0;
  const xem = () => s[i];
  function so(): Decimal {
    if (xem() === "(") {
      i++;
      const v = cong();
      if (xem() !== ")") throw new LoiBieuThuc(`Thiếu dấu ")" trong "${vao}"`);
      i++;
      return v;
    }
    if (xem() === "-") {
      i++;
      return so().neg();
    }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new LoiBieuThuc(`Biểu thức không hợp lệ tại vị trí ${i + 1}: "${vao}"`);
    i += m[0].length;
    return D(m[0]);
  }
  function nhan(): Decimal {
    let v = so();
    while (xem() === "*" || xem() === "/") {
      const op = s[i++];
      const r = so();
      if (op === "/" && r.isZero()) throw new LoiBieuThuc("Chia cho 0");
      v = op === "*" ? v.mul(r) : v.div(r);
    }
    return v;
  }
  function cong(): Decimal {
    let v = nhan();
    while (xem() === "+" || xem() === "-") {
      const op = s[i++];
      const r = nhan();
      v = op === "+" ? v.plus(r) : v.minus(r);
    }
    return v;
  }
  const kq = cong();
  if (i !== s.length) throw new LoiBieuThuc(`Ký tự không hợp lệ "${s[i]}" trong "${vao}"`);
  return kq;
}

export function thuTinh(vao: string): { giaTri: Decimal | null; loi: string | null } {
  try {
    return { giaTri: tinhBieuThuc(vao), loi: null };
  } catch (e) {
    return { giaTri: null, loi: (e as Error).message };
  }
}

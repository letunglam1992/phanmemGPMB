#!/usr/bin/env node
// Ghi chú phát hành từ docs/nhung-thay-doi.md: mục của phiên bản đang phát hành + các mục cũ hơn (tối đa 6 mục)
// để phần mềm cũ hiện được mọi thay đổi kể từ bản đang dùng. Thiếu mục của phiên bản → thoát mã 1.
// Dùng: node tools/ghi-chu-phat-hanh.mjs 1.0.11
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function tachMuc(md) {
  const muc = [];
  for (const k of md.split(/^## /m).slice(1)) {
    const [dau, ...than] = k.split("\n");
    muc.push({ pb: dau.trim(), noiDung: than.join("\n").trim() });
  }
  return muc;
}

export function ghiChu(md, pb, soMuc = 6) {
  const muc = tachMuc(md);
  const i = muc.findIndex((m) => m.pb === pb);
  if (i < 0) return null;
  return muc
    .slice(i, i + soMuc)
    .map((m) => `## ${m.pb}\n\n${m.noiDung}`)
    .join("\n\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pb = process.argv[2];
  const md = readFileSync(new URL("../docs/nhung-thay-doi.md", import.meta.url), "utf8");
  const kq = pb && ghiChu(md, pb);
  if (!kq) {
    console.error(`docs/nhung-thay-doi.md chưa có mục "## ${pb}" — ghi những thay đổi của phiên bản trước khi phát hành`);
    process.exit(1);
  }
  process.stdout.write(kq + "\n");
}

// Sinh apps/desktop/src/viec-thu.json (danh sách việc cần thử trên máy thật) từ docs/22 mục "### A…", dòng "- [ ] …".
// Chạy lại mỗi khi sửa các mục A… trong docs/22: node tools/tao-viec-thu.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { docViecThu } from "../apps/desktop/src/doc-viec-thu.ts";

const goc = fileURLToPath(new URL("..", import.meta.url));
const ds = docViecThu(readFileSync(goc + "docs/22-ghi-chu-tien-do.md", "utf8"));
writeFileSync(goc + "apps/desktop/src/viec-thu.json", JSON.stringify(ds, null, 1) + "\n");
console.log(`Đã ghi ${ds.length} nhóm, ${ds.reduce((s, n) => s + n.viec.length, 0)} việc.`);

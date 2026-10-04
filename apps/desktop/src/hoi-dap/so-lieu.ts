/**
 * Trả lời câu hỏi về số liệu dự án ngay trên máy (không gửi đi đâu): số hộ, tổng giá trị tạm tính, diện tích thu hồi,
 * hiện trạng GPMB, hộ có vướng mắc, hộ chưa chốt / đã phê duyệt phương án. Nhận diện ý định bằng từ khóa.
 */
import { D, dinhDang } from "@gpmb/core";
import type { DuAn, Ho } from "../mo-hinh";
import type { KetQuaHo } from "../tinh-ho";
import { THU_TU_TRANG_THAI, TT_GPMB, trangThaiHo } from "../trang-thai";
import { hoDaPheDuyet } from "../phuong-an";
import { boDau } from "./tim-kiem";

export interface DuLieuDuAn {
  duAn: DuAn;
  kq: { h: Ho; k: KetQuaHo }[];
}
export type YDinh = "SO_HO" | "TONG_TIEN" | "DIEN_TICH" | "HIEN_TRANG" | "VUONG_MAC" | "PHUONG_AN";

/** Ý định số liệu trong câu hỏi (null: không phải câu hỏi số liệu dự án). */
export function nhanYDinh(cauHoi: string): YDinh[] {
  const q = boDau(cauHoi);
  const ra: YDinh[] = [];
  if (/vuong mac|kho khan|khieu nai/.test(q) && /(ho|du an|nao|bao nhieu|danh sach)/.test(q)) ra.push("VUONG_MAC");
  if (/(bao nhieu|so|tong so|may) (ho|hdo so|ho so|doi tuong)/.test(q) || /so ho\b/.test(q)) ra.push("SO_HO");
  if (/(tong|bao nhieu|het).*(tien|gia tri|kinh phi)|(kinh phi|gia tri|tien) .*(du an|tong)/.test(q)) ra.push("TONG_TIEN");
  if (/(dien tich|dt) .*(thu hoi)|(thu hoi) .*(dien tich|bao nhieu m)/.test(q)) ra.push("DIEN_TICH");
  if (/(tien do|hien trang|da kiem dem|chua kiem dem|ban giao|hoan thanh)/.test(q) && /(du an|ho|bao nhieu|the nao|ra sao)/.test(q)) ra.push("HIEN_TRANG");
  if (/(chot|phe duyet|phuong an)/.test(q) && /(ho|bao nhieu|nao|chua|da)/.test(q) && /(chua|da|bao nhieu|nao)/.test(q)) ra.push("PHUONG_AN");
  return [...new Set(ra)];
}

const dong = (x: { tongLamTron: unknown }) => D(String(x.tongLamTron));

/** Câu trả lời (văn bản thuần, nhiều dòng) cho các ý định; số tiền làm tròn đồng, diện tích 0,1 m². */
export function traLoiSoLieu(yd: YDinh[], ds: DuLieuDuAn[], homNay: string): string {
  const out: string[] = [];
  for (const { duAn, kq } of ds) {
    const dau = ds.length > 1 ? `• ${duAn.ten}: ` : "";
    for (const y of yd) {
      if (y === "SO_HO") out.push(`${dau}${kq.length} hồ sơ (hộ gia đình, cá nhân, tổ chức).`);
      if (y === "TONG_TIEN") {
        const t = kq.reduce((s, x) => s.plus(dong(x.k.tong)), D(0));
        out.push(`${dau}Tổng giá trị bồi thường, hỗ trợ tạm tính (đã làm tròn): ${dinhDang(t, 0)} đồng (${kq.length} hồ sơ; chỉ cộng các khoản "Tạm tính", chưa phải số đã phê duyệt).`);
      }
      if (y === "DIEN_TICH") {
        const dt = kq.reduce((s, x) => s.plus(x.h.thua.reduce((a, t) => a.plus(D(t.dienTichThuHoi || "0")), D(0))), D(0));
        out.push(`${dau}Tổng diện tích thu hồi theo hồ sơ: ${dinhDang(dt, 1)} m² (${kq.reduce((s, x) => s + x.h.thua.length, 0)} thửa).`);
      }
      if (y === "HIEN_TRANG") {
        const dem = new Map<string, number>();
        for (const x of kq) { const t = trangThaiHo(duAn, x.h, x.k, homNay); dem.set(t, (dem.get(t) ?? 0) + 1); }
        out.push(`${dau}Hiện trạng GPMB: ${THU_TU_TRANG_THAI.filter((t) => dem.get(t)).map((t) => `${TT_GPMB[t].ten} ${dem.get(t)}`).join("; ") || "chưa có hồ sơ"}.`);
      }
      if (y === "VUONG_MAC") {
        const vm = kq.flatMap(({ h }) => Object.entries(h.tienDo).filter(([, b]) => b?.vuongMac).map(([m, b]) => `${h.ma} · ${h.ten} (bước ${m}): ${b!.vuongMac}`));
        out.push(`${dau}${vm.length ? `${vm.length} vướng mắc chưa giải quyết:\n${vm.slice(0, 30).map((x) => `  – ${x}`).join("\n")}${vm.length > 30 ? `\n  … và ${vm.length - 30} vướng mắc khác` : ""}` : "Không có hộ đang ghi vướng mắc."}`);
      }
      if (y === "PHUONG_AN") {
        const pa = (duAn.phuongAn ?? []).filter((p) => p.trangThai !== "DA_HUY");
        const duyet = hoDaPheDuyet(pa);
        const chot = new Set(pa.flatMap((p) => p.ho.map((x) => x.hoId)));
        const chua = kq.filter(({ h }) => !chot.has(h.id));
        out.push(`${dau}${duyet.size} hộ đã có trong phương án được phê duyệt; ${chot.size - duyet.size > 0 ? `${[...chot].filter((id) => !duyet.has(id)).length} hộ đã chốt, chờ phê duyệt; ` : ""}${chua.length} hộ chưa chốt phương án${chua.length ? ` (${chua.slice(0, 15).map(({ h }) => h.ma).join(", ")}${chua.length > 15 ? "…" : ""})` : ""}.`);
      }
    }
  }
  return out.join("\n");
}

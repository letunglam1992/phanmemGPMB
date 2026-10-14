/**
 * 1.0.11 — Chuyển bộ chính sách theo từng hộ hoặc từng đợt thu hồi (hồ sơ đang lập dở khi có văn bản mới).
 *
 * - Bộ áp dụng cho hộ: bộ riêng của hộ → của đợt → của dự án (`boCuaHo`, dot-thu-hoi.ts); tinhHoMoi tự dùng bộ đó.
 * - Trước khi áp dụng, phần mềm tính lại các hộ trong phạm vi theo bộ mới và lập bảng chênh lệch từng hộ, từng khoản
 *   (Excel, Word giải trình). Phần mềm không tự quyết hộ nào thuộc trường hợp chuyển tiếp: cán bộ chọn phạm vi và ghi
 *   lý do, căn cứ (vd. khoản 2 Điều 3 QĐ 64/2026/QĐ-UBND — nêu ở gói chính sách nếu có).
 * - Bản phương án đã chốt, phê duyệt không đổi (đã đóng băng bộ chính sách và dữ liệu hộ tại lúc chốt).
 */
import { D, dinhDang } from "@gpmb/core";
import type { DuAn, Ho } from "./mo-hinh";
import { BO_CHINH_SACH } from "./du-lieu";
import { GOI_GOC, tenBoChinhSach } from "./goi-chinh-sach";
import { boCuaHo, tenDot, timDot } from "./dot-thu-hoi";
import { tinhHoMoi } from "./tinh-ho";
import { chupHo, hoDaPheDuyet, soSanh, type DongSoSanh } from "./phuong-an";
import type { TaiLieu } from "./van-ban/tai-lieu-don-gian";

/** Phạm vi chuyển: danh sách hộ, hoặc một đợt. `khoa` rỗng = bỏ bộ riêng (trở về theo đợt / dự án). */
export type PhamViChuyen = { loai: "ho"; hoIds: string[]; khoa: string } | { loai: "dot"; dotId: string; khoa: string };

export interface DongChuyen extends DongSoSanh {
  boTruoc: string;
  boSau: string;
  /** Số khoản thiếu căn cứ / cần xác nhận khi tính theo bộ sau. */
  thieuSau: number;
  /** Hộ đã có trong bản phương án đã phê duyệt (bản đó giữ nguyên; tạm tính đổi). */
  daPheDuyet: boolean;
}

export interface KetQuaChuyen {
  dong: DongChuyen[];
  /** Hộ trong đợt nhưng có bộ riêng — không đổi khi chuyển theo đợt. */
  giuBoRieng: Ho[];
  tongTruoc: string;
  tongSau: string;
  chenh: string;
}

const boCua = (khoa: string) => BO_CHINH_SACH[khoa] ?? BO_CHINH_SACH[GOI_GOC]!;

/** Hồ sơ hộ sau khi đặt (hoặc bỏ) bộ riêng. */
export function datBoHo(h: Ho, khoa: string): Ho {
  const { boChinhSach: _bo, ...con } = h;
  void _bo;
  return khoa ? { ...con, boChinhSach: khoa } : con;
}

/** Dự án sau khi đặt (hoặc bỏ) bộ riêng của đợt. */
export function datBoDot(duAn: DuAn, dotId: string, khoa: string): DuAn {
  return {
    ...duAn,
    dotThuHoi: (duAn.dotThuHoi ?? []).map((d) => {
      if (d.id !== dotId) return d;
      const { boChinhSach: _bo, ...con } = d;
      void _bo;
      return khoa ? { ...con, boChinhSach: khoa } : con;
    }),
  };
}

/** Tính trước / sau cho các hộ trong phạm vi (không lưu). */
export function tinhChuyenBo(duAn: DuAn, hos: Ho[], pv: PhamViChuyen): KetQuaChuyen {
  const daDuyet = hoDaPheDuyet(duAn.phuongAn ?? []);
  let cap: { h: Ho; sauHo: Ho; sauDa: DuAn }[];
  let giuBoRieng: Ho[] = [];
  if (pv.loai === "ho") {
    const ids = new Set(pv.hoIds);
    cap = hos.filter((h) => ids.has(h.id)).map((h) => ({ h, sauHo: datBoHo(h, pv.khoa), sauDa: duAn }));
  } else {
    const trong = hos.filter((h) => h.dotId === pv.dotId);
    giuBoRieng = trong.filter((h) => h.boChinhSach);
    const da2 = datBoDot(duAn, pv.dotId, pv.khoa);
    cap = trong.filter((h) => !h.boChinhSach).map((h) => ({ h, sauHo: h, sauDa: da2 }));
  }
  const truoc = cap.map(({ h }) => chupHo(h, tinhHoMoi(boCua(duAn.boChinhSach), duAn, h)));
  const kSau = cap.map(({ sauHo, sauDa }) => tinhHoMoi(boCua(sauDa.boChinhSach), sauDa, sauHo));
  const sau = cap.map(({ sauHo }, i) => chupHo(sauHo, kSau[i]!));
  const ss = soSanh(truoc, sau);
  const theoId = new Map(cap.map((x, i) => [x.h.id, { ...x, k: kSau[i]! }]));
  const dong: DongChuyen[] = ss.dong.map((d) => {
    const x = theoId.get(d.hoId)!;
    return {
      ...d,
      boTruoc: boCuaHo(duAn, x.h),
      boSau: boCuaHo(x.sauDa, x.sauHo),
      thieuSau: x.k.tong.soDongThieuCanCu + x.k.tong.soDongCanXacNhan,
      daPheDuyet: daDuyet.has(d.hoId),
    };
  });
  return { dong, giuBoRieng, tongTruoc: ss.tongTruoc, tongSau: ss.tongSau, chenh: ss.chenh };
}

const tien = (x: string | null) => (x == null ? "—" : dinhDang(D(x), 0));
const dau = (x: string) => (D(x).gt(0) ? "+" : "") + dinhDang(D(x), 0);

/** Mô tả phạm vi để ghi nhật ký, tiêu đề. */
export function moTaPhamVi(duAn: DuAn, pv: PhamViChuyen, soHo: number): string {
  const sang = pv.khoa ? `bộ ${tenBoChinhSach(pv.khoa)} (${pv.khoa})` : "bộ chung (theo đợt / dự án)";
  return pv.loai === "dot" ? `${tenDot(timDot(duAn, pv.dotId))} (${soHo} hộ) → ${sang}` : `${soHo} hộ → ${sang}`;
}

/** Căn cứ chuyển tiếp ghi trong gói chính sách đích (nếu có) — chỉ trích, không tự suy ra. */
export function canCuChuyenTiep(khoa: string): string | null {
  const ct = BO_CHINH_SACH[khoa]?.chuyenTiep;
  if (!ct) return null;
  return `${ct.noiDung} (${ct.canCu.map((c) => `${c.viTri} ${c.vanBan}`).join("; ")})`;
}

/** Bảng giải trình chênh lệch (Word / In). */
export function taiLieuGiaiTrinh(duAn: DuAn, pv: PhamViChuyen, kq: KetQuaChuyen, o: { lyDo: string; nguoi: string; ngay: string }): TaiLieu {
  const ct = pv.khoa ? canCuChuyenTiep(pv.khoa) : null;
  const coChenh = kq.dong.filter((d) => d.khoan.length);
  return {
    tieuDe: "Giải trình chênh lệch khi chuyển bộ chính sách",
    ngang: true,
    khoi: [
      { loai: "doan", canh: "giua", chu: [{ t: "BẢNG GIẢI TRÌNH CHÊNH LỆCH KHI CHUYỂN BỘ CHÍNH SÁCH ÁP DỤNG", dam: true }], co: 14 },
      { loai: "doan", canh: "giua", chu: [{ t: `Dự án: ${duAn.ten}`, dam: true }] },
      { loai: "doan", chu: [{ t: "Phạm vi: ", dam: true }, moTaPhamVi(duAn, pv, kq.dong.length)] },
      { loai: "doan", chu: [{ t: "Lý do, căn cứ chuyển (cán bộ ghi): ", dam: true }, o.lyDo || "(chưa ghi)"] },
      ...(ct ? [{ loai: "doan" as const, chu: [{ t: "Quy định chuyển tiếp ghi trong gói chính sách: ", dam: true }, ct] }] : []),
      ...(kq.giuBoRieng.length ? [{ loai: "doan" as const, chu: [{ t: `Hộ có bộ chính sách riêng, không đổi theo đợt: ${kq.giuBoRieng.map((h) => h.ma).join(", ")}.`, nghieng: true }] }] : []),
      { loai: "tieu-de", cap: 2, chu: "1. Tổng hợp theo hộ" },
      {
        loai: "bang",
        cot: [{ ten: "Mã", rong: 8 }, { ten: "Họ tên", rong: 22 }, { ten: "Bộ trước", rong: 16 }, { ten: "Bộ sau", rong: 16 }, { ten: "Trước (đ)", rong: 14, so: true }, { ten: "Sau (đ)", rong: 14, so: true }, { ten: "Chênh lệch (đ)", rong: 14, so: true }, { ten: "Ghi chú", rong: 18 }],
        dong: [
          ...kq.dong.map((d) => ({
            o: [d.ma, d.ten, d.boTruoc, d.boSau, tien(d.truoc), tien(d.sau), dau(d.chenh), [d.thieuSau ? `${d.thieuSau} khoản thiếu căn cứ/cần xác nhận` : "", d.daPheDuyet ? "đã có trong PA đã phê duyệt (bản đó giữ nguyên)" : ""].filter(Boolean).join("; ")],
          })),
          { o: ["", "Tổng cộng", "", "", tien(kq.tongTruoc), tien(kq.tongSau), dau(kq.chenh), ""], kieu: "tong" as const },
        ],
      },
      { loai: "tieu-de", cap: 2, chu: "2. Chi tiết các khoản thay đổi" },
      ...(coChenh.length
        ? [
            {
              loai: "bang" as const,
              cot: [{ ten: "Mã khoản", rong: 8 }, { ten: "Nội dung", rong: 46 }, { ten: "Trước (đ)", rong: 14, so: true }, { ten: "Sau (đ)", rong: 14, so: true }, { ten: "Chênh lệch (đ)", rong: 14, so: true }],
              dong: coChenh.flatMap((d) => [
                { o: ["", `${d.ma} – ${d.ten}`], kieu: "nhom" as const, gop: 4 },
                ...d.khoan.map((k) => ({ o: [k.ma, k.noiDung, tien(k.truoc), tien(k.sau), dau(k.chenh)] })),
              ]),
            },
          ]
        : [{ loai: "doan" as const, chu: ["Không có khoản nào thay đổi."] }]),
      { loai: "doan", truoc: 12, chu: [{ t: `Lập ngày ${o.ngay.split("-").reverse().join("/")}; người lập: ${o.nguoi}. Số liệu là tạm tính theo hồ sơ hiện tại, chưa phải phương án được phê duyệt.`, nghieng: true }] },
      { loai: "bang", cot: [{ ten: "NGƯỜI LẬP", rong: 1 }, { ten: "THỦ TRƯỞNG ĐƠN VỊ", rong: 1 }], dong: [{ o: ["\n\n\n", "\n\n\n"] }] },
    ],
  };
}

/** Excel: trang tổng hợp theo hộ + trang chi tiết khoản. */
export async function excelChuyenBo(duAn: DuAn, pv: PhamViChuyen, kq: KetQuaChuyen, lyDo: string): Promise<Uint8Array> {
  const { default: E } = await import("exceljs");
  const wb = new E.Workbook();
  const ws = wb.addWorksheet("Theo hộ");
  ws.addRow([`Chênh lệch khi chuyển bộ chính sách — ${duAn.ten}: ${moTaPhamVi(duAn, pv, kq.dong.length)}`]).font = { bold: true };
  ws.addRow([`Lý do, căn cứ: ${lyDo || "(chưa ghi)"}`]);
  ws.addRow(["Mã", "Họ tên", "Bộ trước", "Bộ sau", "Trước (đ)", "Sau (đ)", "Chênh lệch (đ)", "Thiếu căn cứ/cần xác nhận (bộ sau)", "Đã có trong PA đã phê duyệt"]).font = { bold: true };
  const so = (x: string | null) => (x == null ? null : D(x).toNumber());
  for (const d of kq.dong) ws.addRow([d.ma, d.ten, d.boTruoc, d.boSau, so(d.truoc), so(d.sau), so(d.chenh), d.thieuSau || null, d.daPheDuyet ? "có" : ""]);
  ws.addRow(["", "Tổng cộng", "", "", so(kq.tongTruoc), so(kq.tongSau), so(kq.chenh)]).font = { bold: true };
  ws.columns.forEach((c, i) => {
    c.width = [10, 28, 20, 20, 16, 16, 16, 14, 12][i];
    if (i >= 4 && i <= 6) c.numFmt = "#,##0";
  });
  const ck = wb.addWorksheet("Chi tiết khoản");
  ck.addRow(["Mã hộ", "Họ tên", "Mã khoản", "Nội dung", "Trước (đ)", "Sau (đ)", "Chênh lệch (đ)"]).font = { bold: true };
  for (const d of kq.dong) for (const k of d.khoan) ck.addRow([d.ma, d.ten, k.ma, k.noiDung, so(k.truoc), so(k.sau), so(k.chenh)]);
  ck.columns.forEach((c, i) => {
    c.width = [10, 24, 10, 50, 16, 16, 16][i];
    if (i >= 4) c.numFmt = "#,##0";
  });
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

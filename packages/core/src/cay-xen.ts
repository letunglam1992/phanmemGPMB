import type { BoChinhSach } from "./chinh-sach";
import { dong } from "./dong";
import { D, dinhDang, lamTronDienTich, type SoVao } from "./so";
import type { DongTinh, LuaChon } from "./types";
import type Decimal from "decimal.js";

/**
 * A14 – Nhiều loại cây lâu năm trên cùng diện tích (k4 Điều 5 Phụ lục VIII QĐ 106/2025).
 *
 * Văn bản: chủ sở hữu chọn loại cây được tính; cây đó tính theo mật độ quy định và được vượt tối
 * đa 50% mật độ trên cùng đơn vị diện tích, hưởng 100% đơn giá; số cây còn lại hưởng 30%.
 *
 * Cách áp dụng (theo biểu áp giá mẫu người dùng cung cấp): "quỹ diện tích" = DT × 1,5 (− DT công
 * trình nếu chọn trừ); mỗi cây chiếm 10.000 / mật độ (m²); lần lượt xếp cây theo thứ tự chủ sở hữu
 * chọn (mặc định gợi ý: đơn giá giảm dần) cho đến hết quỹ; dòng ở ranh giới được tách phần 100% và 30%.
 */
export interface DongCayXen {
  ten: string;
  maDonGia: string;
  donVi: string;
  donGia: SoVao;
  soLuong: SoVao;
  /** Mật độ quy định (cây/ha). Không có → không đưa vào quỹ, cần xác nhận. */
  matDoHa: SoVao | null;
}

export interface KetQuaCayXen {
  dong: DongTinh[];
  quyM2: Decimal;
  daDungM2: Decimal;
  thuTu: DongCayXen[];
}

/** Thứ tự gợi ý: đơn giá giảm dần (giữ thứ tự nhập khi bằng nhau). */
export function goiYThuTuCayXen(ds: DongCayXen[]): DongCayXen[] {
  return ds
    .map((c, i) => ({ c, i }))
    .sort((a, b) => D(b.c.donGia).cmp(D(a.c.donGia)) || a.i - b.i)
    .map((x) => x.c);
}

export function cayTrongXenCanh(
  cs: BoChinhSach,
  p: {
    dienTichM2: SoVao;
    /** Diện tích công trình trừ khỏi quỹ (VM-34). Khác 0 thì bắt buộc có lý do. */
    dienTichTruM2?: SoVao;
    lyDoTru?: string;
    /**
     * DUNG_KHI_VUOT (mặc định, theo biểu áp giá mẫu): khi một dòng đã vượt quỹ, các dòng sau
     * hưởng 30% dù quỹ còn dư lẻ. LAP_DAY: tiếp tục xếp dòng sau nếu phần dư còn chứa được cây (VM-34).
     */
    cachXep?: "DUNG_KHI_VUOT" | "LAP_DAY";
    /** Thứ tự do chủ sở hữu chọn; bỏ trống = gợi ý đơn giá giảm dần. */
    thuTuChuSoHuu?: DongCayXen[];
    cay: DongCayXen[];
  },
): KetQuaCayXen {
  const k = cs.cayTrong;
  const dt = lamTronDienTich(p.dienTichM2);
  const tru = lamTronDienTich(p.dienTichTruM2 ?? 0);
  const luaChon: LuaChon[] = [];
  const canhBaoChung: string[] = [];
  let canXacNhan = false;
  if (tru.gt(0)) {
    if (!p.lyDoTru?.trim()) {
      canXacNhan = true;
      canhBaoChung.push("Trừ diện tích công trình khỏi quỹ mật độ: chưa nhập lý do (VM-34)");
    } else luaChon.push({ ma: "VM-34", giaTri: `Trừ ${dinhDang(tru, 2)} m² công trình`, lyDo: p.lyDoTru });
  }
  const thuTu = p.thuTuChuSoHuu ?? goiYThuTuCayXen(p.cay);
  if (!p.thuTuChuSoHuu)
    luaChon.push({ ma: "PLVIII-D5K4", giaTri: "Thứ tự tính theo đơn giá giảm dần", lyDo: "Gợi ý mặc định; chủ sở hữu có quyền chọn thứ tự khác" });

  const cachXep = p.cachXep ?? "DUNG_KHI_VUOT";
  if (cachXep !== "DUNG_KHI_VUOT")
    luaChon.push({ ma: "VM-34", giaTri: "Lấp đầy phần quỹ còn dư sau dòng vượt", lyDo: "Theo lựa chọn của người dùng" });
  let daVuot = false;
  let quy = dt.mul(k.tyLeVuotMatDo).minus(tru);
  if (quy.lt(0)) quy = D(0);
  const tongQuy = quy;
  const out: DongTinh[] = [];

  for (const c of thuTu) {
    const dg = D(c.donGia);
    const sl = D(c.soLuong);
    if (!c.matDoHa || D(c.matDoHa).lte(0)) {
      out.push(
        dong({
          ma: "A14",
          noiDung: `Cây trồng xen – ${c.ten}`,
          thamSo: { "Số lượng": `${dinhDang(sl)} ${c.donVi}`, "Đơn giá": `${dinhDang(dg)} đ (${c.maDonGia})` },
          congThuc: "Không có mật độ quy định → không xếp vào quỹ diện tích",
          thanhTien: null,
          canCu: k.canCu,
          trangThai: "CAN_XAC_NHAN",
          luaChon,
          canhBao: ["Loại cây không có mật độ quy định: cán bộ xác định cách tính (VM-10)"],
        }),
      );
      continue;
    }
    const m2MotCay = D(10000).div(c.matDoHa);
    const sucChua = daVuot && cachXep === "DUNG_KHI_VUOT" ? D(0) : quy.div(m2MotCay).floor();
    const du = sl.lt(sucChua) ? sl : sucChua;
    const vuot = sl.minus(du);
    if (vuot.gt(0)) daVuot = true;
    quy = quy.minus(du.mul(m2MotCay));
    const tien = du.mul(dg).plus(vuot.mul(dg).mul(k.tyLePhanVuot));
    out.push(
      dong({
        ma: "A14",
        noiDung: `Cây trồng xen – ${c.ten}`,
        thamSo: {
          "Số lượng kiểm đếm": `${dinhDang(sl)} ${c.donVi}`,
          "Mật độ quy định": `${dinhDang(c.matDoHa)} ${c.donVi}/ha → ${dinhDang(m2MotCay, 2)} m²/${c.donVi}`,
          "Hưởng 100%": dinhDang(du),
          [`Vượt (hưởng ${D(k.tyLePhanVuot).mul(100).toString()}%)`]: dinhDang(vuot),
          "Quỹ diện tích còn lại sau dòng này": `${dinhDang(quy, 2)} m²`,
          "Đơn giá": `${dinhDang(dg)} đ/${c.donVi} (${c.maDonGia})`,
        },
        congThuc: "Số cây trong quỹ × ĐG + Số cây vượt × ĐG × 30%",
        thanhTien: tien,
        canCu: k.canCu,
        trangThai: canXacNhan ? "CAN_XAC_NHAN" : "TAM_TINH",
        luaChon,
        canhBao: canhBaoChung,
      }),
    );
  }
  return { dong: out, quyM2: tongQuy, daDungM2: tongQuy.minus(quy), thuTu };
}

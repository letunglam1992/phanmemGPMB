/**
 * Trích thông tin phần đầu văn bản hành chính (thể thức theo NĐ 30/2020/NĐ-CP) từ chữ OCR:
 * cơ quan ban hành, số ký hiệu, ngày ban hành, loại văn bản, trích yếu → câu "Căn cứ …" gợi ý.
 * Chỉ là GỢI Ý: OCR có thể sai chữ, cán bộ đối chiếu với bản gốc trước khi dùng.
 */

export interface ThongTinVanBan {
  coQuan: string;
  so: string;
  /** dd/mm/yyyy */
  ngay: string;
  loai: string;
  trichYeu: string;
  canCu: string;
  /** Các phần không nhận ra được */
  thieu: string[];
}

const LOAI = ["QUYẾT ĐỊNH", "NGHỊ QUYẾT", "THÔNG BÁO", "TỜ TRÌNH", "KẾ HOẠCH", "BÁO CÁO", "CHỈ THỊ", "THÔNG TƯ", "NGHỊ ĐỊNH", "LUẬT", "BIÊN BẢN", "CÔNG VĂN", "HƯỚNG DẪN", "QUY ĐỊNH"];
/** Ký hiệu loại văn bản trong số ký hiệu (Phụ lục III NĐ 30/2020) */
const KY_HIEU: Record<string, string> = {
  "QĐ": "QUYẾT ĐỊNH", "NQ": "NGHỊ QUYẾT", "TB": "THÔNG BÁO", "TTr": "TỜ TRÌNH", "KH": "KẾ HOẠCH", "BC": "BÁO CÁO", "CT": "CHỈ THỊ",
  "TT": "THÔNG TƯ", "NĐ": "NGHỊ ĐỊNH", "BB": "BIÊN BẢN", "HD": "HƯỚNG DẪN",
};
const QUOC_HIEU = /C[ỘO]NG\s+H[OÒÓ][AÀÁ]\s+X[ÃA]\s+H[ỘO]I\s+CH[ỦU]\s+NGH[ĨI]A\s+VI[ỆE]T\s+NAM|Đ[ộo]c\s+l[ậa]p\s*[-–—]\s*T[ựu]\s+do\s*[-–—]\s*H[ạa]nh\s+ph[úu]c/gi;

const hoaDau = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const thuongDau = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** "SƠN LA" → "Sơn La" */
const tenRieng = (s: string) => s.toLowerCase().split(/\s+/).filter(Boolean).map(hoaDau).join(" ");

/** Chuẩn hóa tên cơ quan viết hoa ở góc trái về cách viết trong câu căn cứ. */
export function chuanHoaCoQuan(dong: string[]): string {
  const ds = dong.map((d) => d.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!ds.length) return "";
  // "ỦY BAN NHÂN DÂN" + "TỈNH SƠN LA" là một tên; "UBND TỈNH …" + "SỞ …" thì cơ quan ban hành là dòng cuối
  const chiTenCq = /^((ỦY|UỶ) BAN NHÂN DÂN|HỘI ĐỒNG NHÂN DÂN)$/.test(ds[0]!);
  let s = chiTenCq ? ds.slice(0, 2).join(" ") : ds[ds.length - 1]!;
  s = s.replace(/^(ỦY|UỶ) BAN NHÂN DÂN\b/, "UBND").replace(/^HỘI ĐỒNG NHÂN DÂN\b/, "HĐND");
  const m = s.match(/^(UBND|HĐND)\s+(TỈNH|THÀNH PHỐ|HUYỆN|THỊ XÃ|XÃ|PHƯỜNG|THỊ TRẤN)\s+(.+)$/);
  if (m) return `${m[1]} ${m[2]!.toLowerCase()} ${tenRieng(m[3]!)}`;
  // Cơ quan khác (sở, phòng, ban…): không phân biệt được danh từ riêng khi chữ in hoa → viết thường, cán bộ sửa lại
  return s !== s.toUpperCase() ? s : hoaDau(s.toLowerCase());
}

export function trichThongTin(chu: string): ThongTinVanBan {
  const dong = chu.split(/\r?\n/).map((d) => d.replace(QUOC_HIEU, " ").replace(/\s+/g, " ").trim());
  const thieu: string[] = [];

  // Số ký hiệu: "Số: 1966/QĐ-UBND", "Số 23/UBND-THKT", "Số: 152/2025/NQ-HĐND"
  const mSo = chu.match(/S[ốôo]\s*[:.]?\s*(\d{1,6})\s*\/\s*((?:\d{4}\s*\/\s*)?[A-ZĐa-zđ0-9&.]+(?:\s*[-–]\s*[A-ZĐa-zđ0-9&.]+)*)/);
  const so = mSo ? `${mSo[1]}/${mSo[2]!.replace(/\s+/g, "").replace(/–/g, "-")}` : "";
  if (!so) thieu.push("số ký hiệu");

  // Ngày: "…, ngày 05 tháng 8 năm 2025"
  const mNgay = chu.match(/ng[àa]y\s+(\d{1,2})\s+th[áa]ng\s+(\d{1,2})\s+n[ăa]m\s+(\d{4})/i);
  const ngay = mNgay ? `${mNgay[1]!.padStart(2, "0")}/${mNgay[2]!.padStart(2, "0")}/${mNgay[3]}` : "";
  if (!ngay) thieu.push("ngày ban hành");

  // Loại văn bản: dòng viết hoa đúng tên loại; không có thì suy từ ký hiệu (công văn: không có tên loại)
  let iLoai = dong.findIndex((d) => LOAI.includes(d.replace(/[:.]$/, "").toUpperCase()) && d === d.toUpperCase());
  let loai = iLoai >= 0 ? dong[iLoai]!.replace(/[:.]$/, "") : "";
  if (!loai && mSo) {
    const kh = mSo[2]!.replace(/^\d{4}\//, "").split(/[-–]/)[0]!.trim();
    loai = KY_HIEU[kh] ?? (/^(UBND|[A-ZĐ]{2,})/.test(kh) ? "CÔNG VĂN" : "");
  }
  if (!loai) thieu.push("loại văn bản");

  // Trích yếu: các dòng ngay sau tên loại, đến dòng trống / "Căn cứ" / "Kính gửi" / tên chức danh viết hoa
  let trichYeu = "";
  if (iLoai >= 0) {
    const ds: string[] = [];
    for (let i = iLoai + 1; i < dong.length; i++) {
      const d = dong[i]!;
      if (!d) {
        if (ds.length) break;
        continue;
      }
      if (/^(Căn cứ|Kính gửi|Theo đề nghị|Xét đề nghị)/i.test(d) || (d === d.toUpperCase() && /[A-ZĐ]/.test(d) && ds.length)) break;
      ds.push(d);
      if (ds.length >= 4) break;
    }
    trichYeu = ds.join(" ").replace(/\s+/g, " ").replace(/[.;,]$/, "");
  } else {
    // Công văn: trích yếu dạng "V/v …" dưới số ký hiệu
    const mVv = chu.match(/V\/v\s+([^\n]+(?:\n(?!\s*\n)[^\n]+)?)/);
    if (mVv) trichYeu = "Về việc " + mVv[1]!.replace(/\s+/g, " ").trim();
  }
  if (!trichYeu) thieu.push("trích yếu");

  // Cơ quan ban hành: các dòng viết hoa trước dòng "Số"
  const iSo = dong.findIndex((d) => /^S[ốôo]\s*[:.]?\s*\d/.test(d) || /\bS[ốôo]\s*:\s*\d/.test(d));
  const dauTrang = (iSo > 0 ? dong.slice(0, iSo) : dong.slice(0, 4)).filter((d) => d && d === d.toUpperCase() && /[A-ZĐ]/.test(d) && !LOAI.includes(d));
  const coQuan = chuanHoaCoQuan(dauTrang.slice(-3));
  if (!coQuan) thieu.push("cơ quan ban hành");

  const tenLoai = loai ? hoaDau(loai.toLowerCase()) : "Văn bản";
  const ty = /^(V\/v|Về việc)\s*/i.test(trichYeu) ? trichYeu.replace(/^(V\/v|Về việc)\s*/i, "về việc ") : thuongDau(trichYeu);
  const canCu = ["Căn cứ", tenLoai, so && `số ${so}`, ngay && `ngày ${ngay}`, coQuan && `của ${coQuan}`, ty].filter(Boolean).join(" ") + ";";
  return { coQuan, so, ngay, loai: tenLoai, trichYeu, canCu, thieu };
}

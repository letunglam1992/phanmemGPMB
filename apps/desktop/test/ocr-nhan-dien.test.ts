import { describe, expect, it } from "vitest";
import { chuanHoaCoQuan, trichThongTin } from "../src/ocr/nhan-dien";

describe("Nhận diện thông tin văn bản từ chữ OCR", () => {
  it("quyết định: hai cột tiêu đề bị ghép một dòng, trích yếu nhiều dòng", () => {
    const chu = `ỦY BAN NHÂN DÂN CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
TỈNH SƠN LA Độc lập - Tự do - Hạnh phúc

Số: 1966/QĐ-UBND Sơn La, ngày 05 tháng 8 năm 2025

QUYẾT ĐỊNH
Ban hành Sổ tay hướng dẫn trình tự, thủ tục thu hồi đất,
bồi thường, hỗ trợ, tái định cư

CHỦ TỊCH ỦY BAN NHÂN DÂN TỈNH SƠN LA
Căn cứ Luật Tổ chức chính quyền địa phương;`;
    const t = trichThongTin(chu);
    expect(t.so).toBe("1966/QĐ-UBND");
    expect(t.ngay).toBe("05/08/2025");
    expect(t.loai).toBe("Quyết định");
    expect(t.coQuan).toBe("UBND tỉnh Sơn La");
    expect(t.trichYeu).toBe("Ban hành Sổ tay hướng dẫn trình tự, thủ tục thu hồi đất, bồi thường, hỗ trợ, tái định cư");
    expect(t.canCu).toBe("Căn cứ Quyết định số 1966/QĐ-UBND ngày 05/08/2025 của UBND tỉnh Sơn La ban hành Sổ tay hướng dẫn trình tự, thủ tục thu hồi đất, bồi thường, hỗ trợ, tái định cư;");
    expect(t.thieu).toEqual([]);
  });

  it("nghị quyết có năm trong số ký hiệu; công văn suy loại từ ký hiệu, trích yếu V/v", () => {
    const nq = trichThongTin("HỘI ĐỒNG NHÂN DÂN\nTỈNH SƠN LA\nSố: 152/2025/NQ-HĐND\nSơn La, ngày 29 tháng 12 năm 2025\n\nNGHỊ QUYẾT\nQuy định bảng giá các loại đất trên địa bàn tỉnh Sơn La\n\nHỘI ĐỒNG NHÂN DÂN TỈNH SƠN LA");
    expect(nq.so).toBe("152/2025/NQ-HĐND");
    expect(nq.canCu).toBe("Căn cứ Nghị quyết số 152/2025/NQ-HĐND ngày 29/12/2025 của HĐND tỉnh Sơn La quy định bảng giá các loại đất trên địa bàn tỉnh Sơn La;");
    const cv = trichThongTin("UBND XÃ CHIỀNG MUNG\nSố: 1335/UBND-KT\nV/v xác nhận nguồn gốc, thời điểm sử dụng đất\n\nChiềng Mung, ngày 14 tháng 7 năm 2026");
    expect(cv.loai).toBe("Công văn");
    expect(cv.coQuan).toBe("UBND xã Chiềng Mung");
    expect(cv.canCu).toBe("Căn cứ Công văn số 1335/UBND-KT ngày 14/07/2026 của UBND xã Chiềng Mung về việc xác nhận nguồn gốc, thời điểm sử dụng đất;");
  });

  it("quốc hiệu viết 'HOÀ' (OCR thực tế) vẫn được tách khỏi tên cơ quan", () => {
    const t = trichThongTin("UỶ BAN NHÂN DÂN CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM\nXÃ CHIỀNG MUNG Độc lập - Tự do - Hạnh phúc\nSố: 12/QĐ-UBND Chiềng Mung, ngày 27 tháng 09 năm 2026\nQUYẾT ĐỊNH\nPhê duyệt phương án bồi thường\nCHỦ TỊCH ỦY BAN NHÂN DÂN XÃ");
    expect(t.coQuan).toBe("UBND xã Chiềng Mung");
    expect(t.canCu).toBe("Căn cứ Quyết định số 12/QĐ-UBND ngày 27/09/2026 của UBND xã Chiềng Mung phê duyệt phương án bồi thường;");
  });

  it("không nhận ra thì báo phần thiếu, không đoán", () => {
    const t = trichThongTin("chữ mờ không đọc được");
    expect(t.thieu).toEqual(["số ký hiệu", "ngày ban hành", "loại văn bản", "trích yếu", "cơ quan ban hành"]);
    expect(chuanHoaCoQuan(["UBND TỈNH SƠN LA", "SỞ NÔNG NGHIỆP VÀ MÔI TRƯỜNG"])).toBe("Sở nông nghiệp và môi trường");
  });
});

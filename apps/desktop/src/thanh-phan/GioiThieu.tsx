import { HopThoai } from "./chung";
import { BAN_QUYEN, MA_BUILD, NGAY_BUILD, PHIEN_BAN } from "../phien-ban";
import { TheCapNhat } from "./CapNhat";
import type { KetQuaKiemTra } from "../cap-nhat";

/** Giới thiệu phần mềm, phiên bản, bản quyền, liên hệ. */
export function HopGioiThieu({ dong, kqCapNhat }: { dong: () => void; kqCapNhat?: KetQuaKiemTra | null }) {
  return (
    <HopThoai tieuDe="Giới thiệu, bản quyền" rong={620} dong={dong} chan={<button className="nut nut-chinh" onClick={dong}>Đóng</button>}>
      <div className="gt-dau">
        <span className="gt-logo" aria-hidden>
          <svg width="56" height="38" viewBox="0 0 44 30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"><path d="M2 27L15 7l7 10 5-6 15 16z" /><path d="M11 27l7-9 5 6" /></svg>
        </span>
        <div>
          <div className="gt-ten">Phần mềm hỗ trợ bồi thường, hỗ trợ, tái định cư</div>
          <div className="mo">Ủy ban nhân dân tỉnh Sơn La · dùng cho đơn vị thực hiện bồi thường, GPMB và cơ quan chuyên môn</div>
        </div>
      </div>
      <table className="bang gt-bang">
        <tbody>
          <tr><th>Phiên bản</th><td><b>{PHIEN_BAN}</b>{NGAY_BUILD && <> · bản dựng ngày {NGAY_BUILD.split("-").reverse().join("/")}</>}{MA_BUILD && <span className="mo"> · mã {MA_BUILD}</span>}</td></tr>
          <tr><th>Tác giả, bản quyền</th><td><b>{BAN_QUYEN.tacGia}</b> – {BAN_QUYEN.donVi}</td></tr>
          <tr><th>Liên hệ</th><td>Điện thoại: <b>{BAN_QUYEN.dienThoai}</b></td></tr>
          <tr><th>Bộ chính sách</th><td>Sơn La, hiệu lực 31/3/2026 (QĐ 106/2025, QĐ 14/2026, QĐ 32/2025, NQ 152/2025)</td></tr>
        </tbody>
      </table>
      <TheCapNhat kqDau={kqCapNhat} />
      <p className="chu-nho mb-0">
        <b>© {BAN_QUYEN.nam} {BAN_QUYEN.tacGia}. All rights reserved.</b>
        <br />
        Phần mềm được bảo hộ quyền tác giả. Nghiêm cấm sao chép, sửa đổi, phân phối, dịch ngược hoặc khai thác thương mại khi chưa được chủ sở hữu cho phép.
      </p>
      <p className="chu-nho mo mb-0">
        Phần mềm hỗ trợ tính toán, theo dõi và soạn thảo; số liệu, văn bản do phần mềm lập là dự thảo — cán bộ có thẩm quyền kiểm tra, phê duyệt theo quy định.
        Dữ liệu hồ sơ lưu trên máy (hoặc máy chủ mạng nội bộ của đơn vị), không gửi ra ngoài.
      </p>
    </HopThoai>
  );
}

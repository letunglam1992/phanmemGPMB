import { useUngDung } from "../ung-dung";
import { THOI_HAN_THUNG_RAC, duocXoaHan, soNgayTrongThungRac, type DauXoa } from "../rang-buoc";

/**
 * Thùng rác (P0-4): dự án, hồ sơ đã xóa mềm. Khôi phục: người có quyền sửa (hồ sơ) / xóa dự án (dự án).
 * Xóa hẳn: chỉ Quản trị, sau THOI_HAN_THUNG_RAC ngày; không tự xóa (QD-24).
 */
export function ThungRac() {
  const { thungRac, dsDuAn, quyen, khoiPhucHo, khoiPhucDuAn, xoaHanHo, xoaHanDuAn } = useUngDung();
  const tenDuAn = (id: string) => dsDuAn.find((d) => d.id === id)?.ten ?? "—";
  const oXoa = (d: DauXoa) => (
    <>
      <td className="chu-nho">{new Date(d.luc).toLocaleString("vi-VN")}</td>
      <td className="chu-nho">{d.nguoi}</td>
      <td className="chu-nho">{d.lyDo}</td>
      <td className="so">{soNgayTrongThungRac(d)}</td>
    </>
  );
  const nutXoaHan = (d: DauXoa, lam: () => void, ten: string) => {
    const du = duocXoaHan(d);
    const coQuyen = quyen("XOA_HAN");
    return (
      <button
        className="nut nut-nho nut-nguy"
        disabled={!du || !coQuyen}
        title={!coQuyen ? "Chỉ tài khoản Quản trị được xóa hẳn" : !du ? `Còn ${THOI_HAN_THUNG_RAC - soNgayTrongThungRac(d)} ngày mới được xóa hẳn` : undefined}
        onClick={() => confirm(`Xóa hẳn ${ten}? Không khôi phục được (trừ từ bản sao lưu).`) && lam()}
      >
        Xóa hẳn
      </button>
    );
  };
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Quản trị</div>
          <h1>Thùng rác</h1>
          <div className="mo-ta">Dự án, hồ sơ đã xóa — khôi phục được. Xóa hẳn chỉ tài khoản Quản trị, sau {THOI_HAN_THUNG_RAC} ngày; phần mềm không tự xóa. Hồ sơ có trong phương án đã chốt/phê duyệt hoặc đã chi trả không xóa được.</div>
        </div>
      </div>
      <div className="the" style={{ marginBottom: 14 }}>
        <div className="the-dau"><h3>Dự án</h3><span className="mo">{thungRac.duAn.length}</span></div>
        <table className="bang">
          <thead><tr><th>Tên dự án</th><th>Xóa lúc</th><th>Người xóa</th><th>Lý do</th><th className="so">Số ngày</th><th /></tr></thead>
          <tbody>
            {thungRac.duAn.map((d) => (
              <tr key={d.id}>
                <td><b>{d.ten}</b></td>
                {oXoa(d.daXoa!)}
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="nut nut-nho" disabled={!quyen("XOA_DU_AN")} onClick={() => void khoiPhucDuAn(d.id)}>Khôi phục</button>{" "}
                  {nutXoaHan(d.daXoa!, () => void xoaHanDuAn(d.id), `dự án "${d.ten}" và toàn bộ hồ sơ (phần mềm yêu cầu lưu một bản sao lưu trước)`)}
                </td>
              </tr>
            ))}
            {!thungRac.duAn.length && <tr><td colSpan={6} className="trong">Không có.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="the">
        <div className="the-dau"><h3>Hồ sơ</h3><span className="mo">{thungRac.ho.length}</span></div>
        <table className="bang">
          <thead><tr><th>Mã</th><th>Họ tên</th><th>Dự án</th><th>Xóa lúc</th><th>Người xóa</th><th>Lý do</th><th className="so">Số ngày</th><th /></tr></thead>
          <tbody>
            {thungRac.ho.map((h) => (
              <tr key={h.id}>
                <td>{h.ma}</td>
                <td><b>{h.ten}</b></td>
                <td className="chu-nho">{tenDuAn(h.duAnId)}</td>
                {oXoa(h.daXoa!)}
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => void khoiPhucHo(h.id)}>Khôi phục</button>{" "}
                  {nutXoaHan(h.daXoa!, () => void xoaHanHo(h.id), `hồ sơ ${h.ma} – ${h.ten}`)}
                </td>
              </tr>
            ))}
            {!thungRac.ho.length && <tr><td colSpan={8} className="trong">Không có.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

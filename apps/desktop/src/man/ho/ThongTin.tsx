import { useUngDung } from "../../ung-dung";
import { TEN_DOI_TUONG, type DuAn, type Ho, type LoaiDoiTuong } from "../../mo-hinh";
import { O } from "../../thanh-phan/chung";
import { Chon } from "../../thanh-phan/Chon";
import { hoTrungMa } from "../../ma-ho";
import { HO_TRO_THEO_DOI, canhBaoHoTroTrung, hoSoKhac, hoTroDaGhi, lienQuanNhanKhau } from "../../nguoi-co-dat";
import { coDot, dsDot, lyDoKhongDoiDot, tenDot, timDot } from "../../dot-thu-hoi";
import type { Tab } from "./kieu";

export const VB_DA_BAN_HANH = [
  ["tb_thu_hoi", "Thông báo thu hồi đất (Mẫu 01)"],
  ["qd_kiem_dem", "QĐ kiểm đếm bắt buộc (Mẫu 06)"],
  ["qd_thu_hoi", "QĐ thu hồi đất (Mẫu 15)"],
  ["tb_gui_tien", "TB gửi tiền vào tài khoản (Mẫu 18)"],
] as const;

export function TabThongTin({ h, doi, duAn, goc }: Tab & { duAn: DuAn; goc?: Ho }) {
  const { hoCua, nguoiCoDat, nhanKhauCoDinhDanh, dsCanBo, di } = useUngDung();
  const khac = hoSoKhac(nguoiCoDat, h);
  const lqNk = lienQuanNhanKhau(nguoiCoDat, nhanKhauCoDinhDanh, h);
  const trungHt = canhBaoHoTroTrung(nguoiCoDat, h);
  const trung = hoTrungMa(hoCua(h.duAnId, true), h.ma, h.id);
  const chanDot = goc ? lyDoKhongDoiDot(duAn, goc, h.dotId) : null;
  const s = (k: keyof Ho) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => doi({ ...h, [k]: e.target.value });
  const vb = h.vanBan ?? {};
  return (
    <div className="luoi">
    <div className="the the-than">
      <div className="luoi luoi-3">
        <O nhan="Mã hồ sơ" lichSu="ma" goiY={trung ? <span className="chu-do">Trùng mã với hồ sơ “{trung.ten}” — đổi mã khác</span> : !h.ma.trim() ? <span className="chu-do">Chưa có mã</span> : undefined}>
          <input className={trung || !h.ma.trim() ? "loi-nhap" : ""} value={h.ma} onChange={s("ma")} />
        </O>
        <O nhan="Đối tượng">
          <Chon value={h.loai} onChange={(e) => doi({ ...h, loai: e.target.value as LoaiDoiTuong })}>
            {Object.entries(TEN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Chon>
        </O>
        <O nhan={h.loai === "TO_CHUC" ? "Tên tổ chức" : "Họ tên chủ hộ / cá nhân"} lichSu="ten"><input value={h.ten} onChange={s("ten")} /></O>
        <O nhan={h.loai === "TO_CHUC" ? "Mã số thuế / QĐ thành lập" : "Số định danh cá nhân"} lichSu="soDinhDanh" goiY="Thông tin cá nhân chỉ lưu trên máy này"><input value={h.soDinhDanh} onChange={s("soDinhDanh")} /></O>
        {h.loai !== "TO_CHUC" && <O nhan="Ngày cấp" lichSu="ngayCapDinhDanh"><input value={h.ngayCapDinhDanh ?? ""} placeholder="dd/mm/yyyy" onChange={(e) => doi({ ...h, ngayCapDinhDanh: e.target.value })} /></O>}
        {h.loai !== "TO_CHUC" && <O nhan="Nơi cấp" lichSu="noiCapDinhDanh"><input value={h.noiCapDinhDanh ?? ""} onChange={(e) => doi({ ...h, noiCapDinhDanh: e.target.value })} /></O>}
        <O nhan="Điện thoại" lichSu="dienThoai"><input value={h.dienThoai} onChange={s("dienThoai")} /></O>
        <O nhan="Cán bộ phụ trách" lichSu="phuTrach" goiY="Hồ sơ hiện trong “Việc của tôi” của cán bộ được phân công">
          <Chon value={h.phuTrach ?? ""} aria-label="Cán bộ phụ trách" onChange={(e) => doi({ ...h, phuTrach: e.target.value || undefined })}>
            <option value="">Chưa phân công</option>
            {dsCanBo.filter((c) => c.hoatDong || c.ten === h.phuTrach).map((c) => <option key={c.ten} value={c.ten}>{c.hoTen} ({c.ten}){c.chucVu ? ` – ${c.chucVu}` : ""}</option>)}
            {h.phuTrach && !dsCanBo.some((c) => c.ten === h.phuTrach) && <option value={h.phuTrach}>{h.phuTrach}</option>}
          </Chon>
        </O>
        {(coDot(duAn) || h.dotId) && (
          <O nhan="Đợt thu hồi" lichSu="dotId" goiY={chanDot ? <span className="chu-do">Không đổi đợt được: {chanDot}</span> : "Phương án chốt, phê duyệt theo đợt"}>
            <Chon className={chanDot ? "loi-nhap" : ""} value={h.dotId ?? ""} aria-label="Đợt thu hồi" onChange={(e) => doi({ ...h, dotId: e.target.value || undefined })}>
              <option value="">Chưa xếp đợt</option>
              {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)}</option>)}
              {h.dotId && !timDot(duAn, h.dotId) && <option value={h.dotId}>(đợt đã xóa)</option>}
            </Chon>
          </O>
        )}
        <O nhan="Địa chỉ thường trú / trụ sở" lichSu="diaChi"><input value={h.diaChi} onChange={s("diaChi")} /></O>
        <O nhan="Vướng mắc cần ưu tiên xử lý" lichSu="vuongMac" className="ca-hang" goiY="Khiếu nại, chưa nhận tiền, tranh chấp, chưa bàn giao… Hồ sơ có vướng mắc được tô đỏ trên bản đồ và đưa vào cảnh báo.">
          <div className="nhom-nut">
            <input className="gian" value={h.vuongMac?.noiDung ?? ""} placeholder="Để trống nếu không có" onChange={(e) => doi({ ...h, vuongMac: e.target.value ? { noiDung: e.target.value, ngay: h.vuongMac?.ngay ?? new Date().toISOString().slice(0, 10) } : null })} />
            {h.vuongMac && <button className="nut" onClick={() => doi({ ...h, vuongMac: null })}>Đã giải quyết</button>}
          </div>
        </O>
      </div>
    </div>
    {lqNk.length > 0 && (
      <div className="the" data-nhan-khau-trung>
        <div className="the-dau"><h3>Người của hồ sơ này ở hồ sơ khác (qua nhân khẩu)</h3><span className="mo chu-nho">Khớp số định danh của chủ hồ sơ và nhân khẩu — phần mềm không kết luận; cán bộ kiểm tra tách hộ, hỗ trợ theo nhân khẩu</span></div>
        <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
          {lqNk.map((x, i) => (
            <div key={i} className="nhom-nut giua-doc">
              <span style={{ flex: 1 }}>{x.moTa}</span>
              <button className="nut nut-nho" onClick={() => di({ ten: "ho", duAnId: x.khac.duAn.id, hoId: x.khac.h.id })}>Mở</button>
            </div>
          ))}
        </div>
      </div>
    )}
    {khac.length > 0 && (
      <div className="the" data-nguoi-co-dat>
        <div className="the-dau"><h3>Hồ sơ khác cùng số định danh</h3><span className="mo chu-nho">Khớp theo số định danh trên dữ liệu trong máy/mạng nội bộ — phần mềm không kết luận, cán bộ kiểm tra</span></div>
        {trungHt.map((c) => <div key={c.loai} className="thong-bao thong-bao-vang chu-nho" style={{ margin: "0 12px 8px" }}>{c.noiDung} <span className="mo">({c.canCu})</span></div>)}
        <table className="bang">
          <thead><tr><th>Dự án</th><th>Mã</th><th>Họ tên</th><th>Hỗ trợ đã ghi</th><th /></tr></thead>
          <tbody>
            {khac.map((x) => (
              <tr key={x.h.id}>
                <td>{x.duAn.ten}</td><td>{x.h.ma}</td><td>{x.h.ten}</td>
                <td className="chu-nho">{hoTroDaGhi(x.h).map((l) => HO_TRO_THEO_DOI[l].ten).join("; ") || "—"}</td>
                <td><button className="nut nut-nho" onClick={() => di({ ten: "ho", duAnId: x.duAn.id, hoId: x.h.id })}>Mở</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <div className="the">
      <div className="the-dau"><h3>Văn bản đã ban hành cho hộ</h3><span className="mo chu-nho">Tự ghi khi tạo văn bản có số; dùng làm căn cứ cho mẫu sau</span></div>
      <table className="bang">
        <thead><tr><th>Văn bản</th><th style={{ width: 220 }}>Số, ký hiệu</th><th style={{ width: 180 }}>Ngày</th></tr></thead>
        <tbody>
          {VB_DA_BAN_HANH.map(([k, ten]) => (
            <tr key={k}>
              <td>{ten}</td>
              <td><input value={vb[`${k}_so`] ?? ""} placeholder="vd. 12/QĐ-UBND" onChange={(e) => doi({ ...h, vanBan: { ...vb, [`${k}_so`]: e.target.value } })} /></td>
              <td><input value={vb[`${k}_ngay`] ?? ""} placeholder="dd/mm/yyyy" onChange={(e) => doi({ ...h, vanBan: { ...vb, [`${k}_ngay`]: e.target.value } })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

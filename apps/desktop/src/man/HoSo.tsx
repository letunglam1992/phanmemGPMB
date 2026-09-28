import { useEffect, useMemo, useState } from "react";
import { kiemTraDuyetBuoc } from "../tai-khoan";
import { hanCuaBuoc, tinhHanBuoc } from "../han-buoc";
import { homNayIso } from "../trang-thai";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, TEN_DOI_TUONG, TEN_TRANG_THAI_BUOC, taoId, type Ho, type LoaiDoiTuong, type TrangThaiBuoc } from "../mo-hinh";
import { NhanDong, O, ThanhBuoc, ngayVN, tien } from "../thanh-phan/chung";
import { TabThua } from "./ho/Thua";
import { TabChiTra } from "./ho/ChiTra";
import { TabKiemDem } from "./ho/KiemDem";
import { TabTinhToan } from "./ho/TinhToan";
import { DANH_MUC_MAU } from "../van-ban/danh-muc";
import type { DiChuyen } from "@gpmb/core";

const CAC_TAB = [
  ["thong-tin", "Thông tin"],
  ["nhan-khau", "Nhân khẩu"],
  ["thua", "Thửa đất"],
  ["kiem-dem", "Kiểm đếm tài sản"],
  ["ho-tro", "Hỗ trợ"],
  ["tinh", "Tính toán, giải trình"],
  ["tien-do", "Tiến độ"],
  ["chi-tra", "Chi trả"],
  ["nhat-ky", "Nhật ký"],
] as const;

export function HoSo({ duAnId, hoId, tabDau }: { duAnId: string; hoId: string; tabDau?: string }) {
  const { dsDuAn, hoCua, di, luuHo, chinhSach, xoaHo, quyen } = useUngDung();
  const choSua = quyen("SUA_HO_SO");
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const goc = hoCua(duAnId).find((h) => h.id === hoId);
  const [h, setH] = useState<Ho | undefined>(goc);
  const [tab, setTab] = useState<string>(tabDau ?? "thong-tin");
  const [daSua, setDaSua] = useState(false);
  useEffect(() => {
    setH(goc);
    setDaSua(false);
  }, [goc]);
  const kq = useMemo(() => (duAn && h ? tinhHo(chinhSach(duAn), duAn, h) : null), [duAn, h, chinhSach]);
  if (!duAn || !h || !kq) return <div className="trang trong">Không tìm thấy hồ sơ.</div>;

  const doi = (moi: Ho) => {
    setH(moi);
    setDaSua(true);
  };
  const luu = async (ghiChu = "Cập nhật hồ sơ") => {
    await luuHo(h, ghiChu);
    setDaSua(false);
  };

  const dem: Record<string, number> = { "nhan-khau": h.nhanKhau.length, thua: h.thua.length, "kiem-dem": h.taiSan.length, tinh: kq.tong.soDongCanXacNhan + kq.tong.soDongThieuCanCu };

  return (
    <div className="trang">
      <div className="duong-dan">
        <button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / <button onClick={() => di({ ten: "du-an", duAnId })}>{duAn.ten}</button> / Hồ sơ
      </div>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Hồ sơ hộ, cá nhân, tổ chức</div>
          <h1>{h.ma} · {h.ten}</h1>
          <div className="mo-ta">{h.vuongMac && <span className="nhan nhan-do" style={{ marginRight: 6 }}>! Vướng mắc: {h.vuongMac.noiDung}</span>}{TEN_DOI_TUONG[h.loai]} · {h.diaChi || "Chưa có địa chỉ"} · {h.thua.length} thửa · {h.nhanKhau.length} nhân khẩu</div>
        </div>
        <div className="phai" style={{ alignItems: "center" }}>
          <div style={{ textAlign: "right", marginRight: 8 }}>
            <div className="mo chu-nho">Tổng tạm tính (sau làm tròn)</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{tien(kq.tong.tongLamTron)} đ</div>
          </div>
          {daSua && <span className="nhan nhan-vang">Chưa lưu</span>}
          {choSua && <button className="nut" disabled={!daSua} onClick={() => { setH(goc); setDaSua(false); }}>Hoàn tác</button>}
          {choSua && <button className="nut nut-chinh" disabled={!daSua} onClick={() => luu()}>Lưu hồ sơ</button>}
        </div>
      </div>
      <div className="the" style={{ padding: "10px 14px", marginBottom: 14 }}>
        <ThanhBuoc ho={h} onChon={() => setTab("tien-do")} />
      </div>

      <div className="tab">
        {CAC_TAB.map(([ma, ten]) => (
          <button key={ma} className={tab === ma ? "chon" : ""} onClick={() => setTab(ma)}>
            {ten}
            {dem[ma] ? <span className="dem">{dem[ma]}</span> : null}
          </button>
        ))}
      </div>

      {/* tài khoản không có quyền sửa: khóa các ô nhập của các thẻ nhập liệu */}
      <fieldset className="khung-quyen" disabled={!choSua}>
      {tab === "thong-tin" && <TabThongTin h={h} doi={doi} />}
      {tab === "nhan-khau" && <TabNhanKhau h={h} doi={doi} />}
      {tab === "thua" && <TabThua h={h} duAn={duAn} doi={doi} />}
      {tab === "kiem-dem" && <TabKiemDem h={h} doi={doi} />}
      {tab === "ho-tro" && <TabHoTro h={h} doi={doi} />}
      </fieldset>
      {tab === "tinh" && <TabTinhToan h={h} duAn={duAn} kq={kq} />}
      {tab === "chi-tra" && <fieldset className="khung-quyen" disabled={!choSua}><TabChiTra h={h} duAn={duAn} doi={doi} /></fieldset>}
      {tab === "tien-do" && <TabTienDo h={h} doi={doi} soanMau={(ma) => di({ ten: "van-ban", duAnId, ma, hoId: h.id })} luuNgay={async (moi, nk) => { setH(moi); await luuHo(moi, nk); setDaSua(false); }} />}
      {tab === "nhat-ky" && (
        <div className="the">
          <table className="bang">
            <thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Nội dung</th></tr></thead>
            <tbody>
              {[...h.nhatKy].reverse().map((n, i) => (
                <tr key={i}><td className="chu-nho">{new Date(n.luc).toLocaleString("vi-VN")}</td><td>{n.nguoi}</td><td>{n.noiDung}</td></tr>
              ))}
              {h.nhatKy.length === 0 && <tr><td colSpan={3} className="trong">Chưa có.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <button className="nut nut-chu nut-nguy nut-nho" onClick={async () => { if (confirm(`Xóa hồ sơ ${h.ma} – ${h.ten}?`)) { await xoaHo(h.id); di({ ten: "du-an", duAnId }); } }}>Xóa hồ sơ</button>
      </div>
      {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan > 0 && tab !== "tinh" && (
        <div className="thong-bao thong-bao-vang" style={{ marginTop: 14 }}>
          Còn {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan} khoản chưa đủ căn cứ hoặc cần xác nhận — hồ sơ chưa thể chốt.{" "}
          <button className="nut nut-chu nut-nho" onClick={() => setTab("tinh")}>Xem chi tiết</button>
        </div>
      )}
    </div>
  );
}

type Tab = { h: Ho; doi: (h: Ho) => void };

const VB_DA_BAN_HANH = [
  ["tb_thu_hoi", "Thông báo thu hồi đất (Mẫu 01)"],
  ["qd_kiem_dem", "QĐ kiểm đếm bắt buộc (Mẫu 06)"],
  ["qd_thu_hoi", "QĐ thu hồi đất (Mẫu 15)"],
  ["tb_gui_tien", "TB gửi tiền vào tài khoản (Mẫu 18)"],
] as const;

function TabThongTin({ h, doi }: Tab) {
  const s = (k: keyof Ho) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => doi({ ...h, [k]: e.target.value });
  const vb = h.vanBan ?? {};
  return (
    <div className="luoi">
    <div className="the the-than">
      <div className="luoi luoi-3">
        <O nhan="Mã hồ sơ"><input value={h.ma} onChange={s("ma")} /></O>
        <O nhan="Đối tượng">
          <select value={h.loai} onChange={(e) => doi({ ...h, loai: e.target.value as LoaiDoiTuong })}>
            {Object.entries(TEN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </O>
        <O nhan={h.loai === "TO_CHUC" ? "Tên tổ chức" : "Họ tên chủ hộ / cá nhân"}><input value={h.ten} onChange={s("ten")} /></O>
        <O nhan={h.loai === "TO_CHUC" ? "Mã số thuế / QĐ thành lập" : "Số định danh cá nhân"} goiY="Thông tin cá nhân chỉ lưu trên máy này"><input value={h.soDinhDanh} onChange={s("soDinhDanh")} /></O>
        <O nhan="Điện thoại"><input value={h.dienThoai} onChange={s("dienThoai")} /></O>
        <O nhan="Địa chỉ thường trú / trụ sở"><input value={h.diaChi} onChange={s("diaChi")} /></O>
        <O nhan="Vướng mắc cần ưu tiên xử lý" style={{ gridColumn: "1/-1" }} goiY="Khiếu nại, chưa nhận tiền, tranh chấp, chưa bàn giao… Hồ sơ có vướng mắc được tô đỏ trên bản đồ và đưa vào cảnh báo.">
          <div className="nhom-nut">
            <input style={{ flex: 1 }} value={h.vuongMac?.noiDung ?? ""} placeholder="Để trống nếu không có" onChange={(e) => doi({ ...h, vuongMac: e.target.value ? { noiDung: e.target.value, ngay: h.vuongMac?.ngay ?? new Date().toISOString().slice(0, 10) } : null })} />
            {h.vuongMac && <button className="nut" onClick={() => doi({ ...h, vuongMac: null })}>Đã giải quyết</button>}
          </div>
        </O>
      </div>
    </div>
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

function TabNhanKhau({ h, doi }: Tab) {
  const sua = (i: number, k: string, v: string) => doi({ ...h, nhanKhau: h.nhanKhau.map((n, j) => (j === i ? { ...n, [k]: v } : n)) });
  return (
    <div className="the">
      <div className="the-dau">
        <h2>Nhân khẩu</h2>
        <span className="mo chu-nho">Dùng tính hỗ trợ ổn định đời sống, tạm cư</span>
        <div className="phai"><button className="nut nut-nho" onClick={() => doi({ ...h, nhanKhau: [...h.nhanKhau, { id: taoId(), hoTen: "", quanHe: "" }] })}>+ Thêm nhân khẩu</button></div>
      </div>
      <table className="bang">
        <thead><tr><th style={{ width: 40 }}>TT</th><th>Họ tên</th><th style={{ width: 110 }}>Năm sinh</th><th style={{ width: 160 }}>Quan hệ với chủ hộ</th><th>Ghi chú</th><th style={{ width: 40 }} /></tr></thead>
        <tbody>
          {h.nhanKhau.map((n, i) => (
            <tr key={n.id}>
              <td>{i + 1}</td>
              <td><input value={n.hoTen} onChange={(e) => sua(i, "hoTen", e.target.value)} /></td>
              <td><input value={n.namSinh ?? ""} onChange={(e) => sua(i, "namSinh", e.target.value)} /></td>
              <td><input value={n.quanHe} onChange={(e) => sua(i, "quanHe", e.target.value)} /></td>
              <td><input value={n.ghiChu ?? ""} onChange={(e) => sua(i, "ghiChu", e.target.value)} /></td>
              <td><button className="nut nut-chu nut-nguy nut-nho" onClick={() => doi({ ...h, nhanKhau: h.nhanKhau.filter((_, j) => j !== i) })}>✕</button></td>
            </tr>
          ))}
          {h.nhanKhau.length === 0 && <tr><td colSpan={6} className="trong">Chưa có nhân khẩu.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function TabHoTro({ h, doi }: Tab) {
  const ht = h.hoTro;
  const dat = (p: Partial<Ho["hoTro"]>) => doi({ ...h, hoTro: { ...ht, ...p } });
  return (
    <div className="luoi luoi-2">
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ ổn định đời sống</h3><div className="phai"><label><input type="checkbox" checked={!!ht.onDinh} onChange={(e) => dat({ onDinh: e.target.checked ? { dienTichNNDangSuDung: "", diChuyen: "KHONG_DI_CHUYEN" } : undefined })} /> Áp dụng</label></div></div>
        {ht.onDinh && (
          <div className="the-than luoi luoi-2">
            <O nhan="DT đất NN đang sử dụng (m²)" goiY="Tỷ lệ thu hồi = DT đất NN thu hồi / DT đang sử dụng"><input className="o-so" value={ht.onDinh.dienTichNNDangSuDung} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, dienTichNNDangSuDung: e.target.value } })} /></O>
            <O nhan="Di chuyển chỗ ở">
              <select value={ht.onDinh.diChuyen} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, diChuyen: e.target.value as DiChuyen } })}>
                <option value="KHONG_DI_CHUYEN">Không phải di chuyển</option>
                <option value="DI_CHUYEN">Phải di chuyển chỗ ở</option>
                <option value="DEN_VUNG_KHO_KHAN">Di chuyển đến vùng KT-XH khó khăn, ĐBKK</option>
              </select>
            </O>
            <O nhan="Chọn nhóm khi tỷ lệ đúng ngưỡng 30% (QD-16)" goiY="Để trống = mặc định theo NĐ 88">
              <select value={ht.onDinh.chonNhom?.ma ?? ""} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, chonNhom: e.target.value ? { ma: e.target.value, lyDo: ht.onDinh!.chonNhom?.lyDo ?? "" } : undefined } })}>
                <option value="">Mặc định</option>
                <option value="20_30">Từ 20% đến 30% (Đ6 k9 QĐ 14/2026)</option>
                <option value="30_70">Từ 30% đến 70% (NĐ 88)</option>
              </select>
            </O>
            {ht.onDinh.chonNhom && <O nhan="Lý do lựa chọn *"><input className={ht.onDinh.chonNhom.lyDo ? "" : "loi-nhap"} value={ht.onDinh.chonNhom.lyDo} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, chonNhom: { ...ht.onDinh!.chonNhom!, lyDo: e.target.value } } })} /></O>}
          </div>
        )}
      </div>
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ đào tạo, chuyển đổi nghề</h3><div className="phai"><label><input type="checkbox" checked={ht.chuyenDoiNghe} onChange={(e) => dat({ chuyenDoiNghe: e.target.checked })} /> Áp dụng</label></div></div>
        <div className="the-than mo chu-nho">Tính cho từng thửa đất nông nghiệp bị thu hồi: hệ số theo địa bàn (Đ14 PL II QĐ 106, QĐ 14/2026) × giá đất NN cùng loại × min(DT thu hồi; hạn mức của dự án).</div>
      </div>
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ tạm cư</h3><div className="phai"><label><input type="checkbox" checked={!!ht.tamCu} onChange={(e) => dat({ tamCu: e.target.checked ? { soThang: 6, tdcBangDat: false } : undefined })} /> Áp dụng</label></div></div>
        {ht.tamCu && (
          <div className="the-than luoi luoi-2">
            <O nhan="Số tháng tạm cư"><input type="number" min={0} value={ht.tamCu.soThang} onChange={(e) => dat({ tamCu: { ...ht.tamCu!, soThang: Number(e.target.value) } })} /></O>
            <O nhan="Tái định cư bằng đất"><label><input type="checkbox" checked={ht.tamCu.tdcBangDat} onChange={(e) => dat({ tamCu: { ...ht.tamCu!, tdcBangDat: e.target.checked } })} /> Cộng thêm thời gian xây nhà (Đ3 QĐ 14/2026)</label></O>
          </div>
        )}
      </div>
      <div className="the">
        <div className="the-dau"><h3>Mồ mả, khấu trừ</h3></div>
        <div className="the-than luoi luoi-3">
          <O nhan="Số mộ xây"><input type="number" min={0} value={ht.moMa?.xay ?? 0} onChange={(e) => dat({ moMa: { xay: Number(e.target.value), khongXay: ht.moMa?.khongXay ?? 0 } })} /></O>
          <O nhan="Số mộ không xây"><input type="number" min={0} value={ht.moMa?.khongXay ?? 0} onChange={(e) => dat({ moMa: { xay: ht.moMa?.xay ?? 0, khongXay: Number(e.target.value) } })} /></O>
          <O nhan="Khấu trừ nghĩa vụ tài chính (đ)"><input className="o-so" value={h.khauTru} onChange={(e) => doi({ ...h, khauTru: e.target.value })} /></O>
        </div>
      </div>
    </div>
  );
}

function TabTienDo({ h, doi, luuNgay, soanMau }: Tab & { luuNgay: (h: Ho, nk: string) => Promise<void>; soanMau: (ma: string) => void }) {
  const [chon, setChon] = useState(CAC_BUOC[Math.max(0, CAC_BUOC.findIndex((b) => h.tienDo[b.ma]?.trangThai !== "XONG"))]!.ma);
  const b = CAC_BUOC.find((x) => x.ma === chon)!;
  const bh = h.tienDo[chon] ?? { trangThai: "CHUA" as TrangThaiBuoc };
  const { taiKhoan, quyen, bao, lich } = useUngDung();
  const han = hanCuaBuoc(chon);
  const th = han ? tinhHanBuoc(h, han, homNayIso(), lich) : null;
  const loiDuyet = taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, bh) : "Chưa đăng nhập";
  const datBuoc = (p: Partial<typeof bh>) => {
    if (p.trangThai === "XONG" && bh.trangThai !== "XONG") return void doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`);
    if (p.trangThai === "CHO_DUYET" && bh.trangThai !== "CHO_DUYET") return void doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`);
    if (bh.trangThai === "XONG" && p.trangThai && p.trangThai !== "XONG" && !quyen("DUYET_BUOC")) return bao("Chỉ người có quyền duyệt mới mở lại bước đã hoàn thành", "loi");
    doi({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...p } } });
  };
  const doiTrangThai = (tt: TrangThaiBuoc, nk: string) => {
    if (tt === "XONG" && loiDuyet) return bao(loiDuyet, "loi");
    const ghi = tt === "XONG" ? { duyetBoi: taiKhoan!.ten } : tt === "CHO_DUYET" ? { guiBoi: taiKhoan!.ten, duyetBoi: undefined } : {};
    return luuNgay({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...ghi, trangThai: tt, ngay: bh.ngay || new Date().toISOString().slice(0, 10) } } }, nk);
  };
  return (
    <div className="luoi luoi-chinh">
      <div className="the">
        <table className="bang">
          <thead><tr><th>Bước</th><th>Nội dung</th><th>Thời hạn</th><th>Mẫu</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
          <tbody>
            {CAC_BUOC.map((x) => {
              const t = h.tienDo[x.ma]?.trangThai ?? "CHUA";
              return (
                <tr key={x.ma} className={`co-the-chon ${chon === x.ma ? "dang-chon" : ""}`} onClick={() => setChon(x.ma)}>
                  <td>{x.ma}</td>
                  <td>{x.ten}<div className="can-cu">{x.canCu}</div></td>
                  <td className="chu-nho">{x.thoiHan ?? "—"}</td>
                  <td className="chu-nho">{x.mau ?? "—"}</td>
                  <td><span className={`nhan ${t === "XONG" ? "nhan-xanh" : t === "DANG" ? "nhan-duong" : t === "CHO_DUYET" ? "nhan-tim" : "nhan-xam"}`}>{TEN_TRANG_THAI_BUOC[t]}</span></td>
                  <td className="chu-nho">{ngayVN(h.tienDo[x.ma]?.ngay)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="the">
        <div className="the-dau"><h3>Bước {b.ma}. {b.ten}</h3></div>
        <div className="the-than luoi">
          <div className="chu-nho"><b>Căn cứ:</b> {b.canCu}<br /><b>Thời hạn:</b> {b.thoiHan ?? "—"}<br /><b>Mẫu biểu (Sổ tay QĐ 1966):</b> {b.mau ?? "—"}</div>
          {han && th && (
            <div className={`thong-bao ${th.trangThai === "QUA_HAN" || th.trangThai === "XONG_QUA_HAN" ? "thong-bao-do" : th.trangThai === "SAP_HET" ? "thong-bao-vang" : "thong-bao-xanh"}`} style={{ marginBottom: 0 }}>
              <b>Thời hạn:</b> {han.soNgay} {han.loai === "NLV" ? "ngày làm việc" : "ngày"} kể từ {han.moc.nhan.charAt(0).toLowerCase() + han.moc.nhan.slice(1)} ({han.canCu}).
              {han.moc.loai === "NHAP" && (
                <div style={{ marginTop: 6 }}>
                  <label className="chu-nho">Ngày mốc: <input type="date" value={bh.mocHan ?? ""} onChange={(e) => datBuoc({ mocHan: e.target.value || undefined })} /></label>
                </div>
              )}
              <div style={{ marginTop: 4 }}>
                {th.trangThai === "CHUA_CO_MOC" && (han.moc.loai === "NHAP" ? "Chưa nhập ngày mốc — chưa tính hạn." : `Chưa có ${han.moc.nhan} — chưa tính hạn.`)}
                {th.hanChot && <>Hạn chót: <b>{ngayVN(th.hanChot)}</b>. </>}
                {th.trangThai === "CON_HAN" && `Còn ${th.conLai} ${han.loai === "NLV" ? "ngày làm việc" : "ngày"}.`}
                {th.trangThai === "SAP_HET" && `Sắp hết hạn: còn ${th.conLai} ${han.loai === "NLV" ? "ngày làm việc" : "ngày"}.`}
                {th.trangThai === "QUA_HAN" && "Đã quá hạn."}
                {th.trangThai === "XONG_DUNG_HAN" && "Hoàn thành trong hạn."}
                {th.trangThai === "XONG_QUA_HAN" && "Hoàn thành sau hạn."}
                {th.thieuLich.length > 0 && <div className="chu-nho">Chưa xác nhận lịch ngày nghỉ năm {th.thieuLich.join(", ")} — hạn chỉ trừ thứ Bảy, Chủ nhật (Cài đặt chung → Lịch ngày nghỉ).</div>}
              </div>
            </div>
          )}
          <O nhan="Trạng thái">
            <select value={bh.trangThai} onChange={(e) => datBuoc({ trangThai: e.target.value as TrangThaiBuoc })}>
              {Object.entries(TEN_TRANG_THAI_BUOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </O>
          <O nhan="Ngày thực hiện / hoàn thành"><input type="date" value={bh.ngay ?? ""} onChange={(e) => datBuoc({ ngay: e.target.value })} /></O>
          <O nhan="Nội dung thực hiện, ghi chú, số văn bản"><textarea rows={4} value={bh.ghiChu ?? ""} onChange={(e) => datBuoc({ ghiChu: e.target.value })} /></O>
          <div className="nhom-nut">
            <button className="nut" disabled={bh.trangThai === "CHO_DUYET" || bh.trangThai === "XONG" || !quyen("GUI_DUYET")} onClick={() => doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`)}>Gửi duyệt</button>
            <button className="nut nut-chinh" disabled={bh.trangThai === "XONG" || !!loiDuyet} title={loiDuyet ?? undefined} onClick={() => doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`)}>Xác nhận hoàn thành</button>
          </div>
          {DANH_MUC_MAU.some((m) => m.buoc === b.ma) && (
            <div>
              <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 4 }}>Soạn mẫu biểu của bước</div>
              <div className="nhom-nut">
                {DANH_MUC_MAU.filter((m) => m.buoc === b.ma).map((m) => (
                  <button key={m.ma} className="nut nut-nho" title={m.ten} onClick={() => soanMau(m.ma)}>Mẫu {m.ma}</button>
                ))}
              </div>
            </div>
          )}
          <div className="mo chu-nho">
            {bh.guiBoi && <>Gửi duyệt: <b>{bh.guiBoi}</b>. </>}
            {bh.duyetBoi && <>Xác nhận: <b>{bh.duyetBoi}</b>. </>}
            {bh.trangThai !== "XONG" && loiDuyet && <>{loiDuyet}.</>}
          </div>
        </div>
      </div>
    </div>
  );
}

export { NhanDong };

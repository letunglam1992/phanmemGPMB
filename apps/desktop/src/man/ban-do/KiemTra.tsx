import { useState, type ReactNode } from "react";
import { loaiHienTrangBanDo, tenLopPl21, LOP_RANH_THUA_PL21, type DienTichThuHoi, type ThuaBanDo } from "@gpmb/gis";
import { type Ho } from "../../mo-hinh";
import { TT_GPMB, type TrangThaiGpmb } from "../../trang-thai";
import { type DuLieuBanDo, TEN_CO } from "./du-lieu";
import { tenDayDu } from "../../van-ban/loai-dat";

export function TomTatThuHoi({ thuHoi }: { thuHoi: Map<string, DienTichThuHoi> }) {
  const ds = [...thuHoi.values()];
  const dem = (k: string) => ds.filter((x) => x.phamVi === k).length;
  const tong = ds.reduce((s, x) => s + x.dienTichThuHoi, 0);
  return (
    <div className="luoi luoi-3" style={{ marginTop: 6, textAlign: "center" }}>
      <div><div className="chu-nho mo">Toàn bộ</div><b>{dem("TOAN_BO")}</b></div>
      <div><div className="chu-nho mo">Một phần</div><b>{dem("MOT_PHAN")}</b></div>
      <div><div className="chu-nho mo">DT giao (m²)</div><b>{tong.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</b></div>
    </div>
  );
}

/**
 * Kiểm tra bản đồ: các điều kiện cần và đủ để dùng bản đồ theo dõi GPMB đến từng thửa và nhập nhanh thông tin
 * (khép thửa, nhãn thửa, tọa độ, phạm vi thu hồi, nhãn hiện trạng) — nêu việc cần làm khi thiếu.
 */
/**
 * Đối chiếu lớp đang dùng với Phụ lục 21 TT 26/2024/TT-BTNMT (điểm d khoản 1 Điều 16): ranh thửa phải là lớp 10/61;
 * lớp ranh thu hồi trùng lớp đã có nghĩa khác (vd. 30 đường mép nước, 40 biên giới quốc gia) → cán bộ xác nhận
 * đây là lớp địa phương tận dụng, không phải đối tượng theo PL 21.
 */
export function phanLopPl21(dl: DuLieuBanDo): { ok: boolean | "canh"; ten: string; chiTiet: string } {
  const ch = dl.cauHinh;
  const ghi: string[] = [];
  const ranhLa = ch.ranhThua.filter((l) => !(LOP_RANH_THUA_PL21 as readonly number[]).includes(l));
  if (ranhLa.length) ghi.push(`ranh thửa đang lấy lớp ${ranhLa.join(", ")} (PL 21 quy định lớp 10 hiện trạng, 61 theo giấy tờ)`);
  const trung = ch.ranhGpmb.filter((l) => dl.kq.vungGpmb.length && tenLopPl21(l));
  if (trung.length) ghi.push(`lớp thu hồi ${trung.map((l) => `${l} (PL 21: ${tenLopPl21(l)})`).join(", ")} — xác nhận đây là lớp địa phương tận dụng`);
  return {
    ok: ghi.length ? "canh" : true,
    ten: "Phân lớp theo PL 21 TT 26/2024",
    chiTiet: ghi.length ? `Cần xem: ${ghi.join("; ")}.` : "Lớp ranh thửa và lớp thu hồi phù hợp bảng phân lớp.",
  };
}

export function KiemTraBanDo({ dl, coPhamVi, soVung, moCauHinh, ttThua }: { dl: DuLieuBanDo; coPhamVi: boolean; soVung: number; moCauHinh: () => void; ttThua: Map<string, TrangThaiGpmb> }) {
  const [mo, setMo] = useState(true);
  const ds = dl.kq.thua;
  const n = ds.length;
  const pt = (k: number) => (n ? Math.round((k / n) * 100) : 0);
  const du = (f: (t: ThuaBanDo) => unknown) => ds.filter(f).length;
  const { pham } = dl;
  // VN-2000 múi 3°: hoành độ (Y, đông) ~ 500 km ± 200 km; tung độ (X, bắc) Sơn La ~ 2.300–2.450 km
  const toaDoHopLy = pham.minX > 200000 && pham.maxX < 800000 && pham.minY > 2200000 && pham.maxY < 2500000;
  const coHt = ds.filter((t) => loaiHienTrangBanDo(t.hienTrangBanDo));
  const lech = coHt.filter((t) => { const tt = ttThua.get(t.ma); return tt && (loaiHienTrangBanDo(t.hienTrangBanDo) === "DA") !== (tt === "HOAN_THANH"); });
  const muc: { ok: boolean | "canh"; ten: string; chiTiet: string; lam?: ReactNode }[] = [
    { ok: n > 0, ten: "Khép thửa", chiTiet: n ? `${n} thửa từ lớp ranh thửa ${dl.cauHinh.ranhThua.join(", ")}` : `Không khép được thửa nào từ lớp ${dl.cauHinh.ranhThua.join(", ")}`, lam: n ? undefined : <button className="nut nut-chu nut-nho" onClick={moCauHinh}>Chọn lớp ranh thửa</button> },
    { ok: toaDoHopLy ? true : "canh", ten: "Tọa độ VN-2000", chiTiet: toaDoHopLy ? "Tọa độ nằm trong vùng tỉnh Sơn La" : "Tọa độ ngoài khoảng thường gặp của Sơn La — kiểm tra hệ tọa độ, đơn vị (m)" },
    { ok: pt(du((t) => t.soThua && t.soTo)) >= 90 ? true : "canh", ten: "Số tờ, số thửa", chiTiet: `${du((t) => t.soThua && t.soTo)}/${n} thửa (${pt(du((t) => t.soThua && t.soTo))}%)`, lam: pt(du((t) => t.soThua && t.soTo)) < 90 ? <button className="nut nut-chu nut-nho" onClick={moCauHinh}>Cấu hình lớp nhãn</button> : undefined },
    { ok: pt(du((t) => t.loaiDatBanDo)) >= 90 ? true : "canh", ten: "Loại đất", chiTiet: `${du((t) => t.loaiDatBanDo)}/${n} thửa` },
    { ok: pt(du((t) => t.dienTichGhi !== null)) >= 80 ? true : "canh", ten: "Diện tích ghi", chiTiet: `${du((t) => t.dienTichGhi !== null)}/${n} thửa; ${du((t) => t.co.includes("LECH_DIEN_TICH"))} thửa lệch > ${Math.round(dl.cauHinh.lechDienTichChoPhep * 100)}%` },
    { ok: pt(du((t) => t.chuSuDung)) >= 80 ? true : "canh", ten: "Chủ sử dụng", chiTiet: `${du((t) => t.chuSuDung)}/${n} thửa; ${du((t) => t.co.includes("NHIEU_CHU"))} thửa tên khác nhau giữa hai nguồn` },
    { ok: coPhamVi ? true : soVung ? "canh" : false, ten: "Phạm vi thu hồi", chiTiet: coPhamVi ? "Đã chọn vùng / thửa thu hồi" : soVung ? `Có ${soVung} vùng trên lớp ${dl.cauHinh.ranhGpmb.join(", ")} — chưa chọn` : `Lớp ${dl.cauHinh.ranhGpmb.join(", ")} không có vùng khép kín — chọn lớp khác hoặc chọn thửa trực tiếp`, lam: !soVung ? <button className="nut nut-chu nut-nho" onClick={moCauHinh}>Chọn lớp ranh</button> : undefined },
    phanLopPl21(dl),
    ...(dl.cauHinh.nhanHienTrang?.length ? [{ ok: (lech.length ? "canh" : true) as boolean | "canh", ten: "Nhãn hiện trạng trên bản đồ", chiTiet: `${coHt.length} thửa (lớp ${dl.cauHinh.nhanHienTrang.join(", ")}); ${lech.length} thửa khác tiến độ trong phần mềm — chỉ đối chiếu, không ghi đè` }] : []),
  ];
  const soLoi = muc.filter((m) => m.ok === false).length;
  const soCanh = muc.filter((m) => m.ok === "canh").length;
  return (
    <div className="the co-dinh">
      <div className="the-dau">
        <h3>Kiểm tra bản đồ</h3>
        <span className={`nhan ${soLoi ? "nhan-do" : soCanh ? "nhan-vang" : "nhan-xanh"}`}>{soLoi ? `${soLoi} việc cần làm` : soCanh ? `${soCanh} điểm cần xem` : "Đủ điều kiện"}</span>
        <div className="phai"><button className="nut nut-chu nut-nho" onClick={() => setMo(!mo)}>{mo ? "Thu gọn" : "Xem"}</button></div>
      </div>
      {mo && (
        <div className="the-than">
          <ul className="kt-bd">
            {muc.map((m) => (
              <li key={m.ten} className={m.ok === true ? "ok" : m.ok === "canh" ? "canh" : "loi"}>
                <span className="dau">{m.ok === true ? "✓" : "!"}</span>
                <div><b>{m.ten}</b><small>{m.chiTiet}</small>{m.lam && <div>{m.lam}</div>}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ChiTietThua({ t, th, ho, tt, moHo, tomTat }: { t: ThuaBanDo; th?: DienTichThuHoi; ho?: Ho; tt?: TrangThaiGpmb; moHo: (h: Ho) => void; tomTat?: React.ReactNode }) {
  return (
    <div className="the">
      <div className="the-dau"><h3>Tờ {t.soTo ?? "?"}, thửa {t.soThua ?? "?"}</h3></div>
      <div className="the-than chu-nho" style={{ display: "grid", gap: 4 }}>
        <div>Chủ sử dụng: <b>{t.chuSuDung ?? "—"}</b> · Loại (bản đồ): <b>{t.loaiDatBanDo ? tenDayDu(t.loaiDatBanDo) : "—"}</b></div>
        <div>DT ghi: <b>{t.dienTichGhi ?? "—"}</b> m² · DT hình học: <b>{t.dienTichHinhHoc.toFixed(2)}</b> m²{th && th.phamVi !== "NGOAI" ? <> · Thu hồi: <b>{th.dienTichThuHoi.toFixed(2)}</b> m² ({th.phamVi === "TOAN_BO" ? "toàn bộ" : "một phần"})</> : null}</div>
        {t.co.length > 0 && <div className="nhom-nut">{t.co.map((c) => <span key={c} className="nhan nhan-vang">{TEN_CO[c]}</span>)}</div>}
        {t.hienTrangBanDo && (
          <div>
            Bản đồ ghi: <b>{t.hienTrangBanDo}</b>
            {tt && ((loaiHienTrangBanDo(t.hienTrangBanDo) === "DA") !== (tt === "HOAN_THANH")) && <span className="nhan nhan-vang" style={{ marginLeft: 6 }}>Khác tiến độ trong phần mềm ({TT_GPMB[tt].ten}) — kiểm tra</span>}
          </div>
        )}
        <div className="mo">Nhãn trong thửa: {t.nhan.map((n) => `[${n.lop}] ${n.chu}`).join(" · ")}</div>
        {ho && <div>Đã gắn hồ sơ: <button className="nut nut-chu nut-nho" onClick={() => moHo(ho)}>{ho.ma} · {ho.ten}</button></div>}
        {tomTat}
      </div>
    </div>
  );
}

/* ------------------------- Vẽ bản đồ ------------------------- */

import { Fragment, useState } from "react";
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import type { DuAn, Ho } from "../../mo-hinh";
import type { DongKetQua, KetQuaHo } from "../../tinh-ho";
import { GiaiTrinh, NhanDong, lopDong, tien } from "../../thanh-phan/chung";
import { xuatExcelHo } from "../../xuat-excel";

export function TabTinhToan({ h, duAn, kq }: { h: Ho; duAn: DuAn; kq: KetQuaHo }) {
  const [chon, setChon] = useState<DongKetQua | null>(kq.tatCa.find((x) => x.dong.trangThai !== "TAM_TINH") ?? kq.tatCa[0] ?? null);
  const chonHienTai = chon && kq.tatCa.find((x) => x.dong.noiDung === chon.dong.noiDung && x.taiSanId === chon.taiSanId && x.thuaId === chon.thuaId);
  const cong = (ds: DongKetQua[]) => ds.reduce((s, x) => (x.dong.trangThai === "TAM_TINH" && x.dong.thanhTien ? s.plus(x.dong.thanhTien) : s), D(0) as Decimal);
  const tenThua = (id?: string) => {
    const t = h.thua.find((x) => x.id === id);
    return t ? `Thửa ${t.soThua}, tờ ${t.soTo} (${t.loaiDat}, ${t.dienTichThuHoi} m²)` : "Chung cho hộ";
  };
  const phanA = kq.nhom.filter((n) => n.ma.startsWith("A"));
  const phanB = kq.nhom.filter((n) => n.ma.startsWith("B"));
  let stt = 0;
  const veNhom = (ds: typeof kq.nhom, chu: string, ten: string) => (
    <>
      <tr className="nhom"><td>{chu}</td><td colSpan={2}>{ten}</td><td className="so">{tien(cong(ds.flatMap((n) => n.dong)))}</td><td colSpan={2} /></tr>
      {ds.map((n) => {
        const theoThua = [...new Set(n.dong.map((x) => x.thuaId))];
        return (
          <Fragment key={n.ma}>
            <tr className="nhom-con"><td>{n.ma.split(".")[1]}</td><td colSpan={2}>{n.ten}</td><td className="so">{tien(cong(n.dong))}</td><td colSpan={2} /></tr>
            {theoThua.map((tid) => (
              <Fragment key={tid ?? "chung"}>
                {theoThua.length > 1 || tid ? <tr><td /><td colSpan={5} className="chu-nho mo" style={{ paddingTop: 8 }}>{tenThua(tid)}</td></tr> : null}
                {n.dong.filter((x) => x.thuaId === tid).map((x, j) => {
                  stt++;
                  const ts = Object.entries(x.dong.thamSo).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ");
                  return (
                    <tr key={j} className={`co-the-chon ${lopDong(x.dong)} ${chonHienTai === x ? "dang-chon" : ""}`} onClick={() => setChon(x)}>
                      <td className="mo">{stt}</td>
                      <td>{x.dong.noiDung}</td>
                      <td className="chu-nho mo" style={{ maxWidth: 360 }}>{ts || x.dong.canhBao[0]}</td>
                      <td className="so">{tien(x.dong.thanhTien)}</td>
                      <td className="can-cu">{x.dong.canCu.map((c) => [c.vanBan, c.viTri].filter(Boolean).join(" – ")).slice(0, 2).join("; ")}</td>
                      <td><NhanDong d={x.dong} /></td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </Fragment>
        );
      })}
    </>
  );

  return (
    <div className="luoi" style={{ gridTemplateColumns: "minmax(0,1fr) 400px" }}>
      <div className="the">
        <div className="the-dau">
          <h2>Bảng tính chi tiết</h2>
          <span className="nhom-nut chu-nho">
            <span className="nhan nhan-xanh">Tạm tính</span><span className="nhan nhan-vang">Cần xác nhận</span><span className="nhan nhan-do">Thiếu căn cứ</span><span className="nhan nhan-tim">Có lựa chọn</span>
          </span>
          <div className="phai"><button className="nut nut-nho" onClick={() => xuatExcelHo(duAn, h, kq)}>Xuất Excel phương án chi tiết</button></div>
        </div>
        <div className="bang-cuon">
          <table className="bang">
            <thead><tr><th style={{ width: 40 }}>STT</th><th>Khoản</th><th>Tham số chính</th><th className="so">Thành tiền (đ)</th><th>Căn cứ</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {phanA.length > 0 && veNhom(phanA, "A", "GIÁ TRỊ BỒI THƯỜNG")}
              {phanB.length > 0 && veNhom(phanB, "B", "GIÁ TRỊ HỖ TRỢ")}
              {kq.tatCa.length === 0 && <tr><td colSpan={6} className="trong">Chưa có khoản nào. Nhập thửa đất, kiểm đếm tài sản và chọn hỗ trợ.</td></tr>}
              <tr className="tong"><td /><td colSpan={2}>Tổng cộng (A + B) — chưa làm tròn</td><td className="so">{tien(kq.tong.tongChuaLamTron.toDecimalPlaces(0))}</td><td colSpan={2} className="chu-nho mo">{kq.tong.tongChuaLamTron.isInteger() ? "" : kq.tong.tongChuaLamTron.toString()}</td></tr>
              <tr className="tong"><td /><td colSpan={2}>Tổng sau làm tròn — {kq.moTaLamTron}</td><td className="so">{tien(kq.tong.tongLamTron)}</td><td colSpan={2} className="chu-nho mo">Chênh lệch làm tròn: {kq.tong.chenhLechLamTron.toDecimalPlaces(2).toString()} đ</td></tr>
              <tr><td /><td colSpan={2}>Khấu trừ nghĩa vụ tài chính</td><td className="so">{tien(kq.khauTru)}</td><td colSpan={2} /></tr>
              <tr className="tong"><td /><td colSpan={2}>Số tiền thực nhận</td><td className="so">{tien(kq.conLai)}</td><td colSpan={2}>{kq.tong.duocChot ? <span className="nhan nhan-xanh">Đủ điều kiện chốt</span> : <span className="nhan nhan-vang">Chưa chốt được</span>}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="the" style={{ alignSelf: "start", position: "sticky", top: 10 }}>
        <div className="the-dau"><h3>Giải trình khoản tính</h3></div>
        <div className="the-than">{chonHienTai ? <GiaiTrinh d={chonHienTai.dong} /> : <div className="trong">Chọn một dòng để xem giải trình.</div>}</div>
      </div>
    </div>
  );
}

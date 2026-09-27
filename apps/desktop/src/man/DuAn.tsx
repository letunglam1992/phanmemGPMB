import { useMemo, useState } from "react";
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, TEN_DOI_TUONG, buocHienTai, taoId, type Ho, type LoaiDoiTuong } from "../mo-hinh";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";
import { HopTaoDuAn } from "./TongQuan";
import { xuatExcelDuAn } from "../xuat-excel";

export function ManDuAn({ duAnId }: { duAnId: string }) {
  const { dsDuAn, hoCua, di, chinhSach, xoaDuAn } = useUngDung();
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const [sua, setSua] = useState(false);
  const [them, setThem] = useState(false);
  const [loc, setLoc] = useState("");
  const [dangXuat, setDangXuat] = useState(false);
  const hos = hoCua(duAnId);
  const kq = useMemo(() => (duAn ? hos.map((h) => ({ h, k: tinhHo(chinhSach(duAn), duAn, h) })) : []), [hos, duAn, chinhSach]);
  if (!duAn) return <div className="trang trong">Không tìm thấy dự án.</div>;

  const hienThi = kq.filter(({ h }) => !loc || `${h.ma} ${h.ten} ${h.thua.map((t) => t.soThua).join(" ")}`.toLowerCase().includes(loc.toLowerCase()));
  const tong = (f: (x: (typeof kq)[number]) => Decimal) => kq.reduce((s, x) => s.plus(f(x)), D(0));

  return (
    <div className="trang">
      <div className="duong-dan"><button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / Dự án</div>
      <div className="dong-tieu-de">
        <div>
          <h1>{duAn.ten}</h1>
          <div className="mo-ta">
            {duAn.xa} · Chủ đầu tư: {duAn.chuDauTu || "—"} · {duAn.canCuThuHoi || "Chưa ghi căn cứ thu hồi"} · TB: {ngayVN(duAn.ngayThongBao) || "—"}
          </div>
        </div>
        <div className="phai">
          <button className="nut" onClick={() => setSua(true)}>Thông tin dự án</button>
          <button className="nut" onClick={() => di({ ten: "ban-do", duAnId })}>Bản đồ</button>
          <button className="nut" disabled={dangXuat || kq.length === 0} onClick={async () => { setDangXuat(true); try { await xuatExcelDuAn(duAn, kq); } finally { setDangXuat(false); } }}>
            {dangXuat ? "Đang xuất…" : "Xuất Excel phương án"}
          </button>
          <button className="nut nut-chinh" onClick={() => setThem(true)}>+ Thêm hộ, tổ chức</button>
        </div>
      </div>

      {(!duAn.giaGao || !duAn.hanMucNN) && (
        <div className="thong-bao thong-bao-vang">
          Dự án chưa có {[!duAn.giaGao && "giá gạo (ổn định đời sống)", !duAn.hanMucNN && "hạn mức giao đất NN (chuyển đổi nghề)"].filter(Boolean).join(" và ")}. Các khoản liên quan sẽ ở trạng thái "Thiếu căn cứ".{" "}
          <button className="nut nut-chu nut-nho" onClick={() => setSua(true)}>Nhập ngay</button>
        </div>
      )}

      <div className="the">
        <div className="the-dau">
          <h2>Danh sách hộ, cá nhân, tổ chức</h2>
          <span className="mo">{kq.length}</span>
          <div className="phai"><input placeholder="Tìm theo mã, tên, số thửa…" value={loc} onChange={(e) => setLoc(e.target.value)} style={{ width: 260 }} /></div>
        </div>
        <div className="bang-cuon">
          <table className="bang">
            <thead>
              <tr>
                <th>Mã</th><th>Họ tên / tên tổ chức</th><th>Đối tượng</th><th className="so">Số thửa</th><th className="so">DT thu hồi (m²)</th>
                <th className="so">Bồi thường</th><th className="so">Hỗ trợ</th><th className="so">Tổng (làm tròn)</th><th className="so">Khấu trừ</th><th className="so">Thực nhận</th>
                <th>Tình trạng tính</th><th>Bước</th>
              </tr>
            </thead>
            <tbody>
              {hienThi.map(({ h, k }) => {
                const b = CAC_BUOC[buocHienTai(h)];
                return (
                  <tr key={h.id} className="co-the-chon" onClick={() => di({ ten: "ho", duAnId, hoId: h.id })}>
                    <td>{h.ma}</td>
                    <td><b>{h.ten}</b><div className="mo chu-nho">{h.diaChi}</div></td>
                    <td>{TEN_DOI_TUONG[h.loai]}</td>
                    <td className="so">{h.thua.length}</td>
                    <td className="so">{tien(h.thua.reduce((s, t) => s.plus(t.dienTichThuHoi || "0"), D(0)).toDecimalPlaces(2))}</td>
                    <td className="so">{tien(k.tongBoiThuong)}</td>
                    <td className="so">{tien(k.tongHoTro)}</td>
                    <td className="so"><b>{tien(k.tong.tongLamTron)}</b></td>
                    <td className="so">{tien(k.khauTru)}</td>
                    <td className="so">{tien(k.conLai)}</td>
                    <td>
                      {k.tong.duocChot ? <span className="nhan nhan-xanh">Đủ căn cứ</span> : (
                        <span className={`nhan ${k.tong.soDongThieuCanCu ? "nhan-do" : "nhan-vang"}`}>{k.tong.soDongThieuCanCu + k.tong.soDongCanXacNhan} khoản chưa xong</span>
                      )}
                    </td>
                    <td className="chu-nho">{b ? `${b.ma}. ${b.ten}` : "Hoàn thành"}</td>
                  </tr>
                );
              })}
              {hienThi.length === 0 && <tr><td colSpan={12} className="trong">Chưa có hồ sơ. Thêm hộ hoặc tạo từ bản đồ.</td></tr>}
              {kq.length > 0 && (
                <tr className="tong">
                  <td colSpan={4}>Tổng cộng</td>
                  <td className="so">{tien(tong((x) => x.h.thua.reduce((s, t) => s.plus(t.dienTichThuHoi || "0"), D(0))).toDecimalPlaces(2))}</td>
                  <td className="so">{tien(tong((x) => x.k.tongBoiThuong))}</td>
                  <td className="so">{tien(tong((x) => x.k.tongHoTro))}</td>
                  <td className="so">{tien(tong((x) => x.k.tong.tongLamTron))}</td>
                  <td className="so">{tien(tong((x) => x.k.khauTru))}</td>
                  <td className="so">{tien(tong((x) => x.k.conLai))}</td>
                  <td colSpan={2} className="mo chu-nho">Tổng chỉ cộng các khoản "Tạm tính"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="nut nut-chu nut-nguy nut-nho" onClick={async () => { if (confirm(`Xóa dự án "${duAn.ten}" và toàn bộ hồ sơ? Không thể hoàn tác.`)) { await xoaDuAn(duAn.id); di({ ten: "tong-quan" }); } }}>Xóa dự án</button>
      </div>
      {sua && <HopTaoDuAn duAn={duAn} dong={() => setSua(false)} />}
      {them && <HopThemHo duAnId={duAnId} soHo={hos.length} dong={() => setThem(false)} />}
    </div>
  );
}

export function hoMoi(duAnId: string, ma: string, ten: string, loai: LoaiDoiTuong = "HO_GIA_DINH"): Ho {
  return {
    id: taoId(), duAnId, ma, loai, ten, diaChi: "", soDinhDanh: "", dienThoai: "", nhanKhau: [], thua: [], taiSan: [],
    hoTro: { chuyenDoiNghe: loai !== "TO_CHUC" }, khauTru: "0", tienDo: {}, nhatKy: [],
  };
}

function HopThemHo({ duAnId, soHo, dong }: { duAnId: string; soHo: number; dong: () => void }) {
  const { luuHo, di } = useUngDung();
  const [ma, setMa] = useState(`H${String(soHo + 1).padStart(2, "0")}`);
  const [ten, setTen] = useState("");
  const [loai, setLoai] = useState<LoaiDoiTuong>("HO_GIA_DINH");
  return (
    <HopThoai
      tieuDe="Thêm hộ, cá nhân, tổ chức"
      dong={dong}
      rong={560}
      chan={
        <>
          <button className="nut" onClick={dong}>Hủy</button>
          <button className="nut nut-chinh" disabled={!ten.trim() || !ma.trim()} onClick={async () => { const h = hoMoi(duAnId, ma, ten, loai); await luuHo(h, "Tạo hồ sơ"); dong(); di({ ten: "ho", duAnId, hoId: h.id }); }}>Tạo hồ sơ</button>
        </>
      }
    >
      <div className="luoi luoi-2">
        <O nhan="Mã hồ sơ"><input value={ma} onChange={(e) => setMa(e.target.value)} /></O>
        <O nhan="Đối tượng">
          <select value={loai} onChange={(e) => setLoai(e.target.value as LoaiDoiTuong)}>
            {Object.entries(TEN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </O>
        <O nhan="Họ tên chủ hộ / tên tổ chức" style={{ gridColumn: "1/-1" }}><input value={ten} onChange={(e) => setTen(e.target.value)} autoFocus /></O>
      </div>
    </HopThoai>
  );
}

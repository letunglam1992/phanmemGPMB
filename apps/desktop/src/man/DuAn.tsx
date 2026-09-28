import { useMemo, useState } from "react";
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, TEN_DOI_TUONG, buocHienTai, hoMoi, taoId, type DuAn, type Ho, type LoaiDoiTuong } from "../mo-hinh";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";
import { BieuTuong, DaiChang, DongMoc, PhanBoTrangThai, TheChiSo, VongTienDo } from "../thanh-phan/BieuDo";
import { THU_TU_TRANG_THAI, TT_GPMB, homNayIso, mocTienDo, thongKe, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { HopTaoDuAn } from "./TongQuan";
import { xuatExcelDuAn } from "../xuat-excel";
import { BanDoNho } from "../thanh-phan/BanDoNho";
import { ThePhuongAn } from "../thanh-phan/PhuongAn";
import { HopNhapExcel } from "../thanh-phan/HopNhapExcel";
export { hoMoi };

export function ManDuAn({ duAnId }: { duAnId: string }) {
  const { dsDuAn, hoCua, di, chinhSach, xoaDuAn, quyen } = useUngDung();
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const [sua, setSua] = useState(false);
  const [them, setThem] = useState(false);
  const [nhapExcel, setNhapExcel] = useState(false);
  const [loc, setLoc] = useState("");
  const [dangXuat, setDangXuat] = useState(false);
  const [keHoach, setKeHoach] = useState(false);
  const [locTt, setLocTt] = useState<TrangThaiGpmb | null>(null);
  const homNay = homNayIso();
  const hos = hoCua(duAnId);
  const kq = useMemo(() => (duAn ? hos.map((h) => ({ h, k: tinhHo(chinhSach(duAn), duAn, h) })) : []), [hos, duAn, chinhSach]);
  if (!duAn) return <div className="trang trong">Không tìm thấy dự án.</div>;
  const tk = thongKe(duAn, kq, homNay);
  const moc = mocTienDo(duAn, hos, homNay);
  const ttHo = new Map(kq.map(({ h, k }) => [h.id, trangThaiHo(duAn, h, k, homNay)]));
  const ttThua = new Map<string, TrangThaiGpmb>();
  for (const { h } of kq) for (const t of h.thua) if (t.maBanDo) ttThua.set(t.maBanDo, ttHo.get(h.id)!);

  const hienThi = kq.filter(({ h }) => (!locTt || ttHo.get(h.id) === locTt)).filter(({ h }) => !loc || `${h.ma} ${h.ten} ${h.thua.map((t) => t.soThua).join(" ")}`.toLowerCase().includes(loc.toLowerCase()));
  const tong = (f: (x: (typeof kq)[number]) => Decimal) => kq.reduce((s, x) => s.plus(f(x)), D(0));

  return (
    <div className="trang">
      <div className="duong-dan"><button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / Dự án</div>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Dự án</div>
          <h1>{duAn.ten}</h1>
          <div className="mo-ta">
            {duAn.xa} · Chủ đầu tư: {duAn.chuDauTu || "—"} · {duAn.canCuThuHoi || "Chưa ghi căn cứ thu hồi"} · TB: {ngayVN(duAn.ngayThongBao) || "—"}
          </div>
        </div>
        <div className="phai">
          <button className="nut" onClick={() => setSua(true)}>Thông tin dự án</button>
          <button className="nut" onClick={() => di({ ten: "ban-do", duAnId })}>Bản đồ</button>
          <button className="nut" onClick={() => di({ ten: "van-ban", duAnId })}>Soạn văn bản</button>
          <button className="nut" disabled={dangXuat || kq.length === 0} onClick={async () => { setDangXuat(true); try { await xuatExcelDuAn(duAn, kq); } finally { setDangXuat(false); } }}>
            {dangXuat ? "Đang xuất…" : "Xuất Excel phương án"}
          </button>
          {quyen("SUA_HO_SO") && <button className="nut" onClick={() => setNhapExcel(true)}>Nhập Excel…</button>}
          {quyen("SUA_HO_SO") && <button className="nut nut-chinh" onClick={() => setThem(true)}>+ Thêm hộ, tổ chức</button>}
        </div>
      </div>

      {(!duAn.giaGao || !duAn.hanMucNN) && (
        <div className="thong-bao thong-bao-vang">
          Dự án chưa có {[!duAn.giaGao && "giá gạo (ổn định đời sống)", !duAn.hanMucNN && "hạn mức giao đất NN (chuyển đổi nghề)"].filter(Boolean).join(" và ")}. Các khoản liên quan sẽ ở trạng thái "Thiếu căn cứ".{" "}
          <button className="nut nut-chu nut-nho" onClick={() => setSua(true)}>Nhập ngay</button>
        </div>
      )}

      <div className="luoi" style={{ gridTemplateColumns: "minmax(0,1fr) 380px", marginBottom: 14 }}>
        <div className="luoi" style={{ alignContent: "start" }}>
          <div className="luoi luoi-4">
            <TheChiSo bieuTuong="nguoi" nhan="Đã hoàn thành GPMB" giaTri={tk.theoTrangThai.HOAN_THANH} mauSo={tk.soHo} tong="xanh" />
            <TheChiSo bieuTuong="hoSo" nhan="Đang xử lý" giaTri={tk.theoTrangThai.DANG_XU_LY} mauSo={tk.soHo} tong="vang" />
            <TheChiSo bieuTuong="canhBao" nhan="Vướng mắc" giaTri={tk.theoTrangThai.VUONG_MAC} mauSo={tk.soHo} tong="do" />
            <TheChiSo bieuTuong="thua" nhan="Thửa đã kiểm đếm" giaTri={tk.soThuaDaKiemDem} mauSo={tk.soThua} tong="duong" />
          </div>
          <div className="luoi luoi-2">
            <div className="the">
              <div className="the-dau"><h3>Hiện trạng hồ sơ</h3><span className="mo chu-nho">bấm để lọc danh sách</span></div>
              <div className="the-than">
                <PhanBoTrangThai dem={tk.theoTrangThai} tong={tk.soHo} />
                <div className="nhom-nut" style={{ marginTop: 10 }}>
                  {THU_TU_TRANG_THAI.map((t) => (
                    <button key={t} className={`nut nut-nho ${locTt === t ? "nut-chinh" : ""}`} onClick={() => setLocTt(locTt === t ? null : t)}>{TT_GPMB[t].bieuTuong} {TT_GPMB[t].ten}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="the">
              <div className="the-dau"><h3>Tiến độ chung</h3><span className="cap-nhat" style={{ marginLeft: "auto" }}><BieuTuong ten="dongHo" co={14} />{tk.capNhatCuoi ? new Date(tk.capNhatCuoi).toLocaleString("vi-VN") : "—"}</span></div>
              <div className="the-than"><VongTienDo tyLe={tk.tienDoChung} nhan="Số bước đã xong / tổng số bước" /></div>
              <div style={{ padding: "0 8px 10px" }}><DaiChang chang={tk.chang} soHo={tk.soHo} bieuTuong={["hoSo", "kiemDem", "phuongAn", "pheDuyet", "chiTra", "banGiao"]} /></div>
            </div>
          </div>
        </div>
        <div className="luoi" style={{ alignContent: "start" }}>
        <div className="the">
          <div className="the-dau"><h3>Bản đồ dự án</h3><span className="mo chu-nho">bấm để mở</span></div>
          <div className="the-than" style={{ padding: 8 }}><BanDoNho duAn={duAn} ttThua={ttThua} /></div>
        </div>
        <div className="the">
          <div className="the-dau"><h3>Mốc tiến độ dự án</h3><div className="phai"><button className="nut nut-nho" onClick={() => setKeHoach(true)}>Lập kế hoạch</button></div></div>
          <div className="bang-cuon" style={{ maxHeight: 360, padding: "6px 10px" }}><DongMoc moc={moc} /></div>
        </div>
        </div>
      </div>

      <ThePhuongAn duAn={duAn} kq={kq} />

      <div className="the">
        <div className="the-dau">
          <h2>Danh sách hộ, cá nhân, tổ chức</h2>
          {locTt && <button className="nut nut-nho" onClick={() => setLocTt(null)}>Lọc: {TT_GPMB[locTt].ten} ✕</button>}
          <span className="mo">{kq.length}</span>
          <div className="phai"><input placeholder="Tìm theo mã, tên, số thửa…" value={loc} onChange={(e) => setLoc(e.target.value)} style={{ width: 260 }} /></div>
        </div>
        <div className="bang-cuon">
          <table className="bang">
            <thead>
              <tr>
                <th>Mã</th><th>Họ tên / tên tổ chức</th><th>Đối tượng</th><th className="so">Số thửa</th><th className="so">DT thu hồi (m²)</th>
                <th className="so">Bồi thường</th><th className="so">Hỗ trợ</th><th className="so">Tổng (làm tròn)</th><th className="so">Khấu trừ</th><th className="so">Thực nhận</th>
                <th>Hiện trạng</th><th>Tình trạng tính</th><th>Bước</th>
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
                    <td>{(() => { const t = TT_GPMB[ttHo.get(h.id)!]; return <span className="nhan" style={{ background: t.nen, color: "var(--chu)" }}>{t.bieuTuong} {t.ten}</span>; })()}</td>
                    <td>
                      {k.tong.duocChot ? <span className="nhan nhan-xanh">Đủ căn cứ</span> : (
                        <span className={`nhan ${k.tong.soDongThieuCanCu ? "nhan-do" : "nhan-vang"}`}>{k.tong.soDongThieuCanCu + k.tong.soDongCanXacNhan} khoản chưa xong</span>
                      )}
                    </td>
                    <td className="chu-nho">{b ? `${b.ma}. ${b.ten}` : "Hoàn thành"}</td>
                  </tr>
                );
              })}
              {hienThi.length === 0 && <tr><td colSpan={13} className="trong">Chưa có hồ sơ. Thêm hộ hoặc tạo từ bản đồ.</td></tr>}
              {kq.length > 0 && (
                <tr className="tong">
                  <td colSpan={4}>Tổng cộng</td>
                  <td className="so">{tien(tong((x) => x.h.thua.reduce((s, t) => s.plus(t.dienTichThuHoi || "0"), D(0))).toDecimalPlaces(2))}</td>
                  <td className="so">{tien(tong((x) => x.k.tongBoiThuong))}</td>
                  <td className="so">{tien(tong((x) => x.k.tongHoTro))}</td>
                  <td className="so">{tien(tong((x) => x.k.tong.tongLamTron))}</td>
                  <td className="so">{tien(tong((x) => x.k.khauTru))}</td>
                  <td className="so">{tien(tong((x) => x.k.conLai))}</td>
                  <td colSpan={3} className="mo chu-nho">Tổng chỉ cộng các khoản "Tạm tính"</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        {quyen("XOA_DU_AN") && <button className="nut nut-chu nut-nguy nut-nho" onClick={async () => { if (confirm(`Xóa dự án "${duAn.ten}" và toàn bộ hồ sơ? Không thể hoàn tác.`)) { await xoaDuAn(duAn.id); di({ ten: "tong-quan" }); } }}>Xóa dự án</button>}
      </div>
      {sua && <HopTaoDuAn duAn={duAn} dong={() => setSua(false)} />}
      {keHoach && <HopKeHoach duAn={duAn} dong={() => setKeHoach(false)} />}
      {them && <HopThemHo duAnId={duAnId} soHo={hos.length} dong={() => setThem(false)} />}
      {nhapExcel && <HopNhapExcel duAn={duAn} dong={() => setNhapExcel(false)} />}
    </div>
  );
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

function HopKeHoach({ duAn, dong }: { duAn: DuAn; dong: () => void }) {
  const { luuDuAn } = useUngDung();
  const [kh, setKh] = useState<Record<string, string>>(duAn.keHoach ?? {});
  return (
    <HopThoai
      tieuDe="Kế hoạch hoàn thành từng bước"
      dong={dong}
      rong={720}
      chan={
        <>
          <button className="nut" onClick={dong}>Hủy</button>
          <button className="nut nut-chinh" onClick={async () => { await luuDuAn({ ...duAn, keHoach: Object.fromEntries(Object.entries(kh).filter(([, v]) => v)) }); dong(); }}>Lưu kế hoạch</button>
        </>
      }
    >
      <div className="thong-bao thong-bao-xanh">Ngày kế hoạch do cán bộ nhập để theo dõi; bước quá ngày kế hoạch mà chưa xong được cảnh báo. Thời hạn luật định của từng bước ghi bên cạnh để tham khảo (docs/05).</div>
      <table className="bang">
        <thead><tr><th>Bước</th><th>Nội dung</th><th>Thời hạn luật định</th><th style={{ width: 170 }}>Hoàn thành trước ngày</th></tr></thead>
        <tbody>
          {CAC_BUOC.map((b) => (
            <tr key={b.ma}>
              <td>{b.ma}</td><td>{b.ten}<div className="can-cu">{b.canCu}</div></td><td className="chu-nho">{b.thoiHan ?? "—"}</td>
              <td><input type="date" value={kh[b.ma] ?? ""} onChange={(e) => setKh({ ...kh, [b.ma]: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </HopThoai>
  );
}

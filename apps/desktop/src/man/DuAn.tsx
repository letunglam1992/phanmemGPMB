import { useMemo, useRef, useState } from "react";
import { D } from "@gpmb/core";
import type Decimal from "decimal.js";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, TEN_DOI_TUONG, TEN_TRANG_THAI_DU_AN, hoMoi, type DuAn, type LoaiDoiTuong, type LoaiDuAn, type TrangThaiDuAn } from "../mo-hinh";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";
import { BieuTuong, DaiChang, DongMoc, PhanBoTrangThai, VongTienDo } from "../thanh-phan/BieuDo";
import { BangHo } from "../thanh-phan/BangHo";
import { khongDau, khopTuKhoa } from "./DanhSachHo";
import { taoDuAnMau } from "../du-lieu-mau";
import { TT_GPMB, homNayIso, mocTienDo, thongKe, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { HopTaoDuAn } from "./TongQuan";
import { xuatExcelDuAn } from "../xuat-excel";
import { BanDoNho } from "../thanh-phan/BanDoNho";
import { ThePhuongAn } from "../thanh-phan/PhuongAn";
import { HopNhapExcel } from "../thanh-phan/HopNhapExcel";
import { HopTienDoDuAn } from "../thanh-phan/TienDoDuAn";
import { Chon } from "../thanh-phan/Chon";
export { hoMoi };

export const BT_LOAI_DU_AN: Record<LoaiDuAn, string> = { GIAO_THONG: "duong", CONG_NGHIEP: "nhaMay", TAI_DINH_CU: "nha", DO_THI: "toaNha", THUY_LOI: "nuoc", KHAC: "thua" };
export const LOP_TT_DU_AN: Record<TrangThaiDuAn, string> = { DANG_TRIEN_KHAI: "nhan-xanh", TAM_DUNG: "nhan-vang", HOAN_THANH: "nhan-duong" };
export const thieuDuLieu = (d: DuAn) => [!d.giaGao && "giá gạo (ổn định đời sống)", !d.hanMucNN && "hạn mức giao đất NN (chuyển đổi nghề)"].filter(Boolean) as string[];
export const tyDong = (v: Decimal) => (v.gte(1e9) ? `${v.div(1e9).toDecimalPlaces(1).toNumber().toLocaleString("vi-VN")} tỷ` : v.gte(1e6) ? `${v.div(1e6).toDecimalPlaces(1).toNumber().toLocaleString("vi-VN")} triệu` : `${tien(v)} đ`);

type SapXep = "MOI" | "TEN" | "TIEN_DO" | "TIEN";

/** Dự án & hồ sơ: danh sách dự án (thẻ hoặc bảng) + chi tiết dự án đang chọn và bảng hộ, cá nhân, tổ chức. */
export function ManDuAn({ duAnId: idVao }: { duAnId?: string }) {
  const { dsDuAn, hoCua, di, chinhSach, quyen, dangTai, kho, luuDuAn } = useUngDung();
  const homNay = homNayIso();
  const [timDa, setTimDa] = useState("");
  const [locDa, setLocDa] = useState<TrangThaiDuAn | "">("");
  const [sapXep, setSapXep] = useState<SapXep>("MOI");
  const [dangLuoi, setDangLuoi] = useState(true);
  const [taoMoi, setTaoMoi] = useState(false);

  const tatCa = useMemo(
    () =>
      dsDuAn.map((d) => {
        const ds = hoCua(d.id).map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) }));
        return { d, ds, tk: thongKe(d, ds, homNay), tong: ds.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)) };
      }),
    [dsDuAn, hoCua, chinhSach, homNay],
  );
  const duAnId = idVao && dsDuAn.some((d) => d.id === idVao) ? idVao : dsDuAn[0]?.id;
  const chon = (id: string) => di({ ten: "du-an", duAnId: id });
  const hienThiDa = tatCa
    .filter((x) => !locDa || (x.d.trangThaiDuAn ?? "DANG_TRIEN_KHAI") === locDa)
    .filter((x) => !timDa || khongDau(`${x.d.ten} ${x.d.xa} ${x.d.chuDauTu}`).includes(khongDau(timDa.trim())))
    .sort((a, b) =>
      sapXep === "TEN" ? a.d.ten.localeCompare(b.d.ten, "vi") : sapXep === "TIEN_DO" ? b.tk.tienDoChung - a.tk.tienDoChung : sapXep === "TIEN" ? b.tong.comparedTo(a.tong) : b.d.taoLuc.localeCompare(a.d.taoLuc),
    );
  const soHo = tatCa.reduce((s, x) => s + x.tk.soHo, 0);
  const soThua = tatCa.reduce((s, x) => s + x.tk.soThua, 0);
  const tongTien = tatCa.reduce((s, x) => s.plus(x.tong), D(0));
  const thangNay = homNay.slice(0, 7);
  const moiThangNay = dsDuAn.filter((d) => d.taoLuc.slice(0, 7) === thangNay).length;
  const thieu = dsDuAn.filter((d) => thieuDuLieu(d).length);
  const napMau = async () => {
    const { duAn, ho } = taoDuAnMau();
    await kho.luuDuAn(duAn);
    for (const h of ho) await kho.luuHo(h);
    await luuDuAn(duAn);
  };

  return (
    <div className="trang">
      <div className="duong-dan"><button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / Dự án</div>
      <div className="da-dau">
        <div>
          <h1>Danh sách dự án</h1>
          <div className="mo-ta">Quản lý các dự án bồi thường, hỗ trợ, tái định cư trên địa bàn tỉnh Sơn La</div>
        </div>
        <div className="da-thong-ke">
          <ChiSoNho bt="hoSo" nhan="Tổng số dự án" gt={dsDuAn.length.toLocaleString("vi-VN")} phu={moiThangNay ? `+${moiThangNay} trong tháng này` : undefined} />
          <ChiSoNho bt="vanBan" nhan="Tổng số hồ sơ" gt={soHo.toLocaleString("vi-VN")} bam={() => di({ ten: "ds-ho" })} />
          <ChiSoNho bt="lop" nhan="Tổng số thửa đất" gt={soThua.toLocaleString("vi-VN")} bam={() => di({ ten: "ds-ho" })} />
          <ChiSoNho bt="mayTinh" nhan="Tổng tạm tính" gt={`${tyDong(tongTien)}${tongTien.gte(1e6) ? " đồng" : ""}`} bam={() => di({ ten: "bao-cao" })} />
        </div>
      </div>

      {thieu.length > 0 && (
        <div className="thong-bao thong-bao-vang da-canh-bao">
          <span>Có <b>{thieu.length} dự án</b> đang thiếu dữ liệu bắt buộc (giá gạo, hạn mức giao đất nông nghiệp) — các khoản liên quan ở trạng thái "Thiếu căn cứ".</span>
          <button className="nut nut-chu nut-nho" onClick={() => chon(thieu[0]!.id)}>Xem chi tiết →</button>
        </div>
      )}

      <div className="the" style={{ marginBottom: 16 }}>
        <div className="the-dau da-cong-cu">
          <h2>Dự án đang theo dõi</h2><span className="mo">({hienThiDa.length} dự án)</span>
          <div className="phai">
            <label className="o-tim" style={{ minWidth: 260 }}><BieuTuong ten="traCuu" co={16} /><input value={timDa} onChange={(e) => setTimDa(e.target.value)} placeholder="Tìm dự án theo tên, địa điểm…" aria-label="Tìm dự án" /></label>
            <Chon value={locDa} onChange={(e) => setLocDa(e.target.value as TrangThaiDuAn | "")} aria-label="Lọc trạng thái dự án">
              <option value="">Tất cả trạng thái</option>
              {(Object.keys(TEN_TRANG_THAI_DU_AN) as TrangThaiDuAn[]).map((t) => <option key={t} value={t}>{TEN_TRANG_THAI_DU_AN[t]}</option>)}
            </Chon>
            <Chon value={sapXep} onChange={(e) => setSapXep(e.target.value as SapXep)} aria-label="Sắp xếp">
              <option value="MOI">Mới nhất</option><option value="TEN">Tên A → Z</option><option value="TIEN_DO">Tiến độ cao nhất</option><option value="TIEN">Tạm tính lớn nhất</option>
            </Chon>
            <div className="nhom-chuyen" role="group" aria-label="Kiểu hiển thị">
              <button className={dangLuoi ? "chon" : ""} onClick={() => setDangLuoi(true)} aria-label="Dạng thẻ" title="Dạng thẻ"><BieuTuong ten="luoi" co={16} /></button>
              <button className={!dangLuoi ? "chon" : ""} onClick={() => setDangLuoi(false)} aria-label="Dạng bảng" title="Dạng bảng"><BieuTuong ten="danhSach" co={16} /></button>
            </div>
            {quyen("SUA_HO_SO") && <button className="nut nut-chinh" onClick={() => setTaoMoi(true)}><BieuTuong ten="cong" co={15} /> Dự án mới</button>}
          </div>
        </div>
        {tatCa.length === 0 ? (
          <div className="trong">
            {dangTai ? "Đang tải…" : "Chưa có dự án."}{" "}
            {!dangTai && quyen("SUA_HO_SO") && <><button className="nut nut-nho" onClick={napMau}>Nạp dữ liệu mẫu (ẩn danh)</button> <button className="nut nut-nho nut-chinh" onClick={() => setTaoMoi(true)}>+ Dự án mới</button></>}
          </div>
        ) : dangLuoi ? (
          <div className="da-luoi">
            {hienThiDa.map(({ d, tk, tong }) => {
              const tt = d.trangThaiDuAn ?? "DANG_TRIEN_KHAI";
              return (
                <div key={d.id} className={`da-the ${d.id === duAnId ? "chon" : ""}`} onClick={() => chon(d.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && chon(d.id)}>
                  <div className="da-the-dau">
                    <span className="da-bt"><BieuTuong ten={BT_LOAI_DU_AN[d.loaiDuAn ?? "KHAC"]} co={22} /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b className="da-ten">{d.ten}</b>
                      <div className="chu-nho mo"><BieuTuong ten="viTri" co={13} /> {d.xa || "—"}, tỉnh Sơn La</div>
                    </div>
                    <span className={`nhan ${LOP_TT_DU_AN[tt]}`}>{TEN_TRANG_THAI_DU_AN[tt]}</span>
                  </div>
                  <div className="da-so">
                    <div><BieuTuong ten="vanBan" co={16} /><b>{tk.soHo}</b><small>Hồ sơ</small></div>
                    <div><BieuTuong ten="lop" co={16} /><b>{tk.soThua}</b><small>Thửa đất</small></div>
                    <div><BieuTuong ten="mayTinh" co={16} /><b>{tyDong(tong)}</b><small>Tổng tạm tính</small></div>
                  </div>
                  <div className="da-td"><span>Tiến độ chung</span><b>{Math.round(tk.tienDoChung * 100)}%</b></div>
                  <div className="td-mini" style={{ height: 7 }}><span style={{ width: `${Math.round(tk.tienDoChung * 100)}%` }} /></div>
                </div>
              );
            })}
            {hienThiDa.length === 0 && <div className="trong">Không có dự án khớp điều kiện.</div>}
          </div>
        ) : (
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr><th>Dự án</th><th>Địa điểm</th><th>Trạng thái</th><th className="so">Hồ sơ</th><th className="so">Thửa</th><th className="so">Tổng tạm tính (đ)</th><th style={{ width: 180 }}>Tiến độ chung</th></tr></thead>
              <tbody>
                {hienThiDa.map(({ d, tk, tong }) => {
                  const tt = d.trangThaiDuAn ?? "DANG_TRIEN_KHAI";
                  return (
                    <tr key={d.id} className={`co-the-chon ${d.id === duAnId ? "dang-chon" : ""}`} onClick={() => chon(d.id)}>
                      <td><b>{d.ten}</b></td><td>{d.xa}</td><td><span className={`nhan ${LOP_TT_DU_AN[tt]}`}>{TEN_TRANG_THAI_DU_AN[tt]}</span></td>
                      <td className="so">{tk.soHo}</td><td className="so">{tk.soThua}</td><td className="so">{tien(tong)}</td>
                      <td><div className="td-mini"><span style={{ width: `${Math.round(tk.tienDoChung * 100)}%` }} /></div><span className="chu-nho">{Math.round(tk.tienDoChung * 100)}%</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {taoMoi && <HopTaoDuAn dong={() => setTaoMoi(false)} />}
    </div>
  );
}

function ChiSoNho({ bt, nhan, gt, phu, bam }: { bt: string; nhan: string; gt: string; phu?: string; bam?: () => void }) {
  return (
    <div className={`chi-so-nho ${bam ? "bam" : ""}`} onClick={bam} role={bam ? "button" : undefined} tabIndex={bam ? 0 : undefined}>
      <span className="bt"><BieuTuong ten={bt} co={20} /></span>
      <div>
        <div className="chu-nho mo">{nhan}</div>
        <b>{gt}</b>
        {phu && <div className="phu">↗ {phu}</div>}
      </div>
    </div>
  );
}

export function HopThemHo({ duAnId, soHo, dong }: { duAnId: string; soHo: number; dong: () => void }) {
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
          <Chon value={loai} onChange={(e) => setLoai(e.target.value as LoaiDoiTuong)}>
            {Object.entries(TEN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Chon>
        </O>
        <O nhan="Họ tên chủ hộ / tên tổ chức" style={{ gridColumn: "1/-1" }}><input value={ten} onChange={(e) => setTen(e.target.value)} autoFocus /></O>
      </div>
    </HopThoai>
  );
}

export function HopKeHoach({ duAn, dong }: { duAn: DuAn; dong: () => void }) {
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

import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../../ung-dung";
import { TEN_KHOAN_KHAC, type KetQuaHo } from "../../tinh-ho";
import { TEN_SXKD, type CachSxkd } from "@gpmb/core";
import { taoId, type DuAn, type HoTroKhacHo } from "../../mo-hinh";
import { NhanDong, O, tien } from "../../thanh-phan/chung";
import { BieuTuong } from "../../thanh-phan/BieuDo";
import { Chon } from "../../thanh-phan/Chon";
import { OSo } from "../../thanh-phan/OSo";
import type { Tab } from "./kieu";

/** Các khoản của Điều 6 QĐ 14/2026 đã nhập ở thẻ khác — để cán bộ biết không nhập trùng. */
const DA_CO_NOI_KHAC: [string, string][] = [
  ["khoản 3", "Hỗ trợ nhà, công trình (đất sai mục đích, không đủ điều kiện, có biên bản vi phạm) — thẻ Kiểm đếm, cách tính \"Hỗ trợ theo mốc xây dựng (k3)\"; ngày trùng đúng mốc thì chọn mức, ghi lý do"],
  ["khoản 7", "Cây trồng không đủ điều kiện bồi thường (100% / 80%) — thẻ Kiểm đếm, chọn ở tiêu đề từng thửa"],
  ["khoản 8, 10", "Chênh lệch giá đất, chuyển đổi nghề theo chênh lệch — thẻ Thửa đất, mở chi tiết thửa"],
  ["khoản 9", "Đất nguồn gốc nông, lâm trường — thẻ Thửa đất (chuyển đổi nghề điểm 9.1.b theo Điều 14 PL II — QD-29)"],
  ["khoản 11", "Hỗ trợ 20% tiền sử dụng đất thửa tái định cư — thẻ Hỗ trợ, mục Tái định cư"],
  ["khoản 12", "Hỗ trợ tạm cư — thẻ Hỗ trợ (mức theo Điều 3 QĐ 14/2026)"],
  ["PL II Điều 3", "Chi phí đầu tư vào đất còn lại (dự toán / 01 lần giá đất) — thẻ Thửa đất, mở chi tiết thửa"],
  ["PL II Điều 7", "Đất trong hành lang bảo vệ an toàn (80/50/30%; 50%) — thẻ Thửa đất; nhà trong hành lang lưới điện không di dời (70%) — thẻ Kiểm đếm, cách tính \"Trong hành lang lưới điện\""],
  ["PL II Điều 12", "Ổn định đời sống — thẻ Hỗ trợ (số nhân khẩu có chung quyền sử dụng đất nhập được)"],
  ["PL II Điều 15", "Thưởng bàn giao trước hạn — Thông tin dự án, mục thưởng bàn giao (điền theo Điều 15)"],
];

/**
 * Thẻ "Hỗ trợ khác" (Điều 6 QĐ 14/2026): k1 đối tượng chính sách (cán bộ chọn mức), k2 hộ nghèo, VM-17 (cán bộ chọn
 * cộng hay chỉ lấy khoản cao hơn), k6 ổn định đời sống khi xây lại nhà (cán bộ tích), k4, k13, k14 và khoản khác nhập tay;
 * Phụ lục II QĐ 106/2025: ổn định sản xuất (Điều 13 k1, định mức cán bộ nhập), ổn định SXKD (k2, k3), trợ cấp ngừng
 * việc (k4), người đang sử dụng nhà ở thuộc sở hữu nhà nước (Điều 11).
 */
export function TabHoTroKhac({ h, doi, duAn, kq }: Tab & { duAn: DuAn; kq: KetQuaHo }) {
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn).hoTroKhac;
  const pl2 = chinhSach(duAn).phuLucII;
  const k: HoTroKhacHo = h.hoTro.khac ?? { khoan: [] };
  const dat = (p: Partial<HoTroKhacHo>) => {
    const moi = { ...k, ...p };
    const trong = !moi.doiTuongCs?.length && !moi.hoNgheo && !moi.xayLaiNha && !moi.khoan.length && !moi.vm17 && !moi.khauXayLaiNha && !moi.onDinhSanXuat && !moi.nhaNhaNuoc && !moi.sxkd;
    doi({ ...h, hoTro: { ...h.hoTro, khac: trong ? undefined : moi } });
  };
  const suaDt = (id: string, p: Partial<NonNullable<HoTroKhacHo["doiTuongCs"]>[number]>) => dat({ doiTuongCs: k.doiTuongCs!.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const suaKhoan = (id: string, p: Partial<HoTroKhacHo["khoan"][number]>) => dat({ khoan: k.khoan.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const coCaHai = !!k.doiTuongCs?.length && !!k.hoNgheo;
  const dong = kq.nhom.find((x) => x.ma === "B.VII")?.dong ?? [];
  const tong = dong.reduce((s, x) => (x.dong.thanhTien && x.dong.trangThai === "TAM_TINH" ? s.plus(x.dong.thanhTien) : s), D(0));
  return (
    <div className="luoi">
      {!cs && <div className="thong-bao thong-bao-vang">Bộ chính sách {chinhSach(duAn).ma} chưa có mức hỗ trợ khoản 1, 2, 6 Điều 6 QĐ 14/2026 — các khoản này sẽ ở trạng thái "Thiếu căn cứ"; khoản nhập tay vẫn dùng được.</div>}
      <div className="luoi luoi-2">
        <div className="the">
          <div className="the-dau">
            <h3>Người hưởng trợ cấp xã hội phải di chuyển chỗ ở</h3>
            <span className="mo chu-nho">khoản 1 Điều 6 QĐ 14/2026</span>
            <div className="phai"><button className="nut nut-nho" onClick={() => dat({ doiTuongCs: [...(k.doiTuongCs ?? []), { id: taoId(), ten: "", muc: "", xacNhan: "" }] })}><BieuTuong ten="cong" co={14} /> Thêm đối tượng</button></div>
          </div>
          <div className="the-than luoi">
            <div className="mo chu-nho">Hộ có người đang hưởng chế độ trợ cấp xã hội của Nhà nước phải di chuyển chỗ ở. Chọn đối tượng theo điểm a–đ (mức theo điểm), ghi xác nhận của Phòng Văn hóa – Xã hội (hoặc Kinh tế, Văn hóa, Xã hội) UBND cấp xã. Hộ có nhiều tiêu chuẩn chỉ hưởng một mức cao nhất; điểm đ không áp dụng cho hộ nghèo (khoản 2).</div>
            {(k.doiTuongCs ?? []).map((x) => {
              const dm = cs?.doiTuongChinhSach.diem?.find((y) => y.ma === x.diem);
              return (
                <div key={x.id} className="luoi" style={{ gridTemplateColumns: "1fr 1.6fr 1.1fr 36px", gap: 6, alignItems: "end" }}>
                  <O nhan="Họ tên người hưởng"><input value={x.ten} onChange={(e) => suaDt(x.id, { ten: e.target.value })} /></O>
                  <O nhan="Đối tượng (điểm, mức)">
                    <Chon value={x.diem ?? (x.muc ? "__muc" : "")} aria-label="Đối tượng hưởng trợ cấp" className={x.diem || x.muc ? "" : "loi-nhap"} title={dm?.ten} onChange={(e) => { const m = cs?.doiTuongChinhSach.diem?.find((y) => y.ma === e.target.value); suaDt(x.id, { diem: m?.ma, muc: m?.muc ?? "" }); }}>
                      <option value="">— Chọn đối tượng —</option>
                      {!x.diem && x.muc && <option value="__muc">Mức {dinhDang(D(x.muc))} đ (chưa chọn điểm)</option>}
                      {(cs?.doiTuongChinhSach.diem ?? []).map((m) => <option key={m.ma} value={m.ma} title={m.ten}>Điểm {m.ma} – {dinhDang(D(m.muc))} đ: {m.ten.length > 70 ? `${m.ten.slice(0, 70)}…` : m.ten}</option>)}
                    </Chon>
                  </O>
                  <O nhan="Xác nhận của phòng chuyên môn *"><input className={x.xacNhan.trim() ? "" : "loi-nhap"} value={x.xacNhan} placeholder="Số, ngày văn bản xác nhận" onChange={(e) => suaDt(x.id, { xacNhan: e.target.value })} /></O>
                  <button className="nut nut-chu nut-nguy nut-nho" aria-label="Xóa đối tượng" onClick={() => { const con = k.doiTuongCs!.filter((y) => y.id !== x.id); dat({ doiTuongCs: con.length ? con : undefined }); }}><BieuTuong ten="thungRac" co={15} /></button>
                  {dm && <div className="chu-nho mo ca-hang">Điểm {dm.ma}: {dm.ten}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="the">
          <div className="the-dau">
            <h3>Hộ nghèo</h3>
            <span className="mo chu-nho">khoản 2 Điều 6 QĐ 14/2026{cs ? ` · ${dinhDang(D(cs.hoNgheo.soTien))} đ/hộ` : ""}</span>
            <div className="phai"><label><input type="checkbox" checked={!!k.hoNgheo} onChange={(e) => dat({ hoNgheo: e.target.checked ? { xacNhan: "" } : undefined })} /> Áp dụng</label></div>
          </div>
          {k.hoNgheo && (
            <div className="the-than luoi">
              {cs && <div className="mo chu-nho">Điều kiện: {cs.hoNgheo.dieuKien}.</div>}
              <O nhan="Giấy tờ xác nhận hộ nghèo *"><input className={k.hoNgheo.xacNhan.trim() ? "" : "loi-nhap"} value={k.hoNgheo.xacNhan} placeholder="vd. Quyết định công nhận hộ nghèo số …" onChange={(e) => dat({ hoNgheo: { xacNhan: e.target.value } })} /></O>
            </div>
          )}
        </div>
      </div>

      {coCaHai && (
        <div className="the" data-vm17>
          <div className="the-dau"><h3>Hộ vừa có đối tượng chính sách vừa là hộ nghèo (VM-17)</h3><span className="mo chu-nho">Linh động — cán bộ lựa chọn, bắt buộc lý do</span></div>
          <div className="the-than luoi luoi-2">
            <O nhan="Cách tính">
              <Chon value={k.vm17?.cach ?? ""} aria-label="Cách tính VM-17" className={k.vm17?.lyDo.trim() ? "" : "loi-nhap"} onChange={(e) => dat({ vm17: e.target.value ? { cach: e.target.value as "CONG" | "CAO_HON", lyDo: k.vm17?.lyDo ?? "" } : undefined })}>
                <option value="">— Chưa chọn (các khoản ở trạng thái Cần xác nhận) —</option>
                <option value="CONG">Cộng cả hai khoản (k1 + k2)</option>
                <option value="CAO_HON">Chỉ lấy khoản cao hơn</option>
              </Chon>
            </O>
            {k.vm17 && <O nhan="Lý do lựa chọn *"><input className={k.vm17.lyDo.trim() ? "" : "loi-nhap"} value={k.vm17.lyDo} onChange={(e) => dat({ vm17: { ...k.vm17!, lyDo: e.target.value } })} /></O>}
          </div>
        </div>
      )}

      <div className="the">
        <div className="the-dau">
          <h3>Ổn định đời sống trong thời gian xây dựng lại nhà ở</h3>
          <span className="mo chu-nho">khoản 6 Điều 6 QĐ 14/2026{cs ? ` · ${cs.xayLaiNha.kgGaoNhanKhauThang} kg gạo × giá gạo × nhân khẩu × ${cs.xayLaiNha.soThang} tháng` : ""}</span>
          <div className="phai"><label><input type="checkbox" checked={!!k.xayLaiNha} onChange={(e) => dat({ xayLaiNha: e.target.checked || undefined })} /> Áp dụng</label></div>
        </div>
        {k.xayLaiNha && (
          <div className="the-than luoi luoi-2">
            <O nhan="Số nhân khẩu được hỗ trợ" goiY={cs?.xayLaiNha.nhanKhau ?? "Người có chung quyền sử dụng đất tại thời điểm phê duyệt phương án"}>
              <input inputMode="numeric" aria-label="Số nhân khẩu được hỗ trợ khoản 6" value={k.khauXayLaiNha ?? ""} placeholder={`Trống = ${h.nhanKhau.length} (nhân khẩu trong hồ sơ)`} onChange={(e) => dat({ khauXayLaiNha: e.target.value.replace(/\D/g, "") || undefined })} />
            </O>
            <div className="mo chu-nho" style={{ alignSelf: "center" }}>Hộ có nhà trên đất phải phá dỡ và phải làm lại nhà ở tại địa điểm khác. Giá gạo tẻ trung bình của địa phương tại thời điểm hỗ trợ (nhập ở Thông tin dự án).</div>
          </div>
        )}
        {k.xayLaiNha && h.hoTro.onDinh && <div className="thong-bao thong-bao-vang chu-nho" style={{ margin: "0 12px 10px" }}>Hộ đồng thời có hỗ trợ ổn định đời sống theo Điều 12 Phụ lục II QĐ 106/2025 (thẻ Hỗ trợ) — cần kiểm tra, tránh hỗ trợ trùng. Phần mềm không tự loại khoản nào.</div>}
      </div>

      <div className="the" data-k5>
        <div className="the-dau">
          <h3>Ổn định sản xuất</h3>
          <span className="mo chu-nho">khoản 1 Điều 13 Phụ lục II QĐ 106/2025; khoản 5 Điều 6 QĐ 14/2026</span>
          <div className="phai"><label><input type="checkbox" checked={!!k.onDinhSanXuat} onChange={(e) => dat({ onDinhSanXuat: e.target.checked ? { dk: [false, false, false, false], soTien: "", canCu: "" } : undefined })} /> Áp dụng</label></div>
        </div>
        {k.onDinhSanXuat && (() => {
          const o = k.onDinhSanXuat;
          const datO = (p: Partial<typeof o>) => dat({ onDinhSanXuat: { ...o, ...p } });
          const dm = o.dinhMuc;
          const datDm = (p: Partial<NonNullable<typeof dm>>) => datO({ dinhMuc: { hnDt: "", hnDinhMuc: "", lnDt: "", lnChiPhi: "", ...dm, ...p } });
          return (
            <div className="the-than luoi">
              <div className="luoi luoi-2">
                <O nhan="Trường hợp">
                  <Chon value={o.coSo ?? "K5"} aria-label="Trường hợp ổn định sản xuất" onChange={(e) => datO({ coSo: e.target.value as "K5" | "D13" })}>
                    <option value="K5">Khoản 5 Điều 6 QĐ 14/2026 — còn đất sản xuất nơi khác (4 điều kiện)</option>
                    <option value="D13">Được bồi thường bằng đất nông nghiệp (k1 Điều 13 PL II QĐ 106)</option>
                  </Chon>
                </O>
                <O nhan="Cách xác định mức">
                  <Chon value={dm ? "DINH_MUC" : "NHAP"} aria-label="Cách xác định mức ổn định sản xuất" onChange={(e) => datO({ dinhMuc: e.target.value === "DINH_MUC" ? { hnDt: "", hnDinhMuc: "", lnDt: "", lnChiPhi: "" } : undefined })}>
                    <option value="NHAP">Nhập số tiền (bảng tính kèm theo)</option>
                    <option value="DINH_MUC">Tính theo định mức: cây hàng năm 100% × {pl2?.onDinhSanXuatDat.soVu ?? 2} vụ; cây lâu năm 50%, ≤ 1 ha</option>
                  </Chon>
                </O>
              </div>
              {(o.coSo ?? "K5") === "K5" && (
                <div className="luoi luoi-2" style={{ gap: 4 }}>
                  {(cs?.onDinhSanXuat?.dieuKien ?? []).map((d, i) => (
                    <label key={i} className="chu-nho"><input type="checkbox" checked={!!o.dk[i]} onChange={(e) => { const moi = [...o.dk]; moi[i] = e.target.checked; datO({ dk: moi }); }} /> {d}</label>
                  ))}
                </div>
              )}
              {dm ? (
                <div className="luoi" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  <O nhan="DT cây hàng năm (m²)"><OSo className="o-so" aria-label="DT cây hàng năm ổn định sản xuất" value={dm.hnDt} onChange={(v) => datDm({ hnDt: v })} /></O>
                  <O nhan="Giống, vật tư (đ/ha/vụ)"><OSo className="o-so" aria-label="Định mức cây hàng năm" value={dm.hnDinhMuc} onChange={(v) => datDm({ hnDinhMuc: v })} /></O>
                  <O nhan="DT cây lâu năm (m²)"><OSo className="o-so" aria-label="DT cây lâu năm ổn định sản xuất" value={dm.lnDt} onChange={(v) => datDm({ lnDt: v })} /></O>
                  <O nhan="Chi phí năm đầu (đ/ha)"><OSo className="o-so" aria-label="Chi phí năm đầu cây lâu năm" value={dm.lnChiPhi} onChange={(v) => datDm({ lnChiPhi: v })} /></O>
                </div>
              ) : null}
              <div className="luoi luoi-3">
                {!dm && <O nhan="Số tiền (đ)" goiY="Theo định mức giống, vật tư / chi phí năm đầu (khoản 1 Điều 13 PL II QĐ 106)"><OSo className="o-so" value={o.soTien} onChange={(v) => datO({ soTien: v })} /></O>}
                <O nhan="Căn cứ định mức, văn bản *"><input aria-label="Căn cứ định mức ổn định sản xuất" className={o.canCu.trim() ? "" : "loi-nhap"} value={o.canCu} placeholder="vd. Định mức kinh tế kỹ thuật … (Bộ NN&PTNT, UBND tỉnh)" onChange={(e) => datO({ canCu: e.target.value })} /></O>
                <O nhan="Nội dung (tùy chọn)"><input value={o.noiDung ?? ""} onChange={(e) => datO({ noiDung: e.target.value || undefined })} /></O>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="luoi luoi-2">
        <div className="the" data-dieu-11>
          <div className="the-dau">
            <h3>Người đang sử dụng nhà ở thuộc sở hữu nhà nước</h3>
            <span className="mo chu-nho">Điều 11 Phụ lục II QĐ 106/2025</span>
            <div className="phai"><label><input type="checkbox" aria-label="Áp dụng Điều 11" checked={!!k.nhaNhaNuoc} onChange={(e) => dat({ nhaNhaNuoc: e.target.checked ? { cach: "THUE", soThang: "" } : undefined })} /> Áp dụng</label></div>
          </div>
          {k.nhaNhaNuoc && (
            <div className="the-than luoi">
              <div className="mo chu-nho">Phải phá dỡ nhà, không còn chỗ ở nào khác trong địa bàn cấp xã. Thuê nhà: {pl2 ? `${dinhDang(D(pl2.nhaSoHuuNhaNuoc.den2Khau))} đ/tháng (≤ 2 khẩu), ${dinhDang(D(pl2.nhaSoHuuNhaNuoc.den4Khau))} đ/tháng (≤ 4 khẩu), thêm ${dinhDang(D(pl2.nhaSoHuuNhaNuoc.congThemMoiKhau))} đ/khẩu từ khẩu thứ 5; tối đa ${pl2.nhaSoHuuNhaNuoc.thangToiDa} tháng` : "—"}. Tự lo chỗ ở: 50% mức Điều 10. Giao đất ở, bán nhà ở (k2) do Chủ tịch UBND cấp xã quyết định — ghi ở mục Tái định cư.</div>
              <div className="luoi luoi-3">
                <O nhan="Hình thức">
                  <Chon value={k.nhaNhaNuoc.cach} aria-label="Hình thức Điều 11" onChange={(e) => dat({ nhaNhaNuoc: { ...k.nhaNhaNuoc!, cach: e.target.value as "THUE" | "TU_LO" } })}>
                    <option value="THUE">Hỗ trợ thuê nhà ở (k1)</option>
                    <option value="TU_LO">Tự lo chỗ ở mới (k3)</option>
                  </Chon>
                </O>
                {k.nhaNhaNuoc.cach === "THUE" && <O nhan="Số tháng thuê thực tế"><input inputMode="numeric" aria-label="Số tháng thuê nhà Điều 11" className={k.nhaNhaNuoc.soThang ? "" : "loi-nhap"} value={k.nhaNhaNuoc.soThang} onChange={(e) => dat({ nhaNhaNuoc: { ...k.nhaNhaNuoc!, soThang: e.target.value.replace(/\D/g, "") } })} /></O>}
                {k.nhaNhaNuoc.cach === "THUE" && <O nhan="Số nhân khẩu"><input inputMode="numeric" value={k.nhaNhaNuoc.nhanKhau ?? ""} placeholder={`Trống = ${h.nhanKhau.length}`} onChange={(e) => dat({ nhaNhaNuoc: { ...k.nhaNhaNuoc!, nhanKhau: e.target.value.replace(/\D/g, "") || undefined } })} /></O>}
              </div>
            </div>
          )}
        </div>
        <div className="the" data-sxkd>
          <div className="the-dau">
            <h3>Ổn định sản xuất kinh doanh phi nông nghiệp</h3>
            <span className="mo chu-nho">khoản 2, 3 Điều 13 Phụ lục II QĐ 106/2025</span>
            <div className="phai"><label><input type="checkbox" aria-label="Áp dụng ổn định SXKD" checked={!!k.sxkd} onChange={(e) => dat({ sxkd: e.target.checked ? { cach: "K2", thuNhap: "", doanhThu: "", canCu: "" } : undefined })} /> Áp dụng</label></div>
          </div>
          {k.sxkd && (
            <div className="the-than luoi">
              <O nhan="Trường hợp">
                <Chon value={k.sxkd.cach} aria-label="Trường hợp ổn định SXKD" onChange={(e) => dat({ sxkd: { ...k.sxkd!, cach: e.target.value as CachSxkd } })}>
                  {Object.entries(TEN_SXKD).map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}
                </Chon>
              </O>
              <div className="luoi luoi-2">
                {k.sxkd.cach === "K3" ? (
                  <O nhan="Doanh thu bình quân tính thuế (đ/năm)" goiY={pl2 ? `≤ ${dinhDang(D(pl2.onDinhSxkd.nguongDoanhThu))}: ${dinhDang(D(pl2.onDinhSxkd.mucDuoiNguong))} đ; trên: ${dinhDang(D(pl2.onDinhSxkd.mucTrenNguong))} đ/cơ sở` : undefined}><OSo className="o-so" aria-label="Doanh thu bình quân" value={k.sxkd.doanhThu} onChange={(v) => dat({ sxkd: { ...k.sxkd!, doanhThu: v } })} /></O>
                ) : (
                  <O nhan="Thu nhập sau thuế BQ năm của 3 năm liền kề (đ)"><OSo className="o-so" aria-label="Thu nhập sau thuế bình quân" value={k.sxkd.thuNhap} onChange={(v) => dat({ sxkd: { ...k.sxkd!, thuNhap: v } })} /></O>
                )}
                <O nhan={k.sxkd.cach === "K3" ? "Văn bản cơ quan thuế xác định doanh thu *" : "Căn cứ thu nhập (BCTC, quyết toán thuế) *"}><input aria-label="Căn cứ số liệu SXKD" className={k.sxkd.canCu.trim() ? "" : "loi-nhap"} value={k.sxkd.canCu} onChange={(e) => dat({ sxkd: { ...k.sxkd!, canCu: e.target.value } })} /></O>
              </div>
              <div className="mo chu-nho">Người lao động bị ngừng việc (k4 Điều 13): thêm ở mục "Khoản hỗ trợ khác nhập tay" → "Trợ cấp ngừng việc".</div>
            </div>
          )}
        </div>
      </div>

      <div className="the">
        <div className="the-dau">
          <h3>Khoản hỗ trợ khác nhập tay</h3>
          <span className="mo chu-nho">khoản 4, 13 Điều 6 QĐ 14/2026, k4 Điều 13 PL II QĐ 106 và chính sách chưa có sẵn — bắt buộc căn cứ; khoản 14: công khai, minh bạch, có biên bản họp bàn</span>
          <div className="phai">
            {(["K4", "K13_14", "D13_K4", "KHAC"] as const).map((l) => (
              <button key={l} className="nut nut-nho" title={TEN_KHOAN_KHAC[l].goiY} onClick={() => dat({ khoan: [...k.khoan, { id: taoId(), loai: l, noiDung: l === "KHAC" ? "" : TEN_KHOAN_KHAC[l].ten, soTien: "", canCu: "" }] })}>
                <BieuTuong ten="cong" co={14} /> {l === "K4" ? "Công trình ngoài cọc (k4)" : l === "K13_14" ? "UBND xã quyết định (k13, k14)" : l === "D13_K4" ? "Trợ cấp ngừng việc" : "Khoản khác"}
              </button>
            ))}
          </div>
        </div>
        {k.khoan.length > 0 && (
          <table className="bang">
            <thead><tr><th>Nội dung</th><th style={{ width: 170 }}>Số tiền (đ)</th><th style={{ width: 320 }}>Căn cứ (số, ngày văn bản) *</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {k.khoan.map((x) => (
                <tr key={x.id}>
                  <td><input value={x.noiDung} onChange={(e) => suaKhoan(x.id, { noiDung: e.target.value })} /><div className="can-cu">{TEN_KHOAN_KHAC[x.loai].goiY}</div></td>
                  <td><OSo className="o-so" value={x.soTien} onChange={(v) => suaKhoan(x.id, { soTien: v })} /></td>
                  <td><input className={x.canCu.trim() ? "" : "loi-nhap"} value={x.canCu} placeholder="vd. QĐ 45/QĐ-UBND ngày 10/9/2026 của UBND xã" onChange={(e) => suaKhoan(x.id, { canCu: e.target.value })} /></td>
                  <td><button className="nut nut-chu nut-nguy nut-nho" aria-label="Xóa khoản" onClick={() => dat({ khoan: k.khoan.filter((y) => y.id !== x.id) })}><BieuTuong ten="thungRac" co={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dong.length > 0 && (
        <div className="the">
          <div className="the-dau"><h3>Kết quả tạm tính — Hỗ trợ khác</h3><span className="phai"><b>{tien(tong)} đ</b></span></div>
          <table className="bang">
            <tbody>
              {dong.map((x, i) => (
                <tr key={i}>
                  <td style={{ width: 70 }}>{x.dong.ma}</td>
                  <td>{x.dong.noiDung}{x.dong.canhBao.map((c, j) => <div key={j} className="mo chu-nho">• {c}</div>)}</td>
                  <td className="so">{x.dong.thanhTien ? tien(x.dong.thanhTien) : "—"}</td>
                  <td style={{ width: 150 }}><NhanDong d={x.dong} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="the" style={{ padding: "8px 14px" }}>
        <summary className="chu-nho" style={{ fontWeight: 600 }}>Các khoản khác của Điều 6 đã nhập ở thẻ khác</summary>
        <table className="bang mt-8"><tbody>{DA_CO_NOI_KHAC.map(([a, b]) => <tr key={a}><td style={{ width: 130 }}>{a}</td><td className="chu-nho">{b}</td></tr>)}</tbody></table>
      </details>
    </div>
  );
}

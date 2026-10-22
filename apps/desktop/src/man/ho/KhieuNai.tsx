import { useUngDung } from "../../ung-dung";
import { O, ngayVN } from "../../thanh-phan/chung";
import { ONgay } from "../../thanh-phan/ONgay";
import { Chon } from "../../thanh-phan/Chon";
import { taoId, type DuAn, type Ho } from "../../mo-hinh";
import { homNayIso } from "../../trang-thai";
import { TEN_DINH_CHI, TEN_KET_QUA_DON, TEN_LOAI_DON, TEN_TDC, TEN_TT_DON, canhBaoThuTucDon, hanDon, hanGuiQd, type DonKhieuNai, type KetQuaDon, type LoaiDon, type TamDinhChi } from "../../khieu-nai";
import { DIEU_CC, TEN_LOAI_CC, hanBanGiaoSauChapHanh, hanThiHanh, kiemCuongChe, ngaySomNhatQdThuHoi, type CuongChe, type LoaiCuongChe } from "../../cuong-che";

const LOP_TT: Record<string, string> = { QUA_HAN: "nhan-do", QUA_HAN_THU_LY: "nhan-do", SAP_HET: "nhan-vang", CHO_THU_LY: "nhan-vang", DANG_GIAI_QUYET: "nhan-xanh", DA_GIAI_QUYET: "nhan-xam", KHONG_TINH_HAN: "nhan-xam", TAM_DINH_CHI: "nhan-vang" };
const LOP_MUC = { CAO: "thong-bao-do", TRUNG_BINH: "thong-bao-vang", THONG_TIN: "thong-bao-xanh" } as const;

/** 1.0.20 (B1, B2): thẻ Khiếu nại, cưỡng chế của hồ sơ hộ. */
export function TabKhieuNai({ h, duAn, doi, soanMau }: { h: Ho; duAn: DuAn; doi: (h: Ho) => void; soanMau?: (ma: string) => void }) {
  const { lich, nguoiDung } = useUngDung();
  const homNay = homNayIso();
  const ds = h.khieuNai ?? [];
  const dsCc = h.cuongChe ?? [];
  const datDon = (id: string, p: Partial<DonKhieuNai>) => doi({ ...h, khieuNai: ds.map((d) => (d.id === id ? { ...d, ...p } : d)) });
  const datCc = (id: string, p: Partial<CuongChe>) => doi({ ...h, cuongChe: dsCc.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const themDon = (loai: LoaiDon) => doi({ ...h, khieuNai: [{ id: taoId(), loai, lan: loai === "KHIEU_NAI" ? 1 : undefined, ngayNhan: homNay, noiDung: "", nguoiGhi: nguoiDung }, ...ds] });
  const themCc = (loai: LoaiCuongChe) => doi({ ...h, cuongChe: [...dsCc, { id: taoId(), loai }] });
  const xoa = <T extends { id: string }>(ten: string, mang: T[], id: string, gan: (m: T[]) => Ho) => {
    if (confirm(`Xóa ${ten} này khỏi hồ sơ? (Lịch sử thay đổi vẫn giữ bản trước)`)) doi(gan(mang.filter((x) => x.id !== id)));
  };
  void duAn;

  return (
    <div className="luoi">
      <div className="the" data-khieu-nai>
        <div className="the-dau">
          <h3>Khiếu nại, kiến nghị</h3>
          <span className="mo chu-nho">Thụ lý 10 ngày làm việc, đơn nhận từ 01/7/2026: 07 ngày làm việc (Điều 27, 36 Luật Khiếu nại sửa bởi Luật 136/2025; k1 Đ16 NĐ 124/2020 sửa bởi NĐ 155/2026); giải quyết lần đầu 30–60 ngày (Điều 28), lần hai 45–70 ngày (Điều 37) Luật Khiếu nại 2011</span>
        </div>
        <div className="the-than" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="nut nut-nho" onClick={() => themDon("KHIEU_NAI")}>+ Ghi đơn khiếu nại</button>
          <button className="nut nut-nho" onClick={() => themDon("KIEN_NGHI")}>+ Ghi kiến nghị, phản ánh</button>
        </div>
        {ds.length === 0 && <div className="the-than trong">Hộ chưa có đơn khiếu nại, kiến nghị nào.</div>}
        {ds.map((d) => {
          const t = hanDon(d, homNay, lich);
          return (
            <div key={d.id} className="the-than" style={{ borderTop: "1px solid var(--vien)" }} data-don={d.id}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <b>{TEN_LOAI_DON[d.loai]}{d.loai === "KHIEU_NAI" ? ` lần ${d.lan ?? 1}` : ""}</b>
                <span className={`nhan ${LOP_TT[t.tt]}`} data-tt-don={t.tt}>{TEN_TT_DON[t.tt]}</span>
                {t.han && <span className="chu-nho">{t.tt === "CHO_THU_LY" || t.tt === "QUA_HAN_THU_LY" ? "Hạn thụ lý" : "Hạn giải quyết"} {ngayVN(t.han)} ({t.soNgay} {t.tt === "CHO_THU_LY" || t.tt === "QUA_HAN_THU_LY" ? "ngày làm việc" : "ngày"}{t.conLai !== undefined ? (t.conLai < 0 ? `, quá ${-t.conLai} ngày` : `, còn ${t.conLai} ngày`) : ""}) — {t.canCu}</span>}
                <span style={{ flex: 1 }} />
{t.tt === "TAM_DINH_CHI" && <span className="chu-nho">Đang tạm đình chỉ ({t.ngayTamDinhChi} ngày, không tính vào thời hạn giải quyết) — {t.canCu}</span>}
                {soanMau && d.loai === "KHIEU_NAI" && (d.lan ?? 1) === 1 && <button className="nut nut-nho" data-soan-t14 onClick={() => soanMau("T14")}>Soạn QĐ giải quyết (T14)</button>}
                <button className="nut nut-nho nut-nguy" onClick={() => xoa("đơn", ds, d.id, (m) => ({ ...h, khieuNai: m }))}>Xóa</button>
              </div>
              <div className="luoi luoi-4">
                {d.loai === "KHIEU_NAI" && (
                  <O nhan="Lần giải quyết">
                    <Chon value={String(d.lan ?? 1)} onChange={(e) => datDon(d.id, { lan: e.target.value === "2" ? 2 : 1 })}>
                      <option value="1">Lần đầu</option>
                      <option value="2">Lần hai</option>
                    </Chon>
                  </O>
                )}
                <O nhan="Ngày nhận đơn"><ONgay aria-label="Ngày nhận đơn" value={d.ngayNhan} onChange={(e) => datDon(d.id, { ngayNhan: e.target.value || d.ngayNhan })} /></O>
                {d.loai === "KHIEU_NAI" && <O nhan="Ngày thụ lý"><ONgay aria-label="Ngày thụ lý" value={d.ngayThuLy ?? ""} onChange={(e) => datDon(d.id, { ngayThuLy: e.target.value || undefined })} /></O>}
                <O nhan="Người, cơ quan giải quyết"><input value={d.coQuan ?? ""} onChange={(e) => datDon(d.id, { coQuan: e.target.value })} /></O>
              </div>
              <div className="luoi luoi-2">
                <O nhan={d.loai === "KHIEU_NAI" ? "Quyết định, hành vi bị khiếu nại" : "Vấn đề kiến nghị"}><input value={d.doiTuong ?? ""} onChange={(e) => datDon(d.id, { doiTuong: e.target.value })} /></O>
                <O nhan="Nội dung chính"><input aria-label="Nội dung đơn" value={d.noiDung} onChange={(e) => datDon(d.id, { noiDung: e.target.value })} /></O>
              </div>
              {d.loai === "KHIEU_NAI" ? (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "4px 0 8px" }} className="chu-nho">
                  <label><input type="checkbox" checked={!!d.phucTap} onChange={(e) => datDon(d.id, { phucTap: e.target.checked })} /> Vụ việc phức tạp (người giải quyết xác định)</label>
                  <label><input type="checkbox" checked={!!d.vungKhoKhan} onChange={(e) => datDon(d.id, { vungKhoKhan: e.target.checked })} /> Vùng sâu, vùng xa đi lại khó khăn</label>
                </div>
              ) : null}
              {d.loai === "KHIEU_NAI" && <ThuTucDon d={d} dat={(p) => datDon(d.id, p)} soanMau={soanMau} />}
              {d.loai !== "KHIEU_NAI" && (
                <div className="luoi luoi-2">
                  <O nhan="Thời hạn trả lời (ngày)" goiY="Kiến nghị, phản ánh không thuộc Luật Khiếu nại — nhập số ngày kèm căn cứ (quy chế, văn bản chỉ đạo); trống thì không tính hạn">
                    <input type="number" min={1} aria-label="Thời hạn trả lời" value={d.hanNhap?.soNgay ?? ""} onChange={(e) => datDon(d.id, { hanNhap: { soNgay: Number(e.target.value) || 0, canCu: d.hanNhap?.canCu ?? "" } })} />
                  </O>
                  <O nhan="Căn cứ thời hạn"><input aria-label="Căn cứ thời hạn" value={d.hanNhap?.canCu ?? ""} onChange={(e) => datDon(d.id, { hanNhap: { soNgay: d.hanNhap?.soNgay ?? 0, canCu: e.target.value } })} /></O>
                </div>
              )}
              <div className="luoi luoi-4">
                <O nhan="Số văn bản giải quyết / trả lời"><input value={d.soVb ?? ""} onChange={(e) => datDon(d.id, { soVb: e.target.value })} /></O>
                <O nhan="Ngày văn bản"><ONgay value={d.ngayVb ?? ""} onChange={(e) => datDon(d.id, { ngayVb: e.target.value || undefined })} /></O>
                <O nhan="Kết quả">
                  <Chon aria-label="Kết quả giải quyết" value={d.ketQua ?? ""} onChange={(e) => datDon(d.id, { ketQua: (e.target.value || undefined) as KetQuaDon | undefined })}>
                    <option value="">— Đang giải quyết —</option>
                    {(Object.keys(TEN_KET_QUA_DON) as KetQuaDon[]).filter((k) => (d.loai === "KHIEU_NAI" ? k !== "TRA_LOI" : !["DINH_CHI", "KHONG_THU_LY"].includes(k))).map((k) => <option key={k} value={k}>{TEN_KET_QUA_DON[k]}</option>)}
                  </Chon>
                </O>
                <O nhan="Ghi chú"><input value={d.ghiChu ?? ""} onChange={(e) => datDon(d.id, { ghiChu: e.target.value })} /></O>
              </div>
              {d.loai === "KHIEU_NAI" && <KetThucDon d={d} dat={(p) => datDon(d.id, p)} homNay={homNay} />}
            </div>
          );
        })}
      </div>

      <div className="the" data-cuong-che>
        <div className="the-dau">
          <h3>Cưỡng chế</h3>
          <span className="mo chu-nho">Điều 88 (kiểm đếm bắt buộc), Điều 89 (thu hồi đất), điểm b khoản 7 Điều 87 Luật Đất đai 2024 — phần mềm đối chiếu điều kiện, thời hạn theo ngày đã ghi</span>
        </div>
        <div className="the-than" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="nut nut-nho" onClick={() => themCc("KIEM_DEM")}>+ Cưỡng chế kiểm đếm bắt buộc</button>
          <button className="nut nut-nho" onClick={() => themCc("THU_HOI")}>+ Cưỡng chế thu hồi đất</button>
        </div>
        {dsCc.length === 0 && <div className="the-than trong">Hộ không có hồ sơ cưỡng chế.</div>}
        {dsCc.map((c) => {
          const kiem = kiemCuongChe(c, h, homNay, lich);
          const han = hanThiHanh(c, lich);
          const hbg = hanBanGiaoSauChapHanh(c, lich);
          return (
            <div key={c.id} className="the-than" style={{ borderTop: "1px solid var(--vien)" }} data-cc={c.loai}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <b>{TEN_LOAI_CC[c.loai]}</b> <span className="chu-nho mo">({DIEU_CC[c.loai]} LĐĐ 2024)</span>
                {c.ketQua && <span className="nhan nhan-xam">{c.ketQua === "CHAP_HANH" ? "Đã chấp hành" : "Đã thực hiện cưỡng chế"}</span>}
                <span style={{ flex: 1 }} />
                {soanMau && c.loai === "THU_HOI" && (
                  <>
                    <button className="nut nut-nho" title="Điểm a, b khoản 7 Điều 87" onClick={() => soanMau("T15")}>Biên bản vận động (T15)</button>
                    <button className="nut nut-nho" title="Điểm a khoản 4 Điều 89" onClick={() => soanMau("T16")}>QĐ thành lập Ban (T16)</button>
                    <button className="nut nut-nho" title="Điểm b khoản 5, khoản 6 Điều 89" onClick={() => soanMau("T17")}>Phương án, dự toán (T17)</button>
                  </>
                )}
                <button className="nut nut-nho nut-nguy" onClick={() => xoa("hồ sơ cưỡng chế", dsCc, c.id, (m) => ({ ...h, cuongChe: m }))}>Xóa</button>
              </div>
              <div className="luoi luoi-4">
                <O nhan="Vận động từ ngày"><ONgay aria-label="Vận động từ ngày" value={c.vanDongTu ?? ""} onChange={(e) => datCc(c.id, { vanDongTu: e.target.value || undefined })} /></O>
                <O nhan="đến ngày" goiY={c.loai === "THU_HOI" && c.vanDongDen ? `QĐ cưỡng chế sớm nhất ${ngayVN(ngaySomNhatQdThuHoi(c.vanDongDen, lich))}` : undefined}><ONgay aria-label="Vận động đến ngày" value={c.vanDongDen ?? ""} onChange={(e) => datCc(c.id, { vanDongDen: e.target.value || undefined })} /></O>
                <O nhan="Văn bản vận động, thuyết phục"><input aria-label="Văn bản vận động" value={c.vbVanDong ?? ""} placeholder="Biên bản số…, ngày…" onChange={(e) => datCc(c.id, { vbVanDong: e.target.value })} /></O>
                {c.loai === "THU_HOI" && <O nhan="QĐ thành lập Ban cưỡng chế"><input aria-label="QĐ thành lập Ban cưỡng chế" value={c.qdBan ?? ""} onChange={(e) => datCc(c.id, { qdBan: e.target.value })} /></O>}
              </div>
              <div className="luoi luoi-4">
                <O nhan="Số QĐ cưỡng chế"><input aria-label="Số QĐ cưỡng chế" value={c.soQd ?? ""} onChange={(e) => datCc(c.id, { soQd: e.target.value })} /></O>
                <O nhan="Ngày QĐ"><ONgay aria-label="Ngày QĐ cưỡng chế" value={c.ngayQd ?? ""} onChange={(e) => datCc(c.id, { ngayQd: e.target.value || undefined })} /></O>
                <O nhan="Ngày có hiệu lực"><ONgay aria-label="Ngày QĐ có hiệu lực" value={c.ngayHieuLuc ?? ""} onChange={(e) => datCc(c.id, { ngayHieuLuc: e.target.value || undefined })} /></O>
                <O nhan="Ngày niêm yết công khai"><ONgay aria-label="Ngày niêm yết QĐ cưỡng chế" value={c.ngayNiemYet ?? ""} onChange={(e) => datCc(c.id, { ngayNiemYet: e.target.value || undefined })} /></O>
              </div>
              <div className="luoi luoi-4">
                <O nhan="Ngày nhận QĐ / lập biên bản" goiY={han ? `Hạn thi hành ${ngayVN(han)}` : undefined}><ONgay aria-label="Ngày nhận QĐ" value={c.ngayNhanQd ?? ""} onChange={(e) => datCc(c.id, { ngayNhanQd: e.target.value || undefined })} /></O>
                {c.loai === "THU_HOI" && <O nhan="QĐ quy định thời gian thi hành (ngày)" goiY="Trống = 10 ngày (k3 Đ89)"><input type="number" min={10} value={c.hanThiHanhNgay ?? ""} onChange={(e) => datCc(c.id, { hanThiHanhNgay: Number(e.target.value) || undefined })} /></O>}
                <O nhan="Ngày dự kiến cưỡng chế"><ONgay aria-label="Ngày dự kiến cưỡng chế" value={c.ngayDuKien ?? ""} onChange={(e) => datCc(c.id, { ngayDuKien: e.target.value || undefined })} /></O>
                <O nhan="Kết quả">
                  <Chon aria-label="Kết quả cưỡng chế" value={c.ketQua ?? ""} onChange={(e) => datCc(c.id, { ketQua: (e.target.value || undefined) as CuongChe["ketQua"] })}>
                    <option value="">— Chưa thực hiện —</option>
                    <option value="CHAP_HANH">Người bị cưỡng chế chấp hành (lập biên bản)</option>
                    <option value="DA_CUONG_CHE">Đã tổ chức thực hiện cưỡng chế</option>
                  </Chon>
                </O>
              </div>
              <div className="luoi luoi-4">
                <O nhan="Ngày biên bản / thực hiện" goiY={hbg ? `Bàn giao đất chậm nhất ${ngayVN(hbg)} (điểm b k4 Đ89)` : undefined}><ONgay aria-label="Ngày kết quả cưỡng chế" value={c.ngayKetQua ?? ""} onChange={(e) => datCc(c.id, { ngayKetQua: e.target.value || undefined })} /></O>
                <O nhan="Ghi chú" style={{ gridColumn: "span 3" }}><input value={c.ghiChu ?? ""} onChange={(e) => datCc(c.id, { ghiChu: e.target.value })} /></O>
              </div>
              <div className="chu-nho" style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "4px 0 8px" }}>
                <label><input type="checkbox" checked={!!c.bienBanKhongNhan} onChange={(e) => datCc(c.id, { bienBanKhongNhan: e.target.checked })} /> Vắng mặt / từ chối nhận — UBND cấp xã đã lập biên bản</label>
                {c.loai === "KIEM_DEM" && <label><input type="checkbox" checked={!!c.truyenThanh} onChange={(e) => datCc(c.id, { truyenThanh: e.target.checked })} /> Đã thông báo trên hệ thống truyền thanh cấp xã</label>}
              </div>
              {kiem.length > 0 && (
                <div data-kiem-cc>
                  {kiem.map((k, i) => <div key={i} className={`thong-bao ${LOP_MUC[k.muc]} mt-8 chu-nho`}>{k.noiDung} <span className="mo">— {k.canCu}</span></div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 1.0.21 (A1): thông báo thụ lý / không thụ lý (Mẫu 03, 04 NĐ 155/2026), tạm đình chỉ — tiếp tục (k1, k4 Điều 11a Luật Khiếu nại;
 * Mẫu 14a, 14b; Điều 28b NĐ 124/2020 bổ sung bởi NĐ 155), vắng đối thoại (k6 Điều 30; k5 Điều 28 NĐ 124 sửa bởi NĐ 155).
 */
function ThuTucDon({ d, dat, soanMau }: { d: DonKhieuNai; dat: (p: Partial<DonKhieuNai>) => void; soanMau?: (ma: string) => void }) {
  const { lich } = useUngDung();
  const tdc = d.tamDinhChi ?? [];
  const cb = canhBaoThuTucDon(d, homNayIso(), lich);
  const datDt = (p: Partial<NonNullable<DonKhieuNai["doiThoai"]>>) => {
    const moi = { ngay: d.doiThoai?.ngay ?? "", ...d.doiThoai, ...p };
    dat({ doiThoai: moi.ngay || moi.ngayTb || moi.diaDiem ? moi : undefined });
  };
  const datTdc = (id: string, p: Partial<TamDinhChi>) => dat({ tamDinhChi: tdc.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  return (
    <div className="khung-phu" data-thu-tuc-don style={{ border: "1px dashed var(--vien)", borderRadius: 6, padding: "6px 10px", margin: "4px 0 8px" }}>
      <div className="luoi luoi-4">
        <O nhan="Số thông báo thụ lý"><input aria-label="Số thông báo thụ lý" value={d.tbThuLy?.so ?? ""} onChange={(e) => dat({ tbThuLy: { so: e.target.value, ngay: d.tbThuLy?.ngay ?? "" } })} /></O>
        <O nhan="Ngày thông báo thụ lý"><ONgay value={d.tbThuLy?.ngay ?? ""} onChange={(e) => dat({ tbThuLy: { so: d.tbThuLy?.so ?? "", ngay: e.target.value } })} /></O>
        <O nhan="Người khiếu nại vắng đối thoại (ngày)" goiY="Không có lý do chính đáng thì vẫn tiếp tục giải quyết (k6 Điều 30 Luật Khiếu nại; k5 Điều 28 NĐ 124/2020 sửa bởi NĐ 155/2026)">
          <ONgay aria-label="Ngày vắng đối thoại" value={d.vangDoiThoai?.ngay ?? ""} onChange={(e) => dat({ vangDoiThoai: e.target.value ? { ngay: e.target.value, coLyDo: d.vangDoiThoai?.coLyDo ?? false } : undefined })} />
        </O>
        {d.vangDoiThoai && <O nhan="Lý do vắng"><label className="chu-nho"><input type="checkbox" checked={d.vangDoiThoai.coLyDo} onChange={(e) => dat({ vangDoiThoai: { ...d.vangDoiThoai!, coLyDo: e.target.checked } })} /> Có lý do chính đáng (bất khả kháng, trở ngại khách quan — Điều 28a NĐ 124)</label></O>}
      </div>
      <div className="luoi luoi-4">
        <O nhan="Ngày tổ chức đối thoại"><ONgay aria-label="Ngày tổ chức đối thoại" value={d.doiThoai?.ngay ?? ""} onChange={(e) => datDt({ ngay: e.target.value })} /></O>
        <O nhan="Ngày gửi thông báo đối thoại" goiY="Trước ngày đối thoại ít nhất 05 ngày (k1 Điều 28 NĐ 124/2020 sửa bởi NĐ 155/2026)"><ONgay aria-label="Ngày gửi thông báo đối thoại" value={d.doiThoai?.ngayTb ?? ""} onChange={(e) => datDt({ ngayTb: e.target.value || undefined })} /></O>
        <O nhan="Địa điểm đối thoại"><input aria-label="Địa điểm đối thoại" value={d.doiThoai?.diaDiem ?? ""} onChange={(e) => datDt({ diaDiem: e.target.value || undefined })} /></O>
      </div>
      {d.vangDoiThoai && !d.vangDoiThoai.coLyDo && <div className="chu-nho mo">Vắng không có lý do chính đáng → người giải quyết vẫn tiếp tục giải quyết khiếu nại; biên bản ghi rõ vắng không có lý do (Mẫu 14).</div>}
      {tdc.map((x) => (
        <div key={x.id} className="luoi luoi-4" data-tam-dinh-chi>
          <O nhan="Ngày QĐ tạm đình chỉ"><ONgay aria-label="Ngày QĐ tạm đình chỉ" value={x.tu} onChange={(e) => datTdc(x.id, { tu: e.target.value || x.tu })} /></O>
          <O nhan="Trường hợp">
            <Chon value={x.truongHop} onChange={(e) => datTdc(x.id, { truongHop: e.target.value as TamDinhChi["truongHop"] })}>
              {(Object.keys(TEN_TDC) as TamDinhChi["truongHop"][]).map((k) => <option key={k} value={k}>{TEN_TDC[k]}</option>)}
            </Chon>
          </O>
          <O nhan="Lý do, tài liệu chứng minh" goiY="Phải có căn cứ, tài liệu chứng minh, thể hiện trong hồ sơ (k4 Điều 28a NĐ 124)"><input aria-label="Lý do tạm đình chỉ" value={x.lyDo} onChange={(e) => datTdc(x.id, { lyDo: e.target.value })} /></O>
          <O nhan="Số QĐ tạm đình chỉ"><input value={x.soQd ?? ""} onChange={(e) => datTdc(x.id, { soQd: e.target.value })} /></O>
          <O nhan="Ngày QĐ tiếp tục giải quyết" goiY="Thời hạn tiếp tục tính từ ngày này (k2 Điều 28b NĐ 124); trống = đang tạm đình chỉ"><ONgay aria-label="Ngày QĐ tiếp tục giải quyết" value={x.den ?? ""} onChange={(e) => datTdc(x.id, { den: e.target.value || undefined })} /></O>
          <O nhan="Số QĐ tiếp tục"><input value={x.soQdTiepTuc ?? ""} onChange={(e) => datTdc(x.id, { soQdTiepTuc: e.target.value })} /></O>
          <O nhan="Ngày gửi QĐ tạm đình chỉ" goiY="03 ngày làm việc kể từ ngày ban hành (k1 Điều 28b NĐ 124)"><ONgay aria-label="Ngày gửi QĐ tạm đình chỉ" value={x.ngayGui ?? ""} onChange={(e) => datTdc(x.id, { ngayGui: e.target.value || undefined })} /></O>
          {x.den && <O nhan="Ngày gửi QĐ tiếp tục" goiY="03 ngày làm việc kể từ ngày ban hành (k2 Điều 28b NĐ 124)"><ONgay aria-label="Ngày gửi QĐ tiếp tục" value={x.ngayGuiTiepTuc ?? ""} onChange={(e) => datTdc(x.id, { ngayGuiTiepTuc: e.target.value || undefined })} /></O>}
          <O nhan=" "><button className="nut nut-nho nut-nguy" onClick={() => dat({ tamDinhChi: tdc.filter((y) => y.id !== x.id) })}>Xóa tạm đình chỉ</button></O>
        </div>
      ))}
      <div className="nhom-nut" style={{ marginTop: 4, flexWrap: "wrap" }}>
        <button className="nut nut-nho" disabled={!d.ngayThuLy || tdc.some((x) => !x.den)} title={!d.ngayThuLy ? "Ghi ngày thụ lý trước" : undefined} onClick={() => dat({ tamDinhChi: [...tdc, { id: taoId(), tu: homNayIso(), truongHop: "a", lyDo: "" }] })}>+ Tạm đình chỉ</button>
        {soanMau && (
          <>
            <button className="nut nut-nho" onClick={() => soanMau("T18")}>TB thụ lý (T18)</button>
            <button className="nut nut-nho" onClick={() => soanMau("T19")}>TB không thụ lý (T19)</button>
            <button className="nut nut-nho" onClick={() => soanMau("T20")}>BB đối thoại (T20)</button>
            <button className="nut nut-nho" onClick={() => soanMau("T21")}>QĐ tạm đình chỉ / đình chỉ (T21)</button>
            <button className="nut nut-nho" onClick={() => soanMau("T22")}>QĐ tiếp tục giải quyết (T22)</button>
            <button className="nut nut-nho" onClick={() => soanMau("T24")}>TB tổ chức đối thoại (T24)</button>
            {(d.lan ?? 1) === 2 && <button className="nut nut-nho" onClick={() => soanMau("T25")}>QĐ giải quyết lần hai (T25)</button>}
          </>
        )}
      </div>
      {cb.length > 0 && (
        <ul className="chu-nho" data-canh-bao-thu-tuc style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          {cb.map((c, i) => <li key={i} className={c.muc === "CAO" ? "chu-do" : undefined} title={c.canCu}>{c.noiDung}</li>)}
        </ul>
      )}
    </div>
  );
}

/** 1.0.21 (A1, A3): lý do không thụ lý, trường hợp đình chỉ; ngày gửi QĐ giải quyết (điểm a k2 Điều 29 NĐ 124/2020). */
function KetThucDon({ d, dat, homNay }: { d: DonKhieuNai; dat: (p: Partial<DonKhieuNai>) => void; homNay: string }) {
  const { lich } = useUngDung();
  const g = hanGuiQd(d, homNay, lich);
  return (
    <div className="luoi luoi-4">
      {d.ketQua === "KHONG_THU_LY" && <O nhan="Lý do không thụ lý" goiY="Các trường hợp tại Điều 11 Luật Khiếu nại (Mẫu 04)"><input aria-label="Lý do không thụ lý" value={d.lyDoKhongThuLy ?? ""} onChange={(e) => dat({ lyDoKhongThuLy: e.target.value })} /></O>}
      {d.ketQua === "DINH_CHI" && (
        <O nhan="Trường hợp đình chỉ (k2 Điều 11a)">
          <Chon aria-label="Trường hợp đình chỉ" value={d.dinhChi?.truongHop ?? ""} onChange={(e) => dat({ dinhChi: e.target.value ? { ...d.dinhChi, truongHop: e.target.value as "a" } : undefined })}>
            <option value="">— Chọn —</option>
            {(Object.keys(TEN_DINH_CHI) as ("a" | "b" | "c" | "d")[]).map((k) => <option key={k} value={k}>{TEN_DINH_CHI[k]}</option>)}
          </Chon>
        </O>
      )}
      {d.ketQua === "DINH_CHI" && d.dinhChi && <O nhan="Ngày QĐ đình chỉ"><ONgay aria-label="Ngày QĐ đình chỉ" value={d.dinhChi.ngay ?? ""} onChange={(e) => dat({ dinhChi: { ...d.dinhChi!, ngay: e.target.value || undefined } })} /></O>}
      {d.ketQua === "DINH_CHI" && <O nhan="Ngày gửi QĐ đình chỉ" goiY="03 ngày làm việc kể từ ngày ban hành (k1 Điều 28b NĐ 124)"><ONgay aria-label="Ngày gửi QĐ đình chỉ" value={d.ngayGuiDinhChi ?? ""} onChange={(e) => dat({ ngayGuiDinhChi: e.target.value || undefined })} /></O>}
      {d.ketQua && ["DUNG", "DUNG_MOT_PHAN", "SAI"].includes(d.ketQua) && (
        <O nhan="Ngày gửi QĐ cho người khiếu nại" goiY={`Lần đầu 03, lần hai 07 ngày làm việc kể từ ngày ban hành (điểm a k2 Điều 29 NĐ 124/2020)${g ? ` — hạn ${ngayVN(g.han)}${g.quaHan ? " (đã quá)" : ""}` : ""}`}>
          <ONgay aria-label="Ngày gửi QĐ giải quyết" value={d.ngayGuiQd ?? ""} onChange={(e) => dat({ ngayGuiQd: e.target.value || undefined })} />
        </O>
      )}
    </div>
  );
}

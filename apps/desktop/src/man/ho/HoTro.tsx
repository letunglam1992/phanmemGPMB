import { useUngDung } from "../../ung-dung";
import { tienBoiThuongDatO, tienSddTdc, type KetQuaHo } from "../../tinh-ho";
import { dienTichSuatToiThieu } from "@gpmb/core";
import { TEN_HINH_THUC_TDC, type HinhThucTdc, type TaiDinhCuHo, taoId, type DuAn, type Ho } from "../../mo-hinh";
import { O, tien } from "../../thanh-phan/chung";
import { BieuTuong } from "../../thanh-phan/BieuDo";
import type { DiChuyen } from "@gpmb/core";
import { Chon } from "../../thanh-phan/Chon";
import { OSo } from "../../thanh-phan/OSo";
import type { Tab } from "./kieu";

export function TabHoTro({ h, doi, duAn, kq }: Tab & { duAn: DuAn; kq: KetQuaHo }) {
  const ht = h.hoTro;
  const dat = (p: Partial<Ho["hoTro"]>) => doi({ ...h, hoTro: { ...ht, ...p } });
  return (
    <div className="luoi luoi-2">
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ ổn định đời sống</h3><div className="phai"><label><input type="checkbox" checked={!!ht.onDinh} onChange={(e) => dat({ onDinh: e.target.checked ? { dienTichNNDangSuDung: "", diChuyen: "KHONG_DI_CHUYEN" } : undefined })} /> Áp dụng</label></div></div>
        {ht.onDinh && (
          <div className="the-than luoi luoi-2">
            <O nhan="DT đất NN đang sử dụng (m²)" goiY="Tỷ lệ thu hồi = DT đất NN thu hồi / DT đang sử dụng"><OSo className="o-so" value={ht.onDinh.dienTichNNDangSuDung} onChange={(v) => dat({ onDinh: { ...ht.onDinh!, dienTichNNDangSuDung: v } })} /></O>
            <O nhan="Di chuyển chỗ ở">
              <Chon value={ht.onDinh.diChuyen} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, diChuyen: e.target.value as DiChuyen } })}>
                <option value="KHONG_DI_CHUYEN">Không phải di chuyển</option>
                <option value="DI_CHUYEN">Phải di chuyển chỗ ở</option>
                <option value="DEN_VUNG_KHO_KHAN">Di chuyển đến vùng KT-XH khó khăn, ĐBKK</option>
              </Chon>
            </O>
            <O nhan="Chọn nhóm khi tỷ lệ đúng ngưỡng 30% (QD-16)" goiY="Để trống = mặc định theo NĐ 88">
              <Chon value={ht.onDinh.chonNhom?.ma ?? ""} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, chonNhom: e.target.value ? { ma: e.target.value, lyDo: ht.onDinh!.chonNhom?.lyDo ?? "" } : undefined } })}>
                <option value="">Mặc định</option>
                <option value="20_30">Từ 20% đến 30% (Đ6 k9 QĐ 14/2026)</option>
                <option value="30_70">Từ 30% đến 70% (NĐ 88)</option>
              </Chon>
            </O>
            <O nhan="Số nhân khẩu được hỗ trợ" goiY="Người có chung quyền sử dụng đất tại thời điểm phê duyệt phương án + thành viên phát sinh sau khi giao đất NN; hộ tự thỏa thuận (điểm d k1 Đ19 NĐ 88, bổ sung bởi NĐ 226/2025; điểm b k1 Điều 12 PL II QĐ 106)">
              <input inputMode="numeric" aria-label="Số nhân khẩu ổn định đời sống" value={ht.onDinh.nhanKhau ?? ""} placeholder={`Trống = ${h.nhanKhau.length} (nhân khẩu trong hồ sơ)`} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, nhanKhau: e.target.value.replace(/\D/g, "") || undefined } })} />
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
      <TheTaiDinhCu h={h} doi={doi} duAn={duAn} kq={kq} />
      <div className="the">
        <div className="the-dau"><h3>Mồ mả, khấu trừ</h3></div>
        <div className="the-than luoi luoi-3">
          <O nhan="Số mộ xây"><input type="number" min={0} value={ht.moMa?.xay ?? 0} onChange={(e) => dat({ moMa: { xay: Number(e.target.value), khongXay: ht.moMa?.khongXay ?? 0 } })} /></O>
          <O nhan="Số mộ không xây"><input type="number" min={0} value={ht.moMa?.khongXay ?? 0} onChange={(e) => dat({ moMa: { xay: ht.moMa?.xay ?? 0, khongXay: Number(e.target.value) } })} /></O>
          <O nhan="Khấu trừ nghĩa vụ tài chính (đ)"><OSo className="o-so" value={h.khauTru} onChange={(v) => doi({ ...h, khauTru: v })} /></O>
        </div>
      </div>
    </div>
  );
}

/**
 * Hỗ trợ tái định cư: hình thức bố trí (Đ111 LĐĐ 2024; Đ23, Đ24 NĐ 88/2024), các khoản có sẵn trong bộ chính sách
 * (C08 tự lo chỗ ở – Đ10 PL II QĐ 106; C10 suất tối thiểu – Đ16 PL II; C11 20% tiền SDĐ – k11 Đ6 QĐ 14/2026) và khoản
 * khác cán bộ nhập kèm căn cứ (k13 Đ6 QĐ 14/2026: UBND xã quyết định cho từng dự án).
 */
export function TheTaiDinhCu({ h, doi, duAn, kq }: Tab & { duAn: DuAn; kq: KetQuaHo }) {
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn);
  const t = h.hoTro.taiDinhCu;
  const dat = (p: Partial<TaiDinhCuHo> | undefined) => doi({ ...h, hoTro: { ...h.hoTro, taiDinhCu: p === undefined ? undefined : { ...(t ?? { hinhThuc: "DAT_O", khoanKhac: [] }), ...p } } });
  const btDatO = tienBoiThuongDatO(h, kq.nhom.find((x) => x.ma === "A.I")?.dong ?? []);
  const sdd = t ? tienSddTdc(t) : null;
  const giaoDat = t?.hinhThuc === "DAT_O" || t?.hinhThuc === "NHA_O";
  const dtSuat = cs.taiDinhCu && giaoDat ? dienTichSuatToiThieu(cs, { xa: duAn.xa, hinhThuc: t!.hinhThuc as "DAT_O" | "NHA_O" }) : null;
  const dongTdc = kq.nhom.find((x) => x.ma === "B.VI")?.dong ?? [];
  const tongTdc = dongTdc.reduce((s, x) => (x.dong.thanhTien && x.dong.trangThai === "TAM_TINH" ? s + x.dong.thanhTien.toNumber() : s), 0);
  const suaKhoan = (id: string, p: Partial<TaiDinhCuHo["khoanKhac"][number]>) => dat({ khoanKhac: t!.khoanKhac.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  return (
    <div className="the ca-hang">
      <div className="the-dau">
        <h3>Hỗ trợ tái định cư</h3>
        <span className="mo chu-nho">Điều 111 Luật Đất đai 2024; Điều 23, 24 NĐ 88/2024; Điều 10, 16 PL II QĐ 106/2025; Điều 6 QĐ 14/2026</span>
        <div className="phai"><label><input type="checkbox" checked={!!t} onChange={(e) => dat(e.target.checked ? {} : undefined)} /> Áp dụng</label></div>
      </div>
      {t && (
        <div className="the-than luoi" style={{ gap: 12 }}>
          {!cs.taiDinhCu && <div className="thong-bao thong-bao-vang mb-0">Bộ chính sách {cs.ma} chưa có quy định hỗ trợ tái định cư — chỉ nhập được khoản khác kèm căn cứ.</div>}
          {t.loId && (
            <div className="thong-bao thong-bao-xanh chu-nho mb-0">
              Lô, căn được giao từ quỹ tái định cư của dự án {(() => { const l = duAn.quyTdc?.lo.find((x) => x.id === t.loId); return l ? <b>{l.khu} – lô {l.soLo}{l.giao ? ` (${l.giao.canCu})` : ""}</b> : <b className="chu-do">(lô không còn trong quỹ)</b>; })()}. Khu, lô, diện tích, giá lấy theo quỹ — đổi lô hoặc thu hồi giao ở thẻ “Tái định cư” của dự án.
            </div>
          )}
          <div className="luoi luoi-3">
            <O nhan="Hình thức bố trí tái định cư" style={{ gridColumn: "span 2" }}>
              <Chon value={t.hinhThuc} onChange={(e) => dat({ hinhThuc: e.target.value as HinhThucTdc })}>
                {Object.entries(TEN_HINH_THUC_TDC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Chon>
            </O>
            <O nhan="Khu, điểm tái định cư"><input readOnly={!!t.loId} value={t.khuTdc ?? ""} placeholder="vd. Khu TĐC bản Mé" onChange={(e) => dat({ khuTdc: e.target.value || undefined })} /></O>
            {giaoDat && (
              <>
                <O nhan={t.hinhThuc === "NHA_O" ? "Căn hộ / vị trí" : "Lô số / vị trí"}><input readOnly={!!t.loId} value={t.viTriLo ?? ""} onChange={(e) => dat({ viTriLo: e.target.value || undefined })} /></O>
                <O nhan={t.hinhThuc === "NHA_O" ? "DT căn hộ được giao (m²)" : "DT lô đất ở được giao (m²)"}><OSo className="o-so" value={t.dienTichGiao ?? ""} onChange={(v) => dat({ dienTichGiao: v || undefined })} /></O>
                <O nhan={t.hinhThuc === "NHA_O" ? "Giá bán nhà ở TĐC (đ/m²)" : "Giá đất ở tại khu TĐC (đ/m²)"} goiY={t.hinhThuc === "NHA_O" ? "Do UBND có thẩm quyền quyết định (k3 Đ111 LĐĐ)" : "Theo bảng giá đất tại thời điểm phê duyệt phương án (k3 Đ111 LĐĐ)"}>
                  <OSo className="o-so" value={t.donGia ?? ""} onChange={(v) => dat({ donGia: v || undefined })} />
                </O>
                <O nhan="Văn bản giá" className="ca-hang"><input value={t.nguonGia ?? ""} placeholder="vd. NQ 152/2025/NQ-HĐND, Bảng 05, xã …, vị trí …" onChange={(e) => dat({ nguonGia: e.target.value || undefined })} /></O>
              </>
            )}
          </div>
          {t.hinhThuc === "TU_LO" && <div className="thong-bao thong-bao-xanh chu-nho mb-0">Hộ đủ điều kiện được hỗ trợ tái định cư (k8 Đ111 LĐĐ) mà tự lo chỗ ở: ngoài bồi thường về đất bằng tiền được hỗ trợ theo địa bàn — phường 100 triệu, 10 xã (Quỳnh Nhai, Thuận Châu, Mường La, Bắc Yên, Phù Yên, Yên Châu, Mai Sơn, Sông Mã, Sốp Cộp, Vân Hồ) 80 triệu, xã còn lại 60 triệu đồng/hộ (Đ10 PL II QĐ 106).</div>}
          {t.hinhThuc === "TAI_CHO" && <div className="thong-bao thong-bao-xanh chu-nho mb-0">Tái định cư tại chỗ bằng chuyển mục đích phần đất nông nghiệp còn lại sang đất ở trong hạn mức, miễn tiền SDĐ bằng diện tích đất ở thu hồi khi người có đất đồng ý phương án bồi thường đất nông nghiệp (k3 Đ24 NĐ 88/2024) — không phát sinh khoản tiền hỗ trợ; hỗ trợ tạm cư nhập ở thẻ Tạm cư.</div>}
          {giaoDat && (
            <div className="luoi luoi-2">
              <label className="o-chon-kem">
                <input type="checkbox" checked={!!t.suatToiThieu} onChange={(e) => dat({ suatToiThieu: e.target.checked || undefined })} />
                <span><b>Hỗ trợ đủ một suất tái định cư tối thiểu</b> (k8 Đ111 LĐĐ): hộ phải di chuyển chỗ ở, tiền bồi thường về đất ở không đủ một suất. Suất tối thiểu {dtSuat ? <b>{dtSuat} m²</b> : "—"} (Đ16 PL II QĐ 106).</span>
              </label>
              {t.hinhThuc === "DAT_O" && (
                <label className="o-chon-kem">
                  <input type="checkbox" checked={!!t.hoTroTienSdd} onChange={(e) => dat({ hoTroTienSdd: e.target.checked || undefined })} />
                  <span><b>Hỗ trợ 20% tiền sử dụng đất phải nộp</b> của thửa đất được giao TĐC (k11 Đ6 QĐ 14/2026{cs.taiDinhCu?.hoTroTienSdd.ngoaiTruK4D111 ? ", sửa đổi bởi Điều 2 QĐ 64/2026" : ""}; VM-28).</span>
                </label>
              )}
              {t.hinhThuc === "DAT_O" && t.hoTroTienSdd && cs.taiDinhCu?.hoTroTienSdd.ngoaiTruK4D111 && (
                <label className="o-chon-kem">
                  <input type="checkbox" checked={!!t.giaoDatK4D111} aria-label="Giao đất theo khoản 4 Điều 111" onChange={(e) => dat({ giaoDatK4D111: e.target.checked || undefined })} />
                  <span><b>Lô giao theo khoản 4 Điều 111 Luật Đất đai</b> (giao đất có thu tiền SDĐ cho hộ nhiều thế hệ, nhiều cặp vợ chồng đủ điều kiện tách hộ, hoặc nhiều hộ chung một thửa đất ở) — <b>không hỗ trợ 20%</b> (Điều 2 QĐ 64/2026).</span>
                </label>
              )}
            </div>
          )}
          {t.hinhThuc === "DAT_O" && t.hoTroTienSdd && (
            <div className="luoi luoi-2">
              <O nhan="Tiền SDĐ phải nộp làm cơ sở 20% (đ)" goiY={`VM-28 — người dùng tự điền${sdd?.tien && !t.tienSddPhaiNop ? `; tham khảo: giá đất khu TĐC × DT lô giao = ${tien(sdd.tien)} đ` : ""}`}><OSo aria-label="Tiền SDĐ phải nộp làm cơ sở 20%" className={`o-so ${t.tienSddPhaiNop ? "" : "loi-nhap"}`} value={t.tienSddPhaiNop ?? ""} onChange={(v) => dat({ tienSddPhaiNop: v || undefined })} style={{ maxWidth: 280 }} /></O>
              <O nhan="Cách xác định, văn bản" goiY="vd. Theo Thông báo nộp tiền SDĐ số …, trước khi ghi nợ / sau khi trừ miễn, giảm"><input aria-label="Cách xác định tiền SDĐ (VM-28)" className={t.canCuTienSdd?.trim() ? "" : "loi-nhap"} value={t.canCuTienSdd ?? ""} onChange={(e) => dat({ canCuTienSdd: e.target.value || undefined })} /></O>
            </div>
          )}
          {giaoDat && (
            <div className="tdc-so">
              <div><span>Tiền bồi thường về đất ở</span><b>{tien(btDatO)} đ</b></div>
              {t.hinhThuc === "DAT_O" && <div><span>Tiền SDĐ phải nộp thửa TĐC</span><b>{sdd?.tien ? `${tien(sdd.tien)} đ` : "—"}</b></div>}
              {t.hinhThuc === "DAT_O" && sdd?.tien && sdd.tien.gt(btDatO) && <div title="Điều 26 NĐ 88/2024 — thông tin, không cộng vào hỗ trợ"><span>Được ghi nợ (nếu có nhu cầu)</span><b>{tien(sdd.tien.minus(btDatO))} đ</b></div>}
              <div><span>Tổng hỗ trợ tái định cư (tạm tính)</span><b>{tongTdc.toLocaleString("vi-VN")} đ</b></div>
            </div>
          )}
          <div>
            <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 6 }}>Khoản hỗ trợ tái định cư khác <span className="mo" style={{ fontWeight: 400 }}>— UBND xã quyết định cho dự án (k13 Đ6 QĐ 14/2026) hoặc chính sách chưa có sẵn; bắt buộc ghi căn cứ</span></div>
            {t.khoanKhac.length > 0 && (
              <table className="bang">
                <thead><tr><th>Nội dung</th><th style={{ width: 170 }}>Số tiền (đ)</th><th style={{ width: 300 }}>Căn cứ (số, ngày văn bản)</th><th style={{ width: 44 }} /></tr></thead>
                <tbody>
                  {t.khoanKhac.map((k) => (
                    <tr key={k.id}>
                      <td><input value={k.noiDung} placeholder="vd. Hỗ trợ san lấp mặt bằng lô TĐC" onChange={(e) => suaKhoan(k.id, { noiDung: e.target.value })} /></td>
                      <td><OSo className="o-so" value={k.soTien} onChange={(v) => suaKhoan(k.id, { soTien: v })} /></td>
                      <td><input className={k.canCu.trim() ? "" : "loi-nhap"} value={k.canCu} placeholder="vd. QĐ 45/QĐ-UBND ngày 10/9/2026 của UBND xã" onChange={(e) => suaKhoan(k.id, { canCu: e.target.value })} /></td>
                      <td><button className="nut nut-chu nut-nguy nut-nho" aria-label="Xóa khoản" onClick={() => dat({ khoanKhac: t.khoanKhac.filter((x) => x.id !== k.id) })}><BieuTuong ten="thungRac" co={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="nut nut-nho mt-6" onClick={() => dat({ khoanKhac: [...t.khoanKhac, { id: taoId(), noiDung: "", soTien: "", canCu: "" }] })}><BieuTuong ten="cong" co={14} /> Thêm khoản</button>
          </div>
          <O nhan="Ghi chú"><textarea rows={2} value={t.ghiChu ?? ""} onChange={(e) => dat({ ghiChu: e.target.value || undefined })} /></O>
        </div>
      )}
    </div>
  );
}

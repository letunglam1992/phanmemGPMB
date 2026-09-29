import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../../ung-dung";
import { TEN_KHOAN_KHAC, type KetQuaHo } from "../../tinh-ho";
import { taoId, type DuAn, type HoTroKhacHo } from "../../mo-hinh";
import { NhanDong, O, tien } from "../../thanh-phan/chung";
import { BieuTuong } from "../../thanh-phan/BieuDo";
import { Chon } from "../../thanh-phan/Chon";
import { OSo } from "../../thanh-phan/OSo";
import type { Tab } from "./kieu";

/** Các khoản của Điều 6 QĐ 14/2026 đã nhập ở thẻ khác — để cán bộ biết không nhập trùng. */
const DA_CO_NOI_KHAC: [string, string][] = [
  ["khoản 3", "Hỗ trợ nhà, công trình (đất sai mục đích, không đủ điều kiện, có biên bản vi phạm) — thẻ Kiểm đếm, chọn \"Hỗ trợ\""],
  ["khoản 9", "Đất nguồn gốc nông, lâm trường — thẻ Thửa đất"],
  ["khoản 11", "Hỗ trợ 20% tiền sử dụng đất thửa tái định cư — thẻ Hỗ trợ, mục Tái định cư"],
  ["khoản 12", "Hỗ trợ tạm cư — thẻ Hỗ trợ (mức theo Điều 3 QĐ 14/2026)"],
  ["khoản 5, 7, 8, 10", "Chưa tính tự động (ổn định sản xuất cần định mức; cây trồng trên đất không đủ điều kiện; chênh lệch giá đất) — nhập ở \"Khoản khác\" bên dưới kèm căn cứ"],
];

/**
 * Thẻ "Hỗ trợ khác" (Điều 6 QĐ 14/2026): k1 đối tượng chính sách (cán bộ chọn mức), k2 hộ nghèo, VM-17 (cán bộ chọn
 * cộng hay chỉ lấy khoản cao hơn), k6 ổn định đời sống khi xây lại nhà (cán bộ tích), k4, k13, k14 và khoản khác nhập tay.
 */
export function TabHoTroKhac({ h, doi, duAn, kq }: Tab & { duAn: DuAn; kq: KetQuaHo }) {
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn).hoTroKhac;
  const k: HoTroKhacHo = h.hoTro.khac ?? { khoan: [] };
  const dat = (p: Partial<HoTroKhacHo>) => {
    const moi = { ...k, ...p };
    const trong = !moi.doiTuongCs?.length && !moi.hoNgheo && !moi.xayLaiNha && !moi.khoan.length && !moi.vm17;
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
            <h3>Hộ có đối tượng chính sách phải di chuyển chỗ ở</h3>
            <span className="mo chu-nho">khoản 1 Điều 6 QĐ 14/2026</span>
            <div className="phai"><button className="nut nut-nho" onClick={() => dat({ doiTuongCs: [...(k.doiTuongCs ?? []), { id: taoId(), ten: "", muc: "", xacNhan: "" }] })}><BieuTuong ten="cong" co={14} /> Thêm đối tượng</button></div>
          </div>
          <div className="the-than luoi">
            <div className="mo chu-nho">Cán bộ chọn mức theo đối tượng và xác nhận của phòng chuyên môn; hộ có nhiều đối tượng chỉ hưởng một mức cao nhất.</div>
            {(k.doiTuongCs ?? []).map((x) => (
              <div key={x.id} className="luoi" style={{ gridTemplateColumns: "1.2fr 170px 1.2fr 36px", gap: 6, alignItems: "end" }}>
                <O nhan="Đối tượng (họ tên, diện chính sách)"><input value={x.ten} onChange={(e) => suaDt(x.id, { ten: e.target.value })} /></O>
                <O nhan="Mức hỗ trợ">
                  <Chon value={x.muc} aria-label="Mức hỗ trợ đối tượng chính sách" className={x.muc ? "" : "loi-nhap"} onChange={(e) => suaDt(x.id, { muc: e.target.value })}>
                    <option value="">— Chọn mức —</option>
                    {(cs?.doiTuongChinhSach.mucs ?? []).map((m) => <option key={m} value={m}>{dinhDang(D(m))} đ</option>)}
                  </Chon>
                </O>
                <O nhan="Xác nhận của phòng chuyên môn *"><input className={x.xacNhan.trim() ? "" : "loi-nhap"} value={x.xacNhan} placeholder="Số, ngày văn bản xác nhận" onChange={(e) => suaDt(x.id, { xacNhan: e.target.value })} /></O>
                <button className="nut nut-chu nut-nguy nut-nho" aria-label="Xóa đối tượng" onClick={() => { const con = k.doiTuongCs!.filter((y) => y.id !== x.id); dat({ doiTuongCs: con.length ? con : undefined }); }}><BieuTuong ten="thungRac" co={15} /></button>
              </div>
            ))}
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
          <h3>Ổn định đời sống khi phá dỡ nhà ở, làm lại nhà nơi khác</h3>
          <span className="mo chu-nho">khoản 6 Điều 6 QĐ 14/2026{cs ? ` · ${cs.xayLaiNha.kgGaoNhanKhauThang} kg gạo × giá gạo × nhân khẩu × ${cs.xayLaiNha.soThang} tháng` : ""}</span>
          <div className="phai"><label><input type="checkbox" checked={!!k.xayLaiNha} onChange={(e) => dat({ xayLaiNha: e.target.checked || undefined })} /> Áp dụng</label></div>
        </div>
        {k.xayLaiNha && h.hoTro.onDinh && <div className="thong-bao thong-bao-vang chu-nho" style={{ margin: "0 12px 10px" }}>Hộ đồng thời có hỗ trợ ổn định đời sống theo Điều 12 Phụ lục II QĐ 106/2025 (thẻ Hỗ trợ) — cần kiểm tra, tránh hỗ trợ trùng. Phần mềm không tự loại khoản nào.</div>}
      </div>

      <div className="the">
        <div className="the-dau">
          <h3>Khoản hỗ trợ khác nhập tay</h3>
          <span className="mo chu-nho">khoản 4, 13, 14 Điều 6 và chính sách chưa có sẵn — bắt buộc căn cứ</span>
          <div className="phai">
            {(["K4", "K13_14", "KHAC"] as const).map((l) => (
              <button key={l} className="nut nut-nho" title={TEN_KHOAN_KHAC[l].goiY} onClick={() => dat({ khoan: [...k.khoan, { id: taoId(), loai: l, noiDung: l === "KHAC" ? "" : TEN_KHOAN_KHAC[l].ten, soTien: "", canCu: "" }] })}>
                <BieuTuong ten="cong" co={14} /> {l === "K4" ? "Công trình ngoài cọc (k4)" : l === "K13_14" ? "UBND xã quyết định (k13, k14)" : "Khoản khác"}
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

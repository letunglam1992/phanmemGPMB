import { useMemo, useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import type Decimal from "decimal.js";
import { useUngDung } from "../ung-dung";
import { O, ngayVN } from "./chung";
import { ONgay } from "./ONgay";
import { OSo } from "./OSo";
import { Chon } from "./Chon";
import { taoId, type DuAn } from "../mo-hinh";
import { homNayIso } from "../trang-thai";
import { moTaQd } from "../phuong-an";
import { CAN_CU_KINH_PHI, CAN_CU_KP_CUONG_CHE, TEN_LOAI_KHOAN_KP, giaiNganHieuLuc, kinhPhiRong, quyetToanChiTra, tinhKinhPhi, type KinhPhiTcth, type LoaiKhoanKp } from "../quyet-toan";
import { xuatExcelQuyetToan } from "../xuat-excel";

const tien = (d: Decimal | null | undefined) => (d ? dinhDang(d, 0) : "—");
const LOP_MUC = { CAO: "thong-bao-do", TRUNG_BINH: "thong-bao-vang", THONG_TIN: "thong-bao-xanh" } as const;
const laSo = (s: string) => /^\d+(\.\d+)?$/.test(s.trim()) && Number(s) > 0;

/** 1.0.20 (B4, B3): thẻ "Chi trả, kinh phí" của dự án — tổng hợp chi trả theo bản đã phê duyệt; kinh phí tổ chức thực hiện. */
export function TheChiTraKinhPhi({ duAn }: { duAn: DuAn }) {
  const { hoCua, tyLeCham, luuDuAn, quyen, nguoiDung, bao } = useUngDung();
  const choSua = quyen("SUA_HO_SO");
  const hos = hoCua(duAn.id);
  const homNay = homNayIso();
  const qt = useMemo(() => quyetToanChiTra(duAn, hos, tyLeCham, homNay), [duAn, hos, tyLeCham, homNay]);
  const [kp, setKp] = useState<KinhPhiTcth>(() => duAn.kinhPhi ?? kinhPhiRong());
  const [daSua, setDaSua] = useState(false);
  const k = tinhKinhPhi({ ...duAn, kinhPhi: kp }, hos, tyLeCham, homNay);
  const dat = (p: Partial<KinhPhiTcth>) => { setKp({ ...kp, ...p }); setDaSua(true); };
  const [moi, setMoi] = useState({ loai: "TO_CHUC" as LoaiKhoanKp, noiDung: "", soTien: "", canCu: "" });
  const [gn, setGn] = useState({ ngay: homNay, soTien: "", noiDung: "", chungTu: "" });
  const [loi, setLoi] = useState("");
  const luu = async () => {
    if (await luuDuAn({ ...duAn, kinhPhi: kp })) {
      setDaSua(false);
      bao("Đã lưu kinh phí tổ chức thực hiện");
    }
  };
  const t = qt.tong;

  return (
    <div className="luoi" data-chi-tra-kinh-phi>
      <div className="the" data-quyet-toan>
        <div className="the-dau">
          <h3>Tổng hợp chi trả theo phương án đã phê duyệt</h3>
          <span className="mo chu-nho">khoản 3, 4 Điều 94 Luật Đất đai 2024 — để đối chiếu, quyết toán</span>
          <span style={{ flex: 1 }} />
          <button className="nut nut-nho" disabled={!qt.dong.length && !(duAn.kinhPhi?.khoan.length)} onClick={() => void xuatExcelQuyetToan({ ...duAn, kinhPhi: kp }, hos, tyLeCham, homNay)}>Xuất Excel quyết toán</button>
        </div>
        <div className="luoi luoi-4 the-than">
          <div><div className="mo chu-nho">Phải trả ({t.soHo} hộ)</div><div className="so-mau" style={{ fontSize: 20 }}>{tien(t.phaiTra)} đ</div></div>
          <div><div className="mo chu-nho">Đã chi (gồm gửi ngân hàng)</div><div className="so-mau" style={{ fontSize: 20 }}>{tien(t.daChi)} đ</div></div>
          <div><div className="mo chu-nho">Còn phải chi ({t.soHoChuaChiDu} hộ)</div><div className="so-mau" style={{ fontSize: 20, color: t.conPhaiChi.gt(0) ? "var(--do)" : undefined }}>{tien(t.conPhaiChi)} đ</div></div>
          <div><div className="mo chu-nho">Tiền chậm trả tạm tính ({t.soHoCham} hộ)</div><div className="so-mau" style={{ fontSize: 20 }}>{t.tienChamTra ? `${tien(t.tienChamTra)} đ` : "Thiếu căn cứ"}</div></div>
        </div>
        <div className="bang-cuon">
          <table className="bang">
            <thead><tr><th>Bản phương án / QĐ phê duyệt</th><th className="so">Số hộ</th><th className="so">Phải trả</th><th className="so">Tiền mặt</th><th className="so">Chuyển khoản</th><th className="so">Gửi NH chưa trả</th><th className="so">Gửi NH đã trả</th><th className="so">Đã chi</th><th className="so">Còn phải chi</th><th className="so">Chi vượt</th></tr></thead>
            <tbody>
              {qt.dong.map((d) => (
                <tr key={d.ban.id}>
                  <td>Bản {d.ban.so}{d.ban.dotTen ? ` (${d.ban.dotTen})` : ""} <span className="chu-nho mo">{moTaQd(d.ban.pheDuyet)}</span></td>
                  <td className="so">{d.soHo}</td><td className="so">{tien(d.phaiTra)}</td><td className="so">{tien(d.tienMat)}</td><td className="so">{tien(d.chuyenKhoan)}</td><td className="so">{tien(d.guiNHChuaTra)}</td><td className="so">{tien(d.guiNHDaTra)}</td><td className="so">{tien(d.daChi)}</td>
                  <td className="so" style={{ color: d.conPhaiChi.gt(0) ? "var(--do)" : undefined }}>{tien(d.conPhaiChi)}</td><td className="so">{d.chiVuot.gt(0) ? <span className="nhan nhan-do">{tien(d.chiVuot)}</span> : "0"}</td>
                </tr>
              ))}
              {qt.dong.length === 0 && <tr><td colSpan={10} className="trong">Chưa có bản phương án nào được ghi nhận phê duyệt.</td></tr>}
              {qt.dong.length > 1 && (
                <tr style={{ fontWeight: 600 }}><td>Tổng cộng</td><td className="so">{t.soHo}</td><td className="so">{tien(t.phaiTra)}</td><td className="so">{tien(t.tienMat)}</td><td className="so">{tien(t.chuyenKhoan)}</td><td className="so">{tien(t.guiNHChuaTra)}</td><td className="so">{tien(t.guiNHDaTra)}</td><td className="so">{tien(t.daChi)}</td><td className="so">{tien(t.conPhaiChi)}</td><td className="so">{tien(t.chiVuot)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {qt.hoChuaDuyetCoChi > 0 && <div className="thong-bao thong-bao-vang" style={{ margin: 12 }}>{qt.hoChuaDuyetCoChi} hộ đã ghi chi trả nhưng chưa có trong bản phương án đã phê duyệt — không tính vào bảng trên.</div>}
      </div>

      <div className="the" data-kinh-phi>
        <div className="the-dau">
          <h3>Kinh phí tổ chức thực hiện bồi thường, hỗ trợ, tái định cư</h3>
          <span className="mo chu-nho">{CAN_CU_KINH_PHI}; kinh phí cưỡng chế: {CAN_CU_KP_CUONG_CHE} — đơn vị bồi thường lập dự toán, cơ quan phê duyệt phương án quyết định; bố trí vào vốn đầu tư dự án / ứng từ Quỹ phát triển đất / trừ vào tiền SDĐ, tiền thuê đất khi nhà đầu tư ứng trước (điểm a, b, c k3 Điều 27 NĐ 88). Tỷ lệ, cơ sở tính, nội dung chi do đơn vị nhập kèm căn cứ</span>
        </div>
        <fieldset className="khung-quyen" disabled={!choSua}>
          <div className="the-than luoi luoi-4">
            <O nhan="Tỷ lệ trích (%)" goiY="Trống = không tính mức tối đa"><OSo aria-label="Tỷ lệ trích" value={kp.tyLe ?? ""} onChange={(v) => dat({ tyLe: v || undefined })} /></O>
            <O nhan="Căn cứ tỷ lệ" style={{ gridColumn: "span 2" }} goiY="Văn bản quy định mức trích (thiếu căn cứ thì không tính)"><input aria-label="Căn cứ tỷ lệ" value={kp.canCuTyLe ?? ""} onChange={(e) => dat({ canCuTyLe: e.target.value })} /></O>
            <O nhan="Cơ sở tính (đ)" goiY={`Trống = tổng phải trả theo bản đã phê duyệt (${tien(t.phaiTra)} đ)`}><OSo aria-label="Cơ sở tính" value={kp.coSo ?? ""} onChange={(v) => dat({ coSo: v || undefined })} /></O>
            <O nhan="Số QĐ phê duyệt dự toán"><input aria-label="Số QĐ dự toán" value={kp.qdDuToan?.so ?? ""} onChange={(e) => dat({ qdDuToan: { so: e.target.value, ngay: kp.qdDuToan?.ngay ?? "", coQuan: kp.qdDuToan?.coQuan } })} /></O>
            <O nhan="Ngày QĐ"><ONgay value={kp.qdDuToan?.ngay ?? ""} onChange={(e) => dat({ qdDuToan: { so: kp.qdDuToan?.so ?? "", ngay: e.target.value, coQuan: kp.qdDuToan?.coQuan } })} /></O>
            <O nhan="Cơ quan phê duyệt" style={{ gridColumn: "span 2" }}><input value={kp.qdDuToan?.coQuan ?? ""} onChange={(e) => dat({ qdDuToan: { so: kp.qdDuToan?.so ?? "", ngay: kp.qdDuToan?.ngay ?? "", coQuan: e.target.value } })} /></O>
          </div>
          <div className="luoi luoi-4 the-than">
            <div><div className="mo chu-nho">Mức tối đa theo tỷ lệ</div><div className="so-mau" data-muc-toi-da style={{ fontSize: 18 }}>{k.mucToiDa ? `${tien(k.mucToiDa)} đ` : <span className="nhan nhan-xam">Thiếu căn cứ</span>}</div></div>
            <div><div className="mo chu-nho">Tổng dự toán</div><div className="so-mau" data-tong-du-toan style={{ fontSize: 18 }}>{tien(k.duToan)} đ</div></div>
            <div><div className="mo chu-nho">Đã giải ngân</div><div className="so-mau" style={{ fontSize: 18 }}>{tien(k.daGiaiNgan)} đ</div></div>
            <div><div className="mo chu-nho">Còn lại</div><div className="so-mau" style={{ fontSize: 18, color: k.conLai.lt(0) ? "var(--do)" : undefined }}>{tien(k.conLai)} đ</div></div>
          </div>
          <table className="bang">
            <thead><tr><th>Loại</th><th>Khoản dự toán</th><th className="so">Số tiền (đ)</th><th>Căn cứ</th><th /></tr></thead>
            <tbody>
              {kp.khoan.map((x) => (
                <tr key={x.id}><td className="chu-nho">{TEN_LOAI_KHOAN_KP[x.loai]}</td><td>{x.noiDung}</td><td className="so">{dinhDang(D(x.soTien || "0"), 0)}</td><td className="chu-nho">{x.canCu}</td>
                  <td><button className="nut nut-nho nut-nguy" onClick={() => dat({ khoan: kp.khoan.filter((y) => y.id !== x.id) })}>Xóa</button></td></tr>
              ))}
              {kp.khoan.length === 0 && <tr><td colSpan={5} className="trong">Chưa lập dự toán.</td></tr>}
            </tbody>
          </table>
          <div className="the-than" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <O nhan="Loại"><Chon value={moi.loai} onChange={(e) => setMoi({ ...moi, loai: e.target.value as LoaiKhoanKp })}>{(Object.keys(TEN_LOAI_KHOAN_KP) as LoaiKhoanKp[]).map((l) => <option key={l} value={l}>{TEN_LOAI_KHOAN_KP[l]}</option>)}</Chon></O>
            <O nhan="Nội dung" style={{ flex: 1, minWidth: 200 }}><input aria-label="Nội dung khoản dự toán" value={moi.noiDung} placeholder="Họp, kiểm đếm, in ấn, niêm yết…" onChange={(e) => setMoi({ ...moi, noiDung: e.target.value })} /></O>
            <O nhan="Số tiền (đ)"><OSo className="o-so" aria-label="Số tiền dự toán" value={moi.soTien} onChange={(v) => setMoi({ ...moi, soTien: v })} /></O>
            <O nhan="Căn cứ"><input value={moi.canCu} onChange={(e) => setMoi({ ...moi, canCu: e.target.value })} /></O>
            <button className="nut" onClick={() => {
              setLoi("");
              if (!moi.noiDung.trim() || !laSo(moi.soTien)) return setLoi("Nhập nội dung và số tiền dự toán");
              dat({ khoan: [...kp.khoan, { id: taoId(), loai: moi.loai, noiDung: moi.noiDung.trim(), soTien: moi.soTien.trim(), canCu: moi.canCu.trim() || undefined }] });
              setMoi({ ...moi, noiDung: "", soTien: "", canCu: "" });
            }}>Thêm khoản</button>
          </div>
          <table className="bang">
            <thead><tr><th>Ngày</th><th>Nội dung giải ngân</th><th className="so">Số tiền (đ)</th><th>Chứng từ</th><th>Người ghi</th><th /></tr></thead>
            <tbody>
              {[...kp.giaiNgan].sort((a, b) => a.ngay.localeCompare(b.ngay)).map((g) => (
                <tr key={g.id} style={g.huy ? { textDecoration: "line-through", opacity: 0.6 } : undefined} title={g.huy ? `Đã hủy: ${g.huy.lyDo}` : undefined}>
                  <td>{ngayVN(g.ngay)}</td><td>{g.noiDung}</td><td className="so">{dinhDang(D(g.soTien || "0"), 0)}</td><td>{g.chungTu}</td><td className="chu-nho">{g.nguoiGhi}</td>
                  <td>{!g.huy && <button className="nut nut-nho nut-nguy" title="Hủy dòng ghi sai (giữ lại để truy vết)" onClick={() => {
                    const lyDo = prompt("Lý do hủy dòng giải ngân (bắt buộc):")?.trim();
                    if (lyDo) dat({ giaiNgan: kp.giaiNgan.map((x) => (x.id === g.id ? { ...x, huy: { luc: new Date().toISOString(), nguoi: nguoiDung, lyDo } } : x)) });
                  }}>Hủy</button>}</td>
                </tr>
              ))}
              {giaiNganHieuLuc(kp).length === 0 && kp.giaiNgan.length === 0 && <tr><td colSpan={6} className="trong">Chưa ghi giải ngân.</td></tr>}
            </tbody>
          </table>
          <div className="the-than" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <O nhan="Ngày"><ONgay value={gn.ngay} onChange={(e) => setGn({ ...gn, ngay: e.target.value })} /></O>
            <O nhan="Nội dung" style={{ flex: 1, minWidth: 200 }}><input aria-label="Nội dung giải ngân" value={gn.noiDung} onChange={(e) => setGn({ ...gn, noiDung: e.target.value })} /></O>
            <O nhan="Số tiền (đ)"><OSo className="o-so" aria-label="Số tiền giải ngân" value={gn.soTien} onChange={(v) => setGn({ ...gn, soTien: v })} /></O>
            <O nhan="Chứng từ"><input aria-label="Chứng từ giải ngân" value={gn.chungTu} onChange={(e) => setGn({ ...gn, chungTu: e.target.value })} /></O>
            <button className="nut" onClick={() => {
              setLoi("");
              if (!gn.ngay || !gn.noiDung.trim() || !laSo(gn.soTien) || !gn.chungTu.trim()) return setLoi("Nhập ngày, nội dung, số tiền và chứng từ giải ngân");
              dat({ giaiNgan: [...kp.giaiNgan, { id: taoId(), ngay: gn.ngay, soTien: gn.soTien.trim(), noiDung: gn.noiDung.trim(), chungTu: gn.chungTu.trim(), nguoiGhi: nguoiDung }] });
              setGn({ ...gn, soTien: "", noiDung: "", chungTu: "" });
            }}>Ghi giải ngân</button>
          </div>
          {loi && <div className="thong-bao thong-bao-do" style={{ margin: "0 12px 12px" }}>{loi}</div>}
          {k.canhBao.map((c, i) => <div key={i} className={`thong-bao ${LOP_MUC[c.muc]}`} style={{ margin: "0 12px 8px" }} data-canh-bao-kp>{c.noiDung}{c.canCu ? <span className="mo"> — {c.canCu}</span> : null}</div>)}
          <div className="the-than" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {daSua && <span className="chu-nho mo" style={{ alignSelf: "center" }}>Có thay đổi chưa lưu</span>}
            <button className="nut" disabled={!daSua} onClick={() => { setKp(duAn.kinhPhi ?? kinhPhiRong()); setDaSua(false); }}>Hoàn tác</button>
            <button className="nut nut-chinh" disabled={!daSua} onClick={() => void luu()}>Lưu kinh phí</button>
          </div>
        </fieldset>
      </div>
    </div>
  );
}

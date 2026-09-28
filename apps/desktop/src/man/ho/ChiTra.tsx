import { useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import type Decimal from "decimal.js";
import { useUngDung } from "../../ung-dung";
import { O, ngayVN } from "../../thanh-phan/chung";
import { TEN_HINH_THUC, tinhChiTra, type DotChi, type HinhThucChi } from "../../chi-tra";
import { taoId, type DuAn, type Ho } from "../../mo-hinh";
import { homNayIso } from "../../trang-thai";
import { Chon } from "../../thanh-phan/Chon";
import { OSo } from "../../thanh-phan/OSo";

const tien = (d: Decimal | null | undefined) => (d ? dinhDang(d, 0) : "—");

/** Thẻ Chi trả của hồ sơ: số phải trả theo bản phương án đã duyệt, các đợt chi, tiền chậm trả tạm tính. */
export function TabChiTra({ h, duAn, doi }: { h: Ho; duAn: DuAn; doi: (h: Ho) => void }) {
  const { tyLeCham, nguoiDung, moCaiDat } = useUngDung();
  const r = tinhChiTra(h, duAn.phuongAn ?? [], tyLeCham, homNayIso());
  const ct = h.chiTra ?? { dot: [] };
  const [moi, setMoi] = useState<{ ngay: string; soTien: string; hinhThuc: HinhThucChi; chungTu: string; ghiChu: string }>({ ngay: homNayIso(), soTien: "", hinhThuc: "CHUYEN_KHOAN", chungTu: "", ghiChu: "" });
  const [loi, setLoi] = useState("");
  const datCt = (p: Partial<typeof ct>) => doi({ ...h, chiTra: { ...ct, ...p } });

  const them = () => {
    setLoi("");
    const so = moi.soTien.trim(); // ô số trả chuẩn máy (P0-2)
    if (!moi.ngay || !/^\d+(\.\d+)?$/.test(so) || Number(so) <= 0) return setLoi("Nhập ngày chi và số tiền (đồng)");
    if (!moi.chungTu.trim()) return setLoi("Ghi số chứng từ (phiếu chi, ủy nhiệm chi, biên bản…)");
    const d: DotChi = { id: taoId(), ngay: moi.ngay, soTien: so, hinhThuc: moi.hinhThuc, chungTu: moi.chungTu.trim(), ghiChu: moi.ghiChu.trim() || undefined, nguoiGhi: nguoiDung };
    datCt({ dot: [...ct.dot, d] });
    setMoi({ ...moi, soTien: "", chungTu: "", ghiChu: "" });
  };

  if (r.trangThai === "CHUA_DUYET")
    return (
      <div className="the"><div className="the-than">
        <div className="thong-bao thong-bao-vang" style={{ marginBottom: 0 }}>Hộ chưa có trong bản phương án đã ghi nhận phê duyệt (màn Dự án → Phương án – phiên bản). Số phải trả chỉ lấy từ bản đã phê duyệt.</div>
        {r.canhBao.map((c) => <div key={c} className="thong-bao thong-bao-do" style={{ marginTop: 8 }}>{c}</div>)}
      </div></div>
    );

  return (
    <div className="luoi">
      <div className="luoi luoi-4">
        <div className="the the-than"><div className="mo chu-nho">Phải trả theo bản {r.ban!.so} ({r.ban!.pheDuyet!.so})</div><div className="so-mau" style={{ fontSize: 20 }}>{tien(r.phaiTra)} đ</div></div>
        <div className="the the-than"><div className="mo chu-nho">Đã chi</div><div className="so-mau" style={{ fontSize: 20 }}>{tien(r.daChi)} đ</div></div>
        <div className="the the-than"><div className="mo chu-nho">Còn phải chi</div><div className="so-mau" style={{ fontSize: 20, color: r.conLai!.gt(0) ? "var(--do)" : undefined }}>{tien(r.conLai)} đ</div></div>
        <div className="the the-than"><div className="mo chu-nho">Tiền chậm trả (tạm tính)</div><div className="so-mau" style={{ fontSize: 20 }}>{r.chamTra.length ? (r.tienChamTra ? `${tien(r.tienChamTra)} đ` : "Thiếu căn cứ") : "0 đ"}</div></div>
      </div>

      <div className="the">
        <div className="the-dau"><h3>Thời hạn chi trả</h3><span className="mo chu-nho">điểm a khoản 3 Điều 94 Luật Đất đai 2024</span></div>
        <div className="the-than luoi luoi-3">
          <O nhan="Ngày QĐ phê duyệt có hiệu lực" goiY={`Mặc định ngày QĐ ${ngayVN(r.ban!.pheDuyet!.ngay)}; sửa nếu QĐ quy định hiệu lực khác`}>
            <input type="date" value={r.ngayHieuLuc ?? ""} onChange={(e) => datCt({ ngayHieuLuc: e.target.value || undefined })} />
          </O>
          <O nhan="Hạn chi trả (30 ngày)"><input readOnly value={ngayVN(r.hanChi ?? undefined)} /></O>
          <O nhan="Trạng thái"><input readOnly value={{ CHUA_CHI: "Chưa chi", CHI_MOT_PHAN: "Chi một phần", DA_CHI_DU: "Đã chi đủ", CHI_VUOT: "Chi vượt", CHUA_DUYET: "" }[r.trangThai]} /></O>
        </div>
      </div>

      <div className="the">
        <div className="the-dau"><h3>Các đợt chi trả</h3></div>
        <table className="bang">
          <thead><tr><th>Ngày</th><th className="so">Số tiền (đ)</th><th>Hình thức</th><th>Chứng từ</th><th>Ghi chú</th><th>Người ghi</th><th /></tr></thead>
          <tbody>
            {[...ct.dot].sort((a, b) => a.ngay.localeCompare(b.ngay)).map((d) => (
              <tr key={d.id} style={d.huy ? { textDecoration: "line-through", opacity: 0.6 } : undefined} title={d.huy ? `Đã hủy lúc ${new Date(d.huy.luc).toLocaleString("vi-VN")} bởi ${d.huy.nguoi}: ${d.huy.lyDo}` : undefined}>
                <td>{ngayVN(d.ngay)}{r.hanChi && d.ngay > r.hanChi && <span className="nhan nhan-do" style={{ marginLeft: 4 }}>sau hạn</span>}</td>
                <td className="so">{dinhDang(D(d.soTien), 0)}</td><td>{TEN_HINH_THUC[d.hinhThuc]}</td><td>{d.chungTu}</td><td className="chu-nho">{d.ghiChu}</td><td className="chu-nho">{d.nguoiGhi}</td>
                <td>
                  {d.huy ? (
                    <span className="nhan nhan-xam" style={{ textDecoration: "none" }}>Đã hủy</span>
                  ) : (
                    <button className="nut nut-nho nut-nguy" title="Hủy đợt chi ghi sai (giữ lại dòng để truy vết, không tính vào số đã chi)" onClick={() => {
                      const lyDo = prompt("Lý do hủy đợt chi (bắt buộc, vd. ghi nhầm số tiền, nhầm hộ):")?.trim();
                      if (!lyDo) return;
                      datCt({ dot: ct.dot.map((x) => (x.id === d.id ? { ...x, huy: { luc: new Date().toISOString(), nguoi: nguoiDung, lyDo } } : x)) });
                    }}>Hủy</button>
                  )}
                </td>
              </tr>
            ))}
            {ct.dot.length === 0 && <tr><td colSpan={7} className="trong">Chưa ghi đợt chi nào.</td></tr>}
          </tbody>
        </table>
        <div className="the-than" style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <O nhan="Ngày chi"><input type="date" value={moi.ngay} onChange={(e) => setMoi({ ...moi, ngay: e.target.value })} /></O>
          <O nhan="Số tiền (đ)"><OSo className="o-so" value={moi.soTien} placeholder={r.conLai?.gt(0) ? r.conLai.toFixed(0) : ""} onChange={(v) => setMoi({ ...moi, soTien: v })} /></O>
          <O nhan="Hình thức">
            <Chon value={moi.hinhThuc} onChange={(e) => setMoi({ ...moi, hinhThuc: e.target.value as HinhThucChi })}>
              {(Object.keys(TEN_HINH_THUC) as HinhThucChi[]).map((k) => <option key={k} value={k}>{TEN_HINH_THUC[k]}</option>)}
            </Chon>
          </O>
          <O nhan="Chứng từ"><input value={moi.chungTu} placeholder="Số phiếu chi / UNC / biên bản" onChange={(e) => setMoi({ ...moi, chungTu: e.target.value })} /></O>
          <O nhan="Ghi chú" style={{ flex: 1, minWidth: 180 }}><input value={moi.ghiChu} onChange={(e) => setMoi({ ...moi, ghiChu: e.target.value })} /></O>
          <button className="nut" onClick={them}>Thêm đợt chi</button>
        </div>
        {loi && <div className="thong-bao thong-bao-do" style={{ margin: "0 12px 12px" }}>{loi}</div>}
      </div>

      {r.chamTra.length > 0 && (
        <div className="the">
          <div className="the-dau"><h3>Tiền chậm trả (tạm tính)</h3><span className="mo chu-nho">điểm b khoản 3 Điều 94 Luật Đất đai 2024 — cơ quan có thẩm quyền phê duyệt phương án BT, HT, TĐC phê duyệt phương án chi trả bồi thường chậm</span></div>
          <table className="bang">
            <thead><tr><th>Khoản</th><th className="so">Số tiền chậm trả (đ)</th><th className="so">Số ngày chậm</th><th>Diễn giải</th><th className="so">Tiền chậm trả (đ)</th></tr></thead>
            <tbody>
              {r.chamTra.map((c, i) => (
                <tr key={i}><td>{c.dotId ? `Chi ngày ${ngayVN(c.ngay)}` : "Chưa chi (đến hôm nay)"}</td><td className="so">{tien(c.soTien)}</td><td className="so">{c.soNgay}</td><td className="chu-nho">{c.dienGiai || "—"}</td><td className="so">{c.tien ? tien(c.tien) : <span className="nhan nhan-do">Thiếu căn cứ</span>}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="the-than luoi luoi-2">
            <O nhan="Nguyên nhân chậm (cán bộ xác nhận)">
              <Chon value={ct.nguyenNhanCham ?? ""} onChange={(e) => datCt({ nguyenNhanCham: e.target.value as "" | "DO_CO_QUAN" | "DO_NGUOI_DAN" })}>
                <option value="">— Chưa xác nhận —</option>
                <option value="DO_CO_QUAN">Do cơ quan, đơn vị thực hiện bồi thường chậm chi trả</option>
                <option value="DO_NGUOI_DAN">Do người có đất không nhận / chưa đến nhận</option>
              </Chon>
            </O>
            <O nhan="Ghi chú, căn cứ xác định"><input value={ct.ghiChuCham ?? ""} onChange={(e) => datCt({ ghiChuCham: e.target.value })} /></O>
          </div>
          {tyLeCham.length === 0 && <div className="the-than"><button className="nut nut-nho" onClick={() => moCaiDat(true)}>Nhập tỷ lệ tiền chậm nộp (Cài đặt chung → Tiền chậm trả)</button></div>}
        </div>
      )}
      {r.canhBao.map((c) => <div key={c} className="thong-bao thong-bao-vang">{c}</div>)}
    </div>
  );
}

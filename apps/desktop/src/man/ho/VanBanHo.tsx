import { Fragment, useState } from "react";
import { useUngDung } from "../../ung-dung";
import { tinhHo, type KetQuaHo } from "../../tinh-ho";
import { daQuaBuoc, CAC_BUOC, type DuAn, type Ho } from "../../mo-hinh";
import { NhanDong } from "../../thanh-phan/chung";
import { DANH_MUC_MAU } from "../../van-ban/danh-muc";
import { taoNhanh } from "../../van-ban/tao-nhanh";
import { taiXuong } from "../../tai-xuong";
import { tenTep } from "../../ten-tep";

/**
 * Văn bản của hộ: mọi mẫu áp dụng cho từng hộ (theo bước quy trình) — bấm "Tạo nhanh" là có ngay tệp .docx đã điền
 * thông tin hộ, thửa, tài sản, số tiền, văn bản trước; "Soạn, cấp số" mở màn Văn bản để nhập số, ngày, nội dung riêng.
 */
export function TabVanBanHo({ h, duAn, kq, hieuLuc, soan }: { h: Ho; duAn: DuAn; kq: KetQuaHo; hieuLuc: Ho; soan: (ma: string) => void }) {
  const { kho, hoCua, chinhSach, dsDonVi, bao } = useUngDung();
  const [dang, setDang] = useState<string | null>(null);
  const buocHt = CAC_BUOC.find((b) => !daQuaBuoc(hieuLuc.tienDo[b.ma]?.trangThai))?.ma;
  const vb = h.vanBan ?? {};
  const nhom = CAC_BUOC.map((b) => ({ b, ds: DANH_MUC_MAU.filter((m) => m.buoc === b.ma && m.phamVi === "HO") })).filter((x) => x.ds.length);
  const tao = async (ma: string, ten: string) => {
    setDang(ma);
    try {
      const ds = hoCua(duAn.id).map((x) => (x.id === h.id ? { h, k: kq } : { h: x, k: tinhHo(chinhSach(duAn), duAn, x) }));
      const out = await taoNhanh({ kho, ma, duAn, ds, ho: { h, k: kq }, dsDonVi });
      await taiXuong(out, `Mau-${ma}_${tenTep(`${h.ma} ${h.ten}`, 60)}_${tenTep(ten, 40)}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } catch (e) {
      bao(`Không tạo được Mẫu ${ma}: ${(e as Error).message}`, "loi");
    } finally {
      setDang(null);
    }
  };
  return (
    <div className="the">
      <div className="the-dau">
        <h2>Văn bản của hộ</h2>
        <span className="mo chu-nho">Tự điền thông tin hộ, thửa, tài sản, số tiền đã nhập. "Tạo nhanh" = bản dự thảo chưa có số; "Soạn, cấp số" để ghi số, ngày và lưu làm căn cứ cho văn bản sau.</span>
      </div>
      <div className="bang-cuon">
        <table className="bang">
          <thead><tr><th style={{ width: 70 }}>Mẫu</th><th>Văn bản</th><th style={{ width: 240 }}>Đã ban hành</th><th style={{ width: 290 }} /></tr></thead>
          <tbody>
            {nhom.map(({ b, ds }) => (
              <Fragment key={b.ma}>
                <tr className="vb-nhom"><td colSpan={4}>Bước {b.ma}. {b.ten}{b.ma === buocHt && <span className="nhan nhan-xanh" style={{ marginLeft: 8 }}>bước hiện tại</span>}</td></tr>
                {ds.map((m) => {
                  const soVb = m.ghiLai ? vb[`${m.ghiLai.khoa}_so`] : undefined;
                  return (
                    <tr key={m.ma} className={b.ma === buocHt ? "dang-chon" : ""}>
                      <td><b>{m.ma}</b></td>
                      <td>{m.ten}{m.moTa && <div className="can-cu">{m.moTa}</div>}</td>
                      <td className="chu-nho">{soVb ? <>Số {soVb}{m.ghiLai && vb[`${m.ghiLai.khoa}_ngay`] ? `, ${vb[`${m.ghiLai.khoa}_ngay`]}` : ""}</> : <span className="mo">—</span>}</td>
                      <td>
                        <div className="nhom-nut" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <button className="nut nut-nho nut-chinh" disabled={!!dang} onClick={() => void tao(m.ma, m.ten)}>{dang === m.ma ? "Đang tạo…" : "Tạo nhanh (.docx)"}</button>
                          <button className="nut nut-nho" onClick={() => soan(m.ma)}>Soạn, cấp số</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="the-than mo chu-nho">Văn bản cấp dự án (tờ trình, quyết định phê duyệt phương án, niêm yết…) và theo đợt: chọn trong danh sách mẫu phía trên.</div>
    </div>
  );
}

export { NhanDong };

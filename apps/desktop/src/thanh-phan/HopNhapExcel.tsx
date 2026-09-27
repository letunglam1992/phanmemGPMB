import { useState } from "react";
import { useUngDung } from "../ung-dung";
import { HopThoai } from "./chung";
import { taiXuong } from "../tai-xuong";
import { coLoiChan, docTepNhap, taoMauNhap, type KetQuaNhap } from "../nhap-excel";
import type { DuAn } from "../mo-hinh";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Nhập hồ sơ từ Excel: tải mẫu → chọn tệp → xem kiểm tra → nhập (chỉ khi không còn lỗi). */
export function HopNhapExcel({ duAn, dong }: { duAn: DuAn; dong: () => void }) {
  const { kho, hoCua, taiLai, quyen, ghiNhatKy, nguoiDung } = useUngDung();
  const [kq, setKq] = useState<{ ten: string; kq: KetQuaNhap } | null>(null);
  const [dang, setDang] = useState(false);
  const [xong, setXong] = useState("");
  const chan = kq ? coLoiChan(kq.kq) : true;
  const soLoi = kq?.kq.loi.filter((l) => l.muc === "LOI").length ?? 0;
  const soCb = (kq?.kq.loi.length ?? 0) - soLoi;

  const chon = async (f?: File) => {
    setKq(null);
    setXong("");
    if (!f) return;
    setDang(true);
    try {
      setKq({ ten: f.name, kq: await docTepNhap(new Uint8Array(await f.arrayBuffer()), duAn, hoCua(duAn.id), f.name, nguoiDung) });
    } finally {
      setDang(false);
    }
  };
  const nhap = async () => {
    if (!kq || chan || !quyen("SUA_HO_SO")) return;
    setDang(true);
    try {
      for (const h of [...kq.kq.hoMoi, ...kq.kq.hoBoSung]) await kho.luuHo(h);
      await taiLai();
      await ghiNhatKy("Nhập hồ sơ từ Excel", `${duAn.ten} – tệp ${kq.ten}: ${kq.kq.hoMoi.length} hồ sơ mới, bổ sung ${kq.kq.hoBoSung.length}; ${kq.kq.dem.thua} thửa, ${kq.kq.dem.kiemDem} dòng kiểm đếm`);
      const d = kq.kq.dem;
      setXong(`Đã nhập: ${kq.kq.hoMoi.length} hồ sơ mới, bổ sung ${kq.kq.hoBoSung.length} hồ sơ đã có (${d.nhanKhau} nhân khẩu, ${d.thua} thửa, ${d.kiemDem} dòng kiểm đếm). Giá đất và các khoản hỗ trợ chọn tiếp trong từng hồ sơ.`);
      setKq(null);
    } finally {
      setDang(false);
    }
  };

  return (
    <HopThoai
      tieuDe="Nhập hồ sơ từ Excel"
      dong={dong}
      rong={960}
      chan={
        <>
          <button className="nut" style={{ marginRight: "auto" }} onClick={async () => taiXuong(await taoMauNhap(), "Mau-nhap-ho-so-GPMB.xlsx", XLSX)}>Tải tệp mẫu</button>
          <button className="nut" onClick={dong}>Đóng</button>
          <button className="nut nut-chinh" disabled={dang || chan || !kq || (!kq.kq.hoMoi.length && !kq.kq.hoBoSung.length)} onClick={nhap}>
            {kq ? `Nhập ${kq.kq.hoMoi.length} hồ sơ mới, bổ sung ${kq.kq.hoBoSung.length}` : "Nhập"}
          </button>
        </>
      }
    >
      <p className="mo" style={{ marginTop: 0 }}>
        Dùng tệp mẫu của phần mềm (trang Ho, NhanKhau, Thua, KiemDem; hướng dẫn trong trang HuongDan). Phần mềm kiểm tra toàn bộ tệp trước; <b>còn lỗi thì không nhập dòng nào</b>. Số liệu không rõ dấu thập phân bị báo lỗi, không tự hiểu. Tệp chỉ đọc trên máy.
      </p>
      <input type="file" accept=".xlsx" aria-label="Chọn tệp Excel" disabled={dang} onChange={(e) => void chon(e.target.files?.[0])} />
      {dang && <span className="mo" style={{ marginLeft: 8 }}>Đang đọc…</span>}
      {xong && <div className="thong-bao thong-bao-xanh" role="status" style={{ marginTop: 12 }}>{xong}</div>}
      {kq && (
        <div style={{ marginTop: 12 }}>
          <div className={`thong-bao ${soLoi ? "thong-bao-do" : "thong-bao-xanh"}`} role="status">
            {kq.ten}: {kq.kq.hoMoi.length} hồ sơ mới, bổ sung {kq.kq.hoBoSung.length} hồ sơ đã có · {kq.kq.dem.nhanKhau} nhân khẩu · {kq.kq.dem.thua} thửa · {kq.kq.dem.kiemDem} dòng kiểm đếm.{" "}
            {soLoi ? <b>{soLoi} lỗi — sửa tệp rồi chọn lại.</b> : "Không có lỗi."} {soCb ? `${soCb} cảnh báo cần xem.` : ""}
          </div>
          {kq.kq.loi.length > 0 && (
            <div className="bang-cuon" style={{ maxHeight: 340 }}>
              <table className="bang">
                <thead><tr><th>Mức</th><th>Trang</th><th className="so">Dòng</th><th>Cột</th><th>Nội dung</th></tr></thead>
                <tbody>
                  {kq.kq.loi.map((l, i) => (
                    <tr key={i}>
                      <td><span className={`nhan ${l.muc === "LOI" ? "nhan-do" : "nhan-vang"}`}>{l.muc === "LOI" ? "Lỗi" : "Cảnh báo"}</span></td>
                      <td>{l.trang}</td><td className="so">{l.dong || ""}</td><td>{l.cot}</td><td>{l.noiDung}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!chan && (
            <table className="bang" style={{ marginTop: 10 }}>
              <thead><tr><th>Mã</th><th>Họ tên</th><th /><th className="so">Nhân khẩu</th><th className="so">Thửa</th><th className="so">Tài sản</th></tr></thead>
              <tbody>
                {[...kq.kq.hoMoi.map((h) => ({ h, moi: true })), ...kq.kq.hoBoSung.map((h) => ({ h, moi: false }))].map(({ h, moi }) => (
                  <tr key={h.id}><td>{h.ma}</td><td>{h.ten}</td><td><span className={`nhan ${moi ? "nhan-xanh" : "nhan-tim"}`}>{moi ? "Mới" : "Bổ sung"}</span></td><td className="so">{h.nhanKhau.length}</td><td className="so">{h.thua.length}</td><td className="so">{h.taiSan.length}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </HopThoai>
  );
}

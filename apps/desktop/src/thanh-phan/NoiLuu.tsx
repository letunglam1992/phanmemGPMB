import { useEffect, useState } from "react";
import { SU_KIEN_NOI_LUU, chonThuMucLuu, datHoiNoiLuu, datThuMucMacDinh, hoiNoiLuu, thuMucMacDinh } from "../tai-xuong";
import { laBanCai } from "../tep-da-xuat";

/**
 * 1.3.5 — chọn nơi lưu tệp xuất (Excel, Word, zip, sao lưu thủ công): hỏi nơi lưu mỗi lần (hộp "Lưu thành"), hoặc lưu
 * thẳng vào một thư mục cán bộ chọn (chưa chọn = Downloads). Dùng ở menu "Tệp đã xuất" và Cài đặt chung; cài đặt theo máy.
 */
export function ChonNoiLuu({ gon }: { gon?: boolean }) {
  const [hoi, setHoi] = useState(hoiNoiLuu());
  const [thuMuc, setThuMuc] = useState(thuMucMacDinh());
  const banCai = laBanCai();
  useEffect(() => {
    const f = () => { setHoi(hoiNoiLuu()); setThuMuc(thuMucMacDinh()); };
    window.addEventListener(SU_KIEN_NOI_LUU, f);
    return () => window.removeEventListener(SU_KIEN_NOI_LUU, f);
  }, []);
  const chon = async () => {
    const d = await chonThuMucLuu();
    if (d) { datThuMucMacDinh(d); datHoiNoiLuu(false); }
  };
  return (
    <div className="noi-luu" data-noi-luu role="group" aria-label="Nơi lưu tệp xuất">
      {!gon && <b className="chu-nho">Nơi lưu tệp xuất</b>}
      <label className="noi-luu-dong">
        <input type="radio" name="noi-luu" checked={hoi} onChange={() => datHoiNoiLuu(true)} />
        <span>Hỏi nơi lưu mỗi lần (chọn thư mục, đặt tên tệp)</span>
      </label>
      <label className="noi-luu-dong">
        <input type="radio" name="noi-luu" checked={!hoi} onChange={() => datHoiNoiLuu(false)} />
        <span>
          Lưu thẳng vào: <b title={thuMuc || "Thư mục Downloads"}>{thuMuc || "Downloads"}</b>
        </span>
      </label>
      <div className="noi-luu-nut">
        {banCai && <button type="button" className="nut nut-nho" onClick={() => void chon()}>Chọn thư mục…</button>}
        {banCai && thuMuc && <button type="button" className="nut nut-nho" onClick={() => datThuMucMacDinh("")}>Dùng Downloads</button>}
        {!banCai && <span className="mo chu-nho">Bản cài Windows mới chọn được thư mục lưu thẳng.</span>}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useUngDung } from "../ung-dung";
import type { DuAn, Ho } from "../mo-hinh";
import { HopThoai, O } from "./chung";
import { dienSoToTrong, soThuaTrongTo, soToGoiY } from "../so-to";

/** 1.3.5 — điền số tờ bản đồ cho mọi thửa chưa có số tờ của dự án, một lần (thửa đã có số tờ giữ nguyên). */
export function HopDienSoTo({ duAn, hos, dong }: { duAn: DuAn; hos: Ho[]; dong: () => void }) {
  const { luuNhieuHo, bao } = useUngDung();
  const [soTo, setSoTo] = useState(() => soToGoiY(duAn, hos));
  const [dang, setDang] = useState(false);
  const trong = soThuaTrongTo(hos);
  const soHo = hos.filter((h) => h.thua.some((t) => !t.soTo.trim())).length;
  const luu = async () => {
    const ds = dienSoToTrong(hos, soTo);
    if (!ds.length) return dong();
    setDang(true);
    try {
      const r = await luuNhieuHo(ds.map((h) => ({ h, nhatKy: `Điền số tờ ${soTo.trim()} cho thửa chưa có số tờ` })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
      bao(`Đã điền số tờ ${soTo.trim()} cho ${trong} thửa của ${r.daLuu} hộ`);
      dong();
    } finally {
      setDang(false);
    }
  };
  return (
    <HopThoai tieuDe="Điền số tờ cho thửa chưa có số tờ" rong={560} dong={dong}
      chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={dang || !trong || !soTo.trim()} onClick={() => void luu()}>{dang ? "Đang lưu…" : `Điền cho ${trong} thửa`}</button></>}>
      <p className="mt-0">Dự án có <b>{trong}</b> thửa (của {soHo} hộ) chưa ghi số tờ. Thửa đã có số tờ giữ nguyên.</p>
      <O nhan="Số tờ bản đồ" goiY="Gợi ý: số tờ dùng nhiều nhất trong dự án, hoặc số tờ nhập cho tệp bản đồ">
        <input aria-label="Số tờ điền cho thửa trống" value={soTo} placeholder="vd. TĐ 52-2025" onChange={(e) => setSoTo(e.target.value)} />
      </O>
    </HopThoai>
  );
}

import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_CHANG, THU_TU_TRANG_THAI, TT_GPMB, daQuaChang, homNayIso, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { CAC_BUOC } from "../mo-hinh";
import { BangHo, type DongHo } from "../thanh-phan/BangHo";
import { BieuTuong } from "../thanh-phan/BieuDo";
import { timHo } from "../tim-kiem";
import { Chon } from "../thanh-phan/Chon";
import { xuatExcelDsHoChon } from "../xuat-excel";
export { khongDau, khopTuKhoa } from "../tim-kiem";

export function DanhSachHo(p: { duAnId?: string; trangThai?: string; chang?: string; tim?: string }) {
  const { dsDuAn, hoCua, chinhSach, di, bao } = useUngDung();
  const homNay = homNayIso();
  const [duAnId, setDuAnId] = useState(p.duAnId ?? "");
  const [trangThai, setTrangThai] = useState<TrangThaiGpmb | "">((p.trangThai as TrangThaiGpmb) ?? "");
  const [chang, setChang] = useState(p.chang ?? "");
  const [tim, setTim] = useState(p.tim ?? "");
  // 1.0.7: chọn nhiều hồ sơ (có thể nhiều dự án) → xuất Excel danh sách, lọc chỉ hồ sơ đã chọn
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [chiChon, setChiChon] = useState(false);
  const [dangXuat, setDangXuat] = useState(false);
  const doiChon = (ids: string[], co: boolean) => setChon((c) => { const m = new Set(c); for (const id of ids) if (co) m.add(id); else m.delete(id); return m; });
  const tatCa = useMemo<DongHo[]>(
    () => dsDuAn.flatMap((duAn) => hoCua(duAn.id).map((h) => { const k = tinhHo(chinhSach(duAn), duAn, h); return { h, k, duAn, tt: trangThaiHo(duAn, h, k, homNay) }; })),
    [dsDuAn, hoCua, chinhSach, homNay],
  );
  const ds = tatCa
    .filter((x) => !duAnId || x.duAn.id === duAnId)
    .filter((x) => !trangThai || x.tt === trangThai)
    .filter((x) => !chang || daQuaChang(x.duAn, x.h, chang))
    .filter((x) => timHo(x.h, tim, x.duAn.ten).khop)
    .filter((x) => !chiChon || chon.has(x.h.id));
  const dsChon = tatCa.filter((x) => chon.has(x.h.id));
  const xuat = async () => {
    setDangXuat(true);
    try {
      if (await xuatExcelDsHoChon(dsChon.map((x) => ({ h: x.h, k: x.k, duAn: x.duAn, hienTrang: TT_GPMB[x.tt].ten })))) bao(`Đã xuất Excel ${dsChon.length} hồ sơ`);
    } catch (e) {
      bao((e as Error).message, "loi");
    } finally {
      setDangXuat(false);
    }
  };
  const tenChang = CAC_CHANG.find((c) => c.buoc === chang);
  const tieuDe = trangThai ? TT_GPMB[trangThai].ten : tenChang ? `Đã qua chặng: ${tenChang.ten}` : tim ? `Kết quả tìm “${tim}”` : "Tất cả hồ sơ";
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Danh sách hồ sơ</div>
          <h1>{tieuDe}</h1>
          <div className="mo-ta">{ds.length} hồ sơ{duAnId ? ` · ${dsDuAn.find((d) => d.id === duAnId)?.ten ?? ""}` : ` · ${dsDuAn.length} dự án`} · bấm một dòng để xem chi tiết hồ sơ</div>
        </div>
      </div>
      <div className="the mb-14">
        <div className="loc-ds">
          <label className="o-tim" style={{ flex: 2 }}>
            <BieuTuong ten="traCuu" co={17} />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm theo tên, mã hồ sơ, địa chỉ, tờ/thửa (vd. 5/85)…" aria-label="Tìm hồ sơ" />
          </label>
          <Chon value={duAnId} onChange={(e) => setDuAnId(e.target.value)} aria-label="Dự án">
            <option value="">Tất cả dự án</option>
            {dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </Chon>
          <Chon value={trangThai} onChange={(e) => setTrangThai(e.target.value as TrangThaiGpmb | "")} aria-label="Hiện trạng">
            <option value="">Mọi hiện trạng</option>
            {THU_TU_TRANG_THAI.map((t) => <option key={t} value={t}>{TT_GPMB[t].ten}</option>)}
          </Chon>
          <Chon value={chang} onChange={(e) => setChang(e.target.value)} aria-label="Chặng quy trình">
            <option value="">Mọi chặng</option>
            {CAC_CHANG.map((c) => <option key={c.buoc} value={c.buoc}>Đã qua: {c.ten} (bước {c.buoc}. {CAC_BUOC.find((b) => b.ma === c.buoc)?.ten})</option>)}
          </Chon>
          {(duAnId || trangThai || chang || tim) && <button className="nut" onClick={() => { setDuAnId(""); setTrangThai(""); setChang(""); setTim(""); }}>Bỏ lọc</button>}
        </div>
      </div>
      {dsChon.length > 0 && (
        <div className="thanh-chon" role="toolbar" aria-label="Thao tác với hồ sơ đã chọn">
          <b>Đã chọn {dsChon.length} hồ sơ</b>
          {new Set(dsChon.map((x) => x.duAn.id)).size > 1 && <span className="mo chu-nho">({new Set(dsChon.map((x) => x.duAn.id)).size} dự án)</span>}
          <div className="phai" style={{ display: "flex", gap: 8 }}>
            <label className="chu-nho"><input type="checkbox" checked={chiChon} onChange={(e) => setChiChon(e.target.checked)} /> Chỉ hiện hồ sơ đã chọn</label>
            <button className="nut nut-nho" disabled={dangXuat} onClick={() => void xuat()}>{dangXuat ? "Đang xuất…" : `Xuất Excel ${dsChon.length} hồ sơ`}</button>
            <button className="nut nut-nho nut-chu" onClick={() => { setChon(new Set()); setChiChon(false); }}>Bỏ chọn</button>
          </div>
        </div>
      )}
      <div className="the">
        <BangHo ds={ds} homNay={homNay} coDuAn={!duAnId} chon={chon} doiChon={doiChon} mo={(x) => di({ ten: "ho", duAnId: x.duAn.id, hoId: x.h.id })} trong={chiChon ? "Không có hồ sơ đã chọn khớp điều kiện lọc." : "Không có hồ sơ khớp điều kiện lọc."} />
      </div>
    </div>
  );
}

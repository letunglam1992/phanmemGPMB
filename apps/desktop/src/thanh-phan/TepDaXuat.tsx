import { useEffect, useRef, useState } from "react";
import { useUngDung } from "../ung-dung";
import { BieuTuong } from "./BieuDo";
import { SU_KIEN, coDuongDan, dsTepDaXuat, laBanCai, moNoiLuu, moTep, thuMucCua, xoaDsTepDaXuat, type TepDaXuat } from "../tep-da-xuat";

const gio = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("vi-VN");
};

/**
 * 1.0.2 — nút "Tệp đã xuất" trên thanh tiêu đề (như nút tải về của trình duyệt): xuất xong tự mở danh sách vài giây;
 * bấm tên tệp để mở (Excel, Word…), "Thư mục" để mở nơi lưu, chọn sẵn tệp.
 */
export function NutTepDaXuat() {
  const { bao } = useUngDung();
  const [ds, setDs] = useState<TepDaXuat[]>(() => dsTepDaXuat());
  const [mo, setMo] = useState(false);
  const [moi, setMoi] = useState(0);
  const hen = useRef<number | undefined>(undefined);
  useEffect(() => {
    const f = (e: Event) => {
      setDs((e as CustomEvent<TepDaXuat[]>).detail ?? dsTepDaXuat());
      if (!(e as CustomEvent<TepDaXuat[]>).detail?.length) return;
      setMoi((n) => n + 1);
      setMo(true);
      window.clearTimeout(hen.current);
      hen.current = window.setTimeout(() => setMo(false), 6000);
    };
    window.addEventListener(SU_KIEN, f);
    return () => {
      window.removeEventListener(SU_KIEN, f);
      window.clearTimeout(hen.current);
    };
  }, []);
  const banCai = laBanCai();
  const lam = (f: (x: TepDaXuat) => Promise<void>, x: TepDaXuat) => {
    window.clearTimeout(hen.current);
    void f(x).catch((e) => bao(String((e as Error)?.message ?? e), "loi"));
  };
  return (
    <div className="menu-nguoi">
      <button className="nut-tren nut-tren-bt nut-chuong" title="Tệp đã xuất (Excel, Word…)" aria-label="Tệp đã xuất" aria-expanded={mo} onClick={() => { setMo(!mo); setMoi(0); window.clearTimeout(hen.current); }}>
        <BieuTuong ten="taiVe" co={17} />
        {moi > 0 && <span className="cham-chuong xanh">{moi > 9 ? "9+" : moi}</span>}
      </button>
      {mo && (
        <div className="menu-tha menu-chuong menu-tep" role="menu" aria-label="Danh sách tệp đã xuất" onMouseEnter={() => window.clearTimeout(hen.current)}>
          <div className="menu-nhan">Tệp đã xuất gần đây{!banCai ? " · mở tệp, thư mục chỉ có trong bản cài Windows" : ""}</div>
          {ds.slice(0, 10).map((x) => {
            const mo2 = banCai && coDuongDan(x);
            return (
              <div key={x.duongDan + x.luc} className="tep-dong">
                <span className="tep-bt" aria-hidden>{/\.xlsx$/i.test(x.ten) ? "X" : /\.docx$/i.test(x.ten) ? "W" : /\.pdf$/i.test(x.ten) ? "P" : "▤"}</span>
                <button className="tep-ten" disabled={!mo2} title={mo2 ? `Mở ${x.duongDan}` : x.duongDan} onClick={() => lam(moTep, x)}>
                  <b>{x.ten}</b>
                  <small>{gio(x.luc)}{thuMucCua(x) ? ` · ${thuMucCua(x)}` : ""}</small>
                </button>
                {mo2 && <button className="nut nut-nho" title="Mở thư mục chứa tệp" aria-label={`Mở thư mục chứa ${x.ten}`} onClick={() => lam(moNoiLuu, x)}>Thư mục</button>}
              </div>
            );
          })}
          {!ds.length && <div className="trong" style={{ padding: 16 }}>Chưa xuất tệp nào.</div>}
          {ds.length > 0 && (
            <>
              <div className="menu-vach" />
              <button role="menuitem" onClick={() => { xoaDsTepDaXuat(); setMo(false); }}>Xóa danh sách (không xóa tệp)</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

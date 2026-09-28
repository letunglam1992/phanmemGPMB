import { useEffect, useMemo, useRef, useState } from "react";
import { useUngDung } from "../ung-dung";
import { dongOcr, nhanDang, type TienDo, type TrangOcr } from "../ocr/ocr";
import { trichThongTin, type ThongTinVanBan } from "../ocr/nhan-dien";
import { thongTinChungMacDinh } from "../van-ban/du-lieu";
import { taiXuong } from "../tai-xuong";
import { Chon } from "../thanh-phan/Chon";

/** Độ tin cậy dưới ngưỡng này: cảnh báo đọc kỹ (ảnh mờ, nghiêng, chữ viết tay). */
const NGUONG_TIN_CAY = 75;

export function DocScan() {
  const { dsDuAn, luuDuAn, bao, quyen } = useUngDung();
  const [tep, setTep] = useState<File[]>([]);
  const [kq, setKq] = useState<TrangOcr[]>([]);
  const [chu, setChu] = useState("");
  const [tienDo, setTienDo] = useState<TienDo | null>(null);
  const [loi, setLoi] = useState("");
  const [tt, setTt] = useState<ThongTinVanBan | null>(null);
  const [canCu, setCanCu] = useState("");
  const [duAnId, setDuAnId] = useState(dsDuAn[0]?.id ?? "");
  const huy = useRef({ da: false });
  useEffect(() => () => void dongOcr(), []);

  const dangChay = !!tienDo;
  const thap = kq.filter((k) => k.doTinCay < NGUONG_TIN_CAY);
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const canCuHienCo = useMemo(() => (duAn ? (duAn.vanBan?.can_cu_du_an ?? thongTinChungMacDinh(duAn).can_cu_du_an ?? "") : ""), [duAn]);

  async function chay() {
    setLoi("");
    setKq([]);
    setTt(null);
    huy.current = { da: false };
    try {
      const ds = await nhanDang(tep, setTienDo, huy.current);
      setKq(ds);
      const toanBo = ds.map((d) => (ds.length > 1 ? `===== ${d.tep} — trang ${d.trang} =====\n` : "") + d.chu).join("\n\n");
      setChu(toanBo);
      const t = trichThongTin(ds[0]?.chu ?? "");
      setTt(t);
      setCanCu(t.canCu);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setTienDo(null);
    }
  }

  async function themCanCu() {
    if (!duAn || !canCu.trim()) return;
    const dong = canCuHienCo.split("\n").map((s) => s.trim()).filter(Boolean);
    if (dong.includes(canCu.trim())) return bao("Căn cứ này đã có trong dự án", "loi");
    await luuDuAn({ ...duAn, vanBan: { ...(duAn.vanBan ?? {}), can_cu_du_an: [...dong, canCu.trim()].join("\n") } });
    bao(`Đã thêm vào căn cứ riêng của dự án "${duAn.ten}" — dùng khi soạn văn bản`);
  }

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Nghiệp vụ</div>
          <h1>Đọc văn bản scan (OCR)</h1>
          <div className="mo-ta">Nhận dạng chữ tiếng Việt từ ảnh chụp, tệp PDF scan. <b>Xử lý hoàn toàn trên máy này</b> — không gửi ảnh, văn bản ra ngoài. Kết quả là bản nháp: đối chiếu với bản gốc trước khi dùng.</div>
        </div>
      </div>

      <div className="luoi">
      <div className="the">
        <div className="the-dau">
          <h3>1. Chọn tệp</h3>
          <div className="phai">
            {dangChay ? <button className="nut" onClick={() => (huy.current.da = true)}>Dừng</button> : <button className="nut nut-chinh" disabled={!tep.length} onClick={chay}>Nhận dạng</button>}
          </div>
        </div>
        <div className="the-than">
          <input type="file" multiple accept="application/pdf,image/png,image/jpeg,image/bmp,image/webp" disabled={dangChay} onChange={(e) => setTep([...(e.target.files ?? [])])} />
          <div className="mo chu-nho" style={{ marginTop: 6 }}>PDF scan, ảnh PNG/JPG. Ảnh rõ, thẳng, độ phân giải khoảng 300 dpi cho kết quả tốt nhất; chữ viết tay, con dấu đè chữ thường đọc sai. Nhiều trang có thể mất vài phút.</div>
          {tienDo && (
            <div style={{ marginTop: 10 }}>
              <div className="chu-nho">{tienDo.tep ? `${tienDo.tep} — trang ${tienDo.trang}/${tienDo.soTrang}: ` : ""}{BUOC[tienDo.buoc] ?? tienDo.buoc}</div>
              <div className="thanh-xep" style={{ height: 6, marginTop: 4 }}><span style={{ flex: tienDo.phan, background: "var(--chinh)" }} /><span style={{ flex: 1 - tienDo.phan, background: "var(--xam-nen)" }} /></div>
            </div>
          )}
          {loi && <div className="chu-y-trong" style={{ color: "var(--do-to)", marginTop: 8 }}>Không nhận dạng được: {loi}</div>}
        </div>
      </div>

      {kq.length > 0 && (
        <>
          {tt && (
            <div className="the">
              <div className="the-dau"><h3>2. Thông tin văn bản (trang đầu)</h3></div>
              <div className="the-than">
                <table className="bang">
                  <tbody>
                    <tr><td style={{ width: 180 }}>Cơ quan ban hành</td><td>{tt.coQuan || "—"}</td></tr>
                    <tr><td>Loại, số ký hiệu</td><td>{tt.loai} {tt.so ? `số ${tt.so}` : "—"}</td></tr>
                    <tr><td>Ngày ban hành</td><td>{tt.ngay || "—"}</td></tr>
                    <tr><td>Trích yếu</td><td>{tt.trichYeu || "—"}</td></tr>
                  </tbody>
                </table>
                {tt.thieu.length > 0 && <div className="mo chu-nho" style={{ marginTop: 6 }}>Không nhận ra: {tt.thieu.join(", ")} — nhập tay vào câu căn cứ.</div>}
                <div className="o-nhap" style={{ marginTop: 10 }}>
                  <label>Câu căn cứ gợi ý (sửa lại cho đúng bản gốc)</label>
                  <textarea rows={3} value={canCu} onChange={(e) => setCanCu(e.target.value)} />
                </div>
                <div className="luoi" style={{ gridTemplateColumns: "1fr auto auto", alignItems: "end", marginTop: 8 }}>
                  <div className="o-nhap"><label>Dự án</label>
                    <Chon value={duAnId} onChange={(e) => setDuAnId(e.target.value)}>{dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}</Chon>
                  </div>
                  <button className="nut" onClick={() => void navigator.clipboard.writeText(canCu).then(() => bao("Đã sao chép"))}>Sao chép</button>
                  <button className="nut nut-chinh" disabled={!duAn || !canCu.trim() || !quyen("SUA_HO_SO")} onClick={() => void themCanCu()}>Thêm vào căn cứ riêng của dự án</button>
                </div>
              </div>
            </div>
          )}

          <div className="the">
            <div className="the-dau">
              <h3>3. Toàn văn nhận dạng</h3>
              <span className="mo chu-nho">{kq.length} trang · độ tin cậy {kq.map((k) => `${k.doTinCay}%`).join(", ")}</span>
              <div className="phai">
                <button className="nut nut-nho" onClick={() => void navigator.clipboard.writeText(chu).then(() => bao("Đã sao chép toàn văn"))}>Sao chép</button>
                <button className="nut nut-nho" onClick={() => taiXuong(new TextEncoder().encode(chu), `${(tep[0]?.name ?? "van-ban").replace(/\.[^.]+$/, "")}.txt`, "text/plain;charset=utf-8")}>Tải .txt</button>
              </div>
            </div>
            <div className="the-than">
              {thap.length > 0 && (
                <div className="chu-y-trong" style={{ marginBottom: 8 }}>
                  Độ tin cậy thấp ({thap.map((k) => `${k.tep} tr.${k.trang}: ${k.doTinCay}%`).join("; ")}): ảnh có thể mờ, nghiêng hoặc có chữ viết tay — đọc soát kỹ các số liệu.
                </div>
              )}
              <textarea rows={22} style={{ width: "100%", fontFamily: "inherit", lineHeight: 1.55 }} value={chu} onChange={(e) => setChu(e.target.value)} />
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

const BUOC: Record<string, string> = {
  "Khởi động bộ nhận dạng": "Khởi động bộ nhận dạng…",
  "loading tesseract core": "Nạp bộ nhận dạng…",
  "initializing tesseract": "Khởi tạo…",
  "loading language traineddata": "Nạp dữ liệu tiếng Việt…",
  "initializing api": "Khởi tạo…",
  "recognizing text": "Đang nhận dạng chữ…",
};

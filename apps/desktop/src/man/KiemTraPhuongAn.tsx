import { useEffect, useMemo, useRef, useState } from "react";
import { GOI_CO_SAN, GOI_MOI_NHAT, tenBoChinhSach } from "../goi-chinh-sach";
import { BO_CHINH_SACH, DANH_MUC_XA, DON_GIA, napBangGiaDat, type BangGiaDat } from "../du-lieu";
import {
  TEN_LOAI_KIEM,
  TEN_MUC_DO,
  TEN_TRUONG_COT,
  chonTrang,
  docTepPhuongAn,
  kiemTraBang,
  nhanDienCot,
  xuatBaoCaoKiemTra,
  type AnhXaCot,
  type DongPA,
  type MucDo,
  type TrangBang,
  type TruongCot,
} from "../kiem-tra-pa";
import { taiXuong } from "../tai-xuong";
import { useUngDung } from "../ung-dung";
import { O } from "../thanh-phan/chung";
import { Chon } from "../thanh-phan/Chon";

/**
 * Kiểm tra tệp Excel phương án bồi thường, hỗ trợ, TĐC do đơn vị khác lập: số học, đơn giá, giá đất, hệ số, tổng.
 * Xử lý hoàn toàn trên máy; không lưu tệp, không gửi dữ liệu ra ngoài.
 */

const LOP_MUC: Record<MucDo, string> = { LOI: "nhan-do", CANH_BAO: "nhan-vang", DUNG: "nhan-xanh", KHONG_KIEM: "nhan-xam", THONG_TIN: "nhan-duong" };
const THU_TU: MucDo[] = ["LOI", "CANH_BAO", "KHONG_KIEM", "THONG_TIN", "DUNG"];
const TRUONG: TruongCot[] = ["stt", "ten", "dvt", "kl", "dg", "tyLe", "tt", "canCu"];
const tenCot = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
const so = (d: DongPA["kl"]) => (d == null ? "" : Number(d.toString()).toLocaleString("vi-VN", { maximumFractionDigits: 4 }));
const mucCao = (d: DongPA): MucDo | null => THU_TU.find((m) => d.phatHien.some((p) => p.mucDo === m)) ?? null;

export function KiemTraPhuongAn() {
  const { bao } = useUngDung();
  const [tep, setTep] = useState<{ ten: string; trang: TrangBang[] } | null>(null);
  const [soTrang, setSoTrang] = useState(0);
  const [xa, setXa] = useState("");
  // Bộ chính sách đối chiếu: phương án duyệt trước 06/10/2026 theo QĐ 106/2025 gốc; sau đó theo QĐ 64/2026 (k2 Điều 3)
  const [bo, setBo] = useState(GOI_MOI_NHAT);
  const [cotTay, setCotTay] = useState<AnhXaCot>({});
  const [loc, setLoc] = useState<"LOI_CB" | "TAT_CA">("LOI_CB");
  const [dangDoc, setDangDoc] = useState(false);
  const [loiDoc, setLoiDoc] = useState<string | null>(null);
  const [bangGia, setBangGia] = useState<BangGiaDat | null>(null);
  const inputTep = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void napBangGiaDat().then(setBangGia);
  }, []);

  const trang = tep?.trang[soTrang];
  const tuDong = useMemo(() => (trang ? nhanDienCot(trang.o) : null), [trang]);
  const kq = useMemo(() => {
    if (!trang) return null;
    return kiemTraBang(trang, { donGia: DON_GIA, bangGia, chinhSach: BO_CHINH_SACH[bo], xa: xa || undefined }, Object.keys(cotTay).length ? cotTay : undefined);
  }, [trang, bangGia, xa, cotTay, bo]);

  const napTep = async (f: File) => {
    setDangDoc(true);
    setLoiDoc(null);
    try {
      const ds = await docTepPhuongAn(f.name, new Uint8Array(await f.arrayBuffer()));
      if (!ds.length) throw new Error("Tệp không có trang tính nào.");
      setTep({ ten: f.name, trang: ds });
      setSoTrang(chonTrang(ds));
      setCotTay({});
    } catch (e) {
      setLoiDoc((e as Error).message);
    } finally {
      setDangDoc(false);
      if (inputTep.current) inputTep.current.value = "";
    }
  };

  const xuat = async () => {
    if (!kq || "loi" in kq || !tep) return;
    try {
      const b = await xuatBaoCaoKiemTra(kq, tep.ten, xa);
      await taiXuong(b, `kiem-tra-${tep.ten.replace(/\.(xlsx|docx)$/i, "")}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (e) {
      bao(`Không xuất được báo cáo: ${(e as Error).message}`, "loi");
    }
  };

  const ketQua = kq && !("loi" in kq) ? kq : null;
  const dsDong = ketQua ? ketQua.dong.filter((d) => loc === "TAT_CA" || d.phatHien.some((p) => p.mucDo === "LOI" || p.mucDo === "CANH_BAO")) : [];
  const soCot = trang ? Math.max(0, ...trang.o.slice(0, 60).map((d) => d.length)) : 0;
  const anhXa = ketQua?.anhXa ?? { ...(tuDong?.anhXa ?? {}), ...cotTay };

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Kiểm tra phương án bồi thường, hỗ trợ, TĐC</h1>
          <div className="mo-ta">Nạp tệp Excel (.xlsx) hoặc Word (.docx) phương án (phụ lục chi tiết) → kiểm tra số học, đơn giá, giá đất, hệ số, tổng; báo lỗi và cảnh báo theo từng dòng · Xử lý hoàn toàn trên máy</div>
        </div>
        <div className="phai">
          <label className="nut nut-chinh" aria-disabled={dangDoc}>
            {dangDoc ? "Đang đọc…" : tep ? "Nạp tệp khác" : "Chọn tệp Excel / Word"}
            <input ref={inputTep} type="file" accept=".xlsx,.docx" className="an" disabled={dangDoc} onChange={(e) => e.target.files?.[0] && void napTep(e.target.files[0])} />
          </label>
          {ketQua && <button className="nut" onClick={() => void xuat()}>Xuất báo cáo kiểm tra (Excel)</button>}
        </div>
      </div>

      {loiDoc && <div className="thong-bao thong-bao-do">{loiDoc}</div>}

      {!tep && (
        <div className="the the-than" style={{ padding: 28 }}>
          <h2 className="mt-0">Phần mềm kiểm tra những gì</h2>
          <ul style={{ lineHeight: 1.7, margin: 0 }}>
            <li><b>Số học</b> từng dòng: Thành tiền = Khối lượng × Đơn giá × Tỷ lệ/hệ số; tổng nhóm (A, I, 1…), dòng Cộng, Tổng cộng, Làm tròn.</li>
            <li><b>Đơn giá</b> nhà, công trình, cây trồng, vật nuôi: đối chiếu danh mục QĐ 32/2025/QĐ-UBND, Phụ lục V, VIII QĐ 106/2025/QĐ-UBND (tìm theo tên, không dấu); sai giá thì nêu mức theo danh mục.</li>
            <li><b>Giá đất</b>: đối chiếu bảng giá đất NQ 152/2025/NQ-HĐND của xã được chọn (theo mã loại đất LUC, CLN, ONT…).</li>
            <li><b>Hệ số hỗ trợ đào tạo, chuyển đổi nghề</b> theo xã (Điều 22 NĐ 88/2024/NĐ-CP; Điều 14 Phụ lục II QĐ 106/2025/QĐ-UBND).</li>
            <li>Cây tính tỷ lệ &lt; 100%: nhắc kiểm quỹ mật độ (k4 Đ5 PL VIII); cây không có mật độ trong danh mục → cần xác nhận (VM-35).</li>
          </ul>
          <p className="mo chu-nho mb-0">
            Tệp Word: phần mềm đọc các bảng trong văn bản (số viết kiểu Việt Nam: 5.523,2 — 54.000); các bảng cùng cấu trúc cột được gộp để kiểm tổng thể; vị trí ghi “B2.15” = bảng 2, dòng 15. Tệp cần có một dòng tiêu đề chứa “Đơn giá” và “Thành tiền” (tiêu đề 2 tầng, dòng đánh số cột (1) (2)… được nhận tự động); chọn lại cột nếu nhận sai. Khoản hỗ trợ tính theo mức/điều kiện riêng (ổn định đời sống, tạm cư, TĐC, thưởng…) chỉ kiểm số học. Dữ liệu đơn giá là bản trích xuất (VM-01, VM-02) — kết quả để cán bộ kiểm tra lại, không thay thẩm định.
          </p>
        </div>
      )}

      {tep && trang && (
        <div className="the mb-14">
          <div className="the-than" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <O nhan="Tệp">
              <input value={tep.ten} readOnly />
            </O>
            <O nhan={/\.docx$/i.test(tep.ten) ? "Bảng trong văn bản" : "Trang tính"}>
              <Chon value={String(soTrang)} onChange={(e) => { setSoTrang(Number(e.target.value)); setCotTay({}); }}>
                {tep.trang.map((t, i) => <option key={i} value={i}>{t.ten}</option>)}
              </Chon>
            </O>
            <O nhan="Xã/phường có đất thu hồi" goiY="Cần để kiểm giá đất, hệ số chuyển đổi nghề">
              <Chon value={xa} onChange={(e) => setXa(e.target.value)}>
                <option value="">— Chọn xã/phường —</option>
                {(DANH_MUC_XA as string[]).map((x) => <option key={x} value={x}>{x}</option>)}
              </Chon>
            </O>
            <O nhan="Đối chiếu theo bộ chính sách" goiY="Phương án duyệt trước 06/10/2026: bộ cũ; sau đó: QĐ 64/2026">
              <Chon value={bo} onChange={(e) => setBo(e.target.value)} aria-label="Bộ chính sách đối chiếu">
                {GOI_CO_SAN.map((k) => <option key={k} value={k}>{tenBoChinhSach(k)}</option>)}
              </Chon>
            </O>
          </div>
          <div className="the-than" style={{ borderTop: "1px solid var(--vien)" }}>
            <div className="mo chu-nho mb-8">
              {tuDong ? `Dòng tiêu đề: ${tuDong.dongTieuDe + 1} · cột nhận tự động — chọn lại nếu sai` : "Không tự nhận được dòng tiêu đề — chọn cột thủ công (dữ liệu tính từ dòng 1)"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
              {TRUONG.map((t) => (
                <O key={t} nhan={TEN_TRUONG_COT[t]}>
                  <select value={anhXa[t] ?? ""} onChange={(e) => setCotTay({ ...cotTay, [t]: e.target.value === "" ? undefined : Number(e.target.value) })}>
                    <option value="">(không có)</option>
                    {Array.from({ length: soCot }, (_, i) => <option key={i} value={i}>Cột {tenCot(i)}</option>)}
                  </select>
                </O>
              ))}
            </div>
          </div>
        </div>
      )}

      {kq && "loi" in kq && <div className="thong-bao thong-bao-vang">{kq.loi}</div>}

      {ketQua && (
        <>
          <div className="nhom-nut" style={{ marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            {THU_TU.map((m) => (
              <span key={m} className={`nhan ${LOP_MUC[m]}`}>{TEN_MUC_DO[m]}: {ketQua.dem[m]}</span>
            ))}
            <span className="mo chu-nho">· {ketQua.dong.filter((d) => d.loai === "CHI_TIET").length} dòng chi tiết, {ketQua.dong.filter((d) => d.loai !== "CHI_TIET").length} dòng nhóm/tổng</span>
            <span className="gian" />
            <select value={loc} onChange={(e) => setLoc(e.target.value as typeof loc)}>
              <option value="LOI_CB">Chỉ dòng có lỗi, cảnh báo</option>
              <option value="TAT_CA">Tất cả dòng</option>
            </select>
          </div>
          {ketQua.chung.map((p, i) => (
            <div key={i} className={`thong-bao ${p.mucDo === "CANH_BAO" || p.mucDo === "LOI" ? "thong-bao-vang" : ""}`} style={{ marginBottom: 8 }}>{p.noiDung}</div>
          ))}
          {!xa && <div className="thong-bao thong-bao-vang mb-8">Chưa chọn xã/phường: giá đất và hệ số chuyển đổi nghề ở trạng thái “Không kiểm được”.</div>}
          <div className="the" style={{ overflowX: "auto" }}>
            <table className="bang">
              <thead>
                <tr>
                  <th title="Excel: số dòng; Word: B(bảng).(dòng)">Vị trí</th><th>STT</th><th>Nội dung</th><th>ĐVT</th><th className="so">Khối lượng</th><th className="so">Đơn giá</th><th className="so">Tỷ lệ/hệ số</th><th className="so">Thành tiền</th><th style={{ minWidth: 360 }}>Kết quả kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {dsDong.map((d) => {
                  const m = mucCao(d);
                  return (
                    <tr key={d.viTri} style={d.loai !== "CHI_TIET" ? { fontWeight: 600, background: "var(--be-mat-2)" } : undefined}>
                      <td className="mo">{d.viTri}</td>
                      <td>{d.stt}</td>
                      <td>{d.ten}</td>
                      <td>{d.dvt}</td>
                      <td className="so">{so(d.kl)}</td>
                      <td className="so">{so(d.dg)}</td>
                      <td className="so">{so(d.heSo)}</td>
                      <td className="so">{so(d.tt)}</td>
                      <td>
                        {!d.phatHien.length && <span className="mo chu-nho">{d.loai === "NHOM" ? "Dòng nhóm" : "—"}</span>}
                        {[...d.phatHien].sort((a, b) => THU_TU.indexOf(a.mucDo) - THU_TU.indexOf(b.mucDo)).map((p, i) => (
                          <div key={i} style={{ marginBottom: 4 }}>
                            <span className={`nhan ${LOP_MUC[p.mucDo]}`}>{TEN_MUC_DO[p.mucDo]} · {TEN_LOAI_KIEM[p.loai]}</span> {p.noiDung}
                            {p.canCu && <div className="mo chu-nho">Nguồn: {p.canCu}</div>}
                          </div>
                        ))}
                        {m === null && d.loai === "CHI_TIET" && <span className="mo chu-nho">Không có kết quả</span>}
                      </td>
                    </tr>
                  );
                })}
                {!dsDong.length && (
                  <tr><td colSpan={9} className="trong">{loc === "LOI_CB" ? "Không có dòng nào có lỗi hoặc cảnh báo." : "Không có dòng dữ liệu."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

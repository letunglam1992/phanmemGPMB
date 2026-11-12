/**
 * 1.3.6 (BĐ-6) — Trình nhập bản đồ từng bước, mở ngay sau khi nạp tệp (thay hộp "Đã nạp bản đồ" của 0.9.27):
 *   1. Thửa đất: số thửa dựng được, lớp ranh thửa phần mềm đã chọn và lý do, chỗ hở;
 *   2. Nút / nhãn thửa: dòng nào của nút thuộc tính là trường nào (sửa được, có chữ mẫu), tỷ lệ thửa đủ thông tin;
 *   3. Ranh GPMB: diện tích trong phạm vi GPMB ghi ở khung tờ, lớp khớp diện tích đó / lớp tô thửa ngoài phạm vi;
 *   4. Số tờ, chốt: số tờ của tệp (gợi ý từ số hiệu mảnh / tên tệp), lưu thành mẫu cấu hình của đơn vị.
 * Mọi giá trị là gợi ý; cán bộ xem rồi chốt. Thiết kế theo 4 tệp trích đo gCadas V8 thật (đọc tại chỗ, không lưu vào kho).
 */
import { useMemo, useState } from "react";
import { nutTheoLop, tenLopPl21, thuaPhuBoiLop, type CauHinhLop, type TruongNut } from "@gpmb/gis";
import { HopThoai, O } from "../../thanh-phan/chung";
import { type DuLieuBanDo, TEN_CO } from "./du-lieu";
import { TEN_TRUONG_NUT, loiSoToTep } from "./CauHinhLop";

export interface KetQuaNhanDien {
  cauHinh: CauHinhLop;
  soTo: string;
  /** Phạm vi thu hồi chọn ngay: vùng ranh khớp diện tích ghi, hoặc các thửa không bị lớp tô "ngoài phạm vi" phủ. */
  vungChon?: string[];
  thuaNgoaiTheoLop?: number;
  /** Lưu cấu hình thành mẫu của đơn vị */
  tenMau?: string;
}

const so = (n: number, le = 1) => n.toLocaleString("vi-VN", { maximumFractionDigits: le });
const BUOC = ["Thửa đất", "Nút, nhãn thửa", "Ranh GPMB", "Số tờ, chốt"] as const;

export function HopNhanDien(p: { dl: DuLieuBanDo; tep: string; soTo: string; sua: boolean; xong: (kq: KetQuaNhanDien) => void; moCauHinh: () => void; dong: () => void }) {
  const { dl } = p;
  const ch0 = dl.cauHinh;
  const [buoc, setBuoc] = useState(0);
  const ds = dl.kq.thua;
  const n = ds.length;
  const dem = (f: (t: (typeof ds)[number]) => unknown) => ds.filter(f).length;
  const tenLop = (l: number) => dl.ban.tenLop?.[l] ?? tenLopPl21(l) ?? "lớp địa phương";

  // Bước 2: ánh xạ dòng nút → trường (sửa được)
  const nut = ch0.nutThuocTinh;
  const mauNut = useMemo(() => (nut ? (nutTheoLop(dl.ban).get(nut.lop[0]!) ?? []).filter((d) => d.length >= 3) : []), [dl.ban, nut]);
  const soDong = mauNut.length ? Math.max(...mauNut.map((d) => d.length)) : 0;
  const [dong, setDong] = useState<Partial<Record<TruongNut, number>>>(() => ({ ...(nut?.dong ?? {}) }));
  const truongCuaDong = (i: number) => (Object.keys(dong) as TruongNut[]).find((k) => dong[k] === i) ?? "";
  const datDong = (i: number, t: TruongNut | "") => {
    const moi: Partial<Record<TruongNut, number>> = {};
    for (const [k, v] of Object.entries(dong)) if (v !== i && k !== t) moi[k as TruongNut] = v;
    if (t) moi[t] = i;
    setDong(moi);
  };
  const doiNut = nut && JSON.stringify(dong) !== JSON.stringify(nut.dong);

  // Bước 3: phạm vi thu hồi gợi ý
  const dtGhi = dl.khung?.dienTichGpmbGhi ?? null;
  const vungKhop = dtGhi ? dl.kq.vungGpmb.find((v) => Math.abs(v.dienTich - dtGhi.dienTich) <= Math.max(0.5, dtGhi.dienTich * 0.001)) : undefined;
  const lopNgoai = dl.khung?.lopThuaNgoai ?? null;
  const soThuaTrongLop = useMemo(() => (lopNgoai ? n - thuaPhuBoiLop(dl.ban, ds, lopNgoai.lop).size : 0), [dl.ban, ds, lopNgoai, n]);
  const [chonPhamVi, setChonPhamVi] = useState(true);

  // Bước 4: số tờ
  const thieuTo = dem((t) => !t.soTo);
  const goiYTo = dl.khung?.soToGoiY;
  const [soTo, setSoTo] = useState(p.soTo || (thieuTo >= n * 0.8 && goiYTo ? goiYTo.soTo : ""));
  const loiTo = loiSoToTep(soTo);
  const [luuMau, setLuuMau] = useState(false);
  const [tenMau, setTenMau] = useState(() => `Mẫu theo ${p.tep.replace(/\.(dgn|dxf)$/i, "")}`);

  const ketQua = (): KetQuaNhanDien => ({
    cauHinh: nut ? { ...ch0, nutThuocTinh: { ...nut, dong } } : ch0,
    soTo,
    ...(chonPhamVi && vungKhop ? { vungChon: [vungKhop.ma] } : {}),
    ...(chonPhamVi && !vungKhop && lopNgoai ? { thuaNgoaiTheoLop: lopNgoai.lop } : {}),
    ...(luuMau && tenMau.trim() ? { tenMau: tenMau.trim() } : {}),
  });

  const ghiChuTheo = (re: RegExp) => dl.ghiChuGoiY.filter((g) => re.test(g));
  const coDem: [string, number][] = Object.keys(TEN_CO).map((c) => [c, dem((t) => t.co.includes(c as never))] as [string, number]).filter(([, k]) => k > 0);

  return (
    <HopThoai
      tieuDe={`Nhập bản đồ: ${p.tep}`}
      rong={760}
      dong={p.dong}
      chan={
        <>
          <button className="nut" onClick={p.dong} title="Giữ cấu hình gợi ý, xem và chốt sau ở “Cấu hình lớp”">Để sau</button>
          <button className="nut" onClick={p.moCauHinh}>Cấu hình lớp chi tiết…</button>
          {buoc > 0 && <button className="nut" onClick={() => setBuoc(buoc - 1)}>← Quay lại</button>}
          {buoc < BUOC.length - 1 ? (
            <button className="nut nut-chinh" onClick={() => setBuoc(buoc + 1)}>Tiếp: {BUOC[buoc + 1]} →</button>
          ) : (
            <button className="nut nut-chinh" disabled={!p.sua || !!loiTo} onClick={() => p.xong(ketQua())}>Chốt và dựng thửa</button>
          )}
        </>
      }
    >
      <ol className="buoc-nhap" data-buoc-nhap={buoc + 1}>
        {BUOC.map((b, i) => (
          <li key={b} className={i === buoc ? "dang" : i < buoc ? "xong" : ""}>
            <button className="nut-lien-ket" onClick={() => setBuoc(i)}>{i + 1}. {b}</button>
          </li>
        ))}
      </ol>

      {buoc === 0 && (
        <div data-buoc="thua">
          {dl.khung?.theoMau && <div className="thong-bao thong-bao-xanh chu-nho" data-theo-mau>Dùng mẫu cấu hình “{dl.khung.theoMau}” của đơn vị.</div>}
          <p className="mt-0">
            Dựng được <b>{so(n, 0)}</b> thửa{dl.kq.thongKe.soVungNhoGiuLai ? <> (gồm <b>{dl.kq.thongKe.soVungNhoGiuLai}</b> thửa nhỏ hơn {so(ch0.dienTichToiThieu)} m² có số thửa — giữ lại)</> : ""}; <b>{so(dem((t) => t.soThua), 0)}</b> thửa đọc được số thửa.
          </p>
          <table className="bang">
            <thead><tr><th className="so">Lớp ranh thửa</th><th>Tên lớp</th></tr></thead>
            <tbody>{ch0.ranhThua.map((l) => <tr key={l}><td className="so"><b>{l}</b></td><td className="chu-nho">{tenLop(l)}</td></tr>)}</tbody>
          </table>
          {ghiChuTheo(/ranh thửa|Ranh thửa/).map((g) => <div key={g} className="thong-bao thong-bao-xanh chu-nho">{g}</div>)}
          {(dl.kq.dauTreo?.length ?? 0) > 0 ? (
            <div className="thong-bao thong-bao-vang chu-nho" data-dau-treo>
              Có <b>{dl.kq.dauTreo!.length}</b> chỗ hở trên lớp ranh thửa (vòng đỏ trên bản đồ): đầu mút suýt chạm đường khác (≤ 0,5 m) nên thửa có thể không khép. Nếu là chỗ hở do vẽ không bắt điểm, đặt “Nối đầu mút hở” ở Cấu hình lớp chi tiết.
            </div>
          ) : (
            <div className="mo chu-nho">Không thấy chỗ hở (đầu mút suýt chạm đường khác) trên lớp ranh thửa.</div>
          )}
        </div>
      )}

      {buoc === 1 && (
        <div data-buoc="nhan">
          {nut ? (
            <>
              <p className="mt-0">Nút chữ thuộc tính trên lớp <b>{nut.lop.join(", ")}</b> ({so(mauNut.length, 0)} nút). Kiểm tra từng dòng là trường nào — đổi nếu phần mềm nhận sai:</p>
              <div className="bang-cuon" style={{ maxHeight: 280 }}>
                <table className="bang">
                  <thead><tr><th className="so">Dòng</th><th>Chữ mẫu (3 nút đầu)</th><th>Là trường</th></tr></thead>
                  <tbody>
                    {Array.from({ length: soDong }, (_, i) => (
                      <tr key={i}>
                        <td className="so">{i + 1}</td>
                        <td className="chu-nho">{mauNut.slice(0, 3).map((d) => d[i] || "—").join(" · ")}</td>
                        <td>
                          <select aria-label={`Dòng ${i + 1} của nút là`} value={truongCuaDong(i)} disabled={!p.sua} onChange={(e) => datDong(i, e.target.value as TruongNut | "")}>
                            <option value="">— Bỏ qua —</option>
                            {(Object.keys(TEN_TRUONG_NUT) as TruongNut[]).map((k) => <option key={k} value={k}>{TEN_TRUONG_NUT[k]}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {doiNut && <div className="thong-bao thong-bao-vang chu-nho">Đã đổi trường của nút — số liệu dưới đây là của cách nhận cũ; bấm “Chốt và dựng thửa” ở bước cuối để dựng lại.</div>}
            </>
          ) : (
            <p className="mt-0">Bản đồ không có nút thuộc tính; nhãn đọc từ lớp: nhãn thửa {ch0.nhanThua.join(", ") || "—"}, số thửa {ch0.soThua.join(", ") || "—"}, loại đất {(ch0.loaiDat ?? []).join(", ") || "—"}, diện tích {(ch0.dienTich ?? []).join(", ") || "—"}, chủ sử dụng {ch0.chuSuDung.join(", ") || "—"}.</p>
          )}
          <div className="luoi" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, textAlign: "center", marginTop: 8 }}>
            {[["Số thửa", dem((t) => t.soThua)], ["Loại đất", dem((t) => t.loaiDatBanDo)], ["Diện tích ghi", dem((t) => t.dienTichGhi !== null)], ["Chủ sử dụng", dem((t) => t.chuSuDung)]].map(([ten, k]) => (
              <div key={ten as string} className="the" style={{ padding: 6 }}><div className="chu-nho mo">{ten}</div><b>{so(k as number, 0)}/{so(n, 0)}</b></div>
            ))}
          </div>
          {coDem.length > 0 && <div className="mo chu-nho" style={{ marginTop: 6 }}>Cờ cần rà: {coDem.map(([c, k]) => `${TEN_CO[c]} ${k}`).join(" · ")} — xem ở thẻ “Rà lỗi nhận diện” sau khi chốt.</div>}
        </div>
      )}

      {buoc === 2 && (
        <div data-buoc="ranh">
          {dtGhi ? <p className="mt-0">Bản đồ ghi: <b>“{dtGhi.chu}”</b>.</p> : <p className="mt-0">Khung tờ không ghi diện tích trong phạm vi GPMB (hoặc ghi trống).</p>}
          {vungKhop ? (
            <label className="thong-bao thong-bao-xanh chu-nho" style={{ display: "flex", gap: 8 }}>
              <input type="checkbox" checked={chonPhamVi} onChange={(e) => setChonPhamVi(e.target.checked)} />
              <span>Vùng {vungKhop.ma} trên lớp {ch0.ranhGpmb.join(", ")} có diện tích <b>{so(vungKhop.dienTich)} m²</b>, khớp diện tích ghi — chọn vùng này làm phạm vi thu hồi.</span>
            </label>
          ) : lopNgoai ? (
            <label className="thong-bao thong-bao-xanh chu-nho" style={{ display: "flex", gap: 8 }}>
              <input type="checkbox" checked={chonPhamVi} onChange={(e) => setChonPhamVi(e.target.checked)} />
              <span>Lớp {lopNgoai.lop} tô các thửa ngoài phạm vi GPMB; <b>{so(soThuaTrongLop, 0)}</b> thửa còn lại có tổng <b>{so(lopNgoai.dienTichTrong)} m²</b>{dtGhi ? <> (lệch {so(Math.abs(lopNgoai.dienTichTrong - dtGhi.dienTich))} m² so với số ghi)</> : ""} — chọn các thửa này làm phạm vi thu hồi.</span>
            </label>
          ) : (
            <p className="chu-nho">
              {dl.kq.vungGpmb.length ? <>Lớp {ch0.ranhGpmb.join(", ")} có <b>{dl.kq.vungGpmb.length}</b> vùng ứng viên — chọn vùng ở mục “Phạm vi thu hồi” trên màn Bản đồ.</> : <>Chưa có vùng ranh GPMB: chọn lớp ranh ở Cấu hình lớp, nhập ranh (tọa độ mốc, DGN khác, vẽ) hoặc chọn thửa trực tiếp ở mục “Phạm vi thu hồi”.</>}
              {dtGhi ? " Sau khi chọn, thẻ Kiểm tra bản đồ đối chiếu tổng diện tích thu hồi với số ghi trên." : ""}
            </p>
          )}
          {ghiChuTheo(/GPMB|thu hồi/).filter((g) => !/ranh thửa/.test(g)).map((g) => <div key={g} className="mo chu-nho">• {g}</div>)}
        </div>
      )}

      {buoc === 3 && (
        <div data-buoc="chot">
          <O nhan="Số tờ bản đồ của tệp" goiY={goiYTo && thieuTo ? `Gợi ý “${goiYTo.soTo}” (${goiYTo.nguon}); ${thieuTo}/${n} thửa không ghi số tờ trong nhãn / nút. Áp cho mọi thửa của tệp.` : "Bỏ trống thì dùng số tờ đọc trong nhãn / nút của thửa."}>
            <input value={soTo} aria-label="Số tờ bản đồ của tệp" className={loiTo ? "loi-nhap" : ""} placeholder="vd. TĐ 52-2025" onChange={(e) => setSoTo(e.target.value)} disabled={!p.sua} />
          </O>
          {loiTo && <div className="thong-bao thong-bao-do chu-nho">{loiTo}</div>}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <input type="checkbox" checked={luuMau} onChange={(e) => setLuuMau(e.target.checked)} disabled={!p.sua} />
            <span>Lưu cấu hình lớp này thành mẫu của đơn vị (lần sau nạp bản đồ cùng kiểu, phần mềm thử mẫu trước)</span>
          </label>
          {luuMau && <O nhan="Tên mẫu" className="mt-10"><input value={tenMau} aria-label="Tên mẫu cấu hình" maxLength={60} onChange={(e) => setTenMau(e.target.value)} /></O>}
          <div className="mo chu-nho" style={{ marginTop: 10 }}>Chốt: lưu cấu hình lớp (và phạm vi thu hồi đã tích ở bước 3) cho tệp này; sửa lại được ở “Cấu hình lớp”, mục “Phạm vi thu hồi”. Dữ liệu bản đồ là đề xuất — đối chiếu hồ sơ đo đạc trước khi lập phương án.</div>
        </div>
      )}
    </HopThoai>
  );
}

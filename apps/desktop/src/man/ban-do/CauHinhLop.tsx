import { useMemo, useState } from "react";
import { thongKeLop, tenLopPl21, type CauHinhLop, type TruongNut } from "@gpmb/gis";
import { HopThoai, O } from "../../thanh-phan/chung";
import { type DuLieuBanDo } from "./du-lieu";

export const TEN_TRUONG_NUT: Record<TruongNut, string> = { soTo: "Số tờ", soThua: "Số thửa", loaiDat: "Loại đất", chuSuDung: "Chủ sử dụng" };

export const dsLop = (x: string) => [...new Set(x.split(/[,;\s]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0))];

/** Cấu hình lớp: thống kê lớp trong tệp để cán bộ chọn; gợi ý tự động chỉ là điểm xuất phát. */
export function HopCauHinhLop(p: { dl: DuLieuBanDo; sua: boolean; apDung: (ch: CauHinhLop | null) => void; dong: () => void }) {
  const tk = useMemo(() => thongKeLop(p.dl.ban), [p.dl.ban]);
  const c0 = p.dl.cauHinh;
  const [f, setF] = useState(() => ({
    ranhThua: c0.ranhThua.join(", "),
    nhanThua: c0.nhanThua.join(", "),
    soThua: c0.soThua.join(", "),
    soTo: c0.soTo.join(", "),
    chuSuDung: c0.chuSuDung.join(", "),
    ranhGpmb: c0.ranhGpmb.join(", "),
    nhanHienTrang: (c0.nhanHienTrang ?? []).join(", "),
    dienTichToiThieu: String(c0.dienTichToiThieu),
    lechPhanTram: String(Math.round(c0.lechDienTichChoPhep * 1000) / 10),
    lopNut: c0.nutThuocTinh?.lop.join(", ") ?? "",
    dong: Object.fromEntries((["soTo", "soThua", "loaiDat", "chuSuDung"] as TruongNut[]).map((k) => [k, c0.nutThuocTinh?.dong[k] !== undefined ? String(c0.nutThuocTinh.dong[k]! + 1) : ""])) as Record<TruongNut, string>,
  }));
  const dat = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const dtMin = Number(f.dienTichToiThieu.replace(",", "."));
  const lech = Number(f.lechPhanTram.replace(",", "."));
  const loi: string[] = [];
  if (!dsLop(f.ranhThua).length) loi.push("Chưa có lớp ranh thửa.");
  if (!(dtMin >= 0)) loi.push("Diện tích tối thiểu không hợp lệ.");
  if (!(lech > 0 && lech < 100)) loi.push("Tỷ lệ lệch diện tích phải trong khoảng (0; 100) %.");
  const lopNut = dsLop(f.lopNut);
  const dongNut: Partial<Record<TruongNut, number>> = {};
  for (const [k, v] of Object.entries(f.dong)) {
    if (!v.trim()) continue;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) loi.push(`Dòng của “${TEN_TRUONG_NUT[k as TruongNut]}” phải là số nguyên ≥ 1.`);
    else dongNut[k as TruongNut] = n - 1;
  }
  if (new Set(Object.values(dongNut)).size !== Object.values(dongNut).length) loi.push("Hai trường của nút thuộc tính trùng dòng.");
  if (lopNut.length && !Object.keys(dongNut).length) loi.push("Đã chọn lớp nút thuộc tính nhưng chưa chọn dòng nào.");
  const ketQua = (): CauHinhLop => ({
    ranhThua: dsLop(f.ranhThua),
    nhanThua: dsLop(f.nhanThua),
    soThua: dsLop(f.soThua),
    soTo: dsLop(f.soTo),
    chuSuDung: dsLop(f.chuSuDung),
    ranhGpmb: dsLop(f.ranhGpmb),
    nhanHienTrang: dsLop(f.nhanHienTrang),
    dienTichToiThieu: dtMin,
    lechDienTichChoPhep: lech / 100,
    nutThuocTinh: lopNut.length ? { lop: lopNut, dong: dongNut } : null,
  });
  const truong = (k: "ranhThua" | "nhanThua" | "soThua" | "soTo" | "chuSuDung" | "ranhGpmb" | "nhanHienTrang", nhan: string, goiY: string) => (
    <O nhan={nhan} goiY={goiY}><input value={f[k]} onChange={(e) => dat(k, e.target.value)} disabled={!p.sua} /></O>
  );
  return (
    <HopThoai
      tieuDe="Cấu hình lớp bản đồ"
      rong={980}
      dong={p.dong}
      chan={
        <>
          {!p.dl.laGoiY && p.sua && <button className="nut" onClick={() => p.apDung(null)}>Bỏ chốt, dùng gợi ý</button>}
          <button className="nut" onClick={p.dong}>Đóng</button>
          {p.sua && <button className="nut nut-chinh" disabled={loi.length > 0} onClick={() => p.apDung(ketQua())}>Chốt cấu hình và dựng lại thửa</button>}
        </>
      }
    >
      <div className="luoi" style={{ gap: 16, alignItems: "start", gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)" }}>
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div className="mo chu-nho">Nhiều lớp cách nhau bằng dấu phẩy. {p.dl.laGoiY ? "Các giá trị đang là gợi ý từ cấu trúc tệp — cán bộ đối chiếu bảng thống kê bên phải trước khi chốt." : "Cấu hình đã được chốt cho tệp này."}</div>
          <div className="luoi" style={{ gap: 8, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {truong("ranhThua", "Ranh thửa", "đường khép thửa")}
            {truong("nhanThua", "Nhãn thửa", "loại đất, số thửa, DT")}
            {truong("ranhGpmb", "Ranh GPMB / thửa thu hồi", "vùng khép kín")}
            {truong("soThua", "Số thửa (riêng)", "")}
            {truong("soTo", "Số tờ (riêng)", "")}
            {truong("chuSuDung", "Chủ sử dụng (riêng)", "")}
            {truong("nhanHienTrang", "Nhãn hiện trạng GPMB", "chỉ đối chiếu")}
          </div>
          <div className="the" style={{ padding: 10 }}>
            <b className="chu-nho">Nút chữ thuộc tính thửa (gCadas)</b>
            <div className="mo chu-nho" style={{ margin: "2px 0 8px" }}>Nút chữ nhiều dòng đặt trong thửa; nút được gán cho thửa chứa dòng đầu. Để trống lớp nếu tệp không có.</div>
            <div className="luoi" style={{ gap: 8, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              <O nhan="Lớp nút" className="ca-hang"><input value={f.lopNut} onChange={(e) => dat("lopNut", e.target.value)} disabled={!p.sua} /></O>
              {(Object.keys(TEN_TRUONG_NUT) as TruongNut[]).map((k) => (
                <O key={k} nhan={`${TEN_TRUONG_NUT[k]}: dòng`}>
                  <input value={f.dong[k]} inputMode="numeric" onChange={(e) => setF({ ...f, dong: { ...f.dong, [k]: e.target.value } })} disabled={!p.sua || !lopNut.length} />
                </O>
              ))}
            </div>
          </div>
          <div className="luoi" style={{ gap: 8, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <O nhan="Bỏ vùng nhỏ hơn (m²)" goiY="mảnh vụn do vẽ chồng nét"><input value={f.dienTichToiThieu} onChange={(e) => dat("dienTichToiThieu", e.target.value)} disabled={!p.sua} /></O>
            <O nhan="Cờ lệch DT ghi/hình học (%)"><input value={f.lechPhanTram} onChange={(e) => dat("lechPhanTram", e.target.value)} disabled={!p.sua} /></O>
          </div>
          {loi.length > 0 && <div className="thong-bao thong-bao-do chu-nho">{loi.join(" ")}</div>}
          {p.dl.ghiChuGoiY.length > 0 && <div className="mo chu-nho">Gợi ý: {p.dl.ghiChuGoiY.join(" ")}</div>}
        </div>
        <div className="bang-cuon" style={{ maxHeight: 440 }}>
          <table className="bang">
            <thead><tr><th className="so">Lớp</th><th>Theo PL 21 TT 26/2024</th><th className="so">Đường</th><th className="so">Vùng</th><th className="so">Chữ</th><th className="so">Nút</th><th>Chữ mẫu</th></tr></thead>
            <tbody>
              {tk.map((x) => (
                <tr key={x.lop}>
                  <td className="so"><b>{x.lop}</b></td>
                  <td className="chu-nho mo">{tenLopPl21(x.lop) ?? "(lớp trống — địa phương dùng)"}</td>
                  <td className="so">{x.soDuong || ""}</td>
                  <td className="so">{x.soVung || ""}</td>
                  <td className="so">{x.soChu || ""}</td>
                  <td className="so">{x.soNut || ""}</td>
                  <td className="chu-nho mo" style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={x.mau.join(" · ")}>{x.mau.join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </HopThoai>
  );
}

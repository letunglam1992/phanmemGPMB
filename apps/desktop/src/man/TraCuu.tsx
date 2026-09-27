import { useMemo, useState } from "react";
import { BO_CHINH_SACH, DON_GIA, DANH_MUC_XA, type DongDonGia } from "../du-lieu";
import { ChonGiaDat } from "../thanh-phan/ChonGiaDat";

const NGUON: { ma: DongDonGia["nguon"]; ten: string }[] = [
  { ma: "QĐ32", ten: "Nhà, công trình – QĐ 32/2025" },
  { ma: "PL VIII", ten: "Cây trồng, thủy sản – PL VIII QĐ 106/2025" },
  { ma: "PL V", ten: "Di dời vật nuôi – PL V QĐ 106/2025" },
];

export function TraCuu() {
  const [tab, setTab] = useState<string>("QĐ32");
  const [q, setQ] = useState("");
  const [giaDat, setGiaDat] = useState(false);
  const [xa, setXa] = useState(DANH_MUC_XA[0]!);
  const ds = useMemo(() => {
    const tu = q.toLowerCase().split(/\s+/).filter(Boolean);
    return DON_GIA.filter((r) => r.nguon === tab && tu.every((t) => `${r.ma} ${r.nhom} ${r.ten}`.toLowerCase().includes(t)));
  }, [tab, q]);
  const cs = BO_CHINH_SACH["sonla-2026-03-31"]!;
  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <h1>Tra cứu đơn giá, giá đất, chính sách</h1>
          <div className="mo-ta">Dữ liệu trích xuất từ văn bản gốc, mỗi dòng giữ mã nguồn và số trang để đối chiếu (docs/07).</div>
        </div>
      </div>
      <div className="tab">
        {NGUON.map((n) => <button key={n.ma} className={tab === n.ma ? "chon" : ""} onClick={() => setTab(n.ma)}>{n.ten}</button>)}
        <button className={tab === "GIA_DAT" ? "chon" : ""} onClick={() => setTab("GIA_DAT")}>Bảng giá đất – NQ 152/2025</button>
        <button className={tab === "CS" ? "chon" : ""} onClick={() => setTab("CS")}>Bộ chính sách áp dụng</button>
      </div>
      {NGUON.some((n) => n.ma === tab) && (
        <div className="the">
          <div className="the-dau">
            <input placeholder="Tìm: tên, nhóm, mã… (nhiều từ)" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 380 }} />
            <span className="mo chu-nho">{ds.length} dòng</span>
          </div>
          <div className="bang-cuon" style={{ maxHeight: "calc(100vh - 290px)" }}>
            <table className="bang">
              <thead><tr><th>Mã nguồn</th><th>Hạng mục</th><th>ĐVT</th><th className="so">Đơn giá (đ)</th><th className="so">Mật độ</th><th>Trang</th></tr></thead>
              <tbody>
                {ds.slice(0, 600).map((r) => (
                  <tr key={r.ma + r.ten}>
                    <td className="chu-nho" style={{ whiteSpace: "nowrap" }}>{r.ma}</td>
                    <td>{r.ten}<div className="can-cu">{r.nhom}</div></td>
                    <td>{r.donVi}</td>
                    <td className="so">{r.donGia.toLocaleString("vi-VN")}</td>
                    <td className="so">{r.matDo ?? ""}</td>
                    <td>{r.trang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === "GIA_DAT" && (
        <div className="the the-than">
          <div className="nhom-nut" style={{ alignItems: "center" }}>
            <select value={xa} onChange={(e) => setXa(e.target.value)}>{DANH_MUC_XA.map((x) => <option key={x}>{x}</option>)}</select>
            <button className="nut nut-chinh" onClick={() => setGiaDat(true)}>Mở bảng giá của xã</button>
          </div>
          <p className="mo chu-nho">Đơn vị: nghìn đồng/m². 26 dòng đúng văn bản nhưng bất thường được đánh dấu cảnh báo (policy/nguon/nq152-can-doi-chieu.md).</p>
          {giaDat && <ChonGiaDat xa={xa} loaiDat="ONT" dong={() => setGiaDat(false)} chon={() => undefined} />}
        </div>
      )}
      {tab === "CS" && (
        <div className="luoi luoi-2">
          <div className="the the-than">
            <h3>{cs.ten}</h3>
            <p className="chu-nho">Mã: {cs.ma} · Hiệu lực từ {cs.hieuLucTu} · Trạng thái: {cs.trangThai}</p>
            <table className="bang">
              <tbody>
                <tr><td>Làm tròn</td><td>Diện tích {cs.lamTron.dienTichSoLe} số lẻ; tiền {cs.lamTron.cach === "LEN" ? "làm tròn lên" : cs.lamTron.cach} đến {cs.lamTron.tienBuoc.toLocaleString("vi-VN")} đ ở cấp hộ</td></tr>
                <tr><td>Nhà, công trình</td><td>min(max((1 + {Number(cs.nhaCongTrinh.tyLeCongThem) * 100}%) × Tgt; {Number(cs.nhaCongTrinh.san) * 100}% G1); {Number(cs.nhaCongTrinh.tran) * 100}% G1)</td></tr>
                <tr><td>Cây trồng</td><td>≤ {Number(cs.cayTrong.tyLeVuotMatDo) * 100}% mật độ hưởng 100%; phần vượt {Number(cs.cayTrong.tyLePhanVuot) * 100}%</td></tr>
                <tr><td>Ổn định đời sống</td><td>{cs.onDinhDoiSong.kgGaoNhanKhauThang} kg gạo/khẩu/tháng; {cs.onDinhDoiSong.nhom.length} nhóm tỷ lệ</td></tr>
                <tr><td>Chuyển đổi nghề</td><td>Hệ số mặc định {cs.chuyenDoiNghe.heSoMacDinh}; {Object.entries(cs.chuyenDoiNghe.heSoTheoNhom).map(([k, v]) => `${k}: ${v}`).join("; ")}</td></tr>
                <tr><td>Mồ mả</td><td>Mộ xây {Number(cs.moMa.mucXay).toLocaleString("vi-VN")} đ; không xây {Number(cs.moMa.mucKhongXay).toLocaleString("vi-VN")} đ</td></tr>
              </tbody>
            </table>
          </div>
          <div className="the the-than">
            <h3>Căn cứ</h3>
            <ul className="chu-nho">
              {[cs.nhaCongTrinh, cs.cayTrong, cs.onDinhDoiSong, cs.chuyenDoiNghe, cs.tamCu, cs.moMa, cs.vatNuoi, cs.lamTron].flatMap((k) => k.canCu).map((c, i) => (
                <li key={i}><b>{c.vanBan}</b> – {c.viTri}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

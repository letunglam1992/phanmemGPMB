import { useState } from "react";
import { tenDayDu } from "../../van-ban/loai-dat";
import type { LoaiDuong, LoaiVatNuoi } from "@gpmb/core";
import { thuTinh } from "../../bieu-thuc";
import { taoId, type DuAn, type Ho, type TaiSan, type Thua } from "../../mo-hinh";
import { ChonDonGia } from "../../thanh-phan/ChonDonGia";
import { Chon } from "../../thanh-phan/Chon";
import { OSo } from "../../thanh-phan/OSo";
import { ONgay } from "../../thanh-phan/ONgay";
import { useUngDung } from "../../ung-dung";
import { duAnCuaHo } from "../../dot-thu-hoi";
import { TEN_K3, bangK3 } from "../../tinh-ho";
import { chonTheoMoc, type BoChinhSach } from "@gpmb/core";

const TEN_LOAI: Record<TaiSan["loai"], [string, string]> = {
  NHA_CT: ["Nhà, CT", "nhan-duong"],
  CAY: ["Cây trồng", "nhan-xanh"],
  VAT_NUOI: ["Vật nuôi", "nhan-vang"],
  KHAC: ["Ngoài DM", "nhan-tim"],
  SUA_CHUA: ["Sửa chữa", "nhan-xam"],
};
const VAT_NUOI: Record<LoaiVatNuoi, string> = {
  TRAU_BO_NGUA: "Trâu, bò, ngựa",
  LON: "Lợn",
  DE_CUU_HUOU_CHO_THO_NHIM: "Dê, cừu, hươu, chó, thỏ, nhím",
  GIA_CAM: "Gia cầm",
  CON_TRUNG_SINH_VAT_NHO: "Côn trùng, sinh vật nhỏ",
};

export function TabKiemDem({ h, doi, duAn }: { h: Ho; doi: (h: Ho) => void; duAn: DuAn }) {
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn);
  const ngayTB = duAnCuaHo(duAn, h).ngayThongBao;
  const [them, setThem] = useState<{ thuaId: string; nguon: "QĐ32" | "PL VIII" } | null>(null);
  const [dot, setDot] = useState<number | "TAT_CA">("TAT_CA");
  const soDot = Math.max(1, ...h.taiSan.map((t) => t.dot));
  const sua = (id: string, p: Partial<TaiSan>) => doi({ ...h, taiSan: h.taiSan.map((t) => (t.id === id ? ({ ...t, ...p } as TaiSan) : t)) });
  const doiCho = (id: string, huong: -1 | 1) => {
    const ds = [...h.taiSan];
    const i = ds.findIndex((t) => t.id === id);
    const cung = ds.map((t, j) => ({ t, j })).filter((x) => x.t.thuaId === ds[i]!.thuaId);
    const k = cung.findIndex((x) => x.j === i) + huong;
    if (k < 0 || k >= cung.length) return;
    const j = cung[k]!.j;
    [ds[i], ds[j]] = [ds[j]!, ds[i]!];
    doi({ ...h, taiSan: ds });
  };
  const themTs = (ts: TaiSan) => doi({ ...h, taiSan: [...h.taiSan, ts] });
  const dotMoi = dot === "TAT_CA" ? soDot : dot;

  if (h.thua.length === 0) return <div className="the trong">Thêm thửa đất trước khi kiểm đếm tài sản.</div>;
  return (
    <div className="luoi">
      <div className="nhom-nut giua-doc">
        <span className="chu-nho mo">Đợt kiểm đếm:</span>
        <button className={`nut nut-nho ${dot === "TAT_CA" ? "nut-chinh" : ""}`} onClick={() => setDot("TAT_CA")}>Tất cả</button>
        {Array.from({ length: soDot }, (_, i) => i + 1).map((d) => <button key={d} className={`nut nut-nho ${dot === d ? "nut-chinh" : ""}`} onClick={() => setDot(d)}>Đợt {d}</button>)}
        <button className="nut nut-nho" onClick={() => setDot(soDot + 1)}>+ Đợt bổ sung</button>
        <span className="tach" />
        <span className="mo chu-nho">Khối lượng nhập được biểu thức, vd. =10*9.8 hoặc =5+6+3</span>
      </div>
      {h.thua.map((t) => (
        <TheThua key={t.id} t={t} cs={cs} ngayTB={ngayTB} suaThua={(p) => doi({ ...h, thua: h.thua.map((x) => (x.id === t.id ? { ...x, ...p } : x)) })} ds={h.taiSan.filter((x) => x.thuaId === t.id && (dot === "TAT_CA" || x.dot === dot))} sua={sua} xoa={(id) => doi({ ...h, taiSan: h.taiSan.filter((x) => x.id !== id) })} doiCho={doiCho}
          themDanhMuc={(nguon) => setThem({ thuaId: t.id, nguon })}
          themKhac={() => themTs({ id: taoId(), thuaId: t.id, dot: dotMoi, loai: "KHAC", ten: "", donVi: "", khoiLuong: "", heSo: "1", donGia: "", canCu: "", phan: "HO_TRO" })}
          themVatNuoi={() => themTs({ id: taoId(), thuaId: t.id, dot: dotMoi, loai: "VAT_NUOI", ten: "Di dời vật nuôi", loaiDuong: "CUNG_HOA", loaiVatNuoi: "LON", khoiLuong: "", quangDuongKm: "" })}
          themSuaChua={() => {
            const nha = h.taiSan.find((x) => x.thuaId === t.id && x.loai === "NHA_CT");
            themTs({ id: taoId(), thuaId: t.id, dot: dotMoi, loai: "SUA_CHUA", ten: `Sửa chữa phần còn lại${nha ? ` – ${nha.ten}` : ""}`, taiSanGocId: nha?.id, soTien: "", canCu: "", xacNhan: "" });
          }}
          nhaThua={h.taiSan.filter((x) => x.thuaId === t.id && x.loai === "NHA_CT")}
        />
      ))}
      {them && (
        <ChonDonGia
          tieuDe={them.nguon === "QĐ32" ? "Đơn giá nhà, công trình – QĐ 32/2025/QĐ-UBND" : "Đơn giá cây trồng – PL VIII QĐ 106/2025/QĐ-UBND"}
          nguon={[them.nguon]}
          dong={() => setThem(null)}
          chon={(r) => {
            const coSo = { id: taoId(), thuaId: them.thuaId, dot: dotMoi, ten: r.ten, maDonGia: r.ma, donVi: r.donVi, donGia: String(r.donGia) };
            themTs(
              r.nguon === "QĐ32"
                ? { ...coSo, loai: "NHA_CT", khoiLuong: "", cachTinh: "THIET_HAI_THUC_TE", phan: "BOI_THUONG", canCu: r.nhom }
                : { ...coSo, loai: "CAY", soLuong: "", matDoHa: r.matDo ? String(r.matDo) : null },
            );
            setThem(null);
          }}
        />
      )}
    </div>
  );
}

function TheThua(p: {
  t: Thua;
  cs: BoChinhSach;
  ngayTB: string;
  suaThua: (p: Partial<Thua>) => void;
  ds: TaiSan[];
  sua: (id: string, p: Partial<TaiSan>) => void;
  xoa: (id: string) => void;
  doiCho: (id: string, h: -1 | 1) => void;
  themDanhMuc: (n: "QĐ32" | "PL VIII") => void;
  themKhac: () => void;
  themVatNuoi: () => void;
  themSuaChua: () => void;
  nhaThua: TaiSan[];
}) {
  const { t, ds, sua } = p;
  return (
    <div className="the">
      <div className="the-dau">
        <h3>Thửa {t.soThua || "?"}, tờ {t.soTo || "?"}</h3>
        <span className="mo chu-nho">{tenDayDu(t.loaiDat)} · DT thu hồi {t.dienTichThuHoi || "—"} m²</span>
        {p.cs.hoTroKhac?.cayKhongDuDieuKien && (
          <Chon value={t.cayK7 ?? ""} aria-label={`Cây trồng thửa ${t.soThua} tờ ${t.soTo}`} title={`Khoản 7 Điều 6 QĐ 14/2026: ${p.cs.hoTroKhac.cayKhongDuDieuKien.dieuKien}`} style={{ maxWidth: 330 }} onChange={(e) => p.suaThua({ cayK7: (e.target.value || undefined) as "A" | "B" | undefined })}>
            <option value="">Cây trồng: bồi thường</option>
            <option value="A">Cây: hỗ trợ 100% (k7a — đất đủ ĐK bồi thường, sai mục đích)</option>
            <option value="B">Cây: hỗ trợ 80% (k7b — đất không đủ ĐK bồi thường)</option>
          </Chon>
        )}
        <div className="phai">
          <button className="nut nut-nho" onClick={() => p.themDanhMuc("QĐ32")}>+ Nhà, công trình (QĐ 32)</button>
          <button className="nut nut-nho" onClick={() => p.themDanhMuc("PL VIII")}>+ Cây trồng (PL VIII)</button>
          <button className="nut nut-nho" onClick={p.themVatNuoi}>+ Di dời vật nuôi</button>
          <button className="nut nut-nho" onClick={p.themKhac}>+ Ngoài danh mục</button>
          <button className="nut nut-nho" title="Điều 5 QĐ 14/2026 (điểm a khoản 11 Điều 3 NQ 254/2025/QH15): nhà, công trình phục vụ đời sống phá dỡ một phần mà phần còn lại vẫn bảo đảm tiêu chuẩn kỹ thuật — bồi thường chi phí sửa chữa theo thực tế; UBND cấp xã lập dự toán, phê duyệt trong phương án" onClick={p.themSuaChua}>+ Sửa chữa phần còn lại (Đ5 QĐ14)</button>
        </div>
      </div>
      <div className="bang-cuon">
        <table className="bang">
          <thead>
            <tr><th style={{ width: 54 }}>TT</th><th style={{ width: 84 }}>Loại</th><th>Tài sản</th><th style={{ width: 70 }}>ĐVT</th><th style={{ width: 150 }}>Khối lượng / số lượng</th><th className="so" style={{ width: 120 }}>Đơn giá (đ)</th><th style={{ width: 380 }}>Tham số tính</th><th style={{ width: 50 }}>Đợt</th><th style={{ width: 30 }} /></tr>
          </thead>
          <tbody>
            {ds.map((x, i) => {
              const klVao = x.loai === "CAY" ? x.soLuong : x.loai === "SUA_CHUA" ? "" : x.khoiLuong;
              const kl = klVao ? thuTinh(klVao) : { giaTri: null, loi: "Chưa nhập" };
              return (
                <tr key={x.id}>
                  <td className="khong-xuong-dong">
                    {i + 1}
                    <button className="nut nut-chu nut-nho" title="Lên" onClick={() => p.doiCho(x.id, -1)}>↑</button>
                  </td>
                  <td><span className={`nhan ${TEN_LOAI[x.loai][1]}`}>{TEN_LOAI[x.loai][0]}</span></td>
                  <td>
                    {x.loai === "VAT_NUOI" ? (
                      <Chon value={x.loaiVatNuoi} onChange={(e) => sua(x.id, { loaiVatNuoi: e.target.value as LoaiVatNuoi })}>
                        {Object.entries(VAT_NUOI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Chon>
                    ) : (
                      <input value={x.ten} onChange={(e) => sua(x.id, { ten: e.target.value })} />
                    )}
                    {"maDonGia" in x && <div className="can-cu">{x.maDonGia}</div>}
                  </td>
                  <td>
                    {x.loai === "KHAC" ? <input value={x.donVi} onChange={(e) => sua(x.id, { donVi: e.target.value })} /> : x.loai === "VAT_NUOI" ? (VAT_NUOI_DV[x.loaiVatNuoi]) : x.loai === "SUA_CHUA" ? "đồng" : x.donVi}
                  </td>
                  {x.loai === "SUA_CHUA" ? <td className="mo chu-nho">Theo dự toán</td> : <td data-lich-su={`taiSan:${x.id}.${x.loai === "CAY" ? "soLuong" : "khoiLuong"}`} data-lich-su-ten={`${x.loai === "CAY" ? "Số lượng" : "Khối lượng"} "${x.ten}"`}>
                    <input className={`o-so ${klVao && kl.loi ? "loi-nhap" : ""}`} value={klVao} title={kl.loi ?? ""} onChange={(e) => sua(x.id, x.loai === "CAY" ? { soLuong: e.target.value } : { khoiLuong: e.target.value })} />
                    {klVao.startsWith("=") && kl.giaTri && <div className="chu-nho mo" style={{ textAlign: "right" }}>= {kl.giaTri.toString().replace(".", ",")}</div>}
                    {klVao && kl.loi && <div className="chu-nho" style={{ color: "var(--do)" }}>{kl.loi}</div>}
                  </td>}
                  <td className="so" data-lich-su={`taiSan:${x.id}.donGia`} data-lich-su-ten={`Đơn giá "${x.ten}"`}>
                    {x.loai === "SUA_CHUA" ? <OSo className={`o-so ${x.soTien ? "" : "loi-nhap"}`} aria-label="Chi phí sửa chữa theo dự toán" title="Chi phí sửa chữa theo dự toán được duyệt (đ)" value={x.soTien} onChange={(v) => sua(x.id, { soTien: v })} /> : x.loai === "KHAC" || x.loai === "NHA_CT" ? <OSo className="o-so" value={x.donGia} onChange={(v) => sua(x.id, { donGia: v })} /> : x.loai === "CAY" ? Number(x.donGia).toLocaleString("vi-VN") : <span className="mo">theo PL V</span>}
                  </td>
                  <td><ThamSo x={x} sua={sua} nhaThua={p.nhaThua} cs={p.cs} ngayTB={p.ngayTB} /></td>
                  <td><input type="number" min={1} value={x.dot} onChange={(e) => sua(x.id, { dot: Math.max(1, Number(e.target.value)) })} /></td>
                  <td><button className="nut nut-chu nut-nguy nut-nho" onClick={() => p.xoa(x.id)}>✕</button></td>
                </tr>
              );
            })}
            {ds.length === 0 && <tr><td colSpan={9} className="trong">Chưa có tài sản trong đợt này.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const VAT_NUOI_DV: Record<LoaiVatNuoi, string> = { TRAU_BO_NGUA: "tấn", LON: "tấn", DE_CUU_HUOU_CHO_THO_NHIM: "tấn", GIA_CAM: "tấn", CON_TRUNG_SINH_VAT_NHO: "kg" };

function ThamSo({ x, sua, nhaThua, cs, ngayTB }: { x: TaiSan; sua: (id: string, p: Partial<TaiSan>) => void; nhaThua: TaiSan[]; cs: BoChinhSach; ngayTB: string }) {
  const st = { display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr 1fr" } as const;
  if (x.loai === "SUA_CHUA")
    return (
      <div style={{ ...st, gridTemplateColumns: "1fr" }}>
        <Chon value={x.taiSanGocId ?? ""} aria-label="Nhà, công trình bị phá dỡ một phần" onChange={(e) => sua(x.id, { taiSanGocId: e.target.value || undefined })}>
          <option value="">— Nhà, công trình bị phá dỡ một phần —</option>
          {nhaThua.map((n) => <option key={n.id} value={n.id}>{n.ten}</option>)}
        </Chon>
        <input placeholder="Dự toán do UBND cấp xã lập: số, ngày *" aria-label="Căn cứ dự toán sửa chữa" className={x.canCu.trim() ? "" : "loi-nhap"} value={x.canCu} onChange={(e) => sua(x.id, { canCu: e.target.value })} />
        <input placeholder="Văn bản xác nhận phần còn lại bảo đảm tiêu chuẩn kỹ thuật *" aria-label="Xác nhận phần còn lại bảo đảm tiêu chuẩn kỹ thuật" className={x.xacNhan.trim() ? "" : "loi-nhap"} value={x.xacNhan} onChange={(e) => sua(x.id, { xacNhan: e.target.value })} />
      </div>
    );
  if (x.loai === "NHA_CT")
    return (
      <div style={st}>
        <Chon value={x.cachTinh} aria-label="Cách tính nhà, công trình" onChange={(e) => { const v = e.target.value as "THIET_HAI_THUC_TE" | "HE_SO" | "MOC_K3" | "HANH_LANG"; sua(x.id, v === "MOC_K3" ? { cachTinh: v, phan: "HO_TRO", k3: x.k3 ?? { truongHop: "3.2", ngayXayDung: "" } } : v === "HANH_LANG" ? { cachTinh: v, hanhLang: x.hanhLang ?? { diem: "a" } } : { cachTinh: v }); }} style={{ gridColumn: "1/3" }}>
          <option value="THIET_HAI_THUC_TE">Thiệt hại thực tế (T, T1)</option>
          <option value="HE_SO">KL × hệ số × đơn giá</option>
          <option value="MOC_K3">Hỗ trợ theo mốc xây dựng (k3 Đ6 QĐ14)</option>
          {(cs.phuLucII || x.cachTinh === "HANH_LANG") && <option value="HANH_LANG">Trong hành lang lưới điện, không di dời (k3 Đ7 PL II)</option>}
        </Chon>
        {x.cachTinh === "HANH_LANG" ? (
          <Chon value={x.hanhLang?.diem ?? "a"} aria-label="Điểm khoản 3 Điều 7" title="Điểm a: đất đủ điều kiện bồi thường (70% giá trị theo đơn giá xây mới); điểm b: đất không đủ điều kiện" onChange={(e) => sua(x.id, { hanhLang: { ...x.hanhLang, diem: e.target.value as "a" | "b" }, ...(e.target.value === "b" && !x.k3 ? { k3: { truongHop: "3.2" as const, ngayXayDung: "" } } : {}) })}>
            <option value="a">Điểm a — đất đủ ĐK (bồi thường)</option>
            <option value="b">Điểm b — đất không đủ ĐK (hỗ trợ)</option>
          </Chon>
        ) : x.cachTinh === "MOC_K3" ? <span className="nhan nhan-xam" style={{ alignSelf: "center" }}>Hỗ trợ</span> : (
          <Chon value={x.phan} onChange={(e) => sua(x.id, { phan: e.target.value as "BOI_THUONG" | "HO_TRO" })}>
            <option value="BOI_THUONG">Bồi thường</option>
            <option value="HO_TRO">Hỗ trợ</option>
          </Chon>
        )}
        {x.cachTinh === "HANH_LANG" ? (
          x.hanhLang?.diem === "b" ? (
            <>
              <MocK3 x={x} sua={sua} cs={cs} ngayTB={ngayTB} />
              <span className="mo chu-nho" style={{ gridColumn: "1/-1" }}>Điểm b dẫn chiếu điểm 4.2, 4.3 k4 Điều 17 PL II (hết hiệu lực từ 31/3/2026) — chọn áp dụng mức theo mốc k3 Điều 6 QĐ 14/2026 × 70% và ghi lý do.</span>
              <input placeholder="Lý do áp dụng mức k3 Đ6 QĐ 14/2026 *" aria-label="Lý do áp dụng mức điểm b" className={x.hanhLang.lyDo?.trim() ? "" : "loi-nhap"} style={{ gridColumn: "1/-1" }} value={x.hanhLang.lyDo ?? ""} onChange={(e) => sua(x.id, { hanhLang: { diem: "b", lyDo: e.target.value } })} />
            </>
          ) : <span className="mo chu-nho" style={{ gridColumn: "3/-1", alignSelf: "center" }}>70% giá trị phần nhà trong hành lang theo đơn giá xây mới — khối lượng nhập là phần nằm trong hành lang</span>
        ) : x.cachTinh === "MOC_K3" ? (
          <MocK3 x={x} sua={sua} cs={cs} ngayTB={ngayTB} />
        ) : x.cachTinh === "THIET_HAI_THUC_TE" ? (
          <>
            <OSo placeholder="T (năm)" title="Thời gian khấu hao" className={x.T ? "" : "loi-nhap"} value={x.T ?? ""} onChange={(v) => sua(x.id, { T: v })} />
            <OSo placeholder="T1 (năm)" title="Thời gian đã sử dụng" className={x.T1 ? "" : "loi-nhap"} value={x.T1 ?? ""} onChange={(v) => sua(x.id, { T1: v })} />
            <input placeholder="Căn cứ khấu hao" value={x.canCuKhauHao ?? ""} onChange={(e) => sua(x.id, { canCuKhauHao: e.target.value })} />
          </>
        ) : (
          <OSo placeholder="Hệ số" value={x.heSo ?? "1"} onChange={(v) => sua(x.id, { heSo: v })} />
        )}
      </div>
    );
  if (x.loai === "CAY")
    return (
      <div style={{ ...st, gridTemplateColumns: "140px 1fr" }}>
        <OSo placeholder="Mật độ (cây/ha)" value={x.matDoHa ?? ""} onChange={(v) => sua(x.id, { matDoHa: v || null })} />
        <span className="chu-nho mo" style={{ alignSelf: "center" }}>{/ha\/\s*năm/i.test(x.donVi) ? "Số lượng = (số năm được giao − số năm đã chăm sóc) × DT (ha), vd. =(10-4)*0,5" : x.matDoHa ? "Tính theo quỹ mật độ của thửa" : x.donVi === "m²" ? "Tính theo diện tích" : "Không mật độ: cần xác nhận"}</span>
      </div>
    );
  if (x.loai === "VAT_NUOI")
    return (
      <div style={st}>
        <Chon value={x.loaiDuong} onChange={(e) => sua(x.id, { loaiDuong: e.target.value as LoaiDuong })}>
          <option value="CUNG_HOA">Đường cứng hóa</option>
          <option value="DUONG_DAT">Đường đất</option>
        </Chon>
        <OSo placeholder="Quãng đường (km)" value={x.quangDuongKm} onChange={(v) => sua(x.id, { quangDuongKm: v })} />
      </div>
    );
  return (
    <div style={st}>
      <OSo placeholder="Hệ số" value={x.heSo} onChange={(v) => sua(x.id, { heSo: v })} />
      <Chon value={x.phan} onChange={(e) => sua(x.id, { phan: e.target.value as "BOI_THUONG" | "HO_TRO" })}>
        <option value="BOI_THUONG">Bồi thường</option>
        <option value="HO_TRO">Hỗ trợ</option>
      </Chon>
      <input placeholder="Căn cứ đơn giá *" className={x.canCu ? "" : "loi-nhap"} value={x.canCu} onChange={(e) => sua(x.id, { canCu: e.target.value })} />
    </div>
  );
}

/** Khoản 3 Điều 6 QĐ 14/2026: trường hợp + ngày xây dựng; ngày trùng đúng ngày mốc (văn bản không xếp mức) → người dùng chọn. */
function MocK3({ x, sua, cs, ngayTB }: { x: Extract<TaiSan, { loai: "NHA_CT" }>; sua: (id: string, p: Partial<TaiSan>) => void; cs: BoChinhSach; ngayTB: string }) {
  const k3 = x.k3 ?? { truongHop: "3.2" as const, ngayXayDung: "" };
  const dat = (p: Partial<typeof k3>) => sua(x.id, { k3: { ...k3, ...p } });
  const kq = k3.ngayXayDung && ngayTB ? chonTheoMoc(k3.ngayXayDung, bangK3(cs, k3.truongHop).moc, ngayTB) : null;
  return (
    <>
      <Chon value={k3.truongHop} aria-label="Trường hợp khoản 3" title={TEN_K3[k3.truongHop]} onChange={(e) => dat({ truongHop: e.target.value as "3.1" | "3.2" | "3.3", chonMoc: undefined })} style={{ gridColumn: "1/3" }}>
        {Object.entries(TEN_K3).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Chon>
      <ONgay value={k3.ngayXayDung} aria-label="Ngày xây dựng" onChange={(e) => dat({ ngayXayDung: e.target.value, chonMoc: undefined })} />
      {!ngayTB && <span className="chu-do chu-nho" style={{ gridColumn: "1/-1" }}>Dự án/đợt chưa có ngày thông báo thu hồi đất</span>}
      {kq?.loai === "KHOP" && <span className="mo chu-nho" style={{ gridColumn: "1/-1" }}>{kq.khoang.moTa}</span>}
      {kq?.loai === "NGOAI_PHAM_VI" && <span className="chu-do chu-nho" style={{ gridColumn: "1/-1" }}>Ngày xây dựng không thuộc khoảng nào (xây sau thông báo thu hồi?)</span>}
      {kq?.loai === "KHOANG_TRONG" && (
        <>
          <Chon value={k3.chonMoc?.moTaMoc ?? ""} aria-label="Chọn mức khi trùng ngày mốc" className={k3.chonMoc?.lyDo.trim() ? "" : "loi-nhap"} style={{ gridColumn: "1/3" }} onChange={(e) => dat({ chonMoc: e.target.value ? { moTaMoc: e.target.value, lyDo: k3.chonMoc?.lyDo ?? "" } : undefined })}>
            <option value="">— Trùng đúng ngày mốc: chọn mức —</option>
            {kq.lienKe.map((m) => <option key={m.moTa} value={m.moTa}>{m.moTa}</option>)}
          </Chon>
          <input placeholder="Lý do chọn *" aria-label="Lý do chọn mức" className={k3.chonMoc?.lyDo.trim() ? "" : "loi-nhap"} value={k3.chonMoc?.lyDo ?? ""} disabled={!k3.chonMoc} onChange={(e) => dat({ chonMoc: { moTaMoc: k3.chonMoc!.moTaMoc, lyDo: e.target.value } })} />
        </>
      )}
    </>
  );
}

import { useState } from "react";
import type { LoaiDuong, LoaiVatNuoi } from "@gpmb/core";
import { thuTinh } from "../../bieu-thuc";
import { taoId, type Ho, type TaiSan, type Thua } from "../../mo-hinh";
import { ChonDonGia } from "../../thanh-phan/ChonDonGia";
import { Chon } from "../../thanh-phan/Chon";

const TEN_LOAI: Record<TaiSan["loai"], [string, string]> = {
  NHA_CT: ["Nhà, CT", "nhan-duong"],
  CAY: ["Cây trồng", "nhan-xanh"],
  VAT_NUOI: ["Vật nuôi", "nhan-vang"],
  KHAC: ["Ngoài DM", "nhan-tim"],
};
const VAT_NUOI: Record<LoaiVatNuoi, string> = {
  TRAU_BO_NGUA: "Trâu, bò, ngựa",
  LON: "Lợn",
  DE_CUU_HUOU_CHO_THO_NHIM: "Dê, cừu, hươu, chó, thỏ, nhím",
  GIA_CAM: "Gia cầm",
  CON_TRUNG_SINH_VAT_NHO: "Côn trùng, sinh vật nhỏ",
};

export function TabKiemDem({ h, doi }: { h: Ho; doi: (h: Ho) => void }) {
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
      <div className="nhom-nut" style={{ alignItems: "center" }}>
        <span className="chu-nho mo">Đợt kiểm đếm:</span>
        <button className={`nut nut-nho ${dot === "TAT_CA" ? "nut-chinh" : ""}`} onClick={() => setDot("TAT_CA")}>Tất cả</button>
        {Array.from({ length: soDot }, (_, i) => i + 1).map((d) => <button key={d} className={`nut nut-nho ${dot === d ? "nut-chinh" : ""}`} onClick={() => setDot(d)}>Đợt {d}</button>)}
        <button className="nut nut-nho" onClick={() => setDot(soDot + 1)}>+ Đợt bổ sung</button>
        <span className="tach" />
        <span className="mo chu-nho">Khối lượng nhập được biểu thức, vd. =10*9.8 hoặc =5+6+3</span>
      </div>
      {h.thua.map((t) => (
        <TheThua key={t.id} t={t} ds={h.taiSan.filter((x) => x.thuaId === t.id && (dot === "TAT_CA" || x.dot === dot))} sua={sua} xoa={(id) => doi({ ...h, taiSan: h.taiSan.filter((x) => x.id !== id) })} doiCho={doiCho}
          themDanhMuc={(nguon) => setThem({ thuaId: t.id, nguon })}
          themKhac={() => themTs({ id: taoId(), thuaId: t.id, dot: dotMoi, loai: "KHAC", ten: "", donVi: "", khoiLuong: "", heSo: "1", donGia: "", canCu: "", phan: "HO_TRO" })}
          themVatNuoi={() => themTs({ id: taoId(), thuaId: t.id, dot: dotMoi, loai: "VAT_NUOI", ten: "Di dời vật nuôi", loaiDuong: "CUNG_HOA", loaiVatNuoi: "LON", khoiLuong: "", quangDuongKm: "" })}
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
  ds: TaiSan[];
  sua: (id: string, p: Partial<TaiSan>) => void;
  xoa: (id: string) => void;
  doiCho: (id: string, h: -1 | 1) => void;
  themDanhMuc: (n: "QĐ32" | "PL VIII") => void;
  themKhac: () => void;
  themVatNuoi: () => void;
}) {
  const { t, ds, sua } = p;
  return (
    <div className="the">
      <div className="the-dau">
        <h3>Thửa {t.soThua || "?"}, tờ {t.soTo || "?"}</h3>
        <span className="mo chu-nho">{t.loaiDat} · DT thu hồi {t.dienTichThuHoi || "—"} m²</span>
        <div className="phai">
          <button className="nut nut-nho" onClick={() => p.themDanhMuc("QĐ32")}>+ Nhà, công trình (QĐ 32)</button>
          <button className="nut nut-nho" onClick={() => p.themDanhMuc("PL VIII")}>+ Cây trồng (PL VIII)</button>
          <button className="nut nut-nho" onClick={p.themVatNuoi}>+ Di dời vật nuôi</button>
          <button className="nut nut-nho" onClick={p.themKhac}>+ Ngoài danh mục</button>
        </div>
      </div>
      <div className="bang-cuon">
        <table className="bang">
          <thead>
            <tr><th style={{ width: 54 }}>TT</th><th style={{ width: 84 }}>Loại</th><th>Tài sản</th><th style={{ width: 70 }}>ĐVT</th><th style={{ width: 150 }}>Khối lượng / số lượng</th><th className="so" style={{ width: 120 }}>Đơn giá (đ)</th><th style={{ width: 380 }}>Tham số tính</th><th style={{ width: 50 }}>Đợt</th><th style={{ width: 30 }} /></tr>
          </thead>
          <tbody>
            {ds.map((x, i) => {
              const klVao = x.loai === "CAY" ? x.soLuong : x.khoiLuong;
              const kl = klVao ? thuTinh(klVao) : { giaTri: null, loi: "Chưa nhập" };
              return (
                <tr key={x.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
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
                    {x.loai === "KHAC" ? <input value={x.donVi} onChange={(e) => sua(x.id, { donVi: e.target.value })} /> : x.loai === "VAT_NUOI" ? (VAT_NUOI_DV[x.loaiVatNuoi]) : x.donVi}
                  </td>
                  <td>
                    <input className={`o-so ${klVao && kl.loi ? "loi-nhap" : ""}`} value={klVao} title={kl.loi ?? ""} onChange={(e) => sua(x.id, x.loai === "CAY" ? { soLuong: e.target.value } : { khoiLuong: e.target.value })} />
                    {klVao.startsWith("=") && kl.giaTri && <div className="chu-nho mo" style={{ textAlign: "right" }}>= {kl.giaTri.toString().replace(".", ",")}</div>}
                    {klVao && kl.loi && <div className="chu-nho" style={{ color: "var(--do)" }}>{kl.loi}</div>}
                  </td>
                  <td className="so">
                    {x.loai === "KHAC" || x.loai === "NHA_CT" ? <input className="o-so" value={x.donGia} onChange={(e) => sua(x.id, { donGia: e.target.value })} /> : x.loai === "CAY" ? Number(x.donGia).toLocaleString("vi-VN") : <span className="mo">theo PL V</span>}
                  </td>
                  <td><ThamSo x={x} sua={sua} /></td>
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

function ThamSo({ x, sua }: { x: TaiSan; sua: (id: string, p: Partial<TaiSan>) => void }) {
  const st = { display: "grid", gap: 4, gridTemplateColumns: "1fr 1fr 1fr" } as const;
  if (x.loai === "NHA_CT")
    return (
      <div style={st}>
        <Chon value={x.cachTinh} onChange={(e) => sua(x.id, { cachTinh: e.target.value as "THIET_HAI_THUC_TE" | "HE_SO" })} style={{ gridColumn: "1/3" }}>
          <option value="THIET_HAI_THUC_TE">Thiệt hại thực tế (T, T1)</option>
          <option value="HE_SO">KL × hệ số × đơn giá</option>
        </Chon>
        <Chon value={x.phan} onChange={(e) => sua(x.id, { phan: e.target.value as "BOI_THUONG" | "HO_TRO" })}>
          <option value="BOI_THUONG">Bồi thường</option>
          <option value="HO_TRO">Hỗ trợ</option>
        </Chon>
        {x.cachTinh === "THIET_HAI_THUC_TE" ? (
          <>
            <input placeholder="T (năm)" title="Thời gian khấu hao" className={x.T ? "" : "loi-nhap"} value={x.T ?? ""} onChange={(e) => sua(x.id, { T: e.target.value })} />
            <input placeholder="T1 (năm)" title="Thời gian đã sử dụng" className={x.T1 ? "" : "loi-nhap"} value={x.T1 ?? ""} onChange={(e) => sua(x.id, { T1: e.target.value })} />
            <input placeholder="Căn cứ khấu hao" value={x.canCuKhauHao ?? ""} onChange={(e) => sua(x.id, { canCuKhauHao: e.target.value })} />
          </>
        ) : (
          <input placeholder="Hệ số" value={x.heSo ?? "1"} onChange={(e) => sua(x.id, { heSo: e.target.value })} />
        )}
      </div>
    );
  if (x.loai === "CAY")
    return (
      <div style={{ ...st, gridTemplateColumns: "140px 1fr" }}>
        <input placeholder="Mật độ (cây/ha)" value={x.matDoHa ?? ""} onChange={(e) => sua(x.id, { matDoHa: e.target.value || null })} />
        <span className="chu-nho mo" style={{ alignSelf: "center" }}>{x.matDoHa ? "Tính theo quỹ mật độ của thửa" : x.donVi === "m²" ? "Tính theo diện tích" : "Không mật độ: cần xác nhận"}</span>
      </div>
    );
  if (x.loai === "VAT_NUOI")
    return (
      <div style={st}>
        <Chon value={x.loaiDuong} onChange={(e) => sua(x.id, { loaiDuong: e.target.value as LoaiDuong })}>
          <option value="CUNG_HOA">Đường cứng hóa</option>
          <option value="DUONG_DAT">Đường đất</option>
        </Chon>
        <input placeholder="Quãng đường (km)" value={x.quangDuongKm} onChange={(e) => sua(x.id, { quangDuongKm: e.target.value })} />
      </div>
    );
  return (
    <div style={st}>
      <input placeholder="Hệ số" value={x.heSo} onChange={(e) => sua(x.id, { heSo: e.target.value })} />
      <Chon value={x.phan} onChange={(e) => sua(x.id, { phan: e.target.value as "BOI_THUONG" | "HO_TRO" })}>
        <option value="BOI_THUONG">Bồi thường</option>
        <option value="HO_TRO">Hỗ trợ</option>
      </Chon>
      <input placeholder="Căn cứ đơn giá *" className={x.canCu ? "" : "loi-nhap"} value={x.canCu} onChange={(e) => sua(x.id, { canCu: e.target.value })} />
    </div>
  );
}

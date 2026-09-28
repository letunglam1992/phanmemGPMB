import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, type Ho } from "../mo-hinh";
import { DANH_MUC_MAU, mauTheoMa, tepMau, type MauVanBan, type TruongNhap } from "../van-ban/danh-muc";
import { ghepDuLieu, ngayChu, thongTinChungMacDinh } from "../van-ban/du-lieu";
import { truongVanBanTuDonVi } from "../don-vi";
import { dienMau, dongGoiZip, truongTrongMau } from "../van-ban/dien-mau";
import { HopThoai, O } from "../thanh-phan/chung";
import { taiXuong } from "../tai-xuong";
import { tenTep } from "../ten-tep";

/** Thông tin chung của dự án dùng khi soạn văn bản (lưu vào DuAn.vanBan). */
export const TRUONG_CHUNG: (TruongNhap & { nhom: string })[] = [
  { nhom: "Cơ quan", truong: "ten_don_vi_bt", nhan: "Đơn vị, tổ chức thực hiện nhiệm vụ bồi thường, GPMB", goiY: "Ghi tên Đơn vị/Tổ chức thực hiện nhiệm vụ bồi thường, giải phóng mặt bằng" },
  { nhom: "Cơ quan", truong: "co_quan_cap_tren_bt", nhan: "Cơ quan cấp trên của đơn vị bồi thường (dòng trên tiêu đề)" },
  { nhom: "Cơ quan", truong: "ky_hieu_don_vi", nhan: "Chữ viết tắt tên đơn vị bồi thường (ký hiệu văn bản)" },
  { nhom: "Cơ quan", truong: "ten_phong", nhan: "Phòng chuyên môn trình", goiY: "Phòng Kinh tế / Kinh tế, Hạ tầng và Đô thị / Kinh tế, Văn hóa, Xã hội" },
  { nhom: "Cơ quan", truong: "ky_hieu_phong", nhan: "Chữ viết tắt tên phòng" },
  { nhom: "Cơ quan", truong: "co_quan_tham_dinh", nhan: "Cơ quan chủ trì thẩm định phương án" },
  { nhom: "Cơ quan", truong: "co_quan_dang_tai", nhan: "Cơ quan đăng tải trên trang thông tin điện tử" },
  { nhom: "Ký", truong: "quyen_han", nhan: "UBND xã — quyền hạn, chức vụ người ký", nhieuDong: true, goiY: "vd. CHỦ TỊCH hoặc hai dòng: KT. CHỦ TỊCH / PHÓ CHỦ TỊCH" },
  { nhom: "Ký", truong: "nguoi_ky", nhan: "UBND xã — họ tên người ký" },
  { nhom: "Ký", truong: "quyen_han_phong", nhan: "Phòng chuyên môn — quyền hạn, chức vụ", nhieuDong: true, goiY: "vd. TRƯỞNG PHÒNG hoặc KT. TRƯỞNG PHÒNG / PHÓ TRƯỞNG PHÒNG" },
  { nhom: "Ký", truong: "nguoi_ky_phong", nhan: "Phòng chuyên môn — họ tên người ký" },
  { nhom: "Ký", truong: "quyen_han_don_vi", nhan: "Đơn vị bồi thường — quyền hạn, chức vụ", nhieuDong: true },
  { nhom: "Ký", truong: "nguoi_ky_don_vi", nhan: "Đơn vị bồi thường — họ tên người ký" },
  { nhom: "Dự án", truong: "ly_do_thu_hoi", nhan: "Lý do thu hồi đất", goiY: "Ghi rõ mục đích thu hồi đất theo Điều 78, Điều 79 Luật Đất đai" },
  { nhom: "Dự án", truong: "dia_diem_du_an", nhan: "Địa điểm" },
  { nhom: "Dự án", truong: "ban_khu_dan_cu", nhan: "Bản/khu dân cư nơi có đất" },
  { nhom: "Căn cứ", truong: "can_cu_chung", nhan: "Căn cứ chung (mỗi dòng một căn cứ)", nhieuDong: true, goiY: "Mặc định trích từ QĐ 14/2026/QĐ-UBND — cán bộ kiểm tra hiệu lực trước khi ban hành" },
  { nhom: "Căn cứ", truong: "can_cu_du_an", nhan: "Căn cứ riêng của dự án (mỗi dòng một căn cứ)", nhieuDong: true, goiY: "Ghi rõ căn cứ thu hồi đất: Kế hoạch sử dụng đất năm … đã được phê duyệt; Quyết định chủ trương đầu tư/quyết định đầu tư…" },
  { nhom: "Văn bản trước", truong: "to_trinh_so", nhan: "Tờ trình số (được đề nghị)" },
  { nhom: "Văn bản trước", truong: "to_trinh_ngay", nhan: "Tờ trình ngày" },
  { nhom: "Văn bản trước", truong: "tb_thu_hoi_so", nhan: "Thông báo thu hồi đất số (chung)" },
  { nhom: "Văn bản trước", truong: "qd_phe_duyet_so", nhan: "QĐ phê duyệt phương án số" },
  { nhom: "Văn bản trước", truong: "qd_phe_duyet_ngay", nhan: "QĐ phê duyệt phương án ngày" },
  { nhom: "Thành phần", truong: "tp_ubnd", nhan: "Đại diện UBND xã", nhieuDong: true },
  { nhom: "Thành phần", truong: "tp_mttq", nhan: "Đại diện Ủy ban MTTQ Việt Nam xã", nhieuDong: true },
  { nhom: "Thành phần", truong: "tp_don_vi_bt", nhan: "Đại diện đơn vị bồi thường", nhieuDong: true },
  { nhom: "Thành phần", truong: "tp_ban", nhan: "Đại diện tổ/bản/khu dân cư", nhieuDong: true },
  { nhom: "Thành phần", truong: "tp_chu_dau_tu", nhan: "Đại diện chủ đầu tư", nhieuDong: true },
  { nhom: "Thành phần", truong: "tp_khac", nhan: "Thành phần khác", nhieuDong: true },
];

const URL_MAU = (ma: string) => `${import.meta.env.BASE_URL}mau-van-ban/${tepMau(mauTheoMa(ma))}`;

async function napMauGoc(ma: string): Promise<Uint8Array> {
  const r = await fetch(URL_MAU(ma));
  if (!r.ok) throw new Error(`Không nạp được mẫu gốc ${ma}`);
  return new Uint8Array(await r.arrayBuffer());
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const tenAnToan = (s: string) => tenTep(s, 70);

export function VanBan({ duAnId, maDau, hoIdDau }: { duAnId: string; maDau?: string; hoIdDau?: string }) {
  const { dsDuAn, hoCua, chinhSach, luuDuAn: luuDuAnGoc, luuHo: luuHoGoc, kho, di, quyen, nguoiDung, dsDonVi } = useUngDung();
  // Tài khoản chỉ xem vẫn tạo được bản dự thảo nhưng không ghi số, ngày, nhật ký vào hồ sơ.
  const coGhi = quyen("SOAN_VAN_BAN");
  const luuDuAn: typeof luuDuAnGoc = coGhi ? luuDuAnGoc : async () => undefined;
  const luuHo: typeof luuHoGoc = coGhi ? luuHoGoc : async () => undefined;
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const [ma, setMa] = useState(maDau ?? "01");
  const [tim, setTim] = useState("");
  const [chonHo, setChonHo] = useState<Set<string>>(new Set(hoIdDau ? [hoIdDau] : []));
  const [locHo, setLocHo] = useState("");
  const [rieng, setRieng] = useState<Record<string, string>>({});
  const [so, setSo] = useState("");
  const [ngayKy, setNgayKy] = useState("");
  const [chung, setChung] = useState<Record<string, string>>({});
  const [moChung, setMoChung] = useState(false);
  const [mauTuy, setMauTuy] = useState<string[]>([]);
  const [thongBao, setThongBao] = useState<{ loai: "xanh" | "do"; noiDung: string } | null>(null);
  const [dangTao, setDangTao] = useState(false);
  const [xemTruong, setXemTruong] = useState<string[] | null>(null);

  const mau: MauVanBan = mauTheoMa(ma);
  const hos = hoCua(duAnId);
  const ds = useMemo(() => (duAn ? hos.map((h) => ({ h, k: tinhHo(chinhSach(duAn), duAn, h) })) : []), [hos, duAn, chinhSach]);

  useEffect(() => {
    // Thứ tự ưu tiên: mặc định < Thiết lập đơn vị < thông tin đã lưu riêng cho dự án
    if (duAn) setChung({ ...thongTinChungMacDinh(duAn), ...truongVanBanTuDonVi(dsDonVi), ...(duAn.vanBan ?? {}) });
  }, [duAn?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRieng(Object.fromEntries(mau.nhapThem.map((t) => [t.truong, (t.truong !== "noi_nhan" && duAn?.vanBan?.[t.truong]) || t.macDinh || ""])));
    if (mau.phamVi === "DOT" && chonHo.size === 0) setChonHo(new Set(hoCua(duAnId).map((h) => h.id)));
    setSo("");
    setThongBao(null);
  }, [ma]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void kho.dsMauTuy().then(setMauTuy);
  }, [kho]);

  if (!duAn) return <div className="trang trong">Chọn dự án trước.</div>;

  const dsMau = DANH_MUC_MAU.filter((m) => !tim || `${m.ma} ${m.ten}`.toLowerCase().includes(tim.toLowerCase()));
  const theoBuoc = [
    ...CAC_BUOC.map((b) => ({ tieuDe: `Bước ${b.ma}. ${b.ten}`, ds: dsMau.filter((m) => m.buoc === b.ma && m.nguon !== "RIENG") })),
    { tieuDe: "Mẫu riêng của xã", ds: dsMau.filter((m) => m.nguon === "RIENG") },
  ].filter((x) => x.ds.length);
  const dsHoChon = ds.filter(({ h }) => chonHo.has(h.id));
  const hoXemTruoc = mau.phamVi === "HO" ? dsHoChon[0] : undefined;
  const duLieuXem = ghepDuLieu({ mau, duAn, ds: mau.phamVi === "DOT" ? dsHoChon : ds, ho: hoXemTruoc, chung, rieng, so, ngayKy });

  const napMau = async () => (await kho.docMau(ma))?.bytes ?? (await napMauGoc(ma));

  const tao = async () => {
    setDangTao(true);
    setThongBao(null);
    try {
      const mauBytes = await napMau();
      const soSo = /^\d+$/.test(so.trim()) ? Number(so.trim()) : null;
      await luuDuAn({ ...duAn, vanBan: { ...(duAn.vanBan ?? {}), ...chung } });
      const luuRieng = Object.fromEntries(mau.nhapThem.filter((t) => t.truong !== "noi_nhan" && rieng[t.truong]).map((t) => [t.truong, rieng[t.truong]!]));
      const kyHieu = (mau.ghiLai?.kyHieu ?? "").replace("{ky_hieu_phong}", chung.ky_hieu_phong || "");
      if (mau.phamVi === "DOT") {
        if (!dsHoChon.length) throw new Error("Chọn các hộ, tổ chức trong đợt.");
        const out = dienMau(mauBytes, ghepDuLieu({ mau, duAn, ds: dsHoChon, chung, rieng, so, ngayKy }));
        taiXuong(out, `Mau-${ma}_${tenAnToan(mau.ten)}_${dsHoChon.length}-ho.docx`, DOCX);
        const vbMoi: Record<string, string> = { ...(duAn.vanBan ?? {}), ...chung, ...luuRieng };
        if (mau.ghiLai?.capDo === "DU_AN" && so.trim()) Object.assign(vbMoi, { [`${mau.ghiLai.khoa}_so`]: `${so.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) });
        await luuDuAn({ ...duAn, vanBan: vbMoi });
        for (const x of dsHoChon) {
          const ghi: Partial<Ho> = { nhatKy: [...x.h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Có tên trong văn bản ${mau.ten}${so.trim() ? ` số ${so.trim()}/${kyHieu}` : ""}` }] };
          if (mau.ghiLai?.capDo === "HO" && so.trim()) ghi.vanBan = { ...(x.h.vanBan ?? {}), [`${mau.ghiLai.khoa}_so`]: `${so.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) };
          await luuHo({ ...x.h, ...ghi });
        }
        setThongBao({ loai: "xanh", noiDung: `Đã tạo ${mau.ten} cho ${dsHoChon.length} hộ, tổ chức.` });
      } else if (mau.phamVi === "DU_AN") {
        const out = dienMau(mauBytes, ghepDuLieu({ mau, duAn, ds, chung, rieng, so, ngayKy }));
        taiXuong(out, `Mau-${ma}_${tenAnToan(mau.ten)}_${tenAnToan(duAn.ten)}.docx`, DOCX);
        if (mau.ghiLai && so.trim()) await luuDuAn({ ...duAn, vanBan: { ...(duAn.vanBan ?? {}), ...chung, [`${mau.ghiLai.khoa}_so`]: `${so.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) } });
        setThongBao({ loai: "xanh", noiDung: `Đã tạo Mẫu ${ma} cho dự án.` });
      } else {
        if (!dsHoChon.length) throw new Error("Chọn ít nhất một hộ, tổ chức.");
        const tep: { ten: string; noiDung: Uint8Array }[] = [];
        for (const [i, x] of dsHoChon.entries()) {
          const soHo = soSo !== null ? String(soSo + i) : so;
          const noiDung = dienMau(mauBytes, ghepDuLieu({ mau, duAn, ds, ho: x, chung, rieng, so: soHo, ngayKy }));
          tep.push({ ten: `Mau-${ma}_${tenAnToan(x.h.ma + " " + x.h.ten)}.docx`, noiDung });
          const ghi: Partial<Ho> = { nhatKy: [...x.h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Tạo văn bản Mẫu ${ma} – ${mau.ten}${soHo.trim() ? ` số ${soHo}` : ""}` }] };
          if (mau.ghiLai && soHo.trim()) ghi.vanBan = { ...(x.h.vanBan ?? {}), [`${mau.ghiLai.khoa}_so`]: `${soHo.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) };
          await luuHo({ ...x.h, ...ghi });
        }
        if (tep.length === 1) taiXuong(tep[0]!.noiDung, tep[0]!.ten, DOCX);
        else taiXuong(dongGoiZip(tep), `Mau-${ma}_${tep.length}-ho_${tenAnToan(duAn.ten)}.zip`, "application/zip");
        setThongBao({ loai: "xanh", noiDung: `Đã tạo ${tep.length} văn bản Mẫu ${ma}${tep.length > 1 ? " (tệp .zip)" : ""}${coGhi ? "; đã ghi nhật ký hồ sơ." : "."}` });
      }
      if (!coGhi) setThongBao({ loai: "xanh", noiDung: "Đã tạo bản dự thảo. Tài khoản chỉ xem: không ghi số, ngày văn bản và nhật ký vào hồ sơ." });
    } catch (e) {
      const err = e as Error & { chiTiet?: string[] };
      setThongBao({ loai: "do", noiDung: `${err.message}${err.chiTiet?.length ? ": " + err.chiTiet.join("; ") : ""}` });
    } finally {
      setDangTao(false);
    }
  };

  const thayMau = async (f: File) => {
    const bytes = new Uint8Array(await f.arrayBuffer());
    try {
      const truong = truongTrongMau(bytes);
      const goc = truongTrongMau(await napMauGoc(ma));
      const thieu = goc.filter((t) => !truong.includes(t) && !t.startsWith("#") && !t.startsWith("/"));
      dienMau(bytes, duLieuXem); // kiểm tra điền thử
      if (!quyen("THAY_MAU")) throw new Error("Tài khoản không có quyền thay mẫu văn bản");
      await kho.luuMau(ma, bytes, f.name);
      setMauTuy(await kho.dsMauTuy());
      setThongBao({ loai: "xanh", noiDung: `Đã thay Mẫu ${ma} bằng "${f.name}".${thieu.length ? ` Lưu ý: mẫu mới không dùng các trường: ${thieu.join(", ")}.` : ""}` });
    } catch (e) {
      const err = e as Error & { chiTiet?: string[] };
      setThongBao({ loai: "do", noiDung: `Không dùng được tệp mẫu: ${err.message}${err.chiTiet?.length ? " — " + err.chiTiet.join("; ") : ""}` });
    }
  };

  const nhom = [...new Set(TRUONG_CHUNG.map((t) => t.nhom))];
  const xem: [string, unknown][] = [
    ["ten_du_an", duLieuXem.ten_du_an],
    ...(mau.phamVi === "HO" ? ([["ho_ten", duLieuXem.ho_ten], ["dia_chi", duLieuXem.dia_chi], ["dt_thu_hoi", `${duLieuXem.dt_thu_hoi} m²`], ["thua_mo_ta", duLieuXem.thua_mo_ta], ["tong_tien", `${duLieuXem.tong_tien} đ`], ["tong_tien_chu", duLieuXem.tong_tien_chu]] as [string, unknown][]) : ([["tong_dt_thu_hoi", `${duLieuXem.tong_dt_thu_hoi} m²`], ["so_doi_tuong", duLieuXem.so_doi_tuong], ["tong_gia_tri", `${duLieuXem.tong_gia_tri} đ`], ["tong_gia_tri_chu", duLieuXem.tong_gia_tri_chu]] as [string, unknown][])),
    ...(mau.phamVi === "DOT" ? ([["so_doi_tuong_mo_ta", duLieuXem.so_doi_tuong_mo_ta], ["dt_duoc_bt", `${duLieuXem.dt_duoc_bt} m²`], ["dt_khong_bt", `${duLieuXem.dt_khong_bt} m²`], ["ds_thua_thu_hoi", `${(duLieuXem.ds_thua_thu_hoi as unknown[]).length} dòng`], ["tong_dt_co_gcn", `${duLieuXem.tong_dt_co_gcn} m²`]] as [string, unknown][]) : []),
    ["tb_thu_hoi_so", duLieuXem.tb_thu_hoi_so],
    ["tb_thu_hoi_ngay", duLieuXem.tb_thu_hoi_ngay],
    ["can_cu", `${(duLieuXem.can_cu as string[]).length} căn cứ`],
  ];

  return (
    <div className="trang" style={{ maxWidth: 1600 }}>
      <div className="duong-dan">
        <button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / <button onClick={() => di({ ten: "du-an", duAnId })}>{duAn.ten}</button> / Văn bản
      </div>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Văn bản</div>
          <h1>Soạn văn bản theo mẫu</h1>
          <div className="mo-ta">22 mẫu của Sổ tay ban hành kèm Quyết định số 1966/QĐ-UBND ngày 05/8/2025 · tự điền từ hồ sơ · xuất .docx để chỉnh tiếp trong Word</div>
        </div>
        <div className="phai">
          <select value={duAnId} onChange={(e) => di({ ten: "van-ban", duAnId: e.target.value })}>
            {dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </select>
        </div>
      </div>

      <div className="luoi" style={{ gridTemplateColumns: "300px minmax(0,1fr) 320px", alignItems: "start" }}>
        <div className="the" style={{ position: "sticky", top: 10 }}>
          <div className="the-dau"><input placeholder="Tìm mẫu…" value={tim} onChange={(e) => setTim(e.target.value)} style={{ width: "100%" }} /></div>
          <div className="bang-cuon" style={{ maxHeight: "calc(100vh - 250px)" }}>
            {theoBuoc.map(({ tieuDe, ds: dm }) => (
              <div key={tieuDe}>
                <div className="chu-nho mo" style={{ padding: "8px 12px 2px", fontWeight: 600 }}>{tieuDe}</div>
                {dm.map((m) => (
                  <div key={m.ma} className={`muc-mau ${m.ma === ma ? "chon" : ""}`} onClick={() => setMa(m.ma)}>
                    <span className="so-mau">{m.ma}</span>
                    <span>{m.ten}{mauTuy.includes(m.ma) && <span className="nhan nhan-tim" style={{ marginLeft: 6 }}>Mẫu riêng</span>}</span>
                    <span className="mo chu-nho">{m.phamVi === "HO" ? "Từng hộ" : m.phamVi === "DOT" ? "Theo đợt" : "Dự án"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="luoi">
          <div className="the">
            <div className="the-dau">
              <h2>{mau.nguon === "RIENG" ? "" : "Mẫu số "}{mau.ma}. {mau.ten}</h2>
              <div className="phai">
                <button className="nut nut-nho" onClick={async () => taiXuong(await napMau(), `Mau-${ma}_${tenAnToan(mau.ten)}_mau-trong.docx`, DOCX)} title="Tải mẫu (có các trường {…}) để chỉnh trong Word">Tải mẫu</button>
                {quyen("THAY_MAU") && <label className="nut nut-nho">Thay mẫu…<input type="file" accept=".docx" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && thayMau(e.target.files[0])} /></label>}
                {mauTuy.includes(ma) && quyen("THAY_MAU") && <button className="nut nut-nho" onClick={async () => { await kho.xoaMau(ma); setMauTuy(await kho.dsMauTuy()); setThongBao({ loai: "xanh", noiDung: "Đã khôi phục mẫu gốc." }); }}>Khôi phục mẫu gốc</button>}
                <button className="nut nut-nho" onClick={async () => setXemTruong(truongTrongMau(await napMau()))}>Các trường</button>
              </div>
            </div>
            <div className="the-than luoi">
              {thongBao && <div className={`thong-bao thong-bao-${thongBao.loai}`} style={{ marginBottom: 0 }}>{thongBao.noiDung}</div>}
              {mau.moTa && <div className="mo chu-nho">{mau.moTa}</div>}
              {(mau.phamVi === "HO" || mau.phamVi === "DOT") && (
                <div>
                  <div className="nhom-nut" style={{ alignItems: "center", marginBottom: 6 }}>
                    <b className="chu-nho">{mau.phamVi === "DOT" ? "Hộ, tổ chức trong đợt" : "Chọn hộ, tổ chức"} ({chonHo.size}/{ds.length})</b>
                    <input placeholder="Lọc…" value={locHo} onChange={(e) => setLocHo(e.target.value)} style={{ width: 200 }} />
                    <button className="nut nut-nho" onClick={() => setChonHo(new Set(ds.filter(({ h }) => !locHo || `${h.ma} ${h.ten}`.toLowerCase().includes(locHo.toLowerCase())).map(({ h }) => h.id)))}>Chọn tất cả (theo lọc)</button>
                    <button className="nut nut-nho" onClick={() => setChonHo(new Set())}>Bỏ chọn</button>
                  </div>
                  <div className="ds-chon-ho">
                    {ds.filter(({ h }) => !locHo || `${h.ma} ${h.ten}`.toLowerCase().includes(locHo.toLowerCase())).map(({ h }) => (
                      <label key={h.id}>
                        <input type="checkbox" checked={chonHo.has(h.id)} onChange={(e) => { const s = new Set(chonHo); if (e.target.checked) s.add(h.id); else s.delete(h.id); setChonHo(s); }} />
                        {h.ma} · {h.ten}
                      </label>
                    ))}
                    {ds.length === 0 && <span className="mo">Dự án chưa có hồ sơ.</span>}
                  </div>
                </div>
              )}
              <div className="luoi luoi-3">
                <O nhan="Số văn bản" goiY={mau.phamVi === "HO" && chonHo.size > 1 ? "Nhập số → tăng dần cho từng hộ. Để trống để văn thư ghi khi ký." : "Để trống để văn thư ghi khi ký"}><input value={so} onChange={(e) => setSo(e.target.value)} /></O>
                <O nhan="Ngày ký" goiY="Để trống = để trống ngày tháng"><input type="date" value={ngayKy} onChange={(e) => setNgayKy(e.target.value)} /></O>
              </div>
              {mau.nhapThem.length > 0 && (
                <div className="luoi luoi-2">
                  {mau.nhapThem.map((t) => (
                    <O key={t.truong} nhan={t.nhan} goiY={t.goiY} style={t.nhieuDong ? { gridColumn: "1/-1" } : undefined}>
                      {t.luaChon ? (
                        <select value={rieng[t.truong] ?? ""} onChange={(e) => setRieng({ ...rieng, [t.truong]: e.target.value })}>
                          {t.luaChon.map((l) => <option key={l.giaTri} value={l.giaTri}>{l.nhan}</option>)}
                        </select>
                      ) : t.nhieuDong ? (
                        <textarea rows={3} value={rieng[t.truong] ?? ""} onChange={(e) => setRieng({ ...rieng, [t.truong]: e.target.value })} placeholder="Để trống = in dấu chấm để viết tay" />
                      ) : (
                        <input value={rieng[t.truong] ?? ""} onChange={(e) => setRieng({ ...rieng, [t.truong]: e.target.value })} placeholder="Để trống = …………" />
                      )}
                    </O>
                  ))}
                </div>
              )}
              <div className="nhom-nut">
                <button className="nut nut-chinh" disabled={dangTao || (mau.phamVi !== "DU_AN" && chonHo.size === 0)} onClick={tao}>
                  {dangTao ? "Đang tạo…" : mau.phamVi === "HO" ? `Tạo văn bản cho ${chonHo.size} hộ` : mau.phamVi === "DOT" ? `Tạo văn bản cho đợt (${chonHo.size} hộ)` : "Tạo văn bản (.docx)"}
                </button>
                <button className="nut" onClick={() => setMoChung(!moChung)}>{moChung ? "Ẩn" : "Sửa"} thông tin chung của dự án</button>
              </div>
            </div>
          </div>

          {moChung && (
            <div className="the">
              <div className="the-dau"><h3>Thông tin chung dùng cho mọi văn bản của dự án</h3><div className="phai"><button className="nut nut-nho" disabled={!dsDonVi.length} title={dsDonVi.length ? "Ghi đè tên cơ quan, ký hiệu, người ký bằng thông tin ở Công cụ → Thiết lập đơn vị" : "Chưa có đơn vị — vào Công cụ → Thiết lập đơn vị"} onClick={() => setChung({ ...chung, ...truongVanBanTuDonVi(dsDonVi) })}>Điền từ Thiết lập đơn vị</button><button className="nut nut-nho nut-chinh" onClick={() => luuDuAn({ ...duAn, vanBan: { ...(duAn.vanBan ?? {}), ...chung } })}>Lưu</button></div></div>
              <div className="the-than luoi">
                {nhom.map((n) => (
                  <div key={n}>
                    <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 6, color: "var(--chu-phu)" }}>{n}</div>
                    <div className="luoi luoi-2">
                      {TRUONG_CHUNG.filter((t) => t.nhom === n).map((t) => (
                        <O key={t.truong} nhan={t.nhan} goiY={t.goiY} style={t.nhieuDong && n === "Căn cứ" ? { gridColumn: "1/-1" } : undefined}>
                          {t.nhieuDong ? <textarea rows={n === "Căn cứ" ? 6 : 2} value={chung[t.truong] ?? ""} onChange={(e) => setChung({ ...chung, [t.truong]: e.target.value })} /> : <input value={chung[t.truong] ?? ""} onChange={(e) => setChung({ ...chung, [t.truong]: e.target.value })} />}
                        </O>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="the" style={{ position: "sticky", top: 10 }}>
          <div className="the-dau"><h3>Dữ liệu tự điền</h3><span className="mo chu-nho">{hoXemTruoc ? hoXemTruoc.h.ma : mau.phamVi === "HO" ? "chọn hộ để xem" : "dự án"}</span></div>
          <div className="the-than giai-trinh">
            <dl>
              {xem.map(([k, v]) => (
                <FragmentXem key={k} k={k} v={v} />
              ))}
            </dl>
            <div className="muc">
              <h4>Ghi chú</h4>
              <ul>
                <li>Ô để trống được in thành “…………” để viết tay.</li>
                <li>Văn bản xuất ra là bản dự thảo: cán bộ kiểm tra, chỉnh sửa trước khi trình ký.</li>
                {mau.ghiLai && <li>Nhập số, ngày → phần mềm ghi lại để tự điền vào các mẫu sau ({mau.ghiLai.khoa.replace("_", " ")}).</li>}
                {(ma === "14" || ma === "15") && <li>Thứ tự Mẫu 14/15 theo nội dung Sổ tay (VM-23).</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
      {xemTruong && (
        <HopThoai tieuDe={`Các trường trong Mẫu ${ma}`} dong={() => setXemTruong(null)} rong={640}>
          <p className="chu-nho mo">Khi tự chỉnh mẫu trong Word, giữ nguyên các trường dạng {"{ten_truong}"} (gõ liền, không đổi định dạng giữa chừng). Vòng lặp {"{#ten}…{/ten}"} dùng cho danh sách.</p>
          <div className="nhom-nut">{xemTruong.map((t) => <code key={t} className="nhan nhan-xam">{`{${t}}`}</code>)}</div>
        </HopThoai>
      )}
    </div>
  );
}

function FragmentXem({ k, v }: { k: string; v: unknown }) {
  return (
    <>
      <dt><code style={{ fontSize: 11 }}>{k}</code></dt>
      <dd>{v === undefined || v === null || v === "" ? <span className="mo">(trống → …………)</span> : String(v)}</dd>
    </>
  );
}

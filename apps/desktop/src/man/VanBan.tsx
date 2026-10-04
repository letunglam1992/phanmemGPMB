import { ONgay } from "../thanh-phan/ONgay";
import { dotPheDuyet, moTaQd } from "../phuong-an";
import { khopLocHo } from "../van-ban/loc-ho";
import { useEffect, useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { tinhHo, type KetQuaHo } from "../tinh-ho";
import { CAC_BUOC, type Ho } from "../mo-hinh";
import { DANH_MUC_MAU, mauTheoMa, tepMau, type MauVanBan, type TruongNhap } from "../van-ban/danh-muc";
import { ghepDuLieu, ngayChu, thongTinChungMacDinh } from "../van-ban/du-lieu";
import { truongVanBanTuDonVi } from "../don-vi";
import { dienMau, dongGoiZip, truongTrongMau } from "../van-ban/dien-mau";
import { HopThoai, O } from "../thanh-phan/chung";
import { taiXuong } from "../tai-xuong";
import { tenTep } from "../ten-tep";
import { giaTriNhapThem } from "../van-ban/tao-nhanh";
import { kiemTraThongNhat } from "../van-ban/thuc-te";
import { CAN_CU_MAC_DINH } from "../van-ban/du-lieu";
import { Chon } from "../thanh-phan/Chon";
import { chungTheoDot, coDot, dotCuaHo, dsDot, duAnTheoDot, khopDot, tenDot, timDot } from "../dot-thu-hoi";

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
  if (!r.ok) throw new Error(`Không nạp được mẫu gốc ${ma} (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const tenAnToan = (s: string) => tenTep(s, 70);

/**
 * `nhung`: soạn ngay trong hồ sơ hộ (thẻ "Văn bản" sau "Tính toán, giải trình") — hộ đang mở được chọn sẵn và dùng số liệu
 * tính toán hiện tại để tự điền; hồ sơ đang sửa chưa lưu thì chặn tạo văn bản (tránh ghi số liệu chưa lưu vào văn bản).
 */
export function VanBan({ duAnId, maDau, hoIdDau, nhung, chiDuAn }: { duAnId: string; maDau?: string; hoIdDau?: string; nhung?: { ho: Ho; kq: KetQuaHo; daSua: boolean }; chiDuAn?: boolean }) {
  const { dsDuAn, hoCua, chinhSach, luuDuAn: luuDuAnGoc, luuHo: luuHoGoc, kho, di, quyen, nguoiDung, dsDonVi } = useUngDung();
  // Tài khoản chỉ xem vẫn tạo được bản dự thảo nhưng không ghi số, ngày, nhật ký vào hồ sơ.
  const coGhi = quyen("SOAN_VAN_BAN");
  const luuDuAn: typeof luuDuAnGoc = coGhi ? luuDuAnGoc : async () => undefined;
  const luuHo: typeof luuHoGoc = coGhi ? luuHoGoc : async () => undefined;
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  // chiDuAn: lối vào riêng từ Hồ sơ dự án — chỉ các mẫu cấp dự án, theo đợt (văn bản từng hộ soạn trong hồ sơ hộ)
  const [ma, setMa] = useState(maDau ?? (chiDuAn ? (DANH_MUC_MAU.find((m) => m.phamVi !== "HO")?.ma ?? "01") : "01"));
  const [tim, setTim] = useState("");
  const hoDau = hoIdDau ?? nhung?.ho.id;
  const [chonHo, setChonHo] = useState<Set<string>>(new Set(hoDau ? [hoDau] : []));
  const [locHo, setLocHo] = useState("");
  const [rieng, setRieng] = useState<Record<string, string>>({});
  const [so, setSo] = useState("");
  const [ngayKy, setNgayKy] = useState("");
  const [chung, setChung] = useState<Record<string, string>>({});
  const [moChung, setMoChung] = useState(false);
  const [mauTuy, setMauTuy] = useState<string[]>([]);
  const [thongBao, setThongBao] = useState<{ loai: "xanh" | "do" | "vang"; noiDung: string } | null>(null);
  const [dangTao, setDangTao] = useState(false);
  const [xemTruong, setXemTruong] = useState<string[] | null>(null);
  // P3-1: soạn văn bản cho một đợt thu hồi ("" = cả dự án)
  const [dotVb, setDotVb] = useState(() => (hoDau && duAn ? (hoCua(duAnId).find((h) => h.id === hoDau)?.dotId ?? "") : ""));

  const mau: MauVanBan = mauTheoMa(ma);
  const hos = hoCua(duAnId);
  const ds = useMemo(
    () => (duAn ? hos.map((h) => (nhung && h.id === nhung.ho.id ? { h: nhung.ho, k: nhung.kq } : { h, k: tinhHo(chinhSach(duAn), duAn, h) })) : []),
    [hos, duAn, chinhSach, nhung],
  );

  useEffect(() => {
    // Thứ tự ưu tiên: mặc định < Thiết lập đơn vị < thông tin đã lưu riêng cho dự án
    if (duAn) setChung({ ...thongTinChungMacDinh(duAn), ...truongVanBanTuDonVi(dsDonVi), ...(duAn.vanBan ?? {}) });
  }, [duAn?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Văn bản theo đợt từ bước lập, trình phương án (bước 8) trở đi (R1–R5, T6, T7): chỉ hộ đã có trong bản phương án đã chốt
  // hoặc đã phê duyệt (không tính bản hủy); hộ chưa chốt hiện mờ, không chọn được. T2, T3 (bước 3) chọn mọi hộ trong đợt.
  const canChot = mau.phamVi === "DOT" && Number(mau.buoc) >= 8;
  const hoDaChot = useMemo(() => new Set((duAn?.phuongAn ?? []).filter((x) => x.trangThai !== "DA_HUY").flatMap((x) => x.ho.map((y) => y.hoId))), [duAn?.phuongAn]);
  const duocChon = (id: string) => !canChot || hoDaChot.has(id);
  // Đợt chốt / phê duyệt phương án: chọn nhanh các hộ của một bản phương án (Đợt 1, Đợt 2…)
  const dsBanPA = useMemo(() => {
    const ds = (duAn?.phuongAn ?? []).filter((x) => x.trangThai !== "DA_HUY");
    return ds
      .map((x) => ({ id: x.id, so: x.so, hoIds: x.ho.map((y) => y.hoId), nhan: x.trangThai === "DA_PHE_DUYET" ? `Đợt ${dotPheDuyet(ds, x)} – bản ${x.so}${x.dotTen ? ` (${x.dotTen})` : ""} – đã phê duyệt ${moTaQd(x.pheDuyet)}` : `Bản ${x.so}${x.dotTen ? ` (${x.dotTen})` : ""} – đã chốt, chờ phê duyệt` }))
      .sort((a, b) => a.so - b.so);
  }, [duAn?.phuongAn]);
  const [banPA, setBanPA] = useState("");
  useEffect(() => {
    if (duAn) setRieng(giaTriNhapThem(mau, duAn, ds));
    if (mau.phamVi === "DOT" && chonHo.size === 0) setChonHo(new Set(hoCua(duAnId).filter((h) => (!dotVb || h.dotId === dotVb) && duocChon(h.id)).map((h) => h.id)));
    else if (canChot) setChonHo((c) => new Set([...c].filter(duocChon)));
    setSo("");
    setThongBao(null);
  }, [ma]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void kho.dsMauTuy().then(setMauTuy);
  }, [kho]);

  if (!duAn) return <div className="trang trong">Chọn dự án trước.</div>;
  const dotChon = timDot(duAn, dotVb);
  const duAnVb = duAnTheoDot(duAn, dotChon);
  const chungVb = chungTheoDot(chung, dotChon);
  const dsDot_ = dotChon ? ds.filter(({ h }) => khopDot(h, dotChon.id)) : ds;
  /** Ghi số, ngày văn bản cấp dự án/đợt: vào đợt khi đang soạn cho đợt, không thì vào dự án. */
  const vanBanGhi = (them: Record<string, string>) =>
    dotChon
      ? { ...duAn, vanBan: { ...(duAn.vanBan ?? {}), ...chung }, dotThuHoi: duAn.dotThuHoi!.map((x) => (x.id === dotChon.id ? { ...x, vanBan: { ...(x.vanBan ?? {}), ...them } } : x)) }
      : { ...duAn, vanBan: { ...(duAn.vanBan ?? {}), ...chung, ...them } };
  const choHo = (h: Ho) => { const d = dotCuaHo(duAn, h); return { duAn: duAnTheoDot(duAn, d), chung: chungTheoDot(chung, d) }; };

  const dsMau = DANH_MUC_MAU.filter((m) => (!chiDuAn || m.phamVi !== "HO") && (!tim || `${m.ma} ${m.ten}`.toLowerCase().includes(tim.toLowerCase())));
  const theoBuoc = [
    ...CAC_BUOC.map((b) => ({ tieuDe: `Bước ${b.ma}. ${b.ten}`, ds: dsMau.filter((m) => m.buoc === b.ma && !m.nguon) })),
    { tieuDe: "Theo văn bản thực tế (UBND phường/xã, 2026)", ds: dsMau.filter((m) => m.nguon === "THUC_TE") },
    { tieuDe: "Mẫu riêng của xã", ds: dsMau.filter((m) => m.nguon === "RIENG") },
  ].filter((x) => x.ds.length);
  const dsHoChon = ds.filter(({ h }) => chonHo.has(h.id) && duocChon(h.id));
  const hoLoc = dsDot_.filter(({ h }) => khopLocHo(locHo, h));
  const hoLocChon = hoLoc.filter(({ h }) => duocChon(h.id));
  const soChuaChot = canChot ? dsDot_.filter(({ h }) => !hoDaChot.has(h.id)).length : 0;
  const hoXemTruoc = mau.phamVi === "HO" ? dsHoChon[0] : undefined;
  const duLieuXem = hoXemTruoc
    ? ghepDuLieu({ mau, ...choHo(hoXemTruoc.h), ds, ho: hoXemTruoc, rieng, so, ngayKy })
    : ghepDuLieu({ mau, duAn: duAnVb, ds: mau.phamVi === "DOT" ? dsHoChon : dsDot_, chung: chungVb, rieng, so, ngayKy });

  // Kiểm tra thống nhất trước khi tạo (docs/19 §5.4): cơ quan ban hành, số trong "(Kèm theo …)", bằng chữ, diện tích
  const canhBaoTN = (() => {
    try {
      return kiemTraThongNhat(ma, duAn, duLieuXem);
    } catch {
      return [];
    }
  })();
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
        const out = dienMau(mauBytes, ghepDuLieu({ mau, duAn: duAnVb, ds: dsHoChon, chung: chungVb, rieng, so, ngayKy }));
        if (!(await taiXuong(out, `Mau-${ma}_${tenAnToan(mau.ten)}_${dsHoChon.length}-ho.docx`, DOCX))) return setThongBao({ loai: "vang", noiDung: "Đã hủy lưu tệp — chưa ghi số, ngày văn bản và nhật ký hồ sơ." });
        const vbMoi: Record<string, string> = { ...luuRieng };
        if (mau.ghiLai?.capDo === "DU_AN" && so.trim()) Object.assign(vbMoi, { [`${mau.ghiLai.khoa}_so`]: `${so.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) });
        await luuDuAn(vanBanGhi(vbMoi));
        for (const x of dsHoChon) {
          const ghi: Partial<Ho> = { nhatKy: [...x.h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Có tên trong văn bản ${mau.ten}${so.trim() ? ` số ${so.trim()}/${kyHieu}` : ""}` }] };
          if (mau.ghiLai?.capDo === "HO" && so.trim()) ghi.vanBan = { ...(x.h.vanBan ?? {}), [`${mau.ghiLai.khoa}_so`]: `${so.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) };
          await luuHo({ ...x.h, ...ghi });
        }
        setThongBao({ loai: "xanh", noiDung: `Đã tạo ${mau.ten} cho ${dsHoChon.length} hộ, tổ chức.` });
      } else if (mau.phamVi === "DU_AN") {
        const out = dienMau(mauBytes, ghepDuLieu({ mau, duAn: duAnVb, ds: dsDot_, chung: chungVb, rieng, so, ngayKy }));
        if (!(await taiXuong(out, `Mau-${ma}_${tenAnToan(mau.ten)}_${tenAnToan(duAn.ten)}${dotChon ? `_${tenAnToan(tenDot(dotChon))}` : ""}.docx`, DOCX))) return setThongBao({ loai: "vang", noiDung: "Đã hủy lưu tệp — chưa ghi số, ngày văn bản." });
        if (mau.ghiLai && so.trim()) await luuDuAn(vanBanGhi({ [`${mau.ghiLai.khoa}_so`]: `${so.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) }));
        setThongBao({ loai: "xanh", noiDung: `Đã tạo Mẫu ${ma} cho dự án.` });
      } else {
        if (!dsHoChon.length) throw new Error("Chọn ít nhất một hộ, tổ chức.");
        const tep: { ten: string; noiDung: Uint8Array }[] = [];
        const ghiHo: Ho[] = [];
        for (const [i, x] of dsHoChon.entries()) {
          const soHo = soSo !== null ? String(soSo + i) : so;
          const noiDung = dienMau(mauBytes, ghepDuLieu({ mau, ...choHo(x.h), ds, ho: x, rieng, so: soHo, ngayKy }));
          tep.push({ ten: `Mau-${ma}_${tenAnToan(x.h.ma + " " + x.h.ten)}.docx`, noiDung });
          const ghi: Partial<Ho> = { nhatKy: [...x.h.nhatKy, { luc: new Date().toISOString(), nguoi: nguoiDung, noiDung: `Tạo văn bản Mẫu ${ma} – ${mau.ten}${soHo.trim() ? ` số ${soHo}` : ""}` }] };
          if (mau.ghiLai && soHo.trim()) ghi.vanBan = { ...(x.h.vanBan ?? {}), [`${mau.ghiLai.khoa}_so`]: `${soHo.trim()}/${kyHieu}`, [`${mau.ghiLai.khoa}_ngay`]: ngayChu(ngayKy) };
          ghiHo.push({ ...x.h, ...ghi });
        }
        const daLuu = tep.length === 1 ? await taiXuong(tep[0]!.noiDung, tep[0]!.ten, DOCX) : await taiXuong(dongGoiZip(tep), `Mau-${ma}_${tep.length}-ho_${tenAnToan(duAn.ten)}.zip`, "application/zip");
        if (!daLuu) return setThongBao({ loai: "vang", noiDung: "Đã hủy lưu tệp — chưa ghi số, ngày văn bản và nhật ký hồ sơ." });
        // Ghi số, ngày, nhật ký hồ sơ sau khi đã lưu được tệp
        for (const x of ghiHo) await luuHo(x);
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
  // Giá trị chưa có (vd. chưa chọn hộ) → để trống, không hiện "undefined m²"
  const dv = (v: unknown, donVi: string) => (v === undefined || v === null || v === "" ? undefined : `${String(v)} ${donVi}`);
  const xem: [string, unknown][] = [
    ["ten_du_an", duLieuXem.ten_du_an],
    ...(mau.phamVi === "HO" ? ([["ho_ten", duLieuXem.ho_ten], ["dia_chi", duLieuXem.dia_chi], ["dt_thu_hoi", dv(duLieuXem.dt_thu_hoi, "m²")], ["thua_mo_ta", duLieuXem.thua_mo_ta], ["tong_tien", dv(duLieuXem.tong_tien, "đ")], ["tong_tien_chu", duLieuXem.tong_tien_chu]] as [string, unknown][]) : ([["tong_dt_thu_hoi", dv(duLieuXem.tong_dt_thu_hoi, "m²")], ["so_doi_tuong", duLieuXem.so_doi_tuong], ["tong_gia_tri", dv(duLieuXem.tong_gia_tri, "đ")], ["tong_gia_tri_chu", duLieuXem.tong_gia_tri_chu]] as [string, unknown][])),
    ...(mau.phamVi === "DOT" ? ([["so_doi_tuong_mo_ta", duLieuXem.so_doi_tuong_mo_ta], ["dt_duoc_bt", dv(duLieuXem.dt_duoc_bt, "m²")], ["dt_khong_bt", dv(duLieuXem.dt_khong_bt, "m²")], ["ds_thua_thu_hoi", dv((duLieuXem.ds_thua_thu_hoi as unknown[] | undefined)?.length, "dòng")], ["tong_dt_co_gcn", dv(duLieuXem.tong_dt_co_gcn, "m²")]] as [string, unknown][]) : []),
    ["tb_thu_hoi_so", duLieuXem.tb_thu_hoi_so],
    ["tb_thu_hoi_ngay", duLieuXem.tb_thu_hoi_ngay],
    ["can_cu", dv((duLieuXem.can_cu as string[] | undefined)?.length, "căn cứ")],
  ];
  const chanSua = !!nhung?.daSua;

  return (
    <div className={nhung ? "vb-nhung" : "trang"}>
      {nhung ? (
        <div className="the vb-nhung-dau">
          <div>
            <b>Văn bản của hộ {nhung.ho.ma} · {nhung.ho.ten}</b>
            <div className="mo chu-nho">22 mẫu Sổ tay (QĐ 1966/QĐ-UBND) và mẫu riêng của xã · tự điền thông tin hộ, thửa, tài sản, số tiền theo kết quả Tính toán, giải trình · văn bản trước đã cấp số được tự điền vào văn bản sau</div>
          </div>
          {coDot(duAn) && (
            <Chon value={dotVb} aria-label="Soạn cho đợt" onChange={(e) => { setDotVb(e.target.value); if (mau.phamVi === "DOT") setChonHo(new Set(ds.filter(({ h }) => (!e.target.value || h.dotId === e.target.value) && duocChon(h.id)).map(({ h }) => h.id))); }}>
              <option value="">Cả dự án</option>
              {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)}</option>)}
            </Chon>
          )}
        </div>
      ) : (
      <>
      <div className="duong-dan">
        <button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button> / <button onClick={() => di({ ten: "du-an", duAnId })}>{duAn.ten}</button> / Văn bản
      </div>
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Văn bản</div>
          <h1>{chiDuAn ? "Văn bản cấp dự án, theo đợt" : "Soạn văn bản theo mẫu"}</h1>
          <div className="mo-ta">{chiDuAn ? "Tờ trình, niêm yết, lấy ý kiến, thẩm định, quyết định phê duyệt phương án… (mẫu Sổ tay QĐ 1966/QĐ-UBND và mẫu riêng) · văn bản của từng hộ: mở hồ sơ hộ → thẻ Văn bản" : "22 mẫu của Sổ tay ban hành kèm Quyết định số 1966/QĐ-UBND ngày 05/8/2025 · tự điền từ hồ sơ · xuất .docx để chỉnh tiếp trong Word"}</div>
        </div>
        <div className="phai">
          <Chon value={duAnId} onChange={(e) => di({ ten: "van-ban", duAnId: e.target.value })}>
            {dsDuAn.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
          </Chon>
          {coDot(duAn) && (
            <Chon value={dotVb} aria-label="Soạn cho đợt" title="Văn bản của đợt dùng căn cứ, ngày thông báo, số văn bản của đợt; số văn bản cấp đợt ghi vào đợt" onChange={(e) => { setDotVb(e.target.value); if (mau.phamVi === "DOT") setChonHo(new Set(ds.filter(({ h }) => (!e.target.value || h.dotId === e.target.value) && duocChon(h.id)).map(({ h }) => h.id))); }}>
              <option value="">Cả dự án</option>
              {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)}</option>)}
            </Chon>
          )}
        </div>
      </div>
      </>
      )}
      {chanSua && <div className="thong-bao thong-bao-vang mb-10">Hồ sơ có thay đổi <b>chưa lưu</b> — bấm “Lưu hồ sơ” trước khi tạo văn bản để văn bản dùng đúng số liệu đã lưu.</div>}

      <div className="luoi vb-luoi" style={{ gridTemplateColumns: nhung ? "260px minmax(0,1fr) 300px" : "300px minmax(0,1fr) 320px", alignItems: "start" }}>
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
                {quyen("THAY_MAU") && <label className="nut nut-nho">Thay mẫu…<input type="file" accept=".docx" className="an" onChange={(e) => e.target.files?.[0] && thayMau(e.target.files[0])} /></label>}
                {mauTuy.includes(ma) && quyen("THAY_MAU") && <button className="nut nut-nho" onClick={async () => { await kho.xoaMau(ma); setMauTuy(await kho.dsMauTuy()); setThongBao({ loai: "xanh", noiDung: "Đã khôi phục mẫu gốc." }); }}>Khôi phục mẫu gốc</button>}
                <button className="nut nut-nho" onClick={async () => setXemTruong(truongTrongMau(await napMau()))}>Các trường</button>
              </div>
            </div>
            <div className="the-than luoi">
              {thongBao && <div className={`thong-bao thong-bao-${thongBao.loai}`} style={{ marginBottom: 0 }}>{thongBao.noiDung}</div>}
              {mau.moTa && <div className="mo chu-nho">{mau.moTa}</div>}
              {mau.phamVi === "DU_AN" && hoDau && <div className="thong-bao thong-bao-xanh chu-nho" style={{ marginBottom: 0 }}>Mẫu <b>cấp dự án</b> — một văn bản chung cho cả dự án (không riêng hộ đang mở). Mẫu theo từng hộ ghi “Từng hộ” ở danh sách bên trái.</div>}
              {(mau.phamVi === "HO" || mau.phamVi === "DOT") && (
                <div>
                  <div className="nhom-nut" style={{ alignItems: "center", marginBottom: 6 }}>
                    {canChot && dsBanPA.length > 0 && (
                      <Chon value={banPA} aria-label="Theo đợt phương án" title="Chọn các hộ của một đợt chốt / phê duyệt phương án" onChange={(e) => { setBanPA(e.target.value); const x = dsBanPA.find((y) => y.id === e.target.value); setChonHo(new Set(dsDot_.filter(({ h }) => duocChon(h.id) && (!x || x.hoIds.includes(h.id))).map(({ h }) => h.id))); }}>
                        <option value="">Mọi hộ đã chốt phương án</option>
                        {dsBanPA.map((x) => <option key={x.id} value={x.id}>{x.nhan} · {x.hoIds.length} hộ</option>)}
                      </Chon>
                    )}
                    <b className="chu-nho" aria-label="Số hộ đã chọn">{mau.phamVi === "DOT" ? "Hộ, tổ chức trong đợt" : "Chọn hộ, tổ chức"} — đã chọn {chonHo.size}/{dsDot_.length}{dotChon ? ` · ${tenDot(dotChon)}` : ""}</b>
                    <input placeholder="Lọc mã, tên hộ… (Enter để chọn)" aria-label="Lọc hộ" title="Gõ mã hoặc tên hộ (không cần dấu, gạch); Enter: chọn thêm các hộ đang hiện" value={locHo} onChange={(e) => setLocHo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setChonHo(new Set([...chonHo, ...hoLocChon.map(({ h }) => h.id)])); } }} style={{ width: 240 }} />
                    <button className="nut nut-nho" disabled={!hoLocChon.length} onClick={() => setChonHo(new Set([...chonHo, ...hoLocChon.map(({ h }) => h.id)]))}>{locHo.trim() ? `Chọn thêm ${hoLocChon.length} hộ đang lọc` : canChot ? `Chọn tất cả hộ đã chốt (${hoLocChon.length})` : "Chọn tất cả"}</button>
                    <button className="nut nut-nho" disabled={!chonHo.size} onClick={() => setChonHo(new Set())}>Bỏ chọn tất cả</button>
                  </div>
                  <div className="ds-chon-ho">
                    {hoLoc.map(({ h }) => (
                      <label key={h.id} className={duocChon(h.id) ? undefined : "mo"} title={duocChon(h.id) ? undefined : "Hộ chưa có trong bản phương án đã chốt — chốt phương án trước (Hồ sơ dự án → Chốt phương án)"}>
                        <input type="checkbox" disabled={!duocChon(h.id)} checked={chonHo.has(h.id) && duocChon(h.id)} onChange={(e) => { const s = new Set(chonHo); if (e.target.checked) s.add(h.id); else s.delete(h.id); setChonHo(s); }} />
                        {h.ma} · {h.ten}
                      </label>
                    ))}
                    {ds.length === 0 && <span className="mo">Dự án chưa có hồ sơ.</span>}
                    {ds.length > 0 && !hoLoc.length && <span className="mo">Không có hộ khớp “{locHo}”.</span>}
                  </div>
                  {soChuaChot > 0 && <div className="chu-nho mo mt-4" role="note">{soChuaChot} hộ chưa có trong bản phương án đã chốt (hiện mờ, không chọn được) — văn bản này chỉ lập cho hộ đã chốt phương án.</div>}
                </div>
              )}
              <div className="luoi luoi-3">
                <O nhan="Số văn bản" goiY={mau.phamVi === "HO" && chonHo.size > 1 ? "Nhập số → tăng dần cho từng hộ. Để trống để văn thư ghi khi ký." : "Để trống để văn thư ghi khi ký"}><input value={so} onChange={(e) => setSo(e.target.value)} /></O>
                <O nhan="Ngày ký" goiY="Để trống = để trống ngày tháng"><ONgay value={ngayKy} onChange={(e) => setNgayKy(e.target.value)} /></O>
              </div>
              {mau.nhapThem.length > 0 && (
                <div className="luoi luoi-2">
                  {mau.nhapThem.map((t) => (
                    <O key={t.truong} nhan={t.nhan} goiY={t.goiY} style={t.nhieuDong ? { gridColumn: "1/-1" } : undefined}>
                      {t.luaChon ? (
                        <Chon value={rieng[t.truong] ?? ""} onChange={(e) => setRieng({ ...rieng, [t.truong]: e.target.value })}>
                          {t.luaChon.map((l) => <option key={l.giaTri} value={l.giaTri}>{l.nhan}</option>)}
                        </Chon>
                      ) : t.nhieuDong ? (
                        <textarea rows={3} value={rieng[t.truong] ?? ""} onChange={(e) => setRieng({ ...rieng, [t.truong]: e.target.value })} placeholder="Để trống = in dấu chấm để viết tay" />
                      ) : (
                        <input value={rieng[t.truong] ?? ""} onChange={(e) => setRieng({ ...rieng, [t.truong]: e.target.value })} placeholder="Để trống = …………" />
                      )}
                    </O>
                  ))}
                </div>
              )}
              {canhBaoTN.length > 0 && (
                <div className="thong-bao thong-bao-vang" style={{ marginBottom: 0 }} aria-label="Kiểm tra thống nhất">
                  <b>Kiểm tra thống nhất trước khi tạo</b> (không chặn — văn bản là dự thảo):
                  <ul style={{ margin: "4px 0 0 18px" }}>{canhBaoTN.map((c) => <li key={c}>{c}</li>)}</ul>
                </div>
              )}
              <div className="nhom-nut">
                <button className="nut nut-chinh" disabled={dangTao || chanSua || (mau.phamVi !== "DU_AN" && chonHo.size === 0)} title={chanSua ? "Lưu hồ sơ trước khi tạo văn bản" : undefined} onClick={tao}>
                  {dangTao ? "Đang tạo…" : mau.phamVi === "HO" ? `Tạo văn bản cho ${chonHo.size} hộ` : mau.phamVi === "DOT" ? `Tạo văn bản cho đợt (${chonHo.size} hộ)` : "Tạo văn bản cấp dự án (.docx)"}
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
                      {n === "Căn cứ" && <ChonCanCu chung={chung} setChung={setChung} />}
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

/** Người dùng chọn/bỏ từng căn cứ theo dự án (căn cứ bỏ chọn lưu ở can_cu_bo, không in vào văn bản). */
function ChonCanCu({ chung, setChung }: { chung: Record<string, string>; setChung: (c: Record<string, string>) => void }) {
  const dong = (s?: string) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  const ds = [...new Set([...dong(chung.can_cu_chung), ...dong(chung.can_cu_du_an)])];
  const bo = new Set(dong(chung.can_cu_bo));
  const chuaCo = CAN_CU_MAC_DINH.filter((c) => !ds.includes(c));
  return (
    <div style={{ gridColumn: "1/-1" }}>
      <div className="chu-nho mo" style={{ marginBottom: 4 }}>Chọn căn cứ in vào văn bản của dự án (bỏ tích = không in). NQ 254/2025/QH15, NĐ 49/2026/NĐ-CP, NĐ 151/2025/NĐ-CP, QĐ 426/QĐ-UBND, QĐ 48/QĐ-UBND: phần mềm chưa có nguyên văn — mặc định không in; dự án áp dụng thì tích chọn hoặc nhập vào “Căn cứ riêng của dự án” đúng số, ngày, trích yếu.</div>
      {ds.map((c) => (
        <label key={c} className="chu-nho" style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 2 }}>
          <input type="checkbox" aria-label={`In căn cứ: ${c}`} checked={!bo.has(c)} onChange={(e) => { const b = new Set(bo); if (e.target.checked) b.delete(c); else b.add(c); setChung({ ...chung, can_cu_bo: [...b].join("\n") }); }} />
          <span>{c}</span>
        </label>
      ))}
      {chuaCo.length > 0 && <button className="nut nut-nho" onClick={() => setChung({ ...chung, can_cu_chung: [...dong(chung.can_cu_chung), ...chuaCo].join("\n") })}>Thêm lại căn cứ mặc định đã xóa ({chuaCo.length})</button>}
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

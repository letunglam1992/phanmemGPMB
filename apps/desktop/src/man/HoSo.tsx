import { useRef, useEffect, useMemo, useState } from "react";
import { TabCuon } from "../thanh-phan/TabCuon";
import { HopLichSuO, LichSuHo } from "../thanh-phan/LichSuHo";
import { DinhKemHo } from "../thanh-phan/DinhKemHo";
import { TT_GPMB, homNayIso, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { tienDoHo, daQuaBuoc, CAC_BUOC, TEN_DOI_TUONG, TEN_TRANG_THAI_BUOC, hoHieuLuc, laBuocChung, TEN_NHOM_GHI_CHU, type DuAn, type Ho } from "../mo-hinh";
import { ngayVN, tien } from "../thanh-phan/chung";
import { BieuTuong } from "../thanh-phan/BieuDo";
import { TabThua } from "./ho/Thua";
import { TabChiTra } from "./ho/ChiTra";
import { TabKiemDem } from "./ho/KiemDem";
import { TabTinhToan } from "./ho/TinhToan";
import { RaoLoi } from "../thanh-phan/RaoLoi";
import { TheBanGiao } from "../thanh-phan/TheBanGiao";
import { chuanMa, hoTrungMa } from "../ma-ho";
import { ghiBanNhap, layBanNhap, xoaBanNhap } from "../ban-nhap";
import { lyDoKhongDoiDot } from "../dot-thu-hoi";
import { TabThongTin } from "./ho/ThongTin";
import { TabNhanKhau } from "./ho/NhanKhau";
import { TabHoTro } from "./ho/HoTro";
import { TabHoTroKhac } from "./ho/HoTroKhac";
import { TabTienDo } from "./ho/TienDo";
import { TabVanBanHo } from "./ho/VanBanHo";
import { VanBan } from "./VanBan";
import { CongTinhNen } from "../thanh-phan/CongTinhNen";
import { ghiNhoDsHo, hoKeBen } from "../nho-ds-ho";
import { HopThoai } from "../thanh-phan/chung";
const CAC_TAB = [
  ["thong-tin", "Thông tin", "thongTin"],
  ["nhan-khau", "Nhân khẩu", "nguoi"],
  ["thua", "Thửa đất", "lop"],
  ["kiem-dem", "Kiểm đếm tài sản", "kiemDem"],
  ["ho-tro", "Hỗ trợ", "hoTro"],
  ["ho-tro-khac", "Hỗ trợ khác", "hoTro"],
  ["tinh", "Tính toán, giải trình", "mayTinh"],
  ["van-ban", "Văn bản", "vanBan"],
  ["tien-do", "Tiến độ", "dongHo"],
  ["chi-tra", "Chi trả", "theNganHang"],
  ["dinh-kem", "Đính kèm", "saoChep"],
  ["nhat-ky", "Nhật ký", "nhatKy"],
] as const;

const CO_COT_BEN: string[] = ["thong-tin", "nhan-khau", "ho-tro", "nhat-ky"];

export function HoSo({ duAnId, hoId, tabDau, maVbDau, thuaDau }: { duAnId: string; hoId: string; tabDau?: string; maVbDau?: string; thuaDau?: string }) {
  const { dsDuAn, hoCua, di, luuHo, chinhSach, xoaHo, quyen, bao } = useUngDung();
  const choSua = quyen("SUA_HO_SO");
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const goc = hoCua(duAnId).find((h) => h.id === hoId);
  // Bản nháp chưa lưu (P0-1): mở lại hồ sơ → khôi phục thay đổi chưa lưu của lần trước trong phiên
  const nhap = layBanNhap(hoId);
  const [h, setH] = useState<Ho | undefined>(nhap?.h ?? goc);
  const [tab, setTab] = useState<string>(tabDau ?? "thong-tin");
  // Mẫu văn bản đang soạn ở thẻ "Văn bản" (mở từ Tiến độ, Thông tin hồ sơ hoặc danh sách tạo nhanh)
  const [maVb, setMaVb] = useState<string | undefined>(maVbDau);
  const soanVb = (ma?: string) => {
    if (ma) setMaVb(ma);
    setTab("van-ban");
  };
  const [daSua, setDaSua] = useState(!!nhap);
  const [daKhoiPhuc, setDaKhoiPhuc] = useState(!!nhap);
  const boQuaLanDau = useRef(!!nhap);
  useEffect(() => {
    if (boQuaLanDau.current) {
      boQuaLanDau.current = false;
      return;
    }
    setH(goc);
    setDaSua(false);
    setDaKhoiPhuc(false);
    xoaBanNhap(hoId);
  }, [goc]); // eslint-disable-line react-hooks/exhaustive-deps
  const kq = useMemo(() => (duAn && h ? tinhHo(chinhSach(duAn), duAn, h) : null), [duAn, h, chinhSach]);
  // Chuyển hộ (luồng nhập nhiều hộ): Alt + ↑ về danh sách, Alt + → hộ tiếp theo; chưa lưu thì hỏi trước
  const [hoiLuu, setHoiLuu] = useState<{ nhan: string; di: () => void } | null>(null);
  const phim = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    const f = (e: KeyboardEvent) => phim.current(e);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  // §11.5: chuột phải trên ô → lịch sử thay đổi của ô (MenuChuotPhai phát sự kiện)
  const [lsO, setLsO] = useState<{ khoa: string; ten: string } | null>(null);
  useEffect(() => {
    const f = (e: Event) => setLsO((e as CustomEvent<{ khoa: string; ten: string }>).detail);
    window.addEventListener("gpmb-lich-su-o", f);
    return () => window.removeEventListener("gpmb-lich-su-o", f);
  }, []);
  if (!duAn || !h || !kq) return <div className="trang trong">Không tìm thấy hồ sơ.</div>;

  const doi = (moi: Ho) => {
    setH(moi);
    setDaSua(true);
    ghiBanNhap(moi);
  };
  const luu = async (ghiChu = "Cập nhật hồ sơ") => {
    // Chặn khi đổi sang mã đã dùng; mã trùng có sẵn từ dữ liệu cũ chỉ cảnh báo ở thẻ Thông tin
    const trung = chuanMa(h.ma) !== chuanMa(goc?.ma ?? "") ? hoTrungMa(hoCua(duAnId, true), h.ma, h.id) : null;
    if (trung || !h.ma.trim()) return bao(trung ? `Mã hồ sơ ${h.ma} đã dùng cho “${trung.ten}” — đổi mã ở thẻ Thông tin` : "Chưa có mã hồ sơ", "loi"), false;
    const chanDot = goc && duAn ? lyDoKhongDoiDot(duAn, goc, h.dotId) : null;
    if (chanDot) return bao(`Không đổi đợt thu hồi: ${chanDot}`, "loi"), false;
    try {
      await luuHo({ ...h, ma: h.ma.trim() }, ghiChu);
    } catch {
      return false; // lỗi ghi đã được báo
    }
    xoaBanNhap(h.id);
    setDaSua(false);
    setDaKhoiPhuc(false);
    return true;
  };
  /** Thẻ kế tiếp theo trình tự nhập liệu (bỏ Nhật ký) — "Lưu và tiếp" lưu rồi chuyển sang. */
  const THU_TU = CAC_TAB.map(([ma]) => ma).filter((ma) => ma !== "nhat-ky" && ma !== "dinh-kem");
  const ke = CAC_TAB.find(([ma]) => ma === THU_TU[THU_TU.indexOf(tab as (typeof THU_TU)[number]) + 1]);
  const luuTiep = async () => {
    if (daSua && !(await luu())) return;
    if (ke) {
      setTab(ke[0]);
      document.querySelector(".the-tab")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };
  const ke2 = hoKeBen(duAnId, hoId, hoCua(duAnId).map((x) => x.id));
  const tenHo = (id?: string) => (id ? hoCua(duAnId).find((x) => x.id === id) : undefined);
  /** Rời hồ sơ: chưa lưu → hỏi lưu (Lưu rồi chuyển / Chuyển, giữ bản nháp / Ở lại). */
  const chuyen = (nhan: string, diToi: () => void) => {
    ghiNhoDsHo(duAnId, { vuaLam: hoId });
    if (daSua && choSua) setHoiLuu({ nhan, di: diToi });
    else diToi();
  };
  const veDanhSach = () => chuyen("về danh sách hộ", () => di({ ten: "du-an", duAnId, tab: "ho" }));
  const sangHo = (id?: string) => id && chuyen(`sang hồ sơ ${tenHo(id)?.ma ?? ""} ${tenHo(id)?.ten ?? ""}`.trim(), () => di({ ten: "ho", duAnId, hoId: id, tab: "thong-tin" }));
  phim.current = (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || hoiLuu) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      veDanhSach();
    } else if (e.key === "ArrowRight" && ke2.sau) {
      e.preventDefault();
      sangHo(ke2.sau);
    }
  };
  const hieuLuc = hoHieuLuc(duAn, h);
  const tt = trangThaiHo(duAn, h, kq, homNayIso());
  const dem: Record<string, number> = { "nhan-khau": h.nhanKhau.length, thua: h.thua.length, "kiem-dem": h.taiSan.length, tinh: kq.tong.soDongCanXacNhan + kq.tong.soDongThieuCanCu };

  return (
    <div className="trang trang-ho">
      <nav className="duong-dan-2" aria-label="Đường dẫn">
        <button onClick={() => di({ ten: "tong-quan" })} aria-label="Tổng quan"><BieuTuong ten="nha" co={16} /></button>
        <button onClick={() => di({ ten: "tong-quan" })}>Tổng quan</button>
        <BieuTuong ten="phai" co={13} />
        <button onClick={() => di({ ten: "du-an", duAnId })}>{duAn.ten}</button>
        <BieuTuong ten="phai" co={13} />
        <button onClick={() => di({ ten: "du-an", duAnId, tab: "ho" })}>Hồ sơ</button>
        <BieuTuong ten="phai" co={13} />
        <b>Hồ sơ hộ, cá nhân, tổ chức</b>
      </nav>
      <div className="dong-tieu-de ho-tieu-de">
        <div style={{ minWidth: 0 }}>
          <div className="nhan-trang">Hồ sơ hộ, cá nhân, tổ chức</div>
          <h1>{h.ma} · {h.ten}</h1>
          <div className="mo-ta">
            {h.vuongMac && <span className="nhan nhan-do" style={{ marginRight: 6 }}>! Vướng mắc: {h.vuongMac.noiDung}</span>}
            {TEN_DOI_TUONG[h.loai]} · {h.diaChi || "Chưa có địa chỉ"} · {h.thua.length} thửa · {h.nhanKhau.length} nhân khẩu
          </div>
          <div className="chuyen-ho mt-6" data-chuyen-ho>
            <button className="nut nut-nho" onClick={veDanhSach} title="Về danh sách hộ, giữ bộ lọc và vị trí (Alt + ↑)"><BieuTuong ten="danhSach" co={14} /> Danh sách hộ</button>
            <button className="nut nut-nho" disabled={!ke2.truoc} onClick={() => sangHo(ke2.truoc)} title={ke2.truoc ? `Hộ trước: ${tenHo(ke2.truoc)?.ma} ${tenHo(ke2.truoc)?.ten}` : "Đang ở hộ đầu danh sách"}>← Hộ trước</button>
            <span className="mo chu-nho">{ke2.viTri}/{ke2.tong}{ke2.theoLoc ? " (theo danh sách đang lọc)" : ""}</span>
            <button className="nut nut-nho" disabled={!ke2.sau} onClick={() => sangHo(ke2.sau)} title={ke2.sau ? `Hộ tiếp theo: ${tenHo(ke2.sau)?.ma} ${tenHo(ke2.sau)?.ten} (Alt + →)` : "Đang ở hộ cuối danh sách"}>Hộ tiếp theo →</button>
          </div>
        </div>
        <div className="phai">
          <div className="the-tong-tien">
            <span className="bt"><BieuTuong ten="mayTinh" co={22} /></span>
            <div>
              <div className="mo chu-nho">Tổng tạm tính (sau làm tròn)</div>
              <b>{tien(kq.tong.tongLamTron)} đ</b>
            </div>
          </div>
          {daSua && <span className="nhan nhan-vang">Chưa lưu</span>}
          {choSua && <button className="nut nut-lon" disabled={!daSua} onClick={() => { setH(goc); setDaSua(false); setDaKhoiPhuc(false); xoaBanNhap(hoId); }}><BieuTuong ten="hoanTac" co={17} /> Hoàn tác</button>}
          {choSua && <button className={`nut nut-lon ${ke ? "" : "nut-chinh"}`} disabled={!daSua} data-phim="luu" title="Lưu hồ sơ (Ctrl + S)" onClick={() => luu()}><BieuTuong ten="luu" co={17} /> Lưu hồ sơ</button>}
          {choSua && ke && <button className="nut nut-chinh nut-lon" data-phim="luu-tiep" title="Lưu (nếu có thay đổi) rồi chuyển sang thẻ tiếp theo (Ctrl + Enter)" onClick={() => void luuTiep()}>{daSua ? "Lưu và tiếp" : "Tiếp"}: {ke[1]} →</button>}
        </div>
      </div>

      <div className="the the-buoc-tron">
        <BuocTron ho={hieuLuc} onChon={() => setTab("tien-do")} />
        <div className="buoc-tron-chu"><span>Bước 1–4: bước chung của dự án</span><span>Bước 5–16: theo từng hộ, cá nhân, tổ chức</span></div>
      </div>

      <GhiChuBanDoHo duAn={duAn} hoId={h.id} />

      <div className="the the-tab">
        <TabCuon className="tab tab-bt tab-gon" chon={tab}>
          {CAC_TAB.map(([ma, ten, bt]) => (
            <button key={ma} role="tab" aria-selected={tab === ma} className={tab === ma ? "chon" : ""} onClick={() => setTab(ma)}>
              <BieuTuong ten={bt} co={18} />
              {ten}
              {dem[ma] ? <span className="dem">{dem[ma]}</span> : null}
            </button>
          ))}
        </TabCuon>
      </div>

      {/* Cột "Thông tin hồ sơ" hiện ở các tab nhập liệu gọn; tab bảng rộng (thửa, kiểm đếm, tính toán, tiến độ, chi trả) dùng toàn bộ chiều ngang */}
      <div className={`ho-khung ${CO_COT_BEN.includes(tab) ? "" : "ho-khung-rong"}`}>
        {CO_COT_BEN.includes(tab) && (
          <aside className="ho-ben">
            <TheThongTinHo h={h} hieuLuc={hieuLuc} tt={tt} moTab={setTab} soanVanBan={() => soanVb()} />
          </aside>
        )}
        <div className="ho-noi-dung">
          {daKhoiPhuc && (
            <div className="thong-bao thong-bao-vang mb-10">
              Đã khôi phục các thay đổi <b>chưa lưu</b> của hồ sơ này từ lần mở trước (lúc {new Date(nhap?.luc ?? Date.now()).toLocaleTimeString("vi-VN")}). Bấm “Lưu hồ sơ” để lưu, hoặc “Hoàn tác” để bỏ.
            </div>
          )}
          <RaoLoi ten={`thẻ ${CAC_TAB.find(([m]) => m === tab)?.[1] ?? tab}`} khoa={tab}>
          {/* tài khoản không có quyền sửa: khóa các ô nhập của các thẻ nhập liệu */}
          <fieldset className="khung-quyen" disabled={!choSua}>
          {tab === "thong-tin" && <TabThongTin h={h} doi={doi} duAn={duAn} goc={goc} />}
          {tab === "nhan-khau" && <TabNhanKhau h={h} doi={doi} />}
          {tab === "thua" && <TabThua h={h} duAn={duAn} doi={doi} noiBat={thuaDau} />}
          {tab === "kiem-dem" && <TabKiemDem h={h} doi={doi} duAn={duAn} />}
          {tab === "ho-tro" && <TabHoTro h={h} doi={doi} duAn={duAn} kq={kq} />}
          {tab === "ho-tro-khac" && <TabHoTroKhac h={h} doi={doi} duAn={duAn} kq={kq} />}
          </fieldset>
          {tab === "tinh" && <TabTinhToan h={h} duAn={duAn} kq={kq} />}
          {tab === "chi-tra" && <fieldset className="khung-quyen" disabled={!choSua}><TabChiTra h={h} duAn={duAn} doi={doi} /></fieldset>}
          {tab === "tien-do" && (
            <>
              <TabTienDo h={h} duAn={duAn} doi={doi} moDuAn={() => di({ ten: "du-an", duAnId, tab: "buoc-chung" })} soanMau={(ma) => soanVb(ma)} luuNgay={async (moi, nk) => { setH(moi); await luuHo(moi, nk); xoaBanNhap(hoId); setDaSua(false); }} />
              <TheBanGiao h={h} duAn={duAn} kq={kq} luuNgay={async (moi, nk) => { setH(moi); await luuHo(moi, nk); xoaBanNhap(hoId); setDaSua(false); }} moThongTinDuAn={() => di({ ten: "du-an", duAnId, tab: "thong-tin" })} />
            </>
          )}
          {tab === "dinh-kem" && <DinhKemHo h={h} duAn={duAn} />}
          {tab === "van-ban" && kq && (
            // Văn bản của hộ điền cả danh sách hộ của dự án (biểu kèm, tổng hợp) → dự án lớn: tính nền trước, không đứng giao diện
            <CongTinhNen duAnId={duAnId}>
              <VanBan key={`${h.id}-${maVb ?? ""}`} duAnId={duAnId} maDau={maVb} nhung={{ ho: h, kq, daSua }} />
              <details className="mt-10">
                <summary className="chu-nho" style={{ fontWeight: 600, cursor: "pointer" }}>Tạo nhanh các mẫu của hộ theo bước (không cần nhập số, ngày)</summary>
                <TabVanBanHo h={h} duAn={duAn} kq={kq} hieuLuc={hieuLuc} soan={(ma) => { setMaVb(ma); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              </details>
            </CongTinhNen>
          )}
          {tab === "nhat-ky" && (
            <div className="the">
              <div className="the-dau"><h2>Nhật ký hồ sơ</h2><span className="mo chu-nho">Mọi thay đổi đã lưu, kèm người thực hiện</span></div>
              <table className="bang">
                <thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Nội dung</th></tr></thead>
                <tbody>
                  {[...h.nhatKy].reverse().map((n, i) => (
                    <tr key={i}><td className="chu-nho">{new Date(n.luc).toLocaleString("vi-VN")}</td><td>{n.nguoi}</td><td>{n.noiDung}</td></tr>
                  ))}
                  {h.nhatKy.length === 0 && <tr><td colSpan={3} className="trong">Chưa có.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {tab === "nhat-ky" && !daSua && goc && <LichSuHo h={goc} />}
          {lsO && goc && <HopLichSuO h={goc} khoa={lsO.khoa} ten={lsO.ten} dong={() => setLsO(null)} />}
          </RaoLoi>
          {CAC_TAB.findIndex(([m]) => m === tab) >= CAC_TAB.findIndex(([m]) => m === "van-ban") && (
            <div className="thanh-xong-ho" data-xong-ho>
              <span className="mo chu-nho" style={{ marginRight: "auto" }}>Nhập xong hộ này? Về danh sách (giữ bộ lọc, vị trí; tô sáng hộ vừa làm) hoặc sang hộ tiếp theo.</span>
              <button className="nut" disabled={!ke2.truoc} onClick={() => sangHo(ke2.truoc)}>← Hộ trước</button>
              <button className="nut" disabled={!ke2.sau} onClick={() => sangHo(ke2.sau)} title="Alt + →">Hộ tiếp theo →</button>
              <button className="nut nut-chinh" onClick={veDanhSach} title="Alt + ↑">Xong hộ này → Danh sách hộ</button>
            </div>
          )}
          {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan > 0 && tab !== "tinh" && (
            <div className="thong-bao thong-bao-vang mt-14">
              Còn {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan} khoản chưa đủ căn cứ hoặc cần xác nhận — hồ sơ chưa thể chốt.{" "}
              <button className="nut nut-chu nut-nho" onClick={() => setTab("tinh")}>Xem chi tiết</button>
            </div>
          )}
          {choSua && (
            <div className="vung-xoa">
              <button className="nut-xoa" onClick={async () => {
                const lyDo = prompt(`Đưa hồ sơ ${h.ma} – ${h.ten} vào thùng rác?\nKhôi phục được trong thùng rác (Quản trị → Thùng rác).\n\nLý do xóa (bắt buộc):`)?.trim();
                if (lyDo && (await xoaHo(h.id, lyDo))) di({ ten: "du-an", duAnId, tab: "ho" });
              }}>
                <BieuTuong ten="thungRac" co={19} />
                <span><b>Xóa hồ sơ</b><small>Đưa hồ sơ vào thùng rác — khôi phục được trong 30 ngày (Quản trị → Thùng rác).</small></span>
              </button>
            </div>
          )}
        </div>
      </div>
      {hoiLuu && (
        <HopThoai tieuDe="Hồ sơ chưa lưu" dong={() => setHoiLuu(null)} rong={560}>
          <p>Hồ sơ <b>{h.ma} · {h.ten}</b> có thay đổi <b>chưa lưu</b>. Lưu trước khi {hoiLuu.nhan}?</p>
          <div className="nhom-nut mt-10" style={{ justifyContent: "flex-end" }} data-hoi-luu>
            <button className="nut" onClick={() => setHoiLuu(null)}>Ở lại</button>
            <button className="nut" title="Thay đổi chưa lưu được giữ làm bản nháp; mở lại hồ sơ này trong phiên sẽ khôi phục" onClick={() => { const x = hoiLuu; setHoiLuu(null); x.di(); }}>Chuyển, giữ bản nháp</button>
            <button className="nut nut-chinh" autoFocus onClick={async () => { const x = hoiLuu; if (await luu()) { setHoiLuu(null); x.di(); } }}>Lưu rồi chuyển</button>
          </div>
        </HopThoai>
      )}
    </div>
  );
}

/** Thanh bước dạng vòng tròn đánh số; bước chung (1–4) được nhóm dưới nhãn "Bước chung của dự án". */
function BuocTron({ ho, onChon }: { ho: Ho; onChon: (ma: string) => void }) {
  const hienTai = CAC_BUOC.findIndex((b) => !daQuaBuoc(ho.tienDo[b.ma]?.trangThai));
  return (
    <ol className="buoc-tron">
      {CAC_BUOC.map((b, i) => {
        const t = ho.tienDo[b.ma]?.trangThai ?? "CHUA";
        return (
          <li key={b.ma} className={`${t} ${i === hienTai ? "hien-tai" : ""} ${laBuocChung(b.ma) ? "chung" : ""}`}>
            <button onClick={() => onChon(b.ma)} title={`Bước ${b.ma}. ${b.ten} — ${TEN_TRANG_THAI_BUOC[t]}${laBuocChung(b.ma) ? " (bước chung của dự án)" : ""}`}>
              <span className="so">{t === "XONG" && i !== hienTai ? "✓" : t === "KHONG_AP_DUNG" ? "–" : b.ma}</span>
              <span className="ten">{b.ten}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function TheThongTinHo({ h, hieuLuc, tt, moTab, soanVanBan }: { h: Ho; hieuLuc: Ho; tt: TrangThaiGpmb; moTab: (t: string) => void; soanVanBan: () => void }) {
  const [menu, setMenu] = useState(false);
  const [tatCa, setTatCa] = useState(false);
  const iHienTai = CAC_BUOC.findIndex((b) => !daQuaBuoc(hieuLuc.tienDo[b.ma]?.trangThai));
  const buocHt = iHienTai < 0 ? CAC_BUOC.length : iHienTai + 1;
  const phanTram = Math.round(tienDoHo(hieuLuc).tyLe * 100); // trên các bước áp dụng (P1-3)
  const dau = Math.max(0, Math.min(iHienTai < 0 ? CAC_BUOC.length - 5 : iHienTai - 1, CAC_BUOC.length - 5));
  const hienThi = tatCa ? CAC_BUOC : CAC_BUOC.slice(dau, dau + 5);
  const dong = (bt: string, nhan: string, gt: React.ReactNode, tab?: string) => (
    <div className={`ttho-dong ${tab ? "bam" : ""}`} onClick={tab ? () => moTab(tab) : undefined} role={tab ? "button" : undefined} tabIndex={tab ? 0 : undefined} title={tab ? "Bấm để xem chi tiết" : undefined}>
      <BieuTuong ten={bt} co={17} /><span>{nhan}</span><b>{gt}</b>
    </div>
  );
  return (
    <div className="the ttho">
      <div className="ttho-dau">
        <h3>Thông tin hồ sơ</h3>
        <div className="menu-nguoi day-phai">
          <button className="nut-vuong" aria-label="Thao tác khác" aria-expanded={menu} onClick={() => setMenu(!menu)}><BieuTuong ten="baCham" co={18} /></button>
          {menu && (
            <div className="menu-tha" role="menu" onMouseLeave={() => setMenu(false)}>
              <button role="menuitem" onClick={() => { moTab("thong-tin"); setMenu(false); }}><BieuTuong ten="thongTin" co={16} /> Sửa thông tin</button>
              <button role="menuitem" onClick={() => { moTab("tien-do"); setMenu(false); }}><BieuTuong ten="dongHo" co={16} /> Cập nhật tiến độ</button>
              <button role="menuitem" onClick={() => { soanVanBan(); setMenu(false); }}><BieuTuong ten="vanBan" co={16} /> Soạn văn bản cho hộ</button>
            </div>
          )}
        </div>
      </div>
      <div className="ttho-ten">
        <span className="ttho-bt"><BieuTuong ten="thongTin" co={22} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="ttho-ho">{h.ma} · {h.ten}</div>
          <span className="nhan nhan-xanh">{TEN_DOI_TUONG[h.loai]}</span>
        </div>
      </div>
      <div className="ttho-bang">
        {dong("viTri", "Địa chỉ", h.diaChi || "—", "thong-tin")}
        {dong("lop", "Số thửa đất", `${h.thua.length} thửa`, "thua")}
        {dong("nguoi", "Số nhân khẩu", h.nhanKhau.length, "nhan-khau")}
        {dong("thongTin", "Tình trạng", <span className="nhan" style={{ background: TT_GPMB[tt].nen, color: "var(--chu)" }}>{TT_GPMB[tt].ten}</span>, "tien-do")}
      </div>
      <div className="ttho-td">
        <div className="ttho-td-dau"><b>Tiến độ thực hiện</b><span className="mo">Bước {buocHt}/{CAC_BUOC.length}</span></div>
        <div className="ttho-thanh"><div className="thanh" role="progressbar" aria-valuenow={phanTram} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.max(phanTram, 2)}%` }} /></div><b>{phanTram}%</b></div>
        <ol className="ttho-buoc">
          {hienThi.map((b) => {
            const bh = hieuLuc.tienDo[b.ma];
            const t = bh?.trangThai ?? "CHUA";
            const laHt = CAC_BUOC[iHienTai]?.ma === b.ma;
            return (
              <li key={b.ma} className={`${t} ${laHt ? "hien-tai" : ""}`} onClick={() => moTab("tien-do")}>
                <span className="so">{t === "XONG" ? "✓" : t === "KHONG_AP_DUNG" ? "–" : b.ma}</span>
                <div>
                  <div className="ten">{b.ten}{bh?.tuDuAn && <span className="nhan nhan-xam" style={{ marginLeft: 6, fontSize: 10.5 }}>chung</span>}</div>
                  {(laHt || t !== "CHUA") && <div className="tt">{TEN_TRANG_THAI_BUOC[t]}{bh?.ngay ? ` · ${ngayVN(bh.ngay)}` : ""}</div>}
                </div>
              </li>
            );
          })}
        </ol>
        <button className="nut nut-nho ttho-xem" onClick={() => setTatCa(!tatCa)}>
          {tatCa ? "Thu gọn" : `Xem tất cả ${CAC_BUOC.length} bước`} <span style={{ display: "inline-flex", transform: tatCa ? "rotate(180deg)" : undefined }}><BieuTuong ten="xuong" co={14} /></span>
        </button>
      </div>
    </div>
  );
}

/** Ghi chú hiện trường gắn với hộ trên bản đồ (docs/08 §9.6) — hiện ngay trong hồ sơ hộ; đánh dấu đã xử lý / mở lại; mở bản đồ. */
function GhiChuBanDoHo({ duAn, hoId }: { duAn: DuAn; hoId: string }) {
  const { luuDuAn, quyen, di, nguoiDung } = useUngDung();
  const ds = (duAn.banDo?.ghiChu ?? []).filter((g) => g.hoId === hoId);
  if (!ds.length) return null;
  const chua = ds.filter((g) => !g.daXuLy).length;
  const doi = (id: string, daXuLy: boolean) =>
    void luuDuAn({ ...duAn, banDo: { ...duAn.banDo!, ghiChu: (duAn.banDo?.ghiChu ?? []).map((g) => (g.id === id ? { ...g, daXuLy, ...(daXuLy ? { xuLyLuc: new Date().toISOString(), xuLyBoi: nguoiDung } : {}) } : g)) } });
  return (
    <div className={`thong-bao ${chua ? "thong-bao-vang" : ""} mb-10`} aria-label="Ghi chú hiện trường của hộ">
      <b>Ghi chú hiện trường trên bản đồ</b> ({ds.length}{chua ? `, ${chua} chưa xử lý` : ", đã xử lý hết"}):
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
        {ds.map((g) => (
          <li key={g.id} className="chu-nho" style={g.daXuLy ? { opacity: 0.65 } : undefined}>
            <b>{TEN_NHOM_GHI_CHU[g.nhom]}</b>: {g.noiDung} <span className="mo">({ngayVN(g.ngay)}{g.nguoi ? ` · ${g.nguoi}` : ""}{g.daXuLy ? " · đã xử lý" : ""})</span>{" "}
            {quyen("SUA_HO_SO") && <button className="nut nut-chu nut-nho" onClick={() => doi(g.id, !g.daXuLy)}>{g.daXuLy ? "Mở lại" : "Đánh dấu đã xử lý"}</button>}
          </li>
        ))}
      </ul>
      <button className="nut nut-nho mt-4" onClick={() => di({ ten: "du-an", duAnId: duAn.id, tab: "ban-do" })}>Xem trên bản đồ</button>
    </div>
  );
}

import { useRef, Fragment, useEffect, useMemo, useState } from "react";
import { TabCuon } from "../thanh-phan/TabCuon";
import { LichSuHo } from "../thanh-phan/LichSuHo";
import { kiemTraDuyetBuoc } from "../tai-khoan";
import { hanCuaBuoc, tinhHanBuoc } from "../han-buoc";
import { TT_GPMB, homNayIso, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { useUngDung } from "../ung-dung";
import { tienBoiThuongDatO, tienSddTdc, tinhHo, type KetQuaHo } from "../tinh-ho";
import { dienTichSuatToiThieu } from "@gpmb/core";
import { tienDoHo, daQuaBuoc, BUOC_CHUNG, CAC_BUOC, TEN_DOI_TUONG, TEN_HINH_THUC_TDC, type HinhThucTdc, type TaiDinhCuHo, TEN_TRANG_THAI_BUOC, hoHieuLuc, laBuocChung, taoId, tienDoHieuLuc, type DuAn, type Ho, type LoaiDoiTuong, type TrangThaiBuoc } from "../mo-hinh";
import { NhanDong, O, ngayVN, tien } from "../thanh-phan/chung";
import { BieuTuong } from "../thanh-phan/BieuDo";
import { TabThua } from "./ho/Thua";
import { TabChiTra } from "./ho/ChiTra";
import { TabKiemDem } from "./ho/KiemDem";
import { TabTinhToan } from "./ho/TinhToan";
import { DANH_MUC_MAU } from "../van-ban/danh-muc";
import { taoNhanh } from "../van-ban/tao-nhanh";
import { taiXuong } from "../tai-xuong";
import { tenTep } from "../ten-tep";
import type { DiChuyen } from "@gpmb/core";
import { Chon } from "../thanh-phan/Chon";
import { RaoLoi } from "../thanh-phan/RaoLoi";
import { TheBanGiao } from "../thanh-phan/TheBanGiao";
import { chuanMa, hoTrungMa } from "../ma-ho";
import { ghiBanNhap, layBanNhap, xoaBanNhap } from "../ban-nhap";
import { OSo } from "../thanh-phan/OSo";

const CAC_TAB = [
  ["thong-tin", "Thông tin", "thongTin"],
  ["nhan-khau", "Nhân khẩu", "nguoi"],
  ["thua", "Thửa đất", "lop"],
  ["kiem-dem", "Kiểm đếm tài sản", "kiemDem"],
  ["ho-tro", "Hỗ trợ", "hoTro"],
  ["tinh", "Tính toán, giải trình", "mayTinh"],
  ["tien-do", "Tiến độ", "dongHo"],
  ["chi-tra", "Chi trả", "theNganHang"],
  ["van-ban", "Văn bản", "vanBan"],
  ["nhat-ky", "Nhật ký", "nhatKy"],
] as const;

const CO_COT_BEN: string[] = ["thong-tin", "nhan-khau", "ho-tro", "nhat-ky"];

export function HoSo({ duAnId, hoId, tabDau }: { duAnId: string; hoId: string; tabDau?: string }) {
  const { dsDuAn, hoCua, di, luuHo, chinhSach, xoaHo, quyen, bao } = useUngDung();
  const choSua = quyen("SUA_HO_SO");
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const goc = hoCua(duAnId).find((h) => h.id === hoId);
  // Bản nháp chưa lưu (P0-1): mở lại hồ sơ → khôi phục thay đổi chưa lưu của lần trước trong phiên
  const nhap = layBanNhap(hoId);
  const [h, setH] = useState<Ho | undefined>(nhap?.h ?? goc);
  const [tab, setTab] = useState<string>(tabDau ?? "thong-tin");
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
  if (!duAn || !h || !kq) return <div className="trang trong">Không tìm thấy hồ sơ.</div>;

  const doi = (moi: Ho) => {
    setH(moi);
    setDaSua(true);
    ghiBanNhap(moi);
  };
  const luu = async (ghiChu = "Cập nhật hồ sơ") => {
    // Chặn khi đổi sang mã đã dùng; mã trùng có sẵn từ dữ liệu cũ chỉ cảnh báo ở thẻ Thông tin
    const trung = chuanMa(h.ma) !== chuanMa(goc?.ma ?? "") ? hoTrungMa(hoCua(duAnId, true), h.ma, h.id) : null;
    if (trung || !h.ma.trim()) return bao(trung ? `Mã hồ sơ ${h.ma} đã dùng cho “${trung.ten}” — đổi mã ở thẻ Thông tin` : "Chưa có mã hồ sơ", "loi");
    await luuHo({ ...h, ma: h.ma.trim() }, ghiChu);
    xoaBanNhap(h.id);
    setDaSua(false);
    setDaKhoiPhuc(false);
  };
  /** Thẻ kế tiếp theo trình tự nhập liệu (bỏ Nhật ký) — "Lưu và tiếp" lưu rồi chuyển sang. */
  const THU_TU = CAC_TAB.map(([ma]) => ma).filter((ma) => ma !== "nhat-ky");
  const ke = CAC_TAB.find(([ma]) => ma === THU_TU[THU_TU.indexOf(tab as (typeof THU_TU)[number]) + 1]);
  const luuTiep = async () => {
    if (daSua) await luu();
    if (ke) {
      setTab(ke[0]);
      document.querySelector(".the-tab")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

      <div className="the the-tab">
        <TabCuon chon={tab}>
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
            <TheThongTinHo h={h} hieuLuc={hieuLuc} tt={tt} moTab={setTab} soanVanBan={() => di({ ten: "van-ban", duAnId, hoId: h.id })} />
          </aside>
        )}
        <div className="ho-noi-dung">
          {daKhoiPhuc && (
            <div className="thong-bao thong-bao-vang" style={{ marginBottom: 10 }}>
              Đã khôi phục các thay đổi <b>chưa lưu</b> của hồ sơ này từ lần mở trước (lúc {new Date(nhap?.luc ?? Date.now()).toLocaleTimeString("vi-VN")}). Bấm “Lưu hồ sơ” để lưu, hoặc “Hoàn tác” để bỏ.
            </div>
          )}
          <RaoLoi ten={`thẻ ${CAC_TAB.find(([m]) => m === tab)?.[1] ?? tab}`} khoa={tab}>
          {/* tài khoản không có quyền sửa: khóa các ô nhập của các thẻ nhập liệu */}
          <fieldset className="khung-quyen" disabled={!choSua}>
          {tab === "thong-tin" && <TabThongTin h={h} doi={doi} />}
          {tab === "nhan-khau" && <TabNhanKhau h={h} doi={doi} />}
          {tab === "thua" && <TabThua h={h} duAn={duAn} doi={doi} />}
          {tab === "kiem-dem" && <TabKiemDem h={h} doi={doi} />}
          {tab === "ho-tro" && <TabHoTro h={h} doi={doi} duAn={duAn} kq={kq} />}
          </fieldset>
          {tab === "tinh" && <TabTinhToan h={h} duAn={duAn} kq={kq} />}
          {tab === "chi-tra" && <fieldset className="khung-quyen" disabled={!choSua}><TabChiTra h={h} duAn={duAn} doi={doi} /></fieldset>}
          {tab === "tien-do" && (
            <>
              <TabTienDo h={h} duAn={duAn} doi={doi} moDuAn={() => di({ ten: "du-an", duAnId, tab: "buoc-chung" })} soanMau={(ma) => di({ ten: "van-ban", duAnId, ma, hoId: h.id })} luuNgay={async (moi, nk) => { setH(moi); await luuHo(moi, nk); xoaBanNhap(hoId); setDaSua(false); }} />
              <TheBanGiao h={h} duAn={duAn} kq={kq} luuNgay={async (moi, nk) => { setH(moi); await luuHo(moi, nk); xoaBanNhap(hoId); setDaSua(false); }} moThongTinDuAn={() => di({ ten: "du-an", duAnId, tab: "thong-tin" })} />
            </>
          )}
          {tab === "van-ban" && <TabVanBanHo h={h} duAn={duAn} kq={kq} hieuLuc={hieuLuc} soan={(ma) => di({ ten: "van-ban", duAnId, ma, hoId: h.id })} />}
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
          </RaoLoi>
          {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan > 0 && tab !== "tinh" && (
            <div className="thong-bao thong-bao-vang" style={{ marginTop: 14 }}>
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
                <span><b>Xóa hồ sơ</b><small>Xóa vĩnh viễn hồ sơ và toàn bộ dữ liệu liên quan.</small></span>
              </button>
            </div>
          )}
        </div>
      </div>
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
        <div className="menu-nguoi" style={{ marginLeft: "auto" }}>
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

type Tab = { h: Ho; doi: (h: Ho) => void };

const VB_DA_BAN_HANH = [
  ["tb_thu_hoi", "Thông báo thu hồi đất (Mẫu 01)"],
  ["qd_kiem_dem", "QĐ kiểm đếm bắt buộc (Mẫu 06)"],
  ["qd_thu_hoi", "QĐ thu hồi đất (Mẫu 15)"],
  ["tb_gui_tien", "TB gửi tiền vào tài khoản (Mẫu 18)"],
] as const;

function TabThongTin({ h, doi }: Tab) {
  const { hoCua } = useUngDung();
  const trung = hoTrungMa(hoCua(h.duAnId, true), h.ma, h.id);
  const s = (k: keyof Ho) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => doi({ ...h, [k]: e.target.value });
  const vb = h.vanBan ?? {};
  return (
    <div className="luoi">
    <div className="the the-than">
      <div className="luoi luoi-3">
        <O nhan="Mã hồ sơ" goiY={trung ? <span className="chu-do">Trùng mã với hồ sơ “{trung.ten}” — đổi mã khác</span> : !h.ma.trim() ? <span className="chu-do">Chưa có mã</span> : undefined}>
          <input className={trung || !h.ma.trim() ? "loi-nhap" : ""} value={h.ma} onChange={s("ma")} />
        </O>
        <O nhan="Đối tượng">
          <Chon value={h.loai} onChange={(e) => doi({ ...h, loai: e.target.value as LoaiDoiTuong })}>
            {Object.entries(TEN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Chon>
        </O>
        <O nhan={h.loai === "TO_CHUC" ? "Tên tổ chức" : "Họ tên chủ hộ / cá nhân"}><input value={h.ten} onChange={s("ten")} /></O>
        <O nhan={h.loai === "TO_CHUC" ? "Mã số thuế / QĐ thành lập" : "Số định danh cá nhân"} goiY="Thông tin cá nhân chỉ lưu trên máy này"><input value={h.soDinhDanh} onChange={s("soDinhDanh")} /></O>
        <O nhan="Điện thoại"><input value={h.dienThoai} onChange={s("dienThoai")} /></O>
        <O nhan="Địa chỉ thường trú / trụ sở"><input value={h.diaChi} onChange={s("diaChi")} /></O>
        <O nhan="Vướng mắc cần ưu tiên xử lý" style={{ gridColumn: "1/-1" }} goiY="Khiếu nại, chưa nhận tiền, tranh chấp, chưa bàn giao… Hồ sơ có vướng mắc được tô đỏ trên bản đồ và đưa vào cảnh báo.">
          <div className="nhom-nut">
            <input style={{ flex: 1 }} value={h.vuongMac?.noiDung ?? ""} placeholder="Để trống nếu không có" onChange={(e) => doi({ ...h, vuongMac: e.target.value ? { noiDung: e.target.value, ngay: h.vuongMac?.ngay ?? new Date().toISOString().slice(0, 10) } : null })} />
            {h.vuongMac && <button className="nut" onClick={() => doi({ ...h, vuongMac: null })}>Đã giải quyết</button>}
          </div>
        </O>
      </div>
    </div>
    <div className="the">
      <div className="the-dau"><h3>Văn bản đã ban hành cho hộ</h3><span className="mo chu-nho">Tự ghi khi tạo văn bản có số; dùng làm căn cứ cho mẫu sau</span></div>
      <table className="bang">
        <thead><tr><th>Văn bản</th><th style={{ width: 220 }}>Số, ký hiệu</th><th style={{ width: 180 }}>Ngày</th></tr></thead>
        <tbody>
          {VB_DA_BAN_HANH.map(([k, ten]) => (
            <tr key={k}>
              <td>{ten}</td>
              <td><input value={vb[`${k}_so`] ?? ""} placeholder="vd. 12/QĐ-UBND" onChange={(e) => doi({ ...h, vanBan: { ...vb, [`${k}_so`]: e.target.value } })} /></td>
              <td><input value={vb[`${k}_ngay`] ?? ""} placeholder="dd/mm/yyyy" onChange={(e) => doi({ ...h, vanBan: { ...vb, [`${k}_ngay`]: e.target.value } })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}

type CotNk = "tt" | "hoTen" | "namSinh" | "quanHe" | "ghiChu";

function TabNhanKhau({ h, doi }: Tab) {
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState("");
  const [sx, setSx] = useState<{ cot: CotNk; tang: boolean }>({ cot: "tt", tang: true });
  const sua = (id: string, k: string, v: string) => doi({ ...h, nhanKhau: h.nhanKhau.map((n) => (n.id === id ? { ...n, [k]: v } : n)) });
  const them = () => doi({ ...h, nhanKhau: [...h.nhanKhau, { id: taoId(), hoTen: "", quanHe: h.nhanKhau.length ? "" : "Chủ hộ" }] });
  const dsQuanHe = [...new Set(h.nhanKhau.map((n) => n.quanHe.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
  const chuan = (x: string) => x.toLocaleLowerCase("vi");
  const ds = h.nhanKhau
    .map((n, i) => ({ n, tt: i + 1 }))
    .filter(({ n }) => !loc || n.quanHe.trim() === loc)
    .filter(({ n }) => !tim || chuan(`${n.hoTen} ${n.namSinh ?? ""} ${n.quanHe} ${n.ghiChu ?? ""}`).includes(chuan(tim)))
    .sort((a, b) => {
      const g = (x: typeof a) => (sx.cot === "tt" ? x.tt : String((x.n as unknown as Record<string, unknown>)[sx.cot] ?? ""));
      const va = g(a), vb = g(b);
      const c = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "vi", { numeric: true });
      return sx.tang ? c : -c;
    });
  const tieuDe = (cot: CotNk, ten: string, rong?: number) => (
    <th style={rong ? { width: rong } : undefined} aria-sort={sx.cot === cot ? (sx.tang ? "ascending" : "descending") : "none"}>
      <button className="th-sx" onClick={() => setSx({ cot, tang: sx.cot === cot ? !sx.tang : true })}>
        {ten}<span className={sx.cot === cot ? "dang" : ""}><BieuTuong ten="sapXep" co={14} /></span>
      </button>
    </th>
  );
  return (
    <div className="the">
      <div className="nk-dau">
        <div>
          <h2>Nhân khẩu</h2>
          <div className="mo">Dùng tính hỗ trợ ổn định đời sống, tạm cư</div>
        </div>
        <button className="nut nut-chinh nut-lon" onClick={them}><BieuTuong ten="cong" co={17} /> Thêm nhân khẩu</button>
      </div>
      <div className="nk-loc">
        <label className="o-tim">
          <BieuTuong ten="traCuu" co={17} />
          <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm kiếm theo họ tên, năm sinh, quan hệ…" aria-label="Tìm nhân khẩu" />
        </label>
        <label className="o-loc">
          <BieuTuong ten="loc" co={16} />
          <Chon value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Lọc theo quan hệ với chủ hộ">
            <option value="">Tất cả</option>
            {dsQuanHe.map((q) => <option key={q} value={q}>{q}</option>)}
          </Chon>
        </label>
      </div>
      <div className="nk-bang">
        <table className="bang">
          <thead>
            <tr>
              {tieuDe("tt", "TT", 70)}
              {tieuDe("hoTen", "Họ tên")}
              {tieuDe("namSinh", "Năm sinh", 130)}
              {tieuDe("quanHe", "Quan hệ với chủ hộ", 200)}
              {tieuDe("ghiChu", "Ghi chú")}
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {ds.map(({ n, tt }) => (
              <tr key={n.id}>
                <td>{tt}</td>
                <td><input value={n.hoTen} onChange={(e) => sua(n.id, "hoTen", e.target.value)} aria-label={`Họ tên nhân khẩu ${tt}`} /></td>
                <td><input value={n.namSinh ?? ""} inputMode="numeric" onChange={(e) => sua(n.id, "namSinh", e.target.value)} aria-label={`Năm sinh nhân khẩu ${tt}`} /></td>
                <td><input value={n.quanHe} list="ds-quan-he" onChange={(e) => sua(n.id, "quanHe", e.target.value)} aria-label={`Quan hệ nhân khẩu ${tt}`} /></td>
                <td><input value={n.ghiChu ?? ""} onChange={(e) => sua(n.id, "ghiChu", e.target.value)} aria-label={`Ghi chú nhân khẩu ${tt}`} /></td>
                <td><button className="nut nut-chu nut-nguy nut-nho" aria-label={`Xóa nhân khẩu ${tt}`} onClick={() => doi({ ...h, nhanKhau: h.nhanKhau.filter((x) => x.id !== n.id) })}><BieuTuong ten="thungRac" co={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="ds-quan-he">{["Chủ hộ", "Vợ", "Chồng", "Con", "Bố", "Mẹ", "Cháu", "Anh", "Chị", "Em"].map((q) => <option key={q} value={q} />)}</datalist>
        {h.nhanKhau.length === 0 && (
          <div className="trang-trong">
            <div className="trang-trong-hinh" aria-hidden>
              <span className="giay" />
              <span className="huy-hieu"><BieuTuong ten="nguoi" co={24} /></span>
            </div>
            <b>Chưa có nhân khẩu</b>
            <p>Chưa có nhân khẩu nào trong hồ sơ này.<br />Vui lòng thêm nhân khẩu để tính hỗ trợ ổn định đời sống, tạm cư.</p>
            <button className="nut nut-vien" onClick={them}><BieuTuong ten="cong" co={17} /> Thêm nhân khẩu</button>
          </div>
        )}
        {h.nhanKhau.length > 0 && ds.length === 0 && <div className="trong">Không có nhân khẩu khớp điều kiện tìm.</div>}
      </div>
    </div>
  );
}

function TabHoTro({ h, doi, duAn, kq }: Tab & { duAn: DuAn; kq: KetQuaHo }) {
  const ht = h.hoTro;
  const dat = (p: Partial<Ho["hoTro"]>) => doi({ ...h, hoTro: { ...ht, ...p } });
  return (
    <div className="luoi luoi-2">
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ ổn định đời sống</h3><div className="phai"><label><input type="checkbox" checked={!!ht.onDinh} onChange={(e) => dat({ onDinh: e.target.checked ? { dienTichNNDangSuDung: "", diChuyen: "KHONG_DI_CHUYEN" } : undefined })} /> Áp dụng</label></div></div>
        {ht.onDinh && (
          <div className="the-than luoi luoi-2">
            <O nhan="DT đất NN đang sử dụng (m²)" goiY="Tỷ lệ thu hồi = DT đất NN thu hồi / DT đang sử dụng"><OSo className="o-so" value={ht.onDinh.dienTichNNDangSuDung} onChange={(v) => dat({ onDinh: { ...ht.onDinh!, dienTichNNDangSuDung: v } })} /></O>
            <O nhan="Di chuyển chỗ ở">
              <Chon value={ht.onDinh.diChuyen} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, diChuyen: e.target.value as DiChuyen } })}>
                <option value="KHONG_DI_CHUYEN">Không phải di chuyển</option>
                <option value="DI_CHUYEN">Phải di chuyển chỗ ở</option>
                <option value="DEN_VUNG_KHO_KHAN">Di chuyển đến vùng KT-XH khó khăn, ĐBKK</option>
              </Chon>
            </O>
            <O nhan="Chọn nhóm khi tỷ lệ đúng ngưỡng 30% (QD-16)" goiY="Để trống = mặc định theo NĐ 88">
              <Chon value={ht.onDinh.chonNhom?.ma ?? ""} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, chonNhom: e.target.value ? { ma: e.target.value, lyDo: ht.onDinh!.chonNhom?.lyDo ?? "" } : undefined } })}>
                <option value="">Mặc định</option>
                <option value="20_30">Từ 20% đến 30% (Đ6 k9 QĐ 14/2026)</option>
                <option value="30_70">Từ 30% đến 70% (NĐ 88)</option>
              </Chon>
            </O>
            {ht.onDinh.chonNhom && <O nhan="Lý do lựa chọn *"><input className={ht.onDinh.chonNhom.lyDo ? "" : "loi-nhap"} value={ht.onDinh.chonNhom.lyDo} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, chonNhom: { ...ht.onDinh!.chonNhom!, lyDo: e.target.value } } })} /></O>}
          </div>
        )}
      </div>
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ đào tạo, chuyển đổi nghề</h3><div className="phai"><label><input type="checkbox" checked={ht.chuyenDoiNghe} onChange={(e) => dat({ chuyenDoiNghe: e.target.checked })} /> Áp dụng</label></div></div>
        <div className="the-than mo chu-nho">Tính cho từng thửa đất nông nghiệp bị thu hồi: hệ số theo địa bàn (Đ14 PL II QĐ 106, QĐ 14/2026) × giá đất NN cùng loại × min(DT thu hồi; hạn mức của dự án).</div>
      </div>
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ tạm cư</h3><div className="phai"><label><input type="checkbox" checked={!!ht.tamCu} onChange={(e) => dat({ tamCu: e.target.checked ? { soThang: 6, tdcBangDat: false } : undefined })} /> Áp dụng</label></div></div>
        {ht.tamCu && (
          <div className="the-than luoi luoi-2">
            <O nhan="Số tháng tạm cư"><input type="number" min={0} value={ht.tamCu.soThang} onChange={(e) => dat({ tamCu: { ...ht.tamCu!, soThang: Number(e.target.value) } })} /></O>
            <O nhan="Tái định cư bằng đất"><label><input type="checkbox" checked={ht.tamCu.tdcBangDat} onChange={(e) => dat({ tamCu: { ...ht.tamCu!, tdcBangDat: e.target.checked } })} /> Cộng thêm thời gian xây nhà (Đ3 QĐ 14/2026)</label></O>
          </div>
        )}
      </div>
      <TheTaiDinhCu h={h} doi={doi} duAn={duAn} kq={kq} />
      <div className="the">
        <div className="the-dau"><h3>Mồ mả, khấu trừ</h3></div>
        <div className="the-than luoi luoi-3">
          <O nhan="Số mộ xây"><input type="number" min={0} value={ht.moMa?.xay ?? 0} onChange={(e) => dat({ moMa: { xay: Number(e.target.value), khongXay: ht.moMa?.khongXay ?? 0 } })} /></O>
          <O nhan="Số mộ không xây"><input type="number" min={0} value={ht.moMa?.khongXay ?? 0} onChange={(e) => dat({ moMa: { xay: ht.moMa?.xay ?? 0, khongXay: Number(e.target.value) } })} /></O>
          <O nhan="Khấu trừ nghĩa vụ tài chính (đ)"><OSo className="o-so" value={h.khauTru} onChange={(v) => doi({ ...h, khauTru: v })} /></O>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiến độ của hộ: bước 1–4 là bước chung của dự án (chỉ xem, cập nhật một lần ở dự án); bước 5–16 theo từng hộ —
 * mỗi hộ một tiến độ riêng, mỗi bước ghi được khó khăn, vướng mắc để lãnh đạo nắm và đưa vào báo cáo.
 */
function TabTienDo({ h, duAn, doi, luuNgay, soanMau, moDuAn }: Tab & { duAn: DuAn; luuNgay: (h: Ho, nk: string) => Promise<void>; soanMau: (ma: string) => void; moDuAn: () => void }) {
  const td = tienDoHieuLuc(duAn, h);
  const BUOC_HO = CAC_BUOC.filter((x) => !laBuocChung(x.ma));
  const [chon, setChon] = useState((BUOC_HO.find((x) => !daQuaBuoc(td[x.ma]?.trangThai)) ?? BUOC_HO[BUOC_HO.length - 1]!).ma);
  const b = CAC_BUOC.find((x) => x.ma === chon)!;
  const bh = h.tienDo[chon] ?? { trangThai: "CHUA" as TrangThaiBuoc };
  const { taiKhoan, quyen, bao, lich } = useUngDung();
  const han = hanCuaBuoc(chon);
  const th = han ? tinhHanBuoc(hoHieuLuc(duAn, h), han, homNayIso(), lich) : null;
  const loiDuyet = taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, bh) : "Chưa đăng nhập";
  const chungXong = BUOC_CHUNG.every((ma) => td[ma]?.trangThai === "XONG");
  const chungCu = BUOC_CHUNG.filter((ma) => h.tienDo[ma]);
  const datBuoc = (p: Partial<typeof bh>) => {
    if (p.trangThai === "XONG" && bh.trangThai !== "XONG") return void doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`);
    if (p.trangThai === "CHO_DUYET" && bh.trangThai !== "CHO_DUYET") return void doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`);
    if (daQuaBuoc(bh.trangThai) && p.trangThai && p.trangThai !== bh.trangThai && !quyen("DUYET_BUOC")) return bao("Chỉ người có quyền duyệt mới mở lại bước đã hoàn thành / không áp dụng", "loi");
    doi({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...p } } });
  };
  const doiTrangThai = (tt: TrangThaiBuoc, nk: string, lyDo?: string) => {
    if (tt === "XONG" && loiDuyet) return bao(loiDuyet, "loi");
    if (tt === "KHONG_AP_DUNG" && !quyen("DUYET_BUOC")) return bao("Cần quyền xác nhận bước để đánh dấu Không áp dụng", "loi");
    const ghi = tt === "XONG" || tt === "KHONG_AP_DUNG" ? { duyetBoi: taiKhoan!.ten, ...(lyDo ? { ghiChu: lyDo } : {}) } : tt === "CHO_DUYET" ? { guiBoi: taiKhoan!.ten, duyetBoi: undefined } : {};
    return luuNgay({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...ghi, trangThai: tt, ngay: bh.ngay || new Date().toISOString().slice(0, 10) } } }, nk);
  };
  const giaiQuyet = () => {
    const { vuongMac, vuongMacNgay: _n, ...con } = bh;
    void luuNgay({ ...h, tienDo: { ...h.tienDo, [chon]: con } }, `Đã giải quyết vướng mắc bước ${b.ma}. ${b.ten}: ${vuongMac ?? ""}`);
  };
  /** Bỏ tiến độ bước chung nhập riêng ở hộ (phiên bản trước) — theo bước chung của dự án. */
  const boTienDoChungCu = () => {
    const moi = { ...h.tienDo };
    for (const ma of BUOC_CHUNG) delete moi[ma];
    void luuNgay({ ...h, tienDo: moi }, "Bỏ tiến độ bước 1–4 nhập riêng ở hộ — theo bước chung của dự án");
  };
  const lopTt = (t: TrangThaiBuoc) => (t === "XONG" ? "nhan-xanh" : t === "DANG" ? "nhan-duong" : t === "CHO_DUYET" ? "nhan-tim" : "nhan-xam");
  const khongApDung = () => {
    const lyDo = prompt(`Bước ${b.ma}. ${b.ten} — không áp dụng với hộ này?\nVí dụ: hộ tự nguyện bàn giao, không phải cưỡng chế.\n\nLý do (bắt buộc, ghi vào nhật ký hồ sơ):`)?.trim();
    if (lyDo) doiTrangThai("KHONG_AP_DUNG", `Bước ${b.ma}. ${b.ten}: không áp dụng — ${lyDo}`, lyDo);
  };
  return (
    <div className="luoi" style={{ gap: 14 }}>
      <div className="the td-chung">
        <div className="the-dau">
          <h3>Bước chung của dự án (1–4)</h3>
          <span className="mo chu-nho">Thực hiện chung cho cả dự án — chỉ xem ở đây</span>
          <div className="phai"><button className="nut nut-nho" onClick={moDuAn}>Cập nhật ở dự án →</button></div>
        </div>
        <div className="td-chung-ds">
          {BUOC_CHUNG.map((ma) => {
            const x = CAC_BUOC.find((y) => y.ma === ma)!;
            const t = td[ma]?.trangThai ?? "CHUA";
            return (
              <div key={ma} className={`td-chung-o ${t}`}>
                <span className="so">{t === "XONG" ? "✓" : t === "KHONG_AP_DUNG" ? "–" : ma}</span>
                <div>
                  <b>{x.ten}</b>
                  <div className="chu-nho"><span className={`nhan ${lopTt(t)}`}>{TEN_TRANG_THAI_BUOC[t]}</span>{td[ma]?.ngay ? ` · ${ngayVN(td[ma]!.ngay)}` : ""}</div>
                  {td[ma]?.ghiChu && <div className="chu-nho mo">{td[ma]!.ghiChu}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {!chungXong && <div className="thong-bao thong-bao-vang" style={{ margin: "10px 16px 14px" }}>Dự án chưa hoàn thành đủ bước chung 1–4. Theo trình tự, các bước riêng của từng hộ (từ bước 5 — lập phương án) thực hiện sau khi đã thông báo thu hồi và điều tra, đo đạc, kiểm đếm (trình tự khoản 2, khoản 3 Điều 87 Luật Đất đai 2024).</div>}
        {chungCu.length > 0 && (
          <div className="thong-bao thong-bao-xanh chu-nho" style={{ margin: "10px 16px 14px" }}>
            Hộ còn tiến độ bước {chungCu.join(", ")} nhập riêng ở phiên bản trước — đang dùng khi dự án chưa cập nhật bước đó.{" "}
            {quyen("SUA_HO_SO") && <button className="nut nut-chu nut-nho" onClick={boTienDoChungCu}>Bỏ, theo bước chung của dự án</button>}
          </div>
        )}
      </div>
      <div className="luoi luoi-chinh">
        <div className="the">
          <div className="the-dau"><h2>Tiến độ của hộ (bước 5–16)</h2><span className="mo chu-nho">Mỗi hộ một tiến độ; bấm một bước để cập nhật, ghi khó khăn, vướng mắc</span></div>
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr><th>Bước</th><th>Nội dung</th><th>Thời hạn</th><th>Trạng thái</th><th>Ngày</th><th>Khó khăn, vướng mắc</th></tr></thead>
              <tbody>
                {BUOC_HO.map((x) => {
                  const t = td[x.ma]?.trangThai ?? "CHUA";
                  const vm = h.tienDo[x.ma]?.vuongMac;
                  return (
                    <tr key={x.ma} data-phim-chon className={`co-the-chon ${chon === x.ma ? "dang-chon" : ""}`} onClick={() => setChon(x.ma)}>
                      <td>{x.ma}</td>
                      <td>{x.ten}<div className="can-cu">{x.canCu}{x.mau ? ` · Mẫu ${x.mau}` : ""}</div></td>
                      <td className="chu-nho">{x.thoiHan ?? "—"}</td>
                      <td><span className={`nhan ${lopTt(t)}`}>{TEN_TRANG_THAI_BUOC[t]}</span></td>
                      <td className="chu-nho">{ngayVN(td[x.ma]?.ngay)}</td>
                      <td className="chu-nho">{vm ? <span className="chu-do">! {vm}</span> : <span className="mo">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="the">
          <div className="the-dau"><h3>Bước {b.ma}. {b.ten}</h3></div>
          <div className="the-than luoi">
            <div className="chu-nho"><b>Căn cứ:</b> {b.canCu}<br /><b>Thời hạn:</b> {b.thoiHan ?? "—"}<br /><b>Mẫu biểu (Sổ tay QĐ 1966):</b> {b.mau ?? "—"}</div>
            {han && th && (
              <div className={`thong-bao ${th.trangThai === "QUA_HAN" || th.trangThai === "XONG_QUA_HAN" ? "thong-bao-do" : th.trangThai === "SAP_HET" ? "thong-bao-vang" : "thong-bao-xanh"}`} style={{ marginBottom: 0 }}>
                <b>Thời hạn:</b> {han.soNgay} {han.loai === "NLV" ? "ngày làm việc" : "ngày"} kể từ {han.moc.nhan.charAt(0).toLowerCase() + han.moc.nhan.slice(1)} ({han.canCu}).
                {han.moc.loai === "NHAP" && (
                  <div style={{ marginTop: 6 }}>
                    <label className="chu-nho">Ngày mốc: <input type="date" value={bh.mocHan ?? ""} onChange={(e) => datBuoc({ mocHan: e.target.value || undefined })} /></label>
                  </div>
                )}
                <div style={{ marginTop: 4 }}>
                  {th.trangThai === "CHUA_CO_MOC" && (han.moc.loai === "NHAP" ? "Chưa nhập ngày mốc — chưa tính hạn." : `Chưa có ${han.moc.nhan} — chưa tính hạn.`)}
                  {th.hanChot && <>Hạn chót: <b>{ngayVN(th.hanChot)}</b>. </>}
                  {th.trangThai === "CON_HAN" && `Còn ${th.conLai} ${han.loai === "NLV" ? "ngày làm việc" : "ngày"}.`}
                  {th.trangThai === "SAP_HET" && `Sắp hết hạn: còn ${th.conLai} ${han.loai === "NLV" ? "ngày làm việc" : "ngày"}.`}
                  {th.trangThai === "QUA_HAN" && "Đã quá hạn."}
                  {th.trangThai === "XONG_DUNG_HAN" && "Hoàn thành trong hạn."}
                  {th.trangThai === "XONG_QUA_HAN" && "Hoàn thành sau hạn."}
                  {th.thieuLich.length > 0 && <div className="chu-nho">Chưa xác nhận lịch ngày nghỉ năm {th.thieuLich.join(", ")} — hạn chỉ trừ thứ Bảy, Chủ nhật (Cài đặt chung → Lịch ngày nghỉ).</div>}
                </div>
              </div>
            )}
            <O nhan="Trạng thái">
              <Chon value={bh.trangThai} onChange={(e) => datBuoc({ trangThai: e.target.value as TrangThaiBuoc })}>
                {Object.entries(TEN_TRANG_THAI_BUOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Chon>
            </O>
            <O nhan="Ngày thực hiện / hoàn thành"><input type="date" value={bh.ngay ?? ""} onChange={(e) => datBuoc({ ngay: e.target.value })} /></O>
            <O nhan="Nội dung thực hiện, ghi chú, số văn bản"><textarea rows={3} value={bh.ghiChu ?? ""} onChange={(e) => datBuoc({ ghiChu: e.target.value })} /></O>
            <O nhan="Khó khăn, vướng mắc ở bước này" goiY="vd. Không nhất trí đơn giá, đề nghị xem xét lại; chưa nhận tiền; tranh chấp ranh giới… Có nội dung → hộ ở trạng thái Vướng mắc, hiện trong cảnh báo và báo cáo.">
              <textarea rows={3} className={bh.vuongMac ? "o-vuong-mac" : ""} value={bh.vuongMac ?? ""} placeholder="Để trống nếu không có" onChange={(e) => datBuoc({ vuongMac: e.target.value || undefined, vuongMacNgay: e.target.value ? bh.vuongMacNgay ?? homNayIso() : undefined })} />
            </O>
            {bh.vuongMac && (
              <div className="nhom-nut">
                <span className="chu-nho mo">Ghi từ {ngayVN(bh.vuongMacNgay)}</span>
                <button className="nut nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={giaiQuyet}>Đã giải quyết (ghi nhật ký)</button>
              </div>
            )}
            <div className="nhom-nut">
              <button className="nut" disabled={bh.trangThai === "CHO_DUYET" || bh.trangThai === "XONG" || !quyen("GUI_DUYET")} onClick={() => doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`)}>Gửi duyệt</button>
              <button className="nut nut-chinh" disabled={bh.trangThai === "XONG" || !!loiDuyet} title={loiDuyet ?? undefined} onClick={() => doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`)}>Xác nhận hoàn thành</button>
              {b.tuyChon && bh.trangThai !== "KHONG_AP_DUNG" && (
                <button className="nut" disabled={!quyen("DUYET_BUOC")} title="Bước tùy chọn không phát sinh với hộ này — không tính vào tiến độ; bắt buộc lý do" onClick={khongApDung}>Không áp dụng</button>
              )}
            </div>
            {bh.trangThai === "KHONG_AP_DUNG" && <div className="thong-bao">Không áp dụng: {bh.ghiChu || "—"}{bh.duyetBoi ? ` (${bh.duyetBoi})` : ""}</div>}
            <div className="mo chu-nho">
              {bh.guiBoi && <>Gửi duyệt: <b>{bh.guiBoi}</b>. </>}
              {bh.duyetBoi && <>Xác nhận: <b>{bh.duyetBoi}</b>. </>}
              {!daQuaBuoc(bh.trangThai) && loiDuyet && <>{loiDuyet}.</>}
            </div>
            {DANH_MUC_MAU.some((m) => m.buoc === b.ma) && (
              <div>
                <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 4 }}>Soạn mẫu biểu của bước</div>
                <div className="nhom-nut">
                  {DANH_MUC_MAU.filter((m) => m.buoc === b.ma).map((m) => (
                    <button key={m.ma} className="nut nut-nho" title={m.ten} onClick={() => soanMau(m.ma)}>Mẫu {m.ma}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hỗ trợ tái định cư: hình thức bố trí (Đ111 LĐĐ 2024; Đ23, Đ24 NĐ 88/2024), các khoản có sẵn trong bộ chính sách
 * (C08 tự lo chỗ ở – Đ10 PL II QĐ 106; C10 suất tối thiểu – Đ16 PL II; C11 20% tiền SDĐ – k11 Đ6 QĐ 14/2026) và khoản
 * khác cán bộ nhập kèm căn cứ (k13 Đ6 QĐ 14/2026: UBND xã quyết định cho từng dự án).
 */
function TheTaiDinhCu({ h, doi, duAn, kq }: Tab & { duAn: DuAn; kq: KetQuaHo }) {
  const { chinhSach } = useUngDung();
  const cs = chinhSach(duAn);
  const t = h.hoTro.taiDinhCu;
  const dat = (p: Partial<TaiDinhCuHo> | undefined) => doi({ ...h, hoTro: { ...h.hoTro, taiDinhCu: p === undefined ? undefined : { ...(t ?? { hinhThuc: "DAT_O", khoanKhac: [] }), ...p } } });
  const btDatO = tienBoiThuongDatO(h, kq.nhom.find((x) => x.ma === "A.I")?.dong ?? []);
  const sdd = t ? tienSddTdc(t) : null;
  const giaoDat = t?.hinhThuc === "DAT_O" || t?.hinhThuc === "NHA_O";
  const dtSuat = cs.taiDinhCu && giaoDat ? dienTichSuatToiThieu(cs, { xa: duAn.xa, hinhThuc: t!.hinhThuc as "DAT_O" | "NHA_O" }) : null;
  const dongTdc = kq.nhom.find((x) => x.ma === "B.VI")?.dong ?? [];
  const tongTdc = dongTdc.reduce((s, x) => (x.dong.thanhTien && x.dong.trangThai === "TAM_TINH" ? s + x.dong.thanhTien.toNumber() : s), 0);
  const suaKhoan = (id: string, p: Partial<TaiDinhCuHo["khoanKhac"][number]>) => dat({ khoanKhac: t!.khoanKhac.map((k) => (k.id === id ? { ...k, ...p } : k)) });
  return (
    <div className="the" style={{ gridColumn: "1 / -1" }}>
      <div className="the-dau">
        <h3>Hỗ trợ tái định cư</h3>
        <span className="mo chu-nho">Điều 111 Luật Đất đai 2024; Điều 23, 24 NĐ 88/2024; Điều 10, 16 PL II QĐ 106/2025; Điều 6 QĐ 14/2026</span>
        <div className="phai"><label><input type="checkbox" checked={!!t} onChange={(e) => dat(e.target.checked ? {} : undefined)} /> Áp dụng</label></div>
      </div>
      {t && (
        <div className="the-than luoi" style={{ gap: 12 }}>
          {!cs.taiDinhCu && <div className="thong-bao thong-bao-vang" style={{ marginBottom: 0 }}>Bộ chính sách {cs.ma} chưa có quy định hỗ trợ tái định cư — chỉ nhập được khoản khác kèm căn cứ.</div>}
          <div className="luoi luoi-3">
            <O nhan="Hình thức bố trí tái định cư" style={{ gridColumn: "span 2" }}>
              <Chon value={t.hinhThuc} onChange={(e) => dat({ hinhThuc: e.target.value as HinhThucTdc })}>
                {Object.entries(TEN_HINH_THUC_TDC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Chon>
            </O>
            <O nhan="Khu, điểm tái định cư"><input value={t.khuTdc ?? ""} placeholder="vd. Khu TĐC bản Mé" onChange={(e) => dat({ khuTdc: e.target.value || undefined })} /></O>
            {giaoDat && (
              <>
                <O nhan={t.hinhThuc === "NHA_O" ? "Căn hộ / vị trí" : "Lô số / vị trí"}><input value={t.viTriLo ?? ""} onChange={(e) => dat({ viTriLo: e.target.value || undefined })} /></O>
                <O nhan={t.hinhThuc === "NHA_O" ? "DT căn hộ được giao (m²)" : "DT lô đất ở được giao (m²)"}><OSo className="o-so" value={t.dienTichGiao ?? ""} onChange={(v) => dat({ dienTichGiao: v || undefined })} /></O>
                <O nhan={t.hinhThuc === "NHA_O" ? "Giá bán nhà ở TĐC (đ/m²)" : "Giá đất ở tại khu TĐC (đ/m²)"} goiY={t.hinhThuc === "NHA_O" ? "Do UBND có thẩm quyền quyết định (k3 Đ111 LĐĐ)" : "Theo bảng giá đất tại thời điểm phê duyệt phương án (k3 Đ111 LĐĐ)"}>
                  <OSo className="o-so" value={t.donGia ?? ""} onChange={(v) => dat({ donGia: v || undefined })} />
                </O>
                <O nhan="Văn bản giá" style={{ gridColumn: "1 / -1" }}><input value={t.nguonGia ?? ""} placeholder="vd. NQ 152/2025/NQ-HĐND, Bảng 05, xã …, vị trí …" onChange={(e) => dat({ nguonGia: e.target.value || undefined })} /></O>
              </>
            )}
          </div>
          {t.hinhThuc === "TU_LO" && <div className="thong-bao thong-bao-xanh chu-nho" style={{ marginBottom: 0 }}>Hộ đủ điều kiện được hỗ trợ tái định cư (k8 Đ111 LĐĐ) mà tự lo chỗ ở: ngoài bồi thường về đất bằng tiền được hỗ trợ theo địa bàn — phường 100 triệu, 10 xã (Quỳnh Nhai, Thuận Châu, Mường La, Bắc Yên, Phù Yên, Yên Châu, Mai Sơn, Sông Mã, Sốp Cộp, Vân Hồ) 80 triệu, xã còn lại 60 triệu đồng/hộ (Đ10 PL II QĐ 106).</div>}
          {t.hinhThuc === "TAI_CHO" && <div className="thong-bao thong-bao-xanh chu-nho" style={{ marginBottom: 0 }}>Tái định cư tại chỗ bằng chuyển mục đích phần đất nông nghiệp còn lại sang đất ở trong hạn mức, miễn tiền SDĐ bằng diện tích đất ở thu hồi khi người có đất đồng ý phương án bồi thường đất nông nghiệp (k3 Đ24 NĐ 88/2024) — không phát sinh khoản tiền hỗ trợ; hỗ trợ tạm cư nhập ở thẻ Tạm cư.</div>}
          {giaoDat && (
            <div className="luoi luoi-2">
              <label className="o-chon-kem">
                <input type="checkbox" checked={!!t.suatToiThieu} onChange={(e) => dat({ suatToiThieu: e.target.checked || undefined })} />
                <span><b>Hỗ trợ đủ một suất tái định cư tối thiểu</b> (k8 Đ111 LĐĐ): hộ phải di chuyển chỗ ở, tiền bồi thường về đất ở không đủ một suất. Suất tối thiểu {dtSuat ? <b>{dtSuat} m²</b> : "—"} (Đ16 PL II QĐ 106).</span>
              </label>
              {t.hinhThuc === "DAT_O" && (
                <label className="o-chon-kem">
                  <input type="checkbox" checked={!!t.hoTroTienSdd} onChange={(e) => dat({ hoTroTienSdd: e.target.checked || undefined })} />
                  <span><b>Hỗ trợ 20% tiền sử dụng đất phải nộp</b> của thửa đất được giao TĐC (k11 Đ6 QĐ 14/2026; VM-28).</span>
                </label>
              )}
            </div>
          )}
          {t.hinhThuc === "DAT_O" && t.hoTroTienSdd && (
            <O nhan="Tiền SDĐ phải nộp theo thông báo (đ)" goiY="Để trống: phần mềm tính = giá đất khu TĐC × DT lô giao"><OSo className="o-so" value={t.tienSddPhaiNop ?? ""} onChange={(v) => dat({ tienSddPhaiNop: v || undefined })} style={{ maxWidth: 280 }} /></O>
          )}
          {giaoDat && (
            <div className="tdc-so">
              <div><span>Tiền bồi thường về đất ở</span><b>{tien(btDatO)} đ</b></div>
              {t.hinhThuc === "DAT_O" && <div><span>Tiền SDĐ phải nộp thửa TĐC</span><b>{sdd?.tien ? `${tien(sdd.tien)} đ` : "—"}</b></div>}
              {t.hinhThuc === "DAT_O" && sdd?.tien && sdd.tien.gt(btDatO) && <div title="Điều 26 NĐ 88/2024 — thông tin, không cộng vào hỗ trợ"><span>Được ghi nợ (nếu có nhu cầu)</span><b>{tien(sdd.tien.minus(btDatO))} đ</b></div>}
              <div><span>Tổng hỗ trợ tái định cư (tạm tính)</span><b>{tongTdc.toLocaleString("vi-VN")} đ</b></div>
            </div>
          )}
          <div>
            <div className="chu-nho" style={{ fontWeight: 600, marginBottom: 6 }}>Khoản hỗ trợ tái định cư khác <span className="mo" style={{ fontWeight: 400 }}>— UBND xã quyết định cho dự án (k13 Đ6 QĐ 14/2026) hoặc chính sách chưa có sẵn; bắt buộc ghi căn cứ</span></div>
            {t.khoanKhac.length > 0 && (
              <table className="bang">
                <thead><tr><th>Nội dung</th><th style={{ width: 170 }}>Số tiền (đ)</th><th style={{ width: 300 }}>Căn cứ (số, ngày văn bản)</th><th style={{ width: 44 }} /></tr></thead>
                <tbody>
                  {t.khoanKhac.map((k) => (
                    <tr key={k.id}>
                      <td><input value={k.noiDung} placeholder="vd. Hỗ trợ san lấp mặt bằng lô TĐC" onChange={(e) => suaKhoan(k.id, { noiDung: e.target.value })} /></td>
                      <td><OSo className="o-so" value={k.soTien} onChange={(v) => suaKhoan(k.id, { soTien: v })} /></td>
                      <td><input className={k.canCu.trim() ? "" : "loi-nhap"} value={k.canCu} placeholder="vd. QĐ 45/QĐ-UBND ngày 10/9/2026 của UBND xã" onChange={(e) => suaKhoan(k.id, { canCu: e.target.value })} /></td>
                      <td><button className="nut nut-chu nut-nguy nut-nho" aria-label="Xóa khoản" onClick={() => dat({ khoanKhac: t.khoanKhac.filter((x) => x.id !== k.id) })}><BieuTuong ten="thungRac" co={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="nut nut-nho" style={{ marginTop: 6 }} onClick={() => dat({ khoanKhac: [...t.khoanKhac, { id: taoId(), noiDung: "", soTien: "", canCu: "" }] })}><BieuTuong ten="cong" co={14} /> Thêm khoản</button>
          </div>
          <O nhan="Ghi chú"><textarea rows={2} value={t.ghiChu ?? ""} onChange={(e) => dat({ ghiChu: e.target.value || undefined })} /></O>
        </div>
      )}
    </div>
  );
}

/**
 * Văn bản của hộ: mọi mẫu áp dụng cho từng hộ (theo bước quy trình) — bấm "Tạo nhanh" là có ngay tệp .docx đã điền
 * thông tin hộ, thửa, tài sản, số tiền, văn bản trước; "Soạn, cấp số" mở màn Văn bản để nhập số, ngày, nội dung riêng.
 */
function TabVanBanHo({ h, duAn, kq, hieuLuc, soan }: { h: Ho; duAn: DuAn; kq: KetQuaHo; hieuLuc: Ho; soan: (ma: string) => void }) {
  const { kho, hoCua, chinhSach, dsDonVi, bao } = useUngDung();
  const [dang, setDang] = useState<string | null>(null);
  const buocHt = CAC_BUOC.find((b) => !daQuaBuoc(hieuLuc.tienDo[b.ma]?.trangThai))?.ma;
  const vb = h.vanBan ?? {};
  const nhom = CAC_BUOC.map((b) => ({ b, ds: DANH_MUC_MAU.filter((m) => m.buoc === b.ma && m.phamVi === "HO") })).filter((x) => x.ds.length);
  const tao = async (ma: string, ten: string) => {
    setDang(ma);
    try {
      const ds = hoCua(duAn.id).map((x) => (x.id === h.id ? { h, k: kq } : { h: x, k: tinhHo(chinhSach(duAn), duAn, x) }));
      const out = await taoNhanh({ kho, ma, duAn, ds, ho: { h, k: kq }, dsDonVi });
      await taiXuong(out, `Mau-${ma}_${tenTep(`${h.ma} ${h.ten}`, 60)}_${tenTep(ten, 40)}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } catch (e) {
      bao(`Không tạo được Mẫu ${ma}: ${(e as Error).message}`, "loi");
    } finally {
      setDang(null);
    }
  };
  return (
    <div className="the">
      <div className="the-dau">
        <h2>Văn bản của hộ</h2>
        <span className="mo chu-nho">Tự điền thông tin hộ, thửa, tài sản, số tiền đã nhập. "Tạo nhanh" = bản dự thảo chưa có số; "Soạn, cấp số" để ghi số, ngày và lưu làm căn cứ cho văn bản sau.</span>
      </div>
      <div className="bang-cuon">
        <table className="bang">
          <thead><tr><th style={{ width: 70 }}>Mẫu</th><th>Văn bản</th><th style={{ width: 240 }}>Đã ban hành</th><th style={{ width: 290 }} /></tr></thead>
          <tbody>
            {nhom.map(({ b, ds }) => (
              <Fragment key={b.ma}>
                <tr className="vb-nhom"><td colSpan={4}>Bước {b.ma}. {b.ten}{b.ma === buocHt && <span className="nhan nhan-xanh" style={{ marginLeft: 8 }}>bước hiện tại</span>}</td></tr>
                {ds.map((m) => {
                  const soVb = m.ghiLai ? vb[`${m.ghiLai.khoa}_so`] : undefined;
                  return (
                    <tr key={m.ma} className={b.ma === buocHt ? "dang-chon" : ""}>
                      <td><b>{m.ma}</b></td>
                      <td>{m.ten}{m.moTa && <div className="can-cu">{m.moTa}</div>}</td>
                      <td className="chu-nho">{soVb ? <>Số {soVb}{m.ghiLai && vb[`${m.ghiLai.khoa}_ngay`] ? `, ${vb[`${m.ghiLai.khoa}_ngay`]}` : ""}</> : <span className="mo">—</span>}</td>
                      <td>
                        <div className="nhom-nut" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <button className="nut nut-nho nut-chinh" disabled={!!dang} onClick={() => void tao(m.ma, m.ten)}>{dang === m.ma ? "Đang tạo…" : "Tạo nhanh (.docx)"}</button>
                          <button className="nut nut-nho" onClick={() => soan(m.ma)}>Soạn, cấp số</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="the-than mo chu-nho">Văn bản cấp dự án (tờ trình, quyết định phê duyệt phương án, niêm yết…) và theo đợt: mở Hồ sơ dự án → thẻ Văn bản.</div>
    </div>
  );
}

export { NhanDong };

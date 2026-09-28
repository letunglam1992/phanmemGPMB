import { useEffect, useMemo, useState } from "react";
import { kiemTraDuyetBuoc } from "../tai-khoan";
import { hanCuaBuoc, tinhHanBuoc } from "../han-buoc";
import { TT_GPMB, homNayIso, trangThaiHo, type TrangThaiGpmb } from "../trang-thai";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, TEN_DOI_TUONG, TEN_TRANG_THAI_BUOC, hoHieuLuc, laBuocChung, taoId, tienDoHieuLuc, type DuAn, type Ho, type LoaiDoiTuong, type TrangThaiBuoc } from "../mo-hinh";
import { NhanDong, O, ngayVN, tien } from "../thanh-phan/chung";
import { BieuTuong } from "../thanh-phan/BieuDo";
import { TabThua } from "./ho/Thua";
import { TabChiTra } from "./ho/ChiTra";
import { TabKiemDem } from "./ho/KiemDem";
import { TabTinhToan } from "./ho/TinhToan";
import { DANH_MUC_MAU } from "../van-ban/danh-muc";
import type { DiChuyen } from "@gpmb/core";

const CAC_TAB = [
  ["thong-tin", "Thông tin", "thongTin"],
  ["nhan-khau", "Nhân khẩu", "nguoi"],
  ["thua", "Thửa đất", "lop"],
  ["kiem-dem", "Kiểm đếm tài sản", "kiemDem"],
  ["ho-tro", "Hỗ trợ", "hoTro"],
  ["tinh", "Tính toán, giải trình", "mayTinh"],
  ["tien-do", "Tiến độ", "dongHo"],
  ["chi-tra", "Chi trả", "theNganHang"],
  ["nhat-ky", "Nhật ký", "vanBan"],
] as const;

const CO_COT_BEN: string[] = ["thong-tin", "nhan-khau", "ho-tro", "nhat-ky"];

export function HoSo({ duAnId, hoId, tabDau }: { duAnId: string; hoId: string; tabDau?: string }) {
  const { dsDuAn, hoCua, di, luuHo, chinhSach, xoaHo, quyen } = useUngDung();
  const choSua = quyen("SUA_HO_SO");
  const duAn = dsDuAn.find((d) => d.id === duAnId);
  const goc = hoCua(duAnId).find((h) => h.id === hoId);
  const [h, setH] = useState<Ho | undefined>(goc);
  const [tab, setTab] = useState<string>(tabDau ?? "thong-tin");
  const [daSua, setDaSua] = useState(false);
  useEffect(() => {
    setH(goc);
    setDaSua(false);
  }, [goc]);
  const kq = useMemo(() => (duAn && h ? tinhHo(chinhSach(duAn), duAn, h) : null), [duAn, h, chinhSach]);
  if (!duAn || !h || !kq) return <div className="trang trong">Không tìm thấy hồ sơ.</div>;

  const doi = (moi: Ho) => {
    setH(moi);
    setDaSua(true);
  };
  const luu = async (ghiChu = "Cập nhật hồ sơ") => {
    await luuHo(h, ghiChu);
    setDaSua(false);
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
          {choSua && <button className="nut nut-lon" disabled={!daSua} onClick={() => { setH(goc); setDaSua(false); }}><BieuTuong ten="hoanTac" co={17} /> Hoàn tác</button>}
          {choSua && <button className="nut nut-chinh nut-lon" disabled={!daSua} onClick={() => luu()}><BieuTuong ten="luu" co={17} /> Lưu hồ sơ</button>}
        </div>
      </div>

      <div className="the the-buoc-tron">
        <BuocTron ho={hieuLuc} onChon={() => setTab("tien-do")} />
        <div className="buoc-tron-chu"><span>Bước 1–4: bước chung của dự án</span><span>Bước 5–16: theo từng hộ, cá nhân, tổ chức</span></div>
      </div>

      <div className="the the-tab">
        <div className="tab tab-bt" role="tablist">
          {CAC_TAB.map(([ma, ten, bt]) => (
            <button key={ma} role="tab" aria-selected={tab === ma} className={tab === ma ? "chon" : ""} onClick={() => setTab(ma)}>
              <BieuTuong ten={bt} co={18} />
              {ten}
              {dem[ma] ? <span className="dem">{dem[ma]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Cột "Thông tin hồ sơ" hiện ở các tab nhập liệu gọn; tab bảng rộng (thửa, kiểm đếm, tính toán, tiến độ, chi trả) dùng toàn bộ chiều ngang */}
      <div className={`ho-khung ${CO_COT_BEN.includes(tab) ? "" : "ho-khung-rong"}`}>
        {CO_COT_BEN.includes(tab) && (
          <aside className="ho-ben">
            <TheThongTinHo h={h} hieuLuc={hieuLuc} tt={tt} moTab={setTab} soanVanBan={() => di({ ten: "van-ban", duAnId, hoId: h.id })} />
          </aside>
        )}
        <div className="ho-noi-dung">
          {/* tài khoản không có quyền sửa: khóa các ô nhập của các thẻ nhập liệu */}
          <fieldset className="khung-quyen" disabled={!choSua}>
          {tab === "thong-tin" && <TabThongTin h={h} doi={doi} />}
          {tab === "nhan-khau" && <TabNhanKhau h={h} doi={doi} />}
          {tab === "thua" && <TabThua h={h} duAn={duAn} doi={doi} />}
          {tab === "kiem-dem" && <TabKiemDem h={h} doi={doi} />}
          {tab === "ho-tro" && <TabHoTro h={h} doi={doi} />}
          </fieldset>
          {tab === "tinh" && <TabTinhToan h={h} duAn={duAn} kq={kq} />}
          {tab === "chi-tra" && <fieldset className="khung-quyen" disabled={!choSua}><TabChiTra h={h} duAn={duAn} doi={doi} /></fieldset>}
          {tab === "tien-do" && <TabTienDo h={h} duAn={duAn} doi={doi} moDuAn={() => di({ ten: "du-an", duAnId })} soanMau={(ma) => di({ ten: "van-ban", duAnId, ma, hoId: h.id })} luuNgay={async (moi, nk) => { setH(moi); await luuHo(moi, nk); setDaSua(false); }} />}
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
          {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan > 0 && tab !== "tinh" && (
            <div className="thong-bao thong-bao-vang" style={{ marginTop: 14 }}>
              Còn {kq.tong.soDongThieuCanCu + kq.tong.soDongCanXacNhan} khoản chưa đủ căn cứ hoặc cần xác nhận — hồ sơ chưa thể chốt.{" "}
              <button className="nut nut-chu nut-nho" onClick={() => setTab("tinh")}>Xem chi tiết</button>
            </div>
          )}
          {choSua && (
            <div className="vung-xoa">
              <button className="nut-xoa" onClick={async () => { if (confirm(`Xóa hồ sơ ${h.ma} – ${h.ten}? Thao tác không hoàn tác được.`)) { await xoaHo(h.id); di({ ten: "du-an", duAnId, tab: "ho" }); } }}>
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
  const hienTai = CAC_BUOC.findIndex((b) => ho.tienDo[b.ma]?.trangThai !== "XONG");
  return (
    <ol className="buoc-tron">
      {CAC_BUOC.map((b, i) => {
        const t = ho.tienDo[b.ma]?.trangThai ?? "CHUA";
        return (
          <li key={b.ma} className={`${t} ${i === hienTai ? "hien-tai" : ""} ${laBuocChung(b.ma) ? "chung" : ""}`}>
            <button onClick={() => onChon(b.ma)} title={`Bước ${b.ma}. ${b.ten} — ${TEN_TRANG_THAI_BUOC[t]}${laBuocChung(b.ma) ? " (bước chung của dự án)" : ""}`}>
              <span className="so">{t === "XONG" && i !== hienTai ? "✓" : b.ma}</span>
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
  const soXong = CAC_BUOC.filter((b) => hieuLuc.tienDo[b.ma]?.trangThai === "XONG").length;
  const iHienTai = CAC_BUOC.findIndex((b) => hieuLuc.tienDo[b.ma]?.trangThai !== "XONG");
  const buocHt = iHienTai < 0 ? CAC_BUOC.length : iHienTai + 1;
  const phanTram = Math.round((soXong / CAC_BUOC.length) * 100);
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
                <span className="so">{t === "XONG" ? "✓" : b.ma}</span>
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
  const s = (k: keyof Ho) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => doi({ ...h, [k]: e.target.value });
  const vb = h.vanBan ?? {};
  return (
    <div className="luoi">
    <div className="the the-than">
      <div className="luoi luoi-3">
        <O nhan="Mã hồ sơ"><input value={h.ma} onChange={s("ma")} /></O>
        <O nhan="Đối tượng">
          <select value={h.loai} onChange={(e) => doi({ ...h, loai: e.target.value as LoaiDoiTuong })}>
            {Object.entries(TEN_DOI_TUONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
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
          <select value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Lọc theo quan hệ với chủ hộ">
            <option value="">Tất cả</option>
            {dsQuanHe.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
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

function TabHoTro({ h, doi }: Tab) {
  const ht = h.hoTro;
  const dat = (p: Partial<Ho["hoTro"]>) => doi({ ...h, hoTro: { ...ht, ...p } });
  return (
    <div className="luoi luoi-2">
      <div className="the">
        <div className="the-dau"><h3>Hỗ trợ ổn định đời sống</h3><div className="phai"><label><input type="checkbox" checked={!!ht.onDinh} onChange={(e) => dat({ onDinh: e.target.checked ? { dienTichNNDangSuDung: "", diChuyen: "KHONG_DI_CHUYEN" } : undefined })} /> Áp dụng</label></div></div>
        {ht.onDinh && (
          <div className="the-than luoi luoi-2">
            <O nhan="DT đất NN đang sử dụng (m²)" goiY="Tỷ lệ thu hồi = DT đất NN thu hồi / DT đang sử dụng"><input className="o-so" value={ht.onDinh.dienTichNNDangSuDung} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, dienTichNNDangSuDung: e.target.value } })} /></O>
            <O nhan="Di chuyển chỗ ở">
              <select value={ht.onDinh.diChuyen} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, diChuyen: e.target.value as DiChuyen } })}>
                <option value="KHONG_DI_CHUYEN">Không phải di chuyển</option>
                <option value="DI_CHUYEN">Phải di chuyển chỗ ở</option>
                <option value="DEN_VUNG_KHO_KHAN">Di chuyển đến vùng KT-XH khó khăn, ĐBKK</option>
              </select>
            </O>
            <O nhan="Chọn nhóm khi tỷ lệ đúng ngưỡng 30% (QD-16)" goiY="Để trống = mặc định theo NĐ 88">
              <select value={ht.onDinh.chonNhom?.ma ?? ""} onChange={(e) => dat({ onDinh: { ...ht.onDinh!, chonNhom: e.target.value ? { ma: e.target.value, lyDo: ht.onDinh!.chonNhom?.lyDo ?? "" } : undefined } })}>
                <option value="">Mặc định</option>
                <option value="20_30">Từ 20% đến 30% (Đ6 k9 QĐ 14/2026)</option>
                <option value="30_70">Từ 30% đến 70% (NĐ 88)</option>
              </select>
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
      <div className="the">
        <div className="the-dau"><h3>Mồ mả, khấu trừ</h3></div>
        <div className="the-than luoi luoi-3">
          <O nhan="Số mộ xây"><input type="number" min={0} value={ht.moMa?.xay ?? 0} onChange={(e) => dat({ moMa: { xay: Number(e.target.value), khongXay: ht.moMa?.khongXay ?? 0 } })} /></O>
          <O nhan="Số mộ không xây"><input type="number" min={0} value={ht.moMa?.khongXay ?? 0} onChange={(e) => dat({ moMa: { xay: ht.moMa?.xay ?? 0, khongXay: Number(e.target.value) } })} /></O>
          <O nhan="Khấu trừ nghĩa vụ tài chính (đ)"><input className="o-so" value={h.khauTru} onChange={(e) => doi({ ...h, khauTru: e.target.value })} /></O>
        </div>
      </div>
    </div>
  );
}

function TabTienDo({ h, duAn, doi, luuNgay, soanMau, moDuAn }: Tab & { duAn: DuAn; luuNgay: (h: Ho, nk: string) => Promise<void>; soanMau: (ma: string) => void; moDuAn: () => void }) {
  const td = tienDoHieuLuc(duAn, h);
  const [chon, setChon] = useState(CAC_BUOC[Math.max(0, CAC_BUOC.findIndex((b) => td[b.ma]?.trangThai !== "XONG"))]!.ma);
  const b = CAC_BUOC.find((x) => x.ma === chon)!;
  const tuDuAn = !!td[chon]?.tuDuAn;
  const bh = tuDuAn ? td[chon]! : h.tienDo[chon] ?? { trangThai: "CHUA" as TrangThaiBuoc };
  const { taiKhoan, quyen, bao, lich } = useUngDung();
  const han = hanCuaBuoc(chon);
  const th = han ? tinhHanBuoc(hoHieuLuc(duAn, h), han, homNayIso(), lich) : null;
  const loiDuyet = taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, bh) : "Chưa đăng nhập";
  const datBuoc = (p: Partial<typeof bh>) => {
    if (p.trangThai === "XONG" && bh.trangThai !== "XONG") return void doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`);
    if (p.trangThai === "CHO_DUYET" && bh.trangThai !== "CHO_DUYET") return void doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`);
    if (bh.trangThai === "XONG" && p.trangThai && p.trangThai !== "XONG" && !quyen("DUYET_BUOC")) return bao("Chỉ người có quyền duyệt mới mở lại bước đã hoàn thành", "loi");
    doi({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...p } } });
  };
  const doiTrangThai = (tt: TrangThaiBuoc, nk: string) => {
    if (tt === "XONG" && loiDuyet) return bao(loiDuyet, "loi");
    const ghi = tt === "XONG" ? { duyetBoi: taiKhoan!.ten } : tt === "CHO_DUYET" ? { guiBoi: taiKhoan!.ten, duyetBoi: undefined } : {};
    return luuNgay({ ...h, tienDo: { ...h.tienDo, [chon]: { ...bh, ...ghi, trangThai: tt, ngay: bh.ngay || new Date().toISOString().slice(0, 10) } } }, nk);
  };
  const theoDoiRieng = (rieng: boolean) => {
    const cu = h.tienDo[chon] ?? { trangThai: "CHUA" as TrangThaiBuoc };
    const { rieng: _bo, tuDuAn: _b2, ...khac } = cu;
    void luuNgay(
      { ...h, tienDo: { ...h.tienDo, [chon]: rieng ? { ...khac, rieng: true } : khac } },
      rieng ? `Theo dõi riêng bước chung ${b.ma}. ${b.ten} cho hộ này` : `Bỏ theo dõi riêng bước ${b.ma} — theo bước chung của dự án`,
    );
  };
  return (
    <div className="luoi luoi-chinh">
      <div className="the">
        <div className="the-dau"><h2>Tiến độ 16 bước</h2><span className="mo chu-nho">Bước 1–4 là bước chung của dự án (cập nhật một lần ở màn Dự án)</span></div>
        <table className="bang">
          <thead><tr><th>Bước</th><th>Nội dung</th><th>Thời hạn</th><th>Mẫu</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
          <tbody>
            {CAC_BUOC.map((x) => {
              const t = td[x.ma]?.trangThai ?? "CHUA";
              return (
                <tr key={x.ma} className={`co-the-chon ${chon === x.ma ? "dang-chon" : ""}`} onClick={() => setChon(x.ma)}>
                  <td>{x.ma}</td>
                  <td>
                    {x.ten}
                    {laBuocChung(x.ma) && <span className={`nhan ${h.tienDo[x.ma]?.rieng ? "nhan-vang" : "nhan-xam"}`} style={{ marginLeft: 6, fontSize: 10.5 }}>{h.tienDo[x.ma]?.rieng ? "riêng hộ này" : "chung"}</span>}
                    <div className="can-cu">{x.canCu}</div>
                  </td>
                  <td className="chu-nho">{x.thoiHan ?? "—"}</td>
                  <td className="chu-nho">{x.mau ?? "—"}</td>
                  <td><span className={`nhan ${t === "XONG" ? "nhan-xanh" : t === "DANG" ? "nhan-duong" : t === "CHO_DUYET" ? "nhan-tim" : "nhan-xam"}`}>{TEN_TRANG_THAI_BUOC[t]}</span></td>
                  <td className="chu-nho">{ngayVN(td[x.ma]?.ngay)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="the">
        <div className="the-dau"><h3>Bước {b.ma}. {b.ten}</h3></div>
        <div className="the-than luoi">
          <div className="chu-nho"><b>Căn cứ:</b> {b.canCu}<br /><b>Thời hạn:</b> {b.thoiHan ?? "—"}<br /><b>Mẫu biểu (Sổ tay QĐ 1966):</b> {b.mau ?? "—"}</div>
          {laBuocChung(chon) && tuDuAn ? (
            <>
              <div className="thong-bao thong-bao-xanh" style={{ marginBottom: 0 }}>
                <b>Bước chung của dự án</b> — áp dụng cho mọi hộ, cập nhật ở màn Dự án (Mốc tiến độ → Cập nhật tiến độ).
                <div style={{ marginTop: 6 }}>
                  Trạng thái: <span className={`nhan ${bh.trangThai === "XONG" ? "nhan-xanh" : bh.trangThai === "CHO_DUYET" ? "nhan-tim" : bh.trangThai === "DANG" ? "nhan-duong" : "nhan-xam"}`}>{TEN_TRANG_THAI_BUOC[bh.trangThai]}</span>
                  {bh.ngay && <> · {ngayVN(bh.ngay)}</>}
                  {bh.ghiChu && <div className="chu-nho">{bh.ghiChu}</div>}
                  {(bh.guiBoi || bh.duyetBoi) && <div className="chu-nho mo">{bh.guiBoi && <>Gửi: {bh.guiBoi}. </>}{bh.duyetBoi && <>Xác nhận: {bh.duyetBoi}.</>}</div>}
                </div>
              </div>
              <div className="nhom-nut">
                <button className="nut" onClick={moDuAn}>Mở màn Dự án</button>
                {quyen("SUA_HO_SO") && <button className="nut" title="Dùng khi hộ này khác các hộ còn lại, vd. không hợp tác, phải kiểm đếm bắt buộc" onClick={() => theoDoiRieng(true)}>Theo dõi riêng cho hộ này</button>}
              </div>
            </>
          ) : (
            <>
              {laBuocChung(chon) && (
                <div className={`thong-bao ${h.tienDo[chon]?.rieng ? "thong-bao-vang" : "thong-bao-xanh"}`} style={{ marginBottom: 0 }}>
                  {h.tienDo[chon]?.rieng
                    ? <>Hộ này <b>theo dõi riêng</b> bước chung {b.ma} (không theo trạng thái chung của dự án). <button className="nut nut-chu nut-nho" disabled={!quyen("SUA_HO_SO")} onClick={() => theoDoiRieng(false)}>Bỏ theo dõi riêng</button></>
                    : <>Dự án chưa cập nhật bước chung {b.ma} — đang dùng tiến độ nhập riêng ở hộ. Nên cập nhật một lần cho cả dự án ở màn Dự án. <button className="nut nut-chu nut-nho" onClick={moDuAn}>Mở màn Dự án</button></>}
                </div>
              )}
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
                <select value={bh.trangThai} onChange={(e) => datBuoc({ trangThai: e.target.value as TrangThaiBuoc })}>
                  {Object.entries(TEN_TRANG_THAI_BUOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </O>
              <O nhan="Ngày thực hiện / hoàn thành"><input type="date" value={bh.ngay ?? ""} onChange={(e) => datBuoc({ ngay: e.target.value })} /></O>
              <O nhan="Nội dung thực hiện, ghi chú, số văn bản"><textarea rows={4} value={bh.ghiChu ?? ""} onChange={(e) => datBuoc({ ghiChu: e.target.value })} /></O>
              <div className="nhom-nut">
                <button className="nut" disabled={bh.trangThai === "CHO_DUYET" || bh.trangThai === "XONG" || !quyen("GUI_DUYET")} onClick={() => doiTrangThai("CHO_DUYET", `Gửi duyệt bước ${b.ma}. ${b.ten}`)}>Gửi duyệt</button>
                <button className="nut nut-chinh" disabled={bh.trangThai === "XONG" || !!loiDuyet} title={loiDuyet ?? undefined} onClick={() => doiTrangThai("XONG", `Xác nhận hoàn thành bước ${b.ma}. ${b.ten}`)}>Xác nhận hoàn thành</button>
              </div>
              <div className="mo chu-nho">
                {bh.guiBoi && <>Gửi duyệt: <b>{bh.guiBoi}</b>. </>}
                {bh.duyetBoi && <>Xác nhận: <b>{bh.duyetBoi}</b>. </>}
                {bh.trangThai !== "XONG" && loiDuyet && <>{loiDuyet}.</>}
              </div>
            </>
          )}
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
  );
}

export { NhanDong };

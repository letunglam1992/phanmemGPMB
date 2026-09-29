import { useEffect, useState, type ReactNode } from "react";
import { TheMangNoiBo } from "./KetNoi";
import { coVoWindows, moThuMucSaoLuu, thuMucSaoLuu, type CaiDatTuDong } from "../tu-dong-sao-luu";
import { useUngDung } from "../ung-dung";
import { HopThoai, O } from "./chung";
import { OSo } from "./OSo";
import { loiNguong, type NguongLechDt } from "../doi-chieu-dt";
import { TheGoiChinhSach } from "./GoiChinhSach";
import type { GiaiDoanTyLe } from "../chi-tra";
import { LE_DUONG_LICH_CO_DINH, type LichLamViec, type NgayDacBiet } from "../lich-lam-viec";
import { Chon } from "./Chon";
import { datHoiNoiLuu, hoiNoiLuu } from "../tai-xuong";
import { loiMatKhau, taoKhoaKhoiPhuc, thuMatKhauKhoiPhuc } from "../ma-hoa";

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const thu = (iso: string) => THU[new Date(`${iso}T00:00:00Z`).getUTCDay()]!;
const cuoiTuan = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay());
const vn = (iso: string) => iso.split("-").reverse().join("/");

/** Cài đặt chung: lịch ngày nghỉ (VM-25); các thẻ khác truyền qua `them`. */
export function HopCaiDat({ them }: { them?: { ma: string; ten: string; noiDung: ReactNode }[] }) {
  const { moCaiDat } = useUngDung();
  const cacThe = [{ ma: "lich", ten: "Lịch ngày nghỉ", noiDung: <TheLich /> }, { ma: "tu-dong", ten: "Tự động sao lưu", noiDung: <TheTuDong /> }, { ma: "cham-tra", ten: "Tiền chậm trả", noiDung: <TheTyLeCham /> }, { ma: "mang", ten: "Mạng nội bộ", noiDung: <TheMangNoiBo /> }, { ma: "luu-tep", ten: "Lưu tệp xuất", noiDung: <TheLuuTep /> }, { ma: "lich-su", ten: "Lịch sử bản ghi", noiDung: <TheLichSu /> }, { ma: "nguong-dt", ten: "Ngưỡng lệch diện tích", noiDung: <TheNguongDt /> }, { ma: "goi-cs", ten: "Gói chính sách", noiDung: <TheGoiChinhSach /> }, { ma: "giao-dien", ten: "Giao diện", noiDung: <TheGiaoDien /> }, ...(them ?? [])];
  const [the, setThe] = useState(cacThe[0]!.ma);
  return (
    <HopThoai tieuDe="Cài đặt chung" dong={() => moCaiDat(false)} rong={920}>
      <div className="tab" style={{ marginTop: -4 }}>
        {cacThe.map((t) => <button key={t.ma} className={the === t.ma ? "chon" : ""} onClick={() => setThe(t.ma)}>{t.ten}</button>)}
      </div>
      {cacThe.find((t) => t.ma === the)?.noiDung}
    </HopThoai>
  );
}

/** §11.3: ngưỡng lệch diện tích (bản đồ – hồ sơ – phương án – GCN) do đơn vị tự đặt kèm căn cứ. */
function TheNguongDt() {
  const { nguongLechDt, luuNguongLechDt, quyen } = useUngDung();
  const [n, setN] = useState<NguongLechDt>(nguongLechDt ?? { m2: "", phanTram: "", canCu: "" });
  const choSua = quyen("CAI_DAT");
  const loi = loiNguong(n);
  return (
    <div>
      <p className="mo mt-0">
        Dùng khi đối chiếu diện tích ba nguồn (Tổng quan dự án → Đối chiếu diện tích) và khi Soát phương án. <b>Ngưỡng do đơn vị tự đặt</b> theo quy định, quy chế
        áp dụng — phần mềm không đặt sẵn. Chênh lệch vượt một trong hai ngưỡng thì cảnh báo; để trống cả hai thì liệt kê mọi chênh lệch.
      </p>
      <div className="luoi luoi-3">
        <O nhan="Chênh lệch tối đa (m²)"><OSo className="o-so" value={n.m2} disabled={!choSua} onChange={(v) => setN({ ...n, m2: v })} /></O>
        <O nhan="Chênh lệch tối đa (%)"><OSo className="o-so" value={n.phanTram} disabled={!choSua} onChange={(v) => setN({ ...n, phanTram: v })} /></O>
        <O nhan="Căn cứ đặt ngưỡng (bắt buộc)"><input value={n.canCu} disabled={!choSua} placeholder="Văn bản, quy chế của đơn vị" onChange={(e) => setN({ ...n, canCu: e.target.value })} /></O>
      </div>
      {loi && <div className="thong-bao thong-bao-vang mt-8">{loi}</div>}
      {nguongLechDt?.luc && <p className="mo chu-nho">Đặt bởi {nguongLechDt.nguoi} lúc {new Date(nguongLechDt.luc).toLocaleString("vi-VN")}</p>}
      {choSua && <button className="nut nut-chinh mt-8" disabled={!!loi} onClick={() => void luuNguongLechDt(n)}>Lưu ngưỡng</button>}
    </div>
  );
}

/** P1-5: thời hạn giữ lịch sử bản ghi — quản trị đặt; phần mềm không đặt sẵn thời hạn. */
function TheLichSu() {
  const { giuLichSu, luuGiuLichSu, quyen } = useUngDung();
  const [n, setN] = useState(String(giuLichSu));
  const choSua = quyen("KHOI_PHUC_BAN_GHI");
  const so = Number(n);
  const hopLe = /^\d{1,3}$/.test(n.trim()) && so <= 100;
  return (
    <div>
      <p className="mo mt-0">
        Mỗi lần sửa, xóa hẳn hoặc khôi phục, phần mềm giữ lại bản cũ của hồ sơ, dự án, phương án (xem ở thẻ Nhật ký của hồ sơ; hồ sơ đã xóa hẳn ở Thùng rác).
        Quản trị khôi phục được hồ sơ về bản cũ. Thời hạn giữ do đơn vị quyết định theo quy định về lưu trữ hồ sơ của đơn vị — phần mềm không đặt sẵn;
        <b> 0 = giữ không thời hạn</b>. Bản cũ hơn thời hạn bị xóa vĩnh viễn khi lưu thiết lập và mỗi lần mở dữ liệu.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label htmlFor="giu-ls">Giữ lịch sử (năm)</label>
        <input id="giu-ls" style={{ width: 90 }} value={n} disabled={!choSua} inputMode="numeric" onChange={(e) => setN(e.target.value)} />
        {choSua && (
          <button className="nut nut-chinh" disabled={!hopLe || so === giuLichSu} onClick={() => {
            if (so > 0 && so < giuLichSu && !confirm(`Rút thời hạn còn ${so} năm: bản lịch sử cũ hơn ${so} năm sẽ bị xóa vĩnh viễn. Tiếp tục?`)) return;
            if (giuLichSu === 0 && so > 0 && !confirm(`Đặt thời hạn ${so} năm: bản lịch sử cũ hơn ${so} năm sẽ bị xóa vĩnh viễn. Tiếp tục?`)) return;
            void luuGiuLichSu(so);
          }}>Lưu</button>
        )}
        <span className="mo chu-nho">Hiện tại: {giuLichSu ? `${giuLichSu} năm` : "không thời hạn"}{!choSua && " · chỉ Quản trị thay đổi"}</span>
      </div>
      {!hopLe && <div className="thong-bao thong-bao-vang mt-8">Nhập số nguyên từ 0 đến 100</div>}
    </div>
  );
}

function TheLich() {
  const { lich, luuLich, quyen } = useUngDung();
  const [nam, setNam] = useState(new Date().getFullYear());
  const [ban, setBan] = useState<LichLamViec>(lich);
  const [moi, setMoi] = useState<{ loai: "nghi" | "lamBu"; ngay: string; ten: string }>({ loai: "nghi", ngay: "", ten: "" });
  const [loi, setLoi] = useState("");
  const choSua = quyen("CAI_DAT");
  const cuaNam = (ds: NgayDacBiet[]) => ds.filter((x) => x.ngay.startsWith(`${nam}-`)).sort((a, b) => a.ngay.localeCompare(b.ngay));
  const daSua = JSON.stringify(ban) !== JSON.stringify(lich);

  const them = () => {
    setLoi("");
    if (!moi.ngay || !moi.ten.trim()) return setLoi("Nhập ngày và tên");
    if ([...ban.nghi, ...ban.lamBu].some((x) => x.ngay === moi.ngay)) return setLoi(`Ngày ${vn(moi.ngay)} đã có trong danh mục`);
    if (moi.loai === "lamBu" && !cuoiTuan(moi.ngay)) return setLoi("Ngày làm bù phải là thứ Bảy hoặc Chủ nhật");
    setBan({ ...ban, [moi.loai]: [...ban[moi.loai], { ngay: moi.ngay, ten: moi.ten.trim() }] });
    setMoi({ ...moi, ngay: "", ten: "" });
  };
  const xoa = (loai: "nghi" | "lamBu", ngay: string) => setBan({ ...ban, [loai]: ban[loai].filter((x) => x.ngay !== ngay) });
  const themCoDinh = () => {
    const co = new Set(ban.nghi.map((x) => x.ngay));
    const moiNgay = LE_DUONG_LICH_CO_DINH.map((x) => ({ ngay: `${nam}-${x.thangNgay}`, ten: x.ten })).filter((x) => !co.has(x.ngay));
    setBan({ ...ban, nghi: [...ban.nghi, ...moiNgay] });
  };
  const daDu = ban.namDaDu.includes(nam);

  const bang = (loai: "nghi" | "lamBu", tieuDe: string) => (
    <div>
      <h3 style={{ margin: "10px 0 6px" }}>{tieuDe} năm {nam}</h3>
      <table className="bang">
        <thead><tr><th>Ngày</th><th>Thứ</th><th>Nội dung</th><th /></tr></thead>
        <tbody>
          {cuaNam(ban[loai]).map((x) => (
            <tr key={x.ngay}>
              <td>{vn(x.ngay)}</td>
              <td>{thu(x.ngay)}{loai === "nghi" && cuoiTuan(x.ngay) && <span className="nhan nhan-vang" style={{ marginLeft: 4 }} title="Ngày nghỉ trùng cuối tuần không ảnh hưởng cách tính; nhập ngày nghỉ bù (nếu có) là ngày thường">cuối tuần</span>}</td>
              <td>{x.ten}</td>
              <td>{choSua && <button className="nut nut-nho nut-nguy" onClick={() => xoa(loai, x.ngay)}>Xóa</button>}</td>
            </tr>
          ))}
          {cuaNam(ban[loai]).length === 0 && <tr><td colSpan={4} className="trong">Chưa có.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <p className="mo mt-0">
        Dùng để tính các thời hạn theo <b>ngày làm việc</b> (VM-25). Phần mềm không tự tính lịch âm, ngày nghỉ bù, hoán đổi ngày làm việc: cán bộ nhập theo thông báo nghỉ lễ, Tết hằng năm của cơ quan có thẩm quyền (Tết Âm lịch, Giỗ Tổ Hùng Vương, ngày nghỉ liền kề Quốc khánh, nghỉ bù, làm bù). Nút bên dưới chỉ thêm các ngày lễ cố định theo dương lịch (khoản 1 Điều 112 Bộ luật Lao động 2019).
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>Năm <input type="number" value={nam} min={2024} max={2100} onChange={(e) => setNam(Number(e.target.value))} style={{ width: 90 }} /></label>
        {choSua && <button className="nut" onClick={themCoDinh}>Thêm ngày lễ dương lịch cố định năm {nam}</button>}
        <span className="day-phai">{daDu ? <span className="nhan nhan-xanh">Đã xác nhận đủ danh mục năm {nam}</span> : <span className="nhan nhan-vang">Chưa xác nhận danh mục năm {nam}</span>}</span>
      </div>
      <div className="luoi luoi-2">
        {bang("nghi", "Ngày nghỉ lễ, Tết, nghỉ bù")}
        {bang("lamBu", "Ngày làm bù (thứ Bảy, Chủ nhật đi làm)")}
      </div>
      {choSua ? (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "end", marginTop: 12, flexWrap: "wrap" }}>
            <Chon value={moi.loai} aria-label="Loại ngày" onChange={(e) => setMoi({ ...moi, loai: e.target.value as "nghi" | "lamBu" })}>
              <option value="nghi">Ngày nghỉ</option>
              <option value="lamBu">Ngày làm bù</option>
            </Chon>
            <input type="date" aria-label="Ngày" value={moi.ngay} onChange={(e) => setMoi({ ...moi, ngay: e.target.value })} />
            <input placeholder="Nội dung, vd. Tết Nguyên đán (theo thông báo số …)" aria-label="Nội dung" value={moi.ten} style={{ flex: 1, minWidth: 260 }} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} />
            <button className="nut" onClick={them}>Thêm</button>
          </div>
          {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
          <label style={{ display: "block", marginTop: 12 }}>
            <input type="checkbox" checked={daDu} onChange={(e) => setBan({ ...ban, namDaDu: e.target.checked ? [...ban.namDaDu, nam].sort() : ban.namDaDu.filter((y) => y !== nam) })} /> Tôi đã nhập đủ ngày nghỉ, ngày làm bù năm {nam} theo thông báo chính thức
          </label>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="nut" disabled={!daSua} onClick={() => setBan(lich)}>Hoàn tác</button>
            <button className="nut nut-chinh" disabled={!daSua} onClick={() => void luuLich(ban)}>Lưu lịch</button>
          </div>
        </>
      ) : (
        <p className="mo chu-nho">Chỉ tài khoản Lãnh đạo hoặc Quản trị sửa được lịch.</p>
      )}
    </div>
  );
}

/** Mật khẩu khôi phục (P0-5): mở được mọi bản sao lưu (tự động, thủ công) trên máy khác khi quên mật khẩu sao lưu. */
function KhoiPhucMatKhau() {
  const { khoaKhoiPhuc, luuKhoaKhoiPhuc, quyen, bao, nguoiDung } = useUngDung();
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [thu, setThu] = useState("");
  const [dang, setDang] = useState(false);
  const loi = loiMatKhau(mk) ?? (mk !== mk2 ? "Hai lần nhập không khớp" : null);
  const choSua = quyen("KHOI_PHUC");
  return (
    <div className="the" style={{ padding: 12, marginTop: 14 }}>
      <h3 className="mt-0">Mật khẩu khôi phục</h3>
      <p className="mo chu-nho mt-0">
        Bản sao lưu được mã hóa. Sao lưu tự động mở được trên chính máy này (tài khoản Windows); trên <b>máy khác</b> (máy hỏng, cài lại) cần <b>mật khẩu khôi phục</b>. Bản sao lưu thủ công mở được bằng mật khẩu sao lưu <i>hoặc</i> mật khẩu khôi phục. Máy không lưu mật khẩu này.
        Đề nghị: ghi mật khẩu ra giấy, niêm phong, giao lãnh đạo đơn vị hoặc người thứ hai giữ; ghi vào sổ bàn giao khi thay đổi cán bộ quản trị.
      </p>
      <div className="mo-ta">
        Trạng thái: {khoaKhoiPhuc ? <span className="nhan nhan-xanh">Đã đặt — khóa {khoaKhoiPhuc.vanTay}, {new Date(khoaKhoiPhuc.taoLuc).toLocaleString("vi-VN")}, {khoaKhoiPhuc.nguoi}</span> : <span className="nhan nhan-vang">Chưa đặt</span>}
      </div>
      {choSua ? (
        <>
          <div className="luoi luoi-2 mt-8">
            <div className="o-nhap"><label>{khoaKhoiPhuc ? "Mật khẩu khôi phục mới" : "Mật khẩu khôi phục"}</label><input type="password" autoComplete="new-password" value={mk} onChange={(e) => setMk(e.target.value)} /></div>
            <div className="o-nhap"><label>Nhập lại</label><input type="password" autoComplete="new-password" value={mk2} onChange={(e) => setMk2(e.target.value)} /></div>
          </div>
          {mk && loi && <div className="chu-do chu-nho">{loi}</div>}
          {khoaKhoiPhuc && <p className="mo chu-nho">Đổi mật khẩu chỉ áp dụng cho bản sao lưu tạo sau khi đổi; bản cũ vẫn mở bằng mật khẩu cũ — giữ lại mật khẩu cũ cùng các bản sao lưu cũ.</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="nut nut-chinh" disabled={!!loi || dang} onClick={async () => {
              setDang(true);
              try {
                await luuKhoaKhoiPhuc(await taoKhoaKhoiPhuc(mk, nguoiDung));
                setMk("");
                setMk2("");
                bao("Đã đặt mật khẩu khôi phục — cất giữ mật khẩu theo quy chế của cơ quan");
              } finally {
                setDang(false);
              }
            }}>{dang ? "Đang tạo khóa…" : khoaKhoiPhuc ? "Đổi mật khẩu khôi phục" : "Đặt mật khẩu khôi phục"}</button>
          </div>
        </>
      ) : (
        <p className="mo chu-nho">Chỉ tài khoản Quản trị đặt, đổi mật khẩu khôi phục.</p>
      )}
      {khoaKhoiPhuc && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input type="password" placeholder="Thử lại mật khẩu khôi phục (kiểm tra còn nhớ đúng)" value={thu} onChange={(e) => setThu(e.target.value)} className="gian" />
          <button className="nut" disabled={!thu} onClick={async () => { bao((await thuMatKhauKhoiPhuc(khoaKhoiPhuc, thu)) ? "Mật khẩu khôi phục đúng" : "Mật khẩu khôi phục KHÔNG đúng", undefined); setThu(""); }}>Thử</button>
        </div>
      )}
    </div>
  );
}

function TheTuDong() {
  const { tuDong, luuTuDong, saoLuuTuDongNgay, quyen, bao } = useUngDung();
  const [ban, setBan] = useState<CaiDatTuDong>(tuDong);
  const [duongDan, setDuongDan] = useState("");
  const [dang, setDang] = useState(false);
  const coVo = coVoWindows();
  const choSua = quyen("CAI_DAT");
  useEffect(() => setBan(tuDong), [tuDong]);
  useEffect(() => {
    if (coVo) void thuMucSaoLuu(tuDong.thuMuc).then(setDuongDan, (e) => setDuongDan(`Lỗi: ${String(e)}`));
  }, [coVo, tuDong.thuMuc]);
  const daSua = JSON.stringify(ban) !== JSON.stringify(tuDong);
  const ngayGio = (iso?: string) => (iso ? new Date(iso).toLocaleString("vi-VN", { hour12: false }) : "chưa có");

  return (
    <div>
      <p className="mo mt-0">
        Phần mềm tự tạo tệp sao lưu <b>.gpmb</b> (như sao lưu thủ công) theo chu kỳ khi đang mở, ghi vào thư mục trên máy hoặc ổ mạng nội bộ do cán bộ chọn, và chỉ giữ lại số bản mới nhất. Không gửi dữ liệu ra ngoài. Tệp được mã hóa (AES-256) bằng tài khoản Windows của máy này và mật khẩu khôi phục bên dưới; vẫn nên đặt thư mục ở nơi được bảo vệ theo quy chế của cơ quan. Bản sao lưu cùng ổ đĩa không thay được việc cất bản sao ra thiết bị khác.
      </p>
      {!coVo && <div className="thong-bao thong-bao-vang">Chức năng này chỉ hoạt động trong bản cài Windows (không có khi chạy thử trên trình duyệt).</div>}
      <div className="luoi luoi-2">
        <label><input type="checkbox" disabled={!choSua} checked={ban.bat} onChange={(e) => setBan({ ...ban, bat: e.target.checked })} /> Bật tự động sao lưu</label>
        <span />
        <label className="chu-nho">Chu kỳ (ngày) <input type="number" min={1} max={30} disabled={!choSua} value={ban.soNgay} onChange={(e) => setBan({ ...ban, soNgay: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })} style={{ width: 80 }} /></label>
        <label className="chu-nho">Số bản giữ lại <input type="number" min={1} max={100} disabled={!choSua} value={ban.giuLai} onChange={(e) => setBan({ ...ban, giuLai: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} style={{ width: 80 }} /></label>
      </div>
      <div className="o-nhap mt-10">
        <label>Thư mục lưu (bỏ trống = Documents\GPMB Son La\Sao luu)</label>
        <input disabled={!choSua} value={ban.thuMuc} placeholder="vd. D:\SaoLuuGPMB hoặc \\may-chu\chia-se\GPMB" onChange={(e) => setBan({ ...ban, thuMuc: e.target.value })} />
        {coVo && <span className="goi-y">Đang dùng: {duongDan || "…"}</span>}
      </div>
      <table className="bang mt-12">
        <tbody>
          <tr><th>Lần sao lưu tự động gần nhất</th><td>{ngayGio(tuDong.lanCuoi)}</td></tr>
          <tr><th>Tệp gần nhất</th><td className="chu-nho">{tuDong.tepCuoi ?? "—"}</td></tr>
          {tuDong.loiCuoi && <tr><th>Lỗi lần thử gần nhất</th><td><span className="nhan nhan-do" style={{ whiteSpace: "normal" }}>{tuDong.loiCuoi}</span></td></tr>}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        {coVo && <button className="nut" onClick={() => void moThuMucSaoLuu(tuDong.thuMuc).catch((e) => bao(String(e), "loi"))}>Mở thư mục</button>}
        {coVo && (quyen("SAO_LUU") || choSua) && (
          <button className="nut" disabled={dang || daSua} title={daSua ? "Lưu cài đặt trước" : undefined} onClick={async () => {
            setDang(true);
            const truoc = new Date().toISOString();
            const c = await saoLuuTuDongNgay();
            setDang(false);
            const daThu = !!c.thuLuc && c.thuLuc >= truoc;
            const ok = daThu && c.lanCuoi === c.thuLuc;
            bao(ok ? `Đã sao lưu: ${c.tepCuoi}` : daThu ? `Sao lưu không thành công: ${c.loiCuoi}` : "Đang có một lần sao lưu khác chạy — thử lại sau", ok ? "ok" : "loi");
          }}>{dang ? "Đang sao lưu…" : "Sao lưu ngay"}</button>
        )}
        {choSua && <button className="nut nut-chinh" disabled={!daSua} onClick={() => void luuTuDong(ban)}>Lưu cài đặt</button>}
      </div>
      {!choSua && <p className="mo chu-nho">Chỉ tài khoản Lãnh đạo hoặc Quản trị sửa được cài đặt.</p>}
      <KhoiPhucMatKhau />
    </div>
  );
}

function TheTyLeCham() {
  const { tyLeCham, luuTyLeCham, quyen } = useUngDung();
  const [ds, setDs] = useState<GiaiDoanTyLe[]>(tyLeCham);
  const [moi, setMoi] = useState<GiaiDoanTyLe>({ tuNgay: "", tyLe: "", canCu: "" });
  const [loi, setLoi] = useState("");
  const choSua = quyen("CAI_DAT");
  const daSua = JSON.stringify(ds) !== JSON.stringify(tyLeCham);
  const them = () => {
    setLoi("");
    const tl = moi.tyLe.replace(",", ".").trim();
    if (!moi.tuNgay || !/^\d+(\.\d+)?$/.test(tl) || Number(tl) <= 0 || Number(tl) >= 1) return setLoi("Nhập ngày áp dụng và tỷ lệ %/ngày (lớn hơn 0, nhỏ hơn 1), vd. 0,03");
    if (!moi.canCu.trim()) return setLoi("Phải ghi căn cứ (điều, khoản, văn bản)");
    if (ds.some((g) => g.tuNgay === moi.tuNgay)) return setLoi("Đã có giai đoạn bắt đầu cùng ngày");
    setDs([...ds, { tuNgay: moi.tuNgay, tyLe: tl, canCu: moi.canCu.trim() }].sort((a, b) => a.tuNgay.localeCompare(b.tuNgay)));
    setMoi({ tuNgay: "", tyLe: "", canCu: "" });
  };
  return (
    <div>
      <p className="mo mt-0">
        Điểm b khoản 3 Điều 94 Luật Đất đai 2024: chậm chi trả thì người có đất thu hồi "được thanh toán thêm một khoản tiền bằng <b>mức tiền chậm nộp theo quy định của Luật Quản lý thuế</b> tính trên số tiền chậm trả và thời gian chậm trả". Phần mềm không tự đặt mức: nhập tỷ lệ %/ngày theo văn bản hiện hành, mỗi lần thay đổi thêm một giai đoạn mới. Thiếu tỷ lệ cho ngày nào thì tiền chậm trả của khoản đó ở trạng thái thiếu căn cứ.
      </p>
      <table className="bang">
        <thead><tr><th>Áp dụng từ ngày</th><th className="so">Tỷ lệ (%/ngày)</th><th>Căn cứ</th><th /></tr></thead>
        <tbody>
          {ds.map((g) => (
            <tr key={g.tuNgay}><td>{vn(g.tuNgay)}</td><td className="so">{g.tyLe.replace(".", ",")}</td><td>{g.canCu}</td><td>{choSua && <button className="nut nut-nho nut-nguy" onClick={() => setDs(ds.filter((x) => x !== g))}>Xóa</button>}</td></tr>
          ))}
          {ds.length === 0 && <tr><td colSpan={4} className="trong">Chưa nhập — tiền chậm trả chưa tính được.</td></tr>}
        </tbody>
      </table>
      {choSua ? (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "end", marginTop: 12, flexWrap: "wrap" }}>
            <input type="date" aria-label="Áp dụng từ ngày" value={moi.tuNgay} onChange={(e) => setMoi({ ...moi, tuNgay: e.target.value })} />
            <input aria-label="Tỷ lệ %/ngày" placeholder="%/ngày" value={moi.tyLe} style={{ width: 100 }} onChange={(e) => setMoi({ ...moi, tyLe: e.target.value })} />
            <input aria-label="Căn cứ" placeholder="Căn cứ: điểm …, khoản …, Điều … Luật Quản lý thuế số …" value={moi.canCu} style={{ flex: 1, minWidth: 280 }} onChange={(e) => setMoi({ ...moi, canCu: e.target.value })} />
            <button className="nut" onClick={them}>Thêm</button>
          </div>
          {loi && <div className="thong-bao thong-bao-do mt-8">{loi}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="nut" disabled={!daSua} onClick={() => setDs(tyLeCham)}>Hoàn tác</button>
            <button className="nut nut-chinh" disabled={!daSua} onClick={() => void luuTyLeCham(ds)}>Lưu</button>
          </div>
        </>
      ) : (
        <p className="mo chu-nho">Chỉ tài khoản Lãnh đạo hoặc Quản trị sửa được.</p>
      )}
    </div>
  );
}

/** Ảnh nền thanh tiêu đề: mặc định là tranh núi đồi tự vẽ; đơn vị có thể chọn ảnh chụp riêng (lưu trong cài đặt, không gửi ra ngoài). */
/** Nơi lưu tệp xuất (Excel, Word, zip, sao lưu thủ công) — cài đặt theo máy. */
function TheLuuTep() {
  const [hoi, setHoi] = useState(hoiNoiLuu());
  return (
    <div>
      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={hoi} onChange={(e) => { datHoiNoiLuu(e.target.checked); setHoi(e.target.checked); }} /> Hỏi nơi lưu mỗi lần xuất tệp (Excel, Word, zip, sao lưu thủ công)
      </label>
      <p className="mo chu-nho">
        Bật: mở hộp thoại “Lưu thành” để chọn thư mục và đặt tên tệp; lần sau mở sẵn thư mục đã lưu gần nhất. Bấm Hủy thì không lưu và không ghi số, ngày văn bản vào hồ sơ.
        <br />Tắt: lưu thẳng vào thư mục Downloads và mở Explorer chọn sẵn tệp. Cài đặt áp dụng cho máy này. Sao lưu tự động vẫn ghi vào thư mục đặt ở thẻ “Tự động sao lưu”.
      </p>
    </div>
  );
}

function TheGiaoDien() {
  const { anhNen, luuAnhNen, quyen, bao } = useUngDung();
  const [dang, setDang] = useState(false);
  const chon = async (f: File) => {
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return bao("Chỉ nhận ảnh JPG, PNG, WEBP", "loi");
    setDang(true);
    try {
      // Thu nhỏ về rộng 2000 px, JPEG 82% để nhẹ dữ liệu cài đặt (đồng bộ qua mạng nội bộ)
      const url = URL.createObjectURL(f);
      const img = await new Promise<HTMLImageElement>((ok, loi) => { const i = new Image(); i.onload = () => ok(i); i.onerror = loi; i.src = url; });
      const tl = Math.min(1, 2000 / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * tl);
      c.height = Math.round(img.naturalHeight * tl);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      await luuAnhNen(c.toDataURL("image/jpeg", 0.82));
      bao("Đã đổi ảnh nền thanh tiêu đề");
    } catch {
      bao("Không đọc được ảnh", "loi");
    } finally {
      setDang(false);
    }
  };
  return (
    <div className="luoi" style={{ gap: 12 }}>
      <p className="mo" style={{ margin: 0 }}>Ảnh nền thanh tiêu đề. Mặc định là tranh núi đồi, ruộng bậc thang do phần mềm tự vẽ. Có thể chọn ảnh chụp phong cảnh của địa phương (JPG, PNG, WEBP; nên ảnh ngang, rộng ≥ 1.600 px). Ảnh lưu trong cài đặt của phần mềm, không gửi ra ngoài.</p>
      <div className="xem-nen" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,44,32,.9), rgba(20,70,50,.1)), url("${anhNen ?? "/nen-nui.svg"}")` }}>
        <b>Bồi thường, hỗ trợ, tái định cư</b><small>Xem trước</small>
      </div>
      <div className="nhom-nut">
        <label className={`nut nut-chinh ${!quyen("CAI_DAT") || dang ? "tat" : ""}`}>
          {dang ? "Đang xử lý…" : "Chọn ảnh…"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="an" disabled={!quyen("CAI_DAT") || dang} onChange={(e) => e.target.files?.[0] && void chon(e.target.files[0])} />
        </label>
        <button className="nut" disabled={!anhNen || !quyen("CAI_DAT")} onClick={() => void luuAnhNen(null)}>Dùng ảnh mặc định</button>
      </div>
      {!quyen("CAI_DAT") && <div className="chu-nho mo">Lãnh đạo hoặc quản trị được đổi ảnh nền.</div>}
    </div>
  );
}

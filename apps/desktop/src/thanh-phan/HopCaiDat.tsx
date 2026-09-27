import { useEffect, useState, type ReactNode } from "react";
import { coVoWindows, moThuMucSaoLuu, thuMucSaoLuu, type CaiDatTuDong } from "../tu-dong-sao-luu";
import { useUngDung } from "../ung-dung";
import { HopThoai } from "./chung";
import { LE_DUONG_LICH_CO_DINH, type LichLamViec, type NgayDacBiet } from "../lich-lam-viec";

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const thu = (iso: string) => THU[new Date(`${iso}T00:00:00Z`).getUTCDay()]!;
const cuoiTuan = (iso: string) => [0, 6].includes(new Date(`${iso}T00:00:00Z`).getUTCDay());
const vn = (iso: string) => iso.split("-").reverse().join("/");

/** Cài đặt chung: lịch ngày nghỉ (VM-25); các thẻ khác truyền qua `them`. */
export function HopCaiDat({ them }: { them?: { ma: string; ten: string; noiDung: ReactNode }[] }) {
  const { moCaiDat } = useUngDung();
  const cacThe = [{ ma: "lich", ten: "Lịch ngày nghỉ", noiDung: <TheLich /> }, { ma: "tu-dong", ten: "Tự động sao lưu", noiDung: <TheTuDong /> }, ...(them ?? [])];
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
      <p className="mo" style={{ marginTop: 0 }}>
        Dùng để tính các thời hạn theo <b>ngày làm việc</b> (VM-25). Phần mềm không tự tính lịch âm, ngày nghỉ bù, hoán đổi ngày làm việc: cán bộ nhập theo thông báo nghỉ lễ, Tết hằng năm của cơ quan có thẩm quyền (Tết Âm lịch, Giỗ Tổ Hùng Vương, ngày nghỉ liền kề Quốc khánh, nghỉ bù, làm bù). Nút bên dưới chỉ thêm các ngày lễ cố định theo dương lịch (khoản 1 Điều 112 Bộ luật Lao động 2019).
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>Năm <input type="number" value={nam} min={2024} max={2100} onChange={(e) => setNam(Number(e.target.value))} style={{ width: 90 }} /></label>
        {choSua && <button className="nut" onClick={themCoDinh}>Thêm ngày lễ dương lịch cố định năm {nam}</button>}
        <span style={{ marginLeft: "auto" }}>{daDu ? <span className="nhan nhan-xanh">Đã xác nhận đủ danh mục năm {nam}</span> : <span className="nhan nhan-vang">Chưa xác nhận danh mục năm {nam}</span>}</span>
      </div>
      <div className="luoi luoi-2">
        {bang("nghi", "Ngày nghỉ lễ, Tết, nghỉ bù")}
        {bang("lamBu", "Ngày làm bù (thứ Bảy, Chủ nhật đi làm)")}
      </div>
      {choSua ? (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "end", marginTop: 12, flexWrap: "wrap" }}>
            <select value={moi.loai} aria-label="Loại ngày" onChange={(e) => setMoi({ ...moi, loai: e.target.value as "nghi" | "lamBu" })}>
              <option value="nghi">Ngày nghỉ</option>
              <option value="lamBu">Ngày làm bù</option>
            </select>
            <input type="date" aria-label="Ngày" value={moi.ngay} onChange={(e) => setMoi({ ...moi, ngay: e.target.value })} />
            <input placeholder="Nội dung, vd. Tết Nguyên đán (theo thông báo số …)" aria-label="Nội dung" value={moi.ten} style={{ flex: 1, minWidth: 260 }} onChange={(e) => setMoi({ ...moi, ten: e.target.value })} />
            <button className="nut" onClick={them}>Thêm</button>
          </div>
          {loi && <div className="thong-bao thong-bao-do" style={{ marginTop: 8 }}>{loi}</div>}
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
      <p className="mo" style={{ marginTop: 0 }}>
        Phần mềm tự tạo tệp sao lưu <b>.gpmb</b> (như sao lưu thủ công) theo chu kỳ khi đang mở, ghi vào thư mục trên máy hoặc ổ mạng nội bộ do cán bộ chọn, và chỉ giữ lại số bản mới nhất. Không gửi dữ liệu ra ngoài. Tệp không mã hóa, chứa thông tin cá nhân — đặt thư mục ở nơi được bảo vệ theo quy chế của cơ quan. Bản sao lưu cùng ổ đĩa không thay được việc cất bản sao ra thiết bị khác.
      </p>
      {!coVo && <div className="thong-bao thong-bao-vang">Chức năng này chỉ hoạt động trong bản cài Windows (không có khi chạy thử trên trình duyệt).</div>}
      <div className="luoi luoi-2">
        <label><input type="checkbox" disabled={!choSua} checked={ban.bat} onChange={(e) => setBan({ ...ban, bat: e.target.checked })} /> Bật tự động sao lưu</label>
        <span />
        <label className="chu-nho">Chu kỳ (ngày) <input type="number" min={1} max={30} disabled={!choSua} value={ban.soNgay} onChange={(e) => setBan({ ...ban, soNgay: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })} style={{ width: 80 }} /></label>
        <label className="chu-nho">Số bản giữ lại <input type="number" min={1} max={100} disabled={!choSua} value={ban.giuLai} onChange={(e) => setBan({ ...ban, giuLai: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} style={{ width: 80 }} /></label>
      </div>
      <div className="o-nhap" style={{ marginTop: 10 }}>
        <label>Thư mục lưu (bỏ trống = Documents\GPMB Son La\Sao luu)</label>
        <input disabled={!choSua} value={ban.thuMuc} placeholder="vd. D:\SaoLuuGPMB hoặc \\may-chu\chia-se\GPMB" onChange={(e) => setBan({ ...ban, thuMuc: e.target.value })} />
        {coVo && <span className="goi-y">Đang dùng: {duongDan || "…"}</span>}
      </div>
      <table className="bang" style={{ marginTop: 12 }}>
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
    </div>
  );
}

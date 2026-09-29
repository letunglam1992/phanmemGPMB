import { useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import { HopThoai, O } from "./chung";
import {
  MO_TA_VAI_TRO,
  QUYEN_THEO_VAI_TRO,
  TEN_QUYEN,
  TEN_VAI_TRO,
  datMatKhau,
  dungMatKhau,
  kiemTraMatKhau,
  kiemTraThayDoi,
  taoTaiKhoan,
  type NguoiDung,
  type Quyen,
  type VaiTro,
} from "../tai-khoan";
import { kiemTraChuoi, type DongNhatKy } from "../nhat-ky";
import { HopKetNoi } from "./KetNoi";
import { BieuTuong } from "./BieuDo";
import { docCheDo, laKhoMang } from "../kho-mang";
import { Chon } from "./Chon";
import { BAN_QUYEN, moTaPhienBan } from "../phien-ban";

const ngayGio = (iso?: string) => (iso ? new Date(iso).toLocaleString("vi-VN", { hour12: false }) : "—");

/** Màn đăng nhập; lần chạy đầu (chưa có tài khoản) → tạo tài khoản quản trị. */
export function ManDangNhap() {
  const { coTaiKhoan, dangNhap, khoiTaoQuanTri } = useUngDung();
  const [ten, setTen] = useState("");
  const [mk, setMk] = useState("");
  const [mk2, setMk2] = useState("");
  const [hoTen, setHoTen] = useState("");
  const [chucVu, setChucVu] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [ketNoi, setKetNoi] = useState(false);
  const [hienMk, setHienMk] = useState(false);
  const khoiTao = coTaiKhoan === false;

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoi("");
    setDang(true);
    try {
      if (khoiTao) {
        if (mk !== mk2) throw new Error("Hai lần nhập mật khẩu không khớp");
        await khoiTaoQuanTri({ ten, hoTen, chucVu, matKhau: mk });
      } else {
        const l = await dangNhap(ten, mk);
        if (l) setLoi(l);
      }
    } catch (x) {
      setLoi((x as Error).message);
    } finally {
      setDang(false);
    }
  };

  const cheDo = docCheDo();
  const hopCheDo =
    cheDo.cheDo === "MAY_DON"
      ? { ten: "Chế độ cục bộ", mo: "Dữ liệu được lưu an toàn trên thiết bị này" }
      : cheDo.cheDo === "MAY_CHU"
        ? { ten: "Máy chủ mạng nội bộ", mo: `Dữ liệu lưu trên máy này, chia sẻ cho máy trạm (cổng ${cheDo.cong})` }
        : { ten: "Máy trạm", mo: `Dữ liệu trên máy chủ nội bộ ${cheDo.ketNoi.diaChi}` };

  if (coTaiKhoan === null) return <div className="man-dang-nhap"><div className="trong">Đang mở dữ liệu…</div></div>;
  return (
    <div className="man-dang-nhap">
      <form className="o-dang-nhap" onSubmit={gui}>
        <div className="dn-thuong-hieu">
          <div className="dn-logo" aria-hidden>
            <svg width="40" height="28" viewBox="0 0 44 30" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"><path d="M2 27L15 7l7 10 5-6 15 16z" /><path d="M11 27l7-9 5 6" /></svg>
          </div>
          <div className="dn-ten">UBND TỈNH SƠN LA</div>
          <div className="dn-mo-ta">Hệ thống quản lý bồi thường, hỗ trợ và tái định cư</div>
        </div>
        <div className="dn-than">
          <h2>{khoiTao ? "Tạo tài khoản quản trị đầu tiên" : "Đăng nhập"}</h2>
          <p className="dn-phu">
            {khoiTao
              ? "Máy này chưa có tài khoản. Tài khoản quản trị tạo các tài khoản cán bộ, lãnh đạo. Nên tạo thêm ít nhất một tài khoản quản trị dự phòng: quên mật khẩu quản trị duy nhất sẽ không vào được phần mềm."
              : cheDo.cheDo === "MAY_TRAM"
                ? "Đăng nhập bằng tài khoản trên máy chủ mạng nội bộ."
                : "Truy cập hệ thống quản lý GPMB"}
          </p>
          <div className="dn-truong">
            <O nhan="Tên đăng nhập">
              <span className="o-bieu-tuong">
                <BieuTuong ten="taiKhoan" co={18} />
                <input autoFocus value={ten} autoComplete="username" onChange={(e) => setTen(e.target.value)} placeholder="Nhập tên đăng nhập" />
              </span>
            </O>
            {khoiTao && (
              <>
                <O nhan="Họ tên"><input value={hoTen} onChange={(e) => setHoTen(e.target.value)} /></O>
                <O nhan="Chức vụ (không bắt buộc)"><input value={chucVu} onChange={(e) => setChucVu(e.target.value)} /></O>
              </>
            )}
            <O nhan="Mật khẩu" goiY={khoiTao ? "Tối thiểu 8 ký tự, có chữ và số" : undefined}>
              <span className="o-bieu-tuong">
                <BieuTuong ten="khoa" co={18} />
                <input type={hienMk ? "text" : "password"} value={mk} autoComplete={khoiTao ? "new-password" : "current-password"} onChange={(e) => setMk(e.target.value)} placeholder="Nhập mật khẩu" />
                <button type="button" className="o-mat" onClick={() => setHienMk(!hienMk)} aria-label={hienMk ? "Ẩn mật khẩu" : "Hiện mật khẩu"} title={hienMk ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  <BieuTuong ten={hienMk ? "matTat" : "mat"} co={18} />
                </button>
              </span>
            </O>
            {khoiTao && (
              <O nhan="Nhập lại mật khẩu">
                <span className="o-bieu-tuong">
                  <BieuTuong ten="khoa" co={18} />
                  <input type={hienMk ? "text" : "password"} value={mk2} autoComplete="new-password" onChange={(e) => setMk2(e.target.value)} />
                </span>
              </O>
            )}
          </div>
          {loi && <div className="thong-bao thong-bao-do" role="alert" style={{ marginTop: 14, marginBottom: 0 }}>{loi}</div>}
          <button className="dn-nut" type="submit" disabled={dang || !ten || !mk}>
            <BieuTuong ten="vao" co={19} />
            {dang ? "Đang xử lý…" : khoiTao ? "Tạo tài khoản và vào phần mềm" : "Đăng nhập"}
          </button>
          <div className="dn-che-do">
            <span className="dn-che-do-bt"><BieuTuong ten="saoLuu" co={18} /></span>
            <span><b>{hopCheDo.ten}</b> – {hopCheDo.mo}</span>
          </div>
        </div>
        <div className="dn-chan">
          <span title={`© ${BAN_QUYEN.nam} ${BAN_QUYEN.tacGia} – ${BAN_QUYEN.donVi} · ĐT ${BAN_QUYEN.dienThoai}`}>{moTaPhienBan()} · © {BAN_QUYEN.nam} {BAN_QUYEN.tacGia}</span>
          <button type="button" onClick={() => setKetNoi(true)} title="Chế độ kết nối: máy đơn, máy chủ, máy trạm">
            <BieuTuong ten="caiDat" co={15} /> Cài đặt
          </button>
        </div>
      </form>
      {ketNoi && <HopKetNoi dong={() => setKetNoi(false)} />}
    </div>
  );
}

/** Đổi mật khẩu của chính mình (bắt buộc khi quản trị vừa đặt lại). */
export function HopDoiMatKhau({ dong, batBuoc }: { dong: () => void; batBuoc?: boolean }) {
  const { kho, taiKhoan, capNhatTaiKhoan, ghiNhatKy, bao } = useUngDung();
  const [cu, setCu] = useState("");
  const [moi, setMoi] = useState("");
  const [moi2, setMoi2] = useState("");
  const [loi, setLoi] = useState("");
  if (!taiKhoan) return null;
  const luu = async () => {
    setLoi("");
    if (moi !== moi2) return setLoi("Hai lần nhập mật khẩu mới không khớp");
    if (moi === cu) return setLoi("Mật khẩu mới phải khác mật khẩu hiện tại");
    try {
      if (laKhoMang(kho)) {
        const u = await datMatKhau({ ...taiKhoan, phaiDoiMatKhau: false }, moi);
        capNhatTaiKhoan(await kho.doiMatKhau(u, cu));
        await ghiNhatKy("Đổi mật khẩu");
        bao("Đã đổi mật khẩu");
        return dong();
      }
      if (!(await dungMatKhau(taiKhoan, cu))) return setLoi("Mật khẩu hiện tại không đúng");
      const u = await datMatKhau({ ...taiKhoan, phaiDoiMatKhau: false }, moi);
      await kho.luuNguoiDung(u);
      capNhatTaiKhoan(u);
      await ghiNhatKy("Đổi mật khẩu");
      bao("Đã đổi mật khẩu");
      dong();
    } catch (e) {
      setLoi((e as Error).message);
    }
  };
  return (
    <HopThoai tieuDe={batBuoc ? "Cần đổi mật khẩu trước khi tiếp tục" : "Đổi mật khẩu"} dong={batBuoc ? () => undefined : dong} rong={480}
      chan={<>{!batBuoc && <button className="nut" onClick={dong}>Đóng</button>}<button className="nut nut-chinh" disabled={!cu || !moi} onClick={luu}>Đổi mật khẩu</button></>}>
      {batBuoc && <p className="mo mt-0">Mật khẩu vừa được quản trị đặt lại. Đặt mật khẩu riêng của anh/chị.</p>}
      <div className="luoi">
        <O nhan="Mật khẩu hiện tại"><input type="password" value={cu} onChange={(e) => setCu(e.target.value)} /></O>
        <O nhan="Mật khẩu mới" goiY="Tối thiểu 8 ký tự, có chữ và số"><input type="password" value={moi} onChange={(e) => setMoi(e.target.value)} /></O>
        <O nhan="Nhập lại mật khẩu mới"><input type="password" value={moi2} onChange={(e) => setMoi2(e.target.value)} /></O>
      </div>
      {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
    </HopThoai>
  );
}

/** Quản lý tài khoản (quản trị). Không xóa tài khoản (giữ truy vết nhật ký) — chỉ khóa. */
export function HopQuanLyTaiKhoan({ dong }: { dong: () => void }) {
  const { kho, taiKhoan, capNhatTaiKhoan, ghiNhatKy, bao } = useUngDung();
  const [ds, setDs] = useState<NguoiDung[]>([]);
  const [them, setThem] = useState(false);
  const [datLai, setDatLai] = useState<NguoiDung | null>(null);
  const [v, setV] = useState({ ten: "", hoTen: "", chucVu: "", vaiTro: "CAN_BO" as VaiTro, matKhau: "" });
  const [loi, setLoi] = useState("");
  const [mkMoi, setMkMoi] = useState("");
  const tai = async () => setDs((await kho.dsNguoiDung()).sort((a, b) => a.ten.localeCompare(b.ten)));
  useEffect(() => void tai(), []);

  const luu = async (u: NguoiDung, viec: string) => {
    const l = kiemTraThayDoi(ds, u);
    if (l) return bao(l, "loi");
    await kho.luuNguoiDung(u);
    await ghiNhatKy(viec, `${u.ten} (${u.hoTen})`);
    if (u.ten === taiKhoan?.ten) capNhatTaiKhoan(u);
    await tai();
  };
  const tao = async () => {
    setLoi("");
    try {
      const u = await taoTaiKhoan(ds, v);
      await kho.luuNguoiDung(u);
      await ghiNhatKy("Tạo tài khoản", `${u.ten} (${u.hoTen}) – ${TEN_VAI_TRO[u.vaiTro]}`);
      setThem(false);
      setV({ ten: "", hoTen: "", chucVu: "", vaiTro: "CAN_BO", matKhau: "" });
      await tai();
    } catch (e) {
      setLoi((e as Error).message);
    }
  };
  const soQuanTri = ds.filter((u) => u.hoatDong && u.vaiTro === "QUAN_TRI").length;

  return (
    <HopThoai tieuDe="Quản lý tài khoản" dong={dong} rong={1040} chan={<><button className="nut" onClick={dong}>Đóng</button><button className="nut nut-chinh" onClick={() => setThem(true)}>+ Tạo tài khoản</button></>}>
      {soQuanTri < 2 && <div className="thong-bao thong-bao-vang">Chỉ có {soQuanTri} tài khoản Quản trị đang hoạt động. Nên có thêm một tài khoản quản trị dự phòng — nếu quên mật khẩu quản trị duy nhất sẽ không đặt lại được mật khẩu cho ai.</div>}
      <table className="bang">
        <thead><tr><th>Tên đăng nhập</th><th>Họ tên</th><th>Chức vụ</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th /></tr></thead>
        <tbody>
          {ds.map((u) => (
            <tr key={u.ten}>
              <td>{u.ten}{u.ten === taiKhoan?.ten && <span className="mo"> (bạn)</span>}</td>
              <td>{u.hoTen}</td>
              <td>{u.chucVu || "—"}</td>
              <td>
                <Chon value={u.vaiTro} aria-label={`Vai trò ${u.ten}`} onChange={(e) => void luu({ ...u, vaiTro: e.target.value as VaiTro }, `Đổi vai trò → ${TEN_VAI_TRO[e.target.value as VaiTro]}`)}>
                  {(Object.keys(TEN_VAI_TRO) as VaiTro[]).map((k) => <option key={k} value={k}>{TEN_VAI_TRO[k]}</option>)}
                </Chon>
              </td>
              <td>{u.hoatDong ? <span className="nhan nhan-xanh">Hoạt động</span> : <span className="nhan nhan-xam">Đã khóa</span>}{u.phaiDoiMatKhau && <span className="nhan nhan-vang" style={{ marginLeft: 4 }}>Chờ đổi mật khẩu</span>}</td>
              <td className="chu-nho">{ngayGio(u.dangNhapCuoi)}</td>
              <td className="khong-xuong-dong">
                <button className="nut nut-nho" onClick={() => { setDatLai(u); setMkMoi(""); setLoi(""); }}>Đặt lại mật khẩu</button>{" "}
                <button className="nut nut-nho" onClick={() => void luu({ ...u, hoatDong: !u.hoatDong }, u.hoatDong ? "Khóa tài khoản" : "Mở khóa tài khoản")}>{u.hoatDong ? "Khóa" : "Mở khóa"}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginBottom: 6 }}>Quyền theo vai trò</h3>
      <table className="bang chu-nho">
        <thead><tr><th>Quyền</th>{(Object.keys(TEN_VAI_TRO) as VaiTro[]).map((k) => <th key={k} style={{ textAlign: "center" }}>{TEN_VAI_TRO[k]}</th>)}</tr></thead>
        <tbody>
          {(Object.keys(TEN_QUYEN) as Quyen[]).map((q) => (
            <tr key={q}><td>{TEN_QUYEN[q]}</td>{(Object.keys(TEN_VAI_TRO) as VaiTro[]).map((k) => <td key={k} style={{ textAlign: "center" }}>{QUYEN_THEO_VAI_TRO[k].includes(q) ? "✓" : ""}</td>)}</tr>
          ))}
          <tr><td>Xem, tra cứu, xuất Excel / văn bản</td>{(Object.keys(TEN_VAI_TRO) as VaiTro[]).map((k) => <td key={k} style={{ textAlign: "center" }}>✓</td>)}</tr>
        </tbody>
      </table>

      {them && (
        <HopThoai tieuDe="Tạo tài khoản" dong={() => setThem(false)} rong={560} chan={<><button className="nut" onClick={() => setThem(false)}>Đóng</button><button className="nut nut-chinh" onClick={tao}>Tạo</button></>}>
          <div className="luoi luoi-2">
            <O nhan="Tên đăng nhập" goiY="chữ thường không dấu, số, . _ -"><input value={v.ten} onChange={(e) => setV({ ...v, ten: e.target.value })} /></O>
            <O nhan="Họ tên"><input value={v.hoTen} onChange={(e) => setV({ ...v, hoTen: e.target.value })} /></O>
            <O nhan="Chức vụ"><input value={v.chucVu} onChange={(e) => setV({ ...v, chucVu: e.target.value })} /></O>
            <O nhan="Vai trò" goiY={MO_TA_VAI_TRO[v.vaiTro]}>
              <Chon value={v.vaiTro} onChange={(e) => setV({ ...v, vaiTro: e.target.value as VaiTro })}>
                {(Object.keys(TEN_VAI_TRO) as VaiTro[]).map((k) => <option key={k} value={k}>{TEN_VAI_TRO[k]}</option>)}
              </Chon>
            </O>
            <O nhan="Mật khẩu ban đầu" goiY={kiemTraMatKhau(v.matKhau, v.ten) ?? "Người dùng nên đổi sau lần đăng nhập đầu"}><input type="password" value={v.matKhau} onChange={(e) => setV({ ...v, matKhau: e.target.value })} /></O>
          </div>
          {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
        </HopThoai>
      )}
      {datLai && (
        <HopThoai tieuDe={`Đặt lại mật khẩu – ${datLai.ten}`} dong={() => setDatLai(null)} rong={480}
          chan={<><button className="nut" onClick={() => setDatLai(null)}>Đóng</button><button className="nut nut-chinh" onClick={async () => {
            try { const u = await datMatKhau({ ...datLai, phaiDoiMatKhau: datLai.ten !== taiKhoan?.ten }, mkMoi); await luu(u, "Đặt lại mật khẩu"); setDatLai(null); } catch (e) { setLoi((e as Error).message); }
          }}>Đặt lại</button></>}>
          <p className="mo mt-0">Người dùng sẽ phải đổi mật khẩu ở lần đăng nhập sau.</p>
          <O nhan="Mật khẩu tạm" goiY="Tối thiểu 8 ký tự, có chữ và số"><input type="password" value={mkMoi} onChange={(e) => setMkMoi(e.target.value)} /></O>
          {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
        </HopThoai>
      )}
    </HopThoai>
  );
}

/** Nhật ký hệ thống (đăng nhập, tài khoản, phương án, sao lưu, nhập Excel, xóa) + kiểm tra chuỗi băm. */
export function HopNhatKy({ dong }: { dong: () => void }) {
  const { kho } = useUngDung();
  const [ds, setDs] = useState<DongNhatKy[]>([]);
  const [kt, setKt] = useState<Awaited<ReturnType<typeof kiemTraChuoi>> | "dang">("dang");
  const [loc, setLoc] = useState("");
  useEffect(() => {
    void kho.dsNhatKy().then(async (d) => {
      setDs(d.sort((a, b) => b.stt - a.stt));
      setKt(await kiemTraChuoi(d));
    });
  }, [kho]);
  const hien = ds.filter((d) => !loc || `${d.nguoi} ${d.hoTen} ${d.hanhDong} ${d.chiTiet}`.toLowerCase().includes(loc.toLowerCase()));
  return (
    <HopThoai tieuDe="Nhật ký hệ thống" dong={dong} rong={1000}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        {kt === "dang" ? <span className="mo">Đang kiểm tra…</span> : kt === null ? <span className="nhan nhan-xanh">Chuỗi nhật ký nguyên vẹn ({ds.length} dòng)</span> : <span className="nhan nhan-do">Chuỗi nhật ký bị đứt tại dòng {kt.stt}: {kt.lyDo}</span>}
        <input style={{ marginLeft: "auto", width: 260 }} placeholder="Lọc theo người, việc…" value={loc} onChange={(e) => setLoc(e.target.value)} />
      </div>
      <div className="bang-cuon" style={{ maxHeight: 520 }}>
        <table className="bang">
          <thead><tr><th className="so">#</th><th>Thời điểm</th><th>Tài khoản</th><th>Việc</th><th>Chi tiết</th></tr></thead>
          <tbody>
            {hien.map((d) => (
              <tr key={d.stt}><td className="so">{d.stt}</td><td className="chu-nho">{ngayGio(d.luc)}</td><td>{d.nguoi}{d.hoTen && <div className="mo chu-nho">{d.hoTen}</div>}</td><td>{d.hanhDong}</td><td className="chu-nho">{d.chiTiet}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mo chu-nho">Mỗi dòng mang mã băm của dòng trước: sửa hoặc xóa dòng ở giữa sẽ bị phát hiện. Nhật ký lưu trên máy, không nằm trong tệp sao lưu.</p>
    </HopThoai>
  );
}

/** Thông báo ngắn góc màn hình. */
export function ThongBaoNhanh() {
  const { thongBao } = useUngDung();
  if (!thongBao) return null;
  return <div className={`thong-bao-nhanh ${thongBao.loai === "loi" ? "loi" : ""}`} role="status">{thongBao.noiDung}</div>;
}

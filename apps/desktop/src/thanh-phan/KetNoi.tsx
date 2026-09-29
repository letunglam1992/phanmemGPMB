import { useEffect, useState } from "react";
import { HopThoai, O } from "./chung";
import { CONG_MAC_DINH, chuanDiaChi, docCheDo, ghiCheDo, laKhoMang, taoKhoMang, type CheDoMang } from "../kho-mang";
import { taoKhoIndexedDb, type Kho } from "../kho";
import { coVoWindows } from "../tu-dong-sao-luu";
import { useUngDung } from "../ung-dung";
import { docBanSaoLuu, khoiPhuc, taoBanSaoLuu } from "../sao-luu";
import { docDuLieuMayDon, khoTuDuLieu, moMayDon } from "../may-don";

async function goiVo<T>(lenh: string, thamSo?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(lenh, thamSo);
}

export interface ThongTinMayChu {
  cong: number;
  vanTay: string;
  diaChi: string[];
}

/** Mở kho theo chế độ của máy này; máy chủ thì khởi động dịch vụ trước. */
export async function moKho(c: CheDoMang = docCheDo()): Promise<Kho> {
  if (c.cheDo === "MAY_DON") {
    if (!coVoWindows()) return taoKhoIndexedDb(); // chạy trên trình duyệt (dùng thử, kiểm thử giao diện)
    const { kho, daChuyen } = await moMayDon();
    if (daChuyen !== null) sessionStorage.setItem("gpmb-da-chuyen-sqlite", daChuyen);
    return kho;
  }
  if (!coVoWindows()) throw new Error("Chế độ mạng nội bộ chỉ có trong bản cài Windows.");
  let k;
  if (c.cheDo === "MAY_CHU") {
    const tt = await goiVo<ThongTinMayChu>("bat_may_chu", { cong: c.cong });
    k = taoKhoMang({ diaChi: `127.0.0.1:${c.cong}`, vanTay: tt.vanTay });
  } else k = taoKhoMang(c.ketNoi);
  await k.trangThai();
  return k;
}

const TEN_CHE_DO: Record<CheDoMang["cheDo"], string> = { MAY_DON: "Máy đơn", MAY_CHU: "Máy chủ", MAY_TRAM: "Máy trạm" };
export const moTaCheDo = (c: CheDoMang) =>
  c.cheDo === "MAY_DON" ? "Máy đơn (dữ liệu trên máy này)" : c.cheDo === "MAY_CHU" ? `Máy chủ mạng nội bộ (cổng ${c.cong})` : `Máy trạm → ${c.ketNoi.diaChi}`;

/** Thiết lập chế độ kết nối của máy này (không cần đăng nhập; lưu rồi khởi động lại giao diện). */
export function HopKetNoi({ dong }: { dong: () => void }) {
  const hienTai = docCheDo();
  const [cheDo, setCheDo] = useState<CheDoMang["cheDo"]>(hienTai.cheDo);
  const [cong, setCong] = useState(hienTai.cheDo === "MAY_CHU" ? hienTai.cong : CONG_MAC_DINH);
  const [diaChi, setDiaChi] = useState(hienTai.cheDo === "MAY_TRAM" ? hienTai.ketNoi.diaChi : "");
  const [vanTay, setVanTay] = useState(hienTai.cheDo === "MAY_TRAM" ? hienTai.ketNoi.vanTay : "");
  const [daDoiChieu, setDaDoiChieu] = useState(hienTai.cheDo === "MAY_TRAM");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const coVo = coVoWindows();

  const kiemTra = async () => {
    setLoi("");
    setVanTay("");
    setDaDoiChieu(false);
    const dc = chuanDiaChi(diaChi);
    if (!dc) return setLoi("Địa chỉ không hợp lệ — nhập IP máy chủ, vd. 192.168.1.10 hoặc 192.168.1.10:47800");
    setDiaChi(dc);
    setDang(true);
    try {
      setVanTay(await goiVo<string>("doc_van_tay_may_chu", { diaChi: dc }));
    } catch (e) {
      setLoi(String(e));
    } finally {
      setDang(false);
    }
  };

  const luu = () => {
    let c: CheDoMang;
    if (cheDo === "MAY_DON") c = { cheDo };
    else if (cheDo === "MAY_CHU") {
      if (!(cong >= 1024 && cong <= 65535)) return setLoi("Cổng từ 1024 đến 65535");
      c = { cheDo, cong };
    } else {
      if (!vanTay || !daDoiChieu) return setLoi("Kiểm tra kết nối và xác nhận đã đối chiếu vân tay trước khi lưu");
      c = { cheDo, ketNoi: { diaChi, vanTay } };
    }
    ghiCheDo(c);
    window.location.reload();
  };

  return (
    <HopThoai
      tieuDe="Kết nối dữ liệu của máy này"
      dong={dong}
      rong={720}
      chan={
        <>
          <button className="nut" onClick={dong}>Đóng</button>
          <button className="nut nut-chinh" onClick={luu}>Lưu và khởi động lại</button>
        </>
      }
    >
      <p className="mo mt-0">Hiện tại: <b>{moTaCheDo(hienTai)}</b>. Đổi chế độ không xóa dữ liệu; dữ liệu máy đơn vẫn nằm trên máy này.</p>
      {!coVo && <div className="thong-bao thong-bao-vang">Chế độ mạng nội bộ chỉ có trong bản cài Windows.</div>}
      <div className="luoi" style={{ gap: 8 }}>
        {(["MAY_DON", "MAY_CHU", "MAY_TRAM"] as const).map((k) => (
          <label key={k} style={{ opacity: k !== "MAY_DON" && !coVo ? 0.5 : 1 }}>
            <input type="radio" name="che-do" disabled={k !== "MAY_DON" && !coVo} checked={cheDo === k} onChange={() => { setCheDo(k); setLoi(""); }} /> <b>{TEN_CHE_DO[k]}</b>
            {" — "}
            {k === "MAY_DON" && "dữ liệu lưu trên máy này, một người dùng."}
            {k === "MAY_CHU" && "máy này giữ dữ liệu chung; các máy khác trong mạng nội bộ kết nối vào. Máy chủ phải bật và mở phần mềm khi mọi người làm việc."}
            {k === "MAY_TRAM" && "làm việc trên dữ liệu của máy chủ trong mạng nội bộ."}
          </label>
        ))}
      </div>
      {cheDo === "MAY_CHU" && (
        <div className="the" style={{ padding: 12, marginTop: 12 }}>
          <O nhan="Cổng" goiY="Mặc định 47800. Lần đầu bật, Windows có thể hỏi cho phép qua tường lửa — chọn chỉ mạng riêng (Private) — có thể cần quyền quản trị máy."><input type="number" value={cong} onChange={(e) => setCong(Number(e.target.value))} style={{ width: 120 }} /></O>
          <p className="mo chu-nho mb-0">
            Sau khi khởi động lại: tạo tài khoản quản trị của máy chủ (hoặc đưa dữ liệu, tài khoản máy đơn lên ở Cài đặt chung → Mạng nội bộ); xem địa chỉ IP và vân tay chứng chỉ để các máy trạm đối chiếu.
          </p>
        </div>
      )}
      {cheDo === "MAY_TRAM" && (
        <div className="the" style={{ padding: 12, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
            <O nhan="Địa chỉ máy chủ (IP[:cổng])" className="gian"><input value={diaChi} placeholder="vd. 192.168.1.10" onChange={(e) => { setDiaChi(e.target.value); setVanTay(""); setDaDoiChieu(false); }} /></O>
            <button className="nut" disabled={dang || !diaChi.trim()} onClick={kiemTra}>{dang ? "Đang kết nối…" : "Kiểm tra kết nối"}</button>
          </div>
          {vanTay && (
            <div className="mt-10">
              <div className="chu-nho">Vân tay chứng chỉ máy chủ:</div>
              <code style={{ display: "block", fontSize: 12, wordBreak: "break-all", background: "var(--nen)", padding: 8, borderRadius: 4 }}>{vanTay}</code>
              <label style={{ display: "block", marginTop: 8 }}>
                <input type="checkbox" checked={daDoiChieu} onChange={(e) => setDaDoiChieu(e.target.checked)} /> Tôi đã đối chiếu: vân tay này <b>trùng khớp</b> với vân tay hiển thị trên máy chủ (Cài đặt chung → Mạng nội bộ)
              </label>
              <p className="mo chu-nho">Không khớp thì KHÔNG lưu — có thể đang kết nối nhầm máy hoặc bị giả mạo.</p>
            </div>
          )}
        </div>
      )}
      {loi && <div className="thong-bao thong-bao-do mt-10">{loi}</div>}
    </HopThoai>
  );
}

/** Thẻ "Mạng nội bộ" trong Cài đặt chung. */
export function TheMangNoiBo() {
  const { kho, quyen, taiLai, ghiNhatKy, bao } = useUngDung();
  const cheDo = docCheDo();
  const [tt, setTt] = useState<ThongTinMayChu | null>(null);
  const [hop, setHop] = useState(false);
  const [dang, setDang] = useState(false);
  useEffect(() => {
    if (cheDo.cheDo === "MAY_CHU") void goiVo<ThongTinMayChu | null>("trang_thai_may_chu").then(setTt, () => setTt(null));
  }, [cheDo.cheDo]);

  const dua = async () => {
    if (!laKhoMang(kho)) return;
    if (!confirm("Đưa toàn bộ dữ liệu máy đơn (dự án, hồ sơ, bản đồ, mẫu, lịch, tài khoản) lên máy chủ? Bản ghi trùng mã trên máy chủ sẽ bị ghi đè.")) return;
    setDang(true);
    try {
      const dia = coVoWindows() ? await khoTuDuLieu(await docDuLieuMayDon()) : taoKhoIndexedDb();
      const ban = await docBanSaoLuu((await taoBanSaoLuu(dia)).bytes);
      await khoiPhuc(kho, ban, "GOP");
      const tk = await dia.dsNguoiDung();
      for (const u of tk) await kho.luuNguoiDung(u);
      await ghiNhatKy("Đưa dữ liệu máy đơn lên máy chủ", `${ban.thongTin.soDuAn} dự án, ${ban.thongTin.soHo} hồ sơ, ${tk.length} tài khoản`);
      await taiLai();
      bao(`Đã đưa lên máy chủ: ${ban.thongTin.soDuAn} dự án, ${ban.thongTin.soHo} hồ sơ, ${tk.length} tài khoản.`);
    } catch (e) {
      bao(`Không đưa được dữ liệu: ${(e as Error).message}`, "loi");
    } finally {
      setDang(false);
    }
  };

  return (
    <div>
      <p className="mo mt-0">
        Chế độ của máy này: <b>{moTaCheDo(cheDo)}</b>. Dữ liệu chỉ truyền trong mạng nội bộ, mã hóa HTTPS; máy trạm ghim vân tay chứng chỉ máy chủ. Máy chủ kiểm tra lại quyền và quy tắc nghiệp vụ; hai người cùng sửa một hồ sơ thì người lưu sau được báo xung đột.
      </p>
      {cheDo.cheDo === "MAY_CHU" && (
        <table className="bang">
          <tbody>
            <tr><th>Trạng thái</th><td>{tt ? <span className="nhan nhan-xanh">Đang chạy</span> : <span className="nhan nhan-do">Không chạy</span>}</td></tr>
            <tr><th>Địa chỉ cho máy trạm</th><td>{tt?.diaChi.length ? tt.diaChi.map((d) => `${d}:${tt.cong}`).join("; ") : "—"}</td></tr>
            <tr><th>Vân tay chứng chỉ</th><td><code style={{ fontSize: 12, wordBreak: "break-all" }}>{tt?.vanTay ?? "—"}</code></td></tr>
          </tbody>
        </table>
      )}
      {cheDo.cheDo === "MAY_TRAM" && (
        <table className="bang">
          <tbody>
            <tr><th>Máy chủ</th><td>{cheDo.ketNoi.diaChi}</td></tr>
            <tr><th>Vân tay đã ghim</th><td><code style={{ fontSize: 12, wordBreak: "break-all" }}>{cheDo.ketNoi.vanTay}</code></td></tr>
          </tbody>
        </table>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
        {cheDo.cheDo === "MAY_CHU" && quyen("KHOI_PHUC") && <button className="nut" disabled={dang} onClick={dua}>{dang ? "Đang đưa lên…" : "Đưa dữ liệu máy đơn lên máy chủ"}</button>}
        {quyen("CAI_DAT") || quyen("TAI_KHOAN") ? <button className="nut nut-chinh" onClick={() => setHop(true)}>Thiết lập kết nối…</button> : <span className="mo chu-nho">Đổi chế độ kết nối: tài khoản Lãnh đạo hoặc Quản trị.</span>}
      </div>
      {hop && <HopKetNoi dong={() => setHop(false)} />}
    </div>
  );
}

/** Màn báo không mở được dữ liệu (máy chủ tắt, sai vân tay…). */
export function ManLoiKetNoi({ loi, thuLai }: { loi: string; thuLai: () => void }) {
  const [hop, setHop] = useState(false);
  return (
    <div className="man-dang-nhap">
      <div className="the o-dang-nhap">
        <h2 className="mt-0">Không mở được dữ liệu</h2>
        <p className="mo">Chế độ: <b>{moTaCheDo(docCheDo())}</b></p>
        <div className="thong-bao thong-bao-do">{loi}</div>
        <p className="mo chu-nho">Kiểm tra máy chủ đã bật và mở phần mềm, cùng mạng nội bộ, tường lửa cho phép cổng kết nối.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="nut nut-chinh" onClick={thuLai}>Thử lại</button>
          <button className="nut" onClick={() => setHop(true)}>Thiết lập kết nối…</button>
        </div>
      </div>
      {hop && <HopKetNoi dong={() => setHop(false)} />}
    </div>
  );
}

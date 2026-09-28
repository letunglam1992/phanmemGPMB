import { useEffect, useState } from "react";
import { useUngDung } from "../ung-dung";
import { TEN_LOAI_DON_VI, donViMoi, kiemTraDonVi, type DonVi, type LoaiDonVi } from "../don-vi";
import { O } from "../thanh-phan/chung";
import { BieuTuong } from "../thanh-phan/BieuDo";
import { Chon } from "../thanh-phan/Chon";

const BT_LOAI: Record<LoaiDonVi, string> = { UBND: "toaNha", DON_VI_BT: "hoSo", PHONG: "vanBan", CHU_DAU_TU: "thua", KHAC: "thongTin" };

/** Công cụ → Thiết lập đơn vị: cơ quan sử dụng phần mềm và các cơ quan dùng để điền sẵn văn bản, báo cáo. */
export function ThietLapDonVi() {
  const { dsDonVi, luuDonVi, quyen, bao } = useUngDung();
  const choSua = quyen("CAI_DAT");
  const [ds, setDs] = useState<DonVi[]>(dsDonVi);
  const [chon, setChon] = useState<string | null>(dsDonVi[0]?.id ?? null);
  const [dang, setDang] = useState(false);
  useEffect(() => { setDs(dsDonVi); setChon((c) => c ?? dsDonVi[0]?.id ?? null); }, [dsDonVi]);
  const dv = ds.find((d) => d.id === chon) ?? null;
  const loi = kiemTraDonVi(ds);
  const daDoi = JSON.stringify(ds) !== JSON.stringify(dsDonVi);
  const sua = (p: Partial<DonVi>) => setDs(ds.map((d) => (d.id === chon ? { ...d, ...p } : p.suDung ? { ...d, suDung: false } : d)));
  const them = (loai: LoaiDonVi) => { const m = donViMoi(loai); setDs([...ds, { ...m, suDung: ds.length === 0 }]); setChon(m.id); };

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Công cụ</div>
          <h1>Thiết lập đơn vị</h1>
          <div className="mo-ta">Tên cơ quan sử dụng phần mềm và các cơ quan thường dùng (UBND xã, Ban Quản lý dự án, phòng chuyên môn…) — điền sẵn tiêu đề, người ký trên văn bản và báo cáo.</div>
        </div>
        <div className="phai">
          {daDoi && <span className="nhan nhan-vang">Chưa lưu</span>}
          {choSua && <button className="nut" disabled={!daDoi} onClick={() => setDs(dsDonVi)}><BieuTuong ten="hoanTac" co={16} /> Hoàn tác</button>}
          {choSua && (
            <button className="nut nut-chinh" disabled={!daDoi || loi.length > 0 || dang} onClick={async () => { setDang(true); try { await luuDonVi(ds); bao("Đã lưu thiết lập đơn vị"); } finally { setDang(false); } }}>
              <BieuTuong ten="luu" co={16} /> Lưu thiết lập
            </button>
          )}
        </div>
      </div>
      {!choSua && <div className="thong-bao thong-bao-vang">Tài khoản chỉ xem thiết lập đơn vị; lãnh đạo hoặc quản trị được sửa.</div>}
      {loi.length > 0 && <div className="thong-bao thong-bao-do">{loi.join(" · ")}</div>}
      <div className="luoi" style={{ gridTemplateColumns: "380px minmax(0, 1fr)", alignItems: "start" }}>
        <div className="the">
          <div className="the-dau"><h3>Danh sách đơn vị</h3><span className="mo chu-nho">{ds.length}</span></div>
          <div className="ds-don-vi">
            {ds.map((d) => (
              <button key={d.id} className={`muc-don-vi ${d.id === chon ? "chon" : ""}`} onClick={() => setChon(d.id)}>
                <span className="bt"><BieuTuong ten={BT_LOAI[d.loai]} co={18} /></span>
                <span style={{ minWidth: 0 }}>
                  <b>{d.ten || "(chưa nhập tên)"}</b>
                  <small>{TEN_LOAI_DON_VI[d.loai].split(" (")[0]}</small>
                  {d.suDung && <span className="nhan nhan-xanh">Đơn vị đang sử dụng</span>}
                </span>
              </button>
            ))}
            {ds.length === 0 && <div className="trong">Chưa có đơn vị. Thêm đơn vị sử dụng phần mềm trước.</div>}
          </div>
          {choSua && (
            <div className="the-than" style={{ borderTop: "1px solid var(--vien)" }}>
              <div className="chu-nho mo" style={{ marginBottom: 6 }}>Thêm đơn vị</div>
              <div className="nhom-nut">
                {(Object.keys(TEN_LOAI_DON_VI) as LoaiDonVi[]).map((l) => (
                  <button key={l} className="nut nut-nho" onClick={() => them(l)}><BieuTuong ten="cong" co={14} /> {TEN_LOAI_DON_VI[l].split(" (")[0]!.replace(/^Ủy ban nhân dân xã, phường$/, "UBND xã, phường")}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        {dv ? (
          <div className="the">
            <div className="the-dau">
              <h3>{dv.ten || "Đơn vị mới"}</h3>
              <div className="phai">
                {choSua && <button className="nut nut-chu nut-nguy nut-nho" onClick={() => { if (confirm(`Xóa đơn vị "${dv.ten || "chưa đặt tên"}" khỏi danh sách?`)) { const con = ds.filter((d) => d.id !== dv.id); setDs(con); setChon(con[0]?.id ?? null); } }}><BieuTuong ten="thungRac" co={15} /> Xóa</button>}
              </div>
            </div>
            <fieldset className="khung-quyen" disabled={!choSua}>
              <div className="the-than luoi luoi-2">
                <O nhan="Loại đơn vị">
                  <Chon value={dv.loai} onChange={(e) => sua({ loai: e.target.value as LoaiDonVi })}>
                    {(Object.keys(TEN_LOAI_DON_VI) as LoaiDonVi[]).map((l) => <option key={l} value={l}>{TEN_LOAI_DON_VI[l]}</option>)}
                  </Chon>
                </O>
                <O nhan="Đơn vị sử dụng phần mềm" goiY="Hiện tên trên thanh tiêu đề, điền sẵn báo cáo tổng hợp">
                  <label style={{ display: "flex", gap: 8, alignItems: "center", height: 38 }}><input type="checkbox" checked={!!dv.suDung} onChange={(e) => sua({ suDung: e.target.checked })} /> Đây là đơn vị đang sử dụng phần mềm</label>
                </O>
                <O nhan="Tên đơn vị *" style={{ gridColumn: "1/-1" }} goiY="Ghi đầy đủ, vd. Ủy ban nhân dân xã Chiềng Mung; Ban Quản lý dự án đầu tư xây dựng tỉnh Sơn La">
                  <input value={dv.ten} className={dv.ten.trim() ? "" : "loi-nhap"} onChange={(e) => sua({ ten: e.target.value })} autoFocus />
                </O>
                <O nhan="Cơ quan cấp trên (dòng trên tên đơn vị)" goiY="vd. ỦY BAN NHÂN DÂN TỈNH SƠN LA"><input value={dv.capTren} onChange={(e) => sua({ capTren: e.target.value })} /></O>
                <O nhan="Chữ viết tắt (ký hiệu văn bản)" goiY="vd. UBND, BQLDA, KT"><input value={dv.kyHieu} onChange={(e) => sua({ kyHieu: e.target.value })} /></O>
                <O nhan="Địa danh (dòng ngày tháng)" goiY="vd. Chiềng Mung"><input value={dv.diaDanh} onChange={(e) => sua({ diaDanh: e.target.value })} /></O>
                <O nhan="Địa chỉ"><input value={dv.diaChi} onChange={(e) => sua({ diaChi: e.target.value })} /></O>
                <O nhan="Điện thoại"><input value={dv.dienThoai} onChange={(e) => sua({ dienThoai: e.target.value })} /></O>
                <O nhan="Thư điện tử"><input value={dv.email} onChange={(e) => sua({ email: e.target.value })} /></O>
                <O nhan="Quyền hạn, chức vụ người ký" goiY="Có thể 2 dòng: KT. CHỦ TỊCH / PHÓ CHỦ TỊCH"><textarea rows={2} value={dv.quyenHan} onChange={(e) => sua({ quyenHan: e.target.value })} /></O>
                <O nhan="Họ tên người ký"><input value={dv.nguoiKy} onChange={(e) => sua({ nguoiKy: e.target.value })} /></O>
              </div>
            </fieldset>
            <div className="the-than" style={{ borderTop: "1px solid var(--vien)" }}>
              <div className="chu-nho mo" style={{ marginBottom: 8 }}>Xem trước tiêu đề văn bản</div>
              <div className="xem-quoc-hieu">
                <div>
                  <div>{dv.capTren.toUpperCase() || " "}</div>
                  <b>{dv.ten.toUpperCase() || "TÊN ĐƠN VỊ"}</b>
                  <div className="gach" />
                  <div>Số: …/…-{dv.kyHieu || "…"}</div>
                </div>
                <div>
                  <b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b>
                  <b>Độc lập - Tự do - Hạnh phúc</b>
                  <div className="gach" />
                  <i>{dv.diaDanh || "…"}, ngày … tháng … năm …</i>
                </div>
              </div>
              <div className="chu-nho mo" style={{ marginTop: 8 }}>
                Dùng ở: {dv.loai === "UBND" ? "người ký của UBND trong văn bản" : dv.loai === "DON_VI_BT" ? "tên, cơ quan cấp trên, ký hiệu, người ký của đơn vị bồi thường" : dv.loai === "PHONG" ? "tên, ký hiệu, người ký của phòng chuyên môn" : "tra cứu, ghi chú"}
                {dv.suDung ? "; tiêu đề phần mềm và báo cáo tổng hợp" : ""}. Soạn văn bản: bấm “Điền từ Thiết lập đơn vị”.
              </div>
            </div>
          </div>
        ) : (
          <div className="the trong">Chọn hoặc thêm đơn vị.</div>
        )}
      </div>
    </div>
  );
}

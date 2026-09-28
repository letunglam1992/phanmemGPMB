import { useMemo, useState } from "react";
import { useUngDung } from "../ung-dung";
import { BUOC_CHUNG, CAC_BUOC, TEN_TRANG_THAI_BUOC, laBuocChung, tienDoHieuLuc, type BuocHo, type DuAn, type Ho, type TrangThaiBuoc } from "../mo-hinh";
import { kiemTraDuyetBuoc } from "../tai-khoan";
import { homNayIso } from "../trang-thai";
import { HopThoai, O, ngayVN } from "./chung";
import { Chon } from "./Chon";

export const LOP_TRANG_THAI_BUOC: Record<TrangThaiBuoc, string> = { XONG: "nhan-xanh", DANG: "nhan-duong", CHO_DUYET: "nhan-tim", CHUA: "nhan-xam" };
const BUOC_RIENG = CAC_BUOC.filter((b) => !laBuocChung(b.ma));

/**
 * Cập nhật tiến độ cấp dự án:
 *  - Bước chung 1–4: một trạng thái cho cả dự án (gửi duyệt – xác nhận như bước của hộ); hộ theo dõi riêng không bị ảnh hưởng.
 *  - Bước 5–16: cập nhật hàng loạt cho các hộ được chọn; từng hộ vẫn qua kiểm tra gửi – duyệt, hộ không hợp lệ được bỏ qua và nêu lý do.
 */
export function HopTienDoDuAn({ duAn, hos, dong, tabDau = "chung" }: { duAn: DuAn; hos: Ho[]; dong: () => void; tabDau?: "chung" | "hang-loat" }) {
  const [tab, setTab] = useState(tabDau);
  return (
    <HopThoai tieuDe="Cập nhật tiến độ dự án" rong={1040} dong={dong} chan={<button className="nut" onClick={dong}>Đóng</button>}>
      <div className="tab" style={{ marginTop: -6 }}>
        <button className={tab === "chung" ? "chon" : ""} onClick={() => setTab("chung")}>Bước chung của dự án (1–4)</button>
        <button className={tab === "hang-loat" ? "chon" : ""} onClick={() => setTab("hang-loat")}>Cập nhật nhiều hộ (bước 5–16)</button>
      </div>
      {tab === "chung" ? <BuocChung duAn={duAn} hos={hos} /> : <HangLoat duAn={duAn} hos={hos} />}
    </HopThoai>
  );
}

/** Bước chung 1–4 của dự án; `tiep` (không gian dự án) = nút "Lưu và tiếp" sang nhập hộ. */
export function BuocChung({ duAn, hos, tiep }: { duAn: DuAn; hos: Ho[]; tiep?: { nhan: string; di: () => void } }) {
  const { luuDuAn, ghiNhatKy, taiKhoan, quyen, bao } = useUngDung();
  const goc = duAn.tienDoChung ?? {};
  const [nhap, setNhap] = useState<Record<string, BuocHo>>(() => Object.fromEntries(BUOC_CHUNG.map((ma) => [ma, goc[ma] ?? { trangThai: "CHUA" }])));
  const [dang, setDang] = useState(false);
  const daDoi = BUOC_CHUNG.some((ma) => JSON.stringify(nhap[ma]) !== JSON.stringify(goc[ma] ?? { trangThai: "CHUA" }));

  const luu = async (moi: Record<string, BuocHo>, nk: string) => {
    setDang(true);
    try {
      const giu = Object.fromEntries(Object.entries(moi).filter(([ma, b]) => goc[ma] || b.trangThai !== "CHUA" || b.ngay || b.ghiChu));
      await luuDuAn({ ...duAn, tienDoChung: giu });
      await ghiNhatKy(nk, `${duAn.ten} — áp dụng cho ${hos.length} hộ`);
      setNhap(moi);
      bao("Đã lưu tiến độ bước chung");
    } finally {
      setDang(false);
    }
  };
  const chuyen = (ma: string, tt: TrangThaiBuoc) => {
    const b = nhap[ma]!;
    const ten = CAC_BUOC.find((x) => x.ma === ma)!.ten;
    if (tt === "XONG") {
      const l = taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, goc[ma] ?? b) : "Chưa đăng nhập";
      if (l) return bao(l, "loi");
    }
    if (tt === "CHO_DUYET" && !quyen("GUI_DUYET")) return bao("Tài khoản không có quyền gửi duyệt", "loi");
    const ghi: Partial<BuocHo> = tt === "XONG" ? { duyetBoi: taiKhoan!.ten } : tt === "CHO_DUYET" ? { guiBoi: taiKhoan!.ten, duyetBoi: undefined } : {};
    const moi = { ...nhap, [ma]: { ...b, ...ghi, trangThai: tt, ngay: b.ngay || homNayIso() } };
    void luu(moi, tt === "XONG" ? `Xác nhận hoàn thành bước chung ${ma}. ${ten}` : `Gửi duyệt bước chung ${ma}. ${ten}`);
  };
  const dat = (ma: string, p: Partial<BuocHo>) => {
    const b = nhap[ma]!;
    if (p.trangThai && b.trangThai === "XONG" && p.trangThai !== "XONG" && !quyen("DUYET_BUOC")) return bao("Chỉ người có quyền duyệt mới mở lại bước đã hoàn thành", "loi");
    setNhap({ ...nhap, [ma]: { ...b, ...p } });
  };

  return (
    <div className="luoi" style={{ gap: 12 }}>
      <div className="thong-bao thong-bao-xanh" style={{ marginBottom: 0 }}>
        Bước 1–4 (kế hoạch, họp dân, thông báo thu hồi, điều tra – kiểm đếm) thực hiện chung cho cả dự án: cập nhật ở đây một lần là áp dụng cho <b>{hos.length}</b> hộ, cá nhân, tổ chức — không phải tích từng hộ.
        Sau bước chung, nhập hộ, cá nhân, tổ chức (nhập tay, Excel hoặc từ bản đồ); từ bước 5 mỗi hộ có tiến độ riêng và ghi khó khăn, vướng mắc theo từng bước ở hồ sơ hộ.
      </div>
      <table className="bang">
        <thead><tr><th style={{ width: 36 }}>Bước</th><th>Nội dung</th><th style={{ width: 180 }}>Trạng thái</th><th style={{ width: 160 }}>Ngày</th><th>Nội dung thực hiện, số văn bản</th><th style={{ width: 210 }} /></tr></thead>
        <tbody>
          {BUOC_CHUNG.map((ma) => {
            const x = CAC_BUOC.find((b) => b.ma === ma)!;
            const b = nhap[ma]!;
            const rieng = hos.filter((h) => h.tienDo[ma]?.rieng);
            const cu = !goc[ma] ? hos.filter((h) => h.tienDo[ma]?.trangThai === "XONG").length : null;
            const loiDuyet = taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, goc[ma] ?? b) : "Chưa đăng nhập";
            return (
              <tr key={ma}>
                <td><b>{ma}</b></td>
                <td>
                  {x.ten}
                  <div className="can-cu">{x.canCu}{x.mau ? ` · Mẫu ${x.mau}` : ""}</div>
                  {rieng.length > 0 && <div className="chu-nho" style={{ color: "var(--vang)" }}>{rieng.length} hộ theo dõi riêng: {rieng.slice(0, 4).map((h) => h.ma).join(", ")}{rieng.length > 4 ? "…" : ""}</div>}
                  {cu !== null && hos.length > 0 && <div className="chu-nho mo">Chưa cập nhật chung — đang lấy theo từng hộ ({cu}/{hos.length} hộ đã xong)</div>}
                  {(b.guiBoi || b.duyetBoi) && <div className="chu-nho mo">{b.guiBoi && <>Gửi: {b.guiBoi}. </>}{b.duyetBoi && <>Xác nhận: {b.duyetBoi}.</>}</div>}
                </td>
                <td>
                  {b.trangThai === "CHO_DUYET" || b.trangThai === "XONG" ? (
                    <span className={`nhan ${LOP_TRANG_THAI_BUOC[b.trangThai]}`}>{TEN_TRANG_THAI_BUOC[b.trangThai]}</span>
                  ) : (
                    <Chon value={b.trangThai} onChange={(e) => dat(ma, { trangThai: e.target.value as TrangThaiBuoc })}>
                      <option value="CHUA">{TEN_TRANG_THAI_BUOC.CHUA}</option>
                      <option value="DANG">{TEN_TRANG_THAI_BUOC.DANG}</option>
                    </Chon>
                  )}
                </td>
                <td><input type="date" value={b.ngay ?? ""} onChange={(e) => dat(ma, { ngay: e.target.value || undefined })} /></td>
                <td><input value={b.ghiChu ?? ""} placeholder="vd. TB số 12/TB-UBND ngày…" onChange={(e) => dat(ma, { ghiChu: e.target.value || undefined })} /></td>
                <td>
                  <div className="nhom-nut" style={{ flexWrap: "nowrap" }}>
                    {b.trangThai !== "XONG" && b.trangThai !== "CHO_DUYET" && <button className="nut nut-nho" disabled={dang || !quyen("GUI_DUYET")} onClick={() => chuyen(ma, "CHO_DUYET")}>Gửi duyệt</button>}
                    {b.trangThai !== "XONG" && <button className="nut nut-nho nut-chinh" disabled={dang || !!loiDuyet} title={loiDuyet ?? undefined} onClick={() => chuyen(ma, "XONG")}>Xác nhận xong</button>}
                    {b.trangThai === "XONG" && <button className="nut nut-nho" disabled={dang || !quyen("DUYET_BUOC")} title="Mở lại bước (cần quyền duyệt)" onClick={() => dat(ma, { trangThai: "DANG", duyetBoi: undefined })}>Mở lại</button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="nhom-nut" style={{ justifyContent: "flex-end" }}>
        {daDoi && <span className="nhan nhan-vang">Chưa lưu</span>}
        <button className={`nut ${tiep ? "" : "nut-chinh"}`} disabled={!daDoi || dang || !quyen("SUA_HO_SO")} onClick={() => luu(nhap, "Cập nhật bước chung của dự án")}>Lưu ngày, ghi chú, trạng thái</button>
        {tiep && (
          <button className="nut nut-chinh" disabled={dang || (daDoi && !quyen("SUA_HO_SO"))} title="Lưu (nếu có thay đổi) rồi chuyển sang nhập hộ, cá nhân, tổ chức" onClick={async () => { if (daDoi) await luu(nhap, "Cập nhật bước chung của dự án"); tiep.di(); }}>
            {daDoi ? "Lưu và tiếp" : "Tiếp"}: {tiep.nhan} →
          </button>
        )}
      </div>
    </div>
  );
}

function HangLoat({ duAn, hos }: { duAn: DuAn; hos: Ho[] }) {
  const { luuNhieuHo, taiKhoan, quyen, bao } = useUngDung();
  const td = useMemo(() => new Map(hos.map((h) => [h.id, tienDoHieuLuc(duAn, h)])), [hos, duAn]);
  const macDinh = BUOC_RIENG.find((b) => hos.some((h) => td.get(h.id)?.[b.ma]?.trangThai !== "XONG"))?.ma ?? "5";
  const [buoc, setBuoc] = useState(macDinh);
  const [hanhDong, setHanhDong] = useState<"DANG" | "CHO_DUYET" | "XONG">(quyen("DUYET_BUOC") ? "XONG" : "CHO_DUYET");
  const [ngay, setNgay] = useState(homNayIso());
  const [ghiChu, setGhiChu] = useState("");
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [tim, setTim] = useState("");
  const [dang, setDang] = useState(false);
  const [ketQua, setKetQua] = useState<{ daLuu: number; boQua: string[] } | null>(null);
  const b = CAC_BUOC.find((x) => x.ma === buoc)!;
  const iBuoc = CAC_BUOC.findIndex((x) => x.ma === buoc);
  const truoc = CAC_BUOC[iBuoc - 1];

  const kiemTra = (h: Ho): string | null => {
    const bh = h.tienDo[buoc] ?? { trangThai: "CHUA" as TrangThaiBuoc };
    if (bh.trangThai === hanhDong) return `đã ở trạng thái "${TEN_TRANG_THAI_BUOC[hanhDong]}"`;
    if (hanhDong === "XONG") return taiKhoan ? kiemTraDuyetBuoc(taiKhoan.vaiTro, taiKhoan.ten, bh) : "chưa đăng nhập";
    if (hanhDong === "CHO_DUYET") {
      if (!quyen("GUI_DUYET")) return "tài khoản không có quyền gửi duyệt";
      if (bh.trangThai === "XONG") return "bước đã hoàn thành";
    }
    if (hanhDong === "DANG" && bh.trangThai === "XONG" && !quyen("DUYET_BUOC")) return "chỉ người có quyền duyệt mới mở lại bước đã hoàn thành";
    return null;
  };
  const ds = hos.filter((h) => !tim || `${h.ma} ${h.ten}`.toLowerCase().includes(tim.toLowerCase()));
  const hopLe = ds.filter((h) => !kiemTra(h));

  const apDung = async () => {
    const chonDs = hos.filter((h) => chon.has(h.id));
    const boQua: string[] = [];
    const ghi: { h: Ho; nhatKy: string }[] = [];
    for (const h of chonDs) {
      const l = kiemTra(h);
      if (l) { boQua.push(`${h.ma} · ${h.ten}: ${l}`); continue; }
      const bh = h.tienDo[buoc] ?? { trangThai: "CHUA" as TrangThaiBuoc };
      const dau: Partial<BuocHo> = hanhDong === "XONG" ? { duyetBoi: taiKhoan!.ten } : hanhDong === "CHO_DUYET" ? { guiBoi: taiKhoan!.ten, duyetBoi: undefined } : { duyetBoi: undefined };
      const moi: BuocHo = { ...bh, ...dau, trangThai: hanhDong, ngay: ngay || bh.ngay || homNayIso(), ...(ghiChu.trim() ? { ghiChu: ghiChu.trim() } : {}) };
      ghi.push({ h: { ...h, tienDo: { ...h.tienDo, [buoc]: moi } }, nhatKy: `${hanhDong === "XONG" ? "Xác nhận hoàn thành" : hanhDong === "CHO_DUYET" ? "Gửi duyệt" : "Đang thực hiện"} bước ${b.ma}. ${b.ten} (cập nhật hàng loạt ${chonDs.length} hộ)` });
    }
    if (!ghi.length) return setKetQua({ daLuu: 0, boQua });
    // Không chặn theo thứ tự (có bước làm song song hoặc không phát sinh, vd. cưỡng chế) — chỉ nhắc để cán bộ kiểm tra
    const chuaXongTruoc = truoc ? ghi.filter(({ h }) => td.get(h.id)?.[truoc.ma]?.trangThai !== "XONG").map(({ h }) => h.ma) : [];
    const nhac = chuaXongTruoc.length ? `\n\nLưu ý: ${chuaXongTruoc.length} hộ chưa hoàn thành bước ${truoc!.ma}. ${truoc!.ten} (${chuaXongTruoc.slice(0, 8).join(", ")}${chuaXongTruoc.length > 8 ? "…" : ""}).` : "";
    if (!confirm(`${TEN_TRANG_THAI_BUOC[hanhDong]} — bước ${b.ma}. ${b.ten} cho ${ghi.length} hộ${boQua.length ? ` (bỏ qua ${boQua.length} hộ)` : ""}?${nhac}`)) return;
    setDang(true);
    try {
      const r = await luuNhieuHo(ghi);
      setKetQua({ daLuu: r.daLuu, boQua: [...boQua, ...r.loi] });
      setChon(new Set());
      if (r.loi.length) bao(r.loi[0]!, "loi");
      else bao(`Đã cập nhật ${r.daLuu} hộ`);
    } finally {
      setDang(false);
    }
  };

  return (
    <div className="luoi" style={{ gap: 12 }}>
      <div className="luoi" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1.2fr) minmax(0,1fr)", gap: 10 }}>
        <O nhan="Bước">
          <Chon value={buoc} onChange={(e) => { setBuoc(e.target.value); setChon(new Set()); setKetQua(null); }}>
            {BUOC_RIENG.map((x) => {
              const xong = hos.filter((h) => td.get(h.id)?.[x.ma]?.trangThai === "XONG").length;
              return <option key={x.ma} value={x.ma}>{x.ma}. {x.ten} — {xong}/{hos.length} hộ xong</option>;
            })}
          </Chon>
        </O>
        <O nhan="Chuyển sang">
          <Chon value={hanhDong} onChange={(e) => { setHanhDong(e.target.value as typeof hanhDong); setKetQua(null); }}>
            <option value="DANG">Đang thực hiện</option>
            <option value="CHO_DUYET">Gửi duyệt (chờ xác nhận)</option>
            <option value="XONG">Xác nhận hoàn thành</option>
          </Chon>
        </O>
        <O nhan="Ngày thực hiện / hoàn thành"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></O>
        <O nhan="Nội dung thực hiện, số văn bản (ghi cho mọi hộ được chọn; để trống = giữ ghi chú cũ)" style={{ gridColumn: "1 / -1" }}>
          <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="vd. Niêm yết tại UBND xã và nhà văn hóa bản từ ngày … đến ngày …" />
        </O>
      </div>
      <div className="chu-nho mo"><b>Căn cứ:</b> {b.canCu}{b.thoiHan ? ` · Thời hạn: ${b.thoiHan}` : ""}. Mỗi hộ vẫn qua quy tắc gửi – duyệt (người gửi không tự xác nhận); hộ không đủ điều kiện được bỏ qua và nêu lý do.</div>
      <div className="nhom-nut" style={{ alignItems: "center" }}>
        <input placeholder="Tìm mã, tên…" value={tim} onChange={(e) => setTim(e.target.value)} style={{ width: 220 }} />
        <button className="nut nut-nho" onClick={() => setChon(new Set(hopLe.map((h) => h.id)))}>Chọn tất cả hộ hợp lệ ({hopLe.length})</button>
        <button className="nut nut-nho" disabled={!chon.size} onClick={() => setChon(new Set())}>Bỏ chọn</button>
        <span className="mo chu-nho" style={{ marginLeft: "auto" }}>Đã chọn <b>{chon.size}</b> hộ</span>
      </div>
      <div className="bang-cuon" style={{ maxHeight: 340 }}>
        <table className="bang">
          <thead><tr><th style={{ width: 34 }} /><th>Mã</th><th>Họ tên / tổ chức</th>{truoc && <th>Bước {truoc.ma}</th>}<th>Bước {b.ma} hiện tại</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {ds.map((h) => {
              const t = td.get(h.id)!;
              const bh = h.tienDo[buoc];
              const l = kiemTra(h);
              const tt = bh?.trangThai ?? "CHUA";
              const ttTruoc = truoc ? t[truoc.ma]?.trangThai ?? "CHUA" : null;
              return (
                <tr key={h.id} className="co-the-chon" style={{ opacity: l ? 0.55 : 1 }} onClick={() => { if (l) return; const s = new Set(chon); if (s.has(h.id)) s.delete(h.id); else s.add(h.id); setChon(s); }}>
                  <td><input type="checkbox" disabled={!!l} checked={chon.has(h.id)} readOnly aria-label={`Chọn ${h.ma}`} /></td>
                  <td>{h.ma}</td>
                  <td>{h.ten}</td>
                  {ttTruoc && <td><span className={`nhan ${LOP_TRANG_THAI_BUOC[ttTruoc]}`}>{TEN_TRANG_THAI_BUOC[ttTruoc]}</span></td>}
                  <td><span className={`nhan ${LOP_TRANG_THAI_BUOC[tt]}`}>{TEN_TRANG_THAI_BUOC[tt]}</span>{bh?.ngay && <span className="chu-nho mo"> {ngayVN(bh.ngay)}</span>}</td>
                  <td className="chu-nho mo">{l ? `Bỏ qua: ${l}` : bh?.ghiChu ?? ""}</td>
                </tr>
              );
            })}
            {ds.length === 0 && <tr><td colSpan={6} className="trong">Không có hộ.</td></tr>}
          </tbody>
        </table>
      </div>
      {ketQua && (
        <div className={`thong-bao ${ketQua.boQua.length ? "thong-bao-vang" : "thong-bao-xanh"}`} style={{ marginBottom: 0 }}>
          Đã cập nhật {ketQua.daLuu} hộ.{ketQua.boQua.length > 0 && <> Bỏ qua {ketQua.boQua.length} hộ: {ketQua.boQua.join("; ")}.</>}
        </div>
      )}
      <div className="nhom-nut" style={{ justifyContent: "flex-end" }}>
        <button className="nut nut-chinh" disabled={!chon.size || dang || !quyen("SUA_HO_SO")} onClick={apDung}>
          {dang ? "Đang cập nhật…" : `Áp dụng cho ${chon.size} hộ`}
        </button>
      </div>
    </div>
  );
}

import { Fragment, useEffect, useMemo, useState } from "react";
import { dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { homNayIso } from "../trang-thai";
import { lapBaoCao, TEN_TINH_TRANG, type SoLieu, type TinhTrangDuAn } from "../bao-cao";
import { duLieuBaoCaoWord, type ThongTinBaoCao } from "../bao-cao-van-ban";
import { taoWorkbookBaoCao } from "../xuat-excel";
import { dienMau } from "../van-ban/dien-mau";
import { taiXuong } from "../tai-xuong";
import { TheChiSo } from "../thanh-phan/BieuDo";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";
import { PhanBoTrangThaiGon } from "./TongQuan";
import { BieuDoKy } from "../thanh-phan/BieuDoKy";
import { chotKy, kiemTraKy, kyTruoc, sapXepKy, soSanhKyTruoc, tongKy, type KyBaoCao } from "../ky-bao-cao";

const KHOA_TT = "gpmb-bao-cao-thong-tin";
const TT_MAC_DINH: ThongTinBaoCao = {
  coQuanCapTren: "UBND xã …",
  coQuan: "Phòng Kinh tế",
  kyHieu: "KT",
  diaDanh: "",
  kinhGui: "Ủy ban nhân dân xã",
  so: "",
  ngayKy: homNayIso(),
  moDau: "Thực hiện nhiệm vụ được giao, … báo cáo tình hình thực hiện công tác bồi thường, hỗ trợ, tái định cư các dự án như sau:",
  khoKhanKhac: "",
  nhiemVu: "",
  kienNghi: "",
  ketThuc: "Trên đây là báo cáo tình hình thực hiện công tác bồi thường, hỗ trợ, tái định cư các dự án./.",
  noiNhan: "Như trên\nLưu: VT",
  quyenHan: "Trưởng phòng",
  nguoiKy: "",
};
function docTt(): ThongTinBaoCao {
  try {
    return { ...TT_MAC_DINH, ...JSON.parse(localStorage.getItem(KHOA_TT) ?? "{}"), ngayKy: homNayIso(), so: "" };
  } catch {
    return TT_MAC_DINH;
  }
}
const LOP_TT: Record<TinhTrangDuAn, string> = { HOAN_THANH: "nhan nhan-xanh", CO_VUONG_MAC: "nhan nhan-do", DANG_THUC_HIEN: "nhan nhan-duong", CHUA_CO_HO_SO: "nhan nhan-xam" };

export function BaoCao() {
  const { dsDuAn, hoCua, chinhSach, lich, tyLeCham, di, bao, kyBaoCao, themKyBaoCao, xoaKyBaoCao, quyen, nguoiDung } = useUngDung();
  const [xa, setXa] = useState("");
  const [tinhTrang, setTinhTrang] = useState<TinhTrangDuAn | "">("");
  const [denNgay, setDenNgay] = useState(homNayIso());
  const [hop, setHop] = useState(false);
  const dsXa = useMemo(() => [...new Set(dsDuAn.map((d) => d.xa))].sort((a, b) => a.localeCompare(b, "vi")), [dsDuAn]);
  const bc = useMemo(
    () => lapBaoCao(dsDuAn, (d) => hoCua(d.id).map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) })), { xa: xa || undefined, tinhTrang: tinhTrang || undefined, denNgay }, lich, tyLeCham),
    [dsDuAn, hoCua, chinhSach, xa, tinhTrang, denNgay, lich, tyLeCham],
  );
  const s = bc.tong;
  const truoc = useMemo(() => kyTruoc(kyBaoCao, denNgay), [kyBaoCao, denNgay]);
  const ss = useMemo(() => (truoc ? soSanhKyTruoc(bc, truoc) : null), [bc, truoc]);
  const [hopChot, setHopChot] = useState(false);
  const tenTep = `Bao-cao-tong-hop-GPMB-${denNgay}`;

  async function xuatExcel() {
    const wb = await taoWorkbookBaoCao(bc, docTt().coQuan, kyBaoCao);
    taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), `${tenTep}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    bao("Đã xuất Excel báo cáo tổng hợp");
  }

  const dongSo = (x: SoLieu) => (
    <>
      <td className="so">{x.soHo}</td>
      <td className="so">{dinhDang(x.dtThuHoi, 2)}</td>
      <td className="so">{tien(x.tamTinh)}</td>
      <td className="so">{x.soHoDaDuyet ? tien(x.daDuyet) : "—"}<div className="can-cu">{x.soHoDaDuyet}/{x.soHo} hộ</div></td>
      <td className="so">{tien(x.daChi)}<div className="can-cu">{x.daDuyet.gt(0) ? `${dinhDang(x.daChi.div(x.daDuyet).mul(100), 1)}%` : ""}</div></td>
      <td className="so">{tien(x.conPhaiChi)}</td>
    </>
  );

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Theo dõi</div>
          <h1>Báo cáo tổng hợp các dự án</h1>
          <div className="mo-ta">Số liệu lấy từ hồ sơ, bảng tính, bản phương án đã phê duyệt và chi trả đã ghi — tính đến ngày được chọn. Xuất Excel làm phụ lục, Word làm báo cáo phục vụ họp.</div>
        </div>
        <div className="phai" style={{ display: "flex", gap: 8 }}>
          <button className="nut" disabled={!bc.dong.length} onClick={() => void xuatExcel()}>Xuất Excel</button>
          <button className="nut nut-chinh" disabled={!bc.dong.length} onClick={() => setHop(true)}>Soạn báo cáo Word…</button>
        </div>
      </div>

      <div className="the" style={{ marginBottom: 16 }}>
        <div className="the-than luoi" style={{ gridTemplateColumns: "repeat(3, minmax(0, 260px))", alignItems: "end" }}>
          <O nhan="Xã, phường">
            <select value={xa} onChange={(e) => setXa(e.target.value)}>
              <option value="">Tất cả ({dsXa.length} xã, phường)</option>
              {dsXa.map((x) => <option key={x}>{x}</option>)}
            </select>
          </O>
          <O nhan="Tình trạng dự án">
            <select value={tinhTrang} onChange={(e) => setTinhTrang(e.target.value as TinhTrangDuAn | "")}>
              <option value="">Tất cả</option>
              {(Object.keys(TEN_TINH_TRANG) as TinhTrangDuAn[]).map((k) => <option key={k} value={k}>{TEN_TINH_TRANG[k]}</option>)}
            </select>
          </O>
          <O nhan="Tính đến ngày" goiY="Chi trả ghi sau ngày này không tính"><input type="date" value={denNgay} onChange={(e) => e.target.value && setDenNgay(e.target.value)} /></O>
        </div>
      </div>

      <div className="luoi luoi-4" style={{ marginBottom: 16 }}>
        <TheChiSo bieuTuong="danhSach" nhan="Dự án · hộ" giaTri={`${s.soDuAn} · ${s.soHo}`} tong="chinh" phu={`DT thu hồi ${dinhDang(s.dtThuHoi, 2)} m²`} />
        <TheChiSo bieuTuong="nguoi" nhan="Hộ hoàn thành GPMB" giaTri={s.theoTrangThai.HOAN_THANH} mauSo={s.soHo} tong="xanh" phu={s.theoTrangThai.VUONG_MAC ? `${s.theoTrangThai.VUONG_MAC} hộ vướng mắc` : "Không có hộ vướng mắc"} />
        <TheChiSo bieuTuong="chiTra" nhan="Đã chi trả / đã duyệt" giaTri={`${tien(s.daChi)} đ`} tong="duong" phu={`Đã duyệt ${tien(s.daDuyet)} đ · còn phải chi ${tien(s.conPhaiChi)} đ`} />
        <TheChiSo bieuTuong="canhBao" nhan="Cảnh báo cần xử lý ngay" giaTri={s.canhBaoCao} tong={s.canhBaoCao ? "do" : "xam"} nong={s.canhBaoCao > 0} phu={`Tạm tính toàn bộ: ${tien(s.tamTinh)} đ`} />
      </div>

      <DienBien bc={bc} ky={kyBaoCao} ss={ss} coQuyen={quyen("CAI_DAT")} moChot={() => setHopChot(true)} xoa={xoaKyBaoCao} />

      <div className="the" style={{ marginBottom: 16 }}>
        <div className="the-dau"><h3>Kết quả từng dự án</h3><span className="mo chu-nho">Bấm một dòng để mở dự án</span></div>
        <div className="bang-cuon">
          <table className="bang">
            <thead>
              <tr>
                <th>Dự án</th><th>Tình trạng</th><th style={{ width: 170 }}>Hiện trạng hộ</th><th className="so">Số hộ</th><th className="so">DT thu hồi (m²)</th>
                <th className="so">Tạm tính (đ)</th><th className="so">Đã duyệt (đ)</th><th className="so">Đã chi (đ)</th><th className="so">Còn phải chi (đ)</th><th>Chặng hiện tại</th>
              </tr>
            </thead>
            <tbody>
              {bc.theoXa.map((n) => (
                <Fragment key={n.xa}>
                  <tr><td colSpan={10} style={{ background: "var(--be-mat-2)", fontWeight: 600 }}>{n.xa} · {n.dong.length} dự án</td></tr>
                  {n.dong.map((x) => (
                    <tr key={x.duAn.id} className="co-the-chon" onClick={() => di({ ten: "du-an", duAnId: x.duAn.id })}>
                      <td><b>{x.duAn.ten}</b>{x.canhBaoCao > 0 && <div className="can-cu" style={{ color: "var(--do-to)" }}>{x.canhBaoCao} cảnh báo cần xử lý ngay</div>}</td>
                      <td><span className={LOP_TT[x.tinhTrang]}>{TEN_TINH_TRANG[x.tinhTrang]}</span></td>
                      <td><PhanBoTrangThaiGon dem={x.theoTrangThai} tong={x.soHo} /><div className="can-cu">{x.theoTrangThai.HOAN_THANH}/{x.soHo} hoàn thành · tiến độ {Math.round(x.tienDoChung * 100)}%</div></td>
                      {dongSo(x)}
                      <td className="chu-nho">{x.changHienTai}</td>
                    </tr>
                  ))}
                  {bc.theoXa.length > 1 && (
                    <tr className="tong"><td colSpan={3}>Cộng {n.xa}</td>{dongSo(n.tong)}<td /></tr>
                  )}
                </Fragment>
              ))}
              {!bc.dong.length && <tr><td colSpan={10} className="mo" style={{ textAlign: "center", padding: 24 }}>Không có dự án phù hợp bộ lọc.</td></tr>}
              {bc.dong.length > 0 && <tr className="tong"><td colSpan={3}><b>TỔNG CỘNG ({s.soDuAn} dự án)</b></td>{dongSo(s)}<td /></tr>}
            </tbody>
          </table>
        </div>
        {(s.soHoChamTraThieuTyLe > 0 || s.chamTra.gt(0)) && (
          <div className="the-than chu-nho mo">
            {s.chamTra.gt(0) && <>Tiền chậm trả tạm tính (k3 Đ94 LĐĐ 2024, chưa phê duyệt): <b>{tien(s.chamTra)} đ</b>. </>}
            {s.soHoChamTraThieuTyLe > 0 && <>{s.soHoChamTraThieuTyLe} hộ chi trả quá hạn nhưng chưa nhập tỷ lệ tiền chậm nộp (Cài đặt chung → Tiền chậm trả).</>}
          </div>
        )}
      </div>

      <div className="the">
        <div className="the-dau"><h3>Vướng mắc cần xử lý ngay</h3><span className="mo chu-nho">Theo cảnh báo tự động, đến ngày {ngayVN(denNgay)}</span></div>
        <div className="the-than">
          {bc.dong.every((x) => !x.vuongMac.length) ? (
            <div className="mo">Không có cảnh báo cần xử lý ngay.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              {bc.dong.flatMap((x) => x.vuongMac.map((c, i) => (
                <li key={`${x.duAn.id}-${i}`}><b>{x.duAn.ten}</b> ({x.duAn.xa}): {c.noiDung}{c.canCu && <span className="can-cu"> — {c.canCu}</span>}</li>
              )))}
            </ul>
          )}
        </div>
      </div>

      {hopChot && (
        <HopChot
          denNgay={denNgay}
          trung={kyBaoCao.find((k) => k.denNgay === denNgay)}
          dong={() => setHopChot(false)}
          chot={async (ten) => {
            // Kỳ luôn chụp TẤT CẢ dự án (không theo bộ lọc) để so sánh được với mọi bộ lọc sau này
            const toanBo = lapBaoCao(dsDuAn, (d) => hoCua(d.id).map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) })), { denNgay }, lich, tyLeCham);
            await themKyBaoCao(await chotKy(toanBo, ten, nguoiDung));
            bao(`Đã chốt số liệu kỳ "${ten}"`);
            setHopChot(false);
          }}
        />
      )}
      {hop && <HopWord dong={() => setHop(false)} xuat={async (tt) => {
        try {
          localStorage.setItem(KHOA_TT, JSON.stringify({ ...tt, so: "", ngayKy: "" }));
        } catch { /* lưu tạm không được thì bỏ qua */ }
        const mau = await (await fetch("/mau-van-ban/bao-cao-tong-hop.docx")).arrayBuffer();
        taiXuong(dienMau(mau, duLieuBaoCaoWord(bc, tt, ss)), `${tenTep}.docx`, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        bao("Đã tạo báo cáo Word (dự thảo) — kiểm tra trước khi trình ký");
        setHop(false);
      }} />}
    </div>
  );
}

function HopWord({ dong, xuat }: { dong: () => void; xuat: (t: ThongTinBaoCao) => Promise<void> }) {
  const [t, setT] = useState<ThongTinBaoCao>(docTt);
  const o = (k: keyof ThongTinBaoCao, nhan: string, dong = 1, goiY?: string) => (
    <O nhan={nhan} goiY={goiY} style={dong > 1 ? { gridColumn: "1/-1" } : undefined}>
      {dong > 1 ? <textarea rows={dong} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} /> : <input value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })} />}
    </O>
  );
  return (
    <HopThoai tieuDe="Soạn báo cáo tổng hợp (Word)" dong={dong} rong={820} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" onClick={() => void xuat(t)}>Tạo tệp Word</button></>}>
      <div className="mo chu-nho" style={{ marginBottom: 10 }}>Phần số liệu (kết quả chung, bảng từng dự án, vướng mắc) phần mềm tự điền theo bộ lọc hiện tại. Các ô dưới đây cán bộ nhập; thông tin cơ quan, người ký được nhớ cho lần sau trên máy này.</div>
      <div className="luoi luoi-2">
        {o("coQuanCapTren", "Cơ quan chủ quản")}
        {o("coQuan", "Cơ quan báo cáo")}
        {o("kyHieu", "Ký hiệu (…/BC-?)")}
        {o("so", "Số báo cáo", 1, "Để trống: văn thư ghi khi ký")}
        {o("diaDanh", "Địa danh")}
        <O nhan="Ngày ký"><input type="date" value={t.ngayKy} onChange={(e) => setT({ ...t, ngayKy: e.target.value })} /></O>
        {o("kinhGui", "Kính gửi")}
        {o("quyenHan", "Quyền hạn, chức vụ người ký")}
        {o("nguoiKy", "Họ tên người ký")}
        {o("moDau", "Mở đầu", 2)}
        {o("khoKhanKhac", "Khó khăn, vướng mắc khác (ngoài cảnh báo tự động)", 3)}
        {o("nhiemVu", "Nhiệm vụ, giải pháp thời gian tới", 3)}
        {o("kienNghi", "Đề xuất, kiến nghị", 3)}
        {o("ketThuc", "Câu kết", 2)}
        {o("noiNhan", "Nơi nhận (mỗi dòng một nơi)", 3)}
      </div>
    </HopThoai>
  );
}

const nhanKy = (k: KyBaoCao) => k.ten || ngayVN(k.denNgay);
const tyLe = (a: number, b: number) => (b ? (a / b) * 100 : null);
const dau = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `${v}` : "không đổi");
const dauTien = (v: { isZero: () => boolean; gt: (n: number) => boolean }) => (v.isZero() ? "không đổi" : `${v.gt(0) ? "+" : ""}${tien(v as never)} đ`);

function DienBien(p: { bc: ReturnType<typeof lapBaoCao>; ky: KyBaoCao[]; ss: ReturnType<typeof soSanhKyTruoc> | null; coQuyen: boolean; moChot: () => void; xoa: (id: string, lyDo: string) => Promise<void> }) {
  const { bc, ss } = p;
  const ds = useMemo(() => sapXepKy(p.ky), [p.ky]);
  const [hopLe, setHopLe] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let huy = false;
    void Promise.all(ds.map(async (k) => [k.id, await kiemTraKy(k)] as const)).then((r) => !huy && setHopLe(Object.fromEntries(r)));
    return () => void (huy = true);
  }, [ds]);
  const tong = ds.map((k) => tongKy(k, bc.loc));
  // Điểm "hiện tại" chỉ thêm khi ngày báo cáo sau kỳ chốt cuối cùng
  const coHienTai = !ds.length || bc.loc.denNgay > ds.at(-1)!.denNgay;
  const s = bc.tong;
  const nhan = [...ds.map(nhanKy), ...(coHienTai ? [`Hiện tại ${ngayVN(bc.loc.denNgay).slice(0, 5)}`] : [])];
  const tlHt = [...tong.map((t) => tyLe(t.hoanThanh, t.soHo)), ...(coHienTai ? [tyLe(s.theoTrangThai.HOAN_THANH, s.soHo)] : [])];
  const tlChi = [...tong.map((t) => tyLe(t.daChi.toNumber(), t.daDuyet.toNumber())), ...(coHienTai ? [tyLe(s.daChi.toNumber(), s.daDuyet.toNumber())] : [])];
  const ty = (v: { toNumber: () => number }) => v.toNumber() / 1e9;
  const duyet = [...tong.map((t) => ty(t.daDuyet)), ...(coHienTai ? [ty(s.daDuyet)] : [])];
  const chi = [...tong.map((t) => ty(t.daChi)), ...(coHienTai ? [ty(s.daChi)] : [])];
  const hienTai = coHienTai ? nhan.length - 1 : undefined;
  return (
    <div className="the" style={{ marginBottom: 16 }}>
      <div className="the-dau">
        <h3>Diễn biến theo kỳ báo cáo</h3>
        <span className="mo chu-nho">{ds.length} kỳ đã chốt{bc.loc.xa || bc.loc.tinhTrang ? " · số liệu kỳ lọc theo bộ lọc hiện tại" : ""}</span>
        <div className="phai">{p.coQuyen && <button className="nut nut-nho nut-chinh" onClick={p.moChot}>Chốt số liệu kỳ này…</button>}</div>
      </div>
      <div className="the-than">
        {ss ? (
          <div className="chu-y-trong" style={{ marginBottom: 14 }}>
            <b>So với kỳ trước ({nhanKy(ss.truoc.ky)}, số liệu đến {ngayVN(ss.truoc.ky.denNgay)}):</b>{" "}
            hộ hoàn thành GPMB {dau(ss.hoanThanh)}; hộ được phê duyệt phương án {dau(ss.soHoDaDuyet)}; kinh phí đã duyệt {dauTien(ss.daDuyet)}; chi trả {dauTien(ss.daChi)}; hộ vướng mắc {dau(ss.vuongMac)}; cảnh báo cần xử lý ngay {dau(ss.canhBaoCao)}
            {ss.duAnMoi.length > 0 && <>; dự án mới: {ss.duAnMoi.join(", ")}</>}.
          </div>
        ) : (
          <div className="mo chu-nho" style={{ marginBottom: 14 }}>
            {ds.length ? "Chưa có kỳ nào trước ngày báo cáo đang chọn để so sánh." : "Chưa có kỳ nào được chốt. Chốt số liệu định kỳ (cuối tháng, quý) để theo dõi diễn biến và so sánh với kỳ trước; số liệu kỳ đã chốt không thay đổi khi hồ sơ được sửa sau đó."}
          </div>
        )}
        {nhan.length >= 2 && (
          <div className="luoi luoi-2" style={{ marginBottom: 14 }}>
            <div>
              <div className="nhan-muc">Tỷ lệ hoàn thành, chi trả (%)</div>
              <BieuDoKy kieu="duong" nhanKy={nhan} hienTai={hienTai} maxY={100} dinhDang={(v) => `${dinhDang(v, 0)}%`} moTa="Tỷ lệ hộ hoàn thành GPMB và tỷ lệ đã chi trả so với kinh phí đã duyệt theo kỳ"
                chuoi={[{ ten: "Hộ hoàn thành GPMB / tổng số hộ", giaTri: tlHt }, { ten: "Đã chi trả / kinh phí đã duyệt", giaTri: tlChi }]} />
            </div>
            <div>
              <div className="nhan-muc">Kinh phí đã duyệt, đã chi trả (tỷ đồng)</div>
              <BieuDoKy kieu="cot" nhanKy={nhan} hienTai={hienTai} dinhDang={(v) => dinhDang(v, v < 10 ? 2 : 1)} moTa="Kinh phí đã duyệt và đã chi trả theo kỳ, tỷ đồng"
                chuoi={[{ ten: "Kinh phí đã duyệt", giaTri: duyet }, { ten: "Đã chi trả", giaTri: chi }]} />
            </div>
          </div>
        )}
        {ds.length > 0 && (
          <div className="bang-cuon">
            <table className="bang">
              <thead><tr><th>Kỳ</th><th>Số liệu đến</th><th>Chốt bởi</th><th className="so">Dự án</th><th className="so">Hộ hoàn thành</th><th className="so">Đã duyệt (đ)</th><th className="so">Đã chi (đ)</th><th>Toàn vẹn</th><th /></tr></thead>
              <tbody>
                {[...tong].reverse().map((t) => (
                  <tr key={t.ky.id}>
                    <td><b>{nhanKy(t.ky)}</b></td>
                    <td>{ngayVN(t.ky.denNgay)}</td>
                    <td className="chu-nho">{t.ky.nguoi}<div className="can-cu">{new Date(t.ky.chotLuc).toLocaleString("vi-VN")}</div></td>
                    <td className="so">{t.soDuAn}</td>
                    <td className="so">{t.hoanThanh}/{t.soHo}</td>
                    <td className="so">{tien(t.daDuyet)}</td>
                    <td className="so">{tien(t.daChi)}</td>
                    <td>{hopLe[t.ky.id] === undefined ? "…" : hopLe[t.ky.id] ? <span className="nhan nhan-xanh">Nguyên vẹn</span> : <span className="nhan nhan-do">Đã bị sửa</span>}</td>
                    <td>{p.coQuyen && <button className="nut nut-nho nut-chu" onClick={() => { const ly = window.prompt(`Xóa kỳ "${nhanKy(t.ky)}"? Nhập lý do (ghi vào nhật ký hệ thống):`); if (ly?.trim()) void p.xoa(t.ky.id, ly.trim()); }}>Xóa</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function HopChot({ denNgay, trung, dong, chot }: { denNgay: string; trung?: KyBaoCao; dong: () => void; chot: (ten: string) => Promise<void> }) {
  const [y, m] = denNgay.split("-");
  const [ten, setTen] = useState(`Tháng ${Number(m)}/${y}`);
  const [dang, setDang] = useState(false);
  return (
    <HopThoai tieuDe="Chốt số liệu kỳ báo cáo" dong={dong} rong={560} chan={<><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" disabled={!ten.trim() || dang} onClick={async () => { setDang(true); try { await chot(ten); } finally { setDang(false); } }}>Chốt số liệu</button></>}>
      <div className="luoi">
        <O nhan="Tên kỳ" goiY="vd. Tháng 9/2026, Quý III/2026, 6 tháng đầu năm 2026"><input value={ten} onChange={(e) => setTen(e.target.value)} /></O>
        <div className="chu-nho">
          Chụp số liệu của <b>tất cả dự án</b> (không theo bộ lọc) tính đến ngày <b>{ngayVN(denNgay)}</b>: số hộ, hiện trạng, diện tích, kinh phí tạm tính, đã duyệt, đã chi, cảnh báo. Kỳ đã chốt có mã băm SHA-256, không thay đổi khi hồ sơ được sửa sau đó; việc chốt được ghi vào nhật ký hệ thống.
        </div>
        {trung && <div className="chu-y-trong" style={{ color: "var(--vang)" }}>Đã có kỳ "{nhanKy(trung)}" cùng ngày số liệu {ngayVN(denNgay)}. Chốt thêm sẽ tạo kỳ mới; nên xóa kỳ cũ nếu chốt lại.</div>}
      </div>
    </HopThoai>
  );
}

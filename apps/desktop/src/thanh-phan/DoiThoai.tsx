import { ONgay } from "./ONgay";
import { O, ngayVN } from "./chung";
import { Chon } from "./Chon";
import { useUngDung } from "../ung-dung";
import { homNayIso } from "../trang-thai";
import type { DuAn, Ho } from "../mo-hinh";
import { CAN_CU_DOI_THOAI, SO_NGAY_DOI_THOAI, TEN_TT_DOI_THOAI, TEN_Y_KIEN, trangThaiDoiThoai, type LanDoiThoai, type LoaiYKien, type YKienPA } from "../doi-thoai";

/**
 * 1.0.6 — Bước 7 của hộ: ý kiến về dự thảo phương án (đồng ý / không đồng ý / ý kiến khác) và các lần đối thoại khi
 * còn ý kiến không đồng ý (điểm a khoản 3 Điều 87 Luật Đất đai 2024). Sửa như các ô khác của hồ sơ (bấm Lưu hồ sơ).
 */
export function KhungYKienPA({ h, duAn, doi, soanMau }: { h: Ho; duAn: DuAn; doi: (h: Ho) => void; soanMau: (ma: string) => void }) {
  const { lich, hoCua, luuNhieuHo, bao, quyen } = useUngDung();
  const y = h.yKienPA;
  const dat = (p: Partial<YKienPA>) => {
    const moi: YKienPA = { ...y, ...p };
    doi({ ...h, yKienPA: moi.loai || moi.ngayLay ? moi : undefined });
  };
  const tt = trangThaiDoiThoai(y, homNayIso(), lich);
  const lan = y?.doiThoai ?? [];
  const doiLan = (i: number, p: Partial<LanDoiThoai>) => dat({ doiThoai: lan.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const khac = hoCua(duAn.id).filter((x) => x.id !== h.id && !x.yKienPA?.ngayLay);
  const apNgay = async () => {
    if (!y?.ngayLay) return;
    if (!confirm(`Ghi ngày lấy ý kiến ${ngayVN(y.ngayLay)} cho ${khac.length} hồ sơ khác của dự án chưa ghi ngày? (Ý kiến từng hộ vẫn ghi riêng — chỉ lưu ngày.)`)) return;
    const r = await luuNhieuHo(khac.map((x) => ({ h: { ...x, yKienPA: { ...x.yKienPA, ngayLay: y.ngayLay } }, nhatKy: `Ghi ngày tổ chức lấy ý kiến về phương án: ${ngayVN(y.ngayLay)}` })));
    bao(r.loi.length ? `Đã ghi ${r.daLuu} hồ sơ; lỗi: ${r.loi.join("; ")}` : `Đã ghi ngày lấy ý kiến cho ${r.daLuu} hồ sơ`, r.loi.length ? "loi" : "ok");
  };
  const chuaGhi = !y?.loai;
  return (
    <div className="luoi" style={{ gap: 8, borderTop: "1px solid var(--vien)", paddingTop: 10 }} aria-label="Ý kiến về phương án, đối thoại">
      <div className="chu-nho"><b>Ý kiến về dự thảo phương án, đối thoại</b> — {CAN_CU_DOI_THOAI}: lấy ý kiến bằng họp trực tiếp ngay sau 30 ngày niêm yết; còn ý kiến không đồng ý thì tổ chức đối thoại trong {SO_NGAY_DOI_THOAI} ngày kể từ ngày lấy ý kiến.</div>
      <div className="luoi luoi-2" style={{ gap: 8 }}>
        <O nhan="Ý kiến của hộ">
          <Chon aria-label="Ý kiến của hộ về phương án" value={y?.loai ?? ""} onChange={(e) => dat({ loai: (e.target.value || undefined) as LoaiYKien | undefined })}>
            <option value="">— Chưa ghi —</option>
            {Object.entries(TEN_Y_KIEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Chon>
        </O>
        <O nhan="Ngày tổ chức lấy ý kiến">
          <ONgay aria-label="Ngày tổ chức lấy ý kiến" value={y?.ngayLay ?? ""} onChange={(e) => dat({ ngayLay: e.target.value || undefined })} />
        </O>
      </div>
      {!chuaGhi && (
        <>
          <O nhan="Hình thức">
            <Chon aria-label="Hình thức góp ý" value={y!.hinhThuc ?? "HOP"} onChange={(e) => dat({ hinhThuc: e.target.value as "HOP" | "VAN_BAN" })}>
              <option value="HOP">Họp trực tiếp</option>
              <option value="VAN_BAN">Gửi văn bản (không dự họp, có lý do chính đáng)</option>
            </Chon>
          </O>
          {y!.loai !== "DONG_Y" && <O nhan="Nội dung ý kiến"><textarea aria-label="Nội dung ý kiến về phương án" rows={2} value={y!.noiDung ?? ""} onChange={(e) => dat({ noiDung: e.target.value })} /></O>}
        </>
      )}
      {y?.loai === "KHONG_DONG_Y" && (
        <div className={`thong-bao ${tt.tt === "QUA_HAN" ? "thong-bao-do" : tt.tt === "CAN_DOI_THOAI" || tt.tt === "CON_Y_KIEN" ? "thong-bao-vang" : "thong-bao-xanh"}`} style={{ marginBottom: 0 }}>
          <b>{TEN_TT_DOI_THOAI[tt.tt]}</b>
          {tt.han ? <> · hạn tổ chức đối thoại: <b>{ngayVN(tt.han)}</b></> : <> · ghi ngày lấy ý kiến để tính hạn {SO_NGAY_DOI_THOAI} ngày</>}
          {tt.tt === "CON_Y_KIEN" && <div className="chu-nho">Tiếp thu, giải trình trong hồ sơ trình thẩm định, phê duyệt. Sau khi phê duyệt mà người có đất vẫn không đồng ý thì vận động, thuyết phục theo khoản 6 Điều 87.</div>}
          {lan.map((d, i) => (
            <div key={i} className="nhom-nut mt-6" style={{ alignItems: "center", flexWrap: "wrap" }}>
              Lần {i + 1}: <ONgay aria-label={`Ngày đối thoại lần ${i + 1}`} value={d.ngay} onChange={(e) => doiLan(i, { ngay: e.target.value })} />
              <input aria-label={`Biên bản đối thoại lần ${i + 1}`} placeholder="Biên bản số, ngày" value={d.bienBan ?? ""} onChange={(e) => doiLan(i, { bienBan: e.target.value })} style={{ width: 160 }} />
              <Chon aria-label={`Kết quả đối thoại lần ${i + 1}`} value={d.ketQua} onChange={(e) => doiLan(i, { ketQua: e.target.value as LanDoiThoai["ketQua"] })}>
                <option value="CON_Y_KIEN">Còn ý kiến không đồng ý</option>
                <option value="THONG_NHAT">Đã thống nhất</option>
              </Chon>
              <input aria-label={`Nội dung tiếp thu, giải trình lần ${i + 1}`} placeholder="Nội dung tiếp thu, giải trình" value={d.noiDung ?? ""} onChange={(e) => doiLan(i, { noiDung: e.target.value })} style={{ minWidth: 220, flex: 1 }} />
              <button className="nut nut-nho nut-nguy" onClick={() => dat({ doiThoai: lan.filter((_, j) => j !== i) })}>Xóa</button>
            </div>
          ))}
          <div className="nhom-nut mt-6">
            <button className="nut nut-nho" onClick={() => dat({ doiThoai: [...lan, { ngay: homNayIso(), ketQua: "CON_Y_KIEN" }] })}>+ Ghi lần đối thoại</button>
            <button className="nut nut-nho" onClick={() => soanMau("T12")}>Soạn biên bản đối thoại (T12)</button>
          </div>
        </div>
      )}
      {y?.ngayLay && khac.length > 0 && quyen("SUA_HO_SO") && (
        <div><button className="nut nut-chu nut-nho" onClick={() => void apNgay()}>Ghi ngày lấy ý kiến này cho {khac.length} hồ sơ khác chưa ghi ngày</button></div>
      )}
    </div>
  );
}

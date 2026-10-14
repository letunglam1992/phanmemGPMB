import { useMemo, useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { BO_CHINH_SACH } from "../du-lieu";
import { GOI_CO_SAN, GOI_GOC, docGoi, tenBoChinhSach, coBoChinhSach, type KetQuaDocGoi } from "../goi-chinh-sach";
import { tinhHoMoi } from "../tinh-ho";
import type { DuAn } from "../mo-hinh";
import { HopThoai } from "./chung";
import { Chon } from "./Chon";
import { taiXuong } from "../tai-xuong";
import { datBoDot, datBoHo, excelChuyenBo, moTaPhamVi, taiLieuGiaiTrinh, tinhChuyenBo, type PhamViChuyen } from "../chuyen-bo";
import { boCuaHo, coDot, dsDot, tenDot, timDot } from "../dot-thu-hoi";
import { inTaiLieu, taoDocx } from "../van-ban/tai-lieu-don-gian";
import { tenTep } from "../ten-tep";
import { homNayIso } from "../trang-thai";

const tomTatDonGia = (s: string) => {
  try {
    const ds = JSON.parse(s) as { nguon: string; canCu?: string }[];
    return `${ds.length} dòng${ds[0]?.canCu ? ` — ${ds[0].canCu}` : ""}`;
  } catch {
    return "hỏng";
  }
};
const vanBanBg = (s: string) => {
  try {
    return (JSON.parse(s) as { van_ban: string }).van_ban;
  } catch {
    return "hỏng";
  }
};

/** P2-1: Cài đặt chung → Gói chính sách: danh mục bộ chính sách, nạp gói mới (Quản trị). */
export function TheGoiChinhSach() {
  const { goiDaNap, napGoi, quyen, bao } = useUngDung();
  const [xem, setXem] = useState<(KetQuaDocGoi & { tenTep: string }) | null>(null);
  const doc = async (f: File) => setXem({ ...(await docGoi(await f.text(), Object.keys(BO_CHINH_SACH))), tenTep: f.name });
  return (
    <div>
      <p className="mo mt-0">
        Bộ chính sách (mức hỗ trợ, tỷ lệ, cách tính có căn cứ) nạp bằng tệp JSON do đơn vị có thẩm quyền phát hành, không cần cài lại phần mềm. <b>Gói chưa có chữ ký số</b>:
        đối chiếu mã SHA-256 với đơn vị phát hành trước khi dùng. Gói dạng bọc có thể kèm <b>bảng đơn giá</b> (mục <code>donGia</code>: văn bản căn cứ và các dòng theo nhóm QĐ32 — nhà, công trình; PL VIII — cây trồng, thủy sản; PL V — vật nuôi; nhóm có trong gói thay bảng có sẵn) và <b>bảng giá đất</b> (mục <code>bangGiaDat</code>, cùng cấu trúc bảng NQ 152) — dự án dùng bộ chính sách của gói thì chọn đơn giá, giá đất theo bảng của gói. Dự án chuyển sang bộ mới ở Thông tin dự án (xem chênh lệch từng hộ trước khi áp dụng).
      </p>
      <table className="bang">
        <thead><tr><th>Khóa</th><th>Tên, mã</th><th>Hiệu lực</th><th>Nguồn</th><th>SHA-256</th></tr></thead>
        <tbody>
          {GOI_CO_SAN.map((k) => <tr key={k}><td>{k}</td><td className="chu-nho">{tenBoChinhSach(k)}<div className="mo">Đơn giá QĐ 32/2025, PL V, PL VIII QĐ 106/2025; giá đất NQ 152/2025</div></td><td className="chu-nho">từ {BO_CHINH_SACH[k]!.hieuLucTu}{BO_CHINH_SACH[k]!.hieuLucDen ? ` đến ${BO_CHINH_SACH[k]!.hieuLucDen}` : ""}</td><td className="chu-nho">Có sẵn trong phần mềm</td><td>—</td></tr>)}
          {goiDaNap.map((g) => (
            <tr key={g.khoa}>
              <td>{g.khoa}</td><td className="chu-nho">{g.ten}<div className="mo">{g.ma}</div>{(g.donGia || g.bangGiaDat) && <div className="mo" data-goi-kem>Kèm {[g.donGia && `bảng đơn giá (${tomTatDonGia(g.donGia)})`, g.bangGiaDat && `bảng giá đất (${vanBanBg(g.bangGiaDat)})`].filter(Boolean).join(", ")}</div>}</td><td className="chu-nho">từ {g.hieuLucTu}{g.hieuLucDen ? ` đến ${g.hieuLucDen}` : ""}</td>
              <td className="chu-nho">Nạp {new Date(g.napLuc).toLocaleString("vi-VN")} · {g.napBoi}<div className="mo">{g.tenTep}</div></td>
              <td className="chu-nho" style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{g.sha256}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {quyen("NAP_CHINH_SACH") ? (
        <label className="nut nut-chinh mt-10">Nạp gói chính sách…<input type="file" accept=".json" className="an" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void doc(f); }} /></label>
      ) : <p className="mo chu-nho">Chỉ tài khoản Quản trị nạp gói chính sách.</p>}
      {xem && (
        <HopThoai tieuDe={`Kiểm tra gói: ${xem.tenTep}`} dong={() => setXem(null)} rong={720} chan={<><button className="nut" onClick={() => setXem(null)}>Hủy</button><button className="nut nut-chinh" disabled={!xem.goi} onClick={async () => {
          const g = xem.goi!;
          const cs = g.cs as unknown as { ten?: string; ma: string; hieuLucTu: string; hieuLucDen?: string | null };
          if (await napGoi({ khoa: g.khoa, ten: cs.ten ?? g.khoa, ma: cs.ma, hieuLucTu: cs.hieuLucTu, hieuLucDen: cs.hieuLucDen ?? null, sha256: g.sha256, tenTep: xem.tenTep, noiDung: g.noiDung, ...(g.ghiChu ? { ghiChu: g.ghiChu } : {}), ...(g.donGia ? { donGia: g.donGia } : {}), ...(g.bangGiaDat ? { bangGiaDat: g.bangGiaDat } : {}) })) {
            bao(`Đã nạp gói "${g.khoa}"`);
            setXem(null);
          }
        }}>Nạp gói</button></>}>
          {xem.loi.length ? (
            <div className="thong-bao thong-bao-do">Gói không dùng được:<ul>{xem.loi.map((l) => <li key={l}>{l}</li>)}</ul></div>
          ) : (
            <>
              <div className="thong-bao thong-bao-xanh">Đúng cấu trúc bộ chính sách. Khóa: <b>{xem.goi!.khoa}</b></div>
              <p>Mã kiểm tra SHA-256 (đối chiếu với đơn vị phát hành gói — gói chưa có chữ ký số):</p>
              <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}><b>{xem.goi!.sha256}</b></p>
              <p className="mo">Các mục khác bộ có sẵn: {xem.mucKhac.length ? xem.mucKhac.join(", ") : "không có"}.</p>
              <p className="mo">
                Bảng đơn giá: {xem.goi!.soDongDonGia ? `kèm gói, ${xem.goi!.soDongDonGia} dòng (thay nhóm tương ứng của bảng có sẵn)` : "không kèm — dùng bảng có sẵn"}. Bảng giá đất:{" "}
                {xem.goi!.vanBanGiaDat ? `kèm gói — ${xem.goi!.vanBanGiaDat}` : "không kèm — dùng bảng NQ 152/2025 có sẵn"}.
              </p>
            </>
          )}
        </HopThoai>
      )}
    </div>
  );
}

/** P2-1: Thông tin dự án → bộ chính sách áp dụng; chuyển sang bộ khác kèm bảng chênh lệch từng hộ. */
export function TheBoChinhSachDuAn({ duAn }: { duAn: DuAn }) {
  const { hoCua, quyen, chuyenBoChinhSach, bao } = useUngDung();
  const [moi, setMoi] = useState<string | null>(null);
  const [phamVi, setPhamVi] = useState(false);
  const hoRieng = hoCua(duAn.id).filter((h) => h.boChinhSach);
  const dotRieng = (duAn.dotThuHoi ?? []).filter((d) => d.boChinhSach);
  const ds = Object.keys(BO_CHINH_SACH);
  const thieu = !coBoChinhSach(duAn.boChinhSach);
  return (
    <div className="the mt-14">
      <div className="the-dau"><h3>Bộ chính sách áp dụng</h3><span className="mo chu-nho">bản phương án đã chốt, phê duyệt giữ bộ chính sách của bản đó</span></div>
      <div className="the-than" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <b>{tenBoChinhSach(duAn.boChinhSach)}</b><span className="mo chu-nho">({duAn.boChinhSach})</span>
        {thieu && <span className="nhan nhan-do">Máy này chưa có bộ chính sách này — đang tính tạm theo bộ có sẵn; nạp gói ở Cài đặt chung</span>}
        {quyen("CAI_DAT") && ds.length > 1 && (
          <Chon value="" onChange={(e) => e.target.value && setMoi(e.target.value)} aria-label="Chuyển sang bộ chính sách">
            <option value="">Chuyển sang bộ khác…</option>
            {ds.filter((k) => k !== duAn.boChinhSach).map((k) => <option key={k} value={k}>{tenBoChinhSach(k)} ({k})</option>)}
          </Chon>
        )}
        {quyen("CAI_DAT") && ds.length > 1 && <button className="nut nut-nho" title="Hồ sơ đang lập dở khi có văn bản mới: chuyển bộ chính sách cho một số hộ hoặc một đợt, kèm giải trình chênh lệch" onClick={() => setPhamVi(true)}>Chuyển theo hộ, đợt…</button>}
      </div>
      {(hoRieng.length > 0 || dotRieng.length > 0) && (
        <div className="the-than mo chu-nho" style={{ paddingTop: 0 }} data-bo-rieng>
          Bộ riêng:{" "}
          {[...dotRieng.map((d) => `${tenDot(d)} → ${d.boChinhSach}`), ...(hoRieng.length ? [`${hoRieng.length} hộ (${hoRieng.slice(0, 8).map((h) => `${h.ma} → ${h.boChinhSach}`).join(", ")}${hoRieng.length > 8 ? ", …" : ""})`] : [])].join("; ")}
        </div>
      )}
      {phamVi && <HopChuyenPhamVi duAn={duAn} dong={() => setPhamVi(false)} />}
      {(() => {
        // Chuyển tiếp (khoản 2 Điều 3 QĐ 64/2026): bộ mới có sẵn thay bộ đang dùng
        const thay = Object.entries(BO_CHINH_SACH).find(([, cs]) => cs.chuyenTiep?.boCu === duAn.boChinhSach);
        if (!thay) return null;
        const [khoa, cs] = thay;
        const daDuyet = (duAn.phuongAn ?? []).some((p) => p.trangThai === "DA_PHE_DUYET");
        return (
          <div className="thong-bao thong-bao-vang" style={{ margin: "0 16px 12px" }} data-chuyen-tiep>
            <b>{cs.ten}</b> có hiệu lực từ {cs.hieuLucTu.split("-").reverse().join("/")}. {cs.chuyenTiep!.noiDung} <span className="mo chu-nho">({cs.chuyenTiep!.canCu.map((c) => `${c.viTri} ${c.vanBan}`).join("; ")})</span>
            <div className="mt-6">
              {daDuyet
                ? <>Dự án đã có bản phương án được phê duyệt — các bản đó giữ nguyên. Hộ, đợt chưa phê duyệt: cán bộ xem chênh lệch rồi quyết định chuyển.</>
                : <>Dự án chưa có phương án được phê duyệt → thuộc trường hợp áp dụng bộ mới.</>}
              {quyen("CAI_DAT") && <button className="nut nut-nho nut-chinh" style={{ marginLeft: 8 }} onClick={() => setMoi(khoa)}>Xem chênh lệch, chuyển sang bộ mới…</button>}
            </div>
          </div>
        );
      })()}
      {moi && <HopChuyenBo duAn={duAn} moi={moi} hos={hoCua(duAn.id)} dong={() => setMoi(null)} apDung={async (tomTat) => { if (await chuyenBoChinhSach(duAn.id, moi, tomTat)) { bao(`Đã chuyển dự án sang bộ chính sách ${moi}`); setMoi(null); } }} />}
    </div>
  );
}

/** 1.0.11: chuyển bộ chính sách theo hộ / đợt, xem chênh lệch từng hộ, từng khoản; xuất Excel, Word giải trình. */
function HopChuyenPhamVi({ duAn, dong }: { duAn: DuAn; dong: () => void }) {
  const { hoCua, luuNhieuHo, luuDuAn, ghiNhatKy, bao, nguoiDung } = useUngDung();
  const hos = hoCua(duAn.id);
  const coDotTH = coDot(duAn);
  const [loai, setLoai] = useState<"ho" | "dot">(coDotTH ? "dot" : "ho");
  const [dotId, setDotId] = useState(dsDot(duAn)[0]?.id ?? "");
  const [chon, setChon] = useState<Set<string>>(new Set());
  const [loc, setLoc] = useState("");
  const [khoa, setKhoa] = useState(Object.keys(BO_CHINH_SACH).find((k) => k !== duAn.boChinhSach) ?? "");
  const [lyDo, setLyDo] = useState("");
  const pv: PhamViChuyen = loai === "dot" ? { loai, dotId, khoa } : { loai, hoIds: [...chon], khoa };
  const kq = useMemo(() => tinhChuyenBo(duAn, hos, pv), [duAn, hos, loai, dotId, chon, khoa]); // eslint-disable-line react-hooks/exhaustive-deps
  const tien = (x: string | null) => (x == null ? "—" : dinhDang(D(x), 0));
  const dau = (x: string) => (D(x).gt(0) ? "+" : "") + dinhDang(D(x), 0);
  const tl = () => taiLieuGiaiTrinh(duAn, pv, kq, { lyDo, nguoi: nguoiDung, ngay: homNayIso() });
  const loiLuu = !kq.dong.length ? "Chưa có hộ nào trong phạm vi" : !lyDo.trim() ? "Ghi lý do, căn cứ chuyển (bắt buộc)" : loai === "dot" && (timDot(duAn, dotId)?.boChinhSach ?? "") === khoa ? "Đợt đã dùng bộ này" : "";
  const apDung = async () => {
    const mt = moTaPhamVi(duAn, pv, kq.dong.length);
    if (!confirm(`Áp dụng: ${mt}? Tổng tạm tính ${tien(kq.tongTruoc)} → ${tien(kq.tongSau)} đ (chênh ${dau(kq.chenh)} đ).`)) return;
    if (loai === "dot") {
      if (!(await luuDuAn(datBoDot(duAn, dotId, khoa), "CAI_DAT"))) return;
    } else {
      const r = await luuNhieuHo(hos.filter((h) => chon.has(h.id)).map((h) => ({ h: datBoHo(h, khoa), nhatKy: `Chuyển bộ chính sách: ${boCuaHo(duAn, h)} → ${khoa || duAn.boChinhSach} (theo dự án/đợt). Lý do: ${lyDo.trim()}` })));
      if (r.loi.length) return bao(r.loi.join("; "), "loi");
    }
    await ghiNhatKy("Chuyển bộ chính sách theo hộ/đợt", `${duAn.ten}: ${mt}. Tổng ${tien(kq.tongTruoc)} → ${tien(kq.tongSau)} đ (chênh ${dau(kq.chenh)} đ). Lý do: ${lyDo.trim()}`);
    bao(`Đã chuyển: ${mt}`);
    dong();
  };
  const hienHo = hos.filter((h) => !loc || `${h.ma} ${h.ten}`.toLowerCase().includes(loc.toLowerCase()));
  return (
    <HopThoai
      tieuDe="Chuyển bộ chính sách theo hộ, đợt"
      dong={dong}
      rong={1000}
      chan={
        <>
          <button className="nut" disabled={!kq.dong.length} onClick={async () => { if (await taiXuong(await excelChuyenBo(duAn, pv, kq, lyDo), tenTep(`Chenh-lech-chuyen-bo - ${duAn.ten}.xlsx`), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")) bao("Đã xuất Excel chênh lệch"); }}>Xuất Excel</button>
          <button className="nut" disabled={!kq.dong.length} onClick={async () => { if (await taiXuong(taoDocx(tl()), tenTep(`Giai-trinh-chuyen-bo - ${duAn.ten}.docx`), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) bao("Đã xuất Word giải trình"); }}>Giải trình (Word)</button>
          <button className="nut" disabled={!kq.dong.length} onClick={() => inTaiLieu(tl())}>In / PDF</button>
          <button className="nut" onClick={dong}>Đóng</button>
          <button className="nut nut-chinh" disabled={!!loiLuu} title={loiLuu} onClick={() => void apDung()}>Áp dụng</button>
        </>
      }
    >
      <div className="thong-bao thong-bao-vang chu-nho">Dùng khi hồ sơ đang lập dở mà có văn bản mới: cán bộ chọn hộ/đợt thuộc trường hợp áp dụng (phần mềm không tự xác định). Bản phương án đã chốt, phê duyệt không đổi. Bộ áp dụng cho hộ: bộ riêng của hộ → của đợt → của dự án.</div>
      <div className="luoi luoi-2 mt-8">
        <label>Phạm vi{" "}
          <Chon value={loai} onChange={(e) => setLoai(e.target.value as "ho" | "dot")} aria-label="Phạm vi chuyển">
            {coDotTH && <option value="dot">Theo đợt thu hồi</option>}
            <option value="ho">Theo hộ</option>
          </Chon>
        </label>
        <label>Chuyển sang{" "}
          <Chon value={khoa} onChange={(e) => setKhoa(e.target.value)} aria-label="Bộ chính sách đích">
            {Object.keys(BO_CHINH_SACH).map((k) => <option key={k} value={k}>{tenBoChinhSach(k)} ({k})</option>)}
            <option value="">Bỏ bộ riêng — theo {loai === "ho" ? "đợt / dự án" : "dự án"}</option>
          </Chon>
        </label>
      </div>
      {loai === "dot" ? (
        <label className="mt-8" style={{ display: "block" }}>Đợt{" "}
          <Chon value={dotId} onChange={(e) => setDotId(e.target.value)} aria-label="Đợt chuyển bộ">
            {dsDot(duAn).map((d) => <option key={d.id} value={d.id}>{tenDot(d)}{d.boChinhSach ? ` (đang dùng ${d.boChinhSach})` : ""}</option>)}
          </Chon>
        </label>
      ) : (
        <div className="mt-8">
          <input placeholder="Lọc theo mã, tên…" value={loc} onChange={(e) => setLoc(e.target.value)} style={{ width: 240 }} />{" "}
          <button className="nut nut-nho" onClick={() => setChon(new Set([...chon, ...hienHo.map((h) => h.id)]))}>Chọn tất cả đang hiện</button>{" "}
          <button className="nut nut-nho" onClick={() => setChon(new Set())}>Bỏ chọn</button>
          <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid var(--vien)", borderRadius: 6, padding: 6, marginTop: 6 }} data-chon-ho-bo>
            {hienHo.map((h) => (
              <label key={h.id} style={{ display: "block" }} className="chu-nho">
                <input type="checkbox" checked={chon.has(h.id)} onChange={(e) => { const n = new Set(chon); if (e.target.checked) n.add(h.id); else n.delete(h.id); setChon(n); }} /> <b>{h.ma}</b> {h.ten} <span className="mo">· {boCuaHo(duAn, h)}{h.boChinhSach ? " (riêng)" : ""}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <label className="mt-8" style={{ display: "block" }}>Lý do, căn cứ chuyển (bắt buộc — in trên giải trình)
        <textarea rows={2} value={lyDo} onChange={(e) => setLyDo(e.target.value)} style={{ width: "100%" }} aria-label="Lý do chuyển bộ" />
      </label>
      {kq.giuBoRieng.length > 0 && <div className="mo chu-nho mt-6">Hộ có bộ riêng, không đổi theo đợt: {kq.giuBoRieng.map((h) => h.ma).join(", ")}</div>}
      <table className="bang mt-8" data-bang-chuyen-bo>
        <thead><tr><th>Hồ sơ</th><th>Bộ trước → sau</th><th className="so">Trước (đ)</th><th className="so">Sau (đ)</th><th className="so">Chênh lệch (đ)</th><th>Khoản thay đổi</th></tr></thead>
        <tbody>
          {kq.dong.map((d) => (
            <tr key={d.hoId}>
              <td className="chu-nho"><b>{d.ma}</b> {d.ten}{d.daPheDuyet && <div className="mo">đã có trong PA đã phê duyệt</div>}</td>
              <td className="chu-nho">{d.boTruoc} → {d.boSau}</td>
              <td className="so">{tien(d.truoc)}</td><td className="so">{tien(d.sau)}</td>
              <td className="so" style={D(d.chenh).isZero() ? undefined : { fontWeight: 700 }}>{dau(d.chenh)}</td>
              <td className="chu-nho">{d.khoan.slice(0, 3).map((k) => `${k.ma} ${dau(k.chenh)}`).join("; ")}{d.khoan.length > 3 ? ` (+${d.khoan.length - 3})` : ""}{d.thieuSau ? <div className="nhan nhan-vang">{d.thieuSau} khoản thiếu căn cứ</div> : null}</td>
            </tr>
          ))}
          {kq.dong.length > 0 && <tr className="tong"><td colSpan={2}>Tổng ({kq.dong.length} hộ)</td><td className="so">{tien(kq.tongTruoc)}</td><td className="so">{tien(kq.tongSau)}</td><td className="so">{dau(kq.chenh)}</td><td /></tr>}
        </tbody>
      </table>
    </HopThoai>
  );
}

function HopChuyenBo({ duAn, moi, hos, dong, apDung }: { duAn: DuAn; moi: string; hos: import("../mo-hinh").Ho[]; dong: () => void; apDung: (tomTat: string) => Promise<void> }) {
  const bang = useMemo(() => {
    const csCu = BO_CHINH_SACH[duAn.boChinhSach] ?? BO_CHINH_SACH[GOI_GOC]!, csMoi = BO_CHINH_SACH[moi]!;
    const daMoi = { ...duAn, boChinhSach: moi };
    return hos.map((h) => {
      const a = tinhHoMoi(csCu, duAn, h), b = tinhHoMoi(csMoi, daMoi, h);
      return { h, cu: a.tong.tongLamTron, moi: b.tong.tongLamTron, chenh: b.tong.tongLamTron.minus(a.tong.tongLamTron), thieuMoi: b.tong.soDongThieuCanCu + b.tong.soDongCanXacNhan };
    });
  }, [duAn, moi, hos]);
  const tong = (f: (x: (typeof bang)[number]) => ReturnType<typeof D>) => bang.reduce((s, x) => s.plus(f(x)), D(0));
  const tien = (v: ReturnType<typeof D>) => dinhDang(v, 0);
  const tomTat = `${bang.length} hộ; tổng tạm tính ${tien(tong((x) => x.cu))} → ${tien(tong((x) => x.moi))} đ (chênh ${tien(tong((x) => x.chenh))} đ)`;
  const xuat = async () => {
    const { default: E } = await import("exceljs");
    const wb = new E.Workbook();
    const ws = wb.addWorksheet("Chênh lệch");
    ws.addRow([`Chênh lệch khi chuyển bộ chính sách — ${duAn.ten}: ${duAn.boChinhSach} → ${moi}`]).font = { bold: true };
    ws.addRow(["Mã", "Họ tên", "Tổng theo bộ cũ (đ)", "Tổng theo bộ mới (đ)", "Chênh lệch (đ)", "Khoản thiếu căn cứ/cần xác nhận (bộ mới)"]).font = { bold: true };
    for (const x of bang) ws.addRow([x.h.ma, x.h.ten, x.cu.toNumber(), x.moi.toNumber(), x.chenh.toNumber(), x.thieuMoi]);
    ws.columns.forEach((c, i) => (c.width = [10, 28, 18, 18, 16, 16][i]));
    await taiXuong(new Uint8Array(await wb.xlsx.writeBuffer()), `Chenh-lech-bo-chinh-sach - ${duAn.ten}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  };
  return (
    <HopThoai tieuDe={`Chuyển bộ chính sách: ${duAn.boChinhSach} → ${moi}`} dong={dong} rong={900} chan={<><button className="nut" onClick={() => void xuat()}>Xuất Excel</button><button className="nut" onClick={dong}>Hủy</button><button className="nut nut-chinh" onClick={() => { if (confirm(`Áp dụng bộ chính sách ${moi} cho dự án? ${tomTat}.`)) void apDung(tomTat); }}>Áp dụng bộ mới</button></>}>
      <div className="thong-bao thong-bao-vang">Tạm tính mọi hộ theo bộ mới (chưa lưu). Bản phương án đã chốt, phê duyệt không đổi. {tomTat}.</div>
      <table className="bang">
        <thead><tr><th>Hồ sơ</th><th className="so">Bộ cũ (đ)</th><th className="so">Bộ mới (đ)</th><th className="so">Chênh lệch (đ)</th><th className="so">Thiếu căn cứ (bộ mới)</th></tr></thead>
        <tbody>
          {bang.map((x) => <tr key={x.h.id}><td className="chu-nho"><b>{x.h.ma}</b> {x.h.ten}</td><td className="so">{tien(x.cu)}</td><td className="so">{tien(x.moi)}</td><td className="so" style={x.chenh.isZero() ? undefined : { fontWeight: 700 }}>{tien(x.chenh)}</td><td className="so">{x.thieuMoi || ""}</td></tr>)}
          <tr className="tong"><td>Tổng</td><td className="so">{tien(tong((x) => x.cu))}</td><td className="so">{tien(tong((x) => x.moi))}</td><td className="so">{tien(tong((x) => x.chenh))}</td><td /></tr>
        </tbody>
      </table>
    </HopThoai>
  );
}

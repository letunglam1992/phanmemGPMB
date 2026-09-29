import { useMemo, useState } from "react";
import { D, dinhDang } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { BO_CHINH_SACH } from "../du-lieu";
import { GOI_GOC, docGoi, tenBoChinhSach, coBoChinhSach, type KetQuaDocGoi } from "../goi-chinh-sach";
import { tinhHoMoi } from "../tinh-ho";
import type { DuAn } from "../mo-hinh";
import { HopThoai } from "./chung";
import { Chon } from "./Chon";
import { taiXuong } from "../tai-xuong";

/** P2-1: Cài đặt chung → Gói chính sách: danh mục bộ chính sách, nạp gói mới (Quản trị). */
export function TheGoiChinhSach() {
  const { goiDaNap, napGoi, quyen, bao } = useUngDung();
  const [xem, setXem] = useState<(KetQuaDocGoi & { tenTep: string }) | null>(null);
  const doc = async (f: File) => setXem({ ...(await docGoi(await f.text(), Object.keys(BO_CHINH_SACH))), tenTep: f.name });
  return (
    <div>
      <p className="mo mt-0">
        Bộ chính sách (mức hỗ trợ, tỷ lệ, cách tính có căn cứ) nạp bằng tệp JSON do đơn vị có thẩm quyền phát hành, không cần cài lại phần mềm. <b>Gói chưa có chữ ký số</b>:
        đối chiếu mã SHA-256 với đơn vị phát hành trước khi dùng. Bảng đơn giá, bảng giá đất chưa nằm trong gói. Dự án chuyển sang bộ mới ở Thông tin dự án (xem chênh lệch từng hộ trước khi áp dụng).
      </p>
      <table className="bang">
        <thead><tr><th>Khóa</th><th>Tên, mã</th><th>Hiệu lực</th><th>Nguồn</th><th>SHA-256</th></tr></thead>
        <tbody>
          <tr><td>{GOI_GOC}</td><td className="chu-nho">{tenBoChinhSach(GOI_GOC)}</td><td className="chu-nho">từ {BO_CHINH_SACH[GOI_GOC]!.hieuLucTu}</td><td className="chu-nho">Có sẵn trong phần mềm</td><td>—</td></tr>
          {goiDaNap.map((g) => (
            <tr key={g.khoa}>
              <td>{g.khoa}</td><td className="chu-nho">{g.ten}<div className="mo">{g.ma}</div></td><td className="chu-nho">từ {g.hieuLucTu}{g.hieuLucDen ? ` đến ${g.hieuLucDen}` : ""}</td>
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
          if (await napGoi({ khoa: g.khoa, ten: cs.ten ?? g.khoa, ma: cs.ma, hieuLucTu: cs.hieuLucTu, hieuLucDen: cs.hieuLucDen ?? null, sha256: g.sha256, tenTep: xem.tenTep, noiDung: g.noiDung, ...(g.ghiChu ? { ghiChu: g.ghiChu } : {}) })) {
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
      </div>
      {moi && <HopChuyenBo duAn={duAn} moi={moi} hos={hoCua(duAn.id)} dong={() => setMoi(null)} apDung={async (tomTat) => { if (await chuyenBoChinhSach(duAn.id, moi, tomTat)) { bao(`Đã chuyển dự án sang bộ chính sách ${moi}`); setMoi(null); } }} />}
    </div>
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

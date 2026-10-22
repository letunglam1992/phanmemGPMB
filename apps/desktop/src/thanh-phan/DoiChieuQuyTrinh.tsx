import { CAC_BUOC } from "../mo-hinh";
import { DOI_CHIEU_QUY_TRINH, TEN_DANH_GIA } from "../doi-chieu-quy-trinh";
import { HopThoai } from "./chung";

/** 1.2.0 (A3) — bảng đối chiếu 16 bước với NĐ 151/2025 và Sổ tay QĐ 1966 (trích nguyên văn). */
export function HopDoiChieuQuyTrinh({ dong }: { dong: () => void }) {
  return (
    <HopThoai tieuDe="Đối chiếu 16 bước với NĐ 151/2025/NĐ-CP và Sổ tay QĐ 1966" dong={dong} rong={1180}>
      <p className="chu-nho mo">
        Trình tự tại mục IV Phần II Phụ lục I Nghị định 151/2025/NĐ-CP; thời hạn phần mềm đang tính ghi rõ nguồn. Bước nào nghị định không quy định số
        ngày thì phần mềm theo Sổ tay của tỉnh (văn bản hướng dẫn) hoặc không tính hạn. Khi Sổ tay khác nghị định, phần mềm theo nghị định.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="bang" aria-label="Đối chiếu quy trình" data-doi-chieu-quy-trinh>
          <thead>
            <tr><th>Bước</th><th>Nghị định 151/2025 (nguyên văn)</th><th>Sổ tay QĐ 1966</th><th>Phần mềm đang tính</th><th>Đánh giá</th></tr>
          </thead>
          <tbody>
            {DOI_CHIEU_QUY_TRINH.map((d) => (
              <tr key={d.buoc} data-buoc={d.buoc}>
                <td><b>{d.buoc}.</b> {CAC_BUOC.find((b) => b.ma === d.buoc)?.ten}</td>
                <td className="chu-nho"><i>{d.mucNd151}</i>{d.trichNd151 ? <>: “{d.trichNd151}”</> : null}</td>
                <td className="chu-nho">{d.soTay ? <><i>{d.soTay.muc}</i>: “{d.soTay.trich}…”</> : "—"}</td>
                <td className="chu-nho">{d.phanMem}</td>
                <td className="chu-nho"><b style={d.danhGia === "THEO_NGHI_DINH" ? { color: "var(--do-to)" } : undefined}>{TEN_DANH_GIA[d.danhGia]}</b>{d.ghiChu ? <div>{d.ghiChu}</div> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HopThoai>
  );
}

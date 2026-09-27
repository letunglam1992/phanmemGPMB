import { useMemo, useState } from "react";
import { D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { taoId, type DuAn } from "../mo-hinh";
import { canhBaoSaoLuu } from "../sao-luu";
import { CAC_CHANG, THU_TU_TRANG_THAI, TT_GPMB, canhBaoChung, canhBaoDuAn, homNayIso, thongKe, type TrangThaiGpmb } from "../trang-thai";
import { BieuTuong, DaiChang, PhanBoTrangThai, TheChiSo, VongTienDo } from "../thanh-phan/BieuDo";
import { taoDuAnMau } from "../du-lieu-mau";
import { DANH_MUC_XA } from "../du-lieu";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";

export function TongQuan() {
  const { dsDuAn, hoCua, di, chinhSach, luuDuAn, kho, dangTai, lanSaoLuu, moSaoLuu, quyen, lich, moCaiDat, tyLeCham } = useUngDung();
  const [taoMoi, setTaoMoi] = useState(false);
  const homNay = homNayIso();

  const duLieu = useMemo(() => {
    return dsDuAn.map((d) => {
      const ds = hoCua(d.id).map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) }));
      return { d, ds, tk: thongKe(d, ds, homNay), cb: canhBaoDuAn(d, ds, homNay, lich, tyLeCham), tong: ds.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)) };
    });
  }, [dsDuAn, hoCua, chinhSach, homNay, lich, tyLeCham]);

  const napMau = async () => {
    if (!quyen("SUA_HO_SO")) return;
    const { duAn, ho } = taoDuAnMau();
    await kho.luuDuAn(duAn);
    for (const h of ho) await kho.luuHo(h);
    await luuDuAn(duAn);
  };

  const cong = (f: (x: (typeof duLieu)[number]) => number) => duLieu.reduce((s, x) => s + f(x), 0);
  const soHo = cong((x) => x.tk.soHo);
  const dem = Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, cong((x) => x.tk.theoTrangThai[t])])) as Record<TrangThaiGpmb, number>;
  const tienDo = soHo ? cong((x) => x.tk.tienDoChung * x.tk.soHo) / soHo : 0;
  const chang = CAC_CHANG.map((c, i) => ({ ten: c.ten, soHo: cong((x) => x.tk.chang[i]!.soHo) }));
  const nhacSaoLuu = quyen("SAO_LUU") ? canhBaoSaoLuu(lanSaoLuu, homNay, dsDuAn.length > 0) : null;
  const canhBao = [
    ...canhBaoChung(homNay, lich).map((c) => ({ ...c, muc: c.muc ?? ("CAO" as const), duAnId: "", hoId: undefined, saoLuu: false })),
    ...(nhacSaoLuu ? [{ noiDung: nhacSaoLuu, canCu: "Bấm để mở Sao lưu, khôi phục", muc: "TRUNG_BINH" as const, duAnId: "", hoId: undefined, saoLuu: true }] : []),
    ...duLieu.flatMap((x) => x.cb),
  ];
  const capNhat = duLieu.map((x) => x.tk.capNhatCuoi).filter(Boolean).sort().at(-1);
  const tongTien = duLieu.reduce((s, x) => s.plus(x.tong), D(0));

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <h1>Tổng quan công tác bồi thường, GPMB</h1>
          <div className="mo-ta">Hiện trạng từng hồ sơ, tiến độ theo quy trình Sổ tay QĐ 1966 và các cảnh báo cần xử lý.</div>
        </div>
        <div className="phai" style={{ alignItems: "center" }}>
          <span className="cap-nhat"><BieuTuong ten="dongHo" co={16} />Cập nhật cuối: {capNhat ? new Date(capNhat).toLocaleString("vi-VN") : "—"}</span>
          {dsDuAn.length === 0 && !dangTai && quyen("SUA_HO_SO") && <button className="nut" onClick={napMau}>Nạp dữ liệu mẫu (ẩn danh)</button>}
          {quyen("SUA_HO_SO") && <button className="nut nut-chinh" onClick={() => setTaoMoi(true)}>+ Dự án mới</button>}
        </div>
      </div>

      <div className="luoi luoi-4" style={{ marginBottom: 14 }}>
        <TheChiSo bieuTuong="nguoi" nhan="Hộ đã hoàn thành GPMB" giaTri={dem.HOAN_THANH} mauSo={soHo} mau="#1f8a4c" phu="Đã xác nhận chi trả (bước 12)" />
        <TheChiSo bieuTuong="hoSo" nhan="Hồ sơ đang xử lý" giaTri={dem.DANG_XU_LY} mauSo={soHo} mau="#b98400" phu="Từ lập phương án đến chi trả" />
        <TheChiSo bieuTuong="canhBao" nhan="Vướng mắc cần ưu tiên" giaTri={dem.VUONG_MAC} mauSo={soHo} mau="#c0392b" phu="Ghi vướng mắc, thiếu căn cứ, quá hạn" />
        <TheChiSo bieuTuong="thua" nhan="Thửa đất đã kiểm đếm" giaTri={cong((x) => x.tk.soThuaDaKiemDem)} mauSo={cong((x) => x.tk.soThua)} mau="#2f6fb8" phu={`Giá trị tạm tính: ${tien(tongTien)} đ`} />
      </div>

      <div className="the" style={{ marginBottom: 14 }}>
        <div className="the-dau"><h2>Quy trình bồi thường, GPMB</h2><span className="mo chu-nho">Số hộ đã hoàn thành từng chặng</span></div>
        <DaiChang chang={chang} soHo={soHo} bieuTuong={["hoSo", "kiemDem", "phuongAn", "pheDuyet", "chiTra", "banGiao"]} />
      </div>

      <div className="luoi" style={{ gridTemplateColumns: "340px minmax(0,1fr) 360px" }}>
        <div className="luoi" style={{ alignContent: "start" }}>
          <div className="the">
            <div className="the-dau"><h3>Hiện trạng hồ sơ</h3><span className="mo chu-nho">{soHo} hộ</span></div>
            <div className="the-than"><PhanBoTrangThai dem={dem} tong={soHo} /></div>
          </div>
          <div className="the">
            <div className="the-dau"><h3>Tiến độ chung</h3></div>
            <div className="the-than"><VongTienDo tyLe={tienDo} nhan="Số bước đã xong / tổng số bước của mọi hộ" /></div>
          </div>
        </div>

        <div className="the" style={{ alignSelf: "start" }}>
          <div className="the-dau"><h2>Dự án</h2><span className="mo chu-nho">{dsDuAn.length}</span></div>
          <div className="the-than luoi">
            {duLieu.length === 0 && <div className="trong">{dangTai ? "Đang tải…" : "Chưa có dự án. Tạo dự án mới hoặc nạp dữ liệu mẫu để xem thử."}</div>}
            {duLieu.map(({ d, tk, tong, cb }) => (
              <div key={d.id} className="the the-du-an" onClick={() => di({ ten: "du-an", duAnId: d.id })}>
                <div className="bang-dk-dau">
                  <h3 style={{ flex: 1 }}>{d.ten}</h3>
                  {cb.some((c) => c.muc === "CAO") && <span className="nhan nhan-do">{cb.filter((c) => c.muc === "CAO").length} cảnh báo</span>}
                </div>
                <div className="dong"><span>{d.xa} · {tk.soHo} hộ · {tk.soThua} thửa</span><b style={{ color: "var(--chu)" }}>{tien(tong)} đ</b></div>
                <PhanBoTrangThaiGon dem={tk.theoTrangThai} tong={tk.soHo} />
                <div className="dong"><span>Tiến độ chung {Math.round(tk.tienDoChung * 100)}%</span><span>TB thu hồi: {ngayVN(d.ngayThongBao) || "—"}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="the" style={{ alignSelf: "start" }}>
          <div className="the-dau"><h3>Cảnh báo tự động</h3><div className="phai"><span className="nhan nhan-do">{canhBao.filter((c) => c.muc === "CAO").length}</span><span className="nhan nhan-vang">{canhBao.filter((c) => c.muc !== "CAO").length}</span></div></div>
          <div className="bang-cuon" style={{ maxHeight: 520 }}>
            {canhBao.map((c, i) => (
              <div key={i} className="canh-bao-dong" onClick={() => ("caiDat" in c && c.caiDat ? moCaiDat(true) : "saoLuu" in c && c.saoLuu ? moSaoLuu(true) : c.duAnId && (c.hoId ? di({ ten: "ho", duAnId: c.duAnId, hoId: c.hoId, tab: "tien-do" }) : di({ ten: "du-an", duAnId: c.duAnId })))}>
                <span className={`cb-bt cb-${c.muc}`}>{c.muc === "THONG_TIN" ? "i" : "!"}</span>
                <div>{c.noiDung}{c.canCu && <div className="can-cu">{c.canCu}</div>}</div>
              </div>
            ))}
            {canhBao.length === 0 && <div className="trong">Không có cảnh báo.</div>}
          </div>
        </div>
      </div>
      {taoMoi && <HopTaoDuAn dong={() => setTaoMoi(false)} />}
    </div>
  );
}

function PhanBoTrangThaiGon({ dem, tong }: { dem: Record<TrangThaiGpmb, number>; tong: number }) {
  return (
    <div className="thanh-xep" style={{ height: 8, margin: "10px 0 6px" }} title={THU_TU_TRANG_THAI.map((t) => `${TT_GPMB[t].ten}: ${dem[t]}`).join(" · ")}>
      {tong === 0 && <span style={{ flex: 1, background: "#e3e8e6" }} />}
      {THU_TU_TRANG_THAI.filter((t) => dem[t] > 0).map((t) => <span key={t} style={{ flex: dem[t], background: TT_GPMB[t].mau }} />)}
    </div>
  );
}

export function HopTaoDuAn({ dong, duAn }: { dong: () => void; duAn?: DuAn }) {
  const { luuDuAn, di } = useUngDung();
  const [d, setD] = useState<DuAn>(
    duAn ?? {
      id: taoId(), ten: "", xa: "", chuDauTu: "", canCuThuHoi: "", ngayThongBao: "", boChinhSach: "sonla-2026-03-31",
      giaGao: null, hanMucNN: null, heSoGiaDat: null, banDo: null, taoLuc: new Date().toISOString(),
    },
  );
  const hopLe = d.ten.trim() && d.xa;
  const heSoKhac1 = d.heSoGiaDat && d.heSoGiaDat.heSo && d.heSoGiaDat.heSo !== "1";
  return (
    <HopThoai
      tieuDe={duAn ? "Thông tin dự án" : "Dự án mới"}
      dong={dong}
      rong={760}
      chan={
        <>
          <button className="nut" onClick={dong}>Hủy</button>
          <button className="nut nut-chinh" disabled={!hopLe || (!!heSoKhac1 && !d.heSoGiaDat?.vanBan)} onClick={async () => { await luuDuAn(d); dong(); if (!duAn) di({ ten: "du-an", duAnId: d.id }); }}>Lưu</button>
        </>
      }
    >
      <div className="luoi luoi-2">
        <O nhan="Tên dự án *" style={{ gridColumn: "1/-1" }}><input value={d.ten} onChange={(e) => setD({ ...d, ten: e.target.value })} /></O>
        <O nhan="Xã, phường *" goiY="Danh mục 75 xã, phường theo NQ 152/2025">
          <select value={d.xa} onChange={(e) => setD({ ...d, xa: e.target.value })}>
            <option value="">— Chọn —</option>
            {DANH_MUC_XA.map((x) => <option key={x}>{x}</option>)}
          </select>
        </O>
        <O nhan="Chủ đầu tư"><input value={d.chuDauTu} onChange={(e) => setD({ ...d, chuDauTu: e.target.value })} /></O>
        <O nhan="Căn cứ thu hồi (thông báo, kế hoạch)"><input value={d.canCuThuHoi} onChange={(e) => setD({ ...d, canCuThuHoi: e.target.value })} /></O>
        <O nhan="Ngày thông báo thu hồi đất" goiY="Dùng xác định mốc hỗ trợ nhà, công trình (QĐ 14/2026)"><input type="date" value={d.ngayThongBao} onChange={(e) => setD({ ...d, ngayThongBao: e.target.value })} /></O>
        <O nhan="Giá gạo tẻ trung bình (đ/kg)" goiY="Theo văn bản của Sở Tài chính (TL-26)">
          <input className="o-so" value={d.giaGao?.dongKg ?? ""} onChange={(e) => setD({ ...d, giaGao: e.target.value ? { dongKg: e.target.value, nguon: d.giaGao?.nguon ?? "" } : null })} />
        </O>
        <O nhan="Văn bản giá gạo"><input value={d.giaGao?.nguon ?? ""} disabled={!d.giaGao} onChange={(e) => setD({ ...d, giaGao: { dongKg: d.giaGao!.dongKg, nguon: e.target.value } })} /></O>
        <O nhan="Hạn mức giao đất NN (m²)" goiY="Dùng giới hạn diện tích hỗ trợ chuyển đổi nghề">
          <input className="o-so" value={d.hanMucNN?.m2 ?? ""} onChange={(e) => setD({ ...d, hanMucNN: e.target.value ? { m2: e.target.value, canCu: d.hanMucNN?.canCu ?? "" } : null })} />
        </O>
        <O nhan="Căn cứ hạn mức"><input value={d.hanMucNN?.canCu ?? ""} disabled={!d.hanMucNN} onChange={(e) => setD({ ...d, hanMucNN: { m2: d.hanMucNN!.m2, canCu: e.target.value } })} /></O>
        <O nhan="Hệ số điều chỉnh giá đất" goiY="Mặc định 1. Khác 1 phải ghi văn bản (QD-02)">
          <input className="o-so" value={d.heSoGiaDat?.heSo ?? "1"} onChange={(e) => setD({ ...d, heSoGiaDat: { heSo: e.target.value, vanBan: d.heSoGiaDat?.vanBan ?? "" } })} />
        </O>
        <O nhan="Văn bản quyết định hệ số"><input className={heSoKhac1 && !d.heSoGiaDat?.vanBan ? "loi-nhap" : ""} value={d.heSoGiaDat?.vanBan ?? ""} onChange={(e) => setD({ ...d, heSoGiaDat: { heSo: d.heSoGiaDat?.heSo ?? "1", vanBan: e.target.value } })} /></O>
      </div>
    </HopThoai>
  );
}

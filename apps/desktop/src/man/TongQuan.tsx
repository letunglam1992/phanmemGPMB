import { useRef, useState } from "react";
import { D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { TEN_CACH_LAM_TRON } from "../tinh-ho";
import { TEN_LOAI_DU_AN, TEN_TRANG_THAI_DU_AN, taoId, type DuAn } from "../mo-hinh";
import { CAC_CHANG, THU_TU_TRANG_THAI, TT_GPMB, type TrangThaiGpmb } from "../trang-thai";
import { useTongHop, type MucCanhBao } from "../thanh-phan/dung-canh-bao";
import { BieuTuong, PhanBoTrangThai, VongTienDo } from "../thanh-phan/BieuDo";
import { taoDuAnMau } from "../du-lieu-mau";
import { DANH_MUC_XA } from "../du-lieu";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";
import { Chon } from "../thanh-phan/Chon";
import { OSo } from "../thanh-phan/OSo";

type TongKpi = "xanh" | "vang" | "do" | "duong";

/** Thẻ chỉ số điều hành: ô biểu tượng + tên, số / mẫu số, thanh đo + %, dòng phụ; bấm để xem danh sách chi tiết. */
function TheKpi(p: { bt: string; nhan: string; gt: number; ms: number; tong: TongKpi; phu: string; bam: () => void }) {
  const pt = p.ms ? Math.round((p.gt / p.ms) * 100) : 0;
  return (
    <button className={`tq-kpi ${p.tong}`} onClick={p.bam} title="Bấm để xem danh sách chi tiết">
      <div className="tq-kpi-dau"><span className="bt"><BieuTuong ten={p.bt} co={21} /></span><span className="ten">{p.nhan}</span></div>
      <div className="tq-kpi-so"><b>{p.gt.toLocaleString("vi-VN")}</b><small> / {p.ms.toLocaleString("vi-VN")}</small></div>
      <div className="tq-kpi-thanh"><div className="thanh"><span style={{ width: `${pt}%` }} /></div><span>{pt}%</span></div>
      <div className="chu-nho mo">{p.phu}</div>
    </button>
  );
}

export function TongQuan() {
  const { dsDuAn, di, taiLai, kho, dangTai, quyen } = useUngDung();
  const [taoMoi, setTaoMoi] = useState(false);
  const { duLieu, canhBao, mo } = useTongHop();
  const dsRef = useRef<HTMLDivElement>(null);

  const napMau = async () => {
    if (!quyen("SUA_HO_SO")) return;
    const { duAn, ho } = taoDuAnMau();
    await kho.ghiLo({ duAn: [duAn], ho }); // một lô (P0-6); tải lại để có cả hồ sơ (P1-2: lưu dự án không tải lại)
    await taiLai();
  };

  const cong = (f: (x: (typeof duLieu)[number]) => number) => duLieu.reduce((s, x) => s + f(x), 0);
  const soHo = cong((x) => x.tk.soHo);
  const dem = Object.fromEntries(THU_TU_TRANG_THAI.map((t) => [t, cong((x) => x.tk.theoTrangThai[t])])) as Record<TrangThaiGpmb, number>;
  const tienDo = soHo ? cong((x) => x.tk.tienDoChung * x.tk.soHo) / soHo : 0;
  const chang = CAC_CHANG.map((c, i) => ({ ten: c.ten, buoc: c.buoc, soHo: cong((x) => x.tk.chang[i]!.soHo) }));
  const capNhat = duLieu.map((x) => x.tk.capNhatCuoi).filter(Boolean).sort().at(-1);
  const tongTien = duLieu.reduce((s, x) => s.plus(x.tong), D(0));
  const cao = canhBao.filter((c) => c.muc === "CAO");
  const theoDoi = canhBao.filter((c) => c.muc !== "CAO");
  const tachTieuDe = (nd: string) => {
    const i = nd.indexOf(": ");
    return i > 0 && i < 60 ? { dau: nd.slice(0, i), sau: nd.slice(i + 2) } : { dau: "", sau: nd };
  };
  const dongCB = (c: MucCanhBao, i: number) => (
    <div key={i} className="canh-bao-dong" onClick={() => mo(c)}>
      <span className={`cb-bt cb-${c.muc}`}>{c.muc === "THONG_TIN" ? "i" : "!"}</span>
      <div>{c.noiDung}{c.canCu && <div className="can-cu">{c.canCu}</div>}</div>
    </div>
  );
  const mucTq = (c: MucCanhBao, i: number) => {
    const t = tachTieuDe(c.noiDung);
    return (
      <button key={i} className="tq-viec" onClick={() => mo(c)}>
        <span className="bt"><BieuTuong ten={c.hoId ? "nguoi" : c.duAnId ? "danhSach" : c.saoLuu ? "saoLuu" : "vanBan"} co={20} /></span>
        <span className="nd"><b>{t.sau}</b><small>{[t.dau, c.canCu].filter(Boolean).join(" · ")}</small></span>
        <BieuTuong ten="phai" co={16} />
      </button>
    );
  };
  const cuonXuong = () => dsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <div className="nhan-trang">Tổng quan điều hành</div>
          <h1>Tình hình bồi thường, giải phóng mặt bằng</h1>
          <div className="mo-ta">Hiện trạng từng hồ sơ, tiến độ theo quy trình Sổ tay QĐ 1966 và các việc cần xử lý.</div>
        </div>
        <div className="phai">
          <span className="cap-nhat"><BieuTuong ten="dongHo" co={16} />Cập nhật cuối: {capNhat ? new Date(capNhat).toLocaleString("vi-VN") : "—"}</span>
          {dsDuAn.length === 0 && !dangTai && quyen("SUA_HO_SO") && <button className="nut" onClick={napMau}>Nạp dữ liệu mẫu (ẩn danh)</button>}
          {quyen("SUA_HO_SO") && <button className="nut nut-chinh nut-lon" onClick={() => setTaoMoi(true)}><BieuTuong ten="cong" co={17} /> Dự án mới</button>}
        </div>
      </div>

      <section className="the tq-tinh-trang" aria-label="Tình trạng chung">
        <div className="tq-tt-dau">
          <span className="bt"><BieuTuong ten="baoCao" co={30} /></span>
          <div>
            <h2>Tình trạng chung</h2>
            <p>
              Đang theo dõi <button className="lien-ket" onClick={() => di({ ten: "du-an" })}><b>{dsDuAn.length} dự án</b></button> với <button className="lien-ket" onClick={() => di({ ten: "ds-ho" })}><b>{soHo} hồ sơ</b></button>, giá trị bồi thường, hỗ trợ tạm tính <b>{tien(tongTien)} đ</b>.
              {dem.VUONG_MAC > 0 && <> Có <button className="lien-ket" onClick={() => di({ ten: "ds-ho", trangThai: "VUONG_MAC" })}><b>{dem.VUONG_MAC} hồ sơ vướng mắc</b></button>.</>}
            </p>
            <p className="mo">{cao.length > 0 ? `Có ${cao.length} việc cần xử lý ngay; ${theoDoi.length} việc cần theo dõi.` : `Không có việc quá hạn; ${theoDoi.length} việc cần theo dõi.`}</p>
          </div>
        </div>
        <div className="tq-hai">
          <div className="tq-panel vang">
            <div className="tq-panel-dau"><span className="tron">!</span><h3>Việc cần theo dõi</h3><span className="dem">({theoDoi.length})</span>{theoDoi.length > 3 && <button className="nut nut-chu nut-nho day-phai" onClick={cuonXuong}>Xem tất cả</button>}</div>
            <div className="tq-panel-than">
              {theoDoi.slice(0, 3).map(mucTq)}
              {theoDoi.length === 0 && <div className="tq-trong"><BieuTuong ten="hopThu" co={40} /><span>Không có việc sắp đến hạn.</span></div>}
            </div>
          </div>
          <div className="tq-panel do">
            <div className="tq-panel-dau"><BieuTuong ten="canhBao" co={22} /><h3>Việc cần xử lý ngay</h3><span className="dem">({cao.length})</span>{cao.length > 3 && <button className="nut nut-chu nut-nho day-phai" onClick={cuonXuong}>Xem tất cả</button>}</div>
            <div className="tq-panel-than">
              {cao.slice(0, 3).map(mucTq)}
              {cao.length === 0 && <div className="tq-trong"><BieuTuong ten="hopThu" co={40} /><span>Không có việc quá hạn,<br />vướng mắc cần xử lý ngay.</span></div>}
            </div>
          </div>
        </div>
      </section>

      <div className="tq-muc-dau">
        <span className="bt"><BieuTuong ten="bieuDo" co={20} /></span>
        <div><h2>Chỉ số điều hành</h2><div className="mo">Các chỉ số tổng quan về tình hình thực hiện bồi thường, giải phóng mặt bằng trên địa bàn tỉnh. Bấm vào chỉ số để xem danh sách hồ sơ.</div></div>
      </div>
      <div className="luoi" style={{ marginBottom: 16, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        <TheKpi bt="thua" nhan="Mặt bằng đã bàn giao (m²)" gt={Math.round(cong((x) => x.tk.dtDaBanGiao))} ms={Math.round(cong((x) => x.tk.dtThuHoi))} tong="xanh" phu="Diện tích đã bàn giao / diện tích thu hồi" bam={() => di({ ten: "ds-ho", trangThai: "HOAN_THANH" })} />
        <TheKpi bt="nguoi" nhan="Hộ đã hoàn thành GPMB" gt={dem.HOAN_THANH} ms={soHo} tong="xanh" phu={`Đã bàn giao mặt bằng · ${dem.CHO_BAN_GIAO} hộ đã chi trả, chờ bàn giao`} bam={() => di({ ten: "ds-ho", trangThai: "HOAN_THANH" })} />
        <TheKpi bt="hoSo" nhan="Hồ sơ đang xử lý" gt={dem.DANG_XU_LY} ms={soHo} tong="vang" phu="Từ lập phương án đến chi trả" bam={() => di({ ten: "ds-ho", trangThai: "DANG_XU_LY" })} />
        <TheKpi bt="canhBao" nhan="Vướng mắc cần ưu tiên" gt={dem.VUONG_MAC} ms={soHo} tong="do" phu="Ghi vướng mắc, thiếu căn cứ, quá hạn" bam={() => di({ ten: "ds-ho", trangThai: "VUONG_MAC" })} />
        <TheKpi bt="thua" nhan="Thửa đất đã kiểm đếm" gt={cong((x) => x.tk.soThuaDaKiemDem)} ms={cong((x) => x.tk.soThua)} tong="duong" phu={`Giá trị tạm tính: ${tien(tongTien)} đ`} bam={() => di({ ten: "ds-ho", chang: "4" })} />
      </div>

      <div className="the tq-quy-trinh">
        <div className="tq-qt-dau"><span className="bt"><BieuTuong ten="phuongAn" co={18} /></span><h2>Quy trình bồi thường, GPMB</h2><span className="mo chu-nho">Số hộ đã hoàn thành từng chặng · bấm để xem danh sách</span></div>
        <div className="tq-chang">
          {chang.map((c, i) => {
            const pt = soHo ? Math.round((c.soHo / soHo) * 100) : 0;
            return (
              <button key={c.buoc} className="tq-chang-muc" onClick={() => di({ ten: "ds-ho", chang: c.buoc })} title={`Xem các hộ đã qua chặng ${c.ten}`}>
                <div className="tq-chang-dong">
                  <span className="so">{i + 1}</span>
                  <span className="bt"><BieuTuong ten={["hoSo", "kiemDem", "phuongAn", "pheDuyet", "chiTra", "banGiao"][i]!} co={20} /></span>
                  <span className="nd"><b>{c.ten}</b><small>{c.soHo} / {soHo} hộ</small></span>
                  {i < chang.length - 1 && <span className="mui"><BieuTuong ten="phai" co={16} /></span>}
                </div>
                <div className="tq-kpi-thanh"><div className="thanh"><span style={{ width: `${pt}%` }} /></div><span>{pt}%</span></div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="luoi luoi-2" style={{ marginBottom: 20 }} ref={dsRef}>
        <div className="the the-cb do">
          <div className="the-dau"><h3><BieuTuong ten="canhBao" co={16} /> Cần xử lý ngay</h3><span className="dem-cb">{cao.length}</span></div>
          <div className="bang-cuon" style={{ maxHeight: 330 }}>{cao.map(dongCB)}{cao.length === 0 && <div className="trong">Không có việc quá hạn, vướng mắc cần xử lý ngay.</div>}</div>
        </div>
        <div className="the the-cb vang">
          <div className="the-dau"><h3><BieuTuong ten="dongHo" co={16} /> Cần theo dõi</h3><span className="dem-cb">{theoDoi.length}</span></div>
          <div className="bang-cuon" style={{ maxHeight: 330 }}>{theoDoi.map(dongCB)}{theoDoi.length === 0 && <div className="trong">Không có việc sắp đến hạn.</div>}</div>
        </div>
      </div>

      <div className="luoi" style={{ gridTemplateColumns: "360px minmax(0,1fr)" }}>
        <div className="luoi" style={{ alignContent: "start" }}>
          <div className="the">
            <div className="the-dau"><h3>Hiện trạng hồ sơ</h3><span className="mo chu-nho">{soHo} hộ · bấm để xem</span></div>
            <div className="the-than"><PhanBoTrangThai dem={dem} tong={soHo} chon={(t) => di({ ten: "ds-ho", trangThai: t })} /></div>
          </div>
          <div className="the">
            <div className="the-dau"><h3>Tiến độ chung</h3></div>
            <div className="the-than"><VongTienDo tyLe={tienDo} nhan="Số bước đã xong / tổng số bước của mọi hộ" /></div>
          </div>
        </div>

        <div className="the" style={{ alignSelf: "start" }}>
          <div className="the-dau"><h2>Dự án</h2><span className="mo chu-nho">{dsDuAn.length}</span><div className="phai"><button className="nut nut-nho" onClick={() => di({ ten: "du-an" })}>Mở danh sách dự án</button></div></div>
          <div className="the-than luoi" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
            {duLieu.length === 0 && <div className="trong">{dangTai ? "Đang tải…" : "Chưa có dự án. Tạo dự án mới hoặc nạp dữ liệu mẫu để xem thử."}</div>}
            {duLieu.map(({ d, tk, tong, cb }) => (
              <div key={d.id} className="the the-du-an" data-du-an-id={d.id} onClick={() => di({ ten: "du-an", duAnId: d.id })}>
                <div className="bang-dk-dau">
                  <h3 className="gian">{d.ten}</h3>
                  {cb.some((c) => c.muc === "CAO") && <span className="nhan nhan-do">{cb.filter((c) => c.muc === "CAO").length} cảnh báo</span>}
                </div>
                <div className="dong"><span>{d.xa} · {tk.soHo} hộ · {tk.soThua} thửa</span><b style={{ color: "var(--chu)" }}>{tien(tong)} đ</b></div>
                <PhanBoTrangThaiGon dem={tk.theoTrangThai} tong={tk.soHo} />
                <div className="dong"><span>Tiến độ chung {Math.round(tk.tienDoChung * 100)}%</span><span>TB thu hồi: {ngayVN(d.ngayThongBao) || "—"}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {taoMoi && <HopTaoDuAn dong={() => setTaoMoi(false)} />}
    </div>
  );
}

export function PhanBoTrangThaiGon({ dem, tong }: { dem: Record<TrangThaiGpmb, number>; tong: number }) {
  return (
    <div className="thanh-xep" style={{ height: 8, margin: "10px 0 6px" }} title={THU_TU_TRANG_THAI.map((t) => `${TT_GPMB[t].ten}: ${dem[t]}`).join(" · ")}>
      {tong === 0 && <span style={{ flex: 1, background: "var(--xam-nen)" }} />}
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
  const { hopLe, heSoKhac1, thieuLyDoLamTron } = kiemTraDuAn(d);
  return (
    <HopThoai
      tieuDe={duAn ? "Thông tin dự án" : "Dự án mới"}
      dong={dong}
      rong={760}
      chan={
        <>
          <button className="nut" onClick={dong}>Hủy</button>
          <button className="nut nut-chinh" disabled={!hopLe || (!!heSoKhac1 && !d.heSoGiaDat?.vanBan) || thieuLyDoLamTron} onClick={async () => { await luuDuAn(d); dong(); if (!duAn) di({ ten: "du-an", duAnId: d.id, tab: "thong-tin" }); }}>Lưu</button>
        </>
      }
    >
      <FormDuAn d={d} setD={setD} />
    </HopThoai>
  );
}

export function kiemTraDuAn(d: DuAn) {
  const hopLe = !!(d.ten.trim() && d.xa);
  const heSoKhac1 = !!(d.heSoGiaDat && d.heSoGiaDat.heSo && d.heSoGiaDat.heSo !== "1");
  const thieuLyDoLamTron = !!d.lamTron && !d.lamTron.lyDo.trim();
  return { hopLe, heSoKhac1, thieuLyDoLamTron, luuDuoc: hopLe && (!heSoKhac1 || !!d.heSoGiaDat?.vanBan) && !thieuLyDoLamTron };
}

/** Các trường thông tin dự án (dùng trong hộp "Dự án mới" và thẻ Thông tin dự án ở không gian Hồ sơ). */
export function FormDuAn({ d, setD }: { d: DuAn; setD: (d: DuAn) => void }) {
  const { heSoKhac1, thieuLyDoLamTron } = kiemTraDuAn(d);
  return (
      <div className="luoi luoi-2">
        <O nhan="Tên dự án *" className="ca-hang"><input value={d.ten} onChange={(e) => setD({ ...d, ten: e.target.value })} /></O>
        <O nhan="Loại dự án" goiY="Dùng cho biểu tượng, lọc danh sách">
          <Chon value={d.loaiDuAn ?? ""} onChange={(e) => setD({ ...d, loaiDuAn: (e.target.value || undefined) as DuAn["loaiDuAn"] })}>
            <option value="">— Chọn —</option>
            {(Object.keys(TEN_LOAI_DU_AN) as (keyof typeof TEN_LOAI_DU_AN)[]).map((k) => <option key={k} value={k}>{TEN_LOAI_DU_AN[k]}</option>)}
          </Chon>
        </O>
        <O nhan="Trạng thái dự án">
          <Chon value={d.trangThaiDuAn ?? "DANG_TRIEN_KHAI"} onChange={(e) => setD({ ...d, trangThaiDuAn: e.target.value as NonNullable<DuAn["trangThaiDuAn"]> })}>
            {(Object.keys(TEN_TRANG_THAI_DU_AN) as (keyof typeof TEN_TRANG_THAI_DU_AN)[]).map((k) => <option key={k} value={k}>{TEN_TRANG_THAI_DU_AN[k]}</option>)}
          </Chon>
        </O>
        <O nhan="Xã, phường *" goiY="Danh mục 75 xã, phường theo NQ 152/2025">
          <Chon value={d.xa} onChange={(e) => setD({ ...d, xa: e.target.value })}>
            <option value="">— Chọn —</option>
            {DANH_MUC_XA.map((x) => <option key={x}>{x}</option>)}
          </Chon>
        </O>
        <O nhan="Chủ đầu tư"><input value={d.chuDauTu} onChange={(e) => setD({ ...d, chuDauTu: e.target.value })} /></O>
        <O nhan="Căn cứ thu hồi (thông báo, kế hoạch)"><input value={d.canCuThuHoi} onChange={(e) => setD({ ...d, canCuThuHoi: e.target.value })} /></O>
        <O nhan="Ngày thông báo thu hồi đất" goiY="Dùng xác định mốc hỗ trợ nhà, công trình (QĐ 14/2026)"><input type="date" value={d.ngayThongBao} onChange={(e) => setD({ ...d, ngayThongBao: e.target.value })} /></O>
        <O nhan="Giá gạo tẻ trung bình (đ/kg)" goiY="Theo văn bản của Sở Tài chính (TL-26)">
          <OSo canhBao={(v) => (Number(v) < 1000 ? "Nhỏ hơn 1.000 đ/kg — kiểm tra cách ghi số" : null)} value={d.giaGao?.dongKg ?? ""} onChange={(v) => setD({ ...d, giaGao: v ? { dongKg: v, nguon: d.giaGao?.nguon ?? "" } : null })} />
        </O>
        <O nhan="Văn bản giá gạo"><input value={d.giaGao?.nguon ?? ""} disabled={!d.giaGao} onChange={(e) => setD({ ...d, giaGao: { dongKg: d.giaGao!.dongKg, nguon: e.target.value } })} /></O>
        <O nhan="Hạn mức giao đất NN (m²)" goiY="Dùng giới hạn diện tích hỗ trợ chuyển đổi nghề">
          <OSo canhBao={(v) => (Number(v) < 100 ? "Nhỏ hơn 100 m² — kiểm tra đơn vị (m²) và cách ghi số" : null)} value={d.hanMucNN?.m2 ?? ""} onChange={(v) => setD({ ...d, hanMucNN: v ? { m2: v, canCu: d.hanMucNN?.canCu ?? "" } : null })} />
        </O>
        <O nhan="Căn cứ hạn mức"><input value={d.hanMucNN?.canCu ?? ""} disabled={!d.hanMucNN} onChange={(e) => setD({ ...d, hanMucNN: { m2: d.hanMucNN!.m2, canCu: e.target.value } })} /></O>
        <O nhan="Hệ số điều chỉnh giá đất" goiY="Mặc định 1. Khác 1 phải ghi văn bản (QD-02)">
          <OSo className="o-so" value={d.heSoGiaDat?.heSo ?? "1"} onChange={(v) => setD({ ...d, heSoGiaDat: { heSo: v, vanBan: d.heSoGiaDat?.vanBan ?? "" } })} />
        </O>
        <O nhan="Làm tròn tổng tiền từng hộ" goiY="Mặc định QD-03: làm tròn lên đến 1.000 đ (VM-36)">
          <Chon value={d.lamTron?.cach ?? ""} onChange={(e) => setD({ ...d, lamTron: e.target.value ? { cach: e.target.value as NonNullable<DuAn["lamTron"]>["cach"], lyDo: d.lamTron?.lyDo ?? "" } : undefined })}>
            <option value="">Theo bộ chính sách (làm tròn lên đến 1.000 đ)</option>
            {(Object.keys(TEN_CACH_LAM_TRON) as (keyof typeof TEN_CACH_LAM_TRON)[]).map((k) => <option key={k} value={k}>{TEN_CACH_LAM_TRON[k]}{k === "KHONG" ? "" : " đến 1.000 đ"}</option>)}
          </Chon>
        </O>
        <O nhan="Lý do, căn cứ cách làm tròn"><input className={thieuLyDoLamTron ? "loi-nhap" : ""} value={d.lamTron?.lyDo ?? ""} disabled={!d.lamTron} onChange={(e) => setD({ ...d, lamTron: { cach: d.lamTron!.cach, lyDo: e.target.value } })} /></O>
        <O nhan="Văn bản quyết định hệ số"><input className={heSoKhac1 && !d.heSoGiaDat?.vanBan ? "loi-nhap" : ""} value={d.heSoGiaDat?.vanBan ?? ""} onChange={(e) => setD({ ...d, heSoGiaDat: { heSo: d.heSoGiaDat?.heSo ?? "1", vanBan: e.target.value } })} /></O>
      </div>
  );
}

import { useMemo, useState } from "react";
import { D } from "@gpmb/core";
import { useUngDung } from "../ung-dung";
import { tinhHo } from "../tinh-ho";
import { CAC_BUOC, buocHienTai, taoId, type DuAn } from "../mo-hinh";
import { taoDuAnMau } from "../du-lieu-mau";
import { DANH_MUC_XA } from "../du-lieu";
import { HopThoai, O, ngayVN, tien } from "../thanh-phan/chung";

export function TongQuan() {
  const { dsDuAn, hoCua, di, chinhSach, luuDuAn, kho, dangTai } = useUngDung();
  const [taoMoi, setTaoMoi] = useState(false);

  const thongKe = useMemo(() => {
    return dsDuAn.map((d) => {
      const hos = hoCua(d.id);
      const kq = hos.map((h) => ({ h, k: tinhHo(chinhSach(d), d, h) }));
      return {
        d,
        soHo: hos.length,
        tong: kq.reduce((s, x) => s.plus(x.k.tong.tongLamTron), D(0)),
        canXacNhan: kq.reduce((s, x) => s + x.k.tong.soDongCanXacNhan + x.k.tong.soDongThieuCanCu, 0),
        buoc: hos.length ? Math.min(...hos.map(buocHienTai)) : 0,
        dangCho: kq.filter((x) => Object.values(x.h.tienDo).some((b) => b.trangThai === "CHO_DUYET")),
        viec: kq.filter((x) => !x.k.tong.duocChot),
        dtThuHoi: hos.flatMap((h) => h.thua).reduce((s, t) => s.plus(t.dienTichThuHoi || "0"), D(0)),
      };
    });
  }, [dsDuAn, hoCua, chinhSach]);

  const napMau = async () => {
    const { duAn, ho } = taoDuAnMau();
    await kho.luuDuAn(duAn);
    for (const h of ho) await kho.luuHo(h);
    await luuDuAn(duAn);
  };

  const tongHo = thongKe.reduce((s, x) => s + x.soHo, 0);
  const tongTien = thongKe.reduce((s, x) => s.plus(x.tong), D(0));
  const tongViec = thongKe.reduce((s, x) => s + x.canXacNhan, 0);
  const tongDt = thongKe.reduce((s, x) => s.plus(x.dtThuHoi), D(0));

  return (
    <div className="trang">
      <div className="dong-tieu-de">
        <div>
          <h1>Tổng quan công tác bồi thường, GPMB</h1>
          <div className="mo-ta">Theo dõi dự án, hồ sơ từng hộ và các khoản cần xác nhận trước khi trình duyệt.</div>
        </div>
        <div className="phai">
          {dsDuAn.length === 0 && !dangTai && (
            <button className="nut" onClick={napMau}>Nạp dữ liệu mẫu (ẩn danh)</button>
          )}
          <button className="nut nut-chinh" onClick={() => setTaoMoi(true)}>+ Dự án mới</button>
        </div>
      </div>

      <div className="luoi luoi-4" style={{ marginBottom: 14 }}>
        <div className="the chi-so"><div className="nhan-chi-so">Dự án đang thực hiện</div><div className="gia-tri">{dsDuAn.length}</div></div>
        <div className="the chi-so"><div className="nhan-chi-so">Hộ, cá nhân, tổ chức</div><div className="gia-tri">{tongHo}</div></div>
        <div className="the chi-so"><div className="nhan-chi-so">Diện tích thu hồi (m²)</div><div className="gia-tri">{tien(tongDt)}</div></div>
        <div className="the chi-so"><div className="nhan-chi-so">Giá trị tạm tính (đồng)</div><div className="gia-tri">{tien(tongTien)}</div></div>
      </div>

      <div className="luoi luoi-chinh">
        <div className="the">
          <div className="the-dau"><h2>Dự án</h2></div>
          <div className="the-than luoi luoi-2">
            {thongKe.length === 0 && <div className="trong" style={{ gridColumn: "1/-1" }}>{dangTai ? "Đang tải…" : "Chưa có dự án. Tạo dự án mới hoặc nạp dữ liệu mẫu để xem thử."}</div>}
            {thongKe.map(({ d, soHo, tong, buoc, canXacNhan, dtThuHoi }) => (
              <div key={d.id} className="the the-du-an" onClick={() => di({ ten: "du-an", duAnId: d.id })}>
                <h3>{d.ten}</h3>
                <div className="dong"><span>{d.xa}</span><span>TB thu hồi: {ngayVN(d.ngayThongBao) || "—"}</span></div>
                <div className="dong"><span>{soHo} hộ · {tien(dtThuHoi)} m²</span><b style={{ color: "var(--chu)" }}>{tien(tong)} đ</b></div>
                <div className="thanh-tien-do" title={`Bước chậm nhất: ${CAC_BUOC[buoc]?.ten ?? "Hoàn thành"}`}>
                  {CAC_BUOC.map((b, i) => <span key={b.ma} className={i < buoc ? "xong" : i === buoc ? "dang" : ""} />)}
                </div>
                <div className="dong">
                  <span>Bước: {CAC_BUOC[buoc] ? `${CAC_BUOC[buoc]!.ma}. ${CAC_BUOC[buoc]!.ten}` : "Hoàn thành"}</span>
                  {canXacNhan > 0 ? <span className="nhan nhan-vang">{canXacNhan} khoản cần xử lý</span> : <span className="nhan nhan-xanh">Đủ căn cứ</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="the">
          <div className="the-dau"><h2>Việc cần xử lý</h2><div className="phai"><span className="nhan nhan-vang">{tongViec}</span></div></div>
          <div className="bang-cuon" style={{ maxHeight: 520 }}>
            <table className="bang">
              <tbody>
                {thongKe.flatMap(({ d, viec, dangCho }) => [
                  ...dangCho.map(({ h }) => (
                    <tr key={"c" + h.id} className="co-the-chon" onClick={() => di({ ten: "ho", duAnId: d.id, hoId: h.id, tab: "tien-do" })}>
                      <td><span className="nhan nhan-tim">Chờ duyệt</span></td>
                      <td>{h.ma} · {h.ten}<div className="mo chu-nho">{d.ten}</div></td>
                    </tr>
                  )),
                  ...viec.map(({ h, k }) => (
                    <tr key={h.id} className="co-the-chon" onClick={() => di({ ten: "ho", duAnId: d.id, hoId: h.id, tab: "tinh" })}>
                      <td><span className={`nhan ${k.tong.soDongThieuCanCu ? "nhan-do" : "nhan-vang"}`}>{k.tong.soDongThieuCanCu + k.tong.soDongCanXacNhan} khoản</span></td>
                      <td>{h.ma} · {h.ten}<div className="mo chu-nho">{k.tong.soDongThieuCanCu ? `${k.tong.soDongThieuCanCu} thiếu căn cứ` : ""}{k.tong.soDongThieuCanCu && k.tong.soDongCanXacNhan ? ", " : ""}{k.tong.soDongCanXacNhan ? `${k.tong.soDongCanXacNhan} cần xác nhận` : ""}</div></td>
                    </tr>
                  )),
                ])}
                {tongViec === 0 && <tr><td className="trong">Không có việc tồn đọng.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {taoMoi && <HopTaoDuAn dong={() => setTaoMoi(false)} />}
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

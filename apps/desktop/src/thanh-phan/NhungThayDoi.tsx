import type { MucThayDoi } from "../nhung-thay-doi";

/** Danh sách thay đổi theo phiên bản (hộp cập nhật, Giới thiệu). */
export function DsThayDoi({ muc }: { muc: MucThayDoi[] }) {
  return (
    <div className="cap-nhat-ghi-chu chu-nho" data-thay-doi>
      {muc.map((m) => (
        <div key={m.pb}>
          <b>Phiên bản {m.pb}</b>
          <ul style={{ margin: "2px 0 6px", paddingLeft: 18 }}>{m.dong.map((d, i) => <li key={i}>{d}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

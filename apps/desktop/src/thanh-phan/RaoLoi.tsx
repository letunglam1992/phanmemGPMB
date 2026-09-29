import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Rào lỗi giao diện (P0-1): một lỗi khi vẽ chỉ làm hỏng vùng được rào (màn, thẻ) — không trắng cả phần mềm,
 * không mất trạng thái của thành phần cha (hồ sơ đang sửa). Đổi `khoa` (chuyển màn, chuyển thẻ) thì tự thử lại.
 * Chi tiết lỗi chỉ chép vào bộ nhớ tạm theo yêu cầu, không gửi đi đâu.
 */
export class RaoLoi extends Component<{ ten: string; khoa?: string; khiLoi?: (thongDiep: string) => void; children: ReactNode }, { loi: Error | null }> {
  state: { loi: Error | null } = { loi: null };

  static getDerivedStateFromError(loi: Error) {
    return { loi };
  }

  componentDidCatch(loi: Error, info: ErrorInfo) {
    console.error(`Lỗi giao diện (${this.props.ten})`, loi, info.componentStack);
    this.props.khiLoi?.(`${this.props.ten}: ${loi.message}`.slice(0, 300));
  }

  componentDidUpdate(truoc: { khoa?: string }) {
    if (this.state.loi && truoc.khoa !== this.props.khoa) this.setState({ loi: null });
  }

  render() {
    const { loi } = this.state;
    if (!loi) return this.props.children;
    return (
      <div className="the rao-loi" role="alert">
        <div className="the-than">
          <h3 className="mt-0">Không hiển thị được {this.props.ten}</h3>
          <p className="mo">
            Có lỗi khi hiển thị phần này: <code>{loi.message}</code>. Dữ liệu đang nhập của hồ sơ vẫn được giữ — bấm “Thử lại” hoặc chuyển thẻ; nếu lỗi lặp lại, kiểm tra số liệu vừa nhập (thường là ô số nhập sai định dạng).
          </p>
          <div className="nhom-nut">
            <button className="nut nut-chinh" onClick={() => this.setState({ loi: null })}>Thử lại</button>
            <button className="nut" onClick={() => void navigator.clipboard?.writeText(`${this.props.ten}\n${loi.message}\n${loi.stack ?? ""}`)}>Chép chi tiết lỗi</button>
          </div>
        </div>
      </div>
    );
  }
}

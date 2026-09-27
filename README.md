# Phần mềm GPMB Sơn La

Ứng dụng Windows (cài đặt bằng `.exe`) hỗ trợ công tác thu hồi đất, bồi thường, hỗ trợ, tái định cư trên địa bàn tỉnh Sơn La.

> **Trạng thái: Giai đoạn 2 – Phân tích nghiệp vụ, dữ liệu chính sách, lõi tính toán.**
> Chỉ các quy tắc đã có văn bản và cách áp dụng được người dùng xác nhận (docs/06) mới được mã hóa trong lõi tính toán.

## Tài liệu giai đoạn 1

| Tệp | Nội dung |
|---|---|
| [docs/00-tong-quan.md](docs/00-tong-quan.md) | Diễn giải nhu cầu, nguyên tắc pháp lý, tiêu chí chất lượng đo được |
| [docs/01-danh-muc-tai-lieu.md](docs/01-danh-muc-tai-lieu.md) | Danh mục tài liệu: đã nhận / còn thiếu / cần bản gốc |
| [docs/02-ma-tran-nghiep-vu-so-bo.md](docs/02-ma-tran-nghiep-vu-so-bo.md) | Bảng nghiệp vụ — điều kiện — đầu vào — cách tính — đầu ra — căn cứ — cần xác nhận (sơ bộ, từ tài liệu đã nhận) |
| [docs/03-so-vuong-mac.md](docs/03-so-vuong-mac.md) | Sổ theo dõi điểm thiếu, mâu thuẫn, chưa rõ cách áp dụng |
| [docs/04-pham-vi-kien-truc-lo-trinh.md](docs/04-pham-vi-kien-truc-lo-trinh.md) | Phạm vi phiên bản 1, hướng giao diện, kiến trúc sơ bộ, lộ trình |
| [docs/05-quy-trinh-thoi-han.md](docs/05-quy-trinh-thoi-han.md) | 16 bước, thời hạn luật định, 22 mẫu biểu (Sổ tay QĐ 1966/QĐ-UBND) |
| [docs/06-quyet-dinh-nghiep-vu.md](docs/06-quyet-dinh-nghiep-vu.md) | Quyết định nghiệp vụ đã được người dùng xác nhận |
| [docs/07-du-lieu-chinh-sach.md](docs/07-du-lieu-chinh-sach.md) | Dữ liệu đơn giá, bảng giá đất đã trích xuất; quy tắc giá đất NQ 152 |

## Dữ liệu và công cụ

- `policy/nguon/` – dữ liệu chính sách trích xuất từ văn bản gốc (chờ đối chiếu trước khi kích hoạt)
- `tools/extract/` – script trích xuất (Python + PyMuPDF, python-docx), chạy lại được khi có văn bản mới
- `templates/nguon/` – văn bản gốc dùng dựng mẫu biểu (Sổ tay QĐ 1966/QĐ-UBND)

## Lõi tính toán (`packages/core`)

TypeScript thuần, số thập phân chính xác (`decimal.js`), không phụ thuộc giao diện/CSDL. Mỗi khoản tính trả về **dòng tính có giải trình** (tham số, công thức, căn cứ, trạng thái, lựa chọn của người dùng). Tham số lấy từ bộ chính sách `policy/goi/*.json`.

```bash
npm install
npm test          # kiểm thử lõi tính toán + đối chiếu dữ liệu với văn bản gốc
npm run typecheck
```

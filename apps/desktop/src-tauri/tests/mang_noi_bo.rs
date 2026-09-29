//! Kiểm thử đầu–cuối máy chủ mạng nội bộ: khởi động HTTPS thật trên cổng trống, gọi qua máy trạm
//! (ghim vân tay), kiểm tra đăng nhập, quyền, quy tắc nghiệp vụ, xung đột, nhật ký.

use gpmb_sonla_lib::{ket_noi, may_chu};
use serde_json::{json, Value};
use sha2::Sha256;

const VONG: u32 = 100_000;

fn tai_khoan(ten: &str, vai_tro: &str, mk: &str) -> Value {
    let muoi = [7u8; 16];
    let mut out = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<Sha256>(mk.as_bytes(), &muoi, VONG, &mut out);
    let hex = |b: &[u8]| b.iter().map(|x| format!("{x:02x}")).collect::<String>();
    json!({ "ten": ten, "hoTen": format!("Người {ten}"), "chucVu": "", "vaiTro": vai_tro, "hoatDong": true,
            "muoi": hex(&muoi), "vongLap": VONG, "bam": hex(&out), "taoLuc": "2026-09-27T00:00:00.000Z" })
}

/// Hồ sơ tối thiểu đúng cấu trúc (P1-8).
fn ho_mau(id: &str, ma: &str) -> Value {
    json!({ "id": id, "duAnId": "da1", "ma": ma, "ten": format!("Hộ {ma}"), "loai": "HO_GIA_DINH", "nhanKhau": [], "thua": [], "taiSan": [],
            "nhatKy": [], "hoTro": { "chuyenDoiNghe": false }, "khauTru": "" })
}

/// Lô ghi một bản ghi con (P2-7): tiến độ "td" hoặc chi trả "ct" của hồ sơ `id`.
fn lo_con(loai: &str, id: &str, noi_dung: Value, pb: Option<i64>) -> Value {
    let truong = if loai == "td" { "tienDo" } else { "chiTra" };
    json!({ "ghi": [{ "loai": loai, "duLieu": { "id": id, "duAnId": "da1", truong: noi_dung, "nhatKy": [] }, "phienBanTruoc": pb }] })
}

struct May {
    dia_chi: String,
    van_tay: String,
}

impl May {
    async fn goi(&self, pt: &str, dd: &str, token: Option<&str>, than: Value) -> (u16, Value) {
        let (a, v, pt, dd, t) = (self.dia_chi.clone(), self.van_tay.clone(), pt.to_string(), dd.to_string(), token.map(String::from));
        let b = if than.is_null() { vec![] } else { than.to_string().into_bytes() };
        let r = tokio::task::spawn_blocking(move || ket_noi::goi(&a, &v, &pt, &dd, t.as_deref(), None, &b)).await.unwrap().unwrap();
        (r.ma, serde_json::from_slice(&r.than).unwrap_or(Value::Null))
    }
    async fn dang_nhap(&self, ten: &str, mk: &str) -> String {
        let (ma, v) = self.goi("POST", "/api/dang-nhap", None, json!({ "ten": ten, "matKhau": mk })).await;
        assert_eq!(ma, 200, "{v}");
        v["token"].as_str().unwrap().to_string()
    }
}

fn cong_trong() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port()
}

#[tokio::test(flavor = "multi_thread")]
async fn may_chu_dau_cuoi() {
    let dir = std::env::temp_dir().join(format!("gpmb-may-chu-kt-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let cong = cong_trong();
    let d = may_chu::khoi_dong(dir.clone(), cong).await.unwrap();
    let m = May { dia_chi: format!("127.0.0.1:{cong}"), van_tay: d.van_tay.clone() };

    // vân tay đọc từ máy trạm khớp vân tay máy chủ; vân tay sai bị từ chối
    let dc = m.dia_chi.clone();
    assert_eq!(tokio::task::spawn_blocking(move || ket_noi::doc_van_tay(&dc)).await.unwrap().unwrap(), d.van_tay);
    let dc = m.dia_chi.clone();
    let sai = tokio::task::spawn_blocking(move || ket_noi::goi(&dc, "00:11", "GET", "/api/trang-thai", None, None, &[])).await.unwrap();
    assert!(sai.is_err_and(|e| e.contains("KHÔNG KHỚP") || e.contains("Không kết nối")));

    let (_, tt) = m.goi("GET", "/api/trang-thai", None, Value::Null).await;
    assert_eq!(tt["coTaiKhoan"], false);

    // chưa đăng nhập → 401
    assert_eq!(m.goi("GET", "/api/du-an", None, Value::Null).await.0, 401);

    // khởi tạo quản trị (từ chính máy chủ), tạo tài khoản khác
    let (ma, v) = m.goi("POST", "/api/khoi-tao", None, tai_khoan("quantri", "QUAN_TRI", "Gpmb2026qt")).await;
    assert_eq!(ma, 200, "{v}");
    assert!(v["nguoiDung"].get("bam").is_none(), "không trả băm mật khẩu");
    let qt = v["token"].as_str().unwrap().to_string();
    assert_eq!(m.goi("POST", "/api/khoi-tao", None, tai_khoan("x", "QUAN_TRI", "Abcdef123")).await.0, 409);
    for (ten, vt) in [("canbo1", "CAN_BO"), ("lanhdao", "LANH_DAO"), ("lanhdao2", "LANH_DAO"), ("xem1", "XEM")] {
        let (ma, v) = m.goi("PUT", &format!("/api/nguoi-dung/{ten}"), Some(&qt), tai_khoan(ten, vt, "Matkhau2026")).await;
        assert_eq!(ma, 200, "{v}");
    }
    // không được khóa quản trị cuối cùng
    let mut qt_khoa = tai_khoan("quantri", "QUAN_TRI", "Gpmb2026qt");
    qt_khoa["hoatDong"] = json!(false);
    assert_eq!(m.goi("PUT", "/api/nguoi-dung/quantri", Some(&qt), qt_khoa).await.0, 409);

    // sai mật khẩu
    assert_eq!(m.goi("POST", "/api/dang-nhap", None, json!({ "ten": "canbo1", "matKhau": "sai" })).await.0, 401);
    let cb = m.dang_nhap("canbo1", "Matkhau2026").await;
    let ld = m.dang_nhap("lanhdao", "Matkhau2026").await;
    let ld2 = m.dang_nhap("lanhdao2", "Matkhau2026").await;
    let xem = m.dang_nhap("xem1", "Matkhau2026").await;
    // cán bộ không xem được danh sách tài khoản khác
    assert_eq!(m.goi("GET", "/api/nguoi-dung", Some(&cb), Value::Null).await.1.as_array().unwrap().len(), 1);

    // dự án, hồ sơ; chỉ xem không ghi được
    let du_an = json!({ "id": "da1", "ten": "Dự án thử" });
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&xem), json!({ "duLieu": du_an })).await.0, 403);
    let (ma, v) = m.goi("PUT", "/api/du-an/da1", Some(&cb), json!({ "duLieu": du_an })).await;
    assert_eq!((ma, v["phienBan"].as_i64()), (200, Some(1)));
    let ho = ho_mau("h1", "H01");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": ho })).await.0, 200);

    // xung đột: hai người cùng sửa từ phiên bản 1
    let mut ho_a = ho.clone();
    ho_a["ten"] = json!("Sửa bởi cán bộ");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": ho_a, "phienBanTruoc": 1 })).await.0, 200);
    let mut ho_b = ho.clone();
    ho_b["ten"] = json!("Sửa bởi lãnh đạo");
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&ld), json!({ "duLieu": ho_b, "phienBanTruoc": 1 })).await;
    assert_eq!(ma, 409, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("canbo1"));

    // bước (bản ghi tiến độ "td", P2-7): cán bộ gửi duyệt được, không tự xác nhận; máy chủ ghi người gửi theo phiên
    let (ma, v) = m.goi("POST", "/api/lo", Some(&cb), lo_con("td", "h1", json!({ "5": { "trangThai": "CHO_DUYET", "guiBoi": "gia-mao" } }), None)).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["phienBan"][0]["duLieu"]["tienDo"]["5"]["guiBoi"], "canbo1");
    let mut td3 = v["phienBan"][0]["duLieu"]["tienDo"].clone();
    td3["5"]["trangThai"] = json!("XONG");
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), lo_con("td", "h1", td3.clone(), Some(1))).await.0, 403);
    let (ma, v) = m.goi("POST", "/api/lo", Some(&ld), lo_con("td", "h1", td3, Some(1))).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["phienBan"][0]["duLieu"]["tienDo"]["5"]["duyetBoi"], "lanhdao");
    // lãnh đạo tự gửi rồi tự duyệt → bị chặn; lãnh đạo khác duyệt được
    let mut td4 = v["phienBan"][0]["duLieu"]["tienDo"].clone();
    td4["6"] = json!({ "trangThai": "CHO_DUYET" });
    let v = m.goi("POST", "/api/lo", Some(&ld), lo_con("td", "h1", td4, Some(2))).await.1;
    let mut td5 = v["phienBan"][0]["duLieu"]["tienDo"].clone();
    td5["6"]["trangThai"] = json!("XONG");
    assert_eq!(m.goi("POST", "/api/lo", Some(&ld), lo_con("td", "h1", td5.clone(), Some(3))).await.0, 403);
    assert_eq!(m.goi("POST", "/api/lo", Some(&ld2), lo_con("td", "h1", td5, Some(3))).await.0, 200);
    // P2-7: hồ sơ chính không được chứa tiến độ nhúng (máy trạm cũ) → 400, nêu cần cập nhật phần mềm
    let mut nhung = ho_a.clone();
    nhung["tienDo"] = json!({});
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": nhung, "phienBanTruoc": 2 })).await;
    assert_eq!(ma, 400, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("cập nhật phần mềm"));
    // P2-7: sửa song song — cán bộ sửa thông tin (bản ghi chính), lãnh đạo ghi chi trả (ct): không ai bị xung đột
    let mut a = ho_a.clone();
    a["diaChi"] = json!("Bản mới");
    let r1 = m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": a, "phienBanTruoc": 2 })).await.0;
    let r2 = m.goi("POST", "/api/lo", Some(&ld), lo_con("ct", "h1", json!({ "dot": [] }), None)).await.0;
    assert_eq!((r1, r2), (200, 200));

    // phương án (P1-6: mỗi bản một bản ghi "pa"): cán bộ không chốt; lãnh đạo chốt, phê duyệt; bản đã duyệt không sửa
    let pa = json!({ "id": "p1", "so": 1, "trangThai": "DA_CHOT", "tong": "1000", "ho": [] });
    let lo_pa = |p: &Value, pb: Option<i64>| json!({ "ghi": [{ "loai": "pa", "duLieu": { "id": "p1", "duAnId": "da1", "pa": p }, "phienBanTruoc": pb }] });
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), lo_pa(&pa, None)).await.0, 403);
    let (ma, v) = m.goi("POST", "/api/lo", Some(&ld), lo_pa(&pa, None)).await;
    assert_eq!(ma, 200, "{v}");
    let mut sua_so = pa.clone();
    sua_so["tong"] = json!("999");
    sua_so["trangThai"] = json!("DA_PHE_DUYET");
    assert_eq!(m.goi("POST", "/api/lo", Some(&ld), lo_pa(&sua_so, Some(1))).await.0, 403);
    let mut duyet = pa.clone();
    duyet["trangThai"] = json!("DA_PHE_DUYET");
    duyet["pheDuyet"] = json!({ "so": "12/QĐ-UBND", "ngay": "2026-10-01" });
    assert_eq!(m.goi("POST", "/api/lo", Some(&ld), lo_pa(&duyet, Some(1))).await.0, 200);
    let mut sua_duyet = duyet.clone();
    sua_duyet["tong"] = json!("1");
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), lo_pa(&sua_duyet, Some(2))).await.0, 403);
    let (_, v) = m.goi("GET", "/api/pa?duAn=da1", Some(&xem), Value::Null).await;
    assert_eq!(v[0]["duLieu"]["pa"]["trangThai"], "DA_PHE_DUYET");
    // máy trạm cũ gửi dự án kèm phương án nhúng → từ chối, nêu cần cập nhật phần mềm
    let mut nhung = du_an.clone();
    nhung["phuongAn"] = json!([duyet]);
    let (ma, v) = m.goi("PUT", "/api/du-an/da1", Some(&qt), json!({ "duLieu": nhung, "phienBanTruoc": 1 })).await;
    assert_eq!(ma, 400, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("cập nhật phần mềm"));

    // thay đổi: máy trạm thấy các lần ghi, kèm người ghi
    let (_, td) = m.goi("GET", "/api/thay-doi?sau=0", Some(&xem), Value::Null).await;
    assert!(td["ds"].as_array().unwrap().iter().any(|x| x["boi"] == "lanhdao2"));
    // cán bộ không xóa được dự án
    assert_eq!(m.goi("DELETE", "/api/du-an/da1", Some(&cb), Value::Null).await.0, 403);

    // nhật ký: người thực hiện theo phiên, chuỗi băm nối đúng
    let (_, d1) = m.goi("POST", "/api/nhat-ky", Some(&cb), json!({ "hanhDong": "Nhập Excel", "nguoi": "gia-mao" })).await;
    assert_eq!(d1["nguoi"], "canbo1");
    assert_eq!(m.goi("GET", "/api/nhat-ky", Some(&cb), Value::Null).await.0, 403);
    let (_, nk) = m.goi("GET", "/api/nhat-ky", Some(&qt), Value::Null).await;
    let nk = nk.as_array().unwrap();
    let mut truoc = "0".repeat(64);
    for (i, x) in nk.iter().enumerate() {
        assert_eq!(x["stt"].as_i64().unwrap(), i as i64 + 1);
        assert_eq!(x["bamTruoc"].as_str().unwrap(), truoc);
        let s = |k: &str| x[k].as_str().unwrap().to_string();
        assert_eq!(may_chu::tinh_bam_nhat_ky(x["stt"].as_i64().unwrap(), &s("luc"), &s("nguoi"), &s("hoTen"), &s("hanhDong"), &s("chiTiet"), &s("bamTruoc")), s("bam"));
        truoc = s("bam");
    }
    assert!(nk.iter().any(|x| x["hanhDong"] == "Đăng nhập không thành công"));

    // khóa tài khoản → phiên bị hủy ngay
    let mut khoa = tai_khoan("canbo1", "CAN_BO", "Matkhau2026");
    khoa["hoatDong"] = json!(false);
    assert_eq!(m.goi("PUT", "/api/nguoi-dung/canbo1", Some(&qt), khoa).await.0, 200);
    assert_eq!(m.goi("GET", "/api/du-an", Some(&cb), Value::Null).await.0, 401);

    d.handle.shutdown();
    let _ = std::fs::remove_dir_all(&dir);
}

#[test]
fn bam_nhat_ky_trung_giao_dien() {
    // giá trị tính bằng JSON.stringify + SHA-256 ở Node (src/nhat-ky.ts)
    let b = may_chu::tinh_bam_nhat_ky(3, "2026-09-27T15:49:37.123Z", "canbo1", "Người \"A\"\nB", "Chốt phương án", "bản 1 – 2.827.920.000 đ\t/x", &"ab".repeat(32));
    assert_eq!(b, "7711f09e9fb7b4aa3cc7d106c25ef3b59c9e4dcd7aa3f9d692e415db6fe01766");
}

#[test]
fn mat_khau_trung_giao_dien() {
    // PBKDF2 1000 vòng tính ở Node (WebCrypto cùng thuật toán)
    let u = json!({ "muoi": "00112233445566778899aabbccddeeff", "vongLap": 1000, "bam": "f0cefa2a773993cb679b769828ce6e3454961748d43ee4e2f790ca0c2631b6a0" });
    assert!(may_chu::dung_mat_khau(&u, "Matkhau2026"));
    assert!(!may_chu::dung_mat_khau(&u, "Matkhau2027"));
}

#[test]
fn thoi_diem_dang_iso() {
    let t = may_chu::bay_gio();
    assert_eq!(t.len(), 24);
    assert!(t.ends_with('Z') && t.as_bytes()[10] == b'T');
}

/// P0-6: ghi nhiều bản ghi trong một giao dịch — một bản ghi lỗi thì không bản ghi nào được ghi.
#[tokio::test(flavor = "multi_thread")]
async fn may_chu_ghi_lo_nguyen_tu() {
    let dir = std::env::temp_dir().join(format!("gpmb-may-chu-lo-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let cong = cong_trong();
    let d = may_chu::khoi_dong(dir.clone(), cong).await.unwrap();
    let m = May { dia_chi: format!("127.0.0.1:{cong}"), van_tay: d.van_tay.clone() };
    let qt = m.goi("POST", "/api/khoi-tao", None, tai_khoan("quantri", "QUAN_TRI", "Gpmb2026qt")).await.1["token"].as_str().unwrap().to_string();
    assert_eq!(m.goi("PUT", "/api/nguoi-dung/canbo1", Some(&qt), tai_khoan("canbo1", "CAN_BO", "Matkhau2026")).await.0, 200);
    let cb = m.dang_nhap("canbo1", "Matkhau2026").await;
    let so_ho = || async { m.goi("GET", "/api/ho?duAn=da1", Some(&cb), Value::Null).await.1.as_array().map(|a| a.len()).unwrap_or(0) };

    // lô hợp lệ: dự án + 3 hồ sơ + bản đồ
    let da = json!({ "id": "da1", "ten": "Dự án lô" });
    let ho = ho_mau;
    let (ma, v) = m
        .goi("POST", "/api/lo", Some(&cb), json!({
            "ghi": [{ "loai": "duAn", "duLieu": da }, { "loai": "ho", "duLieu": ho("h1", "H001") }, { "loai": "ho", "duLieu": ho("h2", "H002") }, { "loai": "ho", "duLieu": ho("h3", "H003") }],
            "tep": [{ "loai": "banDo", "id": "da1", "meta": "{}", "noiDung": "AQID" }]
        }))
        .await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["phienBan"].as_array().unwrap().len(), 4);
    assert_eq!(so_ho().await, 3);

    // lô có một hồ sơ sai phiên bản → 409, nêu mã hồ sơ; hồ sơ mới trong lô KHÔNG được ghi
    let (ma, v) = m
        .goi("POST", "/api/lo", Some(&cb), json!({ "ghi": [{ "loai": "ho", "duLieu": ho("h4", "H004") }, { "loai": "ho", "duLieu": ho("h1", "H001"), "phienBanTruoc": 7 }] }))
        .await;
    assert_eq!(ma, 409, "{v}");
    assert!(v["loi"].as_str().unwrap().starts_with("Hồ sơ H001"), "{v}");
    assert_eq!(so_ho().await, 3);

    // cán bộ không được xóa tất cả / ghi đè (cần KHOI_PHUC)
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), json!({ "xoaTatCa": true })).await.0, 403);

    // khôi phục kiểu thay thế trong một lô: xóa hết rồi ghi, lỗi giữa chừng → dữ liệu cũ còn nguyên
    let (ma, _) = m.goi("POST", "/api/lo", Some(&qt), json!({ "xoaTatCa": true, "ghiDe": true, "ghi": [{ "loai": "ho", "duLieu": ho("h9", "H009") }, { "loai": "xyz", "duLieu": {} }] })).await;
    assert_eq!(ma, 400);
    assert_eq!(so_ho().await, 3);
    let (ma, v) = m.goi("POST", "/api/lo", Some(&qt), json!({ "xoaTatCa": true, "ghiDe": true, "ghi": [{ "loai": "duAn", "duLieu": da }, { "loai": "ho", "duLieu": ho("h9", "H009") }] })).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(so_ho().await, 1);

    // P0-3: mã hồ sơ trùng trong dự án bị chặn (tạo mới, đổi mã); dự án khác dùng lại được
    let (ma, v) = m.goi("PUT", "/api/ho/h10", Some(&cb), json!({ "duLieu": ho("h10", " h009 ") })).await;
    assert_eq!(ma, 409, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("H009"), "{v}");
    assert_eq!(m.goi("PUT", "/api/ho/h10", Some(&cb), json!({ "duLieu": ho("h10", "H010") })).await.0, 200);
    let (ma, _) = m.goi("PUT", "/api/ho/h10", Some(&cb), json!({ "duLieu": ho("h10", "H009"), "phienBanTruoc": 1 })).await;
    assert_eq!(ma, 409);
    let mut o = ho("h11", "H009");
    o["duAnId"] = json!("da2");
    assert_eq!(m.goi("PUT", "/api/ho/h11", Some(&cb), json!({ "duLieu": o })).await.0, 200);
    // P0-4: xóa mềm có lý do, máy chủ ghi người xóa; xóa hẳn cần XOA_HAN và đủ 30 ngày trong thùng rác
    let mut x = ho("h10", "H010");
    x["daXoa"] = json!({ "luc": "2000-01-01T00:00:00.000Z", "nguoi": "gia-mao", "lyDo": "" });
    assert_eq!(m.goi("PUT", "/api/ho/h10", Some(&cb), json!({ "duLieu": x, "phienBanTruoc": 1 })).await.0, 400);
    x["daXoa"]["lyDo"] = json!("nhập trùng");
    let (ma, v) = m.goi("PUT", "/api/ho/h10", Some(&cb), json!({ "duLieu": x, "phienBanTruoc": 1 })).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["duLieu"]["daXoa"]["nguoi"], "canbo1");
    assert_ne!(v["duLieu"]["daXoa"]["luc"], "2000-01-01T00:00:00.000Z");
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), json!({ "xoaHo": ["h10"] })).await.0, 403);
    assert_eq!(m.goi("DELETE", "/api/ho/h10", Some(&cb), Value::Null).await.0, 403);
    let (ma, v) = m.goi("POST", "/api/lo", Some(&qt), json!({ "xoaHo": ["h10"] })).await;
    assert_eq!(ma, 409, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("30 ngày"));
    // (khôi phục dữ liệu giữ nguyên dấu xóa cũ) → đủ hạn → xóa hẳn được
    x["daXoa"] = json!({ "luc": "2000-01-01T00:00:00.000Z", "nguoi": "canbo1", "lyDo": "nhập trùng" });
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "ghiDe": true, "ghi": [{ "loai": "ho", "duLieu": x }] })).await.0, 200);
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "xoaHo": ["h10"] })).await.0, 200);
    // hộ đã chi trả / có trong phương án đã chốt → không xóa được
    let mut c = ho("h12", "H012");
    assert_eq!(m.goi("PUT", "/api/ho/h12", Some(&cb), json!({ "duLieu": c })).await.0, 200);
    let mut ct = json!({ "dot": [{ "id": "d1", "ngay": "2026-10-01", "soTien": "100" }] });
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), lo_con("ct", "h12", ct.clone(), None)).await.0, 200);
    c["daXoa"] = json!({ "lyDo": "thử" });
    let (ma, v) = m.goi("PUT", "/api/ho/h12", Some(&cb), json!({ "duLieu": c, "phienBanTruoc": 1 })).await;
    assert_eq!(ma, 409, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("chi trả"));
    ct["dot"][0]["huy"] = json!({ "lyDo": "ghi nhầm" });
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), lo_con("ct", "h12", ct, Some(1))).await.0, 200);
    assert_eq!(m.goi("PUT", "/api/ho/h12", Some(&cb), json!({ "duLieu": c, "phienBanTruoc": 1 })).await.0, 200);
    let ban_pa = json!({ "id": "p1", "duAnId": "da1", "pa": { "id": "p1", "so": 1, "trangThai": "DA_CHOT", "ho": [{ "hoId": "h9" }] } });
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "ghiDe": true, "ghi": [{ "loai": "pa", "duLieu": ban_pa }] })).await.0, 200);
    let mut h9 = ho("h9", "H009");
    h9["daXoa"] = json!({ "lyDo": "thử" });
    let (ma, v) = m.goi("POST", "/api/lo", Some(&qt), json!({ "ghi": [{ "loai": "ho", "duLieu": h9 }] })).await;
    assert_eq!(ma, 409, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("phương án số 1"), "{v}");

    // P1-3: Không áp dụng — chỉ bước tùy chọn (14), cần quyền xác nhận, bắt buộc lý do
    let k = ho("h20", "H020");
    assert_eq!(m.goi("PUT", "/api/ho/h20", Some(&cb), json!({ "duLieu": k })).await.0, 200);
    let td = |x: Value, pb: Option<i64>| lo_con("td", "h20", x, pb);
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), td(json!({}), None)).await.0, 200);
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), td(json!({ "14": { "trangThai": "KHONG_AP_DUNG", "ghiChu": "tự nguyện bàn giao" } }), Some(1))).await.0, 403);
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), td(json!({ "13": { "trangThai": "KHONG_AP_DUNG", "ghiChu": "x" } }), Some(1))).await.0, 400);
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), td(json!({ "14": { "trangThai": "KHONG_AP_DUNG", "ghiChu": " " } }), Some(1))).await.0, 400);
    let (ma, v) = m.goi("POST", "/api/lo", Some(&qt), td(json!({ "14": { "trangThai": "KHONG_AP_DUNG", "ghiChu": "tự nguyện bàn giao" } }), Some(1))).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["phienBan"][0]["duLieu"]["tienDo"]["14"]["duyetBoi"], "quantri");
    assert_eq!(m.goi("POST", "/api/lo", Some(&cb), td(json!({ "14": { "trangThai": "DANG" } }), Some(2))).await.0, 403);
    // tiến độ đọc theo dự án
    let (_, v) = m.goi("GET", "/api/ban-ghi?loai=td&duAn=da1", Some(&cb), Value::Null).await;
    assert!(v.as_array().unwrap().iter().any(|x| x["duLieu"]["id"] == "h20"));

    d.handle.shutdown();
    let _ = std::fs::remove_dir_all(&dir);
}

/// Giai đoạn 3: kiểm lược đồ (P1-8), đọc theo danh sách (P1-2), lịch sử và khôi phục hồ sơ (P1-5).
#[tokio::test(flavor = "multi_thread")]
async fn may_chu_lich_su_luoc_do() {
    let dir = std::env::temp_dir().join(format!("gpmb-may-chu-ls-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let cong = cong_trong();
    let d = may_chu::khoi_dong(dir.clone(), cong).await.unwrap();
    let m = May { dia_chi: format!("127.0.0.1:{cong}"), van_tay: d.van_tay.clone() };
    let qt = m.goi("POST", "/api/khoi-tao", None, tai_khoan("quantri", "QUAN_TRI", "Gpmb2026qt")).await.1["token"].as_str().unwrap().to_string();
    for (t, vt) in [("lanhdao", "LANH_DAO"), ("canbo1", "CAN_BO")] {
        assert_eq!(m.goi("PUT", &format!("/api/nguoi-dung/{t}"), Some(&qt), tai_khoan(t, vt, "Matkhau2026")).await.0, 200);
    }
    let (ld, cb) = (m.dang_nhap("lanhdao", "Matkhau2026").await, m.dang_nhap("canbo1", "Matkhau2026").await);
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&cb), json!({ "duLieu": { "id": "da1", "ten": "Dự án", "giaGao": { "dongKg": "15000" } } })).await.0, 200);

    // P1-8: sai cấu trúc, ô số sai định dạng → 400; dự án giá gạo "15.000,5" → 400
    let mut h = ho_mau("h1", "H001");
    h["thua"] = json!([{ "id": "t1", "soTo": "5", "soThua": "1", "loaiDat": "LUC", "dienTich": "1.000,5", "dienTichThuHoi": "100", "nguonGoc": "" }]);
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h })).await;
    assert_eq!(ma, 400, "{v}");
    assert!(v["loi"].as_str().unwrap().contains("thua[0].dienTich"), "{v}");
    let mut sai_kieu = ho_mau("h1", "H001");
    sai_kieu["thua"] = json!({});
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": sai_kieu })).await.0, 400);
    let mut sai_loai = ho_mau("h1", "H001");
    sai_loai["loai"] = json!("KHAC");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": sai_loai })).await.0, 400);
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&cb), json!({ "duLieu": { "id": "da1", "ten": "Dự án", "giaGao": { "dongKg": "15.000,5" } }, "phienBanTruoc": 1 })).await.0, 400);
    // giá trị sai có sẵn (dữ liệu cũ, quản trị đưa lên) không chặn việc sửa trường khác; giá trị sai MỚI thì chặn
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "ghiDe": true, "ghi": [{ "loai": "ho", "duLieu": h }] })).await.0, 200);
    let mut h2 = h.clone();
    h2["ten"] = json!("Đổi tên");
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h2, "phienBanTruoc": 1 })).await;
    assert_eq!(ma, 200, "{v}");
    let mut h3 = h2.clone();
    h3["thua"][0]["dienTichThuHoi"] = json!("abc");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h3, "phienBanTruoc": 2 })).await.0, 400);
    let mut h4 = h2.clone();
    h4["thua"][0]["dienTich"] = json!("1000.5");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h4, "phienBanTruoc": 2 })).await.0, 200);
    // lưu lại đúng nội dung cũ: không tăng phiên bản, không thêm lịch sử
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h4, "phienBanTruoc": 3 })).await;
    assert_eq!((ma, v["phienBan"].as_i64()), (200, Some(3)));

    // P1-2: đọc lại theo danh sách
    let (_, v) = m.goi("POST", "/api/doc", Some(&cb), json!({ "ds": [{ "loai": "ho", "id": "h1" }, { "loai": "ho", "id": "khong-co" }] })).await;
    assert_eq!(v[0]["phienBan"], 3);
    assert_eq!(v[0]["duLieu"]["ten"], "Đổi tên");
    assert!(v[1]["duLieu"].is_null());

    // P1-5: lịch sử — các bản cũ, mới nhất trước (bản 1: tên gốc, bản 2: "Đổi tên", số sai)
    let (_, ls) = m.goi("GET", "/api/lich-su?loai=ho&id=h1", Some(&cb), Value::Null).await;
    let ds = ls["ds"].as_array().unwrap();
    assert_eq!(ds.len(), 2, "{ls}");
    assert_eq!((ds[0]["phienBan"].as_i64(), ds[1]["phienBan"].as_i64()), (Some(2), Some(1)));
    assert_eq!(ds[1]["duLieu"]["ten"], "Hộ H001");
    assert_eq!(ds[0]["luuBoi"], "canbo1");
    assert_eq!(ls["soNamGiu"], 0);
    let stt1 = ds[1]["stt"].as_i64().unwrap();
    // khôi phục: chỉ quản trị (lãnh đạo, cán bộ bị chặn), bắt buộc lý do
    assert_eq!(m.goi("POST", "/api/lich-su/khoi-phuc", Some(&ld), json!({ "stt": stt1, "lyDo": "nhập nhầm" })).await.0, 403);
    assert_eq!(m.goi("POST", "/api/lich-su/khoi-phuc", Some(&qt), json!({ "stt": stt1, "lyDo": " " })).await.0, 400);
    let (ma, v) = m.goi("POST", "/api/lich-su/khoi-phuc", Some(&qt), json!({ "stt": stt1, "lyDo": "nhập nhầm tên" })).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!((v["duLieu"]["ten"].as_str(), v["phienBan"].as_i64()), (Some("Hộ H001"), Some(4)));
    assert!(v["duLieu"]["nhatKy"].as_array().unwrap().last().unwrap()["noiDung"].as_str().unwrap().contains("nhập nhầm tên"));
    let (_, ls) = m.goi("GET", "/api/lich-su?loai=ho&id=h1", Some(&cb), Value::Null).await;
    assert!(ls["ds"][0]["lyDo"].as_str().unwrap().starts_with("Trước khi khôi phục"));
    let (_, nk) = m.goi("GET", "/api/nhat-ky", Some(&qt), Value::Null).await;
    assert!(nk.as_array().unwrap().iter().any(|x| x["hanhDong"] == "Khôi phục hồ sơ về phiên bản cũ"));

    // hồ sơ xóa hẳn → còn trong lịch sử, quản trị khôi phục được
    let mut x = ho_mau("h2", "H002");
    x["daXoa"] = json!({ "luc": "2000-01-01T00:00:00.000Z", "nguoi": "canbo1", "lyDo": "nhập trùng" });
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "ghiDe": true, "ghi": [{ "loai": "ho", "duLieu": x }] })).await.0, 200);
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "xoaHo": ["h2"] })).await.0, 200);
    let (_, dx) = m.goi("GET", "/api/lich-su/da-xoa?duAn=da1", Some(&cb), Value::Null).await;
    assert_eq!(dx.as_array().unwrap().len(), 1, "{dx}");
    let (ma, v) = m.goi("POST", "/api/lich-su/khoi-phuc", Some(&qt), json!({ "stt": dx[0]["stt"], "lyDo": "xóa nhầm" })).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(m.goi("GET", "/api/ho?duAn=da1", Some(&cb), Value::Null).await.1.as_array().unwrap().len(), 2);
    assert_eq!(m.goi("GET", "/api/lich-su/da-xoa?duAn=da1", Some(&cb), Value::Null).await.1.as_array().unwrap().len(), 0);
    // khôi phục bản trùng mã với hồ sơ khác → 409
    let mut y = ho_mau("h3", "H003");
    assert_eq!(m.goi("PUT", "/api/ho/h3", Some(&cb), json!({ "duLieu": y })).await.0, 200);
    y["ma"] = json!("H009");
    assert_eq!(m.goi("PUT", "/api/ho/h3", Some(&cb), json!({ "duLieu": y, "phienBanTruoc": 1 })).await.0, 200);
    let mut z = ho_mau("h4", "H003");
    assert_eq!(m.goi("PUT", "/api/ho/h4", Some(&cb), json!({ "duLieu": z })).await.0, 200);
    z["ten"] = json!("x");
    let (_, ls3) = m.goi("GET", "/api/lich-su?loai=ho&id=h3", Some(&cb), Value::Null).await;
    let (ma, v) = m.goi("POST", "/api/lich-su/khoi-phuc", Some(&qt), json!({ "stt": ls3["ds"][0]["stt"], "lyDo": "thử" })).await;
    assert_eq!(ma, 409, "{v}");

    // thời hạn giữ lịch sử: chỉ quản trị đặt; ngoài khoảng 0–100 → 400
    assert_eq!(m.goi("PUT", "/api/cai-dat/giuLichSu", Some(&ld), json!({ "soNam": 5 })).await.0, 403);
    assert_eq!(m.goi("PUT", "/api/cai-dat/giuLichSu", Some(&qt), json!({ "soNam": -1 })).await.0, 400);
    let (ma, v) = m.goi("PUT", "/api/cai-dat/giuLichSu", Some(&qt), json!({ "soNam": 5 })).await;
    assert_eq!((ma, v["daXoa"].as_i64()), (200, Some(0)));
    d.handle.shutdown();
}

/// P2-6, P1-6: CSDL phiên bản cũ (phương án nhúng trong dự án, chưa có lịch sử) được chuyển đổi khi mở;
/// dọn lịch sử quá thời hạn giữ.
#[test]
fn chuyen_doi_csdl_cu_va_don_lich_su() {
    let dir = std::env::temp_dir().join(format!("gpmb-cd-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let f = dir.join("cu.sqlite");
    {
        let c = rusqlite::Connection::open(&f).unwrap();
        c.execute_batch(
            "CREATE TABLE ban_ghi(loai TEXT NOT NULL, id TEXT NOT NULL, du_an_id TEXT, phien_ban INTEGER NOT NULL, noi_dung TEXT NOT NULL, sua_luc TEXT, sua_boi TEXT, PRIMARY KEY(loai, id));",
        )
        .unwrap();
        let da = json!({ "id": "da1", "ten": "Cũ", "phuongAn": [{ "id": "p1", "so": 1, "trangThai": "DA_PHE_DUYET", "ho": [] }, { "id": "p2", "so": 2, "trangThai": "DA_CHOT", "ho": [] }] });
        c.execute("INSERT INTO ban_ghi VALUES ('duAn', 'da1', 'da1', 3, ?1, '', 'a')", [da.to_string()]).unwrap();
        let mut h = ho_mau("h1", "H001");
        h["tienDo"] = json!({ "5": { "trangThai": "XONG" } });
        h["chiTra"] = json!({ "dot": [{ "id": "d1" }] });
        c.execute("INSERT INTO ban_ghi VALUES ('ho', 'h1', 'da1', 2, ?1, '', 'a')", [h.to_string()]).unwrap();
    }
    drop(may_chu::MayChu::mo(&f).unwrap());
    let c = rusqlite::Connection::open(&f).unwrap();
    let v: i64 = c.query_row("PRAGMA user_version", [], |r| r.get(0)).unwrap();
    assert_eq!(v, may_chu::PHIEN_BAN_CSDL);
    let da: String = c.query_row("SELECT noi_dung FROM ban_ghi WHERE loai = 'duAn'", [], |r| r.get(0)).unwrap();
    assert!(serde_json::from_str::<Value>(&da).unwrap().get("phuongAn").is_none());
    let n: i64 = c.query_row("SELECT COUNT(*) FROM ban_ghi WHERE loai = 'pa' AND du_an_id = 'da1'", [], |r| r.get(0)).unwrap();
    assert_eq!(n, 2);
    let p1: String = c.query_row("SELECT noi_dung FROM ban_ghi WHERE loai = 'pa' AND id = 'p1'", [], |r| r.get(0)).unwrap();
    assert_eq!(serde_json::from_str::<Value>(&p1).unwrap()["pa"]["trangThai"], "DA_PHE_DUYET");
    // P2-7 (bước 3): tiến độ, chi trả tách thành bản ghi con
    let ho: Value = serde_json::from_str(&c.query_row("SELECT noi_dung FROM ban_ghi WHERE loai = 'ho'", [], |r| r.get::<_, String>(0)).unwrap()).unwrap();
    assert!(ho.get("tienDo").is_none() && ho.get("chiTra").is_none());
    let td: Value = serde_json::from_str(&c.query_row("SELECT noi_dung FROM ban_ghi WHERE loai = 'td' AND id = 'h1'", [], |r| r.get::<_, String>(0)).unwrap()).unwrap();
    assert_eq!(td["tienDo"]["5"]["trangThai"], "XONG");
    let ct: Value = serde_json::from_str(&c.query_row("SELECT noi_dung FROM ban_ghi WHERE loai = 'ct' AND id = 'h1'", [], |r| r.get::<_, String>(0)).unwrap()).unwrap();
    assert_eq!(ct["chiTra"]["dot"][0]["id"], "d1");
    // mở lại: không chuyển đổi lần hai
    drop(may_chu::MayChu::mo(&f).unwrap());
    // dọn lịch sử: giữ 2 năm → bản 3 năm trước bị xóa, bản mới giữ lại
    c.execute("INSERT INTO lich_su(loai, id, noi_dung, luu_luc) VALUES ('ho', 'x', '{}', ?1)", [may_chu::iso_truoc(3 * 365)]).unwrap();
    c.execute("INSERT INTO lich_su(loai, id, noi_dung, luu_luc) VALUES ('ho', 'x', '{}', ?1)", [may_chu::iso_truoc(30)]).unwrap();
    assert_eq!(may_chu::don_lich_su(&c).unwrap(), 0); // chưa đặt = không thời hạn
    c.execute("CREATE TABLE IF NOT EXISTS cai_dat(khoa TEXT PRIMARY KEY, noi_dung TEXT NOT NULL)", []).unwrap();
    c.execute("INSERT OR REPLACE INTO cai_dat VALUES ('giuLichSu', '{\"soNam\":2}')", []).unwrap();
    assert_eq!(may_chu::don_lich_su(&c).unwrap(), 1);
    let con: i64 = c.query_row("SELECT COUNT(*) FROM lich_su", [], |r| r.get(0)).unwrap();
    assert_eq!(con, 1);
    std::fs::remove_dir_all(&dir).ok();
}

async fn goi_router(r: &axum::Router, pt: &str, dd: &str, token: Option<&str>, than: Value) -> (u16, Value) {
    use tower::ServiceExt;
    let mut rq = axum::http::Request::builder().method(pt).uri(dd);
    if let Some(t) = token {
        rq = rq.header("authorization", format!("Bearer {t}"));
    }
    let b = if than.is_null() { vec![] } else { than.to_string().into_bytes() };
    let mut rq = rq.body(axum::body::Body::from(b)).unwrap();
    rq.extensions_mut().insert(axum::extract::ConnectInfo(std::net::SocketAddr::from(([127, 0, 0, 1], 0))));
    let r = r.clone().oneshot(rq).await.unwrap();
    let ma = r.status().as_u16();
    let b = axum::body::to_bytes(r.into_body(), usize::MAX).await.unwrap();
    (ma, serde_json::from_slice(&b).unwrap_or(Value::Null))
}

/// Máy đơn SQLite (Giai đoạn 3): chuyển dữ liệu IndexedDB cũ vào CSDL trống, đăng nhập bằng tài khoản cũ,
/// chuỗi nhật ký cũ giữ nguyên, phương án tách bản ghi; chuyển lần hai bị từ chối; xuất để đưa lên máy chủ.
#[tokio::test(flavor = "multi_thread")]
async fn may_don_trong_tien_trinh() {
    let dir = std::env::temp_dir().join(format!("gpmb-may-don-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let r = may_chu::mo_may_don(dir.clone()).unwrap();
    let (_, tt) = goi_router(&r, "GET", "/api/trang-thai", None, Value::Null).await;
    assert_eq!(tt["coTaiKhoan"], false);
    let bam1 = may_chu::tinh_bam_nhat_ky(1, "2026-09-01T00:00:00.000Z", "quantri", "Q", "Đăng nhập", "", &"0".repeat(64));
    let nk1 = json!({ "stt": 1, "luc": "2026-09-01T00:00:00.000Z", "nguoi": "quantri", "hoTen": "Q", "hanhDong": "Đăng nhập", "chiTiet": "", "bamTruoc": "0".repeat(64), "bam": bam1 });
    let mut ho_day_du = ho_mau("h1", "H001");
    ho_day_du["tienDo"] = json!({ "5": { "trangThai": "DANG" } });
    ho_day_du["chiTra"] = json!({ "dot": [] });
    let du_lieu = json!({
        "nguoiDung": [tai_khoan("quantri", "QUAN_TRI", "Gpmb2026qt")],
        "nhatKy": [nk1],
        "caiDat": [{ "khoa": "lich", "giaTri": { "nghi": [] } }],
        "duAn": [{ "id": "da1", "ten": "Dự án cũ", "phuongAn": [{ "id": "p1", "so": 1, "trangThai": "DA_PHE_DUYET", "ho": [{ "hoId": "h1" }] }] }],
        "ho": [ho_day_du],
        "tep": [{ "loai": "banDo", "id": "da1", "meta": "{}", "noiDung": "AQID" }]
    });
    let (ma, v) = goi_router(&r, "POST", "/api/noi-bo/chuyen-du-lieu", None, du_lieu.clone()).await;
    assert_eq!(ma, 200, "{v}");
    assert!(v["tomTat"].as_str().unwrap().contains("1 dự án, 1 hồ sơ, 1 bản phương án, 1 tệp"));
    assert_eq!(goi_router(&r, "POST", "/api/noi-bo/chuyen-du-lieu", None, du_lieu).await.0, 409);
    // đăng nhập bằng tài khoản cũ; dữ liệu, phương án, nhật ký nối tiếp chuỗi cũ
    let (ma, v) = goi_router(&r, "POST", "/api/dang-nhap", None, json!({ "ten": "quantri", "matKhau": "Gpmb2026qt" })).await;
    assert_eq!(ma, 200, "{v}");
    let t = v["token"].as_str().unwrap().to_string();
    assert_eq!(goi_router(&r, "GET", "/api/ho?duAn=da1", Some(&t), Value::Null).await.1.as_array().unwrap().len(), 1);
    assert_eq!(goi_router(&r, "GET", "/api/pa?duAn=da1", Some(&t), Value::Null).await.1[0]["duLieu"]["pa"]["trangThai"], "DA_PHE_DUYET");
    let (_, nk) = goi_router(&r, "GET", "/api/nhat-ky", Some(&t), Value::Null).await;
    let nk = nk.as_array().unwrap();
    assert_eq!(nk[0]["bam"], bam1);
    assert!(nk.iter().any(|x| x["hanhDong"] == "Chuyển dữ liệu máy đơn từ IndexedDB sang SQLite" && x["bamTruoc"] == bam1));
    // hộ có trong phương án đã duyệt: không xóa được (quy tắc máy chủ áp dụng cho máy đơn)
    let mut h = ho_mau("h1", "H001");
    h["daXoa"] = json!({ "lyDo": "thử" });
    assert_eq!(goi_router(&r, "PUT", "/api/ho/h1", Some(&t), json!({ "duLieu": h, "phienBanTruoc": 1 })).await.0, 409);
    // xuất: phương án ghép lại vào dự án, tệp base64
    let (_, x) = goi_router(&r, "GET", "/api/noi-bo/xuat", None, Value::Null).await;
    assert_eq!(x["duAn"][0]["phuongAn"][0]["id"], "p1");
    assert_eq!(x["tep"][0]["noiDung"], "AQID");
    assert_eq!(x["ho"][0]["tienDo"]["5"]["trangThai"], "DANG"); // P2-7: ghép lại khi xuất
    assert_eq!(x["ho"][0]["chiTra"]["dot"], json!([]));
    assert_eq!(x["nguoiDung"][0]["ten"], "quantri");
    // máy chủ mạng không có các đường dẫn nội bộ
    let cong = cong_trong();
    let d = may_chu::khoi_dong(dir.join("mang"), cong).await.unwrap();
    let m = May { dia_chi: format!("127.0.0.1:{cong}"), van_tay: d.van_tay.clone() };
    assert_eq!(m.goi("GET", "/api/noi-bo/xuat", None, Value::Null).await.0, 404);
    d.handle.shutdown();
    std::fs::remove_dir_all(&dir).ok();
}

/// P2-2: tệp đính kèm hồ sơ trên máy chủ — cần hồ sơ, dự án; tối đa 20 MB; liệt kê theo dự án; xóa hẳn hộ xóa tệp của hộ.
#[tokio::test(flavor = "multi_thread")]
async fn may_chu_dinh_kem() {
    use base64::Engine;
    let dir = std::env::temp_dir().join(format!("gpmb-may-chu-dk-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    let cong = cong_trong();
    let d = may_chu::khoi_dong(dir.clone(), cong).await.unwrap();
    let m = May { dia_chi: format!("127.0.0.1:{cong}"), van_tay: d.van_tay.clone() };
    let qt = m.goi("POST", "/api/khoi-tao", None, tai_khoan("quantri", "QUAN_TRI", "Gpmb2026qt")).await.1["token"].as_str().unwrap().to_string();
    assert_eq!(m.goi("PUT", "/api/nguoi-dung/xem1", Some(&qt), tai_khoan("xem1", "XEM", "Matkhau2026")).await.0, 200);
    let xem = m.dang_nhap("xem1", "Matkhau2026").await;
    let tep = |id: &str, ho: &str, n: usize| {
        let meta = json!({ "id": id, "hoId": ho, "duAnId": "da1", "buoc": "4", "ten": format!("{id}.pdf"), "loai": "application/pdf", "kichThuoc": n, "luc": "x", "nguoi": "qt" }).to_string();
        json!({ "loai": "dinhKem", "id": id, "meta": meta, "noiDung": base64::engine::general_purpose::STANDARD.encode(vec![7u8; n]) })
    };
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "ghi": [{ "loai": "duAn", "duLieu": { "id": "da1", "ten": "D" } }, { "loai": "ho", "duLieu": ho_mau("h1", "H1") }, { "loai": "ho", "duLieu": ho_mau("h2", "H2") }] })).await.0, 200);
    let (ma, v) = m.goi("POST", "/api/lo", Some(&qt), json!({ "tep": [tep("a", "h1", 10), tep("b", "h2", 10)] })).await;
    assert_eq!(ma, 200, "{v}");
    // chỉ xem: không đính kèm được; thiếu hồ sơ → 400; quá 20 MB → 413
    assert_eq!(m.goi("POST", "/api/lo", Some(&xem), json!({ "tep": [tep("c", "h1", 1)] })).await.0, 403);
    let mut sai = tep("c", "", 1);
    sai["meta"] = json!(json!({ "id": "c", "duAnId": "da1" }).to_string());
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "tep": [sai] })).await.0, 400);
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "tep": [tep("lon", "h1", may_chu::TOI_DA_DINH_KEM + 1)] })).await.0, 413);
    let (_, ds) = m.goi("GET", "/api/dinh-kem?duAn=da1", Some(&xem), Value::Null).await;
    let mut ids: Vec<String> = ds.as_array().unwrap().iter().map(|x| x["id"].as_str().unwrap().to_string()).collect();
    ids.sort();
    assert_eq!(ids, vec!["a", "b"]);
    // xóa hẳn hộ h2 (đã trong thùng rác đủ hạn) → tệp của h2 bị xóa, tệp h1 còn
    let mut h2 = ho_mau("h2", "H2");
    h2["daXoa"] = json!({ "luc": "2000-01-01T00:00:00.000Z", "nguoi": "qt", "lyDo": "thử" });
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "ghiDe": true, "ghi": [{ "loai": "ho", "duLieu": h2 }] })).await.0, 200);
    assert_eq!(m.goi("POST", "/api/lo", Some(&qt), json!({ "xoaHo": ["h2"] })).await.0, 200);
    let (_, ds) = m.goi("GET", "/api/dinh-kem?duAn=da1", Some(&xem), Value::Null).await;
    assert_eq!(ds.as_array().unwrap().len(), 1);
    d.handle.shutdown();
    let _ = std::fs::remove_dir_all(&dir);
}

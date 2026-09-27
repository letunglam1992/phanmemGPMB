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
    let du_an = json!({ "id": "da1", "ten": "Dự án thử", "phuongAn": [] });
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&xem), json!({ "duLieu": du_an })).await.0, 403);
    let (ma, v) = m.goi("PUT", "/api/du-an/da1", Some(&cb), json!({ "duLieu": du_an })).await;
    assert_eq!((ma, v["phienBan"].as_i64()), (200, Some(1)));
    let ho = json!({ "id": "h1", "duAnId": "da1", "ma": "H01", "ten": "Hộ thử", "tienDo": {} });
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

    // bước: cán bộ gửi duyệt được, không tự xác nhận; máy chủ ghi người gửi theo phiên
    let mut h = ho_a.clone();
    h["tienDo"] = json!({ "5": { "trangThai": "CHO_DUYET", "guiBoi": "gia-mao" } });
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h, "phienBanTruoc": 2 })).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["duLieu"]["tienDo"]["5"]["guiBoi"], "canbo1");
    let mut h3 = v["duLieu"].clone();
    h3["tienDo"]["5"]["trangThai"] = json!("XONG");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&cb), json!({ "duLieu": h3, "phienBanTruoc": 3 })).await.0, 403);
    let (ma, v) = m.goi("PUT", "/api/ho/h1", Some(&ld), json!({ "duLieu": h3, "phienBanTruoc": 3 })).await;
    assert_eq!(ma, 200, "{v}");
    assert_eq!(v["duLieu"]["tienDo"]["5"]["duyetBoi"], "lanhdao");
    // lãnh đạo tự gửi rồi tự duyệt → bị chặn; lãnh đạo khác duyệt được
    let mut h4 = v["duLieu"].clone();
    h4["tienDo"]["6"] = json!({ "trangThai": "CHO_DUYET" });
    let v = m.goi("PUT", "/api/ho/h1", Some(&ld), json!({ "duLieu": h4, "phienBanTruoc": 4 })).await.1;
    let mut h5 = v["duLieu"].clone();
    h5["tienDo"]["6"]["trangThai"] = json!("XONG");
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&ld), json!({ "duLieu": h5, "phienBanTruoc": 5 })).await.0, 403);
    assert_eq!(m.goi("PUT", "/api/ho/h1", Some(&ld2), json!({ "duLieu": h5, "phienBanTruoc": 5 })).await.0, 200);

    // phương án: cán bộ không chốt; lãnh đạo chốt, phê duyệt; bản đã duyệt không sửa, không xóa
    let pa = json!({ "id": "p1", "so": 1, "trangThai": "DA_CHOT", "tong": "1000", "ho": [] });
    let mut da = du_an.clone();
    da["phuongAn"] = json!([pa]);
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&cb), json!({ "duLieu": da, "phienBanTruoc": 1 })).await.0, 403);
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&ld), json!({ "duLieu": da, "phienBanTruoc": 1 })).await.0, 200);
    let mut sua_so = da.clone();
    sua_so["phuongAn"][0]["tong"] = json!("999");
    sua_so["phuongAn"][0]["trangThai"] = json!("DA_PHE_DUYET");
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&ld), json!({ "duLieu": sua_so, "phienBanTruoc": 2 })).await.0, 403);
    let mut duyet = da.clone();
    duyet["phuongAn"][0]["trangThai"] = json!("DA_PHE_DUYET");
    duyet["phuongAn"][0]["pheDuyet"] = json!({ "so": "12/QĐ-UBND", "ngay": "2026-10-01" });
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&ld), json!({ "duLieu": duyet, "phienBanTruoc": 2 })).await.0, 200);
    let mut xoa_pa = du_an.clone();
    xoa_pa["phuongAn"] = json!([]);
    assert_eq!(m.goi("PUT", "/api/du-an/da1", Some(&qt), json!({ "duLieu": xoa_pa, "phienBanTruoc": 3 })).await.0, 403);

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

//! 1.0.10 — Máy chủ (và lõi dữ liệu máy đơn trong bản cài) tự kiểm giới hạn dự án của bản dùng thử / mã kích hoạt,
//! cùng quy tắc với giao diện (`src/giay-phep.ts`): dùng thử 1 dự án; mã kích hoạt `GPMB1.<JSON>.<chữ ký>` ký
//! ECDSA P-256 SHA-256 (chữ ký dạng r‖s như WebCrypto) — chỉ có khóa công khai ở đây.
use base64::Engine;
use rusqlite::{Connection, OptionalExtension};
use serde_json::Value;

/// Khóa công khai — phải trùng `apps/desktop/src/giay-phep-khoa.ts` (kiểm thử `khoa_trung_giao_dien`).
pub const KHOA_X: &str = "FdLZDi-hfgiJTLgAgbhE6RpyztdU9zyVmR7zct0oBc0";
pub const KHOA_Y: &str = "8ZO0hia4iwN2O2vz8OAVSNlWH4GF4BPMW_h6pjzoDe8";
pub const SO_DU_AN_DUNG_THU: usize = 1;

fn b64(s: &str) -> Option<Vec<u8>> {
    base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(s.trim_end_matches('=')).ok()
}
fn chuan_ma(s: &str) -> String {
    s.chars().filter(|c| c.is_ascii_alphanumeric()).collect::<String>().to_uppercase()
}

/// Đọc, kiểm chữ ký mã kích hoạt với khóa (x, y base64url). None nếu sai dạng / sai chữ ký.
pub fn doc_ma(ma: &str, x: &str, y: &str) -> Option<Value> {
    let ma: String = ma.split_whitespace().collect();
    let mut p = ma.split('.');
    let (dau, than, ky) = (p.next()?, p.next()?, p.next()?);
    if dau != "GPMB1" {
        return None;
    }
    let (than, ky) = (b64(than)?, b64(ky)?);
    let mut khoa = vec![4u8];
    khoa.extend(b64(x)?);
    khoa.extend(b64(y)?);
    ring::signature::UnparsedPublicKey::new(&ring::signature::ECDSA_P256_SHA256_FIXED, &khoa).verify(&than, &ky).ok()?;
    serde_json::from_slice(&than).ok()
}

/// 1.0.12: mã bị chặn (đã cấp lại cho máy mới) — cùng tệp với giao diện (`src/giay-phep-chan.ts`), SHA-256 hex của cả mã.
fn ds_chan(ts: &str) -> std::collections::HashSet<String> {
    // các chuỗi "…" dài 64 ký tự hex trong mảng MA_CHAN
    let than = ts.split("MA_CHAN").nth(1).unwrap_or("");
    than.split('"').skip(1).step_by(2).filter(|x| x.len() == 64 && x.chars().all(|c| c.is_ascii_hexdigit())).map(str::to_lowercase).collect()
}
fn bi_chan(ma: &str) -> bool {
    static DS: std::sync::OnceLock<std::collections::HashSet<String>> = std::sync::OnceLock::new();
    let ds = DS.get_or_init(|| ds_chan(include_str!("../../src/giay-phep-chan.ts")));
    if ds.is_empty() {
        return false;
    }
    let ma: String = ma.split_whitespace().collect();
    let bam = ring::digest::digest(&ring::digest::SHA256, ma.as_bytes());
    ds.contains(&bam.as_ref().iter().map(|b| format!("{b:02x}")).collect::<String>())
}

/// Số dự án được phép theo mã kích hoạt đã lưu, mã cài đặt và ngày hôm nay (YYYY-MM-DD). usize::MAX = không giới hạn.
pub fn gioi_han(ma: Option<&str>, ma_cai_dat: Option<&str>, hom_nay: &str, x: &str, y: &str) -> usize {
    let (Some(ma), Some(mc)) = (ma, ma_cai_dat) else { return SO_DU_AN_DUNG_THU };
    let Some(gp) = doc_ma(ma, x, y) else { return SO_DU_AN_DUNG_THU };
    if gp["v"].as_i64() != Some(1) || chuan_ma(gp["maCaiDat"].as_str().unwrap_or("")) != chuan_ma(mc) || bi_chan(ma) {
        return SO_DU_AN_DUNG_THU;
    }
    if let Some(h) = gp["hetHan"].as_str() {
        if hom_nay > h {
            return SO_DU_AN_DUNG_THU;
        }
    }
    match gp["soDuAn"].as_u64() {
        Some(n) => n as usize,
        None if gp["soDuAn"].is_null() => usize::MAX,
        None => SO_DU_AN_DUNG_THU,
    }
}

/// Dự án tính vào giới hạn: chưa xóa (thùng rác), không phải dự án mẫu ẩn danh.
pub fn du_an_tinh(v: &Value) -> bool {
    v["daXoa"].is_null() && v["mau"].as_bool() != Some(true) && !v["ten"].as_str().unwrap_or("").trim_end().ends_with("(dữ liệu ẩn danh)")
}

/// Kiểm trước khi ghi dự án `moi` (cũ `cu`): nếu làm tăng số dự án tính vượt giới hạn → Err(câu báo).
pub fn kiem_ghi_du_an(c: &Connection, cu: Option<&Value>, moi: &Value, hom_nay: &str) -> Result<(), String> {
    if !du_an_tinh(moi) || cu.is_some_and(du_an_tinh) {
        return Ok(());
    }
    let doc = |k: &str| -> Option<String> {
        c.query_row("SELECT noi_dung FROM cai_dat WHERE khoa = ?1", [k], |r| r.get::<_, String>(0)).optional().ok().flatten().and_then(|s| serde_json::from_str::<Value>(&s).ok()).and_then(|v| v.as_str().map(str::to_string))
    };
    let han = gioi_han(doc("giayPhep").as_deref(), doc("maCaiDat").as_deref(), hom_nay, KHOA_X, KHOA_Y);
    let mut q = c.prepare("SELECT noi_dung FROM ban_ghi WHERE loai = 'duAn' AND id <> ?1").map_err(|e| e.to_string())?;
    let id = moi["id"].as_str().unwrap_or("");
    let co = q
        .query_map([id], |r| r.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .filter_map(|x| x.ok())
        .filter_map(|s| serde_json::from_str::<Value>(&s).ok())
        .filter(du_an_tinh)
        .count();
    if co + 1 > han {
        return Err(if han == SO_DU_AN_DUNG_THU {
            format!("Bản dùng thử dùng được {SO_DU_AN_DUNG_THU} dự án; đang có {co} dự án — liên hệ tác giả để được cấp mã kích hoạt")
        } else {
            format!("Mã kích hoạt cho phép {han} dự án; đang có {co} dự án")
        });
    }
    Ok(())
}

/// 1.0.18 (B1b) — kiểm chữ ký gói chính sách khi máy chủ lưu danh sách gói (cài đặt `goiChinhSach`), cùng quy tắc với
/// `src/ky-goi.ts`: máy trạm gửi kèm `chuKy.banKy` (base64url đúng nội dung đã ký) và `chuKy.ky`. Kiểm chữ ký bằng khóa công
/// khai, rồi đối chiếu nội dung đã ký với gói được lưu (bộ chính sách, bảng giá đất, bảng đơn giá; đơn vị, người ký, thời điểm).
/// Gói không có `chuKy` (chưa ký — máy trạm đã cảnh báo, người nạp xác nhận) thì không kiểm.
pub fn kiem_goi(g: &Value, x: &str, y: &str) -> Result<(), String> {
    let ck = &g["chuKy"];
    if ck.is_null() {
        return Ok(());
    }
    let ten = g["khoa"].as_str().unwrap_or("?");
    let sai = |ly: &str| Err(format!("Gói chính sách \"{ten}\": {ly} — không lưu"));
    let (Some(ban), Some(ky)) = (ck["banKy"].as_str().and_then(b64), ck["ky"].as_str().and_then(b64)) else {
        return sai("thiếu nội dung đã ký");
    };
    let mut khoa = vec![4u8];
    khoa.extend(b64(x).unwrap_or_default());
    khoa.extend(b64(y).unwrap_or_default());
    if ring::signature::UnparsedPublicKey::new(&ring::signature::ECDSA_P256_SHA256_FIXED, &khoa).verify(&ban, &ky).is_err() {
        return sai("chữ ký không hợp lệ");
    }
    let Some((goi, meta)) = std::str::from_utf8(&ban).ok().and_then(|t| t.strip_prefix("GPMB-GOI-CS1\n")).and_then(|t| t.split_once('\n')) else {
        return sai("nội dung đã ký sai dạng");
    };
    let (Ok(goi), Ok(meta)) = (serde_json::from_str::<Value>(goi), serde_json::from_str::<Value>(meta)) else {
        return sai("nội dung đã ký sai dạng");
    };
    if ["donVi", "nguoiKy", "luc"].iter().any(|k| meta[k] != ck[k]) {
        return sai("thông tin người ký khác nội dung đã ký");
    }
    let doc = |k: &str| g[k].as_str().and_then(|s| serde_json::from_str::<Value>(s).ok());
    if doc("noiDung").as_ref() != Some(&goi["chinhSach"]) {
        return sai("bộ chính sách khác nội dung đã ký");
    }
    if doc("bangGiaDat").unwrap_or(Value::Null) != goi["bangGiaDat"] {
        return sai("bảng giá đất khác nội dung đã ký");
    }
    // bảng đơn giá lưu đã chuẩn hóa (ten bỏ khoảng trắng, đơn giá thành số): so số dòng, tên, đơn giá
    let so = |v: &Value| v.as_f64().or_else(|| v.as_str().and_then(|s| s.trim().parse().ok()));
    let luu = doc("donGia");
    match (goi["donGia"]["dong"].as_array(), luu.as_ref().and_then(Value::as_array)) {
        (None, None) => {}
        (Some(a), Some(b)) if a.len() == b.len() && a.iter().zip(b).all(|(p, q)| p["ten"].as_str().map(str::trim) == q["ten"].as_str() && so(&p["donGia"]).is_some() && so(&p["donGia"]) == so(&q["donGia"])) => {}
        _ => return sai("bảng đơn giá khác nội dung đã ký"),
    }
    Ok(())
}

/// Kiểm các gói mới hoặc đổi chữ ký trong danh sách `moi` (gói đã có, cùng chữ ký thì bỏ qua).
pub fn kiem_ds_goi(moi: &Value, cu: Option<&Value>, x: &str, y: &str) -> Result<(), String> {
    for g in moi.as_array().into_iter().flatten() {
        let da_co = cu.and_then(Value::as_array).into_iter().flatten().any(|c| c["khoa"] == g["khoa"] && c["chuKy"]["ky"] == g["chuKy"]["ky"] && c["noiDung"] == g["noiDung"]);
        if !da_co {
            kiem_goi(g, x, y)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn khoa_trung_giao_dien() {
        let ts = include_str!("../../src/giay-phep-khoa.ts");
        assert!(ts.contains(&format!("x: \"{KHOA_X}\"")), "KHOA_X khác giay-phep-khoa.ts");
        assert!(ts.contains(&format!("y: \"{KHOA_Y}\"")), "KHOA_Y khác giay-phep-khoa.ts");
    }

    #[test]
    fn danh_sach_chan_doc_duoc() {
        let ts = include_str!("../../src/giay-phep-chan.ts");
        let n = ts.split("MA_CHAN").nth(1).unwrap().matches('"').count() / 2;
        assert_eq!(ds_chan(ts).len(), n, "có dòng trong MA_CHAN không phải mã băm 64 ký tự hex");
        let mau = "export const MA_CHAN: string[] = [\n  \"A220D69A62AE3FD0629899076AF6BF6FD45F88F8419134BD07A17172B1398FC1\",\n  \"ngắn\",\n];";
        assert_eq!(ds_chan(mau).into_iter().collect::<Vec<_>>(), vec!["a220d69a62ae3fd0629899076af6bf6fd45f88f8419134bd07a17172b1398fc1".to_string()]);
        assert!(!bi_chan("GPMB1.khong.co"));
        // cùng cách băm với giao diện (bamMa trong giay-phep.ts — kiểm thử giay-phep.test.ts dùng cùng giá trị)
        let bam = ring::digest::digest(&ring::digest::SHA256, "GPMB1.abc.def".as_bytes());
        assert_eq!(bam.as_ref().iter().map(|b| format!("{b:02x}")).collect::<String>(), "a220d69a62ae3fd0629899076af6bf6fd45f88f8419134bd07a17172b1398fc1");
    }

    #[test]
    fn dem_va_gioi_han() {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch("CREATE TABLE ban_ghi(loai TEXT, id TEXT, noi_dung TEXT); CREATE TABLE cai_dat(khoa TEXT PRIMARY KEY, noi_dung TEXT);").unwrap();
        let mau = serde_json::json!({ "id": "m", "ten": "Dự án mẫu – KCN (dữ liệu ẩn danh)" });
        let a = serde_json::json!({ "id": "a", "ten": "A" });
        let b = serde_json::json!({ "id": "b", "ten": "B" });
        assert!(!du_an_tinh(&mau));
        c.execute("INSERT INTO ban_ghi VALUES ('duAn', 'm', ?1)", [mau.to_string()]).unwrap();
        assert!(kiem_ghi_du_an(&c, None, &a, "2026-10-13").is_ok());
        c.execute("INSERT INTO ban_ghi VALUES ('duAn', 'a', ?1)", [a.to_string()]).unwrap();
        // sửa dự án đã có: không chặn; thêm dự án thứ 2: chặn
        assert!(kiem_ghi_du_an(&c, Some(&a), &a, "2026-10-13").is_ok());
        assert!(kiem_ghi_du_an(&c, None, &b, "2026-10-13").unwrap_err().contains("Bản dùng thử"));
        // khôi phục từ thùng rác cũng tính
        let b_xoa = serde_json::json!({ "id": "b", "ten": "B", "daXoa": { "lyDo": "x" } });
        assert!(kiem_ghi_du_an(&c, Some(&b_xoa), &b, "2026-10-13").is_err());
        // mã ký đúng (khóa thử sinh trong kiểm thử): 3 dự án, đúng máy, còn hạn
        use ring::signature::{EcdsaKeyPair, KeyPair, ECDSA_P256_SHA256_FIXED_SIGNING};
        let rng = ring::rand::SystemRandom::new();
        let pk = EcdsaKeyPair::generate_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, &rng).unwrap();
        let cap = EcdsaKeyPair::from_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, pk.as_ref(), &rng).unwrap();
        let cong = cap.public_key().as_ref();
        let e = base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let (x, y) = (e.encode(&cong[1..33]), e.encode(&cong[33..65]));
        let than = serde_json::json!({ "v": 1, "donVi": "Thử", "maCaiDat": "ABCD-EFGH-JKLM-NPQR", "soDuAn": 3, "hetHan": "2027-12-31", "cap": "2026-10-13" }).to_string();
        let ky = cap.sign(&rng, than.as_bytes()).unwrap();
        let ma = format!("GPMB1.{}.{}", e.encode(than.as_bytes()), e.encode(ky.as_ref()));
        assert_eq!(gioi_han(Some(&ma), Some("abcd efgh jklm npqr"), "2026-10-13", &x, &y), 3);
        assert_eq!(gioi_han(Some(&ma), Some("ZZZZ-ZZZZ-ZZZZ-ZZZZ"), "2026-10-13", &x, &y), 1);
        assert_eq!(gioi_han(Some(&ma), Some("ABCD-EFGH-JKLM-NPQR"), "2028-01-01", &x, &y), 1);
        assert_eq!(gioi_han(Some(&ma), Some("ABCD-EFGH-JKLM-NPQR"), "2026-10-13", KHOA_X, KHOA_Y), 1);
        // mã sai chữ ký → dùng thử
        assert_eq!(gioi_han(Some("GPMB1.eyJ2IjoxfQ.AAAA"), Some("ABCD"), "2026-10-13", KHOA_X, KHOA_Y), 1);
    }

    #[test]
    fn chu_ky_goi_chinh_sach() {
        use ring::signature::{EcdsaKeyPair, KeyPair, ECDSA_P256_SHA256_FIXED_SIGNING};
        let rng = ring::rand::SystemRandom::new();
        let pk = EcdsaKeyPair::generate_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, &rng).unwrap();
        let cap = EcdsaKeyPair::from_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, pk.as_ref(), &rng).unwrap();
        let cong = cap.public_key().as_ref();
        let e = base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let (x, y) = (e.encode(&cong[1..33]), e.encode(&cong[33..65]));
        let goi = r#"{"dinhDang":"gpmb-goi-chinh-sach","chinhSach":{"ma":"THU","hieuLucTu":"2026-10-17","tyLe":0.5},"donGia":{"canCu":"QĐ thử","dong":[{"nguon":"QĐ32","ten":" Nhà A ","donVi":"m2","donGia":"1200000"}]}}"#;
        let meta = r#"{"v":1,"donVi":"Tác giả","nguoiKy":"A","luc":"2026-10-17T00:00:00.000Z"}"#;
        let ban = format!("GPMB-GOI-CS1\n{goi}\n{meta}");
        let ky = cap.sign(&rng, ban.as_bytes()).unwrap();
        let tao = |noi_dung: &str, dg: &str, nguoi: &str, ky: &[u8]| {
            serde_json::json!({ "khoa": "thu", "noiDung": noi_dung, "donGia": dg,
                "chuKy": { "donVi": "Tác giả", "nguoiKy": nguoi, "luc": "2026-10-17T00:00:00.000Z", "ky": e.encode(ky), "banKy": e.encode(ban.as_bytes()) } })
        };
        let cs = r#"{"ma":"THU","hieuLucTu":"2026-10-17","tyLe":0.5}"#;
        let dg = r#"[{"nguon":"QĐ32","ma":"QĐ32/G1","nhom":"","ten":"Nhà A","donVi":"m2","donGia":1200000,"matDo":null,"trang":0,"canCu":"QĐ thử"}]"#;
        assert_eq!(kiem_goi(&tao(cs, dg, "A", ky.as_ref()), &x, &y), Ok(()));
        // bộ chính sách bị sửa, đơn giá bị sửa, người ký khác, chữ ký giả, khóa khác → từ chối
        assert!(kiem_goi(&tao(&cs.replace("0.5", "0.7"), dg, "A", ky.as_ref()), &x, &y).unwrap_err().contains("bộ chính sách"));
        assert!(kiem_goi(&tao(cs, &dg.replace("1200000", "1300000"), "A", ky.as_ref()), &x, &y).unwrap_err().contains("bảng đơn giá"));
        assert!(kiem_goi(&tao(cs, dg, "B", ky.as_ref()), &x, &y).unwrap_err().contains("người ký"));
        assert!(kiem_goi(&tao(cs, dg, "A", &[1u8; 64]), &x, &y).unwrap_err().contains("chữ ký không hợp lệ"));
        assert!(kiem_goi(&tao(cs, dg, "A", ky.as_ref()), KHOA_X, KHOA_Y).is_err());
        // gói chưa ký: không kiểm; danh sách: gói đã có cùng chữ ký thì bỏ qua
        assert_eq!(kiem_goi(&serde_json::json!({ "khoa": "k", "noiDung": "{}" }), &x, &y), Ok(()));
        let gia = tao(cs, dg, "A", &[1u8; 64]);
        let ds = serde_json::json!([gia]);
        assert!(kiem_ds_goi(&ds, None, &x, &y).is_err());
        assert!(kiem_ds_goi(&ds, Some(&ds), &x, &y).is_ok());
    }
}

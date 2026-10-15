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
}

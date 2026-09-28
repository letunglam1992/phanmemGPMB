//! Máy chủ mạng nội bộ (docs/11): HTTPS chứng chỉ tự ký, dữ liệu SQLite, đăng nhập, kiểm tra quyền
//! (QD-22) và các quy tắc nghiệp vụ không tin vào máy trạm. Chỉ nghe trong mạng nội bộ; không gửi dữ
//! liệu ra ngoài.

use axum::{
    body::Bytes,
    extract::{ConnectInfo, DefaultBodyLimit, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::{Path as FsPath, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const MA_TRAN_QUYEN: &str = include_str!("../../src/quyen.json");
const HET_PHIEN: Duration = Duration::from_secs(8 * 3600);
const VONG_LAP_TOI_THIEU: u64 = 100_000;

pub struct MayChu {
    db: Mutex<Connection>,
    phien: Mutex<HashMap<String, (String, Instant)>>,
    sai: Mutex<HashMap<String, (u32, Instant)>>,
    quyen: HashMap<String, Vec<String>>,
}

pub type St = Arc<MayChu>;

#[derive(Debug)]
pub struct Loi(pub StatusCode, pub String);
impl IntoResponse for Loi {
    fn into_response(self) -> Response {
        (self.0, Json(json!({ "loi": self.1 }))).into_response()
    }
}
fn loi(ma: StatusCode, s: impl Into<String>) -> Loi {
    Loi(ma, s.into())
}
fn loi_db(e: rusqlite::Error) -> Loi {
    loi(StatusCode::INTERNAL_SERVER_ERROR, format!("Lỗi cơ sở dữ liệu: {e}"))
}
type Kq<T> = Result<T, Loi>;

/// Thời điểm dạng ISO như Date.toISOString() của giao diện.
pub fn bay_gio() -> String {
    iso_truoc(0)
}

/// Thời điểm ISO cách hiện tại `so_ngay` ngày về trước (so sánh chuỗi ISO được vì cùng định dạng).
pub fn iso_truoc(so_ngay: i64) -> String {
    let d = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let (s, ms) = (d.as_secs() as i64 - so_ngay * 86400, d.subsec_millis());
    let (ngay, giay) = (s.div_euclid(86400), s.rem_euclid(86400));
    // civil_from_days (Howard Hinnant)
    let z = ngay + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let dd = doy - (153 * mp + 2) / 5 + 1;
    let mm = if mp < 10 { mp + 3 } else { mp - 9 };
    let yy = yoe + era * 400 + if mm <= 2 { 1 } else { 0 };
    format!("{yy:04}-{mm:02}-{dd:02}T{:02}:{:02}:{:02}.{ms:03}Z", giay / 3600, giay % 3600 / 60, giay % 60)
}

fn hex(b: &[u8]) -> String {
    b.iter().map(|x| format!("{x:02x}")).collect()
}
fn tu_hex(s: &str) -> Option<Vec<u8>> {
    if s.len() % 2 != 0 {
        return None;
    }
    (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).ok()).collect()
}
fn ngau_nhien(n: usize) -> String {
    let mut b = vec![0u8; n];
    getrandom::getrandom(&mut b).expect("không lấy được số ngẫu nhiên");
    hex(&b)
}

/// Kiểm tra mật khẩu theo đúng cách băm của giao diện (PBKDF2-SHA256, muối và kết quả dạng hex).
pub fn dung_mat_khau(u: &Value, mat_khau: &str) -> bool {
    let (Some(muoi), Some(vong), Some(bam)) = (u["muoi"].as_str().and_then(tu_hex), u["vongLap"].as_u64(), u["bam"].as_str()) else {
        return false;
    };
    let mut out = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<Sha256>(mat_khau.as_bytes(), &muoi, vong as u32, &mut out);
    let tinh = hex(&out);
    let mut khac = tinh.len() ^ bam.len();
    for (a, b) in tinh.bytes().zip(bam.bytes()) {
        khac |= (a ^ b) as usize;
    }
    khac == 0
}

/// Bỏ các trường băm mật khẩu trước khi gửi cho máy trạm.
fn an_bam(mut u: Value) -> Value {
    if let Some(o) = u.as_object_mut() {
        o.remove("muoi");
        o.remove("vongLap");
        o.remove("bam");
    }
    u
}

/// Dòng nhật ký hệ thống — mã băm tính giống hệt giao diện (src/nhat-ky.ts) để kiểm tra chéo được.
pub fn tinh_bam_nhat_ky(stt: i64, luc: &str, nguoi: &str, ho_ten: &str, hanh_dong: &str, chi_tiet: &str, bam_truoc: &str) -> String {
    let s = serde_json::to_string(&json!([stt, luc, nguoi, ho_ten, hanh_dong, chi_tiet, bam_truoc])).unwrap();
    hex(&Sha256::digest(s.as_bytes()))
}

impl MayChu {
    pub fn mo(duong_dan: &FsPath) -> rusqlite::Result<MayChu> {
        let c = Connection::open(duong_dan)?;
        c.execute_batch(
            "PRAGMA journal_mode=WAL;
             CREATE TABLE IF NOT EXISTS ban_ghi(loai TEXT NOT NULL, id TEXT NOT NULL, du_an_id TEXT, phien_ban INTEGER NOT NULL,
               noi_dung TEXT NOT NULL, sua_luc TEXT, sua_boi TEXT, PRIMARY KEY(loai, id));
             CREATE INDEX IF NOT EXISTS ix_ban_ghi_du_an ON ban_ghi(loai, du_an_id);
             CREATE TABLE IF NOT EXISTS tep(loai TEXT NOT NULL, id TEXT NOT NULL, meta TEXT NOT NULL, noi_dung BLOB NOT NULL, PRIMARY KEY(loai, id));
             CREATE TABLE IF NOT EXISTS nguoi_dung(ten TEXT PRIMARY KEY, noi_dung TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS nhat_ky(stt INTEGER PRIMARY KEY, noi_dung TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS cai_dat(khoa TEXT PRIMARY KEY, noi_dung TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS thay_doi(seq INTEGER PRIMARY KEY AUTOINCREMENT, loai TEXT, id TEXT, du_an_id TEXT, boi TEXT, luc TEXT);",
        )?;
        chuyen_doi_csdl(&c)?;
        don_lich_su(&c)?;
        let quyen: HashMap<String, Vec<String>> = serde_json::from_str(MA_TRAN_QUYEN).expect("quyen.json hỏng");
        Ok(MayChu { db: Mutex::new(c), phien: Mutex::new(HashMap::new()), sai: Mutex::new(HashMap::new()), quyen })
    }

    fn ghi_nhat_ky(&self, c: &Connection, nguoi: &str, ho_ten: &str, hanh_dong: &str, chi_tiet: &str) -> rusqlite::Result<()> {
        let truoc: Option<(i64, String)> = c
            .query_row("SELECT stt, noi_dung FROM nhat_ky ORDER BY stt DESC LIMIT 1", [], |r| Ok((r.get(0)?, r.get(1)?)))
            .optional()?;
        let (stt, bam_truoc) = match truoc {
            Some((s, nd)) => (s + 1, serde_json::from_str::<Value>(&nd).ok().and_then(|v| v["bam"].as_str().map(String::from)).unwrap_or_default()),
            None => (1, "0".repeat(64)),
        };
        let luc = bay_gio();
        let bam = tinh_bam_nhat_ky(stt, &luc, nguoi, ho_ten, hanh_dong, chi_tiet, &bam_truoc);
        let d = json!({ "stt": stt, "luc": luc, "nguoi": nguoi, "hoTen": ho_ten, "hanhDong": hanh_dong, "chiTiet": chi_tiet, "bamTruoc": bam_truoc, "bam": bam });
        c.execute("INSERT INTO nhat_ky(stt, noi_dung) VALUES (?1, ?2)", params![stt, d.to_string()])?;
        Ok(())
    }

    fn ghi_thay_doi(c: &Connection, loai: &str, id: &str, du_an_id: &str, boi: &str) -> rusqlite::Result<()> {
        c.execute("INSERT INTO thay_doi(loai, id, du_an_id, boi, luc) VALUES (?1, ?2, ?3, ?4, ?5)", params![loai, id, du_an_id, boi, bay_gio()])?;
        Ok(())
    }

    fn co_quyen(&self, vai_tro: &str, q: &str) -> bool {
        self.quyen.get(vai_tro).is_some_and(|ds| ds.iter().any(|x| x == q))
    }
}

// ---------------- Chuyển đổi cấu trúc CSDL (P2-6), lịch sử bản ghi (P1-5) ----------------

/// Phiên bản cấu trúc CSDL hiện tại (PRAGMA user_version). Mỗi bước chuyển đổi chạy một lần, trong một giao dịch.
pub const PHIEN_BAN_CSDL: i64 = 2;

pub fn chuyen_doi_csdl(c: &Connection) -> rusqlite::Result<()> {
    let v: i64 = c.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if v < 1 {
        // P1-5: bản cũ của bản ghi mỗi lần sửa / xóa hẳn / ghi đè khi khôi phục
        c.execute_batch(
            "BEGIN;
             CREATE TABLE IF NOT EXISTS lich_su(stt INTEGER PRIMARY KEY AUTOINCREMENT, loai TEXT NOT NULL, id TEXT NOT NULL, du_an_id TEXT,
               phien_ban INTEGER, noi_dung TEXT NOT NULL, sua_luc TEXT, sua_boi TEXT, luu_luc TEXT NOT NULL, luu_boi TEXT, ly_do TEXT);
             CREATE INDEX IF NOT EXISTS ix_lich_su_ban_ghi ON lich_su(loai, id);
             CREATE INDEX IF NOT EXISTS ix_lich_su_luc ON lich_su(luu_luc);
             PRAGMA user_version = 1;
             COMMIT;",
        )?;
    }
    if v < 2 {
        // P1-6: tách các bản phương án khỏi bản ghi dự án — mỗi bản một bản ghi loại "pa" { id, duAnId, pa }
        c.execute_batch("BEGIN")?;
        let r = (|| -> rusqlite::Result<()> {
            let ds: Vec<(String, String, i64)> = {
                let mut q = c.prepare("SELECT id, noi_dung, phien_ban FROM ban_ghi WHERE loai = 'duAn'")?;
                let x = q.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)))?.filter_map(|x| x.ok()).collect();
                x
            };
            for (id, nd, pb) in ds {
                let Ok(mut v) = serde_json::from_str::<Value>(&nd) else { continue };
                let Some(pas) = v.as_object_mut().and_then(|o| o.remove("phuongAn")) else { continue };
                for p in pas.as_array().cloned().unwrap_or_default() {
                    let Some(pid) = p["id"].as_str() else { continue };
                    let ban = json!({ "id": pid, "duAnId": id, "pa": p });
                    c.execute(
                        "INSERT OR REPLACE INTO ban_ghi(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi) VALUES ('pa', ?1, ?2, 1, ?3, ?4, 'chuyen-doi')",
                        params![pid, id, ban.to_string(), bay_gio()],
                    )?;
                }
                c.execute("UPDATE ban_ghi SET noi_dung = ?1, phien_ban = ?2 WHERE loai = 'duAn' AND id = ?3", params![v.to_string(), pb + 1, id])?;
            }
            c.execute_batch("PRAGMA user_version = 2;")
        })();
        match r {
            Ok(()) => c.execute_batch("COMMIT")?,
            Err(e) => {
                let _ = c.execute_batch("ROLLBACK");
                return Err(e);
            }
        }
    }
    Ok(())
}

/// Số năm giữ lịch sử bản ghi (cài đặt "giuLichSu": { soNam }); 0 hoặc chưa đặt = giữ không thời hạn.
pub fn so_nam_giu(c: &Connection) -> i64 {
    c.query_row("SELECT noi_dung FROM cai_dat WHERE khoa = 'giuLichSu'", [], |r| r.get::<_, String>(0))
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| v["soNam"].as_i64())
        .unwrap_or(0)
        .max(0)
}

/// Xóa lịch sử cũ hơn thời hạn giữ. Trả về số dòng đã xóa.
pub fn don_lich_su(c: &Connection) -> rusqlite::Result<usize> {
    let n = so_nam_giu(c);
    if n == 0 {
        return Ok(0);
    }
    c.execute("DELETE FROM lich_su WHERE luu_luc < ?1", [iso_truoc(n * 365 + n / 4)])
}

/// Lưu bản hiện có của bản ghi vào lịch sử trước khi bị thay / xóa.
fn luu_lich_su(c: &Connection, loai: &str, id: &str, ly_do: &str, boi: &str) -> Kq<()> {
    c.execute(
        "INSERT INTO lich_su(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, luu_luc, luu_boi, ly_do)
         SELECT loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, ?3, ?4, ?5 FROM ban_ghi WHERE loai = ?1 AND id = ?2",
        params![loai, id, bay_gio(), boi, ly_do],
    )
    .map_err(loi_db)?;
    Ok(())
}
fn luu_lich_su_du_an(c: &Connection, du_an_id: &str, ly_do: &str, boi: &str) -> Kq<()> {
    c.execute(
        "INSERT INTO lich_su(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, luu_luc, luu_boi, ly_do)
         SELECT loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, ?2, ?3, ?4 FROM ban_ghi
         WHERE (loai = 'duAn' AND id = ?1) OR (loai IN ('ho', 'pa') AND du_an_id = ?1)",
        params![du_an_id, bay_gio(), boi, ly_do],
    )
    .map_err(loi_db)?;
    Ok(())
}

// ---------------- Kiểm tra cấu trúc bản ghi (P1-8) ----------------

fn la_so_may(s: &str) -> bool {
    let s = s.strip_prefix('-').unwrap_or(s);
    let (a, b) = s.split_once('.').unwrap_or((s, "0"));
    !a.is_empty() && !b.is_empty() && a.bytes().all(|x| x.is_ascii_digit()) && b.bytes().all(|x| x.is_ascii_digit())
}

/// Các ô số của bản ghi (đường dẫn, giá trị) — đồng bộ với truongSoHo / truongSoDuAn (src/so.ts).
fn o_so(loai: &str, v: &Value) -> Vec<(String, Value)> {
    let mut out = vec![];
    let mut them = |duong: String, x: &Value| {
        if !x.is_null() {
            out.push((duong, x.clone()));
        }
    };
    if loai == "duAn" {
        them("giaGao.dongKg".into(), &v["giaGao"]["dongKg"]);
        them("hanMucNN.m2".into(), &v["hanMucNN"]["m2"]);
        them("heSoGiaDat.heSo".into(), &v["heSoGiaDat"]["heSo"]);
        return out;
    }
    for (i, t) in v["thua"].as_array().into_iter().flatten().enumerate() {
        for k in ["dienTich", "dienTichThuHoi"] {
            them(format!("thua[{i}].{k}"), &t[k]);
        }
        them(format!("thua[{i}].gia.giaNghinDong"), &t["gia"]["giaNghinDong"]);
        for (j, l) in t["phanLop"]["lop"].as_array().into_iter().flatten().enumerate() {
            them(format!("thua[{i}].phanLop.lop[{j}].dienTich"), &l["dienTich"]);
            them(format!("thua[{i}].phanLop.lop[{j}].giaTuyChinh"), &l["giaTuyChinh"]);
        }
        them(format!("thua[{i}].gcn.dienTich"), &t["gcn"]["dienTich"]);
        them(format!("thua[{i}].gcn.dtThuHoiCoGcn"), &t["gcn"]["dtThuHoiCoGcn"]);
        them(format!("thua[{i}].cayXen.dienTichTru"), &t["cayXen"]["dienTichTru"]);
    }
    for (i, ts) in v["taiSan"].as_array().into_iter().flatten().enumerate() {
        for k in ["donGia", "heSo", "T", "T1", "matDoHa", "quangDuongKm"] {
            them(format!("taiSan[{i}].{k}"), &ts[k]);
        }
    }
    them("hoTro.onDinh.dienTichNNDangSuDung".into(), &v["hoTro"]["onDinh"]["dienTichNNDangSuDung"]);
    let tdc = &v["hoTro"]["taiDinhCu"];
    for k in ["dienTichGiao", "donGia", "tienSddPhaiNop"] {
        them(format!("hoTro.taiDinhCu.{k}"), &tdc[k]);
    }
    for (i, k) in tdc["khoanKhac"].as_array().into_iter().flatten().enumerate() {
        them(format!("hoTro.taiDinhCu.khoanKhac[{i}].soTien"), &k["soTien"]);
    }
    them("khauTru".into(), &v["khauTru"]);
    out
}

/// Kiểm tra cấu trúc trước khi ghi: kiểu dữ liệu, trường bắt buộc, ô số đúng chuẩn máy ("1234.5").
/// Giá trị số sai đã có sẵn trong bản cũ (dữ liệu trước P0-2) không chặn việc lưu thay đổi khác — chỉ chặn giá trị sai mới.
/// `kiem_so` = false (khôi phục từ tệp sao lưu): chỉ kiểm cấu trúc, giữ nguyên giá trị như bản sao lưu.
pub fn kiem_luoc_do(loai: &str, cu: Option<&Value>, v: &Value, kiem_so: bool) -> Result<(), String> {
    let o = v.as_object().ok_or("Bản ghi phải là đối tượng")?;
    let chuoi = |k: &str, bat_buoc: bool| -> Result<(), String> {
        match o.get(k) {
            Some(Value::String(s)) if bat_buoc && s.trim().is_empty() => Err(format!("Trường \"{k}\" không được để trống")),
            Some(Value::String(_)) => Ok(()),
            None | Some(Value::Null) if !bat_buoc => Ok(()),
            _ => Err(format!("Trường \"{k}\" phải là chuỗi")),
        }
    };
    let mang = |k: &str| -> Result<(), String> { if o.get(k).is_some_and(|x| x.is_array()) { Ok(()) } else { Err(format!("Trường \"{k}\" phải là danh sách")) } };
    let doi_tuong = |k: &str| -> Result<(), String> { if o.get(k).is_some_and(|x| x.is_object()) { Ok(()) } else { Err(format!("Trường \"{k}\" phải là đối tượng")) } };
    chuoi("id", true)?;
    match loai {
        "ho" => {
            chuoi("duAnId", true)?;
            chuoi("ma", false)?;
            chuoi("ten", false)?;
            if !matches!(o.get("loai").and_then(|x| x.as_str()), Some("HO_GIA_DINH" | "CA_NHAN" | "TO_CHUC")) {
                return Err("Loại đối tượng không hợp lệ".into());
            }
            for k in ["nhanKhau", "thua", "taiSan", "nhatKy"] {
                mang(k)?;
            }
            for k in ["hoTro", "tienDo"] {
                doi_tuong(k)?;
            }
            for (i, t) in v["thua"].as_array().into_iter().flatten().enumerate() {
                if !t.is_object() || !t["id"].is_string() {
                    return Err(format!("Thửa thứ {} không đúng cấu trúc", i + 1));
                }
            }
            for (i, t) in v["taiSan"].as_array().into_iter().flatten().enumerate() {
                if !t.is_object() || !t["id"].is_string() || !matches!(t["loai"].as_str(), Some("NHA_CT" | "CAY" | "VAT_NUOI" | "KHAC")) {
                    return Err(format!("Tài sản thứ {} không đúng cấu trúc", i + 1));
                }
            }
        }
        "duAn" => {
            chuoi("ten", false)?;
            if o.get("phuongAn").is_some_and(|x| !x.is_null()) {
                return Err("Bản ghi dự án không chứa phương án (từ phiên bản 0.6.0 mỗi bản phương án là một bản ghi riêng) — cập nhật phần mềm trên máy này".into());
            }
        }
        "pa" => {
            chuoi("duAnId", true)?;
            let p = o.get("pa").and_then(|x| x.as_object()).ok_or("Bản phương án thiếu nội dung")?;
            if p.get("id").and_then(|x| x.as_str()) != o.get("id").and_then(|x| x.as_str()) {
                return Err("Mã bản phương án không khớp".into());
            }
            if !matches!(p.get("trangThai").and_then(|x| x.as_str()), Some("DA_CHOT" | "DA_PHE_DUYET" | "DA_HUY")) {
                return Err("Trạng thái bản phương án không hợp lệ".into());
            }
            return Ok(());
        }
        _ => return Err("Loại bản ghi không hợp lệ".into()),
    }
    if !kiem_so {
        return Ok(());
    }
    let cu_so: Vec<(String, Value)> = cu.map(|c| o_so(loai, c)).unwrap_or_default();
    for (duong, x) in o_so(loai, v) {
        let dung = match &x {
            Value::String(s) => s.trim().is_empty() || la_so_may(s.trim()),
            Value::Number(_) => true,
            _ => false,
        };
        if !dung && !cu_so.iter().any(|(d, y)| d == &duong && y == &x) {
            return Err(format!("Ô số \"{duong}\" = {x} không đúng định dạng số (chuẩn máy: 1234.5)"));
        }
    }
    Ok(())
}

/// Người dùng của phiên (đọc lại từ CSDL mỗi yêu cầu: tài khoản bị khóa / đổi vai trò có hiệu lực ngay).
#[derive(Clone, Debug)]
pub struct NguoiGoi {
    pub ten: String,
    pub ho_ten: String,
    pub vai_tro: String,
}

fn xac_thuc(st: &MayChu, h: &HeaderMap) -> Kq<NguoiGoi> {
    let token = h
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or_else(|| loi(StatusCode::UNAUTHORIZED, "Chưa đăng nhập"))?;
    let ten = {
        let mut p = st.phien.lock().unwrap();
        let Some((ten, cuoi)) = p.get_mut(token) else {
            return Err(loi(StatusCode::UNAUTHORIZED, "Phiên đăng nhập đã hết — đăng nhập lại"));
        };
        if cuoi.elapsed() > HET_PHIEN {
            p.remove(token);
            return Err(loi(StatusCode::UNAUTHORIZED, "Phiên đăng nhập đã hết — đăng nhập lại"));
        }
        *cuoi = Instant::now();
        ten.clone()
    };
    let c = st.db.lock().unwrap();
    let u: Option<String> = c.query_row("SELECT noi_dung FROM nguoi_dung WHERE ten = ?1", [&ten], |r| r.get(0)).optional().map_err(loi_db)?;
    let u: Value = u.and_then(|s| serde_json::from_str(&s).ok()).ok_or_else(|| loi(StatusCode::UNAUTHORIZED, "Tài khoản không còn"))?;
    if !u["hoatDong"].as_bool().unwrap_or(false) {
        return Err(loi(StatusCode::FORBIDDEN, "Tài khoản đã bị khóa"));
    }
    Ok(NguoiGoi { ten, ho_ten: u["hoTen"].as_str().unwrap_or("").into(), vai_tro: u["vaiTro"].as_str().unwrap_or("").into() })
}

fn can(st: &MayChu, u: &NguoiGoi, q: &str) -> Kq<()> {
    if st.co_quyen(&u.vai_tro, q) {
        Ok(())
    } else {
        Err(loi(StatusCode::FORBIDDEN, format!("Tài khoản \"{}\" không có quyền {q}", u.ten)))
    }
}

// ---------------- Quy tắc nghiệp vụ kiểm tra lại ở máy chủ ----------------

/// Hồ sơ: tách người gửi – người duyệt bước; máy chủ tự ghi tài khoản gửi/duyệt.
pub fn kiem_tra_ho(st: &MayChu, cu: Option<&Value>, moi: &mut Value, u: &NguoiGoi) -> Kq<()> {
    if cu.is_none() && u.vai_tro == "QUAN_TRI" {
        return Ok(()); // quản trị khôi phục / đưa dữ liệu lên: giữ nguyên lịch sử người gửi, người duyệt
    }
    let buoc_cu = cu.map(|c| c["tienDo"].clone()).unwrap_or(json!({}));
    kiem_tra_buoc(st, &buoc_cu, moi.get_mut("tienDo"), u)
}

/// Bước tùy chọn được đánh dấu "Không áp dụng" (đồng bộ với CAC_BUOC.tuyChon ở mo-hinh.ts).
const BUOC_TUY_CHON: &[&str] = &["14"];

/// Chuyển trạng thái bước (của hộ hoặc bước chung cấp dự án): gửi duyệt cần GUI_DUYET, xác nhận hoàn thành /
/// mở lại bước đã xong cần DUYET_BUOC, người gửi không tự xác nhận; máy chủ tự ghi người gửi/duyệt.
fn kiem_tra_buoc(st: &MayChu, buoc_cu: &Value, moi: Option<&mut Value>, u: &NguoiGoi) -> Kq<()> {
    let Some(td) = moi.and_then(|v| v.as_object_mut()) else {
        return Ok(());
    };
    for (ma, b) in td.iter_mut() {
        let tt = b["trangThai"].as_str().unwrap_or("CHUA").to_string();
        let tt_cu = buoc_cu[ma]["trangThai"].as_str().unwrap_or("CHUA").to_string();
        if tt == tt_cu {
            // giữ nguyên dấu người gửi/duyệt đã có
            for k in ["guiBoi", "duyetBoi"] {
                match buoc_cu[ma].get(k) {
                    Some(v) => b[k] = v.clone(),
                    None => {
                        if let Some(o) = b.as_object_mut() {
                            o.remove(k);
                        }
                    }
                }
            }
            continue;
        }
        if tt == "KHONG_AP_DUNG" {
            // P1-3: chỉ bước tùy chọn (mo-hinh.ts CAC_BUOC.tuyChon), cần quyền xác nhận bước, bắt buộc lý do
            if !BUOC_TUY_CHON.contains(&ma.as_str()) {
                return Err(loi(StatusCode::BAD_REQUEST, format!("Bước {ma} không phải bước tùy chọn — không đánh dấu \"Không áp dụng\"")));
            }
            can(st, u, "DUYET_BUOC").map_err(|_| loi(StatusCode::FORBIDDEN, format!("Bước {ma}: cần quyền xác nhận bước để đánh dấu Không áp dụng")))?;
            if b["ghiChu"].as_str().unwrap_or("").trim().is_empty() {
                return Err(loi(StatusCode::BAD_REQUEST, format!("Bước {ma}: Không áp dụng phải ghi lý do")));
            }
            b["duyetBoi"] = json!(u.ten);
        } else if tt == "XONG" {
            can(st, u, "DUYET_BUOC").map_err(|_| loi(StatusCode::FORBIDDEN, format!("Bước {ma}: tài khoản không có quyền xác nhận hoàn thành — dùng \"Gửi duyệt\"")))?;
            if tt_cu == "CHO_DUYET" && buoc_cu[ma]["guiBoi"].as_str() == Some(&u.ten) {
                return Err(loi(StatusCode::FORBIDDEN, format!("Bước {ma}: người gửi duyệt không tự xác nhận bước của mình")));
            }
            b["duyetBoi"] = json!(u.ten);
            if let Some(g) = buoc_cu[ma].get("guiBoi") {
                b["guiBoi"] = g.clone();
            }
        } else if tt == "CHO_DUYET" {
            can(st, u, "GUI_DUYET")?;
            b["guiBoi"] = json!(u.ten);
            if let Some(o) = b.as_object_mut() {
                o.remove("duyetBoi");
            }
        } else if tt_cu == "XONG" || tt_cu == "KHONG_AP_DUNG" {
            can(st, u, "DUYET_BUOC").map_err(|_| loi(StatusCode::FORBIDDEN, format!("Bước {ma}: chỉ người có quyền duyệt mới mở lại bước đã hoàn thành")))?;
        }
    }
    Ok(())
}

// ---------------- Xóa mềm, thùng rác (P0-4) ----------------

/// Số ngày tối thiểu trong thùng rác trước khi được xóa hẳn (QD-25).
pub const THOI_HAN_THUNG_RAC: i64 = 30;

fn co_chi_tra(h: &Value) -> bool {
    h["chiTra"]["dot"].as_array().is_some_and(|ds| ds.iter().any(|d| d.get("huy").is_none_or(|x| x.is_null())))
}
fn ds_pa(c: &Connection, du_an_id: &str) -> Kq<Vec<Value>> {
    let mut q = c.prepare("SELECT noi_dung FROM ban_ghi WHERE loai = 'pa' AND du_an_id = ?1").map_err(loi_db)?;
    let ds = q.query_map([du_an_id], |r| r.get::<_, String>(0)).map_err(loi_db)?.filter_map(|x| x.ok().and_then(|s| serde_json::from_str::<Value>(&s).ok())).map(|v| v["pa"].clone()).collect();
    Ok(ds)
}
fn co_trong_pa(ds: &[Value], ho_id: &str) -> Option<String> {
    ds.iter().find_map(|p| {
        let tt = p["trangThai"].as_str().unwrap_or("");
        let co = p["ho"].as_array().is_some_and(|ds| ds.iter().any(|x| x["hoId"].as_str() == Some(ho_id)));
        (tt != "DA_HUY" && co).then(|| format!("có trong bản phương án số {} {}", p["so"], if tt == "DA_PHE_DUYET" { "đã phê duyệt" } else { "đã chốt" }))
    })
}
fn doc_json(c: &Connection, loai: &str, id: &str) -> Kq<Option<Value>> {
    let s: Option<String> = c.query_row("SELECT noi_dung FROM ban_ghi WHERE loai = ?1 AND id = ?2", params![loai, id], |r| r.get(0)).optional().map_err(loi_db)?;
    Ok(s.and_then(|x| serde_json::from_str(&x).ok()))
}

/// Đưa vào thùng rác (đặt `daXoa`): máy chủ ghi người, thời điểm; chặn khi hộ có trong phương án đã chốt/duyệt hoặc
/// đã chi trả, dự án có phương án đã duyệt hoặc hộ đã chi trả. Dấu xóa đã có không sửa được.
fn kiem_tra_xoa_mem(c: &Connection, st: &MayChu, u: &NguoiGoi, loai: &str, id: &str, cu: Option<&Value>, moi: &mut Value) -> Kq<()> {
    let co = |v: &Value| v.get("daXoa").is_some_and(|x| !x.is_null());
    let cu_xoa = cu.filter(|c| co(c)).map(|c| c["daXoa"].clone());
    if !co(moi) {
        return Ok(()); // chưa xóa hoặc khôi phục từ thùng rác
    }
    if let Some(d) = cu_xoa {
        moi["daXoa"] = d;
        return Ok(());
    }
    let ly_do = moi["daXoa"]["lyDo"].as_str().unwrap_or("").trim().to_string();
    if ly_do.is_empty() {
        return Err(loi(StatusCode::BAD_REQUEST, "Xóa cần ghi lý do"));
    }
    let mut chan: Vec<String> = vec![];
    if loai == "ho" {
        if co_chi_tra(moi) {
            chan.push("đã ghi chi trả".into());
        }
        chan.extend(co_trong_pa(&ds_pa(c, moi["duAnId"].as_str().unwrap_or(""))?, id));
    } else {
        can(st, u, "XOA_DU_AN")?;
        if ds_pa(c, id)?.iter().any(|p| p["trangThai"] == "DA_PHE_DUYET") {
            chan.push("có bản phương án đã phê duyệt".into());
        }
        let mut q = c.prepare("SELECT noi_dung FROM ban_ghi WHERE loai = 'ho' AND du_an_id = ?1").map_err(loi_db)?;
        let n = q
            .query_map([id], |r| r.get::<_, String>(0))
            .map_err(loi_db)?
            .filter_map(|x| x.ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()))
            .filter(|h| !co(h) && co_chi_tra(h))
            .count();
        if n > 0 {
            chan.push(format!("{n} hộ đã ghi chi trả"));
        }
    }
    if !chan.is_empty() {
        return Err(loi(StatusCode::CONFLICT, format!("Không xóa được: {}", chan.join("; "))));
    }
    moi["daXoa"] = json!({ "luc": bay_gio(), "nguoi": u.ten, "lyDo": ly_do });
    Ok(())
}

/// Xóa hẳn (khỏi thùng rác): quyền XOA_HAN, bản ghi đã trong thùng rác đủ THOI_HAN_THUNG_RAC ngày.
fn kiem_tra_xoa_han(c: &Connection, st: &MayChu, u: &NguoiGoi, loai: &str, id: &str) -> Kq<()> {
    can(st, u, "XOA_HAN")?;
    let Some(v) = doc_json(c, loai, id)? else { return Ok(()) };
    let luc = v["daXoa"]["luc"].as_str().ok_or_else(|| loi(StatusCode::CONFLICT, "Chỉ xóa hẳn được bản ghi đã nằm trong thùng rác"))?;
    if luc > iso_truoc(THOI_HAN_THUNG_RAC).as_str() {
        return Err(loi(StatusCode::CONFLICT, format!("Bản ghi mới vào thùng rác lúc {luc} — chỉ xóa hẳn sau {THOI_HAN_THUNG_RAC} ngày")));
    }
    Ok(())
}

fn bo_truong(v: &Value, truong: &[&str]) -> Value {
    let mut v = v.clone();
    if let Some(o) = v.as_object_mut() {
        for t in truong {
            o.remove(*t);
        }
    }
    v
}

/// Dự án: bản phương án đã phê duyệt/hủy không sửa, không xóa; chuyển trạng thái đúng quyền.
pub fn kiem_tra_du_an(st: &MayChu, cu: Option<&Value>, moi: &mut Value, u: &NguoiGoi) -> Kq<()> {
    // Bước chung (1–4) của dự án: cùng quy tắc gửi – duyệt như bước của hộ
    if !(cu.is_none() && u.vai_tro == "QUAN_TRI") {
        let chung_cu = cu.map(|c| c["tienDoChung"].clone()).unwrap_or(json!({}));
        kiem_tra_buoc(st, &chung_cu, moi.get_mut("tienDoChung"), u)?;
    }
    Ok(())
}

/// Bản phương án (P1-6, bản ghi riêng): bản đã phê duyệt/hủy không sửa; bản đã chốt chỉ được ghi nhận phê duyệt hoặc
/// hủy (đúng quyền), số liệu đã chốt không đổi; bản mới phải ở trạng thái Đã chốt, quyền CHOT_PA.
pub fn kiem_tra_pa(st: &MayChu, cu: Option<&Value>, moi: &Value, u: &NguoiGoi) -> Kq<()> {
    let q = &moi["pa"];
    let so = q["so"].clone();
    match cu {
        Some(c) => {
            let p = &c["pa"];
            if c["duAnId"] != moi["duAnId"] {
                return Err(loi(StatusCode::FORBIDDEN, format!("Bản phương án {so}: không được chuyển sang dự án khác")));
            }
            if p == q {
                return Ok(());
            }
            let tt = p["trangThai"].as_str().unwrap_or("");
            if tt != "DA_CHOT" {
                return Err(loi(StatusCode::FORBIDDEN, format!("Bản phương án {so} đã {} — không sửa được", if tt == "DA_HUY" { "hủy" } else { "phê duyệt" })));
            }
            let (quyen, thay) = match q["trangThai"].as_str().unwrap_or("") {
                "DA_PHE_DUYET" => ("PHE_DUYET_PA", ["trangThai", "pheDuyet"]),
                "DA_HUY" => ("HUY_PA", ["trangThai", "huy"]),
                _ => return Err(loi(StatusCode::FORBIDDEN, format!("Bản phương án {so}: chỉ được ghi nhận phê duyệt hoặc hủy"))),
            };
            can(st, u, quyen)?;
            if bo_truong(p, &thay) != bo_truong(q, &thay) {
                return Err(loi(StatusCode::FORBIDDEN, format!("Bản phương án {so}: số liệu đã chốt không được sửa")));
            }
            Ok(())
        }
        None if u.vai_tro == "QUAN_TRI" => Ok(()), // khôi phục dữ liệu
        None => {
            can(st, u, "CHOT_PA")?;
            if q["trangThai"].as_str() != Some("DA_CHOT") {
                return Err(loi(StatusCode::FORBIDDEN, "Bản phương án mới phải ở trạng thái Đã chốt"));
            }
            Ok(())
        }
    }
}

// ---------------- Xử lý yêu cầu ----------------

fn tach(b: &Bytes) -> Kq<Value> {
    serde_json::from_slice(b).map_err(|e| loi(StatusCode::BAD_REQUEST, format!("Dữ liệu không đúng dạng: {e}")))
}

async fn trang_thai(State(st): State<St>) -> Kq<Json<Value>> {
    let c = st.db.lock().unwrap();
    let n: i64 = c.query_row("SELECT COUNT(*) FROM nguoi_dung", [], |r| r.get(0)).map_err(loi_db)?;
    Ok(Json(json!({ "coTaiKhoan": n > 0, "phienBan": env!("CARGO_PKG_VERSION") })))
}

fn mo_phien(st: &MayChu, u: &Value) -> Value {
    let token = ngau_nhien(32);
    st.phien.lock().unwrap().insert(token.clone(), (u["ten"].as_str().unwrap_or("").into(), Instant::now()));
    json!({ "token": token, "nguoiDung": an_bam(u.clone()) })
}

/// Tạo tài khoản quản trị đầu tiên — chỉ khi chưa có tài khoản và yêu cầu đến từ chính máy chủ.
async fn khoi_tao(State(st): State<St>, ConnectInfo(dc): ConnectInfo<SocketAddr>, b: Bytes) -> Kq<Json<Value>> {
    if !dc.ip().is_loopback() {
        return Err(loi(StatusCode::FORBIDDEN, "Chỉ tạo tài khoản quản trị đầu tiên trên chính máy chủ"));
    }
    let u = tach(&b)?;
    let c = st.db.lock().unwrap();
    let n: i64 = c.query_row("SELECT COUNT(*) FROM nguoi_dung", [], |r| r.get(0)).map_err(loi_db)?;
    if n > 0 {
        return Err(loi(StatusCode::CONFLICT, "Máy chủ đã có tài khoản — đăng nhập để tiếp tục"));
    }
    if u["vaiTro"].as_str() != Some("QUAN_TRI") || u["vongLap"].as_u64().unwrap_or(0) < VONG_LAP_TOI_THIEU {
        return Err(loi(StatusCode::BAD_REQUEST, "Tài khoản đầu tiên phải là Quản trị, mật khẩu băm đủ số vòng"));
    }
    let ten = u["ten"].as_str().unwrap_or("").to_string();
    c.execute("INSERT INTO nguoi_dung(ten, noi_dung) VALUES (?1, ?2)", params![ten, u.to_string()]).map_err(loi_db)?;
    st.ghi_nhat_ky(&c, &ten, u["hoTen"].as_str().unwrap_or(""), "Khởi tạo tài khoản quản trị đầu tiên (máy chủ)", "").map_err(loi_db)?;
    Ok(Json(mo_phien(&st, &u)))
}

async fn dang_nhap(State(st): State<St>, ConnectInfo(dc): ConnectInfo<SocketAddr>, b: Bytes) -> Kq<Json<Value>> {
    let v = tach(&b)?;
    let ten = v["ten"].as_str().unwrap_or("").trim().to_lowercase();
    let mk = v["matKhau"].as_str().unwrap_or("");
    {
        let s = st.sai.lock().unwrap();
        if let Some((lan, den)) = s.get(&ten) {
            if *lan >= 5 && den.elapsed() < Duration::from_secs(30) {
                return Err(loi(StatusCode::TOO_MANY_REQUESTS, "Nhập sai nhiều lần — thử lại sau 30 giây"));
            }
        }
    }
    let c = st.db.lock().unwrap();
    let u: Option<Value> = c
        .query_row("SELECT noi_dung FROM nguoi_dung WHERE ten = ?1", [&ten], |r| r.get::<_, String>(0))
        .optional()
        .map_err(loi_db)?
        .and_then(|s| serde_json::from_str(&s).ok());
    let hoat_dong = u.as_ref().is_some_and(|u| u["hoatDong"].as_bool().unwrap_or(false));
    let dung = hoat_dong && u.as_ref().is_some_and(|u| dung_mat_khau(u, mk));
    if !dung {
        let mut s = st.sai.lock().unwrap();
        let e = s.entry(ten.clone()).or_insert((0, Instant::now()));
        e.0 += 1;
        e.1 = Instant::now();
        st.ghi_nhat_ky(&c, &ten, "", "Đăng nhập không thành công", &format!("từ {}{}", dc.ip(), if u.is_some() && !hoat_dong { "; tài khoản đã khóa" } else { "" })).map_err(loi_db)?;
        return Err(loi(StatusCode::UNAUTHORIZED, if u.is_some() && !hoat_dong { "Tài khoản đã bị khóa — liên hệ quản trị" } else { "Sai tên đăng nhập hoặc mật khẩu" }));
    }
    st.sai.lock().unwrap().remove(&ten);
    let mut u = u.unwrap();
    u["dangNhapCuoi"] = json!(bay_gio());
    c.execute("UPDATE nguoi_dung SET noi_dung = ?2 WHERE ten = ?1", params![ten, u.to_string()]).map_err(loi_db)?;
    st.ghi_nhat_ky(&c, &ten, u["hoTen"].as_str().unwrap_or(""), "Đăng nhập", &format!("từ {}", dc.ip())).map_err(loi_db)?;
    Ok(Json(mo_phien(&st, &u)))
}

async fn dang_xuat(State(st): State<St>, h: HeaderMap) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    if let Some(t) = h.get("authorization").and_then(|v| v.to_str().ok()).and_then(|v| v.strip_prefix("Bearer ")) {
        st.phien.lock().unwrap().remove(t);
    }
    let c = st.db.lock().unwrap();
    st.ghi_nhat_ky(&c, &u.ten, &u.ho_ten, "Đăng xuất", "").map_err(loi_db)?;
    Ok(Json(json!({})))
}

async fn doi_mat_khau(State(st): State<St>, h: HeaderMap, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    let v = tach(&b)?;
    let c = st.db.lock().unwrap();
    let cu: Value = c
        .query_row("SELECT noi_dung FROM nguoi_dung WHERE ten = ?1", [&u.ten], |r| r.get::<_, String>(0))
        .map_err(loi_db)
        .and_then(|s| serde_json::from_str(&s).map_err(|e| loi(StatusCode::INTERNAL_SERVER_ERROR, e.to_string())))?;
    if !dung_mat_khau(&cu, v["matKhauCu"].as_str().unwrap_or("")) {
        return Err(loi(StatusCode::FORBIDDEN, "Mật khẩu hiện tại không đúng"));
    }
    let m = &v["moi"];
    if m["vongLap"].as_u64().unwrap_or(0) < VONG_LAP_TOI_THIEU || m["muoi"].as_str().is_none() || m["bam"].as_str().is_none() {
        return Err(loi(StatusCode::BAD_REQUEST, "Mật khẩu mới không đúng dạng"));
    }
    let mut moi = cu.clone();
    for k in ["muoi", "vongLap", "bam"] {
        moi[k] = m[k].clone();
    }
    moi["phaiDoiMatKhau"] = json!(false);
    c.execute("UPDATE nguoi_dung SET noi_dung = ?2 WHERE ten = ?1", params![u.ten, moi.to_string()]).map_err(loi_db)?;
    Ok(Json(an_bam(moi)))
}

async fn ds_nguoi_dung(State(st): State<St>, h: HeaderMap) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    let c = st.db.lock().unwrap();
    let mut q = c.prepare("SELECT noi_dung FROM nguoi_dung ORDER BY ten").map_err(loi_db)?;
    let ds: Vec<Value> = q
        .query_map([], |r| r.get::<_, String>(0))
        .map_err(loi_db)?
        .filter_map(|x| x.ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()))
        .filter(|x| st.co_quyen(&u.vai_tro, "TAI_KHOAN") || x["ten"].as_str() == Some(&u.ten))
        .map(an_bam)
        .collect();
    Ok(Json(Value::Array(ds)))
}

async fn luu_nguoi_dung(State(st): State<St>, h: HeaderMap, Path(ten): Path<String>, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, "TAI_KHOAN")?;
    let mut moi = tach(&b)?;
    if moi["ten"].as_str() != Some(ten.as_str()) {
        return Err(loi(StatusCode::BAD_REQUEST, "Tên tài khoản không khớp"));
    }
    let c = st.db.lock().unwrap();
    let cu: Option<Value> = c
        .query_row("SELECT noi_dung FROM nguoi_dung WHERE ten = ?1", [&ten], |r| r.get::<_, String>(0))
        .optional()
        .map_err(loi_db)?
        .and_then(|s| serde_json::from_str(&s).ok());
    if moi["bam"].as_str().is_none() {
        // cập nhật vai trò/khóa: giữ băm mật khẩu cũ
        let Some(cu) = &cu else { return Err(loi(StatusCode::BAD_REQUEST, "Tài khoản mới phải có mật khẩu")) };
        for k in ["muoi", "vongLap", "bam"] {
            moi[k] = cu[k].clone();
        }
    } else if moi["vongLap"].as_u64().unwrap_or(0) < VONG_LAP_TOI_THIEU {
        return Err(loi(StatusCode::BAD_REQUEST, "Mật khẩu băm chưa đủ số vòng"));
    }
    // luôn còn ít nhất một quản trị hoạt động
    let mut q = c.prepare("SELECT noi_dung FROM nguoi_dung").map_err(loi_db)?;
    let mut ds: Vec<Value> = q.query_map([], |r| r.get::<_, String>(0)).map_err(loi_db)?.filter_map(|x| x.ok().and_then(|s| serde_json::from_str(&s).ok())).collect();
    ds.retain(|x: &Value| x["ten"].as_str() != Some(ten.as_str()));
    ds.push(moi.clone());
    if !ds.iter().any(|x| x["hoatDong"].as_bool() == Some(true) && x["vaiTro"].as_str() == Some("QUAN_TRI")) {
        return Err(loi(StatusCode::CONFLICT, "Phải còn ít nhất một tài khoản Quản trị đang hoạt động"));
    }
    c.execute("INSERT OR REPLACE INTO nguoi_dung(ten, noi_dung) VALUES (?1, ?2)", params![ten, moi.to_string()]).map_err(loi_db)?;
    if moi["hoatDong"].as_bool() == Some(false) {
        st.phien.lock().unwrap().retain(|_, (t, _)| t != &ten);
    }
    Ok(Json(an_bam(moi)))
}

#[derive(serde::Deserialize)]
struct LocDuAn {
    #[serde(rename = "duAn")]
    du_an: Option<String>,
}

fn doc_ban_ghi(c: &Connection, loai: &str, du_an: Option<&str>) -> Kq<Value> {
    let mut q = c.prepare("SELECT noi_dung, phien_ban FROM ban_ghi WHERE loai = ?1 AND (?2 IS NULL OR du_an_id = ?2)").map_err(loi_db)?;
    let ds: Vec<Value> = q
        .query_map(params![loai, du_an], |r| Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?)))
        .map_err(loi_db)?
        .filter_map(|x| x.ok())
        .map(|(s, pb)| json!({ "duLieu": serde_json::from_str::<Value>(&s).unwrap_or(Value::Null), "phienBan": pb }))
        .collect();
    Ok(Value::Array(ds))
}

async fn ds_du_an(State(st): State<St>, h: HeaderMap) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    Ok(Json(doc_ban_ghi(&st.db.lock().unwrap(), "duAn", None)?))
}

async fn ds_ho(State(st): State<St>, h: HeaderMap, Query(l): Query<LocDuAn>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    Ok(Json(doc_ban_ghi(&st.db.lock().unwrap(), "ho", l.du_an.as_deref())?))
}

/// Ghi bản ghi có kiểm tra phiên bản (khóa lạc quan): người lưu sau gặp xung đột, không ghi đè im lặng.
fn luu_ban_ghi(st: &MayChu, u: &NguoiGoi, loai: &str, id: &str, b: &Bytes) -> Kq<Json<Value>> {
    can(st, u, "SUA_HO_SO")?;
    let v = tach(b)?;
    let moi = v["duLieu"].clone();
    if moi["id"].as_str() != Some(id) {
        return Err(loi(StatusCode::BAD_REQUEST, "Mã bản ghi không khớp"));
    }
    let truoc = v["phienBanTruoc"].as_i64();
    let c = st.db.lock().unwrap();
    let (moi, pb) = ghi_ban_ghi(&c, st, u, loai, id, moi, truoc, false)?;
    Ok(Json(json!({ "duLieu": moi, "phienBan": pb })))
}

/// Kiểm tra phiên bản, quy tắc nghiệp vụ rồi ghi một bản ghi. Dùng chung cho PUT từng bản ghi và POST /api/lo
/// (khi đó `c` là giao dịch — lỗi ở bất kỳ bản ghi nào thì không bản ghi nào được ghi).
/// `ghi_de`: bỏ kiểm tra phiên bản (khôi phục dữ liệu, cần quyền KHOI_PHUC — kiểm ở nơi gọi).
#[allow(clippy::too_many_arguments)]
fn ghi_ban_ghi(c: &Connection, st: &MayChu, u: &NguoiGoi, loai: &str, id: &str, mut moi: Value, truoc: Option<i64>, ghi_de: bool) -> Kq<(Value, i64)> {
    let cu: Option<(String, i64, Option<String>, Option<String>)> = c
        .query_row("SELECT noi_dung, phien_ban, sua_boi, sua_luc FROM ban_ghi WHERE loai = ?1 AND id = ?2", params![loai, id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)))
        .optional()
        .map_err(loi_db)?;
    let cu_v = cu.as_ref().and_then(|x| serde_json::from_str::<Value>(&x.0).ok());
    match (&cu, truoc) {
        _ if ghi_de => {}
        (Some((_, pb, boi, luc)), Some(t)) if *pb != t => {
            return Err(loi(StatusCode::CONFLICT, format!("Dữ liệu đã được \"{}\" sửa lúc {} — đã tải lại bản mới nhất, nhập lại thay đổi của anh/chị", boi.clone().unwrap_or_default(), luc.clone().unwrap_or_default())));
        }
        (None, Some(_)) => return Err(loi(StatusCode::CONFLICT, "Bản ghi đã bị người khác xóa")),
        (Some((_, _, boi, luc)), None) if u.vai_tro != "QUAN_TRI" => {
            return Err(loi(StatusCode::CONFLICT, format!("Mã bản ghi đã tồn tại (\"{}\" lưu lúc {})", boi.clone().unwrap_or_default(), luc.clone().unwrap_or_default())));
        }
        _ => {}
    }
    kiem_luoc_do(loai, cu_v.as_ref(), &moi, !ghi_de).map_err(|e| loi(StatusCode::BAD_REQUEST, e))?;
    match loai {
        "ho" => kiem_tra_ho(st, cu_v.as_ref(), &mut moi, u)?,
        "pa" => kiem_tra_pa(st, cu_v.as_ref(), &moi, u)?,
        _ => kiem_tra_du_an(st, cu_v.as_ref(), &mut moi, u)?,
    }
    if !ghi_de && loai != "pa" {
        kiem_tra_xoa_mem(c, st, u, loai, id, cu_v.as_ref(), &mut moi)?;
    }
    if cu_v.as_ref() == Some(&moi) {
        // không có gì thay đổi: không tăng phiên bản, không ghi lịch sử
        return Ok((moi, cu.as_ref().map(|x| x.1).unwrap_or(1)));
    }
    let pb = cu.as_ref().map(|x| x.1 + 1).unwrap_or(1);
    let du_an_id = if loai == "duAn" { id.to_string() } else { moi["duAnId"].as_str().unwrap_or("").to_string() };
    // P0-3: mã hồ sơ duy nhất trong dự án — chặn khi tạo mới hoặc đổi sang mã đã dùng (mã trùng có sẵn từ dữ liệu cũ
    // không chặn các sửa đổi khác; khôi phục dữ liệu giữ nguyên như bản sao lưu)
    if loai == "ho" && !ghi_de {
        let chuan = |v: &Value| v["ma"].as_str().unwrap_or("").trim().to_uppercase();
        let ma = chuan(&moi);
        if !ma.is_empty() && cu_v.as_ref().map(chuan).as_deref() != Some(ma.as_str()) {
            let mut q = c.prepare("SELECT noi_dung FROM ban_ghi WHERE loai = 'ho' AND du_an_id = ?1 AND id <> ?2").map_err(loi_db)?;
            let ds = q.query_map(params![du_an_id, id], |r| r.get::<_, String>(0)).map_err(loi_db)?;
            for x in ds.filter_map(|x| x.ok()).filter_map(|x| serde_json::from_str::<Value>(&x).ok()) {
                if chuan(&x) == ma {
                    return Err(loi(StatusCode::CONFLICT, format!("Mã hồ sơ {ma} đã dùng cho \"{}\" trong dự án", x["ten"].as_str().unwrap_or(""))));
                }
            }
        }
    }
    if cu.is_some() {
        luu_lich_su(c, loai, id, if ghi_de { "Ghi đè khi khôi phục dữ liệu" } else { "Sửa" }, &u.ten)?;
    }
    c.execute(
        "INSERT OR REPLACE INTO ban_ghi(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![loai, id, du_an_id, pb, moi.to_string(), bay_gio(), u.ten],
    )
    .map_err(loi_db)?;
    MayChu::ghi_thay_doi(c, loai, id, &du_an_id, &u.ten).map_err(loi_db)?;
    Ok((moi, pb))
}

/// Ghi nhiều bản ghi trong MỘT giao dịch SQLite (P0-6, "không nhập dở"): nhập Excel, tạo hồ sơ từ bản đồ,
/// cập nhật bước hàng loạt, xóa dự án, khôi phục dữ liệu. Một bản ghi sai phiên bản / vi phạm quy tắc → 409/4xx,
/// không ghi gì; lỗi nêu bản ghi gây lỗi.
/// Thân: { xoaTatCa?, ghiDe?, xoaDuAn?: [id], xoaHo?: [id], ghi?: [{ loai: "duAn"|"ho", duLieu, phienBanTruoc }],
///         tep?: [{ loai, id, meta, noiDung: base64 | null }] }
async fn ghi_lo(State(st): State<St>, h: HeaderMap, b: Bytes) -> Kq<Json<Value>> {
    use base64::Engine;
    let u = xac_thuc(&st, &h)?;
    let v = tach(&b)?;
    let ds = |k: &str| v[k].as_array().cloned().unwrap_or_default();
    let (xoa_tat_ca, ghi_de) = (v["xoaTatCa"].as_bool().unwrap_or(false), v["ghiDe"].as_bool().unwrap_or(false));
    let (xoa_du_an, xoa_ho, ghi, tep) = (ds("xoaDuAn"), ds("xoaHo"), ds("ghi"), ds("tep"));
    if xoa_tat_ca || ghi_de {
        can(&st, &u, "KHOI_PHUC")?;
    }
    if !ghi.is_empty() {
        can(&st, &u, "SUA_HO_SO")?;
    }
    for t in &tep {
        can(&st, &u, loai_tep(t["loai"].as_str().unwrap_or(""))?)?;
    }
    let mut c = st.db.lock().unwrap();
    let tx = c.transaction().map_err(loi_db)?;
    if xoa_tat_ca {
        tx.execute(
            "INSERT INTO lich_su(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, luu_luc, luu_boi, ly_do)
             SELECT loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, ?1, ?2, 'Khôi phục kiểu thay thế toàn bộ' FROM ban_ghi",
            params![bay_gio(), u.ten],
        )
        .map_err(loi_db)?;
        tx.execute_batch("DELETE FROM ban_ghi; DELETE FROM tep;").map_err(loi_db)?;
        MayChu::ghi_thay_doi(&tx, "tatCa", "", "", &u.ten).map_err(loi_db)?;
    }
    for id in xoa_du_an.iter().filter_map(|x| x.as_str()) {
        kiem_tra_xoa_han(&tx, &st, &u, "duAn", id)?;
        luu_lich_su_du_an(&tx, id, "Xóa hẳn", &u.ten)?;
        tx.execute("DELETE FROM ban_ghi WHERE (loai = 'duAn' AND id = ?1) OR (loai IN ('ho', 'pa') AND du_an_id = ?1)", [id]).map_err(loi_db)?;
        tx.execute("DELETE FROM tep WHERE loai = 'banDo' AND id = ?1", [id]).map_err(loi_db)?;
        MayChu::ghi_thay_doi(&tx, "duAn", id, id, &u.ten).map_err(loi_db)?;
    }
    for id in xoa_ho.iter().filter_map(|x| x.as_str()) {
        kiem_tra_xoa_han(&tx, &st, &u, "ho", id)?;
        let du_an: Option<String> = tx.query_row("SELECT du_an_id FROM ban_ghi WHERE loai = 'ho' AND id = ?1", [id], |r| r.get(0)).optional().map_err(loi_db)?;
        luu_lich_su(&tx, "ho", id, "Xóa hẳn", &u.ten)?;
        tx.execute("DELETE FROM ban_ghi WHERE loai = 'ho' AND id = ?1", [id]).map_err(loi_db)?;
        MayChu::ghi_thay_doi(&tx, "ho", id, &du_an.unwrap_or_default(), &u.ten).map_err(loi_db)?;
    }
    let mut phien_ban = Vec::with_capacity(ghi.len());
    for g in &ghi {
        let loai = match g["loai"].as_str() {
            Some(l @ ("duAn" | "ho" | "pa")) => l,
            _ => return Err(loi(StatusCode::BAD_REQUEST, "Loại bản ghi không hợp lệ")),
        };
        let moi = g["duLieu"].clone();
        let id = moi["id"].as_str().ok_or_else(|| loi(StatusCode::BAD_REQUEST, "Bản ghi thiếu mã"))?.to_string();
        let nhan = moi["ma"].as_str().map(|m| format!("Hồ sơ {m}")).or_else(|| moi["ten"].as_str().map(|t| format!("\"{t}\""))).unwrap_or_else(|| id.clone());
        let (du_lieu, pb) = ghi_ban_ghi(&tx, &st, &u, loai, &id, moi, g["phienBanTruoc"].as_i64(), ghi_de).map_err(|Loi(ma, s)| Loi(ma, format!("{nhan}: {s}")))?;
        phien_ban.push(json!({ "loai": loai, "id": id, "phienBan": pb, "duLieu": du_lieu }));
    }
    for t in &tep {
        let (loai, id) = (t["loai"].as_str().unwrap_or(""), t["id"].as_str().unwrap_or(""));
        match t["noiDung"].as_str() {
            None => {
                tx.execute("DELETE FROM tep WHERE loai = ?1 AND id = ?2", params![loai, id]).map_err(loi_db)?;
            }
            Some(b64) => {
                let noi_dung = base64::engine::general_purpose::STANDARD.decode(b64).map_err(|e| loi(StatusCode::BAD_REQUEST, format!("Tệp {loai}/{id} không đúng dạng: {e}")))?;
                let meta = t["meta"].as_str().unwrap_or("{}");
                tx.execute("INSERT OR REPLACE INTO tep(loai, id, meta, noi_dung) VALUES (?1, ?2, ?3, ?4)", params![loai, id, meta, noi_dung]).map_err(loi_db)?;
            }
        }
    }
    tx.commit().map_err(loi_db)?;
    Ok(Json(json!({ "phienBan": phien_ban })))
}

async fn luu_du_an(State(st): State<St>, h: HeaderMap, Path(id): Path<String>, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    luu_ban_ghi(&st, &u, "duAn", &id, &b)
}
async fn luu_ho(State(st): State<St>, h: HeaderMap, Path(id): Path<String>, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    luu_ban_ghi(&st, &u, "ho", &id, &b)
}

async fn xoa_du_an(State(st): State<St>, h: HeaderMap, Path(id): Path<String>) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    let mut c = st.db.lock().unwrap();
    kiem_tra_xoa_han(&c, &st, &u, "duAn", &id)?;
    let tx = c.transaction().map_err(loi_db)?;
    luu_lich_su_du_an(&tx, &id, "Xóa hẳn", &u.ten)?;
    tx.execute("DELETE FROM ban_ghi WHERE (loai = 'duAn' AND id = ?1) OR (loai IN ('ho', 'pa') AND du_an_id = ?1)", [&id]).map_err(loi_db)?;
    tx.execute("DELETE FROM tep WHERE loai = 'banDo' AND id = ?1", [&id]).map_err(loi_db)?;
    MayChu::ghi_thay_doi(&tx, "duAn", &id, &id, &u.ten).map_err(loi_db)?;
    tx.commit().map_err(loi_db)?;
    Ok(Json(json!({})))
}

async fn xoa_ho(State(st): State<St>, h: HeaderMap, Path(id): Path<String>) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    let c = st.db.lock().unwrap();
    kiem_tra_xoa_han(&c, &st, &u, "ho", &id)?;
    let du_an: Option<String> = c.query_row("SELECT du_an_id FROM ban_ghi WHERE loai = 'ho' AND id = ?1", [&id], |r| r.get(0)).optional().map_err(loi_db)?;
    luu_lich_su(&c, "ho", &id, "Xóa hẳn", &u.ten)?;
    c.execute("DELETE FROM ban_ghi WHERE loai = 'ho' AND id = ?1", [&id]).map_err(loi_db)?;
    MayChu::ghi_thay_doi(&c, "ho", &id, &du_an.unwrap_or_default(), &u.ten).map_err(loi_db)?;
    Ok(Json(json!({})))
}

fn loai_tep(loai: &str) -> Kq<&'static str> {
    match loai {
        "banDo" => Ok("SUA_HO_SO"),
        "mau" => Ok("THAY_MAU"),
        _ => Err(loi(StatusCode::NOT_FOUND, "Không có loại tệp này")),
    }
}

async fn ds_tep(State(st): State<St>, h: HeaderMap, Path(loai): Path<String>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    loai_tep(&loai)?;
    let c = st.db.lock().unwrap();
    let mut q = c.prepare("SELECT id FROM tep WHERE loai = ?1").map_err(loi_db)?;
    let ds: Vec<String> = q.query_map([&loai], |r| r.get(0)).map_err(loi_db)?.filter_map(|x| x.ok()).collect();
    Ok(Json(json!(ds)))
}

async fn doc_tep(State(st): State<St>, h: HeaderMap, Path((loai, id)): Path<(String, String)>) -> Kq<Response> {
    xac_thuc(&st, &h)?;
    loai_tep(&loai)?;
    let c = st.db.lock().unwrap();
    let r: Option<(String, Vec<u8>)> = c.query_row("SELECT meta, noi_dung FROM tep WHERE loai = ?1 AND id = ?2", params![loai, id], |r| Ok((r.get(0)?, r.get(1)?))).optional().map_err(loi_db)?;
    match r {
        Some((meta, b)) => Ok(([("x-meta", ma_hoa_url(&meta))], b).into_response()),
        None => Err(loi(StatusCode::NOT_FOUND, "Không có tệp")),
    }
}

async fn luu_tep(State(st): State<St>, h: HeaderMap, Path((loai, id)): Path<(String, String)>, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, loai_tep(&loai)?)?;
    let meta = h.get("x-meta").and_then(|v| v.to_str().ok()).map(giai_ma_url).unwrap_or_else(|| "{}".into());
    let c = st.db.lock().unwrap();
    c.execute("INSERT OR REPLACE INTO tep(loai, id, meta, noi_dung) VALUES (?1, ?2, ?3, ?4)", params![loai, id, meta, b.to_vec()]).map_err(loi_db)?;
    MayChu::ghi_thay_doi(&c, &loai, &id, if loai == "banDo" { &id } else { "" }, &u.ten).map_err(loi_db)?;
    Ok(Json(json!({})))
}

async fn xoa_tep(State(st): State<St>, h: HeaderMap, Path((loai, id)): Path<(String, String)>) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, loai_tep(&loai)?)?;
    let c = st.db.lock().unwrap();
    c.execute("DELETE FROM tep WHERE loai = ?1 AND id = ?2", params![loai, id]).map_err(loi_db)?;
    MayChu::ghi_thay_doi(&c, &loai, &id, "", &u.ten).map_err(loi_db)?;
    Ok(Json(json!({})))
}

async fn ds_nhat_ky(State(st): State<St>, h: HeaderMap) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, "XEM_NHAT_KY")?;
    let c = st.db.lock().unwrap();
    let mut q = c.prepare("SELECT noi_dung FROM nhat_ky ORDER BY stt").map_err(loi_db)?;
    let ds: Vec<Value> = q.query_map([], |r| r.get::<_, String>(0)).map_err(loi_db)?.filter_map(|x| x.ok().and_then(|s| serde_json::from_str(&s).ok())).collect();
    Ok(Json(Value::Array(ds)))
}

/// Máy trạm ghi nhật ký: người thực hiện lấy theo phiên đăng nhập, không theo nội dung gửi lên.
async fn ghi_nhat_ky(State(st): State<St>, h: HeaderMap, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    let v = tach(&b)?;
    let c = st.db.lock().unwrap();
    st.ghi_nhat_ky(&c, &u.ten, &u.ho_ten, v["hanhDong"].as_str().unwrap_or(""), v["chiTiet"].as_str().unwrap_or("")).map_err(loi_db)?;
    let d: String = c.query_row("SELECT noi_dung FROM nhat_ky ORDER BY stt DESC LIMIT 1", [], |r| r.get(0)).map_err(loi_db)?;
    Ok(Json(serde_json::from_str(&d).unwrap_or(Value::Null)))
}

async fn doc_cai_dat(State(st): State<St>, h: HeaderMap, Path(khoa): Path<String>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    let c = st.db.lock().unwrap();
    let r: Option<String> = c.query_row("SELECT noi_dung FROM cai_dat WHERE khoa = ?1", [&khoa], |r| r.get(0)).optional().map_err(loi_db)?;
    Ok(Json(r.and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Null)))
}

async fn luu_cai_dat(State(st): State<St>, h: HeaderMap, Path(khoa): Path<String>, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, "CAI_DAT")?;
    let v = tach(&b)?;
    let c = st.db.lock().unwrap();
    if khoa == "giuLichSu" {
        // thời hạn giữ lịch sử quyết định dữ liệu bị xóa vĩnh viễn: chỉ quản trị
        can(&st, &u, "KHOI_PHUC_BAN_GHI")?;
        if !v["soNam"].as_i64().is_some_and(|n| (0..=100).contains(&n)) {
            return Err(loi(StatusCode::BAD_REQUEST, "Số năm giữ lịch sử phải từ 0 (không thời hạn) đến 100"));
        }
    }
    c.execute("INSERT OR REPLACE INTO cai_dat(khoa, noi_dung) VALUES (?1, ?2)", params![khoa, v.to_string()]).map_err(loi_db)?;
    MayChu::ghi_thay_doi(&c, "caiDat", &khoa, "", &u.ten).map_err(loi_db)?;
    if khoa == "giuLichSu" {
        let n = don_lich_su(&c).map_err(loi_db)?;
        st.ghi_nhat_ky(&c, &u.ten, &u.ho_ten, "Đặt thời hạn giữ lịch sử bản ghi", &format!("{} năm; đã xóa {n} bản cũ hơn thời hạn", v["soNam"])).map_err(loi_db)?;
        return Ok(Json(json!({ "daXoa": n })));
    }
    Ok(Json(json!({})))
}

async fn xoa_tat_ca(State(st): State<St>, h: HeaderMap) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, "KHOI_PHUC")?;
    let c = st.db.lock().unwrap();
    c.execute(
        "INSERT INTO lich_su(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, luu_luc, luu_boi, ly_do)
         SELECT loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, ?1, ?2, 'Khôi phục kiểu thay thế toàn bộ' FROM ban_ghi",
        params![bay_gio(), u.ten],
    )
    .map_err(loi_db)?;
    c.execute_batch("DELETE FROM ban_ghi; DELETE FROM tep;").map_err(loi_db)?;
    MayChu::ghi_thay_doi(&c, "tatCa", "", "", &u.ten).map_err(loi_db)?;
    Ok(Json(json!({})))
}

#[derive(serde::Deserialize)]
struct Sau {
    sau: Option<i64>,
}

/// Danh sách thay đổi sau số thứ tự `sau` — máy trạm hỏi định kỳ để cập nhật.
async fn thay_doi(State(st): State<St>, h: HeaderMap, Query(s): Query<Sau>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    let c = st.db.lock().unwrap();
    let cuoi: i64 = c.query_row("SELECT COALESCE(MAX(seq), 0) FROM thay_doi", [], |r| r.get(0)).map_err(loi_db)?;
    let sau = s.sau.unwrap_or(cuoi);
    let mut q = c.prepare("SELECT seq, loai, id, du_an_id, boi, luc FROM thay_doi WHERE seq > ?1 ORDER BY seq LIMIT 500").map_err(loi_db)?;
    let ds: Vec<Value> = q
        .query_map([sau], |r| {
            Ok(json!({ "seq": r.get::<_, i64>(0)?, "loai": r.get::<_, String>(1)?, "id": r.get::<_, String>(2)?, "duAnId": r.get::<_, Option<String>>(3)?, "boi": r.get::<_, String>(4)?, "luc": r.get::<_, String>(5)? }))
        })
        .map_err(loi_db)?
        .filter_map(|x| x.ok())
        .collect();
    Ok(Json(json!({ "seq": cuoi, "ds": ds })))
}

/// Đọc lại một số bản ghi theo danh sách (P1-2: máy trạm chỉ tải bản ghi vừa đổi). Bản ghi không còn → duLieu null.
async fn doc_nhieu(State(st): State<St>, h: HeaderMap, b: Bytes) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    let v = tach(&b)?;
    let c = st.db.lock().unwrap();
    let mut out = vec![];
    for x in v["ds"].as_array().into_iter().flatten().take(5000) {
        let (loai, id) = (x["loai"].as_str().unwrap_or(""), x["id"].as_str().unwrap_or(""));
        let r: Option<(String, i64)> = c
            .query_row("SELECT noi_dung, phien_ban FROM ban_ghi WHERE loai = ?1 AND id = ?2", params![loai, id], |r| Ok((r.get(0)?, r.get(1)?)))
            .optional()
            .map_err(loi_db)?;
        out.push(match r {
            Some((nd, pb)) => json!({ "loai": loai, "id": id, "duLieu": serde_json::from_str::<Value>(&nd).unwrap_or(Value::Null), "phienBan": pb }),
            None => json!({ "loai": loai, "id": id, "duLieu": null, "phienBan": null }),
        });
    }
    Ok(Json(Value::Array(out)))
}

async fn api_ds_pa(State(st): State<St>, h: HeaderMap, Query(l): Query<LocDuAn>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    Ok(Json(doc_ban_ghi(&st.db.lock().unwrap(), "pa", l.du_an.as_deref())?))
}

#[derive(serde::Deserialize)]
struct LocLichSu {
    loai: Option<String>,
    id: Option<String>,
    #[serde(rename = "duAn")]
    du_an: Option<String>,
}

fn dong_lich_su(r: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "stt": r.get::<_, i64>(0)?, "loai": r.get::<_, String>(1)?, "id": r.get::<_, String>(2)?, "duAnId": r.get::<_, Option<String>>(3)?,
        "phienBan": r.get::<_, Option<i64>>(4)?, "duLieu": serde_json::from_str::<Value>(&r.get::<_, String>(5)?).unwrap_or(Value::Null),
        "suaLuc": r.get::<_, Option<String>>(6)?, "suaBoi": r.get::<_, Option<String>>(7)?, "luuLuc": r.get::<_, String>(8)?,
        "luuBoi": r.get::<_, Option<String>>(9)?, "lyDo": r.get::<_, Option<String>>(10)?
    }))
}
const COT_LICH_SU: &str = "stt, loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi, luu_luc, luu_boi, ly_do";

/// Các bản cũ của một bản ghi, mới nhất trước (P1-5).
async fn lich_su(State(st): State<St>, h: HeaderMap, Query(l): Query<LocLichSu>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    let c = st.db.lock().unwrap();
    let mut q = c.prepare(&format!("SELECT {COT_LICH_SU} FROM lich_su WHERE loai = ?1 AND id = ?2 ORDER BY stt DESC LIMIT 500")).map_err(loi_db)?;
    let ds: Vec<Value> = q.query_map(params![l.loai.unwrap_or_default(), l.id.unwrap_or_default()], dong_lich_su).map_err(loi_db)?.filter_map(|x| x.ok()).collect();
    Ok(Json(json!({ "ds": ds, "soNamGiu": so_nam_giu(&c) })))
}

/// Hồ sơ đã xóa hẳn (còn trong lịch sử) của một dự án — bản cuối trước khi xóa.
async fn lich_su_da_xoa(State(st): State<St>, h: HeaderMap, Query(l): Query<LocLichSu>) -> Kq<Json<Value>> {
    xac_thuc(&st, &h)?;
    let c = st.db.lock().unwrap();
    let mut q = c
        .prepare(&format!(
            "SELECT {COT_LICH_SU} FROM lich_su ls WHERE loai = 'ho' AND du_an_id = ?1 AND ly_do = 'Xóa hẳn'
             AND stt = (SELECT MAX(stt) FROM lich_su x WHERE x.loai = 'ho' AND x.id = ls.id)
             AND NOT EXISTS (SELECT 1 FROM ban_ghi b WHERE b.loai = 'ho' AND b.id = ls.id) ORDER BY stt DESC LIMIT 500"
        ))
        .map_err(loi_db)?;
    let ds: Vec<Value> = q.query_map([l.du_an.unwrap_or_default()], dong_lich_su).map_err(loi_db)?.filter_map(|x| x.ok()).collect();
    Ok(Json(Value::Array(ds)))
}

/// Khôi phục một hồ sơ về bản trong lịch sử (P1-5) — chỉ Quản trị (KHOI_PHUC_BAN_GHI), bắt buộc lý do. Bản hiện có
/// được lưu vào lịch sử trước; ghi nhật ký hồ sơ và nhật ký hệ thống.
async fn khoi_phuc_ban_ghi(State(st): State<St>, h: HeaderMap, b: Bytes) -> Kq<Json<Value>> {
    let u = xac_thuc(&st, &h)?;
    can(&st, &u, "KHOI_PHUC_BAN_GHI")?;
    let v = tach(&b)?;
    let ly_do = v["lyDo"].as_str().unwrap_or("").trim().to_string();
    if ly_do.is_empty() {
        return Err(loi(StatusCode::BAD_REQUEST, "Khôi phục cần ghi lý do"));
    }
    let stt = v["stt"].as_i64().ok_or_else(|| loi(StatusCode::BAD_REQUEST, "Thiếu số thứ tự bản lịch sử"))?;
    let mut c = st.db.lock().unwrap();
    let ls = c
        .query_row(&format!("SELECT {COT_LICH_SU} FROM lich_su WHERE stt = ?1"), [stt], dong_lich_su)
        .optional()
        .map_err(loi_db)?
        .ok_or_else(|| loi(StatusCode::NOT_FOUND, "Không còn bản lịch sử này"))?;
    if ls["loai"] != "ho" {
        return Err(loi(StatusCode::BAD_REQUEST, "Chỉ khôi phục được hồ sơ hộ, cá nhân, tổ chức"));
    }
    let id = ls["id"].as_str().unwrap_or("").to_string();
    let mut moi = ls["duLieu"].clone();
    let du_an_id = moi["duAnId"].as_str().unwrap_or("").to_string();
    if doc_json(&c, "duAn", &du_an_id)?.is_none() {
        return Err(loi(StatusCode::CONFLICT, "Dự án của hồ sơ không còn — không khôi phục được"));
    }
    kiem_luoc_do("ho", None, &moi, false).map_err(|e| loi(StatusCode::BAD_REQUEST, e))?;
    let ma = moi["ma"].as_str().unwrap_or("").trim().to_uppercase();
    {
        let mut q = c.prepare("SELECT noi_dung FROM ban_ghi WHERE loai = 'ho' AND du_an_id = ?1 AND id <> ?2").map_err(loi_db)?;
        let trung = q
            .query_map(params![du_an_id, id], |r| r.get::<_, String>(0))
            .map_err(loi_db)?
            .filter_map(|x| x.ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()))
            .find(|x| !ma.is_empty() && x["ma"].as_str().unwrap_or("").trim().to_uppercase() == ma);
        if let Some(x) = trung {
            return Err(loi(StatusCode::CONFLICT, format!("Mã hồ sơ {ma} đang dùng cho \"{}\" — đổi mã hồ sơ đó trước khi khôi phục", x["ten"].as_str().unwrap_or(""))));
        }
    }
    let luc = bay_gio();
    let mo_ta = format!("Quản trị khôi phục về phiên bản {} (lưu lúc {}): {ly_do}", ls["phienBan"], ls["suaLuc"].as_str().unwrap_or(""));
    if let Some(nk) = moi["nhatKy"].as_array_mut() {
        nk.push(json!({ "luc": luc, "nguoi": format!("{} ({})", u.ho_ten, u.ten), "noiDung": mo_ta }));
    }
    let tx = c.transaction().map_err(loi_db)?;
    let pb_cu: Option<i64> = tx.query_row("SELECT phien_ban FROM ban_ghi WHERE loai = 'ho' AND id = ?1", [&id], |r| r.get(0)).optional().map_err(loi_db)?;
    if pb_cu.is_some() {
        luu_lich_su(&tx, "ho", &id, &format!("Trước khi khôi phục về phiên bản {}", ls["phienBan"]), &u.ten)?;
    }
    let pb = pb_cu.unwrap_or(0) + 1;
    tx.execute(
        "INSERT OR REPLACE INTO ban_ghi(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi) VALUES ('ho', ?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, du_an_id, pb, moi.to_string(), luc, u.ten],
    )
    .map_err(loi_db)?;
    MayChu::ghi_thay_doi(&tx, "ho", &id, &du_an_id, &u.ten).map_err(loi_db)?;
    st.ghi_nhat_ky(&tx, &u.ten, &u.ho_ten, "Khôi phục hồ sơ về phiên bản cũ", &format!("{} · {} — {mo_ta}", moi["ma"].as_str().unwrap_or(""), moi["ten"].as_str().unwrap_or(""))).map_err(loi_db)?;
    tx.commit().map_err(loi_db)?;
    Ok(Json(json!({ "duLieu": moi, "phienBan": pb })))
}

pub fn ma_hoa_url(s: &str) -> String {
    s.bytes()
        .map(|b| if b.is_ascii_alphanumeric() || b"-_.~".contains(&b) { (b as char).to_string() } else { format!("%{b:02X}") })
        .collect()
}
pub fn giai_ma_url(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::new();
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(x) = u8::from_str_radix(std::str::from_utf8(&b[i + 1..i + 3]).unwrap_or(""), 16) {
                out.push(x);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

pub fn dinh_tuyen(st: St) -> Router {
    Router::new()
        .route("/api/trang-thai", get(trang_thai))
        .route("/api/khoi-tao", post(khoi_tao))
        .route("/api/dang-nhap", post(dang_nhap))
        .route("/api/dang-xuat", post(dang_xuat))
        .route("/api/doi-mat-khau", post(doi_mat_khau))
        .route("/api/nguoi-dung", get(ds_nguoi_dung))
        .route("/api/nguoi-dung/:ten", put(luu_nguoi_dung))
        .route("/api/du-an", get(ds_du_an))
        .route("/api/du-an/:id", put(luu_du_an).delete(xoa_du_an))
        .route("/api/ho", get(ds_ho))
        .route("/api/ho/:id", put(luu_ho).delete(xoa_ho))
        .route("/api/tep/:loai", get(ds_tep))
        .route("/api/tep/:loai/:id", get(doc_tep).put(luu_tep).delete(xoa_tep))
        .route("/api/nhat-ky", get(ds_nhat_ky).post(ghi_nhat_ky))
        .route("/api/cai-dat/:khoa", get(doc_cai_dat).put(luu_cai_dat))
        .route("/api/xoa-tat-ca", post(xoa_tat_ca))
        .route("/api/lo", post(ghi_lo))
        .route("/api/thay-doi", get(thay_doi))
        .route("/api/doc", post(doc_nhieu))
        .route("/api/pa", get(api_ds_pa))
        .route("/api/lich-su", get(lich_su))
        .route("/api/lich-su/da-xoa", get(lich_su_da_xoa))
        .route("/api/lich-su/khoi-phuc", post(khoi_phuc_ban_ghi))
        .layer(DefaultBodyLimit::max(300 * 1024 * 1024))
        .with_state(st)
}

// ---------------- Máy đơn: cùng lõi SQLite, gọi trong tiến trình (không mở cổng mạng) ----------------

/// Mở CSDL máy đơn (thư mục dữ liệu ứng dụng\may-don) và trả bộ định tuyến để vỏ gọi trực tiếp (lệnh goi_noi_bo).
/// Ngoài các đường dẫn như máy chủ, có hai đường dẫn chỉ gọi được trong tiến trình (máy chủ mạng không có):
/// chuyển dữ liệu IndexedDB cũ vào CSDL trống, và xuất toàn bộ dữ liệu máy đơn để đưa lên máy chủ.
pub fn mo_may_don(thu_muc: PathBuf) -> Result<Router, String> {
    std::fs::create_dir_all(&thu_muc).map_err(|e| format!("Không tạo được thư mục dữ liệu: {e}"))?;
    let st = Arc::new(MayChu::mo(&thu_muc.join("gpmb-may-don.sqlite")).map_err(|e| format!("Không mở được CSDL máy đơn: {e}"))?);
    let noi_bo = Router::new()
        .route("/api/noi-bo/chuyen-du-lieu", post(chuyen_du_lieu))
        .route("/api/noi-bo/xuat", get(xuat_noi_bo))
        .layer(DefaultBodyLimit::max(1024 * 1024 * 1024))
        .with_state(st.clone());
    Ok(dinh_tuyen(st).merge(noi_bo))
}

/// Chuyển dữ liệu máy đơn cũ (IndexedDB) vào CSDL SQLite TRỐNG — một giao dịch; giữ nguyên tài khoản (băm mật khẩu),
/// nhật ký hệ thống (chuỗi băm), cài đặt, bản đồ, mẫu; phương án tách thành bản ghi riêng.
async fn chuyen_du_lieu(State(st): State<St>, b: Bytes) -> Kq<Json<Value>> {
    use base64::Engine;
    let v = tach(&b)?;
    let ds = |k: &str| v[k].as_array().cloned().unwrap_or_default();
    let mut c = st.db.lock().unwrap();
    let (n_nd, n_bg): (i64, i64) = c
        .query_row("SELECT (SELECT COUNT(*) FROM nguoi_dung), (SELECT COUNT(*) FROM ban_ghi)", [], |r| Ok((r.get(0)?, r.get(1)?)))
        .map_err(loi_db)?;
    if n_nd + n_bg > 0 {
        return Err(loi(StatusCode::CONFLICT, "CSDL máy đơn đã có dữ liệu — không chuyển đổi lại"));
    }
    let tx = c.transaction().map_err(loi_db)?;
    let luc = bay_gio();
    for u in ds("nguoiDung") {
        let ten = u["ten"].as_str().unwrap_or("").to_string();
        if !ten.is_empty() {
            tx.execute("INSERT OR REPLACE INTO nguoi_dung(ten, noi_dung) VALUES (?1, ?2)", params![ten, u.to_string()]).map_err(loi_db)?;
        }
    }
    let mut nk = ds("nhatKy");
    nk.sort_by_key(|x| x["stt"].as_i64().unwrap_or(0));
    for d in &nk {
        tx.execute("INSERT OR REPLACE INTO nhat_ky(stt, noi_dung) VALUES (?1, ?2)", params![d["stt"].as_i64().unwrap_or(0), d.to_string()]).map_err(loi_db)?;
    }
    for x in ds("caiDat") {
        if let Some(k) = x["khoa"].as_str() {
            tx.execute("INSERT OR REPLACE INTO cai_dat(khoa, noi_dung) VALUES (?1, ?2)", params![k, x["giaTri"].to_string()]).map_err(loi_db)?;
        }
    }
    let ghi = |loai: &str, id: &str, du_an: &str, v: &Value| -> Kq<()> {
        tx.execute(
            "INSERT OR REPLACE INTO ban_ghi(loai, id, du_an_id, phien_ban, noi_dung, sua_luc, sua_boi) VALUES (?1, ?2, ?3, 1, ?4, ?5, 'chuyen-doi-may-don')",
            params![loai, id, du_an, v.to_string(), luc],
        )
        .map_err(loi_db)?;
        Ok(())
    };
    let (mut so_da, mut so_ho, mut so_pa) = (0, 0, 0);
    for mut d in ds("duAn") {
        let id = d["id"].as_str().unwrap_or("").to_string();
        if id.is_empty() {
            continue;
        }
        let pas = d.as_object_mut().and_then(|o| o.remove("phuongAn")).and_then(|x| x.as_array().cloned()).unwrap_or_default();
        for p in pas {
            if let Some(pid) = p["id"].as_str() {
                ghi("pa", pid, &id, &json!({ "id": pid, "duAnId": id, "pa": p }))?;
                so_pa += 1;
            }
        }
        ghi("duAn", &id, &id, &d)?;
        so_da += 1;
    }
    for h in ds("ho") {
        let (id, da) = (h["id"].as_str().unwrap_or(""), h["duAnId"].as_str().unwrap_or(""));
        if !id.is_empty() {
            ghi("ho", id, da, &h)?;
            so_ho += 1;
        }
    }
    let mut so_tep = 0;
    for t in ds("tep") {
        let (loai, id) = (t["loai"].as_str().unwrap_or(""), t["id"].as_str().unwrap_or(""));
        let noi_dung = base64::engine::general_purpose::STANDARD.decode(t["noiDung"].as_str().unwrap_or("")).map_err(|e| loi(StatusCode::BAD_REQUEST, format!("Tệp {loai}/{id}: {e}")))?;
        tx.execute("INSERT OR REPLACE INTO tep(loai, id, meta, noi_dung) VALUES (?1, ?2, ?3, ?4)", params![loai, id, t["meta"].as_str().unwrap_or("{}"), noi_dung]).map_err(loi_db)?;
        so_tep += 1;
    }
    let tom_tat = format!("{so_da} dự án, {so_ho} hồ sơ, {so_pa} bản phương án, {so_tep} tệp, {} tài khoản, {} dòng nhật ký", ds("nguoiDung").len(), nk.len());
    st.ghi_nhat_ky(&tx, "he-thong", "Phần mềm", "Chuyển dữ liệu máy đơn từ IndexedDB sang SQLite", &tom_tat).map_err(loi_db)?;
    tx.commit().map_err(loi_db)?;
    Ok(Json(json!({ "tomTat": tom_tat })))
}

/// Xuất toàn bộ dữ liệu máy đơn (để đưa lên máy chủ khi chuyển sang chế độ mạng nội bộ) — phương án ghép lại vào dự án.
async fn xuat_noi_bo(State(st): State<St>) -> Kq<Json<Value>> {
    use base64::Engine;
    let c = st.db.lock().unwrap();
    let doc = |sql: &str| -> Kq<Vec<Value>> {
        let mut q = c.prepare(sql).map_err(loi_db)?;
        let ds = q.query_map([], |r| r.get::<_, String>(0)).map_err(loi_db)?.filter_map(|x| x.ok().and_then(|s| serde_json::from_str(&s).ok())).collect();
        Ok(ds)
    };
    let pa = doc("SELECT noi_dung FROM ban_ghi WHERE loai = 'pa'")?;
    let mut du_an = doc("SELECT noi_dung FROM ban_ghi WHERE loai = 'duAn'")?;
    for d in du_an.iter_mut() {
        let ds: Vec<Value> = pa.iter().filter(|p| p["duAnId"] == d["id"]).map(|p| p["pa"].clone()).collect();
        d["phuongAn"] = Value::Array(ds);
    }
    let mut q = c.prepare("SELECT loai, id, meta, noi_dung FROM tep").map_err(loi_db)?;
    let tep: Vec<Value> = q
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?, r.get::<_, Vec<u8>>(3)?)))
        .map_err(loi_db)?
        .filter_map(|x| x.ok())
        .map(|(l, i, m, b)| json!({ "loai": l, "id": i, "meta": m, "noiDung": base64::engine::general_purpose::STANDARD.encode(b) }))
        .collect();
    let mut q = c.prepare("SELECT khoa, noi_dung FROM cai_dat").map_err(loi_db)?;
    let cai_dat: Vec<Value> = q
        .query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))
        .map_err(loi_db)?
        .filter_map(|x| x.ok())
        .map(|(k, v)| json!({ "khoa": k, "giaTri": serde_json::from_str::<Value>(&v).unwrap_or(Value::Null) }))
        .collect();
    Ok(Json(json!({
        "duAn": du_an, "ho": doc("SELECT noi_dung FROM ban_ghi WHERE loai = 'ho'")?, "tep": tep, "caiDat": cai_dat,
        "nguoiDung": doc("SELECT noi_dung FROM nguoi_dung")?, "nhatKy": doc("SELECT noi_dung FROM nhat_ky ORDER BY stt")?
    })))
}

// ---------------- Chứng chỉ, khởi chạy ----------------

pub struct ChungChi {
    pub cert_pem: String,
    pub key_pem: String,
    pub van_tay: String,
}

/// SHA-256 của chứng chỉ (DER), dạng AB:CD:… — cán bộ đối chiếu giữa máy chủ và máy trạm.
pub fn van_tay(der: &[u8]) -> String {
    Sha256::digest(der).iter().map(|b| format!("{b:02X}")).collect::<Vec<_>>().join(":")
}

pub fn chung_chi(thu_muc: &FsPath) -> Result<ChungChi, String> {
    let (pc, pk) = (thu_muc.join("chung-chi.pem"), thu_muc.join("khoa-rieng.pem"));
    let (cert_pem, key_pem) = if pc.exists() && pk.exists() {
        (std::fs::read_to_string(&pc).map_err(|e| e.to_string())?, std::fs::read_to_string(&pk).map_err(|e| e.to_string())?)
    } else {
        let ck = rcgen::generate_simple_self_signed(vec!["gpmb-may-chu".into(), "localhost".into()]).map_err(|e| e.to_string())?;
        let (c, k) = (ck.cert.pem(), ck.key_pair.serialize_pem());
        std::fs::write(&pc, &c).map_err(|e| e.to_string())?;
        std::fs::write(&pk, &k).map_err(|e| e.to_string())?;
        (c, k)
    };
    let der = pem_der(&cert_pem).ok_or("Chứng chỉ máy chủ hỏng")?;
    Ok(ChungChi { van_tay: van_tay(&der), cert_pem, key_pem })
}

fn pem_der(pem: &str) -> Option<Vec<u8>> {
    let b64: String = pem.lines().filter(|l| !l.starts_with("-----")).collect();
    giai_base64(&b64)
}

fn giai_base64(s: &str) -> Option<Vec<u8>> {
    const B: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = Vec::new();
    let (mut buf, mut bits) = (0u32, 0);
    for ch in s.bytes().filter(|c| !c.is_ascii_whitespace() && *c != b'=') {
        buf = (buf << 6) | B.iter().position(|x| *x == ch)? as u32;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    Some(out)
}

pub struct DangChay {
    pub handle: axum_server::Handle,
    pub cong: u16,
    pub van_tay: String,
}

/// Khởi động máy chủ HTTPS trên mọi địa chỉ của máy, cổng `cong`.
pub async fn khoi_dong(thu_muc: PathBuf, cong: u16) -> Result<DangChay, String> {
    let _ = rustls::crypto::ring::default_provider().install_default();
    std::fs::create_dir_all(&thu_muc).map_err(|e| format!("Không tạo được thư mục máy chủ: {e}"))?;
    let cc = chung_chi(&thu_muc)?;
    let st = Arc::new(MayChu::mo(&thu_muc.join("gpmb-may-chu.sqlite")).map_err(|e| format!("Không mở được CSDL: {e}"))?);
    let cfg = axum_server::tls_rustls::RustlsConfig::from_pem(cc.cert_pem.into_bytes(), cc.key_pem.into_bytes()).await.map_err(|e| e.to_string())?;
    let handle = axum_server::Handle::new();
    let dia_chi = SocketAddr::from(([0, 0, 0, 0], cong));
    // mở cổng ngay tại đây (báo lỗi cổng bận; máy trạm gọi được ngay khi hàm trả về)
    let nghe = std::net::TcpListener::bind(dia_chi).map_err(|e| format!("Không mở được cổng {cong}: {e}"))?;
    nghe.set_nonblocking(true).map_err(|e| e.to_string())?;
    let app = dinh_tuyen(st);
    let h2 = handle.clone();
    tokio::spawn(async move {
        let _ = axum_server::from_tcp_rustls(nghe, cfg).handle(h2).serve(app.into_make_service_with_connect_info::<SocketAddr>()).await;
    });
    Ok(DangChay { handle, cong, van_tay: cc.van_tay })
}

/// Các địa chỉ IPv4 trong mạng nội bộ của máy (để máy trạm nhập).
pub fn dia_chi_noi_bo() -> Vec<String> {
    if_addrs::get_if_addrs()
        .unwrap_or_default()
        .into_iter()
        .filter(|i| !i.is_loopback())
        .filter_map(|i| match i.ip() {
            std::net::IpAddr::V4(v) if v.is_private() => Some(v.to_string()),
            _ => None,
        })
        .collect()
}

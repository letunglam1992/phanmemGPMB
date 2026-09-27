//! Vỏ ứng dụng desktop. Toàn bộ nghiệp vụ nằm ở giao diện (TypeScript) và các gói @gpmb/*;
//! vỏ Rust chỉ mở cửa sổ WebView2 và ghi tệp sao lưu tự động vào thư mục trên máy.
//! Không mở cổng mạng, không gửi dữ liệu ra ngoài.

use std::fs;
use std::path::PathBuf;
use tauri::ipc::{InvokeBody, Request};
use tauri::Manager;

const TIEN_TO: &str = "GPMB-tu-dong_";
const DUOI: &str = ".gpmb";

/// Giải mã %XX trong header (đường dẫn có dấu tiếng Việt được encodeURIComponent phía giao diện).
fn giai_ma(s: &str) -> Result<String, String> {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            let h = std::str::from_utf8(&b[i + 1..i + 3]).map_err(|e| e.to_string())?;
            out.push(u8::from_str_radix(h, 16).map_err(|_| "Mã hóa đường dẫn không hợp lệ".to_string())?);
            i += 3;
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|e| e.to_string())
}

/// Thư mục sao lưu: đường dẫn cán bộ chọn, hoặc mặc định Documents\GPMB Son La\Sao luu.
fn thu_muc(app: &tauri::AppHandle, rieng: &str) -> Result<PathBuf, String> {
    let p = if rieng.trim().is_empty() {
        app.path()
            .document_dir()
            .map_err(|e| format!("Không xác định được thư mục Documents: {e}"))?
            .join("GPMB Son La")
            .join("Sao luu")
    } else {
        PathBuf::from(rieng.trim())
    };
    if !p.is_absolute() {
        return Err("Đường dẫn thư mục sao lưu phải là đường dẫn đầy đủ (vd. D:\\SaoLuu)".into());
    }
    fs::create_dir_all(&p).map_err(|e| format!("Không tạo được thư mục {}: {e}", p.display()))?;
    Ok(p)
}

fn tieu_de(req: &Request<'_>, ten: &str) -> Result<String, String> {
    let v = req.headers().get(ten).ok_or(format!("Thiếu {ten}"))?;
    giai_ma(v.to_str().map_err(|e| e.to_string())?)
}

/// Ghi tệp (qua tệp tạm rồi đổi tên), sau đó chỉ giữ `giu` bản tự động mới nhất (tên có dấu thời gian → sắp theo tên).
fn ghi_va_don(dir: &std::path::Path, ten: &str, du_lieu: &[u8], giu: usize) -> Result<PathBuf, String> {
    let dich = dir.join(ten);
    let tam = dir.join(format!("{ten}.tam"));
    fs::write(&tam, du_lieu).map_err(|e| format!("Không ghi được {}: {e}", tam.display()))?;
    fs::rename(&tam, &dich).map_err(|e| format!("Không đổi tên tệp tạm: {e}"))?;
    let mut ds: Vec<String> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|x| x.ok())
        .map(|x| x.file_name().to_string_lossy().into_owned())
        .filter(|n| n.starts_with(TIEN_TO) && n.ends_with(DUOI))
        .collect();
    ds.sort();
    let giu = giu.max(1);
    if ds.len() > giu {
        for n in &ds[..ds.len() - giu] {
            let _ = fs::remove_file(dir.join(n));
        }
    }
    Ok(dich)
}

/// Ghi một bản sao lưu tự động (thân yêu cầu = nội dung tệp .gpmb) và chỉ giữ lại `giu-lai` bản mới nhất.
#[tauri::command]
fn ghi_sao_luu(app: tauri::AppHandle, request: Request<'_>) -> Result<String, String> {
    let InvokeBody::Raw(du_lieu) = request.body() else {
        return Err("Dữ liệu sao lưu không đúng dạng".into());
    };
    let ten = tieu_de(&request, "ten-tep")?;
    let hop_le = ten.starts_with(TIEN_TO)
        && ten.ends_with(DUOI)
        && ten.chars().all(|c| c.is_ascii_alphanumeric() || "._-".contains(c));
    if !hop_le {
        return Err(format!("Tên tệp sao lưu không hợp lệ: {ten}"));
    }
    let giu: usize = tieu_de(&request, "giu-lai")?.parse().map_err(|_| "Số bản giữ lại không hợp lệ".to_string())?;
    let dir = thu_muc(&app, &tieu_de(&request, "thu-muc")?)?;
    let dich = ghi_va_don(&dir, &ten, du_lieu, giu)?;
    Ok(dich.display().to_string())
}

#[tauri::command]
fn thu_muc_sao_luu(app: tauri::AppHandle, rieng: String) -> Result<String, String> {
    Ok(thu_muc(&app, &rieng)?.display().to_string())
}

/// Mở thư mục sao lưu trong trình quản lý tệp.
#[tauri::command]
fn mo_thu_muc_sao_luu(app: tauri::AppHandle, rieng: String) -> Result<(), String> {
    let dir = thu_muc(&app, &rieng)?;
    #[cfg(target_os = "windows")]
    let lenh = "explorer";
    #[cfg(target_os = "macos")]
    let lenh = "open";
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let lenh = "xdg-open";
    std::process::Command::new(lenh).arg(dir).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ghi_sao_luu, thu_muc_sao_luu, mo_thu_muc_sao_luu])
        .run(tauri::generate_context!())
        .expect("không khởi động được ứng dụng");
}

#[cfg(test)]
mod kiem_thu {
    use super::{ghi_va_don, giai_ma};

    #[test]
    fn ghi_va_chi_giu_so_ban_moi_nhat() {
        let dir = std::env::temp_dir().join(format!("gpmb-kt-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("tai-lieu-khac.gpmb"), b"x").unwrap();
        for i in 1..=5 {
            ghi_va_don(&dir, &format!("GPMB-tu-dong_2026100{i}_080000.gpmb"), &[i as u8], 3).unwrap();
        }
        let mut con: Vec<String> = std::fs::read_dir(&dir).unwrap().map(|x| x.unwrap().file_name().to_string_lossy().into_owned()).collect();
        con.sort();
        assert_eq!(con, vec!["GPMB-tu-dong_20261003_080000.gpmb", "GPMB-tu-dong_20261004_080000.gpmb", "GPMB-tu-dong_20261005_080000.gpmb", "tai-lieu-khac.gpmb"]);
        assert_eq!(std::fs::read(dir.join("GPMB-tu-dong_20261005_080000.gpmb")).unwrap(), vec![5u8]);
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn giai_ma_duong_dan_co_dau() {
        assert_eq!(giai_ma("D%3A%5CSao%20l%C6%B0u").unwrap(), "D:\\Sao lưu");
        assert_eq!(giai_ma("abc").unwrap(), "abc");
        assert!(giai_ma("%ZZ").is_err());
    }
}

//! Hỏi đáp AI qua Gemini API (Google). Chỉ gọi tới generativelanguage.googleapis.com với khóa API người dùng tự tạo;
//! giao diện quyết định nội dung gửi đi (câu hỏi + đoạn văn bản pháp lý, không có dữ liệu hồ sơ). Không lưu gì ở đây.
use serde::Serialize;
use std::time::Duration;

const GOC: &str = "https://generativelanguage.googleapis.com/v1beta/";

#[derive(Serialize)]
pub struct PhanHoi {
    pub ma: u16,
    pub noi_dung: String,
}

/// Đường dẫn được phép: "models" (liệt kê mô hình) hoặc "models/<tên>:generateContent".
pub fn duong_dan_hop_le(p: &str) -> bool {
    if p == "models" {
        return true;
    }
    let Some(ten) = p.strip_prefix("models/").and_then(|x| x.strip_suffix(":generateContent")) else { return false };
    !ten.is_empty() && ten.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '.' || c == '_')
}

#[tauri::command]
pub async fn goi_gemini(khoa: String, duong_dan: String, than: Option<String>) -> Result<PhanHoi, String> {
    if !duong_dan_hop_le(&duong_dan) {
        return Err("Đường dẫn Gemini không hợp lệ".into());
    }
    let khoa = khoa.trim().to_string();
    if khoa.is_empty() || khoa.len() > 200 || !khoa.chars().all(|c| c.is_ascii_graphic()) {
        return Err("Khóa API không hợp lệ".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let a = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(10)).timeout(Duration::from_secs(120)).build();
        let url = format!("{GOC}{duong_dan}");
        let r = match &than {
            Some(b) => a.post(&url).set("x-goog-api-key", &khoa).set("content-type", "application/json").send_string(b),
            None => a.get(&url).set("x-goog-api-key", &khoa).call(),
        };
        let r = match r {
            Ok(x) => x,
            Err(ureq::Error::Status(_, x)) => x,
            Err(e) => return Err(format!("Không kết nối được Gemini API (kiểm tra Internet): {e}")),
        };
        let ma = r.status();
        let noi_dung = r.into_string().map_err(|e| format!("Không đọc được phản hồi: {e}"))?;
        Ok(PhanHoi { ma, noi_dung })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod kiem_thu {
    #[test]
    fn duong_dan() {
        assert!(super::duong_dan_hop_le("models"));
        assert!(super::duong_dan_hop_le("models/gemini-2.5-flash:generateContent"));
        assert!(!super::duong_dan_hop_le("models/../x:generateContent"));
        assert!(!super::duong_dan_hop_le("models/a/b:generateContent"));
        assert!(!super::duong_dan_hop_le("https://evil.example/"));
        assert!(!super::duong_dan_hop_le("models/x:streamGenerateContent"));
    }
}

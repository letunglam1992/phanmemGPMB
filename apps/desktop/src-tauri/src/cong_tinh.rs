//! Cổng tổng hợp cấp tỉnh (Cloudflare Worker do tỉnh tự triển khai, docs/21). Chỉ chuyển tiếp gói .gpmbtinh ĐÃ MÃ HÓA
//! (giao diện mã hóa bằng khóa công khai của tỉnh trước khi gửi) và danh sách gói, mã truy cập. Chỉ nhận địa chỉ https://
//! (http://localhost, 127.0.0.1 để thử nghiệm) với đường dẫn /api/…
use std::io::Read;
use std::time::Duration;
use tauri::ipc::{InvokeBody, Request};

const TOI_DA_TRA_VE: u64 = 200 * 1024 * 1024;

pub fn url_hop_le(u: &str) -> bool {
    if u.len() > 600 || u.chars().any(|c| c.is_whitespace() || c == '\\' || c == '@' || c == '#' || c == '?') {
        return false;
    }
    let sau = if let Some(x) = u.strip_prefix("https://") {
        x
    } else if let Some(x) = u.strip_prefix("http://localhost").or_else(|| u.strip_prefix("http://127.0.0.1")) {
        if !(x.starts_with(':') || x.starts_with('/')) {
            return false;
        }
        x
    } else {
        return false;
    };
    let Some(i) = sau.find('/') else { return false };
    let (may, duong) = sau.split_at(i);
    !may.is_empty() && may.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':') && duong.contains("/api/") && !duong.contains("..")
}

#[tauri::command]
pub async fn goi_cong_tinh(request: Request<'_>) -> Result<tauri::ipc::Response, String> {
    let h = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(|s| s.to_string());
    let url = h("x-url").ok_or("Thiếu địa chỉ cổng")?;
    if !url_hop_le(&url) {
        return Err("Địa chỉ cổng không hợp lệ (cần https://…)".into());
    }
    let phuong_thuc = h("x-phuong-thuc").unwrap_or_else(|| "GET".into());
    if !["GET", "PUT", "POST", "DELETE"].contains(&phuong_thuc.as_str()) {
        return Err("Phương thức không hợp lệ".into());
    }
    let token = h("x-token").ok_or("Thiếu mã truy cập")?;
    if token.is_empty() || token.len() > 200 || !token.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.') {
        return Err("Mã truy cập không hợp lệ".into());
    }
    let than = match request.body() {
        InvokeBody::Raw(b) => b.clone(),
        InvokeBody::Json(_) => Vec::new(),
    };
    tauri::async_runtime::spawn_blocking(move || {
        let a = ureq::AgentBuilder::new().timeout_connect(Duration::from_secs(15)).timeout(Duration::from_secs(600)).build();
        let rq = a.request(&phuong_thuc, &url).set("authorization", &format!("Bearer {token}"));
        let r = if phuong_thuc == "GET" || phuong_thuc == "DELETE" { rq.call() } else { rq.set("content-type", "application/octet-stream").send_bytes(&than) };
        let r = match r {
            Ok(x) => x,
            Err(ureq::Error::Status(_, x)) => x,
            Err(e) => return Err(format!("Không kết nối được cổng (kiểm tra Internet, địa chỉ cổng): {e}")),
        };
        let ma = r.status();
        let mut out = ma.to_be_bytes().to_vec();
        r.into_reader().take(TOI_DA_TRA_VE).read_to_end(&mut out).map_err(|e| format!("Không đọc được phản hồi: {e}"))?;
        Ok(tauri::ipc::Response::new(out))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod kiem_thu {
    use super::url_hop_le;
    #[test]
    fn dia_chi() {
        assert!(url_hop_le("https://gpmb-cong-tinh.abc.workers.dev/api/goi"));
        assert!(url_hop_le("https://cong.example.vn/api/goi/chieng-mung"));
        assert!(url_hop_le("http://127.0.0.1:8787/api/trang-thai"));
        assert!(!url_hop_le("http://cong.example.vn/api/goi"));
        assert!(!url_hop_le("https://cong.example.vn/khac"));
        assert!(!url_hop_le("https://user@evil/api/goi"));
        assert!(!url_hop_le("https://a.b/api/../x"));
        assert!(!url_hop_le("http://localhost.evil.com/api/goi"));
        assert!(!url_hop_le("file:///c:/api/x"));
    }
}

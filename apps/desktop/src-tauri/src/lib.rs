//! Vỏ ứng dụng desktop. Toàn bộ nghiệp vụ nằm ở giao diện (TypeScript) và các gói @gpmb/*;
//! vỏ Rust chỉ mở cửa sổ WebView2, không mở cổng mạng, không gửi dữ liệu ra ngoài.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("không khởi động được ứng dụng");
}

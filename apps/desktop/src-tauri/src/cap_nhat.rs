//! Cập nhật phần mềm từ GitHub Releases (tauri-plugin-updater). Chỉ cài bản có chữ ký khớp khóa công khai
//! `khoa-cap-nhat.pub` (khóa bí mật do tác giả giữ, dùng khi đóng gói trên CI). Kiểm tra chỉ gửi yêu cầu tải tệp
//! `latest.json` công khai — không gửi dữ liệu hồ sơ. Gọi từ giao diện qua lệnh Rust (không mở quyền plugin cho giao diện).
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::{Update, UpdaterExt};

/// Khóa công khai minisign (nội dung tệp .pub do `tauri signer generate` tạo). Trống = chưa bật cập nhật.
pub const KHOA_CONG_KHAI: &str = include_str!("../khoa-cap-nhat.pub");

pub fn khoa() -> Option<&'static str> {
    let k = KHOA_CONG_KHAI.trim();
    (!k.is_empty()).then_some(k)
}

#[derive(Default)]
pub struct BanCho(pub Mutex<Option<Update>>);

#[derive(Serialize)]
pub struct ThongTinBan {
    pub phien_ban: String,
    pub hien_tai: String,
    pub ngay: Option<String>,
    pub ghi_chu: Option<String>,
}

#[derive(Serialize)]
pub struct KetQuaKiemTra {
    /// false: bản này chưa gắn khóa ký → chưa bật cập nhật tự động
    pub san_sang: bool,
    pub hien_tai: String,
    pub ban_moi: Option<ThongTinBan>,
}

#[tauri::command]
pub async fn cap_nhat_kiem_tra(app: AppHandle, cho: State<'_, BanCho>) -> Result<KetQuaKiemTra, String> {
    let hien_tai = app.package_info().version.to_string();
    let Some(k) = khoa() else {
        return Ok(KetQuaKiemTra { san_sang: false, hien_tai, ban_moi: None });
    };
    let up = app.updater_builder().pubkey(k).build().map_err(|e| e.to_string())?;
    let ban = up.check().await.map_err(|e| format!("Không kiểm tra được bản mới: {e}"))?;
    let ban_moi = ban.as_ref().map(|u| ThongTinBan {
        phien_ban: u.version.clone(),
        hien_tai: u.current_version.clone(),
        ngay: u.date.map(|d| d.date().to_string()),
        ghi_chu: u.body.clone(),
    });
    *cho.0.lock().map_err(|e| e.to_string())? = ban;
    Ok(KetQuaKiemTra { san_sang: true, hien_tai, ban_moi })
}

#[derive(Clone, Serialize)]
struct TienDo {
    da_tai: usize,
    tong: Option<u64>,
}

/// Tải, kiểm chữ ký, chạy bộ cài (Windows: NSIS chế độ passive, cài đè, giữ dữ liệu) rồi khởi động lại.
#[tauri::command]
pub async fn cap_nhat_cai_dat(app: AppHandle, cho: State<'_, BanCho>) -> Result<(), String> {
    let ban = cho.0.lock().map_err(|e| e.to_string())?.take().ok_or("Chưa có bản mới — bấm Kiểm tra cập nhật trước")?;
    let mut da_tai = 0usize;
    let a = app.clone();
    ban.download_and_install(
        move |n, tong| {
            da_tai += n;
            let _ = a.emit("cap-nhat-tien-do", TienDo { da_tai, tong });
        },
        || {},
    )
    .await
    .map_err(|e| format!("Không cài được bản mới: {e}"))?;
    app.restart();
}

#[cfg(test)]
mod kiem_thu {
    use base64::Engine;

    /// Khóa công khai gắn kèm đúng định dạng minisign (base64 của tệp .pub do `tauri signer generate` tạo).
    #[test]
    fn khoa_cong_khai_hop_le() {
        let k = super::khoa().expect("chưa có khóa công khai");
        let tep = base64::engine::general_purpose::STANDARD.decode(k).expect("không phải base64");
        let tep = String::from_utf8(tep).expect("không phải văn bản");
        let mut dong = tep.lines();
        assert!(dong.next().unwrap_or("").starts_with("untrusted comment: minisign public key"));
        let khoa = base64::engine::general_purpose::STANDARD.decode(dong.next().unwrap_or("")).expect("dòng khóa không phải base64");
        assert_eq!(khoa.len(), 42, "khóa Ed25519 minisign: 2 byte thuật toán + 8 byte mã khóa + 32 byte khóa");
        assert_eq!(&khoa[..2], b"Ed");
    }

    /// CLI ký bản cập nhật đọc khóa ở tauri.conf.json (plugins.updater.pubkey) — phải trùng khoa-cap-nhat.pub.
    #[test]
    fn khoa_cau_hinh_trung_tep() {
        let c: serde_json::Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        assert_eq!(c["plugins"]["updater"]["pubkey"].as_str(), super::khoa());
    }
}

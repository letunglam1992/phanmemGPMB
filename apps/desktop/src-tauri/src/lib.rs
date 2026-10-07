//! Vỏ ứng dụng desktop. Toàn bộ nghiệp vụ nằm ở giao diện (TypeScript) và các gói @gpmb/*;
//! vỏ Rust chỉ mở cửa sổ WebView2, ghi tệp sao lưu tự động và tệp tải về (Downloads) trên máy.
//! Không mở cổng mạng, không gửi dữ liệu ra ngoài.

pub mod cap_nhat;
pub mod hoi_dap;
pub mod cong_tinh;
pub mod ket_noi;
pub mod may_chu;

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

/// Mở Explorer, chọn sẵn tệp vừa lưu. Dùng raw_arg: Explorer không hiểu tham số "/select,…" bị Rust bọc ngoặc kép.
fn mo_explorer_chon(tep: &std::path::Path) {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("explorer").raw_arg(format!("/select,\"{}\"", tep.display())).spawn();
    }
    #[cfg(not(target_os = "windows"))]
    let _ = tep;
}

/// Loại tệp phần mềm xuất ra — chỉ những loại này được mở bằng ứng dụng mặc định (không mở tệp chạy được như .exe, .bat).
const DUOI_MO_DUOC: &[&str] = &["xlsx", "docx", "pdf", "zip", "txt", "csv", "json", "png", "jpg", "gpmb", "gpmbtinh", "gpmbkhoa"];

/// Kiểm đường dẫn tệp đã xuất: tuyệt đối, còn tồn tại, đúng loại tệp xuất.
fn tep_da_xuat(duong_dan: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(duong_dan);
    if !p.is_absolute() || !p.is_file() {
        return Err(format!("Không còn tệp {duong_dan} (đã xóa hoặc chuyển chỗ)"));
    }
    let duoi = p.extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
    if !DUOI_MO_DUOC.contains(&duoi.as_str()) {
        return Err("Chỉ mở được tệp phần mềm đã xuất (Excel, Word, PDF, zip…)".into());
    }
    Ok(p)
}

/// 1.0.2: mở tệp vừa xuất bằng ứng dụng mặc định (Excel, Word…) — danh sách "Tệp đã xuất" trên thanh tiêu đề.
#[tauri::command]
fn mo_tep_da_xuat(duong_dan: String) -> Result<(), String> {
    let p = tep_da_xuat(&duong_dan)?;
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // explorer.exe "<tệp>" mở bằng ứng dụng gắn với loại tệp
        std::process::Command::new("explorer").raw_arg(format!("\"{}\"", p.display())).spawn().map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "windows"))]
    std::process::Command::new("xdg-open").arg(&p).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// 1.0.2: mở thư mục chứa tệp đã xuất, chọn sẵn tệp.
#[tauri::command]
fn mo_noi_luu_tep(duong_dan: String) -> Result<(), String> {
    let p = tep_da_xuat(&duong_dan)?;
    #[cfg(target_os = "windows")]
    mo_explorer_chon(&p);
    #[cfg(not(target_os = "windows"))]
    std::process::Command::new("xdg-open").arg(p.parent().unwrap_or(&p)).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Thư mục lưu tệp tải về: Downloads, không có thì Documents.
fn thu_muc_tai_ve(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().document_dir())
        .map_err(|e| format!("Không xác định được thư mục Downloads: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Không tạo được thư mục {}: {e}", dir.display()))?;
    Ok(dir)
}

/// Làm sạch tên tệp tải về: bỏ ký tự Windows cấm và phần đường dẫn, giữ chữ có dấu.
fn ten_tep_an_toan(ten: &str) -> String {
    let goc = ten.rsplit(['/', '\\']).next().unwrap_or("");
    let s: String = goc
        .chars()
        .map(|c| if c.is_control() || "<>:\"|?*".contains(c) { '_' } else { c })
        .collect();
    let s = s.trim().trim_matches('.').to_string();
    if s.is_empty() { "tep-tai-ve".into() } else { s }
}

/// Tên chưa tồn tại trong thư mục: "a.xlsx" → "a (1).xlsx"…
fn ten_chua_co(dir: &std::path::Path, ten: &str) -> PathBuf {
    let p = dir.join(ten);
    if !p.exists() {
        return p;
    }
    let (goc, duoi) = match ten.rfind('.') {
        Some(i) if i > 0 => (&ten[..i], &ten[i..]),
        _ => (ten, ""),
    };
    (1..)
        .map(|i| dir.join(format!("{goc} ({i}){duoi}")))
        .find(|p| !p.exists())
        .unwrap()
}

/// Tải tệp về máy trong vỏ desktop (WebView2 không tự lưu liên kết blob): ghi vào thư mục Downloads
/// rồi mở trình quản lý tệp, chọn sẵn tệp vừa lưu. Thân yêu cầu = nội dung tệp; header `ten-tep` = tên.
#[tauri::command]
fn luu_tai_xuong(app: tauri::AppHandle, request: Request<'_>) -> Result<String, String> {
    let InvokeBody::Raw(du_lieu) = request.body() else {
        return Err("Dữ liệu tệp không đúng dạng".into());
    };
    let ten = ten_tep_an_toan(&tieu_de(&request, "ten-tep")?);
    let dir = thu_muc_tai_ve(&app)?;
    let dich = ten_chua_co(&dir, &ten);
    fs::write(&dich, du_lieu).map_err(|e| format!("Không ghi được {}: {e}", dich.display()))?;
    mo_explorer_chon(&dich);
    Ok(dich.display().to_string())
}

/// Lưu tệp xuất ra máy, cho cán bộ chọn thư mục và tên tệp (hộp thoại "Lưu thành" của Windows).
/// Header: `ten-tep` tên gợi ý, `thu-muc` thư mục mở sẵn (lần lưu trước; trống = Downloads), `loai-tep` mô tả bộ lọc.
/// Trả về đường dẫn đã lưu; `None` khi cán bộ bấm Hủy.
#[tauri::command]
async fn luu_tep_chon_noi(app: tauri::AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let InvokeBody::Raw(du_lieu) = request.body() else {
        return Err("Dữ liệu tệp không đúng dạng".into());
    };
    let du_lieu = du_lieu.clone();
    let ten = ten_tep_an_toan(&tieu_de(&request, "ten-tep")?);
    let loai = tieu_de(&request, "loai-tep").unwrap_or_else(|_| "Tệp".into());
    let thu_muc_dau = tieu_de(&request, "thu-muc")
        .ok()
        .map(PathBuf::from)
        .filter(|p| p.is_absolute() && p.is_dir())
        .or_else(|| thu_muc_tai_ve(&app).ok());
    let duoi = ten.rsplit_once('.').map(|(_, d)| d.to_string()).filter(|d| !d.is_empty() && d.len() <= 8);
    let cua_so = app.get_webview_window("main");
    // Hộp thoại chặn luồng → chạy ở luồng phụ, không treo cửa sổ chính; gắn cửa sổ chính làm cha (hộp thoại nằm trên)
    let chon = tauri::async_runtime::spawn_blocking(move || {
        let mut hop = rfd::FileDialog::new().set_title("Chọn nơi lưu tệp").set_file_name(ten);
        if let Some(w) = cua_so.as_ref() {
            hop = hop.set_parent(w);
        }
        if let Some(d) = thu_muc_dau {
            hop = hop.set_directory(d);
        }
        if let Some(d) = duoi.as_deref() {
            hop = hop.add_filter(loai, &[d]);
        }
        hop.save_file()
    })
    .await
    .map_err(|e| e.to_string())?;
    let Some(dich) = chon else { return Ok(None) };
    fs::write(&dich, &du_lieu).map_err(|e| format!("Không ghi được {}: {e}", dich.display()))?;
    Ok(Some(dich.display().to_string()))
}

// ---------------- DPAPI (P0-5) ----------------

/// Bọc / mở khóa dữ liệu sao lưu bằng Windows DPAPI của tài khoản Windows đang dùng (không cần mật khẩu;
/// chỉ mở được trên cùng máy, cùng tài khoản). Entropy riêng của phần mềm để tách khỏi ứng dụng khác.
#[cfg(windows)]
mod dpapi {
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::Security::Cryptography::{CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB};

    const ENTROPY: &[u8] = b"gpmb-sonla-sao-luu-v2";

    fn blob(b: &[u8]) -> CRYPT_INTEGER_BLOB {
        CRYPT_INTEGER_BLOB { cbData: b.len() as u32, pbData: b.as_ptr() as *mut u8 }
    }

    pub fn chay(du: &[u8], boc: bool) -> Result<Vec<u8>, String> {
        let vao = blob(du);
        let en = blob(ENTROPY);
        let mut ra = CRYPT_INTEGER_BLOB { cbData: 0, pbData: std::ptr::null_mut() };
        // SAFETY: các con trỏ trỏ vào vùng nhớ hợp lệ trong suốt lời gọi; `ra` do hệ thống cấp, giải phóng bằng LocalFree.
        let ok = unsafe {
            if boc {
                CryptProtectData(&vao, std::ptr::null(), &en, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut ra)
            } else {
                CryptUnprotectData(&vao, std::ptr::null_mut(), &en, std::ptr::null(), std::ptr::null(), CRYPTPROTECT_UI_FORBIDDEN, &mut ra)
            }
        };
        if ok == 0 {
            return Err(format!("DPAPI lỗi {}", std::io::Error::last_os_error()));
        }
        // SAFETY: `ra.pbData` có `ra.cbData` byte do CryptProtectData/CryptUnprotectData cấp.
        let v = unsafe { std::slice::from_raw_parts(ra.pbData, ra.cbData as usize).to_vec() };
        unsafe { LocalFree(ra.pbData as _) };
        Ok(v)
    }
}
#[cfg(not(windows))]
mod dpapi {
    pub fn chay(_: &[u8], _: bool) -> Result<Vec<u8>, String> {
        Err("DPAPI chỉ có trên Windows".into())
    }
}

#[tauri::command]
fn dpapi_boc(request: Request<'_>) -> Result<tauri::ipc::Response, String> {
    let InvokeBody::Raw(du) = request.body() else { return Err("Dữ liệu không đúng dạng".into()) };
    Ok(tauri::ipc::Response::new(dpapi::chay(du, true)?))
}

#[tauri::command]
fn dpapi_mo(request: Request<'_>) -> Result<tauri::ipc::Response, String> {
    let InvokeBody::Raw(du) = request.body() else { return Err("Dữ liệu không đúng dạng".into()) };
    Ok(tauri::ipc::Response::new(dpapi::chay(du, false)?))
}

// ---------------- Mạng nội bộ ----------------

#[derive(Default)]
struct TrangThaiMayChu(tokio::sync::Mutex<Option<may_chu::DangChay>>);

fn thong_tin(d: &may_chu::DangChay) -> serde_json::Value {
    serde_json::json!({ "cong": d.cong, "vanTay": d.van_tay, "diaChi": may_chu::dia_chi_noi_bo() })
}

/// Bật chế độ máy chủ trên máy này (dữ liệu: thư mục dữ liệu ứng dụng\may-chu).
#[tauri::command]
async fn bat_may_chu(app: tauri::AppHandle, tt: tauri::State<'_, TrangThaiMayChu>, cong: u16) -> Result<serde_json::Value, String> {
    let mut g = tt.0.lock().await;
    if let Some(d) = g.as_ref() {
        return Ok(thong_tin(d));
    }
    let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("may-chu");
    let d = may_chu::khoi_dong(dir, cong).await?;
    let v = thong_tin(&d);
    *g = Some(d);
    Ok(v)
}

#[tauri::command]
async fn tat_may_chu(tt: tauri::State<'_, TrangThaiMayChu>) -> Result<(), String> {
    if let Some(d) = tt.0.lock().await.take() {
        d.handle.graceful_shutdown(Some(std::time::Duration::from_secs(3)));
    }
    Ok(())
}

#[tauri::command]
async fn trang_thai_may_chu(tt: tauri::State<'_, TrangThaiMayChu>) -> Result<Option<serde_json::Value>, String> {
    Ok(tt.0.lock().await.as_ref().map(thong_tin))
}

#[tauri::command]
async fn doc_van_tay_may_chu(dia_chi: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || ket_noi::doc_van_tay(&dia_chi)).await.map_err(|e| e.to_string())?
}

/// Máy đơn (Giai đoạn 3): CSDL SQLite của máy này, mở khi gọi lần đầu.
#[derive(Default)]
struct MayDon(tokio::sync::Mutex<Option<axum::Router>>);

/// Gọi lõi dữ liệu máy đơn trong tiến trình — cùng giao thức với goi_may_chu nhưng không qua mạng, không mở cổng.
#[tauri::command]
async fn goi_noi_bo(app: tauri::AppHandle, md: tauri::State<'_, MayDon>, request: Request<'_>) -> Result<tauri::ipc::Response, String> {
    use tower::ServiceExt;
    let router = {
        let mut g = md.0.lock().await;
        if g.is_none() {
            let dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?.join("may-don");
            *g = Some(may_chu::mo_may_don(dir)?);
        }
        g.as_ref().unwrap().clone()
    };
    let h = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(|s| s.to_string());
    let phuong_thuc = h("x-phuong-thuc").unwrap_or_else(|| "GET".into());
    let duong_dan = h("x-duong-dan").ok_or("Thiếu đường dẫn")?;
    let than = match request.body() {
        InvokeBody::Raw(b) => b.clone(),
        InvokeBody::Json(_) => Vec::new(),
    };
    let mut rq = axum::http::Request::builder().method(phuong_thuc.as_str()).uri(duong_dan.as_str());
    if let Some(t) = h("x-token") {
        rq = rq.header("authorization", format!("Bearer {t}"));
    }
    if let Some(m) = h("x-meta") {
        rq = rq.header("x-meta", m);
    }
    let mut rq = rq.body(axum::body::Body::from(than)).map_err(|e| e.to_string())?;
    rq.extensions_mut().insert(axum::extract::ConnectInfo(std::net::SocketAddr::from(([127, 0, 0, 1], 0))));
    let r = router.oneshot(rq).await.map_err(|e| e.to_string())?;
    let ma = r.status().as_u16();
    let meta = r.headers().get("x-meta").and_then(|v| v.to_str().ok()).unwrap_or("").to_string();
    let than = axum::body::to_bytes(r.into_body(), usize::MAX).await.map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(6 + meta.len() + than.len());
    out.extend_from_slice(&ma.to_be_bytes());
    out.extend_from_slice(&(meta.len() as u32).to_be_bytes());
    out.extend_from_slice(meta.as_bytes());
    out.extend_from_slice(&than);
    Ok(tauri::ipc::Response::new(out))
}

/// Chuyển tiếp yêu cầu của giao diện tới máy chủ (HTTPS ghim vân tay).
/// Trả về: 2 byte mã trạng thái, 4 byte độ dài meta, meta, thân.
#[tauri::command]
async fn goi_may_chu(request: Request<'_>) -> Result<tauri::ipc::Response, String> {
    let h = |k: &str| request.headers().get(k).and_then(|v| v.to_str().ok()).map(|s| s.to_string());
    let dia_chi = h("x-dia-chi").ok_or("Thiếu địa chỉ máy chủ")?;
    let van_tay = h("x-van-tay").ok_or("Thiếu vân tay máy chủ")?;
    let phuong_thuc = h("x-phuong-thuc").unwrap_or_else(|| "GET".into());
    let duong_dan = h("x-duong-dan").ok_or("Thiếu đường dẫn")?;
    let token = h("x-token");
    let meta = h("x-meta");
    let than = match request.body() {
        InvokeBody::Raw(b) => b.clone(),
        InvokeBody::Json(_) => Vec::new(),
    };
    let r = tauri::async_runtime::spawn_blocking(move || ket_noi::goi(&dia_chi, &van_tay, &phuong_thuc, &duong_dan, token.as_deref(), meta.as_deref(), &than))
        .await
        .map_err(|e| e.to_string())??;
    let mut out = Vec::with_capacity(6 + r.meta.len() + r.than.len());
    out.extend_from_slice(&r.ma.to_be_bytes());
    out.extend_from_slice(&(r.meta.len() as u32).to_be_bytes());
    out.extend_from_slice(r.meta.as_bytes());
    out.extend_from_slice(&r.than);
    Ok(tauri::ipc::Response::new(out))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = rustls::crypto::ring::default_provider().install_default();
    tauri::Builder::default()
        // Khóa công khai lấy từ khoa-cap-nhat.pub (biên dịch kèm); cấu hình plugins.updater giữ endpoint
        .plugin(tauri_plugin_updater::Builder::new().pubkey(cap_nhat::KHOA_CONG_KHAI.trim()).build())
        .manage(cap_nhat::BanCho::default())
        .manage(TrangThaiMayChu::default())
        .manage(MayDon::default())
        .invoke_handler(tauri::generate_handler![
            ghi_sao_luu,
            thu_muc_sao_luu,
            mo_thu_muc_sao_luu,
            luu_tai_xuong,
            luu_tep_chon_noi,
            mo_tep_da_xuat,
            mo_noi_luu_tep,
            dpapi_boc,
            dpapi_mo,
            bat_may_chu,
            tat_may_chu,
            trang_thai_may_chu,
            doc_van_tay_may_chu,
            goi_may_chu,
            goi_noi_bo,
            cap_nhat::cap_nhat_kiem_tra,
            cap_nhat::cap_nhat_cai_dat,
            hoi_dap::goi_gemini,
            cong_tinh::goi_cong_tinh
        ])
        // Cửa sổ chính tạo trong mã để gắn trình xử lý tải xuống của WebView2: mọi lượt tải (kể cả liên kết
        // blob của giao diện) lưu thẳng vào Downloads, không phụ thuộc giao diện tải mặc định của WebView2.
        .setup(|app| {
            let cau_hinh = app.config().app.windows.iter().find(|w| w.label == "main").cloned().ok_or("Thiếu cấu hình cửa sổ main")?;
            let h = app.handle().clone();
            tauri::WebviewWindowBuilder::from_config(app.handle(), &cau_hinh)?
                .on_download(move |_, su_kien| match su_kien {
                    tauri::webview::DownloadEvent::Requested { destination, .. } => {
                        let ten = destination.file_name().map(|t| ten_tep_an_toan(&t.to_string_lossy())).unwrap_or_else(|| "tep-tai-ve".into());
                        match thu_muc_tai_ve(&h) {
                            Ok(dir) => {
                                *destination = ten_chua_co(&dir, &ten);
                                true
                            }
                            Err(_) => true, // giữ đường dẫn mặc định của WebView2
                        }
                    }
                    tauri::webview::DownloadEvent::Finished { path, success, .. } => {
                        if let (true, Some(p)) = (success, path) {
                            mo_explorer_chon(&p);
                        }
                        true
                    }
                    _ => true,
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("không khởi động được ứng dụng");
}

#[cfg(test)]
mod kiem_thu {
    use super::{ghi_va_don, giai_ma, ten_chua_co, ten_tep_an_toan, tep_da_xuat};

    #[test]
    fn chi_mo_tep_da_xuat_dung_loai() {
        let dir = std::env::temp_dir().join(format!("gpmb-mo-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        for t in ["a.xlsx", "b.exe", "c.BAT"] {
            std::fs::write(dir.join(t), b"1").unwrap();
        }
        assert!(tep_da_xuat(dir.join("a.xlsx").to_str().unwrap()).is_ok());
        assert!(tep_da_xuat(dir.join("b.exe").to_str().unwrap()).is_err());
        assert!(tep_da_xuat(dir.join("c.BAT").to_str().unwrap()).is_err());
        assert!(tep_da_xuat(dir.join("khong-co.docx").to_str().unwrap()).is_err());
        assert!(tep_da_xuat("a.xlsx").is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// 1.0.1: tauri-plugin-dialog (2.8.0) chèn script thay window.confirm bằng lệnh "plugin:dialog|confirm" không còn
    /// trong plugin → confirm() trả Promise (luôn "đúng"), mọi bước hỏi xác nhận bị bỏ qua, báo lỗi ACL. Không đưa lại.
    #[test]
    fn khong_dung_plugin_dialog_chen_script_confirm() {
        let cargo = include_str!("../Cargo.toml");
        assert!(!cargo.lines().any(|l| l.trim_start().starts_with("tauri-plugin-dialog")), "Không dùng tauri-plugin-dialog — dùng rfd cho hộp thoại Lưu thành");
        assert!(!include_str!("lib.rs").contains(concat!("tauri_plugin_", "dialog::init")));
    }

    #[test]
    fn ten_tep_tai_ve_an_toan_va_khong_ghi_de() {
        assert_eq!(ten_tep_an_toan("Mẫu nhập hồ sơ.xlsx"), "Mẫu nhập hồ sơ.xlsx");
        assert_eq!(ten_tep_an_toan("..\\a/b:c?.xlsx"), "b_c_.xlsx");
        assert_eq!(ten_tep_an_toan("  "), "tep-tai-ve");
        let dir = std::env::temp_dir().join(format!("gpmb-tx-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("a.xlsx"), b"1").unwrap();
        assert_eq!(ten_chua_co(&dir, "a.xlsx"), dir.join("a (1).xlsx"));
        assert_eq!(ten_chua_co(&dir, "b.xlsx"), dir.join("b.xlsx"));
        std::fs::remove_dir_all(&dir).unwrap();
    }

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

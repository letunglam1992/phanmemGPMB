//! Máy trạm gọi máy chủ mạng nội bộ qua HTTPS, ghim vân tay chứng chỉ (không tin chứng chỉ khác,
//! kể cả chứng chỉ hợp lệ công khai). Giao diện gọi qua lệnh Tauri để WebView không phải tin chứng chỉ tự ký.

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::crypto::CryptoProvider;
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{DigitallySignedStruct, SignatureScheme};
use std::io::Read;
use std::sync::{Arc, Mutex};
use std::time::Duration;

#[derive(Debug)]
struct GhimVanTay {
    /// None = chỉ đọc vân tay (lần kết nối đầu, cán bộ đối chiếu rồi mới lưu).
    can: Option<String>,
    thay: Arc<Mutex<Option<String>>>,
    nha_cung_cap: Arc<CryptoProvider>,
}

impl ServerCertVerifier for GhimVanTay {
    fn verify_server_cert(&self, cc: &CertificateDer<'_>, _: &[CertificateDer<'_>], _: &ServerName<'_>, _: &[u8], _: UnixTime) -> Result<ServerCertVerified, rustls::Error> {
        let vt = crate::may_chu::van_tay(cc.as_ref());
        *self.thay.lock().unwrap() = Some(vt.clone());
        match &self.can {
            None => Ok(ServerCertVerified::assertion()),
            Some(k) if k.eq_ignore_ascii_case(&vt) => Ok(ServerCertVerified::assertion()),
            Some(_) => Err(rustls::Error::General("Vân tay chứng chỉ máy chủ KHÔNG KHỚP — có thể đang kết nối nhầm máy hoặc bị giả mạo".into())),
        }
    }
    fn verify_tls12_signature(&self, m: &[u8], c: &CertificateDer<'_>, d: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, rustls::Error> {
        rustls::crypto::verify_tls12_signature(m, c, d, &self.nha_cung_cap.signature_verification_algorithms)
    }
    fn verify_tls13_signature(&self, m: &[u8], c: &CertificateDer<'_>, d: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, rustls::Error> {
        rustls::crypto::verify_tls13_signature(m, c, d, &self.nha_cung_cap.signature_verification_algorithms)
    }
    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        self.nha_cung_cap.signature_verification_algorithms.supported_schemes()
    }
}

fn tac_tu(van_tay: Option<String>) -> Result<(ureq::Agent, Arc<Mutex<Option<String>>>), String> {
    let ncc = Arc::new(rustls::crypto::ring::default_provider());
    let thay = Arc::new(Mutex::new(None));
    let v = GhimVanTay { can: van_tay, thay: thay.clone(), nha_cung_cap: ncc.clone() };
    let cfg = rustls::ClientConfig::builder_with_provider(ncc)
        .with_safe_default_protocol_versions()
        .map_err(|e| e.to_string())?
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(v))
        .with_no_client_auth();
    let a = ureq::AgentBuilder::new().tls_config(Arc::new(cfg)).timeout_connect(Duration::from_secs(5)).timeout(Duration::from_secs(120)).build();
    Ok((a, thay))
}

fn kiem_dia_chi(dia_chi: &str) -> Result<(), String> {
    let ok = !dia_chi.is_empty() && dia_chi.len() < 80 && dia_chi.chars().all(|c| c.is_ascii_alphanumeric() || ".:-[]".contains(c));
    if ok {
        Ok(())
    } else {
        Err(format!("Địa chỉ máy chủ không hợp lệ: {dia_chi}"))
    }
}

/// Đọc vân tay chứng chỉ của máy chủ (lần kết nối đầu).
pub fn doc_van_tay(dia_chi: &str) -> Result<String, String> {
    kiem_dia_chi(dia_chi)?;
    let (a, thay) = tac_tu(None)?;
    let r = a.get(&format!("https://{dia_chi}/api/trang-thai")).call();
    if let Some(v) = thay.lock().unwrap().clone() {
        return Ok(v);
    }
    Err(match r {
        Err(e) => format!("Không kết nối được máy chủ {dia_chi}: {e}"),
        Ok(_) => "Không đọc được chứng chỉ máy chủ".into(),
    })
}

pub struct TraLoi {
    pub ma: u16,
    pub meta: String,
    pub than: Vec<u8>,
}

/// Gửi một yêu cầu tới máy chủ (đã ghim vân tay).
pub fn goi(dia_chi: &str, van_tay: &str, phuong_thuc: &str, duong_dan: &str, token: Option<&str>, meta: Option<&str>, than: &[u8]) -> Result<TraLoi, String> {
    kiem_dia_chi(dia_chi)?;
    if !duong_dan.starts_with("/api/") || duong_dan.contains("..") {
        return Err("Đường dẫn không hợp lệ".into());
    }
    let (a, _) = tac_tu(Some(van_tay.to_string()))?;
    let mut rq = a.request(phuong_thuc, &format!("https://{dia_chi}{duong_dan}"));
    if let Some(t) = token {
        rq = rq.set("authorization", &format!("Bearer {t}"));
    }
    if let Some(m) = meta {
        rq = rq.set("x-meta", m);
    }
    let r = if phuong_thuc == "GET" || phuong_thuc == "DELETE" { rq.call() } else { rq.set("content-type", "application/octet-stream").send_bytes(than) };
    let resp = match r {
        Ok(x) => x,
        Err(ureq::Error::Status(_, x)) => x,
        Err(e) => return Err(format!("Không kết nối được máy chủ {dia_chi}: {e}")),
    };
    let ma = resp.status();
    let meta = resp.header("x-meta").unwrap_or("").to_string();
    let mut b = Vec::new();
    resp.into_reader().take(400 * 1024 * 1024).read_to_end(&mut b).map_err(|e| e.to_string())?;
    Ok(TraLoi { ma, meta, than: b })
}

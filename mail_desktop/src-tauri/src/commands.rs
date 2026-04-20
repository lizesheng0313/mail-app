use crate::mail;
use crate::mail::discovery::{dedupe_candidates, extract_root_domain, query_primary_mx, query_srv_records};
use crate::mail::provider_constants::{find_hosted_provider_by_mx, find_known_provider};
use crate::mail::types::{get_server_config, EmailData, FetchResult, LoginResult, RuntimeProxy};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::pin::Pin;
use std::path::PathBuf;
use std::process::Command;
use std::sync::{Mutex, OnceLock};
use std::task::{Context, Poll};
use tauri_plugin_updater::UpdaterExt;
use tokio::io::{AsyncRead, AsyncWrite, ReadBuf};

const INITIAL_HISTORY_FETCH_LIMIT: usize = 2000;
const INCREMENTAL_FETCH_LIMIT: usize = 200;
const HISTORY_BACKFILL_THRESHOLD: usize = 100;
const AUTO_RECOVERY_MAX_FAILURES: u32 = 3;
const AUTO_RECOVERY_WINDOW_MS: i64 = 30 * 60 * 1000;
const AUTO_RECOVERY_LIMIT_MARKER: &str = "__AUTO_RECOVERY_LIMIT__::";

#[derive(Debug, Clone, Serialize)]
pub struct SmtpSendResult {
    success: bool,
    smtp_host: String,
    smtp_port: u16,
    response_code: Option<u16>,
    response_message: Option<String>,
}

#[derive(Debug, Clone, Copy)]
struct RecoveryRetryState {
    failed_count: u32,
    window_started_at_ms: i64,
}

static RECOVERY_RETRY_STATES: OnceLock<Mutex<HashMap<i64, RecoveryRetryState>>> = OnceLock::new();

fn recovery_retry_states() -> &'static Mutex<HashMap<i64, RecoveryRetryState>> {
    RECOVERY_RETRY_STATES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn current_time_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn begin_recovery_attempt(mailbox_id: i64) -> Result<(), String> {
    let now = current_time_ms();
    let mut states = recovery_retry_states()
        .lock()
        .map_err(|_| "自动恢复状态锁定失败".to_string())?;

    let state = states.entry(mailbox_id).or_insert(RecoveryRetryState {
        failed_count: 0,
        window_started_at_ms: now,
    });

    if now - state.window_started_at_ms > AUTO_RECOVERY_WINDOW_MS {
        state.failed_count = 0;
        state.window_started_at_ms = now;
    }

    if state.failed_count >= AUTO_RECOVERY_MAX_FAILURES {
        warn!(
            "自动恢复已达到失败上限: mailbox_id={}, failed_count={}",
            mailbox_id, state.failed_count
        );
        return Err(format!(
            "{}{}",
            AUTO_RECOVERY_LIMIT_MARKER, "邮箱或授权码错误，请检查后重试"
        ));
    }

    Ok(())
}

fn mark_recovery_success(mailbox_id: i64) {
    if let Ok(mut states) = recovery_retry_states().lock() {
        states.remove(&mailbox_id);
    }
}

fn mark_recovery_failure(mailbox_id: i64) -> u32 {
    let now = current_time_ms();
    if let Ok(mut states) = recovery_retry_states().lock() {
        let state = states.entry(mailbox_id).or_insert(RecoveryRetryState {
            failed_count: 0,
            window_started_at_ms: now,
        });

        if now - state.window_started_at_ms > AUTO_RECOVERY_WINDOW_MS {
            state.failed_count = 0;
            state.window_started_at_ms = now;
        }

        state.failed_count += 1;
        return state.failed_count;
    }

    AUTO_RECOVERY_MAX_FAILURES
}

fn finalize_recovery_failure(mailbox_id: i64, message: String) -> String {
    let count = mark_recovery_failure(mailbox_id);
    if count >= AUTO_RECOVERY_MAX_FAILURES {
        warn!(
            "自动恢复连续失败达到上限: mailbox_id={}, failed_count={}, message={}",
            mailbox_id, count, message
        );
        return format!("{}{}", AUTO_RECOVERY_LIMIT_MARKER, message);
    }
    message
}

#[derive(Debug, Clone)]
struct FetchCandidate {
    protocol: String,
    host: String,
    port: u16,
}

fn push_fetch_candidate(candidates: &mut Vec<FetchCandidate>, candidate: FetchCandidate) {
    let exists = candidates.iter().any(|item| {
        item.protocol == candidate.protocol && item.host == candidate.host && item.port == candidate.port
    });
    if !exists {
        candidates.push(candidate);
    }
}

fn build_email_dedupe_key(email: &EmailData) -> String {
    let message_id = email.message_id.trim();
    if !message_id.is_empty() {
        return format!("mid:{}", message_id.to_lowercase());
    }

    format!(
        "fp:{}|{}|{}|{}",
        email.from_addr.trim().to_lowercase(),
        email.to_addr.trim().to_lowercase(),
        email.subject.trim().to_lowercase(),
        email.email_date_ms
    )
}

fn merge_fetched_emails(results: Vec<FetchResult>, limit: usize, fetch_oldest: bool) -> FetchResult {
    let mut merged = Vec::new();
    let mut seen = HashSet::new();

    for result in results {
        for email in result.emails {
            let key = build_email_dedupe_key(&email);
            if seen.insert(key) {
                merged.push(email);
            }
        }
    }

    if fetch_oldest {
        merged.sort_by_key(|email| email.email_date_ms);
    } else {
        merged.sort_by(|a, b| b.email_date_ms.cmp(&a.email_date_ms));
    }

    if merged.len() > limit {
        merged.truncate(limit);
    }

    FetchResult {
        success: true,
        message: format!("收取成功，共 {} 封邮件", merged.len()),
        count: merged.len(),
        emails: merged,
    }
}

async fn fetch_with_candidate(
    candidate: &FetchCandidate,
    email: &str,
    password: &str,
    limit: usize,
    fetch_oldest: bool,
    proxy_config: Option<&RuntimeProxy>,
) -> Result<FetchResult, String> {
    if candidate.protocol == "imap" {
        mail::imap::fetch_emails(
            email,
            password,
            &candidate.host,
            candidate.port,
            limit,
            fetch_oldest,
            proxy_config.cloned(),
        )
        .await
    } else {
        mail::pop3::fetch_emails(
            email,
            password,
            &candidate.host,
            candidate.port,
            limit,
            fetch_oldest,
            proxy_config.cloned(),
        )
        .await
    }
}

async fn fetch_password_mailbox_with_merge(
    email: &str,
    password: &str,
    primary_protocol: &str,
    primary_host: &str,
    primary_port: u16,
    discovered_config: Option<&crate::mail::types::ServerConfig>,
    limit: usize,
    fetch_oldest: bool,
    proxy_config: Option<&RuntimeProxy>,
) -> Result<FetchResult, String> {
    let mut candidates = Vec::new();
    push_fetch_candidate(
        &mut candidates,
        FetchCandidate {
            protocol: primary_protocol.to_lowercase(),
            host: primary_host.to_string(),
            port: primary_port,
        },
    );

    if let Some(config) = discovered_config {
        push_fetch_candidate(
            &mut candidates,
            FetchCandidate {
                protocol: "imap".to_string(),
                host: config.imap_host.clone(),
                port: config.imap_port,
            },
        );
        push_fetch_candidate(
            &mut candidates,
            FetchCandidate {
                protocol: "pop3".to_string(),
                host: config.pop3_host.clone(),
                port: config.pop3_port,
            },
        );
    }

    let mut success_results = Vec::new();
    let mut error_messages = Vec::new();

    for candidate in candidates {
        info!(
            "尝试协议补抓: email={} protocol={} host={}:{}",
            email, candidate.protocol, candidate.host, candidate.port
        );
        match fetch_with_candidate(&candidate, email, password, limit, fetch_oldest, proxy_config).await {
            Ok(result) => {
                info!(
                    "协议补抓成功: email={} protocol={} fetched={}",
                    email, candidate.protocol, result.count
                );
                success_results.push(result);
            }
            Err(err) => {
                warn!(
                    "协议补抓失败: email={} protocol={} host={}:{} error={}",
                    email, candidate.protocol, candidate.host, candidate.port, err
                );
                error_messages.push(format!("{}: {}", candidate.protocol, err));
            }
        }
    }

    if success_results.is_empty() {
        return Err(error_messages.join("；"));
    }

    if success_results.len() == 1 {
        return Ok(success_results.remove(0));
    }

    let merged = merge_fetched_emails(success_results, limit, fetch_oldest);
    info!(
        "协议补抓合并完成: email={} merged_count={}",
        email, merged.count
    );
    Ok(merged)
}

/// 同步邮件请求（发送到远程服务器）
#[derive(Debug, Serialize)]
pub struct SyncEmailsRequest {
    pub mailbox_id: i64,
    pub emails: Vec<EmailData>,
}

#[derive(Debug, Deserialize)]
struct ApiEnvelope<T> {
    code: i32,
    message: String,
    data: Option<T>,
}

#[derive(Debug, Deserialize)]
struct MailboxReloginConfig {
    email: String,
    password: String,
    protocol: String,
    pop3_host: Option<String>,
    pop3_port: Option<u16>,
    imap_host: Option<String>,
    imap_port: Option<u16>,
}

#[derive(Debug, Serialize)]
struct RecoverPasswordLoginRequest {
    password: String,
    protocol: String,
    host: String,
    port: u16,
    smtp_host: Option<String>,
    smtp_port: Option<u16>,
    smtp_verified: bool,
    smtp_error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendEmailAttachment {
    pub name: String,
    pub size: usize,
    pub content_type: String,
    pub data_base64: String,
}

#[derive(Debug)]
struct SmtpProxyTlsStream(
    tokio_native_tls::TlsStream<Box<dyn lettre::transport::smtp::client::AsyncTokioStream>>,
);

impl AsyncRead for SmtpProxyTlsStream {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        Pin::new(&mut self.0).poll_read(cx, buf)
    }
}

impl AsyncWrite for SmtpProxyTlsStream {
    fn poll_write(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<Result<usize, std::io::Error>> {
        Pin::new(&mut self.0).poll_write(cx, buf)
    }

    fn poll_flush(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Result<(), std::io::Error>> {
        Pin::new(&mut self.0).poll_flush(cx)
    }

    fn poll_shutdown(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Result<(), std::io::Error>> {
        Pin::new(&mut self.0).poll_shutdown(cx)
    }
}

impl lettre::transport::smtp::client::AsyncTokioStream for SmtpProxyTlsStream {
    fn peer_addr(&self) -> std::io::Result<std::net::SocketAddr> {
        self.0.get_ref().get_ref().get_ref().peer_addr()
    }
}

async fn open_smtp_connection_with_proxy(
    smtp_host: &str,
    smtp_port: u16,
    proxy: Option<&RuntimeProxy>,
) -> Result<lettre::transport::smtp::client::AsyncSmtpConnection, String> {
    use lettre::transport::smtp::client::{AsyncSmtpConnection, AsyncTokioStream, TlsParameters};

    let hello_name = lettre::transport::smtp::extension::ClientId::default();

    if smtp_port == 465 {
        let tcp_stream = crate::mail::proxy::connect_tokio_tcp(smtp_host, smtp_port, proxy).await?;
        let boxed_stream: Box<dyn AsyncTokioStream> = Box::new(tcp_stream);
        let tls_connector = native_tls::TlsConnector::builder()
            .min_protocol_version(Some(native_tls::Protocol::Tlsv10))
            .build()
            .map_err(|e| format!("TLS 初始化失败: {}", e))?;
        let tls_stream = tokio_native_tls::TlsConnector::from(tls_connector)
            .connect(smtp_host, boxed_stream)
            .await
            .map_err(|e| format!("SMTP TLS 握手失败: {}", e))?;
        let boxed_tls: Box<dyn AsyncTokioStream> = Box::new(SmtpProxyTlsStream(tls_stream));
        return AsyncSmtpConnection::connect_with_transport(boxed_tls, &hello_name)
            .await
            .map_err(|e| format!("连接 SMTP 服务器失败: {}", e));
    }

    let tcp_stream = crate::mail::proxy::connect_tokio_tcp(smtp_host, smtp_port, proxy).await?;
    let boxed_stream: Box<dyn AsyncTokioStream> = Box::new(tcp_stream);
    let mut conn = AsyncSmtpConnection::connect_with_transport(boxed_stream, &hello_name)
        .await
        .map_err(|e| format!("连接 SMTP 服务器失败: {}", e))?;
    let tls = TlsParameters::new(smtp_host.to_string())
        .map_err(|e| format!("TLS 参数错误: {}", e))?;
    conn.starttls(tls, &hello_name)
        .await
        .map_err(|e| format!("STARTTLS 升级失败: {}", e))?;
    Ok(conn)
}

async fn verify_smtp_connection(
    email: &str,
    password: &str,
    smtp_host: &str,
    smtp_port: u16,
    proxy: Option<&RuntimeProxy>,
) -> Result<(), String> {
    use lettre::transport::smtp::authentication::{Credentials, DEFAULT_MECHANISMS};

    let mut conn = open_smtp_connection_with_proxy(smtp_host, smtp_port, proxy).await?;
    let creds = Credentials::new(email.to_string(), password.to_string());
    conn.auth(DEFAULT_MECHANISMS, &creds)
        .await
        .map_err(format_smtp_send_error)?;
    if !conn.test_connected().await {
        conn.abort().await;
        return Err("SMTP 连接校验失败".to_string());
    }
    let _ = conn.quit().await;
    Ok(())
}

/// 添加外部邮箱（验证登录）
/// 前端调用：invoke('add_external_mailbox', { email, password, protocol, host?, port?, verifySmtp? })
/// protocol: "imap" | "pop3" | "auto"（自动检测，先试IMAP再试POP3）
#[tauri::command]
pub async fn add_external_mailbox(
    email: String,
    password: String,
    protocol: String,
    host: Option<String>,
    port: Option<u16>,
    verify_smtp: Option<bool>,
    proxy: Option<RuntimeProxy>,
) -> Result<LoginResult, String> {
    info!("收到添加外部邮箱请求: {} ({})", email, protocol);
    let should_verify_smtp = verify_smtp.unwrap_or(true);

    // 获取本地出口 IP（用于日志记录）
    match get_local_ip().await {
        Ok(ip) => info!("🌐 使用本地 IP 登录邮箱: {}", ip),
        Err(e) => info!("⚠️  无法获取本地 IP: {}", e),
    }

    // 获取邮箱域名
    let domain = email
        .split('@')
        .nth(1)
        .ok_or("无效的邮箱地址")?;

    let proto = protocol.to_lowercase();

    // 用户指定了自定义服务器
    if let (Some(h), Some(p)) = (host.clone(), port) {
        let mut result = if proto == "imap" {
            mail::imap::verify_login(&email, &password, &h, p, proxy.clone()).await?
        } else {
            mail::pop3::verify_login(&email, &password, &h, p, proxy.clone()).await?
        };
        if result.success && should_verify_smtp {
            try_smtp_verify(&mut result, &email, &password, domain, proxy.as_ref()).await;
        }
        return Ok(result);
    }

    // 自动检测服务器配置
    let config = get_server_config(domain).await
        .ok_or(format!("无法识别邮箱 {} 的服务器配置，请手动填写服务器地址", domain))?;

    if proto == "auto" {
        // 自动模式：先试 IMAP，失败再试 POP3
        info!("自动检测协议：先尝试 IMAP {}:{}", config.imap_host, config.imap_port);
        let mut imap_result = mail::imap::verify_login(&email, &password, &config.imap_host, config.imap_port, proxy.clone()).await?;
        if imap_result.success {
            if should_verify_smtp {
                try_smtp_verify(&mut imap_result, &email, &password, domain, proxy.as_ref()).await;
            }
            return Ok(imap_result);
        }

        info!("IMAP 登录失败({}), 尝试 POP3 {}:{}", imap_result.message, config.pop3_host, config.pop3_port);
        let mut pop3_result = mail::pop3::verify_login(&email, &password, &config.pop3_host, config.pop3_port, proxy.clone()).await?;
        if pop3_result.success {
            if should_verify_smtp {
                try_smtp_verify(&mut pop3_result, &email, &password, domain, proxy.as_ref()).await;
            }
            return Ok(pop3_result);
        }

        // 两个都失败
        Ok(LoginResult {
            success: false,
            message: format!("IMAP 和 POP3 均登录失败。IMAP: {}; POP3: {}", imap_result.message, pop3_result.message),
            protocol: None,
            host: None,
            port: None,
            smtp_host: None,
            smtp_port: None,
            smtp_verified: false,
            smtp_error: None,
        })
    } else if proto == "imap" {
        let mut result = mail::imap::verify_login(&email, &password, &config.imap_host, config.imap_port, proxy.clone()).await?;
        if result.success && should_verify_smtp {
            try_smtp_verify(&mut result, &email, &password, domain, proxy.as_ref()).await;
        }
        Ok(result)
    } else {
        let mut result = mail::pop3::verify_login(&email, &password, &config.pop3_host, config.pop3_port, proxy.clone()).await?;
        if result.success && should_verify_smtp {
            try_smtp_verify(&mut result, &email, &password, domain, proxy.as_ref()).await;
        }
        Ok(result)
    }
}

/// 获取本地出口 IP（用于验证）
async fn get_local_ip() -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.ipify.org?format=text")
        .timeout(std::time::Duration::from_secs(5))
        .send()
        .await
        .map_err(|e| format!("获取 IP 失败: {}", e))?;
    
    let ip = response
        .text()
        .await
        .map_err(|e| format!("解析 IP 失败: {}", e))?;
    
    Ok(ip)
}

/// 尝试验证 SMTP 登录，成功则更新 LoginResult 中的 smtp 字段
/// 逐个尝试候选服务器，遇到真实可用的即停止
async fn try_smtp_verify(
    result: &mut LoginResult,
    email: &str,
    password: &str,
    domain: &str,
    proxy: Option<&RuntimeProxy>,
) {
    info!("尝试 SMTP 验证: {}", email);
    match resolve_reachable_smtp_candidate(email, password, domain, proxy).await {
        Ok((smtp_host, smtp_port)) => {
            info!("SMTP 验证成功: {}:{}", smtp_host, smtp_port);
            result.smtp_host = Some(smtp_host);
            result.smtp_port = Some(smtp_port);
            result.smtp_verified = true;
            result.smtp_error = None;
        }
        Err(error_message) => {
            info!("SMTP 验证失败: {}", error_message);
            result.smtp_verified = false;
            result.smtp_error = Some(error_message);
        }
    }
}

/// 根据服务端已同步数量决定本次收取窗口：
/// - 首次/数据很少：历史回补窗口（2000）
/// - 否则：增量窗口（200）
async fn resolve_fetch_policy(server_url: &str, token: &str, mailbox_id: i64) -> (usize, bool) {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/unified-emails/external-emails",
        server_url.trim_end_matches('/')
    );
    let mailbox_id_str = mailbox_id.to_string();

    let response = match client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .query(&[
            ("page", "1"),
            ("page_size", "1"),
            ("mailbox_id", mailbox_id_str.as_str()),
        ])
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            info!("获取历史同步数量失败，使用增量窗口: {}", e);
            return (INCREMENTAL_FETCH_LIMIT, false);
        }
    };

    if !response.status().is_success() {
        info!(
            "查询历史同步数量失败(status={})，使用增量窗口",
            response.status()
        );
        return (INCREMENTAL_FETCH_LIMIT, false);
    }

    let body: serde_json::Value = match response.json().await {
        Ok(v) => v,
        Err(e) => {
            info!("解析历史同步数量响应失败，使用增量窗口: {}", e);
            return (INCREMENTAL_FETCH_LIMIT, false);
        }
    };

    if body.get("code").and_then(|v| v.as_i64()) != Some(0) {
        info!("历史同步数量接口返回失败，使用增量窗口: {}", body);
        return (INCREMENTAL_FETCH_LIMIT, false);
    }

    let total = body
        .get("data")
        .and_then(|v| v.get("pagination"))
        .and_then(|v| v.get("total"))
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as usize;

    if total <= HISTORY_BACKFILL_THRESHOLD {
        info!(
            "启用历史回补策略: mailbox_id={}, total={}, limit={}, oldest_first=true",
            mailbox_id, total, INITIAL_HISTORY_FETCH_LIMIT
        );
        (INITIAL_HISTORY_FETCH_LIMIT, true)
    } else {
        info!(
            "启用增量策略: mailbox_id={}, total={}, limit={}, oldest_first=false",
            mailbox_id, total, INCREMENTAL_FETCH_LIMIT
        );
        (INCREMENTAL_FETCH_LIMIT, false)
    }
}

async fn load_mailbox_relogin_config(
    server_url: &str,
    token: &str,
    mailbox_id: i64,
) -> Result<MailboxReloginConfig, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/unified-emails/external-mailboxes/{}/relogin-config",
        server_url.trim_end_matches('/'),
        mailbox_id
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| format!("获取重登配置失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("获取重登配置失败 {}: {}", status, body));
    }

    let body: ApiEnvelope<MailboxReloginConfig> = response
        .json()
        .await
        .map_err(|e| format!("解析重登配置失败: {}", e))?;

    if body.code != 0 {
        return Err(if body.message.is_empty() {
            "获取重登配置失败".to_string()
        } else {
            body.message
        });
    }

    body.data.ok_or_else(|| "重登配置为空".to_string())
}

fn resolve_relogin_server(config: &MailboxReloginConfig) -> Result<(String, u16, String), String> {
    let protocol = if config.protocol.to_lowercase() == "pop3" {
        "pop3".to_string()
    } else {
        "imap".to_string()
    };

    let (host, port) = if protocol == "imap" {
        (
            config.imap_host.clone().unwrap_or_default(),
            config.imap_port.unwrap_or(993),
        )
    } else {
        (
            config.pop3_host.clone().unwrap_or_default(),
            config.pop3_port.unwrap_or(995),
        )
    };

    if host.trim().is_empty() {
        return Err("重登配置缺少服务器地址".to_string());
    }

    Ok((host, port, protocol))
}

async fn activate_mailbox_password_login(
    server_url: &str,
    token: &str,
    mailbox_id: i64,
    password: &str,
    login_result: &LoginResult,
) -> Result<(), String> {
    let protocol = login_result
        .protocol
        .clone()
        .unwrap_or_else(|| "imap".to_string());
    let host = login_result
        .host
        .clone()
        .ok_or_else(|| "重登成功但缺少服务器地址".to_string())?;
    let port = login_result
        .port
        .ok_or_else(|| "重登成功但缺少服务器端口".to_string())?;

    let request_body = RecoverPasswordLoginRequest {
        password: password.to_string(),
        protocol,
        host,
        port,
        smtp_host: login_result.smtp_host.clone(),
        smtp_port: login_result.smtp_port,
        smtp_verified: login_result.smtp_verified,
        smtp_error: login_result.smtp_error.clone(),
    };

    let client = reqwest::Client::new();
    let url = format!(
        "{}/unified-emails/external-mailboxes/{}/recover-password-login",
        server_url.trim_end_matches('/'),
        mailbox_id
    );

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("回写账号恢复状态失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("回写账号恢复状态失败 {}: {}", status, body));
    }

    let body: ApiEnvelope<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("解析账号恢复响应失败: {}", e))?;

    if body.code != 0 {
        return Err(if body.message.is_empty() {
            "回写账号恢复状态失败".to_string()
        } else {
            body.message
        });
    }

    Ok(())
}

async fn recover_external_mailbox_session_inner(
    mailbox_id: i64,
    token: &str,
    server_url: &str,
) -> Result<(MailboxReloginConfig, LoginResult), String> {
    begin_recovery_attempt(mailbox_id)?;

    let config = load_mailbox_relogin_config(server_url, token, mailbox_id)
        .await
        .map_err(|e| finalize_recovery_failure(mailbox_id, e))?;
    let (host, port, protocol) = resolve_relogin_server(&config)?;

    let login_result = add_external_mailbox(
        config.email.clone(),
        config.password.clone(),
        protocol,
        Some(host),
        Some(port),
        Some(true),
        None,
    )
    .await
    .map_err(|e| finalize_recovery_failure(mailbox_id, e))?;

    if !login_result.success {
        return Err(finalize_recovery_failure(mailbox_id, login_result.message.clone()));
    }

    activate_mailbox_password_login(
        server_url,
        token,
        mailbox_id,
        &config.password,
        &login_result,
    )
    .await
    .map_err(|e| finalize_recovery_failure(mailbox_id, e))?;

    mark_recovery_success(mailbox_id);

    Ok((config, login_result))
}

async fn fetch_mailbox_via_relogin_config(
    server_url: &str,
    token: &str,
    mailbox_id: i64,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    let (config, login_result) = recover_external_mailbox_session_inner(mailbox_id, token, server_url).await?;
    let protocol = login_result
        .protocol
        .clone()
        .unwrap_or_else(|| "imap".to_string());
    let host = login_result
        .host
        .clone()
        .ok_or_else(|| "自动重登成功但缺少服务器地址".to_string())?;
    let port = login_result
        .port
        .ok_or_else(|| "自动重登成功但缺少服务器端口".to_string())?;

    info!(
        "开始自动重登收取: mailbox_id={} email={} ({} -> {}:{})",
        mailbox_id, config.email, protocol, host, port
    );

    if protocol == "imap" {
        mail::imap::fetch_emails(
            &config.email,
            &config.password,
            &host,
            port,
            limit,
            fetch_oldest,
            None,
        )
        .await
    } else {
        mail::pop3::fetch_emails(
            &config.email,
            &config.password,
            &host,
            port,
            limit,
            fetch_oldest,
            None,
        )
        .await
    }
}

#[tauri::command]
pub async fn recover_external_mailbox_session(
    mailbox_id: i64,
    token: String,
    server_url: String,
) -> Result<LoginResult, String> {
    let (_, login_result) =
        recover_external_mailbox_session_inner(mailbox_id, &token, &server_url).await?;
    Ok(login_result)
}

#[tauri::command]
pub async fn recover_and_fetch_external_mailbox(
    mailbox_id: i64,
    token: String,
    server_url: String,
) -> Result<FetchResult, String> {
    let (fetch_limit, fetch_oldest) = resolve_fetch_policy(&server_url, &token, mailbox_id).await;
    let result =
        fetch_mailbox_via_relogin_config(&server_url, &token, mailbox_id, fetch_limit, fetch_oldest)
            .await?;

    if result.success && !result.emails.is_empty() {
        match sync_emails_to_server(&server_url, &token, mailbox_id, &result.emails).await {
            Ok(new_count) => {
                return Ok(FetchResult {
                    success: true,
                    message: format!("收取成功，新增 {} 封邮件", new_count),
                    emails: vec![],
                    count: new_count,
                });
            }
            Err(e) => {
                error!("自动恢复后同步邮件到服务器失败: {}", e);
                return Err(format!("本地收取成功，但同步到服务器失败: {}", e));
            }
        }
    }

    Ok(FetchResult {
        emails: vec![],
        ..result
    })
}

/// 收取邮件
/// 前端调用：invoke('fetch_emails', { mailboxId, email, password, protocol, host?, port?, token, serverUrl, authType?, accessToken? })
#[tauri::command]
pub async fn fetch_emails(
    mailbox_id: i64,
    email: String,
    password: String,
    protocol: String,
    host: Option<String>,
    port: Option<u16>,
    token: String,
    server_url: String,
    auth_type: Option<String>,
    access_token: Option<String>,
    proxy: Option<RuntimeProxy>,
) -> Result<FetchResult, String> {
    // 判断是否走 OAuth2 XOAUTH2
    let is_oauth2 = auth_type.as_deref() == Some("oauth2");
    let domain = email.split('@').nth(1).ok_or("无效的邮箱地址")?;
    let discovered_config = if is_oauth2 {
        None
    } else {
        get_server_config(domain).await
    };

    // 自动检测服务器配置（当 host/port 缺失时）
    let (final_host, final_port, final_protocol) = if let (Some(h), Some(p)) = (host.as_deref().filter(|s| !s.is_empty()), port) {
        (h.to_string(), p, if is_oauth2 { "imap".to_string() } else { protocol.clone() })
    } else {
        let config = discovered_config.clone()
            .ok_or(format!("无法识别邮箱 {} 的服务器配置", domain))?;

        if is_oauth2 || protocol.to_lowercase() == "imap" || protocol.to_lowercase() == "auto" {
            (config.imap_host, config.imap_port, "imap".to_string())
        } else {
            (config.pop3_host, config.pop3_port, "pop3".to_string())
        }
    };

    info!("收到收取邮件请求: {} ({}{}) -> {}:{}", email, final_protocol, if is_oauth2 { " XOAUTH2" } else { "" }, final_host, final_port);
    info!("密码长度: {}, token长度: {}, serverUrl: {}", password.len(), token.len(), server_url);

    let (fetch_limit, fetch_oldest) = resolve_fetch_policy(&server_url, &token, mailbox_id).await;
    info!(
        "本次本地收取策略: mailbox_id={}, limit={}, oldest_first={}",
        mailbox_id,
        fetch_limit,
        fetch_oldest
    );

    // 本地收取邮件
    let result = if is_oauth2 {
        // OAuth2 XOAUTH2 认证
        let oauth_token = access_token.ok_or("OAuth2 模式需要 access_token")?;
        match mail::imap::fetch_emails_oauth2(
            &email,
            &oauth_token,
            &final_host,
            final_port,
            fetch_limit,
            fetch_oldest,
            proxy.clone(),
        )
        .await
        {
            Ok(r) => r,
            Err(e) => {
                warn!("IMAP XOAUTH2 收取失败: {}", e);
                match fetch_mailbox_via_relogin_config(
                    &server_url,
                    &token,
                    mailbox_id,
                    fetch_limit,
                    fetch_oldest,
                )
                .await
                {
                    Ok(r) => {
                        info!("✅ 自动重登成功，已恢复本地收取: {}", email);
                        r
                    }
                    Err(relogin_error) => {
                        error!("自动重登失败: {}", relogin_error);
                        return Err(format!("{}；自动重登失败: {}", e, relogin_error));
                    }
                }
            }
        }
    } else {
        match fetch_password_mailbox_with_merge(
            &email,
            &password,
            &final_protocol,
            &final_host,
            final_port,
            discovered_config.as_ref(),
            fetch_limit,
            fetch_oldest,
            proxy.as_ref(),
        )
        .await
        {
            Ok(r) => r,
            Err(e) => {
                error!("密码邮箱收取失败: {}", e);
                return Err(e);
            }
        }
    };

    if result.success && !result.emails.is_empty() {
        // 同步到远程服务器（附件 data 字段会被 serde(skip) 跳过，只发元数据）
        match sync_emails_to_server(&server_url, &token, mailbox_id, &result.emails).await {
            Ok(new_count) => {
                // 用后端去重后的实际新增数替换总数，emails 不通过 IPC 返回（内容太大）
                return Ok(FetchResult {
                    success: true,
                    message: format!("收取成功，新增 {} 封邮件", new_count),
                    emails: vec![],
                    count: new_count,
                });
            }
            Err(e) => {
                error!("同步邮件到服务器失败: {}", e);
                return Err(format!("本地收取成功，但同步到服务器失败: {}", e));
            }
        }
    }

    Ok(FetchResult {
        emails: vec![],
        ..result
    })
}

/// 同步邮件到远程服务器，返回实际新增数量
async fn sync_emails_to_server(
    server_url: &str,
    token: &str,
    mailbox_id: i64,
    emails: &[EmailData],
) -> Result<usize, String> {
    info!("同步 {} 封邮件到服务器", emails.len());

    let client = reqwest::Client::new();
    let url = format!("{}/unified-emails/external-emails/sync", server_url);

    let request_body = SyncEmailsRequest {
        mailbox_id,
        emails: emails.to_vec(),
    };

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", token))
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if response.status().is_success() {
        let body: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        let new_count = body["data"]["count"].as_u64().unwrap_or(0) as usize;
        info!("✅ 邮件同步成功，新增 {} 封", new_count);
        Ok(new_count)
    } else {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        Err(format!("服务器返回错误 {}: {}", status, body))
    }
}

/// 检查是否在 Tauri 环境
#[tauri::command]
pub fn is_tauri() -> bool {
    true
}

/// 更新信息
#[derive(Debug, Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub notes: String,
}

/// 保底更新检查（用 reqwest 直接请求更新清单，不依赖 updater 插件）
#[tauri::command]
pub async fn check_for_update(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let current_version = app.package_info().version.to_string();

    let target = if cfg!(target_os = "macos") {
        "universal-apple-darwin"
    } else if cfg!(target_os = "windows") {
        "x86_64-pc-windows-msvc"
    } else {
        "x86_64-unknown-linux-gnu"
    };

    let url = format!(
        "https://zjkdongao.cn/desktop-updates/{}/latest",
        target
    );

    info!("保底更新检查: {} (当前版本 {})", url, current_version);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("创建HTTP客户端失败: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("服务器返回 {}", response.status()));
    }

    let manifest: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析JSON失败: {}", e))?;

    let remote_version = manifest["version"]
        .as_str()
        .ok_or("缺少version字段")?;

    if is_newer_version(remote_version, &current_version) {
        info!("发现新版本: {} > {}", remote_version, current_version);
        Ok(Some(UpdateInfo {
            version: remote_version.to_string(),
            notes: manifest["notes"].as_str().unwrap_or("").to_string(),
        }))
    } else {
        info!("已是最新版本: {} <= {}", remote_version, current_version);
        Ok(None)
    }
}

fn is_newer_version(remote: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse().ok())
            .collect()
    };
    parse(remote) > parse(current)
}

/// 保底更新：用 updater 插件的 Rust API 下载安装（用户点击"立即更新"后调用）
#[tauri::command]
pub async fn download_and_install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::Emitter;

    info!("保底更新：触发下载安装");

    let target = if cfg!(target_os = "macos") {
        "universal-apple-darwin"
    } else if cfg!(target_os = "windows") {
        "x86_64-pc-windows-msvc"
    } else {
        "x86_64-unknown-linux-gnu"
    };

    let endpoint = format!("https://zjkdongao.cn/desktop-updates/{}/latest", target);
    info!("使用更新端点: {}", endpoint);

    let url = endpoint.parse::<url::Url>()
        .map_err(|e| format!("URL解析失败: {}", e))?;

    let updater = app.updater_builder()
        .endpoints(vec![url])
        .map_err(|e| format!("设置端点失败: {}", e))?
        .build()
        .map_err(|e| format!("创建 updater 失败: {}", e))?;

    let update = updater.check().await
        .map_err(|e| format!("检查更新失败: {}", e))?;

    let update = match update {
        Some(u) => u,
        None => return Err("没有可用更新".to_string()),
    };

    info!("开始下载更新: v{}", update.version);

    let app_for_chunks = app.clone();
    let app_for_finish = app.clone();
    let mut first_chunk = true;

    update.download_and_install(
        move |chunk_length, content_length| {
            if first_chunk {
                first_chunk = false;
                let _ = app_for_chunks.emit("update-progress", serde_json::json!({
                    "event": "Started",
                    "data": { "contentLength": content_length }
                }));
            }
            let _ = app_for_chunks.emit("update-progress", serde_json::json!({
                "event": "Progress",
                "data": { "chunkLength": chunk_length }
            }));
        },
        move || {
            let _ = app_for_finish.emit("update-progress", serde_json::json!({
                "event": "Finished"
            }));
        },
    ).await.map_err(|e| format!("下载安装失败: {}", e))?;

    info!("更新下载安装完成");

    Ok(())
}

/// 获取附件本地存储根目录
fn get_attachments_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    home.join(".mail-desktop").join("attachments")
}

/// 将 message_id 转为安全的目录名
fn sanitize_message_id(message_id: &str) -> String {
    message_id
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

/// 保存邮件附件到本地磁盘
fn save_attachments_locally(emails: &[EmailData]) {
    let base_dir = get_attachments_dir();

    for email in emails {
        if email.attachments.is_empty() {
            continue;
        }
        let dir = base_dir.join(sanitize_message_id(&email.message_id));
        if let Err(e) = std::fs::create_dir_all(&dir) {
            error!("创建附件目录失败: {:?}, {}", dir, e);
            continue;
        }
        for att in &email.attachments {
            if att.data.is_empty() {
                continue;
            }
            let file_path = dir.join(&att.filename);
            match std::fs::write(&file_path, &att.data) {
                Ok(_) => info!("附件已保存到本地: {:?}", file_path),
                Err(e) => error!("保存附件失败: {:?}, {}", file_path, e),
            }
        }
    }
}

/// 打开本地附件（桌面端用）
#[tauri::command]
pub fn open_local_attachment(message_id: String, filename: String) -> Result<String, String> {
    let dir = get_attachments_dir().join(sanitize_message_id(&message_id));
    let file_path = dir.join(&filename);

    if !file_path.exists() {
        return Err(format!("附件文件不存在: {:?}", file_path));
    }

    // 用系统默认程序打开文件
    open::that(&file_path).map_err(|e| format!("打开文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

/// 获取附件本地路径（用于「另存为」等场景）
#[tauri::command]
pub fn get_attachment_path(message_id: String, filename: String) -> Result<String, String> {
    let dir = get_attachments_dir().join(sanitize_message_id(&message_id));
    let file_path = dir.join(&filename);

    if !file_path.exists() {
        return Err("附件文件不存在".to_string());
    }

    Ok(file_path.to_string_lossy().to_string())
}

/// 通用附件下载（桌面端本地 IMAP/POP3 实时取附件写到用户选的路径）
#[tauri::command]
pub async fn download_attachment(
    email: String,
    password: String,
    protocol: String,
    host: String,
    port: u16,
    message_id: String,
    filename: String,
    save_path: String,
    auth_type: Option<String>,
    access_token: Option<String>,
    subject: Option<String>,
    from_addr: Option<String>,
    to_addr: Option<String>,
    email_date_ms: Option<i64>,
) -> Result<(), String> {
    info!("下载附件: email={}, protocol={}, message_id={}, filename={}", email, protocol, message_id, filename);

    let is_oauth2 = auth_type.as_deref() == Some("oauth2");

    let result = if is_oauth2 {
        let token = access_token.ok_or("OAuth2 模式需要 access_token")?;
        mail::imap::download_attachment_oauth2(&email, &token, &host, port, &message_id, &filename, &save_path).await
    } else if protocol.to_lowercase() == "pop3" {
        mail::pop3::download_attachment(
            &email,
            &password,
            &host,
            port,
            &message_id,
            &filename,
            &save_path,
            subject.as_deref(),
            from_addr.as_deref(),
            to_addr.as_deref(),
            email_date_ms,
        ).await
    } else {
        mail::imap::download_attachment(&email, &password, &host, port, &message_id, &filename, &save_path).await
    };

    if let Err(error_message) = &result {
        error!(
            "附件下载失败: email={}, protocol={}, host={}:{}, message_id={}, filename={}, error={}",
            email, protocol, host, port, message_id, filename, error_message
        );
    }

    result
}

/// 用系统默认浏览器打开外部链接（桌面端用）
#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    let normalized = url.trim();
    let lower = normalized.to_lowercase();

    if !(lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("mailto:")
        || lower.starts_with("tel:"))
    {
        return Err("不支持的链接协议".to_string());
    }

    info!("打开外部链接: {}", normalized);
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(normalized)
            .spawn()
            .map_err(|e| format!("打开外部链接失败: {}", e))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", normalized])
            .spawn()
            .map_err(|e| format!("打开外部链接失败: {}", e))?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        open::that(normalized).map_err(|e| format!("打开外部链接失败: {}", e))?;
        Ok(())
    }
}

/// 通过本地 SMTP 发送邮件（桌面端专用，使用用户本机 IP）
/// 前端调用：invoke('send_smtp_email', { fromEmail, password, smtpHost, smtpPort, toEmail, subject, content, contentHtml, cc, bcc })
#[tauri::command]
pub async fn send_smtp_email(
    from_email: String,
    password: String,
    smtp_host: String,
    smtp_port: u16,
    to_email: String,
    subject: String,
    content: String,
    content_html: Option<String>,
    cc: Option<String>,
    bcc: Option<String>,
    attachments: Option<Vec<SendEmailAttachment>>,
    proxy: Option<RuntimeProxy>,
) -> Result<SmtpSendResult, String> {
    use lettre::{
        message::{header::ContentType, Attachment, Mailbox, MultiPart, SinglePart},
        transport::smtp::authentication::{Credentials, DEFAULT_MECHANISMS},
        Message,
    };
    use log::warn;
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    info!("📧 准备本地 SMTP 发送: {} -> {}. 传入配置: {}:{}", from_email, to_email, smtp_host, smtp_port);

    // 如果 smtp_host 未知或为空，尝试自动探测并逐个验证候选
    let (final_host, final_port) = if smtp_host.is_empty() {
        let domain = from_email.split('@').nth(1).unwrap_or("");
        match resolve_reachable_smtp_candidate(&from_email, &password, domain, proxy.as_ref()).await {
            Ok((h, p)) => {
                info!("🔍 自动探测到 SMTP 服务器: {}:{}", h, p);
                (h, p)
            }
            Err(e) => {
                warn!("自动探测失败: {}", e);
                return Err(format!("无法识别该邮箱的 SMTP 服务器，且自动探测失败: {}", e));
            }
        }
    } else {
        (smtp_host.clone(), smtp_port)
    };

    let parse_mailboxes = |input: &str, label: &str| -> Result<Vec<Mailbox>, String> {
        input
            .split(|c| matches!(c, ',' | ';' | '\n' | '，' | '；'))
            .map(str::trim)
            .filter(|addr| !addr.is_empty())
            .map(|addr| {
                addr.parse()
                    .map_err(|e| format!("{}地址无效: {} ({})", label, addr, e))
            })
            .collect()
    };

    let to_mailboxes = parse_mailboxes(&to_email, "收件人")?;
    if to_mailboxes.is_empty() {
        return Err("收件人地址不能为空".to_string());
    }
    let cc_mailboxes = parse_mailboxes(cc.as_deref().unwrap_or(""), "抄送")?;
    let bcc_mailboxes = parse_mailboxes(bcc.as_deref().unwrap_or(""), "密送")?;

    // 构建邮件
    let mut message_builder = Message::builder()
        .from(from_email.parse().map_err(|e| format!("发件人地址无效: {}", e))?)
        .subject(&subject);

    for mailbox in to_mailboxes {
        message_builder = message_builder.to(mailbox);
    }
    for mailbox in cc_mailboxes {
        message_builder = message_builder.cc(mailbox);
    }
    for mailbox in bcc_mailboxes {
        message_builder = message_builder.bcc(mailbox);
    }

    let html_content = content_html.unwrap_or_default();
    let text_part = SinglePart::builder()
        .header(ContentType::TEXT_PLAIN)
        .body(content.clone());
    let body_part = if html_content.trim().is_empty() {
        MultiPart::alternative().singlepart(text_part)
    } else {
        MultiPart::alternative()
            .singlepart(text_part)
            .singlepart(
                SinglePart::builder()
                    .header(ContentType::TEXT_HTML)
                    .body(html_content.clone())
            )
    };

    let email = if let Some(attachments) = attachments.filter(|items| !items.is_empty()) {
        let mut multipart = MultiPart::mixed().multipart(body_part);

        for attachment in attachments {
            let file_bytes = STANDARD.decode(&attachment.data_base64)
                .map_err(|e| format!("附件 {} 解析失败: {}", attachment.name, e))?;
            let content_type = ContentType::parse(&attachment.content_type)
                .unwrap_or_else(|_| ContentType::parse("application/octet-stream").unwrap());

            info!(
                "📎 添加附件: {} ({} bytes, declared {} bytes)",
                attachment.name,
                file_bytes.len(),
                attachment.size
            );

            multipart = multipart.singlepart(
                Attachment::new(attachment.name).body(file_bytes, content_type)
            );
        }

        message_builder
            .multipart(multipart)
            .map_err(|e| format!("构建带附件邮件失败: {}", e))?
    } else {
        message_builder
            .multipart(body_part)
            .map_err(|e| format!("构建邮件失败: {}", e))?
    };
    let mut conn = open_smtp_connection_with_proxy(&final_host, final_port, proxy.as_ref()).await?;
    let creds = Credentials::new(from_email.clone(), password);
    conn.auth(DEFAULT_MECHANISMS, &creds)
        .await
        .map_err(format_smtp_send_error)?;
    let response = conn
        .send(email.envelope(), &email.formatted())
        .await
        .map_err(format_smtp_send_error)?;
    let _ = conn.quit().await;

    info!("✅ 本地 SMTP 发送成功: {} -> {}", from_email, to_email);
    let response_code = response.code().to_string().parse::<u16>().ok();
    let response_message = {
        let parts = response.message().collect::<Vec<_>>();
        if parts.is_empty() {
            None
        } else {
            Some(parts.join(" "))
        }
    };

    Ok(SmtpSendResult {
        success: true,
        smtp_host: final_host,
        smtp_port: final_port,
        response_code,
        response_message,
    })
}

fn format_smtp_send_error(error: lettre::transport::smtp::Error) -> String {
    let raw_message = error.to_string();
    let normalized = raw_message.to_lowercase();

    if error.is_timeout() {
        return "发送失败: SMTP 连接超时，请检查网络或服务器配置".to_string();
    }

    if normalized.contains("authentication")
        || normalized.contains("credentials")
        || normalized.contains("auth")
        || normalized.contains("535")
    {
        return format!("发送失败: SMTP 认证失败，{}", raw_message);
    }

    if normalized.contains("recipient")
        || normalized.contains("mailbox unavailable")
        || normalized.contains("user unknown")
        || normalized.contains("no such user")
        || normalized.contains("invalid recipient")
        || normalized.contains("unknown user")
        || normalized.contains("550")
        || normalized.contains("551")
        || normalized.contains("553")
    {
        return format!("发送失败: 收件人地址不存在或被对方服务器拒收，{}", raw_message);
    }

    if let Some(status) = error.status() {
        return format!("发送失败: SMTP 返回 {}，{}", status, raw_message);
    }

    format!("发送失败: {}", raw_message)
}

async fn get_smtp_candidates(domain: &str) -> Result<Vec<(String, u16)>, String> {
    // 1. 已知消费者邮箱，直接返回（无需 DNS）
    if let Some(profile) = find_known_provider(domain) {
        log::info!("SMTP 快速路径命中: {}", domain);
        return Ok(
            profile
                .smtp_candidates
                .iter()
                .map(|(host, port)| ((*host).to_string(), *port))
                .collect(),
        );
    }

    let primary_mx = query_primary_mx(domain);
    if let Some(mx) = primary_mx.as_ref() {
        log::info!("发现首选 MX 记录: {}", mx);
    } else {
        log::info!("未找到 {} 的 MX 记录，继续使用通用 SMTP 候选", domain);
    }

    // 2. 根据 MX 识别企业邮件托管商
    if let Some(provider) = primary_mx
        .as_deref()
        .and_then(find_hosted_provider_by_mx)
    {
        let profile = provider.profile;
        log::info!(
            "SMTP MX 模式匹配命中: {} -> {}",
            primary_mx.unwrap_or_default(),
            provider.name
        );
        return Ok(
            profile
                .smtp_candidates
                .iter()
                .map(|(host, port)| ((*host).to_string(), *port))
                .collect(),
        );
    }

    let mx_root = primary_mx
        .as_deref()
        .map(extract_root_domain)
        .unwrap_or_else(|| domain.to_string());
    let mut candidates: Vec<(String, u16)> = Vec::new();
    candidates.extend(query_srv_records("submissions", domain));
    candidates.extend(query_srv_records("submission", domain));
    candidates.extend(vec![
        (format!("smtp.{}", domain), 465),
        (format!("smtp.{}", domain), 587),
        (format!("mail.{}", domain), 465),
        (format!("mail.{}", domain), 587),
        (format!("submission.{}", domain), 465),
        (format!("submission.{}", domain), 587),
        (format!("send.{}", domain), 465),
        (format!("send.{}", domain), 587),
    ]);
    if mx_root != domain {
        candidates.push((format!("smtp.{}", mx_root), 465));
        candidates.push((format!("smtp.{}", mx_root), 587));
        candidates.push((format!("mail.{}", mx_root), 465));
        candidates.push((format!("mail.{}", mx_root), 587));
        candidates.push((format!("submission.{}", mx_root), 465));
        candidates.push((format!("submission.{}", mx_root), 587));
    }
    if let Some(mx) = primary_mx.as_ref() {
        candidates.push((mx.clone(), 465));
        candidates.push((mx.clone(), 587));
    }

    Ok(dedupe_candidates(candidates))
}

async fn resolve_reachable_smtp_candidate(
    email: &str,
    password: &str,
    domain: &str,
    proxy: Option<&RuntimeProxy>,
) -> Result<(String, u16), String> {
    let candidates = get_smtp_candidates(domain).await?;
    if candidates.is_empty() {
        return Err("候选列表为空".to_string());
    }

    let mut last_error = String::from("无候选服务器");

    for (smtp_host, smtp_port) in candidates {
        info!("尝试 SMTP: {}:{}", smtp_host, smtp_port);
        match verify_smtp_connection(email, password, &smtp_host, smtp_port, proxy).await {
            Ok(_) => return Ok((smtp_host, smtp_port)),
            Err(error) => {
                last_error = format!("{}:{} {}", smtp_host, smtp_port, error);
                info!("{}", last_error);
            }
        }
    }

    Err(format!("所有 SMTP 候选均失败，最后错误: {}", last_error))
}

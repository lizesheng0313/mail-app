use crate::mail::types::{AttachmentData, EmailData, FetchResult, LoginResult};
use chrono::Utc;
use imap::Authenticator;
use log::{error, info, warn};
use native_tls::TlsStream;
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const TCP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const IO_TIMEOUT: Duration = Duration::from_secs(30);

// ── 连接错误分类（决定是否回退到其他策略）──────────────────────

enum ConnectError {
    /// TCP 连接失败（端口不通、DNS 错误）→ 跳到下一个端口
    Connection(String),
    /// TLS 握手失败（证书、协议版本）→ 同端口放宽证书再试
    Tls(String),
    /// 认证失败（密码错误）→ 直接返回，不再重试
    Auth(String),
    /// 其他错误 → 继续尝试
    Other(String),
}

impl std::fmt::Display for ConnectError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Connection(s) | Self::Tls(s) | Self::Auth(s) | Self::Other(s) => {
                write!(f, "{}", s)
            }
        }
    }
}

// ── 单次连接尝试 ──────────────────────────────────────────────

fn try_connect_and_login(
    host: &str,
    port: u16,
    email: &str,
    password: &str,
    accept_invalid_certs: bool,
) -> Result<(imap::Session<TlsStream<TcpStream>>, u16), ConnectError> {
    let use_starttls = port != 993;
    info!(
        "尝试 IMAP {}:{} ({}{})",
        host,
        port,
        if use_starttls { "STARTTLS" } else { "隐式TLS" },
        if accept_invalid_certs {
            ", 放宽证书"
        } else {
            ""
        }
    );

    let connector = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(accept_invalid_certs)
        .min_protocol_version(Some(native_tls::Protocol::Tlsv10))
        .build()
        .map_err(|e| ConnectError::Tls(format!("TLS 初始化失败: {}", e)))?;

    // DNS 解析
    let addr = (host, port)
        .to_socket_addrs()
        .map_err(|e| ConnectError::Connection(format!("DNS 解析失败 {}: {}", host, e)))?
        .next()
        .ok_or_else(|| ConnectError::Connection(format!("DNS 解析无结果: {}", host)))?;

    // TCP 连接（带超时）
    let tcp = TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT)
        .map_err(|e| ConnectError::Connection(format!("TCP 连接失败 {}:{} - {}", host, port, e)))?;

    tcp.set_read_timeout(Some(IO_TIMEOUT)).ok();
    tcp.set_write_timeout(Some(IO_TIMEOUT)).ok();

    // 建立 IMAP TLS 客户端
    let client = if use_starttls {
        // 明文连接 → STARTTLS 升级
        let plain_client = imap::Client::new(tcp);
        plain_client.secure(host, &connector).map_err(|e| match &e {
            imap::Error::TlsHandshake(_) | imap::Error::Tls(_) => {
                ConnectError::Tls(format!("STARTTLS 握手失败: {}", e))
            }
            imap::Error::Io(_) | imap::Error::ConnectionLost => {
                ConnectError::Connection(format!("STARTTLS 连接错误: {}", e))
            }
            _ => ConnectError::Other(format!("STARTTLS 失败: {}", e)),
        })?
    } else {
        // 隐式 TLS（993）
        let tls = connector
            .connect(host, tcp)
            .map_err(|e| ConnectError::Tls(format!("TLS 握手失败: {}", e)))?;
        imap::Client::new(tls)
    };

    // 登录
    match client.login(email, password) {
        Ok(session) => {
            info!("✅ IMAP {}:{} 登录成功", host, port);
            Ok((session, port))
        }
        Err((e, _)) => {
            error!("IMAP 登录失败 {}:{}: {}", host, port, e);
            Err(match &e {
                imap::Error::No(_) | imap::Error::Bad(_) => {
                    ConnectError::Auth("邮箱或授权码错误，请检查后重试".to_string())
                }
                _ => {
                    let s = e.to_string().to_lowercase();
                    if s.contains("auth") || s.contains("credential") || s.contains("login") {
                        ConnectError::Auth("邮箱或授权码错误，请检查后重试".to_string())
                    } else {
                        ConnectError::Other(format!("登录失败: {}", e))
                    }
                }
            })
        }
    }
}

// ── 多策略连接：主端口 → 放宽证书 → 备用端口 → 放宽证书 ──────

fn connect_and_login(
    host: &str,
    port: u16,
    email: &str,
    password: &str,
) -> Result<(imap::Session<TlsStream<TcpStream>>, u16), String> {
    let alt_port: u16 = if port == 993 { 143 } else { 993 };
    let ports = [port, alt_port];
    let mut last_error = String::new();

    for &p in &ports {
        // 严格 TLS
        match try_connect_and_login(host, p, email, password, false) {
            Ok(r) => return Ok(r),
            Err(ConnectError::Auth(msg)) => return Err(msg),
            Err(ConnectError::Tls(msg)) => {
                warn!("{}", msg);
                // TLS 握手失败 → 放宽证书再试
                match try_connect_and_login(host, p, email, password, true) {
                    Ok(r) => {
                        warn!("⚠️ IMAP 放宽证书验证连接成功 {}:{}", host, p);
                        return Ok(r);
                    }
                    Err(ConnectError::Auth(msg)) => return Err(msg),
                    Err(e) => {
                        last_error = e.to_string();
                        continue;
                    }
                }
            }
            Err(e) => {
                last_error = e.to_string();
                continue;
            }
        }
    }

    Err(format!(
        "IMAP 连接失败（已尝试 {}:{} 和 {}:{}）: {}",
        host, port, host, alt_port, last_error
    ))
}

// ── XOAUTH2 认证 ─────────────────────────────────────────────

struct OAuth2Authenticator {
    user: String,
    access_token: String,
}

impl Authenticator for OAuth2Authenticator {
    type Response = String;
    fn process(&self, _data: &[u8]) -> Self::Response {
        format!(
            "user={}\x01auth=Bearer {}\x01\x01",
            self.user, self.access_token
        )
    }
}

fn try_connect_and_xoauth2(
    host: &str,
    port: u16,
    email: &str,
    access_token: &str,
    accept_invalid_certs: bool,
) -> Result<(imap::Session<TlsStream<TcpStream>>, u16), ConnectError> {
    let use_starttls = port != 993;
    info!(
        "尝试 IMAP XOAUTH2 {}:{} ({}{})",
        host,
        port,
        if use_starttls { "STARTTLS" } else { "隐式TLS" },
        if accept_invalid_certs {
            ", 放宽证书"
        } else {
            ""
        }
    );

    let connector = native_tls::TlsConnector::builder()
        .danger_accept_invalid_certs(accept_invalid_certs)
        .min_protocol_version(Some(native_tls::Protocol::Tlsv10))
        .build()
        .map_err(|e| ConnectError::Tls(format!("TLS 初始化失败: {}", e)))?;

    let addr = (host, port)
        .to_socket_addrs()
        .map_err(|e| ConnectError::Connection(format!("DNS 解析失败 {}: {}", host, e)))?
        .next()
        .ok_or_else(|| ConnectError::Connection(format!("DNS 解析无结果: {}", host)))?;

    let tcp = TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT)
        .map_err(|e| ConnectError::Connection(format!("TCP 连接失败 {}:{} - {}", host, port, e)))?;

    tcp.set_read_timeout(Some(IO_TIMEOUT)).ok();
    tcp.set_write_timeout(Some(IO_TIMEOUT)).ok();

    let client = if use_starttls {
        let plain_client = imap::Client::new(tcp);
        plain_client.secure(host, &connector).map_err(|e| match &e {
            imap::Error::TlsHandshake(_) | imap::Error::Tls(_) => {
                ConnectError::Tls(format!("STARTTLS 握手失败: {}", e))
            }
            imap::Error::Io(_) | imap::Error::ConnectionLost => {
                ConnectError::Connection(format!("STARTTLS 连接错误: {}", e))
            }
            _ => ConnectError::Other(format!("STARTTLS 失败: {}", e)),
        })?
    } else {
        let tls = connector
            .connect(host, tcp)
            .map_err(|e| ConnectError::Tls(format!("TLS 握手失败: {}", e)))?;
        imap::Client::new(tls)
    };

    let auth = OAuth2Authenticator {
        user: email.to_string(),
        access_token: access_token.to_string(),
    };

    match client.authenticate("XOAUTH2", &auth) {
        Ok(session) => {
            info!("✅ IMAP XOAUTH2 {}:{} 认证成功", host, port);
            Ok((session, port))
        }
        Err((e, _)) => {
            error!("IMAP XOAUTH2 认证失败 {}:{}: {}", host, port, e);
            Err(match &e {
                imap::Error::No(_) | imap::Error::Bad(_) => {
                    ConnectError::Auth("OAuth2 认证失败，请重新授权".to_string())
                }
                _ => {
                    let s = e.to_string().to_lowercase();
                    if s.contains("auth") || s.contains("credential") || s.contains("login") {
                        ConnectError::Auth("OAuth2 认证失败，请重新授权".to_string())
                    } else {
                        ConnectError::Other(format!("XOAUTH2 认证失败: {}", e))
                    }
                }
            })
        }
    }
}

fn connect_and_xoauth2(
    host: &str,
    port: u16,
    email: &str,
    access_token: &str,
) -> Result<(imap::Session<TlsStream<TcpStream>>, u16), String> {
    let alt_port: u16 = if port == 993 { 143 } else { 993 };
    let ports = [port, alt_port];
    let mut last_error = String::new();

    for &p in &ports {
        match try_connect_and_xoauth2(host, p, email, access_token, false) {
            Ok(r) => return Ok(r),
            Err(ConnectError::Auth(msg)) => return Err(msg),
            Err(ConnectError::Tls(msg)) => {
                warn!("{}", msg);
                match try_connect_and_xoauth2(host, p, email, access_token, true) {
                    Ok(r) => {
                        warn!("⚠️ IMAP XOAUTH2 放宽证书验证连接成功 {}:{}", host, p);
                        return Ok(r);
                    }
                    Err(ConnectError::Auth(msg)) => return Err(msg),
                    Err(e) => {
                        last_error = e.to_string();
                        continue;
                    }
                }
            }
            Err(e) => {
                last_error = e.to_string();
                continue;
            }
        }
    }

    Err(format!(
        "IMAP XOAUTH2 连接失败（已尝试 {}:{} 和 {}:{}）: {}",
        host, port, host, alt_port, last_error
    ))
}

// ── 公开接口 ──────────────────────────────────────────────────

/// IMAP 登录验证
pub async fn verify_login(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
) -> Result<LoginResult, String> {
    info!("尝试 IMAP 登录验证: {} -> {}:{}", email, host, port);

    let email = email.to_string();
    let password = password.to_string();
    let host = host.to_string();

    tokio::task::spawn_blocking(move || imap_login_sync(&email, &password, &host, port))
        .await
        .map_err(|e| format!("任务执行失败: {}", e))?
}

fn imap_login_sync(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
) -> Result<LoginResult, String> {
    match connect_and_login(host, port, email, password) {
        Ok((mut session, actual_port)) => {
            let _ = session.logout();
            Ok(LoginResult {
                success: true,
                message: "登录验证成功".to_string(),
                protocol: Some("imap".to_string()),
                host: Some(host.to_string()),
                port: Some(actual_port),
                smtp_host: None,
                smtp_port: None,
                smtp_verified: false,
                smtp_error: None,
            })
        }
        Err(msg) => Ok(LoginResult {
            success: false,
            message: msg,
            protocol: Some("imap".to_string()),
            host: Some(host.to_string()),
            port: Some(port),
            smtp_host: None,
            smtp_port: None,
            smtp_verified: false,
            smtp_error: None,
        }),
    }
}

/// IMAP 收取邮件
pub async fn fetch_emails(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    info!("开始 IMAP 收取邮件: {} -> {}:{}", email, host, port);

    let email = email.to_string();
    let password = password.to_string();
    let host = host.to_string();

    tokio::task::spawn_blocking(move || {
        imap_fetch_sync(&email, &password, &host, port, limit, fetch_oldest)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

/// IMAP XOAUTH2 收取邮件
pub async fn fetch_emails_oauth2(
    email: &str,
    access_token: &str,
    host: &str,
    port: u16,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    info!("开始 IMAP XOAUTH2 收取邮件: {} -> {}:{}", email, host, port);

    let email = email.to_string();
    let access_token = access_token.to_string();
    let host = host.to_string();

    tokio::task::spawn_blocking(move || {
        imap_fetch_oauth2_sync(&email, &access_token, &host, port, limit, fetch_oldest)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

fn imap_fetch_oauth2_sync(
    email: &str,
    access_token: &str,
    host: &str,
    port: u16,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    let (mut session, _) = connect_and_xoauth2(host, port, email, access_token)?;

    // 选择收件箱
    session
        .select("INBOX")
        .map_err(|e| format!("选择收件箱失败: {}", e))?;

    let search_result = session.uid_search("ALL");
    let uids = if let Err(_) = search_result {
        session.select("INBOX").ok();
        session.uid_search("ALL").map_err(|e| format!("搜索邮件失败: {}", e))?
    } else {
        search_result.unwrap()
    };

    let mut emails: Vec<EmailData> = Vec::new();
    let uids_vec: Vec<u32> = uids.into_iter().collect();
    let total = uids_vec.len();

    let uids_to_fetch: Vec<u32> = if fetch_oldest {
        uids_vec.iter().take(limit).copied().collect()
    } else {
        let start = if total > limit { total - limit } else { 0 };
        uids_vec[start..].to_vec()
    };

    for uid in uids_to_fetch {
        match fetch_single_email(&mut session, uid) {
            Ok(email_data) => emails.push(email_data),
            Err(e) => {
                error!("获取邮件 {} 失败: {}", uid, e);
                continue;
            }
        }
    }

    let _ = session.logout();

    info!("✅ IMAP XOAUTH2 收取完成，共 {} 封邮件", emails.len());
    Ok(FetchResult {
        success: true,
        message: format!("收取成功，共 {} 封邮件", emails.len()),
        count: emails.len(),
        emails,
    })
}

fn imap_fetch_sync(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    let (mut session, _) = connect_and_login(host, port, email, password)?;

    // 选择收件箱
    session
        .select("INBOX")
        .map_err(|e| format!("选择收件箱失败: {}", e))?;

    // 搜索所有邮件（部分服务器如163/189在select后可能踢回AUTH状态，重试一次）
    let search_result = session.uid_search("ALL");
    let uids = if let Err(_) = search_result {
        // 状态异常，重新 SELECT 再试
        session.select("INBOX").ok();
        session.uid_search("ALL").map_err(|e| format!("搜索邮件失败: {}", e))?
    } else {
        search_result.unwrap()
    };

    let mut emails: Vec<EmailData> = Vec::new();
    let uids_vec: Vec<u32> = uids.into_iter().collect();
    let total = uids_vec.len();

    let uids_to_fetch: Vec<u32> = if fetch_oldest {
        // 历史回补：优先抓最早的邮件，便于补齐老历史
        uids_vec.iter().take(limit).copied().collect()
    } else {
        // 增量同步：优先抓最新邮件
        let start = if total > limit { total - limit } else { 0 };
        uids_vec[start..].to_vec()
    };

    for uid in uids_to_fetch {
        match fetch_single_email(&mut session, uid) {
            Ok(email_data) => emails.push(email_data),
            Err(e) => {
                error!("获取邮件 {} 失败: {}", uid, e);
                continue;
            }
        }
    }

    let _ = session.logout();

    info!("✅ IMAP 收取完成，共 {} 封邮件", emails.len());
    Ok(FetchResult {
        success: true,
        message: format!("收取成功，共 {} 封邮件", emails.len()),
        count: emails.len(),
        emails,
    })
}

// ── 邮件解析（未修改）─────────────────────────────────────────

fn fetch_single_email<T: Read + Write>(
    session: &mut imap::Session<T>,
    uid: u32,
) -> Result<EmailData, String> {
    let uid_set = format!("{}", uid);
    let messages = session
        .uid_fetch(&uid_set, "RFC822")
        .map_err(|e| format!("获取邮件失败: {}", e))?;

    let message = messages
        .iter()
        .next()
        .ok_or("没有获取到邮件数据")?;

    let body = message.body().ok_or("邮件内容为空")?;

    // 解析邮件
    let parsed = mailparse::parse_mail(body)
        .map_err(|e| format!("解析邮件失败: {}", e))?;

    let subject = parsed
        .headers
        .iter()
        .find(|h| h.get_key_ref() == "Subject")
        .map(|h| h.get_value())
        .unwrap_or_else(|| "(无主题)".to_string());

    let from_addr = parsed
        .headers
        .iter()
        .find(|h| h.get_key_ref() == "From")
        .map(|h| h.get_value())
        .unwrap_or_default();

    let to_addr = parsed
        .headers
        .iter()
        .find(|h| h.get_key_ref() == "To")
        .map(|h| h.get_value())
        .unwrap_or_default();

    let message_id = parsed
        .headers
        .iter()
        .find(|h| h.get_key_ref() == "Message-ID")
        .map(|h| h.get_value())
        .unwrap_or_else(|| format!("<imap-{}@local>", uid));

    let (content_text, content_html, attachments) = extract_content(&parsed);

    let now = Utc::now().timestamp_millis();

    Ok(EmailData {
        message_id,
        subject,
        from_addr,
        to_addr,
        content_text,
        content_html,
        email_date_ms: now,
        received_at_ms: now,
        attachments,
    })
}

fn extract_content(mail: &mailparse::ParsedMail) -> (String, String, Vec<AttachmentData>) {
    let mut content_text = String::new();
    let mut content_html = String::new();
    let mut attachments = Vec::new();

    if mail.subparts.is_empty() {
        let content_type = mail.ctype.mimetype.as_str();
        let disposition = mail
            .headers
            .iter()
            .find(|h| h.get_key_ref().eq_ignore_ascii_case("Content-Disposition"))
            .map(|h| h.get_value())
            .unwrap_or_default();

        let disposition_lower = disposition.to_lowercase();
        let content_id = mail
            .headers
            .iter()
            .find(|h| h.get_key_ref().eq_ignore_ascii_case("Content-ID"))
            .map(|h| h.get_value())
            .unwrap_or_default();

        // 判断是否是附件：
        // 1. Content-Disposition 明确为 attachment → 是附件
        // 2. 非 text/multipart 但 Content-Disposition 为 inline 或有 Content-ID → 内嵌资源，不是附件
        // 3. 非 text/multipart 且无 inline/Content-ID → 当作附件
        let is_attachment = if disposition_lower.contains("attachment") {
            true
        } else if !content_type.starts_with("text/") && !content_type.starts_with("multipart/") {
            !disposition_lower.contains("inline") && content_id.is_empty()
        } else {
            false
        };

        if is_attachment {
            // 这是附件
            if let Ok(body_raw) = mail.get_body_raw() {
                if !body_raw.is_empty() && body_raw.len() <= 25 * 1024 * 1024 {
                    let filename = mail
                        .ctype
                        .params
                        .get("name")
                        .cloned()
                        .or_else(|| {
                            // 从 Content-Disposition 提取 filename
                            disposition
                                .split(';')
                                .find_map(|part| {
                                    let part = part.trim();
                                    if part.to_lowercase().starts_with("filename=") {
                                        Some(part[9..].trim_matches('"').to_string())
                                    } else {
                                        None
                                    }
                                })
                        })
                        .unwrap_or_else(|| "attachment".to_string());

                    attachments.push(AttachmentData {
                        filename,
                        content_type: content_type.to_string(),
                        size: body_raw.len(),
                        data: body_raw,
                    });
                }
            }
        } else if let Ok(body) = mail.get_body() {
            if content_type.contains("text/plain") {
                content_text = body;
            } else if content_type.contains("text/html") {
                content_html = body;
            }
        }
    } else {
        for part in &mail.subparts {
            let (text, html, atts) = extract_content(part);
            if !text.is_empty() {
                content_text = text;
            }
            if !html.is_empty() {
                content_html = html;
            }
            attachments.extend(atts);
        }
    }

    (content_text, content_html, attachments)
}

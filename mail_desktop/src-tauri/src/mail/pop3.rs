use crate::mail::types::{AttachmentData, EmailData, FetchResult, LoginResult};
use chrono::Utc;
use log::{error, info, warn};
use native_tls::TlsStream;
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const TCP_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const IO_TIMEOUT: Duration = Duration::from_secs(30);

fn find_header_value_ci(parsed: &mailparse::ParsedMail, key: &str) -> Option<String> {
    parsed
        .headers
        .iter()
        .find(|h| h.get_key_ref().eq_ignore_ascii_case(key))
        .map(|h| h.get_value())
}

// ── 连接错误分类 ──────────────────────────────────────────────

enum ConnectError {
    Connection(String),
    Tls(String),
    Auth(String),
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

// ── 连接辅助 ──────────────────────────────────────────────────

/// 单次尝试：建立 POP3 TLS 连接（隐式 TLS 或 STLS），读完问候后返回
fn try_pop3_connect(
    host: &str,
    port: u16,
    accept_invalid_certs: bool,
) -> Result<(TlsStream<TcpStream>, u16), ConnectError> {
    let use_stls = port != 995;
    info!(
        "尝试 POP3 {}:{} ({}{})",
        host,
        port,
        if use_stls { "STLS" } else { "隐式TLS" },
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

    let mut tcp = TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT)
        .map_err(|e| {
            ConnectError::Connection(format!("TCP 连接失败 {}:{} - {}", host, port, e))
        })?;

    tcp.set_read_timeout(Some(IO_TIMEOUT)).ok();
    tcp.set_write_timeout(Some(IO_TIMEOUT)).ok();

    if use_stls {
        // 明文连接 → 读问候 → STLS → TLS 升级
        let greeting = read_line(&mut tcp)
            .map_err(|e| ConnectError::Connection(format!("读取问候失败: {}", e)))?;
        if !greeting.starts_with("+OK") {
            return Err(ConnectError::Other(format!(
                "服务器响应错误: {}",
                greeting.trim()
            )));
        }

        tcp.write_all(b"STLS\r\n")
            .map_err(|e| ConnectError::Connection(format!("发送 STLS 失败: {}", e)))?;
        let response = read_line(&mut tcp)
            .map_err(|e| ConnectError::Connection(format!("读取 STLS 响应失败: {}", e)))?;
        if !response.starts_with("+OK") {
            return Err(ConnectError::Other(format!(
                "服务器不支持 STLS: {}",
                response.trim()
            )));
        }

        let tls = connector
            .connect(host, tcp)
            .map_err(|e| ConnectError::Tls(format!("STLS TLS 握手失败: {}", e)))?;
        Ok((tls, port))
    } else {
        // 隐式 TLS（995）
        let mut tls = connector
            .connect(host, tcp)
            .map_err(|e| ConnectError::Tls(format!("TLS 握手失败: {}", e)))?;

        let greeting = read_line(&mut tls)
            .map_err(|e| ConnectError::Connection(format!("读取问候失败: {}", e)))?;
        if !greeting.starts_with("+OK") {
            return Err(ConnectError::Other(format!(
                "服务器响应错误: {}",
                greeting.trim()
            )));
        }

        Ok((tls, port))
    }
}

/// POP3 登录（在已连接的 TLS 流上发送 USER / PASS）
fn pop3_do_login(
    tls: &mut TlsStream<TcpStream>,
    email: &str,
    password: &str,
) -> Result<(), ConnectError> {
    // USER
    tls.write_all(format!("USER {}\r\n", email).as_bytes())
        .map_err(|e| ConnectError::Connection(format!("发送 USER 失败: {}", e)))?;
    let response = read_line(tls)
        .map_err(|e| ConnectError::Connection(format!("读取 USER 响应失败: {}", e)))?;
    if !response.starts_with("+OK") {
        return Err(ConnectError::Auth("用户名错误".to_string()));
    }

    // PASS
    tls.write_all(format!("PASS {}\r\n", password).as_bytes())
        .map_err(|e| ConnectError::Connection(format!("发送 PASS 失败: {}", e)))?;
    let response = read_line(tls)
        .map_err(|e| ConnectError::Connection(format!("读取 PASS 响应失败: {}", e)))?;
    if !response.starts_with("+OK") {
        return Err(ConnectError::Auth(
            "邮箱或授权码错误，请检查后重试".to_string(),
        ));
    }

    Ok(())
}

/// 多策略连接并登录：主端口 → 放宽证书 → 备用端口 → 放宽证书
fn connect_and_login(
    host: &str,
    port: u16,
    email: &str,
    password: &str,
) -> Result<(TlsStream<TcpStream>, u16), String> {
    let alt_port: u16 = if port == 995 { 110 } else { 995 };
    let ports = [port, alt_port];
    let mut last_error = String::new();

    for &p in &ports {
        match try_pop3_connect(host, p, false) {
            Ok((mut tls, actual_port)) => {
                match pop3_do_login(&mut tls, email, password) {
                    Ok(()) => {
                        info!("✅ POP3 {}:{} 登录成功", host, actual_port);
                        return Ok((tls, actual_port));
                    }
                    Err(ConnectError::Auth(msg)) => return Err(msg),
                    Err(e) => {
                        last_error = e.to_string();
                        continue;
                    }
                }
            }
            Err(ConnectError::Tls(msg)) => {
                warn!("{}", msg);
                // TLS 握手失败 → 放宽证书再试
                match try_pop3_connect(host, p, true) {
                    Ok((mut tls, actual_port)) => {
                        match pop3_do_login(&mut tls, email, password) {
                            Ok(()) => {
                                warn!(
                                    "⚠️ POP3 放宽证书验证连接成功 {}:{}",
                                    host, actual_port
                                );
                                return Ok((tls, actual_port));
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
            Err(ConnectError::Auth(msg)) => return Err(msg),
            Err(e) => {
                last_error = e.to_string();
                continue;
            }
        }
    }

    Err(format!(
        "POP3 连接失败（已尝试 {}:{} 和 {}:{}）: {}",
        host, port, host, alt_port, last_error
    ))
}

// ── 公开接口 ──────────────────────────────────────────────────

/// POP3 登录验证
pub async fn verify_login(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
) -> Result<LoginResult, String> {
    info!("尝试 POP3 登录验证: {} -> {}:{}", email, host, port);

    let email = email.to_string();
    let password = password.to_string();
    let host = host.to_string();

    let result = tokio::task::spawn_blocking(move || {
        pop3_login_sync(&email, &password, &host, port)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?;

    result
}

fn pop3_login_sync(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
) -> Result<LoginResult, String> {
    match connect_and_login(host, port, email, password) {
        Ok((mut tls, actual_port)) => {
            let _ = tls.write_all(b"QUIT\r\n");
            Ok(LoginResult {
                success: true,
                message: "登录验证成功".to_string(),
                protocol: Some("pop3".to_string()),
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
            protocol: Some("pop3".to_string()),
            host: Some(host.to_string()),
            port: Some(port),
            smtp_host: None,
            smtp_port: None,
            smtp_verified: false,
            smtp_error: None,
        }),
    }
}

/// POP3 收取邮件
pub async fn fetch_emails(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    info!("开始 POP3 收取邮件: {} -> {}:{}", email, host, port);

    let email = email.to_string();
    let password = password.to_string();
    let host = host.to_string();

    let result = tokio::task::spawn_blocking(move || {
        pop3_fetch_sync(&email, &password, &host, port, limit, fetch_oldest)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?;

    result
}

fn pop3_fetch_sync(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
    limit: usize,
    fetch_oldest: bool,
) -> Result<FetchResult, String> {
    let (mut tls, _) = connect_and_login(host, port, email, password)?;

    // 获取邮件数量
    tls.write_all(b"STAT\r\n")
        .map_err(|e| format!("发送失败: {}", e))?;
    let response = read_line(&mut tls)?;

    let parts: Vec<&str> = response.split_whitespace().collect();
    let total: usize = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);

    let mut emails: Vec<EmailData> = Vec::new();
    let (start, end) = if total == 0 {
        (1, 0)
    } else if fetch_oldest {
        // 历史回补：优先抓最早的邮件
        (1, std::cmp::min(total, limit))
    } else if total > limit {
        // 增量同步：抓最新邮件
        (total - limit + 1, total)
    } else {
        (1, total)
    };

    for i in start..=end {
        match fetch_single_pop3(&mut tls, i) {
            Ok(email_data) => emails.push(email_data),
            Err(e) => {
                error!("获取邮件 {} 失败: {}", i, e);
                continue;
            }
        }
    }

    let _ = tls.write_all(b"QUIT\r\n");

    info!("✅ POP3 收取完成，共 {} 封邮件", emails.len());
    Ok(FetchResult {
        success: true,
        message: format!("收取成功，共 {} 封邮件", emails.len()),
        count: emails.len(),
        emails,
    })
}

// ── IO 辅助 ───────────────────────────────────────────────────

/// 从流中读取一行（直到 \r\n）
fn read_line<R: Read>(stream: &mut R) -> Result<String, String> {
    let mut buf = Vec::new();
    let mut byte = [0u8; 1];

    loop {
        match stream.read(&mut byte) {
            Ok(0) => break,
            Ok(_) => {
                buf.push(byte[0]);
                if buf.ends_with(b"\r\n") {
                    break;
                }
            }
            Err(e) => return Err(format!("读取失败: {}", e)),
        }
    }

    String::from_utf8(buf).map_err(|e| format!("UTF-8 解码失败: {}", e))
}

/// 读取多行响应直到遇到单独的 '.'
fn read_multiline<R: Read>(stream: &mut R) -> Result<Vec<u8>, String> {
    let mut content = Vec::new();

    loop {
        let line = read_line(stream)?;

        if line.trim() == "." {
            break;
        }

        // 处理字节填充（以 .. 开头的行）
        if line.starts_with("..") {
            content.extend(line[1..].as_bytes());
        } else {
            content.extend(line.as_bytes());
        }
    }

    Ok(content)
}

fn read_uidl_for_message<S: Read + Write>(stream: &mut S, msg_num: usize) -> Option<String> {
    let command = format!("UIDL {}\r\n", msg_num);
    if stream.write_all(command.as_bytes()).is_err() {
        return None;
    }

    let response = read_line(stream).ok()?;
    if !response.starts_with("+OK") {
        return None;
    }

    response
        .split_whitespace()
        .last()
        .map(str::trim)
        .filter(|value| !value.is_empty() && *value != "+OK")
        .map(|value| value.to_string())
}

// ── 邮件解析（未修改）─────────────────────────────────────────

fn fetch_single_pop3<S: Read + Write>(
    stream: &mut S,
    msg_num: usize,
) -> Result<EmailData, String> {
    let uidl = read_uidl_for_message(stream, msg_num);

    // 发送 RETR 命令
    stream
        .write_all(format!("RETR {}\r\n", msg_num).as_bytes())
        .map_err(|e| format!("发送失败: {}", e))?;

    let response = read_line(stream)?;

    if !response.starts_with("+OK") {
        return Err(format!("获取邮件失败: {}", response));
    }

    // 读取邮件内容直到遇到单独的 '.'
    let mail_content = read_multiline(stream)?;

    // 解析邮件
    let parsed = mailparse::parse_mail(&mail_content)
        .map_err(|e| format!("解析邮件失败: {}", e))?;

    let subject = find_header_value_ci(&parsed, "Subject").unwrap_or_else(|| "(无主题)".to_string());

    let from_addr = find_header_value_ci(&parsed, "From").unwrap_or_default();

    let to_addr = find_header_value_ci(&parsed, "To").unwrap_or_default();

    let message_id = find_header_value_ci(&parsed, "Message-ID")
        .or(uidl.map(|value| format!("pop3-uidl:{}", value)))
        .unwrap_or_else(|| format!("<pop3-{}@local>", msg_num));

    let (content_text, content_html, attachments) = extract_content(&parsed);

    let now = Utc::now().timestamp_millis();
    let email_time_ms = parse_email_timestamp_ms(&parsed, now);

    Ok(EmailData {
        message_id,
        subject,
        from_addr,
        to_addr,
        content_text,
        content_html,
        email_date_ms: email_time_ms,
        received_at_ms: email_time_ms,
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

fn parse_email_timestamp_ms(parsed: &mailparse::ParsedMail, fallback_ms: i64) -> i64 {
    let raw_date = parsed
        .headers
        .iter()
        .find(|h| h.get_key_ref().eq_ignore_ascii_case("Date"))
        .map(|h| h.get_value())
        .unwrap_or_default();

    chrono::DateTime::parse_from_rfc2822(raw_date.trim())
        .map(|dt| dt.timestamp_millis())
        .or_else(|_| chrono::DateTime::parse_from_rfc3339(raw_date.trim()).map(|dt| dt.timestamp_millis()))
        .unwrap_or(fallback_ms)
}

/// POP3 按 message_id 下载指定附件
pub async fn download_attachment(
    email: &str,
    password: &str,
    host: &str,
    port: u16,
    message_id: &str,
    filename: &str,
    save_path: &str,
    fallback_subject: Option<&str>,
    fallback_from_addr: Option<&str>,
    fallback_to_addr: Option<&str>,
    fallback_email_date_ms: Option<i64>,
) -> Result<(), String> {
    let email = email.to_string();
    let password = password.to_string();
    let host = host.to_string();
    let message_id = message_id.to_string();
    let filename = filename.to_string();
    let save_path = save_path.to_string();
    let fallback_subject = fallback_subject.map(|value| value.to_string());
    let fallback_from_addr = fallback_from_addr.map(|value| value.to_string());
    let fallback_to_addr = fallback_to_addr.map(|value| value.to_string());

    tokio::task::spawn_blocking(move || {
        let (mut tls, _) = connect_and_login(&host, port, &email, &password)?;

        // 获取邮件数量
        tls.write_all(b"STAT\r\n").map_err(|e| format!("发送失败: {}", e))?;
        let response = read_line(&mut tls)?;
        let parts: Vec<&str> = response.split_whitespace().collect();
        let total: usize = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);

        let expected_uidl = message_id.strip_prefix("pop3-uidl:").map(|value| value.to_string());

        // 从最新往前遍历全部邮件，找到 message_id 匹配的邮件
        for i in (1..=total).rev() {
            if let Some(expected) = expected_uidl.as_ref() {
                let current_uidl = read_uidl_for_message(&mut tls, i);
                if current_uidl.as_deref() != Some(expected.as_str()) {
                    continue;
                }

                let retr_cmd = format!("RETR {}\r\n", i);
                tls.write_all(retr_cmd.as_bytes()).map_err(|e| format!("发送失败: {}", e))?;
                let retr_first = read_line(&mut tls)?;
                if !retr_first.starts_with("+OK") {
                    return Err("获取邮件失败".to_string());
                }
                let raw = read_multiline(&mut tls)?;
                let parsed = mailparse::parse_mail(&raw).map_err(|e| format!("解析邮件失败: {}", e))?;
                let (_, _, attachments) = extract_content(&parsed);

                let att = attachments
                    .iter()
                    .find(|a| a.filename == filename)
                    .ok_or_else(|| format!("附件 {} 未找到", filename))?;

                if att.data.is_empty() {
                    return Err(format!("附件 {} 数据为空", filename));
                }

                std::fs::write(&save_path, &att.data).map_err(|e| format!("写入文件失败: {}", e))?;
                let _ = tls.write_all(b"QUIT\r\n");
                info!("✅ POP3 附件下载成功(UIDL): {} -> {}", filename, save_path);
                return Ok(());
            }

            // 用 TOP 取头部
            let top_cmd = format!("TOP {} 0\r\n", i);
            tls.write_all(top_cmd.as_bytes()).map_err(|e| format!("发送失败: {}", e))?;
            let first_line = read_line(&mut tls)?;
            if !first_line.starts_with("+OK") {
                continue;
            }
            let header_data = read_multiline(&mut tls)?;
            let header_str = String::from_utf8_lossy(&header_data);
            if !header_str.contains(&message_id) {
                continue;
            }

            // 匹配到，用 RETR 取完整邮件
            let retr_cmd = format!("RETR {}\r\n", i);
            tls.write_all(retr_cmd.as_bytes()).map_err(|e| format!("发送失败: {}", e))?;
            let retr_first = read_line(&mut tls)?;
            if !retr_first.starts_with("+OK") {
                return Err("获取邮件失败".to_string());
            }
            let raw = read_multiline(&mut tls)?;
            let parsed = mailparse::parse_mail(&raw).map_err(|e| format!("解析邮件失败: {}", e))?;
            let (_, _, attachments) = extract_content(&parsed);

            let att = attachments
                .iter()
                .find(|a| a.filename == filename)
                .ok_or_else(|| format!("附件 {} 未找到", filename))?;

            if att.data.is_empty() {
                return Err(format!("附件 {} 数据为空", filename));
            }

            std::fs::write(&save_path, &att.data).map_err(|e| format!("写入文件失败: {}", e))?;
            let _ = tls.write_all(b"QUIT\r\n");
            info!("✅ POP3 附件下载成功: {} -> {}", filename, save_path);
            return Ok(());
        }

        // 老数据可能是本地伪造 message_id，这里退回按主题/发件人/时间匹配
        if message_id.starts_with("<pop3-") {
            info!("POP3 附件下载进入元数据兜底匹配: {}", message_id);
            for i in (1..=total).rev() {
                let retr_cmd = format!("RETR {}\r\n", i);
                tls.write_all(retr_cmd.as_bytes()).map_err(|e| format!("发送失败: {}", e))?;
                let retr_first = read_line(&mut tls)?;
                if !retr_first.starts_with("+OK") {
                    continue;
                }
                let raw = read_multiline(&mut tls)?;
                let parsed = match mailparse::parse_mail(&raw) {
                    Ok(parsed) => parsed,
                    Err(_) => continue,
                };

                if !matches_fallback_email_metadata(
                    &parsed,
                    fallback_subject.as_deref(),
                    fallback_from_addr.as_deref(),
                    fallback_to_addr.as_deref(),
                    fallback_email_date_ms,
                ) {
                    continue;
                }

                let (_, _, attachments) = extract_content(&parsed);
                let att = attachments
                    .iter()
                    .find(|a| a.filename == filename)
                    .ok_or_else(|| format!("附件 {} 未找到", filename))?;

                if att.data.is_empty() {
                    return Err(format!("附件 {} 数据为空", filename));
                }

                std::fs::write(&save_path, &att.data).map_err(|e| format!("写入文件失败: {}", e))?;
                let _ = tls.write_all(b"QUIT\r\n");
                info!("✅ POP3 附件下载成功(元数据兜底): {} -> {}", filename, save_path);
                return Ok(());
            }
        }

        let _ = tls.write_all(b"QUIT\r\n");
        Err("邮件在服务器上未找到".to_string())
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?
}

fn normalize_mail_header(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_ascii_lowercase()
}

fn matches_fallback_email_metadata(
    parsed: &mailparse::ParsedMail,
    fallback_subject: Option<&str>,
    fallback_from_addr: Option<&str>,
    fallback_to_addr: Option<&str>,
    fallback_email_date_ms: Option<i64>,
) -> bool {
    let subject = find_header_value_ci(parsed, "Subject").unwrap_or_default();
    let from_addr = find_header_value_ci(parsed, "From").unwrap_or_default();
    let to_addr = find_header_value_ci(parsed, "To").unwrap_or_default();

    if let Some(expected_subject) = fallback_subject {
        if normalize_mail_header(&subject) != normalize_mail_header(expected_subject) {
            return false;
        }
    }

    if let Some(expected_from_addr) = fallback_from_addr {
        if normalize_mail_header(&from_addr) != normalize_mail_header(expected_from_addr) {
            return false;
        }
    }

    if let Some(expected_to_addr) = fallback_to_addr {
        if normalize_mail_header(&to_addr) != normalize_mail_header(expected_to_addr) {
            return false;
        }
    }

    if let Some(expected_email_date_ms) = fallback_email_date_ms.filter(|value| *value > 0) {
        let actual_email_date_ms = parse_email_timestamp_ms(parsed, expected_email_date_ms);
        if (actual_email_date_ms - expected_email_date_ms).abs() > 24 * 60 * 60 * 1000 {
            return false;
        }
    }

    true
}

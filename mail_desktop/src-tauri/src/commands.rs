use crate::mail;
use crate::mail::types::{get_server_config, EmailData, FetchResult, LoginResult};
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri_plugin_updater::UpdaterExt;

/// 添加外部邮箱请求
#[derive(Debug, Deserialize)]
pub struct AddExternalMailboxRequest {
    pub email: String,
    pub password: String,
    pub protocol: String, // "imap" 或 "pop3"
    pub host: Option<String>,
    pub port: Option<u16>,
}

/// 收取邮件请求
#[derive(Debug, Deserialize)]
pub struct FetchEmailsRequest {
    pub mailbox_id: i64,
    pub email: String,
    pub password: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub token: String, // 用于同步到远程服务器
}

/// 同步邮件请求（发送到远程服务器）
#[derive(Debug, Serialize)]
pub struct SyncEmailsRequest {
    pub mailbox_id: i64,
    pub emails: Vec<EmailData>,
}

/// API 响应
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendEmailAttachment {
    pub name: String,
    pub size: usize,
    pub content_type: String,
    pub data_base64: String,
}

/// 添加外部邮箱（验证登录）
/// 前端调用：invoke('add_external_mailbox', { email, password, protocol, host?, port? })
/// protocol: "imap" | "pop3" | "auto"（自动检测，先试IMAP再试POP3）
#[tauri::command]
pub async fn add_external_mailbox(
    email: String,
    password: String,
    protocol: String,
    host: Option<String>,
    port: Option<u16>,
) -> Result<LoginResult, String> {
    info!("收到添加外部邮箱请求: {} ({})", email, protocol);

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
            mail::imap::verify_login(&email, &password, &h, p).await?
        } else {
            mail::pop3::verify_login(&email, &password, &h, p).await?
        };
        if result.success {
            try_smtp_verify(&mut result, &email, &password, domain).await;
        }
        return Ok(result);
    }

    // 自动检测服务器配置
    let config = get_server_config(domain).await
        .ok_or(format!("无法识别邮箱 {} 的服务器配置，请手动填写服务器地址", domain))?;

    if proto == "auto" {
        // 自动模式：先试 IMAP，失败再试 POP3
        info!("自动检测协议：先尝试 IMAP {}:{}", config.imap_host, config.imap_port);
        let mut imap_result = mail::imap::verify_login(&email, &password, &config.imap_host, config.imap_port).await?;
        if imap_result.success {
            try_smtp_verify(&mut imap_result, &email, &password, domain).await;
            return Ok(imap_result);
        }

        info!("IMAP 登录失败({}), 尝试 POP3 {}:{}", imap_result.message, config.pop3_host, config.pop3_port);
        let mut pop3_result = mail::pop3::verify_login(&email, &password, &config.pop3_host, config.pop3_port).await?;
        if pop3_result.success {
            try_smtp_verify(&mut pop3_result, &email, &password, domain).await;
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
        let mut result = mail::imap::verify_login(&email, &password, &config.imap_host, config.imap_port).await?;
        if result.success {
            try_smtp_verify(&mut result, &email, &password, domain).await;
        }
        Ok(result)
    } else {
        let mut result = mail::pop3::verify_login(&email, &password, &config.pop3_host, config.pop3_port).await?;
        if result.success {
            try_smtp_verify(&mut result, &email, &password, domain).await;
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
async fn try_smtp_verify(result: &mut LoginResult, email: &str, password: &str, domain: &str) {
    use lettre::{
        transport::smtp::{authentication::Credentials, client::TlsParameters},
        AsyncSmtpTransport, Tokio1Executor,
    };

    info!("尝试 SMTP 验证: {}", email);

    let candidates = match get_smtp_candidates(domain).await {
        Ok(c) => c,
        Err(e) => {
            info!("SMTP 候选列表获取失败: {}", e);
            result.smtp_verified = false;
            result.smtp_error = Some(format!("无法获取 SMTP 候选列表: {}", e));
            return;
        }
    };

    let mut last_error = String::from("无候选服务器");

    for (smtp_host, smtp_port) in &candidates {
        info!("尝试 SMTP: {}:{}", smtp_host, smtp_port);

        let creds = Credentials::new(email.to_string(), password.to_string());

        let connect_result = if *smtp_port == 465 {
            let tls = match TlsParameters::new(smtp_host.clone()) {
                Ok(t) => t,
                Err(e) => {
                    last_error = format!("TLS 参数错误: {}", e);
                    continue;
                }
            };
            AsyncSmtpTransport::<Tokio1Executor>::relay(smtp_host)
                .map(|b| {
                    b.port(*smtp_port)
                        .tls(lettre::transport::smtp::client::Tls::Wrapper(tls))
                        .credentials(creds)
                        .build::<Tokio1Executor>()
                })
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(smtp_host)
                .map(|b| {
                    b.port(*smtp_port)
                        .credentials(creds)
                        .build::<Tokio1Executor>()
                })
        };

        match connect_result {
            Ok(mailer) => match mailer.test_connection().await {
                Ok(true) => {
                    info!("SMTP 验证成功: {}:{}", smtp_host, smtp_port);
                    result.smtp_host = Some(smtp_host.clone());
                    result.smtp_port = Some(*smtp_port);
                    result.smtp_verified = true;
                    result.smtp_error = None;
                    return;
                }
                Ok(false) => {
                    last_error = format!("{}:{} 认证失败", smtp_host, smtp_port);
                    info!("{}", last_error);
                }
                Err(e) => {
                    last_error = format!("{}:{} 连接出错: {}", smtp_host, smtp_port, e);
                    info!("{}", last_error);
                }
            },
            Err(e) => {
                last_error = format!("{}:{} 构建失败: {}", smtp_host, smtp_port, e);
                info!("{}", last_error);
            }
        }
    }

    result.smtp_verified = false;
    result.smtp_error = Some(format!("所有 SMTP 候选均失败，最后错误: {}", last_error));
}

/// 收取邮件
/// 前端调用：invoke('fetch_emails', { mailboxId, email, password, protocol, host?, port?, token, serverUrl })
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
) -> Result<FetchResult, String> {
    // 自动检测服务器配置（当 host/port 缺失时）
    let (final_host, final_port, final_protocol) = if let (Some(h), Some(p)) = (host.as_deref().filter(|s| !s.is_empty()), port) {
        (h.to_string(), p, protocol.clone())
    } else {
        let domain = email.split('@').nth(1).ok_or("无效的邮箱地址")?;
        let config = get_server_config(domain).await
            .ok_or(format!("无法识别邮箱 {} 的服务器配置", domain))?;

        if protocol.to_lowercase() == "imap" || protocol.to_lowercase() == "auto" {
            (config.imap_host, config.imap_port, "imap".to_string())
        } else {
            (config.pop3_host, config.pop3_port, "pop3".to_string())
        }
    };

    info!("收到收取邮件请求: {} ({}) -> {}:{}", email, final_protocol, final_host, final_port);
    info!("密码长度: {}, token长度: {}, serverUrl: {}", password.len(), token.len(), server_url);

    // 本地收取邮件
    let result = if final_protocol.to_lowercase() == "imap" {
        match mail::imap::fetch_emails(&email, &password, &final_host, final_port, 50).await {
            Ok(r) => r,
            Err(e) => {
                error!("IMAP 收取失败: {}", e);
                return Err(e);
            }
        }
    } else {
        match mail::pop3::fetch_emails(&email, &password, &final_host, final_port, 50).await {
            Ok(r) => r,
            Err(e) => {
                error!("POP3 收取失败: {}", e);
                return Err(e);
            }
        }
    };

    if result.success && !result.emails.is_empty() {
        // 保存附件到本地
        save_attachments_locally(&result.emails);

        // 同步到远程服务器（附件 data 字段会被 serde(skip) 跳过，只发元数据）
        match sync_emails_to_server(&server_url, &token, mailbox_id, &result.emails).await {
            Ok(new_count) => {
                // 用后端去重后的实际新增数替换总数
                return Ok(FetchResult {
                    success: true,
                    message: format!("收取成功，新增 {} 封邮件", new_count),
                    emails: result.emails,
                    count: new_count,
                });
            }
            Err(e) => {
                error!("同步邮件到服务器失败: {}", e);
                // 同步失败仍返回收取结果
            }
        }
    }

    Ok(result)
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
        "darwin"
    } else if cfg!(target_os = "windows") {
        "windows"
    } else {
        "linux"
    };

    let arch = if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x86_64"
    };

    let url = format!(
        "https://zjkdongao.cn/desktop-updates/{}-{}/latest",
        target, arch
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

    info!("保底更新：通过 UpdaterExt 触发下载安装");

    let updater = app.updater()
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

/// 通过本地 SMTP 发送邮件（桌面端专用，使用用户本机 IP）
/// 前端调用：invoke('send_smtp_email', { fromEmail, password, smtpHost, smtpPort, toEmail, subject, content })
#[tauri::command]
pub async fn send_smtp_email(
    from_email: String,
    password: String,
    smtp_host: String,
    smtp_port: u16,
    to_email: String,
    subject: String,
    content: String,
    attachments: Option<Vec<SendEmailAttachment>>,
) -> Result<(), String> {
    use lettre::{
        message::{header::ContentType, Attachment, MultiPart, SinglePart},
        transport::smtp::{authentication::Credentials, client::TlsParameters},
        AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    };
    use log::warn;
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    info!("📧 准备本地 SMTP 发送: {} -> {}. 传入配置: {}:{}", from_email, to_email, smtp_host, smtp_port);

    // 如果 smtp_host 未知或为空，尝试自动探测
    let (final_host, final_port) = if smtp_host.is_empty() {
        let domain = from_email.split('@').nth(1).unwrap_or("");
        match auto_discover_smtp(domain).await {
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

    // 构建邮件
    let message_builder = Message::builder()
        .from(from_email.parse().map_err(|e| format!("发件人地址无效: {}", e))?)
        .to(to_email.parse().map_err(|e| format!("收件人地址无效: {}", e))?)
        .subject(&subject);

    let email = if let Some(attachments) = attachments.filter(|items| !items.is_empty()) {
        let mut multipart = MultiPart::mixed().singlepart(
            SinglePart::builder()
                .header(ContentType::TEXT_PLAIN)
                .body(content.clone())
        );

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
            .header(ContentType::TEXT_PLAIN)
            .body(content)
            .map_err(|e| format!("构建邮件失败: {}", e))?
    };

    let creds = Credentials::new(from_email.clone(), password);

    // 根据端口选择 SSL 还是 STARTTLS
    let mailer = if final_port == 465 {
        // SSL
        let tls = TlsParameters::new(final_host.clone())
            .map_err(|e| format!("TLS 参数错误: {}", e))?;
        AsyncSmtpTransport::<Tokio1Executor>::relay(&final_host)
            .map_err(|e| format!("连接 SMTP 服务器失败: {}", e))?
            .port(final_port)
            .tls(lettre::transport::smtp::client::Tls::Wrapper(tls))
            .credentials(creds)
            .build::<Tokio1Executor>()
    } else {
        // STARTTLS (587 等)
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&final_host)
            .map_err(|e| format!("连接 SMTP 服务器失败: {}", e))?
            .port(final_port)
            .credentials(creds)
            .build::<Tokio1Executor>()
    };

    mailer.send(email).await
        .map_err(|e| format!("发送失败: {}", e))?;

    info!("✅ 本地 SMTP 发送成功: {} -> {}", from_email, to_email);
    Ok(())
}

/// 从完整主机名提取根域名（最后两个标签），例如：
///   qiye163mx01.mxmail.netease.com  →  netease.com
///   mxbiz1.qq.com                   →  qq.com
fn extract_root_domain(host: &str) -> String {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 {
        parts[parts.len() - 2..].join(".")
    } else {
        host.to_string()
    }
}

/// 根据域名查询 MX 记录，返回候选 SMTP 列表（不探测，由调用方逐一尝试）
/// 已知消费者 / 企业邮箱的 SMTP 服务器（直接返回，无需 DNS）
fn get_known_smtp(domain: &str) -> Option<Vec<(String, u16)>> {
    let s = |h: &'static str, p: u16| Some(vec![(h.to_string(), p)]);
    match domain {
        // 腾讯系
        "qq.com" | "foxmail.com"
            => s("smtp.qq.com", 465),
        // 网易系
        "163.com" | "vip.163.com"
            => s("smtp.163.com", 465),
        "126.com" | "vip.126.com"
            => s("smtp.126.com", 465),
        "yeah.net"
            => s("smtp.yeah.net", 465),
        // 谷歌
        "gmail.com" | "googlemail.com"
            => s("smtp.gmail.com", 465),
        // 微软系
        "outlook.com" | "hotmail.com" | "live.com" | "live.cn" | "msn.com"
            => Some(vec![("smtp.office365.com".to_string(), 587)]),
        // 阿里云
        "aliyun.com"
            => s("smtp.aliyun.com", 465),
        // 新浪
        "sina.com" | "sina.cn" | "vip.sina.com"
            => s("smtp.sina.com", 465),
        // 搜狐
        "sohu.com"
            => s("smtp.sohu.com", 465),
        // 中国电信 189
        "189.cn"
            => s("smtp.189.cn", 465),
        // 中国移动 139
        "139.com"
            => s("smtp.139.com", 465),
        // 中国联通 wo
        "wo.cn"
            => s("smtp.wo.cn", 465),
        // 21cn
        "21cn.com"
            => s("smtp.21cn.com", 465),
        // Tom
        "tom.com"
            => s("smtp.tom.com", 465),
        // Apple
        "icloud.com" | "me.com" | "mac.com"
            => s("smtp.mail.me.com", 587),
        // Zoho
        "zoho.com" | "zohomail.com"
            => s("smtp.zoho.com", 465),
        // 雅虎
        "yahoo.com" | "yahoo.cn" | "yahoo.com.cn" | "ymail.com"
            => s("smtp.mail.yahoo.com", 465),
        _ => None,
    }
}

/// 根据 MX 主机识别企业邮件托管商，返回正确 SMTP 候选
fn get_smtp_from_mx(mx_host: &str) -> Option<Vec<(String, u16)>> {
    let mx = mx_host.to_lowercase();
    if mx.contains("netease.com") || mx.contains("ym.163.com") || mx.contains("qiye.163.com") {
        // 网易企业邮箱
        Some(vec![
            ("smtp.qiye.163.com".to_string(), 994),
            ("smtp.qiye.163.com".to_string(), 465),
        ])
    } else if mx.contains("exmail.qq.com") || mx.contains("mxbiz.qq.com") {
        // 腾讯企业邮箱
        Some(vec![("smtp.exmail.qq.com".to_string(), 465)])
    } else if mx.contains("qiye.aliyun.com") || mx.contains("mxn.qiye.aliyun") {
        // 阿里云企业邮箱
        Some(vec![("smtp.qiye.aliyun.com".to_string(), 465)])
    } else {
        None
    }
}

async fn get_smtp_candidates(domain: &str) -> Result<Vec<(String, u16)>, String> {
    // 1. 已知消费者邮箱，直接返回（无需 DNS）
    if let Some(known) = get_known_smtp(domain) {
        log::info!("SMTP 快速路径命中: {}", domain);
        return Ok(known);
    }

    let domain_owned = domain.to_string();

    let primary_mx = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let output = std::process::Command::new("nslookup")
            .args(&["-type=mx", &domain_owned])
            .output()
            .map_err(|e| format!("执行 nslookup 失败: {}", e))?;

        let out_str = String::from_utf8_lossy(&output.stdout);

        let mut best_mx = String::new();
        let mut best_pref = i32::MAX;

        for line in out_str.lines() {
            let line_lower = line.to_lowercase();
            if line_lower.contains("mail exchanger") {
                let parts: Vec<&str> = line.split("mail exchanger =").collect();
                if parts.len() > 1 {
                    let mut pref = 100;
                    if let Some(pref_part) = parts[0].split("preference =").nth(1) {
                        pref = pref_part.trim().trim_matches(',').parse::<i32>().unwrap_or(100);
                    }
                    let mx = parts[1].trim().trim_end_matches('.').to_string();
                    if pref < best_pref && !mx.is_empty() {
                        best_pref = pref;
                        best_mx = mx;
                    }
                }
            }
        }

        if best_mx.is_empty() {
            let output2 = std::process::Command::new("dig")
                .args(&["+short", "MX", &domain_owned])
                .output()
                .unwrap_or_else(|_| output.clone());
            let out_str2 = String::from_utf8_lossy(&output2.stdout);

            for line in out_str2.lines() {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let pref = parts[0].parse::<i32>().unwrap_or(100);
                    let mx = parts[1].trim_end_matches('.').to_string();
                    if pref < best_pref && !mx.is_empty() {
                        best_pref = pref;
                        best_mx = mx;
                    }
                }
            }
        }

        if best_mx.is_empty() {
            return Err("未找到 MX 记录".to_string());
        }

        Ok(best_mx)
    }).await.map_err(|e| format!("任务执行失败: {}", e))??;

    log::info!("发现首选 MX 记录: {}", primary_mx);

    // 2. 根据 MX 识别企业邮件托管商
    if let Some(known) = get_smtp_from_mx(&primary_mx) {
        log::info!("SMTP MX 模式匹配命中: {}", primary_mx);
        return Ok(known);
    }

    let mx_root = extract_root_domain(&primary_mx);
    let mut candidates: Vec<(String, u16)> = vec![
        (format!("smtp.{}", domain), 465),
        (format!("smtp.{}", domain), 587),
        (format!("mail.{}", domain), 465),
        (format!("mail.{}", domain), 587),
    ];
    if mx_root != domain {
        candidates.push((format!("smtp.{}", mx_root), 465));
        candidates.push((format!("smtp.{}", mx_root), 587));
        candidates.push((format!("mail.{}", mx_root), 465));
        candidates.push((format!("mail.{}", mx_root), 587));
    }
    candidates.push((primary_mx.clone(), 465));
    candidates.push((primary_mx.clone(), 587));

    Ok(candidates)
}

/// 兼容 send_smtp_email fallback：返回候选列表第一个（发信时 smtp_host 已知，一般不走这里）
async fn auto_discover_smtp(domain: &str) -> Result<(String, u16), String> {
    let candidates = get_smtp_candidates(domain).await?;
    candidates.into_iter().next().ok_or_else(|| "候选列表为空".to_string())
}

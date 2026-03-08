use log::info;
use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::process::Command;
use std::time::Duration;

/// 邮箱登录配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MailboxConfig {
    pub email: String,
    pub password: String,
    pub protocol: String, // "imap" 或 "pop3"
    pub host: Option<String>,
    pub port: Option<u16>,
}

/// 邮箱服务器配置（字段改为 String 以支持动态探测）
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub imap_host: String,
    pub imap_port: u16,
    pub pop3_host: String,
    pub pop3_port: u16,
}

/// 获取邮箱服务商的服务器配置（先查已知列表，再通过 MX + TCP 探测）
pub async fn get_server_config(domain: &str) -> Option<ServerConfig> {
    // 1. 先查已知消费者邮箱域名（快速路径）
    if let Some(config) = get_known_server_config(domain) {
        return Some(config);
    }

    // 2. 未知域名，通过 MX 记录 + TCP 探测通用发现
    info!("域名 {} 不在已知列表，尝试 MX + TCP 探测", domain);
    detect_server_config_by_probing(domain).await
}

/// 已知消费者邮箱域名的服务器配置（快速路径，无需探测）
fn get_known_server_config(domain: &str) -> Option<ServerConfig> {
    let cfg = |i: &'static str, ip: u16, p: &'static str, pp: u16| Some(ServerConfig {
        imap_host: i.to_string(),
        imap_port: ip,
        pop3_host: p.to_string(),
        pop3_port: pp,
    });
    match domain {
        "qq.com" | "foxmail.com"
            => cfg("imap.qq.com", 993, "pop.qq.com", 995),
        "163.com"
            => cfg("imap.163.com", 993, "pop.163.com", 995),
        "126.com"
            => cfg("imap.126.com", 993, "pop.126.com", 995),
        "yeah.net"
            => cfg("imap.yeah.net", 993, "pop.yeah.net", 995),
        "gmail.com"
            => cfg("imap.gmail.com", 993, "pop.gmail.com", 995),
        "outlook.com" | "hotmail.com" | "live.com" | "live.cn"
            => cfg("outlook.office365.com", 993, "outlook.office365.com", 995),
        "yahoo.com" | "yahoo.cn" | "yahoo.com.cn"
            => cfg("imap.mail.yahoo.com", 993, "pop.mail.yahoo.com", 995),
        "sina.com" | "sina.cn" | "vip.sina.com"
            => cfg("imap.sina.com", 993, "pop.sina.com", 995),
        "sohu.com"
            => cfg("imap.sohu.com", 993, "pop3.sohu.com", 995),
        "189.cn"
            => cfg("imap.189.cn", 993, "pop.189.cn", 995),
        "139.com"
            => cfg("imap.139.com", 993, "pop.139.com", 995),
        "aliyun.com"
            => cfg("imap.aliyun.com", 993, "pop.aliyun.com", 995),
        "tom.com"
            => cfg("imap.tom.com", 993, "pop.tom.com", 995),
        "icloud.com" | "me.com" | "mac.com"
            => cfg("imap.mail.me.com", 993, "pop.mail.me.com", 995),
        _ => None,
    }
}

/// 从完整主机名提取根域名（最后两个标签）
/// qiye163mx01.mxmail.netease.com  →  netease.com
fn extract_root_domain(host: &str) -> String {
    let parts: Vec<&str> = host.split('.').collect();
    if parts.len() >= 2 {
        parts[parts.len() - 2..].join(".")
    } else {
        host.to_string()
    }
}

/// TCP 探测：检查端口是否可达（阻塞，适合在 spawn_blocking 中调用）
fn probe_tcp_sync(host: &str, port: u16) -> bool {
    use std::net::ToSocketAddrs;
    let addr = match (host, port).to_socket_addrs() {
        Ok(mut a) => match a.next() {
            Some(a) => a,
            None => return false,
        },
        Err(_) => return false,
    };
    TcpStream::connect_timeout(&addr, Duration::from_secs(3)).is_ok()
}

/// 通过 MX 记录 + TCP 探测，发现任意企业域名的收信服务器配置
async fn detect_server_config_by_probing(domain: &str) -> Option<ServerConfig> {
    let domain_owned = domain.to_string();

    // 1. 查询 MX 记录（同步，在 blocking 线程执行）
    let primary_mx = tokio::task::spawn_blocking(move || -> Option<String> {
        let output = Command::new("nslookup")
            .args(["-type=mx", &domain_owned])
            .output()
            .ok()?;
        let out = String::from_utf8_lossy(&output.stdout).to_string();

        let mut best_mx = String::new();
        let mut best_pref = i32::MAX;

        for line in out.lines() {
            if line.to_lowercase().contains("mail exchanger") {
                let parts: Vec<&str> = line.split("mail exchanger =").collect();
                if parts.len() > 1 {
                    let mut pref = 100i32;
                    if let Some(p) = parts[0].split("preference =").nth(1) {
                        pref = p.trim().trim_matches(',').parse().unwrap_or(100);
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
            // macOS dig fallback
            let output2 = Command::new("dig")
                .args(["+short", "MX", &domain_owned])
                .output()
                .ok()?;
            let out2 = String::from_utf8_lossy(&output2.stdout).to_string();
            for line in out2.lines() {
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

        if best_mx.is_empty() { None } else { Some(best_mx) }
    }).await.ok().flatten();

    let primary_mx = match primary_mx {
        Some(mx) => mx,
        None => {
            info!("未找到 {} 的 MX 记录，跳过探测", domain);
            return None;
        }
    };

    info!("发现首选 MX 记录: {}", primary_mx);
    let mx_root = extract_root_domain(&primary_mx);

    // 2. 构建 IMAP / POP3 候选列表（从邮箱域名、MX 根域名、MX 主机三个维度）
    let mut imap_candidates: Vec<(String, u16)> = vec![
        (format!("imap.{}", domain), 993),
        (format!("imap.{}", domain), 143),
        (format!("mail.{}", domain), 993),
        (format!("mail.{}", domain), 143),
    ];
    let mut pop3_candidates: Vec<(String, u16)> = vec![
        (format!("pop.{}", domain), 995),
        (format!("pop.{}", domain), 110),
        (format!("pop3.{}", domain), 995),
        (format!("mail.{}", domain), 995),
    ];
    if mx_root != domain {
        imap_candidates.push((format!("imap.{}", mx_root), 993));
        imap_candidates.push((format!("imap.{}", mx_root), 143));
        imap_candidates.push((format!("mail.{}", mx_root), 993));
        pop3_candidates.push((format!("pop.{}", mx_root), 995));
        pop3_candidates.push((format!("pop.{}", mx_root), 110));
        pop3_candidates.push((format!("mail.{}", mx_root), 995));
    }
    imap_candidates.push((primary_mx.clone(), 993));
    imap_candidates.push((primary_mx.clone(), 143));
    pop3_candidates.push((primary_mx.clone(), 995));
    pop3_candidates.push((primary_mx.clone(), 110));

    // 3. TCP 探测：在 blocking 线程中逐个测试
    let imap_result = {
        let candidates = imap_candidates.clone();
        tokio::task::spawn_blocking(move || {
            for (host, port) in &candidates {
                info!("探测 IMAP: {}:{}", host, port);
                if probe_tcp_sync(host, *port) {
                    info!("IMAP 可达: {}:{}", host, port);
                    return Some((host.clone(), *port));
                }
            }
            None
        }).await.ok().flatten()
    };

    let pop3_result = {
        let candidates = pop3_candidates.clone();
        tokio::task::spawn_blocking(move || {
            for (host, port) in &candidates {
                info!("探测 POP3: {}:{}", host, port);
                if probe_tcp_sync(host, *port) {
                    info!("POP3 可达: {}:{}", host, port);
                    return Some((host.clone(), *port));
                }
            }
            None
        }).await.ok().flatten()
    };

    // 4. 任意一个协议探测成功就返回配置（缺失的一方用默认端口）
    match (imap_result, pop3_result) {
        (None, None) => {
            info!("IMAP/POP3 均无可达候选，探测失败");
            None
        }
        (imap, pop3) => {
            let (imap_host, imap_port) = imap.unwrap_or_else(|| (format!("imap.{}", domain), 993));
            let (pop3_host, pop3_port) = pop3.unwrap_or_else(|| (format!("pop.{}", domain), 995));
            Some(ServerConfig { imap_host, imap_port, pop3_host, pop3_port })
        }
    }
}

/// 附件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttachmentData {
    pub filename: String,
    pub content_type: String,
    pub size: usize,
    /// 附件二进制数据，仅内存中使用，不序列化到 JSON
    #[serde(skip)]
    pub data: Vec<u8>,
}

/// 邮件数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailData {
    pub message_id: String,
    pub subject: String,
    pub from_addr: String,
    pub to_addr: String,
    pub content_text: String,
    pub content_html: String,
    pub email_date_ms: i64,
    pub received_at_ms: i64,
    #[serde(default)]
    pub attachments: Vec<AttachmentData>,
}

/// 登录验证结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResult {
    pub success: bool,
    pub message: String,
    pub protocol: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    #[serde(default)]
    pub smtp_host: Option<String>,
    #[serde(default)]
    pub smtp_port: Option<u16>,
    #[serde(default)]
    pub smtp_verified: bool,
    #[serde(default)]
    pub smtp_error: Option<String>,
}

/// 收取邮件结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResult {
    pub success: bool,
    pub message: String,
    pub emails: Vec<EmailData>,
    pub count: usize,
}

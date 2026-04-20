use crate::mail::discovery::{
    dedupe_candidates, extract_root_domain, probe_tcp_sync, query_primary_mx, query_srv_records,
};
use crate::mail::provider_constants::{find_hosted_provider_by_mx, find_known_provider};
use log::info;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeProxy {
    #[serde(alias = "proxy_id")]
    pub proxy_id: Option<i64>,
    pub name: Option<String>,
    pub host: String,
    pub port: u16,
    #[serde(alias = "proxy_type")]
    pub proxy_type: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub provider: Option<String>,
    pub location: Option<String>,
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
    if let Some(profile) = find_known_provider(domain) {
        let config = ServerConfig {
            imap_host: profile.imap_host.to_string(),
            imap_port: profile.imap_port,
            pop3_host: profile.pop3_host.to_string(),
            pop3_port: profile.pop3_port,
        };
        return Some(config);
    }

    // 2. 未知域名，通过 MX 记录 + TCP 探测通用发现
    info!("域名 {} 不在已知列表，尝试 MX + TCP 探测", domain);
    detect_server_config_by_probing(domain).await
}

/// 通过 MX 记录 + TCP 探测，发现任意企业域名的收信服务器配置
async fn detect_server_config_by_probing(domain: &str) -> Option<ServerConfig> {
    let primary_mx = query_primary_mx(domain);
    if let Some(mx) = primary_mx.as_ref() {
        info!("发现首选 MX 记录: {}", mx);
    } else {
        info!("未找到 {} 的 MX 记录，继续使用通用主机名探测", domain);
    }

    if let Some(provider) = primary_mx
        .as_deref()
        .and_then(find_hosted_provider_by_mx)
    {
        let profile = provider.profile;
        let cfg = ServerConfig {
            imap_host: profile.imap_host.to_string(),
            imap_port: profile.imap_port,
            pop3_host: profile.pop3_host.to_string(),
            pop3_port: profile.pop3_port,
        };
        if let Some(mx) = primary_mx.as_ref() {
            info!("MX {} 命中企业邮箱托管商 {}，直接返回配置", mx, provider.name);
        }
        return Some(cfg);
    }

    let mx_root = primary_mx
        .as_deref()
        .map(extract_root_domain)
        .unwrap_or_else(|| domain.to_string());

    // 3. 构建 IMAP / POP3 候选列表（从邮箱域名、MX 根域名、MX 主机三个维度）
    let mut imap_candidates: Vec<(String, u16)> = Vec::new();
    imap_candidates.extend(query_srv_records("imaps", domain));
    imap_candidates.extend(query_srv_records("imap", domain));
    imap_candidates.extend(vec![
        (format!("imap.{}", domain), 993),
        (format!("imap.{}", domain), 143),
        (format!("mail.{}", domain), 993),
        (format!("mail.{}", domain), 143),
        (format!("in.{}", domain), 993),
        (format!("in.{}", domain), 143),
        (format!("inbound.{}", domain), 993),
        (format!("inbound.{}", domain), 143),
    ]);
    let mut pop3_candidates: Vec<(String, u16)> = Vec::new();
    pop3_candidates.extend(query_srv_records("pop3s", domain));
    pop3_candidates.extend(query_srv_records("pop3", domain));
    pop3_candidates.extend(vec![
        (format!("pop.{}", domain), 995),
        (format!("pop.{}", domain), 110),
        (format!("pop3.{}", domain), 995),
        (format!("pop3.{}", domain), 110),
        (format!("mail.{}", domain), 995),
        (format!("mail.{}", domain), 110),
        (format!("in.{}", domain), 995),
        (format!("inbound.{}", domain), 995),
    ]);
    if mx_root != domain {
        imap_candidates.push((format!("imap.{}", mx_root), 993));
        imap_candidates.push((format!("imap.{}", mx_root), 143));
        imap_candidates.push((format!("mail.{}", mx_root), 993));
        imap_candidates.push((format!("mail.{}", mx_root), 143));
        pop3_candidates.push((format!("pop.{}", mx_root), 995));
        pop3_candidates.push((format!("pop.{}", mx_root), 110));
        pop3_candidates.push((format!("mail.{}", mx_root), 995));
        pop3_candidates.push((format!("mail.{}", mx_root), 110));
    }
    if let Some(mx) = primary_mx.as_ref() {
        imap_candidates.push((mx.clone(), 993));
        imap_candidates.push((mx.clone(), 143));
        pop3_candidates.push((mx.clone(), 995));
        pop3_candidates.push((mx.clone(), 110));
    }

    let imap_candidates = dedupe_candidates(imap_candidates);
    let pop3_candidates = dedupe_candidates(pop3_candidates);

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

use crate::commands::{add_external_mailbox_without_events, fetch_emails, send_smtp_email, SendEmailAttachment};
use crate::mail::types::RuntimeProxy;
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};

const LOCAL_API_ADDR: &str = "127.0.0.1:19199";
#[cfg(debug_assertions)]
const OPEN_API_PROXY_ORIGIN: &str = "http://127.0.0.1:8088";
#[cfg(not(debug_assertions))]
const OPEN_API_PROXY_ORIGIN: &str = "https://zjkdongao.cn";

#[derive(Debug, Deserialize)]
struct VerifyMailboxRequest {
    email: String,
    password: String,
    #[serde(default = "default_auto_protocol")]
    protocol: String,
    host: Option<String>,
    port: Option<u16>,
    verify_smtp: Option<bool>,
    proxy: Option<RuntimeProxy>,
}

#[derive(Debug, Deserialize)]
struct FetchMailboxRequest {
    mailbox_id: i64,
    email: String,
    #[serde(default)]
    password: String,
    #[serde(default = "default_auto_protocol")]
    protocol: String,
    host: Option<String>,
    port: Option<u16>,
    token: String,
    server_url: String,
    auth_type: Option<String>,
    access_token: Option<String>,
    proxy: Option<RuntimeProxy>,
}

#[derive(Debug, Deserialize)]
struct SendEmailRequest {
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
}

#[derive(Debug, Serialize)]
struct LocalApiResponse {
    code: i32,
    message: String,
    data: Value,
}

fn default_auto_protocol() -> String {
    "auto".to_string()
}

pub fn start_local_api_server() {
    tauri::async_runtime::spawn(async move {
        let listener = match TcpListener::bind(LOCAL_API_ADDR).await {
            Ok(listener) => {
                info!("桌面本地 HTTP 接口已启动: {}", LOCAL_API_ADDR);
                listener
            }
            Err(err) => {
                error!("启动桌面本地 HTTP 接口失败: {}", err);
                return;
            }
        };

        loop {
            let (mut stream, addr) = match listener.accept().await {
                Ok(conn) => conn,
                Err(err) => {
                    warn!("接受本地 HTTP 连接失败: {}", err);
                    continue;
                }
            };

            tauri::async_runtime::spawn(async move {
                match read_http_request(&mut stream).await {
                    Ok(request) => {
                        let response = handle_http_request(request).await;
                        if let Err(err) = write_http_response(&mut stream, response).await {
                            warn!("写入本地 HTTP 响应失败: {} ({})", addr, err);
                        }
                    }
                    Err(err) => {
                        warn!("解析本地 HTTP 请求失败: {} ({})", addr, err);
                        let _ = write_http_response(
                            &mut stream,
                            HttpResponse::json(
                                400,
                                LocalApiResponse {
                                    code: 1,
                                    message: format!("请求格式错误: {}", err),
                                    data: json!(None::<String>),
                                },
                            ),
                        )
                        .await;
                    }
                }
            });
        }
    });
}

struct HttpRequest {
    method: String,
    path: String,
    headers: HashMap<String, String>,
    body: Vec<u8>,
}

struct HttpResponse {
    status_code: u16,
    body: Vec<u8>,
    content_type: &'static str,
    extra_headers: Vec<(&'static str, &'static str)>,
}

impl HttpResponse {
    fn json(status_code: u16, payload: LocalApiResponse) -> Self {
        let body = serde_json::to_vec(&payload)
            .unwrap_or_else(|_| "{\"code\":1,\"message\":\"响应序列化失败\",\"data\":null}".as_bytes().to_vec());
        Self {
            status_code,
            body,
            content_type: "application/json; charset=utf-8",
            extra_headers: cors_headers(),
        }
    }

    fn empty(status_code: u16) -> Self {
        Self {
            status_code,
            body: Vec::new(),
            content_type: "text/plain; charset=utf-8",
            extra_headers: cors_headers(),
        }
    }
}

async fn read_http_request(stream: &mut tokio::net::TcpStream) -> Result<HttpRequest, String> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 4096];
    let mut header_end = None;

    loop {
        let size = stream.read(&mut chunk).await.map_err(|e| e.to_string())?;
        if size == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..size]);
        if let Some(pos) = find_header_end(&buffer) {
            header_end = Some(pos);
            break;
        }
        if buffer.len() > 1024 * 1024 {
            return Err("请求头过大".to_string());
        }
    }

    let header_end = header_end.ok_or("请求头不完整")?;
    let header_bytes = &buffer[..header_end];
    let header_text = String::from_utf8_lossy(header_bytes);
    let mut lines = header_text.lines();
    let request_line = lines.next().ok_or("缺少请求行")?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts.next().ok_or("缺少请求方法")?.to_uppercase();
    let path = request_parts.next().ok_or("缺少请求路径")?.to_string();

    let mut content_length = 0_usize;
    let mut headers = HashMap::new();
    for line in lines {
        if let Some((name, value)) = line.split_once(':') {
            headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
        }
        let lower = line.to_ascii_lowercase();
        if lower.starts_with("content-length:") {
            content_length = line
                .split(':')
                .nth(1)
                .unwrap_or("0")
                .trim()
                .parse::<usize>()
                .map_err(|_| "Content-Length 非法".to_string())?;
        }
    }

    let mut body = buffer[(header_end + 4)..].to_vec();
    while body.len() < content_length {
        let size = stream.read(&mut chunk).await.map_err(|e| e.to_string())?;
        if size == 0 {
            break;
        }
        body.extend_from_slice(&chunk[..size]);
    }
    body.truncate(content_length);

    Ok(HttpRequest { method, path, headers, body })
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

async fn handle_http_request(request: HttpRequest) -> HttpResponse {
    if request.method == "OPTIONS" {
        return HttpResponse::empty(200);
    }

    if request.path.starts_with("/open/v1/") {
        return forward_open_request(request).await;
    }

    match (request.method.as_str(), request.path.as_str()) {
        ("GET", "/local-api/v1/health") => HttpResponse::json(
            200,
            LocalApiResponse {
                code: 0,
                message: "ok".to_string(),
                data: json!({
                    "service": "mail-desktop-local-api",
                    "addr": LOCAL_API_ADDR,
                }),
            },
        ),
        ("POST", "/local-api/v1/external-mailboxes/verify") => {
            match parse_json::<VerifyMailboxRequest>(&request.body) {
                Ok(payload) => match add_external_mailbox_without_events(
                    payload.email,
                    payload.password,
                    payload.protocol,
                    payload.host,
                    payload.port,
                    payload.verify_smtp,
                    payload.proxy,
                )
                .await
                {
                    Ok(result) => HttpResponse::json(
                        200,
                        LocalApiResponse {
                            code: 0,
                            message: "本地验号成功".to_string(),
                            data: serde_json::to_value(result).unwrap_or(json!(None::<String>)),
                        },
                    ),
                    Err(err) => HttpResponse::json(
                        200,
                        LocalApiResponse {
                            code: 1,
                            message: err,
                            data: json!(None::<String>),
                        },
                    ),
                },
                Err(err) => bad_request(err),
            }
        }
        ("POST", "/local-api/v1/external-mailboxes/fetch") => {
            match parse_json::<FetchMailboxRequest>(&request.body) {
                Ok(payload) => match fetch_emails(
                    payload.mailbox_id,
                    payload.email,
                    payload.password,
                    payload.protocol,
                    payload.host,
                    payload.port,
                    payload.token,
                    payload.server_url,
                    payload.auth_type,
                    payload.access_token,
                    payload.proxy,
                )
                .await
                {
                    Ok(result) => HttpResponse::json(
                        200,
                        LocalApiResponse {
                            code: 0,
                            message: "本地收信成功".to_string(),
                            data: serde_json::to_value(result).unwrap_or(json!(None::<String>)),
                        },
                    ),
                    Err(err) => HttpResponse::json(
                        200,
                        LocalApiResponse {
                            code: 1,
                            message: err,
                            data: json!(None::<String>),
                        },
                    ),
                },
                Err(err) => bad_request(err),
            }
        }
        ("POST", "/local-api/v1/smtp/send") => match parse_json::<SendEmailRequest>(&request.body) {
            Ok(payload) => match send_smtp_email(
                payload.from_email,
                payload.password,
                payload.smtp_host,
                payload.smtp_port,
                payload.to_email,
                payload.subject,
                payload.content,
                payload.content_html,
                payload.cc,
                payload.bcc,
                payload.attachments,
                payload.proxy,
            )
            .await
            {
                Ok(result) => HttpResponse::json(
                    200,
                    LocalApiResponse {
                        code: 0,
                        message: "本地发信成功".to_string(),
                        data: serde_json::to_value(result).unwrap_or(json!({"success": true})),
                    },
                ),
                Err(err) => HttpResponse::json(
                    200,
                    LocalApiResponse {
                        code: 1,
                        message: err,
                        data: json!(None::<String>),
                    },
                ),
            },
            Err(err) => bad_request(err),
        },
        _ => HttpResponse::json(
            404,
            LocalApiResponse {
                code: 1,
                message: "接口不存在".to_string(),
                data: json!(None::<String>),
            },
        ),
    }
}

async fn forward_open_request(request: HttpRequest) -> HttpResponse {
    let client = reqwest::Client::new();
    let url = format!("{}{}", OPEN_API_PROXY_ORIGIN, request.path);
    let method = match reqwest::Method::from_bytes(request.method.as_bytes()) {
        Ok(method) => method,
        Err(_) => {
            return HttpResponse::json(
                400,
                LocalApiResponse {
                    code: 1,
                    message: "不支持的请求方法".to_string(),
                    data: json!(None::<String>),
                },
            )
        }
    };

    let mut req = client.request(method, url);
    if let Some(auth) = request.headers.get("authorization") {
        req = req.header("Authorization", auth);
    }
    if let Some(api_key) = request.headers.get("x-api-key") {
        req = req.header("X-API-Key", api_key);
    }
    if let Some(lang) = request.headers.get("accept-language") {
        req = req.header("Accept-Language", lang);
    }
    if !request.body.is_empty() {
        req = req.header("Content-Type", "application/json").body(request.body);
    }

    match req.send().await {
        Ok(resp) => {
            let status_code = resp.status().as_u16();
            let body = match resp.bytes().await {
                Ok(bytes) => bytes.to_vec(),
                Err(err) => {
                    return HttpResponse::json(
                        502,
                        LocalApiResponse {
                            code: 1,
                            message: format!("读取线上响应失败: {}", err),
                            data: json!(None::<String>),
                        },
                    )
                }
            };
            HttpResponse {
                status_code,
                body,
                content_type: "application/json; charset=utf-8",
                extra_headers: cors_headers(),
            }
        }
        Err(err) => HttpResponse::json(
            502,
            LocalApiResponse {
                code: 1,
                message: format!("调用线上接口失败: {}", err),
                data: json!(None::<String>),
            },
        ),
    }
}

fn parse_json<T: for<'de> Deserialize<'de>>(body: &[u8]) -> Result<T, String> {
    serde_json::from_slice(body).map_err(|e| format!("JSON 解析失败: {}", e))
}

fn bad_request(message: String) -> HttpResponse {
    HttpResponse::json(
        400,
        LocalApiResponse {
            code: 1,
            message,
            data: json!(None::<String>),
        },
    )
}

fn cors_headers() -> Vec<(&'static str, &'static str)> {
    vec![
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type, Authorization"),
    ]
}

async fn write_http_response(
    stream: &mut tokio::net::TcpStream,
    response: HttpResponse,
) -> Result<(), String> {
    let status_text = match response.status_code {
        200 => "200 OK",
        400 => "400 Bad Request",
        404 => "404 Not Found",
        _ => "500 Internal Server Error",
    };
    let mut head = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n",
        status_text,
        response.content_type,
        response.body.len()
    );
    for (name, value) in response.extra_headers {
        head.push_str(&format!("{}: {}\r\n", name, value));
    }
    head.push_str("\r\n");
    stream
        .write_all(head.as_bytes())
        .await
        .map_err(|e| e.to_string())?;
    stream
        .write_all(&response.body)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

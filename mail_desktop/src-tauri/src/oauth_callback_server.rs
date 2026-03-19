use std::collections::HashMap;

use log::{error, info, warn};
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::TcpListener,
};
use url::Url;

const OAUTH_CALLBACK_ADDR: &str = "127.0.0.1:9999";

#[derive(Clone, Serialize)]
struct OAuthCallbackPayload {
    path: String,
    query: HashMap<String, String>,
    raw_url: String,
}

pub fn start_oauth_callback_server(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let listener = match TcpListener::bind(OAUTH_CALLBACK_ADDR).await {
            Ok(listener) => {
                info!("桌面端 OAuth 回调监听已启动: {}", OAUTH_CALLBACK_ADDR);
                listener
            }
            Err(err) => {
                error!("启动 OAuth 回调监听失败: {}", err);
                return;
            }
        };

        loop {
            let (mut stream, addr) = match listener.accept().await {
                Ok(conn) => conn,
                Err(err) => {
                    warn!("接受 OAuth 回调连接失败: {}", err);
                    continue;
                }
            };

            let app_handle = app.clone();
            tauri::async_runtime::spawn(async move {
                let mut buffer = vec![0_u8; 8192];
                let size = match stream.read(&mut buffer).await {
                    Ok(size) if size > 0 => size,
                    Ok(_) => return,
                    Err(err) => {
                        warn!("读取 OAuth 回调请求失败: {}", err);
                        return;
                    }
                };

                let request = String::from_utf8_lossy(&buffer[..size]);
                let first_line = request.lines().next().unwrap_or_default();
                let target = parse_request_target(first_line).unwrap_or_else(|| "/".to_string());
                let (path, query) = parse_path_and_query(&target);

                info!("收到 OAuth 回调: {} from {}", target, addr);

                if path != "/favicon.ico" {
                    let payload = OAuthCallbackPayload {
                        path: path.clone(),
                        query: query.clone(),
                        raw_url: target.clone(),
                    };

                    if let Err(err) = app_handle.emit("oauth-callback", payload) {
                        warn!("发送 OAuth 回调事件失败: {}", err);
                    }
                }

                let html = build_response_page(&path, &query);
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    html.len(),
                    html
                );

                if let Err(err) = stream.write_all(response.as_bytes()).await {
                    warn!("写入 OAuth 回调响应失败: {}", err);
                }
            });
        }
    });
}

fn parse_request_target(first_line: &str) -> Option<String> {
    let mut parts = first_line.split_whitespace();
    let method = parts.next()?;
    let target = parts.next()?;
    if method.eq_ignore_ascii_case("GET") {
        Some(target.to_string())
    } else {
        None
    }
}

fn parse_path_and_query(target: &str) -> (String, HashMap<String, String>) {
    let fallback_path = target.split('?').next().unwrap_or("/").to_string();
    let Ok(url) = Url::parse(&format!("http://localhost{}", target)) else {
        return (fallback_path, HashMap::new());
    };

    let mut query = HashMap::new();
    for (key, value) in url.query_pairs() {
        query.insert(key.to_string(), value.to_string());
    }

    (url.path().to_string(), query)
}

fn build_response_page(path: &str, query: &HashMap<String, String>) -> String {
    let should_auto_close = query.contains_key("oauth2_success") || query.contains_key("google_bind_success");
    let (title, description) = if query.contains_key("oauth2_success") {
        ("邮箱授权成功", "桌面端已收到邮箱授权结果，请回到应用继续。")
    } else if query.contains_key("oauth2_error") {
        ("邮箱授权失败", "桌面端已收到失败结果，请回到应用查看详细信息。")
    } else if query.contains_key("google_bind_success") {
        ("Google 绑定成功", "桌面端已收到绑定结果，请回到应用查看。")
    } else if query.contains_key("google_bind_error") {
        ("Google 绑定失败", "桌面端已收到失败结果，请回到应用重试。")
    } else if path == "/auth/google/success" {
        ("Google 登录成功", "桌面端已收到登录结果，请回到应用继续。")
    } else if path == "/auth/google/choose" {
        ("继续完成 Google 登录", "请回到桌面端继续完成账号创建或绑定。")
    } else if path == "/login" && query.contains_key("error") {
        ("Google 登录失败", "桌面端已收到错误信息，请回到应用查看。")
    } else {
        ("操作已完成", "桌面端已收到回调结果，请回到应用继续。")
    };

    format!(
        r#"<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <style>
    :root {{
      color-scheme: light;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: linear-gradient(160deg, #f5f7fb 0%, #edf4ff 100%);
      color: #1f2937;
    }}
    .card {{
      width: min(440px, calc(100vw - 32px));
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
      padding: 32px 28px;
      text-align: center;
    }}
    h1 {{
      margin: 0 0 12px;
      font-size: 24px;
    }}
    p {{
      margin: 0;
      line-height: 1.7;
      color: #475569;
    }}
  </style>
</head>
<body>
  <main class="card">
    <h1>{title}</h1>
    <p>{description}</p>
    <p id="close-tip" style="display:none;margin-top:12px;font-size:12px;color:#64748b;">窗口未自动关闭，可手动关闭此页。</p>
  </main>
  <script>
    (function () {{
      var shouldClose = {should_auto_close};
      if (!shouldClose) return;
      setTimeout(function () {{
        try {{ window.close(); }} catch (e) {{}}
      }}, 900);
      setTimeout(function () {{
        var tip = document.getElementById('close-tip');
        if (tip) tip.style.display = 'block';
      }}, 1600);
    }})();
  </script>
</body>
</html>"#
    )
}

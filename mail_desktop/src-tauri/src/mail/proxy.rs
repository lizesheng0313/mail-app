use crate::mail::types::RuntimeProxy;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};

fn normalize_proxy_type(proxy: &RuntimeProxy) -> &str {
    match proxy.proxy_type.as_deref().map(|value| value.trim().to_lowercase()) {
        Some(value) if matches!(value.as_str(), "http" | "https" | "http_connect" | "http-connect") => "http",
        Some(value) if matches!(value.as_str(), "socks" | "socks5") => "socks5",
        _ => "auto",
    }
}

fn build_socks5_auth_payload(proxy: &RuntimeProxy) -> Option<Vec<u8>> {
    let username = proxy.username.as_deref().filter(|value| !value.is_empty())?;
    let password = proxy.password.as_deref().unwrap_or("");
    if username.len() > u8::MAX as usize || password.len() > u8::MAX as usize {
        return None;
    }

    let mut payload = Vec::with_capacity(3 + username.len() + password.len());
    payload.push(0x01);
    payload.push(username.len() as u8);
    payload.extend_from_slice(username.as_bytes());
    payload.push(password.len() as u8);
    payload.extend_from_slice(password.as_bytes());
    Some(payload)
}

fn build_socks5_connect_request(target_host: &str, target_port: u16) -> Result<Vec<u8>, String> {
    let host_bytes = target_host.as_bytes();
    if host_bytes.len() > u8::MAX as usize {
        return Err("目标主机名过长".to_string());
    }

    let mut payload = Vec::with_capacity(7 + host_bytes.len());
    payload.extend_from_slice(&[0x05, 0x01, 0x00, 0x03, host_bytes.len() as u8]);
    payload.extend_from_slice(host_bytes);
    payload.extend_from_slice(&target_port.to_be_bytes());
    Ok(payload)
}

fn read_exact_sync(stream: &mut TcpStream, size: usize, error_prefix: &str) -> Result<Vec<u8>, String> {
    let mut buffer = vec![0u8; size];
    stream
        .read_exact(&mut buffer)
        .map_err(|e| format!("{}: {}", error_prefix, e))?;
    Ok(buffer)
}

async fn read_exact_async(
    stream: &mut tokio::net::TcpStream,
    size: usize,
    error_prefix: &str,
) -> Result<Vec<u8>, String> {
    let mut buffer = vec![0u8; size];
    stream
        .read_exact(&mut buffer)
        .await
        .map_err(|e| format!("{}: {}", error_prefix, e))?;
    Ok(buffer)
}

fn finish_socks5_connect_response(stream: &mut TcpStream, atyp: u8) -> Result<(), String> {
    let remain = match atyp {
        0x01 => 4 + 2,
        0x04 => 16 + 2,
        0x03 => {
            let domain_len = read_exact_sync(stream, 1, "读取 SOCKS5 域名长度失败")?;
            domain_len[0] as usize + 2
        }
        _ => return Err("SOCKS5 返回了未知地址类型".to_string()),
    };
    let _ = read_exact_sync(stream, remain, "读取 SOCKS5 连接响应失败")?;
    Ok(())
}

async fn finish_socks5_connect_response_async(
    stream: &mut tokio::net::TcpStream,
    atyp: u8,
) -> Result<(), String> {
    let remain = match atyp {
        0x01 => 4 + 2,
        0x04 => 16 + 2,
        0x03 => {
            let domain_len = read_exact_async(stream, 1, "读取 SOCKS5 域名长度失败").await?;
            domain_len[0] as usize + 2
        }
        _ => return Err("SOCKS5 返回了未知地址类型".to_string()),
    };
    let _ = read_exact_async(stream, remain, "读取 SOCKS5 连接响应失败").await?;
    Ok(())
}

fn connect_via_socks5_proxy(
    proxy: &RuntimeProxy,
    target_host: &str,
    target_port: u16,
    connect_timeout: Duration,
    io_timeout: Duration,
) -> Result<TcpStream, String> {
    let proxy_addr = resolve_socket_addr(&proxy.host, proxy.port)?;
    let mut tcp = TcpStream::connect_timeout(&proxy_addr, connect_timeout)
        .map_err(|e| format!("SOCKS5 代理 TCP 连接失败 {}:{} - {}", proxy.host, proxy.port, e))?;

    tcp.set_read_timeout(Some(io_timeout)).ok();
    tcp.set_write_timeout(Some(io_timeout)).ok();

    let methods = if proxy.username.as_deref().filter(|value| !value.is_empty()).is_some() {
        vec![0x00, 0x02]
    } else {
        vec![0x00]
    };
    let mut greeting = vec![0x05, methods.len() as u8];
    greeting.extend_from_slice(&methods);
    tcp.write_all(&greeting)
        .map_err(|e| format!("发送 SOCKS5 握手失败: {}", e))?;

    let response = read_exact_sync(&mut tcp, 2, "读取 SOCKS5 握手响应失败")?;
    if response[0] != 0x05 {
        return Err("不是 SOCKS5 代理".to_string());
    }
    match response[1] {
        0x00 => {}
        0x02 => {
            let auth_payload = build_socks5_auth_payload(proxy)
                .ok_or_else(|| "SOCKS5 代理要求用户名密码认证".to_string())?;
            tcp.write_all(&auth_payload)
                .map_err(|e| format!("发送 SOCKS5 认证失败: {}", e))?;
            let auth_response = read_exact_sync(&mut tcp, 2, "读取 SOCKS5 认证响应失败")?;
            if auth_response[1] != 0x00 {
                return Err("SOCKS5 用户名或密码错误".to_string());
            }
        }
        0xFF => return Err("SOCKS5 代理不支持当前认证方式".to_string()),
        _ => return Err(format!("SOCKS5 返回了未知认证方式: {}", response[1])),
    }

    let connect_payload = build_socks5_connect_request(target_host, target_port)?;
    tcp.write_all(&connect_payload)
        .map_err(|e| format!("发送 SOCKS5 CONNECT 失败: {}", e))?;

    let header = read_exact_sync(&mut tcp, 4, "读取 SOCKS5 CONNECT 响应失败")?;
    if header[0] != 0x05 {
        return Err("SOCKS5 CONNECT 响应版本错误".to_string());
    }
    if header[1] != 0x00 {
        return Err(format!("SOCKS5 CONNECT 失败，错误码 {}", header[1]));
    }
    finish_socks5_connect_response(&mut tcp, header[3])?;
    Ok(tcp)
}

async fn connect_via_socks5_proxy_async(
    proxy: &RuntimeProxy,
    target_host: &str,
    target_port: u16,
) -> Result<tokio::net::TcpStream, String> {
    let proxy_addr = resolve_socket_addr_async(&proxy.host, proxy.port).await?;
    let mut tcp = tokio::net::TcpStream::connect(proxy_addr)
        .await
        .map_err(|e| format!("SOCKS5 代理 TCP 连接失败 {}:{} - {}", proxy.host, proxy.port, e))?;

    let methods = if proxy.username.as_deref().filter(|value| !value.is_empty()).is_some() {
        vec![0x00, 0x02]
    } else {
        vec![0x00]
    };
    let mut greeting = vec![0x05, methods.len() as u8];
    greeting.extend_from_slice(&methods);
    tcp.write_all(&greeting)
        .await
        .map_err(|e| format!("发送 SOCKS5 握手失败: {}", e))?;

    let response = read_exact_async(&mut tcp, 2, "读取 SOCKS5 握手响应失败").await?;
    if response[0] != 0x05 {
        return Err("不是 SOCKS5 代理".to_string());
    }
    match response[1] {
        0x00 => {}
        0x02 => {
            let auth_payload = build_socks5_auth_payload(proxy)
                .ok_or_else(|| "SOCKS5 代理要求用户名密码认证".to_string())?;
            tcp.write_all(&auth_payload)
                .await
                .map_err(|e| format!("发送 SOCKS5 认证失败: {}", e))?;
            let auth_response = read_exact_async(&mut tcp, 2, "读取 SOCKS5 认证响应失败").await?;
            if auth_response[1] != 0x00 {
                return Err("SOCKS5 用户名或密码错误".to_string());
            }
        }
        0xFF => return Err("SOCKS5 代理不支持当前认证方式".to_string()),
        _ => return Err(format!("SOCKS5 返回了未知认证方式: {}", response[1])),
    }

    let connect_payload = build_socks5_connect_request(target_host, target_port)?;
    tcp.write_all(&connect_payload)
        .await
        .map_err(|e| format!("发送 SOCKS5 CONNECT 失败: {}", e))?;

    let header = read_exact_async(&mut tcp, 4, "读取 SOCKS5 CONNECT 响应失败").await?;
    if header[0] != 0x05 {
        return Err("SOCKS5 CONNECT 响应版本错误".to_string());
    }
    if header[1] != 0x00 {
        return Err(format!("SOCKS5 CONNECT 失败，错误码 {}", header[1]));
    }
    finish_socks5_connect_response_async(&mut tcp, header[3]).await?;
    Ok(tcp)
}

fn resolve_socket_addr(host: &str, port: u16) -> Result<std::net::SocketAddr, String> {
    (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("DNS 解析失败 {}: {}", host, e))?
        .next()
        .ok_or_else(|| format!("DNS 解析无结果: {}", host))
}

async fn resolve_socket_addr_async(host: &str, port: u16) -> Result<std::net::SocketAddr, String> {
    tokio::net::lookup_host((host, port))
        .await
        .map_err(|e| format!("DNS 解析失败 {}: {}", host, e))?
        .next()
        .ok_or_else(|| format!("DNS 解析无结果: {}", host))
}

fn read_http_connect_response(stream: &mut TcpStream) -> Result<String, String> {
    let mut buffer = Vec::new();
    let mut chunk = [0u8; 1024];

    loop {
        let size = stream
            .read(&mut chunk)
            .map_err(|e| format!("读取代理响应失败: {}", e))?;
        if size == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..size]);
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
        if buffer.len() > 16 * 1024 {
            return Err("代理响应过大".to_string());
        }
    }

    String::from_utf8(buffer).map_err(|e| format!("代理响应解码失败: {}", e))
}

async fn read_http_connect_response_async(stream: &mut tokio::net::TcpStream) -> Result<String, String> {
    let mut buffer = Vec::new();
    let mut chunk = [0u8; 1024];

    loop {
        let size = stream
            .read(&mut chunk)
            .await
            .map_err(|e| format!("读取代理响应失败: {}", e))?;
        if size == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..size]);
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
        if buffer.len() > 16 * 1024 {
            return Err("代理响应过大".to_string());
        }
    }

    String::from_utf8(buffer).map_err(|e| format!("代理响应解码失败: {}", e))
}

fn connect_via_http_proxy(
    proxy: &RuntimeProxy,
    target_host: &str,
    target_port: u16,
    connect_timeout: Duration,
    io_timeout: Duration,
) -> Result<TcpStream, String> {
    let proxy_addr = resolve_socket_addr(&proxy.host, proxy.port)?;
    let mut tcp = TcpStream::connect_timeout(&proxy_addr, connect_timeout)
        .map_err(|e| format!("代理 TCP 连接失败 {}:{} - {}", proxy.host, proxy.port, e))?;

    tcp.set_read_timeout(Some(io_timeout)).ok();
    tcp.set_write_timeout(Some(io_timeout)).ok();

    let target = format!("{}:{}", target_host, target_port);
    let mut request = format!(
        "CONNECT {} HTTP/1.1\r\nHost: {}\r\nProxy-Connection: Keep-Alive\r\n",
        target, target
    );

    if let Some(username) = proxy.username.as_deref().filter(|value| !value.is_empty()) {
        let password = proxy.password.as_deref().unwrap_or("");
        let encoded = STANDARD.encode(format!("{}:{}", username, password));
        request.push_str(&format!("Proxy-Authorization: Basic {}\r\n", encoded));
    }
    request.push_str("\r\n");

    tcp.write_all(request.as_bytes())
        .map_err(|e| format!("发送代理 CONNECT 请求失败: {}", e))?;

    let response = read_http_connect_response(&mut tcp)?;
    let status_line = response.lines().next().unwrap_or_default().trim().to_string();
    if !(status_line.starts_with("HTTP/1.1 200") || status_line.starts_with("HTTP/1.0 200")) {
        return Err(format!("代理 CONNECT 失败: {}", status_line));
    }

    Ok(tcp)
}

async fn connect_via_http_proxy_async(
    proxy: &RuntimeProxy,
    target_host: &str,
    target_port: u16,
) -> Result<tokio::net::TcpStream, String> {
    let proxy_addr = resolve_socket_addr_async(&proxy.host, proxy.port).await?;
    let mut tcp = tokio::net::TcpStream::connect(proxy_addr)
        .await
        .map_err(|e| format!("代理 TCP 连接失败 {}:{} - {}", proxy.host, proxy.port, e))?;

    let target = format!("{}:{}", target_host, target_port);
    let mut request = format!(
        "CONNECT {} HTTP/1.1\r\nHost: {}\r\nProxy-Connection: Keep-Alive\r\n",
        target, target
    );

    if let Some(username) = proxy.username.as_deref().filter(|value| !value.is_empty()) {
        let password = proxy.password.as_deref().unwrap_or("");
        let encoded = STANDARD.encode(format!("{}:{}", username, password));
        request.push_str(&format!("Proxy-Authorization: Basic {}\r\n", encoded));
    }
    request.push_str("\r\n");

    tcp.write_all(request.as_bytes())
        .await
        .map_err(|e| format!("发送代理 CONNECT 请求失败: {}", e))?;

    let response = read_http_connect_response_async(&mut tcp).await?;
    let status_line = response.lines().next().unwrap_or_default().trim().to_string();
    if !(status_line.starts_with("HTTP/1.1 200") || status_line.starts_with("HTTP/1.0 200")) {
        return Err(format!("代理 CONNECT 失败: {}", status_line));
    }

    Ok(tcp)
}

pub fn connect_tcp(
    target_host: &str,
    target_port: u16,
    proxy: Option<&RuntimeProxy>,
    connect_timeout: Duration,
    io_timeout: Duration,
) -> Result<TcpStream, String> {
    let tcp = if let Some(proxy) = proxy {
        match normalize_proxy_type(proxy) {
            "socks5" => connect_via_socks5_proxy(proxy, target_host, target_port, connect_timeout, io_timeout)?,
            "http" => connect_via_http_proxy(proxy, target_host, target_port, connect_timeout, io_timeout)?,
            _ => match connect_via_socks5_proxy(proxy, target_host, target_port, connect_timeout, io_timeout) {
                Ok(tcp) => tcp,
                Err(_) => connect_via_http_proxy(proxy, target_host, target_port, connect_timeout, io_timeout)?,
            },
        }
    } else {
        let addr = resolve_socket_addr(target_host, target_port)?;
        TcpStream::connect_timeout(&addr, connect_timeout)
            .map_err(|e| format!("TCP 连接失败 {}:{} - {}", target_host, target_port, e))?
    };

    tcp.set_read_timeout(Some(io_timeout)).ok();
    tcp.set_write_timeout(Some(io_timeout)).ok();
    Ok(tcp)
}

pub async fn connect_tokio_tcp(
    target_host: &str,
    target_port: u16,
    proxy: Option<&RuntimeProxy>,
) -> Result<tokio::net::TcpStream, String> {
    if let Some(proxy) = proxy {
        return match normalize_proxy_type(proxy) {
            "socks5" => connect_via_socks5_proxy_async(proxy, target_host, target_port).await,
            "http" => connect_via_http_proxy_async(proxy, target_host, target_port).await,
            _ => match connect_via_socks5_proxy_async(proxy, target_host, target_port).await {
                Ok(tcp) => Ok(tcp),
                Err(_) => connect_via_http_proxy_async(proxy, target_host, target_port).await,
            },
        };
    }

    let addr = resolve_socket_addr_async(target_host, target_port).await?;
    tokio::net::TcpStream::connect(addr)
        .await
        .map_err(|e| format!("TCP 连接失败 {}:{} - {}", target_host, target_port, e))
}

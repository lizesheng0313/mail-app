//! Optional browser-workflow component lifecycle.
//!
//! This module is intentionally not called from app startup or mailbox commands.
//! The web workflow page calls it only when a browser action is requested.

use log::{info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use url::Url;

const AGENT_BASE_URL: &str = "http://127.0.0.1:19201";
const HEALTH_URL: &str = "http://127.0.0.1:19201/health";
const PROGRESS_EVENT: &str = "browser-workflow-component-progress";

#[derive(Default)]
pub struct BrowserWorkflowComponentState {
    pub operation: Mutex<()>,
    pub cancel_requested: AtomicBool,
    pub agent_process: Mutex<Option<Child>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BrowserWorkflowComponentStatus {
    pub installed: bool,
    pub running: bool,
    pub agent_ready: bool,
    pub version: Option<String>,
    pub latest_version: Option<String>,
    pub update_available: bool,
    pub protocol_version: Option<String>,
    pub install_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
struct ComponentManifest {
    version: String,
    #[serde(default)]
    agent_command: Option<String>,
    #[serde(default)]
    agent_args: Vec<String>,
    #[serde(default = "default_protocol_version")]
    protocol_version: String,
}

#[derive(Debug, Clone, Deserialize)]
struct AgentHealth {
    #[serde(default)]
    status: String,
    #[serde(default)]
    protocol_version: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct ComponentReleaseChannel {
    schema_version: String,
    version: String,
    protocol_version: String,
    platforms: HashMap<String, ComponentReleaseArtifact>,
}

#[derive(Debug, Clone, Deserialize)]
struct ComponentReleaseArtifact {
    url: String,
    sha256: String,
    #[serde(default)]
    size: Option<u64>,
}

fn default_protocol_version() -> String {
    "browser-agent/1".to_string()
}

#[derive(Debug, Clone, Serialize)]
struct ProgressPayload {
    stage: String,
    downloaded: u64,
    total: Option<u64>,
    message: String,
}

fn component_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|err| format!("无法获取浏览器组件目录: {err}"))?;
    Ok(base.join("browser-workflow-component"))
}

fn component_package_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(component_dir(app)?.join("package"))
}

fn validate_component_download_url(value: &str) -> Result<Url, String> {
    let url = Url::parse(value).map_err(|err| format!("浏览器组件下载地址无效: {err}"))?;
    if !url.username().is_empty() || url.password().is_some() {
        return Err("浏览器组件下载地址不能包含账号或密码".to_string());
    }
    let loopback_http =
        url.scheme() == "http" && matches!(url.host_str(), Some("127.0.0.1" | "localhost" | "::1"));
    if url.scheme() != "https" && !loopback_http {
        return Err("浏览器组件下载地址必须使用 HTTPS".to_string());
    }
    Ok(url)
}

fn platform_release_key() -> Result<&'static str, String> {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        return Ok("macos-arm64");
    }
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    {
        return Ok("macos-x86_64");
    }
    #[allow(unreachable_code)]
    Err("当前系统还没有可用的浏览器组件发行包".to_string())
}

fn validate_release_artifact(
    channel: &ComponentReleaseChannel,
) -> Result<ComponentReleaseArtifact, String> {
    if channel.schema_version != "browser-component-release/1"
        || channel.protocol_version != default_protocol_version()
    {
        return Err("浏览器组件渠道协议与当前桌面端不兼容".to_string());
    }
    let mut artifact = channel
        .platforms
        .get(platform_release_key()?)
        .cloned()
        .ok_or_else(|| "浏览器组件渠道没有当前系统对应的安装包".to_string())?;
    validate_component_download_url(&artifact.url)?;
    artifact.sha256 = artifact.sha256.trim().to_ascii_lowercase();
    if artifact.sha256.len() != 64 || !artifact.sha256.chars().all(|item| item.is_ascii_hexdigit())
    {
        return Err("浏览器组件渠道中的 SHA-256 无效".to_string());
    }
    Ok(artifact)
}

fn version_parts(value: &str) -> Vec<u64> {
    value
        .split(|character: char| !character.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .map(|part| part.parse::<u64>().unwrap_or(0))
        .collect()
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    let mut latest_parts = version_parts(latest);
    let mut current_parts = version_parts(current);
    let width = latest_parts.len().max(current_parts.len());
    latest_parts.resize(width, 0);
    current_parts.resize(width, 0);
    latest_parts > current_parts
}

async fn fetch_release_channel() -> Result<Option<ComponentReleaseChannel>, String> {
    let Some(channel_url) = option_env!("BROWSER_WORKFLOW_COMPONENT_RELEASE_URL") else {
        return Ok(None);
    };
    let channel_url = validate_component_download_url(channel_url)?;
    Client::new()
        .get(channel_url)
        .timeout(Duration::from_secs(3))
        .send()
        .await
        .map_err(|err| format!("读取浏览器组件渠道失败: {err}"))?
        .error_for_status()
        .map_err(|err| format!("读取浏览器组件渠道失败: {err}"))?
        .json::<ComponentReleaseChannel>()
        .await
        .map(Some)
        .map_err(|err| format!("浏览器组件渠道格式无效: {err}"))
}

async fn resolve_release_artifact() -> Result<(ComponentReleaseArtifact, Option<String>), String> {
    if let Some(channel) = fetch_release_channel().await? {
        let version = channel.version.clone();
        return Ok((validate_release_artifact(&channel)?, Some(version)));
    }
    let url = option_env!("BROWSER_WORKFLOW_COMPONENT_URL")
        .ok_or_else(|| "浏览器组件下载地址尚未配置，请先发布浏览器组件包".to_string())?;
    let sha256 = option_env!("BROWSER_WORKFLOW_COMPONENT_SHA256")
        .ok_or_else(|| "浏览器组件 SHA-256 尚未配置，拒绝安装未校验的组件包".to_string())?;
    let channel = ComponentReleaseChannel {
        schema_version: "browser-component-release/1".to_string(),
        version: option_env!("BROWSER_WORKFLOW_COMPONENT_VERSION")
            .unwrap_or("0.0.0")
            .to_string(),
        protocol_version: default_protocol_version(),
        platforms: HashMap::from([(
            platform_release_key()?.to_string(),
            ComponentReleaseArtifact {
                url: url.to_string(),
                sha256: sha256.to_string(),
                size: None,
            },
        )]),
    };
    let version = channel.version.clone();
    Ok((validate_release_artifact(&channel)?, Some(version)))
}

fn sha256_file(path: &Path) -> Result<String, String> {
    let output = std::process::Command::new("/usr/bin/shasum")
        .arg("-a")
        .arg("256")
        .arg(path)
        .output()
        .map_err(|err| format!("启动组件完整性校验失败: {err}"))?;
    if !output.status.success() {
        return Err("浏览器组件完整性校验失败".to_string());
    }
    let stdout =
        String::from_utf8(output.stdout).map_err(|_| "组件校验结果编码无效".to_string())?;
    stdout
        .split_whitespace()
        .next()
        .map(str::to_ascii_lowercase)
        .filter(|value| value.len() == 64 && value.chars().all(|item| item.is_ascii_hexdigit()))
        .ok_or_else(|| "组件校验结果格式无效".to_string())
}

fn extract_component_archive(archive_path: &Path, destination: &Path) -> Result<(), String> {
    let listing = std::process::Command::new("/usr/bin/unzip")
        .arg("-Z1")
        .arg(archive_path)
        .output()
        .map_err(|err| format!("读取组件压缩包目录失败: {err}"))?;
    if !listing.status.success() {
        return Err("浏览器组件不是有效的 ZIP 压缩包".to_string());
    }
    let entries =
        String::from_utf8(listing.stdout).map_err(|_| "组件压缩包文件名编码无效".to_string())?;
    for entry in entries.lines() {
        let path = Path::new(entry);
        let unsafe_path = path.is_absolute()
            || path.components().any(|part| {
                matches!(
                    part,
                    std::path::Component::ParentDir
                        | std::path::Component::RootDir
                        | std::path::Component::Prefix(_)
                )
            });
        if entry.is_empty() || entry.contains('\0') || unsafe_path {
            return Err("组件压缩包包含非法路径".to_string());
        }
    }

    std::fs::create_dir_all(destination).map_err(|err| format!("创建组件安装目录失败: {err}"))?;
    let extracted = std::process::Command::new("/usr/bin/ditto")
        .arg("-x")
        .arg("-k")
        .arg(archive_path)
        .arg(destination)
        .output()
        .map_err(|err| format!("启动组件解压失败: {err}"))?;
    if !extracted.status.success() {
        return Err("解压浏览器组件失败".to_string());
    }
    validate_component_symlinks(destination)?;
    Ok(())
}

fn replace_component_package(staging_path: &Path, package_path: &Path) -> Result<(), String> {
    let parent = package_path
        .parent()
        .ok_or_else(|| "浏览器组件安装目录无效".to_string())?;
    let backup_path = parent.join("package.backup");
    if backup_path.exists() {
        std::fs::remove_dir_all(&backup_path)
            .map_err(|err| format!("清理浏览器组件备份失败: {err}"))?;
    }
    let had_previous = package_path.exists();
    if had_previous {
        std::fs::rename(package_path, &backup_path)
            .map_err(|err| format!("备份旧浏览器组件失败: {err}"))?;
    }
    if let Err(err) = std::fs::rename(staging_path, package_path) {
        if had_previous {
            let _ = std::fs::rename(&backup_path, package_path);
        }
        return Err(format!("保存浏览器组件失败，已恢复原版本: {err}"));
    }
    if had_previous {
        std::fs::remove_dir_all(&backup_path)
            .map_err(|err| format!("浏览器组件已更新，但清理旧版本失败: {err}"))?;
    }
    Ok(())
}

fn validate_component_symlinks(root: &Path) -> Result<(), String> {
    let canonical_root =
        std::fs::canonicalize(root).map_err(|err| format!("检查组件目录失败: {err}"))?;
    validate_component_symlinks_in(root, &canonical_root)
}

fn validate_component_symlinks_in(directory: &Path, canonical_root: &Path) -> Result<(), String> {
    for entry in std::fs::read_dir(directory).map_err(|err| format!("检查组件目录失败: {err}"))?
    {
        let entry = entry.map_err(|err| format!("检查组件文件失败: {err}"))?;
        let metadata = std::fs::symlink_metadata(entry.path())
            .map_err(|err| format!("检查组件文件失败: {err}"))?;
        if metadata.file_type().is_symlink() {
            let resolved = std::fs::canonicalize(entry.path())
                .map_err(|err| format!("组件包包含无效符号链接: {err}"))?;
            if !resolved.starts_with(canonical_root) {
                return Err("组件包中的符号链接不能指向安装目录外部".to_string());
            }
        }
        if metadata.is_dir() {
            validate_component_symlinks_in(&entry.path(), canonical_root)?;
        }
    }
    Ok(())
}

async fn agent_health() -> Option<AgentHealth> {
    let health = Client::new()
        .get(HEALTH_URL)
        .timeout(Duration::from_millis(700))
        .send()
        .await
        .ok()?
        .error_for_status()
        .ok()?
        .json::<AgentHealth>()
        .await
        .ok()?;
    if matches!(health.status.as_str(), "ok" | "ready")
        && health.protocol_version.as_deref() == Some("browser-agent/1")
    {
        Some(health)
    } else {
        None
    }
}

async fn read_manifest(dir: &Path) -> Option<ComponentManifest> {
    let marker = dir.join("component.json");
    serde_json::from_str::<ComponentManifest>(&fs::read_to_string(marker).await.ok()?).ok()
}

async fn resolve_agent_command(
    dir: &Path,
    manifest: &ComponentManifest,
) -> Result<PathBuf, String> {
    let command = manifest
        .agent_command
        .as_deref()
        .ok_or_else(|| "浏览器组件缺少 Browser Agent 启动器，请重新安装完整组件包".to_string())?;
    let candidate = PathBuf::from(command);
    if candidate.is_absolute() {
        return Err("浏览器组件的 Agent 启动器必须位于组件目录内".to_string());
    }
    let base = fs::canonicalize(dir)
        .await
        .map_err(|err| format!("无法读取浏览器组件目录: {err}"))?;
    let resolved = fs::canonicalize(base.join(candidate))
        .await
        .map_err(|err| format!("浏览器组件缺少 Agent 启动器: {err}"))?;
    if !resolved.starts_with(&base) {
        return Err("浏览器组件的 Agent 启动器路径无效".to_string());
    }
    Ok(resolved)
}

#[tauri::command]
pub async fn browser_workflow_component_status(
    app: AppHandle,
) -> Result<BrowserWorkflowComponentStatus, String> {
    let dir = component_package_dir(&app)?;
    let manifest = read_manifest(&dir).await;
    let installed = match manifest.as_ref() {
        Some(item) if item.protocol_version == default_protocol_version() => {
            resolve_agent_command(&dir, item).await.is_ok()
        }
        _ => false,
    };
    let health = agent_health().await;
    let latest_version = match fetch_release_channel().await {
        Ok(Some(channel)) if validate_release_artifact(&channel).is_ok() => Some(channel.version),
        Ok(_) => None,
        Err(err) => {
            warn!("无法读取浏览器组件更新渠道: {err}");
            None
        }
    };
    let current_version = manifest.as_ref().map(|item| item.version.clone());
    let update_available = match (&latest_version, &current_version) {
        (Some(latest), Some(current)) => is_newer_version(latest, current),
        _ => false,
    };
    Ok(BrowserWorkflowComponentStatus {
        installed,
        running: health.is_some(),
        agent_ready: health.is_some(),
        version: current_version,
        latest_version,
        update_available,
        protocol_version: health
            .and_then(|item| item.protocol_version)
            .or_else(|| manifest.map(|item| item.protocol_version)),
        install_path: dir.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn install_browser_workflow_component(
    app: AppHandle,
    state: State<'_, BrowserWorkflowComponentState>,
) -> Result<BrowserWorkflowComponentStatus, String> {
    let _guard = state.operation.lock().await;
    state.cancel_requested.store(false, Ordering::SeqCst);
    if agent_health().await.is_some() {
        return Err("浏览器组件正在运行，请先停止后再安装或升级".to_string());
    }
    let (release, _) = resolve_release_artifact().await?;
    let download_url = validate_component_download_url(&release.url)?;
    let expected_sha256 = release.sha256.clone();
    let dir = component_dir(&app)?;
    fs::create_dir_all(&dir)
        .await
        .map_err(|err| format!("创建组件目录失败: {err}"))?;
    let temporary_path = dir.join("component.download.zip");
    let staging_path = dir.join("package.installing");
    let package_path = dir.join("package");
    let client = Client::new();
    let mut response = client
        .get(download_url)
        .send()
        .await
        .map_err(|err| format!("下载浏览器组件失败: {err}"))?;
    if !response.status().is_success() {
        return Err(format!("下载浏览器组件失败，HTTP {}", response.status()));
    }
    let total = response.content_length();
    if let (Some(expected), Some(actual)) = (release.size, total) {
        if expected != actual {
            return Err("浏览器组件下载大小与渠道描述不一致".to_string());
        }
    }
    let mut downloaded = 0_u64;
    let mut file = fs::File::create(&temporary_path)
        .await
        .map_err(|err| format!("创建下载文件失败: {err}"))?;
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|err| format!("读取组件下载流失败: {err}"))?
    {
        if state.cancel_requested.load(Ordering::SeqCst) {
            let _ = fs::remove_file(&temporary_path).await;
            let _ = app.emit(
                PROGRESS_EVENT,
                ProgressPayload {
                    stage: "cancelled".to_string(),
                    downloaded,
                    total,
                    message: "已取消本次浏览器组件下载".to_string(),
                },
            );
            return Err("浏览器组件下载已取消".to_string());
        }
        file.write_all(&chunk)
            .await
            .map_err(|err| format!("写入组件文件失败: {err}"))?;
        downloaded += chunk.len() as u64;
        let _ = app.emit(
            PROGRESS_EVENT,
            ProgressPayload {
                stage: "downloading".to_string(),
                downloaded,
                total,
                message: "正在下载浏览器组件".to_string(),
            },
        );
    }
    file.flush()
        .await
        .map_err(|err| format!("刷新组件文件失败: {err}"))?;
    drop(file);
    let archive_for_hash = temporary_path.clone();
    let actual_sha256 = tokio::task::spawn_blocking(move || sha256_file(&archive_for_hash))
        .await
        .map_err(|err| format!("组件完整性校验任务失败: {err}"))??;
    if actual_sha256 != expected_sha256 {
        let _ = fs::remove_file(&temporary_path).await;
        return Err("浏览器组件 SHA-256 不匹配，下载文件已删除".to_string());
    }
    let _ = app.emit(
        PROGRESS_EVENT,
        ProgressPayload {
            stage: "installing".to_string(),
            downloaded,
            total,
            message: "正在安装浏览器组件".to_string(),
        },
    );
    if fs::try_exists(&staging_path).await.unwrap_or(false) {
        fs::remove_dir_all(&staging_path)
            .await
            .map_err(|err| format!("清理临时安装目录失败: {err}"))?;
    }
    let archive = temporary_path.clone();
    let staging = staging_path.clone();
    tokio::task::spawn_blocking(move || extract_component_archive(&archive, &staging))
        .await
        .map_err(|err| format!("安装组件任务失败: {err}"))??;
    let manifest = read_manifest(&staging_path)
        .await
        .ok_or_else(|| "组件包缺少有效的 component.json".to_string())?;
    if manifest.protocol_version != default_protocol_version() {
        return Err("组件包协议版本与当前桌面端不兼容".to_string());
    }
    resolve_agent_command(&staging_path, &manifest).await?;
    let staging_for_replace = staging_path.clone();
    let package_for_replace = package_path.clone();
    tokio::task::spawn_blocking(move || {
        replace_component_package(&staging_for_replace, &package_for_replace)
    })
    .await
    .map_err(|err| format!("替换浏览器组件任务失败: {err}"))??;
    let _ = fs::remove_file(&temporary_path).await;
    info!("浏览器工作流组件已安装: {}", package_path.display());
    let _ = app.emit(
        PROGRESS_EVENT,
        ProgressPayload {
            stage: "installed".to_string(),
            downloaded,
            total,
            message: "浏览器组件已安装".to_string(),
        },
    );
    browser_workflow_component_status(app).await
}

#[tauri::command]
pub async fn cancel_browser_workflow_component_download(
    state: State<'_, BrowserWorkflowComponentState>,
) -> Result<(), String> {
    state.cancel_requested.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn stop_browser_workflow_component(
    app: AppHandle,
    state: State<'_, BrowserWorkflowComponentState>,
) -> Result<BrowserWorkflowComponentStatus, String> {
    if agent_health().await.is_some() {
        let _ = Client::new()
            .post(format!("{AGENT_BASE_URL}/v1/agent/shutdown"))
            .timeout(Duration::from_secs(7))
            .json(&serde_json::json!({}))
            .send()
            .await;
    }
    for _ in 0..20 {
        if agent_health().await.is_none() {
            break;
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    let mut process = state.agent_process.lock().await;
    if let Some(mut child) = process.take() {
        if child
            .try_wait()
            .map_err(|err| format!("读取 Browser Agent 状态失败: {err}"))?
            .is_none()
        {
            child
                .kill()
                .await
                .map_err(|err| format!("停止 Browser Agent 失败: {err}"))?;
        }
    }
    drop(process);
    browser_workflow_component_status(app).await
}

#[tauri::command]
pub async fn start_browser_workflow_component(
    app: AppHandle,
    state: State<'_, BrowserWorkflowComponentState>,
) -> Result<BrowserWorkflowComponentStatus, String> {
    let status = browser_workflow_component_status(app.clone()).await?;
    if !status.installed {
        return Err("浏览器组件尚未安装".to_string());
    }
    if status.running {
        return Ok(status);
    }
    let component_root = component_dir(&app)?;
    let package_dir = component_package_dir(&app)?;
    let manifest = read_manifest(&package_dir)
        .await
        .ok_or_else(|| "浏览器组件安装信息损坏，请重新安装".to_string())?;
    let command = resolve_agent_command(&package_dir, &manifest).await?;

    let mut process = state.agent_process.lock().await;
    if let Some(child) = process.as_mut() {
        if child
            .try_wait()
            .map_err(|err| format!("读取 Browser Agent 状态失败: {err}"))?
            .is_none()
        {
            warn!("Browser Agent 进程仍在启动，等待健康检查");
        } else {
            *process = None;
        }
    }
    if process.is_none() {
        let child = Command::new(&command)
            .args(&manifest.agent_args)
            .current_dir(&package_dir)
            .env("FMM_BROWSER_COMPONENT_DIR", &component_root)
            .env("FMM_BROWSER_AGENT_PORT", "19201")
            .spawn()
            .map_err(|err| format!("启动 Browser Agent 失败: {err}"))?;
        *process = Some(child);
        info!("已启动 Browser Agent: {}", command.display());
    }
    drop(process);

    for _ in 0..30 {
        tokio::time::sleep(Duration::from_millis(200)).await;
        if agent_health().await.is_some() {
            return browser_workflow_component_status(app).await;
        }
    }

    let mut process = state.agent_process.lock().await;
    if let Some(mut child) = process.take() {
        let _ = child.kill().await;
    }
    Err("Browser Agent 启动后未完成本机握手，请检查组件包和 19201 端口".to_string())
}

#[cfg(test)]
mod tests {
    use super::{
        is_newer_version, replace_component_package, validate_component_download_url,
        validate_release_artifact, ComponentReleaseChannel,
    };
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn component_download_requires_https_except_for_loopback_development() {
        assert!(
            validate_component_download_url("https://downloads.example.com/browser.zip").is_ok()
        );
        assert!(validate_component_download_url("http://127.0.0.1:9999/browser.zip").is_ok());
        assert!(validate_component_download_url("http://localhost:9999/browser.zip").is_ok());
        assert!(
            validate_component_download_url("http://downloads.example.com/browser.zip").is_err()
        );
    }

    #[test]
    fn component_download_rejects_embedded_credentials() {
        assert!(validate_component_download_url(
            "https://user:secret@downloads.example.com/browser.zip"
        )
        .is_err());
    }

    #[test]
    fn component_version_comparison_handles_numeric_segments() {
        assert!(is_newer_version("1.2.0", "1.1.9"));
        assert!(is_newer_version("2.0.0", "1.99.99"));
        assert!(!is_newer_version("1.0.0", "1.0.0"));
        assert!(!is_newer_version("1.0.0", "1.0.1"));
    }

    #[test]
    fn release_channel_requires_matching_protocol_and_platform() {
        let channel: ComponentReleaseChannel = serde_json::from_str(
            r#"{
                "schema_version": "browser-component-release/1",
                "version": "1.0.0",
                "protocol_version": "browser-agent/1",
                "platforms": {
                    "macos-arm64": {
                        "url": "https://downloads.example.com/browser.zip",
                        "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                        "size": 123
                    }
                }
            }"#,
        )
        .expect("channel fixture should parse");

        assert!(validate_release_artifact(&channel).is_ok());
    }

    #[test]
    fn component_upgrade_replaces_package_and_removes_backup() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be valid")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "browser-component-replace-{}-{unique}",
            std::process::id()
        ));
        let package = root.join("package");
        let staging = root.join("package.installing");
        std::fs::create_dir_all(&package).expect("old package should be created");
        std::fs::create_dir_all(&staging).expect("staging package should be created");
        std::fs::write(package.join("version.txt"), "old").expect("old marker should be written");
        std::fs::write(staging.join("version.txt"), "new").expect("new marker should be written");

        replace_component_package(&staging, &package).expect("package replacement should succeed");

        assert_eq!(
            std::fs::read_to_string(package.join("version.txt")).expect("new marker should exist"),
            "new"
        );
        assert!(!root.join("package.backup").exists());
        assert!(!staging.exists());
        std::fs::remove_dir_all(root).expect("temporary test directory should be removed");
    }
}

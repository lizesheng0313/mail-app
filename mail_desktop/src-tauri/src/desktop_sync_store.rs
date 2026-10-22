//! Durable, per-account checkpoints. A pending batch is saved before upload;
//! its cursor is committed only after the API acknowledges the transaction.
use crate::mail::types::EmailData;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

#[derive(Clone, Default, Serialize, Deserialize)]
pub struct SyncState {
    pub revision: u64,
    pub initialized: bool,
    pub cursor: Option<Value>,
    pub pending: Option<PendingSync>,
    pub status_confirmed: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct PendingSync {
    pub emails: Vec<EmailData>,
    pub cursor: Option<Value>,
}

pub fn scope_path(server_url: &str, token: &str, mailbox_id: i64) -> Result<PathBuf, String> {
    // Claims select local storage only. The server still authenticates every upload.
    if mailbox_id <= 0 || token.is_empty() {
        return Err("无效的邮箱或登录令牌".into());
    }
    let user_id = token
        .split('.')
        .nth(1)
        .and_then(|claims| URL_SAFE_NO_PAD.decode(claims).ok())
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .and_then(|claims| claims["user_id"].as_u64())
        .filter(|id| *id > 0);
    let mut hash = Sha256::new();
    hash.update(server_url.trim_end_matches('/').as_bytes());
    hash.update([0]);
    match user_id {
        Some(id) => {
            hash.update(b"user:");
            hash.update(id.to_be_bytes());
        }
        // Open-platform local collection uses opaque API keys. Keep a separate
        // namespace; the key is never stored in the journal or a filename.
        None => {
            hash.update(b"key:");
            hash.update(token.as_bytes());
        }
    }
    let root = dirs::data_local_dir().ok_or("无法定位桌面数据目录")?;
    Ok(root
        .join("fatcat-mail/desktop-sync/v1")
        .join(format!("{:x}", hash.finalize()))
        .join(mailbox_id.to_string()))
}

type MailboxLocks = Mutex<HashMap<PathBuf, std::sync::Weak<tokio::sync::Mutex<()>>>>;
static LOCKS: OnceLock<MailboxLocks> = OnceLock::new();
pub async fn lock(path: &Path) -> tokio::sync::OwnedMutexGuard<()> {
    let mutex = {
        let mut locks = LOCKS
            .get_or_init(|| Mutex::new(HashMap::new()))
            .lock()
            .unwrap();
        locks.retain(|_, lock| lock.strong_count() > 0);
        let mutex = locks
            .get(path)
            .and_then(|lock| lock.upgrade())
            .unwrap_or_else(|| Arc::new(tokio::sync::Mutex::new(())));
        locks.insert(path.to_path_buf(), Arc::downgrade(&mutex));
        mutex
    };
    mutex.lock_owned().await
}

pub fn load(path: &Path) -> Result<SyncState, String> {
    let mut valid = Vec::new();
    let mut existed = false;
    for slot in 0..2 {
        let file = path.join(format!("state.{slot}.json"));
        match std::fs::read(&file) {
            Ok(bytes) => {
                existed = true;
                if let Ok(state) = serde_json::from_slice::<SyncState>(&bytes) {
                    valid.push(state);
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(format!("读取本地同步记录失败: {error}")),
        }
    }
    match valid.into_iter().max_by_key(|state| state.revision) {
        Some(state) => Ok(state),
        None if existed => Err("本地同步记录损坏，已停止推进游标".into()),
        None => Ok(SyncState::default()),
    }
}

pub fn save(path: &Path, state: &mut SyncState) -> Result<(), String> {
    fn write(path: &Path, state: &SyncState) -> Result<(), Box<dyn std::error::Error>> {
        std::fs::create_dir_all(path)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))?;
        }
        let target = path.join(format!("state.{}.json", state.revision % 2));
        let temporary = path.join("state.tmp");
        let mut options = std::fs::OpenOptions::new();
        options.create(true).write(true).truncate(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&temporary)?;
        file.write_all(&serde_json::to_vec(state)?)?;
        file.sync_all()?;
        // The other slot always retains the latest complete state, including on
        // Windows where rename cannot replace an existing destination.
        if target.exists() {
            std::fs::remove_file(&target)?;
        }
        std::fs::rename(temporary, target)?;
        #[cfg(unix)]
        std::fs::File::open(path)?.sync_all()?;
        Ok(())
    }
    state.revision += 1;
    write(path, state).map_err(|error| format!("保存本地同步记录失败: {error}"))
}

pub fn needs_upload(
    state: &SyncState,
    emails: &[EmailData],
    cursor: Option<&Value>,
    force_status: bool,
) -> bool {
    !emails.is_empty() || cursor != state.cursor.as_ref() || !state.status_confirmed || force_status
}

pub fn acknowledge(state: &mut SyncState) {
    if let Some(pending) = state.pending.take() {
        state.cursor = pending.cursor;
    }
    state.initialized = true;
    state.status_confirmed = true;
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn test_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "mail-sync-{}-{}-{name}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ))
    }
    #[test]
    fn unchanged_empty_check_needs_no_upload() {
        let state = SyncState {
            initialized: true,
            status_confirmed: true,
            cursor: Some(json!({"uid": 10})),
            ..Default::default()
        };
        assert!(!needs_upload(&state, &[], state.cursor.as_ref(), false));
        assert!(needs_upload(&state, &[], Some(&json!({"uid": 11})), false));
        assert!(needs_upload(&state, &[], state.cursor.as_ref(), true));
    }
    #[test]
    fn failed_upload_survives_restart_without_advancing_cursor() {
        let path = test_path("pending");
        let mut state = SyncState {
            initialized: true,
            cursor: Some(json!({"uid": 10})),
            ..Default::default()
        };
        state.pending = Some(PendingSync {
            emails: vec![],
            cursor: Some(json!({"uid": 11})),
        });
        save(&path, &mut state).unwrap();
        let mut restored = load(&path).unwrap();
        assert_eq!(restored.cursor, Some(json!({"uid": 10})));
        assert_eq!(
            restored.pending.as_ref().unwrap().cursor,
            Some(json!({"uid": 11}))
        );
        acknowledge(&mut restored);
        save(&path, &mut restored).unwrap();
        assert_eq!(load(&path).unwrap().cursor, Some(json!({"uid": 11})));
        assert!(load(&path).unwrap().pending.is_none());
        std::fs::remove_dir_all(path).unwrap();
    }
    #[test]
    fn interrupted_write_preserves_last_complete_batch() {
        let path = test_path("interrupted");
        let mut state = SyncState::default();
        state.pending = Some(PendingSync {
            emails: vec![],
            cursor: Some(json!({"uid": 9})),
        });
        save(&path, &mut state).unwrap();
        std::fs::write(path.join("state.0.json"), b"{").unwrap();
        assert!(load(&path).unwrap().pending.is_some());
        std::fs::remove_dir_all(path).unwrap();
    }
    #[test]
    fn user_and_server_partition_storage_but_session_rotation_does_not() {
        let token = |id, sid| {
            format!(
                "a.{}.c",
                URL_SAFE_NO_PAD.encode(json!({"user_id": id, "sid": sid}).to_string())
            )
        };
        let first = scope_path("https://example.test/api/", &token(1, "a"), 2).unwrap();
        assert_eq!(
            first,
            scope_path("https://example.test/api", &token(1, "b"), 2).unwrap()
        );
        assert_ne!(
            first,
            scope_path("https://example.test/api", &token(2, "a"), 2).unwrap()
        );
        assert_ne!(
            first,
            scope_path("https://other.test/api", &token(1, "a"), 2).unwrap()
        );
    }
}

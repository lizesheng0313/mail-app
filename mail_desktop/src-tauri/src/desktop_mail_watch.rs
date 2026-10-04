use crate::mail::{imap, types::RuntimeProxy};
use log::{info, warn};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use tauri::{AppHandle, Emitter, State};

const EVENT_NAME: &str = "desktop-imap-watch";

#[derive(Default)]
pub struct DesktopMailWatchState {
    watches: Arc<Mutex<HashMap<i64, (u64, Arc<AtomicBool>)>>>,
    next_generation: AtomicU64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WatchEvent {
    mailbox_id: i64,
    generation: u64,
    status: &'static str,
}

fn emit(app: &AppHandle, mailbox_id: i64, generation: u64, status: &'static str) {
    let _ = app.emit(
        EVENT_NAME,
        WatchEvent {
            mailbox_id,
            generation,
            status,
        },
    );
}

/// Starts one cancellable watcher per mailbox. Only the current generation may emit events.
#[tauri::command]
pub fn start_imap_watch(
    app: AppHandle,
    state: State<'_, DesktopMailWatchState>,
    mailbox_id: i64,
    email: String,
    password: String,
    host: String,
    port: u16,
    access_token: Option<String>,
    proxy: Option<RuntimeProxy>,
) -> Result<u64, String> {
    if mailbox_id <= 0 || !email.contains('@') || host.trim().is_empty() || port == 0 {
        return Err("IMAP 监听参数无效".to_string());
    }

    let generation = state.next_generation.fetch_add(1, Ordering::Relaxed) + 1;
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut watches = state.watches.lock().map_err(|_| "监听状态不可用")?;
        if let Some((_, old)) = watches.insert(mailbox_id, (generation, cancelled.clone())) {
            old.store(true, Ordering::Relaxed);
        }
    }

    let watches = state.watches.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let current = || {
            !cancelled.load(Ordering::Relaxed)
                && watches
                    .lock()
                    .ok()
                    .and_then(|map| map.get(&mailbox_id).map(|(id, _)| *id))
                    == Some(generation)
        };
        let result = imap::watch_inbox(
            &email,
            &password,
            &host,
            port,
            access_token.as_deref(),
            proxy.as_ref(),
            &cancelled,
            || {
                if current() {
                    emit(&app, mailbox_id, generation, "changed");
                }
            },
            || {
                if current() {
                    info!("IMAP IDLE mailbox {} ready", mailbox_id);
                    emit(&app, mailbox_id, generation, "ready");
                }
            },
        );
        if current() {
            match result {
                Ok(false) => {
                    info!(
                        "IMAP IDLE mailbox {} unsupported; using interval fallback",
                        mailbox_id
                    );
                    emit(&app, mailbox_id, generation, "unsupported");
                }
                Ok(true) => emit(&app, mailbox_id, generation, "disconnected"),
                Err(error) => {
                    warn!("IMAP IDLE mailbox {} stopped: {}", mailbox_id, error);
                    emit(&app, mailbox_id, generation, "disconnected");
                }
            }
            if let Ok(mut map) = watches.lock() {
                if map.get(&mailbox_id).map(|(id, _)| *id) == Some(generation) {
                    map.remove(&mailbox_id);
                }
            }
        }
    });

    Ok(generation)
}

#[tauri::command]
pub fn stop_imap_watch(
    state: State<'_, DesktopMailWatchState>,
    mailbox_id: i64,
    generation: Option<u64>,
) {
    if let Ok(mut watches) = state.watches.lock() {
        if watches
            .get(&mailbox_id)
            .is_some_and(|(id, _)| generation.map_or(true, |expected| expected == *id))
        {
            if let Some((_, cancelled)) = watches.remove(&mailbox_id) {
                cancelled.store(true, Ordering::Relaxed);
            }
        }
    }
}

#[tauri::command]
pub fn stop_all_imap_watches(state: State<'_, DesktopMailWatchState>) {
    if let Ok(mut watches) = state.watches.lock() {
        for (_, cancelled) in watches.values() {
            cancelled.store(true, Ordering::Relaxed);
        }
        watches.clear();
    }
}

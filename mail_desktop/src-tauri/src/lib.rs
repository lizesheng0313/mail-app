// 模块声明
mod commands;
mod mail;
mod oauth_callback_server;

use commands::{add_external_mailbox, check_for_update, download_and_install_update, download_attachment, fetch_emails, get_attachment_path, is_tauri, open_external_url, open_local_attachment, recover_and_fetch_external_mailbox, recover_external_mailbox_session, send_smtp_email};
use oauth_callback_server::start_oauth_callback_server;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("external-navigation")
                .on_navigation(|_webview, url| {
                    let host = url.host_str().unwrap_or_default();
                    let is_internal_host = matches!(
                        host,
                        "localhost" | "127.0.0.1" | "tauri.localhost" | "ipc.localhost"
                    );
                    let is_internal_scheme = matches!(url.scheme(), "tauri" | "about" | "data" | "blob");

                    if is_internal_scheme || is_internal_host {
                        return true;
                    }

                    let target = url.as_str().to_string();
                    log::info!("拦截外部导航并交给系统浏览器: {}", target);
                    if let Err(e) = open::that(&target) {
                        log::error!("系统浏览器打开失败: {} ({})", target, e);
                    }
                    false
                })
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
            start_oauth_callback_server(app.handle().clone());
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_external_mailbox,
            fetch_emails,
            recover_and_fetch_external_mailbox,
            recover_external_mailbox_session,
            is_tauri,
            check_for_update,
            download_and_install_update,
            open_local_attachment,
            get_attachment_path,
            download_attachment,
            open_external_url,
            send_smtp_email,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

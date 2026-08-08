fn main() {
    println!("cargo:rerun-if-env-changed=BROWSER_WORKFLOW_COMPONENT_RELEASE_URL");

    // 本地桌面端调试时直接读取仓库里的组件更新渠道，避免继续使用旧的内置组件。
    // 正式构建或显式配置了地址时，仍然使用外部传入的正式渠道。
    if std::env::var_os("BROWSER_WORKFLOW_COMPONENT_RELEASE_URL").is_none()
        && std::env::var("PROFILE").as_deref() == Ok("debug")
    {
        println!(
            "cargo:rustc-env=BROWSER_WORKFLOW_COMPONENT_RELEASE_URL=http://127.0.0.1:19876/channel.local.json"
        );
    }

    tauri_build::build()
}

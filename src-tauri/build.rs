fn main() {
    // The app's own commands (the read-only Outlook bridge and in-app updates) get permissions the Eight Voids pages are allowed in capabilities/default.json.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["outlook_folders", "outlook_read", "outlook_save_atts", "outlook_test", "update_download", "update_install"]),
        ),
    )
    .expect("failed to run tauri-build");
}

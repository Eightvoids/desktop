fn main() {
    // The app's own commands (the read-only Outlook bridge, in-app updates and giving drawing files their titles) get permissions the Eight Voids pages are allowed in capabilities/default.json.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["outlook_folders", "outlook_read", "outlook_save_atts", "outlook_test", "update_download", "update_install", "update_pending", "rename_in_folder", "sync_folders", "keep_folders"]),
        ),
    )
    .expect("failed to run tauri-build");
}

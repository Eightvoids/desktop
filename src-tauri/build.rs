fn main() {
    // The app's own commands (the read-only Outlook bridge) get permissions the Eight Voids pages are allowed in capabilities/default.json.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&["outlook_folders", "outlook_read", "outlook_save_atts"]),
        ),
    )
    .expect("failed to run tauri-build");
}

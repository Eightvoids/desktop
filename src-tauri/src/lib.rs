// Eight Voids app – one code base for Windows, macOS, iPhone / iPad and Android.
// One window that opens the Eight Voids sign-in, then the workspace from app.eightvoids.com.
// Desktop adds: taskbar/tray icon, one copy only, saving files to a linked folder (desk.js),
// and the Outlook bridge: reads the person's own classic Outlook on this computer (read only –
// never sends, moves or deletes anything) so their project emails reach Eight Voids without a
// Microsoft 365 admin approval.
// Phones and tablets add: the phone camera and photo library for site photos, notifications,
// outside links opening in the phone's browser (mob.js).

use tauri::{WebviewUrl, WebviewWindowBuilder};

#[cfg(desktop)]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
#[cfg(desktop)]
use tauri_plugin_notification::NotificationExt;

// Desktop behaviour added to every Eight Voids page shown in the window.
#[cfg(desktop)]
const DESK_JS: &str = include_str!("../desk.js");
// Phone / tablet behaviour added to every Eight Voids page shown in the app.
#[cfg(mobile)]
const MOB_JS: &str = include_str!("../mob.js");

#[cfg(desktop)]
static TOLD_TRAY: AtomicBool = AtomicBool::new(false);

// ---------- Outlook bridge (Windows, classic Outlook) – read only ----------
#[cfg(desktop)]
mod outlook {
    pub const COMMON: &str = include_str!("../ps/outlook_common.ps1");
    pub const FOLDERS: &str = include_str!("../ps/outlook_folders.ps1");
    pub const READ: &str = include_str!("../ps/outlook_read.ps1");
    pub const SAVE: &str = include_str!("../ps/outlook_save_atts.ps1");

    #[allow(dead_code)]
    fn b64(data: &[u8]) -> String {
        const T: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
        for c in data.chunks(3) {
            let b = [c[0], *c.get(1).unwrap_or(&0), *c.get(2).unwrap_or(&0)];
            let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
            out.push(T[(n >> 18) as usize & 63] as char);
            out.push(T[(n >> 12) as usize & 63] as char);
            out.push(if c.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
            out.push(if c.len() > 2 { T[n as usize & 63] as char } else { '=' });
        }
        out
    }

    /// Runs one of the fixed scripts above (never anything sent by a page) with its settings in environment variables.
    #[cfg(windows)]
    pub fn run(script: &str, envs: Vec<(&'static str, String)>) -> Result<String, String> {
        use std::os::windows::process::CommandExt;
        let full = format!("{}\n{}", COMMON, script);
        let utf16: Vec<u8> = full.encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
        let mut c = std::process::Command::new("powershell.exe");
        let enc = b64(&utf16);
        c.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc.as_str()]);
        for (k, v) in envs {
            c.env(k, v);
        }
        c.creation_flags(0x0800_0000); // no console window
        let o = c.output().map_err(|e| format!("PowerShell could not start: {e}"))?;
        if !o.status.success() {
            let err: String = String::from_utf8_lossy(&o.stderr).chars().take(400).collect();
            return Err(if err.trim().is_empty() { "Outlook did not answer – is classic Outlook open?".into() } else { err });
        }
        Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
    }

    #[cfg(not(windows))]
    pub fn run(_script: &str, _envs: Vec<(&'static str, String)>) -> Result<String, String> {
        Err("The Outlook bridge works on Windows with classic Outlook.".into())
    }
}

#[cfg(desktop)]
#[tauri::command]
async fn outlook_folders() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| outlook::run(outlook::FOLDERS, vec![]))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(desktop)]
#[tauri::command]
async fn outlook_read(since: String, folders: Vec<String>, max: u32) -> Result<String, String> {
    let f = serde_json::to_string(&folders).map_err(|e| e.to_string())?;
    let max = max.clamp(1, 1000).to_string();
    tauri::async_runtime::spawn_blocking(move || {
        outlook::run(outlook::READ, vec![("EV_SINCE", since), ("EV_FOLDERS", f), ("EV_MAX", max)])
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Saves one email's attachments into the app's own cache folder so the page can upload them; they are removed an hour later.
#[cfg(desktop)]
#[tauri::command]
async fn outlook_save_atts(app: AppHandle, entry: String) -> Result<String, String> {
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let dir = dir.to_string_lossy().to_string();
    tauri::async_runtime::spawn_blocking(move || outlook::run(outlook::SAVE, vec![("EV_ENTRY", entry), ("EV_DIR", dir)]))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(desktop)]
fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg(desktop)]
fn setup_main(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // The main window: starts on the Eight Voids sign-in screen.
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Eight Voids")
        .inner_size(1280.0, 800.0)
        .min_inner_size(1000.0, 660.0)
        .center()
        .maximized(true)
        .disable_drag_drop_handler()
        .initialization_script(DESK_JS)
        .build()?;

    // Attachments copied out of Outlook for upload are kept only briefly in the app's own cache folder.
    if let Ok(dir) = app.path().app_cache_dir() {
        std::thread::spawn(move || {
            if let Ok(list) = std::fs::read_dir(&dir) {
                for e in list.flatten() {
                    let old = e.metadata().and_then(|m| m.modified()).ok()
                        .and_then(|t| t.elapsed().ok()).map(|d| d.as_secs() > 3600).unwrap_or(false);
                    if old && e.file_name().to_string_lossy().starts_with("evatt-") {
                        let _ = std::fs::remove_dir_all(e.path());
                    }
                }
            }
        });
    }

    // Taskbar tray icon with a small menu.
    let open = MenuItem::with_id(app, "open", "Open Eight Voids", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Desktop settings…", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Eight Voids", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &settings, &sep, &quit])?;
    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Eight Voids")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main(app),
            "settings" => {
                show_main(app);
                let _ = app.emit("ev-settings", ());
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

#[cfg(mobile)]
fn setup_main(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    // Full-screen app window: starts on the Eight Voids sign-in screen.
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .initialization_script(MOB_JS)
        .build()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Desktop: opening the app a second time just brings the open window to the front.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        show_main(app);
    }));

    let builder = builder
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    // Desktop: remembers the folder the person linked.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_persisted_scope::init());

    let builder = builder
        .plugin(tauri_plugin_opener::init())
        .setup(|app| setup_main(app));

    // Desktop: the Outlook bridge (read only).
    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![outlook_folders, outlook_read, outlook_save_atts]);

    // On Windows, closing the main window keeps Eight Voids running in the tray
    // (like Teams), so notifications still arrive. Quit from the tray menu.
    #[cfg(desktop)]
    let builder = builder.on_window_event(|window, event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            if cfg!(windows) && window.label() == "main" {
                api.prevent_close();
                let _ = window.hide();
                if !TOLD_TRAY.swap(true, Ordering::SeqCst) {
                    let _ = window
                        .app_handle()
                        .notification()
                        .builder()
                        .title("Eight Voids is still running")
                        .body("You will keep getting notifications. To close it completely, right-click the Eight Voids icon in the taskbar tray and choose Quit.")
                        .show();
                }
            }
        }
    });

    builder
        .run(tauri::generate_context!())
        .expect("Eight Voids could not start");
}

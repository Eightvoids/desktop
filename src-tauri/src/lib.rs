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
    pub const TEST: &str = include_str!("../ps/outlook_test.ps1");

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
        ps(format!("{}\n{}", COMMON, script), envs, "Outlook did not answer – is classic Outlook open?")
    }

    /// Runs a fixed script without the Outlook helpers (used by the app update download).
    #[cfg(windows)]
    pub fn run_plain(script: &str, envs: Vec<(&'static str, String)>) -> Result<String, String> {
        ps(script.to_string(), envs, "The download did not finish – check the internet connection and try again.")
    }

    /// Starts a fixed script on its own (it keeps running after Eight Voids closes) – used to install an update.
    #[cfg(windows)]
    pub fn spawn_plain(script: &str, envs: Vec<(&'static str, String)>) -> Result<(), String> {
        use std::os::windows::process::CommandExt;
        let utf16: Vec<u8> = script.encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
        let mut c = std::process::Command::new("powershell.exe");
        let enc = b64(&utf16);
        c.args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc.as_str()]);
        for (k, v) in envs {
            c.env(k, v);
        }
        // no console window, own process group (keeps running after Eight Voids closes);
        // also leaves any job Eight Voids may run in, when Windows allows it
        c.creation_flags(0x0800_0000 | 0x0000_0200 | 0x0100_0000);
        match c.spawn() {
            Ok(_) => Ok(()),
            Err(_) => {
                c.creation_flags(0x0800_0000 | 0x0000_0200);
                c.spawn().map(|_| ()).map_err(|e| format!("The update could not start: {e}"))
            }
        }
    }

    /// Starts the downloaded installer itself, straight from Eight Voids (the way Tauri's own updater does it).
    #[cfg(windows)]
    pub fn start_installer(path: &std::path::Path, args: &[&str]) -> Result<u32, String> {
        use std::os::windows::process::CommandExt;
        let mut c = std::process::Command::new(path);
        c.args(args);
        c.creation_flags(0x0000_0200 | 0x0100_0000);
        match c.spawn() {
            Ok(ch) => Ok(ch.id()),
            Err(_) => {
                let mut c2 = std::process::Command::new(path);
                c2.args(args);
                c2.spawn().map(|ch| ch.id()).map_err(|e| format!("The installer could not start: {e}"))
            }
        }
    }

    #[cfg(windows)]
    fn ps(full: String, envs: Vec<(&'static str, String)>, fallback: &str) -> Result<String, String> {
        use std::os::windows::process::CommandExt;
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
            return Err(if err.trim().is_empty() { fallback.to_string() } else { err });
        }
        Ok(String::from_utf8_lossy(&o.stdout).trim().to_string())
    }

    #[cfg(not(windows))]
    pub fn run(_script: &str, _envs: Vec<(&'static str, String)>) -> Result<String, String> {
        Err("The Outlook bridge works on Windows with classic Outlook.".into())
    }

    #[cfg(not(windows))]
    #[allow(dead_code)]
    pub fn spawn_plain(_script: &str, _envs: Vec<(&'static str, String)>) -> Result<(), String> {
        Err("In-app updates work on Windows.".into())
    }

    #[cfg(not(windows))]
    pub fn start_installer(_path: &std::path::Path, _args: &[&str]) -> Result<u32, String> {
        Err("In-app updates work on Windows.".into())
    }

    #[cfg(not(windows))]
    pub fn run_plain(_script: &str, _envs: Vec<(&'static str, String)>) -> Result<String, String> {
        Err("In-app updates work on Windows. On a Mac the new version downloads in the browser.".into())
    }
}

// ---------- app updates (Windows): download the new installer from the Eight Voids releases page, then open it ----------
#[cfg(desktop)]
const UPDATE_DOWNLOAD: &str = include_str!("../ps/update_download.ps1");
#[cfg(desktop)]
const UPDATE_APPLY: &str = include_str!("../ps/update_apply.ps1");
/// A downloaded update the person chose to install later: it installs by itself when Eight Voids is quit.
#[cfg(desktop)]
static PENDING: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);

/// The installer is kept in the app's own cache folder as EightVoids-Update-<version>.exe.
#[cfg(desktop)]
fn update_file(app: &AppHandle, version: &str) -> Result<std::path::PathBuf, String> {
    let v: String = version.chars().filter(|c| c.is_ascii_digit() || *c == '.').take(20).collect();
    if v.is_empty() || v.starts_with('.') {
        return Err("No version given.".into());
    }
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("EightVoids-Update-{v}.exe")))
}

/// Downloads the new installer (only from the Eight Voids GitHub releases). The page shows the progress by
/// reading the size of the ".part" file while this runs.
#[cfg(desktop)]
#[tauri::command]
async fn update_download(app: AppHandle, url: String, version: String) -> Result<String, String> {
    const OK: &str = "https://github.com/Eightvoids/desktop/releases/download/";
    if !url.starts_with(OK) || !url.ends_with(".exe") || url.contains("..") || url.contains('?') {
        return Err("This is not an Eight Voids installer link.".into());
    }
    let out = update_file(&app, &version)?;
    let outs = out.to_string_lossy().to_string();
    let target = outs.clone();
    tauri::async_runtime::spawn_blocking(move || outlook::run_plain(UPDATE_DOWNLOAD, vec![("EV_URL", url), ("EV_OUT", target)]))
        .await
        .map_err(|e| e.to_string())??;
    Ok(outs)
}

/// Installs the update without questions (silent = true): no window, then Eight Voids opens again.
#[cfg(desktop)]
fn update_apply(app: &AppHandle, version: &str, relaunch: bool) -> Result<(), String> {
    let p = update_file(app, version)?;
    if !p.is_file() {
        return Err("The update has not been downloaded yet.".into());
    }
    // 1.3.9: the installer is started straight from Eight Voids (silent update mode). It closes Eight Voids by itself
    // if it is still open, installs, and with /R opens it again. A small watcher reopens Eight Voids if the installer
    // did not, and writes EightVoids-Update.log next to the download (to see what happened).
    let args: &[&str] = if relaunch { &["/S", "/UPDATE", "/R"] } else { &["/S", "/UPDATE"] };
    let ipid = outlook::start_installer(&p, args)?;
    let exe = if relaunch { std::env::current_exe().map(|x| x.to_string_lossy().to_string()).unwrap_or_default() } else { String::new() };
    let log = p.with_file_name("EightVoids-Update.log").to_string_lossy().to_string();
    let _ = outlook::spawn_plain(UPDATE_APPLY, vec![
        ("EV_IPID", ipid.to_string()),
        ("EV_EXE", exe),
        ("EV_LOG", log),
        ("EV_V", version.chars().filter(|c| c.is_ascii_digit() || *c == '.').take(20).collect::<String>()),
    ]);
    Ok(())
}

/// Gives a drawing file its title: renames ONE file inside its own folder (never moves, replaces or deletes).
/// Only allowed when the new name starts with the file's current number, keeps the same file type,
/// the file is in the person's own folders and no file with the new name is there yet.
#[cfg(desktop)]
#[tauri::command]
fn rename_in_folder(path: String, new_name: String) -> Result<String, String> {
    use std::path::PathBuf;
    let n = new_name.trim().to_string();
    if n.is_empty() || n.chars().count() > 200 || n.ends_with('.') || n.ends_with(' ')
        || n.chars().any(|c| c.is_control() || "\\/:*?\"<>|".contains(c)) || n.contains("..")
    {
        return Err("The new name is not allowed.".into());
    }
    let p = PathBuf::from(&path);
    if !p.is_absolute() || !p.is_file() {
        return Err("The file is not there (it may have been renamed or moved already).".into());
    }
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME")).map(PathBuf::from).ok_or("No home folder.")?;
    let cp = p.canonicalize().map_err(|e| e.to_string())?;
    let ch = home.canonicalize().map_err(|e| e.to_string())?;
    if !cp.starts_with(&ch) {
        return Err("Only files in your own folders can be renamed.".into());
    }
    let old = p.file_name().and_then(|x| x.to_str()).ok_or("No file name.")?.to_string();
    let ext = |s: &str| s.rsplit_once('.').map(|(_, e)| e.to_lowercase()).unwrap_or_default();
    if ext(&old) != ext(&n) {
        return Err("The file type must stay the same.".into());
    }
    let num: String = old.trim_start_matches(|c: char| c == '\u{200c}' || c == '\u{200b}' || c == '\u{feff}')
        .split(|c: char| c == ' ' || c == '_' || c == '(' || c == '.').next().unwrap_or("").to_string();
    if num.len() < 6 || !n.to_lowercase().starts_with(&num.to_lowercase()) {
        return Err("The new name must start with the file's number.".into());
    }
    let to = p.parent().ok_or("No folder.")?.join(&n);
    if to.exists() {
        return Err("A file with the new name is already in the folder.".into());
    }
    std::fs::rename(&p, &to).map_err(|e| format!("Could not rename (is the file open in another program?): {}", e))?;
    Ok(to.to_string_lossy().to_string())
}

/// Remembers (or forgets) an update to install when Eight Voids is quit.
#[cfg(desktop)]
#[tauri::command]
fn update_pending(app: AppHandle, version: Option<String>) -> Result<(), String> {
    if let Some(v) = &version {
        if !update_file(&app, v)?.is_file() {
            return Err("The update has not been downloaded yet.".into());
        }
    }
    *PENDING.lock().map_err(|e| e.to_string())? = version;
    Ok(())
}

/// Called when Eight Voids is quit: a pending update installs quietly (Eight Voids is not reopened).
#[cfg(desktop)]
fn update_on_exit(app: &AppHandle) {
    let v = PENDING.lock().ok().and_then(|mut g| g.take());
    if let Some(v) = v {
        let _ = update_apply(app, &v, false);
    }
}

#[cfg(desktop)]
fn update_check_exit(h: &AppHandle, e: &tauri::RunEvent) {
    if let tauri::RunEvent::Exit = e {
        update_on_exit(h);
    }
}

/// Opens the downloaded installer and closes Eight Voids so the installer can replace it.
#[cfg(desktop)]
#[tauri::command]
fn update_install(app: AppHandle, version: String, silent: Option<bool>) -> Result<(), String> {
    if silent.unwrap_or(false) {
        if let Ok(mut g) = PENDING.lock() {
            *g = None;
        }
        update_apply(&app, &version, true)?;
        let h = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(600));
            h.exit(0);
        });
        return Ok(());
    }
    if let Ok(mut g) = PENDING.lock() {
        *g = None;
    }
    let p = update_file(&app, &version)?;
    if !p.is_file() {
        return Err("The update has not been downloaded yet.".into());
    }
    std::process::Command::new(&p)
        .spawn()
        .map_err(|e| format!("The installer could not start: {e}"))?;
    let h = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(800));
        h.exit(0);
    });
    Ok(())
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
async fn outlook_read(since: String, folders: Vec<String>, max: u32, until: Option<String>) -> Result<String, String> {
    let f = folders.join("\n");
    let max = max.clamp(1, 1000).to_string();
    // "until" (optional): read older emails, newest first, received before this time – used to bring in the full history.
    let until = until.unwrap_or_default();
    tauri::async_runtime::spawn_blocking(move || {
        outlook::run(outlook::READ, vec![("EV_SINCE", since), ("EV_FOLDERS", f), ("EV_MAX", max), ("EV_UNTIL", until)])
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Self-test of the Outlook bridge (read only): what it sees in the first ticked folders and the Inbox.
#[cfg(desktop)]
#[tauri::command]
async fn outlook_test(since: String, folders: Vec<String>) -> Result<String, String> {
    let f = folders.join("\n");
    tauri::async_runtime::spawn_blocking(move || outlook::run(outlook::TEST, vec![("EV_SINCE", since), ("EV_FOLDERS", f)]))
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
                    let age = e.metadata().and_then(|m| m.modified()).ok()
                        .and_then(|t| t.elapsed().ok()).map(|d| d.as_secs()).unwrap_or(0);
                    let name = e.file_name().to_string_lossy().to_string();
                    if age > 3600 && name.starts_with("evatt-") {
                        let _ = std::fs::remove_dir_all(e.path());
                    }
                    // installers of earlier updates are removed a day later
                    if age > 86400 && name.starts_with("EightVoids-Update-") {
                        let _ = std::fs::remove_file(e.path());
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

    // Desktop: the Outlook bridge (read only) and in-app updates.
    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![outlook_folders, outlook_read, outlook_save_atts, outlook_test, update_download, update_install, update_pending, rename_in_folder]);

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

    let app = builder.build(tauri::generate_context!()).expect("Eight Voids could not start");
    app.run(|_h, _e| {
        // Desktop: an update the person chose to install later installs when Eight Voids is quit.
        #[cfg(desktop)]
        update_check_exit(_h, &_e);
    });
}

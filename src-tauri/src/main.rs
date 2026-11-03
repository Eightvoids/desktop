// Eight Voids desktop app.
// One window that opens the Eight Voids sign-in, then the workspace from app.eightvoids.com.
// The app adds what a desktop program needs: its own window and taskbar/tray icon, desktop
// notifications, saving files to a local or OneDrive folder, and outside links opening in the browser.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

// Desktop behaviour added to every Eight Voids page shown in the window.
const DESK_JS: &str = include_str!("../desk.js");
static TOLD_TRAY: AtomicBool = AtomicBool::new(false);

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.show();
        let _ = w.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        // Opening the app a second time just brings the open window to the front.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
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
        })
        // On Windows, closing the main window keeps Eight Voids running in the tray
        // (like Teams), so notifications still arrive. Quit from the tray menu.
        .on_window_event(|window, event| {
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
        })
        .run(tauri::generate_context!())
        .expect("Eight Voids could not start");
}

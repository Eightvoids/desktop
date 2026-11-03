// Eight Voids desktop app: opens the Eight Voids workspace in its own window.
// Sign-in, data and updates all come from app.eightvoids.com – nothing is stored in the app itself.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Eight Voids could not start");
}

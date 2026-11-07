// Eight Voids app – desktop start (Windows and macOS). The app itself is in lib.rs,
// shared with the iPhone / iPad and Android apps.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    eightvoids_lib::run()
}

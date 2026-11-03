# Eight Voids – desktop app (Windows and macOS)

A real desktop program for the Eight Voids workspace, built with Tauri.

What it does:
- Opens on the Eight Voids sign-in screen, then the company workspace – no website menus or browser bars.
- Remembers you: next time it opens straight into your workspace (until you sign out).
- Desktop notifications for items that need your attention and for updates from your team.
- Keeps running in the taskbar tray when the window is closed (right-click the tray icon › Quit to close it).
- Link a folder on your computer or in OneDrive: downloads are saved there as new copies. Nothing already in the folder is ever changed, moved or deleted.
- Links to other websites open in your normal browser.
- Desktop settings: the screen icon next to the bell, the tray menu, or Ctrl + ,

How it is built:
Every push to `main` builds the installers on GitHub (Actions) and publishes them on the Releases page:
- Windows: `EightVoids-Windows-Setup.exe`
- Mac: `EightVoids-macOS.dmg`

To release a new version, raise the version number in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json`.
The workspace itself (app.eightvoids.com) updates on its own – a new installer is only needed when the app's own features change.

No project data is stored in this repository.

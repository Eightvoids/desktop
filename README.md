# Eight Voids – app for Windows, macOS, iPhone / iPad and Android

One app, built with Tauri, for every device. It opens the Eight Voids sign-in, then the company workspace (app.eightvoids.com) – no website menus or browser bars.

Desktop (Windows / macOS):
- Remembers you, desktop notifications, keeps running in the taskbar tray (right-click › Quit to close).
- Link a folder on your computer or in OneDrive: downloads are saved there as new copies. Nothing already in the folder is ever changed, moved or deleted.
- Links to other websites open in your normal browser. Desktop settings: the screen icon next to the bell, the tray menu, or Ctrl + ,

Phone and tablet (iPhone / iPad / Android):
- Same workspace, full screen. Site photos with the phone camera or photo library (Images › Capture).
- Notifications for items that need your attention. App settings: the screen icon next to the bell.
- Outside links open in the phone's browser; Microsoft sign-in stays in the app.

How it is built (GitHub Actions, on every push to `main`):
- `build.yml` – Windows `EightVoids-Windows-Setup.exe` and Mac `EightVoids-macOS.dmg` on the Releases page (v<version>).
- `mobile.yml` – Android `EightVoids-Android.apk` (test install) and `EightVoids-Android.aab` (Google Play) on the Releases page (Eight Voids mobile v<version>); iPhone / iPad build check.
- iPhone / iPad signed builds (TestFlight, App Store) and Google Play uploads start once the Apple Developer and Google Play accounts exist.

The shared app code is in `src-tauri/src/lib.rs`; desktop behaviour in `src-tauri/desk.js`, phone behaviour in `src-tauri/mob.js`, iPhone permission texts in `src-tauri/Info.ios.plist`.

To release a new version, raise the version number in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `package.json`.
The workspace itself (app.eightvoids.com) updates on its own – a new app is only needed when the app's own features change.

No project data is stored in this repository.

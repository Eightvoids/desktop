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

## Version 1.3.8 – updates without any installer window, drawing titles
- Restart now (or quitting the app with an update waiting) installs the new version completely in the background: `update_apply.ps1` runs the installer with `/S /UPDATE` (silent, update mode – no window, no questions), then reopens Eight Voids. Inside the app a full-window "Updating Eight Voids to x.y.z" screen shows until it closes.
- 1.3.7 itself still showed the small installer progress window once; from 1.3.8 on, updates are fully inside the app.
- **Drawing titles**: new command `rename_in_folder` (permission `allow-rename-in-folder`) gives a drawing file its title – it renames ONE file inside its own folder to "number - title". It refuses when the new name does not start with the file's number, changes the file type, the file is outside the person's own folders, or a file with the new name is already there. Nothing is moved, replaced or deleted. The workspace uses it for the rename plan (titles read from each drawing's title block) in Connections › This computer › Drawing titles – only when you click Rename.

## Version 1.3.7 – updates like Autodesk, pictures inside emails
- **Updates (Windows)**: a new version downloads quietly in the background. Then a card says "Eight Voids x.y.z is ready" with **Restart now** (Eight Voids closes, the installer runs with a small progress window in update mode – `/P /UPDATE`, no questions – and Eight Voids opens again by itself) or **Later** (it installs by itself when you quit the app). New command `update_pending`; `update_install` takes `silent`; fixed script `src-tauri/ps/update_apply.ps1` (waits for the app to close, installs, reopens). Versions before 1.3.7 still update once with the normal installer.
- **Pictures inside emails**: outlook_read and outlook_save_atts also take the pictures placed inside the email text (hidden attachments, png / jpg / gif / bmp / webp / heic, 15 KB or more – small logos and icons are left out), marked `inl: 1`.

## Version 1.3.6 – lighter on Outlook and the laptop
- The Outlook helper scripts run at low (below normal) priority, so the laptop stays responsive while emails are read in the background.
- outlook_read scans each folder with only date, type and id per email (Outlook's SetColumns) and skips empty folders; the full email (text, people, attachments list) is opened only for the emails actually brought in. Much less work for Outlook, especially with many sub-folders and the full-history run.
- New emails are found with Outlook's own filter (received since the last check) instead of sorting every folder – Outlook no longer freezes during the check.
- The workspace (platform) reads all ticked folders in one run; by default it checks new emails every 15 minutes during work hours and brings in the old history only after 6 PM and at the weekend (Outlook speed setting in Connections › This computer).

## Version 1.3.5 – full email history
- outlook_read takes an optional "until": emails received before that time, newest first, at most "max" per folder. The workspace uses it to bring in the whole mailbox history in rounds of 100 (Connections › This computer › Outlook bridge › All dates), while new emails keep coming in every 5 minutes.
- Each folder jumps straight to the older part with Outlook's own filter; if Outlook refuses the filter, newer emails are skipped one by one instead.

## Version 1.3.4 – Outlook bridge reads every ticked folder
- The ticked folders now reach the reader one per line. Before, Windows PowerShell 5.1 read the list as one item, so with two or more folders nothing matched and no emails were read (the Inbox self-test still saw 81 emails).

## Version 1.3.3 – Outlook bridge reads newest emails first
- The bridge read no emails on some computers: it now walks each folder newest-first with GetFirst / GetNext (which follow the sort) and stops after 25 older emails in a row.
- New read-only self-test `outlook_test` (script `src-tauri/ps/outlook_test.ps1`), used by the Test button in the workspace (Connections › This computer): item counts, newest dates and emails since the start date for the Inbox and the first ticked folders, plus the Windows language and calendar.

## Version 1.3.2 – Updates inside the app
- **Desktop (Windows)**: the app checks for a new version when it starts and every 6 hours. An "Update ready" card shows the new version and what's new. **Update now** downloads the installer inside the app with a progress bar and the time left (`update_download`, fixed script `src-tauri/ps/update_download.ps1`, only from this repository's Releases page), then opens it (`update_install`); Eight Voids closes while it installs. **Later** hides the card for 20 hours. Desktop settings › Updates has **Check for updates**.
- **Mac**: the same card; Update now downloads the new .dmg in the browser.
- **Android**: the app checks the "Eight Voids mobile" releases; Update now downloads EightVoids-Android.apk in the phone's browser – open it to install. App settings › Updates has **Check for updates**. For updating over the installed app (instead of removing it first), the permanent Android key must be added once as the secrets ANDROID_KEYSTORE_B64 and ANDROID_KEYSTORE_PASSWORD.
- **iPhone / iPad**: updates come through TestFlight / the App Store once the Apple Developer account exists.
- Nothing installs without the person's click.

## Version 1.3.0 – Files & Outlook (no Microsoft 365 approval needed)
- **Organise folders** (workspace › Connections › This computer, or Design Files): scans the synced SharePoint / OneDrive folder, sorts every file into the official structure (drawing number → rules → optional AI), you check the list, then it **copies** – any file size, originals never changed, an existing file is never replaced.
- **Large files**: uploaded straight to Eight Voids storage (EV_BIG_STORAGE) in 8 MB pieces, 4 at a time; continues after a break.
- **Outlook bridge** (Windows, classic Outlook): every 5 minutes reads the ticked folders of the person's own mailbox through fixed PowerShell scripts in `src-tauri/ps/` (read only – never sends, moves or deletes) and brings new emails + attachments into Correspondence. Doubles are skipped by the Internet message id.
- **Save to SharePoint**: files added in the platform are saved as new copies into the project's official folder on this computer; OneDrive syncs them.

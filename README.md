# Eight Voids – desktop app (Windows & macOS)

Opens the Eight Voids workspace (app.eightvoids.com) in its own app window. No company data is stored in this repository or in the app.

**How a new version is made:** change `"version"` in `src-tauri/tauri.conf.json` (e.g. 1.0.1), commit and push. GitHub builds both installers (Actions tab, about 10–15 minutes) and publishes them on the Releases page.

**Download links (always the latest version):**
- Windows: https://github.com/Eightvoids/desktop/releases/latest/download/EightVoids-Windows-Setup.exe
- macOS: https://github.com/Eightvoids/desktop/releases/latest/download/EightVoids-macOS.dmg

Not code-signed yet: Windows shows "Windows protected your PC" → More info → Run anyway; macOS: right-click the app → Open. Signing comes with the Apple Developer account and a Windows code-signing certificate.

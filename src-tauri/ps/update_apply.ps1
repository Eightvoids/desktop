# Eight Voids app update (1.3.9+): the installer itself is started by Eight Voids (silent update mode).
# This small watcher waits until the installer has finished, opens Eight Voids again if it is not open yet,
# and writes a short log next to the downloaded installer (EightVoids-Update.log). Your settings and sign-in stay.
$ErrorActionPreference = 'SilentlyContinue'
function L($m) { try { Add-Content -LiteralPath $env:EV_LOG -Value ((Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $m) } catch {} }
L ("update to " + $env:EV_V + " started (installer process " + $env:EV_IPID + ")")
$ip = [int]$env:EV_IPID
for ($i = 0; $i -lt 1200; $i++) { if (-not (Get-Process -Id $ip -ErrorAction SilentlyContinue)) { break }; Start-Sleep -Milliseconds 500 }
L "installer finished"
Start-Sleep -Seconds 3
if ($env:EV_EXE -and (Test-Path -LiteralPath $env:EV_EXE)) {
  try { L ("installed version: " + (Get-Item -LiteralPath $env:EV_EXE).VersionInfo.ProductVersion) } catch {}
  $name = [IO.Path]::GetFileNameWithoutExtension($env:EV_EXE)
  if (-not (Get-Process -Name $name -ErrorAction SilentlyContinue)) { Start-Process -FilePath $env:EV_EXE; L "Eight Voids opened again" } else { L "Eight Voids is open" }
}

# Eight Voids app update – installs the downloaded new version without questions (like Autodesk / Teams updates):
# waits until Eight Voids has closed, runs the installer completely in the background (/S, update mode – no window),
# then opens Eight Voids again when asked. Your settings and sign-in stay.
$ErrorActionPreference = 'SilentlyContinue'
$pid0 = [int]$env:EV_PID
for ($i = 0; $i -lt 120; $i++) { if (-not (Get-Process -Id $pid0 -ErrorAction SilentlyContinue)) { break }; Start-Sleep -Milliseconds 500 }
Start-Process -FilePath $env:EV_SETUP -ArgumentList '/S', '/UPDATE' -Wait
Start-Sleep -Seconds 2
if ($env:EV_EXE -and (Test-Path -LiteralPath $env:EV_EXE)) {
  $name = [IO.Path]::GetFileNameWithoutExtension($env:EV_EXE)
  if (-not (Get-Process -Name $name -ErrorAction SilentlyContinue)) { Start-Process -FilePath $env:EV_EXE }
}

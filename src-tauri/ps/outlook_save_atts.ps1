$ol = EvOutlook
$it = $ol.GetNamespace('MAPI').GetItemFromID($env:EV_ENTRY)
$dir = Join-Path $env:EV_DIR ('evatt-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$out = New-Object System.Collections.ArrayList
foreach ($a in $it.Attachments) {
  if (-not (EvAttOk $a)) { continue }
  $n = ([string]$a.FileName) -replace '[\\/:*?"<>|]', '_'
  $p = Join-Path $dir $n
  $a.SaveAsFile($p)
  [void]$out.Add(@{ n = [string]$a.FileName; path = $p; size = (Get-Item -LiteralPath $p).Length })
}
ConvertTo-Json -InputObject @($out) -Compress

$ol = EvOutlook
$it = $ol.GetNamespace('MAPI').GetItemFromID($env:EV_ENTRY)
$dir = Join-Path $env:EV_DIR ('evatt-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$out = New-Object System.Collections.ArrayList
foreach ($a in $it.Attachments) {
  $inl = $false
  if (-not (EvAttOk $a)) { if (EvInlinePic $a) { $inl = $true } else { continue } }
  $n = ([string]$a.FileName) -replace '[\\/:*?"<>|]', '_'
  $p = Join-Path $dir $n
  $a.SaveAsFile($p)
  $o = @{ n = [string]$a.FileName; path = $p; size = (Get-Item -LiteralPath $p).Length }
  if ($inl) { $o.inl = 1 }
  [void]$out.Add($o)
}
ConvertTo-Json -InputObject @($out) -Compress

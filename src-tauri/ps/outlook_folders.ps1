$ol = EvOutlook
$root = $ol.GetNamespace('MAPI').DefaultStore.GetRootFolder()
$out = New-Object System.Collections.ArrayList
function Walk($f, $d) {
  foreach ($c in $f.Folders) {
    try { if ($c.DefaultItemType -ne 0) { continue } } catch { continue }
    [void]$out.Add((EvRel $c))
    if ($d -lt 4) { Walk $c ($d + 1) }
  }
}
Walk $root 1
ConvertTo-Json -InputObject @($out) -Compress

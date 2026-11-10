# Eight Voids – Outlook bridge self-test (READ ONLY). Shows what the bridge sees; changes nothing.
$since = [datetime]::Parse($env:EV_SINCE, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
$want = @(ConvertFrom-Json $env:EV_FOLDERS)
$ol = EvOutlook
$ns = $ol.GetNamespace('MAPI')
$root = $ns.DefaultStore.GetRootFolder()
function Iso($d) { try { return ([datetime]$d).ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture) } catch { return '' } }
$rows = New-Object System.Collections.ArrayList
function One($f) {
  $r = @{ fo = (EvRel $f); count = 0; first = ''; last = ''; sortedFirst = ''; newer = 0; err = '' }
  try {
    $items = $f.Items
    $r.count = [int]$items.Count
    if ($r.count -gt 0) {
      try { $r.first = Iso ($items.GetFirst().ReceivedTime) } catch { }
      try { $r.last = Iso ($items.GetLast().ReceivedTime) } catch { }
      $items.Sort('[ReceivedTime]', $true)
      $it = $items.GetFirst()
      try { $r.sortedFirst = Iso ($it.ReceivedTime) } catch { }
      $n = 0
      while ($null -ne $it -and $n -lt 400) {
        $n++
        try { if (([datetime]$it.ReceivedTime) -ge $since) { $r.newer++ } } catch { }
        $it = $items.GetNext()
      }
    }
  } catch { $r.err = [string]$_.Exception.Message }
  [void]$rows.Add($r)
}
$inbox = $null; try { $inbox = $ns.GetDefaultFolder(6) } catch { }
if ($inbox) { One $inbox }
function Walk($f, $d) {
  foreach ($c in $f.Folders) {
    if ($rows.Count -ge 8) { return }
    try { if ($c.DefaultItemType -ne 0) { continue } } catch { continue }
    if (EvWanted (EvRel $c) $want) { One $c }
    if ($d -lt 6) { Walk $c ($d + 1) }
  }
}
Walk $root 1
ConvertTo-Json -InputObject @{ since = (Iso $since); culture = [string][Globalization.CultureInfo]::CurrentCulture.Name; calendar = [string][Globalization.CultureInfo]::CurrentCulture.Calendar.GetType().Name; store = [string]$ns.DefaultStore.DisplayName; folders = @($rows) } -Depth 4 -Compress

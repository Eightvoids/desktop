$ol = EvOutlook
$ns = $ol.GetNamespace('MAPI')
# Light reading (1.3.6): while scanning, Outlook only hands over date, type and id of each email;
# the full email is opened only for the ones that are actually brought in.
$root = $ns.DefaultStore.GetRootFolder()
$since = [datetime]::Parse($env:EV_SINCE, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
# one folder per line (Windows PowerShell 5.1 reads a JSON list as a single item)
$want = @(([string]$env:EV_FOLDERS) -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$max = [int]$env:EV_MAX
# EV_UNTIL set = full-history mode: emails received before this time, newest first, at most $max per folder.
$until = $null
if ($env:EV_UNTIL) { $until = [datetime]::Parse($env:EV_UNTIL, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime() }
# Dates are compared as dates (not as text), so this works with any Windows language or calendar.
$cand = New-Object System.Collections.ArrayList
function Collect($f) {
  $rel = EvRel $f
  $items = $f.Items
  try { if ($items.Count -eq 0) { return } } catch { }
  if ($until) {
    # jump straight to the older part of the folder; if Outlook refuses the filter (or finds nothing), newer items are skipped one by one instead
    $r = $null
    try { $r = $items.Restrict("[ReceivedTime] < '" + $until.ToString('g') + "'") } catch { }
    if ($r -and $r.Count -gt 0) { $items = $r }
  } else {
    # new emails only (1.3.6): Outlook's own index finds them at once – no sorting of the whole folder, so Outlook stays responsive.
    # A minute earlier than the start, because the filter works in whole minutes; doubles are skipped by the platform.
    $r = $null
    try { $r = $items.Restrict("[ReceivedTime] >= '" + $since.AddMinutes(-1).ToString('g') + "'") } catch { }
    if ($null -ne $r) { $cnt = -1; try { $cnt = $r.Count } catch { }; if ($cnt -eq 0) { return }; if ($cnt -gt 0) { $items = $r } }
  }
  $items.Sort('[ReceivedTime]', $true)
  try { $items.SetColumns('ReceivedTime,MessageClass,EntryID') } catch { }
  # GetFirst / GetNext follow the sort (newest first). A few older items in a row end the folder.
  $old = 0
  $n = 0
  $it = $items.GetFirst()
  while ($null -ne $it) {
    $rt = $null
    try { $rt = [datetime]$it.ReceivedTime } catch { }
    if ($null -ne $rt) {
      if ($until -and $rt -ge $until) { $it = $items.GetNext(); continue }
      if ($rt -lt $since) { $old++; if ($old -ge 25) { break } }
      else {
        $old = 0
        $ok = $false
        try { $ok = ([string]$it.MessageClass -like 'IPM.Note*') } catch { }
        if ($ok) { $e = ''; try { $e = [string]$it.EntryID } catch { }; if ($e) { [void]$cand.Add([pscustomobject]@{ t = $rt; e = $e; fo = $rel }); $n++; if ($until -and $n -ge $max) { break } } }
      }
    }
    $it = $items.GetNext()
  }
}
function Walk($f, $d) {
  foreach ($c in $f.Folders) {
    try { if ($c.DefaultItemType -ne 0) { continue } } catch { continue }
    if (EvWanted (EvRel $c) $want) { Collect $c }
    if ($d -lt 6) { Walk $c ($d + 1) }
  }
}
Walk $root 1
$out = New-Object System.Collections.ArrayList
$pick = if ($until) { $cand | Sort-Object t -Descending | Select-Object -First $max } else { $cand | Sort-Object t | Select-Object -First $max }
foreach ($x in $pick) {
  $it = $null
  try { $it = $ns.GetItemFromID($x.e) } catch { }
  if ($null -eq $it) { continue }
  $id = ''
  try { $id = [string]$it.PropertyAccessor.GetProperty('http://schemas.microsoft.com/mapi/proptag/0x1035001F') } catch { }
  if (-not $id) { $id = 'entry:' + $it.EntryID }
  $fe = ''
  try { if ($it.SenderEmailType -eq 'EX') { $fe = $it.Sender.GetExchangeUser().PrimarySmtpAddress } else { $fe = $it.SenderEmailAddress } } catch { try { $fe = $it.SenderEmailAddress } catch { } }
  $body = ''
  try { $body = [string]$it.Body; if ($body.Length -gt 200000) { $body = $body.Substring(0, 200000) } } catch { }
  $att = New-Object System.Collections.ArrayList
  try { foreach ($a in $it.Attachments) { if (EvAttOk $a) { [void]$att.Add(@{ n = [string]$a.FileName; size = [int64]$a.Size }) } } } catch { }
  [void]$out.Add(@{ id = $id; entry = [string]$it.EntryID; s = [string]$it.Subject; f = [string]$it.SenderName; fe = [string]$fe;
    to = [string]$it.To; cc = [string]$it.CC; d = $x.t.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture); fo = $x.fo; b = $body; att = @($att) })
}
ConvertTo-Json -InputObject @($out) -Depth 5 -Compress

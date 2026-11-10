$ol = EvOutlook
$ns = $ol.GetNamespace('MAPI')
$root = $ns.DefaultStore.GetRootFolder()
$since = [datetime]::Parse($env:EV_SINCE, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
# one folder per line (Windows PowerShell 5.1 reads a JSON list as a single item)
$want = @(([string]$env:EV_FOLDERS) -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$max = [int]$env:EV_MAX
# Dates are compared as dates (not as text), so this works with any Windows language or calendar.
$cand = New-Object System.Collections.ArrayList
function Collect($f) {
  $rel = EvRel $f
  $items = $f.Items
  $items.Sort('[ReceivedTime]', $true)
  # GetFirst / GetNext follow the sort (newest first). A few older items in a row end the folder.
  $old = 0
  $it = $items.GetFirst()
  while ($null -ne $it) {
    $rt = $null
    try { $rt = [datetime]$it.ReceivedTime } catch { }
    if ($null -ne $rt) {
      if ($rt -lt $since) { $old++; if ($old -ge 25) { break } }
      else {
        $old = 0
        $ok = $false
        try { $ok = ($it.Class -eq 43) } catch { }
        if ($ok) { [void]$cand.Add([pscustomobject]@{ t = $rt; it = $it; fo = $rel }) }
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
foreach ($x in ($cand | Sort-Object t | Select-Object -First $max)) {
  $it = $x.it
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

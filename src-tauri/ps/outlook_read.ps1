$ol = EvOutlook
$ns = $ol.GetNamespace('MAPI')
$root = $ns.DefaultStore.GetRootFolder()
$since = [datetime]::Parse($env:EV_SINCE, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
$want = @(ConvertFrom-Json $env:EV_FOLDERS)
$max = [int]$env:EV_MAX
$out = New-Object System.Collections.ArrayList
function Mails($f) {
  $rel = EvRel $f
  $filter = "[ReceivedTime] >= '" + $since.ToString('g') + "'"
  $items = $f.Items.Restrict($filter)
  $items.Sort('[ReceivedTime]', $false)
  foreach ($it in $items) {
    if ($out.Count -ge $max) { return }
    try { if ($it.Class -ne 43) { continue } } catch { continue }
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
      to = [string]$it.To; cc = [string]$it.CC; d = $it.ReceivedTime.ToUniversalTime().ToString('o'); fo = $rel; b = $body; att = @($att) })
  }
}
function Walk($f, $d) {
  foreach ($c in $f.Folders) {
    if ($out.Count -ge $max) { return }
    try { if ($c.DefaultItemType -ne 0) { continue } } catch { continue }
    if (EvWanted (EvRel $c) $want) { Mails $c }
    if ($d -lt 6) { Walk $c ($d + 1) }
  }
}
Walk $root 1
ConvertTo-Json -InputObject @($out) -Depth 5 -Compress

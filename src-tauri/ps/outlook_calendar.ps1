$ol = EvOutlook
$ns = $ol.GetNamespace('MAPI')
# 1.4.5: meetings in this person's own Outlook calendar between two dates (READ ONLY – nothing is answered, moved or changed).
$from = [datetime]::Parse($env:EV_FROM, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
$to = [datetime]::Parse($env:EV_TO, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToLocalTime()
$cal = $ns.GetDefaultFolder(9)
$items = $cal.Items
$items.Sort('[Start]')
$items.IncludeRecurrences = $true
$r = $null
try { $r = $items.Restrict("[Start] >= '" + $from.ToString('g') + "' AND [Start] <= '" + $to.ToString('g') + "'") } catch { }
if ($null -eq $r) { $r = $items }
$out = New-Object System.Collections.ArrayList
$n = 0
$seen = 0
$it = $r.GetFirst()
# a calendar with repeating meetings has no end, so the walk stops after the last date asked for (items come sorted by start)
while ($null -ne $it -and $n -lt 400 -and $seen -lt 5000) {
  $seen++
  $st = $null; try { $st = [datetime]$it.Start } catch { }
  if ($null -ne $st -and $st -gt $to) { break }
  if ($null -ne $st -and $st -ge $from -and $st -le $to) {
    $o = [ordered]@{}
    try { $o.s = [string]$it.Subject } catch { }
    $o.st = $st.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
    try { $o.en = ([datetime]$it.End).ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture) } catch { }
    try { $o.loc = [string]$it.Location } catch { }
    try { $o.org = [string]$it.Organizer } catch { }
    try { $o.req = [string]$it.RequiredAttendees } catch { }
    try { $o.opt = [string]$it.OptionalAttendees } catch { }
    try { $o.uid = [string]$it.GlobalAppointmentID } catch { }
    try { $o.ms = [int]$it.MeetingStatus } catch { }
    try { $o.rs = [int]$it.ResponseStatus } catch { }
    try { $o.ad = [bool]$it.AllDayEvent } catch { }
    try { $o.rec = [bool]$it.IsRecurring } catch { }
    try { $o.cat = [string]$it.Categories } catch { }
    try { $b = [string]$it.Body; if ($b.Length -gt 3000) { $b = $b.Substring(0, 3000) }; $o.b = $b } catch { }
    [void]$out.Add($o); $n++
  }
  $it = $r.GetNext()
}
ConvertTo-Json -InputObject @($out) -Depth 4 -Compress

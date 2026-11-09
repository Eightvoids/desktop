# Eight Voids – Outlook bridge (READ ONLY). Uses the classic Outlook already signed in on this computer.
# It never sends, moves, deletes or changes any email.
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function EvOutlook {
  try { return [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application') } catch { }
  return New-Object -ComObject Outlook.Application
}
function EvRel($f) {
  $p = [string]$f.FolderPath
  $p = $p -replace '^\\\\[^\\]+\\', ''
  return ($p -replace '\\', '/')
}
function EvWanted($rel, $want) {
  foreach ($w in $want) {
    if (-not $w) { continue }
    if ($rel -eq $w -or $rel.EndsWith('/' + $w) -or $rel.StartsWith($w + '/') -or $rel.Contains('/' + $w + '/')) { return $true }
  }
  return $false
}
function EvAttOk($a) {
  try { if ($a.PropertyAccessor.GetProperty('http://schemas.microsoft.com/mapi/proptag/0x7FFE000B')) { return $false } } catch { }
  try { if ($a.Type -ne 1) { return $false } } catch { }
  return $true
}

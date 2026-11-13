# Eight Voids app update: downloads the new installer from the Eight Voids releases page into the app's own cache folder.
# The address and the file are given by the app (checked there); the page only shows the progress.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$out = $env:EV_OUT
$part = "$out.part"
if (Test-Path -LiteralPath $part) { Remove-Item -LiteralPath $part -Force }
$req = [Net.HttpWebRequest]::Create($env:EV_URL)
$req.UserAgent = 'EightVoids-Desktop'
$req.AllowAutoRedirect = $true
$res = $req.GetResponse()
$in = $res.GetResponseStream()
$fs = [IO.File]::Open($part, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite)
try {
  $buf = New-Object byte[] 1048576
  while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) { $fs.Write($buf, 0, $n); $fs.Flush() }
} finally { $fs.Close(); $in.Close(); $res.Close() }
# 1.4.2: the signature file is small (EV_MIN); the installer is at least 1 MB
$min = 1000000
if ($env:EV_MIN) { $min = [int64]$env:EV_MIN }
if ((Get-Item -LiteralPath $part).Length -lt $min) { throw 'The download was incomplete – try again.' }
if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Force }
Move-Item -LiteralPath $part -Destination $out
'ok'

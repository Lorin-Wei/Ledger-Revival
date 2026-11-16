# Ledger Revival — 用本机 Chrome / Edge 无头运行测试套件。通过返回 0，失败返回 1。
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$candidates = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) { Write-Error 'Chrome or Edge not found.'; exit 1 }

$page = (Resolve-Path (Join-Path $PSScriptRoot 'index.html')).Path
$url = 'file:///' + ($page -replace '\\', '/')
$profileDir = Join-Path $env:TEMP 'ledger-revival-test-profile'

$dom = & $browser --headless=new --disable-gpu --no-first-run --no-default-browser-check "--user-data-dir=$profileDir" --virtual-time-budget=10000 --dump-dom $url 2>$null | Out-String

$match = [regex]::Match($dom, '<pre id="out">([\s\S]*?)</pre>')
if (-not $match.Success) { Write-Output 'Could not read test output.'; exit 1 }

$text = [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
Write-Output $text
if ($text.StartsWith('PASS')) { exit 0 } else { exit 1 }

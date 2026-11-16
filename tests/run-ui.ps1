# Ledger Revival — 无头运行 UI 冒烟测试（示例文本 + CSV 导入两种模式），可选输出截图。
param([string]$Screenshot)
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

$page = (Resolve-Path (Join-Path $PSScriptRoot 'ui.html')).Path
$base = 'file:///' + ($page -replace '\\', '/')
$profileDir = Join-Path $env:TEMP 'ledger-revival-ui-profile'
$common = @('--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', "--user-data-dir=$profileDir",
  '--allow-file-access-from-files', '--virtual-time-budget=15000')

$allPass = $true
foreach ($mode in 'sample', 'csv') {
  $dom = & $browser @common --dump-dom "$base`?mode=$mode" 2>$null | Out-String
  $m = [regex]::Match($dom, '<pre id="out">([\s\S]*?)</pre>')
  $text = if ($m.Success) { [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value) } else { 'FAIL could not read output' }
  Write-Output "== mode: $mode =="
  Write-Output $text
  if (-not $text.StartsWith('PASS')) { $allPass = $false }
}

if ($Screenshot) {
  & $browser @common '--window-size=1366,1500' "--screenshot=$Screenshot" "$base`?mode=sample" 2>$null | Out-Null
  Write-Output "screenshot: $Screenshot"
}

if ($allPass) { exit 0 } else { exit 1 }

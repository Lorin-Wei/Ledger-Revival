# 生成演示视频：逐镜头截图（无头 Chrome）+ 英文配音（Windows TTS）+ 合成（ffmpeg）
# 用法：pwsh submission/video/build.ps1   输出：submission/video/ledger-revival-demo.mp4
param([string[]]$Only, [switch]$FramesOnly)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$here = $PSScriptRoot
$build = Join-Path $here 'build'
New-Item -ItemType Directory -Force $build | Out-Null

$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe") |
  Where-Object { Test-Path $_ } | Select-Object -First 1
$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
if (-not $ffmpeg) { $ffmpeg = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ffmpeg.exe" }
$ffprobe = Join-Path (Split-Path $ffmpeg) 'ffprobe.exe'

$shots = Get-Content (Join-Path $here 'shots.json') -Raw -Encoding utf8 | ConvertFrom-Json
if ($Only) { $shots = $shots | Where-Object { $Only -contains $_.id } }
$base = 'file:///' + ((Join-Path $here 'scenes.html') -replace '\\', '/')

# 1) 画面
foreach ($s in $shots) {
  $png = Join-Path $build "$($s.id).png"
  & $chrome --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --window-size=1920,1080 `
    --virtual-time-budget=8000 "--user-data-dir=$env:TEMP\lr-video" "--screenshot=$png" "$base`?shot=$($s.id)" 2>$null | Out-Null
  Write-Output "frame  $($s.id)"
}
if ($FramesOnly) { exit 0 }

# 2) 配音
Add-Type -AssemblyName System.Speech
$tts = New-Object System.Speech.Synthesis.SpeechSynthesizer
$tts.SelectVoice('Microsoft Zira Desktop')
$tts.Rate = 1
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(44100, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($s in $shots) {
  $wav = Join-Path $build "$($s.id).wav"
  $tts.SetOutputToWaveFile($wav, $fmt)
  $tts.Speak($s.say)
  $tts.SetOutputToNull()
}
$tts.Dispose()

# 3) 每个镜头一段视频：0.3 秒前导 + 配音 + 0.6 秒停顿，首尾淡入淡出
$list = Join-Path $build 'concat.txt'
$lines = @()
$total = 0.0
foreach ($s in $shots) {
  $png = Join-Path $build "$($s.id).png"
  $wav = Join-Path $build "$($s.id).wav"
  $mp4 = Join-Path $build "$($s.id).mp4"
  $speech = [double](& $ffprobe -v error -show_entries format=duration -of csv=p=0 $wav)
  $dur = [math]::Round($speech + 0.9, 2)
  $fadeOut = [math]::Round($dur - 0.35, 2)
  $filter = "[0:v]scale=1920:1080,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOut}:d=0.35[v];[1:a]adelay=delays=300:all=1,apad,aformat=sample_rates=44100:channel_layouts=stereo[a]"
  & $ffmpeg -y -v error -loop 1 -framerate 30 -i $png -i $wav -filter_complex $filter -map '[v]' -map '[a]' -t $dur `
    -c:v libx264 -preset medium -crf 20 -tune stillimage -r 30 -c:a aac -b:a 160k $mp4
  $lines += "file '$($mp4 -replace '\\', '/')'"
  $total += $dur
  Write-Output ("clip   {0,-16} {1,6:N2}s" -f $s.id, $dur)
}
Set-Content $list $lines -Encoding ascii

$out = Join-Path $here 'ledger-revival-demo.mp4'
& $ffmpeg -y -v error -f concat -safe 0 -i $list -c copy -movflags +faststart $out
Write-Output ("total  {0:N1}s  ->  {1}" -f $total, $out)

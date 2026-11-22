# Chạy backend (8000) và frontend (3000) trong 2 cửa sổ riêng
$root = $PSScriptRoot
$env:TEMP = 'D:\Temp'; $env:TMP = 'D:\Temp'
New-Item -ItemType Directory -Force 'D:\Temp' | Out-Null

$be = "Set-Location -LiteralPath '$root\backend'; .\.venv\Scripts\python.exe -X utf8 -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
$fe = "Set-Location -LiteralPath '$root\frontend'; node node_modules/vite/bin/vite.js"
Start-Process powershell -ArgumentList '-NoExit', '-Command', $be
Start-Process powershell -ArgumentList '-NoExit', '-Command', $fe
Write-Host 'Mở http://127.0.0.1:3000'

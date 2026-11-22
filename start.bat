@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
timeout /t 6 >nul
start "" http://localhost:3000

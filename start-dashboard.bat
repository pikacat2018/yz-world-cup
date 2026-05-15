@echo off
cd /d "%~dp0"
title YZ World Cup Dashboard

start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:5173/'"

npm run dev -- --host 127.0.0.1 --strictPort

pause

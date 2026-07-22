@echo off
setlocal enabledelayedexpansion
title Shorts Factory — MERN + Supabase Control Center

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo ============================================================
echo   Starting Shorts Factory Full Stack App...
echo   Backend API Server  : http://localhost:8899
echo   React Web Dashboard : http://localhost:5173
echo ============================================================
echo.

REM 1. Start Express API Server in background window
start "Shorts Factory API Server (Port 8899)" cmd /k "cd /d "%ROOT%\server" && npm run dev"

REM 2. Start Vite React Client in background window
start "Shorts Factory React Client (Port 5173)" cmd /k "cd /d "%ROOT%\client" && npm run dev"

REM 3. Open browser after 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5173"

echo.
echo Control Center Launched! Keep the terminal windows open.
echo.
pause

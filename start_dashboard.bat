@echo off
setlocal enabledelayedexpansion
title Shorts Factory — Dashboard

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo ============================================================
echo   Starting Shorts Factory Dashboard...
echo   http://localhost:8899
echo ============================================================
echo.

REM Activate virtual environment
call "%ROOT%\venv\Scripts\activate.bat"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: venv not found. Run setup.bat first.
    pause
    exit /b 1
)

REM Open browser after 2 second delay
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8899/frontend/index.html"

REM Start Flask server
python "%ROOT%\backend\server.py"

pause

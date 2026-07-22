@echo off
setlocal enabledelayedexpansion
title Shorts Factory — Setup

echo.
echo ============================================================
echo   SHORTS FACTORY — ONE-CLICK SETUP
echo ============================================================
echo.

REM ─── Find project root ────────────────────────────────────────
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
echo [1/7] Project root: %ROOT%

REM ─── Check Python ─────────────────────────────────────────────
echo.
echo [2/7] Checking Python...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   Found: %%v

REM ─── Check / Install FFmpeg ───────────────────────────────────
echo.
echo [3/7] Checking FFmpeg...
ffmpeg -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   WARNING: FFmpeg not found in PATH.
    echo   MoviePy needs FFmpeg for video rendering.
    echo   Download from: https://ffmpeg.org/download.html
    echo   Extract and add to PATH, then re-run setup.
    echo   Continuing without FFmpeg for now...
) else (
    echo   Found FFmpeg OK
)

REM ─── Create virtual environment ───────────────────────────────
echo.
echo [4/7] Creating Python virtual environment...
if not exist "%ROOT%\venv" (
    python -m venv "%ROOT%\venv"
    echo   Created venv at %ROOT%\venv
) else (
    echo   venv already exists
)

REM ─── Install requirements ─────────────────────────────────────
echo.
echo [5/7] Installing Python packages (this may take a few minutes)...
call "%ROOT%\venv\Scripts\activate.bat"
pip install --upgrade pip --quiet
pip install -r "%ROOT%\backend\requirements.txt" --quiet
if %ERRORLEVEL% NEQ 0 (
    echo   WARNING: Some packages may have failed to install.
    echo   Try: pip install -r backend\requirements.txt
)
echo   Packages installed.

REM ─── Create .env from template ────────────────────────────────
echo.
echo [6/7] Setting up configuration...
if not exist "%ROOT%\.env" (
    copy "%ROOT%\.env.example" "%ROOT%\.env" >nul
    echo   Created .env from template.
    echo.
    echo   *** ACTION REQUIRED ***
    echo   Edit .env and fill in your credentials:
    echo     - GEMINI_API_KEY  (from https://aistudio.google.com)
    echo     - YOUTUBE_CLIENT_ID
    echo     - YOUTUBE_CLIENT_SECRET
    echo     (See SETUP_GUIDE.md for step-by-step instructions)
    echo.
    echo   Press any key to open .env in Notepad...
    pause >nul
    notepad "%ROOT%\.env"
) else (
    echo   .env already exists — skipping
)

REM ─── Create data directories ──────────────────────────────────
echo.
echo [7/7] Creating directories...
if not exist "%ROOT%\output" mkdir "%ROOT%\output"
if not exist "%ROOT%\data" mkdir "%ROOT%\data"
if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"
echo   output\, data\, logs\ created.

REM ─── Done ─────────────────────────────────────────────────────
echo.
echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo   Next steps:
echo   1. Make sure .env has your credentials
echo   2. Run: authenticate_youtube.bat (first-time YouTube auth)
echo   3. Run: start_dashboard.bat (opens the web dashboard)
echo   4. Run: run_daily.bat (or let Task Scheduler call it)
echo.
echo   Read SETUP_GUIDE.md for detailed instructions.
echo.
pause

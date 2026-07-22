@echo off
setlocal enabledelayedexpansion
title Shorts Factory — Daily Run

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo [%date% %time%] Shorts Factory Daily Run Starting...

REM Activate virtual environment
call "%ROOT%\venv\Scripts\activate.bat"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: venv not found. Run setup.bat first.
    exit /b 1
)

REM Run the pipeline
python "%ROOT%\backend\main.py" %*

echo [%date% %time%] Daily run complete.

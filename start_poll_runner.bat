@echo off
title Shorts Factory — Cloud Listener (Vercel Mode)
echo.
echo ============================================================
echo   Shorts Factory Cloud Listener
echo   Listening to Supabase for runs triggered on Vercel...
echo ============================================================
echo.

C:\sf_venv\Scripts\python.exe backend\poll_runner.py
pause

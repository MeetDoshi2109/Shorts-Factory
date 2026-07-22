@echo off
title Shorts Factory — YouTube Auth
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"

echo.
echo ============================================================
echo   YouTube OAuth2 One-Time Authorization
echo ============================================================
echo.
echo   This will open your browser to authorize Shorts Factory
echo   to upload videos to your YouTube channel.
echo.
echo   Make sure you have set YOUTUBE_CLIENT_ID and 
echo   YOUTUBE_CLIENT_SECRET in your .env file first.
echo   (See SETUP_GUIDE.md)
echo.
pause

call "%ROOT%\venv\Scripts\activate.bat"
python "%ROOT%\backend\upload_youtube.py"

echo.
echo   If successful, a token has been saved to data\youtube_token.json
echo   You won't need to do this again (token auto-refreshes).
echo.
pause

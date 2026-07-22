# Shorts Factory — Complete Setup Guide

## Overview

This guide will get you from zero to automatically uploading YouTube Shorts in 15-20 minutes.

**What you need:**
- Python 3.8+ (you likely have this)
- FFmpeg (free video tool)
- A Gemini API key (free)
- A Google Cloud project (free) for YouTube API
- A new YouTube channel/account

---

## Step 1: Install FFmpeg

FFmpeg is required to render videos.

1. Download from: https://www.gyan.dev/ffmpeg/builds/ → click **ffmpeg-release-essentials.zip**
2. Extract to `C:\ffmpeg\`
3. Add to PATH:
   - Press `Win + S` → "Edit environment variables"
   - Click "Environment Variables"
   - Under "System variables", select "Path" → Edit
   - Click "New" → paste `C:\ffmpeg\bin`
   - Click OK everywhere
4. Test: Open a new terminal → `ffmpeg -version` should show version info

---

## Step 2: Get a Gemini API Key (Free)

1. Go to: https://aistudio.google.com
2. Sign in with your Google account
3. Click **"Get API key"** → **"Create API key"**
4. Copy the key (starts with `AIza...`)
5. Open your `.env` file and paste it:
   ```
   GEMINI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXX
   ```

**Free tier:** 15 requests/minute, 1 million tokens/day — more than enough!

---

## Step 3: Set Up YouTube API Credentials

### 3a. Create Google Cloud Project

1. Go to: https://console.cloud.google.com
2. Click the project dropdown → **"New Project"**
3. Name it `shorts-factory` → Create

### 3b. Enable APIs

1. In your project, go to **APIs & Services** → **Library**
2. Search for and enable **"YouTube Data API v3"** → Enable
3. Search for and enable **"YouTube Analytics API"** → Enable

### 3c. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** → Create
3. Fill in:
   - App name: `Shorts Factory`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through all steps
5. On the last step, click **Back to Dashboard**
6. Click **"Publish App"** → Confirm (this makes it usable without Google review)

### 3d. Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Application type: **Desktop app**
4. Name: `Shorts Factory Desktop`
5. Click **Create**
6. Note your **Client ID** and **Client Secret**
7. Add to `.env`:
   ```
   YOUTUBE_CLIENT_ID=1234567890-xxxx.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
   ```

---

## Step 4: Run Setup

1. Double-click **`setup.bat`**
2. It will:
   - Check Python & FFmpeg
   - Create a virtual environment
   - Install all Python packages
   - Create your `.env` from the template

---

## Step 5: Connect YouTube Account

1. Make sure your `.env` has all credentials filled in
2. Double-click **`authenticate_youtube.bat`**
3. Your browser will open and ask you to:
   - Sign in to your new YouTube account
   - Grant permissions to Shorts Factory
4. After authorization, you'll see "Authentication successful"
5. A token is saved to `data/youtube_token.json` — it auto-refreshes

---

## Step 6: Launch Dashboard

1. Double-click **`start_dashboard.bat`**
2. Browser opens at http://localhost:8899/frontend/index.html
3. You'll see the Shorts Factory dashboard!

---

## Step 7: Run Your First Short

### Option A: Dashboard
1. In the dashboard, click **"Run Now"** in the sidebar
2. Or go to **New Short** → configure → click **"Start Pipeline"**

### Option B: Command Line
```
cd "C:\Users\Asus\OneDrive\Desktop\Shorts Factory"
venv\Scripts\activate
python backend\main.py --dry-run    # Test without uploading
python backend\main.py              # Full run
```

---

## Step 8: Set Up Automation (3×/day)

Run this command in an administrator PowerShell to schedule 3 daily runs:

```powershell
$root = "C:\Users\Asus\OneDrive\Desktop\Shorts Factory"

schtasks /create /tn "ShortsFactory_Noon" /tr "$root\run_daily.bat" /sc daily /st 12:00 /f
schtasks /create /tn "ShortsFactory_5pm" /tr "$root\run_daily.bat" /sc daily /st 17:00 /f
schtasks /create /tn "ShortsFactory_9pm" /tr "$root\run_daily.bat" /sc daily /st 21:00 /f
```

---

## Project File Structure

```
Shorts Factory\
├── backend\            ← Python automation engine
│   ├── main.py         ← Full pipeline orchestrator
│   ├── generate_content.py  ← AI script generation (Gemini)
│   ├── generate_voice.py    ← Text-to-speech (gTTS)
│   ├── generate_video.py    ← Video rendering (MoviePy)
│   ├── upload_youtube.py    ← YouTube upload + OAuth2
│   ├── fetch_analytics.py   ← YouTube Analytics API
│   ├── server.py       ← Flask dashboard API server
│   └── config.py       ← Central configuration
├── frontend\
│   └── index.html      ← Web dashboard
├── output\             ← Generated videos (auto-created)
├── data\               ← Persistent state
│   ├── topics.md       ← Topic backlog
│   ├── youtube_token.json   ← OAuth token (auto-created)
│   └── analytics_cache.json ← Cached analytics
├── logs\               ← Daily log files
├── .env                ← Your credentials (NEVER commit this)
├── setup.bat           ← One-click setup
├── start_dashboard.bat ← Launch web UI
├── run_daily.bat       ← Manual/scheduled pipeline run
└── authenticate_youtube.bat ← YouTube OAuth setup
```

---

## Troubleshooting

### "GEMINI_API_KEY not set"
→ Make sure `.env` exists and has your key. Run `setup.bat` to create it.

### "YouTube OAuth error"
→ Re-run `authenticate_youtube.bat`. Make sure your OAuth consent screen is published.

### "FFmpeg not found"
→ Reinstall FFmpeg and make sure `C:\ffmpeg\bin` is in your system PATH.

### "No module named X"
→ Make sure you ran `setup.bat` and the venv is activated.

### Videos rendering slowly
→ Normal! CPU rendering takes 30-90 seconds. Videos are 1080×1920 @ 30fps.

### "quota exceeded" from YouTube API
→ YouTube Data API has 10,000 units/day free. Uploading 1 video costs ~1,600 units. 
   For 3 uploads/day you use ~4,800 units — well within limits.

---

## FAQ

**Is this really free?**
Yes! Gemini 1.5 Flash: free tier. gTTS: free. MoviePy/FFmpeg: free. YouTube Data API: 10K units/day free.

**What niche should I use?**
The default is personal finance. You can change `CHANNEL_NICHE` in `.env` or via the dashboard Settings page.

**How long until I see views?**
New channels take time. Consistency matters most — 3 Shorts/day for 30 days is a good start.

**Can I customize the video style?**
Yes! Edit `backend/generate_video.py` — change `PALETTES` for colors, font sizes, animations.

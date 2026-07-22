# Shorts Factory — Complete Setup Guide

## Overview

This guide will get you from zero to a fully functional multi-tenant YouTube Shorts automation factory. The system is built on a **MERN + Supabase** architecture, featuring a Node.js/Express backend and a React (Vite + Tailwind v4) frontend.

**What you need:**
- Node.js (v18+)
- Python 3.8+
- FFmpeg (free video tool)
- A Supabase account (free)
- A Gemini API key (free)
- A Google Cloud project (free) for YouTube API

---

## Step 1: Install Dependencies & Tools

1. **Install Node.js & Python** if you haven't already.
2. **Install FFmpeg**:
   - Download from: https://www.gyan.dev/ffmpeg/builds/ → click **ffmpeg-release-essentials.zip**
   - Extract to `C:\ffmpeg\`
   - Add `C:\ffmpeg\bin` to your System PATH environment variable.
3. Open a terminal and verify:
   ```bash
   node -v
   python --version
   ffmpeg -version
   ```

---

## Step 2: Set Up Supabase (Database & Auth)

Shorts Factory uses Supabase for user authentication, storing settings, and tracking analytics securely per user (Multi-Tenant).

1. Go to [Supabase](https://supabase.com) and create a new project.
2. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public key**
   - **service_role secret key**
3. Open the **SQL Editor** in Supabase and run the provided SQL script to build the multi-tenant database schema with Row Level Security (RLS):
   - Copy the contents of `supabase/schema.sql` from this project.
   - Paste and run it in the SQL Editor.

---

## Step 3: Configure Environment Variables

Create `.env` files for both the root backend and the client frontend.

**Root Level (`/.env`):**
```
# Express Server Config
SERVER_PORT=8899

# Supabase Admin Config (For Express Server)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

**Client Level (`/client/.env`):**
```
# Frontend Supabase Config
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

---

## Step 4: Run Initial Setup

Double-click the **`setup.bat`** file in the root directory.
This will:
- Check for Node.js, Python, and FFmpeg
- Install Node dependencies for the `server/`
- Install Node dependencies for the `client/`
- Create a Python virtual environment (`venv`) and install Python packages.

---

## Step 5: Launch the Application

1. Double-click **`start_all.bat`**.
2. This script concurrently starts:
   - The Express backend API on `http://localhost:8899`
   - The React (Vite) frontend on `http://localhost:5173`
3. Your browser will automatically open to the frontend.

---

## Step 6: Create Account & Add API Keys

Because Shorts Factory is a multi-tenant cloud application, keys are tied to individual users rather than globally stored in a file.

1. On the web dashboard, **Create an Account** (Sign Up).
2. Once logged in, navigate to the **Account & Credentials** tab.
3. Input your personal API Keys:
   - **Gemini API Key**: Get a free one at [Google AI Studio](https://aistudio.google.com).
   - **YouTube OAuth Credentials**: Follow the steps in Step 7 to create these.
4. Click **Save Keys to Profile**. These are securely stored in your Supabase profile.

---

## Step 7: Set Up YouTube API Credentials (Optional, for Uploads)

To allow Shorts Factory to upload videos and fetch analytics for a user:

1. Go to: https://console.cloud.google.com and create a project (`shorts-factory`).
2. Enable **"YouTube Data API v3"** and **"YouTube Analytics API"**.
3. Configure the **OAuth consent screen** (External, fill required fields, Publish App).
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**.
5. Application type: **Desktop app**.
6. Copy the **Client ID** and **Client Secret**.
7. Paste these into the **Account** tab in the Shorts Factory dashboard.

---

## Project Architecture & Structure

```text
Shorts Factory/
├── server/             ← Express.js Backend API
│   ├── src/routes/     ← API endpoints (topics, settings, analytics, pipeline)
│   └── package.json
├── client/             ← React (Vite) Frontend SPA
│   ├── src/pages/      ← Dashboard UI components
│   └── vite.config.js
├── backend/            ← Python Automation Scripts
│   ├── main.py         ← Pipeline orchestrator
│   ├── generate_content.py
│   └── generate_video.py
├── supabase/           
│   └── schema.sql      ← Multi-tenant database schema definition
├── .env                ← Root Server environment vars
├── setup.bat           ← One-click dependency installer
└── start_all.bat       ← Launches React frontend and Express backend
```

---

## Troubleshooting

### Blank Screen / React Fails to Load
Ensure you have created `client/.env` (or `.env.local`) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and that you have run `npm install` in the `client/` folder.

### "JWT verification failed" / Cannot fetch topics
Your Supabase Token may have expired, or you need to re-login. Make sure your Express backend `.env` has the correct `SUPABASE_SERVICE_KEY`.

### Python Pipeline Fails
Ensure `FFmpeg` is in your Windows PATH and that `setup.bat` successfully created the virtual environment and installed the requirements.

### Videos rendering slowly
Normal! CPU rendering via FFmpeg takes 30-90 seconds. Videos are generated at 1080×1920 @ 30fps.

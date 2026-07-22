# 🚀 Deploying Shorts Factory to Vercel

This guide walks you through deploying the **Shorts Factory** dashboard and API to Vercel in less than 5 minutes.

---

## 1. Prerequisites

1. A **Vercel Account** ([vercel.com](https://vercel.com))
2. A **Supabase Project** ([supabase.com](https://supabase.com)) with `schema.sql` executed in SQL Editor.
3. Your **Gemini API Key** & **YouTube OAuth Credentials**.

---

## 2. One-Click Vercel CLI Deployment

If you have Vercel CLI installed (`npm i -g vercel`):

```bash
# In project root:
vercel
```

Follow the prompts:
- **Set up and deploy?** `Yes`
- **Which scope?** Your account
- **Link to existing project?** `No`
- **Project name?** `shorts-factory`
- **In which directory is your code located?** `./`

Vercel will detect `vercel.json` automatically!

---

## 3. Deploying via GitHub (Recommended)

1. Push your repository to GitHub.
2. Log in to [Vercel Dashboard](https://vercel.com/dashboard) → Click **"Add New Project"**.
3. Import your `shorts-factory` repository.
4. Framework Preset: **Vite** (or Other).
5. Root Directory: `./`
6. Click **Environment Variables** and add the following keys:

### 🔑 Environment Variables to Set on Vercel

| Variable Name | Description | Example |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Public Anon Key | `eyJhbGci...` |
| `SUPABASE_URL` | Supabase Service URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key | `eyJhbGci...` |
| `GEMINI_API_KEY` | Google Gemini AI Key | `AIzaSy...` |
| `YOUTUBE_CLIENT_ID` | Google OAuth Client ID | `xxxx.apps.googleusercontent.com` |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxxx` |

7. Click **"Deploy"**.

---

## 4. Architecture Overview on Vercel

- **Frontend**: React SPA deployed as optimized static assets on Vercel's Edge Network (`client/dist`).
- **API Server**: Express.js routes served as Vercel Serverless Functions at `/api/*`.
- **Database & Sync**: Supabase PostgreSQL database handles state, runs, topics, analytics cache, and user settings.
- **Local Automation Helper**: Video rendering (`MoviePy` & `FFmpeg`) runs locally on your PC via `run_daily.bat` or Task Scheduler, pushing results directly to Supabase so your Vercel Dashboard updates live in real-time!

---

## 5. Testing Deployment

After deployment:
1. Open your Vercel App URL (e.g. `https://shorts-factory.vercel.app`).
2. Navigate to **Account** to verify API keys and Supabase connection badges are green.
3. Check the **Dashboard** and **Analytics** pages to see live metrics synced with Supabase!

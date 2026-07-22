"""
config.py — Central configuration loader for Shorts Factory.
Reads .env from the project root and exposes all settings as typed constants.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ─── Find and load .env ──────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

if not ENV_FILE.exists():
    print(f"[config] WARNING: .env not found at {ENV_FILE}")
    print("[config] Copy .env.example to .env and fill in your credentials.")
else:
    load_dotenv(ENV_FILE)

# ─── Gemini AI ───────────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = "gemini-1.5-flash"          # Free tier model

# ─── YouTube OAuth2 ──────────────────────────────────────────────────────────
YOUTUBE_CLIENT_ID: str = os.getenv("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET: str = os.getenv("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_TOKEN_FILE: Path = PROJECT_ROOT / "data" / "youtube_token.json"
YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

# ─── Channel Settings ────────────────────────────────────────────────────────
CHANNEL_NICHE: str = os.getenv("CHANNEL_NICHE", "personal finance")
CHANNEL_TARGET_AUDIENCE: str = os.getenv("CHANNEL_TARGET_AUDIENCE", "young adults 18-35")
UPLOAD_PRIVACY: str = os.getenv("UPLOAD_PRIVACY", "public")
DAILY_UPLOAD_COUNT: int = int(os.getenv("DAILY_UPLOAD_COUNT", "3"))

# ─── Video Rendering Settings ────────────────────────────────────────────────
VIDEO_WIDTH: int = int(os.getenv("VIDEO_WIDTH", "1080"))
VIDEO_HEIGHT: int = int(os.getenv("VIDEO_HEIGHT", "1920"))
VIDEO_FPS: int = int(os.getenv("VIDEO_FPS", "30"))
VIDEO_DURATION_MAX: int = int(os.getenv("VIDEO_DURATION_MAX", "58"))

# ─── Email Digest (optional) ─────────────────────────────────────────────────
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_APP_PASSWORD: str = os.getenv("SMTP_APP_PASSWORD", "")
SMTP_TO_EMAIL: str = os.getenv("SMTP_TO_EMAIL", "")
EMAIL_ENABLED: bool = bool(SMTP_FROM_EMAIL and SMTP_APP_PASSWORD and SMTP_TO_EMAIL)

# ─── App / Server ────────────────────────────────────────────────────────────
DASHBOARD_PORT: int = int(os.getenv("DASHBOARD_PORT", "8899"))
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

# ─── Directory Structure ─────────────────────────────────────────────────────
OUTPUT_DIR: Path = PROJECT_ROOT / "output"
DATA_DIR: Path = PROJECT_ROOT / "data"
LOGS_DIR: Path = PROJECT_ROOT / "logs"

# Auto-create required directories
for d in (OUTPUT_DIR, DATA_DIR, LOGS_DIR):
    d.mkdir(parents=True, exist_ok=True)

# ─── Data Files ──────────────────────────────────────────────────────────────
VIDEO_PROGRESS_FILE: Path = DATA_DIR / "video_progress.json"
ANALYTICS_CACHE_FILE: Path = DATA_DIR / "analytics_cache.json"
TOPICS_FILE: Path = DATA_DIR / "topics.md"
LEARNINGS_FILE: Path = DATA_DIR / "learnings.md"

def validate() -> bool:
    """Return True if minimum required credentials are present."""
    ok = True
    if not GEMINI_API_KEY:
        print("[config] MISSING: GEMINI_API_KEY")
        ok = False
    if not YOUTUBE_CLIENT_ID:
        print("[config] MISSING: YOUTUBE_CLIENT_ID")
        ok = False
    if not YOUTUBE_CLIENT_SECRET:
        print("[config] MISSING: YOUTUBE_CLIENT_SECRET")
        ok = False
    return ok


if __name__ == "__main__":
    print("=== Shorts Factory Config ===")
    print(f"  Project root : {PROJECT_ROOT}")
    print(f"  Niche        : {CHANNEL_NICHE}")
    print(f"  Gemini key   : {'✓ SET' if GEMINI_API_KEY else '✗ MISSING'}")
    print(f"  YT Client ID : {'✓ SET' if YOUTUBE_CLIENT_ID else '✗ MISSING'}")
    print(f"  YT token     : {'✓ EXISTS' if YOUTUBE_TOKEN_FILE.exists() else '✗ not yet auth'd'}")
    print(f"  Output dir   : {OUTPUT_DIR}")
    validate()

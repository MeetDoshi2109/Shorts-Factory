"""
upload_youtube.py — Upload videos to YouTube via the Data API v3.

Uses OAuth2 with stored refresh token (token saved in data/youtube_token.json).
First run: opens browser for one-time authorization.
Subsequent runs: uses stored refresh token silently.
"""
import json
import logging
import os
import sys
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

sys.path.insert(0, str(Path(__file__).parent))
import config

log = logging.getLogger(__name__)


# ─── Auth ────────────────────────────────────────────────────────────────────
def get_credentials() -> Credentials:
    """
    Get valid YouTube OAuth2 credentials.
    First run: opens browser for authorization.
    Subsequent runs: refreshes token silently.
    """
    creds = None
    token_file = config.YOUTUBE_TOKEN_FILE

    # Load existing token
    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), config.YOUTUBE_SCOPES)

    # If no valid creds, do OAuth flow
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            log.info("Refreshing expired YouTube token...")
            creds.refresh(Request())
        else:
            log.info("Starting YouTube OAuth2 flow (browser will open)...")

            if not config.YOUTUBE_CLIENT_ID or not config.YOUTUBE_CLIENT_SECRET:
                raise RuntimeError(
                    "YouTube OAuth2 credentials not found in .env\n"
                    "See SETUP_GUIDE.md for how to set them up."
                )

            client_config = {
                "installed": {
                    "client_id": config.YOUTUBE_CLIENT_ID,
                    "client_secret": config.YOUTUBE_CLIENT_SECRET,
                    "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            }

            flow = InstalledAppFlow.from_client_config(
                client_config, config.YOUTUBE_SCOPES
            )
            creds = flow.run_local_server(port=0, open_browser=True)
            log.info("YouTube authorization successful!")

        # Save token for future use
        token_file.parent.mkdir(parents=True, exist_ok=True)
        token_file.write_text(creds.to_json(), encoding="utf-8")
        log.info(f"Token saved: {token_file}")

    return creds


def get_youtube_service():
    """Build and return an authenticated YouTube Data API service."""
    creds = get_credentials()
    return build("youtube", "v3", credentials=creds)


# ─── Upload ──────────────────────────────────────────────────────────────────
def upload_short(
    video_path: Path | str,
    title: str,
    description: str,
    tags: list[str],
    privacy: str = None,
    category_id: str = "22",   # 22 = People & Blogs (common for Shorts)
    dry_run: bool = False,
) -> dict:
    """
    Upload a video to YouTube as a Short.

    Args:
        video_path: Path to MP4 file.
        title: Video title (max 100 chars).
        description: Video description.
        tags: List of tags.
        privacy: "public", "unlisted", or "private".
        category_id: YouTube category ID.
        dry_run: If True, validate everything but skip actual upload.

    Returns:
        dict with video_id, url, title
    """
    video_path = Path(video_path)
    privacy = privacy or config.UPLOAD_PRIVACY

    if not video_path.exists():
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Ensure title has #Shorts for Shorts shelf
    if "#Shorts" not in title and "#shorts" not in title:
        title = title[:90] + " #Shorts"

    # Ensure description has #Shorts
    if "#Shorts" not in description:
        description = description + "\n\n#Shorts #" + config.CHANNEL_NICHE.replace(" ", "")

    log.info(f"Preparing upload: {video_path.name}")
    log.info(f"  Title: {title}")
    log.info(f"  Privacy: {privacy}")
    log.info(f"  Tags: {tags}")

    if dry_run:
        log.info("[DRY RUN] Skipping actual upload")
        return {
            "video_id": "DRY_RUN_ID",
            "url": "https://youtube.com/watch?v=DRY_RUN_ID",
            "title": title,
            "dry_run": True,
        }

    youtube = get_youtube_service()

    body = {
        "snippet": {
            "title": title[:100],
            "description": description[:5000],
            "tags": tags[:500],
            "categoryId": category_id,
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": privacy,
            "selfDeclaredMadeForKids": False,
        },
    }

    media = MediaFileUpload(
        str(video_path),
        mimetype="video/mp4",
        resumable=True,
        chunksize=256 * 1024,  # 256 KB chunks
    )

    log.info("Starting upload...")
    try:
        request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media,
        )

        response = None
        while response is None:
            status, response = request.next_chunk()
            if status:
                pct = int(status.progress() * 100)
                log.info(f"  Upload progress: {pct}%")

        video_id = response.get("id")
        url = f"https://www.youtube.com/watch?v={video_id}"
        log.info(f"Upload complete! {url}")

        return {
            "video_id": video_id,
            "url": url,
            "title": title,
            "privacy": privacy,
        }

    except HttpError as e:
        log.error(f"YouTube API error: {e}")
        raise


def get_channel_info() -> dict:
    """Get basic info about the authenticated channel."""
    try:
        youtube = get_youtube_service()
        response = youtube.channels().list(
            part="snippet,statistics",
            mine=True,
        ).execute()

        items = response.get("items", [])
        if not items:
            return {}

        ch = items[0]
        stats = ch.get("statistics", {})
        return {
            "id": ch.get("id"),
            "title": ch["snippet"].get("title"),
            "description": ch["snippet"].get("description"),
            "thumbnail": ch["snippet"].get("thumbnails", {}).get("default", {}).get("url"),
            "subscribers": int(stats.get("subscriberCount", 0)),
            "total_views": int(stats.get("viewCount", 0)),
            "video_count": int(stats.get("videoCount", 0)),
        }
    except Exception as e:
        log.error(f"Could not fetch channel info: {e}")
        return {}


# ─── CLI ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    parser = argparse.ArgumentParser(description="Upload a video to YouTube")
    parser.add_argument("--video", required=False, help="Path to MP4 file")
    parser.add_argument("--title", default="Test Short #Shorts", help="Video title")
    parser.add_argument("--description", default="Test description #Shorts", help="Description")
    parser.add_argument("--tags", default="shorts,test", help="Comma-separated tags")
    parser.add_argument("--privacy", default="private", help="public/unlisted/private")
    parser.add_argument("--dry-run", action="store_true", help="Validate without uploading")
    parser.add_argument("--channel-info", action="store_true", help="Show channel info")
    args = parser.parse_args()

    if args.channel_info:
        info = get_channel_info()
        print(json.dumps(info, indent=2))
    elif args.video:
        result = upload_short(
            video_path=args.video,
            title=args.title,
            description=args.description,
            tags=args.tags.split(","),
            privacy=args.privacy,
            dry_run=args.dry_run,
        )
        print(json.dumps(result, indent=2))
    else:
        # Auth-only test
        print("Testing YouTube auth (browser will open if first time)...")
        creds = get_credentials()
        print("✓ Auth successful!")
        info = get_channel_info()
        if info:
            print(f"  Channel: {info.get('title')}")
            print(f"  Subscribers: {info.get('subscribers'):,}")

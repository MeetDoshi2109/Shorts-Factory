"""
fetch_analytics.py — Fetch YouTube analytics for your channel's Shorts.

Uses YouTube Analytics API to pull:
  - Views per video
  - Watch time
  - Subscriber changes
  - CTR (when available)
  - Top-performing videos

Data is cached to data/analytics_cache.json to avoid repeated API calls.
"""
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

sys.path.insert(0, str(Path(__file__).parent))
import config

log = logging.getLogger(__name__)

CACHE_TTL_HOURS = 4   # Refresh analytics cache every 4 hours


def _get_analytics_service():
    """Build YouTube Analytics API service using stored credentials."""
    from upload_youtube import get_credentials
    creds = get_credentials()
    return build("youtubeAnalytics", "v2", credentials=creds)


def _get_youtube_service():
    from upload_youtube import get_credentials
    creds = get_credentials()
    return build("youtube", "v3", credentials=creds)


def _load_cache() -> dict:
    if config.ANALYTICS_CACHE_FILE.exists():
        try:
            data = json.loads(config.ANALYTICS_CACHE_FILE.read_text(encoding="utf-8"))
            cached_at = datetime.fromisoformat(data.get("cached_at", "2000-01-01"))
            age = (datetime.now() - cached_at).total_seconds() / 3600
            if age < CACHE_TTL_HOURS:
                log.info(f"Using cached analytics ({age:.1f}h old)")
                return data
        except Exception as e:
            log.warning(f"Cache read error: {e}")
    return {}


def _save_cache(data: dict):
    data["cached_at"] = datetime.now().isoformat()
    config.ANALYTICS_CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    config.ANALYTICS_CACHE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def fetch_channel_analytics(days: int = 28, force: bool = False) -> dict:
    """
    Fetch channel-level analytics for the past N days.

    Returns dict with: views, watchMinutes, subscribers, estimatedRevenue,
    averageViewDuration, topVideos
    """
    cached = _load_cache()
    if cached and not force:
        return cached

    log.info(f"Fetching YouTube analytics for last {days} days...")
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    try:
        svc = _get_analytics_service()
        yt = _get_youtube_service()

        # ── Get channel ID ─────────────────────────────────────────────────────
        ch_response = yt.channels().list(part="id,statistics,snippet", mine=True).execute()
        channel_items = ch_response.get("items", [])
        if not channel_items:
            return _empty_analytics()

        channel = channel_items[0]
        channel_id = channel["id"]
        channel_stats = channel.get("statistics", {})

        # ── Overview metrics ───────────────────────────────────────────────────
        overview = svc.reports().query(
            ids=f"channel=={channel_id}",
            startDate=start_date,
            endDate=end_date,
            metrics="views,estimatedMinutesWatched,subscribersGained,subscribersLost,"
                    "averageViewDuration,likes,comments",
            dimensions="day",
            sort="day",
        ).execute()

        rows = overview.get("rows", [])
        totals = {
            "views": 0, "watch_minutes": 0, "subs_gained": 0,
            "subs_lost": 0, "likes": 0, "comments": 0,
        }
        daily_views = []

        for row in rows:
            date_str, views, watch_min, sg, sl, avg_dur, likes, comments = row
            totals["views"] += int(views)
            totals["watch_minutes"] += float(watch_min)
            totals["subs_gained"] += int(sg)
            totals["subs_lost"] += int(sl)
            totals["likes"] += int(likes)
            totals["comments"] += int(comments)
            daily_views.append({"date": date_str, "views": int(views)})

        # ── Top videos ─────────────────────────────────────────────────────────
        top_videos_response = svc.reports().query(
            ids=f"channel=={channel_id}",
            startDate=start_date,
            endDate=end_date,
            metrics="views,estimatedMinutesWatched,likes,averageViewPercentage",
            dimensions="video",
            sort="-views",
            maxResults=10,
        ).execute()

        top_video_ids = []
        top_video_stats = {}
        for row in top_videos_response.get("rows", []):
            vid_id, views, watch_min, likes, avg_pct = row
            top_video_ids.append(vid_id)
            top_video_stats[vid_id] = {
                "views": int(views),
                "watch_minutes": float(watch_min),
                "likes": int(likes),
                "avg_view_percentage": float(avg_pct),
            }

        # Get video details (titles, thumbnails)
        top_videos = []
        if top_video_ids:
            details = yt.videos().list(
                part="snippet,statistics",
                id=",".join(top_video_ids[:10]),
            ).execute()
            for item in details.get("items", []):
                vid_id = item["id"]
                snip = item.get("snippet", {})
                stats = item.get("statistics", {})
                analytics_stats = top_video_stats.get(vid_id, {})
                top_videos.append({
                    "id": vid_id,
                    "title": snip.get("title", ""),
                    "thumbnail": snip.get("thumbnails", {}).get("high", {}).get("url", ""),
                    "published_at": snip.get("publishedAt", ""),
                    "url": f"https://youtube.com/watch?v={vid_id}",
                    "views": analytics_stats.get("views", int(stats.get("viewCount", 0))),
                    "likes": analytics_stats.get("likes", int(stats.get("likeCount", 0))),
                    "comments": int(stats.get("commentCount", 0)),
                    "avg_view_percentage": analytics_stats.get("avg_view_percentage", 0),
                })

        result = {
            "period_days": days,
            "start_date": start_date,
            "end_date": end_date,
            "channel": {
                "id": channel_id,
                "title": channel["snippet"].get("title", ""),
                "thumbnail": channel["snippet"].get("thumbnails", {}).get("default", {}).get("url", ""),
                "total_subscribers": int(channel_stats.get("subscriberCount", 0)),
                "total_views": int(channel_stats.get("viewCount", 0)),
                "video_count": int(channel_stats.get("videoCount", 0)),
            },
            "totals": totals,
            "daily_views": daily_views,
            "top_videos": top_videos,
        }

        _save_cache(result)
        log.info(f"Analytics fetched: {totals['views']:,} views in {days} days")
        return result

    except Exception as e:
        log.error(f"Analytics fetch failed: {e}")
        # Return cached data if available, otherwise empty
        if cached:
            log.info("Returning stale cache due to error")
            return cached
        return _empty_analytics()


def _empty_analytics() -> dict:
    """Return empty analytics structure (when no data available yet)."""
    return {
        "period_days": 28,
        "start_date": (datetime.now() - timedelta(days=28)).strftime("%Y-%m-%d"),
        "end_date": datetime.now().strftime("%Y-%m-%d"),
        "channel": {
            "id": "",
            "title": "Your Channel",
            "thumbnail": "",
            "total_subscribers": 0,
            "total_views": 0,
            "video_count": 0,
        },
        "totals": {
            "views": 0, "watch_minutes": 0, "subs_gained": 0,
            "subs_lost": 0, "likes": 0, "comments": 0,
        },
        "daily_views": [],
        "top_videos": [],
        "note": "No analytics data yet. Publish your first Short!",
    }


def fetch_video_list(max_results: int = 50) -> list[dict]:
    """Fetch list of uploaded videos with stats."""
    try:
        yt = _get_youtube_service()

        # Get uploads playlist
        ch = yt.channels().list(part="contentDetails", mine=True).execute()
        if not ch.get("items"):
            return []
        uploads_playlist = ch["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]

        # Get video IDs
        playlist_items = yt.playlistItems().list(
            part="snippet",
            playlistId=uploads_playlist,
            maxResults=max_results,
        ).execute()

        video_ids = [item["snippet"]["resourceId"]["videoId"]
                     for item in playlist_items.get("items", [])]

        if not video_ids:
            return []

        # Get video stats
        details = yt.videos().list(
            part="snippet,statistics,contentDetails",
            id=",".join(video_ids),
        ).execute()

        videos = []
        for item in details.get("items", []):
            snip = item["snippet"]
            stats = item.get("statistics", {})
            videos.append({
                "id": item["id"],
                "title": snip.get("title", ""),
                "description": snip.get("description", ""),
                "thumbnail": snip.get("thumbnails", {}).get("high", {}).get("url", ""),
                "published_at": snip.get("publishedAt", ""),
                "url": f"https://youtube.com/watch?v={item['id']}",
                "views": int(stats.get("viewCount", 0)),
                "likes": int(stats.get("likeCount", 0)),
                "comments": int(stats.get("commentCount", 0)),
                "duration": item.get("contentDetails", {}).get("duration", "PT0S"),
            })

        return sorted(videos, key=lambda v: v["published_at"], reverse=True)

    except Exception as e:
        log.error(f"Could not fetch video list: {e}")
        return []


# ─── CLI ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--videos", action="store_true")
    args = parser.parse_args()

    if args.videos:
        videos = fetch_video_list()
        print(json.dumps(videos, indent=2))
    else:
        data = fetch_channel_analytics(days=args.days, force=args.force)
        print(json.dumps(data, indent=2, default=str))

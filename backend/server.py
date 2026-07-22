"""
server.py — Flask REST API server for the Shorts Factory web dashboard.

Runs on port 8899 (configurable via DASHBOARD_PORT in .env).
Provides endpoints for the frontend to call, and serves the frontend HTML.

Endpoints:
  GET  /                    - Redirect to dashboard
  GET  /dashboard           - Serve frontend/index.html
  GET  /api/status          - Server health + pipeline status
  GET  /api/analytics       - YouTube analytics (cached)
  GET  /api/videos          - List of uploaded videos
  GET  /api/progress        - Video progress ledger
  GET  /api/topics          - Current topic list
  POST /api/topics          - Add a topic
  GET  /api/logs            - Recent log entries
  GET  /api/settings        - Current config
  POST /api/settings        - Update settings (writes to .env)
  POST /api/run             - Trigger a pipeline run (async)
  GET  /api/run/status      - Check running pipeline status
  POST /api/auth/youtube    - Start YouTube OAuth flow
"""
import json
import logging
import os
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

sys.path.insert(0, str(Path(__file__).parent))
import config

log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow frontend to call API

# ─── Pipeline State ───────────────────────────────────────────────────────────
_pipeline_state = {
    "running": False,
    "last_run": None,
    "last_result": None,
    "log_buffer": [],
}
_pipeline_lock = threading.Lock()


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _load_progress() -> list:
    if config.VIDEO_PROGRESS_FILE.exists():
        try:
            return json.loads(config.VIDEO_PROGRESS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def _recent_logs(n: int = 100) -> list[str]:
    """Read last N lines from today's log file."""
    log_file = config.LOGS_DIR / f"run_{datetime.now().strftime('%Y%m%d')}.log"
    if not log_file.exists():
        return []
    try:
        lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()
        return lines[-n:]
    except Exception:
        return []


def _run_pipeline_async(topic=None, dry_run=False, skip_gate=False):
    """Run the pipeline in a background thread."""
    with _pipeline_lock:
        _pipeline_state["running"] = True
        _pipeline_state["last_run"] = datetime.now().isoformat()

    try:
        from main import run_pipeline
        result = run_pipeline(topic=topic, dry_run=dry_run, skip_gate=skip_gate)
        with _pipeline_lock:
            _pipeline_state["last_result"] = result
    except Exception as e:
        with _pipeline_lock:
            _pipeline_state["last_result"] = {"success": False, "error": str(e)}
    finally:
        with _pipeline_lock:
            _pipeline_state["running"] = False


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.route("/api/status")
def api_status():
    """Health check + pipeline status."""
    return jsonify({
        "status": "ok",
        "pipeline_running": _pipeline_state["running"],
        "last_run": _pipeline_state.get("last_run"),
        "server_time": datetime.now().isoformat(),
        "config": {
            "niche": config.CHANNEL_NICHE,
            "upload_privacy": config.UPLOAD_PRIVACY,
            "daily_count": config.DAILY_UPLOAD_COUNT,
            "gemini_configured": bool(config.GEMINI_API_KEY),
            "youtube_configured": bool(config.YOUTUBE_CLIENT_ID),
            "youtube_token_exists": config.YOUTUBE_TOKEN_FILE.exists(),
        }
    })


@app.route("/api/analytics")
def api_analytics():
    """Get YouTube analytics (cached)."""
    force = request.args.get("force", "false").lower() == "true"
    days = int(request.args.get("days", "28"))

    try:
        from fetch_analytics import fetch_channel_analytics
        data = fetch_channel_analytics(days=days, force=force)
        return jsonify(data)
    except Exception as e:
        # Return empty analytics structure
        return jsonify({
            "error": str(e),
            "channel": {"title": "Not connected", "total_subscribers": 0},
            "totals": {"views": 0, "watch_minutes": 0, "subs_gained": 0},
            "daily_views": [],
            "top_videos": [],
        })


@app.route("/api/videos")
def api_videos():
    """Get uploaded videos list."""
    try:
        from fetch_analytics import fetch_video_list
        videos = fetch_video_list(max_results=50)
        return jsonify(videos)
    except Exception as e:
        return jsonify({"error": str(e), "videos": []})


@app.route("/api/progress")
def api_progress():
    """Get video production progress ledger."""
    progress = _load_progress()
    return jsonify(progress)


@app.route("/api/topics", methods=["GET"])
def api_topics_get():
    """Get current topic list."""
    try:
        from generate_content import load_topics
        topics = load_topics()
        return jsonify({"topics": topics})
    except Exception as e:
        return jsonify({"error": str(e), "topics": []})


@app.route("/api/topics", methods=["POST"])
def api_topics_post():
    """Add a new topic."""
    data = request.get_json()
    topic = (data or {}).get("topic", "").strip()
    if not topic:
        return jsonify({"error": "No topic provided"}), 400

    # Append to topics file
    with open(config.TOPICS_FILE, "a", encoding="utf-8") as f:
        f.write(f"\n- {topic}")

    return jsonify({"success": True, "topic": topic})


@app.route("/api/logs")
def api_logs():
    """Get recent log lines."""
    n = int(request.args.get("n", "100"))
    return jsonify({"logs": _recent_logs(n)})


@app.route("/api/settings", methods=["GET"])
def api_settings_get():
    """Get current settings."""
    return jsonify({
        "channel_niche": config.CHANNEL_NICHE,
        "channel_target_audience": config.CHANNEL_TARGET_AUDIENCE,
        "upload_privacy": config.UPLOAD_PRIVACY,
        "daily_upload_count": config.DAILY_UPLOAD_COUNT,
        "video_duration_max": config.VIDEO_DURATION_MAX,
        "dashboard_port": config.DASHBOARD_PORT,
        "gemini_key_set": bool(config.GEMINI_API_KEY),
        "youtube_configured": bool(config.YOUTUBE_CLIENT_ID and config.YOUTUBE_CLIENT_SECRET),
        "youtube_authed": config.YOUTUBE_TOKEN_FILE.exists(),
        "email_enabled": config.EMAIL_ENABLED,
    })


@app.route("/api/settings", methods=["POST"])
def api_settings_post():
    """Update settings (writes to .env)."""
    data = request.get_json() or {}
    env_file = config.PROJECT_ROOT / ".env"

    if not env_file.exists():
        return jsonify({"error": ".env file not found. Run setup.bat first."}), 400

    content = env_file.read_text(encoding="utf-8")
    mapping = {
        "channel_niche": "CHANNEL_NICHE",
        "upload_privacy": "UPLOAD_PRIVACY",
        "daily_upload_count": "DAILY_UPLOAD_COUNT",
        "channel_target_audience": "CHANNEL_TARGET_AUDIENCE",
    }

    for field, env_var in mapping.items():
        if field in data:
            value = str(data[field])
            # Replace existing or append
            import re
            pattern = rf"^{env_var}=.*$"
            replacement = f"{env_var}={value}"
            if re.search(pattern, content, re.MULTILINE):
                content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
            else:
                content += f"\n{replacement}"

    env_file.write_text(content, encoding="utf-8")
    return jsonify({"success": True, "message": "Settings saved. Restart server to apply."})


@app.route("/api/run", methods=["POST"])
def api_run():
    """Trigger a pipeline run."""
    if _pipeline_state["running"]:
        return jsonify({"error": "Pipeline already running"}), 409

    data = request.get_json() or {}
    topic = data.get("topic")
    dry_run = data.get("dry_run", False)
    skip_gate = data.get("skip_gate", False)

    thread = threading.Thread(
        target=_run_pipeline_async,
        args=(topic, dry_run, skip_gate),
        daemon=True,
    )
    thread.start()

    return jsonify({
        "success": True,
        "message": "Pipeline started",
        "topic": topic or "auto",
    })


@app.route("/api/run/status")
def api_run_status():
    """Check pipeline run status."""
    return jsonify({
        "running": _pipeline_state["running"],
        "last_run": _pipeline_state.get("last_run"),
        "last_result": _pipeline_state.get("last_result"),
    })


@app.route("/api/auth/youtube", methods=["POST"])
def api_auth_youtube():
    """Start YouTube OAuth2 flow in background process."""
    try:
        # Launch auth flow in separate process (it opens a browser)
        result = subprocess.run(
            [sys.executable,
             str(Path(__file__).parent / "upload_youtube.py")],
            capture_output=True,
            text=True,
            timeout=120,
        )
        if config.YOUTUBE_TOKEN_FILE.exists():
            return jsonify({"success": True, "message": "YouTube connected successfully!"})
        else:
            return jsonify({"success": False, "message": result.stderr or "Auth failed"}), 400
    except subprocess.TimeoutExpired:
        return jsonify({"success": False, "message": "Auth timed out"}), 408
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/generate-topic", methods=["POST"])
def api_generate_topic():
    """Generate topic ideas using Gemini."""
    try:
        from generate_content import load_topics, virality_gate
        import google.generativeai as genai
        genai.configure(api_key=config.GEMINI_API_KEY)
        model = genai.GenerativeModel(config.GEMINI_MODEL)

        data = request.get_json() or {}
        niche = data.get("niche", config.CHANNEL_NICHE)

        prompt = f"""Generate 5 unique, viral YouTube Shorts topic ideas for the niche: {niche}
        
Each should be specific, have high emotional resonance, and appeal to {config.CHANNEL_TARGET_AUDIENCE}.
Output as JSON array: [{{"topic": "...", "hook": "First sentence that grabs attention"}}]
Output JSON only."""

        response = model.generate_content(prompt)
        raw = response.text.strip().lstrip("```json").rstrip("```").strip()
        ideas = json.loads(raw)
        return jsonify({"ideas": ideas})
    except Exception as e:
        return jsonify({"error": str(e), "ideas": []}), 500


if __name__ == "__main__":
    logging.basicConfig(
        level=getattr(logging, config.LOG_LEVEL, logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    print(f"\n{'='*60}")
    print("  Shorts Factory Dashboard Server")
    print(f"  http://localhost:{config.DASHBOARD_PORT}")
    print(f"{'='*60}\n")

    if not config.GEMINI_API_KEY:
        print("⚠ WARNING: GEMINI_API_KEY not set in .env")
    if not config.YOUTUBE_CLIENT_ID:
        print("⚠ WARNING: YOUTUBE_CLIENT_ID not set in .env")

    app.run(
        host="0.0.0.0",
        port=config.DASHBOARD_PORT,
        debug=False,
        threaded=True,
    )

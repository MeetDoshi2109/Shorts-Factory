"""
main.py — Orchestrates the full Shorts Factory pipeline.

Pipeline:
  1. Pick topic from backlog
  2. Check virality gate
  3. Generate script (Gemini AI)
  4. Generate voice (gTTS)
  5. Render video (Pillow + MoviePy)
  6. Upload to YouTube
  7. Log result to video_progress.json

Usage:
  python main.py               - Run full pipeline
  python main.py --topic "..."  - Override topic
  python main.py --dry-run     - Run without uploading
  python main.py --skip-gate   - Skip virality gate
"""
import argparse
import json
import logging
import sys
import traceback
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import config
from generate_content import generate_script, pick_topic, virality_gate
from generate_voice import get_audio_duration, text_to_speech
from generate_video import create_video
from upload_youtube import upload_short

# ─── Logging Setup ───────────────────────────────────────────────────────────
LOG_FILE = config.LOGS_DIR / f"run_{datetime.now().strftime('%Y%m%d')}.log"
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("main")


# ─── Progress Ledger ─────────────────────────────────────────────────────────
def load_progress() -> list:
    if config.VIDEO_PROGRESS_FILE.exists():
        try:
            return json.loads(config.VIDEO_PROGRESS_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return []


def save_progress(entries: list):
    config.VIDEO_PROGRESS_FILE.write_text(
        json.dumps(entries, indent=2), encoding="utf-8"
    )


def get_used_topics(progress: list) -> list:
    return [e.get("topic", "") for e in progress[-20:]]  # Last 20


# ─── Main Pipeline ───────────────────────────────────────────────────────────
def run_pipeline(
    topic: str = None,
    dry_run: bool = False,
    skip_gate: bool = False,
) -> dict:
    """
    Run the full Shorts Factory pipeline.

    Returns:
        dict with run results (success, video_id, url, error, etc.)
    """
    started_at = datetime.now()
    run_id = started_at.strftime("short_%Y%m%d_%H%M%S")

    log.info("=" * 60)
    log.info(f"Shorts Factory Pipeline — {run_id}")
    log.info("=" * 60)

    result = {
        "run_id": run_id,
        "started_at": started_at.isoformat(),
        "success": False,
        "topic": None,
        "title": None,
        "video_id": None,
        "url": None,
        "error": None,
        "dry_run": dry_run,
    }

    progress = load_progress()

    try:
        # ── Step 1: Pick Topic ────────────────────────────────────────────────
        if topic:
            log.info(f"Step 1: Using provided topic: {topic!r}")
        else:
            used = get_used_topics(progress)
            topic = pick_topic(used)
            log.info(f"Step 1: Picked topic: {topic!r}")
        result["topic"] = topic

        # ── Step 2: Virality Gate ─────────────────────────────────────────────
        if not skip_gate:
            log.info("Step 2: Running virality gate...")
            gate = virality_gate(topic)
            result["gate"] = gate
            if gate.get("verdict") == "FAIL":
                log.warning(f"Topic FAILED gate: {gate['reason']} (score={gate['score']})")
                log.info("Picking a new topic...")
                used.append(topic)
                topic = pick_topic(used)
                log.info(f"  New topic: {topic!r}")
                result["topic"] = topic
        else:
            log.info("Step 2: Virality gate skipped")

        # ── Step 3: Generate Script ───────────────────────────────────────────
        log.info("Step 3: Generating script with Gemini...")
        script_data = generate_script(topic)
        result["title"] = script_data.get("title")
        log.info(f"  Title: {script_data['title']}")
        log.info(f"  Words: {script_data.get('word_count', '?')}")

        # ── Step 4: Generate Voice ────────────────────────────────────────────
        log.info("Step 4: Generating TTS audio...")
        audio_path = config.OUTPUT_DIR / f"{run_id}_audio.mp3"
        text_to_speech(script_data["script"], audio_path)
        duration = get_audio_duration(audio_path)
        result["audio_duration"] = duration
        log.info(f"  Audio: {duration:.1f}s → {audio_path.name}")

        # ── Step 5: Render Video ──────────────────────────────────────────────
        log.info("Step 5: Rendering video...")
        video_path = config.OUTPUT_DIR / f"{run_id}_video.mp4"
        create_video(script_data, audio_path, video_path)
        result["video_path"] = str(video_path)
        log.info(f"  Video: {video_path.name} ({video_path.stat().st_size // 1024} KB)")

        # ── Step 6: Upload to YouTube ─────────────────────────────────────────
        log.info("Step 6: Uploading to YouTube...")
        upload_result = upload_short(
            video_path=video_path,
            title=script_data["title"],
            description=script_data["description"],
            tags=script_data.get("tags", []),
            privacy=config.UPLOAD_PRIVACY,
            dry_run=dry_run,
        )
        result["video_id"] = upload_result.get("video_id")
        result["url"] = upload_result.get("url")
        result["success"] = True

        log.info(f"✓ SUCCESS: {result['url']}")

    except Exception as e:
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()
        log.error(f"Pipeline FAILED: {e}")
        log.error(traceback.format_exc())

    finally:
        result["finished_at"] = datetime.now().isoformat()
        elapsed = (datetime.now() - started_at).total_seconds()
        result["elapsed_seconds"] = elapsed
        log.info(f"Run time: {elapsed:.0f}s")

        # Save to progress ledger
        progress.append(result)
        save_progress(progress)

    return result


# ─── CLI ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Shorts Factory — Full Pipeline")
    parser.add_argument("--topic", type=str, default=None, help="Override topic")
    parser.add_argument("--dry-run", action="store_true", help="Skip YouTube upload")
    parser.add_argument("--skip-gate", action="store_true", help="Skip virality gate")
    args = parser.parse_args()

    if not config.validate():
        print("\nPlease set up your .env file. See SETUP_GUIDE.md")
        sys.exit(1)

    result = run_pipeline(
        topic=args.topic,
        dry_run=args.dry_run,
        skip_gate=args.skip_gate,
    )

    print("\n" + "=" * 60)
    print("PIPELINE RESULT")
    print("=" * 60)
    print(f"Success    : {result['success']}")
    print(f"Topic      : {result.get('topic')}")
    print(f"Title      : {result.get('title')}")
    print(f"URL        : {result.get('url')}")
    print(f"Duration   : {result.get('elapsed_seconds', 0):.0f}s")
    if result.get("error"):
        print(f"Error      : {result['error']}")
    print("=" * 60)

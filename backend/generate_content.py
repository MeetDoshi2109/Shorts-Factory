"""
generate_content.py — AI content generation using Gemini 1.5 Flash (free tier).

Generates:
  - A viral YouTube Shorts script (~60s spoken text)
  - A punchy title (max 100 chars)
  - A keyword-rich description
  - Relevant tags
  - Picks from the topic backlog (data/topics.md)
"""
import json
import logging
import random
import re
import sys
from pathlib import Path
from datetime import datetime

from google import genai
from google.genai import types

# Add parent dir to path for config import
sys.path.insert(0, str(Path(__file__).parent))
import config

log = logging.getLogger(__name__)

# ─── Gemini Setup ────────────────────────────────────────────────────────────
def _get_client():
    if not config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set. See .env.example")
    return genai.Client(api_key=config.GEMINI_API_KEY)


# ─── Topic Management ────────────────────────────────────────────────────────
DEFAULT_TOPICS = """# Shorts Topic Backlog

## Easy Daily Hacks Topics
- The 2-second trick to slice cherry tomatoes like a chef
- Why you should freeze your grapes before putting them in drinks
- How to peel a hard-boiled egg in seconds with a jar of water
- The keyboard shortcut that restores closed tabs instantly
- Use a binder clip to organize all your charger cables
- How to get rid of smelly shoes using dry tea bags overnight
- The easiest way to clean a microwave with just lemon and water
- Why you should store your natural peanut butter upside down
- How to check if a battery is dead using the bounce test
- The simple phone camera trick to read tiny text instantly
- Keep your bananas fresh for a week by wrapping the stems in plastic
- How to open a tight jar lid using a simple rubber band
- Use a post-it note to clean between your keyboard keys
- The absolute best way to fold a fitted sheet without losing your mind
- How to dry clothes 2x faster by adding a dry towel to the dryer
- Use a wooden spoon over a pot of boiling water to stop it from boiling over
- The fast trick to thread a needle using your palm
- Why you should put a piece of bread in your cookie jar to keep them soft
- Stop your cutting board from sliding around using a damp paper towel
- The easy way to remove water rings from wood using a hair dryer
"""

def load_topics() -> list[str]:
    """Load topics from file, return as list. Create defaults if missing."""
    if not config.TOPICS_FILE.exists():
        config.TOPICS_FILE.write_text(DEFAULT_TOPICS, encoding="utf-8")
        log.info(f"Created default topics file at {config.TOPICS_FILE}")

    text = config.TOPICS_FILE.read_text(encoding="utf-8")
    topics = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("- "):
            topics.append(line[2:].strip())
    return topics


def pick_topic(used_topics: list[str] = None) -> str:
    """Pick a random topic, avoiding recently used ones."""
    topics = load_topics()
    if not topics:
        return "The one money mistake everyone makes"

    used_topics = used_topics or []
    available = [t for t in topics if t not in used_topics]
    if not available:
        available = topics  # reset if all used

    return random.choice(available)


# ─── Script Generation ───────────────────────────────────────────────────────
SCRIPT_PROMPT = """You are a viral YouTube Shorts creator specializing in {niche}.

Your audience: {audience}

TOPIC: {topic}

Create a YouTube Short script that will go viral. Follow these EXACT rules:
1. HOOK (first 3 seconds): Start with a shocking fact, controversial statement, or question. Must make people STOP scrolling.
2. BODY (3 beats, ~15 seconds each): Quick, punchy information delivery. Use numbers and specific facts.  
3. CTA (last 5 seconds): Simple, single call to action.

STYLE RULES:
- Write EXACTLY how someone speaks — no formal writing
- Use short sentences. Never more than 10 words per sentence.
- Use numbers and specific figures (e.g. "$347" not "a lot")
- No filler words (basically, literally, actually, just)
- Total speaking time: 45-58 seconds at natural pace (~130 words/min)
- Total word count: 100-130 words

OUTPUT FORMAT (JSON only, no markdown):
{{
  "title": "YouTube title (max 100 chars, includes #Shorts, uses power words)",
  "description": "YouTube description (150-200 chars, keyword-rich, includes hashtags)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "script": "The full spoken script here, written exactly as it will be spoken aloud.",
  "hook": "First sentence of script (must be the most attention-grabbing part)",
  "word_count": 115
}}
"""

def generate_script(topic: str = None) -> dict:
    """
    Generate a complete Short script using Gemini.
    Returns dict with title, description, tags, script, hook.
    """
    if topic is None:
        topic = pick_topic()

    log.info(f"Generating script for topic: {topic}")

    prompt = SCRIPT_PROMPT.format(
        niche=config.CHANNEL_NICHE,
        audience=config.CHANNEL_TARGET_AUDIENCE,
        topic=topic,
    )

    client = _get_client()
    response = client.models.generate_content(model=config.GEMINI_MODEL, contents=prompt)
    raw = response.text.strip()

    # Strip any markdown code fences if present
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        log.error(f"Gemini returned invalid JSON: {e}\nRaw: {raw[:500]}")
        # Fallback: extract script text manually
        data = {
            "title": f"{topic} #Shorts",
            "description": f"Learn about {topic}. {config.CHANNEL_NICHE} tips.",
            "tags": [config.CHANNEL_NICHE, "shorts", "money", "finance", "tips"],
            "script": raw,
            "hook": raw[:100],
            "word_count": len(raw.split()),
        }

    data["topic"] = topic
    data["generated_at"] = datetime.now().isoformat()
    log.info(f"Script generated: '{data.get('title')}' ({data.get('word_count')} words)")
    return data


# ─── Virality Gate ───────────────────────────────────────────────────────────
GATE_PROMPT = """You are a YouTube Shorts virality analyst.

Rate this topic for viral potential on a scale of 1-10:
TOPIC: {topic}
NICHE: {niche}

Consider: search volume, emotional resonance, shareability, scroll-stopping power.

Output JSON only:
{{"score": 7, "reason": "One sentence reason", "verdict": "PASS"}}

Use "PASS" if score >= 6, "FAIL" if score < 6.
"""

def virality_gate(topic: str) -> dict:
    """Check if a topic passes the virality gate before producing video."""
    client = _get_client()
    prompt = GATE_PROMPT.format(topic=topic, niche=config.CHANNEL_NICHE)
    response = client.models.generate_content(model=config.GEMINI_MODEL, contents=prompt)
    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\n?", "", raw)
    raw = re.sub(r"\n?```$", "", raw)
    try:
        result = json.loads(raw)
    except Exception:
        result = {"score": 7, "reason": "Could not parse gate", "verdict": "PASS"}
    log.info(f"Virality gate: {topic!r} → score={result.get('score')} verdict={result.get('verdict')}")
    return result


# ─── CLI Test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    parser = argparse.ArgumentParser()
    parser.add_argument("--test", action="store_true", help="Run a test generation")
    parser.add_argument("--topic", type=str, default=None, help="Override topic")
    args = parser.parse_args()

    if args.test or True:
        print("\n=== Shorts Factory — Content Generator Test ===\n")
        if not config.GEMINI_API_KEY:
            print("ERROR: GEMINI_API_KEY not set in .env")
            sys.exit(1)

        topic = args.topic or pick_topic()
        print(f"Topic: {topic}\n")

        gate = virality_gate(topic)
        print(f"Virality gate: {gate}\n")

        if gate.get("verdict") == "PASS":
            data = generate_script(topic)
            print(f"Title: {data['title']}")
            print(f"Tags: {', '.join(data['tags'])}")
            print(f"Word count: {data['word_count']}")
            print(f"\nScript:\n{data['script']}")
        else:
            print(f"Topic FAILED gate: {gate['reason']}")

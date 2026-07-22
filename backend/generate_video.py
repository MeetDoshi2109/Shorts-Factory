"""
generate_video.py — Create a 1080x1920 YouTube Short using Pillow + MoviePy.

Pipeline:
  1. Parse script into scenes (sentences)
  2. For each scene, render a styled frame (background + text) using Pillow
  3. Sync frames to audio duration using moviepy
  4. Composite audio + video → final MP4

No GPU required. CPU rendering ~30-90 seconds depending on length.
"""
import json
import logging
import math
import os
import random
import re
import sys
import textwrap
from pathlib import Path
from typing import Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from moviepy.editor import (
    AudioFileClip,
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
    VideoFileClip,
    concatenate_videoclips,
)

sys.path.insert(0, str(Path(__file__).parent))
import config

log = logging.getLogger(__name__)

# ─── Color Palettes (varies per video to avoid repetition) ───────────────────
PALETTES = [
    # YouTube Red theme
    {"bg": "#0a0a0a", "accent": "#FF0000", "text": "#FFFFFF", "sub": "#AAAAAA"},
    # Dark blue
    {"bg": "#050A1A", "accent": "#4A90E2", "text": "#FFFFFF", "sub": "#8AB4F8"},
    # Dark green
    {"bg": "#050F07", "accent": "#00C853", "text": "#FFFFFF", "sub": "#69F0AE"},
    # Purple
    {"bg": "#0D0014", "accent": "#9C27B0", "text": "#FFFFFF", "sub": "#CE93D8"},
    # Gold
    {"bg": "#0D0900", "accent": "#FFD600", "text": "#FFFFFF", "sub": "#FFEE58"},
    # Teal
    {"bg": "#001A1A", "accent": "#00BCD4", "text": "#FFFFFF", "sub": "#80DEEA"},
]

W, H = config.VIDEO_WIDTH, config.VIDEO_HEIGHT  # 1080 × 1920


def hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Try to load a nice font, fall back to default."""
    font_names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "Arial Bold.ttf" if bold else "Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def parse_script_to_scenes(script: str) -> list[str]:
    """Split script into scenes (sentences/phrases)."""
    # Split on sentence endings
    sentences = re.split(r"(?<=[.!?])\s+", script.strip())
    scenes = []
    for s in sentences:
        s = s.strip()
        if len(s) > 10:
            scenes.append(s)
    return scenes if scenes else [script]


def render_frame(
    text: str,
    scene_index: int,
    total_scenes: int,
    palette: dict,
    width: int = W,
    height: int = H,
    show_progress: bool = True,
) -> np.ndarray:
    """
    Render a single video frame as a numpy array (RGB).
    """
    bg_rgb = hex_to_rgb(palette["bg"])
    accent_rgb = hex_to_rgb(palette["accent"])
    text_rgb = hex_to_rgb(palette["text"])
    sub_rgb = hex_to_rgb(palette["sub"])

    img = Image.new("RGB", (width, height), bg_rgb)
    draw = ImageDraw.Draw(img)

    # ── Background gradient effect ────────────────────────────────────────────
    for y in range(height):
        ratio = y / height
        r = int(bg_rgb[0] + (accent_rgb[0] - bg_rgb[0]) * ratio * 0.08)
        g = int(bg_rgb[1] + (accent_rgb[1] - bg_rgb[1]) * ratio * 0.08)
        b = int(bg_rgb[2] + (accent_rgb[2] - bg_rgb[2]) * ratio * 0.08)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # ── Accent bar at top ─────────────────────────────────────────────────────
    bar_h = 12
    draw.rectangle([0, 0, width, bar_h], fill=accent_rgb)

    # ── Scene indicator dots ──────────────────────────────────────────────────
    if show_progress and total_scenes > 1:
        dot_r = 6
        dot_spacing = 20
        total_w = total_scenes * dot_spacing
        start_x = (width - total_w) // 2
        dot_y = height - 80
        for i in range(total_scenes):
            color = accent_rgb if i == scene_index else sub_rgb
            cx = start_x + i * dot_spacing + dot_r
            draw.ellipse([cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r], fill=color)

    # ── Main text (centered, large, wrapped) ──────────────────────────────────
    font_large = _load_font(72, bold=True)
    font_medium = _load_font(52, bold=False)

    # Wrap text to fit width
    max_chars = 22
    wrapped = textwrap.fill(text, width=max_chars)
    lines = wrapped.splitlines()

    line_height = 90
    total_text_h = len(lines) * line_height
    start_y = (height - total_text_h) // 2 - 60

    for i, line in enumerate(lines):
        # Shadow
        shadow_offset = 4
        bbox = draw.textbbox((0, 0), line, font=font_large)
        tw = bbox[2] - bbox[0]
        tx = (width - tw) // 2
        ty = start_y + i * line_height

        draw.text((tx + shadow_offset, ty + shadow_offset), line, font=font_large,
                  fill=(0, 0, 0))
        draw.text((tx, ty), line, font=font_large, fill=text_rgb)

    # ── Accent line under text ────────────────────────────────────────────────
    line_y = start_y + len(lines) * line_height + 20
    line_w = min(400, width // 2)
    draw.rectangle([(width // 2 - line_w // 2, line_y),
                    (width // 2 + line_w // 2, line_y + 4)],
                   fill=accent_rgb)

    # ── Scene number indicator ────────────────────────────────────────────────
    scene_label = f"  {scene_index + 1} / {total_scenes}  "
    font_small = _load_font(32)
    draw.text((width // 2 - 40, height - 140), scene_label, font=font_small, fill=sub_rgb)

    return np.array(img)


def render_title_frame(title: str, palette: dict) -> np.ndarray:
    """Render an intro title card."""
    bg_rgb = hex_to_rgb(palette["bg"])
    accent_rgb = hex_to_rgb(palette["accent"])
    text_rgb = hex_to_rgb(palette["text"])

    img = Image.new("RGB", (W, H), bg_rgb)
    draw = ImageDraw.Draw(img)

    # Full-screen gradient
    for y in range(H):
        ratio = y / H
        r = int(bg_rgb[0] * (1 - ratio * 0.3))
        g = int(bg_rgb[1] * (1 - ratio * 0.3))
        b = int(bg_rgb[2] * (1 - ratio * 0.3))
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Accent top bar
    draw.rectangle([0, 0, W, 16], fill=accent_rgb)
    draw.rectangle([0, H - 16, W, H], fill=accent_rgb)

    # Title text
    font = _load_font(80, bold=True)
    wrapped = textwrap.fill(title.replace("#Shorts", "").strip(), width=18)
    lines = wrapped.splitlines()
    lh = 100
    start_y = H // 2 - (len(lines) * lh) // 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        tx = (W - tw) // 2
        ty = start_y + i * lh
        draw.text((tx + 3, ty + 3), line, font=font, fill=(0, 0, 0))
        draw.text((tx, ty), line, font=font, fill=text_rgb)

    return np.array(img)


def render_cta_frame(cta_text: str, palette: dict) -> np.ndarray:
    """Render an outro CTA frame."""
    bg_rgb = hex_to_rgb(palette["accent"])
    text_rgb = (255, 255, 255)

    img = Image.new("RGB", (W, H), bg_rgb)
    draw = ImageDraw.Draw(img)

    font = _load_font(90, bold=True)
    wrapped = textwrap.fill(cta_text, width=16)
    lines = wrapped.splitlines()
    lh = 110
    start_y = H // 2 - (len(lines) * lh) // 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        tx = (W - tw) // 2
        draw.text((tx, start_y + i * lh), line, font=font, fill=text_rgb)

    font_small = _load_font(48)
    footer = "Follow for more  ↓"
    bbox = draw.textbbox((0, 0), footer, font=font_small)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, H - 200), footer, font=font_small,
              fill=(255, 255, 255, 200))

    return np.array(img)


def create_video(
    script_data: dict,
    audio_path: Path,
    output_path: Path,
    palette: dict = None,
) -> Path:
    """
    Create a full YouTube Short video.

    Args:
        script_data: Dict from generate_content.generate_script()
        audio_path: Path to MP3/WAV audio file
        output_path: Where to write the final MP4
        palette: Color palette dict (random if None)

    Returns:
        Path to the rendered MP4
    """
    if palette is None:
        palette = random.choice(PALETTES)

    script = script_data.get("script", "")
    title = script_data.get("title", "YouTube Short")

    log.info(f"Rendering video: {output_path.name}")
    log.info(f"  Palette: {palette['accent']}")

    # ── Load audio to get duration ─────────────────────────────────────────────
    audio_clip = AudioFileClip(str(audio_path))
    total_duration = audio_clip.duration
    log.info(f"  Audio duration: {total_duration:.1f}s")

    # ── Parse script into scenes ───────────────────────────────────────────────
    scenes = parse_script_to_scenes(script)
    log.info(f"  Scenes: {len(scenes)}")

    # Reserve time for title + CTA
    title_dur = 2.0
    cta_dur = 3.0
    body_dur = max(1.0, total_duration - title_dur - cta_dur)
    scene_dur = body_dur / max(len(scenes), 1)

    clips = []

    # ── Title card ─────────────────────────────────────────────────────────────
    title_frame = render_title_frame(title, palette)
    title_clip = ImageClip(title_frame, duration=title_dur).set_fps(config.VIDEO_FPS)
    clips.append(title_clip)

    # ── Body scenes ────────────────────────────────────────────────────────────
    for i, scene_text in enumerate(scenes):
        frame = render_frame(
            text=scene_text,
            scene_index=i,
            total_scenes=len(scenes),
            palette=palette,
        )
        clip = ImageClip(frame, duration=scene_dur).set_fps(config.VIDEO_FPS)
        clips.append(clip)

    # ── CTA frame ──────────────────────────────────────────────────────────────
    cta_text = "Like & Follow\nfor more!"
    cta_frame = render_cta_frame(cta_text, palette)
    cta_clip = ImageClip(cta_frame, duration=cta_dur).set_fps(config.VIDEO_FPS)
    clips.append(cta_clip)

    # ── Concatenate & add audio ────────────────────────────────────────────────
    video = concatenate_videoclips(clips, method="compose")

    # Trim/extend video to match audio
    if video.duration > total_duration:
        video = video.subclip(0, total_duration)
    elif video.duration < total_duration:
        last = clips[-1]
        extra = ColorClip(size=(W, H), color=hex_to_rgb(palette["bg"]),
                          duration=total_duration - video.duration)
        video = concatenate_videoclips([video, extra])

    final = video.set_audio(audio_clip)

    # ── Export ────────────────────────────────────────────────────────────────
    output_path.parent.mkdir(parents=True, exist_ok=True)
    log.info(f"  Writing MP4 to {output_path}...")
    final.write_videofile(
        str(output_path),
        fps=config.VIDEO_FPS,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=str(output_path.with_suffix(".tmp.m4a")),
        remove_temp=True,
        logger=None,   # suppress moviepy verbose output
        preset="ultrafast",
    )
    log.info(f"  Done: {output_path}")

    audio_clip.close()
    final.close()
    return output_path


# ─── CLI Test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    # Minimal test without real audio
    test_data = {
        "title": "The Hidden Bank Fee Test #Shorts",
        "script": (
            "Your bank is stealing from you. "
            "The average person pays $329 a year in hidden bank fees. "
            "Monthly maintenance fees alone cost $15 a month. "
            "ATM fees hit you twice — $3 from your bank, $3 from the ATM. "
            "And overdraft fees? $35 per incident. "
            "Switch to a no-fee online bank today. "
            "Which fee didn't you know about? Comment below."
        ),
    }

    test_audio = config.OUTPUT_DIR / "test_voice.mp3"
    test_out = config.OUTPUT_DIR / "test_video.mp4"

    if not test_audio.exists():
        print(f"ERROR: Test audio not found at {test_audio}")
        print("Run: python generate_voice.py first")
        sys.exit(1)

    result = create_video(test_data, test_audio, test_out)
    print(f"✓ Video created: {result}")

"""
generate_voice.py — Text-to-Speech using gTTS (100% free, no API key needed).

Converts a script string → MP3 audio file.
Falls back to pyttsx3 (offline) if gTTS fails (e.g. no internet).
"""
import logging
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import config

log = logging.getLogger(__name__)


def text_to_speech(
    text: str,
    output_path: Path | str,
    lang: str = "en",
    slow: bool = False,
) -> Path:
    """
    Convert text to speech and save as MP3.

    Args:
        text: The script text to speak.
        output_path: Where to save the MP3 file.
        lang: Language code (default 'en').
        slow: If True, speak at reduced speed.

    Returns:
        Path to the created MP3 file.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    log.info(f"Generating TTS audio: {len(text)} chars → {output_path.name}")

    # ── Primary: gTTS (Google Translate TTS, free) ────────────────────────────
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=lang, slow=slow)
        tts.save(str(output_path))
        log.info(f"gTTS success: {output_path}")
        return output_path

    except ImportError:
        log.warning("gTTS not installed. Trying pyttsx3 fallback.")
    except Exception as e:
        log.warning(f"gTTS failed ({e}). Trying pyttsx3 fallback.")

    # ── Fallback: pyttsx3 (offline, no API needed) ────────────────────────────
    try:
        import pyttsx3
        # pyttsx3 saves as WAV, we need MP3
        wav_path = output_path.with_suffix(".wav")
        engine = pyttsx3.init()
        engine.setProperty("rate", 165)   # words per minute
        engine.setProperty("volume", 0.9)
        engine.save_to_file(text, str(wav_path))
        engine.runAndWait()

        # Convert WAV → MP3 using pydub
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_wav(str(wav_path))
            audio.export(str(output_path), format="mp3")
            wav_path.unlink(missing_ok=True)
        except Exception:
            # If pydub fails, just rename to mp3 (browsers can play wav)
            wav_path.rename(output_path)

        log.info(f"pyttsx3 fallback success: {output_path}")
        return output_path

    except ImportError:
        raise RuntimeError("No TTS engine available. Install gTTS: pip install gTTS")
    except Exception as e:
        raise RuntimeError(f"All TTS engines failed: {e}")


def get_audio_duration(audio_path: Path | str) -> float:
    """Return audio duration in seconds."""
    audio_path = Path(audio_path)
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(str(audio_path))
        return len(audio) / 1000.0
    except Exception:
        # Rough estimate: ~130 words/min
        return 45.0


# ─── CLI Test ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")

    test_script = (
        "Did you know your bank is charging you fees you don't even know about? "
        "The average American pays $329 a year in hidden bank fees. "
        "Here are the three you need to eliminate today. "
        "Number one: monthly maintenance fees. Switch to a no-fee online bank — you'll save $15 a month instantly. "
        "Number two: ATM fees. Your bank charges you $3, the ATM charges you $3. That's $6 per withdrawal. "
        "Use your bank's app to find free ATMs. Number three: overdraft fees. At $35 per incident, "
        "these are criminal. Set up low-balance alerts right now. "
        "Which fee did you not know about? Comment below."
    )

    out = config.OUTPUT_DIR / "test_voice.mp3"
    result = text_to_speech(test_script, out)
    duration = get_audio_duration(result)
    print(f"✓ Audio saved: {result} ({duration:.1f}s)")

"""Mittu's voice, made on the backend only.

TTS_PROVIDER:
  "gemini" (default) – Gemini text-to-speech on Vertex AI. A style instruction makes Gemini *perform* the reading as
                       Mittu (bright, cheeky parrot fortune-teller), which sounds far more real than a pitched-up TTS
                       voice. Returns raw PCM; we encode MP3 here. No word timings: the app spreads the subtitles over
                       the clip length. If it fails, the Cloud TTS voice below is used instead, so Mittu always speaks.
  "google"           – Cloud Text-to-Speech hi-IN (guide 07: pitch +6, rate 1.1, MP3, handset-class-device), with an
                       SSML <mark/> per word, so the app gets the exact start time of every word.
  "fake"             – a silent clip for local runs and tests.
"""
from __future__ import annotations

import html
import io
import logging
import re
import wave
from functools import lru_cache

from . import settings

log = logging.getLogger("mittuai.tts")

GEMINI_RATE = 24_000   # Gemini TTS returns 16-bit mono PCM at 24 kHz
MITTU_STYLE = (
    "Perform the text below as Mittu, a cheeky, lovable little green parrot fortune-teller at an old Indian bazaar: "
    "a high, bright, slightly nasal parrot-like voice, playful, warm and caring. Speak at a lively, FAST pace, like an "
    "excited parrot chattering, with only short pauses. Hinglish with a natural Indian accent; keep every word clear. "
    "Read the text exactly as written, word for word, adding nothing:\n\n"
)


# ---------------------------------------------------------------- Cloud Text-to-Speech (backup / alternative)
@lru_cache
def _cloud_client():
    from google.cloud import texttospeech_v1beta1 as tts
    return tts.TextToSpeechClient()


def ssml_with_marks(text: str) -> tuple[str, list[str]]:
    """Text → SSML with <mark name="i"/> before word i. Returns (ssml, words). Pauses come from the punctuation."""
    words = text.split()
    parts = [f'<mark name="{i}"/>{html.escape(w, quote=False)}' for i, w in enumerate(words)]
    return f"<speak>{' '.join(parts)}</speak>", words


def _cloud_tts(text: str) -> tuple[bytes, list[float] | None, str]:
    from google.cloud import texttospeech_v1beta1 as tts
    ssml, words = ssml_with_marks(text)
    request = tts.SynthesizeSpeechRequest(
        input=tts.SynthesisInput(ssml=ssml),
        voice=tts.VoiceSelectionParams(language_code="hi-IN", name=settings.TTS_CLOUD_VOICE),
        audio_config=tts.AudioConfig(audio_encoding=tts.AudioEncoding.MP3, pitch=settings.TTS_PITCH,
                                     speaking_rate=settings.TTS_RATE, effects_profile_id=["handset-class-device"]),
        enable_time_pointing=[tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK],
    )
    response = _cloud_client().synthesize_speech(request=request, timeout=20)
    marks = {int(t.mark_name): float(t.time_seconds) for t in response.timepoints if re.fullmatch(r"\d+", t.mark_name)}
    times = [marks.get(i) for i in range(len(words))]
    if any(t is None for t in times):
        times = None   # the app estimates timing from the clip length instead
    return response.audio_content, times, "mp3"


# ---------------------------------------------------------------- Gemini TTS (Mittu's acted voice)
def _mp3(pcm: bytes, rate: int = GEMINI_RATE, speed: float = 1.0) -> bytes:
    """MP3 at 64 kbps (~8 KB/s). `speed` > 1 plays faster and slightly higher: the encoder is told the samples come
    faster than they were made, and resamples."""
    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(64)
    enc.set_in_sample_rate(int(rate * speed))
    enc.set_channels(1)
    enc.set_quality(2)
    return bytes(enc.encode(pcm) + enc.flush())   # lameenc gives a bytearray; Cloud Storage needs bytes


PARTS = 4                       # a reading is voiced in 4 parts at once: much faster than one long request
SPEED = 1.1                     # played 10% faster (guide 07 rate 1.1); also lifts the pitch a little, more parrot-like
GAP = bytes(2) * (GEMINI_RATE * 12 // 100)   # 120 ms pause between parts


def split_parts(text: str, n: int = PARTS) -> list[str]:
    """Splits at sentence ends into up to n parts of similar length (by words). Never splits inside a sentence."""
    sentences = [s for s in re.split(r"(?<=[.!?…])\s+", text.strip()) if s]
    if len(sentences) <= 1:
        return sentences or [text]
    total = sum(len(s.split()) for s in sentences)
    parts: list[list[str]] = [[]]
    done = 0
    for s in sentences:
        if parts[-1] and len(parts) < n and done >= total * len(parts) / n:
            parts.append([])
        parts[-1].append(s)
        done += len(s.split())
    return [" ".join(p) for p in parts]


def _gemini_pcm(text: str) -> bytes:
    from google.genai import errors, types

    from .ai import client
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=settings.TTS_VOICE))))
    last: Exception | None = None
    for attempt in range(2):   # TTS models now and then answer 200 with no audio; one retry
        try:
            r = client().models.generate_content(model=settings.TTS_MODEL, contents=MITTU_STYLE + text, config=config)
            pcm = r.candidates[0].content.parts[0].inline_data.data
            if len(pcm) < GEMINI_RATE // 2:      # under a quarter second: no real audio
                raise ValueError("empty audio")
            return pcm
        except (errors.APIError, AttributeError, IndexError, TypeError, ValueError) as err:
            last = err
            log.warning("Gemini TTS attempt %d failed: %s", attempt + 1, err)
            if isinstance(err, errors.APIError) and err.code == 429:
                break
    raise RuntimeError(f"Gemini TTS failed: {last}")


def _word_times(parts: list[str], starts: list[float], lengths: list[float]) -> list[float]:
    """Each part's start is exact (from its audio length); words inside a part are spread by their length."""
    times: list[float] = []
    for part, start, length in zip(parts, starts, lengths):
        words = part.split()
        weights = [len(re.sub(r"\W", "", w)) + 2 + (5 if re.search(r"[.!?…]$", w) else 2 if w.endswith(",") else 0)
                   for w in words]
        total, acc = sum(weights) or 1, 0
        for w in weights:
            times.append(round(start + length * acc / total, 2))
            acc += w
    return times


def _gemini_tts(text: str) -> tuple[bytes, list[float], str]:
    from concurrent.futures import ThreadPoolExecutor
    parts = split_parts(text)
    with ThreadPoolExecutor(max_workers=len(parts)) as pool:
        pcms = list(pool.map(_gemini_pcm, parts))   # any part failing raises → Cloud TTS fallback
    starts, lengths, pos = [], [], 0.0
    for pcm in pcms:   # seconds as heard, i.e. after the speed-up
        starts.append(pos)
        lengths.append(len(pcm) / 2 / GEMINI_RATE / SPEED)
        pos += lengths[-1] + len(GAP) / 2 / GEMINI_RATE / SPEED
    return _mp3(GAP.join(pcms), speed=SPEED), _word_times(parts, starts, lengths), "mp3"


def _silent_wav(seconds: float, rate: int = 8000) -> bytes:
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(bytes(2) * int(seconds * rate))
    return out.getvalue()


def synthesise(text: str) -> tuple[bytes, list[float] | None, str]:
    """Returns (audio bytes, start time in seconds of every word or None, file extension). Raises only if every
    voice failed; the caller then returns the reading without audio (the app uses the phone's voice)."""
    if settings.TTS_PROVIDER == "fake":   # a real (silent) clip, so playback and subtitles can be tested locally
        n = len(text.split())
        return _silent_wav(n * 0.35 + 0.5), [round(i * 0.35, 2) for i in range(n)], "wav"
    if settings.TTS_PROVIDER == "gemini":
        try:
            return _gemini_tts(text)
        except Exception:  # noqa: BLE001 - fall back to the Cloud TTS voice so Mittu still speaks
            log.exception("Gemini TTS failed; using the Cloud TTS voice")
    return _cloud_tts(text)

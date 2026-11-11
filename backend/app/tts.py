"""Mittu's voice: Google Cloud Text-to-Speech (guide 07), called only from the backend.

hi-IN voice, pitch +6 semitones, rate 1.1, MP3, handset-class-device. Each word gets an SSML <mark/>, so the response
tells the app exactly when every word starts (word-by-word subtitles) instead of guessing.
"""
from __future__ import annotations

import html
import logging
import re
from functools import lru_cache

from . import settings

log = logging.getLogger("mittuai.tts")


@lru_cache
def client():
    from google.cloud import texttospeech_v1beta1 as tts
    return tts.TextToSpeechClient()


def ssml_with_marks(text: str) -> tuple[str, list[str]]:
    """Text → SSML with <mark name="i"/> before word i. Returns (ssml, words). Pauses come from the punctuation."""
    words = text.split()
    parts = [f'<mark name="{i}"/>{html.escape(w, quote=False)}' for i, w in enumerate(words)]
    return f"<speak>{' '.join(parts)}</speak>", words


def _silent_wav(seconds: float, rate: int = 8000) -> bytes:
    import io
    import wave
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(bytes(2) * int(seconds * rate))
    return out.getvalue()


def synthesise(text: str) -> tuple[bytes, list[float] | None, str]:
    """Returns (audio bytes, start time in seconds of every word or None if the voice gave no timepoints, file
    extension). Raises on failure; the caller then returns the reading without audio."""
    if settings.TTS_PROVIDER == "fake":   # a real (silent) clip, so playback and subtitles can be tested locally
        n = len(text.split())
        return _silent_wav(n * 0.35 + 0.5), [round(i * 0.35, 2) for i in range(n)], "wav"
    from google.cloud import texttospeech_v1beta1 as tts
    ssml, words = ssml_with_marks(text)
    request = tts.SynthesizeSpeechRequest(
        input=tts.SynthesisInput(ssml=ssml),
        voice=tts.VoiceSelectionParams(language_code="hi-IN", name=settings.TTS_VOICE),
        audio_config=tts.AudioConfig(audio_encoding=tts.AudioEncoding.MP3, pitch=settings.TTS_PITCH,
                                     speaking_rate=settings.TTS_RATE, effects_profile_id=["handset-class-device"]),
        enable_time_pointing=[tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK],
    )
    response = client().synthesize_speech(request=request, timeout=20)
    marks = {int(t.mark_name): float(t.time_seconds) for t in response.timepoints if re.fullmatch(r"\d+", t.mark_name)}
    times = [marks.get(i) for i in range(len(words))]
    if any(t is None for t in times):
        times = None   # the app estimates timing from the clip length instead
    return response.audio_content, times, "mp3"

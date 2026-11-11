"""Mittu's reading text: Gemini on Vertex AI (guide 01), called only from the backend.

AI_PROVIDER:
  "vertex" – Vertex AI in GCP_PROJECT / VERTEX_LOCATION with the Cloud Run service account (role "Vertex AI User").
             No API key to leak.
  "fake"   – a canned reading for local runs and tests (no cost, no network).
"""
from __future__ import annotations

import logging
import re
from functools import lru_cache

from fastapi import HTTPException

from . import settings
from .cards import CARDS
from .prompts import CATEGORY_LABELS, MITTU_SYSTEM

log = logging.getLogger("mittuai.ai")

TRY_AGAIN = "Mittu abhi card nahi padh paaya. Thodi der mein phir koshish kijiye."
BUSY = "Mittu ke paas abhi bahut log hain. Ek minute baad phir aaiye."
SAFETY_STOPS = {"SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "RECITATION", "BLOCKED"}
MAX_WORDS = 130   # the prompt asks for 60-90; anything far longer is cut at a sentence end (it is read aloud)


@lru_cache
def client():
    from google import genai
    from google.genai import types
    return genai.Client(vertexai=True, project=settings.GCP_PROJECT, location=settings.VERTEX_LOCATION,
                        http_options=types.HttpOptions(timeout=30_000))


def _user_message(card_id: int, orientation: str, name: str, category: str, question: str) -> str:
    _, en, hi_roman, _ = CARDS[card_id]
    return (f"Card: {en} ({hi_roman})\n"
            f"Orientation: {orientation}\n"
            f"Category: {CATEGORY_LABELS.get(category, CATEGORY_LABELS['general'])}\n"
            f"<name>{name or 'not given'}</name>\n"
            f"<question>{question or 'No question; give a general reading for the category.'}</question>")


_EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️‍]")
_MARKDOWN = re.compile(r"[*_#`>\[\]]")


def clean(text: str) -> str:
    """Spoken aloud and shown as plain text: no markdown, emojis, wrapping quotes or extra spaces; length bounded."""
    text = _MARKDOWN.sub("", _EMOJI.sub("", text)).strip().strip('"“”').strip()
    text = re.sub(r"[ \t]+", " ", re.sub(r"\n{2,}", "\n", text))
    words = text.split()
    if len(words) > MAX_WORDS:
        cut = " ".join(words[:MAX_WORDS])
        end = max(cut.rfind("."), cut.rfind("!"), cut.rfind("?"))
        text = cut[: end + 1] if end > len(cut) // 2 else cut + "..."
    return text


def safe_fallback(card_id: int) -> str:
    """When Gemini's safety filter stops a reading: a gentle fixed one, so the user still gets their card."""
    _, en, hi_roman, _ = CARDS[card_id]
    return (f"Kuurr! Suno suno... Mittu ne nikaala hai {hi_roman} ka card, {en}! Card keh raha hai ki abhi dheeraj "
            "aur bharose ka samay hai. Jo aapke haath mein hai, uspe dhyaan dijiye, baaki waqt pe chhod dijiye. "
            "Aaj kisi apne se dil ki baat zaroor kijiye. Mittu ka aashirwaad hai! Lucky color, hara... lucky number, paanch!")


def reading_text(card_id: int, orientation: str, name: str, category: str, question: str) -> tuple[str, dict]:
    """Returns (text, usage). Raises 503 (nothing delivered) on API errors."""
    if settings.AI_PROVIDER == "fake":
        _, en, hi_roman, _ = CARDS[card_id]
        who = f"{name}, " if name else ""
        return (f"Kuurr! Suno suno... {who}Mittu ne nikaala hai {hi_roman} ka card, {en}"
                f"{', ulta' if orientation == 'reversed' else ''}! Card keh raha hai ki nayi roshni ka sanket hai. "
                "Jo mehnat aap kar rahe ho, uska phal dheere dheere milega. Bas apne aap pe bharosa rakho. "
                "Mittu ka aashirwaad hai! Lucky color, aasmaani neela... lucky number, saat! (Test mode)"), {}

    from google.genai import errors, types
    config = types.GenerateContentConfig(
        system_instruction=MITTU_SYSTEM,
        max_output_tokens=settings.READING_MAX_OUTPUT_TOKENS,
        temperature=1.0,
        thinking_config=types.ThinkingConfig(thinking_level=settings.GEMINI_THINKING) if settings.GEMINI_THINKING else None,
    )
    try:
        response = client().models.generate_content(
            model=settings.GEMINI_MODEL, contents=_user_message(card_id, orientation, name, category, question), config=config)
    except errors.APIError as err:
        log.error("Vertex Gemini error %s: %s", err.code, err.message)
        raise HTTPException(503, BUSY if err.code == 429 else TRY_AGAIN) from err
    except Exception as err:  # noqa: BLE001 - network errors, timeouts, missing credentials
        log.exception("Vertex Gemini call failed")
        raise HTTPException(503, TRY_AGAIN) from err

    if response.prompt_feedback and response.prompt_feedback.block_reason:
        stop = "BLOCKED"
    elif not response.candidates:
        stop = "EMPTY"
    else:
        stop = response.candidates[0].finish_reason.name if response.candidates[0].finish_reason else "STOP"
    u = response.usage_metadata
    usage = {"input": (u and u.prompt_token_count) or 0, "output": (u and u.candidates_token_count) or 0,
             "thinking": (u and u.thoughts_token_count) or 0, "model": response.model_version or settings.GEMINI_MODEL}
    if stop in SAFETY_STOPS:
        return safe_fallback(card_id), {**usage, "safetyFallback": True}
    text = clean(response.text or "") if stop != "EMPTY" else ""
    if stop not in ("STOP", "MAX_TOKENS") or len(text.split()) < 25:
        log.error("Gemini reading ended with %s (%d words)", stop, len(text.split()))
        raise HTTPException(503, TRY_AGAIN)
    return text, usage

"""Mittu reading (guide 06): question + category → POST /reading → card + text + audio.

Order of checks, cheapest first, so nothing is paid for that isn't delivered:
  1. crisis question  → support message with helplines, no reading, nothing charged
  2. off-topic / prompt trick → fixed Mittu reply, nothing charged
  3. subscription (402) and today's reading limit (429, from /config)
  4. Gemini text (on failure the day's count is given back), then TTS (on failure: text only, app uses its own voice)
"""
from __future__ import annotations

import logging
import re
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from . import ai, media, safety, settings, tts
from .auth import CurrentUid
from .cards import card_view, draw
from .store import new_id, now_ms, store
from .users import charge_daily, get_user, refund_daily, require_subscription

router = APIRouter(tags=["reading"])
log = logging.getLogger("mittuai.reading")
CATEGORIES = ("love", "career", "paisa", "health", "general")


class ReadingBody(BaseModel):
    question: str = Field(default="", max_length=settings.QUESTION_MAX_CHARS)
    category: str = Field(default="general", pattern="^(love|career|paisa|health|general)$")


def _clean_question(q: str) -> str:
    # One line of plain text: no control characters or tag-like text that could break out of <question>.
    q = re.sub(r"[\x00-\x1f\x7f<>]", " ", q)
    return re.sub(r"\s+", " ", q).strip()[: settings.QUESTION_MAX_CHARS]


def _view(rid: str, doc: dict, audio_url: str | None = None) -> dict:
    return {"id": rid, "card": card_view(doc["card"]), "orientation": doc["orientation"], "category": doc["category"],
            "question": doc.get("question", ""), "text": doc["text"], "audio_url": audio_url,
            "word_times": doc.get("wordTimes"), "created_at": doc["created_at"]}


@router.post("/reading")
def create_reading(body: ReadingBody, request: Request, uid: str = CurrentUid):
    user = get_user(uid)
    question = _clean_question(body.question)

    if safety.is_crisis(question):
        return {"kind": "support", "text": safety.SUPPORT_MESSAGE, "helplines": safety.HELPLINES}
    if safety.is_off_topic(question):
        return {"kind": "offtopic", "text": safety.OFF_TOPIC_MESSAGE}

    require_subscription(user)
    charge_daily(uid, "reading")
    card_id, orientation = draw()
    try:
        text, usage = ai.reading_text(card_id, orientation, user.get("name") or "", body.category, question)
    except Exception:
        refund_daily(uid, "reading")   # nothing delivered: don't use up one of today's readings
        raise

    rid = new_id()
    audio_path, word_times = None, None
    try:
        audio, word_times, ext = tts.synthesise(text)
        audio_path = f"readings/{uid}/{rid}.{ext}"
        media.save_voice(audio_path, audio)
    except Exception:  # noqa: BLE001 - the reading still counts; the app reads it with the phone's voice
        log.exception("Voice failed for reading %s", rid)
        audio_path, word_times = None, None

    doc = {"uid": uid, "question": question, "category": body.category, "card": card_id, "orientation": orientation,
           "text": text, "audioPath": audio_path, "wordTimes": word_times, "created_at": now_ms(), "usage": usage}
    store().set(f"readings/{rid}", doc)
    return {"kind": "reading", **_view(rid, doc, media.voice_url(audio_path, request))}


@router.get("/readings")
def list_readings(uid: str = CurrentUid):
    """History on Profile: text only (guide 06). Newest first, last 50."""
    rows = store().list("readings", where=("uid", uid), order_by="created_at", desc=True, limit=50)
    return [{k: v for k, v in _view(rid, doc).items() if k not in ("audio_url", "word_times")} | {
        "has_audio": bool(doc.get("audioPath")) and now_ms() - doc["created_at"] < media.VOICE_TTL_S * 1000}
        for rid, doc in rows]


@router.get("/readings/{rid}")
def get_reading(rid: str, request: Request, uid: str = CurrentUid):
    """One reading; a fresh 1-hour voice URL while the clip still exists (7 days)."""
    if not re.fullmatch(r"[a-f0-9]{20}", rid):
        raise HTTPException(404, "Reading not found.")
    doc = store().get(f"readings/{rid}")
    if doc is None or doc.get("uid") != uid:
        raise HTTPException(404, "Reading not found.")
    fresh = doc.get("audioPath") and now_ms() - doc["created_at"] < media.VOICE_TTL_S * 1000
    return _view(rid, doc, media.voice_url(doc["audioPath"], request) if fresh else None)


class ReportBody(BaseModel):
    readingId: str = Field(pattern=r"^[a-f0-9]{20}$")
    reason: str = Field(min_length=1, max_length=500)


@router.post("/report")
def report(body: ReportBody, uid: str = CurrentUid):
    """Play's AI-Generated Content policy: every reading can be reported from inside the app. The reported text is
    taken from the stored reading, never from the request."""
    doc = store().get(f"readings/{body.readingId}")
    if doc is None or doc.get("uid") != uid:
        raise HTTPException(404, "Reading not found.")
    charge_daily(uid, "report")
    store().set(f"reports/{new_id()}", {"uid": uid, "readingId": body.readingId, "reason": body.reason,
                                         "text": doc["text"], "card": doc["card"], "createdAt": now_ms(),
                                         "status": "open", "at": int(time.time())})
    return {"ok": True}

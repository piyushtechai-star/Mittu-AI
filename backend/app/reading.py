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

from . import ai, birth, media, safety, settings, tts
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
    view = {"id": rid, "card": card_view(doc["card"]), "orientation": doc["orientation"], "category": doc["category"],
            "question": doc.get("question", ""), "text": doc.get("text", ""), "audio_url": audio_url,
            "word_times": doc.get("wordTimes"), "created_at": doc["created_at"]}
    if doc.get("sandesh") is not None:   # v2 readings: the result scroll's fields, beak envelope and follow-ups
        view |= {"sandesh": doc.get("sandesh"), "salah": doc.get("salah"), "lucky_color": doc.get("luckyColor"),
                 "lucky_number": doc.get("luckyNumber"), "envelope": doc.get("envelope"),
                 "followups": [{"question": f["question"], "text": f["text"]} for f in doc.get("followups", [])]}
    return view


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
        text, usage = ai.reading_text(card_id, orientation, user.get("name") or "", body.category, question,
                                      birth.context_line(user))
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
    return [{k: v for k, v in _view(rid, doc).items() if k not in ("audio_url", "word_times", "envelope")} | {
        "has_audio": bool(doc.get("audioPath")) and now_ms() - doc["created_at"] < media.VOICE_TTL_S * 1000}
        for rid, doc in rows if doc.get("text")]   # v2 cards drawn but never spoken (app closed) are not shown


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
    if doc is None or doc.get("uid") != uid or not doc.get("text"):
        raise HTTPException(404, "Reading not found.")
    charge_daily(uid, "report")
    store().set(f"reports/{new_id()}", {"uid": uid, "readingId": body.readingId, "reason": body.reason,
                                         "text": doc["text"], "card": doc["card"], "createdAt": now_ms(),
                                         "status": "open", "at": int(time.time())})
    return {"ok": True}


# ---------------------------------------------------------------- v2 (meeting brief 2026-11-17)
# The old POST /reading made the text AND the acted Gemini voice in one call (8-15 s), and the app's animation waited
# for it: Mittu "hung" over the cards, and when the voice failed the phone's own voice was often silent. v2 splits it:
#   POST /v2/reading             → free checks, plan, day's count, the BACKEND draws the card (instant): {kind: "card"}
#   POST /v2/reading/{id}/speak  → Gemini text (JSON: speech, sandesh, salah, lucky) + fast voice (~1-2 s). Idempotent:
#                                  a second call returns what was made, never pays again. On failure the day's count
#                                  is given back.
#   POST /v2/reading/{id}/followup → a short spoken reply about the same card (2 per card, 10 per day).
# The app calls /speak the moment the card arrives, during the (max 5 s) animation, so the flip never waits.
SPEAK_CLAIM_MS = 60_000


def _own_reading(rid: str, uid: str) -> dict:
    if not re.fullmatch(r"[a-f0-9]{20}", rid):
        raise HTTPException(404, "Reading not found.")
    doc = store().get(f"readings/{rid}")
    if doc is None or doc.get("uid") != uid:
        raise HTTPException(404, "Reading not found.")
    return doc


def _spoken_view(rid: str, doc: dict, request: Request) -> dict:
    return {"kind": "reading", **_view(rid, doc, media.voice_url(doc.get("audioPath"), request))}


@router.post("/v2/reading")
def draw_card(body: ReadingBody, uid: str = CurrentUid):
    user = get_user(uid)
    question = _clean_question(body.question)
    if safety.is_crisis(question):
        return {"kind": "support", "text": safety.SUPPORT_MESSAGE, "helplines": safety.HELPLINES}
    if safety.is_off_topic(question):
        return {"kind": "offtopic", "text": safety.OFF_TOPIC_MESSAGE}
    require_subscription(user)
    charge_daily(uid, "reading")
    card_id, orientation = draw()
    rid = new_id()
    store().set(f"readings/{rid}", {"uid": uid, "question": question, "category": body.category, "card": card_id,
                                     "orientation": orientation, "status": "drawn", "created_at": now_ms(),
                                     "followups": []})
    return {"kind": "card", "id": rid, "card": card_view(card_id), "orientation": orientation}


@router.post("/v2/reading/{rid}/speak")
def speak_card(rid: str, request: Request, uid: str = CurrentUid):
    doc = _own_reading(rid, uid)
    if doc.get("text"):
        return _spoken_view(rid, doc, request)
    now = now_ms()

    def claim(d):
        if d is None or d.get("text") or d.get("status") == "failed":
            return None
        if d.get("status") == "speaking" and now - d.get("speakingAt", 0) < SPEAK_CLAIM_MS:
            return None
        return {**d, "status": "speaking", "speakingAt": now}
    if store().update_atomic(f"readings/{rid}", claim) is None:
        doc = store().get(f"readings/{rid}") or {}
        if doc.get("text"):
            return _spoken_view(rid, doc, request)
        if doc.get("status") == "failed":
            raise HTTPException(503, ai.TRY_AGAIN)
        raise HTTPException(409, "Mittu abhi bol hi raha hai.")   # another call is making it; the app retries

    user = get_user(uid)
    try:
        out, usage = ai.reading_v2(doc["card"], doc["orientation"], user.get("name") or "", doc["category"],
                                   doc.get("question", ""), birth.context_line(user))
    except Exception:
        refund_daily(uid, "reading")   # nothing delivered: don't use up one of today's readings
        store().set(f"readings/{rid}", {"status": "failed"}, merge=True)
        raise

    audio_path, word_times, envelope = None, None, None
    try:
        audio, word_times, envelope, ext = tts.fast_voice(out["speech"])
        audio_path = f"readings/{uid}/{rid}.{ext}"
        media.save_voice(audio_path, audio)
    except Exception:  # noqa: BLE001 - the reading still counts; the app shows the text and can retry the voice
        log.exception("Fast voice failed for reading %s", rid)
        audio_path, word_times, envelope = None, None, None

    update = {"status": "done", "text": out["speech"], "sandesh": out["sandesh"], "salah": out["salah"],
              "luckyColor": out["lucky_color"], "luckyNumber": out["lucky_number"], "audioPath": audio_path,
              "wordTimes": word_times, "envelope": envelope, "usage": usage}
    store().set(f"readings/{rid}", update, merge=True)
    return _spoken_view(rid, {**doc, **update}, request)


class FollowupBody(BaseModel):
    question: str = Field(min_length=1, max_length=settings.QUESTION_MAX_CHARS)


@router.post("/v2/reading/{rid}/followup")
def followup(rid: str, body: FollowupBody, request: Request, uid: str = CurrentUid):
    doc = _own_reading(rid, uid)
    if not doc.get("text"):
        raise HTTPException(409, "Pehle Mittu ko card padhne dijiye.")
    question = _clean_question(body.question)
    if not question:
        raise HTTPException(400, "Sawaal khaali hai.")
    if safety.is_crisis(question):
        return {"kind": "support", "text": safety.SUPPORT_MESSAGE, "helplines": safety.HELPLINES}
    if safety.is_off_topic(question):
        return {"kind": "offtopic", "text": safety.OFF_TOPIC_MESSAGE}
    user = get_user(uid)
    require_subscription(user)
    limit = settings.FOLLOWUPS_PER_READING

    def take(d):
        if d is None:
            return None
        if d.get("followupsUsed", 0) >= limit:
            raise HTTPException(429, f"Is card par Mittu {limit} sawaalon ka jawab de chuka hai. Naya card nikaaliye!")
        return {**d, "followupsUsed": d.get("followupsUsed", 0) + 1}
    store().update_atomic(f"readings/{rid}", take)

    def give_back(d):
        return {**d, "followupsUsed": max(0, d.get("followupsUsed", 1) - 1)} if d else None
    try:
        charge_daily(uid, "followup")
    except Exception:
        store().update_atomic(f"readings/{rid}", give_back)
        raise
    try:
        text, usage = ai.followup_reply(doc["card"], doc["orientation"], user.get("name") or "", doc["category"],
                                        doc.get("question", ""), doc["text"], question)
    except Exception:
        refund_daily(uid, "followup")
        store().update_atomic(f"readings/{rid}", give_back)
        raise

    n = len(doc.get("followups", [])) + 1
    audio_path, word_times, envelope = None, None, None
    try:
        audio, word_times, envelope, ext = tts.fast_voice(text)
        audio_path = f"readings/{uid}/{rid}-f{n}.{ext}"
        media.save_voice(audio_path, audio)
    except Exception:  # noqa: BLE001
        log.exception("Fast voice failed for follow-up %s/%d", rid, n)
        audio_path, word_times, envelope = None, None, None

    item = {"question": question, "text": text, "audioPath": audio_path, "wordTimes": word_times,
            "envelope": envelope, "created_at": now_ms(), "usage": usage}

    def append(d):
        return {**d, "followups": [*d.get("followups", []), item]} if d else None
    store().update_atomic(f"readings/{rid}", append)
    fresh = store().get(f"readings/{rid}") or {}
    return {"kind": "followup", "text": text, "audio_url": media.voice_url(audio_path, request), "word_times": word_times,
            "envelope": envelope, "left": max(0, limit - fresh.get("followupsUsed", 0))}

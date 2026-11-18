"""v2 reading flow (meeting brief 2026-11-17): instant card draw, idempotent speak, follow-ups with limits."""
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import ai, settings, tts
from app.main import app
from app.store import store, today_ist

from .test_flow import login, onboard

c = TestClient(app)


def draw(h, q="Kya nayi job milegi?", cat="career"):
    r = c.post("/v2/reading", headers=h, json={"question": q, "category": cat})
    assert r.status_code == 200, r.text
    return r.json()


def test_draw_is_instant_card_then_speak_returns_structured_reading():
    h = login()
    onboard(h)
    card = draw(h)
    assert card["kind"] == "card" and 0 <= card["card"]["id"] <= 21 and card["orientation"] in ("upright", "reversed")
    assert "text" not in card
    assert c.get("/readings", headers=h).json() == []          # not spoken yet → not in history
    r = c.post(f"/v2/reading/{card['id']}/speak", headers=h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["kind"] == "reading" and d["card"]["id"] == card["card"]["id"] and d["orientation"] == card["orientation"]
    assert d["text"].startswith("Kuurr! Suno suno") and "Riya" in d["text"]   # the original Mittu style
    assert d["sandesh"] and d["salah"] and d["lucky_color"] and d["lucky_number"].isdigit()
    assert d["audio_url"] and len(d["word_times"]) == len(d["text"].split()) and set(d["envelope"]) <= set("0123456789")
    assert d["followups"] == []
    hist = c.get("/readings", headers=h).json()
    assert len(hist) == 1 and hist[0]["sandesh"] == d["sandesh"] and "envelope" not in hist[0]


def test_speak_is_idempotent_and_never_pays_twice(monkeypatch):
    h = login()
    onboard(h)
    card = draw(h)
    calls = []
    real = ai.reading_v2
    monkeypatch.setattr(ai, "reading_v2", lambda *a, **k: calls.append(1) or real(*a, **k))
    first = c.post(f"/v2/reading/{card['id']}/speak", headers=h).json()
    second = c.post(f"/v2/reading/{card['id']}/speak", headers=h).json()
    assert len(calls) == 1 and first["text"] == second["text"]


def test_speak_failure_refunds_the_day_and_blocks_retries(monkeypatch):
    h = login()
    onboard(h)
    card = draw(h)
    assert c.get("/me", headers=h).json()["readingsLeftToday"] == settings.READINGS_PER_DAY - 1

    def boom(*a, **k):
        raise HTTPException(503, ai.TRY_AGAIN)
    monkeypatch.setattr(ai, "reading_v2", boom)
    assert c.post(f"/v2/reading/{card['id']}/speak", headers=h).status_code == 503
    assert c.get("/me", headers=h).json()["readingsLeftToday"] == settings.READINGS_PER_DAY
    monkeypatch.undo()
    assert c.post(f"/v2/reading/{card['id']}/speak", headers=h).status_code == 503   # draw a new card instead


def test_voice_failure_still_returns_the_text(monkeypatch):
    h = login()
    onboard(h)
    card = draw(h)

    def boom(text):
        raise RuntimeError("tts down")
    monkeypatch.setattr(tts, "mittu_voice", boom)
    d = c.post(f"/v2/reading/{card['id']}/speak", headers=h).json()
    assert d["text"] and d["audio_url"] is None and d["envelope"] is None


def test_v2_free_checks_and_paywall():
    h = login()
    assert c.post("/v2/reading", headers=h, json={"question": "I want to die", "category": "general"}).json()["kind"] == "support"
    assert c.post("/v2/reading", headers=h, json={"question": "1 + 1", "category": "general"}).json()["kind"] == "offtopic"
    assert c.post("/v2/reading", headers=h, json={"question": "Job?", "category": "career"}).status_code == 402
    onboard(h)
    for _ in range(settings.READINGS_PER_DAY):
        draw(h)
    assert c.post("/v2/reading", headers=h, json={"question": "Job?", "category": "career"}).status_code == 429


def test_followups_two_per_card_and_daily_cap(monkeypatch):
    h = login()
    onboard(h)
    card = draw(h)
    assert c.post(f"/v2/reading/{card['id']}/followup", headers=h, json={"question": "Aur career?"}).status_code == 409
    c.post(f"/v2/reading/{card['id']}/speak", headers=h)
    for left in (1, 0):
        r = c.post(f"/v2/reading/{card['id']}/followup", headers=h, json={"question": "Iska career pe kya asar hoga?"})
        assert r.status_code == 200, r.text
        f = r.json()
        assert f["kind"] == "followup" and f["text"] and f["audio_url"] and f["left"] == left
    r = c.post(f"/v2/reading/{card['id']}/followup", headers=h, json={"question": "Aur?"})
    assert r.status_code == 429
    d = c.get(f"/readings/{card['id']}", headers=h).json()
    assert len(d["followups"]) == 2
    # crisis and off-topic follow-ups are free and don't use a slot
    card2 = draw(h)
    c.post(f"/v2/reading/{card2['id']}/speak", headers=h)
    assert c.post(f"/v2/reading/{card2['id']}/followup", headers=h, json={"question": "I want to die"}).json()["kind"] == "support"
    assert c.post(f"/v2/reading/{card2['id']}/followup", headers=h, json={"question": "1 + 1"}).json()["kind"] == "offtopic"
    # a failed reply gives back both the card's slot and the day's count
    def boom(*a, **k):
        raise HTTPException(503, ai.TRY_AGAIN)
    monkeypatch.setattr(ai, "followup_reply", boom)
    assert c.post(f"/v2/reading/{card2['id']}/followup", headers=h, json={"question": "Aur paisa?"}).status_code == 503
    monkeypatch.undo()
    doc = store().get(f"readings/{card2['id']}")
    assert doc.get("followupsUsed", 0) == 0
    uid = doc["uid"]
    assert (store().get(f"users/{uid}/daily/{today_ist()}") or {}).get("followup", 0) == 2
    # daily cap
    store().set(f"users/{uid}/daily/{today_ist()}", {"followup": settings.FOLLOWUPS_PER_DAY}, merge=True)
    assert c.post(f"/v2/reading/{card2['id']}/followup", headers=h, json={"question": "Aur paisa?"}).status_code == 429
    assert store().get(f"readings/{card2['id']}").get("followupsUsed", 0) == 0


def test_other_users_cannot_speak_or_follow_up_my_card():
    h1 = login("9876543210")
    onboard(h1)
    card = draw(h1)
    h2 = login("9876543211")
    onboard(h2, "Aman")
    assert c.post(f"/v2/reading/{card['id']}/speak", headers=h2).status_code == 404
    assert c.post(f"/v2/reading/{card['id']}/followup", headers=h2, json={"question": "x y"}).status_code == 404
    assert c.post("/v2/reading/nothex/speak", headers=h1).status_code == 404


def test_config_has_followup_limits():
    cfg = c.get("/config").json()
    assert cfg["followupsPerReading"] == settings.FOLLOWUPS_PER_READING and cfg["followupsPerDay"] == settings.FOLLOWUPS_PER_DAY


def test_parrot_dsp_removes_low_rumble_and_makes_an_envelope():
    import math

    import numpy as np
    rate = 24_000
    t = np.arange(rate) / rate
    pcm = ((0.5 * np.sin(2 * math.pi * 100 * t) + 0.5 * np.sin(2 * math.pi * 1000 * t)) * 12000).astype("<i2").tobytes()
    out, env = tts.parrot_dsp(pcm, rate)
    spec = np.abs(np.fft.rfft(np.frombuffer(out, "<i2").astype(float)))
    f = np.fft.rfftfreq(rate, 1 / rate)
    assert spec[np.argmin(abs(f - 100))] < 0.01 * spec[np.argmin(abs(f - 1000))]
    assert len(env) == tts.ENVELOPE_FPS and set(env) <= set("0123456789")


def test_story_image_is_a_9_16_png_of_my_reading_only():
    import io

    from PIL import Image
    h = login()
    onboard(h)
    card = draw(h)
    assert c.get(f"/v2/readings/{card['id']}/story.png", headers=h).status_code == 409   # not spoken yet
    c.post(f"/v2/reading/{card['id']}/speak", headers=h)
    r = c.get(f"/v2/readings/{card['id']}/story.png", headers=h)
    assert r.status_code == 200 and r.headers["content-type"] == "image/png"
    img = Image.open(io.BytesIO(r.content))
    assert img.size == (1080, 1920)
    h2 = login("9876543212")
    onboard(h2, "Aman")
    assert c.get(f"/v2/readings/{card['id']}/story.png", headers=h2).status_code == 404
    assert c.get(f"/v2/readings/{card['id']}/story.png").status_code == 401


def test_mittu_voice_uses_gemini_and_falls_back_to_fast(monkeypatch):
    monkeypatch.setattr(settings, "TTS_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "READING_VOICE", "gemini")
    import numpy as np
    pcm = (np.sin(np.arange(24_000) / 10) * 8000).astype("<i2").tobytes()
    monkeypatch.setattr(tts, "_gemini_joined", lambda text: (pcm, [0.0, 0.4]))
    audio, times, env, ext = tts.mittu_voice("Mittu Mittu! hello")
    assert ext == "mp3" and times == [0.0, 0.4] and env and set(env) <= set("0123456789")

    def boom(text):
        raise RuntimeError("quota")
    monkeypatch.setattr(tts, "_gemini_joined", boom)
    monkeypatch.setattr(tts, "fast_voice", lambda text: (b"fast", None, "5", "mp3"))
    assert tts.mittu_voice("x")[0] == b"fast"


def test_cut_off_json_is_salvaged_and_lucky_comes_from_the_speech():
    raw = ('{"speech": "Kuurr! Suno suno... Mittu ne nikaala hai Taara ka card! Umeed ka sanket hai. Lucky color, '
           'aasmaani neela... lucky number, saat!", "sandesh": "Nayi roshni", "salah": "Aaj ek chhota kad')
    got = ai.salvage_json(raw)
    assert got["speech"].startswith("Kuurr!") and got["sandesh"] == "Nayi roshni" and "salah" not in got
    assert ai._lucky_from_speech(got["speech"]) == ("Aasmaani neela", "Saat")
    assert ai.salvage_json('{"spee') == {}

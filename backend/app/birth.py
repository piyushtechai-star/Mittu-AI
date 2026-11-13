"""Birth details (like Naksh's form): date of birth (required, 18+ only), time of birth (optional), place (optional city
name, no map lookup) and gender (optional). Mittu uses them only as a light personal touch in the reading: the sun sign
(rashi) and the birth line are added to the message for Gemini. Nothing is shared; deleting the account removes them."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from pydantic import BaseModel, Field

IST = timezone(timedelta(hours=5, minutes=30))
MIN_AGE = 18

# Sun signs (tropical dates, as in everyday Indian horoscope columns) with their Hindi rashi names.
_SIGNS = [  # (until month, until day, English, Hindi)
    (1, 19, "Capricorn", "Makar"), (2, 18, "Aquarius", "Kumbh"), (3, 20, "Pisces", "Meen"), (4, 19, "Aries", "Mesh"),
    (5, 20, "Taurus", "Vrishabh"), (6, 20, "Gemini", "Mithun"), (7, 22, "Cancer", "Kark"), (8, 22, "Leo", "Simha"),
    (9, 22, "Virgo", "Kanya"), (10, 22, "Libra", "Tula"), (11, 21, "Scorpio", "Vrishchik"), (12, 21, "Sagittarius", "Dhanu"),
    (12, 31, "Capricorn", "Makar"),
]


def sun_sign(d: date) -> tuple[str, str]:
    for month, day, en, hi in _SIGNS:
        if (d.month, d.day) <= (month, day):
            return en, hi
    return "Capricorn", "Makar"


def _age(born: date, today: date) -> int:
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


class BirthBody(BaseModel):
    birthDate: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    birthTime: str | None = Field(default=None, pattern=r"^\d{2}:\d{2}$")
    birthPlace: str | None = Field(default=None, max_length=60)
    gender: str | None = Field(default=None, pattern=r"^(female|male|other)$")


def validate(body: BirthBody) -> dict:
    """The stored shape, or 400 with a message the app shows as is."""
    try:
        born = date.fromisoformat(body.birthDate)
    except ValueError:
        raise HTTPException(400, "Janam tithi sahi nahi hai.") from None
    today = datetime.now(IST).date()
    if born.year < 1900 or born > today:
        raise HTTPException(400, "Janam tithi sahi nahi hai.")
    if _age(born, today) < MIN_AGE:
        raise HTTPException(400, "Mittu AI sirf 18 saal ya usse bade logon ke liye hai.")
    if body.birthTime:
        hh, mm = map(int, body.birthTime.split(":"))
        if hh > 23 or mm > 59:
            raise HTTPException(400, "Janam ka samay sahi nahi hai.")
    place = re.sub(r"\s+", " ", body.birthPlace or "").strip() or None
    # Spoken context for the model, so only letters (any script), spaces and simple punctuation.
    if place and not re.fullmatch(r"[A-Za-zÀ-ɏऀ-ॿ][A-Za-zÀ-ɏऀ-ॿ .,'\-]*", place):
        raise HTTPException(400, "Janam sthaan mein sirf shehar ka naam likhiye.")
    return {"birthDate": body.birthDate, "birthTime": body.birthTime, "birthPlace": place, "gender": body.gender}


def view(user: dict) -> dict | None:
    """What /me returns about birth details (None until given)."""
    if not user.get("birthDate"):
        return None
    en, hi = sun_sign(date.fromisoformat(user["birthDate"]))
    return {"birthDate": user["birthDate"], "birthTime": user.get("birthTime"), "birthPlace": user.get("birthPlace"),
            "gender": user.get("gender"), "sign": en, "rashi": hi}


def context_line(user: dict) -> str | None:
    """One line for the reading prompt, e.g. "Sun sign Leo (Simha); born 14 Aug 1998, 06:30, Lucknow; female"."""
    if not user.get("birthDate"):
        return None
    born = date.fromisoformat(user["birthDate"])
    en, hi = sun_sign(born)
    parts = [f"Sun sign {en} ({hi})", "born " + born.strftime("%d %b %Y").lstrip("0")
             + (f", {user['birthTime']}" if user.get("birthTime") else "")
             + (f", {user['birthPlace']}" if user.get("birthPlace") else "")]
    if user.get("gender"):
        parts.append(user["gender"])
    return "; ".join(parts)

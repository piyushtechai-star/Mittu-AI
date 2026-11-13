"""The signed-in user: onboarding step, name, birth details, daily limits, account deletion."""
from __future__ import annotations

import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from . import birth, settings
from .auth import CurrentUid
from .store import now_ms, store, today_ist

router = APIRouter(tags=["user"])


def ensure_user(uid: str, phone: str) -> dict:
    user = store().get(f"users/{uid}")
    if user is None:
        user = {"phone": phone, "createdAt": now_ms()}
        if settings.REVIEWER_BYPASS_ENABLED and phone in settings.TESTERS:
            user["name"] = settings.TESTERS[phone]
        store().set(f"users/{uid}", user)
    return user


def daily_limits() -> dict[str, int]:
    """Per user per day (AI + TTS spend and abuse). Reset at midnight IST."""
    return {"reading": settings.READINGS_PER_DAY, "report": settings.REPORTS_PER_DAY}


def charge_daily(uid: str, kind: str) -> None:
    """Counts one `kind` call for today; 429 once the day's limit is used up. Call right before the paid work."""
    limit = daily_limits()[kind]

    def bump(doc):
        doc = doc or {}
        if doc.get(kind, 0) >= limit:
            raise HTTPException(429, "Aaj ke liye Mittu thak gaya hai. Kal phir aana!")
        return {**doc, kind: doc.get(kind, 0) + 1}
    store().update_atomic(f"users/{uid}/daily/{today_ist()}", bump)


def refund_daily(uid: str, kind: str) -> None:
    """Gives the call back when the paid work failed (the user saw an error, nothing was delivered)."""
    def drop(doc):
        if not doc or doc.get(kind, 0) <= 0:
            return None
        return {**doc, kind: doc[kind] - 1}
    store().update_atomic(f"users/{uid}/daily/{today_ist()}", drop)


def used_today(uid: str, kind: str) -> int:
    return (store().get(f"users/{uid}/daily/{today_ist()}") or {}).get(kind, 0)


def get_user(uid: str) -> dict:
    user = store().get(f"users/{uid}")
    if user is None:
        raise HTTPException(401, "Please sign in again.")
    return user


def is_reviewer(user: dict) -> bool:
    """The Play reviewer and named team testers: full access without paying."""
    phone = user.get("phone")
    return settings.REVIEWER_BYPASS_ENABLED and (phone == settings.REVIEWER_PHONE or phone in settings.TESTERS)


def subscription_active(user: dict) -> bool:
    """Paid or in trial. The Razorpay webhook is the only thing that sets this (never the app)."""
    if is_reviewer(user):
        return True
    sub = user.get("subscription") or {}
    # Cancelling stops future charges; the period already paid for (or the trial) stays usable until it ends.
    return sub.get("status") in ("authenticated", "active", "cancelled") and sub.get("currentEnd", 0) > time.time()


def require_subscription(user: dict) -> None:
    if not subscription_active(user):
        raise HTTPException(402, "subscription_required")


def me_view(uid: str, user: dict) -> dict:
    sub = user.get("subscription") or {}
    active = subscription_active(user)
    # Fixed onboarding order (guide 05): OTP → Paywall → Name (required) → Birth details (date required, 18+) → Home.
    next_step = ("paywall" if not active else "name" if not user.get("name")
                 else "birth" if not user.get("birthDate") else "home")
    return {
        "uid": uid, "phone": user.get("phone"), "name": user.get("name"), "birth": birth.view(user),
        "subscription": {"active": active, "status": sub.get("status"), "currentEnd": sub.get("currentEnd"),
                         "trialEnd": sub.get("trialEnd"), "newSubscription": bool(sub.get("purchaseEventPending"))},
        "readingsLeftToday": max(0, settings.READINGS_PER_DAY - used_today(uid, "reading")) if active else 0,
        "next": next_step,
    }


@router.get("/me")
def me(uid: str = CurrentUid):
    return me_view(uid, get_user(uid))


class NameBody(BaseModel):
    name: str = Field(min_length=1, max_length=50)


@router.post("/me/name")
def set_name(body: NameBody, uid: str = CurrentUid):
    # Letters (any script), spaces, dots, apostrophes and hyphens only: the name is spoken by Mittu ("Suno Riya...")
    # and printed on GST invoices, so it must not carry instructions or markup.
    name = re.sub(r"\s+", " ", body.name).strip()
    if not re.fullmatch(r"[A-Za-zÀ-ɏऀ-ॿ][A-Za-zÀ-ɏऀ-ॿ .'\-]*", name):
        raise HTTPException(400, "Please enter your name using letters only.")
    require_subscription(get_user(uid))
    store().set(f"users/{uid}", {"name": name}, merge=True)
    return me_view(uid, get_user(uid))


@router.post("/me/birth")
def set_birth(body: birth.BirthBody, uid: str = CurrentUid):
    """Onboarding step after the name, and Profile > Birth details. Date of birth must show 18 or older."""
    data = birth.validate(body)
    require_subscription(get_user(uid))
    store().set(f"users/{uid}", data, merge=True)
    return me_view(uid, get_user(uid))


@router.post("/me/delete")
def delete_me(uid: str = CurrentUid):
    """Used by the delete-account page (guide 09: no delete button in the app; steps are in the privacy policy).
    Removes the profile, readings, reports and stored voice clips, and cancels the Razorpay subscription so the user
    isn't charged again. Invoices are kept, as tax law requires."""
    from .billing import cancel_subscription  # local import: billing imports this module
    from .media import delete_voice
    user = get_user(uid)
    cancel_subscription(user)
    for doc_id, doc in store().list("readings", where=("uid", uid)):
        delete_voice(doc.get("audioPath"))
        store().delete(f"readings/{doc_id}")
    for collection in ("subscriptions", "reports"):
        for doc_id, _ in store().list(collection, where=("uid", uid)):
            store().delete(f"{collection}/{doc_id}")
    if user.get("phone"):
        store().delete(f"otp/{user['phone']}")
    store().delete_tree(f"users/{uid}")   # also ends every session: tokens need the user doc
    return {"ok": True}

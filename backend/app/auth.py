"""Phone OTP login and sessions.

██ PLAYBOOK RULE (section 03): copy the Statusly login code AS IT IS. Do not rebuild it. ██
Replace the body of this file with Statusly/backend/app/security.py (plus the parts of settings.py and
firestore_store.py it needs) and keep these two public pieces so the rest of Mittu AI keeps working:
  • `router`       – POST /auth/otp/request {phone}  and  POST /auth/otp/verify {phone, code} -> {token, uid}
  • `current_uid`  – FastAPI dependency that returns the signed-in user's id from the Bearer token

Until the Statusly code is copied in, this stand-in follows the same rules (10-minute codes, max 5 codes per
phone per hour, max 3 wrong attempts, reviewer login 9999988888 / 123456 when REVIEWER_BYPASS_ENABLED), so the
app can be built and tested end to end. In OTP_MODE=console no SMS is sent and the code is always 123456.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time

import httpx
import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from . import settings
from .store import store

router = APIRouter(prefix="/auth", tags=["auth"])

CODE_TTL_S = 600
MAX_CODES_PER_HOUR = 5
MAX_WRONG = 3
MIN_GAP_S = 30            # between two codes to the same phone
MAX_PER_IP_PER_HOUR = 20  # OTP requests and wrong codes from one network (SMS pumping, guessing)


class OtpRequest(BaseModel):
    phone: str


class OtpVerify(BaseModel):
    phone: str
    code: str


def normalise_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    if not re.fullmatch(r"[6-9]\d{9}", digits):
        raise HTTPException(400, "Enter a valid 10-digit mobile number.")
    return digits


def uid_for(phone: str) -> str:
    return "p_" + hashlib.sha256(f"mittuai:{phone}".encode()).hexdigest()[:24]


def _hash(code: str, phone: str) -> str:
    return hmac.new(settings.JWT_SECRET.encode(), f"{phone}:{code}".encode(), hashlib.sha256).hexdigest()


def _is_reviewer(phone: str) -> bool:
    """Fixed-code login (no SMS): the Play reviewer, the team test numbers and the named testers. Only the reviewer
    and the named testers get free access."""
    return settings.REVIEWER_BYPASS_ENABLED and (phone == settings.REVIEWER_PHONE or phone in settings.TEST_PHONES
                                                 or phone in settings.TESTERS)


def client_ip(request: Request) -> str:
    # Cloud Run APPENDS the real caller's address to X-Forwarded-For; anything before it was sent by the caller
    # and can be faked, so only the last entry counts.
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "")).split(",")[-1].strip()
    return re.sub(r"[^0-9a-fA-F:.]", "", ip) or "unknown"


def limit_ip(ip: str, kind: str, limit: int = MAX_PER_IP_PER_HOUR) -> None:
    """Counts `kind` events per network per hour; 429 over the limit."""
    def bump(doc):
        n = (doc or {}).get("n", 0)
        if n >= limit:
            raise HTTPException(429, "Too many attempts. Please try again later.")
        return {"n": n + 1}
    store().update_atomic(f"ratelimit/{kind}_{ip.replace(':', '_')}_{int(time.time() // 3600)}", bump)


def _send_sms(phone: str, code: str) -> None:
    if settings.OTP_MODE == "console":
        print(f"[otp] {phone}: {code}")
        return
    if not settings.SMS_UKEY:
        print("[otp] SMS_UKEY is not set; cannot send the code")
        raise HTTPException(503, "Couldn't send the code. Please try again.")
    # HouseofTech VoicenSMS (HouseofTech SMS kit). A 200 is not proof of delivery: a message that differs from the DLT
    # template is dropped silently by the operator, so the text comes only from sms_message().
    try:
        resp = httpx.get(settings.SMS_API_URL, timeout=15, params={
            "ukey": settings.SMS_UKEY, "msisdn": f"91{phone}", "credittype": settings.SMS_CREDIT_TYPE,
            "senderid": settings.SMS_SENDER_ID, "templateid": settings.SMS_TEMPLATE_ID,
            "message": sms_message(code), "filetype": 2,
        })
    except httpx.HTTPError as e:
        print(f"[otp] SMS request failed: {type(e).__name__}")
        raise HTTPException(503, "Couldn't send the code. Please try again.")
    if resp.status_code >= 400:
        print(f"[otp] SMS provider answered {resp.status_code}: {resp.text[:200]}")
        raise HTTPException(503, "Couldn't send the code. Please try again.")
    print(f"[otp] SMS sent to ******{phone[-4:]}: {resp.text[:120]}")


def sms_message(code: str) -> str:
    """The OTP text, exactly as DLT template 81917: 'Your Mittu AI App login OTP is 123456 , HouseofTech'."""
    return settings.SMS_TEMPLATE_BODY.format(app=settings.SMS_APP_NAME, code=code)


@router.post("/otp/request")
def request_otp(body: OtpRequest, request: Request):
    phone = normalise_phone(body.phone)
    if _is_reviewer(phone):
        return {"ok": True}
    limit_ip(client_ip(request), "otp")
    now = time.time()
    path = f"otp/{phone}"

    def update(doc):
        doc = doc or {}
        recent = [t for t in doc.get("sentAt", []) if now - t < 3600]
        if len(recent) >= MAX_CODES_PER_HOUR:
            raise HTTPException(429, "Too many codes requested. Try again in an hour.")
        if recent and now - max(recent) < MIN_GAP_S:
            raise HTTPException(429, "Please wait a few seconds before asking for a new code.")
        return {"sentAt": recent + [now], "pending": True}

    store().update_atomic(path, update)
    code = "123456" if settings.OTP_MODE == "console" else f"{secrets.randbelow(1_000_000):06d}"
    store().set(path, {"hash": _hash(code, phone), "expiresAt": now + CODE_TTL_S, "wrong": 0}, merge=True)
    _send_sms(phone, code)
    return {"ok": True}


def issue_token(uid: str, phone: str, version: int = 0) -> str:
    """`tv` = the user's tokenVersion: bumping it (Sign out) kills older tokens. `iat` lets a re-created account
    (same phone after deletion) reject tokens issued before it existed."""
    now = int(time.time())
    return jwt.encode({"sub": uid, "phone": phone, "iat": now, "exp": now + settings.SESSION_DAYS * 86400, "tv": version},
                      settings.JWT_SECRET, algorithm="HS256")


@router.post("/otp/verify")
def verify_otp(body: OtpVerify, request: Request):
    phone = normalise_phone(body.phone)
    code = re.sub(r"\D", "", body.code)
    if _is_reviewer(phone):
        if code != settings.REVIEWER_OTP:
            raise HTTPException(400, "Incorrect code.")
    else:
        ip = client_ip(request)
        result = {}

        # One transaction per attempt: parallel guesses can't all slip under MAX_WRONG, and a right code is used once.
        def attempt(doc):  # may re-run if the transaction retries
            result.clear()
            doc = doc or {}
            if not doc.get("hash") or time.time() > doc.get("expiresAt", 0):
                result["error"] = (400, "This code has expired. Request a new one.")
                return None
            if doc.get("wrong", 0) >= MAX_WRONG:
                result["error"] = (429, "Too many wrong attempts. Request a new code.")
                return None
            if not hmac.compare_digest(doc["hash"], _hash(code, phone)):
                result["error"] = (400, "Incorrect code.")
                return {**doc, "wrong": doc.get("wrong", 0) + 1}
            return {**doc, "hash": None, "pending": False}

        store().update_atomic(f"otp/{phone}", attempt)
        if "error" in result:
            if result["error"][1] == "Incorrect code.":
                limit_ip(ip, "otpwrong")
            raise HTTPException(*result["error"])

    uid = uid_for(phone)
    from .users import ensure_user  # local import: users imports this module
    user = ensure_user(uid, phone)
    return {"token": issue_token(uid, phone, (user or {}).get("tokenVersion", 0)), "uid": uid}


def current_uid(authorization: str = Header(default="")) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Please sign in.")
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    # Deleted accounts and signed-out sessions: the user doc is gone, its tokenVersion moved on, or the token is
    # older than the account (issued before a delete-and-sign-up-again with the same phone).
    user = store().get(f"users/{claims['sub']}")
    if (user is None or user.get("tokenVersion", 0) != claims.get("tv", 0)
            or claims.get("iat", 0) * 1000 < user.get("createdAt", 0) - 5000):
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    return claims["sub"]


CurrentUid = Depends(current_uid)


@router.post("/logout")
def logout(uid: str = CurrentUid):
    """Signs this account out on every device (all earlier tokens stop working). Not for the shared reviewer/test
    numbers: one tester signing out would sign out everyone on that number (and a Play reviewer mid-review)."""
    def bump(doc):
        if doc is None or _is_reviewer(doc.get("phone", "")):
            return None   # deleted meanwhile (don't re-create it) or a shared account
        return {**doc, "tokenVersion": doc.get("tokenVersion", 0) + 1}
    store().update_atomic(f"users/{uid}", bump)
    return {"ok": True}

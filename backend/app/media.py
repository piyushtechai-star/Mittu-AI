"""Voice clips: a PRIVATE Cloud Storage bucket, read through 1-hour signed URLs (guide 06 / 11).

The bucket (VOICE_BUCKET, asia-south1) has a lifecycle rule that deletes clips after 7 days, and no public access.
Signing uses the Cloud Run service account through the IAM signBlob API (no key file): the service account needs
"Service Account Token Creator" on itself.

STORE=memory (local runs and tests): clips stay in memory and are served by /dev/voice/{token}, with the same
1-hour expiry, so the app works end to end without Google Cloud.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import time
from datetime import timedelta
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Request, Response

from . import settings

log = logging.getLogger("mittuai.media")
router = APIRouter(tags=["media"])
VOICE_TTL_S = 7 * 86400
_memory: dict[str, bytes] = {}


def _local() -> bool:
    return settings.STORE == "memory"


@lru_cache
def _bucket():
    from google.cloud import storage
    return storage.Client(project=settings.GCP_PROJECT).bucket(settings.VOICE_BUCKET)


def save_voice(path: str, audio: bytes) -> None:
    if _local():
        _memory[path] = audio
        return
    blob = _bucket().blob(path)
    blob.cache_control = "private, max-age=3600"
    blob.upload_from_string(audio, content_type="audio/wav" if path.endswith(".wav") else "audio/mpeg", timeout=30)


def delete_voice(path: str | None) -> None:
    if not path:
        return
    if _local():
        _memory.pop(path, None)
        return
    try:
        _bucket().blob(path).delete()
    except Exception:  # noqa: BLE001 - already gone (lifecycle rule) or transient; deletion is best effort
        log.warning("Couldn't delete voice clip %s", path)


def _local_token(path: str, expires: int) -> str:
    sig = hmac.new(settings.JWT_SECRET.encode(), f"{path}|{expires}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{path.replace('/', '~')}.{expires}.{sig}"


def voice_url(path: str | None, request: Request | None = None) -> str | None:
    """A fresh signed URL (1 hour) for the clip, or None."""
    if not path:
        return None
    if _local():
        expires = int(time.time()) + settings.VOICE_URL_MINUTES * 60
        base = str(request.base_url).rstrip("/") if request else ""
        return f"{base}/dev/voice/{_local_token(path, expires)}"
    import google.auth
    from google.auth.transport import requests as grequests
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(grequests.Request())
    return _bucket().blob(path).generate_signed_url(
        version="v4", expiration=timedelta(minutes=settings.VOICE_URL_MINUTES), method="GET",
        service_account_email=creds.service_account_email, access_token=creds.token)


@router.get("/dev/voice/{token}")
def dev_voice(token: str):
    """Local runs only (STORE=memory): stands in for the signed Cloud Storage URL."""
    if not _local():
        raise HTTPException(404, "Not found")
    try:
        raw_path, expires, sig = token.rsplit(".", 2)
        path = raw_path.replace("~", "/")
        ok = hmac.compare_digest(_local_token(path, int(expires)), token) and int(expires) > time.time()
    except ValueError:
        ok = False
    if not ok or path not in _memory:
        raise HTTPException(404, "Not found")
    return Response(_memory[path], media_type="audio/wav" if path.endswith(".wav") else "audio/mpeg")

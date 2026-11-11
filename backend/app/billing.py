"""Razorpay Subscriptions with UPI Autopay (playbook section 04).

- Prices come from GET /config, never from the app.
- The webhook is the only thing that grants access. It is safe to receive twice.
- No cancel endpoint: cancellation steps live on the payment-cancellation policy page.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time

import httpx
from fastapi import APIRouter, Header, HTTPException, Request

from . import settings
from .auth import CurrentUid
from .invoices import create_invoice_once
from .store import now_ms, store
from .users import get_user, is_reviewer, me_view, subscription_active

router = APIRouter(tags=["billing"])
log = logging.getLogger("mittuai.billing")
API = "https://api.razorpay.com/v1"


@router.get("/config")
def config():
    return {
        "plan": {"name": settings.PLAN_NAME, "trialPricePaise": settings.TRIAL_PRICE_PAISE,
                 "trialDays": settings.TRIAL_DAYS, "pricePaise": settings.PRICE_PAISE, "interval": "month",
                 "currency": "INR"},
        "razorpayKeyId": settings.RAZORPAY_KEY_ID if settings.BILLING_MODE == "razorpay" else "test",
        "billingMode": settings.BILLING_MODE,
        "readingsPerDay": settings.READINGS_PER_DAY,
        "legal": {k: f"{settings.LEGAL_BASE}/{k}" for k in ("privacy", "terms", "payment-cancellation", "delete-account")},
        "supportEmail": settings.SUPPORT_EMAIL,
    }


@router.post("/billing/subscription")
def create_subscription(uid: str = CurrentUid):
    """Creates a Razorpay subscription: trial amount now (addon), monthly plan from the end of the trial."""
    user = get_user(uid)
    if subscription_active(user) and not is_reviewer(user):
        raise HTTPException(409, "You already have an active plan.")   # a second mandate would charge twice
    if settings.BILLING_MODE == "fake":
        sub_id = f"sub_test_{uid[-8:]}"
    else:
        start_at = int(time.time()) + settings.TRIAL_DAYS * 86400
        resp = httpx.post(f"{API}/subscriptions", timeout=20, auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET), json={
            "plan_id": settings.RAZORPAY_PLAN_ID, "total_count": 120, "quantity": 1, "customer_notify": 1,
            "start_at": start_at,
            "addons": [{"item": {"name": "Mittu AI trial", "amount": settings.TRIAL_PRICE_PAISE, "currency": "INR"}}],
            "notes": {"uid": uid, "app": "mittuai", "phone": user.get("phone", "")},
        })
        if resp.status_code >= 400:
            log.error("Razorpay create subscription failed: %s %s", resp.status_code, resp.text[:300])
            raise HTTPException(503, "Payments are busy. Please try again.")
        sub_id = resp.json()["id"]
    store().set(f"subscriptions/{sub_id}", {"uid": uid, "createdAt": now_ms()})
    return {"subscriptionId": sub_id, "keyId": config()["razorpayKeyId"], "phone": user.get("phone")}


def cancel_subscription(user: dict) -> None:
    """Stops the UPI Autopay mandate (used when an account is deleted). Best effort: logs and carries on."""
    sub = user.get("subscription") or {}
    if settings.BILLING_MODE != "razorpay" or not sub.get("id") or sub.get("status") in ("cancelled", "completed", "expired"):
        return
    resp = httpx.post(f"{API}/subscriptions/{sub['id']}/cancel", timeout=20,
                      auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET), json={"cancel_at_cycle_end": 0})
    if resp.status_code >= 400:
        log.error("Razorpay cancel %s failed: %s %s", sub["id"], resp.status_code, resp.text[:300])


def _uid_for(sub_id: str | None) -> str | None:
    """Only subscriptions this app created count. The webhook covers the whole Razorpay account, so another app's
    events (or an account deleted since) are ignored instead of trusting `notes.uid`."""
    return (store().get(f"subscriptions/{sub_id}") or {}).get("uid") if sub_id else None


def _apply_subscription(entity: dict) -> None:
    sub_id = entity["id"]
    uid = _uid_for(sub_id)
    if not uid:   # link only: a plan change or a yearly plan must keep working
        log.warning("Webhook for a subscription that isn't Mittu AI's: %s", sub_id)
        return
    status = entity.get("status")

    def update(user):
        if user is None:
            return None   # account deleted: don't bring it back
        old = user.get("subscription") or {}
        # End of the period already paid for (or of the trial). A cancelled subscription keeps access until then, so
        # never invent a later date for it: only a fresh mandate falls back to "trial from now".
        current_end = entity.get("current_end") or entity.get("start_at") or (
            old.get("currentEnd") if old.get("id") == sub_id and old.get("currentEnd") else None) or (
            int(time.time()) + settings.TRIAL_DAYS * 86400 if status == "authenticated" else int(time.time()))
        is_new = status == "authenticated" and old.get("id") != sub_id
        if old.get("id") and old.get("id") != sub_id and not is_new:
            return None   # a late event for an older subscription must not overwrite the current one
        return {**user, "subscription": {
            **old, "id": sub_id, "status": status, "currentEnd": current_end,
            "trialEnd": entity.get("start_at") or old.get("trialEnd"),
            # The app sends Meta's fb_mobile_purchase ONLY for a brand-new subscription, then clears this flag.
            "purchaseEventPending": True if is_new else old.get("purchaseEventPending", False),
            "updatedAt": now_ms(),
        }}

    store().update_atomic(f"users/{uid}", update)


def _apply_payment(payment: dict, sub_id: str | None) -> None:
    if payment.get("status") != "captured":
        return
    uid = _uid_for(sub_id)
    if not uid:
        log.warning("Captured payment %s without a known user", payment.get("id"))
        return
    first = not store().list("invoices", where=("uid", uid))
    create_invoice_once(payment["id"], uid, int(payment["amount"]),
                        "Mittu AI trial" if first else "Mittu AI monthly subscription",
                        int(payment.get("created_at") or time.time()))


def handle_event(event: dict) -> None:
    payload = event.get("payload") or {}
    sub = (payload.get("subscription") or {}).get("entity")
    payment = (payload.get("payment") or {}).get("entity")
    if sub:
        _apply_subscription(sub)
    if payment:
        _apply_payment(payment, (sub or {}).get("id") or payment.get("subscription_id"))


@router.post("/billing/razorpay-webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(default=""),
                           x_razorpay_event_id: str = Header(default="")):
    body = await request.body()
    expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not settings.RAZORPAY_WEBHOOK_SECRET or not hmac.compare_digest(expected, x_razorpay_signature):
        raise HTTPException(400, "Bad signature")
    if x_razorpay_event_id:
        seen = store().update_atomic(f"webhook_events/{x_razorpay_event_id}",
                                     lambda doc: {"at": now_ms()} if doc is None else None)
        if seen is None:
            return {"ok": True, "duplicate": True}
    try:
        handle_event(json.loads(body))
    except Exception:
        # Forget the event id so a retry or a manual replay from the Razorpay dashboard is processed again.
        log.exception("Webhook %s failed", x_razorpay_event_id)
        if x_razorpay_event_id:
            store().delete(f"webhook_events/{x_razorpay_event_id}")
        return {"ok": False}
    # Always 200 once verified: if the webhook errors for 24 hours Razorpay silently switches it off.
    return {"ok": True}


@router.post("/billing/test-complete")
def test_complete(uid: str = CurrentUid):
    """BILLING_MODE=fake only: simulates the webhooks Razorpay sends after a successful trial payment."""
    if settings.BILLING_MODE != "fake":
        raise HTTPException(404, "Not found")
    sub_id = f"sub_test_{uid[-8:]}"
    now = int(time.time())
    if not store().get(f"subscriptions/{sub_id}"):   # webhooks only count subscriptions Mittu AI created
        store().set(f"subscriptions/{sub_id}", {"uid": uid, "createdAt": now_ms()})
    handle_event({"payload": {
        "subscription": {"entity": {"id": sub_id, "status": "authenticated", "start_at": now + settings.TRIAL_DAYS * 86400,
                                    "notes": {"uid": uid}}},
        "payment": {"entity": {"id": f"pay_test_{now}", "status": "captured", "amount": settings.TRIAL_PRICE_PAISE,
                               "created_at": now, "notes": {"uid": uid}}},
    }})
    return me_view(uid, get_user(uid))


@router.post("/me/purchase-event-ack")
def purchase_event_ack(uid: str = CurrentUid):
    store().set(f"users/{uid}", {"subscription": {"purchaseEventPending": False}}, merge=True)
    return {"ok": True}

"""GST invoices (playbook section 06): every payment gets one, numbered HOT/<FY>/<CODE>/<000001>.

██ Replace `render_invoice_html` with the shared template _shared/invoicing/invoice_template.py ██
Never write your own numbering beyond `next_invoice_number` below (one counter per financial year, inside a
transaction, created once per payment id from the webhook).
"""
from __future__ import annotations

import html
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

from . import settings
from .auth import CurrentUid
from .store import now_ms, store

router = APIRouter(tags=["invoices"])
IST = ZoneInfo("Asia/Kolkata")


def financial_year(d: datetime) -> str:
    start = d.year if d.month >= 4 else d.year - 1
    return f"{start % 100:02d}-{(start + 1) % 100:02d}"


def next_invoice_number(when: datetime) -> str:
    fy = financial_year(when)

    def bump(doc):
        return {"value": (doc or {}).get("value", 0) + 1}

    n = store().update_atomic(f"counters/invoice_{fy}", bump)["value"]
    return f"HOT/{fy}/{settings.INVOICE_APP_CODE}/{n:06d}"


def create_invoice_once(payment_id: str, uid: str, amount_paise: int, description: str, paid_at: int) -> dict:
    """Idempotent: the same payment id never gets a second invoice (webhooks can arrive twice)."""
    path = f"invoices/{payment_id}"
    existing = store().get(path)
    if existing:
        return existing
    when = datetime.fromtimestamp(paid_at, tz=IST)
    user = store().get(f"users/{uid}") or {}
    taxable = round(amount_paise / 1.18)            # GST is included in the price shown (₹1 = ₹0.85 + ₹0.15)
    invoice = {
        "number": next_invoice_number(when), "paymentId": payment_id, "uid": uid, "phone": user.get("phone"),
        "amountPaise": amount_paise, "taxablePaise": taxable, "gstPaise": amount_paise - taxable,
        "description": description, "paidAt": paid_at, "createdAt": now_ms(),
    }
    # update_atomic guards against two webhook deliveries racing each other.
    return store().update_atomic(path, lambda doc: invoice if doc is None else None) or store().get(path)


def render_invoice_html(inv: dict, buyer_name: str) -> str:
    """Stand-in for the shared template. The name is filled in now (at view time), not when the invoice was created."""
    rupees = lambda p: f"₹{p / 100:,.2f}"
    date = datetime.fromtimestamp(inv["paidAt"], tz=IST).strftime("%d %b %Y")
    e = html.escape
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{e(inv['number'])}</title>
<style>body{{font-family:Arial,sans-serif;color:#1c1b22;margin:32px}}h1{{font-size:20px}}table{{width:100%;border-collapse:collapse;margin-top:16px}}
td,th{{border-bottom:1px solid #ddd;padding:8px;text-align:left}}.r{{text-align:right}}</style></head><body>
<h1>Tax Invoice</h1>
<p><b>{e(settings.SELLER_NAME)}</b><br>GSTIN {settings.SELLER_GSTIN}</p>
<p>Invoice no. <b>{e(inv['number'])}</b><br>Date {date}<br>Payment ID {e(inv['paymentId'])}</p>
<p>Billed to: <b>{e(buyer_name or 'Customer')}</b><br>Mobile {e(inv.get('phone') or '')}</p>
<table><tr><th>Description</th><th>SAC</th><th class="r">Amount</th></tr>
<tr><td>{e(inv['description'])}</td><td>{settings.SAC_CODE}</td><td class="r">{rupees(inv['taxablePaise'])}</td></tr>
<tr><td>IGST 18%</td><td></td><td class="r">{rupees(inv['gstPaise'])}</td></tr>
<tr><th>Total (incl. GST)</th><th></th><th class="r">{rupees(inv['amountPaise'])}</th></tr></table>
</body></html>"""


@router.get("/invoices")
def list_invoices(uid: str = CurrentUid):
    rows = store().list("invoices", where=("uid", uid))
    rows.sort(key=lambda r: r[1].get("paidAt", 0), reverse=True)
    return [{"id": i, "number": d["number"], "amountPaise": d["amountPaise"], "paidAt": d["paidAt"],
             "description": d["description"]} for i, d in rows]


@router.get("/invoices/{payment_id}/html", response_class=HTMLResponse)
def invoice_html(payment_id: str, uid: str = CurrentUid):
    inv = store().get(f"invoices/{payment_id}")
    if inv is None or inv.get("uid") != uid:
        raise HTTPException(404, "Invoice not found.")
    name = (store().get(f"users/{uid}") or {}).get("name", "")
    return render_invoice_html(inv, name)

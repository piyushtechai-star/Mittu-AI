"""Mittu AI API: FastAPI on Cloud Run (mittuai-api, asia-south1), project colorjoy-app, Firestore database "mittuai"."""
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from . import auth, billing, invoices, media, reading, settings, users

logging.basicConfig(level=logging.INFO)

_prod = settings.STORE == "firestore"
# No public /docs or /openapi.json in production (they map every route for an attacker).
app = FastAPI(title="Mittu AI API", version="1.0.0", **({"docs_url": None, "redoc_url": None, "openapi_url": None} if _prod else {}))
# Phones don't use CORS; only a hosted web build (WEB_ORIGINS) and local dev servers may call from a browser.
app.add_middleware(CORSMiddleware, allow_origins=settings.WEB_ORIGINS,
                   allow_origin_regex=None if _prod else r"http://(localhost|127\.0\.0\.1)(:\d+)?",
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Cache-Control", "no-store")
    return response


for module in (auth, users, billing, invoices, reading, media):
    app.include_router(module.router)


@app.get("/health")
def health():
    return {"ok": True}

"""All configuration comes from environment variables.

On Cloud Run, secrets (keys, tokens) are mounted from Secret Manager as env vars, e.g.
  gcloud run deploy mittuai-api --set-secrets=MITTUAI_JWT_SECRET=MITTUAI_JWT_SECRET:latest,...
Locally, copy .env.example to .env (never commit .env).
"""
import os
from pathlib import Path


def _load_dotenv() -> None:
    env = Path(__file__).resolve().parent.parent / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()


def _bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes")


# --- Google Cloud (guide 01: colorjoy-app, asia-south1, Mittu's own named database / bucket) ---
GCP_PROJECT = os.environ.get("GCP_PROJECT", "colorjoy-app")
REGION = os.environ.get("REGION", "asia-south1")
FIRESTORE_DATABASE = os.environ.get("FIRESTORE_DATABASE", "mittuai")
STORE = os.environ.get("STORE", "firestore")            # "firestore" | "memory" (local dev and tests)

# --- Sessions / OTP (Statusly login, same rules as every HouseofTech app) ---
JWT_SECRET = os.environ.get("MITTUAI_JWT_SECRET", "dev-only-change-me")
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "60"))
SMS_UKEY = os.environ.get("SMS_UKEY", "")               # VoicenSMS key (secret, Secret Manager)
# HouseofTech VoicenSMS OTP. The message must match the DLT template byte for byte (space before the comma included);
# otherwise VoicenSMS still answers 200 and the operator silently drops the SMS. Template id: ask Ayush for Mittu's.
SMS_API_URL = os.environ.get("SMS_API_URL", "https://api.voicensms.in/SMSAPI/webresources/CreateSMSCampaignGet")
SMS_SENDER_ID = os.environ.get("SMS_SENDER_ID", "HOTIPL")
SMS_TEMPLATE_ID = os.environ.get("SMS_TEMPLATE_ID", "81917")
SMS_CREDIT_TYPE = os.environ.get("SMS_CREDIT_TYPE", "7")
SMS_APP_NAME = os.environ.get("SMS_APP_NAME", "Mittu AI")
SMS_TEMPLATE_BODY = os.environ.get("SMS_TEMPLATE_BODY", "Your {app} App login OTP is {code} , HouseofTech")
OTP_MODE = os.environ.get("OTP_MODE", "sms")            # "sms" | "console" (local: code is always 123456)
REVIEWER_BYPASS_ENABLED = _bool("REVIEWER_BYPASS_ENABLED", True)
REVIEWER_PHONE = "9999988888"
REVIEWER_OTP = "123456"
TEST_PHONES: tuple[str, ...] = ()   # team test numbers (fixed code, unpaid): add here if the team wants them
TESTERS: dict[str, str] = {}        # named testers with full access: {"99999xxxxx": "Name"}

# --- AI: Gemini on Vertex AI (guide 01). No API key: the Cloud Run service account needs "Vertex AI User". ---
AI_PROVIDER = os.environ.get("AI_PROVIDER", "vertex")            # "vertex" | "fake" (local runs and tests)
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")
VERTEX_LOCATION = os.environ.get("VERTEX_LOCATION", REGION)
GEMINI_THINKING = os.environ.get("GEMINI_THINKING", "low")       # "" = model default
READING_MAX_OUTPUT_TOKENS = int(os.environ.get("READING_MAX_OUTPUT_TOKENS", "1500"))  # thinking included; reply ~150
QUESTION_MAX_CHARS = 300

# --- Mittu's voice: Google Cloud Text-to-Speech (guide 07) ---
TTS_PROVIDER = os.environ.get("TTS_PROVIDER", "google")          # "google" | "fake"
TTS_VOICE = os.environ.get("TTS_VOICE", "hi-IN-Neural2-A")        # pick by ear: test 3-4 hi-IN voices at +5..+7
TTS_PITCH = float(os.environ.get("TTS_PITCH", "6.0"))
TTS_RATE = float(os.environ.get("TTS_RATE", "1.1"))
VOICE_BUCKET = os.environ.get("VOICE_BUCKET", "mittuai-voice")    # PRIVATE bucket, lifecycle: delete after 7 days
VOICE_URL_MINUTES = 60                                            # signed URL lifetime

# Readings per user per day (guide 06: comes from /config, enforced here). Reports are capped too.
READINGS_PER_DAY = int(os.environ.get("READINGS_PER_DAY", "5"))
REPORTS_PER_DAY = 20

# --- Razorpay (Ayush provides plan id + keys; while building use Artify's merchant) ---
BILLING_MODE = os.environ.get("BILLING_MODE", "razorpay")   # "razorpay" | "fake" (local: no real payment)
RAZORPAY_KEY_ID = os.environ.get("MITTUAI_RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("MITTUAI_RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("MITTUAI_RAZORPAY_WEBHOOK_SECRET", "")
RAZORPAY_PLAN_ID = os.environ.get("RAZORPAY_PLAN_ID", "")
# Shown on the paywall; served by /config so prices change without a new app build. Paise.
PLAN_NAME = os.environ.get("PLAN_NAME", "mittuai_99")
TRIAL_PRICE_PAISE = int(os.environ.get("TRIAL_PRICE_PAISE", "100"))
TRIAL_DAYS = int(os.environ.get("TRIAL_DAYS", "3"))
PRICE_PAISE = int(os.environ.get("PRICE_PAISE", "9900"))

# --- GST invoices (guide 08) ---
INVOICE_APP_CODE = os.environ.get("INVOICE_APP_CODE", "MIT")   # 3-letter code from Ayush
SELLER_NAME = "HouseofTech Innovation Pvt Ltd"
SELLER_GSTIN = "06AALCP3434H1ZE"
SAC_CODE = "998434"

# Browser origins allowed to call the API (a hosted Expo web build, if the team wants one). Phones don't use CORS.
WEB_ORIGINS = [o.strip() for o in os.environ.get("WEB_ORIGINS", "").split(",") if o.strip()]

# --- Links ---
LEGAL_BASE = os.environ.get("LEGAL_BASE", "https://houseoftech-legal.web.app/mittuai")
SUPPORT_EMAIL = "support@houseoftech.ai"

# Refuse to start in production with development defaults (anyone could mint sessions, log in as anyone or
# subscribe for free).
if STORE == "firestore":
    if JWT_SECRET == "dev-only-change-me" or len(JWT_SECRET) < 32:
        raise RuntimeError("Set a strong MITTUAI_JWT_SECRET (32+ chars)")
    _test = [f"{n}={v}" for n, v, ok in (("OTP_MODE", OTP_MODE, "sms"), ("BILLING_MODE", BILLING_MODE, "razorpay"),
                                          ("AI_PROVIDER", AI_PROVIDER, "vertex"), ("TTS_PROVIDER", TTS_PROVIDER, "google"))
             if v != ok]
    if _test:
        raise RuntimeError(f"Test settings are not allowed in production: {', '.join(_test)}")

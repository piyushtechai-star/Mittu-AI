# mittuai-api

FastAPI on Cloud Run: service `mittuai-api`, project `colorjoy-app`, region `asia-south1`, Firestore database `mittuai`.
URL: https://mittuai-api-319635525745.asia-south1.run.app (the app's `EXPO_PUBLIC_API_URL`).

```
app/main.py        routers, security headers, no /docs in production
app/settings.py    all config from env vars / Secret Manager; refuses to start in production with test settings
app/auth.py        phone OTP (VoicenSMS) + JWT sessions: same code as Naksh (Statusly rules)
app/users.py       /me (onboarding step), name, daily limits, account deletion
app/billing.py     /config, Razorpay subscription + webhook (HMAC, idempotent), test-mode payment
app/invoices.py    GST invoices HOT/<FY>/MIT/000001 (numbered in a transaction, once per payment id)
app/reading.py     POST /reading, GET /readings, GET /readings/{id}, POST /report
app/safety.py      free checks: self-harm → helplines, off-topic / prompt tricks → fixed reply
app/ai.py          Gemini on Vertex AI (Mittu's system prompt in app/prompts.py)
app/tts.py         Cloud Text-to-Speech hi-IN, pitch +6, rate 1.1, SSML marks → word timings
app/media.py       private bucket mittuai-voice, 1-hour signed URLs (IAM signBlob, no key file)
app/cards.py       the 22 Major Arcana; the backend draws the card and orientation
```

## Google Cloud resources (created 2026-11-12, `tools/gcp/mittuai-setup.ps1` repeats it)
| Resource | Setting |
|---|---|
| APIs | Vertex AI, Cloud Text-to-Speech (enabled 2026-11-12), Firestore, Cloud Run, Storage, Secret Manager |
| Firestore `mittuai` | asia-south1, native; composite index readings (uid ↑, created_at ↓) |
| Bucket `gs://mittuai-voice` | asia-south1, public access prevention enforced, uniform access, lifecycle: delete after 7 days |
| Service account `mittuai-api@colorjoy-app.iam.gserviceaccount.com` | Datastore User only on database `mittuai` (condition `mittuai-db-only`), Vertex AI User, Storage Object Admin on the voice bucket only, Token Creator on itself (signed URLs), Secret Accessor on its secrets |
| Secrets | `MITTUAI_JWT_SECRET` (generated), `SMS_UKEY` (shared HouseofTech key, read only); later `MITTUAI_RAZORPAY_KEY_ID/_KEY_SECRET/_WEBHOOK_SECRET` |

Gemini note: `gemini-3.8-flash` is not served in Vertex `asia-south1`, so `VERTEX_LOCATION=global` (checked 2026-11-12).
Cloud Run, Firestore and the voice bucket stay in asia-south1.

## Deploy (scripts in `tools/gcp/`; run them yourself: Claude may not write secrets or deploy to production)
```powershell
# 0. gcloud login if it expired:  powershell -ExecutionPolicy Bypass -File C:\Users\Piyush\tools\gcloud-login.ps1
# 1. secrets (once; again when Razorpay keys arrive in backend\.env)
powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-secrets.ps1"
# 2. full deploy (env vars + secrets). Settings change → run this again.
powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-deploy.ps1"
# code-only updates later (keeps settings):
powershell -ExecutionPolicy Bypass -File "C:\Users\Piyush\OneDrive\Desktop\mitthu ai\tools\gcp\mittuai-api-redeploy.ps1"
```
After **every** deploy: reviewer login 9999988888 / 123456 must work (guide 03), and run `tools/gcp/smoke-test.ps1`.
Razorpay webhook (when Ayush sets it up): `https://mittuai-api-319635525745.asia-south1.run.app/billing/razorpay-webhook`,
events subscription.authenticated/activated/charged/cancelled/halted/completed and payment.captured.

## Local runs
```powershell
copy .env.example .env      # STORE=memory etc.: free, offline, OTP 123456
.\.venv\Scripts\python -m uvicorn app.main:app --port 8080
.\.venv\Scripts\python -m pytest -q
```
Real Gemini / TTS from this PC (uses your gcloud login): set `AI_PROVIDER=vertex`, `TTS_PROVIDER=google`,
`GOOGLE_APPLICATION_CREDENTIALS=C:\Users\Piyush\tools\gcloud-config\application_default_credentials.json` and
`GOOGLE_CLOUD_QUOTA_PROJECT=colorjoy-app` (Text-to-Speech needs a quota project with user credentials; Cloud Run doesn't).

## Picking Mittu's voice (guide 07)
Listen to `store/voice-samples/` (4 hi-IN voices at pitch +6, rate 1.1) and set `TTS_VOICE` / `TTS_PITCH` in
`tools/gcp/mittuai-deploy.ps1`. No code change needed.

## Spend controls
Per user: `READINGS_PER_DAY` (5), crisis and off-topic questions free, Gemini output capped at 1500 tokens, the reading
given back if Gemini fails. Per service: `--max-instances 5`, CPU only during requests. Measured cost per reading
(2026-11-12): about 670 input + 130 output tokens and about 450 TTS characters. Watch Gemini + TTS spend for the first days
after each release (guide 15).

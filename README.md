# Mittu AI

Tarot reading by Mittu, the talking parrot. Built to the HouseofTech "Mittu AI: build guide" on the Naksh stack.
One-page summary: [PROJECT.md](PROJECT.md). Each folder has its own README.

```
backend/       FastAPI on Cloud Run (mittuai-api). app/ = API, tests/ = pytest (17 tests)
mobile/        Expo app (Expo Router, plain StyleSheet): Android + the web build
web-hosting/   nginx image that serves the web build on Cloud Run (mittuai-web) for the team
store/         Play listing, Play Console answers, legal-page drafts for Ayush, Play icon, voice samples
tools/gcp/     Google Cloud scripts: setup (done), secrets, deploy, redeploy, web deploy, smoke test
tools/         render-assets.mjs: app icon, splash, bundled sounds (from Mittu's SVG and the sound synth)
prototype-web/ First browser prototype (Vite). Reference only: it uses Anthropic/ElevenLabs, which the guide doesn't allow
```

## Live resources (colorjoy-app, asia-south1)
| What | Where |
|---|---|
| API | `mittuai-api`: https://mittuai-api-319635525745.asia-south1.run.app |
| Team web app | `mittuai-web`: https://mittuai-web-319635525745.asia-south1.run.app (login 9999988888 / 123456) |
| Database | Firestore `mittuai` |
| Voice clips | `gs://mittuai-voice` (private, 7-day lifecycle, 1-hour signed URLs) |
| AI / voice | Gemini `gemini-3.8-flash` on Vertex AI (global endpoint) · Mittu's voice: Gemini TTS `gemini-2.5-flash-tts` voice Puck acting the parrot (Cloud TTS `hi-IN-Neural2-A` as backup) |
| Service account | `mittuai-api@colorjoy-app.iam.gserviceaccount.com` (least privilege, see backend/README.md) |
| Reviewer login | 9999988888 / 123456 (full access, no SMS). Check it after every backend deploy |

## Run locally (free: no SMS, payments, AI or TTS)
```powershell
cd backend; copy .env.example .env; .\.venv\Scripts\python -m uvicorn app.main:app --port 8080     # terminal 1
cd mobile;  npx expo start --web                                                                     # terminal 2
```
Any number, code 123456; on the paywall "Start for ₹1" completes a test payment.

## Checks before every hand-off (guide 12)
```powershell
cd backend; .\.venv\Scripts\python -m pytest -q
cd mobile;  npx tsc --noEmit; npx expo lint; npx expo export --platform web
powershell -ExecutionPolicy Bypass -File tools\gcp\smoke-test.ps1 -Reading     # live API, after each deploy
```
Then a real ₹1 trial on a phone, 10 readings across all categories (voice clear, rules followed, the self-harm message
shows), and a low-end Android phone (smooth animation, voice and beak in sync, ambient ducks).

## How a reading works (guide 06)
`POST /reading {question, category}`. The backend runs these steps, cheapest first:
1. A self-harm question gets helplines and no reading.
2. Off-topic questions and prompt tricks ("1 + 1", code, "ignore your instructions") get a fixed reply. No AI call, nothing used up (the Naksh "1+1" fix).
3. Subscription check (402), then today's limit (429; `READINGS_PER_DAY`, served by `/config`).
4. The backend picks the card and orientation. The app can't influence them.
5. Gemini writes the reading (output capped; the reading is given back if Gemini fails).
6. Cloud TTS gives Mittu's voice and per-word timings.
7. The clip goes to the private bucket, the reading is saved to `readings/{id}`, and the response is `{card, orientation, text, audio_url, word_times}`.

## Security
- OTP, sessions, rate limits, webhook HMAC + idempotency, invoices and the production start guards are the same code as Naksh.
- No AI keys exist: Vertex and TTS use the service account. Razorpay and SMS keys live only in Secret Manager.
- Users can only reach their own readings. Reports store the server's copy of the text. The question is wrapped as data, and the name is letters only.
- No `/docs` in production. CORS allows only the team web app. The web app has a strict CSP.

## Still needed from others
| From | What |
|---|---|
| Ayush | Razorpay plan (trial, price, `mittuai_<price>`), webhook and keys; Mittu's DLT SMS template id; invoice code (using `MIT`) + shared invoice template; Pulse snippet; publish the 4 policy pages (drafts in `store/legal-drafts/`); sign-off on the dark reading scene |
| Designer | Rive file for Mittu (states idle/fly/hover/pick/land/talk, input `talking`) to replace `mobile/src/components/Mittu.tsx`; 22 card illustrations + card back as WebP on R2 |
| Manik / Meta | Meta App ID + Client Token (EAS env vars), key hashes, Automatic Advanced Matching OFF |

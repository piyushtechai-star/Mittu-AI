# Mittu AI

Built to the HouseofTech "Mittu AI: build guide" (same stack and rules as Naksh). One-page summary: [PROJECT.md](PROJECT.md).

```
backend/        FastAPI for Cloud Run (mittuai-api). app/ = API, tests/ = pytest (17 tests).
mobile/         Expo app (Expo Router, plain StyleSheet). Screens in src/app/, shared code in src/.
tools/          render-assets.mjs: app icon, splash and bundled sounds (from Mittu's SVG and the sound synth).
store/          Play listing assets (play-icon-512.png so far).
prototype-web/  The first browser prototype (Vite). Reference only: it uses Anthropic/ElevenLabs, which the guide doesn't allow.
```

## Run locally (free: no SMS, payments, AI or TTS)
```powershell
# backend (terminal 1)
cd backend
C:\Users\Piyush\tools\python312\python.exe -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt pytest
copy .env.example .env          # STORE=memory, AI_PROVIDER=fake, TTS_PROVIDER=fake, BILLING_MODE=fake, OTP_MODE=console
.\.venv\Scripts\python -m uvicorn app.main:app --port 8080
# app (terminal 2)
cd mobile
npm install
npx expo start --web            # any number, code 123456; on the paywall "Start for ₹1" completes a test payment
```

## Checks before every hand-off (guide 12)
```powershell
cd backend; .\.venv\Scripts\python -m pytest -q          # 17 tests: flow, OTP, webhook, invoices, limits, safety, isolation
cd mobile;  npx tsc --noEmit; npx expo lint; npx expo export --platform web
```
Then do a real ₹1 trial on a phone, run 10 readings across all categories (voice clear? rules followed? does a self-harm question show the helpline?), and test on a low-end Android phone.

## How a reading works (guide 06)
`POST /reading {question, category}`. The backend runs these steps, cheapest first:
1. A self-harm question gets a support message with helplines (no reading, no cost).
2. An off-topic or trick question ("1 + 1", code, essays, "ignore your instructions") gets a fixed Mittu reply with no Gemini call. This is the Naksh "1+1" fix.
3. Subscription check (402), then today's limit (429; `READINGS_PER_DAY`, served by `/config`).
4. The backend picks the card and orientation (`secrets`). The app can't influence them.
5. Gemini on Vertex AI with Mittu's system prompt (backend only): output capped at 1500 tokens, cleaned, and cut at about 130 words. If Gemini fails, the reading is given back. If Gemini's safety filter blocks it, a gentle fixed reading is used.
6. Cloud TTS (hi-IN, pitch +6, rate 1.1, MP3, handset-class-device), with one SSML `<mark>` per word so subtitles follow the exact timing.
7. The MP3 goes to the private bucket, the reading is saved to `readings/{id}`, and the response is `{card, orientation, text, audio_url (signed, 1 h), word_times}`.

## Security notes
- OTP, sessions, rate limits, webhook HMAC + idempotency, invoice numbering and the production start guards are the same code as Naksh. In production the API refuses to start with test settings or a weak JWT secret.
- No AI keys anywhere: Vertex AI and TTS use the Cloud Run service account. Razorpay and SMS keys live only in Secret Manager.
- Users can only read and report their own readings. Reports store the server's copy of the text, never the client's.
- The question is sanitised and wrapped in `<question>` as data. The name allows letters only (it is spoken and printed on invoices).
- No `/docs` in production. CORS is closed except for `WEB_ORIGINS`. Voice clips are private, behind 1-hour signed links, and deleted after 7 days.

## Still needed from others
| From | What |
|---|---|
| Ayush | Sign-off on the reading-scene design exception; Razorpay plan (trial, price, `mittuai_<price>`), webhook and keys → Secret Manager; invoice code (using `MIT`) + shared invoice template; Pulse SDK snippet; Mittu's SMS DLT template id; enable **Text-to-Speech API** + **Vertex AI API** on colorjoy-app (Naksh found TTS off); publish the 4 policy pages at houseoftech-legal.web.app/mittuai/ |
| Designer | The Rive file (states idle/fly/hover/pick/land/talk, input `talking`) to replace `mobile/src/components/Mittu.tsx`; 22 card illustrations + card back as WebP on R2 (current art is an original SVG stand-in) |
| You | Meta app (App ID + Client Token as EAS env vars), Play Console entry, EAS project (`eas init`), backend deploy (see backend/README.md) |

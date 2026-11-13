# Mittu AI: Play Console answers (first upload, internal testing)

Checked against the code on 2026-11-13 (12-screen storyboard design, microphone voice input, background music, no Meta SDK yet). Store text: `store/play-listing.md`. Graphics: `store/play-icon-512.png`, `store/feature-graphic-1024x500.png`, `store/screenshots/0*.png`. Legal drafts: `store/legal-drafts/`.

## Blockers
| Blocker | Blocks | Owner |
|---|---|---|
| A new AAB with the new design, mic and music (versionCode 3). Built on Google Cloud Build, not EAS (free builds used up): one-time `tools/gcp/mittuai-build-setup.ps1`, then `tools/gcp/mittuai-build-aab.ps1` → `builds/mittuai-3.aab`. | Upload | Piyush |
| Policy pages not published yet: houseoftech-legal.web.app/mittuai/privacy, /terms, /payment-cancellation, /delete-account (drafts in `store/legal-drafts/mittuai/`). Play needs the privacy and deletion URLs for App content. | App content, production | Ayush |
| Razorpay plan (trial, price, `mittuai_<price>`), webhook secret, live keys. Until then the paywall answers "Payments are busy" (the reviewer account is already subscribed). | Real users | Ayush |
| Mittu's own DLT SMS template. Until then real numbers get no OTP; the reviewer login works without SMS. | Real users | Ayush |
| Vertex quota for gemini-2.5-flash-tts is 10 requests/min per project (about 2 readings a minute); over it, readings use the backup voice. | Launch | Ayush |
| Rive file for Mittu and painted card art (current: code-drawn SVG). | Production polish | Designer |

## 1. Create app (Play Console > Create app)
- App name: `Mittu AI: Tarot Reading`
- Default language: English (India) – en-IN
- App or game: **App** · Free or paid: **Free** (a subscription app is free to download)
- Declarations: Developer Program Policies ✔, US export laws ✔
- After creating: Settings > App details: contact email support@houseoftech.ai, category **Entertainment**
- Package `com.houseoftech.mittuai` is set by the first upload and can never change.

## 2. Internal testing (Testing > Internal testing)
1. **Testers** tab > Create email list `Mittu internal` > add the testers' Gmail addresses > Save. Feedback URL or email: support@houseoftech.ai.
2. **Releases** tab > Create new release.
3. App integrity: accept **Google-generated app signing key** (first time only).
4. Upload the AAB (`builds/mittuai-3.aab` from `tools/gcp/mittuai-build-aab.ps1`; raise `android.versionCode` in `mobile/app.json` for every later upload).
5. Release name: `1.0.0 (3)` (auto). Release notes:
   ```
   <en-IN>Meet Mittu! Ask a question, watch him pick your tarot card, and hear your reading in his parrot voice.</en-IN>
   ```
6. Next > Save > **Start rollout to Internal testing**.
7. Testers tab > copy the **opt-in link** and send it to the testers (they open it once, accept, then install from Play).
8. App integrity > copy the **App signing key certificate SHA-1** (needed later for Meta, as base64, not hex).

Checks before rollout:
- App bundle explorer > Permissions: expect INTERNET, ACCESS_NETWORK_STATE, **RECORD_AUDIO** (speak your question), MODIFY_AUDIO_SETTINGS, VIBRATE (plus small library ones like WAKE_LOCK). **Not** FOREGROUND_SERVICE_MEDIA_PLAYBACK, location, SMS, contacts or storage (blocked in app.json). If FOREGROUND_SERVICE_MEDIA_PLAYBACK shows, the AAB is the old one; if RECORD_AUDIO is missing, it was built before voice input.
- If AD_ID is listed, answer Advertising ID "Yes" below; without the Meta SDK it should not be there.
- Native code: arm64-v8a + x86_64 (guide 13).
- Play lets you roll out internal testing before the store listing is finished. If it asks for an App content item first, the answers are in section 4.

## 3. Store listing (Grow > Store presence > Main store listing)
- App name, short description, full description: copy from `store/play-listing.md` (no ₹ / Rs anywhere).
- App icon: `store/play-icon-512.png`
- Feature graphic: `store/feature-graphic-1024x500.png`
- Phone screenshots (7, 1080 × 1920): `store/screenshots/01-splash.png` … `07-history.png`
- Category Entertainment, email support@houseoftech.ai, privacy policy URL below.

## 4. App content (Policy > App content)
- **Privacy policy:** https://houseoftech-legal.web.app/mittuai/privacy (must be live first)
- **App access:** All or some functionality is restricted > Add instructions. Name `Reviewer login`, username `9999988888`, password `123456`. Instructions:
  "Sign-in is by mobile number and one-time code. This test number works without SMS: open the app, tap Get Started, then Aage badhein, enter 9999988888, tap Code bhejiye and type 123456. The account already has an active subscription, so every feature is open: type a question, tap Aage badhein, then Mittu, card nikaalo! to watch Mittu pick a tarot card and hear the reading. It allows 5 readings a day."
- **Ads:** No, my app does not contain ads
- **Content rating** (IARC questionnaire): category "All Other App Types"; No to violence, fear, sexuality, language, controlled substances, crude humour, gambling, hate; users can interact or exchange content: No; shares location: No; digital purchases: Yes; generative AI content (if asked): Yes, and users can report every reading in the app.
- **Target audience and content:** 18 and over only. Appeals to children: No.
- **News app:** No · **Government app:** No · **Financial features:** none · **Health apps:** "My app does not have any health features" (Health is only a question category for entertainment readings).
- **Advertising ID:** this build has no Meta SDK → **No**. When Meta is added (Ayush's App ID + Client Token, rebuild): change to Yes, purposes Analytics and Advertising or marketing, and update Data safety (guide 10: a mismatch blocks the release).
- **Account deletion:** Delete account URL https://houseoftech-legal.web.app/mittuai/delete-account (Profile > Delete account opens it in the app).

## 5. Data safety (current build: no Meta SDK, no Pulse)
Collects or shares data: Yes. Encrypted in transit: Yes. Users can request deletion: Yes (URL above).

| Data type | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Personal info > Name | Yes | No | Required | App functionality, Personalization, Account management |
| Personal info > Phone number | Yes | No | Required | App functionality, Account management, Fraud prevention, security and compliance |
| Personal info > User IDs | Yes | No | Required | App functionality, Account management |
| Personal info > Email address | Yes (Razorpay checkout may ask) | No | Required | App functionality, Fraud prevention, security and compliance |
| Financial info > User payment info | Yes (in Razorpay checkout) | No | Required | App functionality, Fraud prevention, security and compliance |
| Financial info > Purchase history | Yes | No | Required | App functionality, Account management |
| App activity > Other user-generated content (questions, readings, reports) | Yes | No | Required | App functionality, Personalization |
| App activity > Installed apps | Yes (Razorpay checks which UPI apps are installed) | No | Required | App functionality |
| Device or other IDs | Yes (Razorpay checkout, fraud checks) | No | Required | Fraud prevention, security and compliance |
| Audio > Voice or sound recordings | Yes, **processed ephemerally** (spoken question turned into text by the phone's speech service; no audio stored or sent to our server) | No | **Optional** (typing works too) | App functionality |
| Location, Contacts, Photos and videos, Files, Calendar, Health and fitness, Messages, Web browsing, App interactions, Crash logs, Diagnostics | No | | | |

Notes:
- Audio: only the optional mic input counts (processed ephemerally, as in Naksh). Mittu's own voice clips are generated audio, not user data. Background music is a bundled file.
- Google Cloud (Gemini on Vertex AI, Text-to-Speech, Firestore, Storage), VoicenSMS and Razorpay are service providers: "collected", not "shared".
- Share Karo uses the phone's own share sheet; the app sends nothing anywhere itself.
- **When Meta is added**, change: Purchase history, App interactions, Crash logs, Diagnostics and Device or other IDs → collected and **shared (Meta)**, purposes Analytics, Advertising or marketing. Phone number stays "not shared" only if Meta Automatic Advanced Matching is OFF. Same for Pulse when it's wired.

## 6. After launch (guide 15)
Tell Ayush: app name, package `com.houseoftech.mittuai`, Razorpay plan name, invoice code `MIT`, Cloud Run URL `https://mittuai-api-319635525745.asia-south1.run.app`, Firestore database `mittuai`, reviewer login 9999988888 / 123456. Add the app to the App SOP site (hot-appsop.web.app).

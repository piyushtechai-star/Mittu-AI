# Mittu AI: Play Console answers (first upload)

Checked against the code on 2026-11-12. Store text: `store/play-listing.md`. Legal drafts: `store/legal-drafts/`.

## Blockers
| Blocker | Blocks | Owner |
|---|---|---|
| Policy pages not published yet: houseoftech-legal.web.app/mittuai/privacy, /terms, /payment-cancellation, /delete-account (drafts in `store/legal-drafts/mittuai/`). Privacy and deletion URLs are required by Play. | Data safety, production | Ayush |
| Razorpay plan (trial, price, `mittuai_<price>`), webhook secret, live keys. Until then the paywall answers "Payments are busy". | Real users | Ayush |
| Mittu's own DLT SMS template (the OTP text must match it byte for byte). Until then real numbers get no SMS; the reviewer login works without SMS. | Real users | Ayush |
| Sign-off on the reading-scene design exception (dark, illustrated scene in an otherwise standard app). | Production | Ayush |
| Rive file for Mittu and final card art (current: SVG stand-ins). | Production polish | Designer |

## 1. Create app
- App name: `Mittu AI: Tarot Reading`
- Package: `com.houseoftech.mittuai` (can never change after the first upload)
- Default language: English (India) en-IN
- App, Free (a subscription app is free to download)
- Contact email: support@houseoftech.ai
- Category: Entertainment

## 2. App signing
Accept Google-generated key. After the first upload, copy the **App signing key certificate SHA-1** from App integrity; it becomes the second Meta key hash (base64 of the SHA-1, not hex).

## 3. Internal testing
- Testers: email list `Mittu internal`; feedback email support@houseoftech.ai
- Release notes from `play-listing.md` (no ₹ / Rs)
- App bundle explorer > Permissions: expect INTERNET, AD_ID (once Meta is on); **no** RECORD_AUDIO (blocked in app.json), location, SMS, contacts or storage
- Build check (guide 13): arm64-v8a + x86_64 (set in app.json); install on an x86_64 emulator and check `adb logcat` for crashes before submitting

## 4. App content (Policy > App content)
- **Privacy policy:** https://houseoftech-legal.web.app/mittuai/privacy (must be live first)
- **App access:** restricted > instructions. Name `Reviewer login`, username `9999988888`, password `123456`. Notes: "Sign-in is by mobile number and one-time code. This test number works without SMS: enter 9999988888, tap Code bhejiye, type 123456. This account already has an active subscription, so every feature is open: ask a question, watch Mittu pick a tarot card and hear the reading."
- **Ads:** No
- **Content rating:** "All Other App Types"; No to violence, fear, sexuality, language, drugs, crude humour, gambling, hate; users interact: No; location: No; digital purchases: Yes; generative AI (if asked): Yes, users can report every reading in the app
- **Target audience:** 18 and over only
- **News / Government / Financial / Health features:** No
- **Advertising ID:** Yes, purposes Analytics and Advertising or marketing (Meta SDK). Must match Data safety, or the release gets stuck (guide 10).

## 5. Data safety
Collects data: Yes. Encrypted in transit: Yes. Users can request deletion: Yes, https://houseoftech-legal.web.app/mittuai/delete-account.

| Data type | Collected | Shared | Optional? | Purposes |
|---|---|---|---|---|
| Personal info > Name | Yes | No | Required | App functionality, Personalization, Account management |
| Personal info > Phone number | Yes | No | Required | App functionality, Account management, Fraud prevention/security |
| Personal info > User IDs | Yes | No | Required | App functionality, Account management |
| Personal info > Email address | Yes (Razorpay checkout may ask) | No | Required | App functionality, Fraud prevention/security |
| Financial info > User payment info | Yes (in Razorpay checkout) | No | Required | App functionality, Fraud prevention/security |
| Financial info > Purchase history | Yes | **Yes (Meta)** | Required | Collected: App functionality, Account management, Analytics. Shared: Analytics, Advertising or marketing |
| App activity > Other user-generated content (questions, readings, reports) | Yes | No | Required | App functionality, Personalization |
| App activity > App interactions | Yes | **Yes (Meta)** | Required | Collected: App functionality, Analytics. Shared: Analytics, Advertising or marketing |
| App activity > Installed apps | Yes (Razorpay checks UPI apps) | No | Required | App functionality |
| App info and performance > Crash logs, Diagnostics | Yes | **Yes (Meta)** | Required | Analytics |
| Device or other IDs | Yes | **Yes (Meta)** | Required | Advertising or marketing, Analytics |
| Audio, Location, Contacts, Photos, Files, Calendar, Health, Messages, Web history, SMS, Emails | No | | | |

Notes:
- Mittu's voice clips are generated audio, not the user's voice, so "Audio" stays No.
- Google Cloud (Gemini on Vertex AI, Text-to-Speech, Firestore, Storage), VoicenSMS and Razorpay are service providers: "collected", not "shared".
- Phone number stays "not shared" only if Meta **Automatic Advanced Matching is OFF**.
- If Pulse analytics is added, update this form.

## 6. After launch (guide 15)
Tell Ayush: app name, package `com.houseoftech.mittuai`, Razorpay plan name, invoice code `MIT`, Cloud Run URL `https://mittuai-api-319635525745.asia-south1.run.app`, Firestore database `mittuai`, reviewer login 9999988888 / 123456. Add the app to the App SOP site (hot-appsop.web.app).

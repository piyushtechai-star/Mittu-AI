# Mittu AI policy pages: check against the app (16 Nov 2026)

Pages checked: https://houseoftech-legal.web.app/mittu-ai/privacy, /terms, /payment-cancellation, /delete-account (all live, "Last updated 13 November 2026").

**Correct, matches the app:** 18+ only; entertainment, not advice; helplines for distress questions; mobile number + OTP + required name; optional microphone (speech turned into text on the phone, no audio stored or sent); Google Gemini on Vertex AI and Google text-to-speech as processors; voice clips deleted after 7 days; text history kept while the account exists; share via the phone's share sheet; report a reading; no location, contacts, call logs or SMS; servers in India (Mumbai); UPI AutoPay, no Google Play Billing; no in-app cancel button; cancelling keeps access until the paid period ends; GST invoices in the app; deletion acknowledged in 2 working days, done within 30 days; company, email and address.

## Needs a change before the public release

| # | Page | What the page says | What the app does | Suggested change |
|---|---|---|---|---|
| 1 | Privacy (1.A, 2, 3, 9) | Nothing about birth details | Asks for **date of birth (required; under-18s are refused)**, and optionally **time of birth, city of birth and gender**. The app works out the sun sign (rashi) and sends these as context to Google Gemini for a personal touch in the reading. Kept with the account, deleted with it. | Add to 1.A: "Birth details: your date of birth (required, to confirm you are 18 or older and to personalise readings) and, if you choose, your time of birth, city of birth and gender." Add to 3: "Your name and birth details (or the sun sign worked out from them) are included with your question so the reading can be personalised." Add to 9: kept while the account is active, deleted with it. |
| 2 | Privacy 5, Terms 9, Payment & Cancellation (plans table, 5, 9) | Monthly **and yearly** plans; switching between them | Only one plan: a short trial, then **monthly** (`mittuai_<price>`). No yearly plan exists. | Remove the yearly plan and plan switching, or keep them only if Ayush is adding a yearly Razorpay plan before launch. |
| 3 | Privacy 1.C | "Notifications (optional) for service messages" | The app asks for **no** notification permission and sends no push notifications. | Remove the Notifications line. |
| 4 | Privacy 1.B, 2, 6, 13 | Meta SDK collects the advertising ID for install and purchase analytics | The SDK is wired but **switched off** until Ayush shares the Meta App ID and Client Token; the current build (versionCode 3) has no Meta SDK and no AD_ID. | Fine to keep if Meta goes on before the public release (then Play Data safety must say Device IDs / app activity are shared with Meta). Otherwise reword to "may use the Meta SDK". |

Optional: the pages name PhonePe as a possible gateway; only Razorpay is integrated. "Such as" wording is fine.

The app now links to these `mittu-ai` pages (Profile > Privacy Policy, Terms, Payment & cancellation, Delete account) once the backend is redeployed; until then those links open a 404 (they pointed to `/mittuai/`).

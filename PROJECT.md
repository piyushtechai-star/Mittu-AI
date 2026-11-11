# Mittu AI

Tarot reading by Mittu, the talking parrot. Package `com.houseoftech.mittuai` (never changes after the first Play upload). Category: Entertainment. Contact: support@houseoftech.ai.

## What the app does
The user asks a question and picks a category (Love, Career, Paisa, Health, General). Mittu flies off his perch, picks one of the 22 Major Arcana cards (upright or reversed), flips it, and speaks a short Hinglish reading in a raised-pitch parrot voice, with word-by-word subtitles. For entertainment only.

## Core screens
- **Home**: question, category chips, "Mittu, card nikaalo!", readings left today, Skip-animation toggle.
- **Reading**: the one immersive (dark, illustrated) screen, about 8 s and skippable. Fly → 7-card fan → pick → 3D flip → land → squawk → voice + subtitles. Shows "Sirf manoranjan ke liye" and a Report button. Mute, replay, close.
- **Profile**: name, plan, reading history, invoices, help, policy links, sign out. No cancel button, no delete button (both explained in the policies).
- Onboarding (fixed): OTP → Paywall → Name (required) → Home.

## Price plan
Razorpay Subscription with UPI Autopay: a small trial, then a monthly price. Placeholders until Ayush sets the plan: ₹1 for 3 days, then ₹99/month, plan name `mittuai_99`, 5 readings per day. All of these come from the backend `/config` and are never hard-coded in the app.

## Stack
Expo (React Native, plain StyleSheet) · FastAPI on Cloud Run `mittuai-api` (asia-south1, project `colorjoy-app`) · Firestore database `mittuai` · Gemini on Vertex AI (readings) · Cloud Text-to-Speech hi-IN (voice) · private Cloud Storage bucket `mittuai-voice` (signed URLs, 7-day lifecycle) · Secret Manager · EAS builds.

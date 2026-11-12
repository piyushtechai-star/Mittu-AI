# Mittu AI

Tarot reading by Mittu, the talking parrot. Package `com.houseoftech.mittuai` (never changes after the first Play upload). Category: Entertainment. Contact: support@houseoftech.ai.

## What the app does
The user asks a question and picks a category (Love, Career, Paisa, Health, General). Mittu flies off his perch, picks one of the 22 Major Arcana cards (upright or reversed), flips it, and speaks a short Hinglish reading in a raised-pitch parrot voice, with word-by-word subtitles. For entertainment only.

## Core screens
Design: the HouseofTech 12-screen storyboard (2026-11-12). Every screen is deep navy with gold, gold dust and faint mandalas.
1. **Splash**: golden birdcage with Mittu, "Mittu AI", Get Started.  2. **Meet Mittu**: Mittu in a red pagdi on his perch, "Suno suno, aapka astrologer haazir hai!", then phone login.
- **Home** (3, 4): "Question & Categories" (coloured chips: Love, Career, Paisa, Health, General), the glowing "Mittu, card nikaalo!" button, "Let's Go!", readings left today, Skip-animation toggle.
- **Reading** (5-12), about 9 s and skippable: bansuri zoom → take-off → 7 cards in two rows → hover (cards glow) → pick → 3D flip with a gold swirl → Mittu lands on the rod: "Suno suno… Mittu ne nikaala hai … ka card!", voice + subtitles → parchment scroll with the reading, lucky colour and number, Ek aur card, Share Karo, Replay Voice, "Sirf manoranjan ke liye" and Report. Mute and close.
- **Profile**: name, plan, reading history, invoices, help, policy links, sign out. No cancel button, no delete button (both explained in the policies).
- Onboarding (fixed): OTP → Paywall → Name (required) → Home.

## Price plan
Razorpay Subscription with UPI Autopay: a small trial, then a monthly price. Placeholders until Ayush sets the plan: ₹1 for 3 days, then ₹99/month, plan name `mittuai_99`, 5 readings per day. All of these come from the backend `/config` and are never hard-coded in the app.

## Stack
Expo (React Native, plain StyleSheet) · FastAPI on Cloud Run `mittuai-api` (asia-south1, project `colorjoy-app`) · Firestore database `mittuai` · Gemini on Vertex AI (readings) · Cloud Text-to-Speech hi-IN (voice) · private Cloud Storage bucket `mittuai-voice` (signed URLs, 7-day lifecycle) · Secret Manager · EAS builds.

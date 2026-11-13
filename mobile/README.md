# Mittu AI app (mobile + web)

Expo SDK 58 (React Native 0.88) with Expo Router and plain `StyleSheet` (no Tamagui; it crashes on Android). The same
code builds the Android app and the web app (`web-hosting/`). The app only talks to `mittuai-api`; it holds no AI,
voice or payment secrets.

## Folders
```
src/
  app/                   Screens (Expo Router: every file is a route)
    _layout.tsx          Root: shows only the screens allowed for the user's step (GET /me → next): OTP → paywall → name → home
    index.tsx, meet.tsx  1 Splash (birdcage) and 2 Meet Mittu: open the app on every launch, signed in or not
    auth/                Phone, OTP
    letsgo.tsx           4 Let's Go: the question + glowing "Mittu, card nikaalo!" → reading
    paywall.tsx          Razorpay UPI Autopay; prices and daily limit from /config; access only via the webhook
    name.tsx             Required name (spoken by Mittu, printed on invoices)
    (tabs)/              home (3 Ask: Question & Categories), history, profile
    reading.tsx          Storyboard 5-12: bansuri zoom → fly → two-row spread → pick → flip + swirl → rod → voice → parchment
    invoices.tsx         GST invoices (HTML from the API → PDF on the phone)
  components/
    Mittu.tsx            Mittu (SVG layers + Reanimated): idle/fly/hover/pick/land/talk, optional pagdi. STAND-IN for the Rive file
    TarotCard.tsx        Card back, card face, 3D flip;  Scene.tsx: night sky, gold-dust StarField, perch, feathers, burst
    BackgroundMusic.tsx  Santoor loop on every screen (web: after the first tap); pauses in the background
    Art.tsx              Storyboard art: birdcage, bansuri zoom, gold swirl, landing rod, parchment scroll
    Report.tsx           Report sheet + "Sirf manoranjan ke liye" footer;  ui.tsx: Screen, Button, Row, Chips …
  api/                   client.ts (fetch + token), mittu.ts (typed API), auth.ts
  context/AuthContext.tsx  Token, /me, one-time Meta purchase event for a new subscription
  data/cardArt.js        Card art (original SVG, stand-in until the WebP art is on R2)
  lib/                   sound.ts (bundled SFX, background santoor music + ducking, voice player), voice(.native).ts (speak your question: expo-speech-recognition / browser speech, en-IN, text only), nav.ts, razorpay(.web).ts, meta(.native).ts, storage
  theme.ts               Night theme for every screen: navy #0B0B2B, gold #D4AF37, cream text; `scene` extras
  lib/svgIds.ts          Unique SVG gradient ids per instance (web shares one document; hidden copies broke gradients)
assets/images/           Icon set, splash, favicon;  assets/sounds/  squawk, chime, flap, shuffle, whoosh, ambient (tools/render-assets.mjs)
app.json, app.config.ts  Expo config (package com.houseoftech.mittuai, arm64-v8a + x86_64); Meta SDK only when META_APP_ID + META_CLIENT_TOKEN are set
eas.json                 preview (APK) and production (AAB), both point at the live API
```

## Run
```powershell
npm install
npx expo start --web                      # with the local backend (see the root README)
npx tsc --noEmit; npx expo lint; npx expo export --platform web   # checks before every hand-off (guide 12)
```

## Builds (EAS)
```powershell
npx --yes eas-cli@latest init             # once: creates the EAS project and writes projectId into app.json
npx --yes eas-cli@latest build --platform android --profile preview --non-interactive --no-wait     # test APK
npx --yes eas-cli@latest build --platform android --profile production                              # AAB for Play
```
Set `META_APP_ID` and `META_CLIENT_TOKEN` as EAS environment variables (preview + production) once Meta is set up.
New native modules (Rive, audio) need a new build; JS-only fixes can go out with EAS Update.

**Play AAB (since 2026-11-14): Google Cloud Build, not EAS** (`cloudbuild-release.yaml`, recipe from the team; keep every
tuning flag). One-time `tools/gcp/mittuai-build-setup.ps1` (keystore downloaded from EAS → gs://mittuai-builds, passwords
in Secret Manager `mittuai-store-pass` / `mittuai-key-pass`), then raise `android.versionCode` in app.json and run
`tools/gcp/mittuai-build-aab.ps1` (~20 min, ~a few rupees) → `builds/mittuai-<versionCode>.aab`. The AAB gets OTA updates
from the `production` channel (`updates.requestHeaders` in app.json): `eas update --channel production`. Preview APKs
still come from EAS (`eas build --profile preview`, free monthly quota).

# Mittu AI 🦜

A magical parrot astrologer, inspired by the Indian street *tota* fortune-teller. Mittu flies off his perch, picks a tarot card with his beak, flips it in 3D, lands on it, and reads your future aloud in a parrot voice with karaoke subtitles.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173  (also on your LAN for phone testing)
```

Production: `npm run build && npm start` (serves `dist/` and the API on port 4173).

## Keys (all optional)

Copy `.env.example` to `.env`. With no keys the app still works fully: it uses built-in Hinglish readings and the browser's speech voice.

| Variable | What it enables |
|---|---|
| `ANTHROPIC_API_KEY` | Claude writes a personal reading for the card, orientation, question and category (`claude-opus-5-5`; override with `MITTU_MODEL`). |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | Hinglish TTS **with word timestamps**, so subtitles stay exactly in sync. Pick a Hindi-capable voice. |
| `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` | Alternative TTS (`hi-IN-SwaraNeural` by default). Subtitle timing is estimated. |

Keys stay on the server (`server/api.js`); the browser only calls `/api/*`.

## How it's built

- **React + Tailwind v4 + Framer Motion.** The whole ~8.5 s sequence is a cancellable timeline in `src/App.jsx` (`cinematic()`), so **Skip** stops it instantly. `prefers-reduced-motion` and the "Animation skip karo" preference use a short fade version instead.
- **Mittu** (`src/components/Mittu.jsx`) is a layered SVG with states `idle / fly / hover / pick / talk`: breathing, head tilt, blinking, wing flaps, and a lower beak driven by audio amplitude.
- **Cards**: all 22 Major Arcana (`src/data/cards.js`) with EN + Hindi names, upright and reversed meanings, and gold line-art illustrations (`src/data/cardArt.js`). Reversed cards display upside down.
- **Voice chain** (`src/audio/voice.js`): TTS → AudioWorklet pitch shifter (+6 semitones total) → 1.1× playback → 250 Hz high-pass → nasal EQ → chorus + flutter → reverb → AnalyserNode for beak lip-sync. A "Kuurrr!" squawk plays first, and the voice says "Suno suno dhyaan se! Mittu ne card nikaala hai…".
- **Sound design** (`src/audio/synth.js`) is fully procedural, so there are no audio files: a seamless 32 s tanpura + santoor (raag Bhupali) + bansuri loop, plus whoosh, wing flaps, card riffle, chime, sparkle and squawk. It is all rendered in a Web Worker while the home screen loads. Music and SFX duck automatically while Mittu speaks.
- **Share karo** renders a 1080×1920 story PNG (`src/lib/share.js`) and uses the native share sheet where available, otherwise it downloads.

Sirf manoranjan ke liye 🦜

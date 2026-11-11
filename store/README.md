# Store and launch material

| File | What |
|---|---|
| `play-listing.md` | Play Store text: name, short and full description, release notes (no ₹ anywhere) |
| `play-console-guide.md` | Every Play Console answer: app access (reviewer login), content rating, data safety, blockers |
| `legal-drafts/` | The four policy pages for Ayush to publish at houseoftech-legal.web.app/mittuai/, with every point to confirm |
| `play-icon-512.png` | Play icon (Mittu's head), made by `tools/render-assets.mjs` |
| `voice-samples/` | Mittu's real Cloud TTS voice at pitch +6, rate 1.1, in 4 hi-IN voices. Pick the clearest by ear (guide 07) and set `TTS_VOICE` in `tools/gcp/mittuai-deploy.ps1` |

| `screenshots/0*.png` | 6 phone screenshots 1080 × 1920 of the real app (real readings and voice): home, Mittu picking, reveal, voice + subtitles, history, profile. Made by `tools/play-screenshots.py` (capture) + `tools/play-store-shots.py` (headlines) |
| `feature-graphic-1024x500.png` | Feature graphic from the app's own art, `tools/feature-graphic.mjs` |
| `test-reports/` | The guide's 10-reading test (`tools/ten-readings-test.py`), with findings |

Production AAB (versionCode 2, 2026-11-12): https://expo.dev/artifacts/eas/x4AzZ2_pg3ix9U6CL8MaWyQxpb94P_qT9SmaYq38Gjg.aab

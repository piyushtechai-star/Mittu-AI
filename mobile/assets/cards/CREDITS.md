# Card art credits

`00.webp` … `21.webp` (also copied to `backend/app/static/cards/` for the Share Story image) are the 22 Major Arcana of the
1909 Rider-Waite-Smith tarot, illustrated by Pamela Colman Smith. **Public domain.**

Source scans: Wikimedia Commons, `RWS_Tarot_00_Fool.jpg` … `RWS_Tarot_21_World.jpg`
(https://commons.wikimedia.org/wiki/File:RWS_Tarot_17_Star.jpg etc.), fetched 2026-11-17.

Processing (scripts kept outside the repo): straightened, cropped to the picture only (title box, Roman numeral strip,
keyline and margins removed; the app draws its own frame, numeral and English + Hindi titles), centre-cropped to 5:8
(640 x 1024), descreened, colour-graded for the night/gold UI (saturation 0.8, gold highlights, indigo shadows, soft
vignette), WebP q80.

## Modesty changes (user's guidelines, 2026-11-18: zero nudity, family-friendly, share-safe)
The 1909 originals of six cards show nudity, so they are replaced:
- **19 The Sun**: cropped to the great sun over the sunflowers and wall (child and horse left out).
- **20 Judgement**: cropped to the angel with trumpet and banner in the clouds (rising figures left out).
- **21 The World**: wreath and the four creatures kept; a gold lotus mandala (drawn in code) replaces the dancer.
- **15 The Devil**: INTERIM symbolic card drawn in code (inverted star, pedestal with loose chains, torch), until a
  clothed version is generated (Canva credits ran out; the first generated version had a bare-chested figure).
- **17 The Star, 06 The Lovers**: AI-restyled in Canva (image generation with the 1909 card as reference and the
  modesty guidelines as the prompt): the woman at the pool in a saree; the couple in a saree and kurta-dhoti under the
  winged angel. Cropped to the picture (Canva's border, numeral and title band removed), graded like the deck.
  Full-size originals: `store/card-art-src/` (git-ignored) and the Canva account (media MAHbNvQoy4c, MAHbNw5HOWk).
Same grade as the rest of the deck (scratchpad tools build.py `grade`, symbolic.py).

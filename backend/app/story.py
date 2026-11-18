"""Share Story (meeting brief 2026-11-17): a clean 9:16 (1080 x 1920) Instagram-ready image of a reading.

GET /v2/readings/{id}/story.png (signed in, own readings only) → PNG. Drawn with Pillow from the same card art the
app shows (static/cards, the 1909 Rider-Waite-Smith illustrations, public domain) and the app's fonts (Cinzel,
Poppins; SIL Open Font License, static/fonts). Hindi is written in Roman letters ("Taara"): Pillow here has no
Devanagari shaping. Contains the card, the card's message, Mittu's advice and the lucky colour/number; never the
user's question or name.
"""
from __future__ import annotations

import io
import random
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from .auth import CurrentUid
from .cards import CARDS
from .reading import _own_reading

router = APIRouter(tags=["reading"])
STATIC = Path(__file__).resolve().parent / "static"
W, H = 1080, 1920
GOLD, GOLD_SOFT, SAFFRON, CREAM = (212, 175, 55), (243, 220, 138), (255, 153, 51), (246, 238, 219)
ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
         "XVII", "XVIII", "XIX", "XX", "XXI"]


@lru_cache
def _font(name: str, size: int):
    from PIL import ImageFont
    return ImageFont.truetype(str(STATIC / "fonts" / name), size)


@lru_cache
def _background():
    """Indigo → midnight purple, gold dust, soft vignette (same look as the app)."""
    import numpy as np
    from PIL import Image
    y = np.linspace(0, 1, H)[:, None, None]
    top, bottom = np.array([9, 9, 36]), np.array([24, 14, 56])
    img = (top * (1 - y) + bottom * y) * np.ones((1, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.42) / (H * 0.7)) ** 2)
    img *= np.clip(1.15 - d * 0.55, 0.45, 1.1)[..., None]
    base = Image.fromarray(np.clip(img, 0, 255).astype("uint8"), "RGB")
    from PIL import ImageDraw
    draw = ImageDraw.Draw(base)
    rnd = random.Random(11)
    for _ in range(170):
        x, yv, r = rnd.uniform(0, W), rnd.uniform(0, H), rnd.uniform(0.8, 2.6)
        c = GOLD_SOFT if rnd.random() < 0.4 else (255, 246, 220)
        a = rnd.uniform(0.25, 0.8)
        draw.ellipse([x - r, yv - r, x + r, yv + r], fill=tuple(int(v * a + 20 * (1 - a)) for v in c))
    return base


def _wrap(draw, text: str, font, width: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _centered(draw, y: int, text: str, font, fill) -> int:
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=fill)
    return y + font.size + 10


def render(doc: dict) -> bytes:
    from PIL import Image, ImageDraw
    card_id, reversed_ = doc["card"], doc.get("orientation") == "reversed"
    _, en, hi_roman, _ = CARDS[card_id]
    img = _background().copy()
    draw = ImageDraw.Draw(img)

    y = _centered(draw, 88, "MITTU AI", _font("Cinzel_700Bold.ttf", 64), GOLD_SOFT)
    _centered(draw, y, "Mittu ne mere liye card nikaala!", _font("Poppins_400Regular.ttf", 34), CREAM)

    # the card in a gold frame
    cw, ch = 520, 832
    cx, cy = (W - cw) // 2, 240
    art = Image.open(STATIC / "cards" / f"{card_id:02d}.webp").convert("RGB").resize((cw - 40, ch - 150))
    if reversed_:
        art = art.rotate(180)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for k in range(18, 0, -1):
        gd.rounded_rectangle([cx - k * 2, cy - k * 2, cx + cw + k * 2, cy + ch + k * 2], radius=36 + k * 2,
                             outline=(212, 175, 55, int(5 + (18 - k) * 1.2)), width=4)
    img.paste(glow, (0, 0), glow)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=34, fill=(20, 13, 60), outline=(142, 106, 30), width=10)
    draw.rounded_rectangle([cx + 5, cy + 5, cx + cw - 5, cy + ch - 5], radius=30, outline=(233, 200, 102), width=3)
    img.paste(art, (cx + 20, cy + 76))
    draw.rectangle([cx + 20, cy + 76, cx + cw - 20, cy + 76 + art.height], outline=GOLD, width=3)
    rn = ROMAN[card_id]
    f_rn = _font("Cinzel_700Bold.ttf", 40)
    draw.text((cx + (cw - draw.textlength(rn, font=f_rn)) / 2, cy + 18), rn, font=f_rn, fill=GOLD_SOFT)
    f_name = _font("Cinzel_700Bold.ttf", 34)
    name = en.upper()
    draw.text((cx + (cw - draw.textlength(name, font=f_name)) / 2, cy + ch - 66), name, font=f_name, fill=GOLD_SOFT)

    y = cy + ch + 34
    title = f"{rn} • {en} — {hi_roman}" + ("  (Reversed)" if reversed_ else "")
    y = _centered(draw, y, title, _font("Cinzel_700Bold.ttf", 40), GOLD_SOFT) + 18

    # message + advice on a translucent panel
    f_head, f_body = _font("Cinzel_700Bold.ttf", 32), _font("Poppins_400Regular.ttf", 33)
    blocks = [("CARD KA SANDESH", doc.get("sandesh") or ""), ("MITTU KI SALAH", doc.get("salah") or "")]
    panel_top = y
    lines_total = sum(1 + len(_wrap(draw, t, f_body, W - 220)) for _, t in blocks if t)
    panel_h = 60 + lines_total * 50 + 30
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(overlay).rounded_rectangle([70, panel_top, W - 70, panel_top + panel_h], radius=32,
                                              fill=(255, 255, 255, 14), outline=(212, 175, 55, 90), width=2)
    img.paste(overlay, (0, 0), overlay)
    draw = ImageDraw.Draw(img)
    y = panel_top + 34
    for head, text in blocks:
        if not text:
            continue
        draw.text((110, y), head, font=f_head, fill=SAFFRON)
        y += 48
        for line in _wrap(draw, text, f_body, W - 220):
            draw.text((110, y), line, font=f_body, fill=CREAM)
            y += 46
        y += 14

    # lucky badges
    y = max(y + 30, panel_top + panel_h + 30)
    badges = [("Lucky Color", doc.get("luckyColor")), ("Lucky Number", doc.get("luckyNumber"))]
    badges = [(k, str(v)) for k, v in badges if v]
    if badges:
        bw, gap = 400, 30
        x0 = (W - (len(badges) * bw + (len(badges) - 1) * gap)) / 2
        for i, (label, value) in enumerate(badges):
            x = x0 + i * (bw + gap)
            draw.rounded_rectangle([x, y, x + bw, y + 120], radius=26, fill=(36, 24, 84), outline=GOLD, width=3)
            f_l, f_v = _font("Poppins_400Regular.ttf", 26), _font("Cinzel_700Bold.ttf", 38)
            draw.text((x + (bw - draw.textlength(label, font=f_l)) / 2, y + 14), label, font=f_l, fill=GOLD_SOFT)
            v = value if draw.textlength(value, font=f_v) < bw - 30 else value[:18]
            draw.text((x + (bw - draw.textlength(v, font=f_v)) / 2, y + 52), v, font=f_v, fill=CREAM)

    _centered(draw, H - 110, "Sirf manoranjan ke liye  ·  Mittu AI", _font("Poppins_600SemiBold.ttf", 30), GOLD_SOFT)
    out = io.BytesIO()
    img.save(out, "PNG", optimize=True)
    return out.getvalue()


@router.get("/v2/readings/{rid}/story.png")
def story(rid: str, uid: str = CurrentUid):
    doc = _own_reading(rid, uid)
    if not doc.get("text"):
        raise HTTPException(409, "Pehle Mittu ko card padhne dijiye.")
    return Response(render(doc), media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


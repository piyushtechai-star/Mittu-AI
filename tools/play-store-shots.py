"""Play Store assets from the real-app captures of tools/play-screenshots.py (store/screenshots/raw).
  store/screenshots/0N-*.png   phone screenshots 1080x1920: short headline on a soft parrot-green field, app screen below
  (the feature graphic is made by tools/feature-graphic.mjs from the app art)
Run with C:\\Users\\Piyush\\tools\\imgenv\\Scripts\\python.exe tools\\play-store-shots.py [frame overrides like reveal=19]
No ₹ prices anywhere (guide 14)."""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "store" / "screenshots" / "raw"
OUT = ROOT / "store" / "screenshots"
W, H = 1080, 1920
GREEN = (23, 132, 75)
INK = (18, 23, 20)
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT = r"C:\Windows\Fonts\segoeui.ttf"
SERIF_BOLD = r"C:\Windows\Fonts\georgiab.ttf"

frames = {"picking": 5, "reveal": 19, "speaking": 24}
for arg in sys.argv[1:]:
    k, v = arg.split("=")
    frames[k] = int(v)
SHOTS = [
    ("01-home", "01-home.png", "Ask Mittu anything", "Love, career, paisa, health or life"),
    ("02-picking", f"scene-{frames['picking']:03d}.png", "Mittu picks your card", "Seven cards, one beak, a little suspense"),
    ("03-reveal", f"scene-{frames['reveal']:03d}.png", "Your card, revealed", "All 22 Major Arcana, upright or reversed"),
    ("04-speaking", f"scene-{frames['speaking']:03d}.png", "Hear it in Mittu's voice", "With subtitles, word by word"),
    ("05-history", "05-history.png", "Your readings, saved", "Read or replay them any time"),
    ("06-profile", "06-profile.png", "Simple plan, clear invoices", "Small trial, then monthly. Cancel any time"),
]


def gradient(size, top, bottom):
    w, h = size
    im = Image.new("RGB", size)
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return im


def rounded(im, r):
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    return mask


def phone_shot(name, src, title, sub):
    bg = gradient((W, H), (238, 248, 242), (213, 238, 223))
    d = ImageDraw.Draw(bg)
    d.text((W // 2, 150), title, font=ImageFont.truetype(FONT_BOLD, 74), fill=INK, anchor="mm")
    d.text((W // 2, 235), sub, font=ImageFont.truetype(FONT, 40), fill=(80, 92, 86), anchor="mm")
    screen = Image.open(RAW / src).convert("RGB")
    sw = 800
    sh = round(screen.height * sw / screen.width)
    screen = screen.resize((sw, sh), Image.LANCZOS)
    x, y = (W - sw) // 2, 330
    shadow = Image.new("RGBA", (sw + 120, sh + 120), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([60, 70, sw + 60, sh + 60], 56, fill=(10, 60, 35, 90))
    bg.paste(shadow.filter(ImageFilter.GaussianBlur(28)), (x - 60, y - 60), shadow.filter(ImageFilter.GaussianBlur(28)))
    frame = Image.new("RGB", (sw + 24, sh + 24), (20, 24, 22))
    bg.paste(frame, (x - 12, y - 12), rounded(frame, 64))
    bg.paste(screen, (x, y), rounded(screen, 54))
    bg.save(OUT / f"{name}.png", optimize=True)
    print("saved", name)


for s in SHOTS:
    phone_shot(*s)

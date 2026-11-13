"""Play Store phone screenshots (raw 1080x1920) of the real app, with real readings and Mittu's real voice.

Needs: the backend running locally with real providers (backend/README.md "Local runs": AI_PROVIDER=vertex,
TTS_PROVIDER=gemini, STORE=memory, BILLING_MODE=fake, OTP_MODE=console) and `npx expo start --web --port 8081` in mobile/.
Drives headless Edge over the DevTools protocol at 360x640 @3x (same method as Naksh's screenshot tool).
The reading scene is captured as a burst of frames (raw/scene-*.png); pick the best ones with tools/play-store-shots.py.
Usage: backend\\.venv\\Scripts\\python tools\\play-screenshots.py
"""
import base64
import json
import subprocess
import time
from pathlib import Path

import httpx
from websockets.sync.client import connect

API = "http://localhost:8080"
WEB = "http://localhost:8081"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
PORT = 9334
OUT = Path(__file__).resolve().parent.parent / "store" / "screenshots" / "raw"
OUT.mkdir(parents=True, exist_ok=True)
PHONE = "9812300022"
QUESTION = "Kya is saal mujhe mera sachcha pyaar milega?"

# --- 1. a realistic account with two earlier readings for History ----------------------------
api = httpx.Client(base_url=API, timeout=180)
api.post("/auth/otp/request", json={"phone": PHONE})
token = api.post("/auth/otp/verify", json={"phone": PHONE, "code": "123456"}).json()["token"]
api.headers["Authorization"] = f"Bearer {token}"
if api.get("/me").json()["next"] == "paywall":
    api.post("/billing/subscription")
    api.post("/billing/test-complete")
api.post("/me/name", json={"name": "Ananya Sharma"})
if len(api.get("/readings").json()) < 2:
    for q, cat in (("Naye job ke liye interview hai, kaisa rahega?", "career"), ("", "general")):
        r = api.post("/reading", json={"question": q, "category": cat})
        print("history reading:", r.json().get("card", {}).get("name"))
    # Vertex allows 10 Gemini TTS requests a minute for the project; let it refill so the main reading gets Mittu's voice.
    time.sleep(65)

# --- 2. screenshots ----------------------------------------------------------------------------
profile_dir = Path(r"C:\Users\Piyush\tools\shots\mittu-cdpprof")
edge = subprocess.Popen([EDGE, "--headless=new", "--disable-gpu", "--autoplay-policy=no-user-gesture-required",
                         f"--remote-debugging-port={PORT}", f"--user-data-dir={profile_dir}", "--window-size=1200,1000",
                         "about:blank"])
seq = 0
try:
    for _ in range(40):
        try:
            page = next(p for p in httpx.get(f"http://127.0.0.1:{PORT}/json/list", timeout=2).json() if p["type"] == "page")
            break
        except Exception:
            time.sleep(0.5)
    ws = connect(page["webSocketDebuggerUrl"], max_size=80_000_000)

    def cdp(method, **params):
        global seq
        seq += 1
        ws.send(json.dumps({"id": seq, "method": method, "params": params}))
        while True:
            msg = json.loads(ws.recv())
            if msg.get("id") == seq:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

    def js(expr):
        return cdp("Runtime.evaluate", expression=expr, returnByValue=True).get("result", {}).get("value")

    def shot(name):
        (OUT / f"{name}.png").write_bytes(base64.b64decode(cdp("Page.captureScreenshot", format="png")["data"]))
        print("saved", name)

    def wait_for(text, timeout=60):
        t = time.time()
        while time.time() - t < timeout:
            if js(f"document.body && document.body.innerText.includes({json.dumps(text)})"):
                return
            time.sleep(0.5)
        raise RuntimeError(f"page never showed: {text}")

    def tap_text(text):
        """Taps the centre of the element whose own text is `text` (real touch events, as on a phone)."""
        box = js(f"""(() => {{ const el = [...document.querySelectorAll('div,span,button')].find(e =>
              e.childElementCount <= 2 && e.textContent.trim() === {json.dumps(text)});
              if (!el) return null; el.scrollIntoView({{ block: 'center' }}); const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }})()""")
        if not box:
            raise RuntimeError(f"not found: {text}")
        for kind in ("mousePressed", "mouseReleased"):
            cdp("Input.dispatchMouseEvent", type=kind, x=box[0], y=box[1], button="left", clickCount=1)

    cdp("Page.enable")
    cdp("Page.addScriptToEvaluateOnNewDocument", source="""
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = '*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}';
        document.head.appendChild(s);
      });""")
    cdp("Emulation.setDeviceMetricsOverride", width=360, height=640, deviceScaleFactor=3, mobile=True)
    cdp("Page.navigate", url=WEB + "/")
    time.sleep(6)
    js(f"localStorage.setItem('mittuai.token', {json.dumps(token)}); localStorage.setItem('mittuai.muted', '0'); localStorage.setItem('mittuai.skipAnim', '0')")

    # 1 Splash and 2 Meet Mittu (open the app on every launch)
    cdp("Page.navigate", url=WEB + "/")
    wait_for("Get Started")
    time.sleep(2)
    shot("00-splash")
    tap_text("Get Started")
    wait_for("Sawaal poochiye")
    time.sleep(2.5)
    shot("00-meet")
    tap_text("Sawaal poochiye")

    # 3 Ask, with a question typed and Love chosen
    wait_for("Question & Categories")
    time.sleep(2)
    js("document.querySelector('textarea').focus()")
    cdp("Input.insertText", text=QUESTION)
    tap_text("Love ❤️")
    js("document.activeElement && document.activeElement.blur()")
    time.sleep(1.5)
    shot("01-home")

    # 4 Let's Go, then the reading scene: a burst of frames from the bansuri zoom to Mittu speaking
    tap_text("Aage badhein")
    wait_for("Let's Go!")
    time.sleep(1.5)
    shot("01-letsgo")
    tap_text("Mittu, card nikaalo!")
    t0 = time.time()
    n = 0
    revealed_at = None
    while time.time() - t0 < 70:
        time.sleep(0.45)
        n += 1
        shot(f"scene-{n:03d}")
        if revealed_at is None and js("document.body.innerText.includes('Mittu ne nikaala hai')"):
            revealed_at = time.time()
        if revealed_at and time.time() - revealed_at > 9:
            break
    print(f"scene: {n} frames, revealed after {revealed_at - t0 if revealed_at else -1:.1f}s")
    # 12 the parchment result, once Mittu has finished speaking
    wait_for("Aapka result", 90)
    time.sleep(2)
    shot("04-result")

    for name, route, text in (("05-history", "/history", "Reading history"), ("06-profile", "/profile", "Invoices")):
        cdp("Page.navigate", url=WEB + route)
        wait_for(text)
        time.sleep(2.5)
        shot(name)
    ws.close()
finally:
    edge.terminate()
print("done ->", OUT)

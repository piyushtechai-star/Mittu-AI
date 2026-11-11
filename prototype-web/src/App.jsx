import { AnimatePresence, animate, motion, motionValue, useMotionValueEvent, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { engine, store } from './audio/engine.js'
import { getConfig, prepareVoice, speak, tokenize } from './audio/voice.js'
import { Feathers, SparkleBurst, Subtitles } from './components/Effects.jsx'
import { MittuSvg } from './components/Mittu.jsx'
import { Mandala, NightSky, Perch } from './components/Scenery.jsx'
import { Home, ResultSheet, ShareModal, TopBar } from './components/Screens.jsx'
import { FlipCard, SharedDefs } from './components/TarotCard.jsx'
import { drawCard } from './data/cards.js'
import { fetchReading, speechText } from './data/reading.js'

const FAN = 7
const CANCEL = Symbol('cancel')
const FEATHER_COLORS = ['#2ECC71', '#25B862', '#55DE8C', '#1FAE5E']

// ---------------------------------------------------------------- layout
function computeLayout(w, h) {
  const perchScale = Math.max(0.62, Math.min(1, (h - 380) / 460))
  const S = Math.round(Math.min(124, w * 0.3) * Math.max(0.7, perchScale)) // Mittu size
  const rodY = h - 145 * perchScale // top of the perch rod (Mittu's feet)
  const perch = { x: w / 2, y: rodY - 0.36 * S }
  const landScale = 0.8
  const cw = Math.round(Math.min(w * 0.48, 200, (h - 250) / 1.6))
  const ch = cw * 1.6
  const cardTop = Math.round(0.86 * landScale * S + 16)
  const final = { x: w / 2, y: cardTop + ch / 2 }
  const land = { x: w / 2 + cw * 0.3, y: cardTop - 0.36 * S * landScale + 3 }
  const subTop = cardTop + ch + 16
  const fanCw = Math.min(w * 0.19, 80)
  const fanScale = fanCw / cw
  const fanCh = fanCw * 1.6
  const R = w * 0.6
  const fanY = h * 0.44
  const fanSpread = 34
  const fan = Array.from({ length: FAN }, (_, i) => {
    const a = ((-fanSpread + ((fanSpread * 2) / (FAN - 1)) * i) * Math.PI) / 180
    return { x: w / 2 + R * Math.sin(a), y: fanY + R - R * Math.cos(a), rot: (a * 180) / Math.PI }
  })
  return { w, h, S, rodY, perchScale, perch, landScale, cw, ch, cardTop, final, land, subTop, sheetTop: subTop + 84, fanScale, fanCh, fan }
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return size
}

// A cancellable timeline: every animation is tracked so "Skip" can stop it instantly.
function createRun() {
  const anims = new Set()
  const timers = new Set()
  let cancelled = false
  let resolveCancel
  const cancelled$ = new Promise((r) => (resolveCancel = r))
  const check = () => {
    if (cancelled) throw CANCEL
  }
  return {
    get cancelled() {
      return cancelled
    },
    anim(mv, to, opts) {
      const a = animate(mv, to, opts)
      anims.add(a)
      Promise.resolve(a).then(() => anims.delete(a))
      return a
    },
    async wait(ms) {
      await Promise.race([new Promise((r) => timers.add(setTimeout(r, ms))), cancelled$])
      check()
    },
    async all(list) {
      await Promise.race([Promise.all(list), cancelled$])
      check()
    },
    cancel() {
      cancelled = true
      anims.forEach((a) => a.stop())
      timers.forEach(clearTimeout)
      resolveCancel()
    },
  }
}

const shuffled = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1])

// ---------------------------------------------------------------- Mittu on stage
function MittuActor({ mv, mode, size, trail }) {
  const sx = useSpring(mv.mx, { stiffness: 260, damping: 28 })
  const sy = useSpring(mv.my, { stiffness: 260, damping: 28 })
  const sx2 = useSpring(mv.mx, { stiffness: 140, damping: 24 })
  const sy2 = useSpring(mv.my, { stiffness: 140, damping: 24 })
  const o1 = useTransform(mv.trail, (t) => t * 0.22)
  const o2 = useTransform(mv.trail, (t) => t * 0.1)
  const base = { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }
  const ghost = (x, y, opacity, blur) => (
    <motion.div className="pointer-events-none absolute left-0 top-0" style={{ ...base, x, y, opacity, rotate: mv.mrot, scale: mv.mscale, zIndex: 29, filter: `blur(${blur}px)` }}>
      <motion.div style={{ scaleX: mv.face }}>
        <MittuSvg mode={mode} size={size} />
      </motion.div>
    </motion.div>
  )
  return (
    <>
      {trail && ghost(sx2, sy2, o2, 2.5)}
      {trail && ghost(sx, sy, o1, 1.2)}
      <motion.div
        className="pointer-events-none absolute left-0 top-0"
        style={{ ...base, x: mv.mx, y: mv.my, rotate: mv.mrot, scale: mv.mscale, opacity: mv.mop, zIndex: 30 }}
      >
        <div className={mode === 'hover' ? 'hover-bob' : ''}>
          <motion.div style={{ scaleX: mv.face }}>
            <MittuSvg mode={mode} beak={mv.beak} size={size} />
          </motion.div>
        </div>
      </motion.div>
    </>
  )
}

// ---------------------------------------------------------------- app
export default function App() {
  const reduced = useReducedMotion()
  const shellRef = useRef(null)
  const { w, h } = useSize(shellRef)
  const L = useMemo(() => (w && h ? computeLayout(w, h) : null), [w, h])

  const [screen, setScreen] = useState('home') // home | sequence | result
  const [mode, setMode] = useState('idle')
  const [form, setForm] = useState({ name: store.get('mittu.name', ''), question: '', category: 'general' })
  const [draw, setDraw] = useState(null)
  const [slot, setSlot] = useState(3)
  const [picked, setPicked] = useState(null)
  const [showCards, setShowCards] = useState(false)
  const [reading, setReading] = useState(null)
  const [words, setWords] = useState([])
  const [wordIdx, setWordIdx] = useState(-1)
  const [subsOn, setSubsOn] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [feathers, setFeathers] = useState([])
  const [burst, setBurst] = useState(0)
  const [muted, setMuted] = useState(engine.muted)
  const [musicOn, setMusicOn] = useState(engine.musicOn)
  const [skipPref, setSkipPrefState] = useState(store.get('mittu.skip', false))
  const [visits] = useState(() => store.get('mittu.visits', 0))
  const [shareBlob, setShareBlob] = useState(null)
  const [sharing, setSharing] = useState(false)

  const mv = useMemo(
    () => ({
      mx: motionValue(0),
      my: motionValue(0),
      mrot: motionValue(0),
      mscale: motionValue(1),
      mop: motionValue(1),
      face: motionValue(1),
      beak: motionValue(0),
      trail: motionValue(0),
      cam: motionValue(1),
      dim: motionValue(0),
      cards: Array.from({ length: FAN }, () => ({
        x: motionValue(0),
        y: motionValue(0),
        rotate: motionValue(0),
        scale: motionValue(0.3),
        opacity: motionValue(0),
        flip: motionValue(0),
      })),
    }),
    [],
  )

  const runRef = useRef(null)
  const busy = useRef(false)
  const voiceRef = useRef(null) // Promise<prepared voice>
  const speakCtl = useRef(null)
  const flapTimer = useRef(0)
  const faceLock = useRef(false)
  const faceTarget = useRef(1)
  const lastX = useRef(0)
  const session = useRef(0)
  const subsTimer = useRef(0)

  // ---- preload: sounds (worker), backend config, unlock audio on first touch
  useEffect(() => {
    engine.prerender()
    getConfig()
    const unlock = () => engine.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    const off = engine.subscribe(() => {
      setMuted(engine.muted)
      setMusicOn(engine.musicOn)
    })
    return () => {
      off()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // ---- Mittu faces the direction he flies
  useMotionValueEvent(mv.mx, 'change', (v) => {
    const d = v - lastX.current
    lastX.current = v
    if (faceLock.current || Math.abs(d) < 0.8) return
    const s = d < 0 ? -1 : 1
    if (s !== faceTarget.current) {
      faceTarget.current = s
      animate(mv.face, s, { duration: 0.18 })
    }
  })
  const setFace = (s, instant) => {
    faceTarget.current = s
    if (instant) mv.face.set(s)
    else animate(mv.face, s, { duration: 0.2 })
  }

  // ---- static placement for the current screen (and on resize)
  const applyFinal = useCallback(() => {
    if (!L) return
    mv.cards.forEach((k, i) => {
      if (i === slot) {
        k.x.set(L.final.x)
        k.y.set(L.final.y)
        k.rotate.set(0)
        k.scale.set(1)
        k.opacity.set(1)
        k.flip.set(180)
      } else k.opacity.set(0)
    })
    mv.mx.set(L.land.x)
    mv.my.set(L.land.y)
    lastX.current = L.land.x
    mv.mrot.set(0)
    mv.mscale.set(L.landScale)
    mv.mop.set(1)
    mv.trail.set(0)
    mv.cam.set(1)
    mv.dim.set(0.65)
    faceLock.current = true
    setFace(-1, true)
  }, [L, mv, slot])

  useEffect(() => {
    if (!L || busy.current) return
    if (screen === 'home') {
      mv.mx.set(L.perch.x)
      mv.my.set(L.perch.y)
      lastX.current = L.perch.x
      mv.mscale.set(1)
      mv.mrot.set(0)
    } else if (screen === 'result') applyFinal()
  }, [L, screen, applyFinal, mv])

  // ---- sfx helpers
  const startFlaps = (every) => {
    clearInterval(flapTimer.current)
    flapTimer.current = setInterval(() => {
      const pan = L ? Math.max(-0.8, Math.min(0.8, (mv.mx.get() / L.w - 0.5) * 1.6)) : 0
      engine.play('flap', { gain: 0.42, rate: 0.9 + Math.random() * 0.25, pan })
    }, every)
  }
  const stopFlaps = () => clearInterval(flapTimer.current)

  const spawnFeather = () => {
    const id = Math.random().toString(36).slice(2)
    setFeathers((f) => [
      ...f,
      {
        id,
        x: mv.mx.get() - 7,
        y: mv.my.get() + 10,
        rot: Math.random() * 80 - 40,
        dir: Math.random() < 0.5 ? -1 : 1,
        color: FEATHER_COLORS[Math.floor(Math.random() * FEATHER_COLORS.length)],
      },
    ])
    setTimeout(() => setFeathers((f) => f.filter((x) => x.id !== id)), 3400)
  }

  // ---- THE CINEMATIC (~8.5 s)
  async function cinematic(run, chosen) {
    const { w: W, h: H, S, fan, fanScale, fanCh, final, land } = L
    const c = mv.cards
    c.forEach((k) => {
      k.x.set(W / 2)
      k.y.set(H * 0.45)
      k.rotate.set(0)
      k.scale.set(fanScale * 0.6)
      k.opacity.set(0)
      k.flip.set(0)
    })
    faceLock.current = false

    // 1) 0–0.9s: dim + slow camera push-in + whoosh
    engine.play('whoosh', { gain: 0.8 })
    run.anim(mv.dim, 1, { duration: 1 })
    run.anim(mv.cam, 1.06, { duration: 2.2, ease: [0.33, 0, 0.2, 1] })
    await run.wait(850)

    // 2) 0.9–2.5s: Mittu takes off in a sweeping arc
    setMode('fly')
    run.anim(mv.trail, 1, { duration: 0.3 })
    startFlaps(165)
    engine.play('flap', { gain: 0.7, rate: 0.8 })
    const from = { x: mv.mx.get(), y: mv.my.get() }
    const flight = { duration: 1.6, ease: 'easeInOut', times: [0, 0.18, 0.38, 0.6, 0.82, 1] }
    run.anim(mv.mx, [from.x, W * 0.74, W * 0.88, W * 0.6, W * 0.22, W * 0.5], flight)
    run.anim(mv.my, [from.y, from.y - H * 0.22, H * 0.3, H * 0.1, H * 0.15, H * 0.2], flight)
    run.anim(mv.mrot, [0, -18, -8, 6, 10, 0], flight)
    run.anim(mv.mscale, [1, 1.06, 1.12, 1, 0.95, 1], flight)
    ;[250, 650, 1100].forEach((t) => setTimeout(() => !run.cancelled && spawnFeather(), t))
    await run.wait(1600)

    // 3) 2.5–4s: seven cards fan out in a golden semicircle
    setMode('hover')
    startFlaps(240)
    engine.play('shuffle', { gain: 0.9 })
    fan.forEach((p, i) => {
      const delay = i * 0.07
      run.anim(c[i].opacity, 1, { duration: 0.3, delay })
      const spring = { type: 'spring', stiffness: 120, damping: 16, delay }
      run.anim(c[i].x, p.x, spring)
      run.anim(c[i].y, p.y, spring)
      run.anim(c[i].rotate, p.rot, spring)
      run.anim(c[i].scale, fanScale, spring)
    })
    await run.wait(1450)
    run.anim(mv.cam, 1, { duration: 2.6, ease: 'easeInOut' })

    // 4) 4–5s: suspense — hover over two decoys, then dive on the chosen one
    const flyTo = (x, y, d = 0.38) =>
      run.all([run.anim(mv.mx, x, { duration: d, ease: [0.4, 0, 0.2, 1] }), run.anim(mv.my, y, { duration: d, ease: [0.4, 0, 0.2, 1] })])
    const decoys = shuffled([...Array(FAN).keys()].filter((i) => i !== chosen)).slice(0, 2)
    for (const i of decoys) {
      setMode('fly')
      await flyTo(fan[i].x, fan[i].y - fanCh * 0.95)
      setMode('hover')
      engine.play('tick', { gain: 0.45, rate: 0.85 + Math.random() * 0.3 })
      run.anim(c[i].y, [fan[i].y, fan[i].y - 10, fan[i].y], { duration: 0.45 })
      await run.wait(200)
    }
    const pc = fan[chosen]
    setMode('fly')
    await flyTo(pc.x, pc.y - fanCh * 1.05, 0.36)
    setMode('hover')
    await run.wait(240)
    setPicked(chosen)
    const rad = (pc.rot * Math.PI) / 180
    const top = { x: pc.x + Math.sin(rad) * (fanCh / 2), y: pc.y - Math.cos(rad) * (fanCh / 2) }
    const f = faceTarget.current
    setMode('pick')
    faceLock.current = true
    await flyTo(top.x - 0.32 * S * f, top.y - 0.05 * S, 0.26)
    engine.play('tick', { gain: 0.6, rate: 1.3 })
    await run.wait(160)

    // 5) 5–6.5s: carry the card to centre stage, the rest fade away
    setMode('fly')
    const center = { x: W / 2, y: H * 0.42 }
    const dir = center.x - pc.x < -10 ? -1 : center.x - pc.x > 10 ? 1 : f
    setFace(dir)
    const carryScale = fanScale * 1.25
    const carryH = L.ch * carryScale
    const k = c[chosen]
    const attach = () => {
      k.x.set(mv.mx.get() + 0.34 * S * faceTarget.current)
      k.y.set(mv.my.get() - 0.06 * S + carryH / 2)
    }
    const un1 = mv.mx.on('change', attach)
    const un2 = mv.my.on('change', attach)
    c.forEach((o, i) => {
      if (i === chosen) return
      run.anim(o.opacity, 0, { duration: 0.5 })
      run.anim(o.scale, fanScale * 0.85, { duration: 0.5 })
      run.anim(o.y, fan[i].y + 40, { duration: 0.5 })
    })
    run.anim(k.scale, carryScale, { duration: 0.8 })
    run.anim(k.rotate, [pc.rot, -pc.rot * 0.5 - 6, 5, 0], { duration: 0.8, ease: 'easeInOut' })
    try {
      await flyTo(center.x - 0.34 * S * dir, center.y - carryH / 2 + 0.06 * S, 0.8)
    } finally {
      un1()
      un2()
    }

    // drop: Mittu lets go, card floats up and flips with a burst of sparkles
    faceLock.current = false
    engine.play('whoosh', { gain: 0.35, rate: 1.5 })
    flyTo(W * 0.84, H * 0.16, 0.6).catch(() => {})
    await run.all([run.anim(k.y, k.y.get() + 14, { duration: 0.16, ease: 'easeIn' })])
    const lift = { duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }
    await run.all([
      run.anim(k.x, final.x, lift),
      run.anim(k.y, final.y, lift),
      run.anim(k.scale, 1, lift),
      run.anim(k.rotate, 0, lift),
    ])
    run.anim(k.flip, 180, { duration: 0.9, ease: [0.45, 0, 0.2, 1] })
    await run.wait(430)
    setBurst(Date.now())
    engine.play('chime', { gain: 0.9 })
    engine.play('sparkle', { gain: 0.6, delay: 0.12 })
    run.anim(mv.dim, 0.65, { duration: 1 })
    await run.wait(470)

    // 6) 6.5s+: Mittu lands on the card
    setMode('fly')
    await run.all([
      run.anim(mv.mx, land.x, { duration: 0.7, ease: [0.3, 0.7, 0.3, 1] }),
      run.anim(mv.my, [mv.my.get(), land.y - 30, land.y], { duration: 0.7, ease: 'easeOut' }),
      run.anim(mv.mscale, L.landScale, { duration: 0.7 }),
    ])
    faceLock.current = true
    setFace(-1)
    stopFlaps()
    run.anim(mv.trail, 0, { duration: 0.3 })
    setMode('idle')
    engine.play('flap', { gain: 0.35, rate: 0.75 })
    await run.wait(250)
  }

  // Short, motion-light version for prefers-reduced-motion / "skip" preference.
  async function gentle(run, chosen) {
    engine.play('chime', { gain: 0.8 })
    run.anim(mv.dim, 0.65, { duration: 0.6 })
    await run.all([run.anim(mv.mop, 0, { duration: 0.35 })])
    applyFinal()
    const k = mv.cards[chosen]
    k.opacity.set(0)
    mv.mop.set(0)
    await run.all([run.anim(k.opacity, 1, { duration: 0.6 }), run.anim(mv.mop, 1, { duration: 0.6, delay: 0.2 })])
  }

  // ---- voice
  const stopVoice = () => {
    speakCtl.current?.stop()
    speakCtl.current = null
  }
  const doSpeak = (prepared) => {
    stopVoice()
    clearTimeout(subsTimer.current)
    setSubsOn(true)
    setWordIdx(-1)
    setSpeaking(true)
    setMode('talk')
    speakCtl.current = speak(prepared, {
      onWord: setWordIdx,
      onLevel: (v) => mv.beak.set(v),
      onEnd: () => {
        speakCtl.current = null
        setSpeaking(false)
        setMode('idle')
        mv.beak.set(0)
        subsTimer.current = setTimeout(() => setSubsOn(false), 2500)
      },
    })
  }

  // ---- flow
  async function start() {
    if (screen !== 'home' || !L) return
    const unlocked = engine.unlock()
    const my = ++session.current
    const d = drawCard()
    const chosen = Math.floor(Math.random() * FAN)
    store.set('mittu.name', form.name)
    store.set('mittu.visits', visits + 1)
    stopVoice()
    setDraw(d)
    setSlot(chosen)
    setPicked(null)
    setReading(null)
    setWords([])
    setWordIdx(-1)
    setShowCards(true)
    setScreen('sequence')
    busy.current = true

    voiceRef.current = fetchReading({ ...d, ...form }).then(async (r) => {
      if (session.current !== my) return null
      setReading(r)
      const text = speechText(r, d)
      setWords(tokenize(text))
      await unlocked
      return prepareVoice(text)
    })

    const run = (runRef.current = createRun())
    try {
      await new Promise((r) => requestAnimationFrame(r)) // let the cards mount
      if (reduced || skipPref) await gentle(run, chosen)
      else await cinematic(run, chosen)
    } catch (e) {
      if (e !== CANCEL) console.error(e)
    }
    if (session.current !== my) return
    runRef.current = null
    busy.current = false
    setScreen('result')
    setSubsOn(true)
    const prepared = await voiceRef.current
    if (prepared && session.current === my) doSpeak(prepared)
  }

  function skip() {
    const run = runRef.current
    if (!run) return
    run.cancel()
    stopFlaps()
    setFeathers([])
    setMode('idle')
    applyFinal()
    setBurst(Date.now())
    engine.play('chime', { gain: 0.7 })
  }

  async function again() {
    session.current++
    stopVoice()
    clearTimeout(subsTimer.current)
    setSubsOn(false)
    setScreen('home')
    setForm((f) => ({ ...f, question: '' }))
    busy.current = true
    faceLock.current = false
    mv.cards.forEach((k) => animate(k.opacity, 0, { duration: 0.4 }))
    animate(mv.dim, 0, { duration: 1 })
    if (L && !reduced) {
      setMode('fly')
      startFlaps(180)
      const opts = { duration: 1.1, ease: [0.4, 0, 0.2, 1] }
      await Promise.all([
        animate(mv.mx, L.perch.x, opts),
        animate(mv.my, [mv.my.get(), mv.my.get() - 40, L.perch.y], opts),
        animate(mv.mscale, 1, opts),
      ])
      stopFlaps()
    }
    setFace(1, reduced)
    setMode('idle')
    setShowCards(false)
    busy.current = false
    if (L) {
      mv.mx.set(L.perch.x)
      mv.my.set(L.perch.y)
      mv.mscale.set(1)
    }
  }

  async function share() {
    if (!draw || !reading || sharing) return
    setSharing(true)
    try {
      const { renderShareImage } = await import('./lib/share.js')
      setShareBlob(await renderShareImage({ ...draw, reading }))
    } catch (e) {
      console.error('Share image failed', e)
    } finally {
      setSharing(false)
    }
  }

  async function replay() {
    if (speaking) return stopVoice()
    const prepared = await voiceRef.current
    if (prepared) doSpeak(prepared)
  }

  const setSkipPref = (v) => {
    setSkipPrefState(v)
    store.set('mittu.skip', v)
  }

  const dimOpacity = mv.dim
  const perchOpacity = useTransform(mv.dim, [0, 1], [1, 0.25])

  return (
    <>
      <SharedDefs />
      <NightSky reduced={reduced} />
      <div ref={shellRef} className="relative mx-auto h-dvh w-full max-w-[480px] overflow-clip select-none">
        {L && (
          <motion.div className="absolute inset-0" style={{ scale: mv.cam, originY: 0.45 }}>
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: dimOpacity,
                background: `radial-gradient(ellipse 60% 42% at 50% ${((L.final.y / L.h) * 100).toFixed(0)}%, rgba(4,3,20,0.15), rgba(4,3,20,0.72))`,
              }}
            />
            <Mandala x={L.final.x} y={L.final.y} size={L.w * 1.55} />
            <motion.div className="absolute inset-0" style={{ opacity: perchOpacity }}>
              <Perch x={L.perch.x} y={L.rodY} scale={L.perchScale} />
            </motion.div>

            {screen === 'result' && (
              <div
                className="card-aura pointer-events-none absolute rounded-[28px]"
                style={{
                  left: L.final.x - L.cw / 2 - 18,
                  top: L.final.y - L.ch / 2 - 18,
                  width: L.cw + 36,
                  height: L.ch + 36,
                  background: 'radial-gradient(ellipse, rgba(255,190,90,0.45), rgba(212,175,55,0) 70%)',
                  zIndex: 5,
                }}
              />
            )}

            {showCards &&
              mv.cards.map((k, i) => (
                <motion.div
                  key={i}
                  className="pointer-events-none absolute left-0 top-0"
                  style={{
                    x: k.x,
                    y: k.y,
                    rotate: k.rotate,
                    scale: k.scale,
                    opacity: k.opacity,
                    marginLeft: -L.cw / 2,
                    marginTop: -L.ch / 2,
                    zIndex: picked === i || (screen === 'result' && i === slot) ? 22 : 10,
                  }}
                >
                  <FlipCard card={i === slot ? draw?.card : null} reversed={draw?.reversed} width={L.cw} flip={k.flip} />
                </motion.div>
              ))}

            <Feathers feathers={feathers} />
            <MittuActor mv={mv} mode={mode} size={L.S} trail={mode === 'fly' || mode === 'hover' || mode === 'pick'} />
            <SparkleBurst id={burst} x={L.final.x} y={L.final.y} radius={L.cw * 0.9} />
          </motion.div>
        )}

        <div className="vignette pointer-events-none absolute inset-0 z-40" />

        {L && (
          <Subtitles
            words={words}
            current={wordIdx}
            visible={screen === 'result' && subsOn}
            top={L.subTop}
            thinking={!speaking && wordIdx < 0}
          />
        )}

        <AnimatePresence>
          {screen === 'home' && L && (
            <Home
              form={form}
              setForm={setForm}
              onStart={start}
              bottomPad={L.h - (L.perch.y - L.S / 2) + 12}
              showSkipPref={visits > 0 && !reduced}
              skipPref={skipPref}
              setSkipPref={setSkipPref}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {screen === 'result' && draw && L && (
            <ResultSheet
              draw={draw}
              reading={reading}
              spacer={L.sheetTop}
              onAgain={again}
              onShare={share}
              onReplay={replay}
              speaking={speaking}
              sharing={sharing}
            />
          )}
        </AnimatePresence>

        <TopBar
          muted={muted}
          musicOn={musicOn}
          onMute={() => engine.setMuted(!engine.muted)}
          onMusic={() => {
            engine.unlock()
            engine.setMusic(!engine.musicOn)
          }}
          showSkip={screen === 'sequence' && !reduced && !skipPref}
          onSkip={skip}
          showBrand={screen !== 'home'}
        />
      </div>
      {draw && <ShareModal blob={shareBlob} card={draw.card} onClose={() => setShareBlob(null)} />}
    </>
  )
}

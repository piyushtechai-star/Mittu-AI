// Mittu's voice: TTS audio -> parrot-ifying Web Audio chain, with word timings
// for karaoke subtitles and an amplitude envelope for beak lip-sync.
import { engine } from './engine.js'

const PLAYBACK_RATE = 1.1
const TOTAL_SEMITONES = 6 // overall pitch lift (playback rate contributes ~1.65 st of it)

// ---------------------------------------------------------------- words & timing
export function tokenize(text) {
  const words = []
  const re = /\S+/g
  let m
  while ((m = re.exec(text))) words.push({ text: m[0], index: m.index })
  return words
}

function weight(w) {
  let x = w.replace(/[^\p{L}\p{N}]/gu, '').length + 2
  if (/[.!?…]$/.test(w)) x += 6
  else if (/[,;:—-]$/.test(w)) x += 3
  return x
}

// Distribute words over a duration proportionally to their length (+ pauses at punctuation).
function estimateTimes(words, duration, offset = 0) {
  const ws = words.map((w) => weight(w.text))
  const total = ws.reduce((a, b) => a + b, 0) || 1
  let acc = 0
  return words.map((w, i) => {
    const start = offset + (acc / total) * duration
    acc += ws[i]
    return { ...w, start, end: offset + (acc / total) * duration }
  })
}

function timesFromAlignment(words, alignment, rate) {
  const starts = alignment.character_start_times_seconds
  const ends = alignment.character_end_times_seconds
  const chars = alignment.characters
  if (!starts?.length || chars.join('').length < 1) return null
  // Map our text char offsets onto alignment chars (they normally match 1:1).
  return words.map((w) => {
    const a = Math.min(w.index, starts.length - 1)
    const b = Math.min(w.index + w.text.length - 1, ends.length - 1)
    return { ...w, start: starts[a] / rate, end: ends[b] / rate }
  })
}

// ---------------------------------------------------------------- preparation
let configPromise
export function getConfig() {
  configPromise ||= fetch('/api/config')
    .then((r) => (r.ok ? r.json() : { ai: false, tts: null }))
    .catch(() => ({ ai: false, tts: null }))
  return configPromise
}

function b64ToArrayBuffer(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// Returns a "prepared voice" that speak() can play (and replay) instantly.
export async function prepareVoice(text) {
  const words = tokenize(text)
  const cfg = await getConfig()
  if (cfg.tts && engine.ctx) {
    try {
      const r = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(20000),
      })
      if (r.ok) {
        const j = await r.json()
        const buffer = await engine.ctx.decodeAudioData(b64ToArrayBuffer(j.audio))
        const rate = engine.workletReady ? PLAYBACK_RATE : PLAYBACK_RATE * 1.12
        const timed =
          (j.alignment && timesFromAlignment(words, j.alignment, rate)) ||
          estimateTimes(words, buffer.duration / rate)
        return { kind: 'audio', text, words: timed, buffer, rate }
      }
    } catch (e) {
      console.warn('TTS failed, using browser voice', e)
    }
  }
  return { kind: 'browser', text, words }
}

// ---------------------------------------------------------------- the parrot chain
function buildChain(ctx, input) {
  const nodes = []
  const add = (n) => (nodes.push(n), n)
  let head = input

  if (engine.workletReady) {
    const shifter = add(new AudioWorkletNode(ctx, 'pitch-shifter', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }))
    shifter.parameters.get('ratio').value = Math.pow(2, TOTAL_SEMITONES / 12) / PLAYBACK_RATE
    head.connect(shifter)
    head = shifter
  }

  const hp = add(ctx.createBiquadFilter())
  hp.type = 'highpass'
  hp.frequency.value = 250
  hp.Q.value = 0.7
  const nasal = add(ctx.createBiquadFilter()) // a little honk around 1.8 kHz
  nasal.type = 'peaking'
  nasal.frequency.value = 1800
  nasal.Q.value = 1.4
  nasal.gain.value = 5
  const air = add(ctx.createBiquadFilter())
  air.type = 'highshelf'
  air.frequency.value = 5000
  air.gain.value = -3
  head.connect(hp).connect(nasal).connect(air)

  // chorus: a short modulated delay mixed under the dry voice
  const sum = add(ctx.createGain())
  const dry = add(ctx.createGain())
  dry.gain.value = 0.82
  const chorus = add(ctx.createDelay(0.05))
  chorus.delayTime.value = 0.011
  const chorusLfo = add(ctx.createOscillator())
  chorusLfo.frequency.value = 4.3
  const chorusDepth = add(ctx.createGain())
  chorusDepth.gain.value = 0.0022
  chorusLfo.connect(chorusDepth).connect(chorus.delayTime)
  const wet = add(ctx.createGain())
  wet.gain.value = 0.32
  air.connect(dry).connect(sum)
  air.connect(chorus).connect(wet).connect(sum)

  // flutter: a very light fast tremolo for a birdy texture
  const flutter = add(ctx.createGain())
  flutter.gain.value = 1
  const flutterLfo = add(ctx.createOscillator())
  flutterLfo.frequency.value = 11
  const flutterDepth = add(ctx.createGain())
  flutterDepth.gain.value = 0.06
  flutterLfo.connect(flutterDepth).connect(flutter.gain)
  sum.connect(flutter)

  const out = add(ctx.createGain())
  out.gain.value = 1.15
  flutter.connect(out)
  const revSend = add(ctx.createGain())
  revSend.gain.value = 0.22
  out.connect(engine.voice)
  out.connect(revSend).connect(engine.reverb)

  const analyser = add(ctx.createAnalyser())
  analyser.fftSize = 1024
  out.connect(analyser)

  chorusLfo.start()
  flutterLfo.start()
  return {
    analyser,
    dispose() {
      chorusLfo.stop()
      flutterLfo.stop()
      nodes.forEach((n) => n.disconnect())
    },
  }
}

// ---------------------------------------------------------------- speak
// callbacks: onWord(index), onLevel(0..1), onEnd()
export function speak(prepared, { onWord, onLevel, onEnd, squawk = true } = {}) {
  let stopped = false
  let raf = 0
  const timers = []
  const cleanups = []
  const finish = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    timers.forEach(clearTimeout)
    cleanups.forEach((fn) => fn())
    engine.duck(false)
    onLevel?.(0)
    onEnd?.()
  }

  engine.duck(true)
  const lead = squawk ? 0.85 : 0.1
  if (squawk) engine.play('squawk', { gain: 0.9 })

  // squawk beak flaps
  const squawkStart = performance.now()
  const squawkLoop = () => {
    const t = (performance.now() - squawkStart) / 1000
    if (t < 0.7 && squawk) onLevel?.(t < 0.08 ? 1 : 0.35 + 0.5 * Math.abs(Math.sin(t * 27 * Math.PI)))
    else onLevel?.(0)
    if (t < lead) raf = requestAnimationFrame(squawkLoop)
  }
  raf = requestAnimationFrame(squawkLoop)

  if (prepared.kind === 'audio' && engine.ctx) {
    const ctx = engine.ctx
    const src = ctx.createBufferSource()
    src.buffer = prepared.buffer
    src.playbackRate.value = prepared.rate
    const chain = buildChain(ctx, src)
    const startAt = ctx.currentTime + lead
    src.start(startAt)
    src.onended = finish
    cleanups.push(() => {
      try {
        src.onended = null
        src.stop()
      } catch {
        /* already stopped */
      }
      setTimeout(() => chain.dispose(), 50)
    })
    const data = new Float32Array(chain.analyser.fftSize)
    let level = 0
    let word = -1
    const loop = () => {
      if (stopped) return
      const t = ctx.currentTime - startAt
      if (t >= 0) {
        chain.analyser.getFloatTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
        const rms = Math.sqrt(sum / data.length)
        const target = Math.min(1, Math.max(0, (rms - 0.012) * 7))
        level += (target - level) * (target > level ? 0.6 : 0.3)
        onLevel?.(level)
        let w = word
        while (w + 1 < prepared.words.length && prepared.words[w + 1].start <= t + 0.03) w++
        if (w !== word) onWord?.((word = w))
      }
      raf = requestAnimationFrame(loop)
    }
    timers.push(setTimeout(() => (raf = requestAnimationFrame(loop)), lead * 1000 - 20))
    return { stop: finish }
  }

  // ---- browser speechSynthesis fallback (or silent karaoke when muted / unsupported)
  const synth = window.speechSynthesis
  const useSynth = synth && !engine.muted
  const words = prepared.words
  const sentences = splitSentences(prepared.text)
  let globalWord = -1
  const setWord = (w) => {
    if (w > globalWord) onWord?.((globalWord = w))
  }

  const run = () => {
    if (stopped) return
    if (!useSynth) {
      const timed = estimateTimes(words, words.length * 0.36)
      const t0 = performance.now()
      const loop = () => {
        if (stopped) return
        const t = (performance.now() - t0) / 1000
        let w = globalWord
        while (w + 1 < timed.length && timed[w + 1].start <= t) w++
        setWord(w)
        const cur = timed[Math.max(0, w)]
        const inWord = cur && t < cur.end - 0.04
        onLevel?.(inWord ? 0.25 + 0.6 * Math.abs(Math.sin((t - cur.start) * 9)) : 0.05)
        if (t > (timed.at(-1)?.end ?? 0) + 0.2) return finish()
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      return
    }

    const voice = pickVoice(synth)
    let si = 0
    let sentenceStart = 0
    let sentenceTimes = []
    let lastBoundary = 0
    const next = () => {
      if (stopped) return
      if (si >= sentences.length) return finish()
      const s = sentences[si++]
      const u = new SpeechSynthesisUtterance(s.text)
      if (voice) u.voice = voice
      u.lang = voice?.lang || 'hi-IN'
      u.pitch = 1.9
      u.rate = 1.12
      u.onstart = () => {
        sentenceStart = performance.now()
        sentenceTimes = estimateTimes(s.words, s.words.length * 0.34)
      }
      u.onboundary = (e) => {
        if (e.name && e.name !== 'word') return
        lastBoundary = performance.now()
        const k = s.words.findIndex((w) => w.index - s.offset >= e.charIndex - 1)
        if (k >= 0) setWord(s.firstWord + k)
      }
      u.onend = next
      u.onerror = next
      synth.speak(u)
    }
    const loop = () => {
      if (stopped) return
      const t = (performance.now() - sentenceStart) / 1000
      // without boundary events, advance words by estimate
      if (sentenceTimes.length && performance.now() - lastBoundary > 900) {
        let k = -1
        while (k + 1 < sentenceTimes.length && sentenceTimes[k + 1].start <= t) k++
        if (k >= 0 && si > 0) setWord(sentences[si - 1].firstWord + k)
      }
      onLevel?.(synth.speaking ? 0.3 + 0.55 * Math.abs(Math.sin(t * 9.5)) * (0.6 + 0.4 * Math.sin(t * 2.3)) : 0)
      raf = requestAnimationFrame(loop)
    }
    synth.cancel()
    next()
    raf = requestAnimationFrame(loop)
    cleanups.push(() => synth.cancel())
  }
  timers.push(setTimeout(run, lead * 1000))
  return { stop: finish }
}

function splitSentences(text) {
  const all = tokenize(text)
  const out = []
  let cur = []
  all.forEach((w, i) => {
    cur.push({ ...w, gi: i })
    if (/[.!?…]$/.test(w.text) || i === all.length - 1) {
      const offset = cur[0].index
      const end = cur.at(-1).index + cur.at(-1).text.length
      out.push({ text: text.slice(offset, end), words: cur, offset, firstWord: cur[0].gi })
      cur = []
    }
  })
  return out
}

let cachedVoice
function pickVoice(synth) {
  if (cachedVoice !== undefined) return cachedVoice
  const voices = synth.getVoices()
  cachedVoice =
    voices.find((v) => /hi[-_]IN/i.test(v.lang) && /google/i.test(v.name)) ||
    voices.find((v) => /hi[-_]IN/i.test(v.lang)) ||
    voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
    null
  if (!voices.length) cachedVoice = undefined
  return cachedVoice ?? null
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => (cachedVoice = undefined)
}

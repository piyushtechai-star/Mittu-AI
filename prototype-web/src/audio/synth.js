// Procedural sound design. Pure DSP into Float32Arrays so it can run in a worker
// and be cached as AudioBuffers. Every function returns { channels: Float32Array[], sampleRate }.

export const SR = 44100

// Deterministic PRNG so the ambient loop sounds the same every visit.
function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// RBJ biquad, coefficients can be updated per sample.
class Biquad {
  constructor() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0
  }
  set(type, freq, q, sr = SR) {
    const w = (2 * Math.PI * Math.min(freq, sr * 0.45)) / sr
    const cs = Math.cos(w)
    const al = Math.sin(w) / (2 * q)
    let b0, b1, b2
    if (type === 'lp') {
      b0 = (1 - cs) / 2
      b1 = 1 - cs
      b2 = b0
    } else if (type === 'hp') {
      b0 = (1 + cs) / 2
      b1 = -(1 + cs)
      b2 = b0
    } else {
      b0 = al
      b1 = 0
      b2 = -al
    }
    const a0 = 1 + al
    this.b0 = b0 / a0
    this.b1 = b1 / a0
    this.b2 = b2 / a0
    this.a1 = (-2 * cs) / a0
    this.a2 = (1 - al) / a0
    return this
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2
    this.x2 = this.x1
    this.x1 = x
    this.y2 = this.y1
    this.y1 = y
    return y
  }
}

const mono = (n) => [new Float32Array(n)]
const stereo = (n) => [new Float32Array(n), new Float32Array(n)]

function normalize(channels, peak = 0.9) {
  let m = 0
  for (const ch of channels) for (let i = 0; i < ch.length; i++) m = Math.max(m, Math.abs(ch[i]))
  if (m > 0) {
    const g = peak / m
    for (const ch of channels) for (let i = 0; i < ch.length; i++) ch[i] *= g
  }
  return channels
}

// ---------------------------------------------------------------- whoosh
export function whoosh() {
  const n = Math.round(SR * 1.2)
  const [L, R] = stereo(n)
  const bp = new Biquad()
  const r = rng(7)
  for (let i = 0; i < n; i++) {
    const t = i / n
    const f = 250 * Math.pow(9, Math.sin(Math.PI * Math.min(1, t * 1.15)))
    if (i % 32 === 0) bp.set('bp', f, 1.1)
    const env = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.7)), 2)
    const y = bp.run(r() * 2 - 1) * env
    L[i] = y * (1 - t * 0.7)
    R[i] = y * (0.3 + t * 0.7)
  }
  return { channels: normalize([L, R], 0.8), sampleRate: SR }
}

// ---------------------------------------------------------------- wing flap
export function flap() {
  const n = Math.round(SR * 0.17)
  const [ch] = mono(n)
  const lp = new Biquad()
  const r = rng(11)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    if (i % 16 === 0) lp.set('lp', 1500 - t * 5000, 0.8)
    const env = Math.min(1, t / 0.006) * Math.exp(-t / 0.045)
    const thump = Math.sin(2 * Math.PI * 85 * t) * Math.exp(-t / 0.03) * 0.6
    ch[i] = lp.run(r() * 2 - 1) * env + thump
  }
  return { channels: normalize([ch], 0.9), sampleRate: SR }
}

// ---------------------------------------------------------------- card shuffle / riffle
export function shuffle() {
  const n = Math.round(SR * 1.1)
  const [L, R] = stereo(n)
  const r = rng(23)
  const swish = new Biquad().set('bp', 1600, 0.7)
  for (let i = 0; i < n; i++) {
    const t = i / n
    const s = swish.run(r() * 2 - 1) * 0.12 * Math.sin(Math.PI * t)
    L[i] = s
    R[i] = s
  }
  let time = 0.04
  let k = 0
  while (time < 0.95) {
    const start = Math.round(time * SR)
    const len = Math.round(SR * 0.018)
    const bp = new Biquad().set('bp', 2400 + r() * 2200, 0.9)
    const amp = 0.5 + r() * 0.5
    const pan = (k / 16) * 2 - 1
    for (let j = 0; j < len && start + j < n; j++) {
      const e = Math.exp(-j / (SR * 0.004))
      const y = bp.run(r() * 2 - 1) * e * amp
      L[start + j] += y * (1 - pan) * 0.5
      R[start + j] += y * (1 + pan) * 0.5
    }
    time += 0.075 - k * 0.0028
    k++
  }
  return { channels: normalize([L, R], 0.75), sampleRate: SR }
}

// ---------------------------------------------------------------- bell chime (reveal)
function bell(L, R, start, freq, amp, pan, decay = 1.8) {
  const partials = [
    [1, 1, decay],
    [2.76, 0.45, decay * 0.55],
    [5.4, 0.22, decay * 0.32],
    [8.93, 0.1, decay * 0.2],
  ]
  const n = L.length
  const s0 = Math.round(start * SR)
  for (const [ratio, a, d] of partials) {
    const f = freq * ratio
    const len = Math.min(n - s0, Math.round(d * SR * 5))
    for (let j = 0; j < len; j++) {
      const t = j / SR
      const y = Math.sin(2 * Math.PI * f * t) * a * amp * Math.exp(-t / d) * Math.min(1, t / 0.002)
      L[s0 + j] += y * (1 - pan) * 0.5
      R[s0 + j] += y * (1 + pan) * 0.5
    }
  }
}

export function chime() {
  const n = Math.round(SR * 3.2)
  const [L, R] = stereo(n)
  const notes = [1046.5, 1318.5, 1568, 2093] // Sa Ga Pa Sa'
  notes.forEach((f, i) => bell(L, R, i * 0.085, f, 1 - i * 0.12, -0.5 + i * 0.33, 1.6))
  const r = rng(5)
  for (let k = 0; k < 14; k++) bell(L, R, 0.05 + r() * 1.1, 2600 + r() * 3200, 0.12, r() * 2 - 1, 0.35)
  return { channels: normalize([L, R], 0.8), sampleRate: SR }
}

export function sparkle() {
  const n = Math.round(SR * 1.2)
  const [L, R] = stereo(n)
  const r = rng(99)
  for (let k = 0; k < 10; k++) bell(L, R, r() * 0.55, 3000 + r() * 3500, 0.25, r() * 2 - 1, 0.25)
  return { channels: normalize([L, R], 0.6), sampleRate: SR }
}

export function tick() {
  const n = Math.round(SR * 0.25)
  const [L, R] = stereo(n)
  bell(L, R, 0, 1760, 0.6, 0, 0.12)
  return { channels: normalize([L, R], 0.5), sampleRate: SR }
}

// ---------------------------------------------------------------- parrot squawk "Kuurrr!"
export function squawk() {
  const n = Math.round(SR * 0.78)
  const [ch] = mono(n)
  const r = rng(42)
  const f1 = new Biquad()
  const f2 = new Biquad()
  const f3 = new Biquad()
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    // "Ku" — a short bright attack falling in pitch, then a rolled "urrr".
    let f0
    if (t < 0.07) f0 = 1500 - (t / 0.07) * 450
    else f0 = 1050 + 160 * Math.sin(Math.PI * Math.min(1, (t - 0.07) / 0.6)) - (t > 0.5 ? (t - 0.5) * 900 : 0)
    f0 *= 1 + (r() - 0.5) * 0.02
    phase += f0 / SR
    phase -= Math.floor(phase)
    const saw = 2 * phase - 1
    const src = saw * 0.8 + (r() * 2 - 1) * 0.35
    if (i % 16 === 0) {
      const open = t < 0.07 ? 0.6 : 1
      f1.set('bp', 1300 * open + 400, 5)
      f2.set('bp', 2700, 6)
      f3.set('bp', 4100, 7)
    }
    let y = f1.run(src) * 1.0 + f2.run(src) * 0.9 + f3.run(src) * 0.5
    // the rolled "rrr": fast amplitude flutter after the attack
    const roll = t > 0.11 ? 0.45 + 0.55 * Math.abs(Math.sin(Math.PI * 27 * (t - 0.11))) : 1
    const gap = t > 0.065 && t < 0.1 ? 0.35 : 1
    const env = Math.min(1, t / 0.008) * Math.min(1, (0.78 - t) / 0.14) * gap
    ch[i] = Math.tanh(y * 2.2) * roll * env
  }
  return { channels: normalize([ch], 0.85), sampleRate: SR }
}

// ---------------------------------------------------------------- ambient: tanpura drone + santoor + bansuri
// Seamless 32 s loop. Drone frequencies are whole numbers, so they repeat exactly every second;
// plucks and flute write with wrap-around so their tails continue into the loop start.
export function ambient() {
  const LOOP = 32
  const n = SR * LOOP
  const [L, R] = stereo(n)
  const r = rng(2024)
  const put = (i, y, pan) => {
    const k = ((i % n) + n) % n
    L[k] += y * (1 - pan) * 0.5
    R[k] += y * (1 + pan) * 0.5
  }

  // Tanpura-ish drone: Sa (146 Hz), Pa (219), Sa' (292), low Sa (73)
  const strings = [
    [73, 0.5, -0.3],
    [146, 0.8, 0.25],
    [219, 0.55, -0.1],
    [292, 0.4, 0.35],
  ]
  for (const [f, amp, pan] of strings) {
    for (let h = 1; h <= 9; h++) {
      const fh = f * h
      if (fh > 4000) break
      const ah = (amp / h) * (h === 1 ? 0.7 : 1)
      const lfoRate = (1 + ((h * 3 + f) % 5)) / LOOP // integer cycles per loop
      const lfoPhase = h * 1.7
      const inc = (2 * Math.PI * fh) / SR
      let ph = 0
      for (let i = 0; i < n; i++) {
        const shimmer = 0.55 + 0.45 * Math.sin(2 * Math.PI * lfoRate * (i / SR) + lfoPhase)
        const y = Math.sin(ph) * ah * shimmer
        L[i] += y * (1 - pan) * 0.5
        R[i] += y * (1 + pan) * 0.5
        ph += inc
        if (ph > 6.283185307) ph -= 6.283185307
      }
    }
  }
  // scale drone down; it's a bed, not the melody
  for (let i = 0; i < n; i++) {
    L[i] *= 0.055
    R[i] *= 0.055
  }

  // Santoor: Karplus-Strong hammered strings in raag Bhupali (Sa Re Ga Pa Dha)
  const scale = [292, 328.5, 365, 438, 486.7, 584, 657, 730, 876]
  const pluck = (startSec, f, amp, pan) => {
    const period = Math.max(2, Math.round(SR / f))
    const line = new Float32Array(period)
    for (let j = 0; j < period; j++) line[j] = (r() * 2 - 1) * (0.6 + 0.4 * Math.sin((Math.PI * j) / period))
    const len = Math.round(SR * 2.6)
    const s0 = Math.round(startSec * SR)
    let idx = 0
    let prev = 0
    for (let j = 0; j < len; j++) {
      const cur = line[idx]
      const nxt = line[(idx + 1) % period]
      const v = 0.4985 * (cur + nxt) * 0.998 + 0.002 * prev
      prev = cur
      line[idx] = v
      idx = (idx + 1) % period
      const env = Math.min(1, j / 40)
      const y = cur * amp * env
      put(s0 + j, y, pan)
      // little echo, santoor halls are lively
      put(s0 + j + Math.round(SR * 0.36), y * 0.28, -pan)
      put(s0 + j + Math.round(SR * 0.72), y * 0.12, pan)
    }
  }
  let t = 0.6
  let deg = 2
  while (t < LOOP - 0.5) {
    const len = 4 + Math.floor(r() * 5)
    for (let k = 0; k < len; k++) {
      deg = Math.max(0, Math.min(scale.length - 1, deg + Math.floor(r() * 5) - 2))
      const amp = 0.16 + r() * 0.08
      const pan = r() * 1.2 - 0.6
      pluck(t, scale[deg], amp, pan)
      if (r() < 0.3) pluck(t + 0.09, scale[deg], amp * 0.6, pan) // santoor double-strike
      t += k === len - 1 ? 0.5 : 0.24 + (r() < 0.25 ? 0.12 : 0)
    }
    t += 2.2 + r() * 2.5
  }

  // Bansuri: two breathy phrases with meend (glide) and vibrato
  const breathBp = new Biquad()
  const flute = (start, notes) => {
    let phase = 0
    let total = 0
    for (const [, d] of notes) total += d
    const s0 = Math.round(start * SR)
    const len = Math.round(total * SR)
    let acc = 0
    let ni = 0
    for (let j = 0; j < len; j++) {
      const ts = j / SR
      while (ni < notes.length - 1 && ts > acc + notes[ni][1]) {
        acc += notes[ni][1]
        ni++
      }
      const [f] = notes[ni]
      const prevF = ni > 0 ? notes[ni - 1][0] : f
      const glide = Math.min(1, (ts - acc) / 0.18)
      const fBase = prevF + (f - prevF) * (0.5 - 0.5 * Math.cos(Math.PI * glide))
      const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * ts) * Math.min(1, ts / 0.8)
      phase += (fBase * vib) / SR
      phase -= Math.floor(phase)
      const env = Math.min(1, ts / 0.35) * Math.min(1, (total - ts) / 0.9)
      if (j % 64 === 0) breathBp.set('bp', fBase * 2, 2.5)
      const tone = Math.sin(2 * Math.PI * phase) + 0.18 * Math.sin(4 * Math.PI * phase)
      const breath = breathBp.run(r() * 2 - 1) * 0.35
      put(s0 + j, (tone + breath) * env * 0.075, 0.15)
      put(s0 + j + Math.round(SR * 0.45), (tone + breath) * env * 0.02, -0.4)
    }
  }
  flute(6.5, [
    [730, 1.6],
    [657, 1.1],
    [584, 2.4],
  ])
  flute(21, [
    [876, 1.3],
    [730, 1.2],
    [657, 0.8],
    [730, 2.2],
  ])

  return { channels: normalize([L, R], 0.7), sampleRate: SR }
}

// Impulse response for the shared "mystical hall" reverb.
export function impulse(seconds = 2.4) {
  const n = Math.round(SR * seconds)
  const [L, R] = stereo(n)
  const r = rng(77)
  for (let i = 0; i < n; i++) {
    const t = i / n
    const e = Math.pow(1 - t, 3.2)
    L[i] = (r() * 2 - 1) * e
    R[i] = (r() * 2 - 1) * e
  }
  return { channels: [L, R], sampleRate: SR }
}

export const SOUNDS = { whoosh, flap, shuffle, chime, sparkle, tick, squawk, ambient, impulse }

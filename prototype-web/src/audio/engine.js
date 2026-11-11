// Audio engine: buses, ducking, SFX playback, ambient loop, voice processing chain.
//
//   sfx ─┐                    ┌─> reverb (convolver) ─┐
//   music ─> duck ──┬────────>┤                       ├─> master ─> out
//   voice ──────────┘         └───────────────────────┘

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k)
      return v === null ? d : JSON.parse(v)
    } catch {
      return d
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v))
    } catch {
      /* private mode */
    }
  },
}

class AudioEngine {
  constructor() {
    this.ctx = null
    this.raw = {}
    this.buffers = {}
    this.waiters = {}
    this.muted = store.get('mittu.muted', false)
    this.musicOn = store.get('mittu.music', true)
    this.workletReady = false
    this.ambientSrc = null
    this.listeners = new Set()
  }

  // Start synthesizing all sounds in a worker as soon as the home screen loads.
  prerender() {
    if (this.worker) return
    try {
      this.worker = new Worker(new URL('./synth.worker.js', import.meta.url), { type: 'module' })
      this.worker.onmessage = ({ data }) => {
        if (data.done) {
          this.worker.terminate()
          return
        }
        this.raw[data.name] = data
        if (this.ctx) this.materialize(data.name)
      }
      this.worker.postMessage('go')
    } catch (e) {
      console.warn('Sound prerender unavailable', e)
    }
  }

  materialize(name) {
    const { channels, sampleRate } = this.raw[name]
    let buf
    try {
      buf = this.ctx.createBuffer(channels.length, channels[0].length, sampleRate)
      channels.forEach((c, i) => buf.copyToChannel(c, i))
      this.buffers[name] = buf
      if (name === 'impulse') {
        if (sampleRate === this.ctx.sampleRate) this.reverb.buffer = buf
        else this.reverb.buffer = this.resampleImpulse(channels, sampleRate)
      }
    } catch (e) {
      console.warn(`Sound "${name}" unavailable`, e)
      return
    }
    if (name === 'ambient' && this.wantAmbient) this.startAmbient()
    this.waiters[name]?.forEach((fn) => fn(buf))
    delete this.waiters[name]
  }

  // Linear resample of the reverb impulse to the context rate (only if the browser refused 44.1 kHz).
  resampleImpulse(channels, fromRate) {
    const ratio = this.ctx.sampleRate / fromRate
    const len = Math.round(channels[0].length * ratio)
    const out = this.ctx.createBuffer(channels.length, len, this.ctx.sampleRate)
    channels.forEach((src, c) => {
      const dst = out.getChannelData(c)
      for (let i = 0; i < len; i++) {
        const p = i / ratio
        const k = Math.floor(p)
        dst[i] = (src[k] ?? 0) + ((src[k + 1] ?? 0) - (src[k] ?? 0)) * (p - k)
      }
    })
    return out
  }

  whenReady(name, timeout = 4000) {
    if (this.buffers[name]) return Promise.resolve(this.buffers[name])
    return new Promise((resolve) => {
      ;(this.waiters[name] ||= []).push(resolve)
      setTimeout(() => resolve(null), timeout)
    })
  }

  // Must be called from a user gesture (tap / key).
  async unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => {})
      return
    }
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    // Run at the rate our sounds are synthesized at (ConvolverNode requires a match).
    let ctx
    try {
      ctx = new AC({ latencyHint: 'interactive', sampleRate: 44100 })
    } catch {
      ctx = new AC({ latencyHint: 'interactive' })
    }
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(ctx.destination)

    this.reverb = ctx.createConvolver()
    this.reverbOut = ctx.createGain()
    this.reverbOut.gain.value = 0.9
    this.reverb.connect(this.reverbOut).connect(this.master)

    this.duckBus = ctx.createGain() // music + sfx, lowered while Mittu speaks
    this.duckBus.connect(this.master)
    this.music = ctx.createGain()
    this.music.gain.value = 0
    this.music.connect(this.duckBus)
    const musicSend = ctx.createGain()
    musicSend.gain.value = 0.35
    this.music.connect(musicSend).connect(this.reverb)

    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.85
    this.sfx.connect(this.duckBus)
    const sfxSend = ctx.createGain()
    sfxSend.gain.value = 0.25
    this.sfx.connect(sfxSend).connect(this.reverb)

    this.voice = ctx.createGain()
    this.voice.connect(this.master)

    ctx.resume().catch(() => {})
    for (const name of Object.keys(this.raw)) this.materialize(name)

    if (ctx.audioWorklet && window.isSecureContext) {
      try {
        await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/pitch-shifter.js`)
        this.workletReady = true
      } catch (e) {
        console.warn('Pitch worklet unavailable, using playback-rate fallback', e)
      }
    }
    this.wantAmbient = true
    this.startAmbient()
  }

  play(name, { gain = 1, rate = 1, pan = 0, delay = 0 } = {}) {
    const buf = this.buffers[name]
    if (!this.ctx || !buf) return null
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    const g = this.ctx.createGain()
    g.gain.value = gain
    let node = src.connect(g)
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner()
      p.pan.value = pan
      node = node.connect(p)
    }
    node.connect(this.sfx)
    src.start(this.ctx.currentTime + delay)
    return src
  }

  startAmbient() {
    if (!this.ctx || !this.musicOn || this.ambientSrc || !this.buffers.ambient) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.buffers.ambient
    src.loop = true
    src.connect(this.music)
    src.start()
    this.ambientSrc = src
    const t = this.ctx.currentTime
    this.music.gain.cancelScheduledValues(t)
    this.music.gain.setValueAtTime(this.music.gain.value, t)
    this.music.gain.linearRampToValueAtTime(0.42, t + 2.5)
  }

  stopAmbient() {
    if (!this.ctx || !this.ambientSrc) return
    const src = this.ambientSrc
    this.ambientSrc = null
    const t = this.ctx.currentTime
    this.music.gain.cancelScheduledValues(t)
    this.music.gain.setValueAtTime(this.music.gain.value, t)
    this.music.gain.linearRampToValueAtTime(0, t + 0.8)
    src.stop(t + 0.85)
  }

  setMusic(on) {
    this.musicOn = on
    store.set('mittu.music', on)
    if (on) this.startAmbient()
    else this.stopAmbient()
    this.emit()
  }

  setMuted(m) {
    this.muted = m
    store.set('mittu.muted', m)
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.05)
    this.emit()
  }

  duck(on) {
    if (!this.ctx) return
    this.duckBus.gain.setTargetAtTime(on ? 0.22 : 1, this.ctx.currentTime, on ? 0.08 : 0.4)
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  emit() {
    this.listeners.forEach((fn) => fn())
  }
}

export const engine = new AudioEngine()
export { store }

if (import.meta.env.DEV) window.__mittuAudio = engine

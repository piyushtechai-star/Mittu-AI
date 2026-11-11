import { SOUNDS } from './synth.js'

// Render short SFX first so they're ready almost instantly; the long ambient loop last.
const ORDER = ['squawk', 'whoosh', 'flap', 'shuffle', 'chime', 'sparkle', 'tick', 'impulse', 'ambient']

self.onmessage = () => {
  for (const name of ORDER) {
    const { channels, sampleRate } = SOUNDS[name]()
    self.postMessage({ name, channels, sampleRate }, channels.map((c) => c.buffer))
  }
  self.postMessage({ done: true })
}

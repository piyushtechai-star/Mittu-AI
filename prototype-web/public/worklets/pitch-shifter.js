// Granular (dual delay-line) pitch shifter: changes pitch without changing speed.
// Two read heads sweep through a short delay buffer at `ratio` speed and are
// cross-faded with sin^2 windows (which sum to 1) so the jumps are inaudible.
class PitchShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'ratio', defaultValue: 1.3, minValue: 0.5, maxValue: 2, automationRate: 'k-rate' }]
  }

  constructor() {
    super()
    this.size = 16384
    this.mask = this.size - 1
    this.buf = new Float32Array(this.size)
    this.w = 0
    this.phase = 0
    this.grain = Math.round(sampleRate * 0.042) // ~42 ms grains suit speech
  }

  read(delay) {
    let p = this.w - delay
    if (p < 0) p += this.size
    const i = Math.floor(p)
    const f = p - i
    const a = this.buf[i & this.mask]
    const b = this.buf[(i + 1) & this.mask]
    return a + (b - a) * f
  }

  process(inputs, outputs, params) {
    const input = inputs[0]
    const output = outputs[0]
    if (!output || !output[0]) return true
    const G = this.grain
    const step = (params.ratio[0] - 1) / G
    const n = output[0].length
    for (let i = 0; i < n; i++) {
      let x = 0
      if (input && input.length) {
        for (let c = 0; c < input.length; c++) x += input[c][i]
        x /= input.length
      }
      this.buf[this.w] = x
      this.phase += step
      if (this.phase >= 1) this.phase -= 1
      else if (this.phase < 0) this.phase += 1
      const pa = this.phase
      const pb = (pa + 0.5) % 1
      const sa = Math.sin(Math.PI * pa)
      const ga = sa * sa
      const y = this.read((1 - pa) * G + 1) * ga + this.read((1 - pb) * G + 1) * (1 - ga)
      for (let c = 0; c < output.length; c++) output[c][i] = y
      this.w = (this.w + 1) & this.mask
    }
    return true
  }
}

registerProcessor('pitch-shifter', PitchShifter)

// Reading orchestration: ask the server (Claude) first, fall back to a built-in reading.
import { getConfig } from '../audio/voice.js'

const CATEGORY_LINES = {
  love: {
    up: 'Dil ke maamle mein pyaar ki hawa aapki taraf beh rahi hai.',
    rev: 'Pyaar mein thoda dhairya rakhiye, jaldbaazi mat kijiye.',
  },
  career: {
    up: 'Kaam-kaaj mein ek naya mauka darwaaze par dastak de raha hai.',
    rev: 'Career mein abhi planning zaroori hai, jaldbaazi nahi.',
  },
  paisa: {
    up: 'Paise ke maamle mein samajhdaari se chaloge toh barkat aayegi.',
    rev: 'Kharche pe nazar rakhiye, abhi bachat ka samay hai.',
  },
  health: {
    up: 'Sehat ke liye aaram, paani aur achhi neend ko pyaar dijiye.',
    rev: 'Body ki baat suniye, aur zaroorat ho toh doctor se zaroor miliye.',
  },
  general: {
    up: 'Aane wale din aapke liye nayi roshni le kar aa rahe hain.',
    rev: 'Thoda ruk kar sochiye, phir raasta saaf dikhega.',
  },
}

export const LUCKY_COLORS = [
  { name: 'Kesariya (Saffron)', hex: '#FF9933', keys: ['kesar', 'saffron', 'orange', 'narangi'] },
  { name: 'Hara (Emerald Green)', hex: '#2ECC71', keys: ['hara', 'green', 'emerald', 'panna'] },
  { name: 'Sunehra (Gold)', hex: '#D4AF37', keys: ['sunehra', 'gold', 'sona'] },
  { name: 'Neela (Royal Blue)', hex: '#3D6BE0', keys: ['neela', 'blue', 'aasmani', 'sky'] },
  { name: 'Gulaabi (Pink)', hex: '#F06292', keys: ['gulaabi', 'gulabi', 'pink', 'rani'] },
  { name: 'Laal (Red)', hex: '#E53935', keys: ['laal', 'lal', 'red', 'maroon'] },
  { name: 'Safed (White)', hex: '#F5F1E6', keys: ['safed', 'white', 'cream'] },
  { name: 'Jamuni (Purple)', hex: '#8E44AD', keys: ['jamuni', 'purple', 'baingani', 'violet', 'lavender'] },
  { name: 'Peela (Yellow)', hex: '#F4D03F', keys: ['peela', 'yellow', 'haldi'] },
  { name: 'Aasmani (Turquoise)', hex: '#1ABC9C', keys: ['firozi', 'turquoise', 'teal'] },
]

export function colorHex(name = '') {
  const n = name.toLowerCase()
  return LUCKY_COLORS.find((c) => c.keys.some((k) => n.includes(k)))?.hex ?? '#D4AF37'
}

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export function localReading({ card, reversed, category, name, question }) {
  const side = reversed ? card.rev : card.up
  const line = CATEGORY_LINES[category] ?? CATEGORY_LINES.general
  const cat = reversed ? line.rev : line.up
  const h = hash(`${card.id}|${reversed}|${question}|${name}|${new Date().toDateString()}`)
  const color = LUCKY_COLORS[h % LUCKY_COLORS.length]
  const who = name ? `${name}, ` : ''
  return {
    spoken: `${who}${side.meaning} ${cat} Mittu ki salah hai: ${side.advice.split('. ')[0].replace(/\.$/, '')}.`,
    message: `${side.meaning} ${cat}`,
    advice: side.advice,
    luckyColor: color.name,
    luckyNumber: (h % 9) + 1 + (card.id % 3) * 9,
    shareLine: side.line,
    source: 'local',
  }
}

export async function fetchReading(params) {
  const cfg = await getConfig()
  if (cfg.ai) {
    try {
      const side = params.reversed ? params.card.rev : params.card.up
      const r = await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card: { name: params.card.en, hindi: `${params.card.hiRoman} / ${params.card.hi}`, keywords: side.keywords.join(', ') },
          reversed: params.reversed,
          category: params.category,
          name: params.name,
          question: params.question,
        }),
        signal: AbortSignal.timeout(28000),
      })
      if (r.ok) {
        const j = await r.json()
        if (j.spoken && j.message) return j
      }
    } catch (e) {
      console.warn('AI reading failed, using built-in reading', e)
    }
  }
  return localReading(params)
}

// What Mittu actually says: catchphrases + card intro + the reading.
export function speechText(reading, { card, reversed }) {
  const intro = `Suno suno, dhyaan se! Mittu ne card nikaala hai. ${card.en}, yaani ${card.hiRoman}${reversed ? ', ulta' : ''}!`
  return `${intro} ${reading.spoken}`.replace(/\s+/g, ' ').trim()
}

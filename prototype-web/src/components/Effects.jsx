import { AnimatePresence, motion } from 'framer-motion'
import { useMemo } from 'react'

// Golden sparkle burst (keyed by `id` so each trigger replays).
export function SparkleBurst({ id, x, y, count = 28, radius = 150 }) {
  const parts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const d = radius * (0.45 + Math.random() * 0.7)
        return {
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          s: 4 + Math.random() * 9,
          star: Math.random() < 0.45,
          delay: Math.random() * 0.12,
          color: Math.random() < 0.25 ? '#FF9933' : Math.random() < 0.5 ? '#FFF3C4' : '#D4AF37',
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  )
  if (!id) return null
  return (
    <div key={id} className="pointer-events-none absolute" style={{ left: x, top: y, zIndex: 40 }}>
      <motion.div
        className="absolute rounded-full"
        style={{ width: 40, height: 40, left: -20, top: -20, background: 'radial-gradient(circle, rgba(255,240,190,0.95), rgba(212,175,55,0))' }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 9, opacity: 0 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      {parts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ width: p.s, height: p.s, left: -p.s / 2, top: -p.s / 2 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy + 30, scale: [0, 1.3, 0.2], opacity: [1, 1, 0], rotate: 180 }}
          transition={{ duration: 1.3, delay: p.delay, ease: [0.15, 0.7, 0.3, 1] }}
        >
          {p.star ? (
            <svg viewBox="-10 -10 20 20" width={p.s} height={p.s}>
              <path d="M0-10L2.2-2.2L10 0L2.2 2.2L0 10L-2.2 2.2L-10 0L-2.2-2.2Z" fill={p.color} />
            </svg>
          ) : (
            <div className="h-full w-full rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
          )}
        </motion.div>
      ))}
    </div>
  )
}

// Green feathers drifting down from where Mittu flew.
export function Feathers({ feathers }) {
  return (
    <AnimatePresence>
      {feathers.map((f) => (
        <motion.div
          key={f.id}
          className="pointer-events-none absolute"
          style={{ left: f.x, top: f.y, zIndex: 25 }}
          initial={{ opacity: 0, x: 0, y: 0, rotate: f.rot }}
          animate={{
            opacity: [0, 1, 1, 0],
            y: [0, 60, 130, 210],
            x: [0, 22 * f.dir, -18 * f.dir, 14 * f.dir],
            rotate: [f.rot, f.rot + 50 * f.dir, f.rot - 30 * f.dir, f.rot + 40 * f.dir],
          }}
          transition={{ duration: 3.2, ease: 'easeInOut' }}
          exit={{ opacity: 0 }}
        >
          <svg width="14" height="30" viewBox="0 0 14 30">
            <path d="M7 0C13 8 13 20 7 30C1 20 1 8 7 0Z" fill={f.color} />
            <path d="M7 3V29" stroke="#0E6E3D" strokeWidth="0.8" />
          </svg>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

// Karaoke subtitles: words appear as Mittu says them, current word glows.
export function Subtitles({ words, current, visible, top, thinking }) {
  const lines = useMemo(() => chunk(words), [words])
  const lineIdx = Math.max(0, lines.findIndex((l) => current >= l.from && current <= l.to))
  const line = lines[current < 0 ? 0 : lineIdx] ?? null
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-x-4 z-30 flex justify-center"
          style={{ top }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
        >
          <div
            className="flex w-full max-w-[400px] items-center justify-center rounded-2xl px-4 py-2.5 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(30,20,70,0.92), rgba(14,9,40,0.92))',
              border: '1.5px solid rgba(212,175,55,0.75)',
              boxShadow: '0 0 24px rgba(212,175,55,0.25), inset 0 0 18px rgba(212,175,55,0.08)',
              minHeight: 52,
            }}
          >
            {thinking || !line ? (
              <span className="text-[15px] italic text-gold-soft/80">Mittu soch raha hai… 🦜</span>
            ) : (
              <p className="text-[15.5px] font-medium leading-snug">
                {words.slice(line.from, line.to + 1).map((w, k) => {
                  const i = line.from + k
                  const state = i < current ? 'past' : i === current ? 'now' : 'future'
                  return (
                    <span
                      key={i}
                      className="inline-block transition-all duration-150"
                      style={{
                        marginRight: '0.28em',
                        opacity: state === 'future' ? 0 : 1,
                        transform: state === 'future' ? 'translateY(4px)' : 'none',
                        color: state === 'now' ? '#FFF3C4' : '#E9C766',
                        textShadow: state === 'now' ? '0 0 12px rgba(255,220,120,0.9)' : 'none',
                      }}
                    >
                      {w.text}
                    </span>
                  )
                })}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function chunk(words) {
  const lines = []
  let from = 0
  let len = 0
  words.forEach((w, i) => {
    len += w.text.length + 1
    const end = /[.!?]$/.test(w.text) || (/[,;]$/.test(w.text) && len > 26) || len > 44 || i === words.length - 1
    if (end) {
      lines.push({ from, to: i })
      from = i + 1
      len = 0
    }
  })
  return lines
}

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { CATEGORIES } from '../data/cards.js'
import { colorHex } from '../data/reading.js'

// ---------------------------------------------------------------- icons
const Icon = {
  speaker: (on) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" fillOpacity=".15" />
      {on ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
    </svg>
  ),
  music: (on) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" fill="currentColor" fillOpacity=".2" />
      <circle cx="16.5" cy="16" r="2.5" fill="currentColor" fillOpacity=".2" />
      {!on && <path d="M3 3l18 18" />}
    </svg>
  ),
}

function RoundBtn({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="glass grid h-10 w-10 place-items-center rounded-full text-gold-soft transition active:scale-90"
    >
      {children}
    </button>
  )
}

export function TopBar({ muted, musicOn, onMute, onMusic, showSkip, onSkip, showBrand }) {
  return (
    <div className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-4" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      <div className="h-10">
        <AnimatePresence>
          {showBrand && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="title-shimmer font-display text-lg font-bold leading-10 tracking-wide"
            >
              Mittu AI
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {showSkip && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              onClick={onSkip}
              className="glass h-10 rounded-full px-4 text-sm font-medium text-gold-soft active:scale-95"
            >
              Skip ⏭
            </motion.button>
          )}
        </AnimatePresence>
        <RoundBtn label={musicOn ? 'Music band karo' : 'Music chalao'} onClick={onMusic}>
          {Icon.music(musicOn)}
        </RoundBtn>
        <RoundBtn label={muted ? 'Awaaz chalu karo' : 'Mute'} onClick={onMute}>
          {Icon.speaker(!muted)}
        </RoundBtn>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- home
export function Home({ form, setForm, onStart, bottomPad, showSkipPref, skipPref, setSkipPref }) {
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  return (
    <motion.div
      key="home"
      className="no-scrollbar absolute inset-0 z-20 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6 } }}
      exit={{ opacity: 0, y: -16, transition: { duration: 0.5 } }}
    >
      <form
        className="mx-auto flex min-h-full max-w-[440px] flex-col items-center px-5"
        style={{ paddingTop: 'max(var(--home-top), calc(env(safe-area-inset-top) + 48px))', paddingBottom: bottomPad }}
        onSubmit={(e) => {
          e.preventDefault()
          onStart()
        }}
      >
        <motion.h1
          className="title-shimmer font-display text-[2.9rem] font-black leading-none tracking-wide [@media(min-height:740px)]:text-[3.4rem]"
          initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Mittu AI
        </motion.h1>
        <motion.p
          className="mt-2 text-center text-[15px] text-[#efe3c2]/85 [@media(min-height:740px)]:mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Mittu bataega aapka bhavishya 🦜
        </motion.p>

        <motion.div
          className="glass mt-5 w-full rounded-3xl p-4 [@media(min-height:760px)]:mt-7"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <input
            value={form.name}
            onChange={set('name')}
            maxLength={40}
            placeholder="Aapka naam (optional)"
            autoComplete="given-name"
            className="w-full rounded-xl border border-gold/20 bg-night-950/50 px-4 py-2.5 text-[15px] text-[#f6eedb] outline-none placeholder:text-[#f6eedb]/40 focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]"
          />
          <textarea
            value={form.question}
            onChange={set('question')}
            maxLength={300}
            rows={2}
            placeholder="Apna sawaal poochiye..."
            className="mt-2.5 w-full resize-none rounded-xl border border-gold/20 bg-night-950/50 px-4 py-2.5 text-[15px] text-[#f6eedb] outline-none placeholder:text-[#f6eedb]/40 focus:border-gold/60 focus:shadow-[0_0_0_3px_rgba(212,175,55,0.15)]"
          />
          <div className="mt-3 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Category">
            {CATEGORIES.map((c) => {
              const on = form.category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setForm((f) => ({ ...f, category: c.id }))}
                  className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition active:scale-95 ${
                    on
                      ? 'bg-gradient-to-b from-gold-soft to-gold text-night-900 shadow-[0_0_16px_rgba(212,175,55,0.5)]'
                      : 'border border-gold/30 bg-night-950/40 text-[#f6eedb]/85'
                  }`}
                >
                  {c.label} {c.emoji}
                </button>
              )
            })}
          </div>
          {showSkipPref && (
            <label className="mt-3 flex items-center justify-center gap-2 text-[12.5px] text-[#f6eedb]/60">
              <input type="checkbox" checked={skipPref} onChange={(e) => setSkipPref(e.target.checked)} className="accent-[#D4AF37]" />
              Animation skip karo (seedha result)
            </label>
          )}
        </motion.div>

        <motion.button
          type="submit"
          className="glow-btn mt-4 w-full [@media(min-height:740px)]:mt-6 max-w-[340px] overflow-hidden rounded-full py-4 font-display text-[17px] font-bold tracking-wide"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.95, duration: 0.6 }}
          whileTap={{ scale: 0.96 }}
        >
          Mittu, card nikaalo! 🃏
        </motion.button>
      </form>
    </motion.div>
  )
}

// ---------------------------------------------------------------- result parchment
function Section({ icon, title, children }) {
  return (
    <section className="mt-5">
      <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-wide text-[#7A2E12]">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="mt-1.5 text-[15px] leading-relaxed text-ink/90">{children}</div>
    </section>
  )
}

const Skeleton = () => (
  <div className="space-y-2">
    <div className="skeleton h-3.5 w-full rounded" />
    <div className="skeleton h-3.5 w-11/12 rounded" />
    <div className="skeleton h-3.5 w-3/4 rounded" />
  </div>
)

export function ResultSheet({ draw, reading, spacer, onAgain, onShare, onReplay, speaking, sharing }) {
  const { card, reversed } = draw
  const side = reversed ? card.rev : card.up
  return (
    <motion.div
      className="no-scrollbar absolute inset-0 z-[35] overflow-y-auto"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0, transparent 52px, #000 84px)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, transparent 52px, #000 84px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div style={{ height: spacer }} className="pointer-events-none" />
      <motion.div
        className="relative mx-3 mb-6"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
      >
        <div className="scroll-rod relative mx-1 h-4 rounded-full" />
        <div className="parchment -mt-2 rounded-b-2xl px-5 pb-6 pt-6">
          <div className="text-center">
            <div className="font-display text-[21px] font-black leading-tight text-[#5B1F0B]">
              {card.en} — {card.hiRoman}
            </div>
            <div className="mt-0.5 font-hindi text-[19px] text-[#9A4A12]">{card.hi}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#7A2E12]/30 px-3 py-0.5 text-[12.5px] font-medium text-[#7A2E12]">
              {reversed ? '🔄 Ulta (Reversed)' : '⬆️ Seedha (Upright)'}
            </div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              {side.keywords.map((k) => (
                <span key={k} className="rounded-full bg-[#7A2E12]/10 px-2.5 py-0.5 text-[12px] text-[#5B1F0B]">
                  {k}
                </span>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-4 h-px w-2/3 bg-gradient-to-r from-transparent via-[#9A6A2A]/60 to-transparent" />

          <Section icon="📜" title="Card ka sandesh">
            {reading ? reading.message : <Skeleton />}
          </Section>
          <Section icon="🪔" title="Aapke liye salah">
            {reading ? reading.advice : <Skeleton />}
          </Section>

          <section className="mt-5">
            <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-wide text-[#7A2E12]">
              <span>🍀</span>Lucky color / Lucky number
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-[#7A2E12]/20 bg-white/25 p-3">
                <div
                  className="h-9 w-9 shrink-0 rounded-full border-2 border-white/70 shadow"
                  style={{ background: reading ? colorHex(reading.luckyColor) : '#ccc' }}
                />
                <div className="text-[13.5px] font-medium leading-tight">{reading ? reading.luckyColor : '…'}</div>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-xl border border-[#7A2E12]/20 bg-white/25 p-3">
                <span className="font-display text-[30px] font-black leading-none text-[#7A2E12]">{reading ? reading.luckyNumber : '…'}</span>
              </div>
            </div>
          </section>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onAgain}
              className="col-span-2 rounded-full bg-gradient-to-b from-[#8A3A14] to-[#5B1F0B] py-3 font-display text-[15px] font-bold tracking-wide text-[#F6E8C8] shadow-lg active:scale-[0.97]"
            >
              🃏 Ek aur card
            </button>
            <button
              type="button"
              onClick={onShare}
              disabled={!reading || sharing}
              className="rounded-full border-2 border-[#8A3A14] py-2.5 text-[14px] font-semibold text-[#5B1F0B] active:scale-[0.97] disabled:opacity-50"
            >
              {sharing ? 'Bana raha hai…' : '📤 Share karo'}
            </button>
            <button
              type="button"
              onClick={onReplay}
              disabled={!reading}
              className="rounded-full border-2 border-[#8A3A14] py-2.5 text-[14px] font-semibold text-[#5B1F0B] active:scale-[0.97] disabled:opacity-50"
            >
              {speaking ? '⏹ Roko' : '🔁 Replay voice'}
            </button>
          </div>
        </div>
        <div className="scroll-rod relative mx-1 -mt-2 h-4 rounded-full" />
        <p className="mt-4 text-center text-[12.5px] text-[#f6eedb]/55">Sirf manoranjan ke liye 🦜</p>
      </motion.div>
    </motion.div>
  )
}

// ---------------------------------------------------------------- share modal
export function ShareModal({ blob, onClose, card }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  const file = blob ? new File([blob], `mittu-${card.en.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' }) : null
  const canShare = file && navigator.canShare?.({ files: [file] })

  return (
    <AnimatePresence>
      {blob && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-full flex-col items-center"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {url && <img src={url} alt="Share story" className="max-h-[68dvh] rounded-2xl border border-gold/40 shadow-2xl" />}
            <div className="mt-4 flex gap-2.5">
              {canShare && (
                <button
                  type="button"
                  className="glow-btn rounded-full px-5 py-2.5 text-sm font-bold"
                  onClick={() =>
                    navigator.share({ files: [file], title: 'Mittu AI', text: `Mittu ne mere liye ${card.en} nikaala! 🦜` }).catch(() => {})
                  }
                >
                  Share karo
                </button>
              )}
              <a href={url ?? '#'} download={file?.name} className="glass rounded-full px-5 py-2.5 text-sm font-semibold text-gold-soft">
                Download
              </a>
              <button type="button" onClick={onClose} className="glass rounded-full px-5 py-2.5 text-sm text-[#f6eedb]/80">
                Band karo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

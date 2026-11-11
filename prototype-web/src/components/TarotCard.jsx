import { motion } from 'framer-motion'
import { CARD_ART, CARD_DEFS, cardBackMarkup } from '../data/cardArt.js'

const BACK = cardBackMarkup()

// Mount once: gradients/patterns shared by every card back.
export function SharedDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs dangerouslySetInnerHTML={{ __html: CARD_DEFS }} />
    </svg>
  )
}

export function CardBack() {
  return <svg viewBox="0 0 300 480" className="block h-full w-full" dangerouslySetInnerHTML={{ __html: BACK }} />
}

export function CardFace({ card, reversed, width }) {
  const fs = width / 300 // scale unit relative to a 300px-wide card
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        borderRadius: 20 * fs,
        background: 'radial-gradient(ellipse at 50% 38%, #2C1F72 0%, #160F45 60%, #0E0A30 100%)',
      }}
    >
      <div className="absolute" style={{ inset: 10 * fs, border: `${3 * fs}px solid #D4AF37`, borderRadius: 14 * fs }} />
      <div className="absolute opacity-70" style={{ inset: 20 * fs, border: `${1.2 * fs}px solid #D4AF37`, borderRadius: 10 * fs }} />
      <div
        className="absolute inset-0 flex flex-col items-center"
        style={{ padding: `${30 * fs}px ${26 * fs}px`, transform: reversed ? 'rotate(180deg)' : undefined }}
      >
        <div className="font-display font-bold text-gold" style={{ fontSize: 26 * fs, letterSpacing: 2 * fs }}>
          {card.numeral}
        </div>
        <div className="relative mt-[2%] flex w-full flex-1 items-center justify-center">
          <div
            className="absolute rounded-full"
            style={{
              width: '92%',
              aspectRatio: '1',
              background: 'radial-gradient(circle, rgba(255,153,51,0.22) 0%, rgba(212,175,55,0.08) 45%, transparent 70%)',
            }}
          />
          <svg viewBox="0 0 100 100" className="relative w-full" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.35))' }}>
            <g
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: CARD_ART[card.id] }}
            />
          </svg>
        </div>
        <div className="mt-[4%] w-full text-center">
          <div className="font-display font-bold uppercase text-gold-soft" style={{ fontSize: 21 * fs, letterSpacing: 1.5 * fs, lineHeight: 1.1 }}>
            {card.en}
          </div>
          <div className="mx-auto my-[3%] h-px w-1/2 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="font-hindi text-saffron" style={{ fontSize: 26 * fs, lineHeight: 1.2 }}>
            {card.hi}
          </div>
        </div>
      </div>
    </div>
  )
}

// A flippable card. `flip` is a MotionValue in degrees (0 = back showing, 180 = face showing).
export function FlipCard({ card, reversed, width, flip, glow = true }) {
  const height = width * 1.6
  return (
    <div style={{ width, height, perspective: width * 5 }}>
      <motion.div className="card-3d relative h-full w-full" style={{ rotateY: flip }}>
        <div className={`backface-hidden absolute inset-0 overflow-hidden ${glow ? 'card-glow' : ''}`} style={{ borderRadius: width * 0.066 }}>
          <CardBack />
        </div>
        <div
          className={`backface-hidden absolute inset-0 overflow-hidden ${glow ? 'card-glow' : ''}`}
          style={{ transform: 'rotateY(180deg)', borderRadius: width * 0.066 }}
        >
          {card && <CardFace card={card} reversed={reversed} width={width} />}
        </div>
      </motion.div>
    </div>
  )
}

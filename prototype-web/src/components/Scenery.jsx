import { useEffect, useMemo, useRef } from 'react'
import { mandalaMarkup } from '../data/cardArt.js'

// Full-screen night sky: gradient, twinkling stars and slow golden dust (one canvas).
export function NightSky({ reduced }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0
    let h = 0
    let raf = 0
    let stars = []
    let dust = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = 64
    const sg = sprite.getContext('2d')
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,236,170,1)')
    grad.addColorStop(0.25, 'rgba(232,196,90,0.55)')
    grad.addColorStop(1, 'rgba(212,175,55,0)')
    sg.fillStyle = grad
    sg.fillRect(0, 0, 64, 64)

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const area = (w * h) / 10000
      stars = Array.from({ length: Math.round(Math.min(160, area * 2.2)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 0.85,
        r: Math.random() * 1.1 + 0.25,
        tw: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 1.8,
      }))
      dust = Array.from({ length: Math.round(Math.min(60, area * 0.8)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        s: 4 + Math.random() * 10,
        vy: -(4 + Math.random() * 10),
        sway: Math.random() * Math.PI * 2,
        a: 0.25 + Math.random() * 0.5,
      }))
    }

    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      ctx.clearRect(0, 0, w, h)
      const t = now / 1000
      for (const s of stars) {
        const a = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * s.sp + s.tw), 2)
        ctx.globalAlpha = a * 0.9
        ctx.fillStyle = '#fff6dc'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const d of dust) {
        if (!reduced) {
          d.y += d.vy * dt
          d.sway += dt * 0.6
          if (d.y < -20) {
            d.y = h + 20
            d.x = Math.random() * w
          }
        }
        const x = d.x + Math.sin(d.sway) * 14
        ctx.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(t * 1.3 + d.sway))
        ctx.drawImage(sprite, x - d.s / 2, d.y - d.s / 2, d.s, d.s)
      }
      ctx.globalAlpha = 1
      if (!reduced) raf = requestAnimationFrame(frame)
    }

    resize()
    raf = requestAnimationFrame(frame)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  return (
    <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(180deg, #0B0B2B 0%, #140D38 55%, #1A1040 100%)' }}>
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 45% at 50% 38%, rgba(90,60,170,0.28), transparent 70%)' }}
      />
      <canvas ref={ref} className="absolute inset-0" />
    </div>
  )
}

export function Mandala({ x, y, size }) {
  const src = useMemo(() => `data:image/svg+xml;utf8,${encodeURIComponent(mandalaMarkup())}`, [])
  return (
    <div className="pointer-events-none absolute" style={{ left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: 0.09 }}>
      <img src={src} alt="" className="mandala h-full w-full" draggable={false} />
    </div>
  )
}

// Ornate brass-and-wood T-perch with a little hanging bell.
export function Perch({ x, y, scale = 1 }) {
  return (
    <svg
      className="pointer-events-none absolute"
      style={{ left: x - 110, top: y - 10, transform: `scale(${scale})`, transformOrigin: '110px 10px' }}
      width="220"
      height="150"
      viewBox="0 0 220 150"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="perch-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B57A3C" />
          <stop offset="0.5" stopColor="#7A4A1C" />
          <stop offset="1" stopColor="#4E2C0E" />
        </linearGradient>
        <linearGradient id="perch-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF0B8" />
          <stop offset="0.45" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#7E5F10" />
        </linearGradient>
        <radialGradient id="perch-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(212,175,55,0.35)" />
          <stop offset="1" stopColor="rgba(212,175,55,0)" />
        </radialGradient>
      </defs>
      <ellipse cx="110" cy="140" rx="90" ry="10" fill="url(#perch-glow)" />
      {/* rod */}
      <rect x="22" y="10" width="176" height="10" rx="5" fill="url(#perch-wood)" />
      <circle cx="20" cy="15" r="8" fill="url(#perch-brass)" />
      <circle cx="200" cy="15" r="8" fill="url(#perch-brass)" />
      <rect x="60" y="9" width="6" height="12" rx="2" fill="url(#perch-brass)" />
      <rect x="154" y="9" width="6" height="12" rx="2" fill="url(#perch-brass)" />
      {/* bell */}
      <g className="bell-swing" style={{ transformBox: 'view-box', transformOrigin: '186px 22px' }}>
        <path d="M186 22V34" stroke="#D4AF37" strokeWidth="1.5" />
        <path d="M179 46C179 38 182 34 186 34C190 34 193 38 193 46Z" fill="url(#perch-brass)" />
        <circle cx="186" cy="48" r="2" fill="#8A6A12" />
        <path d="M184 50L186 60L188 50" stroke="#FF9933" strokeWidth="1.5" fill="none" />
      </g>
      {/* pole */}
      <rect x="104" y="20" width="12" height="104" fill="url(#perch-wood)" />
      {[34, 70, 104].map((yy) => (
        <rect key={yy} x="100" y={yy} width="20" height="6" rx="3" fill="url(#perch-brass)" />
      ))}
      {/* base */}
      <path d="M72 134C76 120 92 116 110 116C128 116 144 120 148 134Z" fill="url(#perch-wood)" />
      <rect x="64" y="132" width="92" height="8" rx="4" fill="url(#perch-brass)" />
    </svg>
  )
}

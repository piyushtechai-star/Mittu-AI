// Renders a 1080x1920 story image: card + Mittu + a short line.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MittuSvg } from '../components/Mittu.jsx'
import { cardArtSvg, mandalaMarkup } from '../data/cardArt.js'

const W = 1080
const H = 1920

function loadSvg(markup) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx, text, maxWidth) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

export async function renderShareImage({ card, reversed, reading }) {
  await Promise.all([
    document.fonts.load('900 96px Cinzel'),
    document.fonts.load('700 48px Cinzel'),
    document.fonts.load('italic 400 44px Poppins'),
    document.fonts.load('500 34px Poppins'),
    document.fonts.load('64px "Tiro Devanagari Hindi"', card.hi),
  ]).catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // background
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0B0B2B')
  bg.addColorStop(0.6, '#150D3A')
  bg.addColorStop(1, '#1A1040')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 920, 50, W / 2, 920, 760)
  glow.addColorStop(0, 'rgba(255,190,90,0.22)')
  glow.addColorStop(1, 'rgba(212,175,55,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 220; i++) {
    ctx.globalAlpha = 0.25 + Math.random() * 0.7
    ctx.fillStyle = Math.random() < 0.2 ? '#F3DC8A' : '#FFF6DC'
    ctx.beginPath()
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2.2 + 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.1
  const mandala = await loadSvg(mandalaMarkup())
  ctx.drawImage(mandala, W / 2 - 600, 920 - 600, 1200, 1200)
  ctx.globalAlpha = 1

  // title
  ctx.textAlign = 'center'
  const tg = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0)
  tg.addColorStop(0, '#A8801F')
  tg.addColorStop(0.5, '#FFF3C4')
  tg.addColorStop(1, '#A8801F')
  ctx.fillStyle = tg
  ctx.shadowColor = 'rgba(212,175,55,0.55)'
  ctx.shadowBlur = 30
  ctx.font = '900 104px Cinzel'
  ctx.fillText('Mittu AI', W / 2, 165)
  ctx.shadowBlur = 0
  ctx.fillStyle = 'rgba(246,238,219,0.85)'
  ctx.font = '500 36px Poppins'
  ctx.fillText('Mittu bataega aapka bhavishya 🦜', W / 2, 228)

  // card
  const cw = 560
  const ch = 896
  const cx = (W - cw) / 2
  const cy = 470
  ctx.save()
  ctx.shadowColor = 'rgba(212,175,55,0.55)'
  ctx.shadowBlur = 70
  roundRect(ctx, cx, cy, cw, ch, 36)
  const face = ctx.createRadialGradient(W / 2, cy + ch * 0.38, 20, W / 2, cy + ch * 0.38, ch * 0.7)
  face.addColorStop(0, '#2C1F72')
  face.addColorStop(0.6, '#160F45')
  face.addColorStop(1, '#0E0A30')
  ctx.fillStyle = face
  ctx.fill()
  ctx.restore()
  ctx.strokeStyle = '#D4AF37'
  ctx.lineWidth = 6
  roundRect(ctx, cx + 18, cy + 18, cw - 36, ch - 36, 26)
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.7
  roundRect(ctx, cx + 36, cy + 36, cw - 72, ch - 72, 18)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.save()
  if (reversed) {
    ctx.translate(W / 2, cy + ch / 2)
    ctx.rotate(Math.PI)
    ctx.translate(-W / 2, -(cy + ch / 2))
  }
  ctx.fillStyle = '#D4AF37'
  ctx.font = '700 48px Cinzel'
  ctx.fillText(card.numeral, W / 2, cy + 110)
  const halo = ctx.createRadialGradient(W / 2, cy + 400, 10, W / 2, cy + 400, 250)
  halo.addColorStop(0, 'rgba(255,153,51,0.25)')
  halo.addColorStop(1, 'rgba(255,153,51,0)')
  ctx.fillStyle = halo
  ctx.fillRect(cx, cy + 150, cw, 500)
  const art = await loadSvg(cardArtSvg(card.id, { size: 460 }))
  ctx.shadowColor = 'rgba(212,175,55,0.5)'
  ctx.shadowBlur = 16
  ctx.drawImage(art, W / 2 - 230, cy + 170, 460, 460)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#F3DC8A'
  ctx.font = '700 44px Cinzel'
  ctx.fillText(card.en.toUpperCase(), W / 2, cy + 710)
  ctx.fillStyle = '#FF9933'
  ctx.font = '60px "Tiro Devanagari Hindi"'
  ctx.fillText(card.hi, W / 2, cy + 800)
  ctx.restore()

  // Mittu perched on the card's top-right corner
  const mittuMarkup = renderToStaticMarkup(createElement(MittuSvg, { mode: 'idle', size: 280, still: true }))
  const mittu = await loadSvg(mittuMarkup)
  ctx.drawImage(mittu, cx + cw - 175, cy - 228, 280, 280)

  // name line
  ctx.fillStyle = '#F6EEDB'
  ctx.font = '700 46px Cinzel'
  ctx.fillText(`${card.en} — ${card.hiRoman}${reversed ? ' (Ulta)' : ''}`, W / 2, cy + ch + 90)

  // quote box
  ctx.font = 'italic 400 44px Poppins'
  const lines = wrap(ctx, `“${reading.shareLine || reading.message}”`, 860).slice(0, 3)
  const boxH = 70 + lines.length * 62
  const by = cy + ch + 140
  roundRect(ctx, 80, by, W - 160, boxH, 36)
  ctx.fillStyle = 'rgba(20,13,58,0.85)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(212,175,55,0.85)'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#F3DC8A'
  lines.forEach((l, i) => ctx.fillText(l, W / 2, by + 78 + i * 62))

  // footer
  ctx.fillStyle = 'rgba(246,238,219,0.75)'
  ctx.font = '500 34px Poppins'
  ctx.fillText('Apna card Mittu AI se nikaalo ✨', W / 2, H - 120)
  ctx.fillStyle = 'rgba(246,238,219,0.5)'
  ctx.font = '400 28px Poppins'
  ctx.fillText('Sirf manoranjan ke liye 🦜', W / 2, H - 70)

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

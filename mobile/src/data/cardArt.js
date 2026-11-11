// Card art as SVG strings (shared with prototype-web). Rendered with react-native-svg SvgXml. ORIGINAL art, consistent
// gold line style; placeholder until the 22 illustrated WebP cards + card back are on R2 (guide 07).
// Symbolic line-art for each Major Arcana card, as SVG markup (viewBox 0 0 100 100).
// Strings (not JSX) so the same art renders in the app and on the share-image canvas.
// Palette: gold line work with saffron / emerald / moonlight accents. No <defs> needed.

const G = '#D4AF37'
const S = '#FF9933'
const E = '#2ECC71'
const M = '#F7E7B0' // moonlight cream
const I = '#2A1E66' // indigo fill
const W = '#7FD3FF' // water

const f = (n) => +n.toFixed(2)

function rays(cx, cy, r1, r2, n, rot = 0, w = 1.2, color = G) {
  let d = ''
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2
    d += `M${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)}L${f(cx + Math.cos(a) * r2)} ${f(cy + Math.sin(a) * r2)}`
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${w}"/>`
}

function star(cx, cy, R, r, n = 5, fill = G, rot = -Math.PI / 2) {
  let pts = ''
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 ? r : R
    const a = rot + (i / (n * 2)) * Math.PI * 2
    pts += `${f(cx + Math.cos(a) * rad)},${f(cy + Math.sin(a) * rad)} `
  }
  return `<polygon points="${pts.trim()}" fill="${fill}" stroke="none"/>`
}

const crescent = (cx, cy, r, fill = M) =>
  `<path d="M${cx} ${cy - r}A${r} ${r} 0 1 0 ${cx} ${cy + r}A${f(r * 0.78)} ${r} 0 1 1 ${cx} ${cy - r}Z" fill="${fill}" stroke="none"/>`

const sparkles = (pts) => pts.map(([x, y, s = 2.2]) => star(x, y, s, s * 0.3, 4, M)).join('')

const heart = (x, y, s = 1, fill = S) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 8C-8 2-7-5-3-5C-1.4-5 0-3.6 0-2.4C0-3.6 1.4-5 3-5C7-5 8 2 0 8Z" fill="${fill}" stroke="none"/>`

const figure = (x, y, s = 1, fill = I) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="4.5" fill="${fill}"/><path d="M0 5L-7 24H7Z" fill="${fill}"/></g>`

const flower = (x, y, r = 3, fill = S) => {
  let p = ''
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    p += `<circle cx="${f(x + Math.cos(a) * r)}" cy="${f(y + Math.sin(a) * r)}" r="${f(r * 0.6)}" fill="${fill}" stroke="none" opacity=".9"/>`
  }
  return p + `<circle cx="${x}" cy="${y}" r="${f(r * 0.5)}" fill="${G}" stroke="none"/>`
}

const waves = (y, x1 = 10, x2 = 90, color = W) => {
  let d = `M${x1} ${y}`
  for (let x = x1; x < x2; x += 8) d += `q2-3 4 0t4 0`
  return `<path d="${d}" stroke="${color}" stroke-width="1.2" opacity=".8"/>`
}

export const CARD_ART = [
  // 0 The Fool
  `<circle cx="76" cy="22" r="8" fill="${S}"/>${rays(76, 22, 11, 15, 12)}
   <path d="M6 82Q30 78 60 81L66 96" /><path d="M60 81l6 4m-4 4l6 3" opacity=".6"/>
   <circle cx="38" cy="44" r="5" fill="${I}"/><path d="M38 49V66M38 66L31 79M38 66L46 78M38 54L28 50M38 54L48 48"/>
   <path d="M29 62L54 37" stroke="${S}"/><circle cx="55" cy="36" r="4.5" fill="${S}" stroke="none"/>
   ${flower(27, 49, 2.2, M)}${sparkles([[18, 24], [56, 16, 1.6], [86, 50, 1.8]])}`,
  // 1 The Magician
  `<path d="M50 18C44 10 33 12 33 18S44 26 50 18S67 10 67 18S56 26 50 18Z" stroke-width="1.8"/>
   <path d="M50 30V64" stroke-width="2.4"/>${star(50, 30, 5, 2, 8, S)}${rays(50, 30, 7, 11, 8, Math.PI / 8, 1)}
   <rect x="16" y="70" width="68" height="6" rx="1.5" fill="${I}"/>
   <path d="M22 70L24 61H33L35 70" fill="${I}"/><circle cx="47" cy="65.5" r="4.5" fill="${S}" stroke="none"/>${star(47, 65.5, 3, 1.2, 5, I)}
   <path d="M60 70L80 56M62 62l4 4"/><path d="M71 70V60" stroke="${E}" stroke-width="2"/>
   ${flower(18, 88, 2.5, S)}${flower(82, 88, 2.5, E)}${sparkles([[20, 30], [80, 34]])}`,
  // 2 The High Priestess
  `<rect x="14" y="22" width="13" height="66" rx="1" fill="#0B0B2B"/><rect x="73" y="22" width="13" height="66" rx="1" fill="${G}" fill-opacity=".25"/>
   <path d="M12 22H29M71 22H88M12 88H29M71 88H88"/>
   ${crescent(50, 26, 10)}<circle cx="50" cy="26" r="13" opacity=".35"/>
   <path d="M30 40Q50 48 70 40" stroke="${S}" opacity=".7"/>
   <rect x="40" y="52" width="20" height="24" rx="3" fill="${I}"/><path d="M44 58H56M44 63H56M44 68H52" opacity=".8"/>
   ${waves(92, 30, 70)}${sparkles([[50, 8, 1.6]])}`,
  // 3 The Empress
  `${Array.from({ length: 12 }, (_, i) => {
     const a = Math.PI + (i / 11) * Math.PI
     return star(50 + Math.cos(a) * 24, 34 + Math.sin(a) * 18, 2.4, 1, 6, i % 3 ? G : S)
   }).join('')}
   <circle cx="50" cy="52" r="11" fill="${E}" fill-opacity=".25" stroke-width="2"/><path d="M50 63V84M41 74H59" stroke-width="2"/>
   <path d="M18 92C18 78 22 66 26 58M24 70l-5-3m6 9l-6-2m7-10l-5-4M82 92C82 78 78 66 74 58M76 70l5-3m-6 9l6-2m-7-10l5-4" stroke="${S}"/>
   ${heart(50, 52, 0.7, S)}`,
  // 4 The Emperor
  `<rect x="26" y="32" width="48" height="54" rx="2" fill="${I}"/>
   <path d="M26 34c-9-1-12-12-4-15c6-2 8 6 3 8M74 34c9-1 12-12 4-15c-6-2-8 6-3 8" stroke="${S}" stroke-width="1.8"/>
   <circle cx="50" cy="48" r="6" stroke="${S}" stroke-width="2.4"/><path d="M50 54V76M42 61H58" stroke="${S}" stroke-width="2.4"/>
   <circle cx="66" cy="72" r="4" fill="${G}"/>${star(66, 72, 2, 0.8, 4, I)}
   <path d="M4 94L20 76L32 90L48 72L64 92L78 78L96 94" opacity=".8"/>`,
  // 5 The Hierophant
  `<path d="M36 40Q50 32 64 40L62 46H38Z" fill="${I}"/><path d="M38 32Q50 24 62 32M40 25Q50 17 60 25"/>
   <path d="M50 8V20M45 13H55" stroke="${S}" stroke-width="1.8"/>
   <path d="M30 88L58 60" stroke-width="2"/><circle cx="61" cy="57" r="4.5" stroke-width="2"/><path d="M35 83l4 4m0-8l4 4"/>
   <path d="M70 88L42 60" stroke="${S}" stroke-width="2"/><circle cx="39" cy="57" r="4.5" stroke="${S}" stroke-width="2"/><path d="M65 83l-4 4m0-8l-4 4" stroke="${S}"/>
   <path d="M12 20V92M88 20V92" opacity=".5"/><circle cx="12" cy="18" r="2.5" fill="${G}"/><circle cx="88" cy="18" r="2.5" fill="${G}"/>`,
  // 6 The Lovers
  `<circle cx="50" cy="16" r="7" fill="${S}"/>${rays(50, 16, 9.5, 13, 14)}
   <path d="M50 34C38 20 24 24 18 34C30 31 40 33 50 40C60 33 70 31 82 34C76 24 62 20 50 34Z" fill="${S}" fill-opacity=".25"/>
   ${figure(33, 56, 1.15)}${figure(67, 56, 1.15, '#3B2A86')}
   ${heart(50, 72, 1.1)}<path d="M26 92H74" opacity=".6"/>${sparkles([[16, 50], [84, 50]])}`,
  // 7 The Chariot
  `<path d="M20 32Q50 18 80 32" stroke-width="1.8"/>${[28, 39, 50, 61, 72].map((x, i) => star(x, 27 - (i === 2 ? 3 : i % 2 ? 1.5 : 0), 2.4, 1, 6, M)).join('')}
   <path d="M24 32V44M76 32V44"/><rect x="26" y="44" width="48" height="28" rx="3" fill="${I}"/>
   ${star(50, 58, 7, 3, 8, S)}<circle cx="32" cy="80" r="9"/><circle cx="68" cy="80" r="9"/>${rays(32, 80, 2, 9, 8)}${rays(68, 80, 2, 9, 8)}
   <path d="M10 70l8-8l4 8M90 70l-8-8l-4 8" stroke="${S}"/>`,
  // 8 Strength
  `<path d="M50 14C46 9 39 10 39 14S46 19 50 14S61 9 61 14S54 19 50 14Z"/>
   ${rays(50, 54, 17, 27, 22, 0, 1.6, S)}<circle cx="50" cy="54" r="16" fill="${S}" fill-opacity=".22" stroke-width="1.8"/>
   <circle cx="44" cy="50" r="1.8" fill="${G}"/><circle cx="56" cy="50" r="1.8" fill="${G}"/>
   <path d="M47 57L50 60L53 57ZM50 60V63M45 64Q50 68 55 64"/>
   ${flower(22, 88, 2.5, E)}${flower(50, 90, 2.5, S)}${flower(78, 88, 2.5, E)}<path d="M22 88Q36 94 50 90Q64 94 78 88" stroke="${E}"/>`,
  // 9 The Hermit
  `<path d="M4 92L26 62L40 80L58 52L96 92" opacity=".6"/>
   <path d="M54 34C44 38 42 66 44 90H70C72 66 66 38 54 34Z" fill="${I}"/><circle cx="56" cy="44" r="4" fill="#0B0B2B"/>
   <path d="M70 34L76 92" stroke-width="2"/>
   <path d="M30 40H42M31 40L33 56H39L41 40M33 56L36 60L39 56" fill="${I}"/>${star(36, 48, 4, 1.6, 6, S)}
   <circle cx="36" cy="48" r="9" stroke="${S}" opacity=".35"/>${rays(36, 48, 11, 15, 8, 0, 1, S)}
   <path d="M44 52L36 40" opacity=".7"/>${sparkles([[78, 18], [20, 22, 1.6]])}`,
  // 10 Wheel of Fortune
  `<circle cx="50" cy="50" r="31" stroke-width="2"/><circle cx="50" cy="50" r="23"/>
   <circle cx="50" cy="50" r="8" fill="${S}"/>${rays(50, 50, 8, 23, 8)}
   ${Array.from({ length: 8 }, (_, i) => {
     const a = (i / 8) * Math.PI * 2 + Math.PI / 8
     return `<circle cx="${f(50 + Math.cos(a) * 27)}" cy="${f(50 + Math.sin(a) * 27)}" r="1.6" fill="${i % 2 ? E : G}"/>`
   }).join('')}
   ${[[12, 12], [88, 12], [12, 88], [88, 88]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${I}"/>${star(x, y, 2.5, 1, 4, M)}`).join('')}`,
  // 11 Justice
  `<path d="M50 22V86M38 92H62L50 84Z" stroke-width="1.8"/><path d="M44 22L50 14L56 22Z" fill="${S}"/>
   <path d="M18 34H82" stroke-width="2"/>
   <path d="M22 34L14 58M22 34L30 58M78 34L70 58M78 34L86 58" opacity=".85"/>
   <path d="M11 58Q22 68 33 58Z" fill="${S}" fill-opacity=".45"/><path d="M67 58Q78 68 89 58Z" fill="${E}" fill-opacity=".4"/>
   ${sparkles([[50, 8, 1.6]])}`,
  // 12 The Hanged Man
  `<path d="M16 10H84M24 10V92M76 10V92" stroke-width="2.2" stroke="${E}"/>
   <path d="M50 10V22" /><path d="M50 22V48M50 32L60 28L50 24" stroke-width="2"/>
   <path d="M50 48V68" stroke-width="2.6"/><path d="M50 52L42 62L50 66M50 52L58 62L50 66"/>
   <circle cx="50" cy="75" r="6" fill="${I}"/><circle cx="50" cy="75" r="11" stroke="${S}"/>${rays(50, 75, 13, 16, 12, 0, 1, S)}`,
  // 13 Death / Parivartan
  `<rect x="10" y="44" width="12" height="28" fill="${I}"/><rect x="78" y="44" width="12" height="28" fill="${I}"/>
   <path d="M10 44l3-4l3 4l3-4l3 4M78 44l3-4l3 4l3-4l3 4"/>
   <path d="M34 70A16 16 0 0 1 66 70Z" fill="${S}"/>${rays(50, 70, 19, 26, 14, Math.PI, 1.2)}
   <path d="M4 70H96" stroke-width="1.6"/>${waves(78, 14, 86)}
   ${flower(50, 88, 3.4, M)}<path d="M50 92V98" stroke="${E}"/>`,
  // 14 Temperance
  `<path d="M50 14L58 28H42Z" fill="${S}"/>
   <path d="M26 38L30 54H42L44 38Z" fill="${I}"/><path d="M58 64L60 80H72L76 64Z" fill="${I}"/>
   <path d="M42 44C56 46 62 52 64 64" stroke="${W}" stroke-width="2" stroke-dasharray="2 2.5"/>
   ${waves(90, 10, 60)}<path d="M74 92C74 84 78 80 80 74" stroke="${E}"/>${flower(80, 72, 2.4, S)}${flower(86, 80, 2, S)}
   ${sparkles([[20, 20], [80, 26]])}`,
  // 15 The Devil
  `<circle cx="50" cy="28" r="14"/>${star(50, 28, 12, 4.6, 5, S, Math.PI / 2)}
   <path d="M30 50C22 42 24 32 32 30M70 50C78 42 76 32 68 30" stroke-width="1.8"/>
   <rect x="38" y="62" width="24" height="14" fill="${I}"/>
   ${figure(22, 70, 0.8)}${figure(78, 70, 0.8)}
   ${[28, 33, 38].map((x) => `<ellipse cx="${x}" cy="${74 - (x - 28) * 0.2}" rx="2.6" ry="1.6"/>`).join('')}
   ${[62, 67, 72].map((x) => `<ellipse cx="${x}" cy="${72 + (x - 62) * 0.2}" rx="2.6" ry="1.6"/>`).join('')}`,
  // 16 The Tower
  `<path d="M38 94L41 34H59L62 94Z" fill="${I}"/><path d="M39 34V28H43V32H47V28H53V32H57V28H61V34"/>
   <rect x="47" y="46" width="6" height="9" rx="3" fill="${S}" stroke="none"/><rect x="47" y="66" width="6" height="9" rx="3" fill="${S}" stroke="none"/>
   <path d="M82 4L64 26H72L56 44" stroke="${S}" stroke-width="2.4"/>
   <path d="M60 20L66 14L72 18L68 24Z" fill="${G}"/>
   ${[[30, 40], [28, 58], [72, 50], [74, 68], [26, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${S}"/>`).join('')}`,
  // 17 The Star
  `${star(50, 28, 15, 5, 8, G)}${star(50, 28, 7, 2.5, 8, M)}
   ${[[20, 16], [80, 16], [16, 38], [84, 38], [28, 50], [72, 50], [50, 52]].map(([x, y]) => star(x, y, 3.2, 1.1, 8, M)).join('')}
   <path d="M30 66L34 58H42L44 66L40 72H34Z" fill="${I}"/><path d="M42 68C46 76 48 80 48 86" stroke="${W}" stroke-width="1.8"/>
   <path d="M70 66L66 58H58L56 66L60 72H66Z" fill="${I}"/><path d="M58 68C54 74 56 80 60 84" stroke="${W}" stroke-width="1.8"/>
   ${waves(88, 18, 82)}${waves(94, 26, 74)}`,
  // 18 The Moon
  `<circle cx="50" cy="26" r="15" stroke-width="1.8"/>${crescent(50, 26, 12)}${rays(50, 26, 17, 21, 16, 0, 1)}
   ${[[36, 46], [44, 50], [56, 50], [64, 46]].map(([x, y]) => `<path d="M${x} ${y - 3}Q${x + 2} ${y} ${x} ${y + 1.6}Q${x - 2} ${y} ${x} ${y - 3}Z" fill="${S}" stroke="none"/>`).join('')}
   <rect x="8" y="60" width="11" height="26" fill="${I}"/><rect x="81" y="60" width="11" height="26" fill="${I}"/>
   <path d="M8 60l5.5-6l5.5 6M81 60l5.5-6l5.5 6"/>
   <path d="M50 98C42 90 58 82 50 74C44 68 54 64 50 58" stroke-dasharray="3 2"/>${waves(92, 8, 40)}${waves(92, 60, 92)}`,
  // 19 The Sun
  `<circle cx="50" cy="40" r="16" fill="${S}" stroke-width="2"/>${rays(50, 40, 19, 28, 16)}${rays(50, 40, 19, 23, 16, Math.PI / 16, 1, S)}
   <circle cx="45" cy="37" r="1.6" fill="${I}" stroke="none"/><circle cx="55" cy="37" r="1.6" fill="${I}" stroke="none"/><path d="M44 44Q50 49 56 44" stroke="${I}" stroke-width="1.6"/>
   <path d="M8 78H92" stroke-width="1.6"/><path d="M8 78V72H92V78" opacity=".5"/>
   ${[20, 40, 60, 80].map((x) => `<path d="M${x} 92V82" stroke="${E}" stroke-width="1.6"/>${flower(x, 80, 3, S)}`).join('')}`,
  // 20 Judgement
  `${rays(80, 10, 6, 30, 10, Math.PI * 0.55, 0.8)}
   <path d="M78 12L42 38L45 42L80 18Z" fill="${G}" stroke="none"/><path d="M42 38L36 44L46 46Z" fill="${G}" stroke="none"/>
   <rect x="54" y="26" width="10" height="9" fill="${M}" stroke="none" transform="rotate(-35 59 30)"/>
   ${[24, 50, 76].map((x) => `<rect x="${x - 10}" y="82" width="20" height="8" rx="1" fill="${I}"/><circle cx="${x}" cy="66" r="4" fill="${I}"/><path d="M${x} 70V82M${x} 74L${x - 7} 64M${x} 74L${x + 7} 64"/>`).join('')}
   ${waves(95, 8, 92)}`,
  // 21 The World
  `<ellipse cx="50" cy="52" rx="20" ry="30" stroke="${E}" stroke-width="3" stroke-dasharray="4 2.2"/>
   <path d="M44 21L56 25M44 25L56 21M44 79L56 83M44 83L56 79" stroke="${S}" stroke-width="2"/>
   <circle cx="50" cy="38" r="4" fill="${I}"/><path d="M50 42V60M50 60L44 72M50 60L56 70L52 72M50 47L42 42M50 47L58 52" stroke-width="1.8"/>
   <path d="M42 50C46 56 56 46 60 54" stroke="${S}"/>
   ${[[12, 12], [88, 12], [12, 88], [88, 88]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="6" fill="${I}"/>${star(x, y, 3, 1.2, i % 2 ? 4 : 8, i % 2 ? S : M)}`).join('')}`,
]

export function cardArtSvg(id, { size = 100 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"><g fill="none" stroke="${G}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CARD_ART[id]}</g></svg>`
}

// ---------------------------------------------------------------- card back (ornate gold + indigo, parrot emblem)
export const PARROT_EMBLEM = `<g transform="translate(150 240)">
  <path d="M-6 30C-14 44-22 54-34 62C-22 58-10 50-2 38Z" fill="${G}" opacity=".85"/>
  <ellipse cx="0" cy="8" rx="17" ry="25" fill="${E}" transform="rotate(18)"/>
  <path d="M-10-6C2-8 10 6 6 26C4 34-2 40-6 42C-4 30-10 18-16 10C-17 2-15-4-10-6Z" fill="#169E54"/>
  <circle cx="10" cy="-22" r="14" fill="${E}"/>
  <path d="M-1-12Q4 0 18-1" stroke="#111" stroke-width="2" fill="none"/>
  <circle cx="14" cy="-25" r="3.6" fill="#FFF8E1"/><circle cx="15" cy="-25" r="2" fill="#111"/>
  <path d="M21-26C28-28 33-22 32-15C31-11 28-9 26-8C27-12 26-16 22-17Z" fill="#E53935"/>
</g>`

export function cardBackMarkup() {
  const lotus = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180
    return `<path d="M0 -58 C10 -72 10 -84 0 -96 C-10 -84 -10 -72 0 -58Z" fill="${G}" fill-opacity="${i % 2 ? 0.25 : 0.5}" transform="rotate(${(a * 180) / Math.PI})"/>`
  }).join('')
  const corner = (x, y, r) =>
    `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0C18 0 26 8 26 26M0 0C0 18 8 26 26 26" stroke="${G}" stroke-width="2" fill="none"/><circle cx="9" cy="9" r="4" fill="${S}"/><circle cx="26" cy="26" r="2.5" fill="${G}"/></g>`
  return `<rect width="300" height="480" rx="20" fill="url(#mittu-back-grad)"/>
  <rect width="300" height="480" rx="20" fill="url(#mittu-lattice)" opacity=".55"/>
  <rect x="10" y="10" width="280" height="460" rx="14" fill="none" stroke="${G}" stroke-width="3"/>
  <rect x="20" y="20" width="260" height="440" rx="10" fill="none" stroke="${G}" stroke-width="1.2" opacity=".7"/>
  ${corner(28, 28, 0)}${corner(272, 28, 90)}${corner(272, 452, 180)}${corner(28, 452, 270)}
  <g transform="translate(150 240)">${lotus}
    <circle r="56" fill="#120C3A" stroke="${G}" stroke-width="2.5"/>
    <circle r="48" fill="none" stroke="${G}" stroke-width="1" stroke-dasharray="2 4"/>
  </g>
  ${PARROT_EMBLEM}
  <g fill="${G}">${star(150, 70, 9, 3.5, 8, G)}${star(150, 410, 9, 3.5, 8, G)}</g>
  <path d="M90 70H130M170 70H210M90 410H130M170 410H210" stroke="${G}" stroke-width="1.4"/>`
}

// Shared <defs> for card backs (mounted once in the app).
export const CARD_DEFS = `<linearGradient id="mittu-back-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#241866"/><stop offset=".55" stop-color="#130D3D"/><stop offset="1" stop-color="#1E1250"/>
  </linearGradient>
  <pattern id="mittu-lattice" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="24" height="24" fill="none"/><path d="M0 0H24M0 0V24" stroke="${G}" stroke-width=".7" opacity=".45"/>
    <circle cx="12" cy="12" r="1.3" fill="${G}" opacity=".6"/>
  </pattern>`

// ---------------------------------------------------------------- mandala (background, very faint)
export function mandalaMarkup() {
  let out = ''
  const ring = (r, n, petalLen, w, opacity = 1) => {
    let g = ''
    for (let i = 0; i < n; i++) {
      g += `<path d="M0 ${-r} C${w} ${-r - petalLen * 0.4} ${w * 0.6} ${-r - petalLen * 0.9} 0 ${-r - petalLen} C${-w * 0.6} ${-r - petalLen * 0.9} ${-w} ${-r - petalLen * 0.4} 0 ${-r}Z" transform="rotate(${(360 / n) * i})"/>`
    }
    return `<g opacity="${opacity}">${g}</g>`
  }
  out += ring(20, 8, 26, 10)
  out += `<circle r="50" /><circle r="56" stroke-dasharray="1 5"/>`
  out += ring(58, 16, 34, 9)
  out += `<circle r="96"/><circle r="102"/>`
  out += ring(104, 24, 30, 7, 0.9)
  out += `<circle r="140" stroke-dasharray="2 6"/>`
  out += ring(144, 36, 40, 6, 0.8)
  out += `<circle r="190"/>`
  for (let i = 0; i < 48; i++) out += `<circle cx="0" cy="-200" r="3" transform="rotate(${7.5 * i})"/>`
  out += ring(210, 48, 26, 4, 0.7)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-250 -250 500 500"><g fill="none" stroke="${G}" stroke-width="1.4">${out}</g></svg>`
}

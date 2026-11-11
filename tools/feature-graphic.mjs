// Play feature graphic 1024x500 (no transparency, no prices) from the app's own art: Mittu (mobile/src/components/Mittu.tsx),
// card back, The Sun card face and the mandala (mobile/src/data/cardArt.js).   Run: node tools/feature-graphic.mjs
import { Resvg } from '@resvg/resvg-js';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = join(mkdtempSync(join(tmpdir(), 'mittu-')), 'cardArt.mjs');   // the app's .js is CommonJS-scoped; load a copy as ESM
copyFileSync(join(ROOT, 'mobile/src/data/cardArt.js'), tmp);
const { CARD_ART, CARD_DEFS, cardBackMarkup, mandalaMarkup } = await import(pathToFileURL(tmp).href);

const src = readFileSync(join(ROOT, 'mobile/src/components/Mittu.tsx'), 'utf8');
const L = {};
for (const m of src.matchAll(/(\w+): V\((['`])([\s\S]*?)\2\)/g)) L[m[1]] = m[3];
const bird = ['tail', 'feet', 'body', 'foldedWing', 'head', 'lowerBeak', 'upperBeak'].map((k) => L[k]).join('');

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const stars = Array.from({ length: 150 }, () =>
  `<circle cx="${(rnd() * 1024).toFixed(1)}" cy="${(rnd() * 500).toFixed(1)}" r="${(0.5 + rnd() * 1.3).toFixed(2)}" fill="#FFF6DC" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}"/>`).join('');
const mandala = mandalaMarkup().replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-250 -250 500 500">', '').replace(/<\/svg>$/, '');

// Card face (300x480 units), drawn like the app's CardFace: frame, numeral, art, English + Hindi names.
const face = `<rect width="300" height="480" rx="20" fill="url(#face)"/>
  <rect x="10" y="10" width="280" height="460" rx="14" fill="none" stroke="#D4AF37" stroke-width="3"/>
  <rect x="20" y="20" width="260" height="440" rx="10" fill="none" stroke="#D4AF37" stroke-width="1.2" opacity="0.7"/>
  <text x="150" y="66" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="26" fill="#D4AF37">XIX</text>
  <circle cx="150" cy="215" r="112" fill="#FF9933" opacity="0.10"/>
  <g transform="translate(35 100) scale(2.3)" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${CARD_ART[19]}</g>
  <text x="150" y="388" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="22" letter-spacing="2" fill="#F3DC8A">THE SUN</text>
  <line x1="95" y1="402" x2="205" y2="402" stroke="#D4AF37" stroke-width="1.5"/>
  <text x="150" y="438" text-anchor="middle" font-family="Nirmala UI, Mangal" font-size="27" fill="#FF9933">सूर्य</text>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<defs>${CARD_DEFS}
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0B2B"/><stop offset="1" stop-color="#1A1040"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFC15A" stop-opacity="0.45"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
  <radialGradient id="face" cx="0.5" cy="0.38" r="0.75"><stop offset="0" stop-color="#2C1F72"/><stop offset="0.6" stop-color="#160F45"/><stop offset="1" stop-color="#0E0A30"/></radialGradient>
</defs>
<rect width="1024" height="500" fill="url(#sky)"/>
${stars}
<g transform="translate(790 250) scale(1.25)" fill="none" stroke="#D4AF37" stroke-width="1.4" opacity="0.10">${mandala}</g>
<ellipse cx="795" cy="250" rx="250" ry="230" fill="url(#glow)"/>
<g transform="translate(655 100) rotate(-12) scale(0.60)">${cardBackMarkup()}</g>
<g transform="translate(740 76) rotate(5) scale(0.68)">${face}</g>
<g transform="translate(800 6) scale(1.25)">${bird}</g>
<text x="64" y="215" font-family="Georgia" font-weight="bold" font-size="96" fill="#F3DC8A">Mittu AI</text>
<text x="68" y="285" font-family="Segoe UI" font-size="36" fill="#F6EEDB">Tarot reading by a talking parrot</text>
<text x="68" y="345" font-family="Segoe UI" font-weight="bold" font-size="30" fill="#FF9933">Mittu bataega aapka bhavishya</text>
</svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 }, font: { loadSystemFonts: true }, background: '#0B0B2B' }).render().asPng();
writeFileSync(join(ROOT, 'store/feature-graphic-1024x500.png'), png);
console.log('saved store/feature-graphic-1024x500.png');

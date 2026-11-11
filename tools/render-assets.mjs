// Renders the app's bundled assets (run: node tools/render-assets.mjs from the repo root, or from tools/).
//   sounds  → mobile/assets/sounds/*.wav   (procedural, from prototype-web/src/audio/synth.js; 22.05 kHz mono 16-bit)
//   images  → mobile/assets/images/{icon,android-icon-foreground,splash-icon,favicon}.png, store/play-icon-512.png
// Mittu's art comes straight from mobile/src/components/Mittu.tsx, so the icon always matches the app.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOUNDS = join(ROOT, 'mobile/assets/sounds');
const IMAGES = join(ROOT, 'mobile/assets/images');
mkdirSync(SOUNDS, { recursive: true });
mkdirSync(IMAGES, { recursive: true });
mkdirSync(join(ROOT, 'store'), { recursive: true });

// ---------------------------------------------------------------- sounds
const synth = await import(pathToFileURL(join(ROOT, 'prototype-web/src/audio/synth.js')).href);

function wav({ channels, sampleRate }, { rate = 22050, gain = 1 } = {}) {
  const step = sampleRate / rate;
  const n = Math.floor(channels[0].length / step);
  const pcm = Buffer.alloc(44 + n * 2);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const a = Math.floor(i * step);
    const b = Math.max(a + 1, Math.floor((i + 1) * step));
    for (const ch of channels) for (let j = a; j < b; j++) s += ch[j];
    s = (s / (channels.length * (b - a))) * gain;
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(s * 32767))), 44 + i * 2);
  }
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + n * 2, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22); pcm.writeUInt32LE(rate, 24);
  pcm.writeUInt32LE(rate * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(n * 2, 40);
  return pcm;
}

for (const [name, opts] of [['whoosh'], ['flap'], ['shuffle'], ['chime'], ['squawk'], ['ambient', { rate: 16000 }]]) {
  const buf = wav(synth.SOUNDS[name](), opts);
  writeFileSync(join(SOUNDS, `${name}.wav`), buf);
  console.log(`sound ${name}.wav ${(buf.length / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------- images
const src = readFileSync(join(ROOT, 'mobile/src/components/Mittu.tsx'), 'utf8');
const layers = {};
for (const m of src.matchAll(/(\w+): V\((['`])([\s\S]*?)\2\)/g)) layers[m[1]] = m[3];
const bird = ['tail', 'feet', 'body', 'foldedWing', 'head', 'lowerBeak', 'upperBeak'].map((k) => {
  if (!layers[k]) throw new Error(`layer ${k} not found in Mittu.tsx`);
  return layers[k];
}).join('');

const headOnly = ['head', 'lowerBeak', 'upperBeak'].map((k) => layers[k]).join('');
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
const save = (file, svg, width) => {
  writeFileSync(file, png(svg, width));
  console.log(`image ${file.replace(ROOT, '')} ${width}px`);
};

// Icon: Mittu's head (guide 14), on a soft parrot-green field.
const HEAD_BOX = '66 12 80 80';
const iconSvg = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${bg ? `<defs><radialGradient id="bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D5EEDF"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/>` : ''}
  <svg x="${bg ? 132 : 232}" y="${bg ? 120 : 220}" width="${bg ? 760 : 560}" height="${bg ? 760 : 560}" viewBox="${HEAD_BOX}">${headOnly}</svg>
</svg>`;
save(join(IMAGES, 'icon.png'), iconSvg(true), 1024);
save(join(ROOT, 'store/play-icon-512.png'), iconSvg(true), 512);
save(join(IMAGES, 'android-icon-foreground.png'), iconSvg(false), 1024);   // inside the adaptive-icon safe zone
save(join(IMAGES, 'favicon.png'), iconSvg(true), 48);
save(join(IMAGES, 'splash-icon.png'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">${bird}</svg>`, 400);

// Mittu's artwork: a realistic Indian rose-ringed parakeet (Psittacula krameri, male), as SVG layers in one shared
// coordinate system (viewBox 0 0 160 160, facing right). Used by components/Mittu.tsx (each layer animated around its
// pivot) and by tools/feature-graphic.mjs. Plain JS (no TypeScript) so the Node tools can import it, like cardArt.js.
//
// Pivots the animation relies on (keep them if you redraw): near wing shoulder (80,92), far wing (84,88),
// tail root (80,114), head turns at the neck (96,72), eyelid at the brow (107,35.5), lower beak hinge (118,60).
// The eye stays centred at (107,44) so the eyelid layer covers it.
//
// Field marks: grass-green body, yellow-green underparts, blue-grey wash on the nape, black chin stripe running into a
// black neck ring with a rose-pink collar above it, pale yellow iris with an orange eye ring, deep red hooked upper
// beak with a dark tip, blackish lower beak, long graduated blue-green tail with yellow tips, grey zygodactyl feet.

const f = (n) => n.toFixed(1);

/** One feather: a slim lens from base to tip with a shaft line. */
function feather(bx, by, tx, ty, w, fill, edge = '#0B4A2A') {
  const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy);
  const nx = (-dy / len) * w, ny = (dx / len) * w;
  const mx = bx + dx * 0.55, my = by + dy * 0.55;
  return `<path d="M${bx} ${by}Q${f(mx + nx)} ${f(my + ny)} ${tx} ${ty}Q${f(mx - nx)} ${f(my - ny)} ${bx} ${by}Z" fill="${fill}" stroke="${edge}" stroke-width="0.5" stroke-opacity="0.6"/>`
    + `<path d="M${bx} ${by}L${tx} ${ty}" stroke="${edge}" stroke-width="0.45" stroke-opacity="0.45"/>`;
}

/** Rows of small scallops (feather edges) for texture; clipped by the caller. */
function scallops(x0, y0, cols, rows, dx, dy, color, opacity) {
  let d = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * dx + (r % 2 ? dx / 2 : 0), y = y0 + r * dy;
      d += `M${f(x)} ${f(y)}q${f(dx / 2)} ${f(dy * 0.7)} ${f(dx)} 0`;
    }
  }
  return `<path d="${d}" stroke="${color}" stroke-width="0.7" fill="none" opacity="${opacity}" stroke-linecap="round"/>`;
}

/** An open wing raised from the shoulder at (80,92): primaries, secondaries, then coverts on top. `dx, dy` shift the
 *  whole wing (the far wing sits a little behind and above). */
function openWing(dx, dy, ids, tone) {
  const primaries = [[18, 26], [12, 38], [10, 51], [13, 63], [19, 74]]
    .map(([tx, ty], i) => feather(50 + i * 2, 66 + i * 3, tx, ty, 6.2, `url(#${ids}p)`)).join('');
  const secondaries = [[27, 83], [36, 90], [46, 95], [57, 99]]
    .map(([tx, ty], i) => feather(60 + i * 3, 80 + i * 2, tx, ty, 5.6, `url(#${ids}s)`)).join('');
  return `<defs>
    <linearGradient id="${ids}p" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${tone[0]}"/><stop offset="0.55" stop-color="${tone[1]}"/><stop offset="1" stop-color="${tone[2]}"/></linearGradient>
    <linearGradient id="${ids}s" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[2]}"/></linearGradient>
    <linearGradient id="${ids}c" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${tone[3]}"/><stop offset="1" stop-color="${tone[0]}"/></linearGradient>
  </defs><g transform="translate(${dx} ${dy})">${primaries}${secondaries}
    <path d="M80 86C70 66 56 50 38 42C44 56 46 68 50 76C60 86 70 92 80 98Z" fill="url(#${ids}c)"/>
    <g fill="none" stroke="#0E6A38" stroke-width="0.7" opacity="0.5" stroke-linecap="round">
      <path d="M48 52q4 3 8 2M54 60q4 3 8 2M60 68q4 3 8 2M66 76q4 3 8 2M52 66q4 3 8 2M60 76q4 3 8 2M68 84q4 3 7 2"/></g>
    <path d="M74 88C62 72 50 60 42 50M72 94C60 84 52 78 48 72" stroke="#B8F5C8" stroke-width="0.8" fill="none" opacity="0.45"/></g>`;
}

export const MITTU_LAYERS = {
  // Far wing (only while flying): darker, a little behind and above the near one.
  farWing: openWing(10, -8, 'mfw', ['#137A42', '#145F5E', '#1B4F7E', '#1E9A52']),

  // Long graduated tail: two blue-green central feathers with yellow tips, shorter green outer ones, yellow underside.
  tail: `<defs>
    <linearGradient id="mtc" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1FA85A"/><stop offset="0.45" stop-color="#1F8F86"/><stop offset="0.85" stop-color="#2B78B5"/><stop offset="1" stop-color="#E8D86A"/></linearGradient>
    <linearGradient id="mto" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25B25F"/><stop offset="1" stop-color="#178A4C"/></linearGradient>
  </defs>`
    + feather(88, 118, 52, 156, 4.6, 'url(#mto)')
    + feather(84, 116, 38, 158, 4.8, 'url(#mto)')
    + `<path d="M84 114C76 124 70 134 60 146" stroke="#D9E87A" stroke-width="3" opacity="0.55" stroke-linecap="round"/>`
    + feather(80, 113, 22, 160, 5.4, 'url(#mtc)')
    + feather(82, 115, 28, 160, 5.2, 'url(#mtc)'),

  // Grey zygodactyl feet (two toes forward, two back) gripping the perch, with scale marks.
  feet: `<g stroke="#8E8487" stroke-width="3.4" stroke-linecap="round" fill="none">
      <path d="M78 124q-1 6-6 10M78 124q2 7 0 12M78 124q4 4 9 5M78 124q-6 3-9 2"/>
      <path d="M94 126q-1 6-5 10M94 126q2 7 1 12M94 126q4 4 9 4M94 126q-5 3-8 3"/>
    </g>
    <g stroke="#6E6366" stroke-width="0.6" opacity="0.7"><path d="M76 129h3M75 132h3M92 131h3M91 134h3"/></g>
    <g fill="#3A3133"><circle cx="72" cy="134" r="0.9"/><circle cx="78" cy="136" r="0.9"/><circle cx="89" cy="136" r="0.9"/><circle cx="95" cy="138" r="0.9"/></g>`,

  // Body: green back, yellow-green breast, fine scalloped feather edges.
  body: `<defs>
    <radialGradient id="mbg" cx="0.68" cy="0.42" r="0.75"><stop offset="0" stop-color="#B6F08A"/><stop offset="0.35" stop-color="#6ADB6E"/><stop offset="0.75" stop-color="#2BB45E"/><stop offset="1" stop-color="#16884A"/></radialGradient>
    <clipPath id="mbc"><ellipse cx="84" cy="94" rx="27" ry="36" transform="rotate(20 84 94)"/></clipPath>
  </defs>
    <ellipse cx="84" cy="94" rx="27" ry="36" fill="url(#mbg)" transform="rotate(20 84 94)"/>
    <g clip-path="url(#mbc)">${scallops(78, 70, 6, 9, 6, 6, '#2E9E55', 0.35)}</g>
    <path d="M100 78C106 92 106 108 98 122" stroke="#E4F7A0" stroke-width="2" fill="none" opacity="0.35" stroke-linecap="round"/>`,

  // Folded wing at rest: scalloped coverts, then dark primaries edged blue, reaching past the rump.
  foldedWing: `<defs>
    <linearGradient id="mwc" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#2DBE66"/><stop offset="1" stop-color="#1A9A52"/></linearGradient>
    <linearGradient id="mwp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17843F"/><stop offset="0.7" stop-color="#156B5F"/><stop offset="1" stop-color="#1E5A92"/></linearGradient>
    <clipPath id="mwk"><path d="M72 72C94 68 106 90 101 114C92 114 78 112 66 104C61 90 63 78 72 72Z"/></clipPath>
  </defs>`
    + feather(78, 92, 58, 140, 6.2, 'url(#mwp)', '#0A3F28')
    + feather(84, 96, 64, 142, 6, 'url(#mwp)', '#0A3F28')
    + feather(90, 100, 71, 140, 5.6, 'url(#mwp)', '#0A3F28')
    + feather(95, 104, 78, 134, 5, 'url(#mwp)', '#0A3F28')
    + `<path d="M72 72C94 68 106 90 101 114C92 114 78 112 66 104C61 90 63 78 72 72Z" fill="url(#mwc)"/>
    <g clip-path="url(#mwk)">${scallops(64, 76, 7, 5, 6.5, 6, '#127A40', 0.55)}</g>
    <path d="M67 104C79 110 90 113 101 114" stroke="#0E5A33" stroke-width="1" fill="none" opacity="0.6"/>`,

  // Head: green crown, blue-grey nape wash, lighter cheek, black chin stripe into the neck ring, rose collar,
  // pale yellow iris with an orange ring, and the dark mouth gap behind the beak.
  head: `<defs>
    <radialGradient id="mhg" cx="0.62" cy="0.38" r="0.75"><stop offset="0" stop-color="#8CF0A0"/><stop offset="0.5" stop-color="#3ACF72"/><stop offset="1" stop-color="#1A9E55"/></radialGradient>
    <radialGradient id="mhn" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#7FA9D8" stop-opacity="0.55"/><stop offset="1" stop-color="#7FA9D8" stop-opacity="0"/></radialGradient>
  </defs>
    <path d="M78 58C75 41 86 27 102 27C115 27 124 37 124 49C124 60 117 68 107 71C95 74 81 70 78 58Z" fill="url(#mhg)"/>
    <ellipse cx="86" cy="45" rx="13" ry="15" fill="url(#mhn)"/>
    <ellipse cx="108" cy="57" rx="9" ry="6.5" fill="#B9F2A6" opacity="0.45"/>
    <path d="M94 31q3 2 6 1M99 35q3 2 6 1M89 37q3 2 6 1M104 31q3 2 6 1M93 41q3 2 5 1" stroke="#22A85A" stroke-width="0.8" fill="none" opacity="0.6" stroke-linecap="round"/>
    <path d="M79 56Q83 68 96 72" stroke="#F48FB1" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M116 63Q112 71 104 72Q90 74 81 62" stroke="#151515" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="107" cy="44" r="5.4" fill="#F6C27A" stroke="#E2701A" stroke-width="1.4"/>
    <circle cx="107.4" cy="44.1" r="3.7" fill="#FFF1B8"/>
    <circle cx="107.8" cy="44.3" r="2" fill="#0E0E0E"/>
    <circle cx="108.8" cy="43.1" r="0.85" fill="#FFFFFF"/>
    <path d="M117 56L128 62L117 65Z" fill="#3A0A0A"/>`,

  // Red pagdi with a gold brooch and plume (storyboard "Meet Mittu"); drawn in head coordinates so it tilts with the head.
  turban: `<defs><linearGradient id="mtb" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#FF5A4A"/><stop offset="0.55" stop-color="#D32F2F"/><stop offset="1" stop-color="#8E1414"/></linearGradient></defs>
    <path d="M78 36C76 20 88 8 102 8C116 8 126 18 124 34C112 28 92 28 78 36Z" fill="url(#mtb)"/>
    <path d="M80 30C92 22 110 20 123 26M82 23C94 15 110 14 120 18M90 14C100 10 110 10 116 13" stroke="#7A0F0F" stroke-width="1.7" fill="none" opacity="0.75" stroke-linecap="round"/>
    <path d="M84 20C94 14 106 13 114 15" stroke="#FF9A8A" stroke-width="1.2" fill="none" opacity="0.6" stroke-linecap="round"/>
    <path d="M78 36C92 28 112 28 124 34L124 38C112 32 92 32 78 40Z" fill="#A61B1B"/>
    <path d="M116 18C115 12 118 6 123 3C121 9 121 13 118 18Z" fill="#F3DC8A"/>
    <circle cx="116" cy="22" r="4.4" fill="#D4AF37" stroke="#FFF0B8" stroke-width="0.8"/><circle cx="116" cy="22" r="1.9" fill="#2ECC71"/>`,

  // Eyelid for blinking (head green).
  lid: '<ellipse cx="107" cy="44" rx="8.8" ry="8.8" fill="#4FD486"/>',

  // Lower mandible: blackish red, opens on its hinge while Mittu talks.
  lowerBeak: `<path d="M117 59C122 60 127 62 127 66C125 70 120 70 116 66Z" fill="#3B0E10"/>
    <path d="M118 61C121 62 124 63 125 65" stroke="#8E2A2A" stroke-width="0.8" fill="none" opacity="0.7"/>`,

  // Upper mandible: deep red hook with a darker tip, a highlight along the ridge and a small nostril.
  upperBeak: `<defs><linearGradient id="mkb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF5A43"/><stop offset="0.55" stop-color="#D7262B"/><stop offset="1" stop-color="#8F1218"/></linearGradient></defs>
    <path d="M114 47C125 42 137 49 137 61C137 68 133 72 128 75C130 69 128 63 122 61C118 60 115 57 114 53Z" fill="url(#mkb)"/>
    <path d="M133 63C134 68 132 72 128 75C129 71 129 67 127 64Z" fill="#4A0B0E" opacity="0.65"/>
    <path d="M119 47C127 46 133 51 134 57" stroke="#FFB4A0" stroke-width="1.3" fill="none" opacity="0.65" stroke-linecap="round"/>
    <ellipse cx="117.6" cy="49.6" rx="1" ry="0.8" fill="#5A1414" opacity="0.8"/>`,

  // Near wing (only while flying).
  nearWing: openWing(0, 0, 'mnw', ['#1C9A50', '#1A7F6E', '#2A6FAE', '#3BCB70']),
};

/** Layers for a still picture of Mittu perched (cage, feature graphic). */
export const PERCHED = ['tail', 'feet', 'body', 'foldedWing', 'head', 'lowerBeak', 'upperBeak'];

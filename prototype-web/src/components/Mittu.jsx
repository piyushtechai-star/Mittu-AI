import { useEffect, useId, useRef } from 'react'

// Mittu, a rose-ringed parakeet drawn in SVG (viewBox 0 0 160 160, facing right).
// Modes: idle | fly | hover | pick | talk. `beak` is an optional MotionValue (0..1)
// that opens the lower mandible for lip-sync.
export function MittuSvg({ mode = 'idle', beak, size = 120, still = false, className = '' }) {
  const raw = useId()
  const p = `m${raw.replace(/[^a-zA-Z0-9]/g, '')}`
  const lowerBeak = useRef(null)

  useEffect(() => {
    if (!beak || !lowerBeak.current) return
    const apply = (v) => lowerBeak.current?.setAttribute('transform', `rotate(${(v * 26).toFixed(2)} 118 60)`)
    apply(beak.get())
    return beak.on('change', apply)
  }, [beak])

  const flying = mode === 'fly' || mode === 'hover' || mode === 'pick'

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={`mittu mode-${mode} ${still ? 'still' : ''} ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${p}-head`} cx="0.62" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#7CF2A4" />
          <stop offset="0.55" stopColor="#2ECC71" />
          <stop offset="1" stopColor="#169E54" />
        </radialGradient>
        <linearGradient id={`${p}-body`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#3EDB80" />
          <stop offset="0.6" stopColor="#25B862" />
          <stop offset="1" stopColor="#12884A" />
        </linearGradient>
        <linearGradient id={`${p}-wing`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#1FAE5E" />
          <stop offset="0.7" stopColor="#11834A" />
          <stop offset="1" stopColor="#2C7FB8" />
        </linearGradient>
        <linearGradient id={`${p}-tail`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22B45E" />
          <stop offset="0.6" stopColor="#1B9C78" />
          <stop offset="1" stopColor="#2C7FB8" />
        </linearGradient>
        <linearGradient id={`${p}-beak`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF6F4F" />
          <stop offset="0.6" stopColor="#E53935" />
          <stop offset="1" stopColor="#B71C1C" />
        </linearGradient>
      </defs>

      {/* far wing (flight only) */}
      <g className="m-wing-far" style={{ display: flying ? undefined : 'none' }}>
        <path
          d="M84 84C76 62 66 42 46 26C52 42 48 46 38 46C48 54 44 60 34 64C46 70 46 76 40 84C56 86 70 88 84 92Z"
          fill="#0E6E3D"
          opacity="0.9"
        />
      </g>

      {/* tail */}
      <g className="m-tail">
        <path d="M74 112C64 128 50 146 28 160C44 152 60 138 84 118Z" fill={`url(#${p}-tail)`} />
        <path d="M80 116C74 132 66 148 52 160C64 152 76 140 88 120Z" fill="#1A8F6A" />
      </g>

      {/* feet */}
      <g className="m-feet" style={{ display: flying ? 'none' : undefined }}>
        <path
          d="M77 126q-4 6-9 8M77 126q-1 7-3 10M77 126q4 5 8 6M93 128q-4 6-8 8M93 128q0 6-2 9M93 128q4 5 8 5"
          stroke="#8D8D8D"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* body */}
      <g className="m-body">
        <ellipse cx="84" cy="94" rx="27" ry="36" fill={`url(#${p}-body)`} transform="rotate(20 84 94)" />
        <ellipse cx="94" cy="100" rx="14" ry="25" fill="#9BF5B8" opacity="0.45" transform="rotate(20 94 100)" />

        {/* folded wing */}
        <g className="m-wing-fold" style={{ display: flying ? 'none' : undefined }}>
          <path
            d="M72 72C94 68 106 90 101 120C98 134 88 144 79 148C81 130 73 110 64 96C62 86 64 78 72 72Z"
            fill={`url(#${p}-wing)`}
          />
          <path d="M76 90C84 98 88 112 88 126M70 98C76 108 80 120 80 136" stroke="#7CEBA5" strokeWidth="1.4" fill="none" opacity="0.55" />
          <path d="M80 142C86 136 92 128 96 118" stroke="#3E8FD0" strokeWidth="2.4" fill="none" opacity="0.8" strokeLinecap="round" />
        </g>

        {/* head */}
        <g className="m-head">
          <circle cx="100" cy="50" r="23" fill={`url(#${p}-head)`} />
          <ellipse cx="88" cy="56" rx="10" ry="13" fill="#40C9B4" opacity="0.4" />
          {/* rose + black neck ring */}
          <path d="M79 57Q84 70 95 74" stroke="#F06292" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M80 61Q87 77 110 73" stroke="#1B1B1B" strokeWidth="3" fill="none" strokeLinecap="round" />
          {/* cheek blush */}
          <ellipse cx="110" cy="60" rx="5.5" ry="3.6" fill="#FF8FA3" opacity="0.55" />
          {/* eye */}
          <circle cx="107" cy="44" r="7.4" fill="#FFF8E1" stroke="#FFB300" strokeWidth="1.4" />
          <circle cx="108.6" cy="44.4" r="4" fill="#141414" />
          <circle cx="110.2" cy="42.6" r="1.5" fill="#fff" />
          <circle cx="106.6" cy="46.4" r="0.7" fill="#fff" opacity="0.8" />
          <ellipse className="m-lid" cx="107" cy="44" rx="8.6" ry="8.6" fill="#55DE8C" />
          {/* beak: mouth, lower (animated), upper */}
          <path d="M117 56L128 62L117 65Z" fill="#4A0D0D" />
          <g ref={lowerBeak}>
            <path d="M117 59C122 60 127 62 127 66C125 70 120 70 116 66Z" fill="#8E1B1B" />
          </g>
          <path
            d="M114 47C125 42 137 49 137 61C137 68 133 72 128 75C130 69 128 63 122 61C118 60 115 57 114 53Z"
            fill={`url(#${p}-beak)`}
          />
          <path d="M120 47C127 47 132 51 133 56" stroke="#FFB199" strokeWidth="1.4" fill="none" opacity="0.7" strokeLinecap="round" />
        </g>
      </g>

      {/* near wing (flight only) */}
      <g className="m-wing-near" style={{ display: flying ? undefined : 'none' }}>
        <path
          d="M80 86C70 62 56 40 30 22C40 40 34 46 22 46C34 56 30 62 18 66C32 72 34 78 26 86C44 88 62 92 80 98Z"
          fill={`url(#${p}-wing)`}
        />
        <path d="M76 88C62 72 48 58 34 50M74 92C58 82 44 76 30 76" stroke="#7CEBA5" strokeWidth="1.3" fill="none" opacity="0.5" />
      </g>
    </svg>
  )
}

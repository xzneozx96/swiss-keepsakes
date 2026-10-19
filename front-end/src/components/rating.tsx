import { RatingIcon } from '@/components/icons'

/** Five stars, filled up to the whole-number rating; the label carries the exact value. */
export function Stars({
  rating,
  label,
  size = 12,
}: {
  rating: number
  label: string
  size?: number
}) {
  return (
    <span aria-label={label} className="flex gap-0.5" role="img">
      {Array.from({ length: 5 }, (_, i) => (
        <RatingIcon
          key={i}
          aria-hidden
          className={i < Math.floor(rating) ? '' : 'opacity-25'}
          size={size}
          weight="Filled"
        />
      ))}
    </span>
  )
}

/** Almond-shaped leaf centred on 0,0, pointing up (rotated into place per leaf). */
const leaf = 'M0 -13 C 9.5 -7 9.5 7 0 13 C -9.5 7 -9.5 -7 0 -13 Z'

/**
 * Four big leaves on the outer side of the stem, fanning outwards, a top leaf, and
 * the lowest leaf lying across towards the curl (as in the Airbnb laurel).
 */
const leaves = [
  { x: 23, y: 12, r: 18 },
  { x: 12, y: 29, r: -42 },
  { x: 8, y: 47, r: -58 },
  { x: 11, y: 64, r: -72 },
  { x: 25, y: 75, r: 78 },
]

/**
 * Golden laurel branch (Airbnb "Guest favorite" pattern): glossy almond leaves on the
 * outer side of a stem that curls at the bottom, with a soft shadow. One SVG, mirrored
 * for the right side. Decorative: the words next to it carry the meaning.
 */
export function Laurel({
  side,
  className = '',
}: {
  side: 'start' | 'end'
  className?: string
}) {
  return (
    <svg
      aria-hidden
      className={`drop-shadow-[0_3px_3px_rgba(120,80,0,0.28)] ${side === 'end' ? '-scale-x-100' : ''} ${className}`}
      fill="none"
      viewBox="-2 0 44 92"
    >
      <defs>
        <radialGradient cx="0.32" cy="0.28" id="laurel-leaf" r="0.85">
          <stop offset="0" stopColor="#FFF4C2" />
          <stop offset="0.45" stopColor="#F0C548" />
          <stop offset="1" stopColor="#B9821A" />
        </radialGradient>
      </defs>
      <path
        d="M24 83 C 13 72, 10 48, 20 16"
        stroke="#C8901C"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <path
        d="M24 83 C 29 89, 37 86, 34 79"
        stroke="#C8901C"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      {leaves.map(({ x, y, r }) => (
        <path
          key={`${x}-${y}`}
          d={leaf}
          fill="url(#laurel-leaf)"
          transform={`translate(${x} ${y}) rotate(${r})`}
        />
      ))}
    </svg>
  )
}

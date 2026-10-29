const credits = [
  { label: '© swisstopo', href: 'https://www.swisstopo.admin.ch/' },
  { label: 'OpenFreeMap', href: 'https://openfreemap.org/' },
  { label: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
  { label: '© OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
]

/**
 * The four credits the map's data and imagery need, always written out (MapLibre's compact "i"
 * hides them). A translucent pill keeps the 11 px text legible on any photo.
 */
export function MapCredits({ className = '' }: { className?: string }) {
  return (
    <p className={`pointer-events-auto flex w-fit flex-wrap items-center gap-x-1.5 rounded-2xl bg-surface/85 px-2.5 py-0.5 text-[11px] leading-4 text-foreground/80 backdrop-blur-sm ${className}`} data-map-credits="">
      {credits.map((credit, i) => (
        <span key={credit.label} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className="text-muted">·</span>}
          <a className="outline-none hover:underline focus-visible:focus-ring" href={credit.href} rel="noreferrer" target="_blank">
            {credit.label}
          </a>
        </span>
      ))}
    </p>
  )
}

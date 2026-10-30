import { Button } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

const credits = [
  { label: '© swisstopo', href: 'https://www.swisstopo.admin.ch/' },
  { label: 'OpenFreeMap', href: 'https://openfreemap.org/' },
  { label: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
  { label: '© OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
]

const INTERACTIONS = ['pointerdown', 'wheel', 'keydown'] as const

/**
 * The four credits the map's data and imagery need. They show written out at first, so they are visible
 * without any interaction (the OpenStreetMap attribution guideline), and fold to a small round ⓘ button on
 * the first interaction with `watch` (a click, a tap, the wheel, a drag, a key). The button opens and closes
 * them again. A press on the credits themselves is the person choosing, so it leaves them as they are.
 * A translucent pill keeps the 11 px text legible on any photo. `watch` is the element whose first
 * interaction folds the credits: the map's container, or the frame the map sits in when the person
 * rarely touches the map itself.
 */
export function MapCredits({ className = '', watch }: { className?: string, watch?: React.RefObject<HTMLElement | null> }) {
  const { t } = useLocale()
  const [open, setOpen] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = watch?.current

    if (!target)
      return
    function onInteraction(event: Event) {
      if (!(event.target instanceof Node && rootRef.current?.contains(event.target)))
        setOpen(false)
      for (const name of INTERACTIONS)
        target?.removeEventListener(name, onInteraction, true)
    }

    for (const name of INTERACTIONS)
      target.addEventListener(name, onInteraction, { capture: true, passive: true })

    return () => {
      for (const name of INTERACTIONS)
        target.removeEventListener(name, onInteraction, true)
    }
  }, [watch])

  return (
    <div
      ref={rootRef}
      className={`pointer-events-auto flex w-fit items-end bg-surface/85 text-[11px] leading-4 text-foreground/80 backdrop-blur-sm ${open ? 'rounded-2xl ps-2.5' : 'rounded-full'} ${className}`}
      data-map-credits=""
    >
      {open && (
        <p className="flex flex-wrap items-center gap-x-1.5 self-center py-0.5">
          {credits.map((credit, i) => (
            <span key={credit.label} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-muted">·</span>}
              <a className="outline-none hover:underline focus-visible:focus-ring" href={credit.href} rel="noreferrer" target="_blank">
                {credit.label}
              </a>
            </span>
          ))}
        </p>
      )}
      <Button
        isIconOnly
        aria-expanded={open}
        aria-label={t('map.credits')}
        className="size-7 min-h-7 min-w-7 shrink-0 rounded-full text-foreground/80"
        size="sm"
        variant="ghost"
        onPress={() => setOpen(value => !value)}
      >
        <InfoIcon size={16} />
      </Button>
    </div>
  )
}

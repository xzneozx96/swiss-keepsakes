import { Link } from '@tanstack/react-router'
import { useId } from 'react'

import { PickupIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { photoUrl } from '@/lib/photos'
import { aerialView } from '../lib/aerial'
import { SectionHeading } from './section-heading'
import { SortNotice } from './sort-notice'

const view = aerialView()

// A percentage as the browser keeps it: the server's HTML and the browser's style must read the same, or React reports a
// hydration mismatch (the browser keeps about six significant digits of a CSS number).
const pct = (value: number) => `${Math.round(value * 1e4) / 1e4}%`

/**
 * "First time in Lucerne?": the heading, one line, and a static aerial of the old town at 3:2 that is one link to the Map tab
 * (a picture, not a live map; no MapLibre on the home). The photos on it come from the shared photo library. Under it, the sort
 * notice: the sections below move with the answers, so the offer to sort sits above them (owner, 05.11.2026).
 */
export function MapInvitation() {
  const { t, language } = useLocale()
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 pt-4">
      <SectionHeading body={t('homePage.map.body')} id={headingId} title={t('homePage.map.title')} />
      <Link
        aria-label={t('homePage.map.action')}
        className="group relative block aspect-[3/2] w-full overflow-hidden rounded-2xl bg-charcoal shadow-surface outline-none focus-visible:focus-ring"
        params={{ lang: language }}
        to="/$lang/map"
      >
        {view.tiles.map(tile => (
          <img
            key={tile.key}
            alt=""
            aria-hidden
            className="absolute max-w-none"
            decoding="async"
            src={tile.src}
            style={{ left: pct(tile.left), top: pct(tile.top), width: pct(tile.width), height: pct(tile.height) }}
          />
        ))}
        {view.spots.map(spot => (
          <span
            key={spot.photo}
            aria-hidden
            className="absolute size-9 -translate-1/2 overflow-hidden rounded-full border-[3px] border-surface bg-charcoal shadow-overlay"
            style={{ left: pct(spot.left), top: pct(spot.top) }}
          >
            <img alt="" className="size-full object-cover" decoding="async" loading="lazy" src={photoUrl(spot.photo)} />
          </span>
        ))}
        <span aria-hidden className="absolute start-2 bottom-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] leading-4 text-white">{t('homePage.map.credit')}</span>
        <span
          aria-hidden
          className="absolute end-2.5 bottom-2.5 flex h-10 items-center gap-1.5 rounded-full bg-accent ps-3 pe-3.5 text-sm font-semibold text-accent-foreground shadow-overlay motion-safe:transition-transform group-active:scale-95"
        >
          <PickupIcon size={18} />
          {t('homePage.map.action')}
        </span>
      </Link>
      <SortNotice />
    </section>
  )
}

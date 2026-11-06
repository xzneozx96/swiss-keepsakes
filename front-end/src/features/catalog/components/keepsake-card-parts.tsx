import type { Language } from '@sk/domain/shared'
import type { ReactNode, UIEvent } from 'react'

import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { ArrowUpRightIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { photoUrl } from '@/lib/photos'
import { slideIndex, snapTrackClass } from '@/lib/snap-track'

/**
 * The partner's brand line under the store name on a keepsake card. A fixed word for now: the owner decided there is no brand
 * field (06.11.2026), so every card names Victorinox. When keepsakes get a brand, read it from the data and delete this.
 */
export const PARTNER_BRAND_LINE = 'Victorinox'

/**
 * The card's one link. Nothing inside is a control, so there is nothing else to tab to. `labelledBy` names the elements that
 * make up the link's accessible name, in reading order; left out, the name is all the text inside.
 */
export function CardLink({ slug, lang, className, labelledBy, children }: { slug: string, lang?: Language, className: string, labelledBy?: string, children: ReactNode }) {
  const { language } = useLocale()

  return (
    <Link
      aria-labelledby={labelledBy}
      className={`block outline-none focus-visible:focus-ring motion-safe:transition-transform motion-safe:active:scale-[0.985] ${className}`}
      draggable={false}
      params={{ lang: lang ?? language, slug }}
      to="/$lang/gifts/$slug"
    >
      {children}
    </Link>
  )
}

/** The red round ↗ at the end of a card. Decoration: the link itself is the control. */
export function RoundArrow({ size = 'md', off = false }: { size?: 'sm' | 'md', off?: boolean }) {
  const box = size === 'md' ? 'size-11' : 'size-9'

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full ${box} ${off ? 'bg-default text-muted' : 'bg-accent text-accent-foreground shadow-accent-lift'}`}
    >
      <ArrowUpRightIcon size={size === 'md' ? 20 : 17} />
    </span>
  )
}

/** The partner mark: a white circle with the red shield and cross, the home's Victorinox mark reversed. */
function BrandMark() {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface shadow-mark">
      <span className="relative inline-flex h-[17px] w-[15px] items-center justify-center rounded-t-[3px] rounded-b-[7px] bg-accent">
        <span className="absolute h-[8px] w-[2.5px] bg-accent-foreground" />
        <span className="absolute h-[2.5px] w-[8px] bg-accent-foreground" />
      </span>
    </span>
  )
}

/**
 * The partner block at the top left of a photo: the mark, the store name in bold over the brand line in muted. A card without a
 * store name keeps the brand: the line shows alone, in bold.
 */
export function PartnerBlock({ storeName, off }: { storeName?: string, off: boolean }) {
  return (
    <span className={`absolute start-3 top-3 flex items-center gap-2.5 ${off ? 'opacity-55 grayscale' : ''}`}>
      <BrandMark />
      <span className="flex flex-col">
        {storeName
          ? (
              <>
                <span className="text-[13px] leading-4 font-semibold text-foreground">{storeName}</span>
                <span className="text-[12px] leading-4 text-muted">{PARTNER_BRAND_LINE}</span>
              </>
            )
          : <span className="text-[13px] leading-4 font-semibold text-foreground">{PARTNER_BRAND_LINE}</span>}
      </span>
    </span>
  )
}

/** "Sold out" as words inside the link, so a screen reader reads it with the name. `id` lets the link's name point at it. */
export function SoldOutLabel({ id, children }: { id?: string, children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-[12px] leading-4 font-semibold text-background" id={id}>
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      {children}
    </span>
  )
}

interface PhotoStripProps {
  photos: string[]
  /** Size and radius of the tile, e.g. "aspect-[4/3] rounded-[22px]". */
  className: string
  /** The tile's colour, as a background class. */
  ground: string
  /** Padding around each photo inside its slide. */
  inset: string
  /** False draws the first photo only (a tile too small to swipe), with no scroller. */
  swipe?: boolean
  /** Multiplies the photo onto the tile, so the white of a cut-out takes the tile's colour. Only for `swipe={false}`. */
  blend?: boolean
  children?: ReactNode
}

const IMAGE_CLASS = 'max-h-full max-w-full object-contain select-none'

/**
 * The tile with the photos. Several photos swipe sideways with native scroll snap inside the card's one link: a tap opens the
 * keepsake, a swipe scrolls (the browser cancels the click). The strip is out of the tab order and hidden from screen readers,
 * and the dots are decoration. Snap is the guest's own gesture, so reduced motion only needs the dots not to animate.
 * Slides and dots are keyed by position: the API sends each photo once, but the same address may come twice.
 * A tile that does not swipe draws its photo straight on a `ground` box with no scroller, so `mix-blend-multiply` blends
 * against that colour: a scroll container is its own compositing layer and would blend against nothing.
 */
export function PhotoStrip({ photos, className, ground, inset, swipe = true, blend = false, children }: PhotoStripProps) {
  const [active, setActive] = useState(0)
  const shown = (swipe ? photos : photos.slice(0, 1)).flatMap(url => photoUrl(url) ?? [])
  const onScroll = (event: UIEvent<HTMLDivElement>) => setActive(slideIndex(event.currentTarget))
  const image = (url: string, extra = '') => (
    <img
      alt=""
      className={`${IMAGE_CLASS} ${extra}`}
      decoding="async"
      draggable={false}
      loading="lazy"
      src={url}
    />
  )

  return (
    <div className={`relative isolate overflow-hidden ${ground} ${className}`}>
      {swipe
        ? (
            <div
              aria-hidden
              className={`absolute inset-0 ${snapTrackClass}`}
              data-strip
              tabIndex={-1}
              onScroll={shown.length > 1 ? onScroll : undefined}
            >
              {shown.map((url, index) => (

                <div key={index} className={`flex h-full w-full shrink-0 snap-center items-center justify-center ${inset}`}>
                  {image(url)}
                </div>
              ))}
            </div>
          )
        : shown[0] && (
          <div aria-hidden className={`absolute inset-0 flex items-center justify-center ${inset} ${ground}`}>
            {image(shown[0], blend ? 'mix-blend-multiply' : '')}
          </div>
        )}
      {shown.length > 1 && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface/85 px-2 py-1.5"
          data-dots
        >
          {shown.map((_, index) => (
            <span

              key={index}
              className={`h-1.5 rounded-full motion-safe:transition-all motion-safe:duration-300 ${index === active ? 'w-4 bg-foreground' : 'w-1.5 bg-foreground/25'}`}
              data-active={index === active || undefined}
            />
          ))}
        </span>
      )}
      {children}
    </div>
  )
}

import type { StoryView } from './discovery-home'
import type { ProductCardProps } from '@/features/catalog/components/product-card'

import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { ChevronRightIcon } from '@/components/icons'
import { Media } from '@/components/media'
import { useLocale } from '@/contexts/locale-context'
import { useInView } from '@/hooks/use-in-view'
import { knifeArt } from '@/lib/victorinox-art'

const VICTORINOX_NAME_PREFIX = /^Victorinox /
const VICTORINOX_SLUG_PREFIX = /^victorinox-/

export interface VictorinoxShowcaseProps {
  eyebrow: string
  since: string
  title: string
  subtitle: string
  intro: string
  seeAll: string
  items: ProductCardProps[]
  story?: StoryView
  isLoading: boolean
  /** Hide the price line (PRD: no price before the product page). */
  hidePrice?: boolean
}

/** The ground of the section: a deep lake blue, so the cream tiles stand out without a harsh edge. */
const ground = 'bg-[#173f52]'

const fan = [
  { key: 'steamboat', rotate: -26 },
  { key: 'furka', rotate: -13 },
  { key: 'chapel-bridge', rotate: 0 },
  { key: 'finsterwald', rotate: 13 },
  { key: 'pilatus', rotate: 26 },
]

/** "victorinox-swan" is the product slug; the art is keyed by "swan". */
const artKey = (slug: string) => slug.replace(VICTORINOX_SLUG_PREFIX, '')

/**
 * The Victorinox section on C01: the shop's partner as the page's one full-bleed showpiece.
 * An oversized wordmark with a fan of five knives rising over it, the brand line, then all
 * twelve designs on cream tiles of one height, a link to the full list and the brand story.
 */
export function VictorinoxShowcase({
  eyebrow,
  since,
  title,
  subtitle,
  intro,
  seeAll,
  items,
  story,
  isLoading,
  hidePrice = false,
}: VictorinoxShowcaseProps) {
  const { language } = useLocale()
  const [fanRef, fanSeen] = useInView<HTMLDivElement>()

  return (
    <section
      aria-labelledby="victorinox"
      className={`relative isolate -mx-4 overflow-hidden ${ground} pt-7 pb-8 text-white`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 -z-10 h-[360px] bg-[radial-gradient(closest-side,#3f86a3_0%,#2a6580aa_45%,transparent_75%)]"
      />
      <div className="flex items-center justify-between px-4 text-xs font-semibold tracking-[0.18em] uppercase">
        <p className="flex items-center gap-2">
          <span
            aria-hidden
            className="relative inline-flex h-3.5 w-3 items-center justify-center rounded-t-[3px] rounded-b-[6px] bg-white"
          >
            <span className="absolute h-[7px] w-[2px] bg-accent" />
            <span className="absolute h-[2px] w-[7px] bg-accent" />
          </span>
          {eyebrow}
        </p>
        <span>{since}</span>
      </div>

      <div className="relative mt-4 h-[330px]">
        <h2
          className="absolute inset-x-0 top-0 text-center font-serif text-[76px] leading-none tracking-[-0.03em]"
          id="victorinox"
        >
          {title}
        </h2>
        <div
          ref={fanRef}
          aria-hidden
          className="absolute inset-x-0 top-[70px] h-[260px]"
        >
          {fan.map(({ key, rotate }, i) => (
            <img
              key={key}
              alt=""
              className={`absolute top-0 left-1/2 h-[230px] origin-[50%_150%] drop-shadow-[0_10px_14px_rgba(0,20,30,0.5)] ${
                fanSeen
                  ? 'motion-safe:animate-[vx-rise_700ms_cubic-bezier(0.2,0.8,0.2,1)_both]'
                  : 'motion-safe:opacity-0'
              }`}
              decoding="async"
              loading="lazy"
              src={knifeArt[key]}
              style={{
                transform: `translateX(-50%) rotate(${rotate}deg)`,
                animationDelay: `${i * 70}ms`,
                zIndex: 10 - Math.abs(i - 2),
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 px-4">
        <p className="font-serif text-title text-balance">{subtitle}</p>
        <p className="text-body text-pretty text-white/85">{intro}</p>
      </div>

      <div
        aria-label={title}
        className="mt-6 overflow-x-auto [scrollbar-width:none]"
        role="region"
      >
        <ul className="flex snap-x snap-mandatory scroll-px-4 gap-3 px-4 pt-1 pb-2">
          {isLoading
            ? [0, 1, 2].map(i => (
                <li
                  key={i}
                  className="h-[17.5rem] w-36 shrink-0 animate-pulse rounded-2xl bg-white/10"
                />
              ))
            : items.map(item => (
                <li key={item.slug} className="flex w-36 shrink-0 snap-start">
                  <Link
                    className="flex w-full flex-col gap-2 rounded-2xl bg-white p-2 pb-3 text-foreground outline-none select-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#173f52] active:opacity-85"
                    params={{ lang: language, slug: item.slug }}
                    to="/$lang/gifts/$slug"
                  >
                    <span className="flex h-44 items-center justify-center rounded-xl bg-hero-cream">
                      <img
                        alt=""
                        className="h-40 -rotate-6 drop-shadow-[0_8px_10px_rgba(0,0,0,0.25)]"
                        decoding="async"
                        loading="lazy"
                        src={knifeArt[artKey(item.slug)]}
                      />
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5 px-1">
                      <span className="line-clamp-2 min-h-[2.5em] text-sm leading-tight font-semibold">
                        {item.name.replace(VICTORINOX_NAME_PREFIX, '')}
                      </span>
                      {!hidePrice && (
                        <span className="mt-auto pt-0.5 text-label text-muted">
                          {item.fromLabel}
                          {' '}
                          <span className="font-semibold text-foreground">
                            {item.price}
                          </span>
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-col gap-4 px-4">
        {/* Same treatment as the home's "Show all {count} stories" and "Show all {count} reviews". */}
        <Link
          className={`${buttonVariants({ variant: 'secondary', size: 'lg', fullWidth: true })} transition-transform focus-visible:ring-offset-[#173f52] active:scale-[0.98]`}
          search={{ subcategory: 'victorinox' }}
          to="/$lang/gifts"
          params={{ lang: language }}
        >
          {seeAll}
        </Link>

        {story && (
          <Link
            className="flex min-h-11 items-center gap-3 rounded-2xl py-1 outline-none focus-visible:ring-2 focus-visible:ring-white active:opacity-80"
            params={{ lang: language, slug: story.slug }}
            to="/$lang/stories/$slug"
          >
            <Media
              alt=""
              className="size-16 shrink-0 rounded-2xl"
              photo={story.photo}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-serif text-card-title text-balance">
                {story.title}
              </span>
              <span className="text-label text-white/75">{story.meta}</span>
            </span>
            <ChevronRightIcon className="shrink-0 text-white/75" size={18} />
          </Link>
        )}
      </div>
    </section>
  )
}

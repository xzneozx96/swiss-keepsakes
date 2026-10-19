import { Link } from '@tanstack/react-router'

import heroPhoto from '@/assets/photos/lucerne-kapellbruecke-1200.jpg'
import { SearchIcon } from '@/components/icons'
import { BrandLogo } from '@/components/layout/brand-logo'
import { CartButton, SearchButton } from '@/components/layout/cart-button'

interface HeroProps {
  appName: string
  hello: string
  title: string
  photoAlt: string
  /** Accessible name of the global search action. */
  searchLabel: string
  /** Text inside the big search box. */
  searchPrompt: string
}

/**
 * Discovery hero (Lab round 3, F3 "Sky fade", chosen 13.10.2026): app top row and a
 * greeting on the sky, the Luzerne skyline fading in below, and a big search box on
 * the water that opens global search, like the search icon in the top row.
 * The forwarded ref marks the hero's bottom edge for the collapsing header.
 */
export function Hero({ ref: endRef, appName, hello, title, photoAlt, searchLabel, searchPrompt }: HeroProps & { ref?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <section className="relative -mx-4 flex flex-col">
      <div className="bg-gradient-to-b from-hero-sky to-hero-sky/40">
        <div className="relative z-10 flex flex-col gap-2 px-4 pt-[calc(env(safe-area-inset-top,0px)+8px)]">
          <div className="flex h-12 items-center gap-2">
            <div className="min-w-0 flex-1">
              <BrandLogo label={appName} />
            </div>
            <SearchButton label={searchLabel} to="/search" />
            <CartButton />
          </div>
          <div className="flex flex-col gap-0.5 pt-1">
            <p className="text-sm text-muted">{hello}</p>
            <h1 className="font-serif text-[26px] leading-8 text-balance">
              {title}
            </h1>
          </div>
        </div>
        {/* Crop keeps the Water Tower and Pilatus; the shop sign on the left stays out. */}
        <img
          alt={photoAlt}
          className="-mt-6 h-[220px] w-full object-cover object-[62%_60%] [mask-image:linear-gradient(to_bottom,transparent,black_45%)]"
          decoding="async"
          fetchPriority="high"
          height={799}
          src={heroPhoto}
          width={1200}
        />
      </div>
      <Link
        className="relative z-10 mx-4 -mt-7 flex h-14 items-center gap-3 rounded-full bg-surface px-5 text-muted shadow-overlay outline-none transition-transform focus-visible:focus-ring active:scale-[0.98]"
        to="/search"
      >
        <SearchIcon className="shrink-0" size={22} />
        <span className="truncate text-body">{searchPrompt}</span>
      </Link>
      <div ref={endRef} aria-hidden className="h-px" />
    </section>
  )
}

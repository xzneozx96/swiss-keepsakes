/**
 * Lab, home: the shipped "Sky fade" hero (`features/discovery/components/hero.tsx`, chosen
 * 13.10.2026) inside the lab phone. Brand row with search, language and bag, the greeting and
 * headline on the sky, the Chapel Bridge fading in, and the search pill on the water that opens
 * the approved search (S2). The router-bound buttons of the real hero are plain buttons here.
 */
import type { Language } from '@/features/lab/home-data'
import type { HomeModel } from '@/features/lab/home-kit'

import brandLogo from '@/assets/brand/swiss-keepsakes-logo.png'
import heroPhoto from '@/assets/photos/lucerne-kapellbruecke-1200.jpg'
import { CartIcon, LanguageIcon, SearchIcon } from '@/components/icons'
import { copy } from '@/features/lab/home-data'

const words = {
  en: { hello: 'Grüezi and welcome!', title: 'Make yourself at home. I’ll show you the Luzerne I love.', language: 'Deutsch', cart: 'Cart' },
  de: { hello: 'Grüezi und herzlich willkommen!', title: 'Fühlen Sie sich wie zu Hause. Ich zeige Ihnen das Luzern, das ich liebe.', language: 'English', cart: 'Warenkorb' },
} as const

const round = 'flex size-11 shrink-0 items-center justify-center rounded-full bg-surface shadow-overlay outline-none focus-visible:focus-ring active:scale-95 motion-safe:transition-transform'

export function SkyHero({ home, language, onLanguage }: {
  home: HomeModel
  language: Language
  onLanguage: (language: Language) => void
}) {
  const c = copy[language]
  const w = words[language]
  const openSearch = () => home.setScreen({ kind: 'search' })

  return (
    <section aria-labelledby={home.headingId('hero')} className="relative flex flex-col" data-hero>
      <div className="bg-gradient-to-b from-hero-sky to-hero-sky/40">
        <div className="relative z-10 flex flex-col gap-2 px-4 pt-2">
          <div className="flex h-12 items-center gap-2">
            <div className="min-w-0 flex-1">
              <img alt="Swiss Keepsakes" className="h-auto max-h-11 w-full max-w-[200px] object-contain object-left" decoding="async" src={brandLogo} />
            </div>
            <button aria-label={c.searchLabel} className={round} type="button" onClick={openSearch}>
              <SearchIcon size={22} />
            </button>
            <button aria-label={w.language} className={round} type="button" onClick={() => onLanguage(language === 'en' ? 'de' : 'en')}>
              <LanguageIcon size={22} />
            </button>
            <button aria-label={w.cart} className={round} type="button" onClick={() => home.open(`/${language}/cart`)}>
              <CartIcon size={22} />
            </button>
          </div>
          <div className="flex flex-col gap-0.5 pt-1">
            <p className="text-sm text-muted">{w.hello}</p>
            <h1 className="font-serif text-[26px] leading-8 text-balance" id={home.headingId('hero')}>{w.title}</h1>
          </div>
        </div>
        <img
          alt={c.heroAlt}
          className="-mt-6 h-[220px] w-full object-cover object-[62%_60%] [mask-image:linear-gradient(to_bottom,transparent,black_45%)]"
          decoding="async"
          fetchPriority="high"
          height={799}
          src={heroPhoto}
          width={1200}
        />
      </div>
      <button
        aria-label={c.searchLabel}
        className="relative z-10 mx-4 -mt-7 flex h-14 items-center gap-3 rounded-full bg-surface px-5 text-start text-muted shadow-overlay outline-none focus-visible:focus-ring active:scale-[0.98] motion-safe:transition-transform"
        type="button"
        onClick={openSearch}
      >
        <SearchIcon className="shrink-0" size={22} />
        <span className="truncate text-body">{c.searchPlaceholder}</span>
      </button>
    </section>
  )
}

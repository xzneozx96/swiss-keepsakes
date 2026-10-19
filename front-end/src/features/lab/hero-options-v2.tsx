/**
 * Lab, round 2: simple discovery heroes after the owner's four app references (greeting,
 * short title, a search field, chips or tabs). Compared on #/lab/hero. Guests are not
 * signed in, so the greeting is "Grüezi" instead of a name and the cart takes the avatar
 * slot. Search fields, tabs and chips are inert here.
 */
import { BookingsIcon, PickupIcon, SearchIcon } from '@/components/icons'
import { CartButton } from '@/components/layout/cart-button'
import { photoUrl } from '@/lib/photos'

export interface HeroV2Props {
  language: 'en' | 'de'
  photoAlt: string
}

const copy = {
  en: {
    hello: 'Grüezi!',
    place: 'Luzerne',
    letsStart: 'Let\'s find your Luzerne keepsake',
    searchPlaceholder: 'Search gifts, tours, stories',
    what: 'Looking for',
    pickup: 'Pickup date',
    pickupValue: 'Tomorrow, 14 Oct',
    search: 'Search',
    explore: 'Explore',
    titleStart: 'A place you always',
    titleAccent: 'want to return to.',
    sub: 'Keepsakes from Luzerne makers, picked up in town.',
    plainTitle: 'Explore Luzerne like a local',
    types: ['Gifts', 'Tours', 'Stays', 'Experiences'],
  },
  de: {
    hello: 'Grüezi!',
    place: 'Luzern',
    letsStart: 'Finden Sie Ihr Andenken aus Luzern',
    searchPlaceholder: 'Geschenke und Touren suchen',
    what: 'Gesucht',
    pickup: 'Abholdatum',
    pickupValue: 'Morgen, 14. Okt.',
    search: 'Suchen',
    explore: 'Entdecken Sie',
    titleStart: 'Ein Ort, an den man',
    titleAccent: 'immer zurückkehren möchte.',
    sub: 'Andenken von Handwerkern aus Luzern, in der Stadt abgeholt.',
    plainTitle: 'Luzern entdecken wie die Einheimischen',
    types: ['Geschenke', 'Touren', 'Unterkünfte', 'Erlebnisse'],
  },
}

const typePhotos = ['gift-box', 'lucerne-old-town', 'stay', 'artisan-workshop']

function PlaceLine({ place }: { place: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-label text-muted">
      <PickupIcon size={14} />
      {place}
    </span>
  )
}

function SearchField({
  placeholder,
  trailing,
}: {
  placeholder: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex h-14 items-center gap-3 rounded-full bg-surface ps-5 pe-1.5 shadow-overlay">
      <SearchIcon className="shrink-0 text-muted" size={20} />
      <span className="min-w-0 flex-1 truncate text-body text-muted">
        {placeholder}
      </span>
      {trailing}
    </div>
  )
}

/** F · Greeting and search card (reference 1): coloured band, white card with tabs and a date. */
export function HeroSearchCard({ language }: HeroV2Props) {
  const c = copy[language]

  return (
    <section className="relative flex flex-col">
      <div className="flex flex-col gap-1 bg-gradient-to-b from-hero-sky to-hero-sky/40 px-4 pt-3 pb-20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5 pt-1">
            <p className="text-sm text-muted">{c.hello}</p>
            <h1 className="font-serif text-[26px] leading-8 text-balance">
              {c.letsStart}
            </h1>
          </div>
          <CartButton />
        </div>
      </div>
      <div className="relative z-10 mx-4 -mt-14 flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-overlay">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-default p-1 text-sm">
          {c.types.slice(0, 3).map((type, i) => (
            <span
              key={type}
              className={`flex h-9 items-center justify-center rounded-full truncate px-2 ${i === 0 ? 'bg-surface font-medium shadow-surface' : 'text-muted'}`}
            >
              {type}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-muted">{c.pickup}</span>
          <span className="flex h-11 items-center gap-2 rounded-xl bg-default px-3 text-sm">
            <BookingsIcon className="text-muted" size={18} />
            {c.pickupValue}
          </span>
        </div>
        <span className="flex h-12 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground">
          {c.search}
        </span>
      </div>
    </section>
  )
}

/** G · Two-weight title and tabs (reference 2): place line, "Explore / Luzerne", tab row. */
export function HeroTwoWeight({ language }: HeroV2Props) {
  const c = copy[language]

  return (
    <section className="flex flex-col gap-5 px-4 pt-3">
      <div className="flex items-center justify-between">
        <PlaceLine place={c.place} />
        <div className="flex gap-2">
          <span className="flex size-11 items-center justify-center rounded-full border border-border">
            <SearchIcon size={20} />
          </span>
          <CartButton />
        </div>
      </div>
      <h1 className="flex flex-col font-serif leading-none">
        <span className="text-[34px] text-muted">{c.explore}</span>
        <span className="text-[44px] font-semibold">{c.place}</span>
      </h1>
      <ul className="flex gap-5 overflow-x-auto border-b border-separator [scrollbar-width:none]">
        {c.types.map((type, i) => (
          <li
            key={type}
            className={`shrink-0 pb-2.5 text-sm ${i === 0 ? 'border-b-2 border-foreground font-medium' : 'text-muted'}`}
          >
            {type}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** H · Serif title over a soft photo (reference 3): two-tone title, faded photo, search pill. */
export function HeroSoftPhoto({ language, photoAlt }: HeroV2Props) {
  const c = copy[language]

  return (
    <section className="relative flex flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <PlaceLine place={c.place} />
        <CartButton />
      </div>
      <div className="flex flex-col gap-2 px-4 pt-3">
        <h1 className="font-serif text-display text-balance">
          {c.titleStart}
          {' '}
          <span className="text-info italic">{c.titleAccent}</span>
        </h1>
        <p className="max-w-[30ch] text-sm text-muted">{c.sub}</p>
      </div>
      <div className="relative -mt-4 h-[260px]">
        <img
          alt={photoAlt}
          className="absolute inset-0 size-full object-cover object-[62%_60%] [mask-image:linear-gradient(to_bottom,transparent,black_35%,black_70%,transparent)]"
          src={photoUrl('lucerne-kapellbruecke-1200')}
        />
      </div>
      <div className="relative z-10 -mt-10 px-4">
        <SearchField
          placeholder={c.searchPlaceholder}
          trailing={(
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <SearchIcon size={18} />
            </span>
          )}
        />
      </div>
    </section>
  )
}

/** I · Greeting, search and photo chips (reference 4): bold title, search field, type chips. */
export function HeroChips({ language }: HeroV2Props) {
  const c = copy[language]

  return (
    <section className="flex flex-col gap-5 pt-3">
      <div className="flex items-center justify-between px-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium">{c.hello}</span>
          <PlaceLine place={c.place} />
        </div>
        <CartButton />
      </div>
      <h1 className="px-4 text-[30px] leading-9 font-semibold tracking-tight text-balance">
        {c.plainTitle}
      </h1>
      <div className="px-4">
        <SearchField placeholder={c.searchPlaceholder} />
      </div>
      <ul className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {c.types.map((type, i) => (
          <li
            key={type}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-full ps-1.5 pe-4 text-sm ${i === 0 ? 'bg-foreground font-medium text-background' : 'bg-surface shadow-surface'}`}
          >
            <img
              alt=""
              className="size-8 rounded-full object-cover"
              src={photoUrl(typePhotos[i])}
            />
            {type}
          </li>
        ))}
      </ul>
    </section>
  )
}

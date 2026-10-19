/**
 * Lab: discovery-home hero options, compared on #/lab/hero. Each option keeps the real
 * top row (logo, global search, cart). To promote one into Hero it still needs the
 * forwarded end ref (collapsing bar) and -mx-4 against the home's side padding.
 * Rules: Swiss red only for actions; no live data except the Luzerne clock; EN + DE.
 * Stay-length chips are inert here; in the product they scroll to #quick and #tours.
 */
import { ArrowRightIcon, ClockIcon, PickupIcon } from '@/components/icons'
import { BrandLogo } from '@/components/layout/brand-logo'
import { CartButton, SearchButton } from '@/components/layout/cart-button'
import { photoUrl } from '@/lib/photos'

export interface HeroOptionProps {
  language: 'en' | 'de'
  appName: string
  title: string
  intro: string
  photoAlt: string
  searchLabel: string
  /** Local time in Luzerne, already formatted, e.g. "14:32". */
  localTime: string
}

const copy = {
  en: {
    place: 'Luzerne, Switzerland',
    localTime: 'local time',
    kicker: 'Welcome to Luzerne',
    stayQuestion: 'How long are you in Luzerne?',
    stays: [
      { label: 'A few hours', note: 'Gifts ready today or tomorrow' },
      { label: 'A few days', note: 'Walks and day trips' },
    ],
    steps: ['Choose a pickup date', 'The shop confirms', 'Then you pay'],
    short: 'Keepsakes from local makers, picked up in town.',
    gallery: [
      { photo: 'lucerne-kapellbruecke-1200', caption: 'Chapel Bridge' },
      { photo: 'lake-steamboat', caption: 'Lake Luzerne by steamboat' },
      { photo: 'pilatus', caption: 'Mount Pilatus' },
      { photo: 'lucerne-old-town', caption: 'The old town' },
    ],
    collage: ['Chapel Bridge', 'The lake', 'Pilatus'],
    browse: 'Browse gifts',
  },
  de: {
    place: 'Luzern, Schweiz',
    localTime: 'Ortszeit',
    kicker: 'Willkommen in Luzern',
    stayQuestion: 'Wie lange sind Sie in Luzern?',
    stays: [
      { label: 'Ein paar Stunden', note: 'Geschenke heute oder morgen' },
      { label: 'Ein paar Tage', note: 'Spaziergänge und Tagesausflüge' },
    ],
    steps: ['Abholdatum wählen', 'Der Laden bestätigt', 'Dann zahlen Sie'],
    short: 'Andenken von Handwerkern aus Luzern, in der Stadt abgeholt.',
    gallery: [
      { photo: 'lucerne-kapellbruecke-1200', caption: 'Kapellbrücke' },
      { photo: 'lake-steamboat', caption: 'Mit dem Dampfschiff über den See' },
      { photo: 'pilatus', caption: 'Pilatus' },
      { photo: 'lucerne-old-town', caption: 'Die Altstadt' },
    ],
    collage: ['Kapellbrücke', 'Der See', 'Pilatus'],
    browse: 'Geschenke ansehen',
  },
}

/** Hero photo filling its positioned parent; eager, since it is above the fold. */
function Photo({
  photo,
  alt,
  className = '',
}: {
  photo: string
  alt: string
  className?: string
}) {
  return (
    <img
      alt={alt}
      className={`absolute inset-0 size-full bg-hero-sky object-cover ${className}`}
      src={photoUrl(photo)}
    />
  )
}

function TopRow({
  appName,
  searchLabel,
  tone,
}: {
  appName: string
  searchLabel: string
  tone: 'floating' | 'glass'
}) {
  return (
    <div className="flex h-12 items-center gap-2">
      <div className="min-w-0 flex-1">
        <BrandLogo label={appName} />
      </div>
      <SearchButton label={searchLabel} to="/search" tone={tone} />
      <CartButton tone={tone} />
    </div>
  )
}

function PlaceChip({
  place,
  time,
  timeLabel,
  className = 'glass',
}: {
  place: string
  time: string
  timeLabel: string
  className?: string
}) {
  return (
    <p
      className={`inline-flex h-8 items-center gap-1.5 self-start rounded-full px-3 text-label ${className}`}
    >
      <PickupIcon size={14} />
      <span>{place}</span>
      <span aria-hidden>·</span>
      <span className="tabular-nums">{time}</span>
      <span className="sr-only">{timeLabel}</span>
    </p>
  )
}

function StepStrip({ steps }: { steps: string[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((step, i) => (
        <li key={step} className="flex flex-col gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background tabular-nums">
            {i + 1}
          </span>
          <span className="text-label leading-4 text-muted">{step}</span>
        </li>
      ))}
    </ol>
  )
}

/** A · Sky glass: full-bleed photo, logo over the sky, title and intro on a glass panel. */
export function HeroSkyGlass(p: HeroOptionProps) {
  const c = copy[p.language]

  return (
    <section className="relative h-[560px] overflow-hidden">
      <Photo
        alt={p.photoAlt}
        className="object-[62%_50%]"
        photo="lucerne-kapellbruecke-1200"
      />
      {/* Light sky wash so the dark logo stays readable. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/70 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent"
      />
      <div className="relative flex h-full flex-col px-4 pt-2 pb-4">
        <TopRow
          appName={p.appName}
          searchLabel={p.searchLabel}
          tone="floating"
        />
        <div className="glass mt-auto flex flex-col gap-3 rounded-3xl p-5 [text-shadow:0_1px_3px_rgb(0_0_0/0.35)]">
          <PlaceChip
            className="bg-white/20"
            place={c.place}
            time={p.localTime}
            timeLabel={c.localTime}
          />
          <h1 className="font-serif text-display text-balance">{p.title}</h1>
          <p className="text-body text-white/90">{p.intro}</p>
        </div>
      </div>
    </section>
  )
}

/** B · Photo card: logo row on the page ground, a rounded photo card with the title on it. */
export function HeroPhotoCard(p: HeroOptionProps) {
  const c = copy[p.language]

  return (
    <section className="flex flex-col gap-4 px-4 pt-2">
      <TopRow appName={p.appName} searchLabel={p.searchLabel} tone="floating" />
      <div className="relative h-[440px] overflow-hidden rounded-[28px] shadow-overlay">
        <Photo
          alt={p.photoAlt}
          className="object-[62%_50%]"
          photo="lucerne-kapellbruecke-1200"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 via-55% to-transparent"
        />
        <div className="absolute inset-x-0 top-0 p-4">
          <PlaceChip
            place={c.place}
            time={p.localTime}
            timeLabel={c.localTime}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 text-white">
          <h1 className="font-serif text-display text-balance">{p.title}</h1>
          <p className="text-sm text-white/85">{c.short}</p>
        </div>
      </div>
      <StepStrip steps={c.steps} />
    </section>
  )
}

/** C · Swipe gallery: title on the page ground, then a sideways gallery of Luzerne places. */
export function HeroGallery(p: HeroOptionProps) {
  const c = copy[p.language]

  return (
    <section className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-3 px-4">
        <TopRow
          appName={p.appName}
          searchLabel={p.searchLabel}
          tone="floating"
        />
        <p className="text-label font-medium tracking-wide text-muted uppercase">
          {c.kicker}
        </p>
        <h1 className="font-serif text-display text-balance">{p.title}</h1>
      </div>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none]">
        {c.gallery.map((slide, i) => (
          <li key={slide.photo} className="w-[86%] shrink-0 snap-start">
            <figure className="relative h-[340px] overflow-hidden rounded-3xl">
              <Photo
                alt={i === 0 ? p.photoAlt : slide.caption}
                className="object-[62%_50%]"
                photo={slide.photo}
              />
              <span className="glass absolute end-3 top-3 rounded-full px-2.5 py-1 text-[12px] font-medium tabular-nums">
                {i + 1} / {c.gallery.length}
              </span>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-12 font-serif text-[20px] leading-6 text-white">
                {slide.caption}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="px-4 text-body text-foreground/80">{p.intro}</p>
    </section>
  )
}

/** D · Collage: headline on the page ground over a three-photo collage (journal feel). */
export function HeroCollage(p: HeroOptionProps) {
  const c = copy[p.language]
  const tiles = [
    { photo: 'lucerne-kapellbruecke-1200', label: c.collage[0] },
    { photo: 'lake-steamboat', label: c.collage[1] },
    { photo: 'pilatus', label: c.collage[2] },
  ]

  return (
    <section className="flex flex-col gap-4 bg-gradient-to-b from-hero-sky/60 via-hero-cream/60 to-background px-4 pt-2 pb-2">
      <TopRow appName={p.appName} searchLabel={p.searchLabel} tone="floating" />
      <h1 className="font-serif text-display text-balance">{p.title}</h1>
      <div className="grid h-[300px] grid-cols-[1.35fr_1fr] grid-rows-2 gap-2">
        {tiles.map((tile, i) => (
          <div
            key={tile.photo}
            className={`relative overflow-hidden rounded-2xl ${i === 0 ? 'row-span-2' : ''}`}
          >
            <Photo
              alt={i === 0 ? p.photoAlt : tile.label}
              className="object-[62%_50%]"
              photo={tile.photo}
            />
            <span className="glass absolute start-2 bottom-2 rounded-full px-2.5 py-1 text-[12px] font-medium">
              {tile.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-body text-foreground/80">{c.short}</p>
      <span className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-accent px-5 text-sm font-medium text-accent-foreground">
        {c.browse}
        <ArrowRightIcon size={16} />
      </span>
    </section>
  )
}

/** E · Trip planner: short photo, a white card overlapping it that asks about the stay. */
export function HeroPlanner(p: HeroOptionProps) {
  const c = copy[p.language]

  return (
    <section className="flex flex-col">
      <div className="relative h-[300px] overflow-hidden">
        <Photo
          alt={p.photoAlt}
          className="object-[62%_45%]"
          photo="lucerne-kapellbruecke-1200"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 via-55% to-transparent"
        />
        <div className="relative flex h-full flex-col px-4 pt-2 pb-20">
          <TopRow
            appName={p.appName}
            searchLabel={p.searchLabel}
            tone="floating"
          />
          <h1 className="mt-auto font-serif text-[28px] leading-8 text-balance text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.4)]">
            {p.title}
          </h1>
        </div>
      </div>
      <div className="relative z-10 mx-4 -mt-14 flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-overlay">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-heading">{c.stayQuestion}</h2>
          <span className="flex shrink-0 items-center gap-1 text-label text-muted tabular-nums">
            <ClockIcon size={14} />
            {p.localTime}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {c.stays.map(stay => (
            <button
              key={stay.label}
              className="flex min-h-11 flex-col items-start gap-0.5 rounded-2xl border border-border p-3 text-start outline-none focus-visible:focus-ring active:scale-[0.98]"
              type="button"
            >
              <span className="font-medium">{stay.label}</span>
              <span className="text-label leading-4 text-muted">
                {stay.note}
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-separator pt-3">
          <StepStrip steps={c.steps} />
        </div>
      </div>
    </section>
  )
}

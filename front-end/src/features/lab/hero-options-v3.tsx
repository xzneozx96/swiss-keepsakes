/**
 * Lab, round 3: variants of round 2's F (greeting band plus a white search card), the
 * direction the owner picked. Each varies the band or the card and adds a Luzerne photo.
 * Compared on /lab/hero. Tabs, fields and the Search button are inert here.
 */
import { BookingsIcon, PickupIcon } from '@/components/icons'
import { CartButton } from '@/components/layout/cart-button'
import { photoUrl } from '@/lib/photos'

export interface HeroV3Props {
  language: 'en' | 'de'
  photoAlt: string
}

const copy = {
  en: {
    hello: 'Grüezi!',
    title: 'Let\'s find your Luzerne keepsake',
    types: ['Gifts', 'Tours', 'Stays'],
    pickup: 'Pickup date',
    pickupValue: 'Tue, 14 Oct',
    where: 'Pickup in',
    whereValue: 'Old town',
    search: 'Search',
    place: 'Luzerne old town',
  },
  de: {
    hello: 'Grüezi!',
    title: 'Finden Sie Ihr Andenken aus Luzern',
    types: ['Geschenke', 'Touren', 'Unterkünfte'],
    pickup: 'Abholdatum',
    pickupValue: 'Di., 14. Okt.',
    where: 'Abholung in',
    whereValue: 'Altstadt',
    search: 'Suchen',
    place: 'Altstadt Luzern',
  },
}

const typePhotos = ['gift-box', 'lucerne-old-town', 'stay']

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof BookingsIcon
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-label text-muted">{label}</span>
      <span className="flex h-11 items-center gap-2 rounded-xl bg-default px-3 text-sm">
        <Icon className="shrink-0 text-muted" size={18} />
        <span className="truncate">{value}</span>
      </span>
    </div>
  )
}

/** The F card: tabs, fields and the red Search button; variants change tabs and fields. */
function SearchCard({
  language,
  tabs = 'segmented',
  twoFields = false,
  top,
}: {
  language: 'en' | 'de'
  tabs?: 'segmented' | 'photo'
  twoFields?: boolean
  /** Optional block above the tabs, e.g. a photo header. */
  top?: React.ReactNode
}) {
  const c = copy[language]

  return (
    <div className="relative z-10 mx-4 -mt-14 flex flex-col gap-4 overflow-hidden rounded-3xl bg-surface p-4 shadow-overlay">
      {top}
      {tabs === 'segmented'
        ? (
            <div className="grid grid-cols-3 gap-1 rounded-full bg-default p-1 text-sm">
              {c.types.map((type, i) => (
                <span
                  key={type}
                  className={`flex h-9 items-center justify-center truncate rounded-full px-2 ${i === 0 ? 'bg-surface font-medium shadow-surface' : 'text-muted'}`}
                >
                  {type}
                </span>
              ))}
            </div>
          )
        : (
            <div className="grid grid-cols-3 gap-2">
              {c.types.map((type, i) => (
                <span
                  key={type}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 pb-2 text-label ${i === 0 ? 'bg-default font-medium ring-2 ring-foreground' : 'text-muted'}`}
                >
                  <img
                    alt=""
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                    src={photoUrl(typePhotos[i])}
                  />
                  <span className="max-w-full truncate">{type}</span>
                </span>
              ))}
            </div>
          )}
      <div className="flex gap-2">
        <Field icon={BookingsIcon} label={c.pickup} value={c.pickupValue} />
        {twoFields && (
          <Field icon={PickupIcon} label={c.where} value={c.whereValue} />
        )}
      </div>
      <span className="flex h-12 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground">
        {c.search}
      </span>
    </div>
  )
}

function Greeting({
  language,
  onPhoto = false,
}: {
  language: 'en' | 'de'
  onPhoto?: boolean
}) {
  const c = copy[language]

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 pt-1">
        <p className={`text-sm ${onPhoto ? 'text-white/85' : 'text-muted'}`}>
          {c.hello}
        </p>
        <h1
          className={`font-serif text-[26px] leading-8 text-balance ${onPhoto ? 'text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.35)]' : ''}`}
        >
          {c.title}
        </h1>
      </div>
      <CartButton tone={onPhoto ? 'glass' : 'floating'} />
    </div>
  )
}

/** F1 · Photo band: the Chapel Bridge fills the band; greeting in white, card overlaps. */
export function HeroF1PhotoBand({ language, photoAlt }: HeroV3Props) {
  return (
    <section className="flex flex-col">
      <div className="relative h-[300px] overflow-hidden">
        <img
          alt={photoAlt}
          className="absolute inset-0 size-full object-cover object-[62%_55%]"
          src={photoUrl('lucerne-kapellbruecke-1200')}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 via-50% to-transparent"
        />
        <div className="relative px-4 pt-3">
          <Greeting language={language} onPhoto />
        </div>
      </div>
      <SearchCard language={language} />
    </section>
  )
}

/** F2 · Lake blue: a deep lake-blue band like the reference, the Chapel Bridge faint in it. */
export function HeroF2LakeBlue({ language }: HeroV3Props) {
  return (
    <section className="flex flex-col">
      <div className="relative overflow-hidden bg-gradient-to-b from-[#16467d] to-[#2a6db5] px-4 pt-3 pb-32">
        <img
          alt=""
          className="absolute inset-0 size-full object-cover object-[62%_60%] opacity-40 mix-blend-luminosity [mask-image:linear-gradient(to_bottom,transparent,black_55%)]"
          src={photoUrl('lucerne-kapellbruecke-1200')}
        />
        <div className="relative">
          <Greeting language={language} onPhoto />
        </div>
      </div>
      <SearchCard language={language} />
    </section>
  )
}

/** F3 · Sky fade: sky band, the Luzerne skyline fades in under the greeting, card on top. */
export function HeroF3SkyFade({ language, photoAlt }: HeroV3Props) {
  return (
    <section className="flex flex-col">
      <div className="relative bg-gradient-to-b from-hero-sky to-hero-sky/40">
        <div className="relative z-10 px-4 pt-3">
          <Greeting language={language} />
        </div>
        <img
          alt={photoAlt}
          className="-mt-6 h-[200px] w-full object-cover object-[62%_60%] [mask-image:linear-gradient(to_bottom,transparent,black_45%)]"
          src={photoUrl('lucerne-kapellbruecke-1200')}
        />
      </div>
      <SearchCard language={language} />
    </section>
  )
}

/** F4 · Photo tabs: plain sky band; the tabs become photo tiles, date and place side by side. */
export function HeroF4PhotoTabs({ language }: HeroV3Props) {
  return (
    <section className="flex flex-col">
      <div className="bg-gradient-to-b from-hero-sky to-hero-sky/40 px-4 pt-3 pb-20">
        <Greeting language={language} />
      </div>
      <SearchCard twoFields language={language} tabs="photo" />
    </section>
  )
}

/** F5 · Photo in the card: sky band; the card opens with a Luzerne photo and a place chip. */
export function HeroF5CardPhoto({ language, photoAlt }: HeroV3Props) {
  const c = copy[language]

  return (
    <section className="flex flex-col">
      <div className="bg-gradient-to-b from-hero-sky to-hero-sky/40 px-4 pt-3 pb-20">
        <Greeting language={language} />
      </div>
      <SearchCard
        language={language}
        top={(
          <div className="relative -mx-4 -mt-4 h-32">
            <img
              alt={photoAlt}
              className="absolute inset-0 size-full object-cover object-[62%_55%]"
              src={photoUrl('lucerne-kapellbruecke-1200')}
            />
            <span className="glass absolute start-3 bottom-3 inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-label">
              <PickupIcon size={14} />
              {c.place}
            </span>
          </div>
        )}
      />
    </section>
  )
}

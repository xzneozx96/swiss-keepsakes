/**
 * Lab data for the guest home (C01, slice S2) and search: the shelf rules, the ranker, event
 * labels, search matching and the EN and DE copy. The places are the S4 lab's pins
 * (`map-guest-data.ts`), so the home, the map and search show one city. Design only: no API.
 *
 * Section rules (the unit test `tests/lab-home-shelves.test.ts` locks them). The home is organised
 * around the guest's interests, with no overlap (owner decision, 2026-10-28):
 * - Sections: the five fixed interests, plus `free-useful` (items with the fixed `free` flag), plus
 *   a small `more` strip at the very end for an item that belongs to no section.
 * - An item belongs to the sections of its own interests, plus `free-useful` if `free` is true.
 *   Tours use their own interests, keepsakes belong to `shopping-keepsakes`. No interest and no
 *   free flag means `more`. An event whose last date has passed belongs nowhere.
 * - The default order is `DEFAULT_ORDER`. An answered visitor gets their first chosen interest
 *   (earliest in the default order), then `free-useful`, then their other chosen interests, then
 *   the rest in default order, then `more`. Nothing is hidden; an empty section is left out.
 * - An item is shown once, in the first section (in that visitor's order) it belongs to.
 * - Inside a section: events still ahead first, soonest first; then items whose stay tag matches
 *   the visitor's stay length (`both` or untagged match either); then the rest. Each group keeps
 *   the `rankItems` order. The stay length only orders items, it never makes or hides a section.
 */
import type { Answers, Interest, Language, Pin, Stay, Text } from '@/features/lab/map-guest-data'

import { calendarDay, dateTimeFormat, numberFormat } from '@sk/domain/shared'

import { stories as labStories, pickText, publicPins, todayHours } from '@/features/lab/map-guest-data'
import { copy as onboardingCopy } from '@/features/lab/onboarding-data'
import { LAB_NOW, LAB_TODAY } from '@/features/lab/pins-merchant-data'

export type { Answers, Language }

export type ItemKind = 'place' | 'story' | 'tour'

/** One card on the home: a pin (place or event), a story or a tour's free information. */
export interface HomeItem {
  id: string
  kind: ItemKind
  slug: string
  title: Text
  photo?: string
  stay?: Stay
  interests: Interest[]
  /** Fixed flag: free to use (water, toilets, SIM card, free facilities). Sends the item to `free-useful`. */
  free: boolean
  publishedAt: string
  /** The pin behind a place or event card. */
  pin?: Pin
  /** Reading time of a story. */
  minutes?: number
  /** Length of a tour, in hours. */
  hours?: number
}

/** A keepsake card: name and photo only. There is no price field on purpose (Q24, AC54). */
export interface Keepsake {
  slug: string
  photo: string
  name: Record<Language, string>
}

/** A count is only printed from this many on; below it the text says no number (owner rule, applies to every count on the home). */
export const MIN_COUNT = 5

// ---------------------------------------------------------------- copy

/** EN and DE copy for the home and search. Every German string here is a proposal. */
const en = {
  /** Working line: the brand name is still open (O01). */
  brand: 'Lucerne guide',
  title: 'What to see, eat and do in Lucerne',
  intro: 'Places on the map, the stories behind them and what’s on soon. Free, no account needed.',
  heroAlt: 'The Chapel Bridge and the Water Tower on the Reuss, with Pilatus behind',
  /** Section titles and promises are declarative and true for every visitor (the server HTML is the same for all). */
  sections: {
    'lake-mountains': {
      title: 'Lake and mountains',
      promise: 'Steamboats, Rigi, Pilatus and the lakefront.',
      short: 'Lake and mountains',
    },
    'free-useful': {
      title: 'Free and useful',
      promise: 'Drinking water, the free guest card and other things that cost nothing.',
      short: 'Free and useful',
    },
    'food-drink': {
      title: 'Food and drink',
      promise: 'Bakeries and places to eat that we would send a friend to.',
      short: 'Food and drink',
    },
    'local-activities': {
      title: 'Local activities',
      promise: 'Markets, concerts and what is happening around town.',
      short: 'Local activities',
    },
    'history-culture': {
      title: 'History and culture',
      promise: 'The old town’s monuments, walls and bridges, and the stories behind them.',
      short: 'History and culture',
    },
    'shopping-keepsakes': {
      title: 'Shopping and keepsakes',
      promise: 'Swiss Army Knives with a Lucerne design, from our shop.',
      short: 'Shopping and keepsakes',
    },
    'more': {
      title: 'More in Lucerne',
      promise: 'A few more things that fit none of the topics above.',
      short: 'More',
    },
  } satisfies Record<SectionId, { title: string, promise: string, short: string }>,
  keepsakesTitle: 'Something to take home',
  keepsakesPromise: 'Swiss Army Knives with a Lucerne design, from our shop.',
  keepsakesAction: 'See the keepsakes',
  /** The current home's AdviceBanner (layout J), with the pivot's wording. Captions as `home.advice.caption*`. */
  adviceBanner: {
    title: 'Not sure where to start? Ask us.',
    body: 'Tell us how many days you have in Lucerne and what you like. We’ll write back by e-mail with places that suit you.',
    action: 'Ask us where to go',
    captions: ['the lake', 'Pilatus', 'old town'] as [string, string, string],
  },
  mapTitle: 'The old town on one map',
  mapBody: (places: number, events: number) => places >= MIN_COUNT && events >= MIN_COUNT
    ? `${places} places and ${events} coming events, with opening hours and a link to directions`
    : 'Places and coming events, with opening hours and a link to directions',
  mapAction: 'Open the map',
  mapCredit: '© swisstopo',
  seeAll: (n: number) => n >= MIN_COUNT ? `See all ${n}` : 'See all',
  onMap: (n: number) => n === 1 ? 'Show it on the map' : n >= MIN_COUNT ? `Show these ${n} on the map` : 'Show them on the map',
  counts: {
    place: (n: number) => n === 1 ? '1 place' : `${n} places`,
    story: (n: number) => n === 1 ? '1 story' : `${n} stories`,
    tour: (n: number) => n === 1 ? '1 tour' : `${n} tours`,
    event: (n: number) => n === 1 ? '1 event' : `${n} events`,
  },
  kind: { place: 'Place', story: 'Story', tour: 'Tour route', keepsake: 'Keepsake', event: 'Event' },
  minRead: (minutes: number) => `${minutes} min read`,
  hours: (n: string) => `${n} h`,
  fromTime: (time: string) => `from ${time}`,
  when: { today: 'Today', tomorrow: 'Tomorrow', weekend: 'This weekend', date: '' } satisfies Record<When, string>,
  alsoOn: (dates: string) => `Also ${dates}`,
  onlyIn: { en: 'Only in English', de: 'Only in German' } satisfies Record<Language, string>,
  sortedFor: 'Sorted for',
  change: 'Change',
  newest: 'Newest first',
  personalise: 'Sort for my trip',
  back: 'Back',
  close: 'Close',
  loading: 'Loading the home…',
  // Language switch
  languageLabel: 'Language',
  otherLanguage: 'Deutsch',
  // Tab bar
  /** The product's own tab labels (`nav.*` in `i18n/en.ts`), with Map in the Tours slot (D5). */
  tabs: { explore: 'Explore', keepsakes: 'Keepsakes', assistant: 'Assistant', map: 'Map', account: 'Account' },
  tabBar: 'Main',
  // Map stand-in
  mapAll: (n: number) => n >= MIN_COUNT ? `All ${n} places` : 'All places',
  mapShelf: (title: string, n: number) => `${title}: ${n >= MIN_COUNT ? `${n} places` : 'places'} highlighted`,
  mapPeekAll: 'All',
  seeList: 'See the list',
  // Search
  searchLabel: 'Search sights, food, events, tours, stories and keepsakes',
  searchPlaceholder: 'Lion Monument, bakery, Rigi…',
  searchOpen: 'Search',
  groups: { place: 'Places on the map', story: 'Stories', tour: 'Tours', keepsake: 'Keepsakes' } satisfies Record<HitKind, string>,
  interestsTitle: 'Browse by interest',
  interests: { 'history-culture': 'History and culture', 'food-drink': 'Food and drink', 'lake-mountains': 'Lake and mountains', 'shopping-keepsakes': 'Shopping and keepsakes', 'local-activities': 'Local activities' } satisfies Record<Interest, string>,
  clearInterest: (label: string) => `Clear ${label}`,
  interestCount: (n: number, label: string) => n === 1 ? `1 result in ${label}` : `${n} results in ${label}`,
  filterAll: 'All',
  filterLabel: 'Filter results',
  resultCount: (n: number, query: string) => n === 1 ? `1 result for “${query}”` : `${n} results for “${query}”`,
  noResults: (query: string) => `Nothing for “${query}” yet`,
  noResultsHint: 'Try a place name, such as Kapellbrücke or Weinmarkt, or look around the map.',
  opensMap: 'Opens on the map',
  searching: 'Searching…',
  // Answers sheet (lab stand-in for N01's change mode)
  changeTitle: 'Your trip',
}

const de: typeof en = {
  brand: 'Luzern-Guide',
  title: 'Was Sie in Luzern sehen, essen und erleben können',
  intro: 'Orte auf der Karte, die Geschichten dazu und was bald läuft. Kostenlos, ohne Konto.',
  heroAlt: 'Die Kapellbrücke und der Wasserturm an der Reuss, dahinter der Pilatus',
  sections: {
    'lake-mountains': {
      title: 'See und Berge',
      promise: 'Dampfschiffe, Rigi, Pilatus und die Seepromenade.',
      short: 'See und Berge',
    },
    'free-useful': {
      title: 'Gratis und nützlich',
      promise: 'Trinkwasser, die Gästekarte und anderes, das nichts kostet.',
      short: 'Gratis und nützlich',
    },
    'food-drink': {
      title: 'Essen und Trinken',
      promise: 'Bäckereien und Lokale, die wir auch Freunden empfehlen.',
      short: 'Essen und Trinken',
    },
    'local-activities': {
      title: 'Lokale Aktivitäten',
      promise: 'Märkte, Konzerte und was in der Stadt läuft.',
      short: 'Lokale Aktivitäten',
    },
    'history-culture': {
      title: 'Geschichte und Kultur',
      promise: 'Denkmäler, Mauern und Brücken der Altstadt, und die Geschichten dazu.',
      short: 'Geschichte und Kultur',
    },
    'shopping-keepsakes': {
      title: 'Shopping und Andenken',
      promise: 'Schweizer Taschenmesser mit Luzerner Motiv, aus unserem Laden.',
      short: 'Shopping und Andenken',
    },
    'more': {
      title: 'Mehr in Luzern',
      promise: 'Ein paar weitere Dinge, die zu keinem der Themen oben passen.',
      short: 'Mehr',
    },
  },
  keepsakesTitle: 'Etwas für zu Hause',
  keepsakesPromise: 'Schweizer Taschenmesser mit Luzerner Motiv, aus unserem Laden.',
  keepsakesAction: 'Zu den Andenken',
  adviceBanner: {
    title: 'Wissen Sie nicht, wo anfangen? Fragen Sie uns.',
    body: 'Sagen Sie uns, wie viele Tage Sie in Luzern haben und was Ihnen gefällt. Wir antworten per E-Mail mit Orten, die zu Ihnen passen.',
    action: 'Fragen Sie uns, wohin es geht',
    captions: ['der See', 'Pilatus', 'Altstadt'],
  },
  mapTitle: 'Die Altstadt auf einer Karte',
  mapBody: (places: number, events: number) => places >= MIN_COUNT && events >= MIN_COUNT
    ? `${places} Orte und ${events} kommende Anlässe, mit Öffnungszeiten und Link zur Route`
    : 'Orte und kommende Anlässe, mit Öffnungszeiten und Link zur Route',
  mapAction: 'Karte öffnen',
  mapCredit: '© swisstopo',
  seeAll: (n: number) => n >= MIN_COUNT ? `Alle ${n} ansehen` : 'Alle ansehen',
  onMap: (n: number) => n === 1 ? 'Auf der Karte zeigen' : n >= MIN_COUNT ? `Diese ${n} auf der Karte zeigen` : 'Diese auf der Karte zeigen',
  counts: {
    place: (n: number) => n === 1 ? '1 Ort' : `${n} Orte`,
    story: (n: number) => n === 1 ? '1 Geschichte' : `${n} Geschichten`,
    tour: (n: number) => n === 1 ? '1 Tour' : `${n} Touren`,
    event: (n: number) => n === 1 ? '1 Anlass' : `${n} Anlässe`,
  },
  kind: { place: 'Ort', story: 'Geschichte', tour: 'Tourenroute', keepsake: 'Andenken', event: 'Anlass' },
  minRead: (minutes: number) => `${minutes} Min. Lesezeit`,
  hours: (n: string) => `${n} Std.`,
  fromTime: (time: string) => `ab ${time}`,
  when: { today: 'Heute', tomorrow: 'Morgen', weekend: 'Dieses Wochenende', date: '' },
  alsoOn: (dates: string) => `Auch ${dates}`,
  onlyIn: { en: 'Nur auf Englisch', de: 'Nur auf Deutsch' },
  sortedFor: 'Sortiert für',
  change: 'Ändern',
  newest: 'Neueste zuerst',
  personalise: 'Für meine Reise sortieren',
  back: 'Zurück',
  close: 'Schliessen',
  loading: 'Startseite wird geladen …',
  languageLabel: 'Sprache',
  otherLanguage: 'English',
  tabs: { explore: 'Entdecken', keepsakes: 'Andenken', assistant: 'Assistent', map: 'Karte', account: 'Konto' },
  tabBar: 'Hauptnavigation',
  mapAll: (n: number) => n >= MIN_COUNT ? `Alle ${n} Orte` : 'Alle Orte',
  mapShelf: (title: string, n: number) => `${title}: ${n >= MIN_COUNT ? `${n} Orte` : 'Orte'} hervorgehoben`,
  mapPeekAll: 'Alle',
  seeList: 'Zur Liste',
  searchLabel: 'Sehenswertes, Essen, Anlässe, Touren, Geschichten und Andenken suchen',
  searchPlaceholder: 'Löwendenkmal, Bäckerei, Rigi',
  searchOpen: 'Suche',
  groups: { place: 'Orte auf der Karte', story: 'Geschichten', tour: 'Touren', keepsake: 'Andenken' },
  interestsTitle: 'Nach Interesse stöbern',
  interests: { 'history-culture': 'Geschichte und Kultur', 'food-drink': 'Essen und Trinken', 'lake-mountains': 'See und Berge', 'shopping-keepsakes': 'Shopping und Andenken', 'local-activities': 'Lokale Aktivitäten' },
  clearInterest: (label: string) => `${label} entfernen`,
  interestCount: (n: number, label: string) => n === 1 ? `1 Treffer in ${label}` : `${n} Treffer in ${label}`,
  filterAll: 'Alle',
  filterLabel: 'Ergebnisse filtern',
  resultCount: (n: number, query: string) => n === 1 ? `1 Treffer für «${query}»` : `${n} Treffer für «${query}»`,
  noResults: (query: string) => `Noch nichts zu «${query}»`,
  noResultsHint: 'Versuchen Sie einen Ortsnamen wie Kapellbrücke oder Weinmarkt, oder schauen Sie auf der Karte.',
  opensMap: 'Öffnet die Karte',
  searching: 'Suche läuft …',
  changeTitle: 'Ihre Reise',
}

export const copy: Record<Language, typeof en> = { en, de }

export type HomeCopy = typeof en

// ---------------------------------------------------------------- lab content

/**
 * Lab-added tags for the S4 stories, which carry none (PRD §11.2 says a story has a stay tag
 * and interests). Proposal for the lab only; the merchant sets these in the story editor.
 */
const storyTags: Record<string, { stay: Stay, interests: Interest[], free: boolean, publishedAt: string }> = {
  'the-dying-lion': { stay: 'both', interests: ['history-culture'], free: false, publishedAt: '2026-10-03' },
  'chapel-bridge-paintings': { stay: 'both', interests: ['history-culture'], free: false, publishedAt: '2026-10-22' },
  'nine-towers': { stay: 'both', interests: ['history-culture'], free: false, publishedAt: '2026-10-15' },
  'dance-of-death': { stay: 'both', interests: ['history-culture'], free: false, publishedAt: '2026-10-25' },
  'fasnacht': { stay: 'multi-day', interests: ['history-culture', 'local-activities'], free: false, publishedAt: '2026-10-12' },
  'slow-morning-weinmarkt': { stay: 'short-stay', interests: ['food-drink'], free: false, publishedAt: '2026-10-19' },
  'steamboats': { stay: 'multi-day', interests: ['lake-mountains'], free: false, publishedAt: '2026-10-26' },
  'guest-card': { stay: 'both', interests: [], free: true, publishedAt: '2026-10-05' },
}

/**
 * The three tours' free information (names, photos and lengths from `features/tours/lucerne`).
 * The stay tags and interests are lab-added, like the story tags. No price, no departure (AC50).
 */
const tourItems: HomeItem[] = [
  {
    id: 'tour-things-that-remain',
    kind: 'tour',
    slug: 'lucerne-the-things-that-remain',
    title: { en: 'Luzerne: The Things That Remain', de: 'Luzern: Was bleibt' },
    photo: 'spreuer-bridge',
    hours: 3,
    stay: 'both',
    interests: ['history-culture'],
    free: false,
    publishedAt: '2026-10-08',
  },
  {
    id: 'tour-rigi',
    kind: 'tour',
    slug: 'rigi-from-lake-to-sky',
    title: { en: 'Rigi: From Lake to Sky', de: 'Rigi: Vom See zum Himmel' },
    photo: 'rigi-kulm',
    hours: 8,
    stay: 'multi-day',
    interests: ['lake-mountains'],
    free: false,
    publishedAt: '2026-10-06',
  },
  {
    id: 'tour-pilatus',
    kind: 'tour',
    slug: 'pilatus-above-the-city',
    title: { en: 'Pilatus: Above the City', de: 'Pilatus: Über der Stadt' },
    photo: 'pilatus',
    hours: 6.5,
    stay: 'multi-day',
    interests: ['lake-mountains'],
    free: false,
    publishedAt: '2026-10-04',
  },
]

/** Four of the shop's designs (`features/catalog/victorinox.ts`), shown without price. */
export const keepsakes: Keepsake[] = [
  { slug: 'victorinox-chapel-bridge', photo: 'vx-chapel-bridge', name: { en: 'Victorinox Chapel Bridge', de: 'Victorinox Kapellbrücke' } },
  { slug: 'victorinox-lion', photo: 'vx-lion', name: { en: 'Victorinox Lion Monument', de: 'Victorinox Löwendenkmal' } },
  { slug: 'victorinox-swan', photo: 'vx-swan', name: { en: 'Victorinox Swan on the lake', de: 'Victorinox Schwan auf dem See' } },
  { slug: 'victorinox-steamboat', photo: 'vx-steamboat', name: { en: 'Victorinox Paddle steamer', de: 'Victorinox Raddampfer' } },
]

export function pinItem(pin: Pin): HomeItem {
  return {
    id: pin.id,
    kind: 'place',
    slug: pin.slug,
    title: pin.title,
    photo: pin.photo,
    stay: pin.stay,
    interests: pin.interests,
    free: pin.free,
    publishedAt: pin.publishedAt,
    pin,
  }
}

/** The S4 stories that have a published language version, with the lab-added tags. */
export const storyItems: HomeItem[] = labStories
  .filter(story => story.title.en || story.title.de)
  .map((story) => {
    const tags = storyTags[story.slug] ?? { stay: undefined, interests: [], free: false, publishedAt: LAB_TODAY }

    return {
      id: `story-${story.slug}`,
      kind: 'story',
      slug: story.slug,
      title: story.title,
      photo: story.photo,
      minutes: story.minutes,
      ...tags,
    }
  })

/** Everything the home can show by default: the guest map's pins, the stories and the tours. */
export const homeItems: HomeItem[] = [...publicPins.map(pinItem), ...storyItems, ...tourItems]

// ---------------------------------------------------------------- ranking (PRD §3.2)

interface Visitor {
  stay?: Stay
  interests: Interest[]
}

/** The lab's four visitors: the S4 map's three presets, and one with two interests. */
export const visitors: Record<Answers, Visitor> = {
  'none': { interests: [] },
  'short-food': { stay: 'short-stay', interests: ['food-drink'] },
  'multi-history': { stay: 'multi-day', interests: ['history-culture'] },
  'lake-shopping': { stay: 'multi-day', interests: ['lake-mountains', 'shopping-keepsakes'] },
}

interface Rankable {
  stay?: Stay
  interests: Interest[]
  publishedAt: string
}

function stayScore(item: Rankable, stay: Stay | undefined) {
  if (!stay || !item.stay)
    return 1

  return item.stay === 'both' || item.stay === stay ? 0 : 2
}

/**
 * The map's ranker (`rankPins` in `map-guest-data.ts`) for any item: stay match first (an
 * untagged item sits between), then more matching interests, then newest. With no answers
 * only "newest first" applies. A test checks it orders the pins exactly as the map does.
 */
export function rankItems<T extends Rankable>(list: T[], answers: Answers): T[] {
  const { stay, interests } = visitors[answers]
  const matches = (item: T) => item.interests.filter(i => interests.includes(i)).length

  return [...list].sort((a, b) =>
    stayScore(a, stay) - stayScore(b, stay)
    || matches(b) - matches(a)
    || b.publishedAt.localeCompare(a.publishedAt),
  )
}

// ---------------------------------------------------------------- dates (Europe/Zurich wall time)

const NOW_TIME = LAB_NOW.slice(11)

function addDays(iso: string, days: number) {
  const date = calendarDay(iso)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

/** Monday is 1, as in the data model (ADR-029). */
function isoWeekday(iso: string) {
  const day = calendarDay(iso).getUTCDay()

  return day === 0 ? 7 : day
}

export interface Occurrence {
  day: string
  starts?: string
  ends?: string
}

/**
 * The next time an event happens, and the dates after it. A one-day entry counts until its end
 * time (or the end of the day); a range counts its next day with opening hours, so the
 * Saturday flea market reads Saturday, not "today". Undefined once every date is over.
 */
export function occurrences(pin: Pin, today = LAB_TODAY, now = NOW_TIME): Occurrence[] {
  const found: Occurrence[] = []

  for (const entry of pin.dates ?? []) {
    if (entry.kind === 'day') {
      if (entry.day > today || (entry.day === today && (!entry.ends || entry.ends > now)))
        found.push({ day: entry.day, starts: entry.starts, ends: entry.ends })
      continue
    }
    for (let day = entry.from > today ? entry.from : today; day <= entry.to; day = addDays(day, 1)) {
      if (!pin.hours) {
        found.push({ day })
        break
      }
      const span = pin.hours.find(s => s.day === isoWeekday(day) && (day > today || s.closes > now))

      if (span) {
        found.push({ day, starts: span.opens, ends: span.closes })
        break
      }
    }
  }

  return found.sort((a, b) => (a.day + (a.starts ?? '')).localeCompare(b.day + (b.starts ?? '')))
}

export type When = 'today' | 'tomorrow' | 'weekend' | 'date'

/** "Today", "Tomorrow", "This weekend" (the coming Saturday or Sunday) or a plain date. */
export function whenOf(day: string, today = LAB_TODAY): When {
  if (day === today)
    return 'today'
  if (day === addDays(today, 1))
    return 'tomorrow'
  const gap = Math.round((calendarDay(day).getTime() - calendarDay(today).getTime()) / 86_400_000)

  return isoWeekday(day) >= 6 && gap <= 7 - isoWeekday(today) ? 'weekend' : 'date'
}

const intlLocale = (language: Language) => language === 'en' ? 'en-CH' : 'de-CH'

export function formatDay(iso: string, language: Language) {
  return dateTimeFormat(intlLocale(language), { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(calendarDay(iso))
}

export function dayParts(iso: string, language: Language) {
  const part = (options: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale(language), { ...options, timeZone: 'UTC' }).format(calendarDay(iso))

  return { weekday: part({ weekday: 'short' }), day: part({ day: 'numeric' }), month: part({ month: 'short' }) }
}

/** "08:00–16:00", "from 19:30", or undefined for a day without times. */
export function occurrenceTime(o: Occurrence, language: Language) {
  if (!o.starts)
    return undefined

  return o.ends ? `${o.starts}–${o.ends}` : copy[language].fromTime(o.starts)
}

/** "Sat, 31 Oct, 08:00–16:00" or "Sun, 15 Nov, from 19:30". */
export function occurrenceLabel(o: Occurrence, language: Language) {
  return [formatDay(o.day, language), occurrenceTime(o, language)].filter(Boolean).join(', ')
}

// ---------------------------------------------------------------- sections

/** The five interests, `free-useful` (the fixed `free` flag) and `more` (belongs to none). */
export type SectionId = Interest | 'free-useful' | 'more'

/**
 * The order for a visitor who has not answered (or skipped), and the order of the jump points.
 * `more` is always last, for every visitor.
 */
export const DEFAULT_ORDER: SectionId[] = [
  'lake-mountains',
  'free-useful',
  'food-drink',
  'local-activities',
  'history-culture',
  'shopping-keepsakes',
  'more',
]

/** Cards shown on the home before "See all"; below three the section turns into rows. */
export const SHELF_CARDS = 5

/** True while a date of the item is still ahead (an event that has not ended). */
export function isUpcoming(item: HomeItem, today = LAB_TODAY) {
  return !!item.pin?.dates && occurrences(item.pin, today).length > 0
}

/**
 * Every section an item belongs to, from the item alone (no visitor): its own interests, plus
 * `free-useful` when `free`; no interest and not free means `more`. An event whose last date
 * has passed belongs nowhere. Keepsakes are not items: they sit in `shopping-keepsakes` (see `Shelf`).
 */
export function sectionsOf(item: HomeItem, today = LAB_TODAY): SectionId[] {
  if (item.pin?.dates && !isUpcoming(item, today))
    return []
  const found: SectionId[] = [...item.interests]

  if (item.free)
    found.push('free-useful')

  return found.length > 0 ? found : ['more']
}

/**
 * The one section an item is shown in for a visitor: the first of its sections in `order`.
 * Undefined for an ended event. `order` defaults to `DEFAULT_ORDER`; pass `rankShelves(answers)`.
 */
export function shelfOf(item: HomeItem, order: SectionId[] = DEFAULT_ORDER, today = LAB_TODAY): SectionId | undefined {
  const own = sectionsOf(item, today)

  return order.find(id => own.includes(id))
}

/**
 * The map entry's counts: an event is a pin with a date still ahead; a pin whose dates are all
 * over is in neither count.
 */
export function mapCounts(pins: Pin[], today = LAB_TODAY) {
  const items = pins.map(pin => pinItem(pin))
  const events = items.filter(item => isUpcoming(item, today)).length
  const places = items.filter(item => !item.pin?.dates).length

  return { events, places }
}

/**
 * Section order for a visitor. Default order unless they chose interests: then their first
 * chosen interest (earliest in the default order), `free-useful`, their other chosen interests
 * (default order), the rest in default order, and `more` last. The stay length does not matter.
 */
export function rankShelves(answers: Answers): SectionId[] {
  const { interests } = visitors[answers]
  const chosen = DEFAULT_ORDER.filter(id => id !== 'more' && id !== 'free-useful' && interests.includes(id as Interest))

  if (chosen.length === 0)
    return [...DEFAULT_ORDER]
  const head: SectionId[] = [chosen[0]!, 'free-useful', ...chosen.slice(1)]

  return [...head, ...DEFAULT_ORDER.filter(id => id !== 'more' && !head.includes(id)), 'more']
}

/** Does the item's stay tag fit the visitor's stay length? `both` and untagged fit either. */
function fitsStay(item: HomeItem, stay: Stay | undefined) {
  return !stay || !item.stay || item.stay === 'both' || item.stay === stay
}

/**
 * Inside a section: events still ahead first, soonest first; then the items whose stay tag
 * fits the visitor; then the rest. Each group keeps the `rankItems` order.
 */
function rankSection(items: HomeItem[], answers: Answers, today: string) {
  const { stay } = visitors[answers]
  const ranked = rankItems(items, answers)
  const events = ranked.filter(item => isUpcoming(item, today))
  const next = (item: HomeItem) => {
    const first = occurrences(item.pin!, today)[0]!

    return first.day + (first.starts ?? '')
  }
  const others = ranked.filter(item => !isUpcoming(item, today))

  return [
    ...events.sort((a, b) => next(a).localeCompare(next(b))),
    ...others.filter(item => fitsStay(item, stay)),
    ...others.filter(item => !fitsStay(item, stay)),
  ]
}

export interface Shelf {
  id: SectionId
  /** Every member, ranked. The home shows the first few; "See all" shows the rest. */
  items: HomeItem[]
  /** Members that are pins, for "Show on the map". */
  places: HomeItem[]
  /** The keepsakes (small, no price): only `shopping-keepsakes` has any. */
  keepsakes: Keepsake[]
}

/**
 * The home's sections for a visitor, in order. Each item is in exactly one (the first of its
 * sections in that order); a section with nothing in it is left out (O35); none is ever hidden
 * by the answers.
 */
export function homeShelves(items: HomeItem[], answers: Answers, today = LAB_TODAY): Shelf[] {
  const order = rankShelves(answers)
  const members = Object.fromEntries(order.map(id => [id, [] as HomeItem[]])) as Record<SectionId, HomeItem[]>

  for (const item of items) {
    const id = shelfOf(item, order, today)

    if (id)
      members[id].push(item)
  }

  return order
    .map((id) => {
      const ranked = rankSection(members[id], answers, today)

      return {
        id,
        items: ranked,
        places: ranked.filter(item => item.kind === 'place'),
        keepsakes: id === 'shopping-keepsakes' ? keepsakes : [],
      }
    })
    .filter(shelf => shelf.items.length + shelf.keepsakes.length > 0)
}

/** The kinds a section groups its items by, in this order (owner, 28.10.2026: never mix kinds in one row). */
export type GroupKind = 'event' | 'story' | 'place' | 'tour'
export const GROUP_ORDER: GroupKind[] = ['event', 'story', 'place', 'tour']

export const groupLabels: Record<Language, Record<GroupKind, string>> = {
  en: { event: 'What’s on', story: 'Stories', place: 'Places', tour: 'Tours' },
  de: { event: 'Was läuft', story: 'Geschichten', place: 'Orte', tour: 'Touren' },
}

/** A pin with dates is an event; everything else is its own kind. */
export function groupKind(item: HomeItem): GroupKind {
  return item.pin?.dates?.length ? 'event' : item.kind
}

/** A section's items split by kind, in `GROUP_ORDER`, ranked order kept inside each group; empty groups dropped. */
export function kindGroups(items: HomeItem[]): { kind: GroupKind, items: HomeItem[] }[] {
  return GROUP_ORDER
    .map(kind => ({ kind, items: items.filter(item => groupKind(item) === kind) }))
    .filter(group => group.items.length > 0)
}

/**
 * Photos for the jump points, one per section, fixed on purpose (the first screen must not
 * change when the client re-ranks), each showing what its title says. `more` has none: it is a small text strip.
 */
export const needPhotos: Partial<Record<SectionId, string>> = {
  'lake-mountains': 'rigi-kulm',
  'free-useful': 'weinmarkt',
  'food-drink': 'old-swiss-house',
  'local-activities': 'lucerne-old-town',
  'history-culture': 'lucerne-old-town',
  'shopping-keepsakes': 'vx-chapel-bridge',
}

/**
 * The five fixed interests (PRD §3.3) as search tiles, each with a photo of what it names.
 * `local-activities` uses a lively old-town square; a photo of an actual event or market would
 * fit better if the owner supplies one.
 */
export const interestPhotos: Record<Interest, string> = {
  'history-culture': 'musegg-wall',
  'food-drink': 'pralines',
  'lake-mountains': 'lake-steamboat',
  'shopping-keepsakes': 'vx-chapel-bridge',
  'local-activities': 'lucerne-old-town',
}

/** The five interests in the guest-facing list order (onboarding, search). Not the section order. */
export const INTERESTS: Interest[] = ['history-culture', 'food-drink', 'lake-mountains', 'shopping-keepsakes', 'local-activities']

/** The hero photo: the Chapel Bridge and the Water Tower, the city's own picture of itself. */
export const HERO_PHOTO = 'lucerne-kapellbruecke-1200'

/** "6 places · 5 events": only the kinds with at least five items; undefined when none reaches five. */
export function shelfCount(shelf: Shelf, language: Language) {
  const counts = copy[language].counts
  const kindOf = (item: HomeItem) => isUpcoming(item) ? 'event' : item.kind
  const kinds = ['event', 'place', 'story', 'tour'] as const
  const parts = kinds
    .map(kind => [kind, shelf.items.filter(item => kindOf(item) === kind).length] as const)
    .filter(([, n]) => n >= MIN_COUNT)
    .map(([kind, n]) => counts[kind](n))

  return parts.length > 0 ? parts.join(' · ') : undefined
}

// ---------------------------------------------------------------- card facts

export function itemTitle(item: HomeItem, language: Language) {
  return pickText(item.title, language)
}

function hoursLabel(hours: number, language: Language) {
  return copy[language].hours(numberFormat(intlLocale(language)).format(hours))
}

/** The one fact under a card title. No price, ever (AC54). */
export function itemMeta(item: HomeItem, language: Language) {
  const c = copy[language]

  if (item.kind === 'story')
    return `${c.kind.story} · ${c.minRead(item.minutes ?? 0)}`
  if (item.kind === 'tour')
    return `${c.kind.tour} · ${hoursLabel(item.hours ?? 0, language)}`

  return item.pin ? todayHours(item.pin, language) ?? c.kind.place : c.kind.place
}

/** Where a card goes in the product. The lab shows the address instead of leaving. */
export function itemHref(item: HomeItem, language: Language) {
  if (item.kind === 'place')
    return `/${language}/map?place=${item.slug}`
  if (item.kind === 'tour')
    return `/${language}/tours/${item.slug}`

  return `/${language}/stories/${item.slug}`
}

/** New: the Map tab with one shelf's places highlighted (not in the PRD yet). */
export function shelfMapHref(id: SectionId, language: Language) {
  return `/${language}/map?for=${id}`
}

export function answerSummary(answers: Answers, language: Language) {
  const { stay, interests } = visitors[answers]
  const c = onboardingCopy[language]
  const parts = [stay && stay !== 'both' && c.stay[stay].label, ...interests.map(i => c.interests[i])].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : undefined
}

// ---------------------------------------------------------------- search

const MARKS = /\p{M}/gu

/** Lower case without accents, so "lowen" finds "Löwendenkmal" and "cafe" finds "Café". */
export function fold(value: string) {
  return value.normalize('NFD').replace(MARKS, '').toLowerCase()
}

export type HitKind = 'place' | 'story' | 'tour' | 'keepsake'

export interface SearchHit {
  id: string
  kind: HitKind
  title: { value: string, lang: Language, fallback: boolean }
  photo?: string
  meta: string
  href: string
  /** 0 a title word starts with the query, 1 the title contains it, 2 only the tip does. */
  score: number
}

function matchScore(query: string, title: string, extra: string) {
  const t = fold(title)

  if (t.startsWith(query) || t.includes(` ${query}`))
    return 0
  if (t.includes(query))
    return 1

  return fold(extra).includes(query) ? 2 : undefined
}

function itemHit(item: HomeItem, language: Language, score: number): SearchHit | undefined {
  const title = pickText(item.title, language)
  const next = item.pin ? occurrences(item.pin)[0] : undefined

  return title && {
    id: item.id,
    kind: item.kind,
    title,
    photo: item.photo,
    meta: next ? occurrenceLabel(next, language) : itemMeta(item, language),
    href: itemHref(item, language),
    score,
  }
}

function keepsakeHit(keepsake: Keepsake, language: Language, score: number): SearchHit {
  return {
    id: keepsake.slug,
    kind: 'keepsake',
    title: { value: keepsake.name[language], lang: language, fallback: false },
    photo: keepsake.photo,
    meta: copy[language].kind.keepsake,
    href: `/${language}/gifts/${keepsake.slug}`,
    score,
  }
}

/**
 * Search over places (events included), stories, tours and keepsakes, in both languages' text;
 * the hit shows the visitor's language or the other with a notice. Tours open their free
 * information page. No price on any hit (AC54).
 */
export function searchHome(query: string, items: HomeItem[], language: Language): SearchHit[] {
  const q = fold(query.trim())

  if (!q)
    return []
  const hits: SearchHit[] = []

  for (const item of items) {
    const score = matchScore(q, `${item.title.en ?? ''} ${item.title.de ?? ''}`, `${item.pin?.tip?.en ?? ''} ${item.pin?.tip?.de ?? ''}`)
    const hit = score === undefined ? undefined : itemHit(item, language, score)

    if (hit)
      hits.push(hit)
  }
  for (const keepsake of keepsakes) {
    const score = matchScore(q, `${keepsake.name.en} ${keepsake.name.de}`, '')

    if (score !== undefined)
      hits.push(keepsakeHit(keepsake, language, score))
  }

  return hits.sort((a, b) => a.score - b.score)
}

/** Everything tagged with one interest, newest first; Shopping and keepsakes adds the keepsakes. */
export function searchInterest(interest: Interest, items: HomeItem[], language: Language): SearchHit[] {
  const hits = rankItems(items.filter(item => item.interests.includes(interest)), 'none')
    .flatMap(item => itemHit(item, language, 0) ?? [])

  return interest === 'shopping-keepsakes'
    ? [...hits, ...keepsakes.map(keepsake => keepsakeHit(keepsake, language, 0))]
    : hits
}

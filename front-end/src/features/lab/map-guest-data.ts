/**
 * Lab data for the guest map (N02) and pin card (N03): the guest's view of the merchant's
 * pins (`pins-merchant-data.ts` is the one source, so an edit in the editor shows on the map),
 * the EN and DE copy, and the pure helpers the three options share (ranking, highlight, dates,
 * hours, directions). Design only: no API.
 *
 * AC88 cases in the seed: the Lion Monument and the Chapel Bridge sit in two categories, the
 * two bakeries are tagged only with a sub-category of Local food and drink, and the Hotel am
 * See has no category at all.
 */
import type { Pin as MerchantPin, StayTag } from '@/features/lab/pins-merchant-data'

import { calendarDay, dateTimeFormat } from '@sk/domain/shared'

import {
  isEnded,
  LAB_TODAY,
  mapCategories,
  stories as merchantStories,
  seedPins,
} from '@/features/lab/pins-merchant-data'

export type Language = 'en' | 'de'
export type Stay = 'short-stay' | 'multi-day' | 'both'
export type Interest = 'history-culture' | 'food-drink' | 'lake-mountains' | 'shopping-keepsakes' | 'local-activities'
/** The lab's preset visitors: no answers, short-stay + food, multi-day + history, and two interests. */
export type Answers = 'none' | 'short-food' | 'multi-history' | 'lake-shopping'
export type Tier = 'lead' | 'normal' | 'quiet'
export type LngLat = [lng: number, lat: number]
export type Text = Partial<Record<Language, string>>

export interface Category {
  id: string
  parent?: string
  name: Record<Language, string>
}

/** Monday is 1, as in the data model (ADR-029). */
export interface WeeklySpan {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7
  opens: string
  closes: string
}

/** One day with optional times, or a range of days with no times (ADR-029). */
export type DateEntry
  = | { kind: 'day', day: string, starts?: string, ends?: string }
    | { kind: 'range', from: string, to: string }

export interface Story {
  slug: string
  /** A title per language that has a published version. */
  title: Text
  photo?: string
  minutes: number
}

export interface Pin {
  /** The merchant's pin id: the key on the map, stable while the slug is edited. */
  id: string
  /** The `?place=` slug. */
  slug: string
  coordinates: LngLat
  title: Text
  tip?: Text
  photo?: string
  /** Every photo, the main one first, for the card's carousel. */
  photos: string[]
  alt?: Text
  address?: string
  categories: string[]
  stay?: Stay
  interests: Interest[]
  /** Fixed flag: free to use (water, toilets, SIM card, free facilities). Sends the pin to Free and useful on the home. */
  free: boolean
  hours?: WeeklySpan[]
  dates?: DateEntry[]
  mainStory?: string
  otherStories: string[]
  link?: string
  publishedAt: string
  status: MerchantPin['status']
}

// ---------------------------------------------------------------- copy

/** EN and DE copy. DE marked "proposal" in the report is not reviewed by the merchant. */
const en = {
  tabs: ['Explore', 'Keepsakes', 'Assistant', 'Map', 'Account'],
  tabBar: 'Main',
  mapLabel: 'Map of Lucerne',
  all: 'All',
  categories: 'Categories',
  categoriesTitle: 'Highlight on the map',
  categoriesHint: 'The other places stay on the map, dimmed.',
  done: 'Done',
  list: 'List',
  map: 'Map',
  viewToggle: 'View',
  places: (n: number) => `${n} places`,
  sortedForYou: 'Sorted for your trip',
  newestFirst: 'Newest first',
  otherPlaces: 'Other places',
  highlighted: (category: string, n: number, total: number) =>
    `${category}: ${n} of ${total} places highlighted`,
  allShown: (total: number) => `All ${total} places`,
  cluster: (n: number) => `${n} places here. Zoom in`,
  event: 'Event',
  dimmed: 'dimmed',
  loading: 'Loading places…',
  emptyTitle: 'No places on the map yet',
  emptyBody: 'Check back soon. Stories about Lucerne are on Explore.',
  emptyAction: 'Go to Explore',
  failedTitle: 'The places could not load',
  failedBody: 'Check your connection and try again.',
  retry: 'Try again',
  gone: 'This place is no longer on the map',
  dismiss: 'Dismiss',
  onlyIn: { en: 'This place is only described in English.', de: 'This place is only described in German.' },
  close: 'Close',
  showMore: 'Show more',
  showLess: 'Show less',
  resize: 'Card height',
  nextDate: 'Next date',
  alsoOn: 'Also on',
  until: (day: string) => `Until ${day}`,
  fromTime: (time: string) => `from ${time}`,
  hours: 'Opening hours',
  openToday: (spans: string) => `Open today ${spans}`,
  closedToday: 'Closed today',
  closed: 'Closed',
  today: 'Today',
  allWeek: 'All week',
  address: 'Address',
  readStory: 'Read the story',
  alsoInStories: 'Also in these stories',
  storiesHere: 'Stories about this place',
  minRead: (minutes: number) => `${minutes} min read`,
  openNow: 'Open today',
  directionsLabel: 'Directions',
  openInMaps: 'Open in your map app',
  website: 'Website',
  directions: 'Open in Google Maps',
  directionsNote: 'Opens Google Maps in a new tab. We never see where you are.',
  cancel: 'Cancel',
  photoOf: (title: string) => `Photo: ${title}`,
  filterTitle: 'Categories',
  categoriesCount: (n: number) => `Categories · ${n}`,
  allCategories: 'All categories',
  clearFilter: 'Clear filter',
  showPlaces: (n: number) => n === 1 ? 'Show 1 place' : `Show ${n} places`,
  pickOne: 'Pick at least one category.',
  gallery: (title: string) => `Photos of ${title}`,
  photoN: (n: number, count: number) => `Photo ${n} of ${count}`,
  previousPhoto: 'Previous photo',
  nextPhoto: 'Next photo',
}

const de: typeof en = {
  tabs: ['Entdecken', 'Andenken', 'Assistent', 'Karte', 'Konto'],
  tabBar: 'Hauptnavigation',
  mapLabel: 'Karte von Luzern',
  all: 'Alle',
  categories: 'Kategorien',
  categoriesTitle: 'Auf der Karte hervorheben',
  categoriesHint: 'Die anderen Orte bleiben gedimmt auf der Karte.',
  done: 'Fertig',
  list: 'Liste',
  map: 'Karte',
  viewToggle: 'Ansicht',
  places: (n: number) => `${n} Orte`,
  sortedForYou: 'Für Ihre Reise sortiert',
  newestFirst: 'Neueste zuerst',
  otherPlaces: 'Weitere Orte',
  highlighted: (category: string, n: number, total: number) =>
    `${category}: ${n} von ${total} Orten hervorgehoben`,
  allShown: (total: number) => `Alle ${total} Orte`,
  cluster: (n: number) => `${n} Orte hier. Hineinzoomen`,
  event: 'Anlass',
  dimmed: 'gedimmt',
  loading: 'Orte werden geladen …',
  emptyTitle: 'Noch keine Orte auf der Karte',
  emptyBody: 'Schauen Sie bald wieder vorbei. Geschichten über Luzern finden Sie unter Entdecken.',
  emptyAction: 'Zu Entdecken',
  failedTitle: 'Die Orte konnten nicht geladen werden',
  failedBody: 'Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  retry: 'Erneut versuchen',
  gone: 'Dieser Ort ist nicht mehr auf der Karte',
  dismiss: 'Ausblenden',
  onlyIn: { en: 'Dieser Ort ist nur auf Englisch beschrieben.', de: 'Dieser Ort ist nur auf Deutsch beschrieben.' },
  close: 'Schliessen',
  showMore: 'Mehr anzeigen',
  showLess: 'Weniger anzeigen',
  resize: 'Kartenhöhe',
  nextDate: 'Nächstes Datum',
  alsoOn: 'Auch am',
  until: (day: string) => `Bis ${day}`,
  fromTime: (time: string) => `ab ${time}`,
  hours: 'Öffnungszeiten',
  openToday: (spans: string) => `Heute geöffnet ${spans}`,
  closedToday: 'Heute geschlossen',
  closed: 'Geschlossen',
  today: 'Heute',
  allWeek: 'Ganze Woche',
  address: 'Adresse',
  readStory: 'Geschichte lesen',
  alsoInStories: 'Auch in diesen Geschichten',
  storiesHere: 'Geschichten zu diesem Ort',
  minRead: (minutes: number) => `${minutes} Min. Lesezeit`,
  openNow: 'Heute geöffnet',
  directionsLabel: 'Route',
  openInMaps: 'In Ihrer Karten-App öffnen',
  website: 'Website',
  directions: 'In Google Maps öffnen',
  directionsNote: 'Öffnet Google Maps in einem neuen Tab. Wir sehen nie, wo Sie sind.',
  cancel: 'Abbrechen',
  photoOf: (title: string) => `Foto: ${title}`,
  filterTitle: 'Kategorien',
  categoriesCount: (n: number) => `Kategorien · ${n}`,
  allCategories: 'Alle Kategorien',
  clearFilter: 'Filter zurücksetzen',
  showPlaces: (n: number) => n === 1 ? '1 Ort zeigen' : `${n} Orte zeigen`,
  pickOne: 'Wählen Sie mindestens eine Kategorie.',
  gallery: (title: string) => `Fotos von ${title}`,
  photoN: (n: number, count: number) => `Foto ${n} von ${count}`,
  previousPhoto: 'Vorheriges Foto',
  nextPhoto: 'Nächstes Foto',
}

export const copy: Record<Language, typeof en> = { en, de }

export type Copy = typeof en

/** The lab clock (`LAB_TODAY`) is Wednesday 28 October 2026 in Lucerne. */
const LAB_WEEKDAY = 3

function everyDay(opens: string, closes: string): WeeklySpan[] {
  return ([1, 2, 3, 4, 5, 6, 7] as const).map(day => ({ day, opens, closes }))
}

function lastDay(entry: DateEntry) {
  return entry.kind === 'day' ? entry.day : entry.to
}

const stayOf: Record<StayTag, Stay> = { short_stay: 'short-stay', multi_day: 'multi-day', both: 'both' }

/** Only the languages that have text, so a missing one falls back with the notice (AC64). */
function textOf(value: { en: string, de: string }): Text {
  const text: Text = {}

  if (value.en.trim())
    text.en = value.en.trim()
  if (value.de.trim())
    text.de = value.de.trim()

  return text
}

/** The merchant's categories as chips; a name missing in German shows the English one (AC87). */
export const categories: Category[] = mapCategories.map(c => ({
  id: c.id,
  parent: c.parentId ?? undefined,
  name: { en: c.name.en || c.name.de, de: c.name.de || c.name.en },
}))

export const ALL = 'all'

/** A story keeps a title only in the languages it is published in (ADR-029). */
export const stories: Story[] = merchantStories.map(s => ({
  slug: s.slug,
  title: textOf({
    en: s.versions.en === 'published' ? s.title.en : '',
    de: s.versions.de === 'published' ? s.title.de : '',
  }),
  photo: s.photo,
  minutes: s.minutes,
}))

/**
 * What a guest gets from a merchant pin: the same fields, shaped for the map and the card.
 * Undefined while the pin has no location, since it cannot be drawn.
 */
export function toGuestPin(pin: MerchantPin): Pin | undefined {
  if (pin.lat === null || pin.lng === null)
    return undefined
  const mainStory = merchantStories.find(s => s.id === pin.storyId)
  const hours = pin.hours.map(({ day, opens, closes }) => ({ day, opens, closes }))
  const dates = pin.dates
    .filter(entry => entry.firstDay)
    .map((entry): DateEntry => entry.kind === 'day'
      ? { kind: 'day', day: entry.firstDay, starts: entry.startTime || undefined, ends: entry.endTime || undefined }
      : { kind: 'range', from: entry.firstDay, to: entry.lastDay || entry.firstDay })

  return {
    id: pin.id,
    slug: pin.slug,
    coordinates: [pin.lng, pin.lat],
    title: textOf(pin.title),
    tip: textOf(pin.tip),
    photo: pin.photo || undefined,
    photos: pin.photo ? [pin.photo, ...pin.morePhotos] : pin.morePhotos,
    alt: textOf(pin.alt),
    address: pin.address.trim() || undefined,
    categories: pin.categories,
    stay: stayOf[pin.stay],
    interests: pin.interests,
    free: pin.free,
    hours: hours.length > 0 ? hours : undefined,
    dates: dates.length > 0 ? dates : undefined,
    mainStory: mainStory?.slug,
    otherStories: merchantStories
      .filter(s => s.id !== pin.storyId && s.pinIds.includes(pin.id))
      .map(s => s.slug),
    link: pin.link.trim() || undefined,
    publishedAt: pin.firstPublished ?? pin.edited,
    status: pin.status,
  }
}

/** On the map: published, placed, and not past its last date (AC90). */
export function isOnMap(pin: MerchantPin) {
  return pin.status === 'published' && pin.lat !== null && pin.lng !== null && !isEnded(pin)
}

/** The pins a guest sees, from the merchant's list. */
export function guestPins(list: MerchantPin[]) {
  return list.filter(isOnMap).flatMap(pin => toGuestPin(pin) ?? [])
}

/** The seed list as guests see it, before any edit. */
export const publicPins = guestPins(seedPins)

export function findStory(slug: string) {
  return stories.find(story => story.slug === slug)
}

// ---------------------------------------------------------------- ranking and prominence

const visitor: Record<Answers, { stay?: Stay, interests: Interest[] }> = {
  'none': { interests: [] },
  'short-food': { stay: 'short-stay', interests: ['food-drink'] },
  'multi-history': { stay: 'multi-day', interests: ['history-culture'] },
  'lake-shopping': { stay: 'multi-day', interests: ['lake-mountains', 'shopping-keepsakes'] },
}

function stayScore(pin: Pin, stay: Stay | undefined) {
  if (!stay || !pin.stay)
    return 1

  return pin.stay === 'both' || pin.stay === stay ? 0 : 2
}

/**
 * PRD §3.2 order, lab copy of `rankItems`: stay match first (an untagged pin sits between),
 * then more matching interests, then newest. With no answers only "newest first" applies.
 */
export function rankPins(list: Pin[], answers: Answers) {
  const { stay, interests } = visitor[answers]
  const matches = (pin: Pin) => pin.interests.filter(i => interests.includes(i)).length

  return [...list].sort((a, b) =>
    stayScore(a, stay) - stayScore(b, stay)
    || matches(b) - matches(a)
    || b.publishedAt.localeCompare(a.publishedAt),
  )
}

/**
 * Prominence from rank, never visibility: the first five ranked pins lead (label, larger),
 * pins tagged only for the other stay go quiet (smaller), everything else is normal.
 */
export function tierOf(pin: Pin, rank: number, answers: Answers): Tier {
  const { stay } = visitor[answers]

  if (stayScore(pin, stay) === 2)
    return 'quiet'

  return rank < 5 ? 'lead' : 'normal'
}

/** A chip highlights its own pins and the pins of its sub-categories; All highlights every pin. */
export function isHighlighted(pin: Pin, chip: string) {
  if (chip === ALL)
    return true

  return pin.categories.some(id =>
    id === chip || categories.find(c => c.id === id)?.parent === chip,
  )
}

/**
 * One colour per top-level category, Wanderlog-style: a pin, its card badge and its chip dot
 * share it. Sub-categories take their parent's colour. Lab proposal, not a merchant setting.
 */
const palette = ['#2f6fde', '#8b4fd6', '#e8772e', '#1f9d6b', '#d6336c', '#0e8fa3']
const NO_CATEGORY = '#4a4038'

export function categoryColor(id: string | undefined) {
  if (!id || id === ALL)
    return NO_CATEGORY
  const root = categories.find(c => c.id === id)?.parent ?? id
  const index = categories.filter(c => !c.parent).findIndex(c => c.id === root)

  return index < 0 ? NO_CATEGORY : palette[index % palette.length]!
}

/** A pin's colour: its first category's. */
export function pinColor(pin: Pin) {
  return categoryColor(pin.categories[0])
}

export function categoryName(id: string, language: Language) {
  return categories.find(c => c.id === id)?.name[language] ?? id
}

// ---------------------------------------------------------------- text, dates and hours

const otherLanguage = (language: Language): Language => language === 'en' ? 'de' : 'en'

/** The text in the visitor's language, or the other one with a flag for the language notice. */
export function pickText(text: Text | undefined, language: Language) {
  const own = text?.[language]

  if (own)
    return { value: own, lang: language, fallback: false }
  const other = text?.[otherLanguage(language)]

  return other
    ? { value: other, lang: otherLanguage(language), fallback: true }
    : undefined
}

const intlLocale = (language: Language) => language === 'en' ? 'en-CH' : 'de-CH'

function dayLabel(iso: string, language: Language, weekday: boolean) {
  return dateTimeFormat(intlLocale(language), {
    weekday: weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(calendarDay(iso))
}

function timeSpan(starts: string | undefined, ends: string | undefined, language: Language) {
  if (!starts)
    return undefined

  return ends ? `${starts}–${ends}` : copy[language].fromTime(starts)
}

/** Next date entry that has not ended, and how many come after it (all in Europe/Zurich). */
export function nextDate(pin: Pin, language: Language) {
  const upcoming = (pin.dates ?? []).filter(entry => lastDay(entry) >= LAB_TODAY)
  const entry = upcoming[0]

  if (!entry)
    return undefined
  const label = entry.kind === 'day'
    ? [dayLabel(entry.day, language, true), timeSpan(entry.starts, entry.ends, language)]
        .filter(Boolean)
        .join(', ')
    : `${dayLabel(entry.from, language, false)} – ${dayLabel(entry.to, language, false)}`
  const short = entry.kind === 'day'
    ? dayLabel(entry.day, language, false)
    : dayLabel(entry.from, language, false)

  return {
    label,
    short,
    ongoing: entry.kind === 'range' && entry.from <= LAB_TODAY,
    more: upcoming.slice(1).map(e =>
      e.kind === 'day'
        ? [dayLabel(e.day, language, true), timeSpan(e.starts, e.ends, language)].filter(Boolean).join(', ')
        : `${dayLabel(e.from, language, false)} – ${dayLabel(e.to, language, false)}`,
    ),
  }
}

export function weekdayName(day: number, language: Language, width: 'short' | 'long') {
  // Monday 26 October 2026 plus the day, so day 1 to 7 fall on real dates (7 is 1 November).
  return dateTimeFormat(intlLocale(language), { weekday: width, timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, 9, 25 + day)))
}

export function todayHours(pin: Pin, language: Language) {
  if (!pin.hours)
    return undefined
  const today = pin.hours.filter(span => span.day === LAB_WEEKDAY)

  return today.length > 0
    ? copy[language].openToday(today.map(s => `${s.opens}–${s.closes}`).join(', '))
    : copy[language].closedToday
}

/** Seven rows, Monday first, with "Closed" for a day without spans. */
export function weekRows(pin: Pin, language: Language) {
  return ([1, 2, 3, 4, 5, 6, 7] as const).map((day) => {
    const spans = (pin.hours ?? []).filter(span => span.day === day)

    return {
      day,
      name: weekdayName(day, language, 'short'),
      today: day === LAB_WEEKDAY,
      value: spans.length > 0
        ? spans.map(s => `${s.opens}–${s.closes}`).join(', ')
        : copy[language].closed,
    }
  })
}

/**
 * The week in a few lines: days in a row with the same hours share one line ("Mon–Fri",
 * "Sat", "Sun"), and the line holding today is marked.
 */
export function weekGroups(pin: Pin, language: Language) {
  const groups: { first: number, last: number, value: string, today: boolean }[] = []

  for (const row of weekRows(pin, language)) {
    const previous = groups.at(-1)

    if (previous && previous.value === row.value && previous.last === row.day - 1) {
      previous.last = row.day
      previous.today ||= row.today
    }
    else {
      groups.push({ first: row.day, last: row.day, value: row.value, today: row.today })
    }
  }

  return groups.map(g => ({
    days: g.first === g.last
      ? weekdayName(g.first, language, 'short')
      : `${weekdayName(g.first, language, 'short')}–${weekdayName(g.last, language, 'short')}`,
    value: g.value,
    today: g.today,
    closed: g.value === copy[language].closed,
  }))
}

/** Open or closed today, for the hours block's status. */
export function openToday(pin: Pin) {
  return (pin.hours ?? []).some(span => span.day === LAB_WEEKDAY)
}

/** One short fact for a list row or a peek: the next date, or today's hours. */
export function factLine(pin: Pin, language: Language) {
  const date = nextDate(pin, language)

  if (date)
    return date.ongoing ? copy[language].until(date.label.split(' – ')[1] ?? '') : date.label

  return todayHours(pin, language)
}

// ---------------------------------------------------------------- directions

/**
 * The place in Google Maps (guests open Google Maps only, owner 28.10.2026). Destination only,
 * never an origin: the site never reads where the guest is (AC89, G9).
 */
export function googleMapsUrl([lng, lat]: LngLat) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

// ---------------------------------------------------------------- content cases for the card

export type ContentCase = 'data' | 'all' | 'none'

/** Lab switch: the pin as entered, every optional field filled, or every optional field empty. */
export function withContentCase(pin: Pin, contentCase: ContentCase): Pin {
  if (contentCase === 'none') {
    return {
      ...pin,
      tip: undefined,
      photo: undefined,
      photos: [],
      address: undefined,
      hours: undefined,
      dates: undefined,
      mainStory: undefined,
      otherStories: [],
      link: undefined,
    }
  }
  if (contentCase === 'all') {
    return {
      ...pin,
      tip: pin.tip ?? { en: 'A short tip from the merchant.', de: 'Ein kurzer Tipp vom Händler.' },
      photo: pin.photo ?? 'lucerne-old-town',
      photos: pin.photos.length > 1 ? pin.photos : [pin.photo ?? 'lucerne-old-town', 'lucerne-night', 'lake-steamboat'],
      address: pin.address ?? 'Kornmarkt 3, 6004 Luzern',
      hours: pin.hours ?? everyDay('09:00', '18:00'),
      dates: pin.dates ?? [{ kind: 'day', day: '2026-11-14', starts: '19:30', ends: '21:00' }],
      mainStory: pin.mainStory ?? 'chapel-bridge-paintings',
      otherStories: pin.otherStories.length > 0 ? pin.otherStories : ['steamboats', 'guest-card'],
      link: pin.link ?? 'https://www.luzern.com',
    }
  }

  return pin
}

// ---------------------------------------------------------------- credits

export const credits = [
  { label: '© swisstopo', href: 'https://www.swisstopo.admin.ch/' },
  { label: 'OpenFreeMap', href: 'https://openfreemap.org/' },
  { label: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
  { label: '© OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
]

/** Weekday, day and month of the next date, for the app's DateTile. */
export function nextDateParts(pin: Pin, language: Language) {
  const entry = (pin.dates ?? []).find(e => lastDay(e) >= LAB_TODAY)

  if (!entry)
    return undefined
  const day = calendarDay(entry.kind === 'day' ? entry.day : entry.from)
  const part = (options: Intl.DateTimeFormatOptions) =>
    dateTimeFormat(intlLocale(language), { ...options, timeZone: 'UTC' }).format(day)

  return {
    weekday: part({ weekday: 'short' }),
    day: part({ day: 'numeric' }),
    month: part({ month: 'short' }),
  }
}

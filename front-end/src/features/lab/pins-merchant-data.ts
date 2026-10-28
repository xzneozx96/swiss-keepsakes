import type { Language } from '@/contexts/locale-context'

import { slugify } from '@sk/domain/shared'

/**
 * Mock data and pure rules for the merchant pins lab (N16, N17). Shapes follow
 * docs/specs/001-storytelling-pivot/data-model.md DM-21 and DM-22; nothing is saved.
 */

/** The lab's clock: 28 Oct 2026, 10:00 in Europe/Zurich. */
export const LAB_TODAY = '2026-10-28'
export const LAB_NOW = '2026-10-28T10:00'

export type PinStatus = 'draft' | 'published' | 'hidden'
export type StayTag = 'short_stay' | 'multi_day' | 'both'
export type Interest
  = | 'history-culture'
    | 'food-drink'
    | 'lake-mountains'
    | 'shopping-keepsakes'
    | 'local-activities'

export const STAY_TAGS: StayTag[] = ['short_stay', 'multi_day', 'both']
export const INTERESTS: Interest[] = [
  'history-culture',
  'food-drink',
  'lake-mountains',
  'shopping-keepsakes',
  'local-activities',
]
/** Day 1 is Monday, as `content.valid_weekly_hours`. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const
export type Weekday = (typeof WEEKDAYS)[number]

export interface Localized {
  en: string
  de: string
}

/** One span of weekly hours; `closes` may be 24:00, and a span never crosses midnight. */
export interface HoursSpan {
  key: string
  day: Weekday
  opens: string
  closes: string
}

/** One day with optional times, or a range of days with no times (`place_dates`). */
export interface DateEntry {
  key: string
  kind: 'day' | 'range'
  firstDay: string
  lastDay: string
  startTime: string
  endTime: string
}

export interface Pin {
  id: string
  status: PinStatus
  slug: string
  /** Null until the merchant puts the pin on the map. */
  lat: number | null
  lng: number | null
  address: string
  title: Localized
  tip: Localized
  photo: string
  alt: Localized
  /** More photos after the main one, for the guest card's carousel. */
  morePhotos: string[]
  categories: string[]
  stay: StayTag
  interests: Interest[]
  /** Fixed flag: free to use (water, toilets, SIM card, free facilities). Sends the pin to Free and useful on the home. */
  free: boolean
  hours: HoursSpan[]
  dates: DateEntry[]
  storyId: string | null
  link: string
  /** ISO day of the last save. */
  edited: string
  /** ISO day of the first publish; fixed once set. */
  firstPublished: string | null
}

export interface MapCategory {
  id: string
  name: Localized
  parentId: string | null
}

export interface Story {
  id: string
  slug: string
  title: Localized
  photo: string
  /** Reading time, for the guest card's story list. */
  minutes: number
  /** Which language versions are published, drafted or missing. */
  versions: Record<Language, 'published' | 'draft' | 'missing'>
  /** Pins the story tags; the guest card lists them under "Also in these stories". */
  pinIds: string[]
}

/** The PRD §11.1 examples, one parent with two sub-categories. The Pubs name has no German yet (AC87). */
export const mapCategories: MapCategory[] = [
  { id: 'walks', name: { en: 'Walking sights', de: 'Sehenswertes zu Fuss' }, parentId: null },
  { id: 'photo', name: { en: 'Photo spots', de: 'Fotospots' }, parentId: null },
  { id: 'food', name: { en: 'Local food and drink', de: 'Essen und Trinken' }, parentId: null },
  { id: 'bakeries', name: { en: 'Bakeries and cafés', de: 'Bäckereien und Cafés' }, parentId: 'food' },
  { id: 'pubs', name: { en: 'Pubs and bars', de: '' }, parentId: 'food' },
  { id: 'essentials', name: { en: 'Free essentials', de: 'Gratis und praktisch' }, parentId: null },
  { id: 'happenings', name: { en: 'Local happenings', de: 'Was läuft' }, parentId: null },
]

export const stories: Story[] = [
  { id: 's1', minutes: 5, slug: 'the-dying-lion', photo: 'lion-monument', title: { en: 'The dying lion of Lucerne', de: 'Der sterbende Löwe von Luzern' }, versions: { en: 'published', de: 'published' }, pinIds: ['p1', 'p9'] },
  { id: 's2', minutes: 6, slug: 'chapel-bridge-paintings', photo: 'lucerne-kapellbruecke-1200', title: { en: 'The paintings under the Chapel Bridge roof', de: 'Die Bilder unter dem Dach der Kapellbrücke' }, versions: { en: 'published', de: 'draft' }, pinIds: ['p2', 'p13', 'p14'] },
  { id: 's3', minutes: 4, slug: 'nine-towers', photo: 'musegg-wall', title: { en: 'Nine towers on the Musegg wall', de: 'Neun Türme auf der Museggmauer' }, versions: { en: 'published', de: 'published' }, pinIds: ['p9', 'p1'] },
  { id: 's4', minutes: 3, slug: 'dance-of-death', photo: 'spreuer-totentanz', title: { en: 'The dance of death on the Spreuer Bridge', de: '' }, versions: { en: 'draft', de: 'missing' }, pinIds: ['p13'] },
  { id: 's5', minutes: 7, slug: 'fasnacht', photo: 'lucerne-old-town', title: { en: '', de: 'Warum Luzern seine Fasnacht liebt' }, versions: { en: 'missing', de: 'published' }, pinIds: ['p2', 'p12', 'p15'] },
  { id: 's6', minutes: 2, slug: 'slow-morning-weinmarkt', photo: 'weinmarkt', title: { en: 'A slow morning on the Weinmarkt', de: '' }, versions: { en: 'published', de: 'missing' }, pinIds: ['p3', 'p4', 'p15'] },
  { id: 's7', minutes: 5, slug: 'steamboats', photo: 'lake-steamboat', title: { en: 'Steamboats on Lake Lucerne', de: 'Dampfschiffe auf dem Vierwaldstättersee' }, versions: { en: 'published', de: 'published' }, pinIds: ['p8', 'p10', 'p14'] },
  { id: 's8', minutes: 3, slug: 'guest-card', photo: 'postcards', title: { en: 'Practical tips: the free guest card', de: 'Praktische Tipps: die Gästekarte' }, versions: { en: 'published', de: 'published' }, pinIds: ['p4', 'p5'] },
]

const empty: Localized = { en: '', de: '' }

let keySeed = 0
/** A key for a new list row (hours span or date entry). */
export function newKey(prefix: string) {
  keySeed += 1

  return `${prefix}-${keySeed}`
}

function spans(days: Weekday[], opens: string, closes: string): HoursSpan[] {
  return days.map(day => ({ key: newKey('h'), day, opens, closes }))
}

function day(firstDay: string, startTime = '', endTime = ''): DateEntry {
  return { key: newKey('d'), kind: 'day', firstDay, lastDay: firstDay, startTime, endTime }
}

function range(firstDay: string, lastDay: string): DateEntry {
  return { key: newKey('d'), kind: 'range', firstDay, lastDay, startTime: '', endTime: '' }
}

function pin(fields: Partial<Pin> & Pick<Pin, 'id' | 'status' | 'slug'>): Pin {
  return {
    lat: 47.0525,
    lng: 8.3075,
    address: '',
    title: empty,
    tip: empty,
    photo: '',
    alt: empty,
    morePhotos: [],
    categories: [],
    stay: 'both',
    interests: [],
    free: false,
    hours: [],
    dates: [],
    storyId: null,
    link: '',
    edited: '2026-10-20',
    firstPublished: fields.status === 'draft' ? null : '2026-10-02',
    ...fields,
  }
}

/**
 * Fifteen Lucerne pins covering the edge cases: no photo, one language, no category, two
 * categories, only a sub-category, ended, hidden, drafts. The guest map in the same lab
 * reads this list too (`map-guest-data.ts` turns each pin into what the guest sees).
 */
export const seedPins: Pin[] = [
  pin({
    id: 'p1',
    status: 'published',
    slug: 'lion-monument',
    morePhotos: ['vx-lion', 'lucerne-old-town'],
    lat: 47.0583,
    lng: 8.3104,
    address: 'Denkmalstrasse 4, 6006 Luzern',
    title: { en: 'Lion Monument', de: 'Löwendenkmal' },
    tip: {
      en: 'Come before 9:00 and you often have the dying lion to yourself. The pond in front is the best spot for a quiet minute.',
      de: 'Vor 9 Uhr haben Sie den sterbenden Löwen oft für sich. Am Teich davor ist der beste Platz für eine stille Minute.',
    },
    photo: 'lion-monument',
    alt: { en: 'The carved lion lying in the rock face above a pond', de: 'Der in den Fels gehauene Löwe über einem Teich' },
    categories: ['walks', 'photo'],
    interests: ['history-culture'],
    storyId: 's1',
    edited: '2026-10-24',
    firstPublished: '2026-10-02',
  }),
  pin({
    id: 'p2',
    status: 'published',
    slug: 'chapel-bridge',
    morePhotos: ['lucerne-water-tower', 'vx-chapel-bridge', 'lucerne-night'],
    lat: 47.0517,
    lng: 8.3077,
    title: { en: 'Chapel Bridge', de: 'Kapellbrücke' },
    tip: { en: 'Look up: the triangular paintings under the roof tell the city’s story.', de: 'Schauen Sie nach oben: Die Dreiecksbilder unter dem Dach erzählen die Stadtgeschichte.' },
    photo: 'lucerne-kapellbruecke-1200',
    alt: { en: 'The wooden Chapel Bridge with its water tower', de: 'Die hölzerne Kapellbrücke mit dem Wasserturm' },
    categories: ['walks', 'photo'],
    interests: ['history-culture', 'lake-mountains'],
    storyId: 's2',
    edited: '2026-10-22',
  }),
  pin({
    id: 'p3',
    status: 'published',
    slug: 'kornmarkt-bakery',
    lat: 47.0523,
    lng: 8.3058,
    address: 'Kornmarkt 7, 6004 Luzern',
    title: { en: 'Kornmarkt bakery', de: 'Bäckerei am Kornmarkt' },
    tip: { en: 'Ask for a Luzerner Lebkuchen, still warm on Saturdays.', de: 'Fragen Sie nach Luzerner Lebkuchen, samstags noch warm.' },
    photo: 'kornmarkt',
    alt: { en: 'Bakery window on the Kornmarkt square', de: 'Schaufenster einer Bäckerei am Kornmarkt' },
    categories: ['bakeries'],
    stay: 'short_stay',
    interests: ['food-drink'],
    hours: [...spans([1, 2, 3, 4, 5], '07:00', '18:30'), ...spans([6], '07:00', '16:00')],
    edited: '2026-10-18',
  }),
  pin({
    id: 'p4',
    status: 'published',
    slug: 'weinmarkt-fountain',
    lat: 47.0520,
    lng: 8.3050,
    title: { en: 'Drinking fountain, Weinmarkt', de: 'Trinkbrunnen Weinmarkt' },
    tip: { en: 'Free, cold mountain water. Fill your bottle here.', de: 'Gratis kaltes Bergwasser. Füllen Sie hier Ihre Flasche.' },
    photo: 'weinmarkt',
    alt: { en: 'The painted fountain on the Weinmarkt', de: 'Der bemalte Brunnen auf dem Weinmarkt' },
    categories: ['essentials'],
    stay: 'short_stay',
    free: true,
    edited: '2026-10-05',
  }),
  pin({
    id: 'p5',
    status: 'hidden',
    slug: 'toilets-schwanenplatz',
    lat: 47.0526,
    lng: 8.3101,
    address: 'Schwanenplatz, 6004 Luzern',
    title: { en: 'Public toilets, Schwanenplatz', de: 'Öffentliche WC, Schwanenplatz' },
    tip: { en: 'Free and clean. Closed for works until spring.', de: 'Gratis und sauber. Bis Frühling wegen Bauarbeiten geschlossen.' },
    categories: ['essentials'],
    free: true,
    hours: spans([1, 2, 3, 4, 5, 6, 7], '06:00', '24:00'),
    edited: '2026-10-12',
  }),
  pin({
    id: 'p6',
    status: 'published',
    slug: 'organ-concert-hofkirche',
    lat: 47.0556,
    lng: 8.3122,
    address: 'St. Leodegarstrasse 6, 6006 Luzern',
    title: { en: 'Free organ concert, Hofkirche', de: 'Gratis-Orgelkonzert, Hofkirche' },
    tip: { en: 'Half an hour of the great organ, free entry. Sit at the back for the best sound.', de: 'Eine halbe Stunde grosse Orgel, Eintritt frei. Hinten klingt es am besten.' },
    photo: 'hofkirche',
    alt: { en: 'The twin towers of the Hofkirche', de: 'Die Doppeltürme der Hofkirche' },
    categories: ['happenings'],
    interests: ['local-activities', 'history-culture'],
    dates: [day('2026-10-26', '19:30', '20:30')],
    edited: '2026-10-10',
  }),
  pin({
    id: 'p7',
    status: 'draft',
    slug: 'weihnachtsmarkt',
    lat: null,
    lng: null,
    title: { en: '', de: 'Weihnachtsmarkt Franziskanerplatz' },
    tip: { en: '', de: 'Glühwein, Raclette und Kerzen aus der Region.' },
    categories: ['happenings'],
    interests: ['local-activities', 'food-drink', 'shopping-keepsakes'],
    hours: spans([1, 2, 3, 4, 5, 6, 7], '11:00', '20:00'),
    dates: [range('2026-11-20', '2026-12-23')],
    edited: '2026-10-27',
  }),
  pin({
    id: 'p8',
    status: 'published',
    slug: 'jazz-on-the-quay',
    morePhotos: ['lake-steamboat'],
    lat: 47.0533,
    lng: 8.3112,
    address: 'Nationalquai, 6004 Luzern',
    title: { en: 'Free jazz on the quay', de: 'Gratis-Jazz am Quai' },
    tip: { en: 'Students of the music school play under the chestnut trees. Bring a jacket.', de: 'Studierende der Musikhochschule spielen unter den Kastanien. Jacke mitnehmen.' },
    photo: 'lucerne-night',
    alt: { en: 'The lake promenade at night', de: 'Die Seepromenade am Abend' },
    categories: ['happenings'],
    stay: 'multi_day',
    interests: ['local-activities'],
    dates: [day('2026-11-14', '19:30', '21:00'), day('2026-11-15', '19:30')],
    edited: '2026-10-26',
  }),
  pin({
    id: 'p9',
    status: 'published',
    slug: 'musegg-wall',
    morePhotos: ['zytturm'],
    lat: 47.0570,
    lng: 8.3040,
    title: { en: 'Musegg Wall', de: 'Museggmauer' },
    tip: { en: 'Four of the nine towers are open. Zyt Tower strikes a minute before every other clock.', de: 'Vier der neun Türme sind offen. Der Zytturm schlägt eine Minute vor allen anderen Uhren.' },
    photo: 'musegg-wall',
    alt: { en: 'The old city wall with its towers on a green slope', de: 'Die alte Stadtmauer mit ihren Türmen am grünen Hang' },
    categories: ['walks'],
    interests: ['history-culture'],
    hours: spans([1, 2, 3, 4, 5, 6, 7], '08:00', '19:00'),
    storyId: 's3',
    edited: '2026-10-15',
  }),
  pin({
    id: 'p10',
    status: 'published',
    slug: 'hotel-am-see',
    lat: 47.0540,
    lng: 8.3131,
    address: 'Haldenstrasse 1, 6006 Luzern',
    title: { en: 'Hotel am See', de: 'Hotel am See' },
    tip: { en: 'Small family hotel with lake-view rooms, ten minutes on foot from the station.', de: 'Kleines Familienhotel mit Seesicht, zehn Minuten zu Fuss vom Bahnhof.' },
    photo: 'stay',
    alt: { en: 'A hotel room with a view of the lake', de: 'Ein Hotelzimmer mit Blick auf den See' },
    stay: 'multi_day',
    // A hotel fits none of the five interests: it is the lab's item for the home's "More in Lucerne" strip.
    interests: [],
    link: 'https://hotel-am-see.example.ch/rooms',
    edited: '2026-10-09',
  }),
  pin({
    id: 'p11',
    status: 'draft',
    slug: 'nadelwehr-view',
    lat: null,
    lng: null,
    title: { en: 'Needle dam viewpoint', de: '' },
    tip: empty,
    photo: 'nadelwehr',
    alt: empty,
    categories: ['photo'],
    interests: ['lake-mountains'],
    edited: '2026-10-25',
  }),
  pin({
    id: 'p12',
    status: 'published',
    slug: 'reuss-flea-market',
    lat: 47.0511,
    lng: 8.3045,
    address: 'Unter der Egg, 6004 Luzern',
    title: { en: 'Flea market on the Reuss', de: 'Flohmarkt an der Reuss' },
    tip: { en: 'Every Saturday until the end of October. Old postcards and cow bells.', de: 'Jeden Samstag bis Ende Oktober. Alte Postkarten und Kuhglocken.' },
    photo: 'postcards',
    alt: { en: 'Old postcards on a market table', de: 'Alte Postkarten auf einem Markttisch' },
    categories: ['happenings', 'walks'],
    interests: ['local-activities', 'shopping-keepsakes'],
    hours: spans([6], '08:00', '16:00'),
    dates: [range('2026-05-02', '2026-10-31')],
    edited: '2026-09-30',
  }),
  pin({
    id: 'p13',
    status: 'published',
    slug: 'spreuer-bridge',
    morePhotos: ['spreuer-totentanz', 'nadelwehr'],
    lat: 47.0525,
    lng: 8.3021,
    title: { en: 'Spreuer Bridge', de: 'Spreuerbrücke' },
    tip: { en: 'Quieter than the Chapel Bridge, with the dance of death paintings.', de: 'Ruhiger als die Kapellbrücke, mit den Totentanzbildern.' },
    photo: 'spreuer-bridge',
    alt: { en: 'The covered Spreuer Bridge over the river', de: 'Die gedeckte Spreuerbrücke über der Reuss' },
    categories: ['walks', 'photo'],
    interests: ['history-culture'],
    storyId: 's4',
    edited: '2026-10-01',
  }),
  // Published in one language only: the guest in the other language sees it with a notice (AC64).
  pin({
    id: 'p14',
    status: 'published',
    slug: 'swan-view',
    morePhotos: ['vx-swan'],
    lat: 47.0521,
    lng: 8.3104,
    title: { en: 'Swans by the Seebrücke', de: '' },
    tip: { en: 'Walk down the steps at the Seebrücke. The swans come close in the morning, with the Chapel Bridge behind them.', de: '' },
    photo: 'lucerne-swan',
    alt: { en: 'Two swans on the lake with the old town behind', de: '' },
    categories: ['photo'],
    stay: 'short_stay',
    interests: ['lake-mountains'],
    edited: '2026-10-20',
    firstPublished: '2026-10-20',
  }),
  pin({
    id: 'p15',
    status: 'published',
    slug: 'baeckerei-weinmarkt',
    lat: 47.0516,
    lng: 8.3054,
    address: 'Weinmarkt 6, 6004 Luzern',
    title: { en: '', de: 'Bäckerei am Weinmarkt' },
    tip: { en: '', de: 'Fragen Sie nach dem Luzerner Lebkuchen. Am Morgen gibt es warme Gipfeli für unterwegs.' },
    categories: ['bakeries'],
    stay: 'short_stay',
    interests: ['food-drink'],
    hours: [...spans([1, 2, 3, 4, 5], '06:30', '18:30'), ...spans([6], '07:00', '17:00')],
    edited: '2026-10-18',
    firstPublished: '2026-10-18',
  }),
]

/** A blank pin for Add place and Add event. */
export function blankPin(withDate: boolean): Pin {
  return pin({
    id: 'new',
    status: 'draft',
    slug: '',
    lat: null,
    lng: null,
    stay: 'both',
    dates: withDate ? [day('')] : [],
    edited: LAB_TODAY,
  })
}

export function newDateEntry(kind: DateEntry['kind']): DateEntry {
  return kind === 'day' ? day('') : range('', '')
}

export function newSpan(dayNumber: Weekday): HoursSpan {
  return { key: newKey('h'), day: dayNumber, opens: '09:00', closes: '18:00' }
}

// --- Rules ---

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const CLOSING_TIME = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const WHITESPACE = /\s/
const LEADING_WWW = /^www\./

/** An http(s) address with a dotted host and no spaces. */
function isLink(value: string) {
  if (WHITESPACE.test(value))
    return false
  try {
    const url = new URL(value)

    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  }
  catch {
    return false
  }
}

/** The day after an ISO day, as an ISO day. */
function nextDay(isoDay: string) {
  const date = new Date(`${isoDay}T12:00:00Z`)

  date.setUTCDate(date.getUTCDate() + 1)

  return date.toISOString().slice(0, 10)
}

/** When an entry ends in Europe/Zurich, as "YYYY-MM-DDTHH:MM" (DM-21 `ends_at`). */
export function entryEndsAt(entry: DateEntry) {
  if (entry.kind === 'day' && entry.endTime)
    return `${entry.firstDay}T${entry.endTime}`

  return `${nextDay(entry.lastDay || entry.firstDay)}T00:00`
}

export function isEntryEnded(entry: DateEntry) {
  return !!entry.firstDay && entryEndsAt(entry) <= LAB_NOW
}

/** The earliest entry that has not ended; one running now counts (DM-21). */
export function nextEntry(dates: DateEntry[]) {
  return dates
    .filter(d => d.firstDay && !isEntryEnded(d))
    .sort((a, b) => (a.firstDay + a.startTime).localeCompare(b.firstDay + b.startTime))[0]
}

/** The last day of the last entry, for "leaves the map after …". */
export function lastEntry(dates: DateEntry[]) {
  return dates
    .filter(d => d.firstDay)
    .sort((a, b) => entryEndsAt(a).localeCompare(entryEndsAt(b)))
    .at(-1)
}

/** Published with dates, all of them over: still published, but off the map. */
export function isEnded(p: Pin) {
  return p.status === 'published' && p.dates.some(d => d.firstDay) && !nextEntry(p.dates)
}

/** The status the list and filters show; "ended" is derived, not stored. */
export type ShownStatus = PinStatus | 'ended'

export function shownStatus(p: Pin): ShownStatus {
  return isEnded(p) ? 'ended' : p.status
}

export function hasTitle(p: Pin) {
  return !!(p.title.en.trim() || p.title.de.trim())
}

export function suggestSlug(p: Pin) {
  return slugify(p.title.en || p.title.de)
}

/** Another pin that holds the slug; hidden pins keep theirs (ADR-015). */
export function slugOwner(p: Pin, all: Pin[]) {
  return p.slug ? all.find(other => other.id !== p.id && other.slug === p.slug) : undefined
}

export type ChecklistItem = 'title' | 'location' | 'slug'

/** The three things a pin needs to publish (AC68); everything else is optional. */
export function checklist(p: Pin, all: Pin[]): Record<ChecklistItem, boolean> {
  return {
    title: hasTitle(p),
    location: p.lat !== null && p.lng !== null,
    slug: !!p.slug && SLUG.test(p.slug) && !slugOwner(p, all),
  }
}

/** Filled fields per language: title, tip and, when there is a photo, its alt text. */
export function completeness(p: Pin, language: Language) {
  const fields = [p.title[language], p.tip[language], ...(p.photo ? [p.alt[language]] : [])]

  return { done: fields.filter(f => f.trim()).length, total: fields.length }
}

export type FieldError
  = | 'slugFormat'
    | 'slugTaken'
    | 'linkFormat'
    | 'dateMissing'
    | 'dateOrder'
    | 'timeFormat'
    | 'endNeedsStart'
    | 'crossesMidnight'
    | 'hoursFormat'
    | 'hoursOrder'

/** Errors that stop any save, keyed by field ("slug", "link", "date:<key>", "hours:<key>"). */
export function fieldErrors(p: Pin, all: Pin[]) {
  const errors: Record<string, FieldError> = {}

  if (p.slug && !SLUG.test(p.slug))
    errors.slug = 'slugFormat'
  else if (slugOwner(p, all))
    errors.slug = 'slugTaken'
  if (p.link && !isLink(p.link))
    errors.link = 'linkFormat'
  for (const d of p.dates) {
    const key = `date:${d.key}`

    if (!d.firstDay || (d.kind === 'range' && !d.lastDay))
      errors[key] = 'dateMissing'
    else if (d.kind === 'range' && d.lastDay < d.firstDay)
      errors[key] = 'dateOrder'
    else if ((d.startTime && !TIME.test(d.startTime)) || (d.endTime && !TIME.test(d.endTime)))
      errors[key] = 'timeFormat'
    else if (d.endTime && !d.startTime)
      errors[key] = 'endNeedsStart'
    else if (d.startTime && d.endTime && d.endTime <= d.startTime)
      errors[key] = 'crossesMidnight'
  }
  for (const s of p.hours) {
    if (!TIME.test(s.opens) || !CLOSING_TIME.test(s.closes))
      errors[`hours:${s.key}`] = 'hoursFormat'
    else if (s.closes <= s.opens)
      errors[`hours:${s.key}`] = 'hoursOrder'
  }

  return errors
}

export function categoryName(c: MapCategory, language: Language) {
  return c.name[language] || c.name[language === 'en' ? 'de' : 'en']
}

/** The host and path of a link, for the preview row. */
export function linkParts(url: string) {
  try {
    const parsed = new URL(url)

    return { host: parsed.host.replace(LEADING_WWW, ''), path: parsed.pathname === '/' ? '' : parsed.pathname }
  }
  catch {
    return undefined
  }
}

/** The pin each editor scenario opens with. */
export function scenarioPin(scenario: string): Pin {
  const byId = (id: string) => structuredClone(seedPins.find(p => p.id === id)!)

  switch (scenario) {
    case 'new-place':
      return blankPin(false)
    case 'new-event':
      return blankPin(true)
    case 'hidden':
      return byId('p5')
    case 'ended':
      return byId('p6')
    case 'draft-errors': {
      const draft = byId('p7')

      // Taken slug, a late concert that crosses midnight and a link with a space.
      draft.slug = 'reuss-flea-market'
      draft.dates = [...draft.dates, day('2026-12-24', '22:00', '00:30')]
      draft.link = 'www.luzern weihnachtsmarkt.ch'

      return draft
    }
    default:
      return byId('p1')
  }
}

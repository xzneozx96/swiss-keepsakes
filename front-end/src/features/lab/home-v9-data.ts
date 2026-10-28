/**
 * Lab, home V9 "a local friend's briefing" (C01, round 8): the data and rules behind the page.
 * The home follows a first-time visitor's first day in a fixed order; the onboarding answers only
 * order the cards inside three sections (must-visits, routes, food). Nothing is hidden by them.
 * The unit test `tests/lab-home-v9.test.ts` locks the rules.
 *
 * Lab-only content added here (each item marked "lab" is not merchant data yet): the service
 * points (water, toilets, SIM and Wi-Fi, transport, lockers, cash), the must-visit tips, the
 * old-town walk, four food places and four events. Locations are real places in Lucerne; the
 * report lists the facts that still need the merchant's check.
 */
import type { HomeItem } from '@/features/lab/home-data'
import type { Answers, Interest, Language, LngLat, Pin, Stay } from '@/features/lab/map-guest-data'

import { numberFormat } from '@sk/domain/shared'

import { copy, HERO_PHOTO, occurrences, visitors } from '@/features/lab/home-data'
import { categories, findStory, pickText } from '@/features/lab/map-guest-data'
import { LAB_TODAY } from '@/features/lab/pins-merchant-data'

type L = Record<Language, string>

// ---------------------------------------------------------------- page order

/** The page, top to bottom, the same for every visitor (it follows a first day in town). `ending` joins the keepsakes and the advice ask. */
export const V9_SECTIONS = ['hero', 'map', 'services', 'must-visits', 'routes', 'food', 'events', 'ending'] as const
export type V9SectionId = typeof V9_SECTIONS[number]

/** The sections whose cards the answers order. The sorted line sits just above the first one. */
export const PERSONALISED: V9SectionId[] = ['must-visits', 'routes', 'food']

/** The section order for a visitor: always the same (the answers are taken to show they do not matter). */
export function v9Sections(_answers: Answers): V9SectionId[] {
  return [...V9_SECTIONS]
}

/**
 * Photos that do not show their title, or show something else: never used large on V9.
 * `postcards` is a vase, `kornmarkt` the town hall, `stay` a Grindelwald hut, and the hero
 * photo is already the top of the page.
 */
export const BAD_PHOTOS = new Set(['postcards', 'kornmarkt', 'stay'])
export const HERO_ONLY = HERO_PHOTO

// ---------------------------------------------------------------- the friend's copy

const en = {
  mapTitle: 'First time in Lucerne?',
  mapBody: 'We’ve pinned the places we’d show a friend, so you can see the whole old town before you take a step.',
  mapAction: 'Open the map',
  servicesTitle: 'Sorted before you unpack',
  servicesBody: 'The small things that make a first day easy, and where to find them.',
  mustTitle: 'See these first',
  mustBody: 'The sights a first visit is built around, and the best hour for each.',
  storyLink: 'The story behind it',
  routesTitle: 'Walk it the way we would',
  routesBody: 'Routes we take our own friends on, free to follow at your own pace.',
  routeMeta: { walk: (h: string) => `${h} on foot`, trip: (h: string) => `Day trip · ${h}` },
  foodTitle: 'Eat and drink like a local',
  foodBody: 'The places we go back to, morning to night.',
  eventsTitle: 'While you’re in town',
  eventsBody: 'Lucerne keeps a busy calendar. Here’s what falls in the coming weeks.',
  thisWeek: 'This week',
  later: 'Coming up',
  viewAllEvents: 'See all on the map',
  startFinish: (start: string, finish: string) => `${start} to ${finish}`,
  serviceMapHint: 'Tap a place for directions in your own map app.',
  directions: 'Directions',
  sortFor: 'Sort for my trip',
  sortedFor: (summary: string) => `Sorted for ${summary}`,
  change: 'Change',
  eventsMapTitle: 'While you’re in town',
  bridge: 'There’s still more of Lucerne to see first.',
}

const de: typeof en = {
  mapTitle: 'Zum ersten Mal in Luzern?',
  mapBody: 'Wir haben die Orte markiert, die wir Freunden zeigen, damit Sie die Altstadt sehen, bevor Sie losgehen.',
  mapAction: 'Karte öffnen',
  servicesTitle: 'Erledigt, bevor Sie auspacken',
  servicesBody: 'Die kleinen Dinge, die einen ersten Tag leicht machen, und wo Sie sie finden.',
  mustTitle: 'Das zuerst',
  mustBody: 'Die Orte, um die sich ein erster Besuch dreht, und die beste Stunde für jeden.',
  storyLink: 'Die Geschichte dazu',
  routesTitle: 'So würden wir gehen',
  routesBody: 'Routen, auf die wir unsere eigenen Freunde mitnehmen, kostenlos und in Ihrem Tempo.',
  routeMeta: { walk: (h: string) => `${h} zu Fuss`, trip: (h: string) => `Tagesausflug · ${h}` },
  foodTitle: 'Essen und trinken wie die Einheimischen',
  foodBody: 'Die Orte, in die wir immer wieder gehen, von früh bis spät.',
  eventsTitle: 'Solange Sie hier sind',
  eventsBody: 'Luzern hat einen vollen Kalender. Das fällt in die nächsten Wochen.',
  thisWeek: 'Diese Woche',
  later: 'Demnächst',
  viewAllEvents: 'Alle auf der Karte',
  startFinish: (start: string, finish: string) => `${start} bis ${finish}`,
  serviceMapHint: 'Tippen Sie auf einen Ort für die Route in Ihrer eigenen Karten-App.',
  directions: 'Route',
  sortFor: 'Für meine Reise sortieren',
  sortedFor: (summary: string) => `Sortiert für ${summary}`,
  change: 'Ändern',
  eventsMapTitle: 'Solange Sie hier sind',
  bridge: 'Zuerst gibt es noch mehr Luzern zu sehen.',
}

export const v9Copy: Record<Language, typeof en> = { en, de }

// ---------------------------------------------------------------- services (lab pins)

export type ServiceId = 'water' | 'toilets' | 'connect' | 'transport' | 'lockers' | 'cash'

export const SERVICES: { id: ServiceId, label: L }[] = [
  { id: 'water', label: { en: 'Drinking water', de: 'Trinkwasser' } },
  { id: 'toilets', label: { en: 'Free toilets', de: 'Gratis-WC' } },
  { id: 'connect', label: { en: 'SIM and Wi-Fi', de: 'SIM und WLAN' } },
  { id: 'transport', label: { en: 'Trains, buses, boats', de: 'Bahn, Bus, Schiff' } },
  { id: 'lockers', label: { en: 'Luggage lockers', de: 'Gepäckfächer' } },
  { id: 'cash', label: { en: 'Cash and cards', de: 'Bargeld und Karten' } },
]

export interface ServicePoint {
  id: string
  service: ServiceId
  title: L
  note: L
  coordinates: LngLat
}

/** Lab pins at real Lucerne places. The coordinates are estimates; the merchant must confirm each place. */
export const servicePoints: ServicePoint[] = [
  {
    id: 's-water-weinmarkt',
    service: 'water',
    title: { en: 'Fountain on the Weinmarkt', de: 'Brunnen am Weinmarkt' },
    note: { en: 'Cold, clean mountain water. Fill your bottle here.', de: 'Kaltes, sauberes Quellwasser. Füllen Sie hier Ihre Flasche.' },
    coordinates: [8.3049, 47.0520],
  },
  {
    id: 's-water-kapellplatz',
    service: 'water',
    title: { en: 'Fritschi Fountain, Kapellplatz', de: 'Fritschibrunnen, Kapellplatz' },
    note: { en: 'At the old-town end of the Chapel Bridge.', de: 'Am Altstadtende der Kapellbrücke.' },
    coordinates: [8.3068, 47.0517],
  },
  {
    id: 's-water-bahnhof',
    service: 'water',
    title: { en: 'Fountain on Bahnhofplatz', de: 'Brunnen auf dem Bahnhofplatz' },
    note: { en: 'In front of the station, by the lake.', de: 'Vor dem Bahnhof, am See.' },
    coordinates: [8.3106, 47.0507],
  },
  {
    id: 's-wc-loewenplatz',
    service: 'toilets',
    title: { en: 'Public toilets, Löwenplatz', de: 'Öffentliches WC, Löwenplatz' },
    note: { en: 'Two minutes from the Lion Monument.', de: 'Zwei Minuten vom Löwendenkmal.' },
    coordinates: [8.3112, 47.0572],
  },
  {
    id: 's-wc-schwanenplatz',
    service: 'toilets',
    title: { en: 'Public toilets, Schwanenplatz', de: 'Öffentliches WC, Schwanenplatz' },
    note: { en: 'On the lake side of the old town.', de: 'Auf der Seeseite der Altstadt.' },
    coordinates: [8.3093, 47.0526],
  },
  {
    id: 's-wc-kasernenplatz',
    service: 'toilets',
    title: { en: 'Public toilets, Kasernenplatz', de: 'Öffentliches WC, Kasernenplatz' },
    note: { en: 'Just past the Spreuer Bridge.', de: 'Gleich nach der Spreuerbrücke.' },
    coordinates: [8.3016, 47.0514],
  },
  {
    id: 's-wifi-station',
    service: 'connect',
    title: { en: 'Free Wi-Fi in the station', de: 'Gratis-WLAN im Bahnhof' },
    note: { en: 'Join SBB-FREE and confirm with a text message.', de: 'Mit SBB-FREE verbinden und per SMS bestätigen.' },
    coordinates: [8.3101, 47.0502],
  },
  {
    id: 's-sim-pilatusstrasse',
    service: 'connect',
    title: { en: 'Phone shops, Pilatusstrasse', de: 'Handyläden, Pilatusstrasse' },
    note: { en: 'Prepaid SIM cards. Bring your passport: Swiss SIMs are registered.', de: 'Prepaid-SIM-Karten. Pass mitnehmen: Schweizer SIMs werden registriert.' },
    coordinates: [8.3068, 47.0493],
  },
  {
    id: 's-station',
    service: 'transport',
    title: { en: 'Lucerne station', de: 'Bahnhof Luzern' },
    note: { en: 'Trains, and most city buses leave from the square in front.', de: 'Züge, und die meisten Stadtbusse fahren vom Platz davor.' },
    coordinates: [8.3101, 47.0502],
  },
  {
    id: 's-piers',
    service: 'transport',
    title: { en: 'Lake boat piers', de: 'Schiffstation' },
    note: { en: 'Steamers to Vitznau for the Rigi, across from the station.', de: 'Dampfschiffe nach Vitznau zur Rigi, gegenüber dem Bahnhof.' },
    coordinates: [8.3112, 47.0513],
  },
  {
    id: 's-bus-loewenplatz',
    service: 'transport',
    title: { en: 'Bus stop Löwenplatz', de: 'Bushaltestelle Löwenplatz' },
    note: { en: 'The nearest stop to the Lion Monument.', de: 'Die nächste Haltestelle zum Löwendenkmal.' },
    coordinates: [8.3108, 47.0569],
  },
  {
    id: 's-lockers-station',
    service: 'lockers',
    title: { en: 'Lockers in the station', de: 'Schliessfächer im Bahnhof' },
    note: { en: 'Several sizes. Drop your case and see the old town light.', de: 'Mehrere Grössen. Koffer abgeben und die Altstadt ohne Gepäck sehen.' },
    coordinates: [8.3097, 47.0499],
  },
  {
    id: 's-cash-station',
    service: 'cash',
    title: { en: 'Cash machines, station hall', de: 'Bancomaten, Bahnhofhalle' },
    note: { en: 'Cards work almost everywhere. TWINT needs a Swiss bank app, so most visitors pay by card.', de: 'Karten gehen fast überall. TWINT braucht eine Schweizer Bank-App, darum zahlen die meisten Gäste mit Karte.' },
    coordinates: [8.3100, 47.0504],
  },
]

export function pointsOf(service: ServiceId) {
  return servicePoints.filter(point => point.service === service)
}

// ---------------------------------------------------------------- personal order inside a section

interface Ordered {
  interests: Interest[]
  stay?: Stay
}

function fits(item: Ordered, stay: Stay | undefined) {
  return !stay || !item.stay || item.stay === 'both' || item.stay === stay
}

/**
 * The cards' order for a visitor: more of their interests first, then those that fit their stay
 * length, then the curated order. A stable sort: with no answers the curated order stays.
 */
export function orderFor<T extends Ordered>(list: T[], answers: Answers): T[] {
  const { stay, interests } = visitors[answers]
  const matches = (item: T) => item.interests.filter(i => interests.includes(i)).length

  return [...list].sort((a, b) => matches(b) - matches(a) || Number(fits(b, stay)) - Number(fits(a, stay)))
}

// ---------------------------------------------------------------- must-visits

export interface MustVisit {
  id: string
  /** The map's `?place=` slug (a pin where one exists). */
  slug: string
  title: L
  /** The short name on a route's stop line. */
  stop: L
  photo: string
  tip: L
  /** The story behind it, when one is published (in at least one language). */
  story?: string
  interests: Interest[]
}

/** Curated order: the walk's own order, from the station side. Tips: see the report for the unsure ones. */
export const mustVisits: MustVisit[] = [
  {
    id: 'm-chapel-bridge',
    slug: 'chapel-bridge',
    title: { en: 'Chapel Bridge and Water Tower', de: 'Kapellbrücke und Wasserturm' },
    stop: { en: 'Chapel Bridge', de: 'Kapellbrücke' },
    photo: 'lucerne-water-tower',
    tip: {
      en: 'Cross it before 8 or after dark, when it is lit and nearly empty. Look up at the paintings in the roof.',
      de: 'Gehen Sie vor 8 Uhr oder nach dem Eindunkeln hinüber, wenn sie beleuchtet und fast leer ist. Schauen Sie zu den Bildern unter dem Dach hinauf.',
    },
    story: 'chapel-bridge-paintings',
    interests: ['history-culture', 'lake-mountains'],
  },
  {
    id: 'm-old-town-squares',
    slug: 'weinmarkt',
    title: { en: 'Weinmarkt and the old-town squares', de: 'Weinmarkt und die Altstadtplätze' },
    stop: { en: 'Weinmarkt', de: 'Weinmarkt' },
    photo: 'weinmarkt',
    tip: {
      en: 'Kornmarkt, Weinmarkt and Hirschenplatz are a minute apart. Look up at the painted house fronts, and fill your bottle at the fountain.',
      de: 'Kornmarkt, Weinmarkt und Hirschenplatz liegen eine Minute auseinander. Schauen Sie zu den bemalten Fassaden hinauf und füllen Sie Ihre Flasche am Brunnen.',
    },
    story: 'slow-morning-weinmarkt',
    interests: ['history-culture', 'food-drink'],
  },
  {
    id: 'm-spreuer-bridge',
    slug: 'spreuer-bridge',
    title: { en: 'Spreuer Bridge', de: 'Spreuerbrücke' },
    stop: { en: 'Spreuer Bridge', de: 'Spreuerbrücke' },
    photo: 'spreuer-bridge',
    tip: {
      en: 'Quieter than the Chapel Bridge. Its roof paintings are a Dance of Death from the 1600s, and the needle dam is right beside it.',
      de: 'Ruhiger als die Kapellbrücke. Die Bilder unter dem Dach sind ein Totentanz aus dem 17. Jahrhundert, und gleich daneben liegt das Nadelwehr.',
    },
    // The Dance of Death story has no published language version yet, so no link.
    story: 'dance-of-death',
    interests: ['history-culture'],
  },
  {
    id: 'm-musegg-wall',
    slug: 'musegg-wall',
    title: { en: 'Musegg Wall', de: 'Museggmauer' },
    stop: { en: 'Musegg Wall', de: 'Museggmauer' },
    photo: 'musegg-wall',
    tip: {
      en: 'Be at the Zyt Tower just before the hour: its clock strikes a minute before every other clock in town. The towers close for winter in early November.',
      de: 'Seien Sie kurz vor der vollen Stunde beim Zytturm: Seine Uhr schlägt eine Minute vor allen anderen der Stadt. Die Türme schliessen Anfang November über den Winter.',
    },
    story: 'nine-towers',
    interests: ['history-culture'],
  },
  {
    id: 'm-lion-monument',
    slug: 'lion-monument',
    title: { en: 'Lion Monument', de: 'Löwendenkmal' },
    stop: { en: 'Lion Monument', de: 'Löwendenkmal' },
    photo: 'lion-monument',
    tip: {
      en: 'Go before 9, before the tour coaches. Read the inscription, then take a quiet minute by the pond.',
      de: 'Kommen Sie vor 9 Uhr, vor den Reisecars. Lesen Sie die Inschrift und nehmen Sie sich am Teich eine stille Minute.',
    },
    story: 'the-dying-lion',
    interests: ['history-culture'],
  },
  {
    id: 'm-jesuit-church',
    slug: 'jesuit-church',
    title: { en: 'Jesuit Church', de: 'Jesuitenkirche' },
    stop: { en: 'Jesuit Church', de: 'Jesuitenkirche' },
    photo: 'jesuit-church',
    tip: {
      en: 'See the two onion domes from the river first, then step inside when no service is on. Entry is free.',
      de: 'Sehen Sie sich die zwei Zwiebeltürme zuerst vom Fluss aus an und gehen Sie dann hinein, wenn kein Gottesdienst ist. Der Eintritt ist frei.',
    },
    interests: ['history-culture'],
  },
]

export function mustVisitsFor(answers: Answers) {
  return orderFor(mustVisits, answers)
}

// ---------------------------------------------------------------- routes

export interface Stop {
  name: L
}

export interface Route {
  id: string
  slug: string
  title: L
  photo: string
  hours: number
  kind: 'walk' | 'trip'
  stops: Stop[]
}

/** The lab's old-town walk joins the three tours' free information. It passes every must-visit. */
export const OLD_TOWN_WALK_STOPS = ['m-jesuit-church', 'm-chapel-bridge', 'm-old-town-squares', 'm-spreuer-bridge', 'm-musegg-wall', 'm-lion-monument']

const stop = (en: string, de: string): Stop => ({ name: { en, de } })

export const routes: Route[] = [
  {
    id: 'route-old-town',
    slug: 'old-town-on-foot',
    title: { en: 'The old town on foot', de: 'Die Altstadt zu Fuss' },
    photo: 'hirschenplatz',
    hours: 2,
    kind: 'walk',
    stops: OLD_TOWN_WALK_STOPS.map(id => ({ name: mustVisits.find(m => m.id === id)!.stop })),
  },
  {
    id: 'tour-things-that-remain',
    slug: 'lucerne-the-things-that-remain',
    title: { en: 'The Things That Remain', de: 'Was bleibt' },
    photo: 'spreuer-totentanz',
    hours: 3,
    kind: 'walk',
    stops: [
      stop('Chapel Bridge', 'Kapellbrücke'),
      stop('Kornmarkt', 'Kornmarkt'),
      stop('Weinmarkt', 'Weinmarkt'),
      stop('Spreuer Bridge', 'Spreuerbrücke'),
      stop('Needle Dam', 'Nadelwehr'),
    ],
  },
  {
    id: 'tour-rigi',
    slug: 'rigi-from-lake-to-sky',
    title: { en: 'Rigi: From Lake to Sky', de: 'Rigi: Vom See zum Himmel' },
    photo: 'rigi-vitznau-train',
    hours: 8,
    kind: 'trip',
    stops: [
      stop('Lucerne piers', 'Schiffstation Luzern'),
      stop('Vitznau', 'Vitznau'),
      stop('Rigi Kulm', 'Rigi Kulm'),
      stop('Rigi Kaltbad', 'Rigi Kaltbad'),
    ],
  },
  {
    id: 'tour-pilatus',
    slug: 'pilatus-above-the-city',
    title: { en: 'Pilatus: Above the City', de: 'Pilatus: Über der Stadt' },
    photo: 'pilatus-dragon-ride',
    hours: 6.5,
    kind: 'trip',
    stops: [
      stop('Lucerne station', 'Bahnhof Luzern'),
      stop('Kriens', 'Kriens'),
      stop('Fräkmüntegg', 'Fräkmüntegg'),
      stop('Pilatus Kulm', 'Pilatus Kulm'),
    ],
  },
]

/** Stay length picks the order: a multi-day visitor sees the day trips first, everyone else the walks. */
export function routesFor(answers: Answers): Route[] {
  const tripsFirst = visitors[answers].stay === 'multi-day'

  return [...routes].sort((a, b) => tripsFirst ? Number(b.kind === 'trip') - Number(a.kind === 'trip') : Number(b.kind === 'walk') - Number(a.kind === 'walk'))
}

// ---------------------------------------------------------------- food

function labFoodPin(id: string, title: L, category: string, tip: L, address: string, coordinates: LngLat, interests: Interest[], stay: Stay, photo?: string): Pin {
  return {
    id,
    slug: id.slice(2),
    coordinates,
    title,
    tip,
    photo,
    photos: photo ? [photo] : [],
    address,
    categories: [category],
    stay,
    interests,
    free: false,
    otherStories: [],
    publishedAt: '2026-10-20',
    status: 'published',
  }
}

/** Lab food pins (real Lucerne places, estimated coordinates, no hours yet; a photo only where the set truly shows the place): they join the map's two bakeries. */
export const labFoodPins: Pin[] = [
  labFoodPin(
    'f-wochenmarkt',
    { en: 'Weekly market on the Reuss', de: 'Wochenmarkt an der Reuss' },
    'food',
    { en: 'Tuesday and Saturday mornings along the river. Come early for bread, Sbrinz cheese and mountain honey.', de: 'Dienstag- und Samstagmorgen am Fluss. Früh kommen für Brot, Sbrinz und Bergbienenhonig.' },
    'Unter der Egg, Luzern',
    [8.3065, 47.0517],
    ['food-drink', 'local-activities'],
    'short-stay',
  ),
  labFoodPin(
    'f-wirtshaus-galliker',
    { en: 'Wirtshaus Galliker', de: 'Wirtshaus Galliker' },
    'food',
    { en: 'Old Lucerne cooking in a wood-panelled room. Order the Chügelipastete, the city’s own pastry pie.', de: 'Alte Luzerner Küche in der getäferten Stube. Bestellen Sie die Chügelipastete.' },
    'Schützenstrasse 1, Luzern',
    [8.3014, 47.0507],
    ['food-drink', 'history-culture'],
    'both',
  ),
  labFoodPin(
    'f-cafe-heini',
    { en: 'Café Heini', de: 'Café Heini' },
    'bakeries',
    { en: 'Where locals stop for coffee and a slice of cake between errands.', de: 'Hier trinken Einheimische zwischen zwei Besorgungen Kaffee und essen ein Stück Kuchen.' },
    'Falkenplatz, Luzern',
    [8.3062, 47.0532],
    ['food-drink'],
    'both',
  ),
  labFoodPin(
    'f-neubad',
    { en: 'Neubad', de: 'Neubad' },
    'food',
    { en: 'The old city pool, now a culture house. Lunch where the swimmers used to be.', de: 'Das alte Hallenbad, heute ein Kulturhaus. Mittagessen, wo früher geschwommen wurde.' },
    'Bireggstrasse 36, Luzern',
    [8.3052, 47.0447],
    ['food-drink', 'local-activities'],
    'multi-day',
  ),
  labFoodPin(
    'f-rathaus-brauerei',
    { en: 'Rathaus Brauerei', de: 'Rathaus Brauerei' },
    'pubs',
    { en: 'Beer brewed on the spot under the town hall arcades, with tables by the river.', de: 'Bier aus der eigenen Brauerei unter den Rathausarkaden, mit Tischen am Fluss.' },
    'Unter der Egg 2, Luzern',
    [8.3063, 47.0519],
    ['food-drink'],
    'both',
    // The brewery is in the Town Hall, which this photo shows (honest here, unlike for the Kornmarkt bakery).
    'kornmarkt',
  ),
  labFoodPin(
    'f-mr-pickwick',
    { en: 'Mr. Pickwick Pub', de: 'Mr. Pickwick Pub' },
    'pubs',
    { en: 'An English pub on the Rathausquai: a late drink with the river outside the window.', de: 'Ein englischer Pub am Rathausquai: ein letztes Glas mit dem Fluss vor dem Fenster.' },
    'Rathausquai 6, Luzern',
    [8.3083, 47.0521],
    ['food-drink'],
    'both',
  ),
  labFoodPin(
    'f-confiserie-bachmann',
    { en: 'Confiserie Bachmann, Schwanenplatz', de: 'Confiserie Bachmann, Schwanenplatz' },
    'bakeries',
    { en: 'Lucerne’s own confiserie: a coffee and a Luzerner Rägetröpfli by the lake.', de: 'Die Luzerner Confiserie: ein Kaffee und ein Luzerner Rägetröpfli am See.' },
    'Schwanenplatz 7, Luzern',
    [8.3094, 47.0524],
    ['food-drink'],
    'short-stay',
  ),
]

/**
 * The food section's map: every pin of the guest map (the approved map, filtered to food and
 * drink on load, the other categories one tap away), plus the lab's food pins.
 */
export function mapPins(items: HomeItem[]): Pin[] {
  return [...items.flatMap(item => item.kind === 'place' && item.pin ? [item.pin] : []), ...labFoodPins]
}

// ---------------------------------------------------------------- events

function labEvent(id: string, title: L, tip: L, coordinates: LngLat, dates: Pin['dates']): Pin {
  return {
    id,
    slug: id,
    coordinates,
    title,
    tip,
    photos: [],
    categories: ['happenings'],
    interests: ['local-activities'],
    free: false,
    dates,
    otherStories: [],
    publishedAt: '2026-10-20',
    status: 'published',
  }
}

/** Lab events. The Määs is over on purpose: it must never show. */
export const labEvents: Pin[] = [
  labEvent(
    'e-maess',
    { en: 'Lucerne autumn fair (Määs)', de: 'Luzerner Määs' },
    { en: 'Rides and roasted almonds on the Inseli.', de: 'Bahnen und gebrannte Mandeln auf dem Inseli.' },
    [8.3125, 47.0490],
    [{ kind: 'range', from: '2026-10-03', to: '2026-10-18' }],
  ),
  labEvent(
    'e-blues',
    { en: 'Lucerne Blues Festival', de: 'Lucerne Blues Festival' },
    { en: 'A week of blues bands from both sides of the Atlantic at the Grand Casino.', de: 'Eine Woche Bluesbands von beiden Seiten des Atlantiks im Grand Casino.' },
    [8.3154, 47.0562],
    [{ kind: 'range', from: '2026-11-09', to: '2026-11-14' }],
  ),
  labEvent(
    'e-christmas',
    { en: 'Christmas market, Franziskanerplatz', de: 'Weihnachtsmarkt, Franziskanerplatz' },
    { en: 'Small stalls by the Franciscan church. Mulled wine and local crafts.', de: 'Kleine Stände bei der Franziskanerkirche. Glühwein und Handwerk aus der Region.' },
    [8.3030, 47.0508],
    [{ kind: 'range', from: '2026-12-03', to: '2026-12-23' }],
  ),
  labEvent(
    'e-fasnacht',
    { en: 'Lucerne Fasnacht', de: 'Luzerner Fasnacht' },
    { en: 'Six days of masks and brass bands. It starts with a bang on Kapellplatz at 5 in the morning.', de: 'Sechs Tage Masken und Guggenmusig. Sie beginnt um 5 Uhr früh mit einem Knall auf dem Kapellplatz.' },
    [8.3068, 47.0517],
    [{ kind: 'day', day: '2027-02-04', starts: '05:00' }, { kind: 'range', from: '2027-02-05', to: '2027-02-09' }],
  ),
]

export interface V9Event {
  pin: Pin
  day: string
  starts?: string
  ends?: string
  /** Within the next seven days. */
  soon: boolean
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function eventPins(items: HomeItem[]) {
  return [...items.flatMap(item => item.pin?.dates ? [item.pin] : []), ...labEvents]
}

/** Every event still ahead (the map's and the lab's), soonest first. Ended events never show. */
export function eventsFor(items: HomeItem[], today = LAB_TODAY): V9Event[] {
  return eventPins(items)
    .flatMap((pin) => {
      const next = occurrences(pin, today)[0]

      return next ? [{ pin, ...next, soon: daysBetween(today, next.day) < 7 }] : []
    })
    .sort((a, b) => (a.day + (a.starts ?? '')).localeCompare(b.day + (b.starts ?? '')))
}

// ---------------------------------------------------------------- card facts

export function routeMeta(route: Route, language: Language) {
  const c = v9Copy[language]
  const hours = copy[language].hours(numberFormat(language === 'en' ? 'en-CH' : 'de-CH').format(route.hours))

  return route.kind === 'walk' ? c.routeMeta.walk(hours) : c.routeMeta.trip(hours)
}

/** The story behind a must-visit, when one is published in either language. */
export function storyOf(place: MustVisit, language: Language) {
  return place.story ? pickText(findStory(place.story)?.title, language) : undefined
}

export const placeHref = (slug: string, language: Language) => `/${language}/map?place=${slug}`
export const routeHref = (route: Route, language: Language) => `/${language}/tours/${route.slug}`

/**
 * The photo on an event's "This week" card (revision 8; the timeline stays photo-free). Chosen
 * from the photo set for what each event's place looks like; never `postcards`, never the hero.
 */
const eventPhotos: Record<string, string> = {
  'p12': 'jesuit-church',
  'p8': 'lucerne-swan',
  'e-blues': 'hofkirche',
  'e-christmas': 'hirschenplatz',
  'e-fasnacht': 'lucerne-old-town',
}

/** An old-town square, for an event the set has no photo of. */
export const EVENT_PHOTO_FALLBACK = 'hirschenplatz'

export function eventPhoto(event: V9Event) {
  return eventPhotos[event.pin.id] ?? EVENT_PHOTO_FALLBACK
}

/** The "Coming up" list shows this many; the rest sit behind the view-all button. */
export const MAX_COMING = 3

/** The events split for the section: this week's for the carousel, the next few after them, and how many are hidden. */
export function eventGroups(items: HomeItem[], today = LAB_TODAY) {
  const events = eventsFor(items, today)
  const later = events.filter(event => !event.soon)

  return {
    all: events,
    week: events.filter(event => event.soon),
    coming: later.slice(0, MAX_COMING),
    hidden: Math.max(0, later.length - MAX_COMING),
  }
}

export type PinKind = 'pub' | 'cafe' | 'restaurant' | 'market' | 'walk' | 'photo' | 'essential' | 'event' | 'place'

/** Pins whose kind their category does not tell: the market is "food" but gets the basket. */
const kindOverride: Record<string, PinKind> = { 'f-wochenmarkt': 'market' }

const kindByCategory: Record<string, PinKind> = {
  pubs: 'pub',
  bakeries: 'cafe',
  food: 'restaurant',
  walks: 'walk',
  photo: 'photo',
  essentials: 'essential',
  happenings: 'event',
}

/** The kind a pin's icon shows when it has no photo (a sub-category falls back to its parent). */
export function pinKind(pin: Pin): PinKind {
  if (kindOverride[pin.id])
    return kindOverride[pin.id]!
  for (const id of pin.categories) {
    const kind = kindByCategory[id] ?? kindByCategory[categories.find(c => c.id === id)?.parent ?? '']

    if (kind)
      return kind
  }

  return 'place'
}

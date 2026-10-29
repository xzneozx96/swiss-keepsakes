import { products } from '@/features/catalog/seed'
import { libraryAudio, libraryPhotos } from '@/features/content/merchant/lib/media-library'
import { pilatus } from '@/features/tours/lucerne/pilatus'
import { rigi } from '@/features/tours/lucerne/rigi'
import { thingsThatRemain } from '@/features/tours/lucerne/things-that-remain'
import { LAB_TODAY, seedPins, stories } from './pins-merchant-data'

/**
 * Mock data and pure rules for the media library lab (N18). Rows follow `content.media`
 * (api/migrations/0008_content.sql) and uses follow `content.media_refs`; keepsake photos come
 * from `catalog.product_media`, which media_refs does not cover (open point 2). Nothing is saved.
 */

export { LAB_TODAY }

export type MediaKind = 'image' | 'audio' | 'pdf'
export type MediaStatus = 'processing' | 'ready' | 'retired'
export type Language = 'en' | 'de'

export interface MediaRow {
  id: string
  kind: MediaKind
  /**
   * What the merchant calls the file, and what search matches (open point 1, decided). It starts
   * as the uploaded file name and is editable in the detail. A new column on `content.media`.
   */
  name: string
  /** The file name of the latest upload, shown as a fact; Replace changes it, never `name`. */
  fileName: string
  contentType: string
  byteSize: number
  width: number | null
  height: number | null
  durationSeconds: number | null
  alt: { en?: string, de?: string }
  status: MediaStatus
  /** ISO day of the upload. */
  createdAt: string
  /** Goes up by one on every Replace; the storage key carries it. */
  version: number
  /** Photo slug for the preview (images), or the recording's name (audio). */
  preview: string
}

export type MediaAlt = MediaRow['alt']

/** Where a file is used. `keepsake` is not in `media_refs`: it stands for `catalog.product_media`. */
export type OwnerKind = 'story' | 'place' | 'tour' | 'keepsake'
export type Slot = 'draft' | 'published'
export type Role = 'cover' | 'photo' | 'more' | 'audio' | 'pdf'

export interface MediaRef {
  mediaId: string
  ownerKind: OwnerKind
  ownerId: string
  ownerName: string
  /** Only stories have a language (a story version per language). */
  language: Language | null
  slot: Slot
  role: Role
  /** Order among a place's extra photos, 1 first. */
  position?: number
}

// ---------------------------------------------------------------------------------------------
// Owners: the real lab stories and pins, the three seeded tours, the catalogue's keepsakes.

const STORY_NAMES = new Map(stories.map(s => [s.id, s.title.en || s.title.de]))

export const tours = [thingsThatRemain, pilatus, rigi].map(t => ({
  id: t.id,
  name: t.name.en ?? t.name.de ?? t.id,
  photos: t.photos ?? [],
}))

export const pins = seedPins.map(p => ({
  id: p.id,
  name: p.title.en || p.title.de || 'Untitled pin',
  status: p.status,
  photo: p.photo,
  more: p.morePhotos,
}))

export const storyOwners = stories.map(s => ({ id: s.id, name: STORY_NAMES.get(s.id) ?? s.slug }))

export const keepsakes = products.map(p => ({
  id: p.id,
  name: p.name.en ?? p.name.de ?? p.id,
  photos: [p.photo, ...(p.photos ?? [])].filter((x): x is string => !!x),
}))

const pagePhotos = new Map<string, string>([
  ...pins.map(p => [`place:${p.id}`, p.photo] as const),
  ...stories.map(s => [`story:${s.id}`, s.photo] as const),
  ...tours.map(t => [`tour:${t.id}`, t.photos[0] ?? ''] as const),
  ...keepsakes.map(k => [`keepsake:${k.id}`, k.photos[0] ?? ''] as const),
])

/** The page's own photo for the where-used list: a pin's photo, a story's or tour's cover. */
export function pagePhoto(kind: OwnerKind, id: string) {
  return pagePhotos.get(`${kind}:${id}`) || undefined
}

// ---------------------------------------------------------------------------------------------
// Rows.

/** Alt text written for each library photo; it says what the photo shows. A few stay empty on purpose. */
const photoAlt: Record<string, { en?: string, de?: string }> = {
  'art-print': { en: 'Abstract landscape painting in bright colours', de: 'Abstraktes Landschaftsbild in kräftigen Farben' },
  'artisan-workshop': { en: 'Hands planing a piece of wood in a workshop' },
  'candle': { en: 'A lit candle with autumn leaves', de: 'Brennende Kerze mit Herbstlaub' },
  'chocolate-bar': { en: 'Pieces of dark chocolate on a black board', de: 'Stücke dunkler Schokolade auf schwarzem Holz' },
  'engraving': { en: 'A craftsman engraving a pattern into metal' },
  'finsterwald-beehouse': { en: 'A wooden beehouse in Obwalden', de: 'Ein hölzernes Bienenhaus in Obwalden' },
  'finsterwald-entlebuch': { en: 'Moorland in the Entlebuch biosphere', de: 'Moorlandschaft in der Biosphäre Entlebuch' },
  'furka-hairpins': { en: 'A man looking at the mountains on the Furka Pass' },
  'furka-rhone-glacier': { en: 'The Rhone Glacier below the Furka Pass', de: 'Der Rhonegletscher unter dem Furkapass' },
  'gift-box': { en: 'A gift box tied with a red ribbon', de: 'Geschenkbox mit roter Schleife' },
  'gotthard-devils-bridge': { en: 'The Devil’s Bridge in the Schöllenen gorge', de: 'Die Teufelsbrücke in der Schöllenenschlucht' },
  'gotthard-tremola': { en: 'Hairpin bends of the old Gotthard road', de: 'Kehren der alten Gotthardstrasse' },
  'grimsel-dam': { en: 'The dam wall of Lake Grimsel', de: 'Die Staumauer am Grimselsee' },
  'grimsel-hospiz': { en: 'The Grimsel Hospiz hotel above the lake' },
  'hammetschwand-cliff-path': { en: 'The cliff path to the Hammetschwand lift', de: 'Der Felsenweg zum Hammetschwand-Lift' },
  'hammetschwand-lift': { en: 'The top of the Hammetschwand lift' },
  'hammetschwand-view': { en: 'Lake Lucerne seen from the Hammetschwand lift' },
  'hirschenplatz': { en: 'Painted houses on the Hirschenplatz', de: 'Bemalte Häuser am Hirschenplatz' },
  'hofkirche': { en: 'The twin towers of the Hofkirche', de: 'Die Doppeltürme der Hofkirche' },
  'jesuit-church': { en: 'The Jesuit Church on the Reuss', de: 'Die Jesuitenkirche an der Reuss' },
  'keyring': { en: 'A metal keyring on a wooden box', de: 'Ein Schlüsselanhänger aus Metall auf einer Holzkiste' },
  'kornmarkt': { en: 'The town hall on the Kornmarkt', de: 'Das Rathaus am Kornmarkt' },
  'lake-steamboat': { en: 'The paddle steamer Stadt Luzern on the lake', de: 'Der Raddampfer Stadt Luzern auf dem See' },
  'lion-monument': { en: 'The Lion Monument carved into the rock', de: 'Das Löwendenkmal im Fels' },
  'lucerne-kapellbruecke-1200': { en: 'The Chapel Bridge and Water Tower, Pilatus behind', de: 'Kapellbrücke und Wasserturm, dahinter der Pilatus' },
  'lucerne-night': { en: 'The Chapel Bridge lit up in the evening', de: 'Die beleuchtete Kapellbrücke am Abend' },
  'lucerne-old-town': { en: 'Painted old town houses at the Hirschenplatz' },
  'lucerne-swan': { en: 'A swan in front of the Chapel Bridge', de: 'Ein Schwan vor der Kapellbrücke' },
  'lucerne-water-tower': { en: 'The Water Tower beside the Chapel Bridge', de: 'Der Wasserturm neben der Kapellbrücke' },
  'musegg-wall': { en: 'The Musegg wall with the Zyt and watch towers', de: 'Die Museggmauer mit Zyt- und Wachturm' },
  'nadelwehr': { en: 'The needle dam in the Reuss', de: 'Das Nadelwehr in der Reuss' },
  'nufenen-pass': { en: 'The road over the Nufenen Pass' },
  'old-swiss-house': { en: 'The half-timbered Old Swiss House', de: 'Das Fachwerkhaus Old Swiss House' },
  'pilatus': { en: 'The Pilatus railway train on the mountain', de: 'Die Pilatusbahn am Berg' },
  'pilatus-dragon-ride': { en: 'The Dragon Ride cable car near the summit', de: 'Die Luftseilbahn Dragon Ride am Gipfel' },
  'pilatus-fraekmuentegg': { en: 'Fräkmüntegg station on Pilatus', de: 'Station Fräkmüntegg am Pilatus' },
  'pocket-knife': { en: 'A pocket knife on a wooden log', de: 'Ein Taschenmesser auf einem Holzklotz' },
  'postcards': { en: 'Envelopes and white roses on a wooden table', de: 'Briefumschläge und weisse Rosen auf einem Holztisch' },
  'pralines': { en: 'Chocolate pralines on a wooden board', de: 'Pralinen auf einem Holzbrett' },
  'rigi-kaltbad': { en: 'A Vitznau-Rigi train at Rigi Kaltbad', de: 'Ein Zug der Vitznau-Rigi-Bahn in Rigi Kaltbad' },
  'rigi-kulm': { en: 'Rigi Kulm station, Pilatus in the distance', de: 'Bahnhof Rigi Kulm, in der Ferne der Pilatus' },
  'rigi-kulm-restaurant': { en: 'The restaurant at Rigi Kulm' },
  'rigi-vitznau-pier': { en: 'The pier at Vitznau on Lake Lucerne', de: 'Die Schiffstation Vitznau am Vierwaldstättersee' },
  'rigi-vitznau-train': { en: 'The Vitznau-Rigi train at Vitznau station' },
  'ritter-palace': { en: 'The Ritter Palace on the Bahnhofstrasse' },
  'rothorn-steam': { en: 'The Brienz Rothorn steam train', de: 'Die Dampfbahn aufs Brienzer Rothorn' },
  'rothorn-view': { en: 'Brienz seen from the Rothorn' },
  'spreuer-bridge': { en: 'The Spreuer Bridge behind the needle dam', de: 'Die Spreuerbrücke hinter dem Nadelwehr' },
  'spreuer-totentanz': { en: 'A Dance of Death painting on the Spreuer Bridge', de: 'Ein Totentanzbild auf der Spreuerbrücke' },
  'stay': { en: 'A mountain hut above a valley near Grindelwald' },
  'suidter-pharmacy': { en: 'The old Suidter pharmacy', de: 'Die alte Suidtersche Apotheke' },
  'susten-steinsee': { en: 'The Steinsee lake below the Susten Pass', de: 'Der Steinsee am Sustenpass' },
  'victorinox-classic-sd': { en: 'A red Victorinox Classic SD knife', de: 'Ein rotes Victorinox Classic SD' },
  'victorinox-picknicker': { en: 'A red Victorinox Picknicker knife', de: 'Ein rotes Victorinox Picknicker' },
  'victorinox-spartan': { en: 'A red Victorinox Spartan knife', de: 'Ein rotes Victorinox Spartan' },
  'victorinox-store': { en: 'The Victorinox shop on the Hirschenplatz' },
  'vx-chapel-bridge': { en: 'Knife design: the Chapel Bridge', de: 'Messerdesign: die Kapellbrücke' },
  'vx-lion': { en: 'Knife design: the Lion Monument', de: 'Messerdesign: das Löwendenkmal' },
  'vx-pilatus': { en: 'Knife design: Pilatus', de: 'Messerdesign: Pilatus' },
  'vx-steamboat': { en: 'Knife design: a paddle steamer', de: 'Messerdesign: ein Raddampfer' },
  'vx-swan': { en: 'Knife design: a swan on the lake', de: 'Messerdesign: ein Schwan auf dem See' },
  'weinmarkt': { en: 'Fountain and painted houses on the Weinmarkt', de: 'Brunnen und bemalte Häuser am Weinmarkt' },
  'zytturm': { en: 'The clock face of the Zyt tower', de: 'Das Zifferblatt des Zytturms' },
}

/** A stable number per name, so sizes and dates look varied but never change between loads. */
function hash(text: string) {
  let h = 7

  for (const char of text)
    h = (h * 31 + char.charCodeAt(0)) % 1_000_003

  return h
}

/** A day in Sep or Oct 2026, never after the lab's today. */
function uploadDay(seed: number) {
  const day = 1 + (seed % 57)
  const month = day > 30 ? 10 : 9
  const date = month === 10 ? day - 30 : day

  return `2026-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}`
}

/** The newest upload: still building its sizes. */
export const PROCESSING_ID = 'img-hammetschwand-view'
/** Taken off the library earlier (no page used them); kept read-only. */
export const RETIRED_IDS = new Set(['img-ritter-palace', 'pdf-things-that-remain-guide-v1'])

const PORTRAIT = new Set(['lucerne-water-tower', 'zytturm', 'hofkirche'])

/** A few names the merchant already changed from the uploaded file name. */
const renamed: Record<string, string> = {
  'lion-monument': 'Lion Monument, morning light',
  'lucerne-kapellbruecke-1200': 'Chapel Bridge with Pilatus',
  'zytturm': 'Zyt tower clock face',
}

function photoRow(slug: string): MediaRow {
  const h = hash(slug)
  const id = `img-${slug}`
  const portrait = PORTRAIT.has(slug)
  const processing = id === PROCESSING_ID

  return {
    id,
    kind: 'image',
    name: renamed[slug] ?? `${slug}.jpg`,
    fileName: `${slug}.jpg`,
    contentType: 'image/jpeg',
    byteSize: 1_200_000 + (h % 3_600_000),
    width: processing ? null : portrait ? 3024 : 4032,
    height: processing ? null : portrait ? 4032 : 3024,
    durationSeconds: null,
    alt: photoAlt[slug] ?? {},
    status: processing ? 'processing' : RETIRED_IDS.has(id) ? 'retired' : 'ready',
    createdAt: processing ? LAB_TODAY : uploadDay(h),
    version: 1,
    preview: slug,
  }
}

const audioFacts: Record<string, { seconds: number, alt: MediaRow['alt'] }> = {
  'tower-clock': { seconds: 13, alt: { en: 'A tower clock striking five', de: 'Eine Turmuhr schlägt fünf' } },
  // The guest app's background music. Its credits say it must stay out of story content.
  'background-swiss-keepsakes': { seconds: 348, alt: {} },
}

function audioRow(name: string): MediaRow {
  const facts = audioFacts[name] ?? { seconds: 60, alt: {} }

  return {
    id: `aud-${name}`,
    kind: 'audio',
    name: `${name}.mp3`,
    fileName: `${name}.mp3`,
    contentType: 'audio/mpeg',
    byteSize: facts.seconds * 12_000,
    width: null,
    height: null,
    durationSeconds: facts.seconds,
    alt: facts.alt,
    status: 'ready',
    createdAt: uploadDay(hash(name)),
    version: 1,
    preview: name,
  }
}

/** Fake tour guides: one current PDF per tour, plus an old one retired and a spare never used. */
const pdfFiles: { id: string, fileName: string, title: string, byteSize: number, createdAt: string, version: number }[] = [
  { id: 'pdf-things-that-remain-guide', fileName: 'things-that-remain-guide.pdf', title: 'Guide: The Things That Remain', byteSize: 2_840_000, createdAt: '2026-10-21', version: 2 },
  { id: 'pdf-pilatus-guide', fileName: 'pilatus-guide.pdf', title: 'Guide: Pilatus, Above the City', byteSize: 1_960_000, createdAt: '2026-10-12', version: 1 },
  { id: 'pdf-rigi-guide', fileName: 'rigi-guide.pdf', title: 'Guide: Rigi, From Lake to Sky', byteSize: 2_310_000, createdAt: '2026-10-14', version: 1 },
  { id: 'pdf-things-that-remain-guide-v1', fileName: 'things-that-remain-guide-old.pdf', title: 'Old guide: The Things That Remain', byteSize: 2_650_000, createdAt: '2026-09-18', version: 1 },
  { id: 'pdf-rigi-winter-timetable', fileName: 'rigi-winter-timetable.pdf', title: 'Rigi winter timetable', byteSize: 420_000, createdAt: '2026-10-26', version: 1 },
]

function pdfRow(file: (typeof pdfFiles)[number]): MediaRow {
  return {
    id: file.id,
    kind: 'pdf',
    name: file.fileName,
    fileName: file.fileName,
    contentType: 'application/pdf',
    byteSize: file.byteSize,
    width: null,
    height: null,
    durationSeconds: null,
    alt: { en: file.title },
    status: RETIRED_IDS.has(file.id) ? 'retired' : 'ready',
    createdAt: file.createdAt,
    version: file.version,
    preview: '',
  }
}

/** Newest first, as the library opens. */
export const seedRows: MediaRow[] = [
  ...libraryPhotos.map(photoRow),
  ...libraryAudio.map(audioRow),
  ...pdfFiles.map(pdfRow),
].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.fileName.localeCompare(b.fileName))

// ---------------------------------------------------------------------------------------------
// Uses, derived from the lab's own data so every link is honest.

const photoId = (slug: string) => `img-${slug}`
const knownIds = new Set(seedRows.map(r => r.id))

function buildRefs(): MediaRef[] {
  const refs: MediaRef[] = []
  const add = (ref: MediaRef) => {
    if (knownIds.has(ref.mediaId))
      refs.push(ref)
  }

  // Places (pins): a draft pin holds its photos in the draft slot.
  for (const pin of pins) {
    const slot: Slot = pin.status === 'draft' ? 'draft' : 'published'

    if (pin.photo)
      add({ mediaId: photoId(pin.photo), ownerKind: 'place', ownerId: pin.id, ownerName: pin.name, language: null, slot, role: 'cover' })
    pin.more.forEach((slug, index) =>
      add({ mediaId: photoId(slug), ownerKind: 'place', ownerId: pin.id, ownerName: pin.name, language: null, slot, role: 'more', position: index + 1 }))
  }

  // Stories: the cover per language version that exists.
  for (const story of stories) {
    for (const language of ['en', 'de'] as const) {
      const state = story.versions[language]

      if (state === 'missing')
        continue
      add({ mediaId: photoId(story.photo), ownerKind: 'story', ownerId: story.id, ownerName: STORY_NAMES.get(story.id) ?? story.slug, language, slot: state, role: 'cover' })
    }
  }
  // The Weinmarkt story's new draft adds a photo the published version does not have yet.
  add({ mediaId: photoId('hirschenplatz'), ownerKind: 'story', ownerId: 's6', ownerName: STORY_NAMES.get('s6') ?? '', language: 'en', slot: 'draft', role: 'photo' })
  // The tower clock plays in "Nine towers" (EN published, DE still a draft of the audio).
  add({ mediaId: 'aud-tower-clock', ownerKind: 'story', ownerId: 's3', ownerName: STORY_NAMES.get('s3') ?? '', language: 'en', slot: 'published', role: 'audio' })
  add({ mediaId: 'aud-tower-clock', ownerKind: 'story', ownerId: 's3', ownerName: STORY_NAMES.get('s3') ?? '', language: 'de', slot: 'draft', role: 'audio' })

  // Tours: the cover, the other photos, and exactly one PDF.
  for (const tour of tours) {
    tour.photos.forEach((slug, index) =>
      add({ mediaId: photoId(slug), ownerKind: 'tour', ownerId: tour.id, ownerName: tour.name, language: null, slot: 'published', role: index === 0 ? 'cover' : 'photo' }))
  }
  const pdfOf: Record<string, string> = {
    [thingsThatRemain.id]: 'pdf-things-that-remain-guide',
    [pilatus.id]: 'pdf-pilatus-guide',
    [rigi.id]: 'pdf-rigi-guide',
  }

  for (const tour of tours)
    add({ mediaId: pdfOf[tour.id] ?? '', ownerKind: 'tour', ownerId: tour.id, ownerName: tour.name, language: null, slot: 'published', role: 'pdf' })

  // Keepsakes (catalog.product_media, outside media_refs).
  for (const keepsake of keepsakes) {
    keepsake.photos.forEach((slug, index) =>
      add({ mediaId: photoId(slug), ownerKind: 'keepsake', ownerId: keepsake.id, ownerName: keepsake.name, language: null, slot: 'published', role: index === 0 ? 'cover' : 'photo' }))
  }

  return refs
}

export const seedRefs: MediaRef[] = buildRefs()

// ---------------------------------------------------------------------------------------------
// Rules.

export interface UseOptions {
  /**
   * Count keepsake photos (`catalog.product_media`) as uses. The library leaves them out (open
   * point 2, still open), so a keepsake-only photo shows Unused and can be retired.
   */
  countKeepsakes: boolean
}

export function refsOf(mediaId: string, refs: MediaRef[], { countKeepsakes }: UseOptions) {
  return refs.filter(r => r.mediaId === mediaId && (countKeepsakes || r.ownerKind !== 'keepsake'))
}

/** One page a guest can open: a pin, a tour, a keepsake, or one language of a story. */
export interface UsedPage {
  key: string
  ownerKind: OwnerKind
  ownerId: string
  ownerName: string
  language: Language | null
  /** True when the published version of the page shows the file. */
  isPublished: boolean
  roles: Role[]
}

/**
 * The pages that use a file. A draft and a published ref on the same owner and language are
 * one page; a story's EN and DE versions are two pages. A page is "published" when its
 * published slot holds the file; otherwise the file is only in its draft.
 */
export function usedPages(refs: MediaRef[]): UsedPage[] {
  const pages = new Map<string, UsedPage>()

  for (const ref of refs) {
    const key = `${ref.ownerKind}:${ref.ownerId}:${ref.language ?? '-'}`
    const page = pages.get(key) ?? {
      key,
      ownerKind: ref.ownerKind,
      ownerId: ref.ownerId,
      ownerName: ref.ownerName,
      language: ref.language,
      isPublished: false,
      roles: [],
    }

    page.isPublished ||= ref.slot === 'published'
    if (!page.roles.includes(ref.role))
      page.roles.push(ref.role)
    pages.set(key, page)
  }

  return [...pages.values()]
}

export interface Usage {
  pages: UsedPage[]
  published: UsedPage[]
  draftOnly: UsedPage[]
}

export function usageOf(mediaId: string, refs: MediaRef[], options: UseOptions): Usage {
  const pages = usedPages(refsOf(mediaId, refs, options))

  return {
    pages,
    published: pages.filter(p => p.isPublished),
    draftOnly: pages.filter(p => !p.isPublished),
  }
}

export function isUnused(mediaId: string, refs: MediaRef[], options: UseOptions) {
  return refsOf(mediaId, refs, options).length === 0
}

export type RetireCheck
  = | { ok: true }
    | { ok: false, reason: 'in-use', pages: number }
    | { ok: false, reason: 'retired' | 'processing' }

/** Retire is the only removal, and it is refused while any page uses the file. */
export function retireCheck(row: MediaRow, refs: MediaRef[], options: UseOptions): RetireCheck {
  if (row.status === 'retired')
    return { ok: false, reason: 'retired' }
  if (row.status === 'processing')
    return { ok: false, reason: 'processing' }
  const pages = usedPages(refsOf(row.id, refs, options)).length

  return pages ? { ok: false, reason: 'in-use', pages } : { ok: true }
}

/** What "Replace" changes, said before the merchant confirms (AC51). */
export function replaceImpact(mediaId: string, refs: MediaRef[], options: UseOptions) {
  const usage = usageOf(mediaId, refs, options)

  return { pages: usage.pages.length, published: usage.published.length, drafts: usage.draftOnly.length }
}

export function canReplace(row: MediaRow) {
  return row.status === 'ready'
}

/** Search matches the name only (open point 1: the library searches by name). */
export function matchesQuery(row: MediaRow, query: string) {
  const needle = query.trim().toLowerCase()

  return !needle || row.name.toLowerCase().includes(needle)
}

export type UseFilter = 'unused' | 'drafts' | 'published'

export interface MediaFilters {
  query: string
  kinds: MediaKind[]
  use: UseFilter[]
  statuses: MediaStatus[]
}

export function usageState(row: MediaRow, refs: MediaRef[], options: UseOptions): UseFilter {
  const usage = usageOf(row.id, refs, options)

  if (usage.published.length)
    return 'published'

  return usage.draftOnly.length ? 'drafts' : 'unused'
}

export function filterMedia(rows: MediaRow[], refs: MediaRef[], filters: MediaFilters, options: UseOptions) {
  return rows
    .filter(r => !filters.kinds.length || filters.kinds.includes(r.kind))
    .filter(r => !filters.statuses.length || filters.statuses.includes(r.status))
    .filter(r => !filters.use.length || filters.use.includes(usageState(r, refs, options)))
    .filter(r => matchesQuery(r, filters.query))
}

// ---------------------------------------------------------------------------------------------
// Upload checks. The limits are proposals for the owner, not decided anywhere yet.

export const UPLOAD_LIMITS: Record<MediaKind, { types: string[], maxMb: number }> = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxMb: 20 },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'], maxMb: 50 },
  pdf: { types: ['application/pdf'], maxMb: 30 },
}

export const ACCEPT = Object.values(UPLOAD_LIMITS).flatMap(l => l.types).join(',')

export type UploadCheck
  = | { ok: true, kind: MediaKind }
    | { ok: false, reason: 'type' }
    | { ok: false, reason: 'size', kind: MediaKind, maxMb: number }
    | { ok: false, reason: 'kind', kind: MediaKind }

/** Type first, then size. With `sameKindAs` (Replace), the new file must be the same kind. */
export function checkUpload(file: { type: string, size: number }, sameKindAs?: MediaKind): UploadCheck {
  const kind = (Object.keys(UPLOAD_LIMITS) as MediaKind[]).find(k => UPLOAD_LIMITS[k].types.includes(file.type))

  if (!kind)
    return { ok: false, reason: 'type' }
  if (sameKindAs && kind !== sameKindAs)
    return { ok: false, reason: 'kind', kind: sameKindAs }
  const { maxMb } = UPLOAD_LIMITS[kind]

  if (file.size > maxMb * 1024 * 1024)
    return { ok: false, reason: 'size', kind, maxMb }

  return { ok: true, kind }
}

// ---------------------------------------------------------------------------------------------
// Formatting for the lab (English only).

export function fileSize(bytes: number) {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`
}

export function duration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** "4032 × 3024", "0:13" or "PDF": the one fact that differs by kind. */
export function shapeOf(row: MediaRow) {
  if (row.kind === 'image')
    return row.width && row.height ? `${row.width} × ${row.height}` : 'Size pending'
  if (row.kind === 'audio')
    return row.durationSeconds ? duration(row.durationSeconds) : '–'

  return 'PDF'
}

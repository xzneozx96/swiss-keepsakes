import type { Pin, PinPublishBody, PinWriteBody } from '@sk/api-contract'
import type { FoodKind, ServiceType, StayTag } from '@sk/domain/content'
import type { MessageKey } from '@/i18n/en'

export type Lang = 'en' | 'de'
export const LANGS: readonly Lang[] = ['en', 'de']

export interface HoursSpan { key: string, day: number, opens: string, closes: string }

/** One date entry of the form: a day with optional times, or a range of days with none. */
export interface DateEntry { key: string, kind: 'day' | 'range', firstDay: string, lastDay: string, startTime: string, endTime: string }

export interface PhotoEntry { mediaId: string, altEn: string, altDe: string }

/** The whole editor state, as strings the fields can hold. `bodyOf` turns it into one write. */
export interface PlaceForm {
  titleEn: string
  titleDe: string
  tipEn: string
  tipDe: string
  localTipEn: string
  localTipDe: string
  slug: string
  latitude: number | null
  longitude: number | null
  address: string
  hours: HoursSpan[]
  dates: DateEntry[]
  categoryIds: string[]
  stayTag: StayTag
  interests: string[]
  serviceType: ServiceType | null
  mustVisit: boolean
  foodKind: FoodKind | null
  coverMediaId: string | null
  coverAltEn: string
  coverAltDe: string
  photos: PhotoEntry[]
  outboundUrl: string
  mainStoryGroupId: string | null
}

const newKey = () => crypto.randomUUID()

export function emptyDate(): DateEntry {
  return { key: newKey(), kind: 'day', firstDay: '', lastDay: '', startTime: '', endTime: '' }
}

export function emptyForm(withDate = false): PlaceForm {
  return {
    titleEn: '',
    titleDe: '',
    tipEn: '',
    tipDe: '',
    localTipEn: '',
    localTipDe: '',
    slug: '',
    latitude: null,
    longitude: null,
    address: '',
    hours: [],
    dates: withDate ? [emptyDate()] : [],
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    serviceType: null,
    mustVisit: false,
    foodKind: null,
    coverMediaId: null,
    coverAltEn: '',
    coverAltDe: '',
    photos: [],
    outboundUrl: '',
    mainStoryGroupId: null,
  }
}

/** The text the editor shows: the pending draft, else what is live. */
function textOf(pin: Pin) {
  return pin.draft ?? pin.published ?? { title: {}, tip: {}, localTip: {} }
}

export function slugOfPin(pin: Pin): string {
  return pin.slug?.en ?? pin.slug?.de ?? ''
}

export function formOf(pin: Pin): PlaceForm {
  const text = textOf(pin)

  return {
    titleEn: text.title.en ?? '',
    titleDe: text.title.de ?? '',
    tipEn: text.tip.en ?? '',
    tipDe: text.tip.de ?? '',
    localTipEn: text.localTip.en ?? '',
    localTipDe: text.localTip.de ?? '',
    slug: slugOfPin(pin),
    latitude: pin.latitude,
    longitude: pin.longitude,
    address: pin.address ?? '',
    hours: pin.weeklyHours.map(span => ({ key: newKey(), day: span.day, opens: span.opens, closes: span.closes })),
    dates: pin.dates.map(date => ({
      key: date.id,
      kind: date.firstDay === date.lastDay ? 'day' : 'range',
      firstDay: date.firstDay,
      lastDay: date.lastDay,
      startTime: date.startTime ?? '',
      endTime: date.endTime ?? '',
    })),
    categoryIds: pin.categoryIds,
    stayTag: pin.stayTag,
    interests: pin.interests,
    serviceType: pin.serviceType,
    mustVisit: pin.mustVisit,
    foodKind: pin.foodKind,
    coverMediaId: pin.coverMediaId,
    coverAltEn: pin.coverAlt.en ?? '',
    coverAltDe: pin.coverAlt.de ?? '',
    photos: pin.photos.map(photo => ({ mediaId: photo.mediaId, altEn: photo.alt.en ?? '', altDe: photo.alt.de ?? '' })),
    outboundUrl: pin.outboundUrl ?? '',
    mainStoryGroupId: pin.mainStoryGroupId,
  }
}

/** A suggested web address from a title: lower case, German umlauts spelled out, dashes between words. */
const UMLAUTS: [RegExp, string][] = [[/ä/g, 'ae'], [/ö/g, 'oe'], [/ü/g, 'ue'], [/ß/g, 'ss']]
const MARKS = /[\u0300-\u036F]/g
const NOT_SLUG = /[^a-z0-9]+/g
const EDGE_DASHES = /^-+|-+$/g
const TRAILING_DASHES = /-+$/g

export function suggestSlug(title: string): string {
  const spelled = UMLAUTS.reduce((text, [pattern, to]) => text.replace(pattern, to), title.toLowerCase())

  return spelled
    .normalize('NFD')
    .replace(MARKS, '')
    .replace(NOT_SLUG, '-')
    .replace(EDGE_DASHES, '')
    .slice(0, 80)
    .replace(TRAILING_DASHES, '')
}

function trimmed(en: string, de: string) {
  return {
    ...(en.trim() === '' ? {} : { en: en.trim() }),
    ...(de.trim() === '' ? {} : { de: de.trim() }),
  }
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const OPEN_TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const CLOSE_TIME = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/
const HTTPS = /^https:\/\/\S+$/

export interface FormErrors {
  slug?: MessageKey
  hours: Record<string, MessageKey>
  dates: Record<string, MessageKey>
  link?: MessageKey
  count: number
}

export function validate(form: PlaceForm): FormErrors {
  const errors: FormErrors = { hours: {}, dates: {}, count: 0 }

  if (form.slug !== '' && !SLUG.test(form.slug))
    errors.slug = 'places.error.slugFormat'
  for (const span of form.hours) {
    if (!OPEN_TIME.test(span.opens) || !CLOSE_TIME.test(span.closes))
      errors.hours[span.key] = 'places.error.hoursFormat'
    else if (span.opens >= span.closes)
      errors.hours[span.key] = 'places.error.hoursOrder'
  }
  for (const date of form.dates) {
    const last = date.kind === 'day' ? date.firstDay : date.lastDay
    const timed = date.kind === 'day'
    const { startTime, endTime } = date

    if (date.firstDay === '' || (date.kind === 'range' && date.lastDay === ''))
      errors.dates[date.key] = 'places.error.dateMissing'
    else if (last < date.firstDay)
      errors.dates[date.key] = 'places.error.dateOrder'
    else if (timed && ((startTime !== '' && !OPEN_TIME.test(startTime)) || (endTime !== '' && !OPEN_TIME.test(endTime))))
      errors.dates[date.key] = 'places.error.timeFormat'
    else if (timed && endTime !== '' && startTime === '')
      errors.dates[date.key] = 'places.error.endNeedsStart'
    else if (timed && endTime !== '' && endTime <= startTime)
      errors.dates[date.key] = endTime < '12:00' && startTime >= '12:00' ? 'places.error.crossesMidnight' : 'places.error.endBeforeStart'
  }
  if (form.outboundUrl.trim() !== '' && !HTTPS.test(form.outboundUrl.trim()))
    errors.link = 'places.error.linkFormat'
  errors.count = (errors.slug ? 1 : 0) + Object.keys(errors.hours).length + Object.keys(errors.dates).length + (errors.link ? 1 : 0)

  return errors
}

/** What a publish needs (AC68). Everything else is optional. */
export function publishGaps(form: PlaceForm): ('title' | 'location' | 'slug')[] {
  return [
    ...(form.titleEn.trim() === '' && form.titleDe.trim() === '' ? ['title' as const] : []),
    ...(form.latitude === null || form.longitude === null ? ['location' as const] : []),
    ...(form.slug.trim() === '' || !SLUG.test(form.slug) ? ['slug' as const] : []),
  ]
}

/** A pin that has been live (published or hidden) keeps its web addresses public, so they are renamed only by a save. */
export const hasBeenLive = (pin: Pin | undefined) => pin !== undefined && pin.status !== 'draft'

/** The languages that carry a title in the form. */
export function titleLanguages(form: PlaceForm): Lang[] {
  return LANGS.filter(lang => (lang === 'en' ? form.titleEn : form.titleDe).trim() !== '')
}

/**
 * The write of the whole form. A save is a PATCH where a list replaces and null clears, so every field is sent.
 * The slug follows the title: one web address text, kept for each language that has a title. A pin that was live
 * keeps the languages of its stored slug, and a language its draft adds gets its slug at publish (`publishBodyOf`).
 */
function slugWrite(form: PlaceForm, slugText: string, pin: Pin | undefined): Pick<PinWriteBody, 'slug'> {
  if (hasBeenLive(pin)) {
    const stored = LANGS.filter(lang => pin?.slug?.[lang] !== undefined)

    return slugText !== '' && slugText !== slugOfPin(pin!) && stored.length > 0 ? { slug: Object.fromEntries(stored.map(lang => [lang, slugText])) } : {}
  }
  if (slugText === '')
    return { slug: null }
  const languages = titleLanguages(form)

  return { slug: Object.fromEntries((languages.length > 0 ? languages : ['en']).map(lang => [lang, slugText])) }
}

export function bodyOf(form: PlaceForm, pin?: Pin): PinWriteBody {
  const slugText = form.slug.trim()

  return {
    title: trimmed(form.titleEn, form.titleDe),
    tip: trimmed(form.tipEn, form.tipDe),
    localTip: trimmed(form.localTipEn, form.localTipDe),
    ...slugWrite(form, slugText, pin),
    latitude: form.latitude,
    longitude: form.longitude,
    address: form.address.trim() === '' ? null : form.address.trim(),
    weeklyHours: form.hours.map(({ day, opens, closes }) => ({ day, opens, closes })),
    stayTag: form.stayTag,
    interests: form.interests as NonNullable<PinWriteBody['interests']>,
    serviceType: form.serviceType,
    mustVisit: form.mustVisit,
    foodKind: form.foodKind,
    coverMediaId: form.coverMediaId,
    coverAlt: form.coverMediaId ? trimmed(form.coverAltEn, form.coverAltDe) : {},
    photos: form.photos.map(photo => ({ mediaId: photo.mediaId, alt: trimmed(photo.altEn, photo.altDe) })),
    outboundUrl: form.outboundUrl.trim() === '' ? null : form.outboundUrl.trim(),
    mainStoryGroupId: form.mainStoryGroupId,
    categoryIds: form.categoryIds,
    dates: form.dates.map(date => ({
      firstDay: date.firstDay,
      lastDay: date.kind === 'day' ? date.firstDay : date.lastDay,
      startTime: date.kind === 'day' && date.startTime !== '' ? date.startTime : null,
      endTime: date.kind === 'day' && date.endTime !== '' ? date.endTime : null,
    })),
  }
}

/** The slug a publish adds: for each title language of a live pin that has no stored web address yet. */
export function publishBodyOf(form: PlaceForm, pin: Pin | undefined): PinPublishBody {
  const slugText = form.slug.trim()
  const added = hasBeenLive(pin) ? titleLanguages(form).filter(lang => pin?.slug?.[lang] === undefined) : []

  return added.length > 0 && slugText !== '' ? { slug: Object.fromEntries(added.map(lang => [lang, slugText])) } : {}
}

/** True while the form differs from the pin as it was opened (or from an empty form for a new pin). */
export function isDirty(form: PlaceForm, baseline: PlaceForm): boolean {
  const shape = (value: PlaceForm) => JSON.stringify({ ...value, hours: value.hours.map(({ key: _, ...rest }) => rest), dates: value.dates.map(({ key: _, ...rest }) => rest) })

  return shape(form) !== shape(baseline)
}

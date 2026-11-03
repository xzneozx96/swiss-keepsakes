import type { Pin, PinWriteBody } from '@sk/api-contract'
import type { StayTag } from '@sk/domain/content'
import type { MessageKey } from '@/i18n/en'
import { hoursErrors, OPEN_TIME } from './hours'

export type Lang = 'en' | 'de'
export const LANGS: readonly Lang[] = ['en', 'de']

export interface HoursSpan { key: string, day: number, opens: string, closes: string }

/** One date entry of the form: a day with optional times, or a range of days with none. */
export interface DateEntry { key: string, kind: 'day' | 'range', firstDay: string, lastDay: string, startTime: string, endTime: string }

/** An extra photo. The main photo is `coverMediaId`; together they are one ordered list in the editor (`photoIds`). */
export interface PhotoEntry { mediaId: string }

/** The whole editor state, as strings the fields can hold. `bodyOf` turns it into one write. */
export interface PlaceForm {
  titleEn: string
  titleDe: string
  tipEn: string
  tipDe: string
  latitude: number | null
  longitude: number | null
  address: string
  /** The Google Maps link of the place; empty for none. Stored with the place, live on save. */
  mapsLink: string
  hours: HoursSpan[]
  dates: DateEntry[]
  categoryIds: string[]
  stayTag: StayTag
  interests: string[]
  mustVisit: boolean
  coverMediaId: string | null
  photos: PhotoEntry[]
  outboundUrl: string
  mainStoryGroupId: string | null
}

/** The main photo and the extra ones: at most 10 extra photos, so 11. */
export const MAX_PHOTOS = 11

/** The photos as the editor shows them, one ordered list: the first is the main photo, the rest are the extra photos. */
export function photoIds(form: Pick<PlaceForm, 'coverMediaId' | 'photos'>): string[] {
  return [...(form.coverMediaId ? [form.coverMediaId] : []), ...form.photos.map(photo => photo.mediaId)]
}

/** The ordered list back onto the two fields the API has: the first photo is the cover, the others are `place_photos`. */
export function withPhotoIds(ids: string[]): Pick<PlaceForm, 'coverMediaId' | 'photos'> {
  return { coverMediaId: ids[0] ?? null, photos: ids.slice(1).map(mediaId => ({ mediaId })) }
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
    latitude: null,
    longitude: null,
    address: '',
    mapsLink: '',
    hours: [],
    dates: withDate ? [emptyDate()] : [],
    categoryIds: [],
    stayTag: 'both',
    interests: [],
    mustVisit: false,
    coverMediaId: null,
    photos: [],
    outboundUrl: '',
    mainStoryGroupId: null,
  }
}

/** The text the editor shows: the pending draft, else what is live. */
function textOf(pin: Pin) {
  return pin.draft ?? pin.published ?? { title: {}, tip: {}, localTip: {}, coverAlt: {}, photoAlt: {} }
}

export function formOf(pin: Pin): PlaceForm {
  const text = textOf(pin)

  return {
    titleEn: text.title.en ?? '',
    titleDe: text.title.de ?? '',
    tipEn: text.tip.en ?? '',
    tipDe: text.tip.de ?? '',
    latitude: pin.latitude,
    longitude: pin.longitude,
    address: pin.address ?? '',
    mapsLink: pin.mapsLink ?? '',
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
    mustVisit: pin.mustVisit,
    ...withPhotoIds([...(pin.coverMediaId ? [pin.coverMediaId] : []), ...pin.photos.map(photo => photo.mediaId)]),
    outboundUrl: pin.outboundUrl ?? '',
    mainStoryGroupId: pin.mainStoryGroupId,
  }
}

function trimmed(en: string, de: string) {
  return {
    ...(en.trim() === '' ? {} : { en: en.trim() }),
    ...(de.trim() === '' ? {} : { de: de.trim() }),
  }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** A whole `YYYY-MM-DD` that is a real day (the API takes only those). */
function isDay(value: string): boolean {
  if (!DAY.test(value))
    return false
  const date = new Date(`${value}T00:00:00Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const HTTPS = /^https:\/\/\S+$/

export interface FormErrors {
  hours: Record<string, MessageKey>
  dates: Record<string, MessageKey>
  link?: MessageKey
  count: number
}

export function validate(form: PlaceForm): FormErrors {
  const errors: FormErrors = { hours: {}, dates: {}, count: 0 }

  errors.hours = hoursErrors(form.hours)
  for (const date of form.dates) {
    const last = date.kind === 'day' ? date.firstDay : date.lastDay
    const timed = date.kind === 'day'
    const { startTime, endTime } = date

    if (date.firstDay === '' || (date.kind === 'range' && date.lastDay === ''))
      errors.dates[date.key] = 'places.error.dateMissing'
    else if (!isDay(date.firstDay) || (date.kind === 'range' && !isDay(date.lastDay)))
      errors.dates[date.key] = 'places.error.dateFormat'
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
  errors.count = Object.keys(errors.hours).length + Object.keys(errors.dates).length + (errors.link ? 1 : 0)

  return errors
}

/** What a publish needs (AC68): a title and a location. The map link is made by the server from the title. */
export function publishGaps(form: PlaceForm): ('title' | 'location')[] {
  return [
    ...(form.titleEn.trim() === '' && form.titleDe.trim() === '' ? ['title' as const] : []),
    ...(form.latitude === null || form.longitude === null ? ['location' as const] : []),
  ]
}

/** The write of the whole form. A save is a PATCH where a list replaces and null clears, so every field is sent. The map link (slug) is never sent: the server makes it. */
export function bodyOf(form: PlaceForm): PinWriteBody {
  return {
    title: trimmed(form.titleEn, form.titleDe),
    tip: trimmed(form.tipEn, form.tipDe),
    latitude: form.latitude,
    longitude: form.longitude,
    address: form.address.trim() === '' ? null : form.address.trim(),
    mapsLink: form.mapsLink.trim() === '' ? null : form.mapsLink.trim(),
    weeklyHours: form.hours.map(({ day, opens, closes }) => ({ day, opens, closes })),
    stayTag: form.stayTag,
    interests: form.interests as NonNullable<PinWriteBody['interests']>,
    mustVisit: form.mustVisit,
    coverMediaId: form.coverMediaId,
    photos: form.photos.map(photo => ({ mediaId: photo.mediaId })),
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

/** True while the form differs from the pin as it was opened (or from an empty form for a new pin). */
export function isDirty(form: PlaceForm, baseline: PlaceForm): boolean {
  const shape = (value: PlaceForm) => JSON.stringify({ ...value, hours: value.hours.map(({ key: _, ...rest }) => rest), dates: value.dates.map(({ key: _, ...rest }) => rest) })

  return shape(form) !== shape(baseline)
}

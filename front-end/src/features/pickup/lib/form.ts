import type { PickupPlace, PickupPlaceWriteBody } from '@sk/api-contract'
import type { LanguageStatus, LocalizedText } from '@sk/domain/catalog'
import type { HoursSpan } from '@/features/places/lib/form'
import type { MessageKey } from '@/i18n/en'
import { cleanText, languageStatus, missingText } from '@sk/domain/catalog'
import { hoursErrors } from '@/features/places/lib/hours'

interface Localized { en: string, de: string }

/** The sheet's state, as strings the fields can hold. `bodyOf` turns it into one write. */
export interface PickupForm {
  name: Localized
  address: Localized
  instructions: Localized
  hours: HoursSpan[]
  /** The Google Maps link as stored (the API resolves the pin from it); empty until a readable link is pasted. */
  mapsLink: string
  /** Where the link points, for the map preview only: the API reads it again from the link and never takes it from the form. */
  position: { lat: number, lng: number } | null
}

interface PickupPlaceFields { name: LocalizedText, address: LocalizedText }

const blank = (): Localized => ({ en: '', de: '' })

export function emptyForm(): PickupForm {
  return { name: blank(), address: blank(), instructions: blank(), hours: [], mapsLink: '', position: null }
}

const localized = (text: LocalizedText | null): Localized => ({ en: text?.en ?? '', de: text?.de ?? '' })

export function formOf(place: PickupPlace): PickupForm {
  return {
    name: localized(place.name),
    address: localized(place.address),
    instructions: localized(place.instructions),
    hours: place.hours.map(({ weekday, opens, closes }) => ({ key: crypto.randomUUID(), day: weekday, opens, closes })),
    mapsLink: place.mapsLink,
    position: { lat: place.latitude, lng: place.longitude },
  }
}

/** The write of the whole form: trimmed text with blank languages left out, spans in the order shown, `day` as `weekday`. */
export function bodyOf(form: PickupForm): PickupPlaceWriteBody {
  return {
    name: cleanText(form.name),
    address: cleanText(form.address),
    instructions: cleanText(form.instructions),
    hours: form.hours.map(({ day, opens, closes }) => ({ weekday: day, opens, closes })),
    mapsLink: form.mapsLink,
  }
}

/** The API refuses two spans that open at the same time on one day (the table's key), so the form does too. The first stays, the repeat is named. A span with another error keeps that one. */
function repeatedStarts(hours: HoursSpan[], found: Record<string, MessageKey>) {
  const seen = new Set<string>()
  const repeats: Record<string, MessageKey> = {}

  for (const { key, day, opens } of hours) {
    const start = `${day}|${opens}`

    if (seen.has(start) && !(key in found))
      repeats[key] = 'pickup.error.hoursRepeat'
    seen.add(start)
  }

  return repeats
}

/** A point needs a name and an address in at least one language (blank counts as missing) and a Google Maps link the field could store; the hours rules are the place editor's, plus no repeated start time on one day. */
export function pickupErrors(form: PickupPlaceFields & Pick<PickupForm, 'hours' | 'mapsLink'>) {
  const noLanguage = (text: LocalizedText) => languageStatus(missingText([{ id: 'name', text }])) === 'incomplete'
  const name = noLanguage(form.name)
  const address = noLanguage(form.address)
  const shared = hoursErrors(form.hours)
  const hours = { ...shared, ...repeatedStarts(form.hours, shared) }
  const mapsLink = form.mapsLink.trim() === ''

  return { name, address, mapsLink, hours, count: Number(name) + Number(address) + Number(mapsLink) + Object.keys(hours).length }
}

/** The languages a point is complete in, for the missing-language chip. Instructions are optional, so only name and address count. The address has no field id of its own in the domain, so it takes `meetingPoint`. */
export function languagesOf(place: PickupPlaceFields): LanguageStatus {
  return languageStatus(missingText([
    { id: 'name', text: place.name },
    { id: 'meetingPoint', text: place.address },
  ]))
}

import type { PickupPlace, PickupPlaceWriteBody } from '@sk/api-contract'
import type { LanguageStatus, LocalizedText } from '@sk/domain/catalog'
import type { HoursSpan } from '@/features/places/lib/form'
import { cleanText, languageStatus, missingText } from '@sk/domain/catalog'
import { hoursErrors } from '@/features/places/lib/hours'

interface Localized { en: string, de: string }

/** The sheet's state, as strings the fields can hold. `bodyOf` turns it into one write. */
export interface PickupForm {
  name: Localized
  address: Localized
  instructions: Localized
  hours: HoursSpan[]
}

interface PickupPlaceFields { name: LocalizedText, address: LocalizedText }

const blank = (): Localized => ({ en: '', de: '' })

export function emptyForm(): PickupForm {
  return { name: blank(), address: blank(), instructions: blank(), hours: [] }
}

const localized = (text: LocalizedText | null): Localized => ({ en: text?.en ?? '', de: text?.de ?? '' })

export function formOf(place: PickupPlace): PickupForm {
  return {
    name: localized(place.name),
    address: localized(place.address),
    instructions: localized(place.instructions),
    hours: place.hours.map(({ weekday, opens, closes }) => ({ key: crypto.randomUUID(), day: weekday, opens, closes })),
  }
}

/** The write of the whole form: trimmed text with blank languages left out, spans in the order shown, `day` as `weekday`. */
export function bodyOf(form: PickupForm): PickupPlaceWriteBody {
  return {
    name: cleanText(form.name),
    address: cleanText(form.address),
    instructions: cleanText(form.instructions),
    hours: form.hours.map(({ day, opens, closes }) => ({ weekday: day, opens, closes })),
  }
}

/** A point needs a name and an address in at least one language (blank counts as missing); the hours rules are the place editor's. */
export function pickupErrors(form: PickupPlaceFields & Pick<PickupForm, 'hours'>) {
  const noLanguage = (text: LocalizedText) => languageStatus(missingText([{ id: 'name', text }])) === 'incomplete'
  const name = noLanguage(form.name)
  const address = noLanguage(form.address)
  const hours = hoursErrors(form.hours)

  return { name, address, hours, count: Number(name) + Number(address) + Object.keys(hours).length }
}

/** The languages a point is complete in, for the missing-language chip. Instructions are optional, so only name and address count. The address has no field id of its own in the domain, so it takes `meetingPoint`. */
export function languagesOf(place: PickupPlaceFields): LanguageStatus {
  return languageStatus(missingText([
    { id: 'name', text: place.name },
    { id: 'meetingPoint', text: place.address },
  ]))
}

import type { NextDate, PublicPin } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { HoursSpan } from '@/lib/hours'

/** A story the sheet links to. */
export interface PlaceStory {
  slug: string
  title: string
  /** Null while it is not known (the place editor's preview has the story's options, not its text). */
  readMinutes: number | null
}

/**
 * What the details sheet shows about one pin (N03). The guest map builds it from the pin read (`toPlaceDetail`), the
 * place editor's preview from the form, so both draw the same sheet. Every optional field can be empty.
 */
export interface PlaceDetail {
  id: string
  title: string
  /** The language the title and tip are written in: the card says so when it is not the visitor's. */
  language: Language
  tip: string
  latitude: number
  longitude: number
  address: string | null
  mapsLink: string | null
  hours: HoursSpan[]
  nextDate: NextDate | null
  /** The pin's one outbound link, a plain https address (ADR-011). */
  link: string | null
  /** The photos in the order the merchant set, the main one first. `alt` is the merchant's text in the card's language. */
  photos: { src: string, alt: string | null }[]
  mainStory: PlaceStory | null
  otherStories: PlaceStory[]
}

/** The pin read (`GET /api/public/places/{id}`) as the sheet shows it. */
export function toPlaceDetail(pin: PublicPin): PlaceDetail {
  return {
    id: pin.id,
    title: pin.title,
    language: pin.language,
    tip: pin.tip,
    latitude: pin.latitude,
    longitude: pin.longitude,
    address: pin.address,
    mapsLink: pin.mapsLink,
    hours: pin.weeklyHours,
    nextDate: pin.nextDate,
    link: pin.link,
    // The carousel is as wide as a phone screen: the smallest copy that is at least 800 px, else the largest there is.
    photos: pin.photos.map(photo => ({ src: (photo.variants.find(variant => variant.width >= 800) ?? photo.variants.at(-1))?.url ?? photo.url, alt: photo.alt })),
    mainStory: pin.mainStory,
    otherStories: pin.otherStories,
  }
}

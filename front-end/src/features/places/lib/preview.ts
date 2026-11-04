import type { PublicMapItem } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { PlaceForm } from './form'
import type { PlaceDetail } from '@/features/map/lib/place-detail'

import { nextDate } from '@sk/domain/content'

/** The one pin of the preview. The guest map keys its pins by id; this one is never saved. */
export const PREVIEW_PIN_ID = '00000000-0000-4000-8000-000000000001'
/** The story link of the card goes nowhere in the preview, but the card shows the button only when the pin has a slug. */
const PREVIEW_STORY_SLUG = 'preview'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^\d{2}:\d{2}$/

/** The language the guest card would show: the chosen one when it has a title, else the other one (the server does the same). */
export function titleIn(form: Pick<PlaceForm, 'titleEn' | 'titleDe'>, language: Language): { title: string, language: Language } {
  const own = language === 'en' ? form.titleEn : form.titleDe
  const other = language === 'en' ? form.titleDe : form.titleEn

  if (own.trim() !== '')
    return { title: own.trim(), language }

  return { title: other.trim(), language: language === 'en' ? 'de' : 'en' }
}

/** The tips from a local the guest card would show: the chosen language's, else the other one's; undefined when there are none. */
export function tipIn(form: Pick<PlaceForm, 'tipEn' | 'tipDe'>, language: Language): { text: string, language: Language } | undefined {
  const own = (language === 'en' ? form.tipEn : form.tipDe).trim()
  const other = (language === 'en' ? form.tipDe : form.tipEn).trim()

  if (own !== '')
    return { text: own, language }

  return other === '' ? undefined : { text: other, language: language === 'en' ? 'de' : 'en' }
}

/** The next date a guest would see: entries that are complete, as `nextDate` of the server reads them. */
function nextDateOf(form: Pick<PlaceForm, 'dates'>, now: Date): PublicMapItem['nextDate'] {
  const dates = form.dates.flatMap((date) => {
    const lastDay = date.kind === 'day' ? date.firstDay : date.lastDay

    if (!DAY.test(date.firstDay) || !DAY.test(lastDay) || lastDay < date.firstDay)
      return []
    const timed = date.kind === 'day'
    const startTime = timed && TIME.test(date.startTime) ? date.startTime : null
    const endTime = timed && startTime && TIME.test(date.endTime) ? date.endTime : null

    return [{ id: date.key, firstDay: date.firstDay, lastDay, startTime, endTime }]
  })
  const next = nextDate(dates, now)

  return next && next !== 'ended' ? { firstDay: next.firstDay, lastDay: next.lastDay, startTime: next.startTime, endTime: next.endTime } : null
}

/**
 * The draft as the guest map's pin item, in the language being previewed, so the real pin and card can draw it. `storyLanguages`
 * are the languages the chosen story is published in, `untitled` stands in for a draft with no title: a story that is not published in the previewed language gives no link.
 * `located` is false while the place has no position: the card still shows, the map has no pin to draw.
 */
export function previewItem(form: PlaceForm, language: Language, options: { storyLanguages: readonly Language[], untitled: string, now: Date }): { item: PublicMapItem, located: boolean } {
  const { title, language: shown } = titleIn(form, language)
  const located = form.latitude !== null && form.longitude !== null
  const hasStory = form.mainStoryGroupId !== null && options.storyLanguages.includes(language)

  const item: PublicMapItem = {
    id: PREVIEW_PIN_ID,
    slug: null,
    latitude: form.latitude ?? 0,
    longitude: form.longitude ?? 0,
    title: title || options.untitled,
    language: shown,
    categoryIds: form.categoryIds,
    stayTag: form.stayTag,
    interests: form.interests,
    nextDate: nextDateOf(form, options.now),
    hasMainStory: hasStory,
    mainStorySlug: hasStory ? PREVIEW_STORY_SLUG : null,
    photoUrl: null,
    photoVariants: [],
    mustVisit: form.mustVisit,
    tip: (shown === 'de' ? form.tipDe : form.tipEn).trim(),
  }

  return { item, located }
}

/**
 * The draft as the details sheet shows it (N03), in the language being previewed: the same facts a guest reads once the
 * place is published. `photos` are the draft's pictures in order, already resolved to addresses. The story is the
 * chosen one by its title: its reading time is not known here, and the other stories that tag the pin are not part of a draft.
 */
export function previewDetail(form: PlaceForm, language: Language, options: { storyTitle: string, hasStory: boolean, photos: PlaceDetail['photos'], untitled: string, now: Date }): PlaceDetail {
  const { item, located } = previewItem(form, language, { storyLanguages: options.hasStory ? [language] : [], untitled: options.untitled, now: options.now })
  const link = form.outboundUrl.trim()
  const mapsLink = form.mapsLink.trim()

  return {
    id: item.id,
    title: item.title,
    language: item.language,
    tip: tipIn(form, language)?.text ?? '',
    latitude: located ? item.latitude : 0,
    longitude: located ? item.longitude : 0,
    address: form.address.trim() === '' ? null : form.address.trim(),
    mapsLink: mapsLink === '' ? null : mapsLink,
    hours: form.hours.flatMap(span => (TIME.test(span.opens) && TIME.test(span.closes) ? [{ day: span.day, opens: span.opens, closes: span.closes }] : [])),
    nextDate: item.nextDate,
    link: link === '' ? null : link,
    photos: options.photos,
    mainStory: item.hasMainStory && item.mainStorySlug ? { slug: item.mainStorySlug, title: options.storyTitle, readMinutes: null } : null,
    otherStories: [],
  }
}

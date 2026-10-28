import type { ContentLanguage, Localized, PinDate, StayTag } from '@sk/domain/content'
import type { PublicCategoryRow, PublicPinRow, PublicStoryRow, PublicStoryVersionRow, PublicTourRow } from '../read-ports.ts'
import { languagesOf } from '@sk/domain/content'
import { pickLanguage } from './language.ts'
import { nextDate, withParents } from './pin-dates.ts'

// Rows to the public response shapes. Nothing here reads a store or a price. The application layer may not import
// the API contract, so the shapes are written here; the tests parse every output with the contract schemas.

export interface PublicCategory { id: string, slug: string, name: { en: string, de: string }, parentId: string | null, position: number }
export interface PublicCategoryList { items: PublicCategory[] }

interface LanguageNotice { language: ContentLanguage, requestedLanguage: ContentLanguage, fallback: boolean, availableLanguages: ContentLanguage[] }

export interface PublicStoryCard extends LanguageNotice {
  id: string
  slug: string
  title: string
  excerpt: string
  readMinutes: number | null
  coverKey: string | null
  stayTag: StayTag
  interests: string[]
  categories: { id: string, slug: string, name: string }[]
  publishedAt: string
}

export type PublicStoryBlock
  = | { type: 'paragraph', text: string }
    | { type: 'image', key: string | null, caption: string }
    | { type: 'video', youtubeId: string, title: string, caption: string }
    | { type: 'audio', key: string | null, title: string, caption: string }

export interface PublicStory extends PublicStoryCard {
  intro: string
  authorName: string
  authorRole: string
  sections: { id: string, heading: string, blocks: PublicStoryBlock[] }[]
}

export interface PublicStoryList { items: PublicStoryCard[] }

const keyOf = (version: PublicStoryVersionRow, mediaId: string | null) => (mediaId ? version.mediaKeys[mediaId.toLowerCase()] ?? null : null)

export function toPublicCategory(row: PublicCategoryRow): PublicCategory {
  const name = row.name.en ?? row.name.de ?? ''
  return { id: row.id, slug: row.slug, name: { en: row.name.en ?? name, de: row.name.de ?? name }, parentId: row.parentId, position: row.position }
}

// The version carried and the notice about it, or null when the story has no published version.
function carried(row: PublicStoryRow, requested: ContentLanguage) {
  const choice = pickLanguage(row.versions.map(v => v.language), requested)
  const version = choice && row.versions.find(v => v.language === choice.language)
  if (!choice || !version)
    return null
  return {
    version,
    notice: {
      language: choice.language,
      requestedLanguage: requested,
      fallback: choice.fallback,
      availableLanguages: row.versions.map(v => v.language).sort(),
    },
  }
}

function toCard(row: PublicStoryRow, version: PublicStoryVersionRow, notice: NonNullable<ReturnType<typeof carried>>['notice']): PublicStoryCard {
  const { published } = version
  return {
    id: row.id,
    slug: version.slug,
    title: published.title,
    excerpt: published.excerpt,
    readMinutes: published.readMinutes,
    coverKey: keyOf(version, published.coverMediaId),
    stayTag: row.stayTag,
    interests: row.interests,
    categories: row.categories.map(c => ({ id: c.id, slug: c.slug, name: c.name[notice.language] ?? c.name.en ?? c.name.de ?? '' })),
    publishedAt: version.publishedAt.toISOString(),
    ...notice,
  }
}

export function toStoryCard(row: PublicStoryRow, requested: ContentLanguage): PublicStoryCard | null {
  const pick = carried(row, requested)
  return pick && toCard(row, pick.version, pick.notice)
}

export function toPublicStory(row: PublicStoryRow, requested: ContentLanguage): PublicStory | null {
  const pick = carried(row, requested)
  if (!pick)
    return null
  const { version } = pick
  const { published } = version
  return {
    ...toCard(row, version, pick.notice),
    intro: published.intro,
    authorName: published.authorName,
    authorRole: published.authorRole,
    sections: published.sections.map(section => ({
      id: section.id,
      heading: section.heading,
      blocks: section.blocks.map((block) => {
        if (block.type === 'image')
          return { type: 'image' as const, key: keyOf(version, block.mediaId), caption: block.caption }
        if (block.type === 'audio')
          return { type: 'audio' as const, key: keyOf(version, block.mediaId), title: block.title, caption: block.caption }
        if (block.type === 'video')
          return { type: 'video' as const, youtubeId: block.youtubeId, title: block.title, caption: block.caption }
        return { type: 'paragraph' as const, text: block.text }
      }),
    })),
  }
}

export interface PublicNextDate { firstDay: string, lastDay: string, startTime: string | null, endTime: string | null }

export interface PublicPin extends LanguageNotice {
  id: string
  slug: string | null
  title: string
  tip: string
  latitude: number
  longitude: number
  address: string | null
  weeklyHours: { day: number, opens: string, closes: string }[]
  stayTag: StayTag
  interests: string[]
  categories: { id: string, slug: string, name: string }[]
  nextDate: PublicNextDate | null
  hasMainStory: boolean
  mainStorySlug: string | null
  photoKey: string | null
}

export interface PublicMapItem {
  id: string
  slug: string | null
  latitude: number
  longitude: number
  title: string
  language: ContentLanguage
  categoryIds: string[]
  stayTag: StayTag
  interests: string[]
  nextDate: PublicNextDate | null
  hasMainStory: boolean
  mainStorySlug: string | null
  photoKey: string | null
}

export interface PublicMap { items: PublicMapItem[] }

export interface PublicTourCard extends LanguageNotice {
  id: string
  slug: string
  title: string
  stayTag: StayTag
  interests: string[]
  durationMinutes: number | null
  coverKey: string | null
}

export interface PublicTour extends PublicTourCard {
  summary: string
  meetingPoint: string
  sections: { id: string, heading: string, body: string }[]
  stops: { position: number, latitude: number, longitude: number, title: string, text: string, minutesFromStart: number | null, key: string | null, placeId: string | null }[]
  pdfKey: string | null
  keepsakeProductIds: string[]
}

export interface PublicTourList { items: PublicTourCard[] }

// Text of the carried language only; a missing value is empty, never the other language.
const text = (value: Localized | null | undefined, language: ContentLanguage) => value?.[language] ?? ''

const pinNext = (date: PinDate): PublicNextDate => ({ firstDay: date.firstDay, lastDay: date.lastDay, startTime: date.startTime, endTime: date.endTime })

function notice(available: ContentLanguage[], requested: ContentLanguage): LanguageNotice | null {
  const choice = pickLanguage(available, requested)
  return choice && { language: choice.language, requestedLanguage: requested, fallback: choice.fallback, availableLanguages: available }
}

// Pins whose dates have all ended have no next date; the caller leaves them out.
function pinNextDate(row: PublicPinRow, now: Date): PublicNextDate | null | 'ended' {
  const next = nextDate(row.dates, now)
  return next === null || next === 'ended' ? next : pinNext(next)
}

export function toPublicPin(row: PublicPinRow, requested: ContentLanguage, now: Date): PublicPin | null {
  const info = notice(languagesOf(row.name), requested)
  const next = pinNextDate(row, now)
  if (!info || next === 'ended')
    return null
  const seen = new Set<string>()
  const categories = [...row.categories, ...row.parentCategories]
    .filter(c => !seen.has(c.id) && seen.add(c.id))
    .sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null) || a.position - b.position || (a.id < b.id ? -1 : 1))
  return {
    id: row.id,
    slug: row.slug?.[info.language] ?? null,
    title: text(row.name, info.language),
    tip: text(row.tip, info.language),
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    weeklyHours: row.weeklyHours,
    stayTag: row.stayTag,
    interests: row.interests,
    categories: categories.map(c => ({ id: c.id, slug: c.slug, name: c.name[info.language] ?? c.name.en ?? c.name.de ?? '' })),
    nextDate: next,
    hasMainStory: Object.keys(row.mainStorySlugs).length > 0,
    mainStorySlug: row.mainStorySlugs[info.language] ?? null,
    photoKey: row.photoKey,
    ...info,
  }
}

export function toMapItem(row: PublicPinRow, requested: ContentLanguage, now: Date): PublicMapItem | null {
  const pin = toPublicPin(row, requested, now)
  if (!pin)
    return null
  const parentOf = new Map(row.categories.map(c => [c.id, c.parentId]))
  return {
    id: pin.id,
    slug: pin.slug,
    latitude: pin.latitude,
    longitude: pin.longitude,
    title: pin.title,
    language: pin.language,
    categoryIds: withParents(row.categories.map(c => c.id), parentOf),
    stayTag: pin.stayTag,
    interests: pin.interests,
    nextDate: pin.nextDate,
    hasMainStory: pin.hasMainStory,
    mainStorySlug: pin.mainStorySlug,
    photoKey: pin.photoKey,
  }
}

function toTourCard(row: PublicTourRow, info: LanguageNotice): PublicTourCard {
  return {
    id: row.id,
    slug: row.slug[info.language] ?? '',
    title: text(row.title, info.language),
    stayTag: row.stayTag,
    interests: row.interests,
    durationMinutes: row.durationMinutes,
    coverKey: row.coverKey,
    ...info,
  }
}

export function toTourCardFor(row: PublicTourRow, requested: ContentLanguage): PublicTourCard | null {
  const info = notice(languagesOf(row.title), requested)
  return info && toTourCard(row, info)
}

export function toPublicTour(row: PublicTourRow, requested: ContentLanguage): PublicTour | null {
  const info = notice(languagesOf(row.title), requested)
  if (!info)
    return null
  const { language } = info
  return {
    ...toTourCard(row, info),
    summary: text(row.summary, language),
    meetingPoint: text(row.meetingPoint, language),
    sections: row.sections.map(s => ({ id: s.id, heading: text(s.heading, language), body: text(s.body, language) })),
    stops: row.stops.map(s => ({
      position: s.position,
      latitude: s.latitude,
      longitude: s.longitude,
      title: text(s.title, language),
      text: text(s.text, language),
      minutesFromStart: s.minutesFromStart,
      key: s.key,
      placeId: s.placeId,
    })),
    pdfKey: row.pdfKey,
    keepsakeProductIds: row.keepsakeProductIds,
  }
}

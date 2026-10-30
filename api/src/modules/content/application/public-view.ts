import type { ContentLanguage, Localized, PinDate, StayTag } from '@sk/domain/content'
import type { PublicCategoryRow, PublicPinRow, PublicStoryRow, PublicStoryVersionRow, PublicTourRow } from '../read-ports.ts'
import { isSafeLinkHref, languagesOf, STORY_BODY_LIMITS, storyBodyReadMinutes } from '@sk/domain/content'
import { pickLanguage } from './language.ts'
import { nextDate, withParents } from './pin-dates.ts'

// Rows to the public response shapes. Nothing here reads a store or a price. The application layer may not import
// the API contract, so the shapes are written here; the tests parse every output with the contract schemas.

export interface PublicCategory { id: string, slug: string, name: { en: string | null, de: string | null }, parentId: string | null, position: number }
export interface PublicCategoryList { items: PublicCategory[] }

interface LanguageNotice { language: ContentLanguage, requestedLanguage: ContentLanguage, fallback: boolean, availableLanguages: ContentLanguage[] }

export interface PublicStoryCard extends LanguageNotice {
  id: string
  slug: string
  title: string
  excerpt: string
  readMinutes: number
  coverKey: string | null
  stayTag: StayTag
  interests: string[]
  categories: { id: string, slug: string, name: string | null }[]
  publishedAt: string
}

export type PublicBodyMark
  = | { type: 'bold' }
    | { type: 'italic' }
    | { type: 'link', attrs: { href: string } }
    | { type: 'pinLink', attrs: { pinId: string } }

export type PublicBodyInline
  = | { type: 'text', text: string, marks?: PublicBodyMark[] }
    | { type: 'hardBreak' }

export interface PublicBodyParagraph { type: 'paragraph', content?: PublicBodyInline[] }
export interface PublicBodyListItem { type: 'listItem', content: (PublicBodyParagraph | PublicBodyList)[] }
export interface PublicBodyList { type: 'bulletList' | 'orderedList', content: PublicBodyListItem[] }

export type PublicBodyNode
  = | PublicBodyParagraph
    | { type: 'heading', attrs: { level: 2 | 3 }, content?: PublicBodyInline[] }
    | { type: 'blockquote', content: PublicBodyParagraph[] }
    | PublicBodyList
    | { type: 'image', attrs: { key: string | null, alt: string, caption: string } }
    | { type: 'video', attrs: { youtubeId: string, title: string, caption: string } }
    | { type: 'audio', attrs: { key: string | null, title: string, caption: string } }

export interface PublicStoryBody { type: 'doc', content: PublicBodyNode[] }

export interface PublicStory extends PublicStoryCard {
  authorName: string
  body: PublicStoryBody
}

export interface PublicStoryList { items: PublicStoryCard[] }

// The stored document is not trusted: a media id that is missing or not a string gives no key.
const keyOf = (version: PublicStoryVersionRow, mediaId: unknown) => (typeof mediaId === 'string' ? version.mediaKeys[mediaId.toLowerCase()] ?? null : null)

const str = (value: unknown) => (typeof value === 'string' ? value : '')

// The stored body is untrusted JSON. Only nodes, marks and attributes the story editor writes are copied, by the
// place they may stand in; anything else is dropped. Nesting below the write limit is cut, so a hostile document
// cannot make the walk deep.
type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const childrenOf = (node: Json) => (Array.isArray(node.content) ? node.content : [])
const attrsOf = (node: Json): Json => (isObject(node.attrs) ? node.attrs : {})
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const youtubePattern = /^[\w-]{11}$/

function publicMarks(value: unknown): PublicBodyMark[] {
  const marks: PublicBodyMark[] = []
  for (const mark of Array.isArray(value) ? value : []) {
    if (!isObject(mark))
      continue
    const attrs = attrsOf(mark)
    if (mark.type === 'bold' || mark.type === 'italic')
      marks.push({ type: mark.type })
    else if (mark.type === 'link' && typeof attrs.href === 'string' && isSafeLinkHref(attrs.href))
      marks.push({ type: 'link', attrs: { href: attrs.href } })
    else if (mark.type === 'pinLink' && typeof attrs.pinId === 'string' && uuidPattern.test(attrs.pinId))
      marks.push({ type: 'pinLink', attrs: { pinId: attrs.pinId } })
  }
  return marks.slice(0, 4)
}

function publicInline(nodes: unknown[]): PublicBodyInline[] {
  return nodes.flatMap((node): PublicBodyInline[] => {
    if (!isObject(node))
      return []
    if (node.type === 'hardBreak')
      return [{ type: 'hardBreak' }]
    if (node.type === 'text' && typeof node.text === 'string' && node.text !== '') {
      const marks = publicMarks(node.marks)
      return [marks.length > 0 ? { type: 'text', text: node.text, marks } : { type: 'text', text: node.text }]
    }
    return []
  })
}

const withContent = <T extends { type: string }>(base: T, content: PublicBodyInline[]) => (content.length > 0 ? { ...base, content } : base)

function publicParagraph(node: Json): PublicBodyParagraph {
  return withContent({ type: 'paragraph' as const }, publicInline(childrenOf(node)))
}

function publicList(node: Json, depth: number): PublicBodyList {
  const items = childrenOf(node).flatMap((item): PublicBodyListItem[] => {
    if (!isObject(item) || item.type !== 'listItem' || depth + 1 > STORY_BODY_LIMITS.maxDepth)
      return []
    const content = childrenOf(item).flatMap((child): (PublicBodyParagraph | PublicBodyList)[] => {
      if (!isObject(child))
        return []
      if (child.type === 'paragraph')
        return [publicParagraph(child)]
      if ((child.type === 'bulletList' || child.type === 'orderedList') && depth + 2 <= STORY_BODY_LIMITS.maxDepth)
        return [publicList(child, depth + 2)]
      return []
    })
    return [{ type: 'listItem', content }]
  })
  return { type: node.type === 'orderedList' ? 'orderedList' : 'bulletList', content: items }
}

function publicBlock(node: unknown, version: PublicStoryVersionRow): PublicBodyNode[] {
  if (!isObject(node))
    return []
  const attrs = attrsOf(node)
  switch (node.type) {
    case 'paragraph':
      return [publicParagraph(node)]
    case 'heading':
      return [withContent({ type: 'heading' as const, attrs: { level: attrs.level === 3 ? 3 as const : 2 as const } }, publicInline(childrenOf(node)))]
    case 'blockquote':
      return [{ type: 'blockquote', content: childrenOf(node).flatMap(child => (isObject(child) && child.type === 'paragraph' ? [publicParagraph(child)] : [])) }]
    case 'bulletList':
    case 'orderedList':
      return [publicList(node, 2)]
    case 'image':
      return [{ type: 'image', attrs: { key: keyOf(version, attrs.mediaId), alt: str(attrs.alt), caption: str(attrs.caption) } }]
    case 'audio':
      return [{ type: 'audio', attrs: { key: keyOf(version, attrs.mediaId), title: str(attrs.title), caption: str(attrs.caption) } }]
    case 'video':
      return typeof attrs.youtubeId === 'string' && youtubePattern.test(attrs.youtubeId)
        ? [{ type: 'video', attrs: { youtubeId: attrs.youtubeId, title: str(attrs.title), caption: str(attrs.caption) } }]
        : []
    default:
      return []
  }
}

// A body that is missing or not a document reads as an empty one.
function publicBody(version: PublicStoryVersionRow): PublicStoryBody {
  const body = version.published.body
  const content = isObject(body) && body.type === 'doc' ? childrenOf(body) : []
  return { type: 'doc', content: content.flatMap(node => publicBlock(node, version)) }
}

export function toPublicCategory(row: PublicCategoryRow): PublicCategory {
  return { id: row.id, slug: row.slug, name: { en: row.name.en ?? null, de: row.name.de ?? null }, parentId: row.parentId, position: row.position }
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

function toCard(row: PublicStoryRow, version: PublicStoryVersionRow, notice: NonNullable<ReturnType<typeof carried>>['notice'], body: PublicStoryBody): PublicStoryCard {
  const { published } = version
  return {
    id: row.id,
    slug: version.slug,
    title: str(published.title),
    excerpt: str(published.excerpt),
    readMinutes: storyBodyReadMinutes(body),
    coverKey: keyOf(version, published.coverMediaId),
    stayTag: row.stayTag,
    interests: row.interests,
    categories: row.categories.map(c => ({ id: c.id, slug: c.slug, name: c.name[notice.language] ?? null })),
    publishedAt: version.publishedAt.toISOString(),
    ...notice,
  }
}

export function toStoryCard(row: PublicStoryRow, requested: ContentLanguage): PublicStoryCard | null {
  const pick = carried(row, requested)
  return pick && toCard(row, pick.version, pick.notice, publicBody(pick.version))
}

export function toPublicStory(row: PublicStoryRow, requested: ContentLanguage): PublicStory | null {
  const pick = carried(row, requested)
  if (!pick)
    return null
  const { version } = pick
  const { published } = version
  const body = publicBody(version)
  return {
    ...toCard(row, version, pick.notice, body),
    authorName: str(published.authorName),
    body,
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
  categories: { id: string, slug: string, name: string | null }[]
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
    categories: categories.map(c => ({ id: c.id, slug: c.slug, name: c.name[info.language] ?? null })),
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
    sections: (Array.isArray(row.sections) ? row.sections : []).map(s => ({ id: s.id, heading: text(s.heading, language), body: text(s.body, language) })),
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

import type { MediaItem, MediaUse } from '@sk/api-contract'
import type { MediaKind } from '@sk/domain/content'
import type { MessageKey } from '@/i18n/en'

import { checkUploadRequest, MEDIA_RULES, mediaRuleFor } from '@sk/domain/content'

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

const MIB = 1024 * 1024

/** Browsers name an M4A `audio/x-m4a`, `audio/m4a` or nothing; the API knows it as `audio/mp4`. */
const M4A_TYPES = new Set(['audio/x-m4a', 'audio/m4a', 'audio/mp4a-latm', ''])

const M4A_EXTENSION = /\.m4a$/i

export function contentTypeOf(file: Pick<File, 'name' | 'type'>): string {
  const type = file.type.toLowerCase()

  return M4A_TYPES.has(type) && M4A_EXTENSION.test(file.name) ? 'audio/mp4' : type
}

export type FileCheck
  = | { ok: true, kind: MediaKind, contentType: string }
    | { ok: false, reason: 'type' }
    | { ok: false, reason: 'size', maxMb: number }

/** The type first, then the size, with the limits of the domain package (the API checks again). */
export function checkFile(file: Pick<File, 'name' | 'type' | 'size'>): FileCheck {
  const contentType = contentTypeOf(file)
  const rule = mediaRuleFor(contentType)

  if (!rule)
    return { ok: false, reason: 'type' }
  const checked = checkUploadRequest({ contentType, byteSize: file.size })

  if (!checked.ok)
    return checked.reason === 'too-large' ? { ok: false, reason: 'size', maxMb: rule.maxBytes / MIB } : { ok: false, reason: 'type' }

  return { ok: true, kind: rule.kind, contentType }
}

/** The `accept` of the file dialogs: the types the API takes, and the extensions a phone may report no type for. */
export const ACCEPT = [...Object.keys(MEDIA_RULES.types), '.m4a'].join(',')

/** "3.2 MB" from 1,000,000 bytes, "820 KB" below. */
export function fileSize(bytes: number, locale: string): string {
  const number = (value: number, digits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)

  return bytes >= 1_000_000 ? `${number(bytes / 1_000_000, 1)} MB` : `${number(Math.max(1, Math.round(bytes / 1000)), 0)} KB`
}

export const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** "Unused", "3 pages · 2 published", "1 page · draft only". */
export function usageLine(t: Translate, usage: MediaItem['usage']): string {
  const pages = usage?.pages ?? 0

  if (!pages)
    return t('media.used.none')
  const count = pages === 1 ? t('media.used.page') : t('media.used.pages', { count: pages })

  return usage!.published ? `${count} · ${t('media.used.published', { count: usage!.published })}` : `${count} · ${t('media.used.draftOnly')}`
}

export type RetireCheck = { ok: true } | { ok: false, reason: 'retired' | 'processing' | 'in-use', pages: number }

/** The reasons in the API's order: retired, processing, in use. */
export function retireCheck(item: MediaItem): RetireCheck {
  const pages = item.usage?.pages ?? 0

  if (item.status === 'retired')
    return { ok: false, reason: 'retired', pages }
  if (item.status === 'processing')
    return { ok: false, reason: 'processing', pages }

  return pages > 0 ? { ok: false, reason: 'in-use', pages } : { ok: true }
}

export const canReplace = (item: MediaItem) => item.status === 'ready'

/** The title of a page in the app language, else in the other one; a story only has its own. */
export function titleOf(use: MediaUse, language: 'en' | 'de', fallback: string): string {
  return use.title[language] || use.title[language === 'en' ? 'de' : 'en'] || fallback
}

export const EDITOR_PATH: Record<MediaUse['pageKind'], (id: string) => string> = {
  story: id => `/store/content/articles/${id}`,
  place: id => `/store/content/places/${id}`,
  tour: id => `/store/products/tours/${id}`,
  keepsake: id => `/store/products/gifts/${id}`,
}

/** The smallest picture the file has, for a thumbnail; the original when it has no variants. */
export function thumbOf(item: Pick<MediaItem, 'variants' | 'publicUrl'>, width = 320): string | null {
  const fit = item.variants.find(variant => variant.width >= width) ?? item.variants.at(-1)

  return fit?.url ?? item.publicUrl
}

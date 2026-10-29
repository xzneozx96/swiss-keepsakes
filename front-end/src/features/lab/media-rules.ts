import type { MediaKind, Usage, UseOptions } from './media-data'
import type { IconComponent } from '@/components/icons'

import { formatShortDate } from '@sk/domain/shared'
import { FilePdf, Gallery } from 'reicon-react'

import { MusicIcon } from '@/components/icons'
import { mc } from './media-copy'
import { LAB_TODAY } from './media-data'

export const shortDate = (iso: string) => formatShortDate(iso, LAB_TODAY, 'en-CH')

export const kindIcon: Record<MediaKind, IconComponent> = {
  image: Gallery,
  audio: MusicIcon,
  pdf: FilePdf,
}

/** "Unused", "3 pages · 2 published" or "1 page · draft only". */
export function usageLine(usage: Usage) {
  const count = usage.pages.length

  if (!count)
    return mc('used.none')
  const pages = count === 1 ? mc('used.page') : mc('used.pages', { count })

  return usage.published.length
    ? `${pages} · ${mc('used.published', { count: usage.published.length })}`
    : `${pages} · ${mc('used.draftOnly')}`
}

/**
 * The library's answer to open point 2 (still open): keepsake photos are not counted as uses,
 * so a keepsake-only photo shows Unused and can be retired.
 */
export const libraryRules: UseOptions = { countKeepsakes: false }

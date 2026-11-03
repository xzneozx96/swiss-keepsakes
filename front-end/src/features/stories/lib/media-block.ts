import type { MediaItem } from '@sk/api-contract'
import type { StoryLanguage } from './search-params'

import { STORY_BODY_LIMITS } from '@sk/domain/content'

import { parseYoutubeId } from '@/features/content/merchant/lib/youtube'

export const MEDIA_LIMIT = STORY_BODY_LIMITS.maxMedia
const TEXT_MAX = 300
const EXTENSION = /\.[^.]+$/
const SEPARATORS = /[-_]+/g

export type MediaNodeInput
  = | { type: 'image', attrs: { mediaId: string, alt: string, caption: '' } }
    | { type: 'video', attrs: { youtubeId: string, title: string, caption: '' } }
    | { type: 'audio', attrs: { mediaId: string, title: string, caption: '' } }

const MEDIA_TYPES = new Set(['image', 'video', 'audio'])

/** Image, video and audio nodes at any depth: the contract's limit counts all three. */
export function countMediaNodes(body: { content?: unknown[] }): number {
  let count = 0
  const walk = (nodes: unknown[] | undefined) => {
    for (const node of nodes ?? []) {
      const { type, content } = node as { type?: string, content?: unknown[] }

      if (type && MEDIA_TYPES.has(type))
        count += 1
      walk(Array.isArray(content) ? content : undefined)
    }
  }

  walk(Array.isArray(body.content) ? body.content : undefined)

  return count
}

const clip = (text: string) => text.trim().slice(0, TEXT_MAX)

/** The description in the version's language, else in the other one. */
function describedIn(alt: MediaItem['alt'], language: StoryLanguage): string {
  const other = language === 'en' ? 'de' : 'en'

  return clip(alt[language] || alt[other] || '')
}

export function imageNode(item: Pick<MediaItem, 'id' | 'alt'>, language: StoryLanguage): MediaNodeInput {
  return { type: 'image', attrs: { mediaId: item.id, alt: describedIn(item.alt, language), caption: '' } }
}

export function audioNode(item: Pick<MediaItem, 'id' | 'name' | 'alt'>, language: StoryLanguage): MediaNodeInput {
  const title = describedIn(item.alt, language) || clip(item.name.replace(EXTENSION, '').replace(SEPARATORS, ' '))

  return { type: 'audio', attrs: { mediaId: item.id, title, caption: '' } }
}

export function videoNode(id: string, title: string): MediaNodeInput {
  return { type: 'video', attrs: { youtubeId: id, title: clip(title), caption: '' } }
}

export const youtubeId = parseYoutubeId

export function youtubePoster(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

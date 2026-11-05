import type { PinListItem, ProductListItem, StoryListItem } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { StoryBlock } from '@/features/places/lib/story-text'

import { pinLinkHref } from '@sk/domain/content'

import { thumbOf } from '@/features/media/lib/rules'

/** A pin as the preview needs it: enough to name it, link it and list it. */
export interface PreviewPin { id: string, name: string, published: boolean, website: string | null, slug: string | null }
export interface PreviewKeepsake { id: string, name: string, photo: string | undefined }
export interface PreviewStory { groupId: string, title: string, photo: string | undefined }
export interface PreviewHeading { block: StoryBlock, id: string, text: string, level: 2 | 3 }

const otherOf = (language: Language): Language => (language === 'en' ? 'de' : 'en')

/** An ended pin is still on the guest map, so it counts as published. */
export function previewPin(item: PinListItem, language: Language): PreviewPin {
  const other = otherOf(language)

  return {
    id: item.id,
    name: item.title[language] ?? item.title[other] ?? '',
    published: item.status === 'published' || item.status === 'ended',
    website: item.outboundUrl,
    slug: item.slug?.[language] ?? item.slug?.[other] ?? null,
  }
}

/** The target of a pin link by pin id (ADR-011). An id that is not in the list gives null, so the text stays plain. */
export function pinHrefFor(pins: readonly PreviewPin[], language: Language): (pinId: string) => string | null {
  const byId = new Map(pins.map(pin => [pin.id, pin]))

  return (pinId) => {
    const pin = byId.get(pinId)

    return pin ? pinLinkHref(pin, language) : null
  }
}

/** The published pins the story names, in the order of `ids`. */
export function placesOf(ids: readonly string[], pins: readonly PreviewPin[]): PreviewPin[] {
  const byId = new Map(pins.map(pin => [pin.id, pin]))

  return ids.flatMap((id) => {
    const pin = byId.get(id)

    return pin?.published ? [pin] : []
  })
}

/** The published keepsakes the story names, in the order of `ids`. No price: the preview never shows one. */
export function keepsakesOf(ids: readonly string[], items: readonly ProductListItem[], language: Language): PreviewKeepsake[] {
  const byId = new Map(items.map(item => [item.id, item]))
  const other = otherOf(language)

  return ids.flatMap((id) => {
    const item = byId.get(id)

    return item?.status === 'published'
      ? [{ id, name: item.name[language] ?? item.name[other] ?? '', photo: item.cover ? thumbOf(item.cover, 320) ?? undefined : undefined }]
      : []
  })
}

/** The related stories a guest reading in `language` would see: published in that language, never the story itself. */
export function relatedOf(ids: readonly string[], items: readonly StoryListItem[], language: Language, selfId: string): PreviewStory[] {
  const byId = new Map(items.map(item => [item.groupId, item]))
  const other = otherOf(language)

  return ids.flatMap((id) => {
    const item = byId.get(id)

    if (!item || id === selfId || item.languages[language]?.status !== 'published')
      return []

    return [{ groupId: id, title: item.title[language] ?? item.title[other] ?? '', photo: item.cover ? thumbOf(item.cover, 320) ?? undefined : undefined }]
  })
}

const textOf = (inlines: Extract<StoryBlock, { type: 'heading' }>['inlines']) => inlines.map(inline => (inline === 'break' ? ' ' : inline.text)).join('').trim()

/** Every heading in document order, nested ones too. The id is the position, so equal texts never share one. */
export function headingsOf(blocks: readonly StoryBlock[]): PreviewHeading[] {
  const found: PreviewHeading[] = []
  const visit = (list: readonly StoryBlock[]) => {
    for (const block of list) {
      if (block.type === 'heading')
        found.push({ block, id: `story-preview-h-${found.length}`, text: textOf(block.inlines), level: block.level })
      else if (block.type === 'quote')
        visit(block.blocks)
      else if (block.type === 'list')
        block.items.forEach(visit)
    }
  }

  visit(blocks)

  return found
}

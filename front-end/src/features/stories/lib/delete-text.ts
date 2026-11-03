import type { StoryLinks } from '@sk/api-contract'
import type { MessageKey } from '@/i18n/en'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/**
 * The words of the Delete story dialog. A story with a live version is live for guests and disappears from them; one
 * without says its draft is deleted. The link line comes from the counts the API gave before the delete: nothing when none
 * links, and `null` (the read failed) says the links could not be checked, never that there are none.
 */
export function deleteStoryText(t: Translate, { name, published, links }: { name: string, published: boolean, links: StoryLinks | null }) {
  const parts = links === null
    ? []
    : [
        links.pins > 0 && t(links.pins === 1 ? 'merchantStories.delete.pins.one' : 'merchantStories.delete.pins.other', { count: links.pins }),
        links.stories > 0 && t(links.stories === 1 ? 'merchantStories.delete.stories.one' : 'merchantStories.delete.stories.other', { count: links.stories }),
      ].filter(part => part !== false)
  const linkLine = links === null
    ? t('merchantStories.delete.linksUnknown')
    : parts.length === 0 ? '' : t('merchantStories.delete.links', { parts: parts.join(t('merchantStories.delete.and')) })

  return {
    title: t('merchantStories.delete.title', { name }),
    body: [t(published ? 'merchantStories.delete.live' : 'merchantStories.delete.draft'), linkLine].filter(Boolean).join(' '),
    confirmLabel: t('merchantStories.delete.confirm'),
  }
}

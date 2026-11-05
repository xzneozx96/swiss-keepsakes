import type { StoryGroupDetail } from '@sk/api-contract'
import type { StoryFields } from '../lib/draft'
import type { PublishFacts } from '../lib/publish-checks'
import type { StoryLanguage } from '../lib/search-params'

import { storyBodyPinIds } from '@sk/domain/content'

import { useLocale } from '@/contexts/locale-context'
import { useKeepsakeLookup } from '@/features/keepsakes/api/queries'
import { usePinLookup } from '@/features/places/api/queries'
import { useStoryLookup } from '../api/queries'

/**
 * What the publish checks need from other lists: whether the related stories have this language, whether the linked
 * keepsakes are published, whether the pins the body links to are. A list is read only when the story names something in
 * it, and while it loads its warnings are absent (an id missing from the facts adds nothing).
 */
export function useStoryPublishFacts({ storeId, group, language, body }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  body: StoryFields['body']
}): PublishFacts {
  const { t } = useLocale()
  const pinIds = storyBodyPinIds(body as Parameters<typeof storyBodyPinIds>[0])
  const stories = useStoryLookup(storeId, group.relatedGroupIds)
  const keepsakes = useKeepsakeLookup(storeId, group.keepsakeProductIds)
  const places = usePinLookup(storeId, pinIds)
  const other = language === 'en' ? 'de' : 'en'

  return {
    related: stories.data?.items.map(item => ({
      groupId: item.groupId,
      name: item.title[language] ?? item.title[other] ?? t('merchantStories.untitled'),
      published: item.languages[language]?.status === 'published',
    })),
    keepsakes: keepsakes.data?.items.map(item => ({ id: item.id, name: item.name[language] ?? item.name[other] ?? '', published: item.status === 'published' })),
    pins: places.data?.items.map(item => ({ id: item.id, name: item.title[language] ?? item.title[other] ?? '', status: item.status })),
  }
}

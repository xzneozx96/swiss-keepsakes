import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { useSubmit } from '@/features/data-client/use-command'
import { sessionUserQuery } from '@/features/stores/api/queries'
import { accountNameOf } from '../lib/draft'
import { STORY_PATH } from '../lib/search-params'

/**
 * New story: the group, then its English draft (the client posts both), then the editor opens on the group. The draft is
 * signed with the account's name, trimmed to what the API allows, or with nothing while the session is unknown. A
 * refusal toasts "not created" from the cache (`meta.error`); the list is left as it was, so no empty row appears.
 */
export function useCreateStory(storeId: string) {
  const navigate = useNavigate()
  const session = useQuery(sessionUserQuery)
  const { submit, isPending } = useSubmit('stories', 'createStory', { meta: { error: { 'story-not-created': 'merchantStories.toast.notCreated' } } })
  const authorName = accountNameOf(session.data)

  return {
    isPending,
    create: () => {
      submit(
        { storeId, authorName, idempotencyKey: crypto.randomUUID(), versionIdempotencyKey: crypto.randomUUID() },
        { onSuccess: result => void navigate({ to: STORY_PATH, params: { articleId: result.group.id } }) },
      )
    },
  }
}

import type { StoryGroupDetail } from '@sk/api-contract'
import type { StoryLanguage } from '../lib/search-params'

import { useQueryClient } from '@tanstack/react-query'

import { useDataClient } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { storiesQueries } from '../api/queries'
import { otherCheckedOn, otherCover, startDraft } from '../lib/draft'
import { storyProblemKeys } from '../lib/problems'

/**
 * Starts the language version a story does not have yet: an empty draft that takes the other language's cover and check date (AC30: one
 * language is enough, so nothing starts a version unasked). The command refreshes the group before it resolves. A refusal
 * toasts its copy; "this version exists" means another session started it, so the group is read again and the switch goes on.
 */
export function useStartVersion({ storeId, group, accountName }: { storeId: string, group: StoryGroupDetail, accountName: string }) {
  const client = useDataClient()
  const queryClient = useQueryClient()
  const create = useCommand('stories', 'createVersion', { meta: { error: storyProblemKeys } })

  return {
    isPending: create.isPending,
    start: async (language: StoryLanguage): Promise<boolean> => {
      try {
        await create.mutateAsync({ storeId, groupId: group.id, language, draft: startDraft(accountName, otherCover(group.versions, language), otherCheckedOn(group.versions, language)), idempotencyKey: crypto.randomUUID() })

        return true
      }
      catch (error) {
        if (!(error instanceof ApiProblem) || error.type !== 'version-exists')
          return false
        await queryClient.invalidateQueries({ queryKey: storiesQueries.group(client, storeId, group.id).queryKey })

        return true
      }
    },
  }
}

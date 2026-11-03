import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys, useDataClient } from '@/features/data-client'
import { useSubmit } from '@/features/data-client/use-command'
import { storiesQueries } from '../api/queries'
import { deleteStoryText } from '../lib/delete-text'

/** What the dialog needs of a story: the list row and the open editor both have these. */
export interface DeletableStory {
  groupId: string
  name: string
  /** A version is live for guests. */
  published: boolean
}

/**
 * Delete a whole story, published or not: both language versions, its links and its media references go in one request.
 * The dialog first reads how many pins and stories link to it (a failed read does not stop the delete: the dialog says the
 * links could not be checked), then runs the write inside itself: spinner, a refusal shown in the dialog, and on success the
 * row leaves the cached list at once (`commandChanges`) and a toast says so. `onDeleted` runs before the dialog closes (the editor
 * opens the list there). The cached groups of the store are dropped afterwards, and the pins it was the main story of are refreshed. `dialog` must be rendered by the caller.
 */
export function useDeleteStory(storeId: string, onDeleted?: () => void | Promise<unknown>) {
  const { t } = useLocale()
  const client = useDataClient()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const remove = useSubmit('stories', 'removeStory', { meta: { success: 'merchantStories.toast.deleted', silent: true } })
  // A second tap while the counts are being read must not open a second dialog.
  const askingRef = useRef(false)

  return {
    dialog,
    ask: async (story: DeletableStory) => {
      if (askingRef.current || remove.isPending)
        return
      askingRef.current = true
      const links = await queryClient.fetchQuery(storiesQueries.links(client, storeId, story.groupId)).catch(() => null)

      askingRef.current = false
      void confirm({
        ...deleteStoryText(t, { name: story.name, published: story.published, links }),
        problem: () => t('merchantStories.problem.generic'),
        run: async () => {
          await remove.submitAsync({ storeId, groupId: story.groupId, idempotencyKey: crypto.randomUUID() })
          await onDeleted?.()
          // Every group of the store, not only this one: the stories that listed it as related moved their row version, so a cached copy would answer 412.
          queryClient.removeQueries({ queryKey: [...queryKeys.stories.group, storeId] })
        },
      })
    },
  }
}

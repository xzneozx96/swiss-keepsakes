import type { StoryListItem } from '@sk/api-contract'

import { useQueryClient } from '@tanstack/react-query'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { deleteBlock, storyTitle } from '../lib/list'

const LANGUAGES = ['en', 'de'] as const

/**
 * Deleting a story that was never published: one confirm, then one DELETE per language version (the API has no
 * group delete), run inside the dialog so a refusal shows there. The row leaves the list when the dialog closes
 * (`commandChanges`). When one version refuses (it changed meanwhile) the other may already be gone, so the list is
 * read again and no row is dropped here.
 */
export function useDeleteStory(storeId: string) {
  const { t } = useLocale()
  const queryClient = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const remove = useSubmit('stories', 'removeStory', { meta: { success: 'merchantStories.toast.deleted', silent: true } })
  const problem = (error: unknown) => t(error instanceof ApiProblem && error.type === 'precondition-failed' ? 'merchantStories.problem.stale' : 'merchantStories.problem.generic')

  return {
    dialog,
    ask: (item: StoryListItem) => {
      if (deleteBlock(item) !== null)
        return
      const versions = LANGUAGES.flatMap((language) => {
        const version = item.languages[language]

        return version ? [{ language, ifMatch: version.rowVersion, idempotencyKey: crypto.randomUUID() }] : []
      })

      void confirm({
        title: t('merchantStories.delete.title', { name: storyTitle(item) || t('merchantStories.untitled') }),
        body: t('merchantStories.delete.body'),
        confirmLabel: t('merchantStories.delete.confirm'),
        problem,
        run: () => remove.submitAsync({ storeId, groupId: item.groupId, versions }).catch((error: unknown) => {
          void queryClient.invalidateQueries({ queryKey: [...queryKeys.stories.list, storeId] })

          throw error
        }),
      })
    },
  }
}

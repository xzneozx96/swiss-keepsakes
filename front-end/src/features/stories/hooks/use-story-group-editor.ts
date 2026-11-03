import type { StoryGroupDetail } from '@sk/api-contract'
import type { AutosaveState } from '../lib/autosave'
import type { GroupFields } from '../lib/group-fields'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { useDataClient } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { useLatest } from '@/hooks/use-latest'
import { storiesQueries } from '../api/queries'
import { createAutosave } from '../lib/autosave'
import { groupBody, groupFieldsOf } from '../lib/group-fields'

/** Discrete choices (a radio, a tag, a saved sheet), not typing: a short wait only joins quick clicks into one save. */
export const GROUP_AUTOSAVE_MS = 400

/**
 * The one save path of the shared facts of a story group (stay, interests, categories and, for the later cards, the lists).
 * The group has its own row version, so this is a second `createAutosave` engine beside the version editor's: saves are
 * serialised and each carries the row version the last answer returned. `group` is the query data with what is typed and not
 * yet saved laid over it, so the publish checks, the leave guard and the cards follow a click at once. Every answer is merged
 * into the group query (the versions stay as they are). Cards call `change`, never the command.
 */
export function useStoryGroupEditor({ storeId, group }: { storeId: string, group: StoryGroupDetail }) {
  const client = useDataClient()
  const queryClient = useQueryClient()
  // The editor shows the refusal itself, so the error toast is off.
  const save = useCommand('stories', 'saveGroup', { meta: { silent: true } })
  const [typed, setTyped] = useState<GroupFields>()
  const [state, setState] = useState<AutosaveState>('saved')
  const [problem, setProblem] = useState<string>()
  const typedRef = useRef<GroupFields>(undefined)
  // The fields as the last answer left them: a save sends the difference to these.
  const savedRef = useRef(groupFieldsOf(group))
  const latest = useLatest({ save, storeId, groupId: group.id })
  const groupKey = storiesQueries.group(client, storeId, group.id).queryKey
  const [engine] = useState(() => createAutosave<GroupFields>({
    version: group.rowVersion,
    delayMs: GROUP_AUTOSAVE_MS,
    save: async (draft, ifMatch) => {
      const body = groupBody(draft, savedRef.current)

      // A change put back to what is saved (or a field this save cannot carry) sends nothing: a PATCH would move the row version for no reason.
      if (Object.keys(body).length === 0)
        return ifMatch
      const now = latest.current
      const answer = await now.save.mutateAsync({ storeId: now.storeId, groupId: now.groupId, ifMatch, idempotencyKey: crypto.randomUUID(), ...body })

      savedRef.current = groupFieldsOf(answer)
      queryClient.setQueryData<StoryGroupDetail>(groupKey, current => (current ? { ...current, ...answer, versions: current.versions } : current))

      return answer.rowVersion
    },
    isStale: error => error instanceof ApiProblem && error.type === 'precondition-failed',
    onState: (next, error) => {
      setState(next)
      setProblem(next === 'failed' || next === 'stale' ? (error instanceof ApiProblem ? error.type : 'unknown') : undefined)
    },
  }))

  // Leaving by any route saves what is pending: the request goes on after the screen is gone.
  useEffect(() => () => engine.dispose(), [engine])

  /** A change of some fields, or a function of the fields as they are now (several clicks in one tick all land). */
  const change = (patch: Partial<GroupFields> | ((current: GroupFields) => Partial<GroupFields>)) => {
    const current = typedRef.current ?? groupFieldsOf(group)
    const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) }

    typedRef.current = next
    setTyped(next)
    engine.change(next)
  }

  return {
    group: typed ? { ...group, ...typed } : group,
    change,
    flush: () => engine.flush(),
    /** Drops what is typed and not saved: "Leave without saving". */
    discard: () => {
      typedRef.current = undefined
      setTyped(undefined)
      engine.discard()
    },
    state,
    problem,
    // Stale and failed edits are unsaved too: Back must ask before they are dropped.
    isUnsaved: state !== 'saved',
    retry: () => void engine.flush(),
  }
}

import type { StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { AutosaveState } from '../lib/autosave'
import type { StoryFields } from '../lib/draft'
import type { StoryLanguage } from '../lib/search-params'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { useDataClient } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { useLatest } from '@/hooks/use-latest'
import { storiesQueries } from '../api/queries'
import { createAutosave } from '../lib/autosave'
import { draftOf, fieldsOf } from '../lib/draft'
import { versionStateOf } from '../lib/version-state'

/** What the body editor registers: `handoff` hands a pending body over now (idempotent), `cancel` drops it. */
export interface BodyHandover { handoff: () => void, cancel: () => void }

/**
 * The autosave of one language version of a story (UX section 7): the title, excerpt and cover save 1.5 s after the last
 * edit, with the row version in `If-Match`. The typed fields live here, in the engine, never in the query, so a refetch
 * cannot move a caret. Every answer of a save is written into the group query, which holds the status the switch reads.
 * Mount one per open language: the group's version at mount is the starting point, and a reload is a new mount.
 */
export function useStoryVersionEditor({ storeId, group, language, accountName }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  accountName: string
}) {
  const client = useDataClient()
  const queryClient = useQueryClient()
  // The editor shows the refusal itself (a notice and the header), so the error toast is off.
  const save = useCommand('stories', 'saveVersion', { meta: { silent: true } })
  const version = group.versions[language]!
  const [fields, setFields] = useState(() => fieldsOf(version))
  const [state, setState] = useState<AutosaveState>('saved')
  const [problem, setProblem] = useState<string>()
  // A version that holds no document has never been saved.
  const [savedAt, setSavedAt] = useState<Date | null>(() => (version.draft ?? version.published ? new Date(version.updatedAt) : null))
  const [stored] = useState(() => (version.draft ?? version.published)?.authorName ?? '')
  // The fields as they are now, for a change that is a function of them: several edits in one tick all land.
  const fieldsRef = useRef(fields)
  const latest = useLatest({ accountName, save, storeId, groupId: group.id, language, stored })
  const groupKey = storiesQueries.group(client, storeId, group.id).queryKey
  const [engine] = useState(() => createAutosave<StoryFields>({
    version: version.rowVersion,
    save: async (draft, ifMatch) => {
      const now = latest.current
      const saved = await now.save.mutateAsync({
        storeId: now.storeId,
        groupId: now.groupId,
        language: now.language,
        ifMatch,
        idempotencyKey: crypto.randomUUID(),
        draft: draftOf(draft, now.accountName, now.stored),
      })

      queryClient.setQueryData<StoryGroupDetail>(groupKey, current => (current ? { ...current, versions: { ...current.versions, [now.language]: saved } } : current))
      setSavedAt(new Date())

      return saved.rowVersion
    },
    isStale: error => error instanceof ApiProblem && error.type === 'precondition-failed',
    onState: (next, error) => {
      setState(next)
      // What went wrong is kept for a failed or stale state only; the next save clears it.
      setProblem(next === 'failed' || next === 'stale' ? (error instanceof ApiProblem ? error.type : 'unknown') : undefined)
    },
  }))

  // The body editor hands its text over 300 ms after the last key; these reach into that wait. Written only by
  // `registerHandover`, which the editor calls from an effect.
  const handoverRef = useRef<BodyHandover | null>(null)

  // Leaving by any route saves what is typed: the request goes on after the screen is gone. A discard has emptied the engine first.
  // A body still waiting for its hand-over is handed over before the engine is disposed.
  useEffect(() => () => {
    handoverRef.current?.handoff()
    engine.dispose()
  }, [engine])

  /** A change of some fields, or a function of the fields as they are now (the body editor of a later ticket passes `{ body }`). */
  const change = (patch: Partial<StoryFields> | ((current: StoryFields) => Partial<StoryFields>)) => {
    const next = { ...fieldsRef.current, ...(typeof patch === 'function' ? patch(fieldsRef.current) : patch) }

    fieldsRef.current = next
    setFields(next)
    engine.change(next)
  }

  return {
    fields,
    change,
    /** The state is unsaved at once and the wait restarts, with the fields as they are (a keystroke in the body, 300 ms before its hand-over). */
    markDirty: () => engine.change(fieldsRef.current),
    registerHandover: (handover: BodyHandover | null) => {
      handoverRef.current = handover
    },
    state,
    problem,
    savedAt,
    // Stale and failed edits are unsaved too: Back must ask before they are dropped.
    isUnsaved: state !== 'saved',
    versionState: versionStateOf(version, state !== 'saved'),
    flush: () => {
      handoverRef.current?.handoff()

      return engine.flush()
    },
    /**
     * A write on the version row that is not a save (publish, unpublish, the link): it goes through the engine so the row
     * version has one owner. Saves what is typed first, writes the answer into the group query, and is not a "Saved" moment.
     */
    run: async (write: (ifMatch: number) => Promise<StoryVersion>) => {
      handoverRef.current?.handoff()

      const answer = await engine.exclusive(write)

      queryClient.setQueryData<StoryGroupDetail>(groupKey, current => (current ? { ...current, versions: { ...current.versions, [language]: answer } } : current))

      return answer
    },
    discard: () => {
      handoverRef.current?.cancel()
      engine.discard()
    },
    retry: () => void engine.flush(),
  }
}

import type { OptionWrite, Product } from '@sk/api-contract'
import type { KeepsakeText } from '../lib/keepsake-rules'
import type { Refusal, Values } from '../lib/option-rules'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDataClient } from '@/features/data-client'
import { useCommand } from '@/features/data-client/use-command'
import { useLatest } from '@/hooks/use-latest'
import { keepsakesQueries } from '../api/queries'
import { AUTOSAVE_MS, fullLanguages, textOf } from '../lib/keepsake-rules'
import { keepsakeProblemKeys, problemTypeOf, refusalsOf } from '../lib/problems'
import { useVariantCommands } from './use-variant-commands'

/** What the autosave holds while it is typed. The commission is a fraction from 0 to 0.5. */
export interface KeepsakeDraft extends KeepsakeText {
  photoIds: string[]
  commission: number
}

export type SaveState = 'saved' | 'unsaved' | 'saving' | 'stale' | 'failed'

/** `refusals` are the rules the API named when it refused the save (422). */
export type Outcome = { ok: true } | { ok: false, type: string, refusals?: Refusal[] }

export function draftOf(keepsake: Product): KeepsakeDraft {
  return {
    name: textOf(keepsake.name),
    text: textOf(keepsake.text),
    photoIds: keepsake.photos.map(photo => photo.id),
    commission: keepsake.commissionRate,
  }
}

function trimmed(text: Record<'en' | 'de', string>) {
  return {
    ...(text.en.trim() && { en: text.en.trim() }),
    ...(text.de.trim() && { de: text.de.trim() }),
  }
}

/**
 * M12's autosave, as M17 says it (UX section 9): the name, the text, the photos and the commission save 1.5 s after
 * the last edit, with the row version in `If-Match`. The typed fields live here, never in the query, so a refetch cannot
 * move a caret. Every answer is written into the detail query, which holds the status, the checks and the variants.
 * A 412 stops the autosave and asks for a reload. The unsaved state is a ref beside the state, so a save that is
 * running while a field changes runs once more with the new version.
 */
export function useKeepsakeEditor({ storeId, keepsake }: { storeId: string, keepsake: Product }) {
  const client = useDataClient()
  const queryClient = useQueryClient()
  const { t } = useLocale()
  // The autosave and the options sheet show a refusal inline, so their error toast is off. Publish and unpublish have
  // no field to show it at: their refusal is the toast, in the keepsake screens' copy.
  const save = useCommand('keepsakes', 'save', { meta: { silent: true } })
  const publish = useCommand('keepsakes', 'publish', {
    meta: {
      success: (published) => {
        const languages = fullLanguages({ name: textOf(published.name), text: textOf(published.text) })

        return t('keepsakes.toast.published', { languages: languages.map(language => t(`keepsakes.language.${language}`)).join(` ${t('keepsakes.and')} `) })
      },
      error: keepsakeProblemKeys,
    },
  })
  const unpublish = useCommand('keepsakes', 'unpublish', { meta: { success: 'keepsakes.toast.unpublished', error: keepsakeProblemKeys } })
  const saveOptions = useCommand('keepsakes', 'saveOptions', { meta: { success: 'keepsakes.optionsSheet.saved', silent: true } })
  // Removing an option from its row says nothing on success; its refusal shows beside the Options card.
  const removeOption = useCommand('keepsakes', 'saveOptions', { meta: { silent: true } })
  const variantCommands = useVariantCommands({ storeId, id: keepsake.id })
  const [draft, setDraft] = useState(() => draftOf(keepsake))
  const [state, setState] = useState<SaveState>('saved')
  const [savedAt, setSavedAt] = useState(() => new Date(keepsake.updatedAt))
  const [problem, setProblem] = useState<string>()
  const draftRef = useRef(draft)
  const versionRef = useRef(keepsake.rowVersion)
  const dirtyRef = useRef(false)
  const runningRef = useRef<Promise<boolean>>(undefined)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const problemRef = useRef<string>(undefined)
  const staleRef = useRef(false)
  const { id } = keepsake
  const detailKey = keepsakesQueries.detail(client, storeId, id).queryKey

  const accept = (result: Product) => {
    versionRef.current = result.rowVersion
    queryClient.setQueryData(detailKey, result)
  }

  async function flush(): Promise<boolean> {
    clearTimeout(timerRef.current)
    if (runningRef.current)
      return runningRef.current
    // A stale draft is not saved again until the page is reloaded.
    if (staleRef.current)
      return false
    if (!dirtyRef.current)
      return true
    const run = (async () => {
      try {
        while (dirtyRef.current) {
          const sent = draftRef.current

          dirtyRef.current = false
          setState('saving')
          try {
            accept(await save.mutateAsync({
              storeId,
              id,
              ifMatch: versionRef.current,
              idempotencyKey: crypto.randomUUID(),
              name: trimmed(sent.name),
              text: trimmed(sent.text),
              photoIds: sent.photoIds,
              commissionRate: sent.commission,
            }))
            setSavedAt(new Date())
          }
          catch (error) {
            const type = problemTypeOf(error)

            dirtyRef.current = true
            staleRef.current = type === 'precondition-failed'
            problemRef.current = type
            setProblem(type)
            setState(type === 'precondition-failed' ? 'stale' : 'failed')

            return false
          }
        }
        setProblem(undefined)
        setState('saved')

        return true
      }
      finally {
        runningRef.current = undefined
      }
    })()

    runningRef.current = run

    return run
  }

  const flushRef = useLatest(flush)

  const change = (patch: Partial<KeepsakeDraft>) => {
    const next = { ...draftRef.current, ...patch }

    draftRef.current = next
    dirtyRef.current = true
    setDraft(next)
    setState(current => (current === 'stale' ? current : 'unsaved'))
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void flushRef.current(), AUTOSAVE_MS)
  }

  // Leaving by any route saves what is typed: the request goes on after the screen is gone.
  useEffect(() => () => {
    clearTimeout(timerRef.current)
    if (dirtyRef.current)
      void flushRef.current()
  }, [flushRef])

  /** Saves what is typed, then runs the command on the version that save returned. */
  async function afterFlush(run: () => Promise<Product>): Promise<Outcome> {
    if (!(await flush()))
      return { ok: false, type: problemRef.current ?? 'unknown' }
    try {
      accept(await run())

      return { ok: true }
    }
    catch (error) {
      const type = problemTypeOf(error)

      // Someone saved after this page loaded: nothing more is written from it until it is reloaded.
      if (type === 'precondition-failed') {
        staleRef.current = true
        setState('stale')
      }

      return { ok: false, type, refusals: refusalsOf(error) }
    }
  }

  return {
    draft,
    change,
    state,
    savedAt,
    problem,
    // Stale and failed edits are unsaved too: Back must ask before they are dropped.
    isUnsaved: state !== 'saved',
    retry: () => void flush(),
    flush,
    publish: () => afterFlush(() => publish.mutateAsync({ storeId, id, ifMatch: versionRef.current, idempotencyKey: crypto.randomUUID() })),
    unpublish: () => afterFlush(() => unpublish.mutateAsync({ storeId, id, ifMatch: versionRef.current, idempotencyKey: crypto.randomUUID() })),
    ...variantCommands,
    /** The options and the new values of the variants, in one write on the version the page holds. The typed fields save first. */
    saveOptions: (options: OptionWrite[], variantValues: { variantId: string, values: Values }[]) =>
      afterFlush(() => saveOptions.mutateAsync({ storeId, id, ifMatch: versionRef.current, idempotencyKey: crypto.randomUUID(), options, variantValues })),
    removeOption: (options: OptionWrite[]) =>
      afterFlush(() => removeOption.mutateAsync({ storeId, id, ifMatch: versionRef.current, idempotencyKey: crypto.randomUUID(), options, variantValues: [] })),
    isPublishing: publish.isPending || unpublish.isPending,
  }
}

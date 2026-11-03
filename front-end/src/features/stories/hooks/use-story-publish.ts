import type { StoryVersion } from '@sk/api-contract'
import type { PublishGap } from '@sk/domain/content'
import type { StoryFields } from '../lib/draft'
import type { StoryLanguage } from '../lib/search-params'

import { useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { useLatest } from '@/hooks/use-latest'
import { PublishIncomplete } from '../api/publish-incomplete'
import { NotSaved } from '../lib/autosave'
import { storyProblemKeys } from '../lib/problems'

export type Outcome = { ok: true } | { ok: false, type: string }

type Write = (ifMatch: number) => Promise<StoryVersion>

/**
 * The three writes of the Review screen that are not the autosave: publish, unpublish and the link. Each goes through
 * `run` (the engine's `exclusive`), so it saves what is typed first and the row version has one owner. Publish toasts;
 * Unpublish and the link answer silently, because the confirm dialog and the link field show their own refusal.
 */
export function useStoryPublish({ storeId, groupId, language, run, fields, slug }: {
  storeId: string
  groupId: string
  language: StoryLanguage
  run: (write: Write) => Promise<StoryVersion>
  /** The typed fields and the saved link now: a refusal counts only while neither has changed. */
  fields: StoryFields
  slug: string | null
}) {
  const { t } = useLocale()
  const languageName = (code: StoryLanguage) => t(`storyEditor.language.${code}`)
  const publishCommand = useCommand('stories', 'publishVersion', {
    meta: { success: (_version, input) => t('storyPublish.toast.published', { language: languageName(input.language) }), error: storyProblemKeys },
  })
  const unpublishCommand = useCommand('stories', 'unpublishVersion', {
    meta: { success: (_version, input) => t('storyPublish.toast.unpublished', { language: languageName(input.language) }), silent: true },
  })
  const saveCommand = useCommand('stories', 'saveVersion', { meta: { silent: true } })
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const key = () => crypto.randomUUID()
  const latest = useLatest({ fields, slug })
  const [refusal, setRefusal] = useState<{ gaps: PublishGap[], fields: StoryFields, slug: string | null }>()

  /** One write at a time: a second press while one is on its way does nothing. */
  async function attempt(write: Write): Promise<Outcome> {
    if (busyRef.current)
      return { ok: false, type: 'busy' }
    busyRef.current = true
    setBusy(true)
    try {
      await run(write)

      return { ok: true }
    }
    catch (error) {
      if (error instanceof PublishIncomplete)
        setRefusal({ gaps: error.gaps, ...latest.current })

      return { ok: false, type: error instanceof NotSaved ? 'not-saved' : error instanceof ApiProblem ? error.type : 'unknown' }
    }
    finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return {
    publish: () => attempt(ifMatch => publishCommand.mutateAsync({ storeId, groupId, language, ifMatch, idempotencyKey: key() })),
    unpublish: () => attempt(ifMatch => unpublishCommand.mutateAsync({ storeId, groupId, language, ifMatch, idempotencyKey: key() })),
    saveSlug: (slug: string | null) => attempt(ifMatch => saveCommand.mutateAsync({ storeId, groupId, language, ifMatch, idempotencyKey: key(), slug })),
    isPending: busy,
    /** The gaps the API named in a 422, only while the fields and the link are the ones it refused (a stale refusal never outlives its data). */
    refused: refusal && refusal.fields === fields && refusal.slug === slug ? refusal.gaps : undefined,
  }
}

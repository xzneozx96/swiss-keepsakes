import type { StoryVersion } from '@sk/api-contract'
import type { ReactNode } from 'react'
import type { Outcome } from '../hooks/use-story-publish'
import type { StoryFields } from '../lib/draft'
import type { PublishChecks } from '../lib/publish-checks'
import type { StoryLanguage } from '../lib/search-params'
import type { VersionState } from '../lib/version-state'

import { Button } from '@heroui/react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { linkPath } from '../lib/link'
import { storyProblemKey } from '../lib/problems'

/**
 * The publish card of Review: the language switch, what is shared and what is per language, the title and the public
 * path, then the actions of this version. Draft: Publish. Live with edits not live: Publish changes, then Unpublish.
 * Live and nothing pending: Unpublish alone. Unpublish asks first, and a refusal stays inside its dialog. Publish is off
 * while something blocks, with the reason under it.
 *
 * `layout` says which part renders, so one tree shows at a time. `card` (laptop) is the head and every action. `head`
 * (phone) is the head and Unpublish, and `bar` is the short Publish button the fixed bar holds.
 */
export function StoryPublishCard({ language, version, fields, checks, versionState, switchNode, publish, unpublish, isPending, layout = 'card' }: {
  language: StoryLanguage
  version: StoryVersion
  fields: StoryFields
  checks: PublishChecks
  versionState: VersionState
  switchNode: ReactNode
  publish: () => Promise<Outcome>
  unpublish: () => Promise<Outcome>
  isPending: boolean
  layout?: 'card' | 'head' | 'bar'
}) {
  const { t } = useLocale()
  const { confirm, dialog } = useConfirm()
  const languageName = t(`storyEditor.language.${language}`)
  const live = versionState === 'published' || versionState === 'editsNotLive'
  const blocked = checks.blocking.length > 0

  const ask = () => confirm({
    title: t('storyPublish.unpublish.title', { language: languageName }),
    body: t('storyPublish.unpublish.body'),
    confirmLabel: t('storyPublish.unpublish.confirm'),
    // The dialog waits for the answer and keeps a refusal inside itself.
    run: async () => {
      const outcome = await unpublish()

      if (!outcome.ok)
        throw new Error(t(outcome.type === 'not-saved' ? 'storyPublish.problem.notSaved' : storyProblemKey(outcome.type)))
    },
    problem: error => (error instanceof Error ? error.message : t(storyProblemKey('unknown'))),
  })

  const publishButton = versionState !== 'published' && (
    <Button fullWidth={layout === 'card'} className="max-lg:min-h-11" isDisabled={isPending || blocked} onPress={() => void publish()}>
      {versionState === 'editsNotLive' ? t('storyPublish.action.publishChanges', { code: language.toUpperCase() }) : t('storyPublish.action.publish', { language: languageName })}
    </Button>
  )

  if (layout === 'bar')
    return publishButton || null

  return (
    <section className="flex flex-col gap-3" id="publish-card">
      {switchNode}
      <p className="text-sm text-muted">{t('storyPublish.card.perLanguage')}</p>
      <h2 className="font-serif text-lg text-pretty" lang={language}>{fields.title.trim() || t('merchantStories.untitled')}</h2>
      <p className="text-sm break-all text-muted">{t('storyPublish.card.path', { path: linkPath(language, version.slug) })}</p>
      <div className="flex flex-col gap-2">
        {layout === 'card' && publishButton}
        {layout === 'card' && publishButton && blocked && <p className="text-sm text-muted">{t('storyPublish.action.blocked')}</p>}
        {live && (
          <Button fullWidth className="max-lg:min-h-11" isDisabled={isPending} variant="danger-soft" onPress={() => void ask()}>{t('storyPublish.action.unpublish')}</Button>
        )}
      </div>
      {dialog}
    </section>
  )
}

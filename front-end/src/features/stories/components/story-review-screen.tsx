import type { StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { ReactNode } from 'react'
import type { useStoryVersionEditor } from '../hooks/use-story-version-editor'
import type { Check, CheckTarget } from '../lib/publish-checks'
import type { StoryLanguage } from '../lib/search-params'

import { useStoryPublishFacts } from '../hooks/use-publish-facts'
import { useStoryPublish } from '../hooks/use-story-publish'
import { publishChecks } from '../lib/publish-checks'
import { StoryChecksList } from './story-checks-list'
import { StoryPublishCard } from './story-publish-card'

/**
 * Review and publish. Task by task this grows into the laptop grid with the preview and the Details panel, and the phone
 * column with the publish bar; the publish card and the checks are its heart.
 */
export function StoryReviewScreen({ storeId, group, language, version, editor, switchNode, onEdit }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  version: StoryVersion
  editor: ReturnType<typeof useStoryVersionEditor>
  switchNode: ReactNode
  /** Goes to the Write card that fixes a check and puts its field in view. */
  onEdit: (target: CheckTarget) => void
}) {
  const other = language === 'en' ? 'de' : 'en'
  const publish = useStoryPublish({ storeId, groupId: group.id, language, run: editor.run, fields: editor.fields, slug: version.slug })
  const facts = useStoryPublishFacts({ storeId, group, language, body: editor.fields.body })
  const checks = publishChecks({ group, language, slug: version.slug, fields: editor.fields, otherExists: group.versions[other] !== null, facts, refused: publish.refused })

  function fix(check: Check) {
    if (check.step === 'write')
      onEdit(check.target)
    else if (check.step === 'publish')
      document.getElementById('publish-card')?.scrollIntoView?.({ block: 'start' })
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 py-4">
      <div className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
        <StoryPublishCard checks={checks} fields={editor.fields} isPending={publish.isPending} language={language} publish={publish.publish} switchNode={switchNode} unpublish={publish.unpublish} version={version} versionState={editor.versionState} />
        <hr className="border-separator" />
        <StoryChecksList checks={checks} onFix={fix} />
      </div>
    </div>
  )
}

import type { StoryGroupDetail, StoryVersion } from '@sk/api-contract'
import type { ReactNode } from 'react'
import type { useStoryVersionEditor } from '../hooks/use-story-version-editor'
import type { StoryLanguage } from '../lib/search-params'

import { useStoryPublish } from '../hooks/use-story-publish'
import { publishChecks } from '../lib/publish-checks'
import { StoryPublishCard } from './story-publish-card'

/**
 * Review and publish. Task by task this grows into the laptop grid with the preview and the Details panel, and the phone
 * column with the publish bar; the publish card is its heart.
 */
export function StoryReviewScreen({ storeId, group, language, version, editor, switchNode }: {
  storeId: string
  group: StoryGroupDetail
  language: StoryLanguage
  version: StoryVersion
  editor: ReturnType<typeof useStoryVersionEditor>
  switchNode: ReactNode
}) {
  const other = language === 'en' ? 'de' : 'en'
  const publish = useStoryPublish({ storeId, groupId: group.id, language, run: editor.run })
  const checks = publishChecks({ group, language, slug: version.slug, fields: editor.fields, otherExists: group.versions[other] !== null })

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 py-4">
      <div className="rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
        <StoryPublishCard checks={checks} fields={editor.fields} isPending={publish.isPending} language={language} publish={publish.publish} switchNode={switchNode} unpublish={publish.unpublish} version={version} versionState={editor.versionState} />
      </div>
    </div>
  )
}

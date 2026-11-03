import type { StoryVersion } from '@sk/api-contract'
import type { ReactNode } from 'react'
import type { useStoryGroupEditor } from '../hooks/use-story-group-editor'
import type { useStoryVersionEditor } from '../hooks/use-story-version-editor'
import type { Check, CheckTarget } from '../lib/publish-checks'
import type { StoryLanguage } from '../lib/search-params'
import type { DetailCardId } from './story-details-panel'

import { useState } from 'react'

import { PageTabs } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { useStoryPublishFacts } from '../hooks/use-publish-facts'
import { useStoryPublish } from '../hooks/use-story-publish'
import { publishChecks } from '../lib/publish-checks'
import { CategoriesCard } from './story-categories-card'
import { StoryChecksList } from './story-checks-list'
import { DetailsPanel, useDetailsPanel } from './story-details-panel'
import { InterestsCard } from './story-interests-card'
import { KeepsakesCard } from './story-keepsakes-card'
import { StoryLinkCard } from './story-link-card'
import { PlacesCard } from './story-places-card'
import { StoryPreviewSlot } from './story-preview-slot'
import { StoryPublishBar } from './story-publish-bar'
import { StoryPublishCard } from './story-publish-card'
import { RelatedCard } from './story-related-card'
import { ReviewCard } from './story-review-card'
import { StayCard } from './story-stay-card'

/**
 * Review and publish. Laptop: the preview on the left and a 440 px panel on the right (the publish card, the checks, the
 * Details cards). Phone: the card head, a Details and Preview switch, and the fixed bar that holds the checks and Publish.
 * Only one of the two trees renders, so no id is on the page twice. The Details cards sit inside `DetailsPanel`.
 */
export function StoryReviewScreen({ storeId, groupEditor, language, version, editor, switchNode, onEdit }: {
  storeId: string
  language: StoryLanguage
  version: StoryVersion
  editor: ReturnType<typeof useStoryVersionEditor>
  /** The group's own autosave; the screen reads the group through it, so what is typed counts at once. */
  groupEditor: ReturnType<typeof useStoryGroupEditor>
  switchNode: ReactNode
  /** Goes to the Write card that fixes a check and puts its field in view. */
  onEdit: (target: CheckTarget) => void
}) {
  const { t } = useLocale()
  const group = groupEditor.group
  const isWide = useIsWide()
  const other = language === 'en' ? 'de' : 'en'
  const publish = useStoryPublish({ storeId, groupId: group.id, language, run: editor.run, fields: editor.fields, slug: version.slug, before: groupEditor.flush })
  const facts = useStoryPublishFacts({ storeId, group, language, body: editor.fields.body })
  const checks = publishChecks({ group, language, slug: version.slug, fields: editor.fields, otherExists: group.versions[other] !== null, facts, refused: publish.refused })
  const panel = useDetailsPanel(checks)
  // Details first when something needs the merchant: a blocking check or a card that opened by itself.
  const [tab, setTab] = useState<'details' | 'preview'>(() => (checks.blocking.length > 0 || Object.values(panel.open).some(Boolean) ? 'details' : 'preview'))

  function fix(check: Check) {
    if (check.step === 'write') {
      onEdit(check.target)
    }
    else if (check.step === 'publish') {
      document.getElementById('publish-card')?.scrollIntoView?.({ block: 'start' })
    }
    else {
      setTab('details')
      panel.reveal(check.target as DetailCardId)
    }
  }

  const card = (layout: 'card' | 'head' | 'bar') => (
    <StoryPublishCard checks={checks} fields={editor.fields} isPending={publish.isPending} language={language} layout={layout} publish={publish.publish} switchNode={switchNode} unpublish={publish.unpublish} version={version} versionState={editor.versionState} />
  )
  const details = (
    <DetailsPanel panel={panel}>
      <StoryLinkCard group={group} language={language} title={editor.fields.title} version={version} onSave={publish.saveSlug} />
      <ReviewCard fields={editor.fields} group={group} language={language} storeId={storeId} onFieldsChange={editor.change} onGroupChange={groupEditor.change} />
      <CategoriesCard group={group} language={language} storeId={storeId} onChange={groupEditor.change} />
      <PlacesCard body={editor.fields.body} group={group} language={language} storeId={storeId} onChange={groupEditor.change} />
      <StayCard group={group} onChange={groupEditor.change} />
      <InterestsCard group={group} onChange={groupEditor.change} />
      <KeepsakesCard group={group} language={language} storeId={storeId} onChange={groupEditor.change} />
      <RelatedCard group={group} language={language} storeId={storeId} onChange={groupEditor.change} />
    </DetailsPanel>
  )
  const preview = <StoryPreviewSlot fields={editor.fields} group={group} language={language} />

  if (!isWide) {
    return (
      <div className="flex flex-col gap-4 pt-4 pb-52">
        <div className="rounded-3xl bg-surface p-4 shadow-surface">{card('head')}</div>
        <div className="sticky top-16 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur-xl">
          <PageTabs
            equal
            label={t('storyPublish.tabs.label')}
            selected={tab}
            sticky={false}
            tabs={[{ id: 'details', label: t('storyPublish.tab.details') }, { id: 'preview', label: t('storyPublish.tab.preview') }]}
            onSelect={setTab}
          />
        </div>
        {tab === 'details' ? details : preview}
        <StoryPublishBar checks={checks} publishButton={card('bar')} onFix={fix} />
      </div>
    )
  }

  return (
    <div className="-mx-4 grid grid-cols-[minmax(0,1fr)_440px] lg:-mx-8">
      <section aria-label={t('storyPublish.tab.preview')} className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col items-center gap-3 self-start bg-default/50 px-6 py-5">
        <p className="text-sm text-muted">{t('storyPublish.preview.hint')}</p>
        {preview}
      </section>
      <aside aria-label={t('storyPublish.panel.label')} className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-4 self-start overflow-y-auto border-s border-separator bg-background p-5">
        <div className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface">
          {card('card')}
          <hr className="border-separator" />
          <StoryChecksList checks={checks} onFix={fix} />
        </div>
        {details}
      </aside>
    </div>
  )
}

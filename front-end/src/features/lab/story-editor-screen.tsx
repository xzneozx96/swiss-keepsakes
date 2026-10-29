import type { CardId } from './story-editor-cards'
import type { Check } from './story-editor-rules'
import type { LabState } from './story-editor-search-params'
import type { StoryEditorModel } from './story-editor-state'
import type { IconComponent } from '@/components/icons'

import { Button, Skeleton } from '@heroui/react'
import { useState } from 'react'

import { BackIcon, ChevronDownIcon, ContentIcon, EditIcon, StatusDangerIcon, StatusSuccessIcon, StatusWarningIcon } from '@/components/icons'
import { useIsWide } from '@/hooks/use-is-wide'
import { CARD_IDS, cardAnchor } from './story-editor-cards'
import { LANG_NAME } from './story-editor-data'
import { DetailsCards } from './story-editor-details'
import { useLeaveGuard } from './story-editor-guard'
import { BodyEditor, BodyFacts, ChecksList, CoverAndTitle, PublishActions, SaveStatus, VersionSwitch } from './story-editor-parts'
import { PreviewFrame } from './story-editor-preview'
import { StoryShell } from './story-editor-shell'
import { useStoryEditor } from './story-editor-state'

/**
 * The story editor (M17), the owner's mix of the three lab options (29.10.2026), on option B:
 *
 * - Write: B's calm page, as two cards in the style of the pin editor (Cover and title, Story),
 *   with B's bubble on selected text and "+" on an empty line. Phones: full-width cards and
 *   the formatting bar above the keyboard.
 * - Review and publish: C's layout. The phone preview on the left; on the right the checks and
 *   Publish, then Details as collapsible cards, always there. Phones: a Details / Preview switch
 *   and a bar pinned at the bottom with the checks and Publish.
 *
 * Drafts save themselves. The author is the signed-in account; there is no author role.
 */

type Screen = 'write' | 'review'

const REVIEW_STATES: LabState[] = ['publish', 'reviewtype', 'blocked', 'categories']

/** A Write card: the pin editor's `DetailCard` look, full width with square corners on phones. */
function WriteCard({ icon: Icon, title, trailing, children, className = '' }: {
  icon: IconComponent
  title: string
  trailing?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={`flex flex-col gap-4 border-y border-separator bg-surface p-4 lg:rounded-3xl lg:border-none lg:p-6 lg:shadow-surface ${className}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
          <Icon aria-hidden size={18} />
        </span>
        <h2 className="min-w-0 flex-1 text-base font-semibold">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  )
}

function TopBar({ model, screen, onWrite, onReview, onBack }: {
  model: StoryEditorModel
  screen: Screen
  onWrite: () => void
  onReview: () => void
  onBack: () => void
}) {
  const reviewing = screen === 'review'

  return (
    <div className="sticky top-0 z-30 border-b border-separator bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 items-center gap-2 px-2 lg:gap-3 lg:px-6">
        <Button isIconOnly aria-label={reviewing ? 'Back to writing' : 'Back to Stories'} className="size-11 shrink-0" variant="ghost" onPress={reviewing ? onWrite : onBack}>
          <BackIcon aria-hidden size={20} />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">
            {reviewing ? 'Review and publish' : `${LANG_NAME[model.language]} · ${model.version.status === 'published' ? 'Published' : 'Draft'}`}
          </span>
          <SaveStatus model={model} />
        </div>
        {!reviewing && (
          <>
            <span className="max-lg:hidden">
              <VersionSwitch compact model={model} />
            </span>
            <Button className="shrink-0 max-lg:h-11" onPress={onReview}>
              <span className="lg:hidden">Review</span>
              <span className="max-lg:hidden">Review and publish</span>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export function StoryEditorLoading() {
  return (
    <StoryShell>
      <div aria-busy="true" aria-label="Loading the story" className="flex flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-separator px-4">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-full" />
          <span className="flex-1" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 py-4 lg:px-5 lg:py-8">
          <div className="flex flex-col gap-4 bg-surface p-4 lg:rounded-3xl lg:p-6">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-3 bg-surface p-4 lg:rounded-3xl lg:p-6">
            <Skeleton className="h-6 w-24 rounded-full" />
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full rounded-full" />)}
          </div>
        </div>
      </div>
    </StoryShell>
  )
}

/** Phones: the checks fold into one line above Publish; the line opens the list. */
function PhonePublishBar({ model, onFix }: { model: StoryEditorModel, onFix: (check: Check) => void }) {
  const { blocking, warnings } = model.checks
  const [expanded, setExpanded] = useState(blocking.length > 0)
  const summary = blocking.length
    ? `${blocking.length} ${blocking.length === 1 ? 'thing stops' : 'things stop'} publishing`
    : warnings.length ? `Ready · ${warnings.length} to look at` : 'Ready to publish'
  const Icon = blocking.length ? StatusDangerIcon : warnings.length ? StatusWarningIcon : StatusSuccessIcon

  return (
    <div className="fixed inset-x-0 bottom-16 z-20 flex flex-col border-t border-separator bg-surface shadow-overlay">
      {expanded && (
        <div className="max-h-[42dvh] overflow-y-auto border-b border-separator px-4 py-3">
          <ChecksList
            model={model}
            onFix={(check) => {
              setExpanded(false)
              onFix(check)
            }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2">
        <button aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-start text-sm font-medium outline-none focus-visible:focus-ring" type="button" onClick={() => setExpanded(e => !e)}>
          <Icon aria-hidden className={`shrink-0 ${blocking.length ? 'text-danger' : warnings.length ? 'text-warning' : 'text-success'}`} size={18} />
          <span className="min-w-0 flex-1 truncate">{summary}</span>
          <ChevronDownIcon aria-hidden className={`shrink-0 text-muted transition-transform ${expanded ? '' : 'rotate-180'}`} size={16} />
        </button>
        <PublishActions layout="bar" model={model} />
      </div>
    </div>
  )
}

function ReviewScreen({ model, state, onFix, open, onToggle }: {
  model: StoryEditorModel
  state: LabState
  onFix: (check: Check) => void
  open: Record<CardId, boolean>
  onToggle: (id: CardId) => void
}) {
  const isWide = useIsWide()
  const [tab, setTab] = useState<'details' | 'preview'>(model.checks.blocking.length || state === 'categories' || state === 'reviewtype' ? 'details' : 'preview')
  const details = <DetailsCards model={model} open={open} startCategories={state === 'categories'} onToggle={onToggle} />
  // The language switch heads the publish card: it changes the title, link, Publish, checks and preview.
  const head = (
    <div className="flex flex-col gap-3" id="publish-card">
      <div className="flex flex-col gap-1.5">
        <VersionSwitch model={model} />
        <p className="text-xs text-muted">Title, text and cover are per language.</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-lg text-pretty" lang={model.language}>{model.version.title || 'Untitled story'}</p>
        <p className="text-xs text-muted">{`/${model.language}/stories/${model.story.slug || '…'} · guests see it within about a minute`}</p>
      </div>
    </div>
  )
  const detailsHead = (
    <div className="flex flex-col gap-0.5 px-1 pt-2">
      <h2 className="text-heading">Details</h2>
      <p className="text-xs text-muted">{`Shared by ${LANG_NAME.en} and ${LANG_NAME.de}.`}</p>
    </div>
  )

  if (!isWide) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-3 pb-52">
        {head}
        <div aria-label="Show" className="sticky top-[4.5rem] z-10 grid grid-cols-2 gap-1 rounded-2xl bg-default p-1" role="group">
          {(['details', 'preview'] as const).map(id => (
            <button key={id} aria-pressed={tab === id} className="h-11 rounded-xl text-sm font-semibold text-muted outline-none focus-visible:focus-ring aria-pressed:bg-surface aria-pressed:text-foreground aria-pressed:shadow-surface" type="button" onClick={() => setTab(id)}>
              {id === 'details' ? 'Details' : 'Preview'}
            </button>
          ))}
        </div>
        {tab === 'details'
          ? (
              <>
                {detailsHead}
                {details}
              </>
            )
          : <PreviewFrame language={model.language} story={model.story} />}
        <PhonePublishBar
          model={model}
          onFix={(check) => {
            if (check.step === 'details')
              setTab('details')
            onFix(check)
          }}
        />
      </div>
    )
  }

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)_440px]">
      <section aria-label="Preview" className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col items-center gap-3 self-start bg-default/50 px-6 py-5">
        <p className="text-sm text-muted">What guests will see, on a phone as most of them read. Scroll inside the phone.</p>
        <PreviewFrame fixed language={model.language} story={model.story} />
      </section>
      <aside aria-label="Publish and details" className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col gap-4 overflow-y-auto border-s border-separator bg-background p-5">
        <section className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-surface">
          {head}
          <PublishActions model={model} />
          <div className="border-t border-separator pt-4">
            <ChecksList model={model} onFix={onFix} />
          </div>
        </section>
        {detailsHead}
        {details}
      </aside>
    </div>
  )
}

export function StoryEditorScreen({ state }: { state: LabState }) {
  const model = useStoryEditor(state)
  const [screen, setScreen] = useState<Screen>(REVIEW_STATES.includes(state) ? 'review' : 'write')
  const [attempted, setAttempted] = useState(false)
  // A card opens by default when it holds a problem (or when the lab state is about it).
  const [open, setOpen] = useState(() => Object.fromEntries(CARD_IDS.map(id => [
    id,
    [...model.checks.blocking, ...model.checks.warnings].some(c => c.target === id)
    || (state === 'reviewtype' && id === 'review')
    || (state === 'categories' && id === 'categories'),
  ])) as Record<CardId, boolean>)
  const guard = useLeaveGuard(model, state === 'unsaved')

  const go = (next: Screen) => {
    setScreen(next)
    window.scrollTo(0, 0)
  }
  const review = () => {
    if (model.checks.blocking.length)
      setAttempted(true)
    go('review')
  }
  const fix = (check: Check) => {
    if (check.step === 'write') {
      setAttempted(true)
      go('write')
      requestAnimationFrame(() => document.getElementById(`write-${check.target}`)?.scrollIntoView({ block: 'center' }))

      return
    }
    if (check.target === 'language') {
      requestAnimationFrame(() => document.getElementById('publish-card')?.scrollIntoView({ block: 'center' }))

      return
    }
    const id = check.target as CardId

    setOpen(o => ({ ...o, [id]: true }))
    requestAnimationFrame(() => document.getElementById(cardAnchor(id))?.scrollIntoView({ block: 'start' }))
  }

  return (
    <StoryShell>
      <TopBar model={model} screen={screen} onBack={guard.leave} onReview={review} onWrite={() => go('write')} />

      {screen === 'write' && (
        <main className="mx-auto flex w-full max-w-[760px] flex-col gap-3 pt-3 pb-14 lg:gap-6 lg:px-5 lg:pt-8 lg:pb-12">
          <div className="px-4 lg:hidden">
            <VersionSwitch model={model} />
          </div>
          <WriteCard icon={EditIcon} title="Cover and title">
            <CoverAndTitle model={model} showErrors={attempted} />
          </WriteCard>
          <WriteCard icon={ContentIcon} title="Story" trailing={<BodyFacts className="hidden sm:block" model={model} />}>
            <div id="write-body">
              <BodyEditor model={model} state={state} />
            </div>
            <BodyFacts className="sm:hidden" model={model} />
          </WriteCard>
        </main>
      )}

      {screen === 'review' && (
        <ReviewScreen
          model={model}
          open={open}
          state={state}
          onFix={fix}
          onToggle={id => setOpen(o => ({ ...o, [id]: !o[id] }))}
        />
      )}
      {guard.dialog}
    </StoryShell>
  )
}

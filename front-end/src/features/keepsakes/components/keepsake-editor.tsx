import type { Product, PublishCheck } from '@sk/api-contract'
import type { KeepsakeStep, KeepsakeView } from '../lib/search-params'

import { Button } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { GiftIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useIsWide } from '@/hooks/use-is-wide'
import { useKeepsake } from '../api/queries'
import { useKeepsakeEditor } from '../hooks/use-keepsake-editor'
import { nameIn, statusOf } from '../lib/keepsake-rules'
import { saveStatusOf } from '../lib/save-status'
import { isKeepsakeStep, KEEPSAKE_STEPS, KEEPSAKES_PATH } from '../lib/search-params'
import { stepOfCard, stepStatuses } from '../lib/steps'
import { DetailsStep } from './details-step'
import { EditorSkeleton } from './editor-skeleton'
import { KeepsakeFrame } from './keepsake-frame'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { KeepsakeTopBar } from './keepsake-top-bar'
import { OptionsCard } from './options-card'
import { useLeaveGuard } from './use-leave-guard'
import { VariantsCard } from './variants-card'

// The mockup and the preview load when Review opens, not with the edit screen.
const ReviewScreen = lazy(() => import('./review-screen'))

/** Where the page is: a step of the editor, or the old Review screen (`view`), which T-004 turns into a step. */
export interface Place { step: KeepsakeStep, view: KeepsakeView }

/** To the block a check names, after the next paint so that its step exists, with the block's first control focused. */
function focusBlock(id: string, tries = 12) {
  requestAnimationFrame(() => {
    const block = document.getElementById(id)

    if (!block && tries > 0) {
      focusBlock(id, tries - 1)

      return
    }
    block?.scrollIntoView({ block: 'start' })
    block?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
  })
}

function Editor({ storeId, keepsake, step, view, onOpen, onReload }: {
  storeId: string
  keepsake: Product
  step: KeepsakeStep
  view: KeepsakeView
  onOpen: (place: Place) => void
  onReload: () => void
}) {
  const { t, language, intlLocale } = useLocale()
  const wide = useIsWide()
  const navigate = useNavigate()
  const editor = useKeepsakeEditor({ storeId, keepsake })
  const [showErrors, setShowErrors] = useState(false)
  const guard = useLeaveGuard({ isUnsaved: editor.isUnsaved, onLeave: () => void navigate({ to: KEEPSAKES_PATH }) })
  const { draft } = editor
  const name = nameIn(draft.name, language) || t('keepsakes.untitled')
  const statuses = stepStatuses(keepsake, KEEPSAKE_STEPS, showErrors)
  const steps = KEEPSAKE_STEPS.map(id => ({ id, label: t(`keepsakes.step.${id}`), status: statuses[id] }))
  const index = KEEPSAKE_STEPS.indexOf(step)
  const status = statusOf(keepsake)

  const go = (id: string) => {
    if (!isKeepsakeStep(id))
      return
    onOpen({ step: id, view: 'edit' })
    window.scrollTo?.({ top: 0 })
  }

  /** To the step that holds the block a check names. */
  const jumpTo = (check: PublishCheck) => {
    onOpen({ step: stepOfCard(check.card), view: 'edit' })
    focusBlock(check.card)
  }

  const review = async () => {
    if (await editor.flush())
      onOpen({ step, view: 'review' })
  }

  const reviewScreen = (
    <Suspense fallback={<EditorSkeleton />}>
      <ReviewScreen
        actions={{
          publish: editor.publish,
          unpublish: editor.unpublish,
          isPending: editor.isPublishing,
          onBlocked: () => {
            setShowErrors(true)
            onOpen({ step, view: 'edit' })
          },
        }}
        keepsake={keepsake}
        onFix={(check) => {
          setShowErrors(true)
          jumpTo(check)
        }}
      />
    </Suspense>
  )

  if (view === 'review') {
    return (
      <div className="flex flex-col" data-testid="keepsake-editor">
        <KeepsakeTopBar
          backLabel={t('keepsakes.back.toEditing')}
          keepsake={keepsake}
          name={name}
          savedAt={editor.savedAt}
          state={editor.state}
          onBack={() => onOpen({ step, view: 'edit' })}
        />
        {reviewScreen}
      </div>
    )
  }

  const notices = (
    <>
      {editor.state === 'stale' && (
        <div className="flex flex-col items-start gap-2 rounded-2xl bg-warning-soft p-4 text-sm text-warning-soft-foreground" role="alert">
          <p>{t('keepsakes.problem.stale')}</p>
          <Button className="min-h-11" variant="secondary" onPress={onReload}>{t('keepsakes.reload')}</Button>
        </div>
      )}
      {editor.state === 'failed' && <KeepsakeNotice type={editor.problem} onRetry={editor.retry} />}
    </>
  )

  return (
    <>
      <KeepsakeFrame
        bar={{
          ...saveStatusOf(t, intlLocale, editor.state, editor.savedAt),
          isSaving: false,
          onBack: index > 0 ? () => go(KEEPSAKE_STEPS[index - 1]!) : undefined,
          onForward: index < KEEPSAKE_STEPS.length - 1 ? () => go(KEEPSAKE_STEPS[index + 1]!) : undefined,
        }}
        canGo={() => true}
        current={step}
        notices={notices}
        status={{ tone: status.tone, label: t(status.key) }}
        steps={steps}
        title={name}
        trailing={(
          <Button className="ms-auto shrink-0 max-lg:min-h-11" size="sm" onPress={() => void review()}>
            {wide ? t('keepsakes.review.open') : t('keepsakes.review.openShort')}
          </Button>
        )}
        onBack={guard.leave}
        onGo={go}
      >
        {/* The Details step stays mounted, so a photo that is still uploading keeps its row when another step opens. */}
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6" hidden={step !== 'details'}>
          <DetailsStep
            commission={draft.commission}
            photoIds={draft.photoIds}
            showErrors={showErrors}
            storeId={storeId}
            value={draft}
            onAddPhoto={mediaId => editor.change(current => ({ photoIds: current.photoIds.includes(mediaId) ? current.photoIds : [...current.photoIds, mediaId] }))}
            onCommission={commission => editor.change({ commission })}
            onPhotos={photoIds => editor.change({ photoIds })}
            onValue={next => editor.change({ name: next.name, text: next.text })}
          />
        </div>
        {step === 'options' && <OptionsCard keepsake={keepsake} onRemove={editor.removeOption} onSave={editor.saveOptions} />}
        {step === 'variants' && <VariantsCard keepsake={keepsake} onCreate={editor.createVariant} onSave={editor.saveVariant} />}
      </KeepsakeFrame>
      {guard.dialog}
    </>
  )
}

function LoadedEditor({ storeId, id, step, view, onOpen }: { storeId: string, id: string, step: KeepsakeStep, view: KeepsakeView, onOpen: (place: Place) => void }) {
  const { t } = useLocale()
  const query = useKeepsake(storeId, id)
  // A reload starts the typed fields over from the server's copy: a new generation is a new editor.
  const [generation, setGeneration] = useState(0)

  if (query.isError) {
    if (query.error instanceof ApiProblem && (query.error.type === 'not-found' || query.error.status === 404))
      return <EmptyState action={{ label: t('keepsakes.back.toKeepsakes'), to: KEEPSAKES_PATH }} icon={GiftIcon} message={t('keepsakes.notFound')} />

    return <KeepsakeNotice error={query.error} onRetry={() => void query.refetch()} />
  }
  if (!query.data)
    return <EditorSkeleton />

  return (
    <Editor
      key={`${id}:${generation}`}
      keepsake={query.data}
      step={step}
      storeId={storeId}
      view={view}
      onOpen={onOpen}
      onReload={() => void query.refetch().then(() => setGeneration(g => g + 1))}
    />
  )
}

/** M12 for one keepsake: the stepped editor with autosave (`step`), and Review and publish (`view`). */
export function KeepsakeEditorScreen({ id, step, view, onOpen }: { id: string, step: KeepsakeStep, view: KeepsakeView, onOpen: (place: Place) => void }) {
  return (
    <KeepsakeGate fallback={<EditorSkeleton />}>
      {storeId => <LoadedEditor id={id} step={step} storeId={storeId} view={view} onOpen={onOpen} />}
    </KeepsakeGate>
  )
}

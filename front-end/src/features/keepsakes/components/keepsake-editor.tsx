import type { Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { OptionsStepHandle } from '../hooks/use-held-options'
import type { KeepsakeStep } from '../lib/search-params'

import { Button } from '@heroui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { lazy, Suspense, useRef, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { GiftIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useKeepsake } from '../api/queries'
import { useHeldOptions } from '../hooks/use-held-options'
import { useKeepsakeEditor } from '../hooks/use-keepsake-editor'
import { useOptionsDraft } from '../hooks/use-options-draft'
import { useRemoveKeepsake } from '../hooks/use-remove-keepsake'
import { missingNames } from '../lib/combinations'
import { nameIn, statusOf } from '../lib/keepsake-rules'
import { saveStatusOf } from '../lib/save-status'
import { isKeepsakeStep, KEEPSAKE_STEPS, KEEPSAKES_PATH } from '../lib/search-params'
import { firstBlockedStep, stepOfCard, stepStatuses } from '../lib/steps'
import { KeepsakeLanguageSwitch } from './basics-fields'
import { DetailsStep } from './details-step'
import { StepBodySkeleton, StepEditorSkeleton } from './editor-skeleton'
import { KeepsakeFrame } from './keepsake-frame'
import { KeepsakeGate } from './keepsake-gate'
import { KeepsakeNotice } from './keepsake-notice'
import { RefusalAlert } from './option-parts'
import { OptionsAndVariantsStep } from './options-variants-step'
import { useLeaveGuard } from './use-leave-guard'

// The phone mockup and the preview load when Review and publish opens, not with the first step.
const ReviewScreen = lazy(() => import('./review-screen'))

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

function Editor({ storeId, keepsake, step, onStep, onReload }: {
  storeId: string
  keepsake: Product
  step: KeepsakeStep
  onStep: (step: KeepsakeStep) => void
  onReload: () => void
}) {
  const { t, language, intlLocale } = useLocale()
  const navigate = useNavigate()
  const editor = useKeepsakeEditor({ storeId, keepsake })
  // Held here, not in the Options and variants step, so options that are typed but not saved stay when another step opens.
  const options = useOptionsDraft({ saved: keepsake.options, variants: keepsake.variants })
  const stepRef = useRef<OptionsStepHandle | null>(null)
  // Option changes stay in the browser while the merchant works (decision 23): one request sends them when the step or the editor is left.
  const held = useHeldOptions({
    keepsake,
    draft: options,
    handle: stepRef,
    saveOptions: editor.commitOptions,
    saveVariant: editor.saveVariant,
    saveVariants: editor.saveVariants,
    createVariant: editor.createVariant,
    setStock: editor.setStock,
    addPhoto: mediaId => editor.change(current => ({ photoIds: current.photoIds.includes(mediaId) ? current.photoIds : [...current.photoIds, mediaId] })),
  })
  const [showErrors, setShowErrors] = useState(false)
  // The version of the text that the whole editor shows, chosen once in the head.
  const [editLanguage, setEditLanguage] = useState<Language>('en')
  const queryClient = useQueryClient()
  const remove = useRemoveKeepsake(storeId, () => void navigate({ to: KEEPSAKES_PATH }))
  // Leaving by any route saves the held options first (an option still open is finished with Done); a refusal keeps the merchant here.
  // Edits that the autosave could not save (stale, failed) are lost on leaving, and the dialog says so.
  const lost = editor.state === 'stale' || editor.state === 'failed'
  const guard = useLeaveGuard({
    isUnsaved: editor.isUnsaved || held.hasHeld,
    copy: lost ? 'leave' : 'leaveSave',
    blockNavigation: true,
    onSave: () => held.save({ finishOpen: true }),
    onLeave: () => void navigate({ to: KEEPSAKES_PATH }),
  })
  const { draft } = editor
  const name = nameIn(draft.name, language) || t('keepsakes.untitled')
  const statuses = stepStatuses(keepsake, KEEPSAKE_STEPS, showErrors)
  const steps = KEEPSAKE_STEPS.map(id => ({ id, label: t(`keepsakes.step.${id}`), status: statuses[id] }))
  const index = KEEPSAKE_STEPS.indexOf(step)
  const status = statusOf(keepsake)
  const { blocking, warnings } = keepsake

  /** Opening Review and publish saves what is typed first, so the checks and the preview are of what is on screen. */
  const go = async (id: string) => {
    if (!isKeepsakeStep(id))
      return
    if (step === 'options' && id !== 'options' && !(await held.save()))
      return
    if (id === 'review' && !(await editor.flush()))
      return
    onStep(id)
    window.scrollTo?.({ top: 0 })
  }

  /** Delete asks about the saved keepsake: what is typed is saved first, so the dialog sends the version that save made. */
  const askRemove = async () => {
    if (!(await editor.flush()))
      return
    const current = queryClient.getQueryData<Product>([...queryKeys.keepsakes.detail, storeId, keepsake.id]) ?? keepsake

    remove.ask({ id: keepsake.id, name, rowVersion: current.rowVersion, hasOrders: current.hasOrders })
  }

  /** To the step that holds the block a check names. */
  const jumpTo = (check: PublishCheck) => {
    setShowErrors(true)
    onStep(stepOfCard(check.card))
    focusBlock(check.card)
  }

  const publish = async () => {
    const outcome = await editor.publish()

    // A blocked publish goes back to the step with the first thing to fix.
    if (!outcome.ok && outcome.type === 'publish-incomplete') {
      setShowErrors(true)
      onStep(firstBlockedStep(keepsake))
    }
  }

  const summary = blocking.length
    ? { status: t(blocking.length === 1 ? 'keepsakes.checks.blocking.one' : 'keepsakes.checks.blocking.other', { count: blocking.length }), tone: 'danger' as const }
    : warnings.length
      ? { status: t('keepsakes.bar.readyWithWarnings', { count: warnings.length }), tone: 'muted' as const }
      : { status: t('keepsakes.checks.ready'), tone: 'success' as const }
  // Options that are held count as unsaved changes: the bar says so until the step is left.
  const save = saveStatusOf(t, intlLocale, editor.state === 'saved' && held.hasHeld ? 'unsaved' : editor.state, editor.savedAt)
  const onReview = step === 'review'
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
          // On Review and publish the bar says what the checks say; an edit that is not saved still shows its own state.
          ...(onReview && editor.state === 'saved' ? summary : save),
          isSaving: false,
          onBack: index > 0 ? () => void go(KEEPSAKE_STEPS[index - 1]!) : undefined,
          onForward: index < KEEPSAKE_STEPS.length - 1 ? () => void go(KEEPSAKE_STEPS[index + 1]!) : undefined,
        }}
        canGo={() => true}
        current={step}
        languageSwitch={<KeepsakeLanguageSwitch missingOptionNames={{ en: missingNames(options.options, 'en'), de: missingNames(options.options, 'de') }} selected={editLanguage} value={draft} onChange={setEditLanguage} />}
        notices={notices}
        status={{ tone: status.tone, label: t(status.key) }}
        steps={steps}
        title={name}
        onBack={guard.leave}
        onRemove={() => void askRemove()}
        onGo={id => void go(id)}
      >
        {/* The Details step stays mounted, so a photo that is still uploading keeps its row when another step opens. */}
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6" hidden={step !== 'details'}>
          <DetailsStep
            commission={draft.commission}
            language={editLanguage}
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
        {step === 'options' && (
          <>
            <OptionsAndVariantsStep actions={held.actions} committed={held.committed} draft={options} handle={stepRef} held={false} keepsakeId={keepsake.id} language={editLanguage} photoIds={draft.photoIds} showErrors={showErrors} storeId={storeId} toCome={held.toCome} variants={held.variants} />
            {held.notice && <RefusalAlert>{held.notice}</RefusalAlert>}
          </>
        )}
        {onReview && (
          <Suspense fallback={<StepBodySkeleton />}>
            <ReviewScreen actions={{ unpublish: editor.unpublish, publish: () => void publish(), isPending: editor.isPublishing }} keepsake={keepsake} onFix={jumpTo} />
          </Suspense>
        )}
      </KeepsakeFrame>
      {guard.dialog}
      {remove.dialog}
    </>
  )
}

function LoadedEditor({ storeId, id, step, onStep }: { storeId: string, id: string, step: KeepsakeStep, onStep: (step: KeepsakeStep) => void }) {
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
    return <StepEditorSkeleton />
  // An archived keepsake is final: its orders keep working, nothing about it can be changed.
  if (query.data.status === 'archived')
    return <EmptyState action={{ label: t('keepsakes.back.toKeepsakes'), to: KEEPSAKES_PATH }} icon={GiftIcon} message={t('keepsakes.archived.notice')} />

  return (
    <Editor
      key={`${id}:${generation}`}
      keepsake={query.data}
      step={step}
      storeId={storeId}
      onReload={() => void query.refetch().then(() => setGeneration(g => g + 1))}
      onStep={onStep}
    />
  )
}

/** M12 for one keepsake: the stepped editor with autosave, the last step being Review and publish. */
export function KeepsakeEditorScreen({ id, step, onStep }: { id: string, step: KeepsakeStep, onStep: (step: KeepsakeStep) => void }) {
  return (
    <KeepsakeGate fallback={<StepEditorSkeleton />}>
      {storeId => <LoadedEditor id={id} step={step} storeId={storeId} onStep={onStep} />}
    </KeepsakeGate>
  )
}

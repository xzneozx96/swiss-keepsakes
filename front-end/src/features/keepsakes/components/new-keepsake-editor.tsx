import type { PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { DraftStep } from '../lib/draft-storage'
import type { KeepsakeText } from '../lib/keepsake-rules'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useEffect, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDataClient } from '@/features/data-client'
import { useCommand, useSubmit } from '@/features/data-client/use-command'
import { useMediaFile } from '@/features/media/api/queries'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { keepsakesQueries } from '../api/queries'
import { useDraftVariants } from '../hooks/use-draft-variants'
import { useOptionsDraft } from '../hooks/use-options-draft'
import { draftProduct, publishChecks } from '../lib/draft-product'
import { clearDraft, DRAFT_STEPS, readDraft, writeDraft } from '../lib/draft-storage'
import { LANGUAGES, nameIn, publishedText, suggestSkuCode } from '../lib/keepsake-rules'
import { asSaved, optionsBody, refusalText } from '../lib/option-rules'
import { keepsakeProblemKeys, problemMessageKey, problemTypeOf, refusalsOf } from '../lib/problems'
import { KEEPSAKE_STEPS, KEEPSAKES_PATH } from '../lib/search-params'
import { draftStatuses, stepOfCard } from '../lib/steps'
import { isComplete, variantsBody } from '../lib/variant-rules'
import { DetailsStep } from './details-step'
import { StepBodySkeleton, StepEditorSkeleton } from './editor-skeleton'
import { KeepsakeFrame } from './keepsake-frame'
import { KeepsakeGate } from './keepsake-gate'
import { RefusalAlert } from './option-parts'
import { OptionsStep } from './options-step'
import { useLeaveGuard } from './use-leave-guard'
import { VariantsStep } from './variants-step'

// The mockup and the preview load when Review and publish opens, as in the saved editor.
const ReviewScreen = lazy(() => import('./review-screen'))

const empty: KeepsakeText = { name: { en: '', de: '' }, text: { en: '', de: '' } }

function trimmedOf(text: Record<Language, string>) {
  return Object.fromEntries(LANGUAGES.filter(l => text[l].trim()).map(l => [l, text[l].trim()])) as Partial<Record<Language, string>>
}

/**
 * A new keepsake in the stepped editor. Details, Options, Variants and Review and publish all live in the browser, and a
 * reload of the page keeps them. Nothing is saved before step 4, where the API makes a keepsake in one request (it needs
 * at least one variant). "Save as draft" stops there; "Publish" publishes it next. Either way the saved keepsake's editor
 * opens on Review and publish.
 */
function NewKeepsakeEditor({ storeId }: { storeId: string }) {
  const { t, language } = useLocale()
  const navigate = useNavigate()
  const client = useDataClient()
  const queryClient = useQueryClient()
  const [stored] = useState(() => readDraft(storeId))
  // The create toast is for a draft: a publish says its own.
  const [publishing, setPublishing] = useState(false)
  // A refusal shows at the step or in `failure`, so the cache's error toast is off.
  const create = useSubmit('keepsakes', 'create', {
    meta: { success: created => (publishing ? '' : t(created.variants.length === 1 ? 'keepsakes.toast.created.one' : 'keepsakes.toast.created', { name: nameIn(created.name, language), count: created.variants.length })), silent: true },
  })
  const publish = useCommand('keepsakes', 'publish', { meta: { success: published => publishedText(t, published), error: keepsakeProblemKeys } })
  const draft = useOptionsDraft({ saved: [], variants: [], initial: stored?.options })
  const options = asSaved(draft.options)
  const held = useDraftVariants(options, stored?.variants ?? [])
  const [step, setStep] = useState<DraftStep>(stored?.step ?? 'details')
  const [reached, setReached] = useState(stored?.reached ?? 0)
  const [value, setValue] = useState(stored?.value ?? empty)
  const [photoIds, setPhotoIds] = useState<string[]>(stored?.photoIds ?? [])
  const [commission, setCommission] = useState(stored?.commission ?? 0)
  const [uploading, setUploading] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [tried, setTried] = useState(false)
  const [failure, setFailure] = useState<string>()
  const index = DRAFT_STEPS.indexOf(step)
  const last = index === DRAFT_STEPS.length - 1
  const hasName = LANGUAGES.some(l => value.name[l].trim() !== '')
  const { variants } = held
  const incomplete = variants.filter(variant => !isComplete(options, variant.values))
  const variantsReady = variants.length > 0 && incomplete.length === 0
  const touched = hasName || LANGUAGES.some(l => value.text[l].trim() !== '') || photoIds.length > 0 || commission > 0 || draft.options.length > 0 || variants.length > 0
  const name = trimmedOf(value.name)
  const body = { name, text: trimmedOf(value.text), photoIds, commissionRate: commission, options: optionsBody(draft.options), variants: variantsBody(variants) }
  const key = useIdempotencyKey({ storeId, ...body })
  const checks = publishChecks({ value, photoIds, commission, options, variants })
  const cover = useMediaFile(storeId, photoIds[0] ?? null).data
  const review = draftProduct({ storeId, value, photos: cover ? [cover] : [], commission, options, variants, checks })
  const guard = useLeaveGuard({
    isUnsaved: touched,
    titleKey: 'keepsakes.discard.title',
    bodyKey: 'keepsakes.discard.body',
    confirmKey: 'keepsakes.discard.confirm',
    cancelKey: 'keepsakes.discard.cancel',
    onLeave: () => {
      clearDraft(storeId)
      void navigate({ to: KEEPSAKES_PATH })
    },
  })
  const statuses = draftStatuses({ hasName, reached, variantsReady, nameTried: showErrors, variantsTried: tried })
  const steps = KEEPSAKE_STEPS.map(id => ({ id, label: t(`keepsakes.step.${id}`), status: statuses[id] }))

  // A reload brings the draft back. Written whenever it changes; storage that is blocked just keeps nothing.
  const serialized = JSON.stringify({ value, photoIds, commission, options: draft.options, variants, step, reached })

  useEffect(() => {
    if (touched)
      writeDraft(storeId, JSON.parse(serialized))
    else
      clearDraft(storeId)
  }, [serialized, storeId, touched])

  const open = (next: DraftStep) => {
    setStep(next)
    setReached(current => Math.max(current, DRAFT_STEPS.indexOf(next)))
    window.scrollTo?.({ top: 0 })
  }

  /** The step that has to be fixed before `to` can open: a name, options that follow the rules, a variant that is whole. */
  const blockedAt = (to: number): DraftStep | undefined => {
    if (!hasName) {
      setShowErrors(true)

      return 'details'
    }
    if (to >= 2 && draft.check().length > 0)
      return 'options'
    if (to >= 3 && !variantsReady) {
      setTried(true)

      return 'variants'
    }

    return undefined
  }

  const go = (next: DraftStep) => {
    const to = DRAFT_STEPS.indexOf(next)
    const blocked = to > index ? blockedAt(to) : undefined

    open(blocked ?? next)
  }

  /** One request makes the keepsake from the draft; Publish then publishes it. The saved editor opens on Review. */
  const submit = (andPublish: boolean) => {
    setFailure(undefined)
    const blocked = blockedAt(DRAFT_STEPS.length - 1)

    if (blocked) {
      open(blocked)

      return
    }
    if (uploading) {
      setFailure(t('keepsakes.create.photosWait'))

      return
    }
    setPublishing(andPublish)
    create.submit({ storeId, ...body, idempotencyKey: key.next() }, {
      onSuccess: (created) => {
        key.settled()
        const detail = keepsakesQueries.detail(client, storeId, created.id).queryKey

        queryClient.setQueryData(detail, created)
        clearDraft(storeId)
        const done = () => void navigate({ to: '/store/products/gifts/$productId', params: { productId: created.id }, search: { step: 'review' }, replace: true })

        if (!andPublish) {
          done()

          return
        }
        // A publish that is refused toasts why; the keepsake exists either way, so its editor opens.
        publish.mutateAsync({ storeId, id: created.id, ifMatch: created.rowVersion, idempotencyKey: crypto.randomUUID() })
          .then(published => queryClient.setQueryData(detail, published))
          .catch(() => undefined)
          .finally(done)
      },
      onError: (error) => {
        setPublishing(false)
        key.settled(error)
        if (problemTypeOf(error) === 'sku-code-taken')
          setFailure(t('keepsakes.problem.skuTaken'))
        else if (refusalsOf(error).length > 0)
          draft.setServerProblems(refusalsOf(error))
        else
          setFailure(t(problemMessageKey(problemTypeOf(error))))
      },
    })
  }

  const goStep = (id: string) => {
    if ((DRAFT_STEPS as readonly string[]).includes(id))
      go(id as DraftStep)
  }
  const fix = (check: PublishCheck) => open(stepOfCard(check.card) as DraftStep)
  const problems = draft.problems.length > 0 && <RefusalAlert>{draft.problems.map(problem => refusalText(t, problem)).join(' ')}</RefusalAlert>

  return (
    <>
      <KeepsakeFrame
        bar={{
          status: t('keepsakes.save.notSavedYet'),
          tone: 'muted',
          isSaving: create.isPending || publishing,
          onBack: index > 0 ? () => open(DRAFT_STEPS[index - 1]!) : undefined,
          secondary: last ? { label: t('keepsakes.review.saveDraft'), onPress: () => submit(false) } : undefined,
          primary: last
            ? { label: t('keepsakes.publish'), onPress: () => submit(true), isDisabled: checks.blocking.length > 0 }
            : { label: t('steps.next'), onPress: () => go(DRAFT_STEPS[index + 1]!) },
        }}
        canGo={id => (DRAFT_STEPS as readonly string[]).includes(id) && DRAFT_STEPS.indexOf(id as DraftStep) <= reached}
        current={step}
        notices={failure && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{failure}</p>}
        status={{ tone: 'neutral', label: t('keepsakes.status.draft') }}
        steps={steps}
        title={t('keepsakes.create.title')}
        onBack={guard.leave}
        onGo={goStep}
      >
        {/* The Details step stays mounted, so a photo that is still uploading keeps its row and its count when another step opens. */}
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6" hidden={step !== 'details'}>
          <DetailsStep
            nameOnly
            commission={commission}
            photoIds={photoIds}
            showErrors={showErrors}
            storeId={storeId}
            value={value}
            onAddPhoto={mediaId => setPhotoIds(current => (current.includes(mediaId) ? current : [...current, mediaId]))}
            onCommission={setCommission}
            onPhotos={setPhotoIds}
            onUploadingChange={setUploading}
            onValue={setValue}
          />
        </div>
        {step === 'options' && <OptionsStep draft={draft} />}
        {step === 'variants' && (
          <>
            <VariantsStep held codeFallback={suggestSkuCode(nameIn(name, language))} name={nameIn(name, language) || t('keepsakes.untitled')} options={options} variants={variants} onCreate={held.create} onSave={held.save} />
            {tried && variants.length === 0 && <RefusalAlert>{t('keepsakes.variants.addOne')}</RefusalAlert>}
            {tried && incomplete.length > 0 && <RefusalAlert>{t(incomplete.length === 1 ? 'keepsakes.variants.incomplete.one' : 'keepsakes.variants.incomplete.other', { count: incomplete.length })}</RefusalAlert>}
            {problems}
          </>
        )}
        {last && (
          <Suspense fallback={<StepBodySkeleton />}>
            <ReviewScreen actions={{ unpublish: async () => ({ ok: true }), isPending: false }} keepsake={review} onFix={fix} />
            {problems}
          </Suspense>
        )}
      </KeepsakeFrame>
      {guard.dialog}
    </>
  )
}

/** `/store/products/gifts/new`: a new keepsake in the stepped editor, held in the browser until Create keepsake. */
export function NewKeepsake() {
  return (
    <KeepsakeGate fallback={<StepEditorSkeleton />}>
      {storeId => <NewKeepsakeEditor storeId={storeId} />}
    </KeepsakeGate>
  )
}

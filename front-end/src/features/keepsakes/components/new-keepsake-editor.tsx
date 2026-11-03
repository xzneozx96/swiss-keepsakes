import type { PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { DraftStep } from '../lib/draft-storage'
import type { KeepsakeText } from '../lib/keepsake-rules'
import type { VariantActions } from '../lib/variant-actions'

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
import { basePriceOf, missingNames, refsOf } from '../lib/combinations'
import { descriptionsBody, isTooLong } from '../lib/description-doc'
import { draftProduct, publishChecks } from '../lib/draft-product'
import { clearDraft, DRAFT_STEPS, readDraft, writeDraft } from '../lib/draft-storage'
import { hasDescription, isSkuCode, LANGUAGES, nameIn, publishedText } from '../lib/keepsake-rules'
import { asSaved, optionsBody, refusalText } from '../lib/option-rules'
import { keepsakeProblemKeys, problemMessageKey, problemTypeOf, refusalsOf } from '../lib/problems'
import { KEEPSAKE_STEPS, KEEPSAKES_PATH } from '../lib/search-params'
import { draftStatuses, stepOfCard } from '../lib/steps'
import { codeProblem, isComplete, variantsBody } from '../lib/variant-rules'
import { KeepsakeLanguageSwitch } from './basics-fields'
import { DetailsStep } from './details-step'
import { StepBodySkeleton, StepEditorSkeleton } from './editor-skeleton'
import { KeepsakeFrame } from './keepsake-frame'
import { KeepsakeGate } from './keepsake-gate'
import { RefusalAlert } from './option-parts'
import { OptionsAndVariantsStep } from './options-variants-step'
import { useLeaveGuard } from './use-leave-guard'

// The mockup and the preview load when Review and publish opens, as in the saved editor.
const ReviewScreen = lazy(() => import('./review-screen'))

const empty: KeepsakeText = { name: { en: '', de: '' }, text: { en: undefined, de: undefined } }

function trimmedOf(text: Record<Language, string>) {
  return Object.fromEntries(LANGUAGES.filter(l => text[l].trim()).map(l => [l, text[l].trim()])) as Partial<Record<Language, string>>
}

/**
 * A new keepsake in the stepped editor. Details, Options and variants, and Review and publish all live in the browser, and a
 * reload of the page keeps them. Nothing is saved before step 3, where the API makes a keepsake in one request (it needs
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
  // The options that were finished with Done: the rows are named by them, and what the open option adds is told by them.
  const [committed, setCommitted] = useState<ReadonlySet<string>>(() => refsOf(stored?.options ?? []))
  const finished = draft.options.filter(option => committed.has(option.ref)).map(option => ({ ...option, values: option.values.filter(value => committed.has(value.ref)) }))
  const options = asSaved(finished)
  const held = useDraftVariants(finished, stored?.variants ?? [])
  // The language of the text the whole editor shows, chosen once in the head.
  const [editLanguage, setEditLanguage] = useState<Language>('en')
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
  // A code is optional: a variant is incomplete when its code, if it has one, is not valid or is used twice.
  const incomplete = variants.filter(variant => !isComplete(options, variant.values) || variant.priceRappen <= 0 || (variant.skuCode !== null && variant.skuCode !== '' && !isSkuCode(variant.skuCode)) || codeProblem(variant.skuCode, variants.filter(other => other.id !== variant.id)) !== undefined)
  const unfinished = draft.options.some(option => !committed.has(option.ref))
  const variantsReady = variants.length > 0 && incomplete.length === 0 && !unfinished
  const touched = hasName || LANGUAGES.some(l => hasDescription(value.text[l])) || photoIds.length > 0 || commission > 0 || draft.options.length > 0 || variants.some(variant => variant.priceRappen > 0 || variant.skuCode || variant.mediaId)
  const name = trimmedOf(value.name)
  const body = { name, text: descriptionsBody(value.text), photoIds, commissionRate: commission, options: optionsBody(draft.options), variants: variantsBody(variants) }
  const key = useIdempotencyKey({ storeId, ...body })
  const checks = publishChecks({ value, photoIds, commission, options, variants })
  const cover = useMediaFile(storeId, photoIds[0] ?? null).data
  const review = draftProduct({ storeId, value, photos: cover ? [cover] : [], commission, options, variants, checks })
  const guard = useLeaveGuard({
    isUnsaved: touched,
    copy: 'discard',
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
    // A description over 1200 characters is refused by the API, so the flow stops at Details, where the counter says so.
    if (!hasName || isTooLong(value.text)) {
      setShowErrors(true)

      return 'details'
    }
    if (to >= 2 && !variantsReady) {
      setTried(true)

      return 'options'
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
  const actions: VariantActions = {
    saveVariant: held.save,
    saveVariants: held.saveMany,
    createVariant: held.create,
    setStock: (variant, onHand) => held.setStock(variant.id, onHand),
    // Done: the variants take the option's values and the new combinations are made, in the browser.
    commit: async ({ drafts, plan }) => {
      const outcome = await held.apply(drafts, plan)

      setCommitted(refsOf(drafts))

      return outcome
    },
    addBack: (combinations, codeBase) => held.addBack(combinations, basePriceOf(variants), codeBase),
    addPhoto: mediaId => setPhotoIds(current => (current.includes(mediaId) ? current : [...current, mediaId])),
  }
  const problems = draft.problems.length > 0 && <RefusalAlert>{draft.problems.map(problem => refusalText(t, problem)).join(' ')}</RefusalAlert>

  return (
    <>
      <KeepsakeFrame
        bar={{
          status: t('keepsakes.save.notSavedYet'),
          tone: 'muted',
          isSaving: create.isPending || publishing,
          onBack: index > 0 ? () => open(DRAFT_STEPS[index - 1]!) : undefined,
          // On the last step Publish and Save as draft sit in the publish card.
          primary: last ? undefined : { label: t('steps.next'), onPress: () => go(DRAFT_STEPS[index + 1]!) },
        }}
        canGo={id => (DRAFT_STEPS as readonly string[]).includes(id) && DRAFT_STEPS.indexOf(id as DraftStep) <= reached}
        current={step}
        languageSwitch={<KeepsakeLanguageSwitch missingOptionNames={{ en: missingNames(draft.options, 'en'), de: missingNames(draft.options, 'de') }} selected={editLanguage} value={value} onChange={setEditLanguage} />}
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
            language={editLanguage}
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
        {step === 'options' && (
          <>
            <OptionsAndVariantsStep actions={actions} committed={committed} draft={draft} held language={editLanguage} photoIds={photoIds} showErrors={tried} storeId={storeId} variants={variants} />
            {tried && unfinished && <RefusalAlert>{t('keepsakes.variants.finishOption')}</RefusalAlert>}
            {tried && !unfinished && incomplete.length > 0 && <RefusalAlert>{t(incomplete.length === 1 ? 'keepsakes.variants.incomplete.one' : 'keepsakes.variants.incomplete.other', { count: incomplete.length })}</RefusalAlert>}
            {problems}
          </>
        )}
        {last && (
          <Suspense fallback={<StepBodySkeleton />}>
            <ReviewScreen actions={{ unpublish: async () => ({ ok: true }), publish: () => submit(true), saveDraft: () => submit(false), isPending: false, isBusy: create.isPending || publishing }} keepsake={review} onFix={fix} />
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

import type { Language } from '@sk/domain/shared'
import type { KeepsakeText } from '../lib/keepsake-rules'
import type { CreateRow, OptionDraft } from '../lib/option-rules'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Block } from '@/components/form-block'
import { useLocale } from '@/contexts/locale-context'
import { useDataClient } from '@/features/data-client'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { keepsakesQueries } from '../api/queries'
import { useOptionsDraft } from '../hooks/use-options-draft'
import { LANGUAGES, nameIn, suggestSkuCode } from '../lib/keepsake-rules'
import { createErrors, createRows, optionsBody, variantsOfRows } from '../lib/option-rules'
import { problemMessageKey, problemTypeOf, refusalsOf } from '../lib/problems'
import { KEEPSAKE_STEPS, KEEPSAKES_PATH } from '../lib/search-params'
import { draftStatuses } from '../lib/steps'
import { CreateVariantsStep } from './create-variants-step'
import { DetailsStep } from './details-step'
import { StepEditorSkeleton } from './editor-skeleton'
import { KeepsakeFrame } from './keepsake-frame'
import { KeepsakeGate } from './keepsake-gate'
import { OptionsEditor, OptionsProblems } from './option-blocks'
import { useLeaveGuard } from './use-leave-guard'

/** The steps a new keepsake goes through in the browser. Review and publish follows once the keepsake exists. */
const DRAFT_STEPS = ['details', 'options', 'variants'] as const

type DraftStep = (typeof DRAFT_STEPS)[number]

const empty: KeepsakeText = { name: { en: '', de: '' }, text: { en: '', de: '' } }

function trimmedOf(text: Record<Language, string>) {
  return Object.fromEntries(LANGUAGES.filter(l => text[l].trim()).map(l => [l, text[l].trim()])) as Partial<Record<Language, string>>
}

/**
 * A new keepsake in the stepped editor. Details, Options and Variants live in the browser; nothing is saved before the
 * last step, because the API makes a keepsake only with at least one variant. "Create keepsake" on Variants sends all of
 * it in one request, then the saved keepsake's editor opens on Review and publish.
 */
function NewKeepsakeEditor({ storeId }: { storeId: string }) {
  const { t, language } = useLocale()
  const navigate = useNavigate()
  const client = useDataClient()
  const queryClient = useQueryClient()
  // A refusal shows at the step or in `failure`, so the cache's error toast is off.
  const create = useSubmit('keepsakes', 'create', {
    meta: { success: created => t(created.variants.length === 1 ? 'keepsakes.toast.created.one' : 'keepsakes.toast.created', { name: nameIn(created.name, language), count: created.variants.length }), silent: true },
  })
  const draft = useOptionsDraft({ saved: [], variants: [] })
  const [step, setStep] = useState<DraftStep>('details')
  const [reached, setReached] = useState(0)
  const [value, setValue] = useState(empty)
  const [photoIds, setPhotoIds] = useState<string[]>([])
  const [commission, setCommission] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [rows, setRows] = useState<CreateRow[]>([])
  const [showErrors, setShowErrors] = useState(false)
  const [tried, setTried] = useState(false)
  const [failure, setFailure] = useState<string>()
  const index = DRAFT_STEPS.indexOf(step)
  const last = index === DRAFT_STEPS.length - 1
  const hasName = LANGUAGES.some(l => value.name[l].trim() !== '')
  const touched = hasName || LANGUAGES.some(l => value.text[l].trim() !== '') || photoIds.length > 0 || commission > 0 || draft.options.length > 0
  const name = trimmedOf(value.name)
  const body = { name, text: trimmedOf(value.text), photoIds, commissionRate: commission, options: optionsBody(draft.options), variants: variantsOfRows(rows) }
  const key = useIdempotencyKey({ storeId, ...body })
  const found = createErrors(rows)
  const guard = useLeaveGuard({
    isUnsaved: touched,
    titleKey: 'keepsakes.discard.title',
    bodyKey: 'keepsakes.discard.body',
    confirmKey: 'keepsakes.discard.confirm',
    cancelKey: 'keepsakes.discard.cancel',
    onLeave: () => void navigate({ to: KEEPSAKES_PATH }),
  })
  const statuses = draftStatuses({ hasName, reached, variantsReady: !found.none && Object.keys(found.rows).length === 0, nameTried: showErrors, variantsTried: tried })
  const steps = KEEPSAKE_STEPS.map(id => ({ id, label: t(`keepsakes.step.${id}`), status: statuses[id] }))

  const open = (next: DraftStep) => {
    setStep(next)
    setReached(current => Math.max(current, DRAFT_STEPS.indexOf(next)))
    window.scrollTo?.({ top: 0 })
  }

  /** A step that is further on needs what the steps before it need: a name, and options that follow the rules. */
  const go = (next: DraftStep) => {
    const to = DRAFT_STEPS.indexOf(next)

    if (to > index) {
      if (!hasName) {
        setShowErrors(true)
        open('details')

        return
      }
      if (to >= 2) {
        if (draft.check().length > 0) {
          open('options')

          return
        }
        setRows(current => createRows(draft.options, current))
      }
    }
    open(next)
  }

  const submit = () => {
    setTried(true)
    setFailure(undefined)
    if (!hasName) {
      setShowErrors(true)
      open('details')

      return
    }
    if (uploading) {
      setFailure(t('keepsakes.create.photosWait'))

      return
    }
    if (found.none || Object.keys(found.rows).length > 0)
      return
    create.submit({ storeId, ...body, idempotencyKey: key.next() }, {
      onSuccess: (created) => {
        key.settled()
        queryClient.setQueryData(keepsakesQueries.detail(client, storeId, created.id).queryKey, created)
        void navigate({ to: '/store/products/gifts/$productId', params: { productId: created.id }, search: { step: 'review' }, replace: true })
      },
      onError: (error) => {
        key.settled(error)
        if (problemTypeOf(error) === 'sku-code-taken')
          setFailure(t('keepsakes.problem.skuTaken'))
        else if (refusalsOf(error).length > 0)
          draft.setProblems(refusalsOf(error))
        else
          setFailure(t(problemMessageKey(problemTypeOf(error))))
      },
    })
  }

  const next = () => (last ? submit() : go(DRAFT_STEPS[index + 1]!))
  const goStep = (id: string) => {
    if ((DRAFT_STEPS as readonly string[]).includes(id))
      go(id as DraftStep)
  }

  return (
    <>
      <KeepsakeFrame
        bar={{
          status: t('keepsakes.save.notSavedYet'),
          tone: 'muted',
          isSaving: create.isPending,
          onBack: index > 0 ? () => open(DRAFT_STEPS[index - 1]!) : undefined,
          primary: { label: last ? t('keepsakes.create.submit') : t('steps.next'), onPress: next },
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
        {step === 'options' && (
          <Block id="options" title={t('keepsakes.create.options.title')}>
            <p className="text-sm text-pretty text-muted">{t('keepsakes.create.options.hint')}</p>
            <OptionsProblems problems={draft.problems} />
            <OptionsEditor draft={draft} />
          </Block>
        )}
        {step === 'variants' && (
          <>
            <CreateVariantsStep errors={found.rows} options={draft.options as OptionDraft[]} rows={rows} suggestion={suggestSkuCode(nameIn(name, language))} tried={tried} onChange={setRows} />
            {draft.problems.length > 0 && <OptionsProblems problems={draft.problems} />}
          </>
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

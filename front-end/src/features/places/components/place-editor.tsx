import type { Pin } from '@sk/api-contract'
import type { StepId } from '../hooks/use-place-editor'

import type { StartStep } from '../lib/search-params'

import { Link } from '@tanstack/react-router'
import { BackIcon } from '@/components/icons'
import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
import { useLocale } from '@/contexts/locale-context'
import { StepBar, StepLayout } from '@/features/merchant/products/components/step-shell'
import { usePlaceEditor } from '../hooks/use-place-editor'
import { PLACES_PATH } from '../lib/search-params'
import { StepContent } from './step-content'
import { StepLinks } from './step-links'
import { StepPlace } from './step-place'
import { StepReview } from './step-review'
import { StepTags } from './step-tags'

import { StepWhen } from './step-when'

const DOT: Record<string, string> = { new: 'bg-muted', draft: 'bg-muted', published: 'bg-success', hidden: 'bg-warning' }

/** The status as a dot and words, never colour alone. */
function StatusLine({ status }: { status: 'new' | 'draft' | 'published' | 'hidden' }) {
  const { t } = useLocale()
  const key = status === 'new' ? 'places.publish.draft' : (`places.status.${status}` as const)

  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" data-testid="places-status">
      <span aria-hidden className={`size-2 rounded-full ${DOT[status]}`} />
      {t(key)}
    </span>
  )
}

/**
 * N17, the place editor in six steps (option S): the tour editor's stepper, a bar with Back, Next and the one red
 * action, and a review that lists what a publish needs. A new pin is created by its first save.
 */
export function PlaceEditor({ storeId, initial, start }: { storeId: string, initial: Pin | undefined, start: StartStep | undefined }) {
  const { t } = useLocale()
  const editor = usePlaceEditor({ storeId, initial, start })
  const title = editor.form.titleEn || editor.form.titleDe || t(start === 'dates' && !initial ? 'places.newEvent' : 'places.newPlace')
  const props = { form: editor.form, patch: editor.patch, errors: editor.errors, storeId, pin: editor.pin, slugTaken: editor.slugTaken, go: editor.go }
  const body: Record<StepId, React.ReactNode> = {
    place: <StepPlace {...props} />,
    content: <StepContent {...props} />,
    when: <StepWhen {...props} />,
    tags: <StepTags {...props} />,
    links: <StepLinks {...props} />,
    review: <StepReview {...props} actions={editor.actions} steps={editor.steps} />,
  }

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="place-editor">
      <MerchantBackBar label={t('places.back')} title={title} to={PLACES_PATH as never} />
      <header className="flex flex-col gap-2">
        <Link className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex" to={PLACES_PATH as never}>
          <BackIcon aria-hidden size={16} />
          {t('places.back')}
        </Link>
        <h1 className="text-title text-pretty [overflow-wrap:anywhere] max-lg:sr-only">{title}</h1>
        <StatusLine status={editor.pin?.status ?? 'new'} />
      </header>
      {editor.notice && <p className="rounded-2xl bg-danger-soft p-4 text-sm text-danger-soft-foreground" role="alert">{t(editor.notice)}</p>}
      <StepLayout canGo={editor.canGo} current={editor.step} quietTitle steps={editor.steps} onGo={editor.go}>
        {body[editor.step]}
        <StepBar {...editor.bar} />
      </StepLayout>
      {editor.dialog}
    </div>
  )
}

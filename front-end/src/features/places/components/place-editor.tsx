import type { Pin } from '@sk/api-contract'
import type { StepId } from '../hooks/use-place-editor'

import type { StartStep } from '../lib/search-params'

import { buttonVariants } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { BackIcon } from '@/components/icons'
import { MerchantBackBar } from '@/components/layout/merchant-back-bar'
import { Notice } from '@/components/notice'
import { StatusChip } from '@/components/status-chip'
import { StepBar } from '@/components/step-bar'
import { StepLayout } from '@/components/step-layout'
import { useLocale } from '@/contexts/locale-context'
import { usePlaceEditor } from '../hooks/use-place-editor'
import { STATUS_TONE } from '../lib/list'
import { PLACES_PATH } from '../lib/search-params'
import { StepContent } from './step-content'
import { StepLinks } from './step-links'
import { StepPlace } from './step-place'
import { StepReview } from './step-review'
import { StepTags } from './step-tags'

import { StepWhen } from './step-when'

/** The status in its colour and words, the same chip as the list. */
function StatusLine({ status, inBar }: { status: 'new' | 'draft' | 'published' | 'hidden', inBar?: boolean }) {
  const { t } = useLocale()
  const key = status === 'new' ? 'places.publish.draft' : (`places.status.${status}` as const)

  return (
    <span className={inBar ? 'shrink-0' : 'shrink-0 max-lg:hidden'} data-testid={inBar ? undefined : 'places-status'}>
      <StatusChip tone={STATUS_TONE[status === 'new' ? 'draft' : status]}>{t(key)}</StatusChip>
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
  const props = { form: editor.form, patch: editor.patch, errors: editor.errors, storeId, pin: editor.pin, go: editor.go }
  const body: Record<StepId, React.ReactNode> = {
    place: <StepPlace {...props} />,
    content: <StepContent {...props} />,
    when: <StepWhen {...props} />,
    tags: <StepTags {...props} />,
    links: <StepLinks {...props} />,
    review: <StepReview {...props} actions={editor.actions} />,
  }

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="place-editor">
      <MerchantBackBar label={t('places.back')} status={<StatusLine inBar status={editor.pin?.status ?? 'new'} />} title={title} to={PLACES_PATH as never} />
      {/* On phones the ← bar shows the title and the status; the header stays for screen readers only. */}
      <header className="flex min-w-0 items-center gap-3 max-lg:sr-only">
        <Link aria-label={t('places.back')} className={`${buttonVariants({ variant: 'tertiary', isIconOnly: true })} -ms-2 hidden shrink-0 lg:inline-flex`} to={PLACES_PATH as never}>
          <BackIcon aria-hidden size={20} />
        </Link>
        <h1 className="min-w-0 text-title text-pretty [overflow-wrap:anywhere] max-lg:sr-only">{title}</h1>
        <StatusLine status={editor.pin?.status ?? 'new'} />
      </header>
      {editor.notice && <Notice status="danger">{t(editor.notice)}</Notice>}
      <StepLayout canGo={editor.canGo} current={editor.step} quietTitle steps={editor.steps} onGo={editor.go}>
        {body[editor.step]}
        <StepBar {...editor.bar} />
      </StepLayout>
      {editor.dialog}
    </div>
  )
}

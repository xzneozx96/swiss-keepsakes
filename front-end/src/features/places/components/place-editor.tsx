import type { Pin } from '@sk/api-contract'
import type { StepId } from '../hooks/use-place-editor'

import type { StartStep } from '../lib/search-params'

import { useNavigate } from '@tanstack/react-router'
import { TrashIcon } from '@/components/icons'
import { EditorHeader } from '@/components/layout/editor-header'
import { Notice } from '@/components/notice'
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

/**
 * N17, the place editor in six steps (option S): the shared editor header with Back, the name over "status · save
 * state", the step arrows, the one red action (Next or Publish for a draft, Save changes for a live pin) and Delete,
 * then the stepper. A new pin is created by its first save.
 */
export function PlaceEditor({ storeId, initial, start }: { storeId: string, initial: Pin | undefined, start: StartStep | undefined }) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const editor = usePlaceEditor({ storeId, initial, start })
  const title = editor.form.titleEn || editor.form.titleDe || t(start === 'dates' && !initial ? 'places.newEvent' : 'places.newPlace')
  const status = editor.pin?.status ?? 'new'
  const props = { form: editor.form, patch: editor.patch, errors: editor.errors, storeId, pin: editor.pin, go: editor.go }
  const body: Record<StepId, React.ReactNode> = {
    place: <StepPlace {...props} />,
    content: <StepContent {...props} />,
    when: <StepWhen {...props} />,
    tags: <StepTags {...props} />,
    links: <StepLinks {...props} />,
    review: <StepReview {...props} actions={editor.actions} />,
  }
  const tone = STATUS_TONE[status === 'new' ? 'draft' : status]

  return (
    <div className="flex min-w-0 flex-col gap-5" data-testid="place-editor">
      <EditorHeader
        actions={editor.pin ? [{ id: 'delete', label: t('places.action.deletePlace'), icon: TrashIcon, isDanger: true, isDisabled: editor.busy }] : []}
        backLabel={t('places.back')}
        status={{ tone: tone === 'info' ? 'neutral' : tone, label: t(status === 'new' ? 'places.publish.draft' : `places.status.${status}`) }}
        title={title}
        onAction={editor.actions.remove}
        onBack={() => void navigate({ to: PLACES_PATH as never })}
        {...editor.header}
      />
      {editor.notice && <Notice status="danger">{t(editor.notice)}</Notice>}
      <StepLayout canGo={editor.canGo} current={editor.step} quietTitle steps={editor.steps} underHeader={editor.header.steps ?? {}} onGo={editor.go}>
        {body[editor.step]}
      </StepLayout>
      {editor.dialog}
    </div>
  )
}

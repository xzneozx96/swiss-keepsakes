import type { Pin } from '@sk/api-contract'
import type { StepStatus } from '@sk/domain/catalog'
import type { FormErrors, PlaceForm } from '../lib/form'
import type { StartStep } from '../lib/search-params'
import type { EditorHeaderProps } from '@/components/layout/editor-header'
import type { MessageKey } from '@/i18n/en'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { useLocale } from '@/contexts/locale-context'
import { queryKeys } from '@/features/data-client'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '@/features/stores/hooks/use-idempotency-key'
import { bodyOf, emptyForm, formOf, isDirty, publishGaps, validate } from '../lib/form'
import { problemMessageKey } from '../lib/problems'
import { PLACES_PATH } from '../lib/search-params'
import { askDeletePin } from './ask-delete-pin'

export const STEP_IDS = ['place', 'content', 'when', 'tags', 'links', 'review'] as const
export type StepId = typeof STEP_IDS[number]

function statusOf(id: StepId, form: PlaceForm, errors: FormErrors, refused: boolean): StepStatus {
  const filled: Record<StepId, boolean> = {
    place: form.latitude !== null,
    content: form.titleEn.trim() !== '' || form.titleDe.trim() !== '',
    when: form.hours.length + form.dates.length > 0,
    tags: form.categoryIds.length + form.interests.length > 0 || form.mustVisit,
    links: form.mainStoryGroupId !== null || form.outboundUrl.trim() !== '',
    review: publishGaps(form).length === 0,
  }
  const failing: Record<StepId, boolean> = {
    place: false,
    content: false,
    when: Object.keys(errors.hours).length + Object.keys(errors.dates).length > 0,
    tags: false,
    links: errors.link !== undefined,
    review: refused,
  }

  return failing[id] ? 'error' : filled[id] ? 'done' : 'todo'
}

/**
 * The state of the place editor: the form, the step, and every write. One hook so a save that is followed by a
 * publish keeps its callbacks (the screen stays mounted until the chain ends). A pin the API returns replaces the
 * form, so the form always matches what was stored. A new pin is created by its first save and the editor then
 * moves to its own address.
 */
export function usePlaceEditor({ storeId, initial, start }: { storeId: string, initial: Pin | undefined, start: StartStep | undefined }) {
  const locale = useLocale()
  const { t } = locale
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // The editor shows every refusal itself (`notice`), so each write is `silent`. What a save says depends on the tap
  // that sent it (`saveToastRef`, written only once `submit` took the tap), and a save that a publish follows says nothing.
  const saveToastRef = useRef<MessageKey | undefined>(undefined)
  const hiddenNameRef = useRef('')
  const saveMeta = {
    success: (saved: Pin) => saveToastRef.current && !(saved.status === 'published' && saved.draft) ? t(saveToastRef.current) : '',
    silent: true,
  }
  const create = useSubmit('places', 'create', { meta: saveMeta })
  const save = useSubmit('places', 'save', { meta: saveMeta })
  const publish = useSubmit('places', 'publish', { meta: { success: 'places.toast.published', silent: true } })
  const hide = useSubmit('places', 'hide', { meta: { success: () => t('places.toast.hidden', { name: hiddenNameRef.current }), silent: true } })
  const remove = useSubmit('places', 'remove', { meta: { success: 'places.toast.deleted', silent: true } })
  const { confirm, dialog } = useConfirm()
  const [pin, setPin] = useState(initial)
  const [form, setForm] = useState(() => (initial ? formOf(initial) : emptyForm(start === 'dates')))
  const [baseline, setBaseline] = useState(form)
  const [step, setStep] = useState<StepId>(!initial && start === 'dates' ? 'when' : 'place')
  const [reached, setReached] = useState(STEP_IDS.indexOf(step))
  const [notice, setNotice] = useState<MessageKey>()
  const [refused, setRefused] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const errors = validate(form)
  const dirty = isDirty(form, baseline)
  const body = bodyOf(form)
  const saveKey = useIdempotencyKey({ id: pin?.id, version: pin?.rowVersion, body })
  const publishKey = useIdempotencyKey({ id: pin?.id, version: pin?.rowVersion, publish: true })
  const busy = [create, save, publish, hide, remove].some(action => action.isPending)

  const go = (next: string) => {
    const index = STEP_IDS.indexOf(next as StepId)

    if (index < 0)
      return
    setStep(STEP_IDS[index]!)
    setReached(current => Math.max(current, index))
    window.scrollTo?.({ top: 0 })
  }

  const adopt = (saved: Pin) => {
    const next = formOf(saved)

    setPin(saved)
    setForm(next)
    setBaseline(next)
    setJustSaved(true)
    queryClient.setQueryData([...queryKeys.places.pin, storeId, saved.id], saved)
  }

  // A refusal of hide or delete shows in the dialog that asked, not in the page's banner.
  const problemText = (error: unknown) => t(problemMessageKey(error instanceof ApiProblem ? error.type : 'unknown'))

  const failed = (error: Error) => {
    const type = error instanceof ApiProblem ? error.type : 'unknown'

    setNotice(problemMessageKey(type))
    setRefused(type === 'publish-incomplete')
  }

  // A new pin has its own address from its first save on; the editor moves there once the whole chain ended.
  const finish = (saved: Pin) => {
    if (!initial)
      void navigate({ to: `${PLACES_PATH}/${saved.id}` as never, replace: true })
  }

  const clear = () => {
    setNotice(undefined)
    setRefused(false)
  }

  /** Saves the form (a create for a new pin), then runs `after` with the stored pin. */
  const saveThen = (after: (saved: Pin) => void, toastKey?: MessageKey) => {
    if (busy)
      return
    clear()
    if (errors.count > 0) {
      const firstBad = STEP_IDS.find(id => statusOf(id, form, errors, false) === 'error')

      if (firstBad)
        go(firstBad)

      return
    }
    const callbacks = {
      onSuccess: (saved: Pin) => {
        saveKey.settled()
        adopt(saved)
        after(saved)
      },
      onError: (error: Error) => {
        saveKey.settled(error)
        failed(error)
      },
    }

    const sent = pin
      ? save.submit({ storeId, id: pin.id, ifMatch: pin.rowVersion, ...body, idempotencyKey: saveKey.next() }, callbacks)
      : create.submit({ storeId, ...body, idempotencyKey: saveKey.next() }, callbacks)

    if (sent)
      saveToastRef.current = toastKey
  }

  const publishNow = (stored: Pin) => {
    publish.submit({ storeId, id: stored.id, ifMatch: stored.rowVersion, idempotencyKey: publishKey.next() }, {
      onSuccess: (published) => {
        publishKey.settled()
        adopt(published)
        finish(published)
      },
      onError: (error) => {
        publishKey.settled(error)
        failed(error)
        // The save before it went through, so the new pin is not lost.
        finish(stored)
      },
    })
  }

  const saveDraft = () => saveThen(finish, initial ? 'places.toast.saved' : 'places.toast.draftSaved')

  const doPublish = () => {
    if (publishGaps(form).length > 0) {
      setRefused(true)
      go('review')

      return
    }
    saveThen(saved => publishNow(saved))
  }

  // A live pin sends its text changes to guests with the save; a hidden one keeps them for "Show on map again".
  const saveChanges = () => {
    saveThen((saved) => {
      if (saved.status === 'published' && saved.draft)
        publishNow(saved)
    }, 'places.toast.saved')
  }

  const unhide = () => {
    if (!pin || busy)
      return
    if (dirty) {
      saveThen(saved => publishNow(saved))
    }
    else {
      clear()
      publishNow(pin)
    }
  }

  const askHide = () => {
    if (!pin || busy || dirty)
      return
    const name = form.titleEn || form.titleDe || t('places.row.untitled')

    clear()
    void confirm({
      title: t('places.hide.title', { name }),
      body: t('places.hide.body'),
      confirmLabel: t('places.hide.confirm'),
      problem: problemText,
      run: () => {
        hiddenNameRef.current = name

        return hide.submitAsync({ storeId, id: pin.id, ifMatch: pin.rowVersion, idempotencyKey: crypto.randomUUID() }).then(adopt)
      },
    })
  }

  const askRemove = () => {
    if (!pin || busy)
      return
    const name = form.titleEn || form.titleDe || t('places.row.untitled')

    clear()
    hiddenNameRef.current = name
    void askDeletePin({
      locale,
      confirm,
      name,
      canHide: pin.status !== 'hidden',
      remove: () => remove.submitAsync({ storeId, id: pin.id, ifMatch: pin.rowVersion, idempotencyKey: crypto.randomUUID() }).then(() => void navigate({ to: PLACES_PATH as never })),
      hide: () => hide.submitAsync({ storeId, id: pin.id, ifMatch: pin.rowVersion, idempotencyKey: crypto.randomUUID() }).then(adopt),
    })
  }

  const labels: Record<StepId, MessageKey> = {
    place: 'places.step.place',
    content: 'places.step.content',
    when: 'places.step.when',
    tags: 'places.step.tags',
    links: 'places.step.links',
    review: 'places.step.review',
  }
  const steps = STEP_IDS.map(id => ({ id, label: t(labels[id]), status: statusOf(id, form, errors, refused) }))
  const index = STEP_IDS.indexOf(step)
  const isReview = step === 'review'
  const status = errors.count > 0
    ? { status: t(errors.count === 1 ? 'places.bar.errors.one' : 'places.bar.errors.other', { count: errors.count }), tone: 'danger' as const }
    : refused
      ? { status: t('places.bar.refused'), tone: 'danger' as const }
      : justSaved && !dirty
        ? { status: t('places.bar.saved'), tone: 'success' as const }
        : { status: t(!pin ? 'places.bar.notSaved' : dirty ? 'places.bar.unsaved' : 'places.bar.noChanges'), tone: 'muted' as const }
  const back = index === 0 ? undefined : () => go(STEP_IDS[index - 1]!)
  const next = () => go(STEP_IDS[Math.min(index + 1, STEP_IDS.length - 1)]!)
  // What the shared editor header says and offers: a draft saves as a draft and moves on with Next; a live pin saves its
  // changes, and Save changes is off while nothing changed.
  const header: Pick<EditorHeaderProps, 'save' | 'steps' | 'secondary' | 'primary'> = !pin || pin.status === 'draft'
    ? {
        save: { text: status.status, tone: status.tone },
        // Next is the red action here, so only the arrow back shows.
        steps: { onPrevious: back },
        secondary: { label: t('places.action.saveDraft'), onPress: saveDraft, isDisabled: busy },
        primary: isReview ? { label: t('places.action.publish'), onPress: doPublish, isDisabled: busy } : { label: t('places.action.next'), onPress: next },
      }
    : {
        save: { text: status.status, tone: status.tone },
        steps: { onPrevious: back, onNext: isReview ? undefined : next },
        primary: { label: t('places.action.save'), onPress: saveChanges, isDisabled: busy || !dirty },
      }

  return {
    pin,
    form,
    patch: (changes: Partial<PlaceForm> | ((current: PlaceForm) => Partial<PlaceForm>)) => {
      setForm(current => ({ ...current, ...(typeof changes === 'function' ? changes(current) : changes) }))
      setJustSaved(false)
    },
    errors,
    dirty,
    step,
    steps,
    go,
    canGo: (id: string) => pin !== undefined || STEP_IDS.indexOf(id as StepId) <= reached,
    header,
    notice,
    busy,
    dialog,
    actions: { hide: askHide, unhide, remove: askRemove, busy, dirty },
  }
}

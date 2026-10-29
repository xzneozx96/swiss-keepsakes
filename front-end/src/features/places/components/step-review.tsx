import type { StepProps } from './step-props'
import type { StepView } from '@/features/merchant/products/components/step-shell'
import type { MessageKey } from '@/i18n/en'

import { Button } from '@heroui/react'

import { StatusDangerIcon, StatusSuccessIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ReviewRow, ReviewSection } from '@/features/merchant/products/components/step-shell'
import { publishGaps } from '../lib/form'

export interface ReviewActions {
  hide: () => void
  unhide: () => void
  remove: () => void
  busy: boolean
  /** The form has edits that are not saved. */
  dirty: boolean
}

const GAP_KEY: Record<'title' | 'location' | 'slug', MessageKey> = {
  title: 'places.checklist.title.item',
  location: 'places.checklist.location.item',
  slug: 'places.checklist.slug.item',
}

function Checklist({ form }: Pick<StepProps, 'form'>) {
  const { t } = useLocale()
  const gaps = publishGaps(form)

  return (
    <section aria-labelledby="places-needed" className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <h3 className="font-semibold" id="places-needed">{t('places.checklist.title')}</h3>
      <ul className="flex flex-col gap-2 text-sm">
        {(['title', 'location', 'slug'] as const).map((gap) => {
          const missing = gaps.includes(gap)
          const Icon = missing ? StatusDangerIcon : StatusSuccessIcon

          return (
            <li key={gap} className={`flex items-center gap-2 ${missing ? 'text-danger' : 'text-success'}`}>
              <Icon aria-hidden className="shrink-0" size={16} />
              <span className="text-foreground">{t(GAP_KEY[gap])}</span>
              <span className="ms-auto">{t(missing ? 'places.checklist.missing' : 'places.checklist.done')}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-muted">{t(gaps.length > 0 ? 'places.checklist.blocked' : 'places.checklist.optional')}</p>
    </section>
  )
}

function StatusPanel({ pin, actions }: Pick<StepProps, 'pin'> & { actions: ReviewActions }) {
  const { t } = useLocale()
  const status = pin?.status ?? 'new'
  const body: MessageKey = status === 'published' ? 'places.review.intro.live' : status === 'hidden' ? 'places.review.intro.hidden' : 'places.review.intro.draft'

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
      <p className="text-sm text-pretty">{t(body)}</p>
      {pin?.published && pin.draft && <p className="text-sm text-warning">{t('places.hasChanges')}</p>}
      <div className="flex flex-wrap gap-2">
        {status === 'published' && <Button isDisabled={actions.busy || actions.dirty} variant="secondary" onPress={actions.hide}>{t('places.action.hide')}</Button>}
        {status === 'published' && actions.dirty && <p className="w-full text-sm text-muted">{t('places.hide.unsaved')}</p>}
        {status === 'hidden' && <Button isDisabled={actions.busy} variant="secondary" onPress={actions.unhide}>{t('places.action.unhide')}</Button>}
        {status === 'draft' && <Button isDisabled={actions.busy} variant="danger-soft" onPress={actions.remove}>{t('places.action.delete')}</Button>}
      </div>
    </section>
  )
}

/** Step 6: the checklist of what a publish needs, each step's facts with Edit, and hide, show again or delete. */
export function StepReview({ form, pin, go, steps, actions, errors, slugTaken }: StepProps & { steps: StepView[], actions: ReviewActions }) {
  const { t, language } = useLocale()
  const text = (en: string, de: string) => (language === 'de' ? de || en : en || de)
  const none = t('places.review.none')
  const listed = steps.filter(step => step.id !== 'review')

  return (
    <div className="flex flex-col gap-4">
      <StatusPanel actions={actions} pin={pin} />
      <Checklist form={form} />
      {slugTaken && <p className="text-sm text-danger" role="alert">{t('places.problem.slugTaken')}</p>}
      {errors.count > 0 && <p className="text-sm text-danger" role="alert">{t('places.review.fix')}</p>}
      {listed.map((step, index) => (
        <ReviewSection key={step.id} index={index} issues={[]} step={step} onEdit={() => go?.(step.id)}>
          {step.id === 'place' && (
            <>
              <ReviewRow label={t('places.review.location')}>{form.latitude === null ? t('places.map.notSet') : `${form.latitude}, ${form.longitude}`}</ReviewRow>
              <ReviewRow label={t('places.review.slug')}>{form.slug || none}</ReviewRow>
              <ReviewRow label={t('places.review.address')}>{form.address || none}</ReviewRow>
            </>
          )}
          {step.id === 'content' && (
            <>
              <ReviewRow label={t('places.review.title')}>{text(form.titleEn, form.titleDe) || none}</ReviewRow>
              <ReviewRow label={t('places.review.localTip')}>{text(form.localTipEn, form.localTipDe) || none}</ReviewRow>
              <ReviewRow label={t('places.review.photos')}>{form.coverMediaId ? t('places.review.photoCount', { count: form.photos.length + 1 }) : none}</ReviewRow>
            </>
          )}
          {step.id === 'when' && (
            <>
              <ReviewRow label={t('places.review.hours')}>{form.hours.length > 0 ? t('places.review.days', { count: new Set(form.hours.map(span => span.day)).size }) : none}</ReviewRow>
              <ReviewRow label={t('places.review.dates')}>{form.dates.length > 0 ? t('places.review.entries', { count: form.dates.length }) : none}</ReviewRow>
            </>
          )}
          {step.id === 'tags' && (
            <>
              <ReviewRow label={t('places.review.categories')}>{form.categoryIds.length || none}</ReviewRow>
              <ReviewRow label={t('places.review.stay')}>{t(`places.stay.${form.stayTag}`)}</ReviewRow>
              <ReviewRow label={t('places.review.interests')}>{form.interests.map(code => t(`places.interest.${code}` as MessageKey)).join(', ') || none}</ReviewRow>
              <ReviewRow label={t('places.review.service')}>{form.serviceType ? t(`places.service.${form.serviceType}` as MessageKey) : none}</ReviewRow>
              <ReviewRow label={t('places.review.food')}>{form.foodKind ? t(`places.food.${form.foodKind}` as MessageKey) : none}</ReviewRow>
              <ReviewRow label={t('places.review.mustVisit')}>{t(form.mustVisit ? 'places.review.yes' : 'places.review.no')}</ReviewRow>
            </>
          )}
          {step.id === 'links' && (
            <>
              <ReviewRow label={t('places.review.story')}>{form.mainStoryGroupId ? t('places.review.set') : none}</ReviewRow>
              <ReviewRow label={t('places.review.link')}>{form.outboundUrl || none}</ReviewRow>
            </>
          )}
        </ReviewSection>
      ))}
    </div>
  )
}

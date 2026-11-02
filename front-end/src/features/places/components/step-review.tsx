import type { Lang } from '../lib/form'
import type { StepProps } from './step-props'
import type { MessageKey } from '@/i18n/en'

import { Button, Skeleton } from '@heroui/react'
import { lazy, Suspense, useState } from 'react'

import { StatusDangerIcon, StatusSuccessIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { publishGaps } from '../lib/form'
import { titleIn } from '../lib/preview'
import { PlaceLanguageSwitch } from './step-content'

const PlacePreview = lazy(() => import('./place-preview'))

export interface ReviewActions {
  hide: () => void
  unhide: () => void
  remove: () => void
  busy: boolean
  /** The form has edits that are not saved. */
  dirty: boolean
}

const GAPS = [
  { gap: 'title', label: 'places.checklist.title.item', step: 'content' },
  { gap: 'location', label: 'places.checklist.location.item', step: 'place' },
] as const satisfies readonly { gap: 'title' | 'location', label: MessageKey, step: string }[]

function Checklist({ form, go }: Pick<StepProps, 'form' | 'go'>) {
  const { t } = useLocale()
  const gaps = publishGaps(form)

  return (
    <section aria-labelledby="places-needed" className="flex flex-col gap-3">
      <h3 className="font-semibold" id="places-needed">{t('places.checklist.title')}</h3>
      <ul className="flex flex-col gap-2 text-sm">
        {GAPS.map(({ gap, label, step }) => {
          const missing = gaps.includes(gap)
          const Icon = missing ? StatusDangerIcon : StatusSuccessIcon

          return (
            <li key={gap} className={`flex items-center gap-2 ${missing ? 'text-danger' : 'text-success'}`}>
              <Icon aria-hidden className="shrink-0" size={16} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground">{t(label)}</span>
                <span className="text-xs">{t(missing ? 'places.checklist.missing' : 'places.checklist.done')}</span>
              </span>
              <Button aria-label={`${t('places.action.edit')}: ${t(label)}`} className="max-lg:min-h-11" size="sm" variant="tertiary" onPress={() => go?.(step)}>
                {t('places.action.edit')}
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-muted">{t(gaps.length > 0 ? 'places.checklist.blocked' : 'places.checklist.optional')}</p>
    </section>
  )
}

/** Show on map again while the pin is hidden, Hide while it is live, and Delete for every saved pin. Publish is the step bar's red action. */
function Actions({ pin, actions }: Pick<StepProps, 'pin'> & { actions: ReviewActions }) {
  const { t } = useLocale()
  const status = pin?.status ?? 'new'

  return (
    <div className="flex flex-col gap-2">
      {pin?.published && pin.draft && <p className="text-sm text-warning">{t('places.hasChanges')}</p>}
      <div className="flex flex-wrap gap-2">
        {status === 'published' && <Button className="max-lg:min-h-11" isDisabled={actions.busy || actions.dirty} variant="danger-soft" onPress={actions.hide}>{t('places.action.hide')}</Button>}
        {status === 'hidden' && <Button className="max-lg:min-h-11" isDisabled={actions.busy} variant="secondary" onPress={actions.unhide}>{t('places.action.unhide')}</Button>}
        {pin && <Button className="max-lg:min-h-11" isDisabled={actions.busy} variant="danger-soft" onPress={actions.remove}>{t('places.action.delete')}</Button>}
      </div>
      {status === 'published' && actions.dirty && <p className="text-sm text-muted">{t('places.hide.unsaved')}</p>}
    </div>
  )
}

/** The phone while its code loads: the same outline as the mockup, 430 by 902. */
function PhoneSkeleton() {
  return <Skeleton aria-hidden className="mx-auto aspect-[430/902] w-full max-w-[430px] rounded-[64px]" data-skeleton="phone" />
}

/**
 * Step 6: the draft on the guest map in a phone, and beside it (above it on a phone) what a publish needs, with Edit
 * that jumps to the step, then Hide, Show on map again or Delete (Publish is in the step bar). The language switch drives the phone.
 */
export function StepReview({ form, pin, go, actions, errors, storeId }: StepProps & { actions: ReviewActions }) {
  const { t, language } = useLocale()
  const [lang, setLang] = useState<Lang>(() => titleIn(form, language).language)
  const shown = titleIn(form, lang).language
  const located = form.latitude !== null && form.longitude !== null
  // Read only: the server made it from the title and locks it at the first publish.
  const slug = pin?.slug?.[language] ?? pin?.slug?.en ?? pin?.slug?.de

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="flex min-w-0 flex-col gap-4 xl:order-2">
        <PlaceLanguageSwitch form={form} selected={lang} onChange={setLang} />
        {shown !== lang && titleIn(form, lang).title !== '' && (
          <p className="text-sm text-warning">{t('places.preview.fallback', { language: t(`places.lang.${lang}`), other: t(`places.lang.${shown}`) })}</p>
        )}
        {!located && <p className="text-sm text-muted">{t('places.preview.noLocation')}</p>}
        <div className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5">
          <Checklist form={form} go={go} />
          {errors.count > 0 && <p className="text-sm text-danger" role="alert">{t('places.review.fix')}</p>}
          <Actions actions={actions} pin={pin} />
        </div>
        <p className="text-sm text-muted">{slug ? t('places.review.slugValue', { slug }) : t('places.review.slugPending')}</p>
      </div>
      <div className="min-w-0 xl:order-1">
        <Suspense fallback={<PhoneSkeleton />}>
          <PlacePreview form={form} label={t('places.preview.label')} language={lang} storeId={storeId} />
        </Suspense>
      </div>
    </div>
  )
}

import type { Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { PublishActions } from './publish-parts'

import { useState } from 'react'

import { IPhoneMockup } from '@/components/iphone-mockup'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { fullLanguages, textOf } from '../lib/keepsake-rules'
import { KeepsakePreview } from './keepsake-preview'
import { ChecksList, PhonePublishBar, PublishButtons, PublishHead } from './publish-parts'

/**
 * Review and publish. A laptop shows the guest page in the iPhone mockup and the publish card beside it. A phone shows
 * the preview as a plain card (the screen already is a phone) and the pinned publish bar. One tree renders at a time,
 * so no id or focus target appears twice. This module holds the mockup, so the edit screen loads it only when Review opens.
 */
export default function ReviewScreen({ keepsake, actions, onFix }: { keepsake: Product, actions: PublishActions, onFix: (check: PublishCheck) => void }) {
  const { t } = useLocale()
  const wide = useIsWide()
  const first = fullLanguages({ name: textOf(keepsake.name), text: textOf(keepsake.text) })[0] ?? 'en'
  const [language, setLanguage] = useState<Language>(first)
  const preview = <KeepsakePreview keepsake={keepsake} language={language} />

  if (!wide) {
    return (
      <div className="flex flex-col gap-4 pt-4 pb-24" data-testid="review-screen">
        <PublishHead keepsake={keepsake} language={language} onLanguage={setLanguage} />
        <div className="mx-auto w-full max-w-[391px] overflow-hidden rounded-3xl border border-separator">{preview}</div>
        <PhonePublishBar actions={actions} keepsake={keepsake} onFix={onFix} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_440px]" data-testid="review-screen">
      <div className="flex min-w-0 flex-col items-center gap-3 py-6">
        <p className="text-sm text-muted">{t('keepsakes.review.previewHint')}</p>
        <IPhoneMockup label={t('keepsakes.review.previewLabel')}>{preview}</IPhoneMockup>
      </div>
      <aside className="sticky top-24 flex flex-col gap-5 self-start border-s border-separator p-6">
        <PublishHead keepsake={keepsake} language={language} onLanguage={setLanguage} />
        <PublishButtons actions={actions} keepsake={keepsake} />
        <ChecksList keepsake={keepsake} onFix={onFix} />
        <p className="text-xs text-pretty text-muted">{t('keepsakes.review.standIn')}</p>
      </aside>
    </div>
  )
}

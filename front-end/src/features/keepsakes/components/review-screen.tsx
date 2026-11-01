import type { Product, PublishCheck } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { PublishActions } from './publish-parts'

import { useState } from 'react'

import { IPhoneMockup } from '@/components/iphone-mockup'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'
import { descriptionsOf, fullLanguages, textOf } from '../lib/keepsake-rules'
import { KeepsakePreview } from './keepsake-preview'
import { ChecksList, PublishHead, UnpublishButton } from './publish-parts'

/**
 * Step 4, Review and publish. The publish card holds the language switch, the name, what goes live, the checks and, for
 * a live keepsake, Unpublish; Publish is the step bar's red action. A laptop shows the guest page in the iPhone mockup
 * beside the card. A phone shows the preview as a plain card (the screen already is a phone), under the card. One tree
 * renders at a time, so no id or focus target appears twice. This module holds the mockup, so the editor loads it
 * only when this step opens.
 */
export default function ReviewScreen({ keepsake, actions, onFix }: { keepsake: Product, actions: PublishActions, onFix: (check: PublishCheck) => void }) {
  const { t } = useLocale()
  const wide = useIsWide()
  const first = fullLanguages({ name: textOf(keepsake.name), text: descriptionsOf(keepsake.text) })[0] ?? 'en'
  const [language, setLanguage] = useState<Language>(first)
  const preview = <KeepsakePreview keepsake={keepsake} language={language} />
  const blocked = keepsake.blocking.length > 0

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start" data-testid="review-screen">
      <div className="flex min-w-0 flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5 xl:order-2">
        <PublishHead keepsake={keepsake} language={language} onLanguage={setLanguage} />
        <ChecksList keepsake={keepsake} onFix={onFix} />
        {blocked && <p className="text-xs text-danger">{t('keepsakes.checks.fixFirst')}</p>}
        {keepsake.status === 'published' && <UnpublishButton actions={actions} />}
        <p className="text-xs text-pretty text-muted">{t('keepsakes.review.standIn')}</p>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-3 xl:order-1">
        {wide
          ? (
              <>
                <p className="text-sm text-muted">{t('keepsakes.review.previewHint')}</p>
                <IPhoneMockup label={t('keepsakes.review.previewLabel')}>{preview}</IPhoneMockup>
              </>
            )
          : <div className="w-full max-w-[391px] overflow-hidden rounded-3xl border border-separator">{preview}</div>}
      </div>
    </div>
  )
}

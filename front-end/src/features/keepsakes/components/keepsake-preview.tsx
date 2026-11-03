import type { Product } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'
import type { Chosen } from '@/features/catalog/lib/variant-choice'

import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { GiftDetail } from '@/features/catalog/components/gift-detail'
import { keepsakePage } from '@/features/catalog/lib/keepsake-page'
import { pickValue } from '@/features/catalog/lib/variant-choice'

/**
 * The guest keepsake page (C03) for the keepsake being edited, inert (owner, 2026-11-02): the same component the guests
 * get, with nothing that navigates or adds to a cart. The merchant can still choose options to see the price and the
 * photo change. The name, description and options follow `language` (the publish card's switch); the page's own labels
 * follow the app language.
 */
export function KeepsakePreview({ keepsake, language }: { keepsake: Product, language: Language }) {
  const { t, intlLocale } = useLocale()
  const [picked, setPicked] = useState<Chosen>()
  const page = keepsakePage(keepsake, { language, t, intlLocale, untitled: t('keepsakes.untitled'), chosen: picked })

  return (
    <div className="flex flex-col bg-background text-foreground" data-testid="keepsake-preview" lang={language}>
      <GiftDetail
        {...page}
        preview
        variant={{ ...page.variant, onChange: (optionId, valueId) => setPicked(pickValue(page.variant.chosen, optionId, valueId)) }}
      />
    </div>
  )
}

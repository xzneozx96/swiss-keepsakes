import type { Product } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { chf, nameIn } from '../lib/keepsake-rules'
import { KeepsakePhoto } from './keepsake-photo'

/**
 * A stand-in for the guest page (C03), built from the keepsake's data (design open point 6): the first photo, the name,
 * the price, the variants for sale and the text. It does not react to taps. It shows the price, which the guest lists
 * never do (AC54). C03 replaces it when that page is edited, and E6.2 adds the option cards.
 */
export function KeepsakePreview({ keepsake, language }: { keepsake: Product, language: Language }) {
  const { t, intlLocale } = useLocale()
  const forSale = keepsake.variants.filter(variant => variant.status === 'published')
  const name = keepsake.name[language]
  const text = keepsake.text[language]
  const missing = !name || !text
  const other = language === 'en' ? 'de' : 'en'
  const lowest = forSale.length > 0 ? Math.min(...forSale.map(variant => variant.priceRappen)) : undefined

  return (
    <article className="flex flex-col bg-background text-foreground" data-testid="keepsake-preview" lang={language}>
      <KeepsakePhoto alt="" className="aspect-square w-full" media={keepsake.photos[0]} width={640} />
      <div className="flex flex-col gap-3 p-4">
        {missing && <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">{t('keepsakes.preview.shownIn', { other: t(`keepsakes.language.${other}`), language: t(`keepsakes.language.${language}`) })}</p>}
        <h2 className="font-serif text-2xl text-pretty">{nameIn(keepsake.name, language) || t('keepsakes.untitled')}</h2>
        {lowest !== undefined && <p className="text-lg font-semibold tabular-nums">{chf(lowest, intlLocale)}</p>}
        {forSale.length > 0
          ? (
              <ul className="flex flex-col gap-2">
                {forSale.map((variant, index) => (
                  <li key={variant.id} className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${index === 0 ? 'border-accent' : 'border-separator'}`}>
                    <span className="font-mono text-xs">{variant.skuCode}</span>
                    <span className="tabular-nums">{chf(variant.priceRappen, intlLocale)}</span>
                  </li>
                ))}
              </ul>
            )
          : <p className="text-sm text-muted">{t('keepsakes.preview.noVariant')}</p>}
        <p className="text-sm text-pretty whitespace-pre-line">{nameIn(keepsake.text, language)}</p>
      </div>
    </article>
  )
}

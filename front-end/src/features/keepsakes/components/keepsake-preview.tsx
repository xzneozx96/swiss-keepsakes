import type { Product } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { chf, nameIn } from '../lib/keepsake-rules'
import { labelOf, shortLabel } from '../lib/option-rules'
import { KeepsakePhoto } from './keepsake-photo'

/**
 * A stand-in for the guest page (C03), built from the keepsake's data (design open point 6): the first photo, the name,
 * the price, the variants for sale and the text. It does not react to taps. It shows the price, which the guest lists
 * never do (AC54). C03 replaces it when that page is edited.
 */
export function KeepsakePreview({ keepsake, language }: { keepsake: Product, language: Language }) {
  const { t, intlLocale } = useLocale()
  const forSale = keepsake.variants.filter(variant => variant.status === 'published')
  const name = keepsake.name[language]
  const text = keepsake.text[language]
  const missing = !name || !text
  const other = language === 'en' ? 'de' : 'en'
  // The first variant for sale is the one chosen. Each option shows its values as cards; a value with no variant for sale
  // next to the other chosen values is "Not sold".
  const chosen = forSale[0]
  const priceOf = (optionId: string, valueId: string) => {
    const match = forSale.find(variant => variant.values[optionId] === valueId && keepsake.options.every(option => option.id === optionId || variant.values[option.id] === chosen?.values[option.id]))

    return match?.priceRappen
  }
  const shown = chosen?.priceRappen

  return (
    <article className="flex flex-col bg-background text-foreground" data-testid="keepsake-preview" lang={language}>
      <KeepsakePhoto alt="" className="aspect-square w-full" media={keepsake.photos[0]} width={640} />
      <div className="flex flex-col gap-3 p-4">
        {missing && <p className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning-soft-foreground">{t('keepsakes.preview.shownIn', { other: t(`keepsakes.language.${other}`), language: t(`keepsakes.language.${language}`) })}</p>}
        <h2 className="font-serif text-2xl text-pretty">{nameIn(keepsake.name, language) || t('keepsakes.untitled')}</h2>
        {shown !== undefined && <p className="text-lg font-semibold tabular-nums">{chf(shown, intlLocale)}</p>}
        {forSale.length === 0
          ? <p className="text-sm text-muted">{t('keepsakes.preview.noVariant')}</p>
          : keepsake.options.map(option => (
              <section key={option.id} aria-label={labelOf(option.name, language)} className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium">{labelOf(option.name, language)}</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {option.values.map((value) => {
                    const price = priceOf(option.id, value.id)
                    const isChosen = chosen?.values[option.id] === value.id

                    return (
                      <li key={value.id} className={`flex flex-col rounded-xl border px-3 py-2 text-sm ${isChosen ? 'border-accent' : 'border-separator'} ${price === undefined ? 'text-muted' : ''}`}>
                        <span className="font-medium">{shortLabel(value.label, language)}</span>
                        <span className="text-xs tabular-nums">{price === undefined ? t('keepsakes.preview.notSold') : chf(price, intlLocale)}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
        <p className="text-sm text-pretty whitespace-pre-line">{nameIn(keepsake.text, language)}</p>
      </div>
    </article>
  )
}

import type { Keepsake, Language, Sku } from './keepsake-editor-data'

import { SelectedIcon } from '@/components/icons'
import { IPhoneMockup } from '@/components/iphone-mockup'
import { Media } from '@/components/media'
import { LANG_NAME } from './keepsake-editor-data'
import { available, chf, findSku, label, shortLabel } from './keepsake-editor-rules'
import { mediaOf } from './story-editor-data'

/**
 * What a guest sees, for the Review and publish screen: a plain stand-in built from the keepsake's
 * data, not a new C03 design. Photo, name, the option cards in C03's look (name over price, the
 * chosen one with the red border and the mark, a sold-out combination struck through), the text.
 * Only variants for sale appear. It does not react to taps.
 */
function KeepsakePreview({ product, language }: { product: Keepsake, language: Language }) {
  const { options, skus } = product
  const forSale = skus.filter(s => s.status === 'published')
  const chosen = forSale.find(s => available(s) > 0) ?? forSale[0]
  const missing = !product.name[language].trim() || !product.text[language].trim()
  const cardFor = (values: Sku['values']) => findSku(forSale, values, options)

  return (
    <article className="flex flex-col pb-8" lang={language}>
      <Media alt="" className="aspect-[4/3] w-full" photo={mediaOf(product.photos[0])?.preview} />
      <div className="flex flex-col gap-5 px-4 pt-5">
        {missing && (
          <p className="rounded-2xl bg-info-soft p-3 text-sm text-info-soft-foreground">
            {`Shown in ${LANG_NAME[language === 'en' ? 'de' : 'en']}: no ${LANG_NAME[language]} text yet.`}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-title text-balance">{label(product.name, language) || 'Untitled keepsake'}</h1>
          {chosen && <p className="text-lg font-semibold tabular-nums">{chf(chosen.price)}</p>}
        </div>
        {chosen && options.map((o) => {
          const values = o.values.filter(v => forSale.some(s => s.values[o.id] === v.id))

          return (
            <div key={o.id} className="flex flex-col gap-2">
              <p className="text-heading">{label(o.name, language)}</p>
              <ul className="grid grid-cols-3 gap-2">
                {values.map((v) => {
                  const sku = cardFor({ ...chosen.values, [o.id]: v.id })
                  const out = !sku || available(sku) === 0
                  const selected = chosen.values[o.id] === v.id

                  return (
                    <li key={v.id} className={`relative rounded-2xl border-2 px-2.5 py-2 ${selected ? 'border-accent bg-default' : 'border-transparent bg-default/60'} ${out ? 'line-through opacity-60' : ''}`}>
                      <span className="flex flex-col items-start leading-5">
                        <span className="text-sm font-semibold">{shortLabel(v.label, language)}</span>
                        <span className="text-xs tabular-nums opacity-80">{sku ? (out ? 'Sold out' : chf(sku.price)) : 'Not sold'}</span>
                      </span>
                      {selected && <SelectedIcon aria-hidden className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent" weight="Filled" />}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        {!forSale.length && <p className="text-sm text-muted">No variant is for sale.</p>}
        <p className="text-base text-pretty whitespace-pre-line">{label(product.text, language) || 'No text yet.'}</p>
      </div>
    </article>
  )
}

/**
 * The guest page in a phone. `fixed` (laptops): the shared iPhone 16 Pro, scaled to fit the window,
 * with the page scrolling inside it, as the story editor's preview. Phones: a plain card.
 */
export function PreviewFrame({ product, language, fixed = false }: { product: Keepsake, language: Language, fixed?: boolean }) {
  if (fixed) {
    return (
      // 200: the top bars and the line above the phone take 177px here, plus 20px of padding under it.
      <IPhoneMockup label="Keepsake preview" reserve={200}>
        <KeepsakePreview language={language} product={product} />
      </IPhoneMockup>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[391px] overflow-hidden rounded-3xl border border-separator bg-background">
      <KeepsakePreview language={language} product={product} />
    </div>
  )
}

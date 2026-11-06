import type { PublicStory } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { useLocale } from '@/contexts/locale-context'
import { ProductCard } from '@/features/catalog/components/product-card'
import { coverUrl } from '@/features/catalog/lib/keepsake-card'

const MAX_CARDS = 6

/**
 * The keepsakes a story links, as compact rows: photo, name and line, no price (AC54), sold out shown as such. The read already leaves out an
 * unpublished keepsake. A card opens the keepsake page in the story's language. Nothing to show draws nothing.
 */
export function StoryKeepsakes({ keepsakes, language }: { keepsakes: PublicStory['keepsakes'], language: Language }) {
  const { t } = useLocale()

  if (keepsakes.length === 0)
    return null

  return (
    <section aria-labelledby="story-keepsakes" className="mt-10 flex flex-col gap-4 border-t border-separator pt-7">
      <h2 className="font-serif text-title" id="story-keepsakes">{t('article.linked')}</h2>
      <ul aria-label={t('article.linked')} className="flex flex-col gap-3">
        {keepsakes.slice(0, MAX_CARDS).map(item => (
          <li key={item.id}>
            <ProductCard
              lang={language}
              name={item.name}
              photo={item.cover ? coverUrl(item.cover) : undefined}
              slug={item.slug}
              soldOutLabel={item.soldOut ? t('gifts.soldOut') : undefined}
              subtitle={item.subtitle ?? undefined}
              variant="row"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

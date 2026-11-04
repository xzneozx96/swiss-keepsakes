import type { Product } from '@sk/domain/catalog'
import type { ProductCardProps } from '@/features/catalog/components/product-card'

import { isPublished } from '@sk/domain/catalog'
import { pickText } from '@sk/domain/shared'

/** The tiles of the showcase on the home: the published Victorinox products. The price and pickup lines stay empty, because the home shows no price (AC54). */
export function victorinoxItems(products: readonly Product[], language: 'en' | 'de'): ProductCardProps[] {
  return products
    .filter(product => product.subcategoryId === 'victorinox' && isPublished(product))
    .map(product => ({ slug: product.slug, name: pickText(product.name, language).text, fromLabel: '', price: '', pickupLine: '' }))
}

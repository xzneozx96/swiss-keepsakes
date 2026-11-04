import type { Product } from '@sk/domain/catalog'

import { describe, expect, it } from 'vitest'
import { victorinoxItems } from '@/features/home/lib/victorinox-items'

function product(slug: string, subcategoryId: string, published = true) {
  return { slug, subcategoryId, published, name: { en: `Victorinox ${slug}`, de: `Victorinox ${slug} DE` } } as unknown as Product
}

describe('[E4.13][AC54] the Victorinox items of the ending', () => {
  it('keeps the published Victorinox products, in the guest language, with no price or pickup text', () => {
    const items = victorinoxItems([product('victorinox-swan', 'victorinox'), product('candle', 'candles'), product('victorinox-draft', 'victorinox', false)], 'de')

    expect(items).toEqual([{ slug: 'victorinox-swan', name: 'Victorinox victorinox-swan DE', fromLabel: '', price: '', pickupLine: '' }])
  })
})

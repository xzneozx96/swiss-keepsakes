import { describe, expect, it } from 'vitest'

import { firstChosen, keepsakePage } from '@/features/catalog/lib/keepsake-page'
import { en } from '@/i18n/en'

function t(key: keyof typeof en, vars?: Record<string, string | number>) {
  return en[key].replace(/\{(\w+)\}/g, (m, name: string) => (vars && name in vars ? String(vars[name]) : m))
}
const doc = (text: string) => ({ type: 'doc' as const, content: [{ type: 'paragraph' as const, content: [{ type: 'text' as const, text }] }] })
function media(id: string, width = 800) {
  return {
    id,
    kind: 'image' as const,
    name: `${id}.jpg`,
    status: 'ready' as const,
    contentType: 'image/jpeg',
    byteSize: 1,
    width: 1280,
    height: 960,
    publicUrl: `https://m.test/${id}/original.jpg`,
    variants: [{ width: 320, url: `https://m.test/${id}/w320.webp` }, { width, url: `https://m.test/${id}/w${width}.webp` }],
  }
}

const input = { language: 'en' as const, t, intlLocale: 'en-CH' as const, untitled: 'Untitled' }
function variant(id: string, values: Record<string, string>, over: Record<string, unknown> = {}) {
  return {
    id,
    mediaId: null,
    photo: null,
    priceRappen: 3900,
    skuCode: null,
    status: 'published' as const,
    values,
    ...over,
  }
}
const sized = {
  name: { en: 'Knife', de: 'Messer' },
  text: { en: doc('A Swiss knife.'), de: doc('Ein Messer.') },
  photos: [media('p1'), media('p2')],
  options: [{ id: 'size', name: { en: 'Size', de: 'Grösse' }, values: [{ id: 's', label: { en: 'Small', de: 'Klein' } }, { id: 'l', label: { en: 'Large' } }] }],
  variants: [
    variant('v-s', { size: 's' }, { priceRappen: 3900 }),
    variant('v-l', { size: 'l' }, { priceRappen: 4900, status: 'draft', photo: media('p3') }),
  ],
}

describe('keepsakePage, the guest page parts of a keepsake being edited', () => {
  it('[AC2] shows the name, description, option and value labels in the chosen language', () => {
    const de = keepsakePage(sized, { ...input, language: 'de' })

    expect(de.name).toBe('Messer')
    expect(de.languageNotice).toBeUndefined()
    expect(de.variant.options[0].label).toBe('Grösse')
    expect(de.variant.options[0].values.map(v => v.label)).toEqual(['Klein', 'Large'])
    expect(JSON.stringify(de.description)).toContain('Ein Messer.')
  })

  it('[AC2][AC30] falls back to the other language with the notice when a language has no text', () => {
    const noGerman = keepsakePage({ ...sized, name: { en: 'Knife' }, text: { en: doc('A Swiss knife.') } }, { ...input, language: 'de' })

    expect(noGerman.name).toBe('Knife')
    expect(JSON.stringify(noGerman.description)).toContain('A Swiss knife.')
    expect(noGerman.languageNotice).toBe(en['detail.onlyInEnglish'])

    const noDescription = keepsakePage({ ...sized, text: { de: doc('Ein Messer.') } }, input)

    expect(noDescription.languageNotice).toBe(en['detail.onlyInGerman'])
    expect(JSON.stringify(noDescription.description)).toContain('Ein Messer.')
  })

  it('names an unnamed keepsake and keeps the description empty when no language has one', () => {
    const page = keepsakePage({ ...sized, name: {}, text: { en: doc('') } }, input)

    expect(page.name).toBe('Untitled')
    expect(page.description).toBeUndefined()
    expect(page.languageNotice).toBeUndefined()
  })

  it('lists the keepsake photos, then a variant photo that is not among them, without repeats', () => {
    const page = keepsakePage(sized, input)

    expect(page.photos).toEqual(['https://m.test/p1/w800.webp', 'https://m.test/p2/w800.webp', 'https://m.test/p3/w800.webp'])
    expect(keepsakePage({ ...sized, photos: [] }, input).photos).toEqual(['https://m.test/p3/w800.webp'])
  })

  it('[AC3] chooses the first variant for sale, prices the bar from it, and shows a hidden or archived combination as not sold', () => {
    const page = keepsakePage(sized, input)

    expect(page.variant.chosen).toEqual({ size: 's' })
    expect(page.bar.price).toMatch(/39/)
    expect(page.variant.variants.find(v => v.id === 'v-l')?.reason).toBe(en['detail.variant.notSold'])
    expect(page.variant.reasons.size).toEqual({ l: en['detail.variant.notSold'] })
  })

  it('[AC3] a chosen combination leads with its variant photo and its price', () => {
    const two = {
      ...sized,
      variants: [sized.variants[0], { ...sized.variants[1], status: 'published' as const, priceRappen: 4900 }],
    }
    const page = keepsakePage(two, { ...input, chosen: { size: 'l' } })

    expect(page.bar.price).toMatch(/49/)
    expect(page.photos[0]).toBe('https://m.test/p3/w800.webp')
  })

  it('[AC3] goes back to the first variant for sale when the chosen values no longer name one', () => {
    expect(keepsakePage(sized, { ...input, chosen: { size: 'l' } }).variant.chosen).toEqual({ size: 's' })
    expect(keepsakePage(sized, { ...input, chosen: { size: 'gone' } }).variant.chosen).toEqual({ size: 's' })
  })

  it('takes the only variant of a keepsake with no option, and says so when none is for sale', () => {
    const plain = { ...sized, options: [], variants: [variant('v', {}, { priceRappen: 8900 })] }

    expect(keepsakePage(plain, input).bar.price).toMatch(/89/)
    expect(keepsakePage(plain, input).variant.options).toEqual([])

    const hidden = keepsakePage({ ...plain, variants: [variant('v', {}, { status: 'draft' })] }, input)

    expect(hidden.bar.price).toBe('–')
    expect(hidden.bar.summary).toBe(en['detail.preview.noVariant'])
  })

  it('shows what the keepsake does not own: New, no reviews, Pickup and Pay on delivery, text for checkout', () => {
    const page = keepsakePage(sized, input)

    expect(page.rating.summary).toBe(en['detail.rating.new'])
    expect(page.reviews.count).toBe(0)
    expect(page.highlights.map(h => h.title)).toEqual([en['detail.highlight.pickup.title'], en['detail.highlight.delivery.title']])
    expect(page.place.options).toEqual([{ id: 'checkout', name: en['detail.preview.atCheckout'], address: '', hours: '' }])
    expect(page.sections.cancellation).toBe(en['detail.preview.cancellation'])
  })

  it('firstChosen is empty when no variant is for sale', () => {
    expect(firstChosen({ variants: [variant('v', { size: 's' }, { status: 'archived' })] })).toEqual({})
  })
})

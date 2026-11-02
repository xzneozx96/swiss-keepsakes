import type { Media, Product } from '@sk/api-contract'
import type { IntlLocale, Language, RichNode } from '@sk/domain/shared'
import type { GiftPageProps } from '../components/gift-detail'
import type { ChoiceVariant, Chosen } from './variant-choice'
import type { ListingReviewsProps } from '@/components/listings/listing-reviews'
import type { MessageKey } from '@/i18n/en'

import { isEmptyDescription } from '@sk/domain/content'
import { formatMoney, pickText } from '@sk/domain/shared'
import { chosenVariant, galleryOrder, valueReasons } from './variant-choice'

type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

/** The width the gallery shows, doubled for dense screens, to pick a resized copy. */
const GALLERY_WIDTH = 800

/** The page's parts a keepsake does not own: no ratings exist yet (E5.5), so a keepsake is new with no reviews. */
export function noReviews(t: Translate, name: string): ListingReviewsProps {
  return {
    count: 0,
    average: 0,
    averageText: '',
    averageLabel: '',
    countLabel: '',
    distribution: [],
    items: [],
    title: t('detail.reviews.title'),
    showAllLabel: '',
    showMoreLabel: t('detail.reviews.showMore'),
    overallLabel: t('detail.reviews.overall'),
    sheetTitle: t('detail.reviews.listTitle', { name }),
    closeLabel: t('detail.sheet.close'),
    rule: t('detail.reviews.rule'),
    empty: t('detail.reviews.none'),
  }
}

export function galleryLabelsOf(t: Translate, name: string): GiftPageProps['galleryLabels'] {
  return {
    gallery: t('gallery.label', { name }),
    photo: (n, count) => t('gallery.photo', { n, count }),
    previous: t('gallery.previous'),
    next: t('gallery.next'),
    close: t('gallery.close'),
  }
}

/** The smallest resized copy at least `width` wide, else the original; undefined until the file is ready. */
function mediaSrc(media: Pick<Media, 'publicUrl' | 'variants'> | null | undefined, width: number): string | undefined {
  if (!media)
    return undefined
  const copy = [...media.variants].sort((a, b) => a.width - b.width).find(v => v.width >= width)

  return copy?.url ?? media.publicUrl ?? undefined
}

const forSale = (variant: Product['variants'][number]) => variant.status === 'published'

/** The first variant for sale, as one value per option: where the guest page starts. */
export function firstChosen(keepsake: Pick<Product, 'variants'>): Chosen {
  return { ...keepsake.variants.find(forSale)?.values }
}

/** What the builder reads of a keepsake (the API's `Product`). */
export type PreviewKeepsake = Pick<Product, 'name' | 'text' | 'photos' | 'options' | 'variants'>

/**
 * The guest keepsake page's parts, built from a keepsake the merchant is editing (E6, owner 2026-11-02): the name and
 * description in `language` (the other one with a notice when it is missing, AC30), the photos, the options with their
 * values, the variants with their price, and the first variant for sale chosen. A variant that is hidden or archived
 * is not sold, so it cannot be picked. Ratings and reviews do not exist yet, and the pickup place and date are
 * chosen at checkout. `chosen` is what the merchant picked; it falls back to the first variant for sale when it no
 * longer names one (the options changed). Nothing here acts: `onChange` comes from the caller.
 */
export function keepsakePage(
  keepsake: PreviewKeepsake,
  input: { language: Language, t: Translate, intlLocale: IntlLocale, untitled: string, chosen?: Chosen },
): Omit<GiftPageProps, 'variant'> & { variant: Omit<GiftPageProps['variant'], 'onChange'> } {
  const { language, t, intlLocale, untitled } = input
  const other: Language = language === 'en' ? 'de' : 'en'
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const name = pickText(keepsake.name, language)
  const texts = { en: keepsake.text.en as RichNode | undefined, de: keepsake.text.de as RichNode | undefined }
  const description = !isEmptyDescription(texts[language]) ? texts[language] : isEmptyDescription(texts[other]) ? undefined : texts[other]
  const fellBack = (name.isFallback && name.text !== '') || (description !== undefined && description === texts[other])
  const title = name.text || untitled

  const photos: string[] = []
  const addPhoto = (src: string | undefined) => {
    if (src && !photos.includes(src))
      photos.push(src)

    return src
  }

  keepsake.photos.forEach(media => addPhoto(mediaSrc(media, GALLERY_WIDTH)))

  const options = keepsake.options.map(option => ({
    id: option.id,
    label: pickText(option.name, language).text,
    values: option.values.map(value => ({ id: value.id, label: pickText(value.label, language).text })),
  }))
  const variants = keepsake.variants.map((variant): ChoiceVariant => {
    const photo = addPhoto(mediaSrc(variant.photo, GALLERY_WIDTH))

    return {
      id: variant.id,
      values: variant.values,
      price: money(variant.priceRappen),
      reason: forSale(variant) ? undefined : t('detail.variant.notSold'),
      photoIndex: photo === undefined ? undefined : photos.indexOf(photo),
    }
  })
  const missing = t('detail.variant.notSold')
  const picked = chosenVariant(options, variants, input.chosen ?? {})
  const chosen = picked && !picked.reason ? input.chosen ?? {} : firstChosen(keepsake)
  const current = chosenVariant(options, variants, chosen)
  const live = current && !current.reason ? current : undefined
  const atCheckout = t('detail.preview.atCheckout')

  return {
    name: title,
    photos: galleryOrder(photos, live?.photoIndex),
    galleryLabels: galleryLabelsOf(t, title),
    description,
    languageNotice: fellBack ? t(other === 'en' ? 'detail.onlyInEnglish' : 'detail.onlyInGerman') : undefined,
    rating: { summary: t('detail.rating.new'), label: t('detail.reviews.none') },
    highlights: [
      { icon: 'pickup', title: t('detail.highlight.pickup.title'), body: t('detail.preview.pickupBody') },
      { icon: 'pay', title: t('detail.highlight.delivery.title'), body: t('detail.highlight.delivery.body') },
    ],
    sheet: { title: t('detail.sheet.title'), closeLabel: t('detail.sheet.close') },
    variant: {
      options,
      variants,
      chosen,
      reasons: valueReasons(options, variants, chosen, missing),
    },
    note: t('detail.preview.pickupBody'),
    // Pickup points do not exist yet (E6.6): one neutral line stands in for the places.
    place: { options: [{ id: 'checkout', name: atCheckout, address: '', hours: '' }] },
    sections: {
      aboutTitle: t('detail.about.title'),
      placesTitle: t('detail.places.title'),
      dateRow: { title: t('detail.date.label'), value: atCheckout, action: '' },
      paymentTitle: t('detail.payment.title'),
      payment: t('detail.highlight.delivery.body'),
      cancellationTitle: t('detail.cancellation.title'),
      cancellation: t('detail.preview.cancellation'),
    },
    reviews: noReviews(t, title),
    bar: {
      price: live ? live.price : '–',
      summary: live ? atCheckout : t('detail.preview.noVariant'),
      chip: t('detail.bar.nothingNow'),
      addLabel: t('detail.bar.add'),
    },
  }
}

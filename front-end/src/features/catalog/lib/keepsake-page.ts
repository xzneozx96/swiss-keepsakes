import type { Media, Product, PublicKeepsake, PublicKeepsakePhoto } from '@sk/api-contract'
import type { IntlLocale, Language, RichNode } from '@sk/domain/shared'
import type { GiftPageProps } from '../components/gift-detail'
import type { ChoiceVariant, Chosen } from './variant-choice'
import type { ListingReviewsProps } from '@/features/catalog/components/listing-reviews'
import type { MessageKey } from '@/i18n/en'

import { isEmptyDescription } from '@sk/domain/content'
import { formatMoney, pickText } from '@sk/domain/shared'
import { photoCopy } from './photo-copy'
import { blockedValues, chosenVariant, galleryOrder, valueReasons } from './variant-choice'

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

/** The copy a gallery shows, else the original; undefined until the file is ready. */
function mediaSrc(media: Pick<Media, 'publicUrl' | 'variants'> | null | undefined): string | undefined {
  if (!media)
    return undefined

  return photoCopy(media.variants, GALLERY_WIDTH) ?? media.publicUrl ?? undefined
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

  keepsake.photos.forEach(media => addPhoto(mediaSrc(media)))

  const options = keepsake.options.map(option => ({
    id: option.id,
    label: pickText(option.name, language).text,
    values: option.values.map(value => ({ id: value.id, label: pickText(value.label, language).text })),
  }))
  const variants = keepsake.variants.map((variant): ChoiceVariant => {
    const photo = addPhoto(mediaSrc(variant.photo))

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
      dateRow: { title: t('detail.date.label'), action: '' },
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

/** What the browser has read of the price and the units: the page shows no price until it is `ready`. */
export type AvailabilityView
  = | { state: 'loading' | 'failed' }
    | { state: 'ready', byVariant: ReadonlyMap<string, { priceRappen: number, available: number }> }

const photoSrc = (photo: PublicKeepsakePhoto) => photoCopy(photo.variants, GALLERY_WIDTH) ?? photo.url

/** The description as the renderer's rich-text node. The contract types a node's children as unknown, so the shape is read here. */
export function richNodeOf(value: unknown): RichNode {
  if (typeof value !== 'object' || value === null)
    return {}
  const node: RichNode = {}

  if ('type' in value && typeof value.type === 'string')
    node.type = value.type
  if ('text' in value && typeof value.text === 'string')
    node.text = value.text
  if ('content' in value && Array.isArray(value.content))
    node.content = value.content.map(richNodeOf)
  if ('marks' in value && Array.isArray(value.marks))
    node.marks = value.marks.flatMap(mark => typeof mark === 'object' && mark !== null && 'type' in mark && typeof mark.type === 'string' ? [{ type: mark.type, ...('attrs' in mark && typeof mark.attrs === 'object' && mark.attrs !== null && { attrs: { ...mark.attrs } }) }] : [])
  if ('attrs' in value && typeof value.attrs === 'object' && value.attrs !== null)
    node.attrs = { ...value.attrs }

  return node
}

/**
 * The guest keepsake page's parts from the public detail (server-rendered, so no price in it) and what the browser has
 * read of the availability. Until it is `ready`, every combination can be looked at and none can be added. Ready: a
 * combination the read does not list is not sold, one with no unit left is sold out, and neither can be picked
 * (AC52, AC53). `chosen` is what the guest picked; it falls back to the first combination that can be picked.
 * Pickup place and date are chosen at checkout (E6.6), and ratings do not exist yet (E5.5).
 */
export function publicKeepsakePage(
  detail: PublicKeepsake,
  input: { t: Translate, intlLocale: IntlLocale, availability: AvailabilityView, chosen?: Chosen },
) {
  const { t, intlLocale, availability } = input
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const doc = richNodeOf(detail.description)
  const description = isEmptyDescription(doc) ? undefined : doc

  const photos = detail.photos.map(photoSrc)
  const options = detail.options.map(option => ({
    id: option.id,
    label: option.name,
    values: option.values.map(value => ({ id: value.id, label: value.label })),
  }))
  const variants = detail.variants.map((variant): ChoiceVariant => {
    const row = availability.state === 'ready' ? availability.byVariant.get(variant.id) : undefined
    const src = variant.photo ? photoSrc(variant.photo) : undefined
    if (src && !photos.includes(src))
      photos.push(src)

    return {
      id: variant.id,
      values: variant.values,
      price: row ? money(row.priceRappen) : '',
      reason: availability.state !== 'ready'
        ? undefined
        : !row
            ? t('detail.variant.notSold')
            : row.available <= 0
              ? t('detail.variant.soldOut')
              : undefined,
      photoIndex: src === undefined ? undefined : photos.indexOf(src),
    }
  })
  const pickable = (variant: ChoiceVariant | undefined) => variant !== undefined && !variant.reason
  const picked = chosenVariant(options, variants, input.chosen ?? {})
  const first = variants.find(pickable) ?? variants[0]
  const chosen = pickable(picked) && input.chosen ? input.chosen : { ...first?.values }
  const current = chosenVariant(options, variants, chosen)
  const live = pickable(current) ? current : undefined
  const row = live && availability.state === 'ready' ? availability.byVariant.get(live.id) : undefined
  const atCheckout = t('detail.preview.atCheckout')

  return {
    page: {
      name: detail.name,
      photos: galleryOrder(photos, current?.photoIndex),
      galleryLabels: galleryLabelsOf(t, detail.name),
      description,
      languageNotice: detail.fallback ? t(detail.language === 'en' ? 'detail.onlyInEnglish' : 'detail.onlyInGerman') : undefined,
      rating: { summary: t('detail.rating.new'), label: t('detail.reviews.none') },
      highlights: [
        { icon: 'pickup' as const, title: t('detail.highlight.pickup.title'), body: t('detail.preview.pickupBody') },
        { icon: 'pay' as const, title: t('detail.highlight.delivery.title'), body: t('detail.highlight.delivery.body') },
      ],
      sheet: { title: t('detail.sheet.title'), closeLabel: t('detail.sheet.close') },
      note: t('detail.preview.pickupBody'),
      place: { options: [{ id: 'checkout', name: atCheckout, address: '', hours: '' }] },
      sections: {
        aboutTitle: t('detail.about.title'),
        placesTitle: t('detail.places.title'),
        dateRow: { title: t('detail.date.label'), action: '' },
        paymentTitle: t('detail.payment.title'),
        payment: t('detail.highlight.delivery.body'),
        cancellationTitle: t('detail.cancellation.title'),
        cancellation: t('detail.preview.cancellation'),
      },
      reviews: noReviews(t, detail.name),
    },
    variant: {
      options,
      variants,
      chosen,
      reasons: blockedValues(options, variants, t('detail.variant.notSold')),
    },
    /** The combination that can be bought now, with its price and units; undefined until the availability is ready. */
    choice: live && row ? { id: live.id, price: money(row.priceRappen), priceRappen: row.priceRappen, available: row.available } : undefined,
    /** Nothing can be bought: the keepsake says so, or the read shows no combination with a unit. */
    soldOut: availability.state === 'ready' ? !variants.some(pickable) : detail.soldOut,
  }
}

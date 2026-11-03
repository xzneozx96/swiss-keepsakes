import type { CalendarDate } from '@internationalized/date'
import type { GiftDetailProps } from '../components/gift-detail'
import type { ChoiceVariant, Chosen } from '../lib/variant-choice'

import { toast } from '@heroui/react'
import { parseDate } from '@internationalized/date'
import {
  availableUnits,
  fromPrice,
  isPickupClosed,
  isSoldOut,
  productEarliestPickup,
  zurichDate,
} from '@sk/domain/catalog'
import { descriptionFromPlain } from '@sk/domain/content'

import { formatMoney, formatShortDate, pickText } from '@sk/domain/shared'
import { useNavigate } from '@tanstack/react-router'

import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'

import { useCart } from '@/features/cart/hooks/use-cart'
import { usePickupPlaces, useProducts, useStoreSubcategories } from '@/features/catalog/api/queries'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import {
  closeCartToast,
  forgetCartToast,
  trackCartToast,
} from '../lib/cart-toast'
import { galleryLabelsOf, noReviews } from '../lib/keepsake-page'
import {
  chosenVariant,
  demoOptions,
  demoValues,
  galleryOrder,
  pickValue,
  valueReasons,
} from '../lib/variant-choice'
import { useFavourites } from './use-favourites'

type Field = 'variant' | 'date' | 'place'

/**
 * C03 Gift detail: the product as the guest sees it plus the choices made in the
 * add-to-cart sheet. Returns null for an unknown slug. Dates follow the demo clock.
 */
export function useGiftDetail(
  slug: string,
): Omit<GiftDetailProps, 'onBack'> | null {
  const { t, language, intlLocale } = useLocale()
  const now = useDemoNow()
  const cart = useCart()
  const navigate = useNavigate()
  const { isFavourite, toggle } = useFavourites()

  const product = useProducts(products => products.find(p => p.slug === slug))
  const orders = useOrders()
  const pickupPlaces = usePickupPlaces()
  const subcategories = useStoreSubcategories()
  // The first variant that can be requested starts chosen: one value per option.
  const [chosen, setChosen] = useState<Chosen>(() => {
    const first = product?.variants.find(
      v => !v.notForSale && availableUnits(product, v, orders) > 0,
    )

    return first ? { ...(product ? demoValues(product, first) : {}) } : {}
  })
  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState<CalendarDate | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [added, setAdded] = useState(false)

  if (!product)
    return null

  const today = zurichDate(now)
  const earliest = productEarliestPickup(product, now)
  const short = (iso: string) => formatShortDate(iso, today, intlLocale)
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const pick = (text: Partial<Record<'en' | 'de', string>>) =>
    pickText(text, language).text

  const name = pickText(product.name, language)
  // The demo description is plain text; the page renders it as the rich-text document the API will send.
  const description = descriptionFromPlain(pickText(product.story, language).text)
  const cancellation = pickText(product.cancellationPolicy, language)
  const soldOut = isSoldOut(product, orders)
  const options = demoOptions(
    product,
    text => pick(text),
    t('detail.variant.label'),
    v => money(v.price),
  )
  const photoSlugs = [product.photo, ...(product.photos ?? [])].filter(
    (slug): slug is string => Boolean(slug),
  )
  const choices = product.variants.map((v): ChoiceVariant => {
    const units = availableUnits(product, v, orders)

    return {
      id: v.id,
      values: demoValues(product, v),
      price: money(v.price),
      reason: v.notForSale
        ? t('detail.variant.notForSale')
        : units <= 0
          ? t('detail.variant.soldOut')
          : undefined,
      photoIndex: v.photo ? photoSlugs.indexOf(v.photo) : undefined,
    }
  })
  const picked = chosenVariant(options, choices, chosen)
  const variant = product.variants.find(v => v.id === picked?.id)
  const maxQuantity = variant
    ? Math.max(1, availableUnits(product, variant, orders))
    : 1
  const unitPrice = variant?.price ?? fromPrice(product)
  const lineTotal = unitPrice * quantity
  const place = pickupPlaces.find(p => p.id === placeId)
  const iso = date?.toString()

  const prepKind = product.dayMode === 'working-days' ? 'working' : 'calendar'
  const prepReason = t(
    `detail.prep.${prepKind}.${plural(product.preparationDays)}`,
    { count: product.preparationDays },
  )

  // The inline calendar cannot pick a pale or past day, so only "missing" remains.
  const errors: Partial<Record<Field, string>> = submitted
    ? {
        variant: variant ? undefined : t('detail.variant.required'),
        date: iso ? undefined : t('detail.date.required'),
        place: placeId ? undefined : t('detail.place.required'),
      }
    : {}

  // Any change after adding returns the bar to "Add to cart".
  const changed
    = <T>(set: (v: T) => void) =>
      (value: T) => {
        set(value)
        setAdded(false)
      }

  const policy = product.paymentPolicy
  const deposit
    = policy.kind === 'deposit'
      ? Math.round((lineTotal * policy.depositPercent) / 100)
      : 0
  const payment
    = policy.kind === 'full'
      ? `${t('detail.payment.full', { hours: policy.firstDueHours })} ${t('detail.payment.autoCancel')}`
      : policy.kind === 'deposit'
        ? `${t('detail.payment.deposit', {
          percent: policy.depositPercent,
          deposit: money(deposit),
          hours: policy.firstDueHours,
          balance: money(lineTotal - deposit),
          days: policy.balanceDueDaysAfterPickup,
        })} ${t('detail.payment.autoCancel')}`
        : t('detail.payment.later', {
            amount: money(lineTotal),
            days: policy.dueDaysAfterPickup,
          })

  const languageNotice = (fallback: boolean, lang: string) =>
    fallback
      ? t(lang === 'en' ? 'gifts.textInEnglish' : 'gifts.textInGerman')
      : undefined

  const saved = isFavourite(product.id)
  const category = subcategories.find(
    c => c.id === product.subcategoryId,
  )
  // The places M12 set for this gift; none set (or none left) means every place (4.9).
  const giftPlaces = pickupPlaces.filter(p =>
    product.pickupPlaceIds?.includes(p.id),
  )
  const offeredPlaces = giftPlaces.length ? giftPlaces : pickupPlaces
  // Two pickup places in the seed; a list format is not needed yet.
  const placeNames
    = offeredPlaces.length === 1
      ? pick(offeredPlaces[0].name)
      : t('detail.highlight.pickup.places', {
          first: pick(offeredPlaces[0].name),
          second: pick(offeredPlaces[1].name),
        })

  /** Adds the line when every choice is made; otherwise shows the errors. */
  const add = (): boolean => {
    const firstError: Field | undefined = !variant
      ? 'variant'
      : !iso
          ? 'date'
          : !placeId
              ? 'place'
              : undefined

    if (firstError || !variant || !iso || !placeId) {
      setSubmitted(true)
      document
        .getElementById(`gift-${firstError}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Keyboard and screen-reader users land on the control that needs attention.
      document
        .querySelector<HTMLElement>(
          `#gift-${firstError} :is([role="row"]:not([aria-disabled="true"]), [role="grid"] [tabindex="0"], input[type="radio"])`,
        )
        ?.focus({ preventScroll: true })

      return false
    }

    cart.add({
      productId: product.id,
      variantId: variant.id,
      quantity,
      pickupDate: iso,
      pickupPlaceId: placeId,
    })
    setAdded(true)

    // Auto-dismisses although it has an action: "View cart" is repeated in the bar.
    closeCartToast()
    const id = toast.success(t('cartToast.title'), {
      description: t('cartToast.item', {
        name: name.text,
        variant: pick(variant.label),
        quantity,
      }),
      actionProps: {
        children: t('cartToast.viewCart'),
        size: 'sm',
        variant: 'tertiary',
        onPress: () => {
          toast.close(id)
          void navigate({ to: '/cart' })
        },
      },
      timeout: 6000,
      onClose: () => {
        forgetCartToast(id)
      },
    })

    trackCartToast(id)

    return true
  }

  return {
    name: name.text,
    // The chosen variant's photo comes first.
    photos: galleryOrder(photoSlugs, picked?.photoIndex),
    galleryLabels: galleryLabelsOf(t, name.text),
    description,
    languageNotice: name.isFallback
      ? t(
          name.language === 'en'
            ? 'detail.onlyInEnglish'
            : 'detail.onlyInGerman',
        )
      : undefined,
    // Product ratings do not exist yet (E5.5): every keepsake is new, with no reviews.
    rating: { summary: t('detail.rating.new'), label: t('detail.reviews.none') },
    highlights: [
      {
        icon: 'pickup' as const,
        title: t('detail.highlight.pickup.title'),
        body: `${placeNames}. ${prepReason}.`,
      },
      {
        icon: 'pay' as const,
        title: t('detail.highlight.delivery.title'),
        body: t('detail.highlight.delivery.body'),
      },
    ],
    favourite: {
      isSaved: saved,
      onToggle: () => toggle(product.id),
      label: t(saved ? 'card.unsave' : 'card.save', { name: name.text }),
    },
    soldOut: soldOut
      ? {
          label: t('gifts.soldOut'),
          message: t('detail.soldOut.message'),
          actionLabel: t('detail.soldOut.action'),
          subcategory: category?.id,
        }
      : undefined,
    sheet: {
      title: t('detail.sheet.title'),
      closeLabel: t('detail.sheet.close'),
      addLabel: t('detail.sheet.add', { total: money(lineTotal) }),
    },
    variant: {
      options,
      variants: choices,
      chosen,
      reasons: valueReasons(options, choices, chosen, t('detail.variant.notSold')),
      onChange: (optionId: string, valueId: string) => {
        const next = pickValue(chosen, optionId, valueId)
        const nextVariant = product.variants.find(
          v => v.id === chosenVariant(options, choices, next)?.id,
        )

        setChosen(next)
        setAdded(false)
        if (nextVariant) {
          setQuantity(q =>
            Math.min(q, Math.max(1, availableUnits(product, nextVariant, orders))),
          )
        }
      },
      error: errors.variant,
    },
    quantity: {
      label: t('detail.quantity.label'),
      value: quantity,
      max: maxQuantity,
      hint: variant
        ? t('detail.quantity.available', { count: maxQuantity })
        : undefined,
      onChange: changed(setQuantity),
    },
    date: {
      label: t('detail.date.label'),
      description: t('detail.date.earliest', { date: short(earliest) }),
      today: parseDate(today),
      earliest: parseDate(earliest),
      isUnavailable: (d) => {
        const day = d.toString()

        // Days before today are left to minValue (disabled, struck through).
        return day >= today && (day < earliest || isPickupClosed(day))
      },
      reasonFor: day =>
        day < today
          ? undefined
          : isPickupClosed(day)
            ? t('detail.date.closed')
            : day < earliest
              ? t('detail.date.tooEarly', {
                  reason: prepReason,
                  date: short(earliest),
                })
              : undefined,
      legend: {
        title: t('detail.legend.title'),
        prep: prepReason,
        closed: t('detail.legend.closed'),
      },
      value: date,
      onChange: changed(setDate),
      error: errors.date,
    },
    note: t('detail.date.note'),
    place: {
      label: t('detail.place.label'),
      options: offeredPlaces.map(p => ({
        id: p.id,
        name: pick(p.name),
        address: p.address,
        hours: pick(p.openingHours),
      })),
      value: placeId,
      onChange: changed((id: string) => setPlaceId(id)),
      error: errors.place,
    },
    sections: {
      aboutTitle: t('detail.about.title'),
      placesTitle: t('detail.places.title'),
      dateRow: {
        title: t('detail.date.label'),
        action: t('detail.bar.choose'),
      },
      paymentTitle: t('detail.payment.title'),
      payment,
      cancellationTitle: t('detail.cancellation.title'),
      cancellation: cancellation.text,
      cancellationNote: languageNotice(
        cancellation.isFallback,
        cancellation.language,
      ),
    },
    // The demo reviews stay in the demo data; this page shows the empty state until E5.5.
    reviews: noReviews(t, name.text),
    bar: {
      price: money(lineTotal),
      summary:
        iso && place
          ? `${short(iso)} · ${pick(place.name)}`
          : t('detail.bar.choose'),
      chip: t('detail.bar.nothingNow'),
      addLabel: t('detail.bar.add'),
      addedLabel: added ? t('detail.bar.added') : undefined,
      viewCartLabel: t('detail.bar.viewCart'),
    },
    onAdd: add,
    // A new round of choices starts from "Add to cart" again.
    onSheetOpen: () => setAdded(false),
    backLabel: t('detail.back'),
  }
}

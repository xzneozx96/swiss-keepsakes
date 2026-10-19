import type { PaymentPolicy, Product } from '@sk/domain/catalog'
import type { CartViewProps } from '../components/cart-view'

import { availableUnits, zurichDate } from '@sk/domain/catalog'

import { priceCartLines } from '@sk/domain/orders'
import { formatMoney, formatShortDate, pickText } from '@sk/domain/shared'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces, useProducts } from '@/features/catalog/api/queries'
import { shop } from '@/features/catalog/seed'
import { useDemoNow } from '@/features/demo'
import { useOrders } from '@/features/orders/api/queries'
import { useCart } from './use-cart'

/**
 * C04 Cart: one flat list of cart lines, each with its store, price, requested pickup date,
 * place and payment rule, a checkbox, quantity, remove and a one-tap fix for a date that
 * can no longer be requested (AC04). Nothing is ticked by default; the bar totals the
 * ticked lines (breakdown in a sheet) and Continue takes only those to C06, which groups
 * them into orders (R12, AC28). Returns null for an empty cart. Dates follow the demo clock.
 */
export function useCartView(): Omit<
  CartViewProps,
  'onBack' | 'onContinue'
> | null {
  const { t, language, intlLocale } = useLocale()
  const demoOrders = useOrders()
  const pickupPlaces = usePickupPlaces()
  const products = useProducts()
  const now = useDemoNow()
  const cart = useCart()

  if (cart.lines.length === 0)
    return null

  const priced = priceCartLines(cart.lines, products, now)
  const chosen = priced.filter(p => p.line.selected)
  const today = zurichDate(now)
  const short = (iso: string) => formatShortDate(iso, today, intlLocale)
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale)
  const plural = (count: number) =>
    new Intl.PluralRules(intlLocale).select(count) === 'one' ? 'one' : 'other'
  const pick = (text: Partial<Record<'en' | 'de', string>>) =>
    pickText(text, language).text

  // Same reason wording as the C03 calendar.
  const prepReason = (product: Product) => {
    const kind = product.engraving
      ? 'engrave'
      : product.dayMode === 'working-days'
        ? 'working'
        : 'calendar'

    return t(`detail.prep.${kind}.${plural(product.preparationDays)}`, {
      count: product.preparationDays,
    })
  }

  const policyText = (policy: PaymentPolicy) =>
    policy.kind === 'deposit'
      ? t('cart.policy.deposit', { percent: policy.depositPercent })
      : t(`cart.policy.${policy.kind}`)

  const total = chosen.reduce((sum, p) => sum + p.total, 0)
  const chosenInvalid = chosen.filter(p => p.invalidDate)
  const allIds = priced.map(p => p.line.id)
  // "Pocket knife · Medium"; one-variant gifts carry a "Standard" label that says nothing.
  const itemName = ({ product, variant }: (typeof priced)[number]) =>
    [
      pick(product.name),
      product.variants.length > 1 ? pick(variant.label) : undefined,
    ]
      .filter(Boolean)
      .join(' · ')

  return {
    title: t('cart.title'),
    backLabel: t('cart.back'),
    note: { title: t('cart.noteTitle'), body: t('cart.note') },
    lines: priced.map(
      ({
        line,
        product,
        variant,
        unitPrice,
        total: lineTotal,
        invalidDate,
      }) => {
        const name = pick(product.name)
        // One-variant gifts carry a "Standard" label; it says nothing, so it is left out.
        const variantLabel
          = product.variants.length > 1 ? pick(variant.label) : undefined
        const engraving = line.engraving
          ? t('cart.line.engraving', { text: line.engraving })
          : undefined
        const meta = [variantLabel, engraving].filter((part): part is string =>
          Boolean(part),
        )
        const place = pickupPlaces.find(p => p.id === line.pickupPlaceId)
        const item = [name, variantLabel].filter(Boolean).join(' · ')

        return {
          id: line.id,
          name,
          photo: product.photo,
          option: variantLabel,
          engraving,
          store: shop.name,
          price: money(unitPrice),
          each: t('cart.line.each'),
          policy: policyText(product.paymentPolicy),
          requestDate: t('cart.line.requestDate', {
            date: short(line.pickupDate),
          }),
          place: place ? pick(place.name) : '',
          select: {
            // Two lines can be the same gift, so the date is part of the name.
            label: t('cart.line.select', {
              item: `${item}, ${short(line.pickupDate)}`,
            }),
            isSelected: Boolean(line.selected),
            onChange: (on: boolean) => cart.select([line.id], on),
          },
          quantity: {
            label: t('cart.line.quantityAria', { name }),
            value: line.quantity,
            max: Math.max(1, availableUnits(product, variant, demoOrders)),
            onChange: (q: number) => cart.setQuantity(line.id, q),
          },
          removeAria: t('cart.line.removeAria', { name }),
          removeConfirm: {
            title: t('cart.remove.title', { item }),
            body: t('cart.remove.body', {
              summary: `${line.quantity} × ${[name, ...meta].join(' · ')} (${money(lineTotal)})`,
            }),
            confirmLabel: t('cart.remove.confirm'),
          },
          onRemove: () => cart.remove(line.id),
          invalid: invalidDate
            ? {
                title: t('cart.invalid.title', {
                  date: short(line.pickupDate),
                }),
                message: `${
                  invalidDate.reason === 'closed'
                    ? t('detail.legend.closed')
                    : prepReason(product)
                }. ${t('cart.invalid.earliest', { date: short(invalidDate.earliest) })}`,
                fixLabel: t('cart.invalid.fix', {
                  date: short(invalidDate.earliest),
                }),
                onFix: () => cart.changeDate(line.id, invalidDate.earliest),
              }
            : undefined,
        }
      },
    ),
    bar: {
      selectAll: {
        label: t('cart.selectAll'),
        isSelected: chosen.length === priced.length,
        isIndeterminate: chosen.length > 0 && chosen.length < priced.length,
        onChange: (on: boolean) => cart.select(allIds, on),
      },
      selectedCount: t('cart.bar.selectedCount', {
        selected: chosen.length,
        total: priced.length,
      }),
      totalLabel: t('cart.bar.total'),
      total: money(total),
      detailsLabel: t('cart.bar.details'),
      continueLabel: t('cart.bar.continue'),
      blocked:
        chosen.length === 0
          ? { message: t('cart.bar.noneSelected') }
          : chosenInvalid.length
            ? {
                message: t(`cart.bar.blocked.${plural(chosenInvalid.length)}`, {
                  count: chosenInvalid.length,
                }),
                fixLineId: chosenInvalid[0].line.id,
              }
            : undefined,
    },
    breakdown: {
      title: t('cart.sheet.title'),
      closeLabel: t('cart.sheet.close'),
      items: chosen.map(p => ({
        id: p.line.id,
        label: `${p.line.quantity} × ${itemName(p)}`,
        pickup: short(p.line.pickupDate),
        total: money(p.total),
      })),
      emptyMessage: t('cart.bar.noneSelected'),
      subtotalLabel: t('cart.order.subtotal'),
      subtotal: money(total),
      totalLabel: t('cart.bar.total'),
      total: money(total),
      chip: t('cart.bar.nothingNow'),
    },
  }
}

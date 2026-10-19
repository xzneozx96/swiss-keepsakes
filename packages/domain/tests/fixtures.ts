import type { Product, Variant } from '../src/catalog'
import type { Order, OrderLine } from '../src/orders'

export const variant = (over: Partial<Variant> = {}): Variant => ({
  id: 'v1',
  label: { en: 'Standard' },
  price: 5000,
  stock: 10,
  ...over,
})

export const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  slug: 'p1',
  subcategoryId: 's1',
  name: { en: 'Knife' },
  story: {},
  cancellationPolicy: {},
  variants: [variant()],
  preparationDays: 2,
  dayMode: 'calendar-days',
  paymentPolicy: { kind: 'full', firstDueHours: 24 },
  commissionRate: 0.1,
  ...over,
})

export const line = (over: Partial<OrderLine> = {}): OrderLine => ({
  productId: 'p1',
  variantId: 'v1',
  quantity: 1,
  unitPrice: 5000,
  ...over,
}) as OrderLine

export const order = (over: Partial<Order> = {}): Order => ({
  id: 'o1',
  status: 'accepted',
  lines: [line({ quantity: 2 })],
  payments: [],
  log: [],
  pickupDate: '2026-10-21',
  paymentPolicy: { kind: 'deposit', depositPercent: 30, firstDueHours: 24, balanceDueDaysAfterPickup: 0 },
  ...over,
}) as Order

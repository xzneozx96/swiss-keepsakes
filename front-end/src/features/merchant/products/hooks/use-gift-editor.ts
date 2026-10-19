import type { DayMode, Issue, Level, LocalizedText, PaymentPolicy, Product, StepStatus, TextErrors, TextFieldId } from '@sk/domain/catalog'
import type { Order } from '@sk/domain/orders'
import type { LocalizedRich, RichNode } from '@sk/domain/shared'
import type { Language } from '@/contexts/locale-context'

import type { GiftStep } from '@/features/merchant/products/lib/search-params'
import { cleanText, giftText, isPublished, LANGUAGES, missingText, textErrors, textFieldError } from '@sk/domain/catalog'

import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { usePickupPlaces, useProducts, useStoreSubcategories } from '@/features/catalog/api/queries'
import { StorageFullError, useSubmit } from '@/features/data-client'

import {
  GIFT_STEPS,

} from '@/features/merchant/products/lib/search-params'

import { useOrders } from '@/features/orders/api/queries'
import { useFieldList, useRangeError } from '../components/editor-parts'
import { markJustCreated, takeJustCreated } from '../lib/just-created'
import {
  hasAnyText,
  newId,
  storyNeedsTitle,
  toStory,
  uniqueSlug,
} from '../lib/records'
import { useProductArchive } from './use-merchant-products'

export interface GiftDraft {
  name: LocalizedText
  story: LocalizedText
  cancellationPolicy: LocalizedText
  /** Long story ("About this gift"), rich text per language; optional. */
  storyTitle: LocalizedText
  storyBody: LocalizedRich
  /** Main photo: a library slug or an uploaded data URL. */
  photo?: string
  /** The keepsake sub-category the guest list files it under; null until chosen. */
  subcategoryId: string | null
  /** Existing options keep their ids; prices in CHF for the number fields (NaN = empty). */
  variants: {
    id: string
    label: LocalizedText
    price: number
    stock: number
    forSale: boolean
  }[]
  engraving: boolean
  engravingMax: number
  preparationDays: number
  dayMode: DayMode
  placeIds: string[]
  paymentKind: PaymentPolicy['kind']
  firstDueHours: number
  depositPercent: number
  balanceDays: number
  laterDays: number
  commissionRate: number
  published: boolean
}

/** Orders hold their units from acceptance until handover or cancellation, as in catalog/lib/stock.ts. */
const holding = new Set<Order['status']>(['accepted', 'preparing', 'ready'])

export function heldUnits(
  productId: string,
  variantId: string,
  orders: Order[],
): number {
  return orders
    .filter(o => holding.has(o.status))
    .flatMap(o => o.lines)
    .filter(l => l.productId === productId && l.variantId === variantId)
    .reduce((sum, l) => sum + l.quantity, 0)
}

function newOption(): GiftDraft['variants'][number] {
  return {
    id: newId('opt'),
    label: {},
    price: Number.NaN,
    stock: 0,
    forSale: true,
  }
}

/** "Add gift": a draft with the shop's usual terms and every pickup point. */
function blankDraft(placeIds: string[]): GiftDraft {
  return {
    name: {},
    story: {},
    cancellationPolicy: {},
    storyTitle: {},
    storyBody: {},
    subcategoryId: null,
    variants: [newOption()],
    engraving: false,
    engravingMax: 12,
    preparationDays: 1,
    dayMode: 'working-days',
    placeIds,
    paymentKind: 'full',
    firstDueHours: 24,
    depositPercent: 30,
    balanceDays: 4,
    laterDays: 2,
    commissionRate: 0.1,
    published: false,
  }
}

function toDraft(product: Product, placeIds: string[]): GiftDraft {
  const policy = product.paymentPolicy

  return {
    name: { ...product.name },
    story: { ...product.story },
    cancellationPolicy: { ...product.cancellationPolicy },
    storyTitle: { ...product.longStory?.title },
    storyBody: { ...product.longStory?.body },
    photo: product.photo,
    subcategoryId: product.subcategoryId,
    variants: product.variants.map(v => ({
      id: v.id,
      label: { ...v.label },
      price: v.price / 100,
      stock: v.stock,
      forSale: !v.notForSale,
    })),
    engraving: Boolean(product.engraving),
    engravingMax: product.engraving?.maxLength ?? 12,
    preparationDays: product.preparationDays,
    dayMode: product.dayMode,
    placeIds: product.pickupPlaceIds
      ? placeIds.filter(id => product.pickupPlaceIds?.includes(id))
      : placeIds,
    paymentKind: policy.kind,
    // Values of the other policy kinds start from the shop's usual sample terms.
    firstDueHours: policy.kind === 'later' ? 24 : policy.firstDueHours,
    depositPercent: policy.kind === 'deposit' ? policy.depositPercent : 30,
    balanceDays:
      policy.kind === 'deposit' ? policy.balanceDueDaysAfterPickup : 4,
    laterDays: policy.kind === 'later' ? policy.dueDaysAfterPickup : 2,
    commissionRate: product.commissionRate,
    published: isPublished(product),
  }
}

function toPolicy(draft: GiftDraft): PaymentPolicy {
  switch (draft.paymentKind) {
    case 'full':
      return { kind: 'full', firstDueHours: draft.firstDueHours }
    case 'deposit':
      return {
        kind: 'deposit',
        depositPercent: draft.depositPercent,
        firstDueHours: draft.firstDueHours,
        balanceDueDaysAfterPickup: draft.balanceDays,
      }
    case 'later':
      return { kind: 'later', dueDaysAfterPickup: draft.laterDays }
  }
}

const orZero = (value: number) => (Number.isFinite(value) ? value : 0)

/**
 * The saved product. Ids and the slug never change, so orders and cart lines keep pointing
 * at it; new options get new ids. The gallery photos after the main one are kept.
 */
function toProduct(
  draft: GiftDraft,
  base: Pick<Product, 'id' | 'slug'> & Partial<Product>,
  placeIds: string[],
  fallbackSubcategoryId: string,
): Product {
  const allPlaces = placeIds.every(id => draft.placeIds.includes(id))

  return {
    ...base,
    // A draft may be saved before a sub-category is chosen; it files under the first one.
    subcategoryId: draft.subcategoryId ?? fallbackSubcategoryId,
    name: cleanText(draft.name),
    story: cleanText(draft.story),
    cancellationPolicy: cleanText(draft.cancellationPolicy),
    longStory: toStory(draft.storyTitle, draft.storyBody),
    photo: draft.photo,
    variants: draft.variants.map(v => ({
      id: v.id,
      label: cleanText(v.label),
      price: Math.round(orZero(v.price) * 100),
      stock: orZero(v.stock),
      ...(v.forSale ? {} : { notForSale: true }),
    })),
    engraving: draft.engraving ? { maxLength: draft.engravingMax } : undefined,
    preparationDays: draft.preparationDays,
    dayMode: draft.dayMode,
    paymentPolicy: toPolicy(draft),
    commissionRate: Math.round(draft.commissionRate * 10_000) / 10_000,
    published: draft.published,
    // Every place selected is stored as "all", so a place added later is offered too.
    pickupPlaceIds: allPlaces ? undefined : draft.placeIds,
  }
}

/** Which step holds each required text. */
export const GIFT_TEXT_STEP: Partial<Record<TextFieldId, GiftStep>> = {
  name: 'basics',
  story: 'basics',
  options: 'options',
  cancellation: 'payment',
  longStory: 'story',
}
function textIdsOf(step: GiftStep) {
  return (Object.keys(GIFT_TEXT_STEP) as TextFieldId[]).filter(
    id => GIFT_TEXT_STEP[id] === step,
  )
}

type FieldKey
  = | 'name'
    | 'category'
    | 'photo'
    | 'options'
    | 'engravingMax'
    | 'places'
    | 'preparationDays'
    | 'firstDueHours'
    | 'depositPercent'
    | 'balanceDays'
    | 'laterDays'
    | 'commission'
    | 'storyTitle'

const FIELD_STEP: Record<FieldKey, GiftStep> = {
  name: 'basics',
  category: 'basics',
  photo: 'basics',
  options: 'options',
  engravingMax: 'options',
  places: 'pickup',
  preparationDays: 'pickup',
  firstDueHours: 'payment',
  depositPercent: 'payment',
  balanceDays: 'payment',
  laterDays: 'payment',
  commission: 'payment',
  storyTitle: 'story',
}

interface GiftErrors {
  fields: Partial<Record<FieldKey, string>>
  variants: Record<string, { price?: string, stock?: string }>
  text: TextErrors
}

function draftText(draft: GiftDraft) {
  return giftText({
    ...draft,
    longStory: { title: draft.storyTitle, body: draft.storyBody },
  })
}

/**
 * M12 Edit gift as a stepper (owner, revision 2), and "Add gift" when `product` is null.
 * The draft lives in this component's state, so a refresh drops unsaved edits; a new gift
 * is stored at its first save. One rule set (`validate`) serves Next, Save and Review.
 */
export function useGiftEditor(
  product: Product | null,
  step: GiftStep,
  go: (step: GiftStep) => void,
) {
  const { t, language: interfaceLanguage } = useLocale()
  const { submit: saveProduct, isPending: isSaving } = useSubmit('catalog', 'saveProduct')
  const products = useProducts()
  const subcategories = useStoreSubcategories()
  const orders = useOrders()
  const pickupPlaces = usePickupPlaces()
  const navigate = useNavigate()
  const rangeError = useRangeError()
  const fieldList = useFieldList()
  const archive = useProductArchive()
  const placeIds = pickupPlaces.map(p => p.id)
  const [draft, setDraft] = useState(() =>
    product ? toDraft(product, placeIds) : blankDraft(placeIds),
  )
  const [saved, setSaved] = useState(draft)
  // The step language switch opens on the interface language (owner, 15.10.2026).
  const [language, setLanguage] = useState<Language>(interfaceLanguage)
  const [attempt, setAttempt] = useState<{
    level: Level
    step?: GiftStep
    n: number
  } | null>(null)
  const [focusCount, setFocusCount] = useState(0)
  const [furthest, setFurthest] = useState(() =>
    product ? GIFT_STEPS.length - 1 : 0,
  )
  /** The save bar confirms a save itself: a toast would cover it on phones. */
  const [justSaved, setJustSaved] = useState(() => {
    return !!product && takeJustCreated(product.id)
  })
  const [storageFull, setStorageFull] = useState(false)
  const isNew = !product
  const archived = !!product?.archivedAt
  const live = !!product && isPublished(product)

  // Creating walks the steps in order: an address that skips ahead (a refresh, a link)
  // starts again at the furthest step reached, Basics for a fresh draft.
  useEffect(() => {
    if (isNew && GIFT_STEPS.indexOf(step) > furthest)
      go(GIFT_STEPS[furthest])
  }, [isNew, step, furthest, go])

  const change = (patch: Partial<GiftDraft>) =>
    setDraft(d => ({ ...d, ...patch }))
  const changeVariant = (
    id: string,
    patch: Partial<GiftDraft['variants'][number]>,
  ) =>
    setDraft(d => ({
      ...d,
      variants: d.variants.map(v => (v.id === id ? { ...v, ...patch } : v)),
    }))
  const addVariant = () =>
    setDraft(d => ({ ...d, variants: [...d.variants, newOption()] }))
  const changeStory = (lang: Language, doc: RichNode | undefined) =>
    setDraft(d => ({ ...d, storyBody: { ...d.storyBody, [lang]: doc } }))

  const missing = missingText(draftText(draft))
  const held = Object.fromEntries(
    draft.variants.map(v => [
      v.id,
      product ? heldUnits(product.id, v.id, orders) : 0,
    ]),
  )

  const validate = (level: Level): GiftErrors => {
    const strict = level !== 'draft'
    const transition = level === 'publish' || level === 'step'

    return {
      fields: {
        name:
          level === 'draft' && !hasAnyText(draft.name)
            ? t('products.draftName')
            : undefined,
        category: draft.subcategoryId
          ? undefined
          : t('products.subcategory.error'),
        photo:
          transition && !draft.photo ? t('products.photo.required') : undefined,
        options:
          transition
          && !draft.variants.some(
            v => v.forSale && Number.isFinite(v.price) && v.price > 0,
          )
            ? t('products.stock.publishError')
            : undefined,
        storyTitle: storyNeedsTitle(draft.storyTitle, draft.storyBody)
          ? t('products.story.titleError')
          : undefined,
        engravingMax: draft.engraving
          ? rangeError(draft.engravingMax, 1, 40)
          : undefined,
        preparationDays: rangeError(draft.preparationDays, 0, 30),
        places: draft.placeIds.length ? undefined : t('products.places.error'),
        firstDueHours:
          draft.paymentKind === 'later'
            ? undefined
            : rangeError(draft.firstDueHours, 1, 168),
        depositPercent:
          draft.paymentKind === 'deposit'
            ? rangeError(draft.depositPercent, 1, 99)
            : undefined,
        balanceDays:
          draft.paymentKind === 'deposit'
            ? rangeError(draft.balanceDays, 0, 60)
            : undefined,
        laterDays:
          draft.paymentKind === 'later'
            ? rangeError(draft.laterDays, 0, 60)
            : undefined,
        commission: rangeError(Math.round(draft.commissionRate * 100), 0, 50),
      },
      variants: Object.fromEntries(
        draft.variants.map(v => [
          v.id,
          {
            // A draft may keep an empty price (saved as 0); a published option may not.
            price:
              strict && !(Number.isFinite(v.price) && v.price > 0)
                ? t('products.stock.priceError')
                : undefined,
            stock: Number.isFinite(v.stock)
              ? (rangeError(v.stock, 0, 9999)
                ?? (v.stock < held[v.id]
                  ? t('products.stock.belowHeld', { held: held[v.id] })
                  : undefined))
              : undefined,
          },
        ]),
      ),
      text: textErrors(draftText(draft), level),
    }
  }

  /** Only one step's errors, for Next. */
  const only = (errors: GiftErrors, keep: GiftStep): GiftErrors => ({
    fields: Object.fromEntries(
      Object.entries(errors.fields).filter(
        ([key]) => FIELD_STEP[key as FieldKey] === keep,
      ),
    ),
    variants: keep === 'options' ? errors.variants : {},
    text: {
      any: errors.text.any.filter(id => GIFT_TEXT_STEP[id] === keep),
      language: errors.text.language,
    },
  })

  const issuesIn = (errors: GiftErrors, of: GiftStep): string[] => {
    const out = Object.entries(errors.fields)
      .filter(([key, value]) => value && FIELD_STEP[key as FieldKey] === of)
      .map(([, value]) => value as string)

    if (of === 'options') {
      for (const v of Object.values(errors.variants)) {
        for (const e of [v.price, v.stock]) {
          if (e && !out.includes(e))
            out.push(e)
        }
      }
    }
    const ids = textIdsOf(of)
    const any = errors.text.any.filter(id => ids.includes(id))
    const inLanguage = errors.text.language
      ? missing[errors.text.language].filter(
          id => ids.includes(id) && !any.includes(id),
        )
      : []

    if (any.length)
      out.push(t('products.review.emptyAny', { fields: fieldList(any) }))
    if (errors.text.language && inLanguage.length) {
      out.push(
        t('products.review.emptyIn', {
          language: t(`products.lang.${errors.text.language}`),
          fields: fieldList(inLanguage),
        }),
      )
    }

    return out
  }

  const firstStepWith = (errors: GiftErrors) =>
    GIFT_STEPS.find(s => issuesIn(errors, s).length > 0)

  /** Translation gaps: text one language has and the other does not. */
  const gapsIn = (of: GiftStep): Issue[] => {
    const ids = textIdsOf(of)

    return LANGUAGES.flatMap((lang) => {
      const other = lang === 'en' ? 'de' : 'en'
      const gaps = missing[lang].filter(
        id => ids.includes(id) && !missing[other].includes(id),
      )

      return gaps.length
        ? [
            {
              tone: 'warning' as const,
              text: t('products.lang.line.missing', {
                language: t(`products.lang.${lang}`),
                fields: fieldList(gaps),
              }),
            },
          ]
        : []
    })
  }

  const shown
    = attempt
      && (attempt.step
        ? only(validate(attempt.level), attempt.step)
        : validate(attempt.level))
  // What publishing (or keeping it live) still needs, before anyone presses a button.
  const needs = validate(live ? 'live' : 'publish')

  const statusOf = (of: GiftStep): StepStatus => {
    const index = GIFT_STEPS.indexOf(of)

    if (shown && issuesIn(shown, of).length)
      return 'error'
    if (isNew && index > furthest)
      return 'todo'
    if (of === 'review')
      return index <= furthest ? 'done' : 'todo'
    if (issuesIn(needs, of).length || gapsIn(of).length)
      return 'warning'

    return isNew && index >= furthest ? 'todo' : 'done'
  }

  const issuesOf = (of: GiftStep): Issue[] => {
    const errors = shown && issuesIn(shown, of)

    if (errors && errors.length)
      return errors.map(text => ({ tone: 'danger', text }))

    return [
      ...issuesIn(needs, of).map(text => ({
        tone: 'warning' as const,
        text,
      })),
      ...gapsIn(of),
    ]
  }

  const textError = (
    id: TextFieldId,
    lang: Language,
    value: LocalizedText,
  ): string | undefined =>
    textFieldError(shown?.text, missing, id, lang, value, {
      any: t('products.text.neededAny'),
      needed: l => t(`products.text.needed.${l}`),
    })

  /** After a refused action: show its errors, move to their step, focus the first field. */
  const refuse = (level: Level, errors: GiftErrors, stay = false) => {
    setAttempt(a => ({ level, n: (a?.n ?? 0) + 1 }))
    const first = firstStepWith(errors)

    if (!stay && first && issuesIn(errors, step).length === 0)
      go(first)
    setFocusCount(n => n + 1)
  }
  const hasIssues = (errors: GiftErrors) =>
    GIFT_STEPS.some(s => issuesIn(errors, s).length > 0)

  const commit = (published: boolean) => {
    setStorageFull(false)
    const next = toProduct(
      { ...draft, published: published && !archived },
      product ?? {
        id: newId('gift'),
        slug: uniqueSlug(
          draft.name,
          products.map(p => p.slug),
          'gift',
        ),
      },
      placeIds,
      subcategories.find(c => c.categoryId === 'keepsakes')?.id ?? '',
    )

    saveProduct(next, {
      onSuccess: () => {
        setAttempt(null)
        if (!product) {
          markJustCreated(next.id)
          void navigate({
            to: '/store/products/gifts/$productId',
            params: { productId: next.id },
            search: { step },
            replace: true,
          })

          return
        }
        const kept = { ...draft, published: next.published !== false }

        setDraft(kept)
        setSaved(kept)
        setJustSaved(true)
      },
      onError: (error) => {
        if (error instanceof StorageFullError)
          setStorageFull(true)
      },
    })
  }

  const run = (level: Level, published: boolean, stay = false) => {
    const errors = validate(level)

    if (hasIssues(errors)) {
      refuse(level, errors, stay)

      return
    }
    commit(published)
  }

  return {
    isNew,
    archived,
    live,
    draft,
    change,
    changeVariant,
    addVariant,
    changeStory,
    held,
    missing,
    language,
    setLanguage,
    fieldError: (key: FieldKey) => shown?.fields[key],
    /** The shown field errors, for the cards that read `errors.x`. */
    errors: (shown?.fields ?? {}) as Partial<Record<FieldKey, string>>,
    publishRefused: !!shown && attempt?.level === 'publish',
    /** The step's own required text per language (its EN | DE switch); none without text. */
    stepMissing: (of: GiftStep) => {
      const ids = textIdsOf(of)

      return ids.length
        ? {
            en: missing.en.filter(id => ids.includes(id)),
            de: missing.de.filter(id => ids.includes(id)),
          }
        : undefined
    },
    variantErrors: (id: string) =>
      shown?.variants[id] ?? { price: undefined, stock: undefined },
    textError,
    statusOf,
    issuesOf,
    canGo: (to: GiftStep) => !isNew || GIFT_STEPS.indexOf(to) <= furthest,
    go,
    /** Next while creating: this step's publish rules; when editing, just the next step. */
    next: () => {
      const index = GIFT_STEPS.indexOf(step)
      const to = GIFT_STEPS[index + 1]

      if (!to)
        return
      if (isNew) {
        const errors = only(validate('step'), step)

        if (hasIssues(errors)) {
          setAttempt(a => ({ level: 'step', step, n: (a?.n ?? 0) + 1 }))
          setFocusCount(n => n + 1)

          return
        }
        setAttempt(null)
        setFurthest(f => Math.max(f, index + 1))
      }
      go(to)
    },
    back: () => {
      const index = GIFT_STEPS.indexOf(step)

      if (index > 0)
        go(GIFT_STEPS[index - 1])
    },
    saveDraft: () => run('draft', false),
    saveChanges: () => run(live ? 'live' : 'draft', live),
    publish: () => run('publish', true, true),
    unpublish: () => run('draft', false),
    restore: () => {
      if (product)
        archive.restore('gift', product.id)
      setDraft(d => ({ ...d, published: false }))
    },
    isDirty: JSON.stringify(draft) !== JSON.stringify(saved),
    hasErrors: !!shown && hasIssues(shown),
    storageFull,
    /** A save is on its way: the save buttons are off. */
    isSaving,
    justSaved,
    focusCount,
  }
}

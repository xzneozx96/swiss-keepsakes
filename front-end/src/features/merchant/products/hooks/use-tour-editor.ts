import type {
  Departure,
  Tour,
  TourSection,
  TourSectionItem,
  TourStop,
} from '@sk/domain/bookings'
import type { Issue, Level, LocalizedText, StepStatus, TextErrors, TextFieldId } from '@sk/domain/catalog'
import type { LocalizedRich, RichNode } from '@sk/domain/shared'
import type { Language } from '@/contexts/locale-context'

import type { TourStep } from '@/features/merchant/products/lib/search-params'
import {
  cleanText,
  hasText,
  LANGUAGES,
  missingText,
  textErrors,
  textFieldError,
  tourText,
} from '@sk/domain/catalog'

import { safeHref } from '@sk/domain/shared'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/locale-context'
import { StorageFullError, useCommand } from '@/features/data-client'
import { useDemoNow } from '@/features/demo'

import {
  TOUR_STEPS,

} from '@/features/merchant/products/lib/search-params'
import { useTourRecords } from '@/features/tours/api/queries'
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

export interface TourEdit {
  name: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  meetingPoint: LocalizedText
  /** The stops in guest order (the guest map numbers them by position); the whole stop is edited. */
  itinerary: TourStop[]
  /** `key` keeps React rows stable while items are added. */
  included: { key: string, text: LocalizedText }[]
  excluded: LocalizedText
  conditions: LocalizedText
  cancellationPolicy: LocalizedText
  /** Long story ("About this tour"), rich text per language; optional. */
  storyTitle: LocalizedText
  storyBody: LocalizedRich
  /** Free-form sections (practical info, timetable, notices); the whole section is edited. */
  sections: TourSection[]
  /** ISO date the practical information was last verified; "" when not given. */
  checkedOn: string
  /** Linked keepsakes (`Product.id`), in the order guests see them. */
  keepsakeIds: string[]
  /** Under maintenance (R21): the reason guests read, an optional notice link and expected-back date. */
  maintenance: {
    active: boolean
    reason: LocalizedText
    url: string
    expectedBack: string
  }
  /** Main photo (`photos[0]`): a library slug or an uploaded data URL. */
  photo?: string
  durationHours: number
  /** CHF for the number fields (NaN = empty); stored in Rappen. */
  adultPrice: number
  childPrice: number
  infantPrice: number
  childFrom: number
  adultFrom: number
  commissionRate: number
  published: boolean
}

function hasAny(text: LocalizedText) {
  return LANGUAGES.some(language => hasText(text, language))
}

/** "Add tour": a draft with the shop's usual age groups and commission. */
function blankEdit(): TourEdit {
  return {
    name: {},
    summary: {},
    description: {},
    meetingPoint: {},
    itinerary: [],
    included: [],
    excluded: {},
    conditions: {},
    cancellationPolicy: {},
    storyTitle: {},
    storyBody: {},
    sections: [],
    checkedOn: '',
    keepsakeIds: [],
    maintenance: { active: false, reason: {}, url: '', expectedBack: '' },
    durationHours: 2,
    adultPrice: Number.NaN,
    childPrice: Number.NaN,
    infantPrice: 0,
    childFrom: 6,
    adultFrom: 16,
    commissionRate: 0.1,
    published: false,
  }
}

function toEdit(tour: Tour): TourEdit {
  return {
    name: { ...tour.name },
    summary: { ...tour.summary },
    description: { ...tour.description },
    meetingPoint: { ...tour.meetingPoint },
    itinerary: tour.itinerary.map(stop => ({
      ...stop,
      name: { ...stop.name },
      description: { ...stop.description },
      coordinates: [stop.coordinates[0], stop.coordinates[1]],
      note: stop.note && { ...stop.note },
    })),
    included: tour.included.map((text, index) => ({
      key: `item-${index}`,
      text: { ...text },
    })),
    excluded: { ...tour.excluded },
    conditions: { ...tour.conditions },
    cancellationPolicy: { ...tour.cancellationPolicy },
    storyTitle: { ...tour.longStory?.title },
    storyBody: { ...tour.longStory?.body },
    sections: structuredClone(tour.sections ?? []),
    checkedOn: tour.checkedOn ?? '',
    keepsakeIds: [...(tour.keepsakeIds ?? [])],
    maintenance: {
      active: tour.maintenance?.active ?? false,
      reason: { ...tour.maintenance?.reason },
      url: tour.maintenance?.url ?? '',
      expectedBack: tour.maintenance?.expectedBack ?? '',
    },
    photo: tour.photos[0],
    durationHours: tour.durationMinutes / 60,
    adultPrice: tour.adultPrice / 100,
    childPrice: tour.childPrice / 100,
    infantPrice: tour.infantPrice / 100,
    childFrom: tour.ageBands.childFrom,
    adultFrom: tour.ageBands.adultFrom,
    commissionRate: tour.commissionRate,
    published: tour.published,
  }
}

function cleanContact(contact: TourSectionItem['contact']) {
  const entries = Object.entries(contact ?? {})
    .map(([key, value]) => [key, value?.trim()] as const)
    .filter(([, value]) => value)

  return entries.length
    ? (Object.fromEntries(entries) as TourSectionItem['contact'])
    : undefined
}

/**
 * The sections as saved: text trimmed per language, a row with nothing in it removed, and a
 * section with no title, text or rows removed (like an included item cleared in both languages).
 */
function cleanSections(sections: TourSection[]): TourSection[] {
  return sections
    .map((section) => {
      const items = (section.items ?? [])
        .filter(
          item =>
            hasAny(item.text)
            || hasAny(item.label ?? {})
            || hasAny(item.detail ?? {}),
        )
        .map((item): TourSectionItem => ({
          id: item.id,
          ...(item.label && hasAny(item.label)
            ? { label: cleanText(item.label) }
            : {}),
          text: cleanText(item.text),
          ...(item.detail && hasAny(item.detail)
            ? { detail: cleanText(item.detail) }
            : {}),
          ...(item.stopId ? { stopId: item.stopId } : {}),
          ...(item.giftId ? { giftId: item.giftId } : {}),
          ...(cleanContact(item.contact)
            ? { contact: cleanContact(item.contact) }
            : {}),
          ...(item.optional ? { optional: true } : {}),
        }))

      return {
        id: section.id,
        layout: section.layout,
        title: cleanText(section.title),
        ...(section.body && hasAny(section.body)
          ? { body: cleanText(section.body) }
          : {}),
        ...(items.length ? { items } : {}),
      } satisfies TourSection
    })
    .filter(
      section =>
        hasAny(section.title) || section.body !== undefined || section.items,
    )
}

/** The text as guests will get it: an item cleared in both languages is removed. */
function textOf(edit: TourEdit) {
  return {
    ...edit,
    included: edit.included.map(item => item.text).filter(hasAny),
    sections: cleanSections(edit.sections),
  }
}

/** Kept while it is on, or while it still holds a reason: turning it off keeps the text for next time. */
function toMaintenance(
  edit: TourEdit['maintenance'],
): Tour['maintenance'] | undefined {
  const reason = cleanText(edit.reason)

  if (!edit.active && !hasAnyText(reason))
    return undefined

  return {
    active: edit.active,
    reason,
    ...(edit.url.trim() ? { url: edit.url.trim() } : {}),
    ...(edit.expectedBack ? { expectedBack: edit.expectedBack } : {}),
  }
}

function rappen(chf: number) {
  return Math.round((Number.isFinite(chf) ? chf : 0) * 100)
}

/**
 * The saved tour: id, slug and the gallery after the main photo never change. A tour stays off C08 (`unannounced`) until it is first published.
 */
function toTour(edit: TourEdit, base: Tour): Tour {
  const text = textOf(edit)

  return {
    ...base,
    name: cleanText(edit.name),
    summary: cleanText(edit.summary),
    description: cleanText(edit.description),
    meetingPoint: cleanText(edit.meetingPoint),
    itinerary: edit.itinerary.map((stop) => {
      const note = stop.note && cleanText(stop.note)

      return {
        ...stop,
        name: cleanText(stop.name),
        description: cleanText(stop.description),
        note: note && hasAnyText(note) ? note : undefined,
      }
    }),
    included: text.included.map(cleanText),
    excluded: cleanText(edit.excluded),
    conditions: cleanText(edit.conditions),
    cancellationPolicy: cleanText(edit.cancellationPolicy),
    longStory: toStory(edit.storyTitle, edit.storyBody),
    sections: text.sections.length ? text.sections : undefined,
    checkedOn: edit.checkedOn || undefined,
    maintenance: toMaintenance(edit.maintenance),
    keepsakeIds: edit.keepsakeIds.length ? edit.keepsakeIds : undefined,
    photos: edit.photo ? [edit.photo, ...base.photos.slice(1)] : base.photos,
    durationMinutes: Math.round(edit.durationHours * 60),
    adultPrice: rappen(edit.adultPrice),
    childPrice: rappen(edit.childPrice),
    infantPrice: rappen(edit.infantPrice),
    ageBands: { childFrom: edit.childFrom, adultFrom: edit.adultFrom },
    commissionRate: Math.round(edit.commissionRate * 10_000) / 10_000,
    published: edit.published,
    unannounced: edit.published ? undefined : base.unannounced,
  }
}

/** A tour with nothing in it yet: the base "Add tour" and the preview of an unsaved tour start from. */
function emptyTour(id: string, slug: string): Tour {
  return {
    id,
    slug,
    name: {},
    summary: {},
    description: {},
    photos: [],
    durationMinutes: 120,
    adultPrice: 0,
    childPrice: 0,
    infantPrice: 0,
    meetingPoint: {},
    included: [],
    excluded: {},
    conditions: {},
    cancellationPolicy: {},
    published: false,
    unannounced: true,
    commissionRate: 0.1,
    itinerary: [],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: [],
  }
}

export function useDepartureActions() {
  const { mutate: addDeparture } = useCommand('tours', 'addDeparture')
  const { mutate: setDepartureCapacity } = useCommand('tours', 'setDepartureCapacity')

  return {
    add: (departure: Departure) => addDeparture(departure),
    setCapacity: (id: string, capacity: number) =>
      setDepartureCapacity({ id, capacity }),
  }
}

/** Which step holds each required text. */
export const TOUR_TEXT_STEP: Partial<Record<TextFieldId, TourStep>> = {
  name: 'basics',
  summary: 'basics',
  description: 'basics',
  itinerary: 'details',
  included: 'details',
  excluded: 'details',
  meetingPoint: 'details',
  conditions: 'details',
  cancellation: 'policies',
  longStory: 'story',
  sections: 'sections',
}
function textIdsOf(step: TourStep) {
  return (Object.keys(TOUR_TEXT_STEP) as TextFieldId[]).filter(
    id => TOUR_TEXT_STEP[id] === step,
  )
}

type FieldKey
  = | 'name'
    | 'photo'
    | 'duration'
    | 'adultPrice'
    | 'childPrice'
    | 'infantPrice'
    | 'childFrom'
    | 'adultFrom'
    | 'departure'
    | 'commission'
    | 'maintenanceReason'
    | 'maintenanceUrl'
    | 'storyTitle'

const FIELD_STEP: Record<FieldKey, TourStep> = {
  name: 'basics',
  photo: 'basics',
  duration: 'basics',
  adultPrice: 'prices',
  childPrice: 'prices',
  infantPrice: 'prices',
  childFrom: 'prices',
  adultFrom: 'prices',
  departure: 'departures',
  commission: 'policies',
  maintenanceReason: 'departures',
  maintenanceUrl: 'departures',
  storyTitle: 'story',
}

interface TourErrors {
  fields: Partial<Record<FieldKey, string>>
  text: TextErrors
}

function editText(edit: TourEdit) {
  return tourText({
    ...textOf(edit),
    longStory: { title: edit.storyTitle, body: edit.storyBody },
  })
}

/**
 * M13 Edit tour as a stepper (owner, revision 2), and "Add tour" when `tour` is null. Text,
 * story, photo, duration, prices, age groups, commission and publishing are a draft in this
 * component's state; departures are saved one by one in their sheets, once the tour exists.
 * One rule set (`validate`) serves Next, Save and Review.
 */
export function useTourEditor(
  tour: Tour | null,
  step: TourStep,
  go: (step: TourStep) => void,
) {
  const { t, language: interfaceLanguage } = useLocale()
  const { mutateAsync: saveTour } = useCommand('tours', 'saveTour')
  const data = useTourRecords()
  const now = useDemoNow()
  const navigate = useNavigate()
  const rangeError = useRangeError()
  const fieldList = useFieldList()
  const archive = useProductArchive()
  const [edit, setEdit] = useState(() => (tour ? toEdit(tour) : blankEdit()))
  const [saved, setSaved] = useState(edit)
  // The step language switch opens on the interface language (owner, 15.10.2026).
  const [language, setLanguage] = useState<Language>(interfaceLanguage)
  const [attempt, setAttempt] = useState<{
    level: Level
    step?: TourStep
    n: number
  } | null>(null)
  const [focusCount, setFocusCount] = useState(0)
  const [furthest, setFurthest] = useState(() =>
    tour ? TOUR_STEPS.length - 1 : 0,
  )
  /** The save bar confirms a save itself: a toast would cover it on phones. */
  const [justSaved, setJustSaved] = useState(() => {
    return !!tour && takeJustCreated(tour.id)
  })
  const [storageFull, setStorageFull] = useState(false)
  /** The itinerary's selected stop, kept here so a language switch (which remounts the step) keeps it. */
  const [stopId, setStopId] = useState<string | null>(null)
  const isNew = !tour
  const archived = !!tour?.archivedAt
  const live = !!tour && tour.published && !tour.archivedAt

  // Creating walks the steps in order: an address that skips ahead starts again at the
  // furthest step reached.
  useEffect(() => {
    if (isNew && TOUR_STEPS.indexOf(step) > furthest)
      go(TOUR_STEPS[furthest])
  }, [isNew, step, furthest, go])

  const change = (patch: Partial<TourEdit>) =>
    setEdit(e => ({ ...e, ...patch }))
  const changeStory = (lang: Language, doc: RichNode | undefined) =>
    setEdit(e => ({ ...e, storyBody: { ...e.storyBody, [lang]: doc } }))

  const hasUpcoming
    = !!tour
      && data.departures.some(
        d =>
          d.tourId === tour.id
          && !d.closed
          && !d.cancelledAt
          && Date.parse(d.startsAt) > now.getTime(),
      )
  const missing = missingText(editText(edit))
  /** The draft as guests would see it once published: M13's preview. */
  const previewTour = (): Tour =>
    toTour(
      { ...edit, published: true },
      tour ?? emptyTour('preview', 'preview'),
    )

  const validate = (level: Level): TourErrors => {
    const strict = level !== 'draft'
    const transition = level === 'publish' || level === 'step'
    // A draft may keep empty prices (saved as 0); a published tour may not.
    const price = (value: number, min: number) =>
      strict
        ? Number.isFinite(value) && value >= min
          ? rangeError(value, min, 10_000)
          : t('products.stock.priceError')
        : undefined

    return {
      fields: {
        name:
          level === 'draft' && !hasAnyText(edit.name)
            ? t('products.draftName')
            : undefined,
        photo:
          transition && !edit.photo ? t('products.photo.required') : undefined,
        // Departures need the tour stored first, so Next while creating does not ask.
        departure:
          level === 'publish' && !hasUpcoming
            ? t(
                tour
                  ? 'products.departures.publishError'
                  : 'products.departures.saveFirst',
              )
            : undefined,
        storyTitle: storyNeedsTitle(edit.storyTitle, edit.storyBody)
          ? t('products.story.titleError')
          : undefined,
        duration: rangeError(edit.durationHours, 0.5, 12),
        adultPrice: price(edit.adultPrice, 0.01),
        childPrice: price(edit.childPrice, 0),
        infantPrice: price(edit.infantPrice, 0),
        childFrom: rangeError(edit.childFrom, 1, 17),
        adultFrom:
          rangeError(edit.adultFrom, 2, 25)
          ?? (edit.adultFrom > edit.childFrom
            ? undefined
            : t('products.prices.adultAgeError')),
        commission: rangeError(Math.round(edit.commissionRate * 100), 0, 50),
        // A draft may keep half-written maintenance text; saving a tour that guests see may not.
        maintenanceReason:
          strict
          && edit.maintenance.active
          && !hasAnyText(edit.maintenance.reason)
            ? t('products.maintenance.reasonError')
            : undefined,
        maintenanceUrl:
          strict
          && edit.maintenance.url.trim()
          && !safeHref(edit.maintenance.url.trim())
            ? t('products.maintenance.urlError')
            : undefined,
      },
      text: textErrors(editText(edit), level),
    }
  }

  /** Only one step's errors, for Next. */
  const only = (errors: TourErrors, keep: TourStep): TourErrors => ({
    fields: Object.fromEntries(
      Object.entries(errors.fields).filter(
        ([key]) => FIELD_STEP[key as FieldKey] === keep,
      ),
    ),
    text: {
      any: errors.text.any.filter(id => TOUR_TEXT_STEP[id] === keep),
      language: errors.text.language,
    },
  })

  const issuesIn = (errors: TourErrors, of: TourStep): string[] => {
    const out = Object.entries(errors.fields)
      .filter(([key, value]) => value && FIELD_STEP[key as FieldKey] === of)
      .map(([, value]) => value as string)
      .filter((value, i, all) => all.indexOf(value) === i)
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

  const firstStepWith = (errors: TourErrors) =>
    TOUR_STEPS.find(s => issuesIn(errors, s).length > 0)
  const hasIssues = (errors: TourErrors) =>
    TOUR_STEPS.some(s => issuesIn(errors, s).length > 0)

  /** Translation gaps: text one language has and the other does not. */
  const gapsIn = (of: TourStep): Issue[] => {
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

  const statusOf = (of: TourStep): StepStatus => {
    const index = TOUR_STEPS.indexOf(of)

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

  const issuesOf = (of: TourStep): Issue[] => {
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

  const commit = async (published: boolean) => {
    setStorageFull(false)
    const base: Tour
      = tour
        ?? emptyTour(
          newId('tour'),
          // C22 owns /tours/private-tour, so no tour may take that slug.
          uniqueSlug(
            edit.name,
            [...data.tours.map(item => item.slug), 'private-tour'],
            'tour',
          ),
        )
    // An archived tour is never published from here; "Restore as draft" comes first.
    const next = toTour({ ...edit, published: published && !archived }, base)

    try {
      await saveTour(next)
    }
    catch (error) {
      if (!(error instanceof StorageFullError))
        throw error
      setStorageFull(true)

      return
    }
    setAttempt(null)
    if (!tour) {
      markJustCreated(next.id)
      void navigate({
        to: '/store/products/tours/$tourId',
        params: { tourId: next.id },
        search: { step },
        replace: true,
      })

      return
    }
    const kept = { ...edit, published: next.published }

    setEdit(kept)
    setSaved(kept)
    setJustSaved(true)
  }

  const run = (level: Level, published: boolean, stay = false) => {
    const errors = validate(level)

    if (hasIssues(errors)) {
      setAttempt(a => ({ level, n: (a?.n ?? 0) + 1 }))
      const first = firstStepWith(errors)

      if (!stay && first && issuesIn(errors, step).length === 0)
        go(first)
      setFocusCount(n => n + 1)

      return
    }
    void commit(published)
  }

  return {
    isNew,
    archived,
    live,
    edit,
    previewTour,
    change,
    changeStory,
    missing,
    language,
    setLanguage,
    errors: (shown?.fields ?? {}) as Partial<Record<FieldKey, string>>,
    publishRefused: !!shown && attempt?.level === 'publish',
    textError: (id: TextFieldId, lang: Language, value: LocalizedText) =>
      textFieldError(shown?.text, missing, id, lang, value, {
        any: t('products.text.neededAny'),
        needed: l => t(`products.text.needed.${l}`),
      }),
    stepMissing: (of: TourStep) => {
      const ids = textIdsOf(of)

      return ids.length
        ? {
            en: missing.en.filter(id => ids.includes(id)),
            de: missing.de.filter(id => ids.includes(id)),
          }
        : undefined
    },
    statusOf,
    issuesOf,
    canGo: (to: TourStep) => !isNew || TOUR_STEPS.indexOf(to) <= furthest,
    go,
    /** Next while creating: this step's publish rules; when editing, just the next step. */
    next: () => {
      const index = TOUR_STEPS.indexOf(step)
      const to = TOUR_STEPS[index + 1]

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
      const index = TOUR_STEPS.indexOf(step)

      if (index > 0)
        go(TOUR_STEPS[index - 1])
    },
    saveDraft: () => run('draft', false),
    saveChanges: () => run(live ? 'live' : 'draft', live),
    publish: () => run('publish', true, true),
    unpublish: () => run('draft', false),
    restore: () => {
      if (tour)
        archive.restore('tour', tour.id)
      setEdit(e => ({ ...e, published: false }))
    },
    stopId,
    selectStop: setStopId,
    isDirty: JSON.stringify(edit) !== JSON.stringify(saved),
    hasErrors: !!shown && hasIssues(shown),
    storageFull,
    justSaved,
    focusCount,
  }
}

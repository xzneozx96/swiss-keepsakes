import type { StepView } from './step-shell'
import type { Language } from '@/contexts/locale-context'
import type { LocalizedText } from '@/features/catalog/types'
import type { TourStep } from '@/features/merchant/products/lib/search-params'

import type { Departure, Tour } from '@/features/tours/types'
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  NumberField,
  Switch,
  TextField,
} from '@heroui/react'
import { Link } from '@tanstack/react-router'

import { useId, useRef, useState } from 'react'
import { DateTile } from '@/components/date-tile'

import {
  BookingsIcon,
  ChevronRightIcon,
  ContentIcon,
  InfoIcon,
  PayLaterIcon,
  PhotoAddIcon,
  PlusIcon,
} from '@/components/icons'
import { Media } from '@/components/media'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { rowClass, RowIcon } from '@/features/account/components/settings-list'
import { DetailCard } from '@/features/merchant/order-detail/components/detail-card'
import {
  TOUR_STEPS,

} from '@/features/merchant/products/lib/search-params'
import { useTours } from '@/features/tours/hooks/use-tours'
import { departureSeats } from '@/features/tours/lib/selectors'
import { departurePhase } from '@/features/tours/merchant/lib/work'
import {
  phaseChip,
  ToneLine,
  useTourFormatting,
} from '@/features/tours/merchant/shared'

import { formatMoney, numberFormat } from '@/lib/format'
import { pickText } from '@/lib/localized'
import { isEmptyDoc } from '@/lib/rich-text'
import { useTourEditor } from '../hooks/use-tour-editor'
import { hasText, languageStatus, storyText } from '../lib/completeness'
import { NewDepartureSheet, SeatsSheet } from './departure-sheets'
import { DetailsStep } from './details-step'
import {
  EditorHeader,
  LocalizedField,
  useFocusFirstInvalid,
} from './editor-parts'
import { CommissionCard } from './gift-editor'
import { PhotoField } from './photo-field'
import { PracticalInfoStep } from './sections-editor'
import { Group, NavRow, rowHairline } from './settings-rows'
import {
  ArchivedNotice,
  ReviewOverview,
  ReviewRow,
  ReviewSection,
  StepBar,
  StepBody,
  StepLayout,
  useStepBar,
} from './step-shell'
import { StoryCard } from './story-card'
import { TourPreview } from './tour-preview'

type Editor = ReturnType<typeof useTourEditor>
type TextKey
  = | 'name'
    | 'summary'
    | 'description'
    | 'meetingPoint'
    | 'excluded'
    | 'conditions'
    | 'cancellationPolicy'

const TEXT_ID = {
  name: 'name',
  summary: 'summary',
  description: 'description',
  meetingPoint: 'meetingPoint',
  excluded: 'excluded',
  conditions: 'conditions',
  cancellationPolicy: 'cancellation',
} as const

/** One of the tour's plain texts in the step's language, with its stepper error. */
function TourField({
  editor,
  name,
  label,
  language,
  rows,
}: {
  editor: Editor
  name: TextKey
  label: string
  language: Language
  rows?: number
}) {
  const value = editor.edit[name]

  return (
    <LocalizedField
      error={
        editor.textError(TEXT_ID[name], language, value)
        ?? (name === 'name' ? editor.errors.name : undefined)
      }
      label={label}
      language={language}
      rows={rows}
      value={value}
      onChange={text => editor.change({ [name]: text })}
    />
  )
}

/** Step 1, in the step's language: the name, the summary and the description (C08, C09). */
function BasicsTextCard({
  editor,
  language,
}: {
  editor: Editor
  language: Language
}) {
  const { t } = useLocale()

  return (
    <DetailCard icon={ContentIcon} title={t('products.basics.text')}>
      <TourField
        editor={editor}
        label={t('products.field.name')}
        language={language}
        name="name"
      />
      <TourField
        editor={editor}
        label={t('products.field.summary')}
        language={language}
        name="summary"
      />
      <TourField
        editor={editor}
        label={t('products.field.description')}
        language={language}
        name="description"
        rows={4}
      />
    </DetailCard>
  )
}

function PriceField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  error?: string
}) {
  return (
    <NumberField
      fullWidth
      formatOptions={{ style: 'currency', currency: 'CHF' }}
      isInvalid={error !== undefined}
      minValue={0}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.Input className="tabular-nums" />
      </NumberField.Group>
      <FieldError>{error}</FieldError>
    </NumberField>
  )
}

function AgeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  error?: string
}) {
  return (
    <NumberField
      fullWidth
      formatOptions={{ maximumFractionDigits: 0 }}
      isInvalid={error !== undefined}
      maxValue={25}
      minValue={1}
      value={value}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <NumberField.Group>
        <NumberField.Input className="tabular-nums" />
      </NumberField.Group>
      <FieldError>{error}</FieldError>
    </NumberField>
  )
}

/** The tour's prices per age group, which every departure uses (C10, C11). */
function PricesCard({ editor }: { editor: Editor }) {
  const { t } = useLocale()
  const { edit, change, errors } = editor
  const uid = useId()

  const ok = (age: number) => Number.isFinite(age)
  const range = (from: number, to?: number) => {
    if (!ok(from) || (to !== undefined && (!ok(to) || to < from)))
      return '–'

    return to === undefined ? `${from}+` : `${from}–${to}`
  }

  const group = (
    id: string,
    title: string,
    ages: string,
    children: React.ReactNode,
  ) => (
    <div
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-4"
      role="group"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold" id={id}>
          {title}
        </h3>
        <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-sm font-medium tabular-nums">
          {ages === '–' ? ages : t('products.prices.ageRange', { range: ages })}
        </span>
      </div>
      <div className="grid grid-cols-2 items-start gap-3">{children}</div>
    </div>
  )

  return (
    <DetailCard icon={PayLaterIcon} title={t('products.prices.title')}>
      <p className="text-sm text-pretty text-muted">
        {t('products.prices.help')}
      </p>
      {group(
        `${uid}-adults`,
        t('products.prices.adults'),
        range(edit.adultFrom),
        <>
          <PriceField
            error={errors.adultPrice}
            label={t('products.prices.price')}
            value={edit.adultPrice}
            onChange={adultPrice => change({ adultPrice })}
          />
          <AgeField
            error={errors.adultFrom}
            label={t('products.prices.fromAge')}
            value={edit.adultFrom}
            onChange={adultFrom => change({ adultFrom })}
          />
        </>,
      )}
      {group(
        `${uid}-children`,
        t('products.prices.children'),
        range(edit.childFrom, edit.adultFrom - 1),
        <>
          <PriceField
            error={errors.childPrice}
            label={t('products.prices.price')}
            value={edit.childPrice}
            onChange={childPrice => change({ childPrice })}
          />
          <AgeField
            error={errors.childFrom}
            label={t('products.prices.fromAge')}
            value={edit.childFrom}
            onChange={childFrom => change({ childFrom })}
          />
        </>,
      )}
      {group(
        `${uid}-infants`,
        t('products.prices.infants'),
        range(0, edit.childFrom - 1),
        <>
          <PriceField
            error={errors.infantPrice}
            label={t('products.prices.price')}
            value={edit.infantPrice}
            onChange={infantPrice => change({ infantPrice })}
          />
        </>,
      )}
    </DetailCard>
  )
}

/**
 * Upcoming departures in the M05 ticket grammar: date tile, start, phase and seats as M05
 * counts them, then the payment rule and the price. An open or closed departure opens the
 * seats sheet; "Add departure" opens the new-departure sheet.
 */
/** Before its first save a tour has no id, so departures wait for it (M13 "Add tour"). */
function NoDeparturesYet({ error }: { error?: string }) {
  const { t } = useLocale()

  return (
    <Group title={t('products.departures.title')}>
      <p
        className="px-4 py-4 text-sm text-muted"
        data-error-focus={error ? 'true' : undefined}
        tabIndex={error ? -1 : undefined}
      >
        {t('products.departures.saveFirst')}
      </p>
      {error && (
        <p data-visible className="field-error px-4 pb-3" role="alert">
          {error}
        </p>
      )}
    </Group>
  )
}

/** One upcoming departure as a row: date tile, start, phase, seats booked and the payment rule. */
function DepartureRow({
  row,
  onPress,
}: {
  row: {
    departure: Departure
    phase: ReturnType<typeof departurePhase>
    seats: ReturnType<typeof departureSeats>
  }
  onPress: () => void
}) {
  const { t } = useLocale()
  const { date, weekday, day, month, dayMonth, time } = useTourFormatting()
  const { departure, phase, seats } = row

  return (
    <button
      aria-label={t('products.departures.edit', {
        date: date(departure.startsAt),
      })}
      className={`${rowClass} min-w-0`}
      type="button"
      onClick={onPress}
    >
      <DateTile
        date={{
          weekday: weekday(departure.startsAt),
          day: day(departure.startsAt),
          month: month(departure.startsAt),
        }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="font-medium tabular-nums">
            {time(departure.startsAt)}
          </span>
          <ToneLine tone={phaseChip[phase].tone}>
            {t(phaseChip[phase].key)}
          </ToneLine>
        </span>
        <span className="text-sm text-muted tabular-nums">
          {t('tourMerchant.seatsBooked', {
            count: seats.confirmed,
            capacity: seats.capacity,
          })}
          {' '}
          ·
          {' '}
          {t('tourMerchant.seatsDetail', {
            held: seats.held,
            free: seats.available,
          })}
        </span>
        <span
          aria-hidden
          className="h-1 overflow-hidden rounded-full bg-default"
        >
          <span
            className="block h-full rounded-full bg-foreground"
            style={{
              width: `${seats.capacity ? Math.min(100, (seats.confirmed / seats.capacity) * 100) : 0}%`,
            }}
          />
        </span>
        <span className="truncate text-xs text-muted tabular-nums">
          {t(`products.departures.policy.${departure.policy}`, {
            due: `${dayMonth(departure.balanceDueAt)}, ${time(departure.balanceDueAt)}`,
          })}
        </span>
      </span>
      <ChevronRightIcon aria-hidden className="shrink-0 text-muted" size={20} />
    </button>
  )
}

/**
 * Departures as a settings-style group (the account screen's pattern): the next three as rows,
 * the rest in a sheet, "Add departure" and the bookings link as rows. A row opens the seats
 * sheet; Add opens the new-departure sheet. Departures save as soon as they change.
 */
function DeparturesCard({ tour, error }: { tour: Tour, error?: string }) {
  const { t } = useLocale()
  const { data, departures, now } = useTours()
  const { money } = useTourFormatting()
  const [adding, setAdding] = useState(false)
  const [seatsFor, setSeatsFor] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const upcoming = departures
    .filter(d => d.tourId === tour.id)
    .map(departure => ({
      departure,
      phase: departurePhase(departure, tour, now),
      seats: departureSeats(data, departure.id, now),
    }))
    .filter(row => row.phase === 'open' || row.phase === 'closed')
    .sort(
      (a, b) =>
        Date.parse(a.departure.startsAt) - Date.parse(b.departure.startsAt),
    )
  const editing = upcoming.find(row => row.departure.id === seatsFor)
  const preview = upcoming.slice(0, 3)
  const separate = 'border-t border-separator/70'

  return (
    <Group title={t('products.departures.title')}>
      <div className="flex flex-col gap-1 px-4 py-3 text-sm text-muted">
        <p className="text-pretty">{t('products.departures.note')}</p>
        <p className="tabular-nums">
          {t('products.departure.prices', {
            prices: t('products.departures.price', {
              adult: money(tour.adultPrice),
              child: money(tour.childPrice),
            }),
          })}
        </p>
      </div>
      {preview.length
        ? (
            <ul className={separate}>
              {preview.map(row => (
                <li key={row.departure.id} className={rowHairline}>
                  <DepartureRow
                    row={row}
                    onPress={() => setSeatsFor(row.departure.id)}
                  />
                </li>
              ))}
            </ul>
          )
        : (
            <p className={`${separate} px-4 py-4 text-sm text-muted`}>
              {t('products.departures.none')}
            </p>
          )}
      {upcoming.length > preview.length && (
        <div className={separate}>
          <NavRow
            icon={BookingsIcon}
            title={t('products.departures.showAll', {
              count: upcoming.length,
            })}
            onPress={() => setListOpen(true)}
          />
        </div>
      )}
      <div
        className={separate}
        data-error-focus={error ? 'true' : undefined}
        tabIndex={error ? -1 : undefined}
      >
        <NavRow
          icon={PlusIcon}
          isInvalid={!!error}
          title={t('products.departures.add')}
          tone="accent"
          onPress={() => setAdding(true)}
        />
      </div>
      <div className={separate}>
        <Link className={`${rowClass} min-w-0`} to="/store/bookings">
          <RowIcon icon={BookingsIcon} />
          <span className="flex-1 font-medium">
            {t('products.departures.all')}
          </span>
          <ChevronRightIcon
            aria-hidden
            className="shrink-0 text-muted"
            size={20}
          />
        </Link>
      </div>
      {error && (
        <p data-visible className="field-error px-4 pb-3" role="alert">
          {error}
        </p>
      )}
      {listOpen && !editing && (
        <SheetFrame
          isOpen
          footer={(
            <Button fullWidth size="lg" onPress={() => setListOpen(false)}>
              {t('products.sections.sheetDone')}
            </Button>
          )}
          title={t('products.departures.title')}
          onClose={() => setListOpen(false)}
        >
          <ul className="-my-2 flex flex-col">
            {upcoming.map(row => (
              <li key={row.departure.id} className={rowHairline}>
                <DepartureRow
                  row={row}
                  onPress={() => setSeatsFor(row.departure.id)}
                />
              </li>
            ))}
          </ul>
        </SheetFrame>
      )}
      {adding && (
        <NewDepartureSheet
          departures={departures}
          now={now}
          tour={tour}
          onClose={() => setAdding(false)}
        />
      )}
      {editing && (
        <SeatsSheet
          key={editing.departure.id}
          departure={editing.departure}
          seats={editing.seats}
          onClose={() => setSeatsFor(null)}
        />
      )}
    </Group>
  )
}

/**
 * Maintenance (R21): pauses booking for this tour. Guests see the reason and an optional
 * link, and cannot book; bookings and departures that already exist are not changed, and the
 * status ends only when the merchant turns it off.
 */
function MaintenanceCard({ editor }: { editor: Editor }) {
  const { t } = useLocale()
  const { edit, change, errors } = editor
  const m = edit.maintenance
  const set = (patch: Partial<typeof m>) =>
    change({ maintenance: { ...m, ...patch } })

  return (
    <DetailCard
      icon={InfoIcon}
      id="tour-maintenance"
      title={t('products.maintenance.title')}
    >
      <p className="text-sm text-pretty text-muted">
        {t('products.maintenance.help')}
      </p>
      <Switch isSelected={m.active} onChange={active => set({ active })}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          {t('products.maintenance.switch')}
        </Switch.Content>
      </Switch>
      {(m.active || hasText(m.reason, 'en') || hasText(m.reason, 'de')) && (
        <>
          <LocalizedField
            error={errors.maintenanceReason}
            label={t('products.maintenance.reason.en')}
            language="en"
            rows={3}
            value={m.reason}
            onChange={reason => set({ reason })}
          />
          <LocalizedField
            label={t('products.maintenance.reason.de')}
            language="de"
            rows={3}
            value={m.reason}
            onChange={reason => set({ reason })}
          />
          <TextField
            fullWidth
            isInvalid={errors.maintenanceUrl !== undefined}
            value={m.url}
            onChange={url => set({ url })}
          >
            <Label>{t('products.maintenance.url')}</Label>
            <Input placeholder="https://" type="url" />
            <Description>{t('products.maintenance.urlHelp')}</Description>
            <FieldError>{errors.maintenanceUrl}</FieldError>
          </TextField>
          <TextField
            fullWidth
            value={m.expectedBack}
            onChange={expectedBack => set({ expectedBack })}
          >
            <Label>{t('products.maintenance.expected')}</Label>
            <Input type="date" />
            <Description>{t('products.maintenance.expectedHelp')}</Description>
          </TextField>
        </>
      )}
    </DetailCard>
  )
}

/** The main photo (C08, C09, lists) and the duration guests see on the card. */
function PhotoCard({ editor }: { editor: Editor }) {
  const { t } = useLocale()
  const { edit, change, errors } = editor

  return (
    <DetailCard
      icon={PhotoAddIcon}
      id="main-photo"
      title={t('products.photo.titleTour')}
    >
      <PhotoField
        error={errors.photo}
        help={t('products.photo.help.tour')}
        label={t('products.photo.label')}
        value={edit.photo}
        onChange={photo => change({ photo })}
      />
      <NumberField
        fullWidth
        formatOptions={{ maximumFractionDigits: 1 }}
        isInvalid={errors.duration !== undefined}
        maxValue={12}
        minValue={0.5}
        step={0.5}
        value={edit.durationHours}
        onChange={durationHours => change({ durationHours })}
      >
        <Label>{t('products.durationField')}</Label>
        <NumberField.Group>
          <NumberField.Input className="tabular-nums" />
        </NumberField.Group>
        <FieldError>{errors.duration}</FieldError>
      </NumberField>
    </DetailCard>
  )
}

/** Step 7: every step's facts and what it still needs, with "Edit"; then publish or save. */
function TourReview({
  editor,
  tour,
  steps,
}: {
  editor: Editor
  tour: Tour | null
  steps: StepView[]
}) {
  const { t, language, intlLocale } = useLocale()
  const { data, now } = useTours()
  const { edit } = editor
  const pick = (text: LocalizedText) => pickText(text, language).text
  const money = (chf: number) =>
    Number.isFinite(chf) ? formatMoney(chf, intlLocale) : '–'
  const none = t('products.review.none')
  const upcoming = tour
    ? data.departures.filter(
      d =>
        d.tourId === tour.id
        && !d.cancelledAt
        && Date.parse(d.startsAt) > now.getTime(),
    ).length
    : 0
  const storyLanguages = (['en', 'de'] as const).filter(
    l => edit.storyBody[l] && !isEmptyDoc(edit.storyBody[l]),
  )
  const section = (id: TourStep, rows: React.ReactNode) => {
    const index = TOUR_STEPS.indexOf(id)

    return (
      <ReviewSection
        key={id}
        index={index}
        issues={editor.issuesOf(id)}
        step={steps[index]}
        onEdit={() => editor.go(id)}
      >
        {rows}
      </ReviewSection>
    )
  }

  return (
    <>
      <ReviewOverview
        description={t(
          editor.archived
            ? 'products.review.archived.tour'
            : editor.live
              ? 'products.visibility.on.tour'
              : 'products.review.draft.tour',
        )}
        missing={editor.missing}
      />
      {section(
        'basics',
        <>
          <ReviewRow label={t('products.photo.label')}>
            {edit.photo
              ? (
                  <Media
                    alt=""
                    className="ms-auto size-12 rounded-lg"
                    photo={edit.photo}
                  />
                )
              : (
                  none
                )}
          </ReviewRow>
          <ReviewRow label={t('products.field.name')}>
            {pick(edit.name) || none}
          </ReviewRow>
          <ReviewRow label={t('products.durationField')}>
            {Number.isFinite(edit.durationHours) ? edit.durationHours : none}
          </ReviewRow>
          <ReviewRow label={t('products.field.summary')}>
            <span className="line-clamp-2">{pick(edit.summary) || none}</span>
          </ReviewRow>
        </>,
      )}
      {section(
        'details',
        <>
          <ReviewRow label={t('products.field.meetingPoint')}>
            {pick(edit.meetingPoint) || none}
          </ReviewRow>
          <ReviewRow label={t('products.field.itinerary')}>
            {edit.itinerary.length}
          </ReviewRow>
          <ReviewRow label={t('products.field.included')}>
            {
              edit.included.filter(
                i => hasText(i.text, 'en') || hasText(i.text, 'de'),
              ).length
            }
          </ReviewRow>
        </>,
      )}
      {section(
        'sections',
        <>
          <ReviewRow label={t('products.sections.title')}>
            {edit.sections.length}
          </ReviewRow>
          <ReviewRow label={t('products.keepsakes.review')}>
            {edit.keepsakeIds.length}
          </ReviewRow>
        </>,
      )}
      {section(
        'prices',
        <>
          <ReviewRow label={t('products.prices.adults')}>
            {money(edit.adultPrice)}
          </ReviewRow>
          <ReviewRow label={t('products.prices.children')}>
            {money(edit.childPrice)}
          </ReviewRow>
          <ReviewRow label={t('products.prices.infants')}>
            {money(edit.infantPrice)}
          </ReviewRow>
        </>,
      )}
      {section(
        'departures',
        <>
          <ReviewRow label={t('products.fact.upcoming')}>{upcoming}</ReviewRow>
          <ReviewRow label={t('products.maintenance.title')}>
            {t(
              edit.maintenance.active
                ? 'products.maintenance.on'
                : 'products.maintenance.off',
            )}
          </ReviewRow>
        </>,
      )}
      {section(
        'policies',
        <>
          <ReviewRow label={t('products.commission.rate')}>
            {numberFormat(intlLocale, {
              style: 'percent',
              maximumFractionDigits: 1,
            }).format(edit.commissionRate)}
          </ReviewRow>
          <ReviewRow label={t('products.field.cancellation')}>
            <span className="line-clamp-2">
              {pick(edit.cancellationPolicy) || none}
            </span>
          </ReviewRow>
        </>,
      )}
      {section(
        'story',
        <>
          <ReviewRow label={t('products.story.storyTitle')}>
            {pick(edit.storyTitle) || none}
          </ReviewRow>
          <ReviewRow label={t('products.review.storyIn')}>
            {storyLanguages.map(l => t(`products.lang.${l}`)).join(', ')
              || none}
          </ReviewRow>
        </>,
      )}
    </>
  )
}

/**
 * M13 Edit tour as a stepper (owner, revision 2): Basics, Itinerary & details, Prices & age
 * groups, Departures, Policies & commission, Story, Review & publish. Creating ("Add tour")
 * walks the steps with Back and Next; departures wait for the first save. Editing opens any
 * step and saves from any step.
 */
export function TourEditor({
  tour,
  step,
  onStep,
}: {
  tour: Tour | null
  step: TourStep
  onStep: (step: TourStep) => void
}) {
  const { t, language, intlLocale } = useLocale()
  const editor = useTourEditor(tour, step, onStep)
  const rootRef = useRef<HTMLDivElement>(null)
  const { edit, change } = editor
  const [previewing, setPreviewing] = useState(false)

  useFocusFirstInvalid(rootRef, editor.focusCount)

  const steps: StepView[] = TOUR_STEPS.map(id => ({
    id,
    label: t(`products.step.${id}`),
    status: editor.statusOf(id),
    missing: editor.stepMissing(id),
  }))
  const current = steps[TOUR_STEPS.indexOf(step)]
  const hours = numberFormat(intlLocale, {
    maximumFractionDigits: 1,
  }).format(
    Number.isFinite(edit.durationHours)
      ? edit.durationHours
      : (tour?.durationMinutes ?? 120) / 60,
  )
  const render = (lang: Language) => {
    switch (step) {
      case 'basics':
        return (
          <>
            <BasicsTextCard editor={editor} language={lang} />
            <PhotoCard editor={editor} />
          </>
        )
      case 'details':
        return <DetailsStep editor={editor} language={lang} />
      case 'sections':
        return <PracticalInfoStep editor={editor} language={lang} />
      case 'prices':
        return <PricesCard editor={editor} />
      case 'departures':
        return (
          <>
            <MaintenanceCard editor={editor} />
            {tour
              ? (
                  <DeparturesCard error={editor.errors.departure} tour={tour} />
                )
              : (
                  <NoDeparturesYet error={editor.errors.departure} />
                )}
          </>
        )
      case 'policies':
        return (
          <>
            <DetailCard
              icon={ContentIcon}
              title={t('products.field.cancellation')}
            >
              <TourField
                editor={editor}
                label={t('products.field.cancellation')}
                language={lang}
                name="cancellationPolicy"
                rows={4}
              />
            </DetailCard>
            <CommissionCard
              error={editor.errors.commission}
              value={edit.commissionRate}
              onChange={commissionRate => change({ commissionRate })}
            />
          </>
        )
      case 'story': {
        const error = editor.textError(
          'longStory',
          lang,
          storyText({ title: edit.storyTitle, body: edit.storyBody }),
        )

        return (
          <StoryCard
            body={edit.storyBody}
            bodyError={
              error
              && (!edit.storyBody[lang] || isEmptyDoc(edit.storyBody[lang]))
                ? error
                : undefined
            }
            kind="tour"
            language={lang}
            title={edit.storyTitle}
            titleError={
              editor.errors.storyTitle
              ?? (error && !edit.storyTitle[lang]?.trim() ? error : undefined)
            }
            onBody={(l, doc) => editor.changeStory(l, doc)}
            onTitle={storyTitle => change({ storyTitle })}
          />
        )
      }
      case 'review':
        return <TourReview editor={editor} steps={steps} tour={tour} />
    }
  }
  const bar = useStepBar({
    isNew: editor.isNew,
    isReview: step === 'review',
    isFirst: step === TOUR_STEPS[0],
    live: editor.live,
    archived: editor.archived,
    isDirty: editor.isDirty,
    hasErrors: editor.hasErrors,
    publishRefused: editor.publishRefused,
    storageFull: editor.storageFull,
    justSaved: editor.justSaved,
    actions: editor,
  })

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-5 lg:gap-6">
      <EditorHeader
        archived={editor.archived}
        languages={languageStatus(editor.missing)}
        maintenance={edit.maintenance.active}
        published={editor.live}
        subtitle={`${t('products.kind.tour')} · ${t('products.duration', { hours })}`}
        tab="tours"
        title={
          pickText(edit.name, language).text
          || (tour ? pickText(tour.name, language).text : t('products.new.tour'))
        }
      />
      {editor.archived && (
        <ArchivedNotice
          text={t('products.archivedNotice.tour')}
          onRestore={editor.restore}
        />
      )}
      <div
        aria-label={t('products.preview.mode')}
        className="flex w-fit gap-1 rounded-full bg-surface-secondary p-1"
        role="group"
      >
        <Button
          aria-pressed={!previewing}
          size="sm"
          variant={previewing ? 'tertiary' : 'primary'}
          onPress={() => setPreviewing(false)}
        >
          {t('products.preview.edit')}
        </Button>
        <Button
          aria-pressed={previewing}
          size="sm"
          variant={previewing ? 'primary' : 'tertiary'}
          onPress={() => setPreviewing(true)}
        >
          {t('products.preview.show')}
        </Button>
      </div>
      {previewing
        ? (
            <TourPreview
              tour={editor.previewTour()}
              onClose={() => setPreviewing(false)}
            />
          )
        : (
            <StepLayout
              canGo={id => editor.canGo(id as TourStep)}
              current={step}
              steps={steps}
              onGo={id => onStep(id as TourStep)}
            >
              <StepBody
                language={editor.language}
                render={render}
                step={current}
                onLanguage={editor.setLanguage}
              />
              <StepBar {...bar} />
            </StepLayout>
          )}
    </div>
  )
}

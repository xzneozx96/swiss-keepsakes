import type { CalendarDate, Time } from '@internationalized/date'
import type {
  Departure,
  Tour,
  TourPaymentPolicy,
} from '@sk/domain/bookings'

import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  TimeField,
  toast,
} from '@heroui/react'
import {
  CalendarDateTime,
  parseDate,
  parseTime,
  toZoned,
} from '@internationalized/date'
import { zurichDate } from '@sk/domain/catalog'

import { dateTimeFormat } from '@sk/domain/shared'

import { useState } from 'react'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { useTourFormatting } from '@/features/tours/merchant/shared'
import { useDepartureActions } from '../hooks/use-tour-editor'

const ZONE = 'Europe/Zurich'

/** Same choice card as M08 and the M04 sheets: ink frame when selected. */
const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

const policies: TourPaymentPolicy[] = ['full', 'deposit', 'later']

/** Zurich wall-clock time as an ISO instant; the offset follows summer time (ends 25.10.2026). */
function zurichInstant(date: CalendarDate, hour: number, minute: number) {
  return toZoned(
    new CalendarDateTime(date.year, date.month, date.day, hour, minute),
    ZONE,
  ).toAbsoluteString()
}

/** "Price per person: Adults CHF 89.00 · Children CHF 45.00." with the tour's prices. */
function PriceNote({ tour }: { tour: Tour }) {
  const { t } = useLocale()
  const { money } = useTourFormatting()

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface-secondary p-3 text-sm">
      <p className="tabular-nums">
        {t('products.departure.prices', {
          prices: t('products.departures.price', {
            adult: money(tour.adultPrice),
            child: money(tour.childPrice),
          }),
        })}
      </p>
      <p className="text-xs text-muted">{t('products.departure.pricesHelp')}</p>
    </div>
  )
}

/**
 * New departure (M13): date, start, seats and payment policy. Saved straight into the tour
 * data that M05 and the guest C10 sheet read, so it appears there with the same seats.
 * The balance is due like the seeded departures: at the start for "full", otherwise 18:00
 * the day before (or the start, when that time has already passed).
 */
export function NewDepartureSheet({
  tour,
  departures,
  now,
  onClose,
}: {
  tour: Tour
  departures: Departure[]
  now: Date
  onClose: () => void
}) {
  const { t } = useLocale()
  const { add } = useDepartureActions()
  const latest = [...departures]
    .filter(d => d.tourId === tour.id)
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt))[0]
  const today = parseDate(zurichDate(now))
  const [date, setDate] = useState<CalendarDate | null>(null)
  const [time, setTime] = useState<Time>(() =>
    parseTime(
      latest
        ? dateTimeFormat('en-GB', {
            timeZone: ZONE,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          }).format(new Date(latest.startsAt))
        : '10:00',
    ),
  )
  const [capacity, setCapacity] = useState(latest?.capacity ?? 12)
  const [policy, setPolicy] = useState<TourPaymentPolicy>(
    latest?.policy ?? 'full',
  )
  const [tried, setTried] = useState(false)

  const startsAt = date ? zurichInstant(date, time.hour, time.minute) : null
  const errors = {
    date: !date
      ? t('products.departure.dateError')
      : startsAt && Date.parse(startsAt) <= now.getTime()
        ? t('products.departure.past')
        : undefined,
    capacity:
      Number.isInteger(capacity) && capacity >= 1 && capacity <= 200
        ? undefined
        : t('products.range', { min: 1, max: 200 }),
  }

  const save = () => {
    if (!date || !startsAt || errors.date || errors.capacity) {
      setTried(true)

      return
    }
    const dayBefore = zurichInstant(date.subtract({ days: 1 }), 18, 0)
    const balanceDueAt
      = policy === 'full' || Date.parse(dayBefore) <= now.getTime()
        ? startsAt
        : dayBefore

    add({
      id: `${tour.id}-${Date.now().toString(36)}`,
      tourId: tour.id,
      startsAt,
      capacity,
      policy,
      balanceDueAt,
      closed: false,
    })
    toast.success(t('products.departure.added'))
    onClose()
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth onPress={save}>
            {t('products.departure.add')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t('products.departure.newTitle')}
      onClose={onClose}
    >
      <DatePicker
        className="w-full"
        isInvalid={tried && errors.date !== undefined}
        minValue={today}
        value={date}
        onChange={setDate}
      >
        <Label className="text-heading">{t('products.departure.date')}</Label>
        <DateField.Group fullWidth>
          <DateField.Input>
            {segment => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger aria-label={t('products.departure.datePick')}>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <FieldError>{errors.date}</FieldError>
        <DatePicker.Popover>
          <Calendar aria-label={t('products.departure.date')} minValue={today}>
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {day => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {day => <Calendar.Cell date={day} />}
              </Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>

      <TimeField
        fullWidth
        hourCycle={24}
        value={time}
        onChange={v => v && setTime(v)}
      >
        <Label className="text-heading">{t('products.departure.time')}</Label>
        <TimeField.Group>
          <TimeField.Input>
            {segment => <TimeField.Segment segment={segment} />}
          </TimeField.Input>
        </TimeField.Group>
      </TimeField>

      <NumberField
        fullWidth
        formatOptions={{ maximumFractionDigits: 0 }}
        isInvalid={tried && errors.capacity !== undefined}
        maxValue={200}
        minValue={1}
        value={capacity}
        onChange={setCapacity}
      >
        <Label className="text-heading">{t('products.departure.seats')}</Label>
        <NumberField.Group>
          <NumberField.Input className="tabular-nums" />
        </NumberField.Group>
        <FieldError>{errors.capacity}</FieldError>
      </NumberField>

      <RadioGroup
        value={policy}
        onChange={v => setPolicy(v as TourPaymentPolicy)}
      >
        <Label className="text-heading">
          {t('products.departure.payment')}
        </Label>
        {policies.map(p => (
          <Radio key={p} className={choiceCard} value={p}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <span className="flex flex-col">
                {t(`products.departure.policy.${p}`)}
                <span className="text-xs text-muted">
                  {t(`products.departure.paymentHelp.${p}`)}
                </span>
              </span>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>

      <PriceNote tour={tour} />
    </SheetFrame>
  )
}

/**
 * Seats of an upcoming departure. A4: never below the seats already booked or held, the
 * same count M05 and C10 use. Date and time stay fixed, because bookings copy the start.
 */
export function SeatsSheet({
  departure,
  seats,
  onClose,
}: {
  departure: Departure
  seats: { confirmed: number, held: number, available: number }
  onClose: () => void
}) {
  const { t } = useLocale()
  const { date } = useTourFormatting()
  const { setCapacity: saveCapacity } = useDepartureActions()
  const [capacity, setCapacity] = useState(departure.capacity)
  const [tried, setTried] = useState(false)
  const taken = seats.confirmed + seats.held
  const error
    = !Number.isInteger(capacity) || capacity < 1 || capacity > 200
      ? t('products.range', { min: 1, max: 200 })
      : capacity < taken
        ? t('products.departure.belowTaken', { taken })
        : undefined

  const save = () => {
    if (error) {
      setTried(true)

      return
    }
    saveCapacity(departure.id, capacity)
    toast.success(t('products.departure.updated'))
    onClose()
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth onPress={save}>
            {t('products.departure.saveSeats')}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t('merchantOrder.sheet.back')}
          </Button>
        </>
      )}
      title={t('products.departure.seatsTitle')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3">
        <p className="font-medium tabular-nums">{date(departure.startsAt)}</p>
        <dl className="flex flex-col gap-2 rounded-2xl bg-surface-secondary p-3 text-sm">
          {[
            [t('tourMerchant.booked'), seats.confirmed],
            [t('tourMerchant.holds'), seats.held],
            [t('tourMerchant.available'), seats.available],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="text-muted">{label}</dt>
              <dd className="tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <NumberField
        fullWidth
        formatOptions={{ maximumFractionDigits: 0 }}
        isInvalid={tried && error !== undefined}
        maxValue={200}
        minValue={1}
        value={capacity}
        onChange={setCapacity}
      >
        <Label className="text-heading">{t('products.departure.seats')}</Label>
        <NumberField.Group>
          <NumberField.Input className="tabular-nums" />
        </NumberField.Group>
        <Description>{t('products.departure.taken', { taken })}</Description>
        <FieldError>{error}</FieldError>
      </NumberField>
    </SheetFrame>
  )
}

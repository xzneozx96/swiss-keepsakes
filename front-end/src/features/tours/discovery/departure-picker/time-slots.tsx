import type { KeyboardEvent } from 'react'
import type { DaySlots, PickerFormat, Slot, SlotChoice } from './model'
import type { TourPaymentPolicy } from '@/features/tours/types'

import { Radio, RadioGroup } from '@heroui/react'
import { parseDate } from '@internationalized/date'
import { useRef, useState } from 'react'

import { SelectedIcon } from '@/components/icons'
import { firstFitting, LOW_SEATS } from './model'

import { pillClass } from './parts'

const COLS = 4
const isMorning = (slot: Slot) => slot.time < '12:00'

/**
 * The departures of one day. One departure: a single row with its time, places and payment
 * rule. A few: one grid of time chips. Many (more than a row) spanning both halves of the
 * day: Morning and Afternoon pills over the grid.
 */
export function TimeSlots({
  booking,
  f,
  policyText,
}: {
  booking: SlotChoice
  f: PickerFormat
  policyText?: (policy: TourPaymentPolicy) => string
}) {
  const day = booking.dayInfo

  if (!day)
    return null
  const halves
    = day.slots.length > COLS
      && day.slots.some(isMorning)
      && day.slots.some(s => !isMorning(s))

  return (
    <div className="flex flex-col gap-3">
      {day.slots.length === 1
        ? (
            <SingleSlot
              booking={booking}
              f={f}
              policyText={policyText}
              slot={day.slots[0]}
            />
          )
        : halves
          ? (
              <Halves key={day.day} booking={booking} day={day} f={f} />
            )
          : (
              <ChipGroup booking={booking} f={f} slots={day.slots} />
            )}
      {day.slots.length > 1 && <NoFitNote booking={booking} day={day} f={f} />}
    </div>
  )
}

/** A day's only departure, chosen with the day: time, places and payment rule in one row. */
function SingleSlot({
  booking,
  slot,
  f,
  policyText,
}: {
  booking: SlotChoice
  slot: Slot
  f: PickerFormat
  policyText?: (policy: TourPaymentPolicy) => string
}) {
  const chosen = booking.slotId === slot.id
  const soldOut = slot.seats === 0

  return (
    <div
      aria-live="polite"
      className={`relative flex min-h-13 flex-col gap-0.5 rounded-2xl border-2 px-4 py-3 text-sm tabular-nums ${
        chosen
          ? 'border-accent bg-accent-soft text-accent-soft-foreground'
          : 'border-transparent bg-default text-muted'
      }`}
    >
      <span
        className={`text-base font-semibold ${soldOut ? 'font-normal line-through' : ''}`}
      >
        {slot.time}–{slot.end}
      </span>
      <span>
        {f.seatsLeft(slot.seats)}
        {policyText && !soldOut && ` · ${policyText(slot.policy)}`}
      </span>
      {chosen && (
        <SelectedIcon
          aria-hidden
          className="absolute -end-1 -top-1 size-4.5 rounded-full bg-surface text-accent"
          weight="Filled"
        />
      )}
    </div>
  )
}

function NoFitNote({
  booking,
  day,
  f,
}: {
  booking: SlotChoice
  day: DaySlots
  f: PickerFormat
}) {
  if (firstFitting(day, booking.used))
    return null
  const next = booking.nextFit

  if (!next) {
    return (
      <p className="text-sm text-foreground">
        {f.t('noFitNone', { n: booking.used })}
      </p>
    )
  }
  const label = `${f.day(parseDate(next.day))}, ${next.time}`
  const [before] = f
    .t('noFit', { n: booking.used, next: '\u0000' })
    .split('\u0000')

  return (
    <p className="text-sm text-foreground">
      {before}
      <button
        className="min-h-11 font-semibold text-foreground underline underline-offset-4 focus-visible:focus-ring"
        type="button"
        onClick={() => {
          booking.setDay(parseDate(next.day))
          booking.setSlotId(next.id)
        }}
      >
        {label}
      </button>
    </p>
  )
}

type Half = 'am' | 'pm'

/** Morning | Afternoon as two pills; the grid keeps the height of the fuller half. */
function Halves({
  booking,
  day,
  f,
}: {
  booking: SlotChoice
  day: DaySlots
  f: PickerFormat
}) {
  const morning = day.slots.filter(isMorning)
  const afternoon = day.slots.filter(s => !isMorning(s))
  const anchor
    = booking.slot?.day === day.day
      ? booking.slot
      : day.slots.find(s => s.seats > 0)
  const [half, setHalf] = useState<Half>(() =>
    anchor && !isMorning(anchor) ? 'pm' : 'am')
  const rows = Math.ceil(Math.max(morning.length, afternoon.length) / COLS)
  const shown = half === 'am' ? morning : afternoon
  const refsRef = useRef<Record<Half, HTMLButtonElement | null>>({
    am: null,
    pm: null,
  })
  const halves = (
    [
      ['am', f.t('morning'), morning],
      ['pm', f.t('afternoon'), afternoon],
    ] as const
  ).filter(([, , slots]) => slots.length > 0)
  // Radio keys: arrows move and choose, as in any radio group.
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return
    event.preventDefault()
    const keys = halves.map(([key]) => key)
    const step = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1
    const next
      = keys[(keys.indexOf(half) + step + keys.length) % keys.length] ?? half

    setHalf(next)
    refsRef.current[next]?.focus()
  }

  return (
    <>
      <div aria-label={f.t('time')} className="flex gap-2" role="radiogroup">
        {halves.map(([key, label, slots]) => {
          const full = slots.every(s => s.seats === 0)
          const active = half === key

          return (
            <button
              key={key}
              ref={(el) => {
                refsRef.current[key] = el
              }}
              aria-checked={active}
              className={pillClass(active, full)}
              role="radio"
              tabIndex={active ? 0 : -1}
              type="button"
              onClick={() => setHalf(key)}
              onKeyDown={onKeyDown}
            >
              {label}
              {full && (
                <span className="font-normal"> · {f.t('halfFull')}</span>
              )}
            </button>
          )
        })}
      </div>
      <div style={{ minHeight: rows * 52 + (rows - 1) * 8 }}>
        <ChipGroup booking={booking} f={f} slots={shown} />
      </div>
    </>
  )
}

/** One radio group of time chips; arrow keys move between free times. */
function ChipGroup({
  booking,
  f,
  slots,
}: {
  booking: SlotChoice
  f: PickerFormat
  slots: Slot[]
}) {
  const value = slots.some(s => s.id === booking.slotId)
    ? booking.slotId
    : ''

  return (
    <RadioGroup
      aria-label={f.t('time')}
      className="grid grid-cols-4 gap-2"
      value={value}
      onChange={id => booking.setSlotId(id)}
    >
      {slots.map(slot => (
        <TimeChip key={slot.id} f={f} slot={slot} used={booking.used} />
      ))}
    </RadioGroup>
  )
}

function TimeChip({
  slot,
  used,
  f,
}: {
  slot: Slot
  used: number
  f: PickerFormat
}) {
  const soldOut = slot.seats === 0
  const warn = !soldOut && (slot.seats <= LOW_SEATS || slot.seats < used)

  return (
    <Radio
      aria-label={f.t('slotLabel', {
        from: slot.time,
        to: slot.end,
        seats: f.seatsLeft(slot.seats),
      })}
      className={`group !mt-0 flex h-13 min-w-0 items-center justify-center rounded-xl border-2 px-1 transition-colors has-data-[focus-visible=true]:focus-ring data-[disabled=true]:opacity-100 data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft ${
        soldOut
          ? 'border-transparent bg-default'
          : warn
            ? 'border-transparent bg-warning-soft hover:bg-warning-soft-hover'
            : 'border-transparent bg-default hover:bg-default-hover'
      }`}
      isDisabled={soldOut}
      value={slot.id}
    >
      <Radio.Content className="flex flex-col items-center gap-0 text-center">
        <span
          className={`text-[15px] leading-5 font-semibold tabular-nums group-data-[selected=true]:text-accent-soft-foreground ${
            soldOut ? 'font-normal text-muted line-through' : 'text-foreground'
          }`}
        >
          {slot.time}
        </span>
        {warn && (
          <span className="text-[11px] leading-4 font-semibold text-warning-soft-foreground tabular-nums group-data-[selected=true]:text-accent-soft-foreground">
            {f.t('left', { n: slot.seats })}
          </span>
        )}
      </Radio.Content>
    </Radio>
  )
}

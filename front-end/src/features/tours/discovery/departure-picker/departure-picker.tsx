import type { CalendarDate } from '@internationalized/date'
import type { ReactNode } from 'react'
import type { PickerFormat, SlotChoice, SlotModel } from './model'
import type { TourPaymentPolicy } from '@/features/tours/types'

import { Calendar } from '@heroui/react'
import { useState } from 'react'

import { DayCell, isBookable } from './day-cell'
import { Legend, LiveRegion } from './parts'
import { TimeSlots } from './time-slots'

/** What the tour gives the picker beyond its departures. */
export interface DeparturePickerConfig {
  /** The chosen departure's payment rule, e.g. "30% deposit when booking". */
  policyText?: (policy: TourPaymentPolicy) => string
  /** One legend line, shown only when departures differ in their payment rule. */
  policyVaries?: string
  /** Shown instead of the grid when the tour has no upcoming date. */
  empty: ReactNode
  /** Shown under the grid when every upcoming date is sold out. */
  soldOut?: ReactNode
}

/**
 * The tour's departure picker: a month grid that opens on the month of the choice, then the
 * chosen day's start times (one card when the day has one departure, chips when it has
 * several).
 */
export function DeparturePicker({
  model,
  choice,
  f,
  config,
}: {
  model: SlotModel
  choice: SlotChoice
  f: PickerFormat
  config: DeparturePickerConfig
}) {
  const title = f.t('date')
  const [focused, setFocused] = useState<CalendarDate>(
    () => choice.day ?? model.bookable[0]?.date ?? model.today,
  )
  const policies = new Set(model.slots.map(s => s.policy))
  const single = choice.dayInfo?.slots.length === 1
  const monthHasDates = model.days.some(
    d => d.date.year === focused.year && d.date.month === focused.month,
  )

  return (
    <section className="flex flex-col gap-3 text-foreground">
      <h3 className="text-heading">{title}</h3>
      {model.days.length === 0
        ? (
            config.empty
          )
        : (
            <>
              <Calendar
                aria-label={title}
                className="w-full max-w-none"
                firstDayOfWeek="mon"
                focusedValue={focused}
                isDateUnavailable={d => !isBookable(model)(d)}
                maxValue={model.lastDay}
                minValue={model.firstDay}
                value={choice.day}
                onChange={d => choice.setDay(d)}
                onFocusChange={setFocused}
              >
                <Calendar.Header className="pb-1">
                  <Calendar.Heading className="text-base font-semibold" />
                  <Calendar.NavButton
                    className="size-11 rounded-full"
                    slot="previous"
                  />
                  <Calendar.NavButton
                    className="size-11 rounded-full"
                    slot="next"
                  />
                </Calendar.Header>
                {/* Six week rows always, so a month change never moves what is below. */}
                <Calendar.Grid className="grid-rows-[auto_repeat(6,52px)]">
                  <Calendar.GridHeader>
                    {weekday => (
                      <Calendar.HeaderCell className="pb-1 text-xs">
                        {weekday}
                      </Calendar.HeaderCell>
                    )}
                  </Calendar.GridHeader>
                  <Calendar.GridBody>
                    {date => <DayCell date={date} f={f} model={model} />}
                  </Calendar.GridBody>
                </Calendar.Grid>
              </Calendar>
              {model.bookable.length === 0 && config.soldOut}
              <div className="flex flex-col gap-3">
                {!monthHasDates && (
                  <p className="text-sm text-muted">{f.t('noDates')}</p>
                )}
                <Legend f={f} />
                {config.policyVaries && policies.size > 1 && (
                  <p className="text-xs text-muted">{config.policyVaries}</p>
                )}
                {choice.dayInfo && (
                  <p className="text-sm font-semibold">
                    {f.day(choice.dayInfo.date)}
                  </p>
                )}
                <TimeSlots booking={choice} f={f} policyText={config.policyText} />
                {!single && choice.day && (
                  <div aria-live="polite" className="flex flex-col gap-0.5 text-sm">
                    {choice.slot
                      ? (
                          <>
                            <p className="text-muted">
                              {choice.slot.time}–{choice.slot.end} ·{' '}
                              {f.seatsLeft(choice.slot.seats)}
                            </p>
                            {config.policyText && (
                              <p className="font-medium">
                                {config.policyText(choice.slot.policy)}
                              </p>
                            )}
                          </>
                        )
                      : (
                          <p className="text-muted">{f.t('noTime')}</p>
                        )}
                  </div>
                )}
                {!choice.day && (
                  <p className="text-sm text-muted">{f.t('noDay')}</p>
                )}
                <LiveRegion text={choice.announcement} />
              </div>
            </>
          )}
    </section>
  )
}

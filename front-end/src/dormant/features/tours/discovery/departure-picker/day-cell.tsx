import type { CalendarDate, DateValue } from '@internationalized/date'
import type { PickerFormat, SlotModel } from './model'

import { Calendar } from '@heroui/react'
import { toCalendarDate } from '@internationalized/date'
import { useLayoutEffect, useRef } from 'react'

/**
 * React Aria computes the cell's aria-label and drops ours, so the day with its places is
 * written onto the cell button after every render.
 */
function CellName({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    ref.current?.closest('[role="button"]')?.setAttribute('aria-label', label)
  })

  return <span ref={ref} hidden />
}

/** One month-grid day: the number in a rounded pill, with a dot or the seats left below. */
export function DayCell({
  date,
  model,
  f,
}: {
  date: CalendarDate
  model: SlotModel
  f: PickerFormat
}) {
  const info = model.byDay.get(date.toString())
  const isToday = date.compare(model.today) === 0
  const state = info?.state
  const fits = state === 'open' || state === 'low'
  const pill = fits
    ? 'bg-surface-secondary font-semibold text-foreground group-hover:bg-default-hover group-data-[selected=true]:bg-accent group-data-[selected=true]:text-accent-foreground'
    : `font-normal text-muted ${state === 'soldout' ? 'line-through' : ''}`
  const label = [f.fullDate(date), info ? f.seatsLeft(info.seats) : '']
    .filter(Boolean)
    .join(', ')

  return (
    <Calendar.Cell
      className="group relative flex h-13 w-full min-w-0 aspect-auto items-stretch rounded-[14px] bg-transparent p-0.5 hover:bg-transparent data-[disabled=true]:no-underline data-[disabled=true]:opacity-100 data-[outside-month=true]:invisible data-[pressed=true]:bg-transparent data-[selected=true]:bg-transparent data-[today=true]:bg-transparent data-[today=true]:text-inherit data-[unavailable=true]:opacity-100"
      date={date}
    >
      {({ formattedDate, isOutsideMonth, isSelected }) =>
        isOutsideMonth
          ? null
          : (
              <>
                <span
                  // Today's ring follows the demo clock; HeroUI's own marks the real date.
                  className={`relative flex w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[15px] tabular-nums ${pill} ${
                    isToday ? 'ring-[1.5px] ring-foreground ring-inset' : ''
                  }`}
                >
                  <span className="leading-5">{formattedDate}</span>
                  <span
                    aria-hidden
                    className="flex h-3 items-center gap-0.5 text-[10px] leading-3 font-semibold no-underline"
                  >
                    {state === 'open' && (
                      <span
                        className={`size-1 rounded-full ${isSelected ? 'bg-accent-foreground' : 'bg-foreground'}`}
                      />
                    )}
                    {state === 'low' && (
                      <>
                        <span
                          className={`size-1 shrink-0 rounded-full ${isSelected ? 'bg-accent-foreground' : 'bg-(--status-warning-fill)'}`}
                        />
                        <span
                          className={`whitespace-nowrap ${isSelected ? 'text-accent-foreground' : 'text-warning'}`}
                        >
                          {f.t('left', { n: info!.seats })}
                        </span>
                      </>
                    )}
                  </span>
                </span>
                <CellName label={label} />
              </>
            )}
    </Calendar.Cell>
  )
}

/** A day with at least one free departure. */
export function isBookable(model: SlotModel) {
  return (date: DateValue) => {
    const state = model.byDay.get(toCalendarDate(date).toString())?.state

    return state === 'open' || state === 'low'
  }
}

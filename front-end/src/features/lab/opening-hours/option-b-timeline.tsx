import type { HoursSpan } from '@/features/places/lib/form'

import { Button, Popover } from '@heroui/react'
import { useRef } from 'react'

import { ChevronDownIcon } from '@/components/icons'
import { copy } from './copy'
import { DAYS, minutesOf, setDay, span, spansOf, STEP, timeOf } from './model'
import { DayRanges } from './option-a-rows'

const FROM = 6 * 60
const TO = 24 * 60
const LAST_END = TO - STEP
const HOUR_MARKS = [6, 9, 12, 15, 18, 21]

const percent = (minutes: number) => `${((Math.min(Math.max(minutes, FROM), TO) - FROM) / (TO - FROM)) * 100}%`

function snap(minutes: number) {
  return Math.round(minutes / STEP) * STEP
}

/** A bar edge: drag it, or focus it and press the arrow keys, in 15 minute steps. */
function Edge({ side, label, minutes, min, max, trackRef, onMove }: {
  side: 'start' | 'end'
  label: string
  minutes: number
  min: number
  max: number
  trackRef: React.RefObject<HTMLDivElement | null>
  onMove: (minutes: number) => void
}) {
  const clamp = (m: number) => Math.min(Math.max(snap(m), min), max)

  return (
    <span
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={minutes}
      aria-valuetext={timeOf(minutes)}
      className={`absolute inset-y-0 z-10 flex w-5 cursor-ew-resize touch-none items-center justify-center outline-none focus-visible:focus-ring ${side === 'start' ? '-start-1' : '-end-1'}`}
      role="slider"
      tabIndex={0}
      onKeyDown={(event) => {
        const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? STEP : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -STEP : 0

        if (step) {
          event.preventDefault()
          onMove(clamp(minutes + step))
        }
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const track = trackRef.current

        if (!track || !event.currentTarget.hasPointerCapture(event.pointerId))
          return

        const rect = track.getBoundingClientRect()
        const next = clamp(FROM + ((event.clientX - rect.left) / rect.width) * (TO - FROM))

        if (next !== minutes)
          onMove(next)
      }}
    >
      <span aria-hidden className="h-4 w-1 rounded-full bg-accent-foreground/80" />
    </span>
  )
}

function Track({ day, hours, onChange }: { day: number, hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const spans = spansOf(hours, day)
  const name = copy.dayNames[day]!
  const write = (next: HoursSpan[]) => onChange(setDay(hours, day, next))
  const text = spans.length ? spans.map(s => `${s.opens}–${s.closes}`).join(', ') : copy.closed

  return (
    <li className="flex items-center gap-2">
      <Popover>
        <Button aria-label={`${copy.editDay(name)}: ${text}`} className="h-9 w-14 shrink-0 justify-between px-2 max-lg:h-11" size="sm" variant="ghost">
          <span className="font-medium">{copy.days[day]}</span>
          <ChevronDownIcon aria-hidden size={12} />
        </Button>
        <Popover.Content className="w-80 max-w-[calc(100vw-2rem)]" placement="bottom start">
          <Popover.Dialog aria-label={copy.dayPopoverTitle(name)} className="flex flex-col gap-3 p-3">
            <p className="text-sm font-medium">{copy.dayPopoverTitle(name)}</p>
            <DayRanges day={day} hours={hours} onChange={onChange} />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      <div
        ref={trackRef}
        className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-lg border border-separator max-lg:h-11"
        role="group"
        aria-label={copy.trackLabel(name, text)}
      >
        {HOUR_MARKS.map(h => (
          <span key={h} aria-hidden className="absolute inset-y-0 w-px bg-separator" style={{ left: percent(h * 60) }} />
        ))}
        {spans.length === 0 && (
          <button
            aria-label={`${copy.open}: ${name}`}
            className="absolute inset-0 flex items-center ps-3 text-xs text-muted outline-none focus-visible:focus-ring"
            type="button"
            onClick={() => write([span(day, '09:00', '18:00')])}
          >
            {copy.closed}
          </button>
        )}
        {spans.map((range, i) => {
          const before = spans[i - 1]
          const after = spans[i + 1]
          const start = minutesOf(range.opens)
          const end = minutesOf(range.closes)
          const update = (changes: Partial<HoursSpan>) => write(spans.map(s => (s.key === range.key ? { ...s, ...changes } : s)))

          return (
            <div
              key={range.key}
              className="absolute inset-y-1 rounded-md bg-accent text-[11px] font-medium text-accent-foreground"
              style={{ left: percent(start), right: `calc(100% - ${percent(end)})` }}
            >
              {end - start >= 5 * 60 && (
                <span className="pointer-events-none flex h-full items-center justify-center overflow-hidden px-3 whitespace-nowrap tabular-nums max-lg:hidden">
                  {range.opens}–{range.closes}
                </span>
              )}
              <Edge
                label={copy.barHandleStart(name)}
                max={end - STEP}
                min={before ? minutesOf(before.closes) + STEP : FROM}
                minutes={start}
                side="start"
                trackRef={trackRef}
                onMove={m => update({ opens: timeOf(m) })}
              />
              <Edge
                label={copy.barHandleEnd(name)}
                max={after ? minutesOf(after.opens) - STEP : LAST_END}
                min={start + STEP}
                minutes={end}
                side="end"
                trackRef={trackRef}
                onMove={m => update({ closes: timeOf(m) })}
              />
            </div>
          )
        })}
      </div>
    </li>
  )
}

/** B · Visual week timeline: seven 06:00 to midnight tracks with the open hours as bars. */
export function WeekTimeline({ hours, onChange }: { hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <div aria-hidden className="relative ms-16 h-4 text-[11px] text-muted tabular-nums">
        {HOUR_MARKS.map(h => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: percent(h * 60) }}>{String(h).padStart(2, '0')}</span>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {DAYS.map(day => <Track key={day} day={day} hours={hours} onChange={onChange} />)}
      </ul>
      <p className="text-xs text-muted">{copy.timelineHint}</p>
    </div>
  )
}

import type { HoursSpan } from '@/features/places/lib/form'

import { Button, Switch } from '@heroui/react'

import { PlusIcon, TrashIcon } from '@/components/icons'
import { copy } from './copy'
import { CopyPopover } from './copy-popover'
import { DAYS, isValid, nextSpan, setDay, span, spansOf } from './model'
import { TimeInput } from './time-input'

/** A range: opens – closes, and a trash button. */
function RangeFields({ name, range, canRemove = true, onChange, onRemove }: {
  /** What the row belongs to, for screen readers: "Monday", "Set 1". */
  name: string
  range: HoursSpan
  canRemove?: boolean
  onChange: (changes: Partial<HoursSpan>) => void
  onRemove: () => void
}) {
  const invalid = !isValid(range)

  return (
    <div className="flex items-center gap-2">
      <TimeInput isInvalid={invalid} label={copy.timeFieldLabel(name, copy.opens)} value={range.opens} onChange={opens => onChange({ opens })} />
      <span aria-hidden className="text-muted">–</span>
      <TimeInput isInvalid={invalid} label={copy.timeFieldLabel(name, copy.closes)} value={range.closes} onChange={closes => onChange({ closes })} />
      {canRemove && (
        <Button isIconOnly aria-label={`${copy.removeRange}: ${name} ${range.opens}–${range.closes}`} className="max-lg:size-11" size="sm" variant="ghost" onPress={onRemove}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      )}
    </div>
  )
}

function DayRow({ day, hours, onChange }: { day: number, hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  const name = copy.dayNames[day]!
  const spans = spansOf(hours, day)
  const open = spans.length > 0
  const write = (next: HoursSpan[]) => onChange(setDay(hours, day, next))

  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-1">
      <div className="flex w-32 shrink-0 items-center gap-3">
        <span className="w-9 font-medium">{copy.days[day]}</span>
        <Switch aria-label={`${name}: ${copy.open}`} isSelected={open} onChange={on => write(on ? [span(day, '09:00', '18:00')] : [])}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
        {!open && <span className="text-sm text-muted">{copy.closed}</span>}
      </div>
      {open && (
        <div className="order-last flex basis-full flex-col gap-1 lg:order-none lg:basis-auto lg:flex-1">
          {spans.map(range => (
            <RangeFields
              key={range.key}
              canRemove={spans.length > 1}
              name={name}
              range={range}
              onChange={changes => write(spans.map(s => (s.key === range.key ? { ...s, ...changes } : s)))}
              onRemove={() => write(spans.filter(s => s.key !== range.key))}
            />
          ))}
        </div>
      )}
      {open && (
        <div className="ms-auto flex items-center lg:ms-0">
          <Button isIconOnly aria-label={`${copy.addRange}: ${name}`} className="max-lg:size-11" size="sm" variant="ghost" onPress={() => write([...spans, nextSpan(day, spans)])}>
            <PlusIcon aria-hidden size={16} />
          </Button>
          <CopyPopover day={day} hours={hours} onChange={onChange} />
        </div>
      )}
    </li>
  )
}

/** A · Compact week rows. */
export function WeekRows({ hours, onChange }: { hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  return (
    <ul className="flex flex-col divide-y divide-separator">
      {DAYS.map(day => <DayRow key={day} day={day} hours={hours} onChange={onChange} />)}
    </ul>
  )
}

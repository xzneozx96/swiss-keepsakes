import type { HoursSpan } from '../lib/form'
import type { Day } from '../lib/hours'
import type { MessageKey } from '@/i18n/en'

import { Button, Switch } from '@heroui/react'

import { PlusIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { DAYS, endsNextDay, nextSpan, openedDay, setDay, spansOf } from '../lib/hours'
import { CopyHoursPopover } from './copy-hours-popover'
import { TimeInput } from './fields'

function Range({ day, range, error, canRemove, onChange, onRemove }: {
  day: Day
  range: HoursSpan
  error?: MessageKey
  canRemove: boolean
  onChange: (changes: Partial<HoursSpan>) => void
  onRemove: () => void
}) {
  const { t } = useLocale()
  const dayName = t(`places.dayName.${day}`)

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <TimeInput compact className="w-24 shrink-0" error={error} label={t('places.hours.opens', { day: dayName })} value={range.opens} onChange={opens => onChange({ opens })} />
        <span aria-hidden className="text-muted">–</span>
        <TimeInput closing compact className="w-24 shrink-0" error={error} label={t('places.hours.closes', { day: dayName })} value={range.closes} onChange={closes => onChange({ closes })} />
        {canRemove && (
          <Button isIconOnly aria-label={t('places.hours.remove', { day: dayName, opens: range.opens, closes: range.closes })} className="max-lg:size-11" size="sm" variant="ghost" onPress={onRemove}>
            <TrashIcon aria-hidden size={16} />
          </Button>
        )}
      </div>
      {endsNextDay(range) && <p className="text-sm text-muted">{t('places.hours.nextDay', { time: range.closes })}</p>}
    </div>
  )
}

function DayRow({ day, hours, errors, onChange }: { day: Day, hours: HoursSpan[], errors: Record<string, MessageKey>, onChange: (hours: HoursSpan[]) => void }) {
  const { t } = useLocale()
  const dayName = t(`places.dayName.${day}`)
  const spans = spansOf(hours, day)
  const open = spans.length > 0
  const write = (next: HoursSpan[]) => onChange(setDay(hours, day, next))
  const problems = [...new Set(spans.flatMap(span => errors[span.key] ?? []))]

  return (
    <li className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-1">
      <div className="flex w-32 shrink-0 items-center gap-3">
        <span className="w-12 shrink-0 font-medium">{t(`places.day.${day}`)}</span>
        <Switch aria-label={t('places.hours.dayOpen', { day: dayName })} isSelected={open} onChange={on => write(on ? openedDay(hours, day) : [])}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
        {!open && <span className="text-sm text-muted">{t('places.hours.closed')}</span>}
      </div>
      {open && (
        <div className="order-last flex basis-full flex-col gap-1 lg:order-none lg:basis-auto lg:flex-1">
          {spans.map(range => (
            <Range
              key={range.key}
              canRemove={spans.length > 1}
              day={day}
              error={errors[range.key]}
              range={range}
              onChange={changes => write(spans.map(span => (span.key === range.key ? { ...span, ...changes } : span)))}
              onRemove={() => write(spans.filter(span => span.key !== range.key))}
            />
          ))}
        </div>
      )}
      {open && (
        <div className="ms-auto flex items-center lg:ms-0">
          <Button isIconOnly aria-label={t('places.hours.addRange', { day: dayName })} className="max-lg:size-11" size="sm" variant="ghost" onPress={() => write([...spans, nextSpan(day, spans)])}>
            <PlusIcon aria-hidden size={16} />
          </Button>
          <CopyHoursPopover day={day} hours={hours} onChange={onChange} />
        </div>
      )}
      {problems.map(problem => <p key={problem} className="basis-full text-sm text-danger" role="alert">{t(problem)}</p>)}
    </li>
  )
}

/** The week as seven compact rows: day, open switch, ranges, a second range, copy to other days. */
export function HoursRows({ hours, errors, onChange }: { hours: HoursSpan[], errors: Record<string, MessageKey>, onChange: (hours: HoursSpan[]) => void }) {
  return (
    <ul className="flex flex-col divide-y divide-separator">
      {DAYS.map(day => <DayRow key={day} day={day} errors={errors} hours={hours} onChange={onChange} />)}
    </ul>
  )
}

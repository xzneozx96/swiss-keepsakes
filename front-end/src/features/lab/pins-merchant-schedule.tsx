import type { DateEntry, HoursSpan, Weekday } from './pins-merchant-data'
import type { PinEditor } from './pins-merchant-editor-state'

import { Button, Input, Label, Radio, RadioGroup, TextField } from '@heroui/react'
import { formatShortDate } from '@sk/domain/shared'

import { CloseIcon, PlusIcon, StatusDangerIcon, TrashIcon } from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { StatusChip } from '@/components/status-chip'
import { useCopy } from './pins-merchant-copy'
import {
  isEntryEnded,
  LAB_TODAY,
  lastEntry,
  newDateEntry,
  newSpan,
  nextEntry,
  WEEKDAYS,
} from './pins-merchant-data'
import { choiceCard, TextInput } from './pins-merchant-fields'

const TIME_PLACEHOLDER = 'HH:MM'

/** A short time field whose label is read aloud but not drawn (the row says the day). */
function TimeInput({ label, value, onChange, isInvalid }: {
  label: string
  value: string
  onChange: (value: string) => void
  isInvalid: boolean
}) {
  return (
    <TextField aria-label={label} className="w-[5.25rem]" isInvalid={isInvalid} value={value} onChange={onChange}>
      <Input className="text-center tabular-nums" inputMode="numeric" maxLength={5} placeholder={TIME_PLACEHOLDER} />
    </TextField>
  )
}

/** Weekly hours: per weekday any number of spans, or closed. Empty means no hours on the card. */
export function HoursFields({ editor }: { editor: PinEditor }) {
  const { c } = useCopy()
  const { pin, errors } = editor
  const update = (key: string, fields: Partial<HoursSpan>) =>
    editor.patch({ hours: pin.hours.map(s => (s.key === key ? { ...s, ...fields } : s)) })
  const add = (day: Weekday) => {
    const hours = [...pin.hours, newSpan(day)].sort((a, b) => a.day - b.day)

    editor.patch({ hours })
  }

  if (!pin.hours.length) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">{c('hours.none')}</p>
        <Button size="sm" variant="tertiary" onPress={() => add(1)}>
          <PlusIcon aria-hidden size={16} />
          {c('hours.add')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{c('hours.help')}</p>
      {pin.dates.some(d => d.kind === 'range') && <InfoNote text={c('hours.inRange')} />}
      <ul className="flex flex-col divide-y divide-separator">
        {WEEKDAYS.map((day) => {
          const daySpans = pin.hours.filter(s => s.day === day)
          const dayName = c(`day.${day}`)

          return (
            <li key={day} className="flex items-start gap-2 py-2">
              <span className="w-9 shrink-0 pt-2.5 text-sm font-medium">{dayName}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {daySpans.length === 0 && <span className="pt-2.5 text-sm text-muted">{c('hours.closed')}</span>}
                {daySpans.map((span) => {
                  const error = errors[`hours:${span.key}`]

                  return (
                    <div key={span.key} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <TimeInput isInvalid={!!error} label={`${dayName} ${c('hours.opens')}`} value={span.opens} onChange={opens => update(span.key, { opens })} />
                        <span aria-hidden className="text-muted">–</span>
                        <TimeInput isInvalid={!!error} label={`${dayName} ${c('hours.closes')}`} value={span.closes} onChange={closes => update(span.key, { closes })} />
                        <Button
                          isIconOnly
                          aria-label={c('hours.remove', { day: dayName, opens: span.opens, closes: span.closes })}
                          className="size-11"
                          variant="tertiary"
                          onPress={() => editor.patch({ hours: pin.hours.filter(s => s.key !== span.key) })}
                        >
                          <CloseIcon aria-hidden size={16} />
                        </Button>
                      </div>
                      {error && <p className="text-sm text-danger">{c(`error.${error}`)}</p>}
                    </div>
                  )
                })}
              </div>
              <Button isIconOnly aria-label={c('hours.addSpan', { day: dayName })} className="size-11 shrink-0" variant="tertiary" onPress={() => add(day)}>
                <PlusIcon aria-hidden size={16} />
              </Button>
            </li>
          )
        })}
      </ul>
      <Button className="self-start" size="sm" variant="tertiary" onPress={() => editor.patch({ hours: [] })}>
        {c('hours.clear')}
      </Button>
    </div>
  )
}

/** One date entry: one day with optional times, or a range of days without times. */
function DateEntryCard({ editor, entry, index, isNext }: {
  editor: PinEditor
  entry: DateEntry
  index: number
  isNext: boolean
}) {
  const { c } = useCopy()
  const { pin, errors } = editor
  const error = errors[`date:${entry.key}`]
  const isOver = isEntryEnded(entry)
  const update = (fields: Partial<DateEntry>) =>
    editor.patch({ dates: pin.dates.map(d => (d.key === entry.key ? { ...d, ...fields } : d)) })
  const timeError = error === 'crossesMidnight' || error === 'endNeedsStart' || error === 'timeFormat'

  return (
    <li
      className={`flex flex-col gap-3 rounded-2xl border p-3 ${error ? 'border-danger' : 'border-separator'} ${isOver ? 'bg-surface-secondary' : ''}`}
      data-error={error ? true : undefined}
    >
      <div className="flex items-center gap-2 [&_svg]:shrink-0">
        <span className="flex-1 text-sm font-semibold">{c('dates.entry', { n: index + 1 })}</span>
        {isOver && <StatusChip tone="neutral">{c('dates.over')}</StatusChip>}
        {isNext && <StatusChip tone="success">{c('dates.next')}</StatusChip>}
        <Button
          isIconOnly
          aria-label={c('dates.remove', { n: index + 1 })}
          className="size-11"
          variant="tertiary"
          onPress={() => editor.patch({ dates: pin.dates.filter(d => d.key !== entry.key) })}
        >
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <RadioGroup
        aria-label={c('dates.kind')}
        orientation="horizontal"
        value={entry.kind}
        onChange={(kind) => {
          // A range has no times (place_dates_times_check); one day keeps only its first day.
          update(kind === 'range'
            ? { kind: 'range', lastDay: entry.firstDay, startTime: '', endTime: '' }
            : { kind: 'day', lastDay: entry.firstDay })
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          {(['day', 'range'] as const).map(kind => (
            <Radio key={kind} className={`${choiceCard} py-2.5`} value={kind}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {c(kind === 'day' ? 'dates.day' : 'dates.range')}
              </Radio.Content>
            </Radio>
          ))}
        </div>
      </RadioGroup>
      {entry.kind === 'day'
        ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
              <TextInput
                className="col-span-2 sm:col-span-1"
                error={error === 'dateMissing' ? c('error.dateMissing') : undefined}
                label={c('dates.on')}
                type="date"
                value={entry.firstDay}
                onChange={firstDay => update({ firstDay, lastDay: firstDay })}
              />
              <TextField isInvalid={timeError} value={entry.startTime} onChange={startTime => update({ startTime })}>
                <Label>{`${c('dates.start')} (${c('editor.optional')})`}</Label>
                <Input className="tabular-nums" inputMode="numeric" maxLength={5} placeholder={TIME_PLACEHOLDER} />
              </TextField>
              <TextField isInvalid={timeError} value={entry.endTime} onChange={endTime => update({ endTime })}>
                <Label>{`${c('dates.end')} (${c('editor.optional')})`}</Label>
                <Input className="tabular-nums" inputMode="numeric" maxLength={5} placeholder={TIME_PLACEHOLDER} />
              </TextField>
              <p className="col-span-2 text-xs text-muted sm:col-span-3">{c('dates.endHelp')}</p>
            </div>
          )
        : (
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                error={error === 'dateMissing' && !entry.firstDay ? c('error.dateMissing') : undefined}
                label={c('dates.from')}
                type="date"
                value={entry.firstDay}
                onChange={firstDay => update({ firstDay })}
              />
              <TextInput
                error={error === 'dateMissing' && entry.firstDay ? c('error.dateMissing') : undefined}
                label={c('dates.to')}
                type="date"
                value={entry.lastDay}
                onChange={lastDay => update({ lastDay })}
              />
              <p className="col-span-2 text-xs text-muted">{c('dates.rangeHelp')}</p>
            </div>
          )}
      {error && error !== 'dateMissing' && (
        <p className="flex items-start gap-1.5 text-sm text-danger" role="alert">
          <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {c(`error.${error}`)}
        </p>
      )}
    </li>
  )
}

/** The rule in words, then the entries. Ended entries stay, greyed, until the merchant removes them. */
export function DatesFields({ editor }: { editor: PinEditor }) {
  const { c, intlLocale } = useCopy()
  const { pin } = editor
  const next = nextEntry(pin.dates)
  const last = lastEntry(pin.dates)
  const filled = pin.dates.some(d => d.firstDay)
  const summary = !pin.dates.length || !filled
    ? c('dates.none')
    : next
      ? c('dates.until', { date: formatShortDate(last!.lastDay, LAB_TODAY, intlLocale) })
      : c('dates.allOver')

  return (
    <div className="flex flex-col gap-3">
      <p className={`text-sm text-pretty ${filled && !next ? 'font-medium text-warning' : ''}`}>{summary}</p>
      {pin.dates.length > 0 && (
        <ul className="flex flex-col gap-3">
          {pin.dates.map((entry, index) => (
            <DateEntryCard key={entry.key} editor={editor} entry={entry} index={index} isNext={entry.key === next?.key} />
          ))}
        </ul>
      )}
      <Button className="self-start" size="sm" variant="tertiary" onPress={() => editor.patch({ dates: [...pin.dates, newDateEntry('day')] })}>
        <PlusIcon aria-hidden size={16} />
        {c('dates.add')}
      </Button>
    </div>
  )
}

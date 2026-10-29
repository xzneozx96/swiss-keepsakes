import type { DateEntry, HoursSpan } from '../lib/form'
import type { StepProps } from './step-props'
import type { MessageKey } from '@/i18n/en'

import { Button, Radio, RadioGroup } from '@heroui/react'

import { PlusIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { emptyDate } from '../lib/form'
import { Block, choiceCard, Field } from './fields'

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

function Hours({ form, patch, errors }: Pick<StepProps, 'form' | 'patch' | 'errors'>) {
  const { t } = useLocale()
  const change = (key: string, changes: Partial<HoursSpan>) => patch({ hours: form.hours.map(span => (span.key === key ? { ...span, ...changes } : span)) })

  return (
    <Block hint={t('places.hours.help')} title={t('places.hours.title')}>
      {form.hours.length === 0 && <p className="text-sm text-muted">{t('places.hours.none')}</p>}
      <ul className="flex flex-col gap-3">
        {DAYS.map((day) => {
          const spans = form.hours.filter(span => span.day === day)
          const dayName = t(`places.day.${day}`)

          return (
            <li key={day} className="flex flex-col gap-2 rounded-2xl border border-separator p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{dayName}</span>
                <Button size="sm" variant="tertiary" onPress={() => patch({ hours: [...form.hours, { key: crypto.randomUUID(), day, opens: '', closes: '' }] })}>
                  <PlusIcon aria-hidden size={14} />
                  {t('places.hours.addSpan', { day: dayName })}
                </Button>
              </div>
              {spans.length === 0 && <span className="text-sm text-muted">{t('places.hours.closed')}</span>}
              {spans.map(span => (
                <div key={span.key} className="flex items-start gap-2">
                  <Field className="min-w-0 flex-1" error={errors.hours[span.key]} label={`${dayName} · ${t('places.hours.opens')}`} placeholder="08:00" value={span.opens} onChange={opens => change(span.key, { opens })} />
                  <Field className="min-w-0 flex-1" label={`${dayName} · ${t('places.hours.closes')}`} placeholder="18:00" value={span.closes} onChange={closes => change(span.key, { closes })} />
                  <Button isIconOnly aria-label={t('places.hours.remove', { day: dayName, opens: span.opens, closes: span.closes })} className="mt-6" size="sm" variant="tertiary" onPress={() => patch({ hours: form.hours.filter(other => other.key !== span.key) })}>
                    <TrashIcon aria-hidden size={16} />
                  </Button>
                </div>
              ))}
            </li>
          )
        })}
      </ul>
      {form.hours.length > 0 && <Button className="w-fit" size="sm" variant="tertiary" onPress={() => patch({ hours: [] })}>{t('places.hours.clear')}</Button>}
    </Block>
  )
}

function Entry({ entry, index, error, onChange, onRemove }: { entry: DateEntry, index: number, error?: MessageKey, onChange: (changes: Partial<DateEntry>) => void, onRemove: () => void }) {
  const { t } = useLocale()
  const n = index + 1

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-separator p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{t('places.dates.entry', { n })}</span>
        <Button isIconOnly aria-label={t('places.dates.remove', { n })} size="sm" variant="tertiary" onPress={onRemove}>
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <RadioGroup aria-label={`${t('places.dates.kind')} ${n}`} orientation="horizontal" value={entry.kind} onChange={kind => onChange({ kind: kind as DateEntry['kind'] })}>
        <div className="grid grid-cols-2 gap-2">
          {(['day', 'range'] as const).map(kind => (
            <Radio key={kind} className={choiceCard} value={kind}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`places.dates.${kind}`)}
              </Radio.Content>
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${n} · ${t(entry.kind === 'day' ? 'places.dates.on' : 'places.dates.from')}`} type="date" value={entry.firstDay} onChange={firstDay => onChange({ firstDay })} />
        {entry.kind === 'range' && <Field label={`${n} · ${t('places.dates.to')}`} type="date" value={entry.lastDay} onChange={lastDay => onChange({ lastDay })} />}
        {entry.kind === 'day' && (
          <>
            <Field label={`${n} · ${t('places.dates.start')}`} placeholder="19:30" value={entry.startTime} onChange={startTime => onChange({ startTime })} />
            <Field description={t('places.dates.endHelp')} label={`${n} · ${t('places.dates.end')}`} placeholder="21:00" value={entry.endTime} onChange={endTime => onChange({ endTime })} />
          </>
        )}
      </div>
      {entry.kind === 'range' && <p className="text-sm text-muted">{t('places.dates.rangeHelp')}</p>}
      {error && <p className="text-sm text-danger" role="alert">{t(error)}</p>}
    </li>
  )
}

function Dates({ form, patch, errors }: Pick<StepProps, 'form' | 'patch' | 'errors'>) {
  const { t } = useLocale()
  const change = (key: string, changes: Partial<DateEntry>) => patch({ dates: form.dates.map(entry => (entry.key === key ? { ...entry, ...changes } : entry)) })

  return (
    <Block hint={form.dates.length === 0 ? t('places.dates.none') : t('places.dates.untilHelp')} title={t('places.dates.title')}>
      <ol className="flex flex-col gap-3">
        {form.dates.map((entry, index) => (
          <Entry key={entry.key} entry={entry} error={errors.dates[entry.key]} index={index} onChange={changes => change(entry.key, changes)} onRemove={() => patch({ dates: form.dates.filter(other => other.key !== entry.key) })} />
        ))}
      </ol>
      <Button className="w-fit" size="sm" variant="secondary" onPress={() => patch({ dates: [...form.dates, emptyDate()] })}>
        <PlusIcon aria-hidden size={16} />
        {t('places.dates.add')}
      </Button>
    </Block>
  )
}

/** Step 3: weekly hours per weekday (any number of spans, or closed) and optional date entries. */
export function StepWhen({ form, patch, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <Hours errors={errors} form={form} patch={patch} />
      <Dates errors={errors} form={form} patch={patch} />
    </div>
  )
}

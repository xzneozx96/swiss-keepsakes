import type { DateEntry } from '../lib/form'
import type { StepProps } from './step-props'
import type { MessageKey } from '@/i18n/en'

import { Button, Radio, RadioGroup } from '@heroui/react'
import { useState } from 'react'

import { choiceCard } from '@/components/choice-card'
import { EmptyState } from '@/components/empty-state'
import { Block } from '@/components/form-block'
import { ClockIcon, PlusIcon, TodayIcon, TrashIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { emptyDate } from '../lib/form'
import { Field, TimeInput } from './fields'
import { HoursRows } from './hours-rows'

function Hours({ form, patch, errors }: Pick<StepProps, 'form' | 'patch' | 'errors'>) {
  const { t } = useLocale()
  // Add opening hours shows the week with every day closed; the rows then stay while the merchant works, even if
  // every day is switched off again. Saved with no hours, the step opens on the empty state again.
  const [revealed, setRevealed] = useState(false)
  const empty = form.hours.length === 0 && !revealed

  return (
    <Block hint={empty ? undefined : t('places.hours.help')} icon={ClockIcon} title={t('places.hours.title')}>
      {empty
        ? <EmptyState compact action={{ label: t('places.hours.add'), onPress: () => setRevealed(true) }} icon={ClockIcon} message={t('places.hours.none')} />
        : <HoursRows errors={errors.hours} hours={form.hours} onChange={hours => patch({ hours })} />}
      {form.hours.length > 0 && (
        <Button
          className="w-fit"
          size="sm"
          variant="tertiary"
          onPress={() => {
            setRevealed(false)
            patch({ hours: [] })
          }}
        >
          {t('places.hours.clear')}
        </Button>
      )}
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
            <TimeInput label={`${n} · ${t('places.dates.start')}`} value={entry.startTime} onChange={startTime => onChange({ startTime })} />
            <TimeInput description={t('places.dates.endHelp')} label={`${n} · ${t('places.dates.end')}`} value={entry.endTime} onChange={endTime => onChange({ endTime })} />
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
  const add = () => patch({ dates: [...form.dates, emptyDate()] })
  const change = (key: string, changes: Partial<DateEntry>) => patch({ dates: form.dates.map(entry => (entry.key === key ? { ...entry, ...changes } : entry)) })

  return (
    <Block hint={form.dates.length === 0 ? undefined : t('places.dates.untilHelp')} icon={TodayIcon} title={t('places.dates.title')}>
      {form.dates.length === 0
        ? <EmptyState compact action={{ label: t('places.dates.add'), onPress: add }} icon={TodayIcon} message={t('places.dates.none')} />
        : (
            <>
              <ol className="flex flex-col gap-3">
                {form.dates.map((entry, index) => (
                  <Entry key={entry.key} entry={entry} error={errors.dates[entry.key]} index={index} onChange={changes => change(entry.key, changes)} onRemove={() => patch({ dates: form.dates.filter(other => other.key !== entry.key) })} />
                ))}
              </ol>
              <Button className="w-fit" size="sm" variant="secondary" onPress={add}>
                <PlusIcon aria-hidden size={16} />
                {t('places.dates.add')}
              </Button>
            </>
          )}
    </Block>
  )
}

/** Step 3: weekly hours per weekday (any number of spans, or closed) and optional date entries. */
export function StepWhen({ form, patch, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <Hours errors={errors} form={form} patch={patch} />
      <Dates errors={errors} form={form} patch={patch} />
    </div>
  )
}

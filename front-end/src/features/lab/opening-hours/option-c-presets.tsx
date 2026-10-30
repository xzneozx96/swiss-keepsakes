import type { HoursSpan } from '@/features/places/lib/form'

import { Button, Tag, TagGroup } from '@heroui/react'
import { useState } from 'react'

import { EditIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { chipChange, ChipCheck, chipClass } from '../map-guest-kit'
import { copy } from './copy'
import { everySpans, sorted, span, summaryLine, summaryParts } from './model'
import { WeekRows } from './option-a-rows'

type Preset = 'every' | 'weekdaysSat' | 'always' | 'custom'

const PRESETS: Preset[] = ['every', 'weekdaysSat', 'always', 'custom']

function presetHours(preset: Exclude<Preset, 'custom'>): HoursSpan[] {
  if (preset === 'every')
    return everySpans('09:00', '18:00')

  if (preset === 'always')
    return everySpans('00:00', '24:00')

  return sorted([...everySpans('09:00', '18:00', [1, 2, 3, 4, 5]), span(6, '10:00', '16:00')])
}

/** The preset the hours equal, ignoring row keys; "custom" when none. */
function presetOf(hours: HoursSpan[]): Preset {
  const line = summaryLine(hours)

  return (['every', 'weekdaysSat', 'always'] as const).find(p => summaryLine(presetHours(p)) === line) ?? 'custom'
}

/** C · Presets and a readable summary; Edit opens option A's rows in the shared sheet. */
export function PresetSummary({ hours, onChange }: { hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const preset = presetOf(hours)
  const parts = summaryParts(hours)

  return (
    <div className="flex flex-col gap-3">
      <TagGroup
        disallowEmptySelection
        aria-label={copy.presetsLabel}
        selectedKeys={new Set([preset])}
        selectionMode="single"
        onSelectionChange={chipChange((id) => {
          if (id === 'custom')
            setIsOpen(true)
          else onChange(presetHours(id as Exclude<Preset, 'custom'>))
        })}
      >
        <TagGroup.List className="flex flex-wrap gap-2 py-1">
          {PRESETS.map(id => (
            <Tag key={id} className={chipClass} id={id} textValue={copy.presets[id]}>
              {copy.presets[id]}
              <ChipCheck />
            </Tag>
          ))}
        </TagGroup.List>
      </TagGroup>
      {hours.length === 0 && <p className="rounded-2xl border border-separator p-3 text-sm text-muted">{copy.none}</p>}
      {hours.length > 0 && (
        <dl className="flex flex-col divide-y divide-separator rounded-2xl border border-separator px-3">
          {parts.map(part => (
            <div key={part.days} className="flex min-h-10 items-baseline justify-between gap-3 py-2">
              <dt className="font-medium">{part.days}</dt>
              <dd className={`text-end tabular-nums ${part.text === copy.closed.toLowerCase() ? 'text-muted' : ''}`}>{part.text === copy.closed.toLowerCase() ? copy.closed : part.text}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button className="max-lg:h-11" variant="secondary" onPress={() => setIsOpen(true)}>
          <EditIcon aria-hidden size={16} />
          {copy.edit}
        </Button>
        <Button className="max-lg:h-11" size="sm" variant="ghost" onPress={() => onChange([])}>{copy.sheetReset}</Button>
      </div>
      {isOpen && (
        <SheetFrame
          isOpen
          footer={<Button fullWidth onPress={() => setIsOpen(false)}>{copy.sheetDone}</Button>}
          title={copy.sheetTitle}
          onClose={() => setIsOpen(false)}
        >
          <WeekRows hours={hours} onChange={onChange} />
        </SheetFrame>
      )}
    </div>
  )
}

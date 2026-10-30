import type { HoursSpan } from '@/features/places/lib/form'

import { Button, Tag, TagGroup } from '@heroui/react'
import { useState } from 'react'

import { PlusIcon, TrashIcon } from '@/components/icons'
import { ChipCheck, chipClass } from '../map-guest-kit'
import { copy } from './copy'
import { DAYS, newKey, nextSpan, sorted, span, spansOf } from './model'
import { RangeFields } from './option-a-rows'

interface DaySet { key: string, days: number[], ranges: HoursSpan[] }

const rangesKey = (spans: HoursSpan[]) => spans.map(s => `${s.opens}-${s.closes}`).join(',')

/** The sets the hours start as: days with the same ranges share one set. */
function setsOf(hours: HoursSpan[]): DaySet[] {
  const sets: DaySet[] = []

  for (const day of DAYS) {
    const spans = spansOf(hours, day)

    if (!spans.length)
      continue

    const same = sets.find(s => rangesKey(s.ranges) === rangesKey(spans))

    if (same)
      same.days.push(day)
    else sets.push({ key: newKey(), days: [day], ranges: spans.map(s => ({ ...s })) })
  }

  return sets
}

function hoursOf(sets: DaySet[]): HoursSpan[] {
  return sorted(sets.flatMap(set => set.days.flatMap(day => set.ranges.map(r => span(day, r.opens, r.closes)))))
}

/** D · Day-chip sets: weekday chips that share one range; days in no set are closed. A day sits in one set only. */
export function DaySets({ hours, onChange }: { hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  const [sets, setSets] = useState(() => setsOf(hours))
  const write = (next: DaySet[]) => {
    setSets(next)
    onChange(hoursOf(next))
  }
  const patch = (key: string, changes: Partial<DaySet>) => write(sets.map(s => (s.key === key ? { ...s, ...changes } : s)))
  const taken = new Set(sets.flatMap(s => s.days))
  const closed = DAYS.filter(d => !taken.has(d))

  return (
    <div className="flex flex-col gap-3">
      {sets.map((set, index) => (
        <div key={set.key} className="flex flex-col gap-2 rounded-2xl border border-separator p-3">
          <div className="flex items-start justify-between gap-2">
            <TagGroup
              aria-label={copy.setDays(index + 1)}
              selectedKeys={new Set(set.days.map(String))}
              selectionMode="multiple"
              onSelectionChange={(keys) => {
                const days = keys === 'all' ? [...DAYS] : Array.from(keys, Number).sort((a, b) => a - b)

                write(sets.map(s => (s.key === set.key ? { ...s, days } : { ...s, days: s.days.filter(d => !days.includes(d)) })))
              }}
            >
              <TagGroup.List className="flex flex-wrap gap-2 py-1">
                {DAYS.map(day => (
                  <Tag key={day} className={chipClass} id={String(day)} textValue={copy.dayNames[day]}>
                    {copy.days[day]}
                    <ChipCheck />
                  </Tag>
                ))}
              </TagGroup.List>
            </TagGroup>
            <Button isIconOnly aria-label={`${copy.removeSet} ${index + 1}`} className="max-lg:size-11" size="sm" variant="ghost" onPress={() => write(sets.filter(s => s.key !== set.key))}>
              <TrashIcon aria-hidden size={16} />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {set.ranges.map(range => (
              <RangeFields
                key={range.key}
                canRemove={set.ranges.length > 1}
                name={copy.setLabel(index + 1)}
                range={range}
                onChange={changes => patch(set.key, { ranges: set.ranges.map(r => (r.key === range.key ? { ...r, ...changes } : r)) })}
                onRemove={() => patch(set.key, { ranges: set.ranges.filter(r => r.key !== range.key) })}
              />
            ))}
            <Button isIconOnly aria-label={`${copy.addRange}: ${copy.setLabel(index + 1)}`} className="max-lg:size-11" size="sm" variant="ghost" onPress={() => patch(set.key, { ranges: [...set.ranges, nextSpan(1, set.ranges)] })}>
              <PlusIcon aria-hidden size={16} />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button className="max-lg:h-11" variant="secondary" onPress={() => write([...sets, { key: newKey(), days: [], ranges: [span(1, '09:00', '18:00')] }])}>
          <PlusIcon aria-hidden size={16} />
          {copy.addSet}
        </Button>
        <p className="text-sm text-muted">
          {closed.length ? `${copy.closedOn}: ${closed.map(d => copy.days[d]).join(', ')}` : copy.noneClosed}
        </p>
      </div>
    </div>
  )
}

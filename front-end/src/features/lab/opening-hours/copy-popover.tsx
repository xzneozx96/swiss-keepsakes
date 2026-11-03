import type { HoursSpan } from '@/features/places/lib/form'

import { Button, Checkbox, CheckboxGroup, Popover } from '@heroui/react'
import { useState } from 'react'

import { CopyIcon } from '@/components/icons'
import { copy } from './copy'
import { copyDay, DAYS } from './model'

/** "Copy to other days": the day's ranges, written onto the days ticked here. */
export function CopyPopover({ day, hours, onChange }: { day: number, hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [ticked, setTicked] = useState<string[]>([])
  const others = DAYS.filter(d => d !== day)

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly aria-label={`${copy.copyTo}: ${copy.dayNames[day]}`} className="max-lg:size-11" size="sm" variant="ghost">
        <CopyIcon aria-hidden size={16} />
      </Button>
      <Popover.Content className="w-64" placement="bottom end">
        <Popover.Dialog aria-label={copy.copyTo} className="flex flex-col gap-3 p-3">
          <p className="text-sm font-medium">{`${copy.copyDays}:`}</p>
          <CheckboxGroup aria-label={copy.copyDays} className="grid grid-cols-2 gap-1 [&_[data-slot=checkbox]]:mt-0" value={ticked} onChange={setTicked}>
            {others.map(d => (
              <Checkbox key={d} className="min-h-9 rounded-lg px-2 hover:bg-default" value={String(d)}>
                <Checkbox.Content className="flex-row items-center gap-2">
                  <Checkbox.Control className="size-5 shrink-0 rounded-md">
                    <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4" />
                  </Checkbox.Control>
                  <span className="text-sm">{copy.dayNames[d]}</span>
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onPress={() => setTicked(ticked.length === others.length ? [] : others.map(String))}>
              {ticked.length === others.length ? 'None' : 'All days'}
            </Button>
            <Button
              isDisabled={!ticked.length}
              size="sm"
              onPress={() => {
                onChange(copyDay(hours, day, ticked.map(Number)))
                setTicked([])
                setIsOpen(false)
              }}
            >
              {copy.copyApply}
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

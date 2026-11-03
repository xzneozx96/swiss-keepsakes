import type { HoursSpan } from '../lib/form'
import type { Day } from '../lib/hours'

import { Button, Checkbox, CheckboxGroup, Popover } from '@heroui/react'
import { useState } from 'react'

import { CopyIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { copyDay, DAYS } from '../lib/hours'

/** "Copy to other days": a day's ranges, written onto the days ticked here. */
export function CopyHoursPopover({ day, hours, onChange }: { day: Day, hours: HoursSpan[], onChange: (hours: HoursSpan[]) => void }) {
  const { t } = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [ticked, setTicked] = useState<string[]>([])
  const others = DAYS.filter(other => other !== day)
  const all = ticked.length === others.length

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button isIconOnly aria-label={t('places.hours.copy', { day: t(`places.dayName.${day}`) })} className="max-lg:size-11" size="sm" variant="ghost">
        <CopyIcon aria-hidden size={16} />
      </Button>
      <Popover.Content className="w-64" placement="bottom end">
        <Popover.Dialog aria-label={t('places.hours.copyHeading')} className="flex flex-col gap-3 p-4">
          <p className="text-xs font-medium text-muted">{t('places.hours.copyHeading')}</p>
          {/* "All days" first, as the cart's Select all: checked, unchecked or indeterminate. */}
          <Checkbox
            isIndeterminate={ticked.length > 0 && !all}
            isSelected={all}
            onChange={selected => setTicked(selected ? others.map(String) : [])}
          >
            <Checkbox.Content className="flex-row items-center gap-2 text-sm font-medium">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {t('places.hours.copyAll')}
            </Checkbox.Content>
          </Checkbox>
          {/* HeroUI's group puts mt-4 on each checkbox; the grid gap spaces them instead (as in the shared filter bar). */}
          <CheckboxGroup
            aria-label={t('places.hours.copyHeading')}
            className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-separator pt-3 [&_[data-slot=checkbox]]:mt-0"
            value={ticked}
            onChange={setTicked}
          >
            {others.map(other => (
              <Checkbox key={other} value={String(other)}>
                <Checkbox.Content className="flex-row items-center gap-2 text-sm">
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {t(`places.dayName.${other}`)}
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
          <Button
            fullWidth
            className="mt-1"
            isDisabled={ticked.length === 0}
            size="sm"
            onPress={() => {
              onChange(copyDay(hours, day, ticked.map(Number)))
              setTicked([])
              setIsOpen(false)
            }}
          >
            {t('places.hours.copyApply')}
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

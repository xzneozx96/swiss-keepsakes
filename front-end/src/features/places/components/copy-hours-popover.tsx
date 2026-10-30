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
        <Popover.Dialog aria-label={t('places.hours.copyHeading')} className="flex flex-col gap-3 p-3">
          <p className="text-sm font-medium">{t('places.hours.copyHeading')}</p>
          <CheckboxGroup aria-label={t('places.hours.copyHeading')} className="grid grid-cols-2 gap-1" value={ticked} onChange={setTicked}>
            {others.map(other => (
              <Checkbox key={other} value={String(other)}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {t(`places.dayName.${other}`)}
                </Checkbox.Content>
              </Checkbox>
            ))}
          </CheckboxGroup>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" onPress={() => setTicked(all ? [] : others.map(String))}>
              {t(all ? 'places.hours.copyNone' : 'places.hours.copyAll')}
            </Button>
            <Button
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
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

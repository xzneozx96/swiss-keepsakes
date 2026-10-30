import { Label, TimeField } from '@heroui/react'
import { Time } from '@internationalized/date'

import { minutesOf } from './model'

function toTime(value: string) {
  const minutes = Math.min(minutesOf(value), 24 * 60 - 1)

  return new Time(Math.floor(minutes / 60), minutes % 60)
}

/**
 * HeroUI TimeField on 24 hours: typing 0900 gives 09:00. The value is the 'HH:mm' string the form holds.
 * The label is read aloud, not drawn: the row says the day.
 */
export function TimeInput({ label, value, onChange, className = 'w-[5.5rem]', isInvalid }: {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
  isInvalid?: boolean
}) {
  return (
    <TimeField
      aria-label={label}
      className={className}
      hourCycle={24}
      isInvalid={isInvalid}
      shouldForceLeadingZeros
      value={toTime(value)}
      onChange={(v) => {
        if (v)
          onChange(`${String(v.hour).padStart(2, '0')}:${String(v.minute).padStart(2, '0')}`)
      }}
    >
      <Label className="sr-only">{label}</Label>
      <TimeField.Group fullWidth>
        <TimeField.Input>
          {segment => <TimeField.Segment segment={segment} />}
        </TimeField.Input>
      </TimeField.Group>
    </TimeField>
  )
}

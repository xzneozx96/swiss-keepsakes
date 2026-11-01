import { useId } from 'react'

const ROW = 'relative flex min-h-13 items-center gap-3 px-4'

/** The grouped list that holds inline fields: one rounded panel, rows divided by a hairline. */
export const FIELD_GROUP = 'flex flex-col divide-y divide-separator/70 overflow-hidden rounded-2xl bg-surface-secondary'

/** A row of a grouped list: the row's own class for a control that is not a text field (a switch). */
export const FIELD_ROW = ROW

/**
 * A text entry that reads as the value of its row: label on the left, the value on the right, no box until the row has
 * focus. Put it inside an element with the `FIELD_GROUP` class. It is a plain input because HeroUI's fields always draw
 * their own box.
 */
export function InlineField({ label, value, placeholder, invalid = false, mono = false, inputMode, onChange }: {
  label: string
  value: string
  placeholder: string
  invalid?: boolean
  mono?: boolean
  inputMode?: 'decimal'
  onChange: (next: string) => void
}) {
  const id = useId()

  return (
    <div className={`${ROW} has-[input:focus-visible]:bg-default/60`}>
      <label className="shrink-0 text-sm" htmlFor={id}>{label}</label>
      <input
        aria-invalid={invalid || undefined}
        className={`min-w-0 flex-1 bg-transparent py-3 text-end text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted ${mono ? 'font-mono' : 'tabular-nums'} ${invalid ? 'text-danger' : ''}`}
        id={id}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  )
}

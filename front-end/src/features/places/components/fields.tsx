import type { ReactNode } from 'react'
import type { IconComponent } from '@/components/icons'
import type { MessageKey } from '@/i18n/en'

import { Description, FieldError, Input, Label, TextArea, TextField, TimeField } from '@heroui/react'
import { useId } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { textOf, timeOf } from '../lib/time-text'

/** One text field: its label, an optional help line, and the error under it in words. */
export function Field({ label, hiddenPrefix, value, onChange, lang, description, error, rows, maxLength, placeholder, inputMode, type, className }: {
  label: string
  /** Words only a screen reader hears before the label, such as the weekday of a card whose title already shows it. */
  hiddenPrefix?: string
  value: string
  onChange: (value: string) => void
  /** The language of the text, for screen readers and hyphenation. */
  lang?: 'en' | 'de'
  description?: string
  error?: MessageKey
  rows?: number
  maxLength?: number
  placeholder?: string
  inputMode?: 'text' | 'decimal' | 'numeric'
  /** `date` gives the phone's own day picker and a value that is empty or a whole `YYYY-MM-DD`. */
  type?: 'text' | 'date'
  className?: string
}) {
  const { t } = useLocale()

  return (
    <TextField fullWidth className={className} isInvalid={error !== undefined} maxLength={maxLength} type={type} value={value} onChange={onChange}>
      <Label>
        {hiddenPrefix && <span className="sr-only">{`${hiddenPrefix} · `}</span>}
        {label}
      </Label>
      {rows
        ? <TextArea lang={lang} placeholder={placeholder} rows={rows} />
        : <Input inputMode={inputMode} lang={lang} placeholder={placeholder} />}
      {description && !error && <Description>{description}</Description>}
      {error && <FieldError>{t(error)}</FieldError>}
    </TextField>
  )
}

/**
 * A 24-hour time field: type the digits and the colon is placed. The value is `HH:mm` text, empty while no time is set.
 * `compact` is for a row that already shows what the time is for: the label is read aloud, not drawn, and the error is
 * left to the row, which shows it once for all its fields.
 */
export function TimeInput({ label, value, onChange, error, closing, compact, className }: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: MessageKey
  /** A closing time: 00:00 means midnight and is kept as `24:00`. */
  closing?: boolean
  compact?: boolean
  className?: string
}) {
  const { t } = useLocale()

  return (
    <TimeField fullWidth className={className} hourCycle={24} isInvalid={error !== undefined} shouldForceLeadingZeros value={timeOf(value, closing)} onChange={time => onChange(textOf(time, closing))}>
      <Label className={compact ? 'sr-only' : undefined}>{label}</Label>
      <TimeField.Group>
        <TimeField.Input>
          {segment => <TimeField.Segment segment={segment} />}
        </TimeField.Input>
      </TimeField.Group>
      {error && !compact && <FieldError>{t(error)}</FieldError>}
    </TimeField>
  )
}

/**
 * A block of the step, in a card: rounded, light surface, soft shadow, not collapsible. A block that groups several
 * different fields has a header (icon tile, title, one line on what it is for). A block that holds one field has none:
 * the field's own label, input and help line are the whole block, so no heading repeats the label.
 */
export function Block({ icon: Icon, title, hint, children }: { icon?: IconComponent, title?: string, hint?: string, children: ReactNode }) {
  const titleId = useId()

  return (
    <section aria-labelledby={title ? titleId : undefined} className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5" data-testid="place-block">
      {title && (
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-muted">
              <Icon aria-hidden size={18} />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="font-semibold" id={titleId}>{title}</h3>
            {hint && <p className="text-sm text-pretty text-muted">{hint}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}

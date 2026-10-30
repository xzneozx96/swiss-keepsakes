import type { ReactNode } from 'react'
import type { IconComponent } from '@/components/icons'
import type { MessageKey } from '@/i18n/en'

import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react'
import { useId } from 'react'

import { useLocale } from '@/contexts/locale-context'

/** The same choice card as the other merchant screens: an ink frame when selected. */
export const choiceCard
  = 'rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground'

/** One text field: its label, an optional help line, and the error under it in words. */
export function Field({ label, value, onChange, lang, description, error, rows, maxLength, placeholder, inputMode, type, className }: {
  label: string
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
      <Label>{label}</Label>
      {rows
        ? <TextArea lang={lang} placeholder={placeholder} rows={rows} />
        : <Input inputMode={inputMode} lang={lang} placeholder={placeholder} />}
      {description && !error && <Description>{description}</Description>}
      {error && <FieldError>{t(error)}</FieldError>}
    </TextField>
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
        <div className="flex items-start gap-3">
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

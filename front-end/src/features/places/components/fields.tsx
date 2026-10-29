import type { ReactNode } from 'react'
import type { MessageKey } from '@/i18n/en'

import { Description, FieldError, Input, Label, TextArea, TextField } from '@heroui/react'

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

/** A block of the step: a heading, what it is for, then the fields. */
export function Block({ title, hint, children }: { title: string, hint?: string, children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">{title}</h3>
        {hint && <p className="text-sm text-pretty text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

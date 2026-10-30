import type { ReactNode } from 'react'
import type { IconComponent } from '@/components/icons'

import { Button, Description, FieldError, InputGroup, Label, TextField } from '@heroui/react'

import { CloseIcon } from '@/components/icons'

/**
 * One rounded frame with a text input on top and other content attached right under it, such as a map under an
 * address: no gap and no card of its own between them (the address-then-map pattern of Google Maps and Airbnb). The
 * input has a leading icon and a clear button once it holds text. A line under the input (`error`, else `status`)
 * says what happened to the text, and is announced to screen readers. `children` is the attached content, which the
 * frame clips to its rounded corners.
 */
export function AttachedField({ label, icon: Icon, clearLabel, value, onChange, onClear, error, status, statusTone, placeholder, inputMode, onBlur, onKeyDown, onPaste, children }: {
  /** The input's name for screen readers; the frame shows no label. */
  label: string
  icon: IconComponent
  clearLabel: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  /** The words under the input when its text is refused. The input is then invalid. */
  error?: string
  status?: string
  statusTone?: 'muted' | 'success'
  placeholder?: string
  inputMode?: 'url' | 'text'
  onBlur?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onPaste?: (event: React.ClipboardEvent<HTMLInputElement>) => void
  children: ReactNode
}) {
  const hasLine = error !== undefined || status !== undefined

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-field-border bg-field shadow-field has-[[data-slot=input-group-input]:focus]:border-field-border-focus has-[[data-slot=input-group-input]:focus]:ring-2 has-[[data-slot=input-group-input]:focus]:ring-focus has-[[data-invalid=true]]:border-danger">
      <TextField fullWidth isInvalid={error !== undefined} value={value} onChange={onChange}>
        <Label className="sr-only">{label}</Label>
        <InputGroup fullWidth className="rounded-none border-0 bg-transparent shadow-none outline-none has-[:focus]:ring-0 data-[invalid=true]:outline-none">
          <InputGroup.Prefix className="border-0 pe-0">
            <Icon aria-hidden size={16} />
          </InputGroup.Prefix>
          <InputGroup.Input inputMode={inputMode} placeholder={placeholder} onBlur={onBlur} onKeyDown={onKeyDown} onPaste={onPaste} />
          {value !== '' && (
            <InputGroup.Suffix className="border-0 pe-1">
              <Button isIconOnly aria-label={clearLabel} size="sm" variant="ghost" onPress={onClear}>
                <CloseIcon aria-hidden size={16} />
              </Button>
            </InputGroup.Suffix>
          )}
        </InputGroup>
        <div aria-live="polite" className={hasLine ? 'border-t border-separator px-3 py-2' : undefined}>
          {error !== undefined
            ? <FieldError>{error}</FieldError>
            : status !== undefined && <Description className={statusTone === 'success' ? 'text-success' : undefined}>{status}</Description>}
        </div>
      </TextField>
      {children}
    </div>
  )
}

import type { IconComponent } from '@/components/icons'

import { Button, InputGroup, Label, TextField } from '@heroui/react'

import { CloseIcon } from '@/components/icons'

/**
 * A text input as a white pill with a shadow, for floating over a map (the search pill of Google Maps, the address
 * field of Airbnb's location step). A leading icon and a clear button once it holds text. The words that go with it
 * (what happened to the text) belong to the caller, who shows them where they fit; `isInvalid` only rings the pill.
 */
export function MapLinkPill({ label, icon: Icon, clearLabel, value, onChange, onClear, isInvalid, placeholder, inputMode, onBlur, onKeyDown, onPaste }: {
  /** The input's name for screen readers; the pill shows no label. */
  label: string
  icon: IconComponent
  clearLabel: string
  value: string
  onChange: (value: string) => void
  onClear: () => void
  isInvalid?: boolean
  placeholder?: string
  inputMode?: 'url' | 'text'
  onBlur?: () => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onPaste?: (event: React.ClipboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="pointer-events-auto rounded-full bg-overlay shadow-overlay has-[[data-slot=input-group-input]:focus]:ring-2 has-[[data-slot=input-group-input]:focus]:ring-focus has-[[data-invalid=true]]:ring-2 has-[[data-invalid=true]]:ring-danger">
      <TextField fullWidth isInvalid={isInvalid} value={value} onChange={onChange}>
        <Label className="sr-only">{label}</Label>
        <InputGroup fullWidth className="rounded-full border-0 bg-transparent shadow-none outline-none has-[:focus]:ring-0 data-[invalid=true]:outline-none">
          <InputGroup.Prefix className="border-0 pe-0 ps-1">
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
      </TextField>
    </div>
  )
}

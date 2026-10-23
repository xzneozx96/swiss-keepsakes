import { Button, FieldError, Form, Input, Label, TextField } from '@heroui/react'
import { useEffect, useRef, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDisplayName } from '../hooks/use-display-name'
import { cleanDisplayName, DISPLAY_NAME_MAX } from '../lib/display-name'

/**
 * Asks the person for the name the store sees (E2.4). The invitation holds no name, so a user whose account has none
 * says it here and it is saved on their own account. A02 shows it above the checklist and M01 before the store
 * opens, where `onDone` leaves the screen, with or without a name.
 */
export function DisplayNameForm({ onDone }: { onDone?: () => void }) {
  const { t } = useLocale()
  const { save, saving, failed, reset } = useDisplayName()
  const [value, setValue] = useState('')
  const [invalid, setInvalid] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (onDone)
      headingRef.current?.focus()
  }, [onDone])

  const submit = () => {
    const name = cleanDisplayName(value)

    if (!name) {
      setInvalid(true)

      return
    }
    save(name, { onSuccess: () => onDone?.() })
  }

  return (
    <section aria-labelledby="stores-name" className="flex flex-col gap-3">
      <h2 ref={headingRef} className="text-heading outline-none" id="stores-name" tabIndex={-1}>{t('stores.name.title')}</h2>
      <Form
        className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <p className="text-sm text-pretty text-muted">{t('stores.name.text')}</p>
        <TextField
          fullWidth
          autoComplete="name"
          isInvalid={invalid}
          maxLength={DISPLAY_NAME_MAX}
          name="displayName"
          value={value}
          onChange={(next) => {
            setValue(next)
            setInvalid(false)
            reset()
          }}
        >
          <Label>{t('stores.name.label')}</Label>
          <Input />
          <FieldError>{t('stores.name.invalid')}</FieldError>
        </TextField>
        {failed && <p className="text-sm text-danger" role="alert">{t('stores.name.failed')}</p>}
        <Button className="min-h-11" isPending={saving} type="submit">
          {t(onDone ? 'stores.name.saveContinue' : 'stores.name.save')}
        </Button>
        {onDone && (
          <Button className="min-h-11" variant="tertiary" onPress={onDone}>
            {t('stores.name.skip')}
          </Button>
        )}
      </Form>
    </section>
  )
}

/** The name form for A02: it shows only while the account has no name, and goes once the name is saved. */
export function DisplayNamePrompt() {
  const { needsName } = useDisplayName()

  return needsName ? <DisplayNameForm /> : null
}

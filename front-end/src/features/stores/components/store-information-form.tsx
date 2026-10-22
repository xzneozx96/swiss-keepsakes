import type { Store } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Button, FieldError, Form, Input, Label, Radio, RadioGroup, TextField, toast } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { ProblemNotice } from './problem-notice'

interface Draft { name?: string, language?: Language }

/**
 * The editable part of the store's information: its name and default language. Only the Owner may save. What the
 * Owner typed is kept apart from what the API last said, so a read in the background never wipes an edit in
 * progress, and a field the Owner has not touched follows the API.
 */
export function StoreInformationForm({ store }: { store: Store }) {
  const { t } = useLocale()
  const [draft, setDraft] = useState<Draft>({})
  const [nameInvalid, setNameInvalid] = useState(false)
  const { submit, isPending, error } = useSubmit('stores', 'updateStoreInformation')
  const name = draft.name ?? store.name
  const language = draft.language ?? store.defaultLanguage
  const changed = name.trim() !== store.name || language !== store.defaultLanguage
  const input = { storeId: store.id, name: name.trim(), defaultLanguage: language }
  const key = useIdempotencyKey(input)

  const save = () => {
    if (!input.name) {
      setNameInvalid(true)

      return
    }
    submit({ ...input, idempotencyKey: key.next() }, {
      onSuccess: () => {
        key.settled()
        setDraft({})
        toast.success(t('stores.info.saved'))
      },
      onError: failure => key.settled(failure),
    })
  }

  return (
    <section aria-labelledby="stores-information" className="flex flex-col gap-3">
      <h2 className="text-heading" id="stores-information">{t('stores.info.title')}</h2>
      <Form
        className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <TextField
          fullWidth
          autoComplete="organization"
          isInvalid={nameInvalid}
          maxLength={120}
          name="name"
          value={name}
          onChange={(value) => {
            setDraft(current => ({ ...current, name: value }))
            setNameInvalid(false)
          }}
        >
          <Label>{t('stores.info.name')}</Label>
          <Input />
          <FieldError>{t('stores.info.nameInvalid')}</FieldError>
        </TextField>
        <RadioGroup name="defaultLanguage" value={language} onChange={value => setDraft(current => ({ ...current, language: value as Language }))}>
          <Label>{t('stores.info.language')}</Label>
          {(['en', 'de'] as const).map(code => (
            <Radio key={code} value={code}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`stores.create.language.${code}`)}
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        {error && (
          <ProblemNotice
            error={error}
            message={error instanceof ApiProblem && error.type === 'forbidden' ? 'stores.info.forbidden' : undefined}
          />
        )}
        <Button isDisabled={!changed} isPending={isPending} type="submit">
          {t('stores.info.save')}
        </Button>
      </Form>
    </section>
  )
}

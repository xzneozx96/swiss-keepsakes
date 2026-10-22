import type { Store } from '@sk/api-contract'
import type { Language } from '@sk/domain/shared'

import { Button, FieldError, Form, Input, Label, Radio, RadioGroup, TextField, toast } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { ProblemNotice } from './problem-notice'

/** The editable part of the store's information: its name and default language. Only the Owner may save. */
export function StoreInformationForm({ store }: { store: Store }) {
  const { t } = useLocale()
  const [name, setName] = useState(store.name)
  const [language, setLanguage] = useState<Language>(store.defaultLanguage)
  const [nameInvalid, setNameInvalid] = useState(false)
  const update = useCommand('stores', 'updateStoreInformation')
  const changed = name.trim() !== store.name || language !== store.defaultLanguage

  const save = () => {
    const trimmed = name.trim()

    if (!trimmed) {
      setNameInvalid(true)

      return
    }
    update.mutate(
      { storeId: store.id, name: trimmed, defaultLanguage: language },
      { onSuccess: () => toast.success(t('stores.info.saved')) },
    )
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
          isInvalid={nameInvalid}
          maxLength={120}
          name="name"
          value={name}
          onChange={(value) => {
            setName(value)
            setNameInvalid(false)
          }}
        >
          <Label>{t('stores.info.name')}</Label>
          <Input />
          <FieldError>{t('stores.info.nameInvalid')}</FieldError>
        </TextField>
        <RadioGroup name="defaultLanguage" value={language} onChange={value => setLanguage(value as Language)}>
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
        {update.isError && (
          <ProblemNotice
            error={update.error}
            message={update.error instanceof ApiProblem && update.error.type === 'forbidden' ? 'stores.info.forbidden' : undefined}
          />
        )}
        <Button isDisabled={!changed} isPending={update.isPending} type="submit">
          {t('stores.info.save')}
        </Button>
      </Form>
    </section>
  )
}

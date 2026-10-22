import type { Language } from '@sk/domain/shared'

import { Button, FieldError, Form, Input, Label, Radio, RadioGroup, TextField, toast } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useCommand } from '@/features/data-client/use-command'
import { slugFromName } from '../lib/slug'
import { ProblemNotice } from './problem-notice'

const EMAIL = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/**
 * A01's form: the store's name, the Owner's email and one language, used for the store's default language and
 * for the invitation mail. The API wants a URL name too, which comes from the store name.
 */
export function CreateStoreForm() {
  const { t, language: screenLanguage } = useLocale()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<Language>(screenLanguage)
  const [invalid, setInvalid] = useState({ name: false, email: false })
  const create = useCommand('stores', 'createStore')
  const problem = create.error instanceof ApiProblem ? create.error : undefined
  const slugTaken = problem?.type === 'store-slug-taken'
  const ownerIsSuperAdmin = problem?.type === 'owner-is-super-admin'

  const submit = () => {
    const slug = slugFromName(name)
    const next = { name: name.trim() === '' || slug.length < 2, email: !EMAIL.test(email.trim()) }

    setInvalid(next)
    if (next.name || next.email)
      return
    create.mutate(
      { slug, name: name.trim(), defaultLanguage: language, language, ownerEmail: email.trim() },
      {
        onSuccess: (store) => {
          toast.success(t('stores.create.done', { email: store.invitation?.email ?? email.trim() }))
          setName('')
          setEmail('')
        },
      },
    )
  }

  return (
    <section aria-labelledby="stores-create" className="flex flex-col gap-3">
      <h2 className="text-heading" id="stores-create">{t('stores.create.title')}</h2>
      <Form
        className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <TextField
          fullWidth
          isInvalid={invalid.name || slugTaken}
          maxLength={120}
          name="name"
          value={name}
          onChange={(value) => {
            setName(value)
            setInvalid(current => ({ ...current, name: false }))
            create.reset()
          }}
        >
          <Label>{t('stores.create.name')}</Label>
          <Input />
          <FieldError>{slugTaken ? t('stores.create.slugTaken') : t('stores.create.nameInvalid')}</FieldError>
        </TextField>
        <TextField
          fullWidth
          autoComplete="off"
          isInvalid={invalid.email || ownerIsSuperAdmin}
          name="ownerEmail"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value)
            setInvalid(current => ({ ...current, email: false }))
            create.reset()
          }}
        >
          <Label>{t('stores.create.email')}</Label>
          <Input inputMode="email" />
          <FieldError>{ownerIsSuperAdmin ? t('stores.create.ownerIsSuperAdmin') : t('stores.create.emailInvalid')}</FieldError>
        </TextField>
        <RadioGroup name="language" value={language} onChange={value => setLanguage(value as Language)}>
          <Label>{t('stores.create.language')}</Label>
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
        {create.isError && !slugTaken && !ownerIsSuperAdmin && <ProblemNotice error={create.error} />}
        <Button fullWidth isPending={create.isPending} type="submit">
          {t('stores.create.submit')}
        </Button>
      </Form>
    </section>
  )
}

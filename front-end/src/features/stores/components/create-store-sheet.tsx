import type { Language } from '@sk/domain/shared'

import { Button, Description, FieldError, Form, Input, Label, Radio, RadioGroup, TextField } from '@heroui/react'
import { useId, useState } from 'react'

import { EmailIcon } from '@/components/icons'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { choiceCard } from '../lib/choice-card'
import { slugFromName } from '../lib/slug'
import { ProblemNotice } from './problem-notice'

const EMAIL = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/**
 * A01's sheet: the store's name, the Owner's email and one language, used for the store's default language and
 * for the invitation mail. The API wants a URL name too, which comes from the store name. The sheet closes
 * itself on success, so a failure keeps what was typed and the key of the attempt.
 */
export function CreateStoreSheet({ onClose }: { onClose: () => void }) {
  const { t, language: screenLanguage } = useLocale()
  const formId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<Language>(screenLanguage)
  const [invalid, setInvalid] = useState({ name: false, email: false })
  const { submit: send, isPending, error, reset } = useSubmit('stores', 'createStore', {
    // Every refusal shows inline (ProblemNotice or a field error), so the cache stays silent on error.
    meta: {
      success: (store, input) => t('stores.create.done', { email: store.invitation?.email ?? input.ownerEmail }),
      silent: true,
    },
  })
  const slug = slugFromName(name)
  const input = { slug, name: name.trim(), defaultLanguage: language, language, ownerEmail: email.trim() }
  const key = useIdempotencyKey(input)
  const problem = error instanceof ApiProblem ? error : undefined
  const slugTaken = problem?.type === 'store-slug-taken'
  const ownerIsSuperAdmin = problem?.type === 'owner-is-super-admin'

  const submit = () => {
    const next = { name: name.trim() === '' || slug.length < 2, email: !EMAIL.test(email.trim()) }

    setInvalid(next)
    if (next.name || next.email)
      return
    send({ ...input, idempotencyKey: key.next() }, {
      onSuccess: () => {
        key.settled()
        onClose()
      },
      onError: error => key.settled(error),
    })
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" form={formId} isPending={isPending} type="submit">
            {t('stores.create.submit')}
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>
            {t('stores.create.cancel')}
          </Button>
        </>
      )}
      title={t('stores.create.title')}
      onClose={onClose}
    >
      <Form
        className="flex flex-col gap-6"
        id={formId}
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <TextField
          fullWidth
          isInvalid={invalid.name || slugTaken}
          autoComplete="organization"
          maxLength={120}
          name="name"
          value={name}
          onChange={(value) => {
            setName(value)
            setInvalid(current => ({ ...current, name: false }))
            reset()
          }}
        >
          <Label className="text-heading">{t('stores.create.name')}</Label>
          <Input />
          {slug && <Description>{t('stores.create.slug', { slug })}</Description>}
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
            reset()
          }}
        >
          <Label className="text-heading">{t('stores.create.email')}</Label>
          <Input inputMode="email" />
          <FieldError>{ownerIsSuperAdmin ? t('stores.create.ownerIsSuperAdmin') : t('stores.create.emailInvalid')}</FieldError>
        </TextField>
        <RadioGroup name="language" value={language} onChange={value => setLanguage(value as Language)}>
          <Label className="text-heading">{t('stores.create.language')}</Label>
          {(['en', 'de'] as const).map(code => (
            <Radio key={code} className={choiceCard} value={code}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`stores.create.language.${code}`)}
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        <p className="flex items-start gap-3 rounded-2xl bg-surface-secondary p-4 text-sm text-pretty">
          <EmailIcon aria-hidden className="mt-0.5 shrink-0" size={18} />
          {t('stores.create.note')}
        </p>
        {error && !slugTaken && !ownerIsSuperAdmin && <ProblemNotice error={error} />}
      </Form>
    </SheetFrame>
  )
}

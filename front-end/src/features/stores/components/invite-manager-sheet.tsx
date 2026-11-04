import type { Language } from '@sk/domain/shared'

import { Button, FieldError, Form, Input, Label, Radio, RadioGroup, TextField } from '@heroui/react'
import { useId, useState } from 'react'

import { choiceCard } from '@/components/choice-card'
import { SheetFrame } from '@/components/sheet-frame'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { useSubmit } from '@/features/data-client/use-command'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import { useMemberFailure } from '../hooks/use-member-failure'
import { memberProblemKey } from '../lib/member-problems'
import { ProblemNotice } from './problem-notice'

const EMAIL = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/** The refusals that are about the address, so they show under the email field. */
const FIELD_PROBLEMS = ['already-a-member', 'invitation-already-open', 'manager-is-super-admin']

/**
 * M22's invite sheet, the Members table's header action: the Store Manager's email and the language of the
 * invitation mail. It closes itself on success, with the toast; a refusal keeps what was typed and the key of the
 * attempt, and shows under the field or as a notice.
 */
export function InviteManagerSheet({ storeId, onClose }: { storeId: string, onClose: () => void }) {
  const { t, language: screenLanguage } = useLocale()
  const formId = useId()
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState<Language>(screenLanguage)
  const [invalid, setInvalid] = useState(false)
  const input = { storeId, email: email.trim(), language }
  // Every refusal shows inline, next to the field or through ProblemNotice, so the cache stays silent.
  const { submit: send, isPending, error, reset } = useSubmit('stores', 'inviteManager', {
    meta: { success: () => t('stores.members.invite.done', { email: input.email }), silent: true },
  })
  const key = useIdempotencyKey(input)
  const fail = useMemberFailure(storeId)
  const problem = error instanceof ApiProblem ? error : undefined
  const ofField = problem !== undefined && FIELD_PROBLEMS.includes(problem.type)

  const submit = () => {
    const bad = !EMAIL.test(input.email)

    setInvalid(bad)
    if (bad)
      return
    send({ ...input, idempotencyKey: key.next() }, {
      onSuccess: () => {
        key.settled()
        onClose()
      },
      onError: (failure) => {
        key.settled(failure)
        fail(failure)
      },
    })
  }

  return (
    <SheetFrame
      isOpen
      footer={(
        <>
          <Button fullWidth className="min-h-11" form={formId} isPending={isPending} type="submit">
            {t('stores.members.invite.submit')}
          </Button>
          <Button fullWidth className="min-h-11" variant="tertiary" onPress={onClose}>
            {t('stores.create.cancel')}
          </Button>
        </>
      )}
      title={t('stores.members.invite.title')}
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
          autoComplete="off"
          isInvalid={invalid || ofField}
          name="managerEmail"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value)
            setInvalid(false)
            reset()
          }}
        >
          <Label className="text-heading">{t('stores.members.invite.email')}</Label>
          <Input inputMode="email" />
          <FieldError>{ofField ? t(memberProblemKey(error)) : t('stores.members.invite.emailInvalid')}</FieldError>
        </TextField>
        <RadioGroup name="language" value={language} onChange={value => setLanguage(value as Language)}>
          <Label className="text-heading">{t('stores.members.invite.language')}</Label>
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
        {error && !ofField && <ProblemNotice error={error} message={memberProblemKey(error)} />}
      </Form>
    </SheetFrame>
  )
}

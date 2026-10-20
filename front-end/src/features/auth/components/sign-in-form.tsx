import type { SignInView } from '../hooks/use-sign-in'

import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  InputOTP,
  Label,
  Separator,
  TextField,
} from '@heroui/react'
import { useEffect, useRef } from 'react'

import { BackIcon } from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'
import { CODE_LENGTH } from '../hooks/use-sign-in'

/**
 * C05 sign-in form: Google or an emailed 6-digit code, no password and no sign-up (one
 * flow does both). The step heading is the screen's h1; the code step's back arrow
 * returns to the start step, not out of the screen.
 */
export function SignInForm({ view }: { view: SignInView }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          {view.step === 'code' && (
            <Button
              isIconOnly
              aria-label={t('auth.changeEmail')}
              className="-ms-2.5"
              size="sm"
              variant="ghost"
              onPress={view.changeEmail}
            >
              <BackIcon size={20} />
            </Button>
          )}
          <h1 className="font-serif text-display text-balance">
            {view.step === 'code' ? t('auth.code.title') : t('auth.title')}
          </h1>
        </div>
        <p className="text-body text-pretty text-muted">
          {view.step === 'code'
            ? t('auth.code.sent', { email: view.sentTo })
            : t('auth.intro')}
        </p>
      </div>
      {view.step === 'start'
        ? (
            <StartStep view={view} />
          )
        : (
            <CodeStep view={view} />
          )}
    </div>
  )
}

function StartStep({ view }: { view: SignInView }) {
  const { t } = useLocale()

  return (
    <div className="flex flex-col gap-5">
      <ProblemMessage problem={view.problem} retryAfter={view.retryAfter} />
      <Button
        fullWidth
        isPending={view.googlePending}
        size="lg"
        variant="secondary"
        onPress={view.continueWithGoogle}
      >
        <GoogleMark />
        {t('auth.google')}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted">
        <Separator className="flex-1" />
        {t('auth.or')}
        <Separator className="flex-1" />
      </div>
      <Form
        className="flex flex-col gap-4"
        validationBehavior="aria"
        onSubmit={(e) => {
          e.preventDefault()
          view.submitEmail()
        }}
      >
        <TextField
          fullWidth
          autoComplete="email"
          isInvalid={view.emailError}
          name="email"
          type="email"
          value={view.email}
          onChange={view.onEmailChange}
        >
          <Label>{t('auth.email.label')}</Label>
          <Input inputMode="email" />
          <FieldError>{t('auth.email.invalid')}</FieldError>
        </TextField>
        <Button fullWidth isPending={view.sending} size="lg" type="submit">
          {t('auth.email.send')}
        </Button>
      </Form>
    </div>
  )
}

/** What the code step needs; P01 (partner access) reuses it with a fixed email (step 5.6). */
export type CodeStepView = Pick<
  SignInView,
  | 'status'
  | 'codeSentAt'
  | 'resendIn'
  | 'code'
  | 'onCodeChange'
  | 'verify'
  | 'resend'
  | 'attemptsLeft'
  | 'codeMinutes'
> & {
  /** Absent when the email cannot be changed (P01). */
  changeEmail?: () => void
} & Partial<Pick<SignInView, 'sending' | 'verifying' | 'problem' | 'retryAfter'>>

export function CodeStep({ view }: { view: CodeStepView }) {
  const { t } = useLocale()
  const needsNewCode = view.status === 'expired' || view.status === 'locked'
  const codeInputRef = useRef<HTMLInputElement>(null)

  // Each new code (first send or resend) puts the cursor in the code field.
  useEffect(() => codeInputRef.current?.focus(), [view.codeSentAt])
  const resendLabel
    = view.resendIn > 0
      ? t('auth.code.resendIn', {
          time: `0:${String(view.resendIn).padStart(2, '0')}`,
        })
      : t('auth.code.resend')

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-in-code">{t('auth.code.label')}</Label>
        <Description id="sign-in-code-hint">
          {t('auth.code.hint', {
            length: CODE_LENGTH,
            minutes: view.codeMinutes,
          })}
        </Description>
        <InputOTP
          ref={codeInputRef}
          aria-describedby="sign-in-code-hint sign-in-code-error"
          id="sign-in-code"
          inputMode="numeric"
          isDisabled={needsNewCode}
          isInvalid={view.status !== 'idle'}
          maxLength={CODE_LENGTH}
          pattern="^\d+$"
          value={view.code}
          onChange={view.onCodeChange}
          onComplete={view.verify}
        >
          <InputOTP.Group>
            <InputOTP.Slot index={0} />
            <InputOTP.Slot index={1} />
            <InputOTP.Slot index={2} />
          </InputOTP.Group>
          <InputOTP.Separator />
          <InputOTP.Group>
            <InputOTP.Slot index={3} />
            <InputOTP.Slot index={4} />
            <InputOTP.Slot index={5} />
          </InputOTP.Group>
        </InputOTP>
        <div id="sign-in-code-error" role="alert">
          <CodeMessage view={view} />
          <ProblemMessage problem={view.problem ?? null} retryAfter={view.retryAfter ?? 60} />
        </div>
      </div>

      {needsNewCode
        ? (
            <Button
              fullWidth
              isPending={view.sending}
              size="lg"
              onPress={view.resend}
            >
              {t('auth.code.sendNew')}
            </Button>
          )
        : (
            <Button
              fullWidth
              isDisabled={view.code.length !== CODE_LENGTH}
              isPending={view.verifying}
              size="lg"
              onPress={() => view.verify(view.code)}
            >
              {t('auth.code.submit')}
            </Button>
          )}

      <div className="flex flex-col items-center gap-1 text-sm">
        {!needsNewCode && (
          <p className="flex items-center gap-1 text-muted">
            {t('auth.code.noEmail')}
            <Button
              className="h-auto min-w-0 px-1 underline underline-offset-4"
              isDisabled={view.resendIn > 0 || view.sending}
              size="sm"
              variant="ghost"
              onPress={view.resend}
            >
              <span className="tabular-nums">{resendLabel}</span>
            </Button>
          </p>
        )}
        {view.changeEmail && (
          <Button
            className="h-auto min-w-0 px-1 underline underline-offset-4"
            size="sm"
            variant="ghost"
            onPress={view.changeEmail}
          >
            {t('auth.changeEmail')}
          </Button>
        )}
      </div>
    </div>
  )
}

function CodeMessage({ view }: { view: CodeStepView }) {
  const { t } = useLocale()

  if (view.status === 'wrong') {
    return (
      <div className="flex flex-col gap-2">
        <p data-visible className="field-error">
          {t('auth.code.wrong')}
        </p>
        <p className="text-sm text-muted">
          {t(
            view.attemptsLeft === 1
              ? 'auth.code.attemptsLeft.one'
              : 'auth.code.attemptsLeft.other',
            { count: view.attemptsLeft },
          )}
        </p>
      </div>
    )
  }
  if (view.status === 'expired') {
    return (
      <p data-visible className="field-error">
        {t('auth.code.expired', { minutes: view.codeMinutes })}
      </p>
    )
  }
  if (view.status === 'locked') {
    return (
      <p data-visible className="field-error">
        {t('auth.code.locked')}
      </p>
    )
  }

  return null
}

const problemMessage = {
  google: 'auth.google.failed',
  unavailable: 'auth.unavailable',
  rateLimited: 'auth.rateLimited',
} as const

/** A failed call to the API or a Google sign-in that did not finish. It shows next to the code message, so a failed resend is never hidden by an expired or locked code. */
function ProblemMessage({
  problem,
  retryAfter,
}: {
  problem: SignInView['problem']
  retryAfter: number
}) {
  const { t } = useLocale()

  if (!problem)
    return null

  return (
    <p data-visible className="field-error" role="alert">
      {t(problemMessage[problem], { seconds: retryAfter })}
    </p>
  )
}

/** Google's "G" mark, as its sign-in branding guidelines ask for on the button. */
function GoogleMark() {
  return (
    <svg aria-hidden height="18" viewBox="0 0 48 48" width="18">
      <path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
        fill="#FFC107"
      />
      <path
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        fill="#FF3D00"
      />
      <path
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
        fill="#4CAF50"
      />
      <path
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
        fill="#1976D2"
      />
    </svg>
  )
}

import { useCallback, useEffect, useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useDemo } from '@/features/demo'
import { demoNow } from '@/features/demo/clock'
import { sendMail } from '@/features/notifications/mail'
import { demoGuest } from '@/features/orders/seed'

const EMAIL_SHAPE = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/

/** Spec §4.5 and §6 N01: a code works for 10 minutes; resend unlocks after 30 seconds. */
export const CODE_LENGTH = 6
export const CODE_LIFETIME_MS = 10 * 60_000
export const RESEND_AFTER_MS = 30_000

/** UX proposal (spec §4.5): 5 tries per code, then a new code is needed. */
export const MAX_ATTEMPTS = 5
/** Prototype codes: any 6 digits sign in, except these two (P01 uses the same rule). */
export const WRONG_CODE = '000000'
export const EXPIRED_CODE = '999999'
const GOOGLE_DELAY_MS = 700

export type CodeStatus = 'idle' | 'wrong' | 'expired' | 'locked'

interface CodeStep {
  email: string
  /** Demo time the latest code was sent; expiry counts from here. */
  sentAt: number
  /** Real time the resend link unlocks. */
  resendAt: number
  attempts: number
  status: CodeStatus
}

/**
 * C05 sign-in state: Google (simulated) or an emailed 6-digit code. The state lives in the
 * caller, so closing the sheet to read N01 in the Mail panel keeps the code step.
 */
export function useSignIn(onSignedIn: () => void) {
  const { state, update } = useDemo()
  const { language } = useLocale()
  const [email, setEmail] = useState(demoGuest.email)
  const [emailError, setEmailError] = useState(false)
  const [code, setCode] = useState('')
  const [codeStep, setCodeStep] = useState<CodeStep | null>(null)
  const [googlePending, setGooglePending] = useState(false)
  const [realNow, setRealNow] = useState(() => Date.now())

  const resendIn = codeStep
    ? Math.max(0, Math.ceil((codeStep.resendAt - realNow) / 1000))
    : 0

  // Ticks only while the resend countdown runs.
  useEffect(() => {
    if (resendIn === 0)
      return
    const timer = window.setInterval(() => setRealNow(Date.now()), 1000)

    return () => window.clearInterval(timer)
  }, [resendIn])

  const finish = useCallback(() => {
    update(s => ({
      ...s,
      data: { ...s.data, signedInGuestId: demoGuest.id },
    }))
    setCodeStep(null)
    setCode('')
    onSignedIn()
  }, [update, onSignedIn])

  const sendCode = (to: string) => {
    const now = Date.now()
    const sentAt = demoNow(state.clockStartedAt, now)
    // Shown only in the N01 email; any 6 digits sign in (see the codes above).
    const mailedCode = String(Math.floor(100_000 + Math.random() * 900_000))

    update(s =>
      sendMail(s, {
        at: sentAt.toISOString(),
        to: 'guest',
        guestId: demoGuest.id,
        language,
        template: 'N01',
        params: { code: mailedCode, email: to },
      }),
    )
    setCodeStep({
      email: to,
      sentAt: sentAt.getTime(),
      resendAt: now + RESEND_AFTER_MS,
      attempts: 0,
      status: 'idle',
    })
    setRealNow(now)
    setCode('')
  }

  const submitEmail = () => {
    const trimmed = email.trim()

    if (!EMAIL_SHAPE.test(trimmed)) {
      setEmailError(true)

      return
    }
    sendCode(trimmed)
  }

  const verify = (value: string) => {
    if (!codeStep || codeStep.status === 'locked')
      return
    if (value.length !== CODE_LENGTH)
      return

    const age = demoNow(state.clockStartedAt).getTime() - codeStep.sentAt

    if (value === EXPIRED_CODE || age > CODE_LIFETIME_MS) {
      setCodeStep({ ...codeStep, status: 'expired' })
      setCode('')

      return
    }
    if (value === WRONG_CODE) {
      const attempts = codeStep.attempts + 1

      setCodeStep({
        ...codeStep,
        attempts,
        status: attempts >= MAX_ATTEMPTS ? 'locked' : 'wrong',
      })
      setCode('')

      return
    }
    finish()
  }

  const continueWithGoogle = () => {
    setGooglePending(true)
    window.setTimeout(() => {
      setGooglePending(false)
      finish()
    }, GOOGLE_DELAY_MS)
  }

  return {
    step: codeStep ? ('code' as const) : ('start' as const),
    email,
    emailError,
    onEmailChange: (value: string) => {
      setEmail(value)
      setEmailError(false)
    },
    submitEmail,
    googlePending,
    continueWithGoogle,
    sentTo: codeStep?.email ?? '',
    /** Changes with every code sent, so the sheet can refocus the code field. */
    codeSentAt: codeStep?.sentAt ?? 0,
    code,
    onCodeChange: (value: string) => {
      setCode(value)
      // Typing again clears a wrong-code message; expired and locked need a new code.
      if (codeStep?.status === 'wrong') {
        setCodeStep({ ...codeStep, status: 'idle' })
      }
    },
    verify,
    status: codeStep?.status ?? 'idle',
    attemptsLeft: MAX_ATTEMPTS - (codeStep?.attempts ?? 0),
    resendIn,
    resend: () => codeStep && sendCode(codeStep.email),
    changeEmail: () => {
      setCodeStep(null)
      setCode('')
    },
  }
}

export type SignInView = ReturnType<typeof useSignIn>

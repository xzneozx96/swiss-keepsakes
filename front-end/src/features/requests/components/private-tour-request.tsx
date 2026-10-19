import type { PrivateTourErrors } from '../hooks/use-private-tour'

import {
  Button,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  TextArea,
  TextField,
} from '@heroui/react'
import { zurichDate } from '@sk/domain/catalog'
import { formatShortDate } from '@sk/domain/shared'

import { useNavigate } from '@tanstack/react-router'

import { useRef, useState } from 'react'
import { PickupDateIcon } from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { BackButton } from '@/components/layout/cart-button'
import { QuantityStepper } from '@/components/quantity-stepper'
import {
  SurfaceCard,
  SurfaceCardBlock,
  SurfaceCardTitle,
} from '@/components/surface-card'
import { useLocale } from '@/contexts/locale-context'
import { DateSheet } from '@/features/checkout/components/trip-profile'
import { useDemoNow } from '@/features/demo'
import { useBack } from '@/hooks/use-back'
import {
  GROUP_MAX,
  GROUP_MIN,
  usePrivateTour,
} from '../hooks/use-private-tour'

type DateHalf = 'from' | 'to'

// Tab scrolls a focused field clear of the sticky send bar, as on C11.
const clearOfFooter = 'scroll-mb-28'

/**
 * C22 Private tour request (spec §4, D8, A1), in C11's grammar: the tinted note, then white
 * cards for the group and its dates (C07's date pair and sheet), interests and the email,
 * and the send button at the end. No sign-in; errors show under their field and keep
 * everything entered.
 */
export function PrivateTourRequest() {
  const { t, intlLocale } = useLocale()
  const navigate = useNavigate()
  const back = useBack(() => void navigate({ to: '/tours', replace: true }))
  const request = usePrivateTour()
  const today = zurichDate(useDemoNow())

  const [groupSize, setGroupSize] = useState(2)
  const [dateFrom, setDateFrom] = useState<string>()
  const [dateTo, setDateTo] = useState<string>()
  const [interests, setInterests] = useState('')
  const [email, setEmail] = useState(request.defaultEmail)
  const [errors, setErrors] = useState<PrivateTourErrors>({})
  const [sheet, setSheet] = useState<DateHalf>()
  const fromRef = useRef<HTMLButtonElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const result = request.send({
      groupSize,
      dateFrom,
      dateTo,
      interests,
      email,
    })

    if (!result.ok) {
      setErrors(result.errors);
      (result.errors.dates ? fromRef : emailRef).current?.focus()

      return
    }
    void navigate({
      to: '/tours/private-tour/sent',
      search: { request: result.requestId },
      replace: true,
    })
  }

  const dateHalf = (half: DateHalf) => {
    const value = half === 'from' ? dateFrom : dateTo
    const shown = value
      ? formatShortDate(value, today, intlLocale)
      : t('privateTour.dates.add')

    return (
      <button
        ref={half === 'from' ? fromRef : undefined}
        aria-describedby={
          half === 'from' && errors.dates
            ? 'private-tour-dates-error'
            : undefined
        }
        aria-invalid={half === 'from' && errors.dates ? true : undefined}
        aria-label={`${t(`privateTour.dates.${half}`)}, ${shown}`}
        className={`flex min-w-0 flex-col gap-0.5 px-4 py-3 text-start outline-none transition-colors hover:bg-surface-secondary focus-visible:focus-ring ${
          half === 'from' ? 'rounded-s-2xl' : 'rounded-e-2xl'
        }`}
        type="button"
        onClick={() => setSheet(half)}
      >
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <PickupDateIcon aria-hidden className="shrink-0" size={14} />
          {t(`privateTour.dates.${half}`)}
        </span>
        <span className={value ? 'font-medium' : 'text-muted'}>{shown}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 ps-4 pe-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton label={t('privateTour.back')} onPress={back} />
        <h1 className="font-serif text-title">{t('privateTour.title')}</h1>
      </header>
      <Form
        className="flex flex-1 flex-col"
        validationBehavior="aria"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
          <InfoNote text={t('privateTour.intro')} />
          <div className="flex flex-col gap-4 pt-1">
            <SurfaceCard aria-labelledby="private-tour-group">
              <SurfaceCardBlock className="gap-5">
                <SurfaceCardTitle id="private-tour-group">
                  {t('privateTour.group.title')}
                </SurfaceCardTitle>
                <QuantityStepper
                  hint={t('privateTour.size.hint')}
                  label={t('privateTour.size.label')}
                  max={GROUP_MAX}
                  min={GROUP_MIN}
                  value={groupSize}
                  onChange={setGroupSize}
                />
                <div
                  aria-labelledby="private-tour-dates"
                  className="flex flex-col gap-3"
                  role="group"
                >
                  <span className="text-sm font-medium" id="private-tour-dates">
                    {t('privateTour.dates.question')}
                  </span>
                  <div
                    className={`grid grid-cols-2 divide-x rounded-2xl border ${
                      errors.dates
                        ? 'divide-danger border-danger'
                        : 'divide-field-border border-field-border'
                    }`}
                  >
                    {dateHalf('from')}
                    {dateHalf('to')}
                  </div>
                  {errors.dates
                    ? (
                        <p
                          className="text-sm text-danger"
                          id="private-tour-dates-error"
                        >
                          {t('privateTour.dates.error')}
                        </p>
                      )
                    : (
                        <p className="text-sm text-muted">
                          {t('privateTour.dates.hint')}
                        </p>
                      )}
                </div>
              </SurfaceCardBlock>
            </SurfaceCard>

            <SurfaceCard aria-labelledby="private-tour-interests">
              <SurfaceCardBlock>
                <TextField
                  fullWidth
                  maxLength={1000}
                  name="private-tour-interests"
                  value={interests}
                  onChange={setInterests}
                >
                  <Label
                    className="flex items-center justify-between gap-3"
                    id="private-tour-interests"
                  >
                    <span className="font-serif text-card-title">
                      {t('privateTour.interests.title')}
                    </span>
                    <span className="text-sm font-normal text-muted">
                      {t('advice.optional')}
                    </span>
                  </Label>
                  <TextArea
                    className={clearOfFooter}
                    placeholder={t('privateTour.interests.placeholder')}
                    rows={3}
                  />
                </TextField>
              </SurfaceCardBlock>
            </SurfaceCard>

            <SurfaceCard aria-labelledby="private-tour-contact">
              <SurfaceCardBlock>
                <SurfaceCardTitle id="private-tour-contact">
                  {t('privateTour.contact.title')}
                </SurfaceCardTitle>
                <TextField
                  fullWidth
                  isRequired
                  isInvalid={!!errors.email}
                  name="private-tour-email"
                  type="email"
                  value={email}
                  onChange={(v) => {
                    setEmail(v)
                    setErrors(e => ({ ...e, email: undefined }))
                  }}
                >
                  <Label>{t('advice.email.label')}</Label>
                  <Input
                    ref={emailRef}
                    autoComplete="email"
                    className={clearOfFooter}
                    inputMode="email"
                    placeholder={t('advice.email.placeholder')}
                  />
                  {errors.email
                    ? (
                        <FieldError>
                          {t(
                            errors.email === 'missing'
                              ? 'advice.email.error'
                              : 'advice.email.invalid',
                          )}
                        </FieldError>
                      )
                    : (
                        <Description>{t('advice.email.help')}</Description>
                      )}
                </TextField>
              </SurfaceCardBlock>
            </SurfaceCard>
          </div>
        </div>

        <div className="sticky bottom-0 z-30 flex border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <Button fullWidth size="lg" type="submit">
            {t('privateTour.send')}
          </Button>
        </div>
      </Form>

      {sheet && (
        <DateSheet
          max={sheet === 'from' ? dateTo : undefined}
          min={sheet === 'to' && dateFrom ? dateFrom : today}
          title={t(
            sheet === 'from'
              ? 'privateTour.dates.fromTitle'
              : 'privateTour.dates.toTitle',
          )}
          value={sheet === 'from' ? dateFrom : dateTo}
          onClose={() => setSheet(undefined)}
          onDone={(iso) => {
            if (sheet === 'from') {
              setDateFrom(iso)
              setErrors(e => ({ ...e, dates: undefined }))
            }
            else {
              setDateTo(iso)
            }
            setSheet(undefined)
          }}
        />
      )}
    </div>
  )
}

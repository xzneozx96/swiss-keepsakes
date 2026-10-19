import type { MessageKey } from '@/i18n/en'

import { Alert, Button, Form, Input, Label, TextField } from '@heroui/react'
import {
  availableSeats,
  firstPaymentAmount,
  participantSeats,
  tourTotal,
} from '@sk/domain/bookings'
import { pickText } from '@sk/domain/shared'

import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import {
  BookingsIcon,
  ChevronRightIcon,
  InfoIcon,
  PickupIcon,
  TourIcon,
  TravelGroupIcon,
} from '@/components/icons'
import { InfoNote } from '@/components/info-note'
import { BackButton } from '@/components/layout/cart-button'
import { Media } from '@/components/media'
import {
  SurfaceCard,
  SurfaceCardBlock,
  SurfaceCardTitle,
} from '@/components/surface-card'
import { useLocale } from '@/contexts/locale-context'
import { useRequireSignIn } from '@/features/auth/hooks/use-require-sign-in'
import { useTourActions, useTours } from '@/features/tours/hooks/use-tours'
import { useBack } from '@/hooks/use-back'
import { useBookingFormat, useGroupText } from './booking-summary'
import { activeHold } from './transitions'

const errorKeys: Record<string, MessageKey> = {
  'contact': 'tourBooking.error.contact',
  'capacity': 'tourBooking.error.capacity',
  'departure': 'tourBooking.error.departure',
  'participants': 'tourBooking.error.participants',
  'sign-in': 'tourBooking.error.sign-in',
  'held': 'tourBooking.error.held',
  'participant-info': 'tourBooking.error.participantInfo',
}

const row = 'flex items-start gap-2 text-sm'
// Tab scrolls a focused control clear of the sticky footer (147px signed out, 69px signed in).
const clearOfFooter = 'scroll-mb-40'
const rowIcon = 'mt-0.5 shrink-0'

export function TourReviewPage({ slug }: { slug: string }) {
  const { data, tours, departures, draft, bookings, now, guestId } = useTours()
  const { updateDraft, createBooking } = useTourActions()
  const { t, language } = useLocale()
  const navigate = useNavigate()
  const { signedIn, requireSignIn } = useRequireSignIn()
  const { money, date } = useBookingFormat()
  const groupText = useGroupText()
  const [error, setError] = useState<{ code: string, bookingId?: string }>()
  // The booking just submitted: leave for payment only once it is really in the data.
  const [created, setCreated] = useState<{ id: string, later: boolean }>()
  const submittingRef = useRef(false)
  const alertRef = useRef<HTMLDivElement>(null)
  const createdBooking
    = created && bookings.find(booking => booking.id === created.id)
  const tour = tours.find(
    item => item.slug === slug && item.id === draft.tourId,
  )
  const departure = departures.find(
    item => item.id === draft.departureId && item.tourId === tour?.id,
  )
  const edit = useBack(
    () =>
      void navigate({
        to: '/tours/$slug',
        params: { slug },
        search: { book: true },
        replace: true,
      }),
  )

  useEffect(() => {
    if (!created)
      return
    if (createdBooking) {
      void navigate({
        to: created.later
          ? '/account/bookings/$bookingId/confirmed'
          : '/account/bookings/$bookingId/pay',
        params: { bookingId: created.id },
        replace: true,
      })

      return
    }
    // The seats went between the check and the save: nothing was created. The capacity error
    // below shows it, and the next tap may submit again.
    submittingRef.current = false
  }, [created, createdBooking, navigate])

  const savedNothing = !!created && !createdBooking

  useEffect(() => {
    if (error || savedNothing)
      alertRef.current?.scrollIntoView({ block: 'center' })
  }, [error, savedNothing])

  if (!tour || !departure) {
    return (
      <EmptyState
        action={{ label: t('tourBooking.explore'), to: '/tours' }}
        icon={TourIcon}
        message={t('tourBooking.error.departure')}
      />
    )
  }
  const total = tourTotal(tour, draft)
  const firstAmount = firstPaymentAmount(departure.policy, total)
  const text = (value: Parameters<typeof pickText>[0]) =>
    pickText(value, language)
  const fallback = [tour.name, tour.meetingPoint, tour.cancellationPolicy]
    .map(value => text(value))
    .find(value => value.isFallback && value.text)
  const held = guestId
    ? activeHold(data, guestId, departure.id, now)
    : undefined
  // C11 "departure just sold out" (or already held by this guest): shown as soon as it is
  // true, and rechecked on submit.
  const shownError
    = error
      ?? (savedNothing
        ? { code: 'capacity' }
        : created
          ? undefined
          : held
            ? { code: 'held', bookingId: held.id }
            : participantSeats(draft) > availableSeats(data, departure.id, now)
              ? { code: 'capacity' }
              : undefined)
  const submit = () =>
    requireSignIn(() => {
      if (submittingRef.current)
        return
      submittingRef.current = true
      const result = createBooking()

      if ('error' in result) {
        setError({ code: result.error, bookingId: result.bookingId })
        submittingRef.current = false

        return
      }
      setError(undefined)
      setCreated({
        id: result.bookingId,
        later: departure.policy === 'later',
      })
    })

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 ps-4 pe-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton label={t('tourBooking.edit')} onPress={edit} />
        <h1 className="font-serif text-title">{t('tourBooking.review')}</h1>
      </header>
      <Form
        className="flex flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        {/* C06 Review and send: tinted note, then white cards; C05's fields and heading. */}
        <div className="flex flex-col gap-5 px-6 pt-2 pb-5">
          <InfoNote text={t('tourBooking.intro')} />
          <div className="flex flex-col gap-4 pt-1">
            <SurfaceCard aria-labelledby="tour-review-name">
              <SurfaceCardBlock>
                <div className="flex items-start gap-3">
                  <Media
                    alt={text(tour.name).text}
                    className="size-16 shrink-0 rounded-xl"
                    photo={tour.photos[0] ?? 'lucerne-old-town'}
                  />
                  <h2
                    className="min-w-0 leading-snug font-semibold text-balance"
                    id="tour-review-name"
                    lang={text(tour.name).language}
                  >
                    {text(tour.name).text}
                  </h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className={row}>
                    <BookingsIcon aria-hidden className={rowIcon} size={16} />
                    <span>{date(departure.startsAt)}</span>
                  </p>
                  <div className={row}>
                    <TravelGroupIcon
                      aria-hidden
                      className={rowIcon}
                      size={16}
                    />
                    <span>{groupText(draft)}</span>
                  </div>
                  <p className={row}>
                    <PickupIcon aria-hidden className={rowIcon} size={16} />
                    <span>
                      {t('tourBooking.meeting')}
                      :
                      {' '}
                      <span lang={text(tour.meetingPoint).language}>
                        {text(tour.meetingPoint).text}
                      </span>
                    </span>
                  </p>
                  {fallback && (
                    <p className={`${row} text-muted`}>
                      <InfoIcon aria-hidden className={rowIcon} size={16} />
                      {t(
                        fallback.language === 'de'
                          ? 'tourBooking.onlyInGerman'
                          : 'tourBooking.onlyInEnglish',
                      )}
                    </p>
                  )}
                </div>
              </SurfaceCardBlock>
              {/* As C07's link row at the end of the order card. */}
              <button
                className="flex min-h-12 items-center justify-between gap-3 rounded-b-3xl px-5 text-start text-sm font-medium outline-none hover:bg-surface-secondary focus-visible:focus-ring"
                type="button"
                onClick={edit}
              >
                {t('tourBooking.edit')}
                <ChevronRightIcon aria-hidden className="shrink-0" size={18} />
              </button>
            </SurfaceCard>
            <SurfaceCard aria-labelledby="tour-review-contact">
              <SurfaceCardBlock>
                <SurfaceCardTitle id="tour-review-contact">
                  {t('tourBooking.contact')}
                </SurfaceCardTitle>
                <div className="flex flex-col gap-4">
                  <TextField
                    fullWidth
                    isRequired
                    autoComplete="name"
                    name="tour-contact"
                    value={draft.contactName}
                    onChange={contactName => updateDraft({ contactName })}
                  >
                    <Label>{t('tourBooking.name')}</Label>
                    <Input className={clearOfFooter} />
                  </TextField>
                  <TextField
                    fullWidth
                    isRequired
                    autoComplete="tel"
                    name="tour-phone"
                    type="tel"
                    value={draft.phone}
                    onChange={phone => updateDraft({ phone })}
                  >
                    <Label>{t('tourBooking.phone')}</Label>
                    <Input className={clearOfFooter} />
                  </TextField>
                  {tour.participantFields.map(field => (
                    <TextField
                      key={field.id}
                      fullWidth
                      isRequired={field.required}
                      name={`tour-field-${field.id}`}
                      value={draft.participantAnswers?.[field.id] ?? ''}
                      onChange={value =>
                        updateDraft({
                          participantAnswers: {
                            ...draft.participantAnswers,
                            [field.id]: value,
                          },
                        })}
                    >
                      <Label lang={text(field.label).language}>
                        {field.required
                          ? text(field.label).text
                          : t('tourBooking.optionalField', {
                              label: text(field.label).text,
                            })}
                      </Label>
                      <Input className={clearOfFooter} />
                    </TextField>
                  ))}
                </div>
              </SurfaceCardBlock>
            </SurfaceCard>
            <SurfaceCard aria-labelledby="tour-review-total">
              <SurfaceCardBlock>
                <SurfaceCardTitle id="tour-review-total">
                  {t('tourBooking.total')}
                </SurfaceCardTitle>
                <dl className="flex flex-col gap-2">
                  <Amount
                    amount={money(draft.adults * tour.adultPrice)}
                    label={t('tourBooking.adults', {
                      count: draft.adults,
                      price: money(tour.adultPrice),
                    })}
                  />
                  {draft.children > 0 && (
                    <Amount
                      amount={money(draft.children * tour.childPrice)}
                      label={t('tourBooking.children', {
                        count: draft.children,
                        price: money(tour.childPrice),
                      })}
                    />
                  )}
                  {draft.infants > 0 && (
                    <Amount
                      amount={money(draft.infants * tour.infantPrice)}
                      label={t('tourBooking.infants', {
                        count: draft.infants,
                        price: money(tour.infantPrice),
                      })}
                    />
                  )}
                </dl>
              </SurfaceCardBlock>
              <SurfaceCardBlock>
                <dl className="flex flex-col gap-2">
                  <Amount
                    amount={money(total)}
                    label={t('tourBooking.total')}
                  />
                  {/* The key figure, laid out as C06's "Due after the seller confirms". With
                    nothing due now (pay later) it is a plain row, so the total leads. */}
                  {firstAmount > 0
                    ? (
                        <div className="flex flex-col gap-0.5">
                          <dt className="text-sm text-muted">
                            {t('tourBooking.dueNow')}
                          </dt>
                          <dd className="font-serif text-title tabular-nums">
                            {money(firstAmount)}
                          </dd>
                        </div>
                      )
                    : (
                        <Amount
                          amount={money(firstAmount)}
                          label={t('tourBooking.dueNow')}
                        />
                      )}
                  <Amount
                    amount={money(total - firstAmount)}
                    label={t('tourBooking.balance')}
                  />
                </dl>
              </SurfaceCardBlock>
              <SurfaceCardBlock>
                <div className="flex flex-col gap-2 text-sm">
                  <p className="text-muted">
                    {t(`tourBooking.${departure.policy}`)}
                  </p>
                  {departure.policy !== 'later' && (
                    <p className="text-muted">{t('tourBooking.holdRule')}</p>
                  )}
                  {firstAmount < total && (
                    <p className="font-medium">
                      {t('tourBooking.deadline', {
                        date: date(departure.balanceDueAt),
                      })}
                    </p>
                  )}
                </div>
              </SurfaceCardBlock>
            </SurfaceCard>
            <SurfaceCard aria-labelledby="tour-review-policy">
              <SurfaceCardBlock>
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-sm font-medium" id="tour-review-policy">
                    {t('tourBooking.policy')}
                  </h2>
                  <p
                    className="text-sm whitespace-pre-line text-muted"
                    lang={text(tour.cancellationPolicy).language}
                  >
                    {text(tour.cancellationPolicy).text}
                  </p>
                </div>
              </SurfaceCardBlock>
            </SurfaceCard>
          </div>
          {shownError && (
            <div ref={alertRef} className="rounded-3xl">
              <Alert
                className="alert--soft w-full min-w-0"
                role="alert"
                status={shownError.code === 'held' ? 'warning' : 'danger'}
              >
                <Alert.Indicator />
                <Alert.Content className="min-w-0 items-start gap-2">
                  <Alert.Description>
                    {t(errorKeys[shownError.code] ?? 'tourBooking.error.other')}
                  </Alert.Description>
                  {(shownError.code === 'capacity'
                    || shownError.code === 'departure') && (
                    <Button
                      className={clearOfFooter}
                      size="sm"
                      variant="tertiary"
                      onPress={edit}
                    >
                      {t('tourBooking.chooseAnother')}
                    </Button>
                  )}
                  {shownError.code === 'held' && shownError.bookingId && (
                    <Button
                      className={clearOfFooter}
                      size="sm"
                      variant="tertiary"
                      onPress={() =>
                        void navigate({
                          to: '/account/bookings/$bookingId/pay',
                          params: { bookingId: shownError.bookingId ?? '' },
                        })}
                    >
                      {t('tourBooking.openHeld')}
                    </Button>
                  )}
                </Alert.Content>
              </Alert>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 z-20 mt-auto border-t border-separator bg-background px-6 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          {!signedIn && (
            // One unit with its button (owner, round 3), 12px above it as in C06's bar.
            <section
              aria-labelledby="tour-review-sign-in"
              className="mb-3 flex flex-col gap-0.5"
            >
              <h2
                className="font-serif text-card-title text-balance"
                id="tour-review-sign-in"
              >
                {t('tourBooking.signIn.title')}
              </h2>
              <p className="text-sm text-pretty text-muted">
                {t('tourBooking.signIn.body')}
              </p>
            </section>
          )}
          <Button
            fullWidth
            isDisabled={!!createdBooking}
            size="lg"
            type="submit"
          >
            {!signedIn
              ? t('auth.account.signIn')
              : departure.policy === 'later'
                ? t('tourBooking.book')
                : t('tourBooking.continue', { amount: money(firstAmount) })}
          </Button>
        </div>
      </Form>
    </div>
  )
}

function Amount({ label, amount }: { label: string, amount: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{amount}</dd>
    </div>
  )
}

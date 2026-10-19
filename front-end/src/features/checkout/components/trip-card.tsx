import type { TripAnswers } from '@sk/domain/orders'
import type { TripTarget } from '../lib/trip'

import { Button, Drawer } from '@heroui/react'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useTripProfile } from '../hooks/use-trip-profile'

import { hasTripAnswers } from '../lib/trip'

import { TripFields, useTripRows } from './trip-profile'

/**
 * "Your trip" on the Overview tab of C15 and C16 (2.17): this purchase's trip answers as C15's
 * fact card. Answered lists the three answers with Edit; not answered is one line with Answer
 * now. Both open the C07 questions in a bottom sheet. The answers never move the pickup or tour
 * date, and the card says which.
 */
export function TripCard({
  kind,
  target,
}: {
  kind: 'gift' | 'tour'
  target: TripTarget
}) {
  const { t } = useLocale()
  const trip = useTripProfile(target)
  const rows = useTripRows(trip.answers)
  const [isOpen, setIsOpen] = useState(false)
  // A fresh form per opening, so a dismissed edit never lingers.
  const [opening, setOpening] = useState(0)
  const answered = trip.status === 'answered'

  return (
    <div className="rounded-3xl bg-surface shadow-surface">
      {answered && (
        <dl className="flex flex-col divide-y divide-separator">
          {rows.map(({ icon: Icon, label, value, isSet }) => (
            <div key={label} className="flex gap-3 p-4">
              <Icon
                aria-hidden
                className="mt-0.5 shrink-0 text-muted"
                size={20}
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs text-muted">{label}</dt>
                <dd
                  className={isSet ? 'font-medium tabular-nums' : 'text-muted'}
                >
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      )}
      <div
        className={`flex items-center gap-4 p-4 ${answered ? 'border-t border-separator' : ''}`}
      >
        <p className="min-w-0 flex-1 text-sm text-muted">
          {t(answered ? `tripCard.note.${kind}` : `tripCard.open.${kind}`)}
        </p>
        {/* One button for both states, so focus returns to it when the sheet closes. */}
        <Button
          className="shrink-0"
          size="sm"
          variant="secondary"
          onPress={() => {
            setOpening(n => n + 1)
            setIsOpen(true)
          }}
        >
          {t(answered ? 'tripProfile.edit' : 'tripProfile.answerNow')}
        </Button>
      </div>

      <Drawer.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog className="flex max-h-[92dvh] flex-col">
            <Drawer.Handle />
            <Drawer.Header className="flex flex-row items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-1">
                <Drawer.Heading className="font-serif text-title">
                  {t('tripProfile.title')}
                </Drawer.Heading>
                <p className="text-sm text-muted">
                  {t(
                    kind === 'tour'
                      ? 'tripProfile.introTour'
                      : 'tripProfile.intro',
                  )}
                </p>
              </div>
              <Drawer.CloseTrigger aria-label={t('tripProfile.date.close')} />
            </Drawer.Header>
            <SheetForm
              key={opening}
              initial={trip.answers}
              onSave={(answers) => {
                trip.save(answers)
                setIsOpen(false)
              }}
            />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </div>
  )
}

function SheetForm({
  initial,
  onSave,
}: {
  initial: TripAnswers
  onSave: (answers: TripAnswers) => void
}) {
  const { t } = useLocale()
  const [answers, setAnswers] = useState(initial)

  return (
    <>
      <Drawer.Body className="flex flex-col gap-6 overflow-y-auto text-foreground">
        <TripFields answers={answers} onChange={setAnswers} />
      </Drawer.Body>
      <Drawer.Footer className="flex flex-col gap-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
        <Button
          fullWidth
          className="h-14 text-base"
          isDisabled={!hasTripAnswers(answers)}
          onPress={() => onSave(answers)}
        >
          {t('tripProfile.save')}
        </Button>
      </Drawer.Footer>
    </>
  )
}

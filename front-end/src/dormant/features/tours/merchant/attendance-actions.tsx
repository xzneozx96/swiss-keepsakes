import type { TourBooking } from '@sk/domain/bookings'
import type { TourOutcome } from './lib/transitions'
import type { MessageKey } from '@/i18n/en'

import { Button, toast } from '@heroui/react'

import { useConfirm } from '@/components/confirm-dialog'

import { StatusChip } from '@/components/status-chip'
import { useLocale } from '@/contexts/locale-context'

import { useTourActions, useTours } from '../hooks/use-tours'
import { outcomeBlock } from './lib/transitions'
import { useBlockText, useTourFormatting } from './shared'

const confirmCopy: Record<
  TourOutcome,
  { title: MessageKey, body: MessageKey, action: MessageKey }
> = {
  delivered: {
    title: 'tourMerchant.confirmDeliveredTitle',
    body: 'tourMerchant.confirmDeliveredBody',
    action: 'tourMerchant.delivered',
  },
  no_show: {
    title: 'tourMerchant.confirmNoShowTitle',
    body: 'tourMerchant.noShowBody',
    action: 'tourMerchant.noShow',
  },
  completed: {
    title: 'tourMerchant.confirmCompleteTitle',
    body: 'tourMerchant.confirmCompleteBody',
    action: 'tourMerchant.complete',
  },
}

/** The dashed box of the locked Complete (M04 1.15r). */
const panel
  = 'flex flex-col gap-2 rounded-2xl border border-dashed border-separator p-3'

/**
 * M06/M07 outcome actions for one booking (AC09, O10). Delivered and no-show open after the
 * tour ends; Complete stays locked, with its reason, until service is delivered and the
 * balance is paid. Every outcome asks first. `detailed` adds the locked Complete for a
 * confirmed booking (M07), so "paid but not delivered" shows why it cannot complete.
 */
export function AttendanceActions({
  booking,
  detailed = false,
}: {
  booking: TourBooking
  detailed?: boolean
}) {
  const { now, role } = useTours()
  const { t } = useLocale()
  const { time, date } = useTourFormatting()
  const { outcome } = useTourActions()
  const { confirm, dialog } = useConfirm()
  const blockText = useBlockText()
  const attendBlock = outcomeBlock(booking, 'delivered', role, now)
  const completeBlock = outcomeBlock(booking, 'completed', role, now)
  const act = async (result: TourOutcome) => {
    const copy = confirmCopy[result]

    if (
      !(await confirm({
        title: t(copy.title, { name: booking.contactName, ref: booking.ref }),
        body: t(copy.body, { ref: booking.ref }),
        confirmLabel: t(copy.action),
      }))
    ) {
      return
    }
    const changed = outcome(booking.id, result)

    if (changed.ok)
      toast.success(t('tourMerchant.success'))
    else toast.danger(t('tourMerchant.failed'))
  }
  // Complete booking's size: M07 as the M04 next step (1.15r), the M06 list the default.
  const size = detailed ? 'lg' : undefined
  const locked = completeBlock && (
    <div className={panel}>
      <Button
        fullWidth
        isDisabled
        aria-describedby={`complete-help-${booking.id}`}
        // In the M06 table cell from 1024, the long German label ("Buchung abschliessen")
        // wraps instead of widening the table. Only German wraps, so the English table keeps
        // its column widths; one line stays 36px.
        className={
          detailed
            ? undefined
            : 'lg:h-auto lg:min-h-9 lg:py-2 lg:text-center lg:[&:lang(de)]:whitespace-normal'
        }
        size={size}
        variant="tertiary"
      >
        {t('tourMerchant.complete')}
      </Button>
      <div
        className="flex flex-wrap items-center gap-2"
        id={`complete-help-${booking.id}`}
      >
        <span className="text-sm text-muted">
          {t('fulfilment.complete.locked')}
        </span>
        <StatusChip tone="warning">{blockText(completeBlock)}</StatusChip>
      </div>
    </div>
  )

  if (booking.status === 'confirmed') {
    return (
      <div className="flex flex-col gap-2">
        {/* Their own section in the Complete box, one full-width button per row (owner, round 3). */}
        <div className={panel}>
          <Button
            fullWidth
            isDisabled={!!attendBlock}
            size={size}
            // A disabled secondary reads as faint red, like an error (decision 294).
            variant={attendBlock ? 'tertiary' : 'secondary'}
            onPress={() => void act('delivered')}
          >
            {t('tourMerchant.delivered')}
          </Button>
          <Button
            fullWidth
            isDisabled={!!attendBlock}
            size={size}
            variant="tertiary"
            onPress={() => void act('no_show')}
          >
            {t('tourMerchant.noShow')}
          </Button>
          {attendBlock && (
            <p className="text-sm text-muted">
              {attendBlock.code === 'not-ended'
                ? t('tourMerchant.afterEndAt', { time: time(booking.endsAt) })
                : blockText(attendBlock)}
            </p>
          )}
        </div>
        {detailed && locked}
        {dialog}
      </div>
    )
  }
  if (booking.status === 'delivered') {
    return (
      <div className="flex flex-col gap-2">
        {locked || (
          <Button
            fullWidth
            className={detailed ? 'h-12 text-base' : undefined}
            size={detailed ? 'lg' : undefined}
            onPress={() => void act('completed')}
          >
            {t('tourMerchant.complete')}
          </Button>
        )}
        {dialog}
      </div>
    )
  }

  // The entry that set the current status, for its date and (for cancellations) its reason.
  const done = [...booking.activity]
    .reverse()
    .find(a =>
      [booking.status, 'cancelled-overdue', 'departure-cancelled'].includes(
        a.event,
      ),
    )
  const note: Partial<Record<string, MessageKey>> = {
    'completed': 'tourMerchant.done.completed',
    'no_show': 'tourMerchant.done.noShow',
    'cancelled': 'tourMerchant.done.cancelled',
    'cancelled-overdue': 'tourMerchant.done.cancelledOverdue',
    'departure-cancelled': 'tourMerchant.done.departureCancelled',
    'expired': 'tourMerchant.done.expired',
    'pending_payment': 'tourMerchant.done.pending',
  }
  // Seeded bookings can lack the entry; then the note has no date.
  const undated: Partial<Record<string, MessageKey>> = {
    completed: 'tourMerchant.undated.completed',
    no_show: 'tourMerchant.undated.noShow',
    cancelled: 'tourMerchant.undated.cancelled',
    expired: 'tourMerchant.undated.expired',
  }
  const key = done
    ? (booking.status === 'cancelled' && note[done.event])
    || note[booking.status]
    : (undated[booking.status] ?? note[booking.status])

  return key
    ? (
        <p className="max-w-xs text-sm text-muted">
          {t(key, { date: done ? date(done.at) : '' })}
        </p>
      )
    : null
}

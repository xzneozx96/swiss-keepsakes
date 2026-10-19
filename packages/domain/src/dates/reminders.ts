import { addCalendarDays, zurichInstant } from './zurich'

const HOUR_MS = 3_600_000

/** Q5 defaults. The merchant can change them, so each is a parameter of the function that uses it. */
export const REMINDER_DEFAULTS = {
  firstPaymentHoursBefore: [24, 2],
  balanceDaysBefore: 3,
  balanceTime: '09:00',
  dayBeforeTime: '18:00',
} as const

export type ReminderKind
  = | 'first-payment-24h'
    | 'first-payment-2h'
    | 'balance'
    | 'pickup'
    | 'tour'

export interface Reminder {
  kind: ReminderKind
  at: Date
}

/** First-payment reminders 24 hours and 2 hours before the deadline: absolute time, so DST does not move them. */
export function firstPaymentReminders(deadline: Date): Reminder[] {
  const [first, second] = REMINDER_DEFAULTS.firstPaymentHoursBefore

  return [
    { kind: 'first-payment-24h', at: new Date(deadline.getTime() - first * HOUR_MS) },
    { kind: 'first-payment-2h', at: new Date(deadline.getTime() - second * HOUR_MS) },
  ]
}

/** Balance reminder 3 Zurich calendar days before the due date, at 09:00 Zurich time. */
export function balanceReminder(dueDate: string): Reminder {
  return {
    kind: 'balance',
    at: zurichInstant(
      addCalendarDays(dueDate, -REMINDER_DEFAULTS.balanceDaysBefore),
      REMINDER_DEFAULTS.balanceTime,
    ),
  }
}

/** The day before `date` at 18:00 Zurich time, for pickup (N12) and tour (N13) reminders. */
export function dayBeforeReminder(kind: 'pickup' | 'tour', date: string): Reminder {
  return {
    kind,
    at: zurichInstant(addCalendarDays(date, -1), REMINDER_DEFAULTS.dayBeforeTime),
  }
}

export interface ReminderInput {
  firstPaymentDeadline?: Date
  balanceDueDate?: string
  pickupDate?: string
  tourDate?: string
}

/** Every reminder that applies, oldest first. */
export function reminderSet(input: ReminderInput): Reminder[] {
  const reminders = [
    ...(input.firstPaymentDeadline ? firstPaymentReminders(input.firstPaymentDeadline) : []),
    ...(input.balanceDueDate ? [balanceReminder(input.balanceDueDate)] : []),
    ...(input.pickupDate ? [dayBeforeReminder('pickup', input.pickupDate)] : []),
    ...(input.tourDate ? [dayBeforeReminder('tour', input.tourDate)] : []),
  ]

  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime())
}

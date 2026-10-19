import { addCalendarDays, zurichInstant } from './zurich'

const HOUR_MS = 3_600_000

export interface ReminderSettings {
  /** Hours before the first-payment deadline for the first and the second reminder. */
  firstPaymentHoursBefore: readonly [number, number]
  balanceDaysBefore: number
  balanceTime: string
  dayBeforeTime: string
}

/** Q5 defaults. The merchant can change each one, so every function takes the settings as an optional last argument. */
export const REMINDER_DEFAULTS: ReminderSettings = {
  firstPaymentHoursBefore: [24, 2],
  balanceDaysBefore: 3,
  balanceTime: '09:00',
  dayBeforeTime: '18:00',
}

export type ReminderKind
  = | 'first-payment-first'
    | 'first-payment-second'
    | 'balance'
    | 'pickup'
    | 'tour'

export interface Reminder {
  kind: ReminderKind
  at: Date
}

/** First-payment reminders before the deadline (24 h and 2 h by default): absolute time, so DST does not move them. */
export function firstPaymentReminders(deadline: Date, settings: ReminderSettings = REMINDER_DEFAULTS): Reminder[] {
  const [first, second] = settings.firstPaymentHoursBefore

  return [
    { kind: 'first-payment-first', at: new Date(deadline.getTime() - first * HOUR_MS) },
    { kind: 'first-payment-second', at: new Date(deadline.getTime() - second * HOUR_MS) },
  ]
}

/** Balance reminder some Zurich calendar days before the due date (3 by default), at 09:00 Zurich time by default. */
export function balanceReminder(dueDate: string, settings: ReminderSettings = REMINDER_DEFAULTS): Reminder {
  return {
    kind: 'balance',
    at: zurichInstant(addCalendarDays(dueDate, -settings.balanceDaysBefore), settings.balanceTime),
  }
}

/** The day before `date` at 18:00 Zurich time by default, for pickup (N12) and tour (N13) reminders. */
export function dayBeforeReminder(kind: 'pickup' | 'tour', date: string, settings: ReminderSettings = REMINDER_DEFAULTS): Reminder {
  return {
    kind,
    at: zurichInstant(addCalendarDays(date, -1), settings.dayBeforeTime),
  }
}

export interface ReminderInput {
  /** When the seller accepted the order. A reminder before this moment is dropped. */
  acceptedAt: Date
  firstPaymentDeadline?: Date
  balanceDueDate?: string
  pickupDate?: string
  tourDate?: string
  /** The merchant's Q5 overrides; anything left out keeps its default. */
  settings?: Partial<ReminderSettings>
}

/** Every reminder that applies and falls on or after `acceptedAt`, oldest first. */
export function reminderSet(input: ReminderInput): Reminder[] {
  const settings: ReminderSettings = { ...REMINDER_DEFAULTS, ...input.settings }
  const reminders = [
    ...(input.firstPaymentDeadline ? firstPaymentReminders(input.firstPaymentDeadline, settings) : []),
    ...(input.balanceDueDate ? [balanceReminder(input.balanceDueDate, settings)] : []),
    ...(input.pickupDate ? [dayBeforeReminder('pickup', input.pickupDate, settings)] : []),
    ...(input.tourDate ? [dayBeforeReminder('tour', input.tourDate, settings)] : []),
  ]

  return reminders
    .filter(r => r.at.getTime() >= input.acceptedAt.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
}

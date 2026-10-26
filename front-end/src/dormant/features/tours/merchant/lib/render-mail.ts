import type { Mail, MailParams } from '@sk/domain/notifications'
import type { TourMailTemplate } from './mail'
import type { Language } from '@/contexts/locale-context'
import type { MessageKey } from '@/i18n/en'

import { formatOrderDateTime } from '@sk/domain/orders'
import { formatMoney } from '@sk/domain/shared'
import { shop } from '@/features/catalog/seed'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const PLACEHOLDER = /\{(\w+)\}/g

const messages: Record<Language, Record<MessageKey, string>> = { en, de }

/** A body line, or null when the email has nothing to say there. */
type Line = (p: MailParams) => MessageKey | null
interface Template { subject: MessageKey, body: (MessageKey | Line)[] }

const owes = (p: MailParams) => Number(p.balance) > 0
const balanceLine: Line = p =>
  owes(p) ? 'tourMail.balanceDue' : 'tourMail.paidInFull'

const guestTemplates: Record<TourMailTemplate, Template> = {
  N07: {
    subject: 'tourMail.N07.subject',
    body: [
      'tourMail.seller',
      'tourMail.tourLine',
      'tourMail.N07.paid',
      balanceLine,
    ],
  },
  N08: {
    subject: 'tourMail.N08.subject',
    body: [
      'tourMail.greeting',
      'tourMail.N08.failed',
      p => (p.holdUntil ? 'tourMail.N08.retryHold' : 'tourMail.N08.retry'),
    ],
  },
  N09: {
    subject: 'tourMail.N09.subject',
    body: [
      'tourMail.greeting',
      'tourMail.N09.confirmed',
      'tourMail.when',
      'tourMail.meeting',
      'tourMail.group',
      'tourMail.paid',
      balanceLine,
    ],
  },
  N10: {
    subject: 'tourMail.N10.subject',
    body: [
      'tourMail.greeting',
      'tourMail.N10.due',
      p =>
        p.overdue === 'cancel'
          ? 'tourMail.N10.cancel'
          : p.overdue === 'grace'
            ? 'tourMail.N10.grace'
            : 'tourMail.N10.merchant',
      'tourMail.N10.pay',
    ],
  },
  N11: {
    subject: 'tourMail.N11.subject',
    body: [
      'tourMail.greeting',
      'tourMail.N11.cancelled',
      'tourMail.N11.money',
      'tourMail.N11.again',
    ],
  },
  N13: {
    subject: 'tourMail.N13.subject',
    body: [
      'tourMail.greeting',
      'tourMail.N13.tomorrow',
      'tourMail.meeting',
      'tourMail.group',
      p => (owes(p) ? 'tourMail.balanceDue' : null),
      'tourMail.N13.contact',
    ],
  },
  N15: {
    subject: 'tourMail.N15.subject',
    body: ['tourMail.greeting', 'tourMail.N15.thanks', 'tourMail.N15.review'],
  },
  N22: {
    subject: 'tourMail.N22.subject',
    body: ['tourMail.greeting', 'tourMail.N22.guest', 'tourMail.N22.next'],
  },
}

const staffTemplates: Partial<Record<TourMailTemplate, Template>> = {
  N11: {
    subject: 'tourMail.N11.staffSubject',
    body: ['tourMail.N11.staff', 'tourMail.N11.staffMoney'],
  },
  N22: {
    subject: 'tourMail.N22.staffSubject',
    body: ['tourMail.N22.staff'],
  },
}

const MONEY = ['amount', 'total', 'paid', 'balance']
const TIMES = ['startsAt', 'dueAt', 'holdUntil', 'graceUntil']

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(PLACEHOLDER, (match, name: string) =>
    name in vars ? String(vars[name]) : match)
}

/** Renders a tour email in the recipient's language (spec §6), whatever the prototype shows. */
export function renderTourMail(mail: Mail): {
  subject: string
  body: string[]
} {
  const copy = messages[mail.language]
  const locale = mail.language === 'de' ? 'de-CH' : 'en-CH'
  const template = (mail.to === 'staff' ? staffTemplates : guestTemplates)[
    mail.template as TourMailTemplate
  ]

  if (!template) {
    return {
      subject: mail.template,
      body: Object.entries(mail.params).map(([k, v]) => `${k}: ${v}`),
    }
  }
  const vars: Record<string, string | number> = {
    seller: shop.name,
    sellerPhone: shop.phone,
  }

  for (const [key, value] of Object.entries(mail.params)) {
    vars[key]
      = MONEY.includes(key) && typeof value === 'number'
        ? formatMoney(value / 100, locale)
        : TIMES.includes(key) && value
          ? formatOrderDateTime(String(value), locale)
          : value
  }

  return {
    subject: fill(copy[template.subject], vars),
    body: template.body.flatMap((line) => {
      const key = typeof line === 'function' ? line(mail.params) : line

      return key ? [fill(copy[key], vars)] : []
    }),
  }
}

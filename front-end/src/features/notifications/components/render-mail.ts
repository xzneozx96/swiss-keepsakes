import type { PickupPlace } from '@sk/domain/catalog'
import type { Mail } from '@sk/domain/notifications'
import type { Language } from '@/contexts/locale-context'
import type { Role } from '@/features/demo/types'
import type { MessageKey } from '@/i18n/en'

import {
  formatOrderDate,
  formatOrderDateTime,
} from '@sk/domain/orders'
import { formatMoney, pickText } from '@sk/domain/shared'
import { shop } from '@/features/catalog/seed'
import { renderRequestMail } from '@/features/requests/lib/render-request-mail'
import { renderTourMail } from '@/features/tours/merchant/lib/render-mail'
import { de } from '@/i18n/de'
import { en } from '@/i18n/en'

const PLACEHOLDER = /\{(\w+)\}/g

const messages: Record<Language, Record<MessageKey, string>> = { en, de }

export interface RenderedMail {
  subject: string
  /** Paragraphs of the email body. */
  body: string[]
  /** The mail's button (N16, N17): a hash link into the shop, opened as `role`. */
  link?: { label: string, href: string, role: Role }
}

interface Template { subject: MessageKey, body: MessageKey[] }

/** Partner mail (spec §6 N19, step 5.6): the report code. */
const partnerTemplates: Partial<Record<Mail['template'], Template>> = {
  N19: {
    subject: 'mail.N19.subject',
    body: [
      'mail.N19.greeting',
      'mail.N19.code',
      'mail.N01.expiry',
      'mail.N19.ignore',
    ],
  },
}

/** Copy per template and recipient (spec §6). */
const guestTemplates: Partial<Record<Mail['template'], Template>> = {
  N01: {
    subject: 'mail.N01.subject',
    body: [
      'mail.greeting',
      'mail.N01.code',
      'mail.N01.expiry',
      'mail.N01.ignore',
    ],
  },
  N02: {
    subject: 'mail.N02.subject',
    body: [
      'mail.greeting',
      'mail.N02.request',
      'mail.N02.noPayment',
      'mail.N02.status',
    ],
  },
  N04: {
    subject: 'mail.N04.subject',
    body: [
      'mail.greeting',
      'mail.N04.accepted',
      'mail.pickup',
      'mail.N04.pay',
      'mail.N04.warning',
      'mail.N04.action',
    ],
  },
  N05: {
    subject: 'mail.N05.subject',
    body: ['mail.greeting', 'mail.N04.accepted', 'mail.pickup', 'mail.N05.pay'],
  },
  N06: {
    subject: 'mail.N06.subject',
    body: [
      'mail.greeting',
      'mail.N06.declined',
      'mail.N06.reason',
      'mail.N06.others',
    ],
  },
  N07: {
    subject: 'mail.N07.subject',
    body: ['mail.N07.seller', 'mail.N07.paid', 'mail.N07.balance'],
  },
  N08: {
    subject: 'mail.N08.subject',
    body: ['mail.greeting', 'mail.N08.failed', 'mail.N08.retry'],
  },
  N12: {
    subject: 'mail.N12.subject',
    body: [
      'mail.greeting',
      'mail.N12.ready',
      'mail.N12.hours',
      'mail.N12.instructions',
    ],
  },
  N15: {
    subject: 'mail.N15.subject',
    body: ['mail.greeting', 'mail.N15.thanks', 'mail.N15.review'],
  },
  N23: {
    subject: 'mail.N23.subject',
    body: [
      'mail.greeting',
      'mail.N23.guest',
      'mail.N23.again',
      'mail.N06.others',
    ],
  },
}

const staffTemplates: Partial<Record<Mail['template'], Template>> = {
  N03: {
    subject: 'mail.N03.subject',
    body: ['mail.N03.new', 'mail.N03.action'],
  },
  N21: {
    subject: 'mail.N21.subject',
    body: ['mail.N21.paid', 'mail.N21.preparing'],
  },
  N23: {
    subject: 'mail.N23.subject',
    body: ['mail.N23.staff', 'mail.N23.stock'],
  },
}

function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(PLACEHOLDER, (match, name: string) =>
    name in vars ? String(vars[name]) : match)
}

/**
 * Turns the raw params a transition logged (Rappen, ISO dates, place ids) into the
 * words of the recipient's language.
 */
function formatParams(
  mail: Mail,
  places: PickupPlace[],
): Record<string, string | number> {
  const locale = mail.language === 'de' ? 'de-CH' : 'en-CH'
  const vars: Record<string, string | number> = {
    shop: messages[mail.language]['app.name'],
    seller: shop.name,
  }

  for (const [key, value] of Object.entries(mail.params)) {
    if ((key === 'amount' || key === 'balance') && typeof value === 'number') {
      vars[key] = formatMoney(value / 100, locale)
    }
    else if (key === 'dueAt' && value) {
      vars[key] = formatOrderDateTime(String(value), locale)
    }
    else if ((key === 'pickupDate' || key === 'dueDate') && value) {
      vars[key] = formatOrderDate(String(value), locale)
    }
    else if (key === 'pickupPlaceId') {
      const place = places.find(p => p.id === value)

      if (place) {
        vars.place = pickText(place.name, mail.language).text
        vars.placeAddress = place.address
        vars.placeHours = pickText(place.openingHours, mail.language).text
        vars.placeInstructions = pickText(
          place.instructions,
          mail.language,
        ).text
      }
    }
    else {
      vars[key] = value
    }
  }

  return vars
}

/**
 * Renders a logged email in the recipient's language (spec §6: guests get the language
 * they ordered in, staff their UI language), whatever language the prototype shows now.
 * `places` is the demo data's pickup places (outline D4).
 */
export function renderMail(mail: Mail, places: PickupPlace[]): RenderedMail {
  if (mail.bookingId)
    return renderTourMail(mail)
  if (mail.template === 'N16' || mail.template === 'N17')
    return renderRequestMail(mail)
  const copy = messages[mail.language]
  const template = (
    mail.to === 'staff'
      ? staffTemplates
      : mail.to === 'partner'
        ? partnerTemplates
        : guestTemplates
  )[mail.template]

  // Templates outside flow 1 (or a param set this renderer does not know) stay readable.
  if (!template) {
    return {
      subject: mail.template,
      body: Object.entries(mail.params).map(([k, v]) => `${k}: ${v}`),
    }
  }
  const vars = formatParams(mail, places)

  return {
    subject: fill(copy[template.subject], vars),
    body: template.body.map(key => fill(copy[key], vars)),
  }
}

import type { AdviceRequest, PrivateTourRequest } from '../types'
import type { Language } from '@/contexts/locale-context'
import type { DemoState, Role } from '@/features/demo/types'
import type { MailParams } from '@/features/notifications/types'

import { shop } from '@/features/catalog/seed'
import { sendMail } from '@/features/notifications/mail'

/**
 * Who gets N17 and the language each one's interface is set to (spec §6: internal mail uses
 * the recipient's interface language). The demo data stores no staff language, so this is a
 * prototype assumption: the Owner works in English, the Store Manager in German.
 */
export const requestStaff: {
  role: Extract<Role, 'owner' | 'manager'>
  name: string
  /** The To line in the Mail panel (presenter chrome, English). */
  label: string
  language: Language
}[] = [
  {
    role: 'owner',
    name: shop.ownerName,
    label: `${shop.ownerName} (Owner)`,
    language: 'en',
  },
  {
    role: 'manager',
    name: 'Lukas',
    label: 'Lukas (Store Manager)',
    language: 'de',
  },
]

/** N16 goes out in the shop's default language (outline D10). */
const SHOP_LANGUAGE: Language = 'en'

/**
 * N16 new advice request (spec §6, step 4.17) to the M19 recipient address, in English (D10).
 * The questions and answers are copied in as sent, in the language the guest saw them, so the
 * mail stays as it was even if the question set changes later (AC18).
 */
export function mailAdviceRequest(
  state: DemoState,
  request: AdviceRequest,
  recipientEmail: string,
): DemoState {
  const params: MailParams = {
    requestId: request.id,
    email: request.email,
    guestLanguage: request.language,
    sentAt: request.sentAt,
    count: request.answers.length,
  }

  request.answers.forEach((a, i) => {
    params[`q${i}`] = a.question
    params[`a${i}`] = a.answer
  })

  return sendMail(state, {
    at: request.sentAt,
    to: 'staff',
    recipient: recipientEmail,
    language: SHOP_LANGUAGE,
    template: 'N16',
    params,
  })
}

/**
 * N17 new private-tour request (spec §6, step 4.17): one mail each to the Owner and the
 * Manager, each in their interface language. The guest gets no mail (A2).
 */
export function mailPrivateTourRequest(
  state: DemoState,
  request: PrivateTourRequest,
): DemoState {
  return requestStaff.reduce(
    (next, staff) =>
      sendMail(next, {
        at: request.sentAt,
        to: 'staff',
        recipient: staff.label,
        language: staff.language,
        template: 'N17',
        params: {
          requestId: request.id,
          staffName: staff.name,
          staffRole: staff.role,
          email: request.email,
          guestLanguage: request.language,
          sentAt: request.sentAt,
          groupSize: request.groupSize,
          dateFrom: request.dateFrom,
          dateTo: request.dateTo,
          interests: request.interests,
        },
      }),
    state,
  )
}

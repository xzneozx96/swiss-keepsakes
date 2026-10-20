import type { MailKey } from '@sk/i18n/en'
import type { MailLanguage, MailTemplate } from '../ports.ts'
import { mailDe } from '@sk/i18n/de'
import { mailEn } from '@sk/i18n/en'

// The values each template's job stores. An invitation mail stores the invitation id, never the link: the link
// holds the invitation's token, so it is built when the mail is sent (InvitationLink) and fills `{link}`.
export interface MailParams {
  N18: { inviter: string, store: string, invitationId: string }
  N20: { store: string, invitationId: string }
}

// `language` is the one stored with the business record, never the server's (D12).
export type MailRequest = {
  [K in MailTemplate]: { template: K, to: string, language: MailLanguage, storeId: string | null, params: MailParams[K] }
}[MailTemplate]

// UX spec section 6. The copy lives in packages/i18n, shared with the prototype's mail log.
const templates: Record<MailTemplate, { subject: MailKey, body: MailKey[] }> = {
  // Store Manager invitation, to the invitee, with the M01 link.
  N18: {
    subject: 'mail.N18.subject',
    body: ['mail.greeting', 'mail.N18.invited', 'mail.N18.accept', 'mail.invitation.expiry', 'mail.invitation.ignore'],
  },
  // Owner invitation, to the new Owner, with the A02 link.
  N20: {
    subject: 'mail.N20.subject',
    body: ['mail.greeting', 'mail.N20.invited', 'mail.N20.setup', 'mail.invitation.expiry', 'mail.invitation.ignore'],
  },
}

const copy = { en: mailEn, de: mailDe }

const placeholder = /\{(\w+)\}/g

export class MailRenderError extends Error {
  override name = 'MailRenderError'
}

export interface RenderedMail {
  to: string
  subject: string
  text: string
}

// Plain text only. An empty or missing value throws, so a mail never goes out with a raw `{link}` in it.
export function renderMail(request: MailRequest, link: string | undefined): RenderedMail {
  const { subject, body } = templates[request.template]
  const words = copy[request.language]
  const params: Record<string, string | undefined> = { ...request.params, link }
  const fill = (key: MailKey) => words[key].replace(placeholder, (_, name: string) => {
    const value = params[name]
    if (!value?.trim())
      throw new MailRenderError(`${request.template} has no value for {${name}}`)
    return value
  })
  return { to: request.to, subject: fill(subject), text: body.map(fill).join('\n\n') }
}

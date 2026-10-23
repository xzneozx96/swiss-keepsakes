import type { MailKey } from '@sk/i18n/en'
import type { MailLanguage, MailTemplate } from '../ports.ts'
import type { HtmlBlock } from './mail-layout.ts'
import { mailDe } from '@sk/i18n/de'
import { mailEn } from '@sk/i18n/en'
import { renderHtml } from './mail-layout.ts'

// The values each template's job stores. An invitation mail stores the invitation id, never the link: the link
// holds the invitation's token, so it is built when the mail is sent (InvitationLink) and fills `{link}`.
export interface MailParams {
  // The sign-in code is the one secret a job holds: it is useless after 5 minutes, and the job is deleted soon after.
  N01: { shop: string, code: string }
  N18: { inviter: string, store: string, invitationId: string }
  N20: { store: string, invitationId: string }
}

// `language` is the one stored with the business record, never the server's (D12).
export type MailRequest = {
  [K in MailTemplate]: { template: K, to: string, language: MailLanguage, storeId: string | null, params: MailParams[K] }
}[MailTemplate]

// What a template says, in order. The text and the HTML are both built from this list and the same copy, so
// the words live once. `lead` and `note` are paragraphs that the HTML sets in another style. `code` is the
// sign-in code, big in the HTML. `action` is a sentence that ends in the link: the text puts the link after a
// colon, the HTML puts a button and the plain link under the sentence.
type Item
  = | { kind: 'paragraph' | 'lead' | 'note', key: MailKey }
    | { kind: 'code', key: MailKey, label: MailKey }
    | { kind: 'action', key: MailKey, button: MailKey }

interface Template { subject: MailKey, preheader: MailKey, reason?: MailKey, body: Item[] }

// UX spec section 6. The copy lives in packages/i18n, shared with the prototype's mail log.
const templates: Record<MailTemplate, Template> = {
  // Sign-in code, to the guest or staff member who asked for it. The SPA's language, or EN.
  N01: {
    subject: 'mail.N01.subject',
    preheader: 'mail.N01.expiry',
    reason: 'mail.N01.reason',
    body: [
      { kind: 'code', key: 'mail.N01.code', label: 'mail.N01.label' },
      { kind: 'paragraph', key: 'mail.N01.expiry' },
      { kind: 'note', key: 'mail.N01.ignore' },
    ],
  },
  // Store Manager invitation, to the invitee, with the M01 link.
  N18: {
    subject: 'mail.N18.subject',
    preheader: 'mail.N18.invited',
    body: [
      { kind: 'paragraph', key: 'mail.greeting' },
      { kind: 'lead', key: 'mail.N18.invited' },
      { kind: 'action', key: 'mail.N18.accept', button: 'mail.N18.button' },
      { kind: 'note', key: 'mail.invitation.expiry' },
      { kind: 'note', key: 'mail.invitation.ignore' },
    ],
  },
  // Owner invitation, to the new Owner, with the A02 link.
  N20: {
    subject: 'mail.N20.subject',
    preheader: 'mail.N20.invited',
    body: [
      { kind: 'paragraph', key: 'mail.greeting' },
      { kind: 'lead', key: 'mail.N20.invited' },
      { kind: 'action', key: 'mail.N20.setup', button: 'mail.N20.button' },
      { kind: 'note', key: 'mail.invitation.expiry' },
      { kind: 'note', key: 'mail.invitation.ignore' },
    ],
  },
}

const copy = { en: mailEn, de: mailDe }

const placeholder = /\{(\w+)\}/g

// The one place the store's brand name lives. main.ts passes it as the sign-in mail's `shop`.
export const brandName = 'Swiss Keepsakes'

// Control characters and the bidi and zero-width ones, which can hide or reorder text in a mail client.
const invisible = /[\p{Cc}\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/gu

// The only links a mail may carry are the http(s) ones InvitationLink builds. Anything else, such as a
// `javascript:` URL, never reaches an href.
const webLink = /^https?:\/\/[^\s<>"']+$/i

export class MailRenderError extends Error {
  override name = 'MailRenderError'
}

export interface RenderedMail {
  to: string
  subject: string
  text: string
  html: string
}

// An empty or missing value throws, so a mail never goes out with a raw `{link}` in it. The text part is
// plain text, so a value goes in as typed. The HTML part escapes every value and every word of copy.
export function renderMail(request: MailRequest, link: string | undefined): RenderedMail {
  const { template } = request
  const { subject, preheader, reason, body } = templates[template]
  const words = copy[request.language]
  const params: Record<string, string | undefined> = Object.fromEntries(
    Object.entries<string>(request.params).map(([name, value]) => [name, value.replace(invisible, '')]),
  )
  params.link = link
  const fill = (key: MailKey) => words[key].replace(placeholder, (_, name: string) => {
    const value = params[name]
    if (!value?.trim())
      throw new MailRenderError(`${template} has no value for {${name}}`)
    return value
  })
  const needsLink = body.some(item => item.kind === 'action')
  if (needsLink && !link?.trim())
    throw new MailRenderError(`${template} has no value for {link}`)
  if (needsLink && !webLink.test(link ?? ''))
    throw new MailRenderError(`${template} has a link that is not an http(s) URL`)

  const code = params.code?.trim() ?? ''
  if (body.some(item => item.kind === 'code') && !code)
    throw new MailRenderError(`${template} has no value for {code}`)

  const text = body.map((item) => {
    const sentence = fill(item.key)
    return item.kind === 'action' ? `${sentence}: ${link}` : sentence
  }).join('\n\n')
  const subjectLine = fill(subject)
  const html = renderHtml({
    language: request.language,
    title: subjectLine,
    preheader: fill(preheader),
    wordmark: brandName,
    footer: [...(reason ? [fill(reason)] : []), words['mail.footer']],
    blocks: body.map((item): HtmlBlock => {
      switch (item.kind) {
        case 'code':
          return { kind: 'code', label: fill(item.label), code }
        case 'action':
          return { kind: 'action', text: `${fill(item.key)}.`, button: fill(item.button), link: link ?? '', fallback: words['mail.linkFallback'] }
        default:
          return { kind: item.kind, text: fill(item.key) }
      }
    }),
  })
  return { to: request.to, subject: subjectLine, text, html }
}

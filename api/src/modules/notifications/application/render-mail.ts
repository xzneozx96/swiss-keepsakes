import type { MailKey } from '@sk/i18n/en'
import type { MailImage, MailLanguage, MailTemplate } from '../ports.ts'
import type { HtmlInfo } from './mail-layout.ts'
import { mailDe } from '@sk/i18n/de'
import { mailEn } from '@sk/i18n/en'
import { logoCid, renderHtml } from './mail-layout.ts'
import { mailLogoPng } from './mail-logo.ts'

// The values each template's job stores. An invitation mail stores the invitation id, never the link: the link
// holds the invitation's token, so it is built when the mail is sent (InvitationLink) and fills `{link}`.
export interface MailParams {
  // The sign-in code is the one secret a job holds: it is useless after 5 minutes, and the job is deleted soon after.
  N01: { shop: string, code: string }
  N18: { inviter: string, store: string, invitationId: string }
  // `expiresOn` is the invitation's expiry as an ISO instant. The mail shows its day in Zurich.
  N20: { store: string, invitationId: string, expiresOn: string }
}

// `language` is the one stored with the business record, never the server's (D12).
export type MailRequest = {
  [K in MailTemplate]: { template: K, to: string, language: MailLanguage, storeId: string | null, params: MailParams[K] }
}[MailTemplate]

// What a template says, slot by slot, in the order the HTML shows it (mail-layout.ts): a title, a description, the
// main information, a button when the mail has a link, and footnotes. The text part prints the same slots in the
// same order, so the words live once. `info` is the sign-in code (`code`) or the store in a box, with a label above
// and a line below (`store`). The text prints the code alone, and the box as three lines. `button` is the label of
// the link: the text puts the link after it and a colon, the HTML puts a button and the plain link under it.
// `reason` says why the mail arrived, in the HTML's small print only.
type Info
  = | { kind: 'code' }
    | { kind: 'store', label: MailKey, line: MailKey }

interface Template {
  subject: MailKey
  preheader: MailKey
  title: MailKey
  description: MailKey
  info: Info
  button?: MailKey
  notes: MailKey[]
  reason?: MailKey
}

// UX spec section 6. The copy lives in packages/i18n, shared with the prototype's mail log.
const templates: Record<MailTemplate, Template> = {
  // Sign-in code, to the guest or staff member who asked for it. The SPA's language, or EN.
  N01: {
    subject: 'mail.N01.subject',
    preheader: 'mail.N01.expiry',
    title: 'mail.N01.title',
    description: 'mail.N01.expiry',
    info: { kind: 'code' },
    notes: ['mail.N01.ignore'],
    reason: 'mail.N01.reason',
  },
  // Store Manager invitation, to the invitee, with the M01 link.
  N18: {
    subject: 'mail.N18.subject',
    preheader: 'mail.N18.invited',
    title: 'mail.N18.title',
    description: 'mail.N18.invited',
    info: { kind: 'store', label: 'mail.N18.box', line: 'mail.invitation.expiry' },
    button: 'mail.N18.button',
    notes: ['mail.invitation.ignore'],
  },
  // Owner invitation, to the new Owner, with the A02 link.
  N20: {
    subject: 'mail.N20.subject',
    preheader: 'mail.N20.invited',
    title: 'mail.N20.title',
    description: 'mail.N20.invited',
    info: { kind: 'store', label: 'mail.N20.box', line: 'mail.N20.validUntil' },
    button: 'mail.N20.button',
    notes: ['mail.invitation.ignore'],
  },
}

const copy = { en: mailEn, de: mailDe }

const dayEn = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' })
const dayDe = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' })

const isoInstant = /^\d{4}-\d{2}-\d{2}T/

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
  images: MailImage[]
}

// The logo the HTML shows at the top, as an inline part (cid:). The same bytes on every mail.
const logo: MailImage = { cid: logoCid, filename: 'swiss-keepsakes.png', contentType: 'image/png', base64: mailLogoPng }

// An empty or missing value throws, so a mail never goes out with a raw `{link}` in it. The text part is
// plain text, so a value goes in as typed. The HTML part escapes every value and every word of copy.
export function renderMail(request: MailRequest, link: string | undefined): RenderedMail {
  const { template } = request
  const { subject, preheader, title, description, info, button, notes, reason } = templates[template]
  const words = copy[request.language]
  const params: Record<string, string | undefined> = Object.fromEntries(
    Object.entries<string>(request.params).map(([name, value]) => [name, (value ?? '').replace(invisible, '')]),
  )
  params.link = link
  // The invitation's last day, as Zurich counts it. A missing or invalid instant leaves `{date}` empty, which throws.
  const expires = isoInstant.test(params.expiresOn ?? '') ? new Date(params.expiresOn ?? '') : undefined
  if (expires && !Number.isNaN(expires.getTime()))
    params.date = (request.language === 'de' ? dayDe : dayEn).format(expires)
  const fill = (key: MailKey) => words[key].replace(placeholder, (_, name: string) => {
    const value = params[name]
    if (!value?.trim())
      throw new MailRenderError(`${template} has no value for {${name}}`)
    return value
  })
  if (button && !link?.trim())
    throw new MailRenderError(`${template} has no value for {link}`)
  if (button && !webLink.test(link ?? ''))
    throw new MailRenderError(`${template} has a link that is not an http(s) URL`)

  const code = params.code?.trim() ?? ''
  if (info.kind === 'code' && !code)
    throw new MailRenderError(`${template} has no value for {code}`)

  // The description names the store too, so a missing store throws there before any part is returned.
  const htmlInfo: HtmlInfo = info.kind === 'code'
    ? { kind: 'code', code }
    : { kind: 'store', label: words[info.label], store: params.store ?? '', line: fill(info.line), emphasis: words[info.line].includes('{date}') ? params.date : undefined }
  const action = button ? { button: fill(button), link: link ?? '', fallback: words['mail.linkFallback'] } : undefined

  const text = [
    fill(title),
    fill(description),
    htmlInfo.kind === 'code' ? code : [htmlInfo.label, htmlInfo.store, htmlInfo.line].join('\n'),
    ...(action ? [`${action.button}: ${action.link}`] : []),
    ...notes.map(fill),
  ].join('\n\n')
  const subjectLine = fill(subject)
  const html = renderHtml({
    language: request.language,
    subject: subjectLine,
    preheader: fill(preheader),
    brand: brandName,
    title: fill(title),
    description: fill(description),
    info: htmlInfo,
    action,
    notes: notes.map(fill),
    footer: [...(reason ? [fill(reason)] : []), words['mail.footer']],
  })
  return { to: request.to, subject: subjectLine, text, html, images: [logo] }
}

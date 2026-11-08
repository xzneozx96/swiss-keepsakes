// The HTML layout of a mail, one fixed order from top to bottom: the logo, a title, a short description, a soft
// box with the main information (the sign-in code or the store), a full-width button when the mail has a link,
// and the footnotes. Left aligned on white, with no card, after the minimal style of Slack's own mail.
// Table based and all inline, because Outlook ignores most modern CSS and Gmail drops whatever is not inline.
// The one <style> block only tightens the spacing on a phone, and a client that strips it still shows the mail.
// The logo is an inline part of the message (cid:), so nothing is fetched and nothing tracks the reader.
// Light only: the logo is navy, and a dark page would hide it. Colours are the app's theme (front-end/src/styles/theme.css).

const colours = {
  page: '#ffffff',
  ink: '#33312e',
  muted: '#5e5e5a',
  box: '#f2f2ef',
  button: '#d52b1e',
  link: '#33312e',
  onBrand: '#ffffff',
}

const sans = '-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif'

const narrowScreen = `
@media (max-width: 480px) {
  .sk-shell { padding: 32px 20px 40px !important; }
  .sk-title { font-size: 26px !important; line-height: 34px !important; }
}`

// The logo's Content-ID. The message carries it as an inline image part (MailImage).
export const logoCid = 'logo@swiss-keepsakes'

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

// The main information. `code` is the sign-in code, big and letter-spaced. `store` is a label, the store's name,
// and one line, where an optional `emphasis` (a part of `line`, such as the date) goes in <strong>.
export type HtmlInfo
  = | { kind: 'code', code: string }
    | { kind: 'store', label: string, store: string, line: string, emphasis?: string }

export interface HtmlAction {
  button: string
  link: string
  fallback: string
}

// Every string is plain text. The layout escapes it, so a caller never escapes twice or not at all.
export interface HtmlMail {
  language: 'en' | 'de'
  subject: string
  preheader: string
  brand: string
  title: string
  description: string
  info: HtmlInfo
  action?: HtmlAction
  notes: string[]
  footer: string[]
}

function renderInfo(info: HtmlInfo): string {
  const open = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px"><tr><td class="sk-box" align="center" bgcolor="${colours.box}" style="background-color:${colours.box};border-radius:8px;padding:28px 20px">`
  const close = '</td></tr></table>'
  if (info.kind === 'code')
    return `${open}<span style="font-family:${sans};font-size:36px;line-height:44px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:8px;padding-left:8px;color:${colours.ink}">${escapeHtml(info.code)}</span>${close}`
  const [before = '', after = ''] = info.emphasis ? info.line.split(info.emphasis) : [info.line]
  const line = info.emphasis
    ? `${escapeHtml(before)}<strong style="color:${colours.ink}">${escapeHtml(info.emphasis)}</strong>${escapeHtml(after)}`
    : escapeHtml(info.line)
  return [
    open,
    `<p style="margin:0 0 6px;font-family:${sans};font-size:13px;line-height:18px;letter-spacing:1px;text-transform:uppercase;color:${colours.muted}">${escapeHtml(info.label)}</p>`,
    `<p style="margin:0 0 8px;font-family:${sans};font-size:24px;line-height:32px;font-weight:700;color:${colours.ink}">${escapeHtml(info.store)}</p>`,
    `<p style="margin:0;font-family:${sans};font-size:15px;line-height:22px;color:${colours.muted}">${line}</p>`,
    close,
  ].join('')
}

// A bulletproof button: the cell carries the colour for Outlook, and the link fills the cell, so the whole bar is
// the link. The plain link under it is for a client that shows no button.
function renderAction({ button, link, fallback }: HtmlAction): string {
  const href = escapeHtml(link)
  return [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr><td class="sk-button-cell" align="center" bgcolor="${colours.button}" style="background-color:${colours.button};border-radius:6px;mso-padding-alt:16px 24px">`,
    `<a class="sk-button" href="${href}" style="display:block;padding:16px 24px;font-family:${sans};font-size:15px;line-height:20px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-align:center;color:${colours.onBrand};background-color:${colours.button};text-decoration:none;border-radius:6px">${escapeHtml(button)}</a>`,
    `</td></tr></table>`,
    `<p style="margin:0 0 4px;font-family:${sans};font-size:13px;line-height:19px;color:${colours.muted}">${escapeHtml(fallback)}</p>`,
    `<p style="margin:0;font-family:${sans};font-size:13px;line-height:19px;word-break:break-all"><a class="sk-link" href="${href}" style="color:${colours.link};text-decoration:underline">${escapeHtml(link)}</a></p>`,
  ].join('')
}

// Pads the preheader so a client does not pull body text into the inbox preview after it.
const preheaderFiller = '&#8204;&nbsp;'.repeat(60)

export function renderHtml(mail: HtmlMail): string {
  const { language, subject, preheader, brand, title, description, info, action, notes, footer } = mail
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<title>${escapeHtml(subject)}</title>
<style>${narrowScreen}</style>
</head>
<body style="margin:0;padding:0;background-color:${colours.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${colours.page}">${escapeHtml(preheader)}${preheaderFiller}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.page}" style="background-color:${colours.page}"><tr><td align="center">
<!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px"><tr><td class="sk-shell" align="left" style="padding:40px 32px 48px">
<img src="cid:${logoCid}" width="200" height="47" alt="${escapeHtml(brand)}" style="display:block;width:200px;height:auto;border:0;outline:none;text-decoration:none;font-family:${sans};font-size:20px;font-weight:700;color:${colours.ink}">
<h1 class="sk-title" style="margin:40px 0 20px;font-family:${sans};font-size:32px;line-height:40px;font-weight:700;color:${colours.ink}">${escapeHtml(title)}</h1>
<p style="margin:0 0 28px;font-family:${sans};font-size:17px;line-height:26px;color:${colours.ink}">${escapeHtml(description)}</p>
${renderInfo(info)}
${action ? renderAction(action) : ''}
<div style="margin-top:40px">
${notes.map(note => `<p style="margin:0 0 12px;font-family:${sans};font-size:16px;line-height:24px;color:${colours.ink}">${escapeHtml(note)}</p>`).join('\n')}
${footer.map(line => `<p style="margin:12px 0 0;font-family:${sans};font-size:12px;line-height:18px;color:${colours.muted}">${escapeHtml(line)}</p>`).join('\n')}
</div>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`
}

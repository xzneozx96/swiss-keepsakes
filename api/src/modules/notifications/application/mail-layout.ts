// The HTML layout of a mail. Table based and all inline, because Outlook ignores most modern CSS and Gmail drops
// whatever is not inline. The one <style> block only adds dark mode and the narrow-screen padding, and a client
// that strips it still shows the light, inline version. Colours are the app's theme (front-end/src/styles/theme.css).
// No image and no web font, so nothing is fetched and nothing tracks the reader.

const colours = {
  page: '#fbfbfa',
  card: '#ffffff',
  ink: '#33312e',
  muted: '#5e5e5a',
  border: '#dcdcd7',
  codeBox: '#f2f2ef',
  brand: '#d52b1e',
  link: '#a3241a',
  onBrand: '#ffffff',
}

const sans = '-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif'
const serif = '\'Source Serif 4\',Georgia,\'Times New Roman\',serif'
const mono = '\'SFMono-Regular\',Menlo,Consolas,\'Liberation Mono\',monospace'

// A warm dark, not an inversion: the card stays a step lighter than the page, and the red is lifted for contrast.
const darkMode = `
@media (prefers-color-scheme: dark) {
  .sk-page { background-color: #1c1b19 !important; }
  .sk-card { background-color: #292724 !important; border-color: #3d3b37 !important; }
  .sk-ink { color: #ece9e4 !important; }
  .sk-muted { color: #b3afa7 !important; }
  .sk-brand { color: #ff8176 !important; }
  .sk-link { color: #ff8176 !important; }
  .sk-codebox { background-color: #34322e !important; border-color: #4a4742 !important; }
  .sk-rule { border-top-color: #3d3b37 !important; }
}
@media (max-width: 480px) {
  .sk-card { padding: 24px 20px !important; }
  .sk-button-cell { display: block !important; }
  .sk-button { display: block !important; }
}`

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

export type HtmlBlock
  = | { kind: 'paragraph', text: string }
    | { kind: 'lead', text: string }
    | { kind: 'note', text: string }
    | { kind: 'code', label: string, code: string }
    | { kind: 'action', text: string, button: string, link: string, fallback: string }

// Every string a block holds is plain text. The layout escapes it, so a caller never escapes twice or not at all.
function renderBlock(block: HtmlBlock): string {
  switch (block.kind) {
    case 'paragraph':
      return `<p class="sk-ink" style="margin:0 0 16px;font-family:${sans};font-size:16px;line-height:24px;color:${colours.ink}">${escapeHtml(block.text)}</p>`
    case 'lead':
      return `<p class="sk-ink" style="margin:0 0 16px;font-family:${serif};font-size:20px;line-height:28px;font-weight:500;color:${colours.ink}">${escapeHtml(block.text)}</p>`
    case 'note':
      return `<p class="sk-muted" style="margin:0 0 8px;font-family:${sans};font-size:14px;line-height:21px;color:${colours.muted}">${escapeHtml(block.text)}</p>`
    case 'code':
      return [
        `<p class="sk-muted" style="margin:0 0 8px;font-family:${sans};font-size:14px;line-height:21px;color:${colours.muted}">${escapeHtml(block.label)}</p>`,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr><td class="sk-codebox" align="center" bgcolor="${colours.codeBox}" style="background-color:${colours.codeBox};border:1px solid ${colours.border};border-radius:12px;padding:20px 12px">`,
        `<span class="sk-ink" style="font-family:${mono};font-size:36px;line-height:44px;font-weight:700;letter-spacing:8px;padding-left:8px;color:${colours.ink}">${escapeHtml(block.code)}</span>`,
        `</td></tr></table>`,
      ].join('')
    case 'action': {
      const href = escapeHtml(block.link)
      return [
        `<p class="sk-ink" style="margin:0 0 20px;font-family:${sans};font-size:16px;line-height:24px;color:${colours.ink}">${escapeHtml(block.text)}</p>`,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px"><tr><td class="sk-button-cell" align="center" bgcolor="${colours.brand}" style="background-color:${colours.brand};border-radius:10px;mso-padding-alt:14px 28px">`,
        `<a class="sk-button" href="${href}" style="display:inline-block;padding:14px 28px;font-family:${sans};font-size:16px;line-height:20px;font-weight:600;color:${colours.onBrand};text-decoration:none;border-radius:10px">${escapeHtml(block.button)}</a>`,
        `</td></tr></table>`,
        `<p class="sk-muted" style="margin:0 0 4px;font-family:${sans};font-size:13px;line-height:19px;color:${colours.muted}">${escapeHtml(block.fallback)}</p>`,
        `<p style="margin:0 0 24px;font-family:${sans};font-size:13px;line-height:19px;word-break:break-all"><a class="sk-link" href="${href}" style="color:${colours.link};text-decoration:underline">${escapeHtml(block.link)}</a></p>`,
      ].join('')
    }
  }
}

export interface HtmlMail {
  language: 'en' | 'de'
  title: string
  preheader: string
  wordmark: string
  blocks: HtmlBlock[]
  footer: string
}

// Pads the preheader so a client does not pull body text into the inbox preview after it.
const preheaderFiller = '&#8204;&nbsp;'.repeat(60)

export function renderHtml({ language, title, preheader, wordmark, blocks, footer }: HtmlMail): string {
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(title)}</title>
<style>${darkMode}</style>
</head>
<body class="sk-page" style="margin:0;padding:0;background-color:${colours.page};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${colours.page}">${escapeHtml(preheader)}${preheaderFiller}</div>
<table role="presentation" class="sk-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colours.page}" style="background-color:${colours.page}"><tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td align="center" style="padding:0 0 20px"><span class="sk-brand" style="font-family:${serif};font-size:26px;line-height:32px;font-weight:600;color:${colours.brand}">${escapeHtml(wordmark)}</span></td></tr>
<tr><td class="sk-card" bgcolor="${colours.card}" style="background-color:${colours.card};border:1px solid ${colours.border};border-radius:16px;padding:36px 40px">
${blocks.map(renderBlock).join('\n')}
<hr class="sk-rule" style="border:none;border-top:1px solid ${colours.border};margin:24px 0 16px">
<p class="sk-muted" style="margin:0;font-family:${sans};font-size:12px;line-height:18px;color:${colours.muted}">${escapeHtml(footer)}</p>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

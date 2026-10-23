import type { MailRequest } from '../../../src/modules/notifications/application/render-mail.ts'
import { describe, expect, it } from 'vitest'
import { escapeHtml } from '../../../src/modules/notifications/application/mail-layout.ts'
import { MailRenderError, renderMail } from '../../../src/modules/notifications/application/render-mail.ts'

const storeId = '0192f3a0-0000-7000-8000-000000000001'
const invitationId = '0192f3a0-0000-7000-8000-000000000002'
const link = 'https://swiss-keepsakes.example/store/invitations/7f3c'

function n18(language: 'en' | 'de'): Extract<MailRequest, { template: 'N18' }> {
  return { template: 'N18', to: 'lena.meier@example.ch', language, storeId, params: { inviter: 'Ngoc Tran', store: 'Zürich Andenken', invitationId } }
}

function n20(language: 'en' | 'de'): Extract<MailRequest, { template: 'N20' }> {
  return { template: 'N20', to: 'ngoc.tran@example.ch', language, storeId, params: { store: 'Zürich Andenken', invitationId } }
}

describe('[E2.8] N18 and N20 render in the stored language, with their data and recipient', () => {
  it('[E2.8] N18 in English goes to the invitee, names the inviter, the store and the role, and carries the M01 link', () => {
    expect(renderMail(n18('en'), link)).toMatchObject({
      to: 'lena.meier@example.ch',
      subject: 'Ngoc Tran invited you to Zürich Andenken',
      text: [
        'Hello,',
        'Ngoc Tran invited you to join Zürich Andenken as Store Manager.',
        `Open the invitation, sign in and accept it: ${link}`,
        'The link works for 7 days.',
        'If you didn’t expect this invitation, you can ignore this email.',
      ].join('\n\n'),
    })
  })

  it('[E2.8] N18 in German says the same in Swiss German spelling', () => {
    expect(renderMail(n18('de'), link)).toMatchObject({
      to: 'lena.meier@example.ch',
      subject: 'Ngoc Tran hat Sie zu Zürich Andenken eingeladen',
      text: [
        'Grüezi',
        'Ngoc Tran hat Sie eingeladen, bei Zürich Andenken als Store Manager mitzuarbeiten.',
        `Öffnen Sie die Einladung, melden Sie sich an und nehmen Sie sie an: ${link}`,
        'Der Link ist 7 Tage gültig.',
        'Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.',
      ].join('\n\n'),
    })
  })

  it('[E2.8] N20 in English goes to the new Owner, names the store, and carries the A02 link', () => {
    expect(renderMail(n20('en'), link)).toMatchObject({
      to: 'ngoc.tran@example.ch',
      subject: 'You’re invited to open Zürich Andenken',
      text: [
        'Hello,',
        'You’re invited to run Zürich Andenken as its Owner.',
        `Open the invitation, sign in and complete the steps your store needs before it can sell: ${link}`,
        'The link works for 7 days.',
        'If you didn’t expect this invitation, you can ignore this email.',
      ].join('\n\n'),
    })
  })

  it('[E2.8] N20 in German says the same in Swiss German spelling', () => {
    expect(renderMail(n20('de'), link)).toMatchObject({
      to: 'ngoc.tran@example.ch',
      subject: 'Einladung: Eröffnen Sie Zürich Andenken',
      text: [
        'Grüezi',
        'Sie sind eingeladen, Zürich Andenken als Inhaber:in zu führen.',
        `Öffnen Sie die Einladung, melden Sie sich an und erledigen Sie die Schritte, die Ihr Laden vor dem Verkaufsstart braucht: ${link}`,
        'Der Link ist 7 Tage gültig.',
        'Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.',
      ].join('\n\n'),
    })
  })

  it.each([['N18', n18], ['N20', n20]] as const)('[E2.8] %s fills every placeholder in both languages and German uses no ß', (_, request) => {
    for (const language of ['en', 'de'] as const) {
      const { subject, text } = renderMail(request(language), link)
      expect(`${subject}\n${text}`).not.toMatch(/[{}]/)
      expect(`${subject}\n${text}`).not.toContain('ß')
    }
  })
})

describe('[E2.8] a template value that is missing never reaches the recipient', () => {
  it('[E2.8] a missing value throws and names the template and the placeholder, not the other values', () => {
    const request = { ...n18('en'), params: { store: 'Zürich Andenken', invitationId } } as unknown as MailRequest

    expect(() => renderMail(request, link)).toThrow(new MailRenderError('N18 has no value for {inviter}'))
  })

  it('[E2.8] an invitation without a link throws, so the mail never goes out with a raw {link}', () => {
    expect(() => renderMail(n18('de'), undefined)).toThrow(new MailRenderError('N18 has no value for {link}'))
  })

  it.each(['', '   '])('[E2.8] a blank value (%j) counts as missing', (store) => {
    const request = { ...n20('de'), params: { store, invitationId } }

    expect(() => renderMail(request, link)).toThrow(MailRenderError)
    expect(() => renderMail(request, link)).toThrow('N20 has no value for {store}')
  })
})

describe('[E2.2] N01 renders the sign-in code in the language the SPA sent', () => {
  const n01 = (language: 'en' | 'de'): Extract<MailRequest, { template: 'N01' }> => ({ template: 'N01', to: 'anna.keller@example.ch', language, storeId: null, params: { shop: 'Swiss Keepsakes', code: '482913' } })

  it('[E2.2] N01 in English names the code and says it works for 5 minutes', () => {
    expect(renderMail(n01('en'), undefined)).toMatchObject({
      to: 'anna.keller@example.ch',
      subject: 'Your Swiss Keepsakes sign-in code: 482913',
      text: [
        'Your sign-in code is 482913.',
        'Enter it in the sign-in window. It works for 5 minutes.',
        'If you didn’t try to sign in, you can ignore this email.',
      ].join('\n\n'),
    })
  })

  it('[E2.2] N01 in German says 5 Minuten', () => {
    expect(renderMail(n01('de'), undefined)).toMatchObject({
      to: 'anna.keller@example.ch',
      subject: 'Ihr Anmeldecode für Swiss Keepsakes: 482913',
      text: [
        'Ihr Anmeldecode lautet 482913.',
        'Geben Sie ihn im Anmeldefenster ein. Er ist 5 Minuten gültig.',
        'Wenn Sie sich nicht anmelden wollten, können Sie diese E-Mail ignorieren.',
      ].join('\n\n'),
    })
  })

  it('[E2.2] N01 without a code throws instead of mailing a raw {code}', () => {
    expect(() => renderMail({ ...n01('en'), params: { shop: 'Swiss Keepsakes', code: ' ' } }, undefined)).toThrow(MailRenderError)
  })
})

describe('[E2.8] every mail has an HTML part built from the same copy as the text', () => {
  const n01 = (language: 'en' | 'de'): Extract<MailRequest, { template: 'N01' }> => ({ template: 'N01', to: 'anna.keller@example.ch', language, storeId: null, params: { shop: 'Swiss Keepsakes', code: '482913' } })
  const cases = (['en', 'de'] as const).flatMap(language => [
    { name: `N01 ${language}`, request: n01(language), link: undefined, contains: '482913' },
    { name: `N18 ${language}`, request: n18(language), link, contains: link },
    { name: `N20 ${language}`, request: n20(language), link, contains: link },
  ])

  it.each(cases)('[E2.8] $name has a complete document with the code or link, a text alternative and nothing remote', ({ request, link, contains }) => {
    const { html, text } = renderMail(request, link)

    expect(html).toMatch(/^<!doctype html>\n<html lang="(en|de)">/)
    expect(html).toContain(contains)
    expect(text).toContain(contains)
    expect(html).toContain('<meta name="color-scheme" content="light dark">')
    expect(html).not.toMatch(/<script|<img|<link|<iframe|<object|\bsrc=|url\(|@import|javascript:/i)
    expect((html.match(/https?:\/\/[^"'\s<)]+/g) ?? []).every(url => url === link)).toBe(true)
    expect(html).not.toMatch(/\{\w+\}/)
  })

  it.each(cases)('[E2.8] $name says in the HTML what the text says', ({ request, link }) => {
    const { html, text } = renderMail(request, link)

    for (const paragraph of text.split('\n\n').map(part => part.replace(/: https?:\/\/\S+$/, ''))) {
      const sentence = paragraph.replace(/^Your sign-in code is |^Ihr Anmeldecode lautet |\.$/g, '')
      expect(html).toContain(escapeHtml(sentence))
    }
  })

  it.each(cases)('[E2.8] $name has a preheader of its own, hidden from the page', ({ request, link }) => {
    const { html } = renderMail(request, link)

    expect(html).toMatch(/<div style="display:none;max-height:0;overflow:hidden;mso-hide:all[^"]*">[^<&]+/)
  })

  it.each([['en', 'Accept invitation'], ['de', 'Einladung annehmen']] as const)('[E2.8] N18 in %s has a bulletproof button and the plain link under it', (language, label) => {
    const { html } = renderMail(n18(language), link)

    expect(html).toMatch(new RegExp(`<td class="sk-button-cell" align="center" bgcolor="#d52b1e"[^>]*>\\s*<a class="sk-button" href="${link}"[^>]*>${label}</a>`))
    expect(html.split(`href="${link}"`)).toHaveLength(3)
    expect(html).toContain(`>${link}</a>`)
  })

  it.each([['en', 'Set up your store'], ['de', 'Laden einrichten']] as const)('[E2.8] N20 in %s has a bulletproof button and the plain link under it', (language, label) => {
    const { html } = renderMail(n20(language), link)

    expect(html).toContain(`href="${link}"`)
    expect(html).toContain(`>${label}</a>`)
    expect(html).toContain(`>${link}</a>`)
  })

  it('[E2.8] N01 shows the code in its own large, letter-spaced box', () => {
    const { html } = renderMail(n01('en'), undefined)

    expect(html).toMatch(/<span class="sk-ink" style="[^"]*font-size:36px[^"]*letter-spacing:8px[^"]*">482913<\/span>/)
  })

  it('[E2.8] the same request and link render the same bytes every time', () => {
    expect(renderMail(n18('de'), link)).toEqual(renderMail(n18('de'), link))
  })

  describe('escaping', () => {
    const hostile = '<script>alert(1)</script> "quoted" & \'single\'\r\nBcc: evil@example.ch'
    const escaped = '&lt;script&gt;alert(1)&lt;/script&gt; &quot;quoted&quot; &amp; &#39;single&#39;'

    it('[E2.8] an inviter and a store with markup, quotes and a line break are escaped in the HTML and typed in the text', () => {
      const request = { ...n18('en'), params: { inviter: hostile, store: hostile, invitationId } }

      const { html, text, subject } = renderMail(request, link)

      expect(html).toContain(escaped)
      expect(html).not.toContain('<script>')
      expect(html).not.toContain('"quoted"')
      expect(text).toContain(hostile)
      expect(html.match(/<title>(.*)<\/title>/s)?.[1]).toContain(escaped)
      expect(subject).toContain(hostile)
    })

    it('[E2.8] a code with markup is escaped, so the code box cannot open a tag', () => {
      const { html } = renderMail({ ...n01('en'), params: { shop: 'Swiss Keepsakes', code: '"><b>1' } }, undefined)

      expect(html).toContain('&quot;&gt;&lt;b&gt;1</span>')
      expect(html).not.toContain('<b>')
    })

    it('[E2.8] a link with a quote is refused, so it cannot leave the href', () => {
      expect(() => renderMail(n18('en'), 'https://swiss-keepsakes.example/"><script>alert(1)</script>')).toThrow(MailRenderError)
    })

    it.each(['javascript:alert(1)', 'data:text/html,<p>x</p>', 'ftp://swiss-keepsakes.example/i', '//swiss-keepsakes.example/i', 'https://swiss keepsakes.example/i'])('[E2.8] the link %j is not an http(s) URL, so no mail goes out with it', (bad) => {
      expect(() => renderMail(n20('de'), bad)).toThrow(new MailRenderError('N20 has a link that is not an http(s) URL'))
    })
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { StoryBody } from '@/features/content/components/story-body'
import { headingsOf } from '@/features/content/lib/story-body'
import { fullBody, PIN_ID } from './support/public-story'

const places = [{ id: PIN_ID, slug: 'chapel-bridge', name: 'Chapel Bridge' }]

function html() {
  return renderToString(
    <LocaleProvider>
      <StoryBody body={fullBody()} language="en" places={places} />
    </LocaleProvider>,
  )
}

describe('[E4.4][AC32][AC61] story body renderer', () => {
  it('draws headings 2 and 3 with ids, a quote and both list kinds', () => {
    const out = html()

    expect(out).toMatch(/<h2[^>]*id="section-morning-at-the-pier"[^>]*>Morning at the pier<\/h2>/)
    expect(out).toMatch(/<h3[^>]*>A small detail<\/h3>/)
    expect(out).toMatch(/<blockquote[^>]*>.*The lake keeps time\./)
    expect(out).toMatch(/<ul[^>]*>.*<li[^>]*>.*Bring a jacket/)
    expect(out).toMatch(/<ol[^>]*>.*<li[^>]*>.*Take the boat/)
  })

  it('draws bold, italic, a safe link and a line break', () => {
    const out = html()

    expect(out).toContain('<strong>bold</strong>')
    expect(out).toContain('<em>italic</em>')
    expect(out).toMatch(/<a[^>]*href="https:\/\/example\.ch\/x"[^>]*rel="noopener[^"]*"[^>]*>a link<\/a>/)
    expect(out).toContain('<br/>')
  })

  it('links a pin to its map address and leaves an unknown pin as plain text', () => {
    expect(html()).toMatch(/<a[^>]*href="\/en\/map\?place=chapel-bridge"[^>]*>the Chapel Bridge<\/a>/)

    const out = renderToString(
      <LocaleProvider>
        <StoryBody body={fullBody()} language="en" places={[]} />
      </LocaleProvider>,
    )
    expect(out).toContain('the Chapel Bridge')
    expect(out).not.toContain('/map?place=')
  })

  it('draws an unsafe link href as plain text', () => {
    const body = fullBody()
    body.content = [{ type: 'paragraph', content: [{ type: 'text', text: 'bad link', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] }]
    const out = renderToString(
      <LocaleProvider>
        <StoryBody body={body} language="en" places={[]} />
      </LocaleProvider>,
    )

    expect(out).toContain('bad link')
    expect(out).not.toContain('javascript:')
  })

  it('draws an image with its responsive copies, alt and caption', () => {
    const out = html()

    expect(out).toContain('srcSet="https://media.test/k/w320.webp 320w, https://media.test/k/w640.webp 640w"')
    expect(out).toContain('alt="The pier at dawn"')
    expect(out).toContain('src="https://media.test/k/w640.webp"')
    expect(out).toContain('Dawn at the pier')
  })

  it('draws a video as a play button with no player and no third-party address', () => {
    const out = html()

    expect(out).toContain('Boat ride')
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('youtube')
    expect(out).not.toContain('ytimg')
  })

  it('draws a recording in the shared player (play button, progress bar) that preloads nothing', () => {
    const out = html()

    expect(out).toMatch(/<audio[^>]*preload="none"[^>]*src="https:\/\/media\.test\/k\/a\.mp3"/)
    expect(out).toContain('aria-label="Play: Lake sounds"')
    expect(out).toContain('role="progressbar"')
    expect(out).toContain('Recorded on site')
    expect(out).not.toContain('controls')
  })

  it('picks the 640 px copy whatever order the copies come in', () => {
    const body = fullBody()
    body.content = [{ type: 'image', attrs: { key: 'k', url: 'https://media.test/o.jpg', variants: [{ width: 1280, url: 'https://media.test/w1280.webp' }, { width: 320, url: 'https://media.test/w320.webp' }, { width: 640, url: 'https://media.test/w640.webp' }], alt: '', caption: '' } }]
    const out = renderToString(
      <LocaleProvider>
        <StoryBody body={body} language="en" places={[]} />
      </LocaleProvider>,
    )

    expect(out).toContain('src="https://media.test/w640.webp"')
  })

  it('opens only a web link to another site in a new tab, not a mail link', () => {
    const body = fullBody()
    const link = (href: string) => ({ type: 'text' as const, text: href, marks: [{ type: 'link' as const, attrs: { href } }] })
    body.content = [{ type: 'paragraph', content: [link('https://example.ch/a'), link('mailto:hi@example.ch')] }]
    const out = renderToString(
      <LocaleProvider>
        <StoryBody body={body} language="en" places={[]} />
      </LocaleProvider>,
    )

    expect(out).toMatch(/<a[^>]*href="https:\/\/example\.ch\/a"[^>]*target="_blank"/)
    expect(out).toMatch(/<a(?![^>]*target)[^>]*href="mailto:hi@example\.ch"/)
  })

  it('draws an image or recording with no ready file as nothing', () => {
    const body = fullBody()
    body.content = [
      { type: 'image', attrs: { key: null, url: null, variants: [], alt: 'x', caption: 'Hidden image' } },
      { type: 'audio', attrs: { key: null, url: null, title: 'Hidden audio', caption: '' } },
    ]
    const out = renderToString(
      <LocaleProvider>
        <StoryBody body={body} language="en" places={[]} />
      </LocaleProvider>,
    )

    expect(out).not.toContain('Hidden')
  })

  it('[AC32] keeps equal headings apart with a counter', () => {
    const body = fullBody()
    const h = (text: string, level: 2 | 3) => ({ type: 'heading' as const, attrs: { level }, content: [{ type: 'text' as const, text }] })
    body.content = [h('Same', 2), h('Same', 2), h('Sub', 3)]

    expect(headingsOf(body).map(x => x.id)).toEqual(['same', 'same-2', 'sub'])
  })
})

describe('[E4.4][AC32] video loads on play only', () => {
  it('mounts the nocookie player after the press and not before', async () => {
    const body = fullBody()
    render(
      <LocaleProvider>
        <StoryBody body={body} language="en" places={places} />
      </LocaleProvider>,
    )

    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('img[src*="youtube"], img[src*="ytimg"]')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Boat ride/ }))

    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0')
  })

  it('makes no network request for the video before the press', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(
      <LocaleProvider>
        <StoryBody body={fullBody()} language="en" places={places} />
      </LocaleProvider>,
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(Array.from(document.querySelectorAll('[src],[srcset]'), el => el.getAttribute('src') ?? '').filter(s => /youtube|ytimg/.test(s))).toEqual([])
    fetchSpy.mockRestore()
  })
})

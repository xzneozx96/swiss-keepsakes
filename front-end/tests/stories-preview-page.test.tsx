import type { StoryVersionText } from '@sk/api-contract'
import type { StoryPreviewPageProps } from '@/features/stories/components/story-preview-page'

import { render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import { LocaleOverride, LocaleProvider } from '@/contexts/locale-context'
import { StoryPreviewPage } from '@/features/stories/components/story-preview-page'

type Media = StoryVersionText['media'][number]
type Body = StoryPreviewPageProps['body']

const photo: Media = {
  id: '00000000-0000-4000-8000-0000000000a1',
  kind: 'image',
  status: 'ready',
  name: 'wall.jpg',
  contentType: 'image/jpeg',
  byteSize: 1,
  width: 1600,
  height: 1000,
  publicUrl: 'https://files.test/wall.jpg',
  variants: [{ width: 800, url: 'https://files.test/wall-800.jpg' }],
}
const clip: Media = { ...photo, id: '00000000-0000-4000-8000-0000000000b1', kind: 'audio', publicUrl: 'https://files.test/clip.mp3', variants: [] }
const text = (value: string, marks?: { type: string, attrs?: Record<string, unknown> }[]) => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })
const para = (...content: ReturnType<typeof text>[]) => ({ type: 'paragraph', content })
const h2 = (value: string) => ({ type: 'heading', attrs: { level: 2 }, content: [text(value)] })
const doc = (...content: Body['content']): Body => ({ type: 'doc', content })

const pins = [
  { id: 'site', name: 'Zytturm', published: true, website: 'https://zyt.example/tower', slug: 'zyt' },
  { id: 'map', name: 'Musegg', published: true, website: null, slug: 'musegg' },
  { id: 'draft', name: 'Hidden pin', published: false, website: null, slug: 'hidden' },
]
const pinHref = (id: string) => (id === 'site' ? 'https://zyt.example/tower' : id === 'map' ? '/en/map?place=musegg' : null)

function props(over: Partial<StoryPreviewPageProps> = {}): StoryPreviewPageProps {
  return {
    language: 'en',
    title: 'A morning on the Musegg wall',
    excerpt: 'Nine towers, one walk.',
    cover: 'https://files.test/cover.jpg',
    author: 'Anna Keller',
    publishedOn: '2026-10-12',
    today: '2026-11-03',
    review: null,
    body: doc(para(text('Walk '), text('slowly', [{ type: 'bold' }]))),
    media: [photo, clip],
    pinHref,
    places: [pins[0]!, pins[1]!],
    keepsakes: [],
    related: [],
    ...over,
  }
}

function renderPage(over: Partial<StoryPreviewPageProps> = {}) {
  const page = props(over)

  return render(
    <LocaleProvider>
      <LocaleOverride language={page.language}>
        <StoryPreviewPage {...page} />
      </LocaleOverride>
    </LocaleProvider>,
  )
}

beforeAll(() => {
  // C20's contents bar scrolls its chips into view.
  Element.prototype.scrollTo = () => {}
})

describe('[E4.3][AC30][AC33][AC45][AC54] the guest story page drawn from a draft', () => {
  it('draws the cover title, the excerpt, the bold text, a heading, the photo, the pin link and the sections (AC-1)', async () => {
    const body = doc(
      h2('The wall'),
      para(text('Walk '), text('slowly', [{ type: 'bold' }]), text(' to '), text('the tower', [{ type: 'pinLink', attrs: { pinId: 'site' } }])),
      { type: 'image', attrs: { mediaId: photo.id, caption: 'At dawn' } },
    )

    renderPage({ body, keepsakes: [{ id: 'k', name: 'Cowbell', photo: undefined }], related: [{ groupId: 'r', title: 'Old Town', photo: undefined }] })

    expect(await screen.findByRole('heading', { level: 1, name: 'A morning on the Musegg wall' })).toBeTruthy()
    expect(screen.getByText('Nine towers, one walk.')).toBeTruthy()
    expect(screen.getByText('slowly').tagName).toBe('STRONG')
    expect(screen.getByRole('heading', { level: 2, name: 'The wall' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'At dawn' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'the tower' })).toBeTruthy()
    expect(screen.getByRole('list', { name: 'Places in this story' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Keepsakes from this story' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'More to discover' })).toBeTruthy()
  })

  it('draws nothing for an unknown node and still renders the paragraphs around it (AC-1)', async () => {
    const { container } = renderPage({ body: doc(para(text('Before')), { type: 'mystery' }, { type: 'table' }, para(text('After'))) })

    await screen.findByRole('heading', { level: 1 })
    const article = container.querySelector('article')!

    expect(within(article).getByText('Before')).toBeTruthy()
    expect(within(article).getByText('After')).toBeTruthy()
    expect(article.querySelector('table')).toBeNull()
    expect(article.textContent).not.toContain('mystery')
  })

  it('shows the keepsake names and photos and no price (AC-2)', async () => {
    renderPage({ keepsakes: [{ id: 'a', name: 'Cowbell', photo: 'https://files.test/a.jpg' }, { id: 'b', name: 'Music box', photo: 'https://files.test/b.jpg' }] })

    const section = (await screen.findByRole('heading', { name: 'Keepsakes from this story' })).closest('section')!

    expect(within(section).getByText('Cowbell')).toBeTruthy()
    expect(within(section).getByText('Music box')).toBeTruthy()
    expect(section.querySelectorAll('img')).toHaveLength(2)
    expect(section.textContent).not.toMatch(/CHF|\d+[.,]\d{2}/)
  })

  it('sends a pin link to the website or the map, draws a draft pin as text, and opens plain links in a new tab (AC-3)', async () => {
    const link = (href: string) => ({ type: 'link', attrs: { href } })
    const body = doc(para(
      text('site', [{ type: 'pinLink', attrs: { pinId: 'site' } }]),
      text(' '),
      text('map', [{ type: 'pinLink', attrs: { pinId: 'map' } }]),
      text(' '),
      text('draft', [{ type: 'pinLink', attrs: { pinId: 'draft' } }]),
      text(' '),
      text('plain', [link('https://example.org/x')]),
      text(' '),
      text('evil', [link('javascript:alert(1)')]),
    ))

    renderPage({ body })

    expect(await screen.findByRole('link', { name: 'site' })).toHaveProperty('href', 'https://zyt.example/tower')
    expect(screen.getByRole('link', { name: 'map' }).getAttribute('href')).toBe('/en/map?place=musegg')
    expect(screen.queryByRole('link', { name: 'draft' })).toBeNull()
    expect(screen.getByRole('link', { name: 'site' }).closest('p')?.textContent).toContain('draft')
    const plain = screen.getByRole('link', { name: 'plain' })

    expect(plain.getAttribute('target')).toBe('_blank')
    expect(plain.getAttribute('rel')).toContain('noopener')
    expect(screen.getByRole('link', { name: 'site' }).getAttribute('target')).toBe('_blank')
    expect(screen.queryByRole('link', { name: 'evil' })).toBeNull()
    expect(screen.getByRole('link', { name: 'site' }).closest('p')?.textContent).toContain('evil')
  })

  it('shows the contents bar from two H2 and not from one (AC-5)', async () => {
    const view = renderPage({ body: doc(h2('Only one'), para(text('x'))) })

    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('navigation', { name: 'In this story' })).toBeNull()
    view.unmount()

    renderPage({ body: doc(h2('First'), para(text('x')), h2('Second')) })
    const nav = await screen.findByRole('navigation', { name: 'In this story' })

    expect(within(nav).getAllByRole('button').map(button => button.textContent)).toEqual(['First', 'Second'])
  })

  it('draws the page labels in the story language (AC-6)', async () => {
    renderPage({ language: 'de', title: 'Ein Morgen auf der Museggmauer', related: [{ groupId: 'r', title: 'Altstadt', photo: undefined }] })

    expect(await screen.findByRole('heading', { level: 1, name: 'Ein Morgen auf der Museggmauer' }, { timeout: 5000 })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Mehr entdecken' })).toBeTruthy()
  })

  it('names who checked the facts for an editorial review, and shows no such line otherwise (AC-7)', async () => {
    const view = renderPage({ review: { checkedOn: '2026-10-12' } })

    expect(await screen.findByText(/Facts checked .*12 Oct by Anna Keller/)).toBeTruthy()
    view.unmount()

    renderPage({ review: null })
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText(/Facts checked/)).toBeNull()
  })

  it('plays a recording that has a served file with a native player', async () => {
    const { container } = renderPage({ body: doc({ type: 'audio', attrs: { mediaId: clip.id, title: 'Bells', caption: 'The Zytturm' } }) })

    await screen.findByRole('heading', { level: 1 })
    expect(container.querySelector('audio')?.getAttribute('src')).toBe('https://files.test/clip.mp3')
    expect(screen.getByText('Bells')).toBeTruthy()
    expect(screen.getByText('The Zytturm')).toBeTruthy()
  })

  it('shows "Untitled story" for an empty title, and the title without a cover', async () => {
    const view = renderPage({ title: '' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Untitled story' })).toBeTruthy()
    view.unmount()

    renderPage({ cover: undefined })
    expect(await screen.findByRole('heading', { level: 1, name: 'A morning on the Musegg wall' })).toBeTruthy()
  })
})

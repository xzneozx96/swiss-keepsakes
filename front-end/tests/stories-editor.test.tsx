import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { coverId, groupId, patches, problem, renderStoryEditor, secondPhotoId, serveStory, setUpHarness, state, storeId, storyDoc, storyGroupDetail, storyVersion } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

// jsdom is not wide, so the phone view renders: the full language switch sits above the cards.
const view = vi.hoisted(() => ({ wide: false }))

vi.mock('@/hooks/use-is-wide', () => ({ useIsWide: () => view.wide }))

const SLOW = { timeout: 8000 }
const AUTOSAVE = { timeout: 5000 }
const path = `/store/content/articles/${groupId}`
const base = `/api/store/${storeId}/story-groups/${groupId}`
const wait = (ms: number) => act(() => new Promise<void>(resolve => setTimeout(resolve, ms)))

beforeEach(async () => {
  view.wide = false
  await setUpHarness()
})

afterEach(() => vi.restoreAllMocks())

/** English draft at row version 3 and a published German version at row version 5, unless `versions` says otherwise. */
function both() {
  return storyGroupDetail({
    en: storyVersion('en', { draft: storyDoc({ title: 'Old title' }) }),
    de: storyVersion('de', { status: 'published', slug: 'ein-morgen', draft: null, published: storyDoc({ title: 'Alter Titel', excerpt: 'Alter Kurztext', authorName: 'Old Author', checkedOn: '2026-10-01' }), publishedAt: '2026-11-01T08:00:00.000Z', rowVersion: 5 }),
  })
}

const titleField = () => screen.findByRole('textbox', { name: /^Title/ }, SLOW)
const status = (text: RegExp | string) => screen.getByText(text)
/** The header's title line and the switch's status line say the same words, so a title is looked for in both. */
const headings = (text: string) => screen.findAllByText(text, undefined, SLOW)

async function openEditor(search = '') {
  const router = renderStoryEditor(`${path}${search}`)

  await titleField()

  return router
}

/** Types at the end of the title. */
async function typeTitle(text: string) {
  const field = await titleField()

  await userEvent.click(field)
  await userEvent.keyboard(`{End}${text}`)
}

describe('[E4.3][AC30][AC45] the story editor', () => {
  it('[E4.3][AC45] AC-1 a typed title saves with If-Match 3, the header shows Saved {time}, and the next save uses If-Match 4', async () => {
    serveStory(both())
    await openEditor()
    await typeTitle(' x')

    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]).toMatchObject({ path: `${base}/versions/en`, ifMatch: '3', body: { draft: { title: 'Old title x', authorName: 'Anna Keller' } } })
    expect(patches()[0]!.key).toBeTruthy()
    await waitFor(() => expect(status(/^Saved \d\d:\d\d/)).toBeInTheDocument())
    await typeTitle('y')
    await waitFor(() => expect(patches()).toHaveLength(2), AUTOSAVE)
    expect(patches()[1]).toMatchObject({ ifMatch: '4', body: { draft: { title: 'Old title xy' } } })
  }, 20000)

  it('[E4.3][AC45] AC-1 switching to German saves the pending edit first, then opens German', async () => {
    serveStory(both())
    await openEditor()
    await typeTitle('!')
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))

    expect(await headings('Deutsch · Published')).toHaveLength(2)
    expect(patches()).toHaveLength(1)
    expect(patches()[0]).toMatchObject({ path: `${base}/versions/en`, ifMatch: '3' })
    expect(await titleField()).toHaveValue('Alter Titel')
  })

  it('[E4.3][AC45] typing during a running save sends the second PATCH after the first, never in parallel', async () => {
    const server = serveStory(both())
    let release = () => {}

    server.gate = new Promise<void>((resolve) => {
      release = resolve
    })
    await openEditor()
    await typeTitle('a')
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    await typeTitle('b')
    await wait(1900)
    expect(patches()).toHaveLength(1)
    server.gate = undefined
    release()

    await waitFor(() => expect(patches()).toHaveLength(2), AUTOSAVE)
    expect(patches().map(call => call.ifMatch)).toEqual(['3', '4'])
    expect(patches()[1]).toMatchObject({ body: { draft: { title: 'Old titleab' } } })
  }, 20000)

  it('[E4.3][AC45] AC-2 a 412 shows the text containing "someone saved this after you opened it" with Reload, keeps the typed text, sends no further save, and Reload shows the server copy', async () => {
    const server = serveStory(both(), call => (call.method === 'PATCH'
      ? ((server.group = storyGroupDetail({ ...server.group.versions, en: storyVersion('en', { draft: storyDoc({ title: 'Server copy' }), rowVersion: 4 }) })), problem(412, 'precondition-failed'))
      : undefined))
    await openEditor()
    await typeTitle(' mine')

    expect(await screen.findByRole('alert', undefined, AUTOSAVE)).toHaveTextContent(/someone saved this after you opened it/i)
    expect(status('Not saved')).toBeInTheDocument()
    expect(await titleField()).toHaveValue('Old title mine')
    await typeTitle(' more')
    await wait(1900)
    expect(patches()).toHaveLength(1)
    expect(await titleField()).toHaveValue('Old title mine more')

    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    await waitFor(async () => expect(await titleField()).toHaveValue('Server copy'), SLOW)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  }, 20000)

  it('[E4.3][AC45] AC-3 Back with unsaved edits opens Leave without saving?, and Keep editing stays on the page with the text', async () => {
    serveStory(both())
    await openEditor()
    await typeTitle(' kept')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Stories' }))

    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    expect(screen.getByText('Your last edits are not saved yet. If you leave now, they are lost.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument())
    expect(await titleField()).toHaveValue('Old title kept')
  })

  it('[E4.3][AC45] AC-3 Leave without saving opens the list and sends no save', async () => {
    serveStory(both())
    await openEditor()
    await typeTitle(' lost')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Stories' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Leave without saving' }))

    expect(await screen.findByText('Stories list')).toBeInTheDocument()
    await wait(1900)
    expect(patches()).toHaveLength(0)
  })

  it('[E4.3][AC45] AC-3 Back with nothing unsaved opens the list at once', async () => {
    serveStory(both())
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Stories' }))

    expect(await screen.findByText('Stories list')).toBeInTheDocument()
    expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument()
  })

  it('[E4.3][AC45] AC-3 a link to another page with unsaved edits asks first', async () => {
    serveStory(both())
    const router = await openEditor()

    await typeTitle(' x')
    void router.navigate({ to: '/store/content' })

    expect(await screen.findByText('Leave without saving?')).toBeInTheDocument()
    expect(screen.queryByText('Stories list')).not.toBeInTheDocument()
  })

  it('[E4.3][AC45] AC-4 editing the title of the published German version saves a draft, the switch says Published · edits not live, and the published copy in the fake server is unchanged', async () => {
    const server = serveStory(both())
    await openEditor('?lang=de')
    await typeTitle('!')

    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]).toMatchObject({ path: `${base}/versions/de`, ifMatch: '5', body: { draft: { title: 'Alter Titel!' } } })
    expect(await screen.findByText('Deutsch · Published · edits not live')).toBeInTheDocument()
    const german = server.group.versions.de as { published: { title: string }, draft: { title: string } }

    expect(german.published.title).toBe('Alter Titel')
    expect(german.draft.title).toBe('Alter Titel!')
  })

  it('[E4.3][AC30] AC-5 an English-only story shows German as Not started and asks for no German anywhere; choosing it posts an empty German draft with the English cover and shows it', async () => {
    serveStory(storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ coverMediaId: coverId }) }) }))
    await openEditor()

    expect(screen.getByRole('tab', { name: /Deutsch/ })).toHaveTextContent('Not started · choose to start it')
    expect(state.calls.filter(call => call.path.includes('/versions/de'))).toHaveLength(0)
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))

    expect(await headings('Deutsch · Draft')).toHaveLength(2)
    const post = state.calls.find(call => call.method === 'POST' && call.path === `${base}/versions`)

    expect(post?.body).toMatchObject({ language: 'de', draft: { title: '', excerpt: '', authorName: 'Anna Keller', coverMediaId: coverId } })
    expect(await titleField()).toHaveValue('')
  })

  it('[E4.3][AC30] AC-4 starting the German version of a review copies the English check date and leaves the English version as it was', async () => {
    const server = serveStory(storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ checkedOn: '2026-10-12' }) }) }, { kind: 'editorial_review', subjectPlaceId: coverId }))

    await openEditor()
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))
    expect(await headings('Deutsch · Draft')).toHaveLength(2)
    const post = state.calls.find(call => call.method === 'POST' && call.path === `${base}/versions`)

    expect(post?.body).toMatchObject({ language: 'de', draft: { title: '', checkedOn: '2026-10-12' } })
    expect((server.group.versions.en as { draft: { checkedOn: string } }).draft.checkedOn).toBe('2026-10-12')
  })

  it('[E4.3][AC30] AC-5 ?lang=de on a story with no German falls back to English', async () => {
    serveStory(storyGroupDetail({ en: storyVersion('en') }))
    await openEditor('?lang=de')

    expect(screen.getAllByText('English · Draft')).toHaveLength(2)
    expect(screen.queryByText('Deutsch · Draft')).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 the cover can be added from a ready photo, changed and removed through the real picker, and the save carries coverMediaId', async () => {
    serveStory(both())
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: /Add a cover photo/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use as cover' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Change cover' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Second.JPG' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use as cover' }))

    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]).toMatchObject({ body: { draft: { coverMediaId: secondPhotoId } } })
    await userEvent.click(await screen.findByRole('button', { name: 'Remove cover' }))
    await waitFor(() => expect(patches()).toHaveLength(2), AUTOSAVE)
    expect(patches()[1]).toMatchObject({ ifMatch: '4', body: { draft: { coverMediaId: null } } })
  }, 25000)

  it('[E4.3][AC30] AC-7 no error shows before Review; pressing Review with a blocking check, then Back to writing, shows Add a title to publish. and the red cover border', async () => {
    serveStory(storyGroupDetail({ en: storyVersion('en', { draft: storyDoc({ title: '', excerpt: '' }) }) }))
    await openEditor()

    expect(screen.queryByText('Add a title to publish.')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Review and publish' }))
    expect(await screen.findByText('Review and publish')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to writing' }))

    expect(await screen.findByText('Add a title to publish.')).toBeInTheDocument()
    expect(screen.getByText('Add a short summary to publish.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add a cover photo/ })).toHaveClass('border-danger')
  })

  it('[E4.3][AC45] a save of a cover the API refuses (422 media-retired) shows the refusal and keeps the edit', async () => {
    serveStory(both(), call => (call.method === 'PATCH' ? problem(422, 'media-retired') : undefined))
    await openEditor()
    await typeTitle(' kept')

    expect(await screen.findByText(/A photo you chose has been removed/, undefined, AUTOSAVE)).toBeInTheDocument()
    expect(await titleField()).toHaveValue('Old title kept')
    expect(status('Not saved')).toBeInTheDocument()
  })

  it('[E4.3][AC45] a language switch while the pending save fails stays on the open version with Not saved', async () => {
    serveStory(both(), call => (call.method === 'PATCH' ? problem(500, 'internal-error') : undefined))
    await openEditor()
    await typeTitle(' kept')
    await userEvent.click(screen.getByRole('tab', { name: /Deutsch/ }))

    await waitFor(() => expect(status('Not saved')).toBeInTheDocument(), SLOW)
    expect(screen.getAllByText('English · Draft')).toHaveLength(2)
    expect(await titleField()).toHaveValue('Old title kept')
  })

  it('[E4.3][AC45] a published version with no draft saves the full document built from published (body and checkedOn kept)', async () => {
    const group = both()

    serveStory(group)
    await openEditor('?lang=de')
    const field = await screen.findByRole('textbox', { name: /^Short summary/ })

    await userEvent.click(field)
    await userEvent.keyboard('{End}!')

    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]!.body).toEqual({
      draft: { title: 'Alter Titel', excerpt: 'Alter Kurztext!', authorName: 'Anna Keller', coverMediaId: null, checkedOn: '2026-10-01', body: storyDoc().body },
    })
  })

  it('[E4.3][AC30] an unknown story id shows This story no longer exists. with Back to Stories', async () => {
    serveStory(both())
    renderStoryEditor('/store/content/articles/0198a000-0000-7000-8000-00000000ffff')

    expect(await screen.findByText('This story no longer exists.', undefined, SLOW)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Stories' })).toHaveAttribute('href', '/store/content')
  })

  it('[E4.3][AC30] while the story loads the skeleton has the Write shape and aria-busy', async () => {
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    serveStory(both(), call => (call.method === 'GET' && call.path === base ? (held.then(() => Response.json(both())) as never) : undefined))
    renderStoryEditor(path)

    const skeleton = await screen.findByLabelText('Loading the story')

    expect(skeleton).toHaveAttribute('aria-busy', 'true')
    expect(skeleton.querySelectorAll('.skeleton').length).toBeGreaterThan(4)
    release()
    await titleField()
    expect(screen.queryByLabelText('Loading the story')).not.toBeInTheDocument()
  })
})

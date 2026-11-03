import type { StoryFields } from '@/features/stories/lib/draft'

import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { CoverTitleCard } from '@/features/stories/components/cover-title-card'
import { item, other, page, photoId, setUpHarness, state, storeId } from './media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

type Cover = Pick<StoryFields, 'title' | 'excerpt' | 'coverMediaId'>

const empty: Cover = { title: '', excerpt: '', coverMediaId: null }
let latest: Cover

/** The controlled card with the state a screen would hold. */
function Host({ initial = empty, showErrors = false }: { initial?: Cover, showErrors?: boolean }) {
  const [fields, setFields] = useState(initial)

  useEffect(() => {
    latest = fields
  }, [fields])

  return (
    <CoverTitleCard
      fields={fields}
      language="de"
      showErrors={showErrors}
      storeId={storeId}
      onChange={patch => setFields(current => ({ ...current, ...patch }))}
    />
  )
}

function renderCard(props: Parameters<typeof Host>[0] = {}) {
  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <Host {...props} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

/** The library has a ready and a processing photo; a file read answers `file`. */
function serve(file: Record<string, unknown> = {}) {
  state.answer = (call) => {
    if (call.method !== 'GET')
      return undefined
    if (call.path.startsWith(`/api/store/${storeId}/media?`))
      return Response.json(page([item({ name: 'Ready.JPG' }), item({ id: other, name: 'Busy.JPG', status: 'processing' })]))
    if (call.path === `/api/store/${storeId}/media/${photoId}`)
      return Response.json(item({ name: 'Ready.JPG', ...file }))

    return undefined
  }
}

beforeEach(async () => {
  await setUpHarness()
  serve()
})

describe('[E4.3][AC30] cover and title card', () => {
  it('[E4.3][AC30] AC-6 an empty cover offers Add a cover photo, and picking a ready photo then Use as cover sets it and shows Change cover and Remove cover', async () => {
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: /Add a cover photo/ }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    await userEvent.click(screen.getByRole('button', { name: 'Use as cover' }))

    await waitFor(() => expect(latest.coverMediaId).toBe(photoId))
    expect(await screen.findByRole('button', { name: 'Change cover' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove cover' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add a cover photo/ })).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 a processing photo is off in the picker with a Processing chip', async () => {
    renderCard()

    await userEvent.click(screen.getByRole('button', { name: /Add a cover photo/ }))

    expect(await screen.findByRole('checkbox', { name: 'Busy.JPG, Processing' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'Cover photo' })).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 Remove cover clears it', async () => {
    renderCard({ initial: { ...empty, coverMediaId: photoId } })

    await userEvent.click(await screen.findByRole('button', { name: 'Remove cover' }))

    expect(latest.coverMediaId).toBeNull()
    expect(screen.getByRole('button', { name: /Add a cover photo/ })).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-6 the title stops at 140 characters and the excerpt at 300, and the counters show it', async () => {
    renderCard()
    const title = screen.getByRole('textbox', { name: /^Title/ })
    const excerpt = screen.getByRole('textbox', { name: /^Short summary/ })

    expect(screen.getByText('0 / 140')).toBeInTheDocument()
    expect(screen.getByText('0 / 300')).toBeInTheDocument()
    await userEvent.click(title)
    await userEvent.paste('a'.repeat(150))
    await userEvent.click(excerpt)
    await userEvent.paste('b'.repeat(310))

    expect(latest.title).toHaveLength(140)
    expect(latest.excerpt).toHaveLength(300)
    expect(screen.getByText('140 / 140')).toBeInTheDocument()
    expect(screen.getByText('300 / 300')).toBeInTheDocument()
  })

  it('[E4.3][AC30] AC-7 with no Review pressed, an empty title, excerpt and cover show no error', () => {
    renderCard()

    expect(screen.queryByText('Add a title to publish.')).not.toBeInTheDocument()
    expect(screen.queryByText('Add a short summary to publish.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add a cover photo/ })).not.toHaveClass('border-danger')
  })

  it('[E4.3][AC30] AC-7 with showErrors the title says Add a title to publish., the excerpt says Add a short summary to publish. and the empty cover has the red dashed border', () => {
    renderCard({ showErrors: true })

    expect(screen.getByText('Add a title to publish.')).toBeInTheDocument()
    expect(screen.getByText('Add a short summary to publish.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add a cover photo/ })).toHaveClass('border-danger', 'border-dashed')
  })

  it('[E4.3][AC30] AC-7 with showErrors a filled title and excerpt show no error', () => {
    renderCard({ showErrors: true, initial: { title: 'A title', excerpt: 'An excerpt', coverMediaId: null } })

    expect(screen.queryByText('Add a title to publish.')).not.toBeInTheDocument()
    expect(screen.queryByText('Add a short summary to publish.')).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] a retired cover file shows the unavailable state with Change cover', async () => {
    serve({ status: 'retired' })
    renderCard({ initial: { ...empty, coverMediaId: photoId } })

    expect(await screen.findByText(/no longer available/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change cover' })).toBeInTheDocument()
  })

  it('[E4.3][AC30] a cover file that is gone shows the unavailable state, not a crash', async () => {
    state.answer = call => (call.method === 'GET' && call.path.includes('/media/') ? new Response(JSON.stringify({ type: 'not-found', title: 'Not found', status: 404 }), { status: 404, headers: { 'content-type': 'application/problem+json' } }) : undefined)
    renderCard({ initial: { ...empty, coverMediaId: photoId } })

    expect(await screen.findByText(/no longer available/)).toBeInTheDocument()
  })

  it('[E4.3][AC30] the fields carry lang', () => {
    renderCard()

    expect(screen.getByRole('textbox', { name: /^Title/ })).toHaveAttribute('lang', 'de')
    expect(within(screen.getByRole('region', { name: 'Cover and title' })).getByRole('textbox', { name: /^Short summary/ })).toHaveAttribute('lang', 'de')
  })

  it('[S8-UI-02] the summary field is labelled Short summary, has no helper line and no author line, and keeps its counter', () => {
    renderCard()

    expect(screen.queryByText('Excerpt')).not.toBeInTheDocument()
    expect(screen.getByText('0 / 300')).toBeInTheDocument()
    expect(screen.queryByText(/Under the title, on story cards/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Written by/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Anna Keller/)).not.toBeInTheDocument()
  })
})

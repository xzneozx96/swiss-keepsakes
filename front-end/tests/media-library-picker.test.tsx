import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { LibraryPicker } from '@/features/media/components/library-picker'
import { item, other, page, photoId, setUpHarness, state, storeId } from './media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const added: string[][] = []

beforeEach(async () => {
  added.length = 0
  await setUpHarness()
  state.answer = call => (call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media?`)
    ? Response.json(page([item({ name: 'Ready.JPG' }), item({ id: other, name: 'Busy.JPG', status: 'processing' })]))
    : undefined)
})

function renderPicker(props: Partial<Parameters<typeof LibraryPicker>[0]> = {}) {
  render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            <LibraryPicker isOpen room={1} single storeId={storeId} used={[]} onAdd={ids => added.push(ids)} onClose={() => {}} {...props} />
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

describe('[E4.3][AC30] the library picker for a cover', () => {
  it('[E4.3][AC30] AC-6 with readyOnly a processing photo is disabled and shows the Processing chip, a ready photo can be chosen', async () => {
    renderPicker({ readyOnly: true })

    const busy = await screen.findByRole('checkbox', { name: 'Busy.JPG, Processing' })
    const ready = await screen.findByRole('checkbox', { name: 'Ready.JPG' })

    expect(busy).toBeDisabled()
    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(ready).toBeEnabled()
    await userEvent.click(ready)
    await userEvent.click(screen.getByRole('button', { name: 'Use this photo' }))
    expect(added).toEqual([[photoId]])
  })

  it('[E4.3][AC30] the title and the choose button take the given texts', async () => {
    renderPicker({ title: 'Cover photo', chooseLabel: 'Use as cover' })

    expect(await screen.findByRole('heading', { name: 'Cover photo' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    expect(screen.getByRole('button', { name: 'Use as cover' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Use this photo' })).not.toBeInTheDocument()
  })

  it('[E4.3][AC30] without the new props the sheet still reads "Choose a photo" and "Use this photo", and a processing photo can be chosen', async () => {
    renderPicker()

    expect(await screen.findByRole('heading', { name: 'Choose a photo' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Busy.JPG, Processing' })).toBeEnabled())
    expect(screen.getByRole('button', { name: 'Use this photo' })).toBeInTheDocument()
  })
})

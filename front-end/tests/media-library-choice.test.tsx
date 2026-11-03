import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LibraryChoice } from '@/features/media/components/library-picker'
import { libraryItem, photoId, renderWithStore, secondPhotoId, serveExtra, serveMedia, setUpStoryMedia, state, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const toasts = vi.hoisted(() => ({ warning: vi.fn() }))

vi.mock('@heroui/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@heroui/react')>()

  return { ...actual, toast: Object.assign(vi.fn(), toasts) }
})

const NEW_ID = '0198a000-0000-7000-8000-0000000000f1'
const grant = { uploadKey: 'k/u.jpg', url: 'https://storage.test/uploads/k/u.jpg', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expiresAt: '2026-10-30T09:00:00.000Z', kind: 'image' }
let selection: string[]
let ready: boolean

beforeEach(async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:file')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  toasts.warning.mockClear()
  selection = []
  ready = false
  await setUpStoryMedia()
  serveMedia([libraryItem({ name: 'Ready.JPG' }), libraryItem({ id: secondPhotoId, name: 'Busy.JPG', status: 'processing' })])
})

afterEach(() => vi.restoreAllMocks())

function Host(props: Partial<Parameters<typeof LibraryChoice>[0]>) {
  const [selected, setSelected] = useState<string[]>([])

  return (
    <>
      <LibraryChoice room={1} selected={selected} single storeId={storeId} used={[]} onSelectedChange={(ids) => { selection = ids; setSelected(ids) }} {...props} />
      <output data-testid="chosen">{selected.join(',')}</output>
    </>
  )
}

/** A new upload: grant, PUT, confirm answer; the file reads as processing until `ready` flips. */
function serveUpload() {
  serveExtra((call) => {
    if (call.path === `/api/store/${storeId}/media/uploads`)
      return Response.json(grant)
    if (call.method === 'PUT')
      return new Response(null, { status: 200 })
    if (call.path === `/api/store/${storeId}/media/confirm`)
      return Response.json({ ...libraryItem({ id: NEW_ID, name: 'new.jpg', status: 'processing', publicUrl: null, variants: [] }) }, { status: 201 })
    if (call.method === 'GET' && call.path === `/api/store/${storeId}/media/${NEW_ID}`)
      return Response.json(libraryItem({ id: NEW_ID, name: 'new.jpg', ...(ready ? {} : { status: 'processing', publicUrl: null, variants: [] }) }))

    return undefined
  })
}

describe('[E4.3][AC45] the library wall inside another sheet', () => {
  it('[E4.3][AC45] AC-1 a processing photo cannot be chosen (checkbox disabled, Processing chip)', async () => {
    renderWithStore(<Host readyOnly />)
    const busy = await screen.findByRole('checkbox', { name: 'Busy.JPG, Processing' })

    expect(busy).toBeDisabled()
    expect(screen.getByText('Processing')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ready.JPG' }))
    expect(selection).toEqual([photoId])
  })

  it('[E4.3][AC45] AC-1 an upload with waitForReady is chosen only once its file is ready', async () => {
    serveUpload()
    renderWithStore(<Host readyOnly waitForReady />)
    await screen.findByRole('checkbox', { name: 'Ready.JPG' })
    await userEvent.upload(screen.getByTestId('picker-input'), new File(['abc'], 'new.jpg', { type: 'image/jpeg' }))

    expect(await screen.findByText('Waiting for “new.jpg” to finish processing')).toBeInTheDocument()
    expect(screen.getByTestId('chosen')).toHaveTextContent('')
    ready = true
    await waitFor(() => expect(screen.getByTestId('chosen')).toHaveTextContent(NEW_ID), { timeout: 6000 })
    expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument()
  }, 15_000)

  it('[E4.3][AC45] without waitForReady a finished upload is chosen at once', async () => {
    serveUpload()
    renderWithStore(<Host />)
    await screen.findByRole('checkbox', { name: 'Ready.JPG' })
    await userEvent.upload(screen.getByTestId('picker-input'), new File(['abc'], 'new.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(screen.getByTestId('chosen')).toHaveTextContent(NEW_ID), { timeout: 6000 })
  }, 15_000)

  it('[E4.3][AC45] a refused file (a PDF) shows a toast and adds nothing', async () => {
    renderWithStore(<Host />)
    await screen.findByRole('checkbox', { name: 'Ready.JPG' })
    await userEvent.setup({ applyAccept: false }).upload(screen.getByTestId('picker-input'), new File(['abc'], 'notes.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('1 file refused: notes.pdf.'))
    expect(screen.getByTestId('chosen')).toHaveTextContent('')
    expect(state.calls.some(call => call.path.endsWith('/media/uploads'))).toBe(false)
  })
})

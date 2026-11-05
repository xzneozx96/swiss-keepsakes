import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePinOptions } from '@/features/stories/hooks/use-pin-options'
import { uuid } from './stories-harness'
import { pinItem, renderWithStore, serveExtra, servePins, setUpStoryMedia, state, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpStoryMedia)

function Probe() {
  const { pins, isLoading, isError } = usePinOptions(storeId, 'en', { ids: [uuid(1), uuid(2), uuid(3)] })

  return <p data-testid="out">{JSON.stringify({ pins, isLoading, isError })}</p>
}

const out = () => JSON.parse(screen.getByTestId('out').textContent!) as { pins: { id: string, name: string, status: string, website: string | null }[], isLoading: boolean, isError: boolean }
const listCalls = () => state.calls.filter(call => call.method === 'GET' && call.path.split('?')[0] === `/api/store/${storeId}/pins/lookup`)

describe('[E4.3][AC45] pin options', () => {
  it('[E4.3][AC45] AC-4 the pins the story names are read once, by id, and mapped to options', async () => {
    servePins([
      pinItem(1, { title: { en: 'Zyt tower' }, outboundUrl: 'https://zyt.example/tower' }),
      pinItem(2, { title: { en: 'Lion' } }),
      pinItem(3, { title: { en: 'Draft pin' }, status: 'draft' }),
    ])
    renderWithStore(<Probe />)

    await waitFor(() => expect(out().pins).toHaveLength(3))
    const { pins } = out()

    expect(pins[0]).toMatchObject({ name: 'Zyt tower', status: 'published', website: 'https://zyt.example/tower' })
    expect(pins[2]).toMatchObject({ status: 'draft', website: null })
    expect(listCalls()).toHaveLength(1)
  })

  it('[E4.3][AC45] a failed read reports isError and an empty list', async () => {
    serveExtra(call => (call.path.split('?')[0] === `/api/store/${storeId}/pins/lookup` ? new Response('{}', { status: 500, headers: { 'content-type': 'application/problem+json' } }) : undefined))
    renderWithStore(<Probe />)

    await waitFor(() => expect(out().isError).toBe(true))
    expect(out().pins).toEqual([])
  })
})

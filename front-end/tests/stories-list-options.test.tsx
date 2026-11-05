import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useKeepsakeOptions } from '@/features/stories/hooks/use-keepsake-options'
import { useStoryOptions } from '@/features/stories/hooks/use-story-options'
import { listItem as keepsakeItem } from './keepsakes-harness'
import { publishedVersion, storyGroupDetail, listItem as storyItem, uuid } from './stories-harness'
import { serveLists } from './stories-lists-harness'
import { pinItem, renderWithStore, setUpStoryMedia, state, storeId } from './stories-media-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

beforeEach(setUpStoryMedia)

const detail = () => storyGroupDetail({})

function KeepsakeProbe({ language = 'en', ids = [uuid(1), uuid(2)] }: { language?: 'en' | 'de', ids?: string[] }) {
  const out = useKeepsakeOptions(storeId, language, ids)

  return <p data-testid="out">{JSON.stringify({ keepsakes: out.keepsakes, isLoading: out.isLoading, isError: out.isError })}</p>
}

function StoryProbe() {
  const out = useStoryOptions(storeId, 'en', [uuid(1)])

  return <p data-testid="out">{JSON.stringify({ stories: out.stories, isLoading: out.isLoading, isError: out.isError })}</p>
}

const out = <T,>() => JSON.parse(screen.getByTestId('out').textContent!) as T

describe('[E4.3][AC33][AC54] keepsake and story options', () => {
  it('[E4.3][AC54][ADR-033] keepsake options are read by id and carry the open language\'s name and a published flag', async () => {
    serveLists(detail(), { keepsakes: [
      keepsakeItem({ id: uuid(1), status: 'published', name: { en: 'Classic' } }),
      keepsakeItem({ id: uuid(2), status: 'draft', name: { de: 'Klassik' } }),
    ] })
    renderWithStore(<KeepsakeProbe language="de" />)

    await waitFor(() => expect(out<{ keepsakes: unknown[] }>().keepsakes).toHaveLength(2))
    expect(out<{ keepsakes: { name: string, published: boolean }[] }>().keepsakes).toMatchObject([{ name: 'Classic', published: true }, { name: 'Klassik', published: false }])
    // Never the whole list: one lookup of the named ids.
    expect(state.calls.filter(call => call.path.includes('/products')).map(call => call.path)).toEqual([`/api/store/${storeId}/products/lookup?ids=${uuid(1)}%2C${uuid(2)}`])
  })

  it('[ADR-033] no id, no read', async () => {
    serveLists(detail(), { keepsakes: [keepsakeItem({ id: uuid(1), status: 'published' })] })
    renderWithStore(<KeepsakeProbe ids={[]} />)

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(out<{ keepsakes: unknown[] }>().keepsakes).toEqual([])
    expect(state.calls.some(call => call.path.includes('/products'))).toBe(false)
  })

  it('[E4.3][AC33] story options carry both languages\' states', async () => {
    serveLists(detail(), { stories: [storyItem(1, { languages: { en: publishedVersion(), de: null } })] })
    renderWithStore(<StoryProbe />)

    await waitFor(() => expect(out<{ stories: unknown[] }>().stories).toHaveLength(1))
    expect(out<{ stories: { states: unknown }[] }>().stories[0]!.states).toEqual({ en: 'published', de: 'none' })
  })

  it('[E4.3][AC54] a failed keepsake list is isError with no options', async () => {
    const server = serveLists(detail(), { pins: [pinItem(1)] })

    server.lists.fail = 'products'
    renderWithStore(<KeepsakeProbe />)

    await waitFor(() => expect(out<{ isError: boolean }>().isError).toBe(true))
    expect(out<{ keepsakes: unknown[] }>().keepsakes).toEqual([])
  })

  it('[E4.3][AC54] while loading isLoading is true', async () => {
    const server = serveLists(detail(), {})

    server.lists.gate = new Promise<void>(() => {})
    renderWithStore(<KeepsakeProbe />)

    expect(out<{ isLoading: boolean }>().isLoading).toBe(true)
    await waitFor(() => expect(state.calls.some(call => call.path.startsWith(`/api/store/${storeId}/products/lookup`))).toBe(true))
  })
})

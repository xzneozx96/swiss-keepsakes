import type { StoryGroupDetail } from '@sk/api-contract'
import type { BodyHandover } from '@/features/stories/hooks/use-story-version-editor'

import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocaleProvider } from '@/contexts/locale-context'
import { DataClientProvider } from '@/features/data-client'
import { useStoryVersionEditor } from '@/features/stories/hooks/use-story-version-editor'
import { patches, problem, serveStory, setUpHarness, state, storeId, storyGroupDetail, storyVersion } from './stories-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

const AUTOSAVE = { timeout: 5000 }
const typed = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Typed.' }] }] } as never

beforeEach(setUpHarness)
afterEach(() => vi.restoreAllMocks())

function setUp() {
  const group = storyGroupDetail({ en: storyVersion('en') }) as unknown as StoryGroupDetail

  serveStory(group as never)

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>{children}</LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>
  )

  return renderHook(() => useStoryVersionEditor({ storeId, group, language: 'en', accountName: 'Anna Keller' }), { wrapper })
}

/** A body editor's stand-in: `handoff` hands over `typed` through the hook's `change`, once. */
function register(hook: ReturnType<typeof setUp>) {
  let pending = true
  const handover: BodyHandover = {
    handoff: vi.fn(() => {
      if (!pending)
        return
      pending = false
      hook.result.current.change({ body: typed })
    }),
    cancel: vi.fn(() => {
      pending = false
    }),
  }

  act(() => hook.result.current.registerHandover(handover))

  return handover
}

describe('[E4.3][AC45] the body hand-over in the version editor hook', () => {
  it('[E4.3][AC45] Review Focus 1: markDirty makes isUnsaved true at once, and the autosave PATCH goes 1.5 s later with the fields as they were', async () => {
    const hook = setUp()

    expect(hook.result.current.isUnsaved).toBe(false)
    act(() => hook.result.current.markDirty())
    expect(hook.result.current.isUnsaved).toBe(true)
    expect(patches()).toHaveLength(0)
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]).toMatchObject({ ifMatch: '3', body: { draft: { title: 'A morning on the Musegg wall' } } })
    expect((patches()[0]!.body as { draft: { body: { content: { content: { text: string }[] }[] } } }).draft.body.content[0]!.content[0]!.text).toBe('The body.')
  })

  it('[E4.3][AC45] flush runs the registered handoff before saving, so a body handed over inside flush is in the PATCH', async () => {
    const hook = setUp()
    const handover = register(hook)

    await act(() => hook.result.current.flush())
    expect(handover.handoff).toHaveBeenCalledTimes(1)
    expect(patches()).toHaveLength(1)
    expect(patches()[0]!.body).toMatchObject({ draft: { body: typed } })
  })

  it('[E4.3][AC45] discard cancels the registered hand-over and sends nothing', async () => {
    const hook = setUp()
    const handover = register(hook)

    act(() => hook.result.current.markDirty())
    act(() => hook.result.current.discard())
    expect(handover.cancel).toHaveBeenCalledTimes(1)
    await act(() => new Promise<void>(resolve => setTimeout(resolve, 1800)))
    expect(patches()).toHaveLength(0)
  })

  it('[E4.3][AC45] unmounting with a pending hand-over saves the handed-over body (handoff runs before dispose)', async () => {
    const hook = setUp()
    const handover = register(hook)

    hook.unmount()
    expect(handover.handoff).toHaveBeenCalled()
    await waitFor(() => expect(patches()).toHaveLength(1), AUTOSAVE)
    expect(patches()[0]!.body).toMatchObject({ draft: { body: typed } })
  })

  it('[E4.3][AC45] markDirty after a stale answer leaves the state stale and sends nothing', async () => {
    const hook = setUp()
    const server = state.answer

    state.answer = call => (call.method === 'PATCH' ? problem(412, 'precondition-failed') : server(call))
    act(() => hook.result.current.markDirty())
    await act(() => hook.result.current.flush())
    expect(hook.result.current.state).toBe('stale')
    expect(patches()).toHaveLength(1)

    act(() => hook.result.current.markDirty())
    expect(hook.result.current.state).toBe('stale')
    await act(() => new Promise<void>(resolve => setTimeout(resolve, 1800)))
    expect(patches()).toHaveLength(1)
  })
})

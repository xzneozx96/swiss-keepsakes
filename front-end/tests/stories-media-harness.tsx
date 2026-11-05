import type { ReactElement } from 'react'

import { mediaSchema } from '@sk/api-contract'
import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { LocaleProvider } from '@/contexts/locale-context'
import { ApiFeedbackBridge, DataClientProvider } from '@/features/data-client'
import { DemoProvider } from '@/features/demo'
import { item as mediaFile, page as mediaPage } from './media-harness'
import { media, problem, setUpHarness, state, storeId, uuid } from './stories-harness'
import { pinsAnswer } from './support/pages'

export { media, problem, state, storeId, uuid }
export { item as libraryItem, photoId, other as secondPhotoId } from './media-harness'

const served = { pins: [] as Record<string, unknown>[], files: [] as Record<string, unknown>[], extra: (_call: (typeof state.calls)[number]): Response | undefined => undefined }

/** One pin row as the merchant list returns it. */
export function pinItem(n: number, over: Record<string, unknown> = {}) {
  return { id: uuid(n), status: 'published', title: { en: `Pin ${n}` }, slug: null, located: true, categoryIds: [], hasDates: false, nextDate: null, stayTag: 'both', interests: [], coverMediaId: null, outboundUrl: null, cover: null, mainStory: null, rowVersion: 1, updatedAt: '2026-11-03T08:00:00.000Z', ...over }
}

export const readyCover = mediaSchema.parse(media)

function answer(call: (typeof state.calls)[number]): Response | undefined {
  const custom = served.extra(call)

  if (custom)
    return custom
  const pins = call.method === 'GET' ? pinsAnswer(served.pins as never, call.path, `/api/store/${storeId}`) : undefined

  if (pins)
    return Response.json(pins)
  if (call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media?`)) {
    const query = new URLSearchParams(call.path.split('?')[1])
    const kind = query.get('kind')
    const q = (query.get('q') ?? '').toLowerCase()
    const items = served.files.filter(file => (!kind || file.kind === kind) && (!q || String(file.name).toLowerCase().includes(q)))

    return Response.json(mediaPage(items))
  }
  if (call.method === 'GET' && call.path.startsWith(`/api/store/${storeId}/media/`)) {
    const id = call.path.split('/').at(-1)
    const file = served.files.find(candidate => candidate.id === id)

    if (file)
      return Response.json(file)
  }

  return undefined
}

/** Call in `beforeEach`: the stories harness, with no pins and no library files. */
export async function setUpStoryMedia() {
  served.pins = []
  served.files = []
  served.extra = () => undefined
  await setUpHarness()
  state.answer = answer
}

/** The merchant's pin list. */
export function servePins(items: Record<string, unknown>[]) {
  served.pins = items
}

/** The library: `file(...)` items, answered by the list and by id. */
export function serveMedia(items: Record<string, unknown>[]) {
  served.files = items
}

/** Answers first, so a test can refuse or record one call. */
export function serveExtra(extra: (call: (typeof state.calls)[number]) => Response | undefined) {
  served.extra = extra
}

export const file = mediaFile

export function renderWithStore(ui: ReactElement) {
  return render(
    <QueryClientProvider client={state.demo.queryClient}>
      <DataClientProvider client={state.demo.dataClient}>
        <LocaleProvider>
          <ApiFeedbackBridge feedback={state.demo.feedback} />
          <DemoProvider store={state.demo.store}>
            {ui}
          </DemoProvider>
        </LocaleProvider>
      </DataClientProvider>
    </QueryClientProvider>,
  )
}

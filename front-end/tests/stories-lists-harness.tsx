import { pinListSchema } from '@sk/api-contract'

import { list as keepsakeList } from './keepsakes-harness'
import { serveDetails } from './stories-details-harness'
import { storeId, storyList } from './stories-harness'

type Detail = Parameters<typeof serveDetails>[0]
type Rows = Record<string, unknown>[]
type Source = 'pins' | 'products' | 'story-groups'

const problemJson = () => new Response('{}', { status: 500, headers: { 'content-type': 'application/problem+json' } })

/**
 * `serveDetails` plus the three lists the linked cards read: the pins, the keepsakes (`products`) and the stories
 * (`story-groups`). `server.lists` is read at call time, so a test can reassign it. `lists.fail` makes one answer 500;
 * `lists.gate` holds every list answer until it resolves.
 */
export function serveLists(initial: Detail, rows: { pins?: Rows, keepsakes?: Rows, stories?: Rows }) {
  const lists = { pins: rows.pins ?? [], keepsakes: rows.keepsakes ?? [], stories: rows.stories ?? [], fail: undefined as Source | undefined, gate: undefined as Promise<void> | undefined }
  const base = `/api/store/${storeId}`
  const answer = (source: Source, body: () => unknown) => {
    if (lists.fail === source)
      return problemJson()
    const respond = () => Response.json(body())

    return lists.gate ? (lists.gate.then(respond) as never) : respond()
  }
  const server = Object.assign(serveDetails(initial, (call) => {
    if (call.method !== 'GET')
      return undefined
    if (call.path === `${base}/pins`)
      return answer('pins', () => pinListSchema.parse({ items: lists.pins }))
    if (call.path === `${base}/products`)
      return answer('products', () => keepsakeList(lists.keepsakes))
    if (call.path === `${base}/story-groups`)
      return answer('story-groups', () => storyList(lists.stories))

    return undefined
  }), { lists })

  return server
}

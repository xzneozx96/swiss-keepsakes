/* eslint-disable react-refresh/only-export-components -- a test helper, not a hot-reloaded module */
import type { StoryGroupDetail } from '@sk/api-contract'
import type { ReactNode } from 'react'

import { pinListSchema } from '@sk/api-contract'

import { useStoryGroup } from '@/features/stories/api/queries'
import { DetailsPanel, useDetailsPanel } from '@/features/stories/components/story-details-panel'
import { useStoryGroupEditor } from '@/features/stories/hooks/use-story-group-editor'
import { list as keepsakeList } from './keepsakes-harness'
import { serveDetails } from './stories-details-harness'
import { groupId, storeId, storyList } from './stories-harness'
import { renderWithStore } from './stories-media-harness'

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

function Panel({ group, children }: { group: StoryGroupDetail, children: (editor: ReturnType<typeof useStoryGroupEditor>) => ReactNode }) {
  const editor = useStoryGroupEditor({ storeId, group })
  const panel = useDetailsPanel({ blocking: [], warnings: [] })

  return <DetailsPanel panel={panel}>{children(editor)}</DetailsPanel>
}

function Host({ children }: { children: (editor: ReturnType<typeof useStoryGroupEditor>) => ReactNode }) {
  const group = useStoryGroup(storeId, groupId).data

  return group ? <Panel group={group}>{children}</Panel> : null
}

/**
 * One Details card on its own, inside the real panel and the real group autosave: `card` gets the editor (`editor.group`,
 * `editor.change`). The group is read from the server the harness serves, so a reload is a second render.
 */
export const renderLinkedCard = (card: (editor: ReturnType<typeof useStoryGroupEditor>) => ReactNode) => renderWithStore(<Host>{card}</Host>)

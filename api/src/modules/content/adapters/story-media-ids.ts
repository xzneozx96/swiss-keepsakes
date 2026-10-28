import type { StoredStoryDoc } from '../read-ports.ts'
import { STORY_BODY_LIMITS } from '@sk/domain/content'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The media ids a stored story document points at, lowercased: the cover and every image or audio node of the body.
// The JSON is not trusted: a body that is no document, a node that is no object and a value that is no uuid are
// skipped, so nothing odd reaches the query. Nodes below the write depth limit are not read.
export function publishedStoryMediaIds(doc: StoredStoryDoc): string[] {
  const ids = new Set<string>()
  const add = (value: unknown) => {
    if (typeof value === 'string' && uuidPattern.test(value))
      ids.add(value.toLowerCase())
  }
  add(doc?.coverMediaId)
  const body = doc?.body
  const walk = (nodes: unknown, depth: number) => {
    if (!Array.isArray(nodes) || depth > STORY_BODY_LIMITS.maxDepth)
      return
    for (const node of nodes) {
      if (typeof node !== 'object' || node === null)
        continue
      const { type, attrs, content } = node as { type?: unknown, attrs?: { mediaId?: unknown } | null, content?: unknown }
      if (type === 'image' || type === 'audio')
        add(attrs?.mediaId)
      walk(content, depth + 1)
    }
  }
  if (typeof body === 'object' && body !== null)
    walk((body as { content?: unknown }).content, 2)
  return [...ids]
}

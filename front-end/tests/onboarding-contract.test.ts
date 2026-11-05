import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** The front-end package root, whatever directory Vitest runs from. */
const FRONT_END = join(import.meta.dirname, '..')

interface Schema {
  $ref?: string
  properties?: Record<string, Schema>
  items?: Schema
  allOf?: Schema[]
  anyOf?: Schema[]
  oneOf?: Schema[]
  additionalProperties?: Schema | boolean
}

interface Operation {
  parameters?: { name: string, in: string }[]
  requestBody?: { content?: Record<string, { schema?: Schema }> }
}

const document = JSON.parse(readFileSync(join(FRONT_END, '../packages/api-contract/generated/openapi.json'), 'utf8')) as {
  paths: Record<string, Record<string, Operation>>
  components: { schemas: Record<string, Schema> }
}

const ANSWER_NAMES = ['segment', 'interests']

/** Every property name a request body can carry, following references, with the schema each one sits in. */
function bodyNames(schema: Schema | undefined, seen = new Set<string>(), owner = ''): { name: string, owner: string }[] {
  if (!schema)
    return []

  if (schema.$ref) {
    const name = schema.$ref.split('/').pop() ?? ''

    if (seen.has(name))
      return []

    return bodyNames(document.components.schemas[name], new Set([...seen, name]), name)
  }

  return [
    ...Object.entries(schema.properties ?? {}).flatMap(([name, child]) => [{ name, owner }, ...bodyNames(child, seen, owner)]),
    ...bodyNames(schema.items, seen, owner),
    ...[...(schema.allOf ?? []), ...(schema.anyOf ?? []), ...(schema.oneOf ?? [])].flatMap(child => bodyNames(child, seen, owner)),
    ...(typeof schema.additionalProperties === 'object' ? bodyNames(schema.additionalProperties, seen, owner) : []),
  ]
}

/**
 * Merchant-authored content tags, not a visitor's answers: a pin, a story group or a tour guide is tagged with the interests
 * it suits (ADR-006 ranks by them in the browser). Only these four request bodies may carry `interests`; `segment` has no exception.
 * The document has no analytics route (ADR-032 sends events to PostHog from the browser), so none is exempt.
 */
const CONTENT_TAG_BODIES = ['PinWriteBody', 'StoryGroupCreateBody', 'StoryGroupSaveBody', 'TourGuideWriteBody']

function hits() {
  return Object.entries(document.paths).flatMap(([path, methods]) => Object.entries(methods).flatMap(([method, operation]) => [
    ...(operation.parameters ?? []).filter(p => ANSWER_NAMES.includes(p.name.toLowerCase())).map(p => ({ route: `${method} ${path}`, where: p.in, name: p.name, owner: '' })),
    ...Object.values(operation.requestBody?.content ?? {}).flatMap(media => bodyNames(media.schema).filter(({ name }) => ANSWER_NAMES.includes(name)).map(({ name, owner }) => ({ route: `${method} ${path}`, where: 'body', name, owner }))),
  ]))
}

describe('[E4.5][AC37] the guest answers never reach the API', () => {
  it('[E4.5][AC37] no route takes a parameter, query, header or cookie named segment or interests', () => {
    expect(hits().filter(hit => hit.where !== 'body')).toEqual([])
  })

  it('[E4.5][AC37] no request body carries segment, and only the content-tag bodies carry interests', () => {
    const body = hits().filter(hit => hit.where === 'body')

    expect(body.filter(hit => hit.name === 'segment')).toEqual([])
    expect([...new Set(body.filter(hit => hit.name === 'interests' && !CONTENT_TAG_BODIES.includes(hit.owner)).map(hit => `${hit.route} (${hit.owner})`))]).toEqual([])
  })

  it('[E4.5][AC37] the exempt bodies exist, so the exemption is not stale', () => {
    for (const name of CONTENT_TAG_BODIES)
      expect(document.components.schemas[name]?.properties?.interests, name).toBeDefined()
    // The walk finds them, so it would find a visitor-answer field in any other body.
    expect([...new Set(hits().filter(hit => hit.name === 'interests').map(hit => hit.owner))].sort()).toEqual([...CONTENT_TAG_BODIES].sort())
  })

  it('[E4.5][AC37] the onboarding source makes no request: no fetch, no api client, no data client', () => {
    const root = join(FRONT_END, 'src/features/onboarding/')
    const files = (readdirSync(root, { recursive: true }) as string[]).filter(file => /\.tsx?$/.test(file))
    const offenders = files.flatMap(file => ['fetch(', 'apiClient', 'data-client', 'api-client'].filter(word => readFileSync(root + file, 'utf8').includes(word)).map(word => `${file}: ${word}`))

    expect(files.length).toBeGreaterThan(5)
    expect(offenders).toEqual([])
  })
})

/**
 * `interest` (singular) is a tapped interest tile, allowed on one route only (owner, 05.11.2026, ADR-006 amendment). It is never
 * built from the saved answers, which `interests` and `segment` above guard on every route.
 */
const TILE_ROUTE = 'get /api/public/search'

describe('[ADR-006] interest is allowed on the search route only, and never from the saved answers', () => {
  const carriers = () => Object.entries(document.paths).flatMap(([path, methods]) => Object.entries(methods).flatMap(([method, operation]) => [
    ...(operation.parameters ?? []).filter(p => p.name.toLowerCase() === 'interest').map(p => `${method} ${path} (${p.in})`),
    ...Object.values(operation.requestBody?.content ?? {}).flatMap(media => bodyNames(media.schema).filter(({ name }) => name === 'interest').map(() => `${method} ${path} (body)`)),
  ]))

  it('no other route takes interest in a query, header, cookie or body', () => {
    expect(carriers().filter(carrier => !carrier.startsWith(TILE_ROUTE))).toEqual([])
  })

  it('the exemption is not stale: the search route takes it as a query parameter', () => {
    expect(carriers()).toEqual([`${TILE_ROUTE} (query)`])
  })

  it('the search feature never reads the onboarding store, so the saved answers cannot reach the request', () => {
    const root = join(FRONT_END, 'src/features/search/')
    const files = (readdirSync(root, { recursive: true }) as string[]).filter(file => /\.tsx?$/.test(file))
    const offenders = files.filter(file => /features\/onboarding|sk\.onboarding|useOnboarding/.test(readFileSync(root + file, 'utf8')))

    expect(files.length).toBeGreaterThan(3)
    expect(offenders).toEqual([])
  })
})

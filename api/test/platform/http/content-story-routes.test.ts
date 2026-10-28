import type { Access } from '@sk/domain/identity'
import type { ContentUseCases } from '../../../src/modules/content/adapters/routes.ts'
import { describe, expect, it } from 'vitest'
import { registerContentRoutes } from '../../../src/modules/content/adapters/routes.ts'
import { createFakeContentUseCases, fakeStoryGroup, fakeStoryVersion } from '../../support/fake-content-use-cases.ts'
import { createGuardedApp, guardedCommands, noAccess, shopOrigin, signedInAs } from '../../support/guarded-app.ts'

const lucerne = '0190f0c2-0000-7000-8000-00000000000a'
const zug = '0190f0c2-0000-7000-8000-00000000000b'
const groupId = fakeStoryGroup.id
const otherGroupId = '0190f0c2-0000-7000-8000-0000000000b2'

const people: Record<string, Access> = {
  owner: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'owner' }] },
  manager: { platformAdmin: false, memberships: [{ storeId: lucerne, role: 'manager' }] },
  ownerElsewhere: { platformAdmin: false, memberships: [{ storeId: zug, role: 'owner' }] },
  guest: noAccess,
}

function setup(overrides: Partial<ContentUseCases> = {}) {
  const useCases = { ...createFakeContentUseCases(), ...overrides }
  const { app } = createGuardedApp(people, undefined, { ...guardedCommands, routes: [routes => registerContentRoutes(routes, useCases)] })
  return app
}

const groups = `/api/store/${lucerne}/story-groups`
const group = `${groups}/${groupId}`
const versions = `${group}/versions`
const english = `${versions}/en`

function send(app: ReturnType<typeof setup>, method: string, path: string, headers: Record<string, string> = {}, body?: object) {
  return app.request(path, {
    method,
    headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', ...signedInAs('owner'), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const draft = { title: 'A day on the lake', excerpt: '', intro: '', authorName: '', authorRole: '', readMinutes: null, coverMediaId: null, sections: [] }

describe('[E2.6] the story version save: If-Match, ETag and rowVersion', () => {
  it('[E2.6] AC-1 a story version PATCH with a stale If-Match is 412 and with none is 428', async () => {
    let calls = 0
    const app = setup({ saveStoryVersion: async (_actor, _storeId, _groupId, _language, ifMatch) => {
      calls++
      return ifMatch === 2 ? { ok: false, reason: 'stale' } : { ok: true, value: { ...fakeStoryVersion, rowVersion: ifMatch + 1 } }
    } })

    const stale = await send(app, 'PATCH', english, { 'If-Match': '2' }, { draft })
    const none = await send(app, 'PATCH', english, {}, { draft })
    const fresh = await send(app, 'PATCH', english, { 'If-Match': '3' }, { draft })

    expect(stale.status).toBe(412)
    expect(stale.headers.get('Content-Type')).toBe('application/problem+json')
    expect(await stale.json()).toMatchObject({ type: 'precondition-failed' })
    expect(none.status).toBe(428)
    expect(await none.json()).toMatchObject({ type: 'precondition-required' })
    expect(calls).toBe(1 + 1)
    expect(fresh.status).toBe(200)
    expect(fresh.headers.get('ETag')).toBe('"4"')
    expect(await fresh.json()).toMatchObject({ groupId, language: 'en', rowVersion: 4, createdAt: '2026-10-27T08:00:00.000Z', publishedAt: null })
  })

  it('[E2.6] the use case gets the store from the verified path, the language and the changes', async () => {
    const seen: unknown[] = []
    const app = setup({ saveStoryVersion: async (actor, storeId, id, language, ifMatch, changes, requestId) => {
      seen.push({ kind: actor.kind, storeId, id, language, ifMatch, changes, requestId: typeof requestId })
      return { ok: true, value: fakeStoryVersion }
    } })

    await send(app, 'PATCH', `${versions}/de`, { 'If-Match': '"3"' }, { slug: 'ein-tag', draft })

    expect(seen).toEqual([{ kind: 'staff', storeId: lucerne, id: groupId, language: 'de', ifMatch: 3, changes: { slug: 'ein-tag', draft }, requestId: 'string' }])
  })

  it.each(['abc', '*', '0'])('[E2.6] If-Match: %s answers 400 and the use case is not called', async (header) => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: false, reason: 'stale' } as const
    }
    const app = setup({ saveStoryGroup: count, saveStoryVersion: count, publishStoryVersion: count, unpublishStoryVersion: count, moveStoryVersion: count })

    for (const [method, path, body] of [['PATCH', group, {}], ['PATCH', english, {}], ['POST', `${english}/publish`], ['POST', `${english}/unpublish`], ['POST', `${english}/move`, { targetGroupId: otherGroupId }]] as const) {
      const response = await send(app, method, path, { 'If-Match': header }, body)
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ type: 'validation-failed', errors: [{ in: 'header', path: 'If-Match' }] })
    }
    expect(calls).toBe(0)
  })

  it.each([
    ['PATCH', group, {}],
    ['PATCH', english, {}],
    ['POST', `${english}/publish`, undefined],
    ['POST', `${english}/unpublish`, undefined],
    ['POST', `${english}/move`, { targetGroupId: otherGroupId }],
  ] as const)('[E2.6] AC-1 %s %s with no If-Match answers 428 and the use case is not called', async (method, path, body) => {
    let calls = 0
    const count = async () => {
      calls++
      return { ok: false, reason: 'stale' } as const
    }
    const app = setup({ saveStoryGroup: count, saveStoryVersion: count, publishStoryVersion: count, unpublishStoryVersion: count, moveStoryVersion: count })

    const response = await send(app, method, path, {}, body)

    expect(response.status).toBe(428)
    expect(calls).toBe(0)
  })

  it('[E2.6] a group id or a language that is not valid answers 400, not 404 or 500', async () => {
    const app = setup()

    expect((await send(app, 'PATCH', `${groups}/not-a-uuid`, { 'If-Match': '1' }, {})).status).toBe(400)
    expect((await send(app, 'PATCH', `${versions}/fr`, { 'If-Match': '1' }, {})).status).toBe(400)
    expect((await send(app, 'DELETE', `${versions}/fr`)).status).toBe(400)
    expect((await send(app, 'POST', `${versions}/en/move`, { 'If-Match': '1' }, { targetGroupId: 'nope' })).status).toBe(400)
  })
})

describe('[E2.6] the story write routes', () => {
  it('[E2.6] creating a group answers 201 with the group, ETag "1" and the kind and subject place passed on', async () => {
    const seen: unknown[] = []
    const app = setup({ createStoryGroup: async (_actor, storeId, input) => {
      seen.push(input)
      return { ok: true, value: { ...fakeStoryGroup, storeId, kind: input.kind, subjectPlaceId: input.subjectPlaceId } }
    } })

    const story = await send(app, 'POST', groups, {}, { interests: ['food-drink'] })
    const review = await send(app, 'POST', groups, {}, { kind: 'editorial_review', subjectPlaceId: otherGroupId })

    expect(story.status).toBe(201)
    expect(story.headers.get('ETag')).toBe('"1"')
    expect(await story.json()).toMatchObject({ storeId: lucerne, kind: 'story', rowVersion: 1, createdAt: '2026-10-27T08:00:00.000Z' })
    expect(review.status).toBe(201)
    expect(seen).toEqual([{ kind: 'story', subjectPlaceId: null, interests: ['food-drink'] }, { kind: 'editorial_review', subjectPlaceId: otherGroupId }])
  })

  it.each([{ kind: 'editorial_review' }, { subjectPlaceId: otherGroupId }, { price: 1 }, { type: 'x' }])('[E2.6] a group create body %j answers 400', async (body) => {
    expect((await send(setup(), 'POST', groups, {}, body)).status).toBe(400)
  })

  it('[E2.6] saving a group answers 200 with ETag and the list replaced', async () => {
    const response = await send(setup(), 'PATCH', group, { 'If-Match': '1' }, { relatedGroupIds: [otherGroupId] })

    expect(response.status).toBe(200)
    expect(response.headers.get('ETag')).toBe('"2"')
    expect(await response.json()).toMatchObject({ id: groupId, relatedGroupIds: [otherGroupId], rowVersion: 2 })
  })

  it('[E2.6] creating a version answers 201 with the version and ETag "1", and a second one in the language answers 409 version-exists', async () => {
    const app = setup({ createStoryVersion: async (_actor, storeId, id, language, changes) => language === 'de'
      ? { ok: false, reason: 'version-exists' }
      : { ok: true, value: { ...fakeStoryVersion, storeId, groupId: id, language, slug: changes.slug ?? null, draft: changes.draft ?? null } } })

    const created = await send(app, 'POST', versions, {}, { language: 'en', slug: 'a-day', draft })
    const second = await send(app, 'POST', versions, {}, { language: 'de' })

    expect(created.status).toBe(201)
    expect(created.headers.get('ETag')).toBe('"1"')
    expect(await created.json()).toMatchObject({ groupId, language: 'en', slug: 'a-day', draft: { title: 'A day on the lake' }, published: null })
    expect(second.status).toBe(409)
    expect(await second.json()).toMatchObject({ type: 'version-exists' })
  })

  it.each([{}, { language: 'fr' }, { language: 'en', price: 1 }, { language: 'en', slug: 'Not A Slug' }])('[E2.6] a version create body %j answers 400', async (body) => {
    expect((await send(setup(), 'POST', versions, {}, body)).status).toBe(400)
  })

  it('[E2.6][AC30] publishing the EN version answers 200 with status published', async () => {
    const seen: unknown[] = []
    const app = setup({ publishStoryVersion: async (_actor, storeId, id, language, ifMatch) => {
      seen.push({ storeId, id, language, ifMatch })
      return { ok: true, value: { ...fakeStoryVersion, status: 'published', rowVersion: ifMatch + 1 } }
    } })

    const response = await send(app, 'POST', `${english}/publish`, { 'If-Match': '1' })

    expect(response.status).toBe(200)
    expect(response.headers.get('ETag')).toBe('"2"')
    expect(await response.json()).toMatchObject({ language: 'en', status: 'published', rowVersion: 2 })
    expect(seen).toEqual([{ storeId: lucerne, id: groupId, language: 'en', ifMatch: 1 }])
  })

  it('[E2.6] a publish that lacks a slug answers 422 publish-incomplete naming slug', async () => {
    const app = setup({ publishStoryVersion: async () => ({ ok: false, reason: 'incomplete', gaps: ['slug'] }) })

    const response = await send(app, 'POST', `${english}/publish`, { 'If-Match': '1' })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'publish-incomplete', errors: [{ in: 'body', path: 'slug' }] })
  })

  it('[E2.6] unpublish answers 200 with status draft, and 409 not-published for a draft', async () => {
    const app = setup({ unpublishStoryVersion: async (_actor, _storeId, _id, _language, ifMatch) => ifMatch === 1
      ? { ok: false, reason: 'not-published' }
      : { ok: true, value: { ...fakeStoryVersion, rowVersion: ifMatch + 1 } } })

    const ok = await send(app, 'POST', `${english}/unpublish`, { 'If-Match': '2' })
    const refused = await send(app, 'POST', `${english}/unpublish`, { 'If-Match': '1' })

    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({ status: 'draft', rowVersion: 3 })
    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'not-published' })
  })

  it('[E2.6] moving a version answers 200 with the target group, and the use case gets the target', async () => {
    const seen: unknown[] = []
    const app = setup({ moveStoryVersion: async (_actor, storeId, id, language, ifMatch, targetGroupId) => {
      seen.push({ storeId, id, language, ifMatch, targetGroupId })
      return { ok: true, value: { ...fakeStoryVersion, groupId: targetGroupId, rowVersion: ifMatch + 1 } }
    } })

    const response = await send(app, 'POST', `${english}/move`, { 'If-Match': '1' }, { targetGroupId: otherGroupId })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ groupId: otherGroupId, rowVersion: 2 })
    expect(seen).toEqual([{ storeId: lucerne, id: groupId, language: 'en', ifMatch: 1, targetGroupId: otherGroupId }])
  })

  it('[E2.6][AC30] moving a published version answers 409 published-version-cannot-move', async () => {
    const app = setup({ moveStoryVersion: async () => ({ ok: false, reason: 'published-cannot-move' }) })

    const response = await send(app, 'POST', `${english}/move`, { 'If-Match': '1' }, { targetGroupId: otherGroupId })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ type: 'published-version-cannot-move' })
  })

  it.each([{}, { targetGroupId: otherGroupId, price: 1 }])('[E2.6] a move body %j answers 400', async (body) => {
    expect((await send(setup(), 'POST', `${english}/move`, { 'If-Match': '1' }, body)).status).toBe(400)
  })

  it('[E2.6][AC79] DELETE of a published version answers 409, and a draft one 204 with no body and no If-Match', async () => {
    const app = setup({ deleteStoryVersion: async (_actor, _storeId, id, language) => language === 'de'
      ? { ok: false, reason: 'published-cannot-be-deleted' }
      : { ok: true, value: { groupId: id, language } } })

    const refused = await send(app, 'DELETE', `${versions}/de`)
    const removed = await send(app, 'DELETE', english)

    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ type: 'published-cannot-be-deleted' })
    expect(removed.status).toBe(204)
    expect(await removed.text()).toBe('')
  })

  it('[E2.6] AC-6 a retired cover answers 422 media-retired and the draft is unchanged', async () => {
    const saved: unknown[] = []
    const app = setup({ saveStoryVersion: async (_actor, _storeId, _id, _language, _ifMatch, changes) => {
      // The use case checks the media before it writes; a retired cover refuses with nothing saved.
      if (changes.draft?.coverMediaId === otherGroupId)
        return { ok: false, reason: 'media-retired' }
      saved.push(changes)
      return { ok: true, value: fakeStoryVersion }
    } })

    const response = await send(app, 'PATCH', english, { 'If-Match': '1' }, { draft: { ...draft, coverMediaId: otherGroupId } })

    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ type: 'media-retired' })
    expect(saved).toEqual([])
  })

  it('[E2.6] a use case that finds no group answers 404 not-found', async () => {
    const app = setup({ publishStoryVersion: async () => ({ ok: false, reason: 'not-found' }) })

    const response = await send(app, 'POST', `${english}/publish`, { 'If-Match': '1' })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ type: 'not-found' })
  })
})

describe('[E2.6] AC-7 who may write stories', () => {
  const routes = [
    ['POST', groups, {}],
    ['PATCH', group, {}],
    ['POST', versions, { language: 'en' }],
    ['PATCH', english, {}],
    ['POST', `${english}/publish`, undefined],
    ['POST', `${english}/unpublish`, undefined],
    ['POST', `${english}/move`, { targetGroupId: otherGroupId }],
    ['DELETE', english, undefined],
  ] as const

  it.each(routes)('[E2.6] AC-7 the other store\'s owner, a guest and an anonymous caller get 403, 403 and 401 on %s %s', async (method, path, body) => {
    const calls: string[] = []
    const track = (name: string) => async () => {
      calls.push(name)
      return { ok: false, reason: 'not-found' } as const
    }
    const app = setup({
      createStoryGroup: track('createGroup'),
      saveStoryGroup: track('saveGroup'),
      createStoryVersion: track('createVersion'),
      saveStoryVersion: track('saveVersion'),
      publishStoryVersion: track('publish'),
      unpublishStoryVersion: track('unpublish'),
      moveStoryVersion: track('move'),
      deleteStoryVersion: track('delete'),
    })
    const as = (who: Record<string, string>) => app.request(path, { method, headers: { 'Origin': shopOrigin, 'Content-Type': 'application/json', 'If-Match': '1', ...who }, body: body ? JSON.stringify(body) : undefined })

    expect((await as(signedInAs('ownerElsewhere'))).status).toBe(403)
    expect((await as(signedInAs('guest'))).status).toBe(403)
    expect((await as({})).status).toBe(401)
    expect(calls).toEqual([])
  })

  it.each(['owner', 'manager'])('[E2.6] AC-7 the %s of the store reaches the use case', async (who) => {
    const response = await send(setup(), 'POST', groups, signedInAs(who), {})

    expect(response.status).toBe(201)
  })
})

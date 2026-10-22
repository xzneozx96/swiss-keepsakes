import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Actor, StoreLanguage } from '@sk/domain/identity'
import type { MiddlewareHandler } from 'hono'
import type { AppEnv } from '../../../platform/http/app.ts'
import type { AcceptInvitationResult } from '../application/accept-invitation.ts'
import type { CreateStoreInput, CreateStoreResult } from '../application/create-store.ts'
import type { OnboardingView } from '../application/get-onboarding.ts'
import type { InviteManagerResult } from '../application/invite-manager.ts'
import type { ListMembersResult } from '../application/list-members.ts'
import type { StorePage } from '../application/list-stores.ts'
import type { OpenStoreForSaleResult } from '../application/open-store-for-sale.ts'
import type { RemoveMemberResult } from '../application/remove-member.ts'
import type { ResendManagerInvitationResult } from '../application/resend-manager-invitation.ts'
import type { ResendOwnerInvitationResult } from '../application/resend-owner-invitation.ts'
import type { RevokeInvitationResult } from '../application/revoke-invitation.ts'
import type { UpdateStoreInformationResult } from '../application/update-store-information.ts'
import { createRoute, z } from '@hono/zod-openapi'
import { acceptedInvitationSchema, acceptInvitationBodySchema, adminStoreListQuerySchema, adminStoreListSchema, adminStoreSchema, createStoreBodySchema, inviteManagerBodySchema, memberInvitationSchema, membersSchema, onboardingSchema, resendManagerInvitationBodySchema, resendOwnerInvitationBodySchema, storeInformationBodySchema, storeSchema } from '@sk/api-contract'
import { problem } from '../../../platform/http/problem.ts'
import { problemResponses, requestIdHeader } from '../../../platform/http/responses.ts'

// What the routes call. main.ts builds each from the module's use cases.
export interface IdentityUseCases {
  createStore: (actor: { userId: string }, input: CreateStoreInput, requestId: string | null) => Promise<CreateStoreResult>
  listStores: (page: { limit: number, cursor?: string | undefined }) => Promise<StorePage>
  resendOwnerInvitation: (actor: { userId: string }, storeId: string, language: StoreLanguage | undefined, requestId: string | null) => Promise<ResendOwnerInvitationResult>
  acceptInvitation: (actor: { userId: string }, token: string, requestId: string | null) => Promise<AcceptInvitationResult>
  getOnboarding: (storeId: string) => Promise<OnboardingView | undefined>
  updateStoreInformation: (actor: Actor, storeId: string, changes: { name?: string, defaultLanguage?: StoreLanguage }, requestId: string | null) => Promise<UpdateStoreInformationResult>
  openStoreForSale: (actor: Actor, storeId: string, requestId: string | null) => Promise<OpenStoreForSaleResult>
  listMembers: (actor: Actor, storeId: string) => Promise<ListMembersResult>
  inviteManager: (actor: Actor, storeId: string, input: { email: string, language?: StoreLanguage | undefined }, requestId: string | null) => Promise<InviteManagerResult>
  resendManagerInvitation: (actor: Actor, storeId: string, invitationId: string, language: StoreLanguage | undefined, requestId: string | null) => Promise<ResendManagerInvitationResult>
  revokeInvitation: (actor: Actor, storeId: string, invitationId: string, requestId: string | null) => Promise<RevokeInvitationResult>
  removeMember: (actor: Actor, storeId: string, memberId: string, requestId: string | null) => Promise<RemoveMemberResult>
}

const json = <S extends z.ZodType>(schema: S) => ({ 'application/json': { schema } })

const createStoreRoute = createRoute({
  method: 'post',
  path: '/api/admin/stores',
  request: { body: { required: true, content: json(createStoreBodySchema) } },
  responses: {
    201: { description: 'The store, as `invited`, with its Owner invitation. The N20 mail is queued', headers: requestIdHeader, content: json(adminStoreSchema) },
    ...problemResponses,
  },
})

const listStoresRoute = createRoute({
  method: 'get',
  path: '/api/admin/stores',
  request: { query: adminStoreListQuerySchema },
  responses: {
    200: { description: 'A page of stores, newest first', headers: requestIdHeader, content: json(adminStoreListSchema) },
    ...problemResponses,
  },
})

// The resend body is optional. A client that sets the JSON Content-Type and sends nothing is sent on as one
// that set no Content-Type, which the validator lets through, instead of a 400 for an empty JSON document.
const acceptEmptyBody: MiddlewareHandler = async (c, next) => {
  if (c.req.header('Content-Type') !== undefined && (await c.req.arrayBuffer()).byteLength === 0) {
    const headers = new Headers(c.req.raw.headers)
    headers.delete('Content-Type')
    // The body is read already, and a Request cannot be built from one that was, so build it from the parts.
    c.req.raw = new Request(c.req.url, { method: c.req.method, headers })
  }
  await next()
}

const resendRoute = createRoute({
  method: 'post',
  path: '/api/admin/stores/{id}/owner-invitation/resend',
  middleware: [acceptEmptyBody],
  request: {
    params: z.object({ id: z.uuid() }),
    body: { required: false, content: json(resendOwnerInvitationBodySchema) },
  },
  responses: {
    200: { description: 'The store. Its Owner invitation lives 7 more days and only the new mail\'s link works', headers: requestIdHeader, content: json(adminStoreSchema) },
    ...problemResponses,
  },
})

const acceptRoute = createRoute({
  method: 'post',
  path: '/api/me/invitations/accept',
  request: { body: { required: true, content: json(acceptInvitationBodySchema) } },
  responses: {
    200: { description: 'The signed-in user now belongs to the store', headers: requestIdHeader, content: json(acceptedInvitationSchema) },
    ...problemResponses,
  },
})

const onboardingRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/onboarding',
  request: { params: z.object({ storeId: z.uuid() }) },
  responses: {
    200: { description: 'The store and the four conditions for opening it for sale', headers: requestIdHeader, content: json(onboardingSchema) },
    ...problemResponses,
  },
})

const informationRoute = createRoute({
  method: 'patch',
  path: '/api/store/{storeId}/information',
  request: {
    params: z.object({ storeId: z.uuid() }),
    body: { required: true, content: json(storeInformationBodySchema) },
  },
  responses: {
    200: { description: 'The store with its new information', headers: requestIdHeader, content: json(storeSchema) },
    ...problemResponses,
  },
})

const openRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/open-for-sale',
  request: { params: z.object({ storeId: z.uuid() }) },
  responses: {
    200: { description: 'The store is live', headers: requestIdHeader, content: json(storeSchema) },
    ...problemResponses,
  },
})

const membersRoute = createRoute({
  method: 'get',
  path: '/api/store/{storeId}/members',
  request: { params: z.object({ storeId: z.uuid() }) },
  responses: {
    200: { description: 'The store\'s members and its pending Store Manager invitations. Owner only', headers: requestIdHeader, content: json(membersSchema) },
    ...problemResponses,
  },
})

const inviteManagerRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/member-invitations',
  request: {
    params: z.object({ storeId: z.uuid() }),
    body: { required: true, content: json(inviteManagerBodySchema) },
  },
  responses: {
    201: { description: 'The Store Manager invitation. The N18 mail is queued', headers: requestIdHeader, content: json(memberInvitationSchema) },
    ...problemResponses,
  },
})

const resendManagerRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/member-invitations/{invitationId}/resend',
  middleware: [acceptEmptyBody],
  request: {
    params: z.object({ storeId: z.uuid(), invitationId: z.uuid() }),
    body: { required: false, content: json(resendManagerInvitationBodySchema) },
  },
  responses: {
    200: { description: 'The invitation lives 7 more days and only the new mail\'s link works', headers: requestIdHeader, content: json(memberInvitationSchema) },
    ...problemResponses,
  },
})

const revokeInvitationRoute = createRoute({
  method: 'post',
  path: '/api/store/{storeId}/member-invitations/{invitationId}/revoke',
  request: { params: z.object({ storeId: z.uuid(), invitationId: z.uuid() }) },
  responses: {
    200: { description: 'The invitation is revoked and its link stops working at once', headers: requestIdHeader, content: json(memberInvitationSchema) },
    ...problemResponses,
  },
})

const removeMemberRoute = createRoute({
  method: 'delete',
  path: '/api/store/{storeId}/members/{memberId}',
  request: { params: z.object({ storeId: z.uuid(), memberId: z.uuid() }) },
  responses: {
    204: { description: 'The Store Manager no longer belongs to the store. Their next request is refused', headers: requestIdHeader },
    ...problemResponses,
  },
})

const membersForbidden = { type: 'forbidden', status: 403, title: 'Only the Owner may manage the store\'s members' } as const

// Every actor but `anonymous` has a user id, and the guard of the route has already refused an anonymous one.
function signedIn(actor: Actor): { userId: string } {
  if (actor.kind === 'anonymous')
    throw new Error('A guarded route ran without a signed-in actor')
  return { userId: actor.userId }
}

// The Super Admin's routes sit under /api/admin/*, the accept route under /api/me/*, and the Owner's under
// /api/store/{storeId}/*. createApp guards each prefix before any of these runs.
export function registerIdentityRoutes(app: OpenAPIHono<AppEnv>, useCases: IdentityUseCases): void {
  app.openapi(createStoreRoute, async (c) => {
    const body = c.req.valid('json')
    const result = await useCases.createStore(signedIn(c.get('actor')), body, c.get('requestId'))
    if (!result.ok) {
      return problem(c, result.reason === 'slug-taken'
        ? { type: 'store-slug-taken', status: 409, title: 'Another store already has this slug' }
        : { type: 'owner-is-super-admin', status: 409, title: 'This email belongs to a Super Admin, who cannot own a store. Use another email address' })
    }
    return c.json(result.store, 201)
  })

  app.openapi(listStoresRoute, async (c) => {
    return c.json(await useCases.listStores(c.req.valid('query')), 200)
  })

  app.openapi(resendRoute, async (c) => {
    const body = c.req.valid('json')
    const result = await useCases.resendOwnerInvitation(signedIn(c.get('actor')), c.req.valid('param').id, body?.language, c.get('requestId'))
    if (result.ok)
      return c.json(result.store, 200)
    switch (result.reason) {
      case 'store-not-found':
        return problem(c, { type: 'not-found', status: 404, title: 'There is no such store' })
      case 'invitation-not-found':
        return problem(c, { type: 'invitation-not-found', status: 404, title: 'The store has no Owner invitation' })
      case 'invitation-already-accepted':
        return problem(c, { type: 'invitation-already-accepted', status: 409, title: 'The Owner has already accepted the invitation' })
      case 'invitation-revoked':
        return problem(c, { type: 'invitation-revoked', status: 409, title: 'The Owner invitation was revoked and cannot be sent again' })
    }
  })

  app.openapi(acceptRoute, async (c) => {
    const actor = signedIn(c.get('actor'))
    const result = c.get('actor').kind === 'super_admin'
      ? { ok: false, reason: 'invitation-super-admin' } as const
      : await useCases.acceptInvitation(actor, c.req.valid('json').token, c.get('requestId'))
    if (result.ok)
      return c.json({ storeId: result.storeId, role: result.role, storeStatus: result.storeStatus }, 200)
    switch (result.reason) {
      case 'invitation-not-found':
        return problem(c, { type: 'invitation-not-found', status: 404, title: 'This invitation link is not valid. Ask for a new one' })
      case 'invitation-email-mismatch':
        return problem(c, { type: 'invitation-email-mismatch', status: 403, title: 'This invitation was sent to a different email address. Sign in with the address that received it' })
      case 'invitation-email-unverified':
        return problem(c, { type: 'invitation-email-unverified', status: 403, title: 'The email address of this account is not verified' })
      case 'invitation-super-admin':
        return problem(c, { type: 'invitation-super-admin', status: 403, title: 'A Super Admin cannot take a store role. Sign in with a store account' })
      case 'invitation-already-accepted':
        return problem(c, { type: 'invitation-already-accepted', status: 409, title: 'This invitation has already been accepted' })
      case 'invitation-revoked':
        return problem(c, { type: 'invitation-revoked', status: 410, title: 'This invitation was revoked. Ask for a new one' })
      case 'invitation-expired':
        return problem(c, { type: 'invitation-expired', status: 410, title: 'This invitation has expired. Ask for a new one' })
      case 'already-a-member':
        return problem(c, { type: 'already-a-member', status: 409, title: 'You already belong to this store' })
    }
  })

  app.openapi(onboardingRoute, async (c) => {
    const view = await useCases.getOnboarding(c.get('store').storeId)
    if (!view)
      return problem(c, { type: 'not-found', status: 404, title: 'There is no such store' })
    return c.json(view, 200)
  })

  app.openapi(informationRoute, async (c) => {
    const result = await useCases.updateStoreInformation(c.get('actor'), c.get('store').storeId, c.req.valid('json'), c.get('requestId'))
    if (result.ok)
      return c.json(result.store, 200)
    return result.reason === 'forbidden'
      ? problem(c, { type: 'forbidden', status: 403, title: 'Only the Owner may change the store information' })
      : problem(c, { type: 'not-found', status: 404, title: 'There is no such store' })
  })

  app.openapi(openRoute, async (c) => {
    const result = await useCases.openStoreForSale(c.get('actor'), c.get('store').storeId, c.get('requestId'))
    if (result.ok)
      return c.json(result.store, 200)
    switch (result.reason) {
      case 'forbidden':
        return problem(c, { type: 'forbidden', status: 403, title: 'Only the Owner may open the store for sale' })
      case 'store-not-found':
        return problem(c, { type: 'not-found', status: 404, title: 'There is no such store' })
      case 'store-not-onboarding':
        return problem(c, { type: 'store-not-onboarding', status: 409, title: 'Only a store that is onboarding can be opened for sale' })
      case 'onboarding-incomplete':
        return problem(c, { type: 'onboarding-incomplete', status: 409, title: 'The store cannot open for sale until every condition is met' })
    }
  })

  app.openapi(membersRoute, async (c) => {
    const result = await useCases.listMembers(c.get('actor'), c.get('store').storeId)
    return result.ok ? c.json({ members: result.members, invitations: result.invitations }, 200) : problem(c, membersForbidden)
  })

  app.openapi(inviteManagerRoute, async (c) => {
    const result = await useCases.inviteManager(c.get('actor'), c.get('store').storeId, c.req.valid('json'), c.get('requestId'))
    if (result.ok)
      return c.json(result.invitation, 201)
    switch (result.reason) {
      case 'forbidden':
        return problem(c, membersForbidden)
      case 'store-not-found':
        return problem(c, { type: 'not-found', status: 404, title: 'There is no such store' })
      case 'already-a-member':
        return problem(c, { type: 'already-a-member', status: 409, title: 'This person already belongs to the store' })
      case 'manager-is-super-admin':
        return problem(c, { type: 'manager-is-super-admin', status: 409, title: 'This email belongs to a Super Admin, who cannot take a store role. Use another email address' })
      case 'invitation-already-open':
        return problem(c, { type: 'invitation-already-open', status: 409, title: 'This email already has an open invitation. Send that one again instead' })
    }
  })

  app.openapi(resendManagerRoute, async (c) => {
    const body = c.req.valid('json')
    const { invitationId } = c.req.valid('param')
    const result = await useCases.resendManagerInvitation(c.get('actor'), c.get('store').storeId, invitationId, body?.language, c.get('requestId'))
    if (result.ok)
      return c.json(result.invitation, 200)
    switch (result.reason) {
      case 'forbidden':
        return problem(c, membersForbidden)
      case 'store-not-found':
        return problem(c, { type: 'not-found', status: 404, title: 'There is no such store' })
      case 'invitation-not-found':
        return problem(c, { type: 'invitation-not-found', status: 404, title: 'The store has no such Store Manager invitation' })
      case 'invitation-already-accepted':
        return problem(c, { type: 'invitation-already-accepted', status: 409, title: 'The invitation has already been accepted' })
      case 'invitation-revoked':
        return problem(c, { type: 'invitation-revoked', status: 409, title: 'The invitation was revoked and cannot be sent again. Invite the person anew' })
    }
  })

  app.openapi(revokeInvitationRoute, async (c) => {
    const result = await useCases.revokeInvitation(c.get('actor'), c.get('store').storeId, c.req.valid('param').invitationId, c.get('requestId'))
    if (result.ok)
      return c.json(result.invitation, 200)
    switch (result.reason) {
      case 'forbidden':
        return problem(c, membersForbidden)
      case 'invitation-not-found':
        return problem(c, { type: 'invitation-not-found', status: 404, title: 'The store has no such Store Manager invitation' })
      case 'invitation-already-accepted':
        return problem(c, { type: 'invitation-already-accepted', status: 409, title: 'The invitation has already been accepted. Remove the member instead' })
      case 'invitation-revoked':
        return problem(c, { type: 'invitation-revoked', status: 409, title: 'The invitation is already revoked' })
    }
  })

  app.openapi(removeMemberRoute, async (c) => {
    const result = await useCases.removeMember(c.get('actor'), c.get('store').storeId, c.req.valid('param').memberId, c.get('requestId'))
    if (result.ok)
      return c.body(null, 204)
    switch (result.reason) {
      case 'forbidden':
        return problem(c, membersForbidden)
      case 'member-not-found':
        return problem(c, { type: 'not-found', status: 404, title: 'The store has no such member' })
      case 'cannot-remove-owner':
        return problem(c, { type: 'cannot-remove-owner', status: 409, title: 'An Owner cannot be removed here' })
    }
  })
}

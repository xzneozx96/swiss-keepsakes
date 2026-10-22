import { z } from 'zod'

const language = z.enum(['en', 'de'])

const storeStatus = z.enum(['invited', 'onboarding', 'live', 'suspended'])

export const conditionStateSchema = z.enum(['met', 'unmet', 'pending']).meta({
  id: 'ConditionState',
  description: '`pending` means the story that decides the condition is not built yet. It counts as unmet',
})

export const storeSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  status: storeStatus,
  defaultLanguage: language,
}).meta({ id: 'Store' })

const invitationSchema = z.object({
  email: z.string().meta({ description: 'The address the Owner was invited at, in lower case' }),
  state: z.enum(['open', 'accepted', 'revoked', 'expired']),
  expiresAt: z.iso.datetime(),
}).meta({ id: 'OwnerInvitation', description: 'The newest Owner invitation of a store' })

export const adminStoreSchema = storeSchema.extend({
  invitation: invitationSchema.nullable(),
  paymentAccount: conditionStateSchema,
}).meta({ id: 'AdminStore', description: 'A store as A01 lists it: its Owner invitation and whether its payment account is verified' })

export const adminStoreListSchema = z.object({
  items: z.array(adminStoreSchema),
  nextCursor: z.uuid().nullable().meta({ description: 'Pass it as `cursor` for the next page. Null on the last page' }),
}).meta({ id: 'AdminStoreList' })

export const adminStoreListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.uuid().optional(),
})

export const createStoreBodySchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lower-case letters and digits, separated by single dashes'),
  name: z.string().trim().min(1).max(120),
  defaultLanguage: language.default('en'),
  ownerEmail: z.email().max(254),
  language: language.optional().meta({ description: 'The language of the invitation mail N20. The store\'s default language when left out' }),
}).meta({ id: 'CreateStore' })

export const resendOwnerInvitationBodySchema = z.object({
  language: language.optional().meta({ description: 'The language of the invitation mail N20. The store\'s default language when left out' }),
}).meta({ id: 'ResendOwnerInvitation' })

export const acceptInvitationBodySchema = z.object({
  token: z.string().min(16).max(256),
}).meta({ id: 'AcceptInvitation' })

export const acceptedInvitationSchema = z.object({
  storeId: z.uuid(),
  role: z.enum(['owner', 'manager']),
  storeStatus,
}).meta({ id: 'AcceptedInvitation' })

export const onboardingSchema = z.object({
  store: storeSchema,
  conditions: z.array(z.object({
    key: z.enum(['store-information', 'payment-account', 'catalogue', 'policies']),
    state: conditionStateSchema,
  })),
  mayOpenForSale: z.boolean(),
}).meta({ id: 'Onboarding' })

export const storeInformationBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  defaultLanguage: language.optional(),
}).refine(body => body.name !== undefined || body.defaultLanguage !== undefined, 'Send at least one field').meta({ id: 'StoreInformation' })

const invitationStateSchema = z.enum(['open', 'accepted', 'revoked', 'expired'])

export const memberSchema = z.object({
  id: z.uuid().meta({ description: 'The membership id, which `DELETE /members/{memberId}` takes. It is not the user id' }),
  email: z.string().meta({ description: 'The member\'s sign-in address, in lower case' }),
  role: z.enum(['owner', 'manager']),
  acceptedAt: z.iso.datetime(),
}).meta({ id: 'Member' })

export const memberInvitationSchema = z.object({
  id: z.uuid(),
  email: z.string().meta({ description: 'The address the Store Manager was invited at, in lower case' }),
  state: invitationStateSchema,
  expiresAt: z.iso.datetime(),
}).meta({ id: 'MemberInvitation', description: 'A Store Manager invitation. It never carries the link or the token' })

export const membersSchema = z.object({
  members: z.array(memberSchema),
  invitations: z.array(memberInvitationSchema).meta({ description: 'The Store Manager invitations that are neither accepted nor revoked, newest first. An `expired` one can be sent again' }),
}).meta({ id: 'Members', description: 'M22\'s members tab: who belongs to the store and who was invited' })

export const inviteManagerBodySchema = z.object({
  // The pipe validates the trimmed address. The input side names the format, which a pipe would otherwise drop from the document.
  email: z.string().trim().max(254).meta({ format: 'email' }).pipe(z.email().max(254)),
  language: language.optional().meta({ description: 'The language of the invitation mail N18. The store\'s default language when left out' }),
}).meta({ id: 'InviteManager' })

export const resendManagerInvitationBodySchema = z.object({
  language: language.optional().meta({ description: 'The language of the invitation mail N18. The store\'s default language when left out' }),
}).meta({ id: 'ResendManagerInvitation' })

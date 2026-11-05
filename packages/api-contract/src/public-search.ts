import { z } from 'zod'
import { pageOf } from './page.ts'
import { publicKeepsakeCardSchema } from './public-keepsakes.ts'
import { publicMapItemSchema, publicStoryCardSchema, publicTourCardSchema } from './public.ts'

// The guest search (ADR-033 slice 6): one ranked list over published titles, each hit as the card its own list already shows.

/** The kinds a search can be narrowed to. */
export const searchKindSchema = z.enum(['story', 'place', 'tour', 'keepsake'])
export type SearchKind = z.infer<typeof searchKindSchema>

export const MAX_SEARCH_QUERY_LENGTH = 100

export const publicSearchItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('story'), card: publicStoryCardSchema }),
  z.object({ kind: z.literal('place'), card: publicMapItemSchema }),
  z.object({ kind: z.literal('tour'), card: publicTourCardSchema }),
  z.object({ kind: z.literal('keepsake'), card: publicKeepsakeCardSchema }),
]).meta({ id: 'PublicSearchItem', description: 'One hit: its kind and the card the kind\'s own list shows (a place is the map item)' })

const count = z.int().min(0)

export const publicSearchListSchema = pageOf(publicSearchItemSchema, 'PublicSearchList', {
  total: count.meta({ description: 'How many published titles match, for the kind asked for (all kinds when none), on every page' }),
  counts: z.object({ story: count, place: count, tour: count, keepsake: count })
    .meta({ description: 'How many match in each kind, whatever `kind` asks for, so a filter can show its counts' }),
})

export type PublicSearchItem = z.infer<typeof publicSearchItemSchema>
export type PublicSearchList = z.infer<typeof publicSearchListSchema>

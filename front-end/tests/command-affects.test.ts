import type { QueryKey } from '@tanstack/react-query'
import type { DataClient } from '@/features/data-client'
import type { CommandName, Feature } from '@/features/data-client/commands'
import type { DemoStore } from '@/features/demo/store'
import type { DemoData } from '@/features/demo/types'

import { productEarliestPickup, reviewId } from '@sk/domain/catalog'
import { balance } from '@sk/domain/orders'
import { hashKey } from '@tanstack/react-query'
import { beforeEach, describe, expect, it } from 'vitest'

import { commandAffects } from '@/features/data-client/commands'
import { demoNow } from '@/features/demo/clock'
import { createDemoDataClient, demoCollectionKey } from '@/features/demo/data-client'
import { createSeedState } from '@/features/demo/seed'
import { createDemoStore } from '@/features/demo/store'
import { newBooking } from '@/features/tours/booking/transitions'

beforeEach(() => {
  window.localStorage.clear()
})

type Input<F extends Feature, C extends CommandName<F>> = DataClient[F][C] extends (
  input: infer TInput,
) => Promise<unknown>
  ? TInput
  : never

interface Context {
  data: DemoData
  /** Demo time as an ISO string, so a payment is never in the future. */
  now: string
}

/**
 * Sample inputs for one command. Each runs on its own fresh store, after `prepare`, and together
 * they must change something, so the check below is never vacuous.
 */
interface Case<F extends Feature, C extends CommandName<F>> {
  prepare?: (client: DataClient, context: Context) => Promise<unknown>
  inputs: (context: Context) => Input<F, C>[]
}

const ids = <T extends { id: string }>(items: T[]) => items.map(item => item.id)

/** Records the rest of a ready order's money, so it can be completed. */
function payInFull(client: DataClient, { data, now }: Context, id: string) {
  const order = data.orders.find(o => o.id === id)!

  return client.orders.recordOfflinePayment({
    id,
    language: 'en',
    payment: { amount: balance(order), method: 'cash', at: now },
  })
}

/** `stores`, `categories` and `keepsakes` have no demo data to write: they are the API client in both modes, and tests/stores-client.test.tsx, tests/categories-client.test.tsx and tests/keepsakes-client.test.tsx check their commands. */
type DemoFeature = Exclude<Feature, 'stores' | 'categories' | 'keepsakes'>

const cases: { [F in DemoFeature]: { [C in CommandName<F>]: Case<F, C> } } = {
  account: {
    updateProfile: { inputs: () => [{ name: 'Anna Changed' }] },
    saveTrip: {
      inputs: () => [
        { target: { kind: 'gift', orderIds: ['sk-1012'] }, answers: { travelStyle: 'group' } },
        { target: { kind: 'tour', bookingId: 'tour-anna' } },
      ],
    },
  },
  catalog: {
    saveProduct: { inputs: ({ data }) => [{ ...data.products[0], photo: 'changed' }] },
    setProductArchived: { inputs: ({ data }) => [{ id: data.products[0].id, archived: true }] },
    addSubcategory: { inputs: () => [{ name: { en: 'New', de: 'Neu' } }] },
    renameSubcategory: { inputs: () => [{ id: 'prints', name: { en: 'Posters' } }] },
    moveSubcategory: { inputs: () => [{ id: 'prints', direction: -1 }] },
    removeSubcategory: {
      prepare: client => client.catalog.addSubcategory({ name: { en: 'Empty' } }),
      inputs: () => [{ id: 'empty' }],
    },
    savePickupPlace: { inputs: ({ data }) => [{ ...data.pickupPlaces[0], address: 'Changed 1' }] },
  },
  content: {
    createArticle: { inputs: ({ data }) => [{ ...data.articles[0], id: 'new-article', slug: 'new-article' }] },
    updateArticle: { inputs: ({ data }) => [{ id: data.articles[0].id, content: { ...data.articles[0], title: 'Changed' } }] },
    addComment: { inputs: ({ data }) => [{ id: 'c-new', articleId: data.articles[0].id, text: 'Hello' }] },
    replyAsShop: {
      inputs: ({ data }) => data.comments.filter(c => !c.parentId).map(c => ({ id: 'c-reply', parentId: c.id, text: 'Thanks' })),
    },
    setCommentHidden: { inputs: ({ data }) => [{ id: data.comments[0].id, hidden: !data.comments[0].hidden }] },
    deleteComment: { inputs: ({ data }) => [{ id: data.comments[0].id }] },
  },
  notifications: {},
  orders: {
    // fresh() ticks a cart line.
    submitCart: { inputs: () => [{ language: 'en' }] },
    accept: { inputs: ({ data }) => ids(data.orders).map(id => ({ id, language: 'en' })) },
    decline: { inputs: ({ data }) => ids(data.orders).map(id => ({ id, language: 'en', reason: 'Sold out' })) },
    changePickup: {
      inputs: ({ data }) => ids(data.orders).map(id => ({ id, language: 'en', change: { field: 'place', to: 'bahnhof', note: 'Agreed by email' } })),
    },
    payOnline: { inputs: ({ data }) => ids(data.orders).map(id => ({ id, language: 'en', outcome: 'succeeded' })) },
    recordOfflinePayment: {
      inputs: ({ data, now }) => ids(data.orders).map(id => ({ id, language: 'en', payment: { amount: 100, method: 'cash', at: now } })),
    },
    markReady: { inputs: ({ data }) => ids(data.orders).map(id => ({ id, language: 'en' })) },
    handOver: { inputs: ({ data }) => ids(data.orders).map(id => ({ id, language: 'en' })) },
    complete: {
      prepare: async (client, context) => {
        await payInFull(client, context, 'sk-1021')
        await client.orders.handOver({ id: 'sk-1021', language: 'en' })
      },
      inputs: () => [{ id: 'sk-1021', language: 'en' }],
    },
    handOverAndComplete: {
      prepare: (client, context) => payInFull(client, context, 'sk-1021'),
      inputs: () => [{ id: 'sk-1021', language: 'en' }],
    },
    cancel: {
      inputs: ({ data }) => ids(data.orders).flatMap(id => [
        { id, language: 'en', by: 'merchant' as const },
        { id, language: 'en', by: 'guest' as const },
      ]),
    },
  },
  partners: {
    recordVisit: { inputs: () => [{ partnerId: 'guide-marco' }] },
    addPartner: {
      inputs: () => [{ id: 'new-partner', name: 'New', kind: 'guide', code: 'NEW', email: 'new@example.com', reportToken: 'token', revokedTokens: [] }],
    },
    setPartnerArchived: { inputs: () => [{ id: 'guide-marco', archived: true }] },
    deletePartner: { inputs: () => [{ id: 'guide-sophie' }] },
    recordPayout: { inputs: () => [{ partnerId: 'guide-marco', amount: 1000, method: 'cash', paidOn: '2026-10-13' }] },
    revokeReportLink: { inputs: () => [{ id: 'guide-marco' }] },
    issueReportLink: { inputs: () => [{ id: 'guide-sophie', token: 'new-token' }] },
  },
  reports: {
    saveCosts: { inputs: () => [{ transaction: { kind: 'order', id: 'sk-1017' }, costs: {} }] },
  },
  requests: {
    sendAdviceRequest: { inputs: () => [{ id: 'adv-new', language: 'en', email: 'a@example.com', answers: [] }] },
    sendPrivateTourRequest: {
      inputs: () => [{ id: 'pt-new', language: 'en', email: 'a@example.com', groupSize: 2, dateFrom: '2026-10-20', dateTo: '2026-10-20', interests: '' }],
    },
    markAdviceRequestRead: { inputs: () => [{ id: 'adv-2' }] },
    setPrivateTourAnswered: { inputs: () => [{ id: 'pt-1', answered: true }] },
    saveQuestion: { inputs: ({ data }) => [{ ...data.adviceQuestions.questions[0], text: { en: 'Changed?' } }] },
    removeQuestion: { inputs: ({ data }) => [{ id: data.adviceQuestions.questions[0].id }] },
    moveQuestion: { inputs: ({ data }) => [{ id: data.adviceQuestions.questions[0].id, by: 1 }] },
    setRecipient: { inputs: () => [{ email: 'requests@example.com' }] },
  },
  reviews: {
    addReview: {
      inputs: ({ now }) => [{
        review: {
          id: reviewId('sk-1012', 'p-chocolate'),
          productId: 'p-chocolate',
          guestName: 'Anna K.',
          rating: 5,
          text: { en: 'Lovely' },
          createdAt: now,
          purchasedAt: now,
        },
        purchase: { kind: 'order', id: 'sk-1012' },
      }],
    },
    replyToReview: { inputs: ({ data }) => [{ id: data.reviews[0].id, text: 'Thanks', language: 'en' }] },
  },
  tours: {
    createBooking: {
      inputs: ({ data, now }) => {
        const records = data.tours!
        const departure = records.departures.find(
          d => !d.closed && Date.parse(d.startsAt) > Date.parse(now) + 86_400_000,
        )!
        const tour = records.tours.find(t => t.id === departure.tourId)!

        return [{
          booking: newBooking({
            id: 'new-booking',
            tour,
            departure,
            draft: { ...records.draft, adults: 1, children: 0, infants: 0 },
            guestId: 'g-test',
            partnerId: null,
            language: 'en',
            now: new Date(now),
          }),
          language: 'en',
        }]
      },
    },
    pay: { inputs: ({ data }) => ids(data.tours!.bookings).map(id => ({ id, language: 'en', outcome: 'succeeded' })) },
    recordPayment: {
      inputs: ({ data, now }) => ids(data.tours!.bookings).map(id => ({ id, language: 'en', payment: { amount: 1000, method: 'cash', note: '', at: now } })),
    },
    recordOutcome: {
      inputs: ({ data }) => ids(data.tours!.bookings).flatMap(id =>
        (['delivered', 'completed', 'no_show'] as const).map(result => ({ id, language: 'en', result })),
      ),
    },
    saveTour: { inputs: ({ data }) => [{ ...data.tours!.tours[0], durationMinutes: 99 }] },
    setTourArchived: { inputs: ({ data }) => [{ id: data.tours!.tours[0].id, archived: true }] },
    addDeparture: { inputs: ({ data }) => [{ ...data.tours!.departures[0], id: 'new-departure' }] },
    setDepartureCapacity: { inputs: ({ data }) => [{ id: data.tours!.departures[0].id, capacity: 99 }] },
  },
}

/** The owner on the till, Anna signed in on the guest side, with one gift ticked in her cart. */
function fresh(): { store: DemoStore, client: DataClient } {
  const seed = createSeedState()
  const now = demoNow(seed.clockStartedAt)
  const product = seed.data.products.find(p => p.variants.length > 0 && p.published !== false)!

  seed.role = 'owner'
  seed.data.signedInGuestId = 'g-anna'
  seed.data.cart = [{
    id: 'line-1',
    productId: product.id,
    variantId: product.variants[0].id,
    quantity: 1,
    pickupDate: productEarliestPickup(product, now),
    pickupPlaceId: seed.data.pickupPlaces[0].id,
    selected: true,
  }]
  const store = createDemoStore(seed)

  return { store, client: createDemoDataClient(store) }
}

function context(store: DemoStore): Context {
  return {
    data: store.getState().data,
    now: demoNow(store.getState().clockStartedAt).toISOString(),
  }
}

/** The collections of the demo data each sample input of the command changed. */
async function written<F extends Feature, C extends CommandName<F>>(
  feature: F,
  command: C,
  sample: Case<F, C>,
): Promise<Set<keyof DemoData>> {
  const changed = new Set<keyof DemoData>()
  const inputs = sample.inputs(context(fresh().store))

  for (const input of inputs) {
    const { store, client } = fresh()

    await sample.prepare?.(client, context(store))
    const before = store.getState().data
    const run = client[feature][command] as (input: Input<F, C>) => Promise<unknown>

    await run(input)
    const after = store.getState().data

    for (const key of Object.keys(after) as (keyof DemoData)[]) {
      if (after[key] !== before[key])
        changed.add(key)
    }
  }

  return changed
}

const commands = (Object.keys(cases) as DemoFeature[]).flatMap(feature =>
  (Object.keys(cases[feature]) as CommandName<typeof feature>[]).map(command => ({ feature, command })),
)

describe('commandAffects', () => {
  it('[E1.11] every command refreshes every collection it writes, and each sample input writes', async () => {
    const { client } = fresh()
    const problems: string[] = []

    for (const { feature, command } of commands) {
      const sample = (cases[feature] as Record<string, Case<Feature, never>>)[command]
      const changed = await written(feature, command as never, sample)
      const listed = new Set(
        ((commandAffects[feature] as Record<string, readonly QueryKey[]>)[command]).map(key => hashKey(key)),
      )
      const queried = Array.from(changed, key => demoCollectionKey(key, client))
        .filter((key): key is QueryKey => key !== undefined)

      if (changed.size === 0)
        problems.push(`${feature}.${command}: no sample input changed anything`)
      for (const key of queried) {
        if (!listed.has(hashKey(key)))
          problems.push(`${feature}.${command}: writes ${key.join('.')} but does not refresh it`)
      }
    }

    expect(problems).toEqual([])
  })
})

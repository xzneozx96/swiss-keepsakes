import type { Actor, StaffId } from '@sk/domain/orders'
import type { OrdersClient } from './client'
import type { Language } from '@/contexts/locale-context'
import type { DemoStore } from '@/features/demo/store'
import type { DemoState, Role } from '@/features/demo/types'
import type { TransitionContext } from '@/features/orders/lib/transitions'

import { demoNow } from '@/features/demo/clock'

type Transitions = typeof import('@/features/orders/lib/transitions')

const staff = (role: Role): StaffId => (role === 'owner' ? 'owner' : 'manager')

export function createOrdersDemoClient(store: DemoStore): OrdersClient {
  const data = () => store.getState().data

  /** Applies one transition on the latest state; the transition itself re-checks its guard. */
  const transition = async <A extends Actor>(
    language: Language,
    actor: (role: Role) => A,
    apply: (
      tr: Transitions,
      state: DemoState,
      ctx: TransitionContext<A>,
    ) => DemoState,
  ) => {
    const tr = await import('@/features/orders/lib/transitions')

    store.update(s =>
      apply(tr, s, {
        actor: actor(s.role),
        now: demoNow(s.clockStartedAt),
        staffLanguage: language,
      }),
    )
  }

  return {
    orders: async () => data().orders,
    submitCart: async ({ language }) => {
      const { buildOrderDrafts, createOrdersFromCart } = await import(
        '@/features/checkout/lib/create-orders',
      )
      let ids: string[] = []

      store.update((s) => {
        const ctx = {
          now: demoNow(s.clockStartedAt),
          language,
          staffLanguage: language,
        }
        const next = createOrdersFromCart(s, ctx)

        ids = next === s ? [] : buildOrderDrafts(s.data, ctx).map(o => o.id)

        return next
      })

      return ids
    },
    accept: ({ id, language }) =>
      transition(language, staff, (tr, s, ctx) => tr.accept(s, id, ctx)),
    decline: ({ id, language, reason }) =>
      transition(language, staff, (tr, s, ctx) =>
        tr.decline(s, id, reason, ctx)),
    changePickup: ({ id, language, change }) =>
      transition(language, staff, (tr, s, ctx) =>
        tr.changePickup(s, id, change, ctx)),
    payOnline: ({ id, language, outcome }) =>
      transition(
        language,
        () => 'guest',
        (tr, s, ctx) => {
          const started = tr.startOnlinePayment(s, id, ctx)

          return outcome === 'processing'
            ? started
            : tr.resolveOnlinePayment(started, id, outcome, {
                ...ctx,
                actor: 'system',
              })
        },
      ),
    recordOfflinePayment: ({ id, language, payment }) =>
      transition(language, staff, (tr, s, ctx) =>
        tr.recordOfflinePayment(s, id, payment, ctx)),
    markReady: ({ id, language }) =>
      transition(language, staff, (tr, s, ctx) => tr.markReady(s, id, ctx)),
    handOver: ({ id, language }) =>
      transition(language, staff, (tr, s, ctx) => tr.handOver(s, id, ctx)),
    complete: ({ id, language }) =>
      transition(language, staff, (tr, s, ctx) => tr.complete(s, id, ctx)),
    handOverAndComplete: ({ id, language }) =>
      transition(language, staff, (tr, s, ctx) =>
        tr.handOverAndComplete(s, id, ctx)),
    cancel: ({ id, language, by }) =>
      transition<Actor>(
        language,
        role => (by === 'guest' ? 'guest' : staff(role)),
        (tr, s, ctx) => tr.cancel(s, id, by, ctx),
      ),
  }
}

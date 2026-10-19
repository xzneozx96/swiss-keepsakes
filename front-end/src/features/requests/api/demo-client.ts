import type { AdviceQuestionSet } from '@sk/domain/requests'
import type { RequestsClient } from './client'
import type { DemoStore } from '@/features/demo/store'

import { demoNow } from '@/features/demo/clock'
import { updateCollection } from '@/features/demo/store'
import { mailAdviceRequest, mailPrivateTourRequest } from '../lib/request-mail'
import {
  moveQuestion,
  removeQuestion,
  upsertQuestion,
} from '../merchant/lib/question-set'

export function createRequestsDemoClient(store: DemoStore): RequestsClient {
  const data = () => store.getState().data
  /** Every change replaces the set and stamps `updatedAt`. */
  const changeQuestions = (
    recipe: (set: AdviceQuestionSet) => AdviceQuestionSet,
  ) =>
    updateCollection(store, 'adviceQuestions', (set, s) => ({
      ...recipe(set),
      updatedAt: demoNow(s.clockStartedAt).toISOString(),
    }))

  return {
    adviceQuestions: async () => data().adviceQuestions,
    adviceRequests: async () => data().adviceRequests,
    privateTourRequests: async () => data().privateTourRequests,
    sendAdviceRequest: async (input) => {
      store.update((s) => {
        const request = {
          ...input,
          sentAt: demoNow(s.clockStartedAt).toISOString(),
        }

        // N16 goes to the shop's current request address, even for a draft begun earlier.
        return mailAdviceRequest(
          {
            ...s,
            data: {
              ...s.data,
              adviceRequests: [...s.data.adviceRequests, request],
            },
          },
          request,
          s.data.adviceQuestions.recipientEmail,
        )
      })
    },
    sendPrivateTourRequest: async (input) => {
      store.update((s) => {
        const request = {
          ...input,
          sentAt: demoNow(s.clockStartedAt).toISOString(),
        }

        return mailPrivateTourRequest(
          {
            ...s,
            data: {
              ...s.data,
              privateTourRequests: [...s.data.privateTourRequests, request],
            },
          },
          request,
        )
      })
    },
    markAdviceRequestRead: async ({ id }) => {
      updateCollection(store, 'adviceRequests', (requests, s) =>
        requests.map(r =>
          r.id === id && !r.readAt
            ? { ...r, readAt: demoNow(s.clockStartedAt).toISOString() }
            : r,
        ))
    },
    setPrivateTourAnswered: async ({ id, answered }) => {
      updateCollection(store, 'privateTourRequests', (requests, s) =>
        requests.map((r) => {
          if (r.id !== id)
            return r
          if (!answered) {
            const reopened = { ...r }

            delete reopened.answeredAt

            return reopened
          }

          return { ...r, answeredAt: demoNow(s.clockStartedAt).toISOString() }
        }))
    },
    saveQuestion: async (question) => {
      changeQuestions(set => upsertQuestion(set, question))
    },
    removeQuestion: async ({ id }) => {
      changeQuestions(set => removeQuestion(set, id))
    },
    moveQuestion: async ({ id, by }) => {
      changeQuestions(set => moveQuestion(set, id, by))
    },
    setRecipient: async ({ email }) => {
      changeQuestions(set => ({ ...set, recipientEmail: email }))
    },
  }
}

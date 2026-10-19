import type { QueryKey } from '@tanstack/react-query'
import type { DataClient } from './data-client'

import { queryKeys } from './query-keys'

export type Feature = keyof DataClient

/** A client method that changes data. It takes an input; a read takes none. */
export type CommandName<F extends Feature> = {
  [K in keyof DataClient[F]]: DataClient[F][K] extends () => Promise<unknown>
    ? never
    : K
}[keyof DataClient[F]]

/**
 * The queries each command changes. `useCommand` refreshes exactly these, so a command that
 * writes a collection must list its query, and `tests/command-affects.test.ts` checks every
 * command against what it really writes.
 */
export const commandAffects: {
  [F in Feature]: { [C in CommandName<F>]: readonly QueryKey[] }
} = {
  account: {
    updateProfile: [queryKeys.account.guests],
    saveTrip: [queryKeys.orders.orders, queryKeys.tours.records],
  },
  catalog: {
    saveProduct: [queryKeys.catalog.products],
    setProductArchived: [queryKeys.catalog.products],
    addSubcategory: [queryKeys.catalog.subcategories],
    renameSubcategory: [queryKeys.catalog.subcategories],
    moveSubcategory: [queryKeys.catalog.subcategories],
    removeSubcategory: [queryKeys.catalog.subcategories],
    savePickupPlace: [queryKeys.catalog.pickupPlaces],
  },
  content: {
    createArticle: [queryKeys.content.articles],
    updateArticle: [queryKeys.content.articles],
    addComment: [queryKeys.content.comments],
    replyAsShop: [queryKeys.content.comments],
    setCommentHidden: [queryKeys.content.comments],
    deleteComment: [queryKeys.content.comments],
  },
  notifications: {},
  orders: {
    submitCart: [queryKeys.orders.orders, queryKeys.notifications.mail],
    accept: [queryKeys.orders.orders, queryKeys.notifications.mail],
    decline: [queryKeys.orders.orders, queryKeys.notifications.mail],
    changePickup: [queryKeys.orders.orders, queryKeys.notifications.mail],
    payOnline: [queryKeys.orders.orders, queryKeys.notifications.mail],
    recordOfflinePayment: [queryKeys.orders.orders, queryKeys.notifications.mail],
    markReady: [queryKeys.orders.orders, queryKeys.notifications.mail],
    // Handing over takes the units out of stock.
    handOver: [
      queryKeys.orders.orders,
      queryKeys.notifications.mail,
      queryKeys.catalog.products,
    ],
    complete: [queryKeys.orders.orders, queryKeys.notifications.mail],
    handOverAndComplete: [
      queryKeys.orders.orders,
      queryKeys.notifications.mail,
      queryKeys.catalog.products,
    ],
    cancel: [queryKeys.orders.orders, queryKeys.notifications.mail],
  },
  partners: {
    recordVisit: [queryKeys.partners.referralVisits],
    addPartner: [queryKeys.partners.partners],
    setPartnerArchived: [queryKeys.partners.partners],
    deletePartner: [queryKeys.partners.partners],
    recordPayout: [queryKeys.partners.partnerPayouts],
    revokeReportLink: [queryKeys.partners.partners],
    issueReportLink: [queryKeys.partners.partners],
  },
  reports: {
    saveCosts: [queryKeys.reports.costs],
  },
  requests: {
    sendAdviceRequest: [
      queryKeys.requests.adviceRequests,
      queryKeys.notifications.mail,
    ],
    sendPrivateTourRequest: [
      queryKeys.requests.privateTourRequests,
      queryKeys.notifications.mail,
    ],
    markAdviceRequestRead: [queryKeys.requests.adviceRequests],
    setPrivateTourAnswered: [queryKeys.requests.privateTourRequests],
    saveQuestion: [queryKeys.requests.adviceQuestions],
    removeQuestion: [queryKeys.requests.adviceQuestions],
    moveQuestion: [queryKeys.requests.adviceQuestions],
    setRecipient: [queryKeys.requests.adviceQuestions],
  },
  reviews: {
    addReview: [queryKeys.reviews.reviews],
    replyToReview: [queryKeys.reviews.reviews],
  },
  tours: {
    createBooking: [queryKeys.tours.records, queryKeys.notifications.mail],
    pay: [queryKeys.tours.records, queryKeys.notifications.mail],
    recordPayment: [queryKeys.tours.records, queryKeys.notifications.mail],
    recordOutcome: [queryKeys.tours.records, queryKeys.notifications.mail],
    saveTour: [queryKeys.tours.records],
    setTourArchived: [queryKeys.tours.records],
    addDeparture: [queryKeys.tours.records],
    setDepartureCapacity: [queryKeys.tours.records],
  },
}

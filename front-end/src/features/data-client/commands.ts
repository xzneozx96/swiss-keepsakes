import type { QueryKey } from '@tanstack/react-query'
import type { DataClient } from './data-client'

import { queryKeys } from './query-keys'

export type Feature = keyof DataClient

/** A client method that changes data. It takes an input; a read takes none. */
export type CommandName<F extends Feature> = Exclude<
  {
    [K in keyof DataClient[F]]: DataClient[F][K] extends () => Promise<unknown>
      ? never
      : K
  }[keyof DataClient[F]],
  F extends keyof ReadsWithInput ? ReadsWithInput[F] : never
>

/** Reads that take a parameter, such as a cursor or a store id. They are not commands, whatever their signature. */
interface ReadsWithInput {
  stores: 'onboarding' | 'members' | 'previewInvitation'
  categories: 'list'
  keepsakes: 'list' | 'get'
}

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
  categories: {
    create: [queryKeys.categories.list],
    save: [queryKeys.categories.list],
    reorder: [queryKeys.categories.list],
    remove: [queryKeys.categories.list],
  },
  content: {
    createArticle: [queryKeys.content.articles],
    updateArticle: [queryKeys.content.articles],
    addComment: [queryKeys.content.comments],
    replyAsShop: [queryKeys.content.comments],
    setCommentHidden: [queryKeys.content.comments],
    deleteComment: [queryKeys.content.comments],
  },
  keepsakes: {
    create: [queryKeys.keepsakes.list],
    // The autosave leaves the list alone: the editor keeps its own copy, and the list reads again when it opens.
    save: [],
    publish: [queryKeys.keepsakes.list],
    unpublish: [queryKeys.keepsakes.list],
    saveVariant: [queryKeys.keepsakes.list],
    saveOptions: [queryKeys.keepsakes.list],
    createVariant: [queryKeys.keepsakes.list],
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
  stores: {
    createStore: [queryKeys.stores.adminStores],
    resendOwnerInvitation: [queryKeys.stores.adminStores],
    acceptInvitation: [queryKeys.stores.onboarding, queryKeys.stores.me, queryKeys.stores.members],
    inviteManager: [queryKeys.stores.members],
    resendManagerInvitation: [queryKeys.stores.members],
    revokeManagerInvitation: [queryKeys.stores.members],
    removeMember: [queryKeys.stores.members],
    updateStoreInformation: [queryKeys.stores.onboarding],
    openForSale: [queryKeys.stores.onboarding],
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

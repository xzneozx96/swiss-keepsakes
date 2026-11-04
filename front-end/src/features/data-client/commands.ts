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
  inventory: 'list' | 'get'
  keepsakes: 'list' | 'get'
  media: 'list' | 'uses' | 'get' | 'lookup'
  pickup: 'list'
  places: 'list' | 'get' | 'storyOptions' | 'storyVersion'
  stories: 'list' | 'group' | 'links'
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
  inventory: {
    // The stock figure is also on the keepsake list (sold-out count) and the keepsake page (a variant's stock).
    set: [queryKeys.inventory.list, queryKeys.inventory.detail, queryKeys.keepsakes.list, queryKeys.keepsakes.detail],
  },
  keepsakes: {
    create: [queryKeys.keepsakes.list],
    // The autosave leaves the list alone: the editor keeps its own copy, and the list reads again when it opens.
    save: [],
    publish: [queryKeys.keepsakes.list],
    unpublish: [queryKeys.keepsakes.list],
    // The list is edited at once (`commandChanges`); the open editor of a removed keepsake is left.
    remove: [queryKeys.keepsakes.list],
    saveVariant: [queryKeys.keepsakes.list],
    saveVariants: [queryKeys.keepsakes.list],
    saveOptions: [queryKeys.keepsakes.list],
    createVariant: [queryKeys.keepsakes.list],
  },
  media: {
    upload: [queryKeys.media.list],
    // A grant writes nothing a screen reads; a confirmed file is a new item of the library.
    requestUpload: [],
    confirmUpload: [queryKeys.media.list],
    // A replacement changes the file under every page that uses it; the sheet's pages are read again too.
    replace: [queryKeys.media.list, queryKeys.media.uses],
    describe: [queryKeys.media.list],
    retire: [queryKeys.media.list, queryKeys.media.uses],
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
  pickup: {
    create: [queryKeys.pickup.list],
    save: [queryKeys.pickup.list],
    archive: [queryKeys.pickup.list],
    restore: [queryKeys.pickup.list],
    remove: [queryKeys.pickup.list],
  },
  places: {
    create: [queryKeys.places.list, queryKeys.places.pin],
    save: [queryKeys.places.list, queryKeys.places.pin],
    publish: [queryKeys.places.list, queryKeys.places.pin],
    hide: [queryKeys.places.list, queryKeys.places.pin],
    remove: [queryKeys.places.list, queryKeys.places.pin],
    // A lookup of a short link or of an address writes no collection a screen reads.
    resolveMapsLink: [],
    addressAt: [],
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
  stories: {
    createStory: [queryKeys.stories.list, queryKeys.stories.group],
    createVersion: [queryKeys.stories.list, queryKeys.stories.group],
    // Not the groups: a deleted story's group answers 404, and the editor is still on screen when the delete is answered. The screen drops them.
    // The pins that named the story lost their main story and the stories that listed it lost a related one, so their row versions moved.
    removeStory: [queryKeys.stories.list, queryKeys.places.list, queryKeys.places.pin, queryKeys.places.storyOptions],
    // The editor writes every answer into the group query itself (as the keepsake editor does), so a save refreshes nothing.
    saveVersion: [],
    // The group editor writes the answer into the group query itself; the list carries `kind`, so it is refreshed.
    saveGroup: [queryKeys.stories.list],
    // Likewise: the editor writes the answer into the group query itself (through `engine.exclusive`), so only the list is refreshed.
    publishVersion: [queryKeys.stories.list],
    unpublishVersion: [queryKeys.stories.list],
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

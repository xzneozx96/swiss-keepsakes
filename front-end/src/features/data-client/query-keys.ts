/** Every query key in the app: one per collection a screen reads, grouped by feature. */
export const queryKeys = {
  account: {
    guests: ['account', 'guests'],
  },
  catalog: {
    products: ['catalog', 'products'],
    subcategories: ['catalog', 'subcategories'],
    pickupPlaces: ['catalog', 'pickupPlaces'],
  },
  categories: {
    list: ['categories', 'list'],
  },
  content: {
    articles: ['content', 'articles'],
    comments: ['content', 'comments'],
  },
  keepsakes: {
    list: ['keepsakes', 'list'],
    detail: ['keepsakes', 'detail'],
  },
  notifications: {
    mail: ['notifications', 'mail'],
  },
  orders: {
    orders: ['orders', 'orders'],
  },
  partners: {
    partners: ['partners', 'partners'],
    referralVisits: ['partners', 'referralVisits'],
    commissionAdjustments: ['partners', 'commissionAdjustments'],
    partnerPayouts: ['partners', 'partnerPayouts'],
  },
  reports: {
    costs: ['reports', 'costs'],
  },
  requests: {
    adviceQuestions: ['requests', 'adviceQuestions'],
    adviceRequests: ['requests', 'adviceRequests'],
    privateTourRequests: ['requests', 'privateTourRequests'],
  },
  reviews: {
    reviews: ['reviews', 'reviews'],
  },
  stores: {
    adminStores: ['stores', 'adminStores'],
    onboarding: ['stores', 'onboarding'],
    me: ['stores', 'me'],
    members: ['stores', 'members'],
    invitationPreview: ['stores', 'invitationPreview'],
    sessionUser: ['stores', 'sessionUser'],
  },
  tours: {
    records: ['tours', 'records'],
  },
} as const

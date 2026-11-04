/** Every query key in the app: one per collection a screen reads, grouped by feature. */
export const queryKeys = {
  account: {
    guests: ['account', 'guests'],
  },
  catalog: {
    products: ['catalog', 'products'],
    subcategories: ['catalog', 'subcategories'],
    pickupPlaces: ['catalog', 'pickupPlaces'],
    keepsakeAvailability: ['catalog', 'keepsakeAvailability'],
    keepsakePickupPoints: ['catalog', 'keepsakePickupPoints'],
  },
  categories: {
    list: ['categories', 'list'],
  },
  content: {
    articles: ['content', 'articles'],
    comments: ['content', 'comments'],
  },
  inventory: {
    list: ['inventory', 'list'],
    detail: ['inventory', 'detail'],
  },
  keepsakes: {
    list: ['keepsakes', 'list'],
    detail: ['keepsakes', 'detail'],
    /** The public list a guest reads (`GET /api/public/keepsakes`), one entry per language. */
    publicList: ['keepsakes', 'public'],
  },
  search: {
    stories: ['search', 'stories'],
    tours: ['search', 'tours'],
  },
  media: {
    list: ['media', 'list'],
    uses: ['media', 'uses'],
    file: ['media', 'file'],
  },
  notifications: {
    mail: ['notifications', 'mail'],
  },
  orders: {
    orders: ['orders', 'orders'],
  },
  pickup: {
    list: ['pickup', 'list'],
  },
  places: {
    list: ['places', 'list'],
    pin: ['places', 'pin'],
    storyOptions: ['places', 'storyOptions'],
    storyVersion: ['places', 'storyVersion'],
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
  stories: {
    list: ['stories', 'list'],
    group: ['stories', 'group'],
    links: ['stories', 'links'],
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

import type { AccountClient } from '@/features/account/api/client'
import type { CatalogClient } from '@/features/catalog/api/client'
import type { CategoriesClient } from '@/features/categories/api/client'
import type { ContentClient } from '@/features/content/api/client'
import type { NotificationsClient } from '@/features/notifications/api/client'
import type { OrdersClient } from '@/features/orders/api/client'
import type { PartnersClient } from '@/features/partners/api/client'
import type { ReportsClient } from '@/features/reports/api/client'
import type { RequestsClient } from '@/features/requests/api/client'
import type { ReviewsClient } from '@/features/reviews/api/client'
import type { StoresClient } from '@/features/stores/api/client'
import type { ToursClient } from '@/features/tours/api/client'

/**
 * Everything the screens read and change, one client per feature (D19). Demo mode answers from
 * the browser-held store. A feature moves to the API by replacing only its own client. `stores`
 * has no demo data: it is the API client in both modes, and its screens need the API.
 */
export interface DataClient {
  account: AccountClient
  catalog: CatalogClient
  categories: CategoriesClient
  content: ContentClient
  notifications: NotificationsClient
  orders: OrdersClient
  partners: PartnersClient
  reports: ReportsClient
  requests: RequestsClient
  reviews: ReviewsClient
  stores: StoresClient
  tours: ToursClient
}

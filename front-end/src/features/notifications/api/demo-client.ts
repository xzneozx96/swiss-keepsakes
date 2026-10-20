import type { NotificationsClient } from './client'
import type { DemoStore } from '@/features/demo/store'

export function createNotificationsDemoClient(store: DemoStore): NotificationsClient {
  const data = () => store.getState().data

  return {
    mail: async () => data().mail,
  }
}

import { Button, Skeleton } from '@heroui/react'
import { notFound } from '@tanstack/react-router'
import { useEffect } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { useAdminStores } from '../api/queries'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { CreateStoreForm } from './create-store-form'
import { ProblemNotice } from './problem-notice'
import { ScreenFrame } from './screen-frame'
import { StoreCard } from './store-card'

/**
 * A01 (UX 4.12): the Super Admin creates the first store with its Owner invitation and follows each store's
 * invitation. The API decides who may look: a visitor who has not signed in goes to sign-in and comes back,
 * and anyone else the API refuses with `forbidden` gets the app's not-found screen. A refusal of another kind
 * says what happened, with a retry. A list that is already loaded stays on screen when a later read fails.
 */
export function AdminStoresScreen() {
  const { t } = useLocale()

  if (!apiEnabled) {
    return (
      <ScreenFrame title={t('stores.admin.title')}>
        <EmptyState icon={InfoIcon} message={t('stores.apiOnly')} />
      </ScreenFrame>
    )
  }

  return <AdminStores />
}

function AdminStores() {
  const { t } = useLocale()
  const goToSignIn = useGoToSignIn('/admin')
  const stores = useAdminStores()
  const problem = stores.error instanceof ApiProblem ? stores.error : undefined
  const signedOut = problem?.status === 401

  const forbidden = problem?.type === 'forbidden'

  useEffect(() => {
    if (signedOut)
      goToSignIn()
  }, [signedOut, goToSignIn])

  if (forbidden)
    throw notFound()

  const items = stores.data?.pages.flatMap(page => page.items) ?? []

  return (
    <ScreenFrame intro={t('stores.admin.intro')} title={t('stores.admin.title')}>
      {stores.data !== undefined && <CreateStoreForm />}
      <section aria-labelledby="stores-list" className="flex flex-col gap-3">
        <h2 className="text-heading" id="stores-list">{t('stores.list.title')}</h2>
        {stores.isError && !signedOut && <ProblemNotice error={stores.error} onRetry={() => void stores.refetch()} />}
        {(stores.isPending || signedOut) && <Skeleton className="h-32 w-full rounded-3xl" />}
        {stores.data !== undefined && items.length === 0 && <EmptyState icon={InfoIcon} message={t('stores.list.empty')} />}
        {items.length > 0 && (
          <ul className="flex flex-col gap-3">
            {items.map(store => <StoreCard key={store.id} store={store} />)}
          </ul>
        )}
        {stores.hasNextPage && (
          <Button isPending={stores.isFetchingNextPage} variant="secondary" onPress={() => void stores.fetchNextPage()}>
            {t('stores.list.more')}
          </Button>
        )}
      </section>
    </ScreenFrame>
  )
}

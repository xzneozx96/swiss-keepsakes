import { Button } from '@heroui/react'
import { notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/empty-state'
import { InfoIcon, PlusIcon, ShopIcon } from '@/components/icons'
import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { useLocale } from '@/contexts/locale-context'
import { ApiProblem } from '@/features/data-client/errors'
import { apiEnabled } from '@/lib/api-mode'
import { useAdminStores } from '../api/queries'
import { useGoToSignIn } from '../hooks/use-go-to-sign-in'
import { countStores } from '../lib/store-counts'
import { AdminShell } from './admin-shell'
import { CreateStoreSheet } from './create-store-sheet'
import { ProblemNotice } from './problem-notice'
import { ScreenFrame } from './screen-frame'
import { StoreRows } from './store-rows'
import { StoreTiles } from './store-tiles'

/**
 * A01 (UX 4.12): the Super Admin invites the first Owner, which creates the store, and follows each store's
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
  const [isInviting, setIsInviting] = useState(false)
  const problem = stores.error instanceof ApiProblem ? stores.error : undefined
  const signedOut = problem?.status === 401

  const forbidden = problem?.type === 'forbidden'

  useEffect(() => {
    if (signedOut)
      goToSignIn()
  }, [signedOut, goToSignIn])

  if (forbidden)
    throw notFound()

  const items = stores.data?.pages.flatMap(page => page.items)
  const isLoading = stores.isPending || signedOut
  const label = t('stores.list.title')

  return (
    <AdminShell>
      <div className="flex flex-col gap-4">
        <MerchantPageHeader
          action={(
            <Button className="max-lg:min-h-11 shrink-0" isDisabled={items === undefined} size="sm" onPress={() => setIsInviting(true)}>
              <PlusIcon aria-hidden size={16} />
              {t('stores.create.open')}
            </Button>
          )}
          description={t('stores.admin.intro')}
          title={t('stores.admin.title')}
        />
        {stores.isError && !signedOut && <ProblemNotice error={stores.error} onRetry={() => void stores.refetch()} />}
        {items?.length === 0
          ? (
              <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-4 shadow-surface">
                <EmptyState icon={ShopIcon} message={t('stores.list.empty')} />
                <Button className="min-h-11" size="sm" onPress={() => setIsInviting(true)}>
                  <PlusIcon aria-hidden size={16} />
                  {t('stores.create.open')}
                </Button>
              </div>
            )
          : (items !== undefined || isLoading) && (
              <>
                <StoreTiles counts={items && countStores(items)} hasMore={stores.hasNextPage} />
                <StoreRows isLoading={items === undefined} label={label} stores={items ?? []} />
              </>
            )}
        {stores.hasNextPage && (
          <Button className="min-h-11 self-center" isPending={stores.isFetchingNextPage} variant="secondary" onPress={() => void stores.fetchNextPage()}>
            {t('stores.list.more')}
          </Button>
        )}
      </div>
      {isInviting && <CreateStoreSheet onClose={() => setIsInviting(false)} />}
    </AdminShell>
  )
}

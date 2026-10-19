import { Skeleton } from '@heroui/react'
import {
  createFileRoute,
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { EmptyState } from '@/components/empty-state'
import { GiftIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { GiftDetail } from '@/features/catalog/components/gift-detail'
import { useGiftDetail } from '@/features/catalog/hooks/use-gift-detail'
import { useSimulatedLoading } from '@/hooks/use-simulated-loading'

// C03 Gift detail.
export const Route = createFileRoute('/_guest/gifts/$slug')({
  // The bottom bar is sticky in the screen's own flow, so the shell reserves no tab-bar space.
  staticData: { hideTabBar: true, ownsBottomSpace: true },
  component: GiftDetailPage,
})

function GiftDetailPage() {
  const { slug } = Route.useParams()
  const isLoading = useSimulatedLoading()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="aspect-square w-full" />
        <div className="flex flex-col gap-3 px-4">
          <Skeleton className="h-7 w-4/5 rounded-lg" />
          <Skeleton className="h-5 w-1/3 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  // Keyed by slug so moving between gifts starts with an empty form.
  return <GiftDetailScreen key={slug} slug={slug} />
}

function GiftDetailScreen({ slug }: { slug: string }) {
  const { t } = useLocale()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const view = useGiftDetail(slug)

  if (!view) {
    return (
      <div className="pt-16">
        <EmptyState
          action={{ label: t('gifts.showAll'), to: '/gifts' }}
          icon={GiftIcon}
          message={t('detail.notFound')}
        />
      </div>
    )
  }

  return (
    <GiftDetail
      {...view}
      onBack={() =>
        canGoBack ? router.history.back() : void navigate({ to: '/gifts' })}
    />
  )
}

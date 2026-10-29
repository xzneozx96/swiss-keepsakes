import { Skeleton } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'

import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { PageTabs, TabPanel } from '@/components/page-tabs'
import { useLocale } from '@/contexts/locale-context'

/** M02 Overview's two pages, each its own route (owner review 15.10.2026). */
export const OVERVIEW_PAGES = [
  { id: 'today', to: '/store' },
  { id: 'sales', to: '/store/sales' },
] as const
export type OverviewPage = (typeof OVERVIEW_PAGES)[number]['id']

/**
 * The Overview pages' frame: a hidden page title and, on phones, the Today | Sales tabs (from
 * 1024px the sidebar lists the pages under Overview).
 */
export function OverviewFrame({
  page,
  children,
}: {
  page: OverviewPage
  children: React.ReactNode
}) {
  const { t } = useLocale()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      {/* From 1024px the sidebar lists the pages, so the title stays for screen readers only. */}
      <MerchantPageHeader
        className="lg:sr-only"
        description={t('merchantToday.intro')}
        title={t('merchantToday.title')}
      />
      <PageTabs
        equal
        hideFrom="lg"
        label={t('overviewPages.label')}
        selected={page}
        tabs={OVERVIEW_PAGES.map(p => ({ id: p.id, label: t(`overviewPages.${p.id}`) }))}
        onSelect={id =>
          void navigate({
            to: OVERVIEW_PAGES.find(p => p.id === id)?.to ?? '/store',
          })}
      >
        <TabPanel className="pt-2 lg:pt-0" id={page}>
          {children}
        </TabPanel>
      </PageTabs>
    </div>
  )
}

/** Loading: the widget frame (title and note in the tinted shell, a white card inside). */
export function WidgetSkeleton({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden
      className={`flex flex-col rounded-3xl bg-surface-secondary p-1.5 ${className}`}
    >
      <div className="flex flex-col gap-2 px-3.5 pt-3 pb-3">
        {/* One shade darker: the plain skeleton grey is the shell's own. */}
        <Skeleton className="h-4 w-32 rounded-lg bg-default-hover" />
        <Skeleton className="h-3 w-48 rounded-lg bg-default-hover" />
      </div>
      <div className="flex flex-1 flex-col rounded-[1.25rem] bg-surface p-4 shadow-surface">
        {children}
      </div>
    </div>
  )
}

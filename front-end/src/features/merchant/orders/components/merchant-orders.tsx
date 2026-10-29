import type { OrderTabId } from '../lib/order-tabs'
import type { OrderRowProps } from './order-rows'

import { useEffect, useRef } from 'react'

import { OrdersIcon } from '@/components/icons'

import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { PageTabs, TabPanel } from '@/components/page-tabs'
import { OrderRows } from './order-rows'

export interface MerchantOrdersProps {
  title: string
  intro: string
  tabsLabel: string
  tabs: { id: OrderTabId, label: string, count: number }[]
  selected: OrderTabId
  onSelect: (id: OrderTabId) => void
  rows: OrderRowProps[]
  columns: { order: string, gifts: string, status: string, pickup: string }
  empty: { message: string, actionLabel: string }
  isLoading: boolean
}

/**
 * M03 Gift orders: the 7 status tabs (spec §3.2) with counts, scrolling sideways on phones
 * (Tabs card), then the selected tab's orders as stacked rows or, from 1024px, a Table.
 */
export function MerchantOrders({
  title,
  intro,
  tabsLabel,
  tabs,
  selected,
  onSelect,
  rows,
  columns,
  empty,
  isLoading,
}: MerchantOrdersProps) {
  const selectedLabel = tabs.find(tab => tab.id === selected)?.label ?? ''
  const rootRef = useRef<HTMLDivElement>(null)

  // A deep link from M02 can select a tab that starts off-screen in the scrolling list.
  // React Aria mounts the tabs after the first commit, so wait a frame.
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector(`[role="tab"][data-key="${selected}"]`)
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
    )

    return () => cancelAnimationFrame(frame)
  }, [selected])

  const emptyState = {
    action: { label: empty.actionLabel, to: '/store' as const },
    icon: OrdersIcon,
    message: empty.message,
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-4">
      <MerchantPageHeader description={intro} title={title} />
      <PageTabs
        label={tabsLabel}
        selected={selected}
        tabs={tabs.map(tab => ({ id: tab.id, label: tab.label, badge: tab.count }))}
        onSelect={onSelect}
      >
        {tabs.map(tab => (
          <TabPanel key={tab.id} id={tab.id}>
            <OrderRows
              columns={columns}
              empty={emptyState}
              isLoading={isLoading}
              label={selectedLabel}
              resetKey={selectedLabel}
              rows={rows}
            />
          </TabPanel>
        ))}
      </PageTabs>
    </div>
  )
}

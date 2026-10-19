import type { OrderTabId } from '../lib/order-tabs'
import type { OrderRowProps } from './order-rows'

import { Tabs } from '@heroui/react'
import { useEffect, useRef } from 'react'

import { OrdersIcon } from '@/components/icons'

import { MerchantPageHeader } from '@/components/layout/merchant-page-header'
import { STICKY_TABS } from '@/components/layout/sticky-tabs'
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
      <Tabs
        className="w-full"
        selectedKey={selected}
        onSelectionChange={key => onSelect(key as OrderTabId)}
      >
        <div className={`max-lg:py-2 ${STICKY_TABS}`}>
          <Tabs.ListContainer className="w-fit max-w-full">
            <Tabs.List aria-label={tabsLabel}>
              {tabs.map((tab, index) => (
                <Tabs.Tab
                  key={tab.id}
                  className="whitespace-nowrap"
                  id={tab.id}
                >
                  {index > 0 && <Tabs.Separator />}
                  {tab.label}
                  <span className="ms-1.5 min-w-5 rounded-full bg-default px-1.5 text-xs leading-5 tabular-nums">
                    {tab.count}
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </div>
        {tabs.map(tab => (
          <Tabs.Panel key={tab.id} className="px-0 pb-0" id={tab.id}>
            <OrderRows
              columns={columns}
              empty={emptyState}
              isLoading={isLoading}
              label={selectedLabel}
              resetKey={selectedLabel}
              rows={rows}
            />
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  )
}

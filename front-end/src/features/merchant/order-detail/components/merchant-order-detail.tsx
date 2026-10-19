import type { Order } from '@sk/domain/orders'
import type {
  MerchantOrderActions,
  MerchantOrderView,
} from '../hooks/use-merchant-order-detail'

import { Tabs } from '@heroui/react'
import { useState } from 'react'

import { STICKY_TABS_BELOW_BAR } from '@/components/layout/sticky-tabs'
import { useLocale } from '@/contexts/locale-context'
import { useIsWide } from '@/hooks/use-is-wide'

import { DecisionBlock } from './decision-block'
import { FulfilmentActions } from './fulfilment-actions'
import {
  ActivityCard,
  GuestCard,
  ItemsCard,
  KeyFacts,
  OrderHeader,
  PartnerCard,
  PaymentsCard,
  PolicyCard,
} from './order-sections'

type TabId = 'details' | 'money' | 'activity'

/**
 * M04 Gift order detail (spec §4.6, §5.2; outline §2 row 1.11). Header with both labels,
 * a key-facts strip, then the action panel (decision or the next fulfilment step).
 * Phones: the rest in three tabs (details, money, activity) so each stays short.
 * From 1024px: two columns, the work (action, gifts, log, policy) on the left and the
 * reference cards (guest, money, partner) in a 300px column on the right.
 */
export function MerchantOrderDetail({
  order,
  view,
  actions,
}: {
  order: Order
  view: MerchantOrderView
  actions: MerchantOrderActions
}) {
  const { t } = useLocale()
  const isWide = useIsWide()
  const [tab, setTab] = useState<TabId>('details')

  const action = view.isRequested
    ? (
        <DecisionBlock
          actions={actions}
          orderDate={order.pickupDate}
          orderPlaceId={order.pickupPlaceId}
          view={view}
        />
      )
    : (
        <FulfilmentActions order={order} view={view} />
      )

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <OrderHeader view={view} />
      <KeyFacts view={view} />

      {/* The action panel keeps its place in the tree at every width, so an open sheet
          survives a resize across 1024px. */}
      <div
        className={
          isWide
            ? 'grid grid-cols-[minmax(0,1fr)_300px] items-start gap-6'
            : 'flex flex-col'
        }
      >
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {action}
          {isWide
            ? (
                <>
                  <ItemsCard view={view} />
                  <ActivityCard view={view} />
                  <PolicyCard view={view} />
                </>
              )
            : (
                <Tabs
                  className="w-full"
                  selectedKey={tab}
                  onSelectionChange={key => setTab(key as TabId)}
                >
                  <div className={`max-lg:py-2 ${STICKY_TABS_BELOW_BAR}`}>
                    <Tabs.ListContainer>
                      <Tabs.List aria-label={t('merchantOrder.tabs.label')}>
                        {(
                          [
                            ['details', t('merchantOrder.tabs.details')],
                            ['money', t('merchantOrder.tabs.money')],
                            ['activity', t('merchantOrder.tabs.activity')],
                          ] as const
                        ).map(([id, label], index) => (
                          <Tabs.Tab key={id} className="whitespace-nowrap" id={id}>
                            {index > 0 && <Tabs.Separator />}
                            {label}
                            <Tabs.Indicator />
                          </Tabs.Tab>
                        ))}
                      </Tabs.List>
                    </Tabs.ListContainer>
                  </div>
                  <Tabs.Panel
                    className="flex flex-col gap-5 px-0 pb-0"
                    id="details"
                  >
                    <ItemsCard view={view} />
                    <GuestCard view={view} />
                  </Tabs.Panel>
                  <Tabs.Panel className="flex flex-col gap-5 px-0 pb-0" id="money">
                    <PaymentsCard view={view} />
                    <PartnerCard view={view} />
                    <PolicyCard view={view} />
                  </Tabs.Panel>
                  <Tabs.Panel
                    className="flex flex-col gap-5 px-0 pb-0"
                    id="activity"
                  >
                    <ActivityCard view={view} />
                  </Tabs.Panel>
                </Tabs>
              )}
        </div>
        {isWide && (
          <div className="flex min-w-0 flex-col gap-6">
            <GuestCard view={view} />
            <PaymentsCard view={view} />
            <PartnerCard view={view} />
          </div>
        )}
      </div>
    </div>
  )
}

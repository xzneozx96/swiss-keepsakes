import type { LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Tabs } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'

import { STICKY_TABS } from '@/components/layout/sticky-tabs'

export interface RouteTab {
  id: string
  to: LinkProps['to']
  label: string
  /** The small pill after the label: a count, or "Soon". */
  badge?: string | number
}

/**
 * Tabs that are routes: each tab opens its own page, so the address, the back button and
 * deep links all say which one is shown. `trailing` sits at the end of the same row, e.g.
 * the filter button. The page below the row is the caller's.
 */
export function RouteTabs({
  label,
  tabs,
  selected,
  trailing,
}: {
  label: string
  tabs: readonly RouteTab[]
  selected: string
  trailing?: ReactNode
}) {
  const navigate = useNavigate()

  return (
    <div className={`flex items-center gap-2 max-lg:py-2 ${STICKY_TABS}`}>
      <Tabs
        className="w-auto min-w-0"
        selectedKey={selected}
        onSelectionChange={key =>
          void navigate({
            to: (tabs.find(tab => tab.id === key) ?? tabs[0]).to as never,
          })}
      >
        <Tabs.ListContainer className="w-fit max-w-full">
          <Tabs.List aria-label={label}>
            {tabs.map((tab, index) => (
              <Tabs.Tab key={tab.id} className="whitespace-nowrap" id={tab.id}>
                {index > 0 && <Tabs.Separator />}
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ms-1.5 min-w-5 rounded-full bg-default px-1.5 text-xs leading-5 tabular-nums">
                    {tab.badge}
                  </span>
                )}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      {trailing}
    </div>
  )
}

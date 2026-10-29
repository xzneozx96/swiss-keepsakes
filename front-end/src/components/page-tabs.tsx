import type { ReactNode } from 'react'

import { Tabs } from '@heroui/react'

import { STICKY_TABS, STICKY_TABS_BELOW_BAR } from '@/components/layout/sticky-tabs'

export interface TabItem<Id extends string = string> {
  id: Id
  label: ReactNode
  /** The small pill after the label: a count, or "Soon". */
  badge?: string | number
  /** Anything else after the label, e.g. a warning dot. */
  marker?: ReactNode
}

/**
 * The one tab row of the app: the thin pill the orders screen set. It must sit inside a
 * HeroUI `Tabs`; RouteTabs, PageTabs and DetailTabs each wrap it. `fill` is full width on
 * phones and fit-content from 1024px; `equal` shares the bar between the tabs (`dense` for
 * four or more); `split` is full width on phones and 20rem from 640px.
 */
export function TabRow({
  label,
  tabs,
  fill = false,
  equal = false,
  dense = false,
  split = false,
}: {
  label: string
  tabs: readonly TabItem[]
  fill?: boolean
  equal?: boolean
  dense?: boolean
  split?: boolean
}) {
  const container = equal
    ? 'w-full'
    : split
      ? 'w-full sm:w-80'
      : fill ? 'w-full lg:w-fit' : 'w-fit max-w-full'
  const tabWidth = equal
    ? dense ? 'min-w-0 flex-auto px-1.5 text-[13px]' : 'min-w-0 flex-1 px-1'
    : ''

  return (
    <Tabs.ListContainer className={container}>
      <Tabs.List aria-label={label} className={equal ? 'w-full' : undefined}>
        {tabs.map((tab, index) => (
          <Tabs.Tab key={tab.id} className={`${tabWidth} whitespace-nowrap`.trim()} id={tab.id}>
            {index > 0 && <Tabs.Separator />}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ms-1.5 min-w-5 rounded-full bg-default px-1.5 text-xs leading-5 tabular-nums">
                {tab.badge}
              </span>
            )}
            {tab.marker}
            <Tabs.Indicator />
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.ListContainer>
  )
}

/**
 * A panel of PageTabs, flush with the page (no HeroUI padding) unless `padded`; `className`
 * adds the caller's spacing and layout.
 */
export function TabPanel({
  id,
  padded = false,
  className,
  children,
}: {
  id: string
  padded?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <Tabs.Panel className={`${padded ? '' : 'px-0 pb-0'} ${className ?? ''}`.trim()} id={id}>
      {children}
    </Tabs.Panel>
  )
}

/**
 * In-page tabs held in state (the address does not change; RouteTabs is for pages). The
 * row is pinned on phones; `trailing` sits at the end of it; the `children` are the
 * `TabPanel`s. `split` is the report's layout: tabs and `trailing` stack on phones and
 * from 640px the tabs sit at the end of the row, 20rem wide. `belowBar` pins the row under
 * a 56px back bar; `sticky={false}` is for tabs inside a sheet or drawer (no pinning, no
 * bleed padding); `hideFrom="lg"` hides the row from 1024px.
 */
export function PageTabs<Id extends string>({
  label,
  tabs,
  selected,
  onSelect,
  trailing,
  fill,
  equal,
  dense,
  split,
  belowBar,
  sticky = true,
  hideFrom,
  children,
}: {
  label: string
  tabs: readonly TabItem<Id>[]
  selected: Id
  onSelect: (id: Id) => void
  trailing?: ReactNode
  fill?: boolean
  equal?: boolean
  dense?: boolean
  split?: boolean
  belowBar?: boolean
  sticky?: boolean
  hideFrom?: 'lg'
  children?: ReactNode
}) {
  const pinned = sticky ? `max-lg:py-2 ${belowBar ? STICKY_TABS_BELOW_BAR : STICKY_TABS}` : ''
  const layout = split
    ? 'flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between'
    : 'flex items-center gap-2'

  return (
    <Tabs className="w-full" selectedKey={selected} onSelectionChange={key => onSelect(key as Id)}>
      <div className={`${layout} ${pinned} ${hideFrom === 'lg' ? 'lg:hidden' : ''}`.trim()}>
        <TabRow
          dense={dense}
          equal={equal}
          fill={fill}
          label={label}
          split={split}
          tabs={tabs}
        />
        {trailing}
      </div>
      {children}
    </Tabs>
  )
}

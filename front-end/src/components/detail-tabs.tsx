import type { ReactNode } from 'react'

import { Tabs } from '@heroui/react'
import { useHydrated } from '@tanstack/react-router'

import { TabRow } from '@/components/page-tabs'

/**
 * The detail screens' tab bar (gift C15, 1.13r; tour C16 since round 3): equal pills (the shared thin pill) that stick
 * under the 56px top bar, each panel padded as C15's. `gutter` is the side padding of the bar and the panels: a page whose
 * header uses wider sides (the tour page's 24px) passes its own, so the tab content lines up with the header. `line` draws
 * HeroUI's one-line (underlined) tabs instead of the pill (the tour page, owner 06.11.2026).
 */
export function DetailTabs<Tab extends string>({
  label,
  tabs,
  selected,
  onChange,
  gutter = 'px-4',
  line = false,
}: {
  label: string
  tabs: readonly { id: Tab, label: string, panel: ReactNode }[]
  selected: Tab
  onChange: (tab: Tab) => void
  gutter?: 'px-4' | 'px-6'
  line?: boolean
}) {
  // The bar sits above the panels' own layers (the itinerary map's buttons are z-20) and below the 56px top bar (z-30) it
  // docks under; the map's CSS fullscreen (z-9999) still covers it. One-line tabs are 44px tall, an easy target (owner, 06.11.2026).
  const pinned = `sticky top-14 z-[25] bg-background ${gutter}`
  // A page opened on a tab other than the first (?tab=comments) left the indicator under the first tab: during hydration
  // the indicator moves from the first tab to the selected one and its slide is cut off half-way. The row mounts again
  // once hydrated, so the indicator starts fresh under the selected tab.
  const hydrated = useHydrated()
  const row = (className?: string) => <TabRow key={hydrated ? 'live' : 'server'} equal className={className} label={label} tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))} />

  return (
    <Tabs
      className="mt-6 w-full"
      selectedKey={selected}
      variant={line ? 'secondary' : 'primary'}
      onSelectionChange={key => onChange(key as Tab)}
    >
      {line ? row(`${pinned} [&_[role=tab]]:h-11`) : <div className={pinned}>{row()}</div>}
      {tabs.map(tab => (
        <Tabs.Panel key={tab.id} className={`${gutter} pt-5`} id={tab.id}>
          {tab.panel}
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}
